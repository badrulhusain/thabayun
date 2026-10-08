import { retrieveApproved } from "@/lib/integrations/service";
import { owner } from "@/lib/integrations/owner";
import type { Material } from "@/lib/types";
import { object, parseClaim } from "@/lib/claims/validation";
import { failure, jsonBody, extensionResponse, extensionPreflight } from "@/lib/claims/http";
export const OPTIONS = extensionPreflight;
export const runtime = 'nodejs';
export const maxDuration = 300;
async function execute(request: Request) {
  try { const body = object(await jsonBody(request)); const claim = parseClaim(body.claim); const material = body.material as Material | undefined;
    if (material && (typeof material.editedText !== 'string' || typeof material.originalText !== 'string' || material.editedText.length > 50000 || material.originalText.length > 50000 || !['text', 'screenshot'].includes(material.inputType))) throw new Error('Invalid material');
    return Response.json({ retrieval: await retrieveApproved(claim, await owner(), material, request.signal) }); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) { return extensionResponse(request, await execute(request)); }
