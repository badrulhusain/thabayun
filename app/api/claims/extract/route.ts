import { extractClaims } from "@/lib/claims/extraction";
import { callModel } from "@/lib/claims/model";
import { owner } from "@/lib/integrations/owner";
import { failure, jsonBody, extensionResponse, extensionPreflight } from "@/lib/claims/http";
export const OPTIONS = extensionPreflight;
export const runtime = 'nodejs';
export const maxDuration = 60;
async function execute(request: Request) {
  try { const body = await jsonBody(request); await owner(); return Response.json(await extractClaims(body, callModel, request.signal)); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) { return extensionResponse(request, await execute(request)); }
