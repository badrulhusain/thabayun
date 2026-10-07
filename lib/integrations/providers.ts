import 'server-only';
import { type Adapter, type Evidence, type Resource, normalize } from './contracts';
import { ProviderError, requestJson } from './request';
import { object, string } from '../claims/validation';
const capabilities = { referenceLookup: true, quotationSearch: false, contextRetrieval: false, bookSearch: false };
let token: { value: string; expires: number; identity: string } | undefined;
async function quranToken(force = false) {
  const id = process.env.QF_CLIENT_ID!, secret = process.env.QF_CLIENT_SECRET!, production = process.env.QF_ENV === 'production';
  const identity = `${production}:${id}`;
  if (!force && token?.identity === identity && token.expires > Date.now()) return token.value;
  const { data } = await requestJson(`https://${production ? '' : 'prelive-'}oauth2.quran.foundation/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials&scope=content' });
  const d = object(data); token = { value: string(d.access_token, 10000), expires: Date.now() + Math.max(0, Math.min(Number(d.expires_in) || 3600, 3600) - 60) * 1000, identity }; return token.value;
}
function base(r: Resource, text: string, locator: string, url: string): Evidence {
  return { resourceId: r.id, provider: r.provider, originalText: string(text, 50000), normalizedText: normalize(text), locator, sourceUrl: url, language: r.language, translationIdentity: r.type === 'translation' || r.type === 'tafsir' ? r.providerId : '', author: r.author, edition: r.edition, grades: [], limitations: ['Surrounding context was not retrieved.', 'A wording match does not establish authenticity or scholarly agreement.'], retrievedAt: new Date().toISOString() };
}
export const quran: Adapter = { capabilities, async retrieve(r, ref) {
  if (!process.env.QF_CLIENT_ID || !process.env.QF_CLIENT_SECRET) return { outcome: 'not_configured', evidence: [], limitations: ['Quran Foundation credentials missing.'], attempts: 0 };
  if (ref?.kind !== 'quran') return { outcome: 'unsupported', evidence: [], limitations: ['Explicit numeric surah:ayah reference required; quotation search is not enabled.'], attempts: 0 };
  const evidence: Evidence[] = []; let attempts = 0;
  try {
    for (let n = ref.start; n <= ref.end; n++) {
      const key = `${ref.surah}:${n}`, params = new URLSearchParams({ fields: 'text_uthmani' });
      if (r.type === 'translation' || r.type === 'tafsir') { if (!/^\d+$/.test(r.providerId)) throw new Error('Invalid resource'); params.set(r.type === 'translation' ? 'translations' : 'tafsirs', r.providerId); }
      const url = `https://apis${process.env.QF_ENV === 'production' ? '' : '-prelive'}.quran.foundation/content/api/v4/verses/by_key/${key}?${params}`;
      let result;
      try { result = await requestJson(url, { headers: { 'x-client-id': process.env.QF_CLIENT_ID!, 'x-auth-token': await quranToken() } }); }
      catch (e) { if (!(e instanceof ProviderError) || e.httpStatus !== 401) throw e; result = await requestJson(url, { headers: { 'x-client-id': process.env.QF_CLIENT_ID!, 'x-auth-token': await quranToken(true) } }); }
      attempts += result.attempts; const verse = object(object(result.data).verse); if (verse.verse_key !== key) throw new Error('Reference mismatch');
      let text = verse.text_uthmani;
      if (r.type === 'translation' || r.type === 'tafsir') { const entries = verse[r.type === 'translation' ? 'translations' : 'tafsirs']; if (!Array.isArray(entries)) throw new Error('Missing text'); text = entries.map(object).find(t => String(t.resource_id) === r.providerId)?.text; }
      evidence.push({ ...base(r, string(text, 50000), key, `https://quran.com/${ref.surah}/${n}`), structuredLocator: { kind: 'quran', surah: ref.surah, start: n, end: n } });
    }
    return { outcome: 'success', evidence, limitations: process.env.QF_ENV === 'production' ? [] : ['Prelive covers surahs 1 and 2 only; production requires approved access.'], attempts };
  } catch (e) { return { outcome: e instanceof ProviderError ? e.outcome : 'error', evidence, limitations: ['Quran retrieval incomplete or response invalid.'], attempts: attempts + (e instanceof ProviderError ? e.attempts : 0) }; }
} };
export const sunnah: Adapter = { capabilities, async retrieve(r, ref) {
  if (!process.env.SUNNAH_API_KEY) return { outcome: 'not_configured', evidence: [], limitations: ['Sunnah API key missing.'], attempts: 0 };
  if (ref?.kind !== 'hadith' || ref.collection !== r.providerId) return { outcome: 'unsupported', evidence: [], limitations: ['Collection:hadithNumber reference required. Quotation search unsupported.'], attempts: 0 };
  try {
    const { data, attempts } = await requestJson(`https://api.sunnah.com/v1/collections/${ref.collection}/hadiths/${ref.number}`, { headers: { 'X-API-Key': process.env.SUNNAH_API_KEY } });
    const d = object(data); if (d.collection !== ref.collection || String(d.hadithNumber) !== ref.number || !Array.isArray(d.hadith)) throw new Error('Malformed reference');
    const rows = d.hadith.map(object).filter(h => h.lang === r.language);
    const evidence = rows.map(h => { const e = base(r, string(h.body, 50000), `${ref.collection}:${ref.number}`, `https://sunnah.com/${ref.collection}:${ref.number}`); e.grades = Array.isArray(h.grades) ? h.grades.map(g => { const grade = object(g); return { authority: string(grade.graded_by, 500), grade: string(grade.grade, 500) }; }) : []; e.limitations.push('API coverage is limited; absence is not proof of fabrication.', 'Provider HTML is preserved as inert source text.'); return e; });
    return { outcome: evidence.length ? 'success' : 'no_match', evidence, attempts, limitations: ['Collection numbering uses the official API hadithNumber, not book-local numbering.'] };
  } catch (e) { return { outcome: e instanceof ProviderError ? e.outcome : 'error', evidence: [], attempts: e instanceof ProviderError ? e.attempts : 1, limitations: ['Provider failed or returned invalid evidence; no religious verdict follows.'] }; }
} };
export const turath: Adapter = { capabilities: { ...capabilities, referenceLookup: false }, async retrieve() { return { outcome: 'unavailable', evidence: [], attempts: 0, limitations: ['An authorized Turath contract has not been verified. No live endpoints or fixtures are substituted.'] }; } };
export const parse: Adapter = { capabilities: { ...capabilities, referenceLookup: false }, async retrieve() { return { outcome: 'not_configured', evidence: [], attempts: 0, limitations: ['Supply and review the configured Parse API OpenAPI specification and approved source mapping before enabling extraction. Parse is an extraction service, not a scholarly authority. No scraping jobs are created.'] }; } };
export const adapters = { 'quran-foundation': quran, sunnah, turath, parse };
