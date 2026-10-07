import "server-only";
export function modelConfig() {
  return {
    extractionModel: process.env.GROQ_EXTRACTION_MODEL?.trim() || "openai/gpt-oss-20b",
    analysisModel: process.env.GROQ_ANALYSIS_MODEL?.trim() || "openai/gpt-oss-120b",
    configured: !!process.env.GROQ_API_KEY?.trim(),
  };
}
