import { modelConfig } from "@/lib/claims/config";
import { EXTRACTION_PROMPT } from "@/lib/claims/extraction";
import { ANALYSIS_PROMPT } from "@/lib/claims/analysis";
export function GET() {
  return Response.json({ ...modelConfig(), extractionPrompt: EXTRACTION_PROMPT, analysisPrompt: ANALYSIS_PROMPT }, { headers: { "Cache-Control": "no-store" } });
}
