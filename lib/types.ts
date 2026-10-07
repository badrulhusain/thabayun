export type Project = {
  id: string;
  title: string;
  researchQuestion: string;
  createdAt: string;
  updatedAt: string;
};
export type Material = {
  id: string;
  projectId: string;
  inputType: "text" | "screenshot";
  originalText: string;
  editedText: string;
  createdAt: string;
  revision?: number;
};
export type Source = {
  id: string;
  title: string;
  author: string;
  sourceType: string;
  language: string;
  URL: string;
  edition?: string;
  translator?: string;
  reuseTerms: string;
};
export type Passage = {
  id: string;
  sourceId: string;
  text: string;
  locator: string;
  surroundingContext?: string;
  tags: string[];
};
export type Result = Passage & { source: Source; score: number };
export type SavedEvidence = {
  id: string;
  projectId: string;
  passageId: string;
  passageSnapshot: Passage;
  citationSnapshot: Source;
  userNote: string;
  savedAt: string;
};

export const claimTypes = ["Quran quotation or attribution", "Hadith quotation or attribution", "Scholarly attribution", "Religious interpretation", "Historical or general factual claim"] as const;
export type ClaimType = typeof claimTypes[number];
export type Claim = {
  id: string; projectId: string; materialId: string; materialRevision: number;
  revision: number; excerpt: string; start: number; end: number; statement: string;
  type: ClaimType; quotation: string; speaker: string; reference: string;
  validationIssue: string; coverageNote: string;
};
export type RetrievedPassage = Result & { method: "exact-reference" | "exact-quotation" | "keyword"; provenance: "curated" | "test-fixture" | "live"; grades?: { authority: string; grade: string }[]; limitations?: string[] };
export type RetrievalRun = {
  id: string; projectId: string; claimId: string; claimRevision: number; materialRevision: number;
  queries: { query: string; method: RetrievedPassage["method"] }[];
  collectionVersion: string; searchedAt: string; sourcesSearched: Source[];
  coverage: string; passages: RetrievedPassage[];
  attempts?: { provider: string; outcome: string; limitations: string[] }[];
};
export const quotationResults = ["Exact match", "Wording differs", "Possible paraphrase", "Not located", "Not applicable", "Uncertain"] as const;
export const referenceResults = ["Resolved and matches the cited passage", "Resolved but mismatched", "Not located", "Not supplied", "Uncertain"] as const;
export const supportResults = ["Supported by retrieved evidence", "Partially supported", "Contradicted by retrieved evidence", "Insufficient evidence", "Requires scholarly interpretation"] as const;
export type EvidenceLink = {
  passageId: string; excerpt: string; relation: "supporting" | "conflicting" | "contextual";
  passageSnapshot: RetrievedPassage; citationSnapshot: Source;
};
export type AnalysisRun = {
  id: string; projectId: string; claimId: string; claimRevision: number; materialId: string;
  materialRevision: number; claimSnapshot: Claim; retrievalSnapshot: RetrievalRun;
  quotation: typeof quotationResults[number]; reference: typeof referenceResults[number];
  support: typeof supportResults[number]; explanation: string; evidence: EvidenceLink[];
  limitations: string[]; unresolvedQuestions: string[]; nextStep: string;
  model: string; promptVersion: string; collectionVersion: string; createdAt: string;
  status: "complete"; personalNote: string;
  telemetry?: ModelTelemetry;
  cacheKey?: string;
};
export type ModelTelemetry = {
  provider: "groq"; task: "extract" | "analyze"; model: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number } | null;
  latencyMs: number; attempts: number; recordedAt: string; finishReason?: string;
  validationStatus?: "valid" | "needs_correction" | "rejected";
  providerErrorCode?: "json_validate_failed";
  status: "completed" | "refused" | "incomplete" | "malformed" | "timeout" | "canceled" | "rate_limited" | "provider_error" | "busy" | "not_configured" | "invalid_input";
};
export type ExtractionRecord = {
  id: string; projectId: string; materialId: string; materialRevision: number;
  cacheKey: string; model: string; promptVersion: string; claimIds: string[];
  telemetry?: ModelTelemetry; createdAt: string;
};
