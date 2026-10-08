export type Provider = 'quran-foundation' | 'sunnah' | 'ummah' | 'shamela' | 'turath' | 'openiti' | 'parse';
export type Outcome = 'success' | 'no_match' | 'unavailable' | 'error' | 'unsupported' | 'not_configured';
export type SourceReviewStatus = 'pending' | 'approved' | 'rejected' | 'out-of-scope';
export type UsagePermissionStatus = 'not-reviewed' | 'permitted' | 'noncommercial-only' | 'restricted' | 'unclear';
export type TechnicalStatus = 'not-ingested' | 'preview-ready' | 'retrieval-ready' | 'disabled';
export type Resource = { id: string; provider: Provider; providerId: string; type: 'arabic' | 'translation' | 'tafsir' | 'word-by-word' | 'mutashabihat' | 'hadith' | 'book'; title: string; language: string; url: string; author?: string; translator?: string; editor?: string; edition: string; approval: 'pending' | 'approved' | 'rejected'; sourceReviewStatus?: SourceReviewStatus; usagePermissionStatus?: UsagePermissionStatus; technicalStatus?: TechnicalStatus; reviewer?: string; reviewedAt?: Date; reviewNotes?: string };
export type Reference = { kind: 'quran'; surah: number; start: number; end: number } | { kind: 'hadith'; collection: string; number: string };
export type Evidence = { resourceId: string; provider: Provider; originalText: string; normalizedText: string; locator: string; structuredLocator?: Reference; sourceUrl: string; sourceTitle?: string; language: string; translationIdentity: string; author?: string; edition: string; context?: string; grades: { authority: string; grade: string }[]; limitations: string[]; retrievedAt: string };
export type ProviderResult = { outcome: Outcome; evidence: Evidence[]; limitations: string[]; attempts: number };
export interface Adapter { capabilities: { referenceLookup: boolean; quotationSearch: boolean; contextRetrieval: boolean; bookSearch: boolean }; retrieve(resource: Resource, reference?: Reference, quotation?: string): Promise<ProviderResult> }
// Book providers need three independent decisions. Non-book providers retain the
// existing approval gate until their records are migrated to the same model.
export function eligibleForEvidence(resource: Pick<Resource, 'provider' | 'approval' | 'type' | 'sourceReviewStatus' | 'usagePermissionStatus' | 'technicalStatus'>) {
  if (resource.approval !== 'approved') return false;
  if (resource.provider === 'shamela') return false;
  if (resource.type !== 'book') return true;
  return resource.sourceReviewStatus === 'approved'
    && resource.usagePermissionStatus === 'permitted'
    && resource.technicalStatus === 'retrieval-ready';
}
export function normalize(text: string) { return text.normalize('NFC').trim().replace(/\s+/gu, ' '); }
// Explicit numeric references only; provider validates actual verse existence.
export function parseReference(text: string): Reference | undefined {
  const q = /^(?:(?:quran|surah)\s+)?(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?$/i.exec(text.trim());
  if (q) { const [, s, a, b] = q; const surah = +s, start = +a, end = +(b ?? a); if (surah < 1 || surah > 114 || start < 1 || end > 286 || end < start || end - start >= 5) throw new Error('Use a valid Quran reference with at most five verses.'); return { kind: 'quran', surah, start, end }; }
  const h = /^(bukhari|muslim|abudawud|tirmidhi|nasai|ibnmajah|malik|riyadussalihin|adab|shamail|bulugh|nawawi40|qudsi40|shahwaliullah40)\s*[: ]\s*(\d{1,5}[a-z]?)$/i.exec(text.trim());
  return h ? { kind: 'hadith', collection: h[1].toLowerCase(), number: h[2] } : undefined;
}
export function comparison(quote: string, evidence: Evidence[]) {
  if (!quote || !evidence.length) return 'inconclusive';
  if (evidence.some(e => normalize(e.originalText).includes(normalize(quote)))) return 'exact_match';
  return evidence.some(e => e.translationIdentity) ? 'wording_difference' : 'context_needed';
}
