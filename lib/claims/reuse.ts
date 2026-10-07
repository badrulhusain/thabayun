import type { AnalysisRun, Claim, Material, RetrievalRun } from "../types";
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
async function fingerprint(value: unknown) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stable(value)));
  return [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, "0")).join("");
}
export function extractionKey(material: Material, model: string, promptVersion: string) {
  return fingerprint({ projectId: material.projectId, materialId: material.id, revision: material.revision ?? 1, text: material.editedText, model, promptVersion });
}
export function analysisKey(claim: Claim, retrieval: RetrievalRun, model: string, promptVersion: string) {
  return fingerprint({ projectId: claim.projectId, materialId: claim.materialId, materialRevision: claim.materialRevision, claim,
    evidence: [...retrieval.passages].sort((a, b) => a.id.localeCompare(b.id)).map(p => ({ id: p.id, text: p.text, locator: p.locator, surroundingContext: p.surroundingContext, source: p.source, provenance: p.provenance })),
    collectionVersion: retrieval.collectionVersion, coverage: retrieval.coverage, model, promptVersion });
}
export function reusableFinding(run: AnalysisRun, key: string, claim: Claim, model: string) {
  return run.status === "complete" && run.cacheKey === key && run.projectId === claim.projectId && run.materialId === claim.materialId && run.claimId === claim.id && run.claimRevision === claim.revision && run.materialRevision === claim.materialRevision && run.model === model;
}
