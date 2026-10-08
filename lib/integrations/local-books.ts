import 'server-only';
import type { Evidence, ProviderResult, Resource } from './contracts';
import { SourceBooks, SourcePassages } from './database';

export function foldArabic(value: string) {
  return value.normalize('NFC').replace(/[\u064b-\u065f\u0670\u0640]/gu, '').replace(/[إأآٱ]/gu, 'ا').replace(/ى/gu, 'ي').replace(/ؤ/gu, 'و').replace(/ئ/gu, 'ي').replace(/\s+/gu, ' ').trim();
}
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function searchLocalBook(query: string, options: { bookId?: string; includePending?: boolean; limit?: number } = {}) {
  const term = foldArabic(query).slice(0, 300);
  const books = await SourceBooks.find({ ...(options.bookId ? { id: options.bookId } : {}), ...(!options.includePending ? { approval: 'approved' } : {}) }).lean();
  if (!term || !books.length) return { books, passages: [] };
  const passages = await SourcePassages.find({ bookId: { $in: books.map(book => book.id) }, normalizedText: { $regex: escapeRegex(term), $options: 'i' } }).sort({ sequence: 1 }).limit(Math.min(options.limit ?? 20, 50)).lean();
  return { books, passages };
}

export async function retrieveOpenITI(resource: Resource, quotation?: string): Promise<ProviderResult> {
  if (!quotation?.trim()) return { outcome: 'unsupported', evidence: [], attempts: 0, limitations: ['OpenITI local retrieval requires an explicit quotation.'] };
  const { books, passages } = await searchLocalBook(quotation, { bookId: resource.id, limit: 5 });
  const book = books[0];
  if (!book) return { outcome: 'not_configured', evidence: [], attempts: 0, limitations: ['The selected OpenITI resource is not locally imported and approved.'] };
  const evidence: Evidence[] = passages.map(p => ({
    resourceId: resource.id, provider: 'openiti', originalText: String(p.originalText), normalizedText: String(p.normalizedText), locator: String(p.locator),
    sourceUrl: String(book.sourceUrl), language: 'ar', translationIdentity: '', author: String(book.author), edition: String(book.edition),
    context: `Original OpenITI page marker: ${p.pageMarker}`, grades: [], retrievedAt: new Date().toISOString(),
    limitations: ['OpenITI corpus text quality varies; verify citations against the identified print edition.', 'Local search is literal normalized-text matching, not a remote OpenITI search API.'],
  }));
  return { outcome: evidence.length ? 'success' : 'no_match', evidence, attempts: 1, limitations: evidence.length ? [] : ['No local literal match in the selected OpenITI text.'] };
}