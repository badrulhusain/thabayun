import { loadRetrieval, saveAnalysis } from "@/lib/integrations/service";
import { owner } from "@/lib/integrations/owner";
import { ClaimsError, object, parseClaim, string } from "@/lib/claims/validation";
import { analyzeClaim } from "@/lib/claims/analysis";
import { callModel } from "@/lib/claims/model";
import { failure, jsonBody, extensionResponse, extensionPreflight } from "@/lib/claims/http";
export const OPTIONS = extensionPreflight;
export const runtime = 'nodejs';
export const maxDuration = 60;
async function execute(request: Request) {
  try {
    const body = object(await jsonBody(request)), claim = parseClaim(body.claim);
    if (!Array.isArray(body.passageIds) || body.passageIds.length > 8) throw new ClaimsError("Select up to eight retrieved passages.");
    const ids = [...new Set(body.passageIds.map(id => string(id, 100)))];
    if (!ids.length) throw new ClaimsError('Retrieve and select at least one approved source passage before analysis. No model request was sent.', 422, 'NO_EVIDENCE');
    const session = await owner();
    const retrieval = await loadRetrieval(claim, session);
    if (ids.some(id => !retrieval.passages.some(p => p.id === id))) throw new ClaimsError("Evidence must be a canonical passage retrieved for this claim.");
    retrieval.passages = retrieval.passages.filter(p => ids.includes(p.id));
    const analysis = await analyzeClaim(claim, retrieval, callModel, request.signal);
    await loadRetrieval(claim, session).then(current => { if (analysis.evidence.some(e => !current.passages.some(p => p.id === e.passageId))) throw new ClaimsError('Resource eligibility or metadata changed during analysis.'); });
    await saveAnalysis(session, analysis);
    return Response.json({ analysis });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) { return extensionResponse(request, await execute(request)); }
