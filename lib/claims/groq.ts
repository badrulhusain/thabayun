import "server-only";
import Groq from "groq-sdk";
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from "groq-sdk/resources/chat/completions";
import type { ModelTelemetry } from "../types";
import { modelConfig } from "./config";
import { ClaimsError } from "./validation";

export type ModelRequest = { task: "extract" | "analyze"; instructions: string; data: unknown; schema: Record<string, unknown> };
export type ModelCall = (request: ModelRequest, signal?: AbortSignal) => Promise<{ output: unknown; model: string; telemetry?: ModelTelemetry }>;
export const MODEL_LIMITS = { timeoutMs: 45000, maxAttempts: 2, concurrentCalls: 2, inputBytes: 100000, outputTokens: 6000 } as const;
const runtime = globalThis as typeof globalThis & { __tabayyunGroqState?: { active: number; recent: ModelTelemetry[] } };
const state = runtime.__tabayyunGroqState ??= { active: 0, recent: [] };
// Operational metadata only: never private text, credentials, project IDs or raw provider errors.
const recent = state.recent;
export function recentModelTelemetry() { return structuredClone(recent); }
function record(value: ModelTelemetry) { recent.push(value); if (recent.length > 100) recent.shift(); }
export function retryAfterMs(value: string | null | undefined, now = Date.now()) {
  if (!value) return undefined;
  if (/^\d+(\.\d+)?$/.test(value.trim())) return Math.ceil(Number(value) * 1000);
  const date = Date.parse(value); return Number.isFinite(date) ? Math.max(0, date - now) : undefined;
}
export async function abortableDelay(ms: number, signal: AbortSignal) {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); signal.removeEventListener("abort", cancel); reject(new Error("Canceled")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", cancel); resolve(); }, ms);
    signal.addEventListener("abort", cancel, { once: true });
  });
}
type Client = { create: (params: ChatCompletionCreateParamsNonStreaming, options: { signal: AbortSignal; maxRetries: number; timeout: number }) => Promise<ChatCompletion> };
type Dependencies = { client?: (key: string) => Client; wait?: typeof abortableDelay; now?: () => number };
export function createModelAdapter(dependencies: Dependencies = {}): ModelCall {
  const now = dependencies.now ?? Date.now, wait = dependencies.wait ?? abortableDelay;
  return async (request, signal) => {
    const started = now(), config = modelConfig(), model = request.task === "extract" ? config.extractionModel : config.analysisModel;
    let attempts = 0, usage: ModelTelemetry["usage"] = null, finishReason: string | undefined, providerErrorCode: ModelTelemetry["providerErrorCode"];
    const telemetry = (status: ModelTelemetry["status"]): ModelTelemetry => ({ provider: "groq", task: request.task, model, usage, latencyMs: Math.max(0, now() - started), attempts, recordedAt: new Date().toISOString(), status, ...(finishReason ? { finishReason } : {}), ...(providerErrorCode ? { providerErrorCode } : {}) });
    const fail = (message: string, status: number, code: string, completion: ModelTelemetry["status"], retryAfter?: string): never => {
      const error = new ClaimsError(message, status, code); error.telemetry = telemetry(completion); error.retryAfter = retryAfter; record(error.telemetry); throw error;
    };
    if (!config.configured) fail("Groq is not configured. Set server-only GROQ_API_KEY. Manual claims and source retrieval remain available.", 503, "MODEL_NOT_CONFIGURED", "not_configured");
    const data = JSON.stringify({ untrustedData: request.data });
    if (new TextEncoder().encode(data + request.instructions + JSON.stringify(request.schema)).length > MODEL_LIMITS.inputBytes) fail("Model input is too large. Use a smaller material or fewer passages.", 413, "MODEL_INPUT_LIMIT", "invalid_input");
    if (state.active >= MODEL_LIMITS.concurrentCalls) fail("Two AI requests are already running. Retry after they finish.", 503, "MODEL_BUSY", "busy", "1");
    state.active++;
    const timeout = AbortSignal.timeout(MODEL_LIMITS.timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    try {
      const client = dependencies.client?.(process.env.GROQ_API_KEY!.trim()) ?? (() => {
        const sdk = new Groq({ apiKey: process.env.GROQ_API_KEY!.trim(), maxRetries: 0, timeout: MODEL_LIMITS.timeoutMs, logLevel: "off" });
        return { create: (params: ChatCompletionCreateParamsNonStreaming, options: { signal: AbortSignal; maxRetries: number; timeout: number }) => sdk.chat.completions.create(params, options) };
      })();
      for (let attempt = 0; attempt < MODEL_LIMITS.maxAttempts; attempt++) {
        if (combined.aborted) fail(signal?.aborted ? "Groq request canceled." : "Groq request timed out. Retry when ready.", signal?.aborted ? 499 : 504, signal?.aborted ? "MODEL_CANCELED" : "MODEL_TIMEOUT", signal?.aborted ? "canceled" : "timeout");
        attempts++;
        let response: ChatCompletion;
        try {
          response = await client.create({ model, stream: false, max_completion_tokens: MODEL_LIMITS.outputTokens,
            messages: [{ role: "system", content: request.instructions }, { role: "user", content: data }],
            response_format: { type: "json_schema", json_schema: { name: `tabayyun_${request.task}`, strict: true, schema: request.schema } },
          }, { signal: combined, maxRetries: 0, timeout: Math.max(1, MODEL_LIMITS.timeoutMs - (now() - started)) });
        } catch (error) {
          if (combined.aborted || error instanceof Groq.APIConnectionTimeoutError) fail(signal?.aborted ? "Groq request canceled." : "Groq request timed out. Retry when ready.", signal?.aborted ? 499 : 504, signal?.aborted ? "MODEL_CANCELED" : "MODEL_TIMEOUT", signal?.aborted ? "canceled" : "timeout");
          const api = error instanceof Groq.APIError ? error : undefined;
          const retryAfter = api?.headers?.get("retry-after") ?? undefined;
          const delay = retryAfterMs(retryAfter, now()) ?? (500 * 2 ** attempt);
          const retriable = api?.status === 429 || (api?.status !== undefined && api.status >= 500);
          if (retriable && attempt + 1 < MODEL_LIMITS.maxAttempts && delay < MODEL_LIMITS.timeoutMs - (now() - started)) {
            try { await wait(delay, combined); } catch { fail(signal?.aborted ? "Groq request canceled." : "Groq request timed out during retry delay.", signal?.aborted ? 499 : 504, signal?.aborted ? "MODEL_CANCELED" : "MODEL_TIMEOUT", signal?.aborted ? "canceled" : "timeout"); }
            continue;
          }
          if (api?.status === 429) fail("Groq rate limit reached. Retry after the indicated delay; completed work is preserved.", 429, "MODEL_RATE_LIMITED", "rate_limited", retryAfter ?? String(Math.ceil(delay / 1000)));
          const providerBody = api?.error as { code?: unknown; error?: { code?: unknown } } | undefined;
          if (api?.status === 400 && (providerBody?.error?.code ?? providerBody?.code) === "json_validate_failed") {
            providerErrorCode = "json_validate_failed";
            fail("Groq could not produce the required strict JSON output. Retry; no finding was saved.", 422, "MODEL_STRUCTURED_OUTPUT_FAILED", "malformed");
          }
          if (api?.status === 401 || api?.status === 403) fail("Groq credentials or model access were rejected. Check server configuration.", 502, "MODEL_ACCESS_ERROR", "provider_error");
          if (api?.status === 400 || api?.status === 422) fail("Groq rejected this model or strict JSON Schema request. Check model support; no finding was saved.", 502, "MODEL_REQUEST_REJECTED", "provider_error");
          return fail("Groq is unavailable. Retry; no finding was saved.", 502, "MODEL_UNAVAILABLE", "provider_error");
        }
        if (combined.aborted) fail(signal?.aborted ? "Groq request canceled." : "Groq request timed out.", signal?.aborted ? 499 : 504, "MODEL_CANCELED_OR_TIMEOUT", signal?.aborted ? "canceled" : "timeout");
        const choice = response.choices?.[0]; finishReason = choice?.finish_reason;
        if (response.usage) usage = { inputTokens: response.usage.prompt_tokens, outputTokens: response.usage.completion_tokens, totalTokens: response.usage.total_tokens };
        const message = choice?.message as (ChatCompletion["choices"][number]["message"] & { refusal?: string }) | undefined;
        if (message?.refusal || finishReason === "content_filter") fail("Groq refused this request. No claims or finding were saved.", 422, "MODEL_REFUSED", "refused");
        if (response.choices?.length !== 1 || finishReason !== "stop" || !message?.content) return fail("Groq response was incomplete. Reduce the input or retry; no finding was saved.", 422, "INCOMPLETE_OUTPUT", "incomplete");
        let output: unknown;
        try { output = JSON.parse(message.content); } catch { fail("Groq returned malformed JSON. No finding was saved.", 422, "INVALID_MODEL_OUTPUT", "malformed"); }
        const metadata = { ...telemetry("completed"), model: response.model || model }; record(metadata);
        return { output, model: metadata.model, telemetry: metadata };
      }
      return fail("Groq retry limit reached.", 502, "MODEL_UNAVAILABLE", "provider_error");
    } finally { state.active--; }
  };
}
export const callModel = createModelAdapter();
