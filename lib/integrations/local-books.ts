import 'server-only';
import type { Evidence, ProviderResult, Resource } from './contracts';
import { SourceBooks, SourcePassages } from './database';

export function foldArabic(value: string) {
  return value.normalize('NFC').replace(/[\u064b-\u065f\u0670\u0640]/gu, '').replace(/[إأآٱ]/gu, 'ا').replace(/ى/gu, 'ي').replace(/ؤ/gu, 'و').replace(/ئ/gu, 'ي').replace(/\s+/gu, ' ').trim();
}
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type LocalCandidate = { normalizedText?: unknown; sequence?: unknown; [key: string]: unknown };
const arabicStopTokens = new Set(['\u0645\u0646', '\u0641\u064a', '\u0639\u0644\u0649', '\u0645\u0627', '\u0644\u0627', '\u0648\u0644\u0627', '\u0627\u0648', '\u0648']);
const tokenSet = (value: string) => new Set(foldArabic(value).split(/[^\p{L}\p{N}]+/u).filter(Boolean));
function discoveryTokens(value: string) {
  return [...tokenSet(value)].filter(token => token.length >= 3 && !arabicStopTokens.has(token))
    .sort((a, b) => b.length - a.length).slice(0, 8);
}
export function rankLocalBookCandidates(query: string, candidates: LocalCandidate[], limit = 20) {
  const tokens = discoveryTokens(query);
  if (tokens.length < 2) return [];
  const required = Math.max(2, Math.ceil(tokens.length * 0.4));
  return candidates.map(passage => {
    const words = tokenSet(String(passage.normalizedText ?? ''));
    return { passage, overlap: tokens.reduce((count, token) => count + Number(words.has(token)), 0) };
  }).filter(item => item.overlap >= required)
    .sort((a, b) => b.overlap - a.overlap || Number(a.passage.sequence ?? 0) - Number(b.passage.sequence ?? 0))
    .slice(0, Math.min(limit, 50)).map(item => ({ ...item.passage, matchType: 'near' as const }));
}

export async function searchLocalBook(query: string, options: { bookId?: string; includePending?: boolean; limit?: number } = {}) {
  const term = foldArabic(query).slice(0, 300);
  const books = await SourceBooks.find({ ...(options.bookId ? { id: options.bookId } : {}), ...(!options.includePending ? { approval: 'approved', sourceReviewStatus: 'approved', usagePermissionStatus: 'permitted', technicalStatus: 'retrieval-ready' } : {}) }).lean();
  if (!term || !books.length) return { books, passages: [], matchType: 'none' as const };
  const bookScope = { bookId: { $in: books.map(book => book.id) } };
  const limit = Math.min(options.limit ?? 20, 50);
  const exact = await SourcePassages.find({ ...bookScope, normalizedText: { $regex: escapeRegex(term), $options: 'i' } }).sort({ sequence: 1 }).limit(limit).lean();
  if (exact.length) return { books, passages: exact.map(passage => ({ ...passage, matchType: 'exact' as const })), matchType: 'exact' as const };
  const tokens = discoveryTokens(term);
  if (tokens.length < 2) return { books, passages: [], matchType: 'none' as const };
  const batches = await Promise.all(tokens.map(token => SourcePassages.find({ ...bookScope, normalizedText: { $regex: escapeRegex(token), $options: 'i' } }).sort({ sequence: 1 }).limit(50).lean() as unknown as Promise<LocalCandidate[]>));
  const candidates = [...new Map(batches.flat().map(passage => [String(passage.id), passage])).values()];
  const passages = rankLocalBookCandidates(term, candidates, limit);
  return { books, passages, matchType: passages.length ? 'near' as const : 'none' as const };
}

export async function retrieveOpenITI(resource: Resource, quotation?: string): Promise<ProviderResult> {
  if (!quotation?.trim()) return { outcome: 'unsupported', evidence: [], attempts: 0, limitations: ['OpenITI local retrieval requires an explicit quotation.'] };
  const { books, passages, matchType } = await searchLocalBook(quotation, { bookId: resource.id, limit: 5 });
  const book = books[0];
  if (!book) return { outcome: 'not_configured', evidence: [], attempts: 0, limitations: ['The selected OpenITI resource is not eligible: it must be imported, scholarly-source approved, usage permitted, and retrieval-ready.'] };
  const evidence: Evidence[] = passages.map(p => ({
    resourceId: resource.id, provider: 'openiti', originalText: String(p.originalText), normalizedText: String(p.normalizedText), locator: String(p.locator),
    sourceUrl: String(book.sourceUrl), language: 'ar', translationIdentity: '', author: String(book.author), edition: String(book.edition),
    context: `Original OpenITI page marker: ${p.pageMarker}`, grades: [], retrievedAt: new Date().toISOString(),
    limitations: ['OpenITI corpus text quality varies; verify citations against the identified print edition.', matchType === 'near' ? 'Candidate retrieved by bounded distinctive-token matching; it is not an exact quotation match.' : 'Local search used literal normalized-text matching, not a remote OpenITI search API.'],
  }));
  return { outcome: evidence.length ? 'success' : 'no_match', evidence, attempts: 1, limitations: matchType === 'near' ? ['Only near-match candidates were located; compare their wording and context manually.'] : evidence.length ? [] : ['No local literal or bounded near match in the selected OpenITI text.'] };
}
