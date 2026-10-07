import { passages, sources } from "../collection";
import { searchCollection } from "../search";
import type { Claim, RetrievedPassage, RetrievalRun } from "../types";
import { parseReference } from '../integrations/contracts';
export const COLLECTION_VERSION = "palmer-baqarah-10-v1";
export const COVERAGE = "Only ten excerpts from E. H. Palmer's historical English Baqarah translation were searched. No hadith, scholarly works, or Arabic editions are included. This is not an exhaustive search of Islamic literature.";
// Conservative comparison: Arabic diacritics and letters remain significant.
export function exactText(text: string) { return text.trim().replace(/\s+/gu, " "); }
export function referenceMatches(reference: string, passage: { id: string; locator: string }) {
  const ref = reference.trim().toLowerCase();
  try { const parsed = parseReference(reference); if (parsed?.kind === 'quran' && parsed.start === parsed.end && passage.locator === `${parsed.surah}:${parsed.start}`) return true; } catch { /* Invalid references never match. */ }
  return !!ref && (ref === passage.id.toLowerCase() || ref === passage.locator.trim().toLowerCase());
}
export function retrieve(claim: Claim): RetrievalRun {
  const found = new Map<string, RetrievedPassage>();
  const queries: RetrievalRun["queries"] = [];
  const add = (p: typeof passages[number], method: RetrievedPassage["method"], score: number) => {
    if (!found.has(p.id)) found.set(p.id, { ...p, source: sources.find(s => s.id === p.sourceId)!, method, score, provenance: "curated" });
  };
  if (claim.reference) {
    queries.push({ query: claim.reference, method: "exact-reference" });
    passages.filter(p => referenceMatches(claim.reference, p)).forEach(p => add(p, "exact-reference", 100));
  }
  if (claim.quotation) {
    queries.push({ query: claim.quotation, method: "exact-quotation" });
    passages.filter(p => exactText(p.text).includes(exactText(claim.quotation))).forEach(p => add(p, "exact-quotation", 100));
  }
  const query = claim.statement.slice(0, 300);
  queries.push({ query, method: "keyword" });
  searchCollection(query).slice(0, 6).forEach(p => add(p, "keyword", p.score));
  return { id: crypto.randomUUID(), projectId: claim.projectId, claimId: claim.id, claimRevision: claim.revision,
    materialRevision: claim.materialRevision, queries, collectionVersion: COLLECTION_VERSION,
    searchedAt: new Date().toISOString(), sourcesSearched: sources, coverage: COVERAGE, passages: [...found.values()].slice(0, 8) };
}
