import { claimTypes, type Claim, type ModelTelemetry } from "../types";
export class ClaimsError extends Error {
  telemetry?: ModelTelemetry;
  retryAfter?: string;
  constructor(message: string, public status = 400, public code = "INVALID_INPUT") { super(message); }
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ClaimsError("Expected a JSON object.");
  return value as Record<string, unknown>;
}
export function string(value: unknown, max = 2000, empty = false): string {
  if (typeof value !== "string" || value.length > max || (!empty && !value.trim())) throw new ClaimsError(`Expected text up to ${max} characters.`);
  return value;
}
export function integer(value: unknown, min = 0, max = 100000): number {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) throw new ClaimsError("Invalid revision or character offset.");
  return Number(value);
}
export function parseClaim(value: unknown): Claim {
  const c = object(value);
  if (!claimTypes.includes(c.type as Claim["type"])) throw new ClaimsError("Choose a supported claim type.");
  const result: Claim = {
    id: string(c.id, 100), projectId: string(c.projectId, 100), materialId: string(c.materialId, 100),
    materialRevision: integer(c.materialRevision, 1), revision: integer(c.revision, 1),
    excerpt: string(c.excerpt, 10000), start: integer(c.start), end: integer(c.end),
    statement: string(c.statement), type: c.type as Claim["type"],
    quotation: string(c.quotation, 4000, true), speaker: string(c.speaker, 300, true), reference: string(c.reference, 300, true),
    validationIssue: string(c.validationIssue, 500, true), coverageNote: string(c.coverageNote, 1000, true),
  };
  if (result.end <= result.start || result.end - result.start !== result.excerpt.length) throw new ClaimsError("Correct the excerpt offsets before investigating.");
  if (result.validationIssue) throw new ClaimsError("Correct the flagged extraction before investigating.");
  return result;
}
export function excerptIssue(text: string, excerpt: string, start: number, end: number) {
  return start < 0 || end <= start || text.slice(start, end) !== excerpt || end - start !== excerpt.length
    ? "Excerpt and offsets do not match saved material. Correct the excerpt before investigating." : "";
}
export function outdated(run: { claimRevision: number; materialRevision: number }, claim: Claim | undefined, materialRevision: number) {
  return !claim || run.claimRevision !== claim.revision || run.materialRevision !== materialRevision;
}
