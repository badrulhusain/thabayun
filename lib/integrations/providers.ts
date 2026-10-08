import 'server-only';
import { type Adapter, type Evidence, type Resource, normalize } from './contracts';
import { ProviderError, requestJson } from './request';
import { object, string } from '../claims/validation';
import { retrieveOpenITI } from './local-books';
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
export const quran: Adapter = { capabilities: { ...capabilities, quotationSearch: true }, async retrieve(r, ref, quotation) {
  if (!process.env.QF_CLIENT_ID || !process.env.QF_CLIENT_SECRET) return { outcome: 'not_configured', evidence: [], limitations: ['Quran Foundation credentials missing.'], attempts: 0 };
  if (!ref && (!quotation || !quotation.trim())) return { outcome: 'unsupported', evidence: [], limitations: ['Explicit numeric surah:ayah reference or quotation required.'], attempts: 0 };
  if (ref && ref.kind !== 'quran') return { outcome: 'unsupported', evidence: [], limitations: ['A Quran reference or quotation is required.'], attempts: 0 };
  if (ref && process.env.QF_ENV !== 'production' && ref.surah > 2) return { outcome: 'unsupported', evidence: [], limitations: ['This deployment uses Quran Foundation prelive, which contains only surahs 1 and 2. This is a coverage limit, not a missing Quran verse. Approved production access is required for this reference.'], attempts: 0 };
  const evidence: Evidence[] = []; let attempts = 0;
  try {
    if (!ref) {
      if (process.env.QF_ENV !== 'production') return { outcome: 'unsupported', evidence: [], limitations: ['Quotation search requires production access.'], attempts: 0 };
      const q = quotation!.trim();
      const params = new URLSearchParams({ q, size: '5' });
      if (r.language) params.set('language', r.language);
      const url = `https://apis.quran.foundation/content/api/v4/search?${params}`;
      let result;
      try { result = await requestJson(url, { headers: { 'x-client-id': process.env.QF_CLIENT_ID!, 'x-auth-token': await quranToken() } }); }
      catch (e) { if (!(e instanceof ProviderError) || e.httpStatus !== 401) throw e; result = await requestJson(url, { headers: { 'x-client-id': process.env.QF_CLIENT_ID!, 'x-auth-token': await quranToken(true) } }); }
      attempts += result.attempts;

      const searchRes = object(result.data);
      const searchObj = searchRes.search ? object(searchRes.search) : {};
      if (Array.isArray(searchObj.results)) {
        for (const item of searchObj.results) {
          const match = object(item);
          const key = String(match.verse_key);
          const [s, a] = key.split(':').map(Number);
          const verseRef = { kind: 'quran' as const, surah: s, start: a, end: a };
          const verseResult = await quran.retrieve(r, verseRef);
          attempts += verseResult.attempts;
          evidence.push(...verseResult.evidence);
          if (evidence.length >= 5) break;
        }
      }
      return { outcome: evidence.length ? 'success' : 'no_match', evidence, limitations: [], attempts };
    }
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
export const ummah: Adapter = { capabilities: { ...capabilities, quotationSearch: true }, async retrieve(r, ref, quotation) {
  const headers: Record<string, string> = {};
  if (process.env.UMMAH_API_KEY?.trim()) headers['X-API-Key'] = process.env.UMMAH_API_KEY.trim();
  const quranText = (verse: Record<string, unknown>) => r.type === 'arabic' ? verse.arabic : object(verse.translations)[r.providerId];
  const hadithEvidence = (row: Record<string, unknown>) => {
    const collection = string(row.collection, 100), number = String(row.hadithnumber);
    if (r.providerId !== 'all' && collection !== r.providerId || !/^\d{1,5}[a-z]?$/.test(number)) throw new Error('Malformed hadith');
    const e = base(r, string(r.language === 'ar' ? row.arabic : row.english, 50000), `${collection}:${number}`, `https://ummahapi.com/api/hadith/${collection}/${number}`);
    if (typeof row.grade === 'string' && row.grade.trim()) e.grades = [{ authority: string(row.collection_name ?? 'Collection source', 500), grade: string(row.grade, 500) }];
    e.limitations.push('API coverage is limited; absence is not proof of fabrication.'); return e;
  };
  try {
    if (ref?.kind === 'quran') {
      if (r.type === 'word-by-word') {
        const evidence: Evidence[] = []; let attempts = 0;
        for (let ayah = ref.start; ayah <= ref.end; ayah++) {
          const key = `${ref.surah}:${ayah}`, url = `https://ummahapi.com/api/quran/words/${ref.surah}/${ayah}`;
          const result = await requestJson(url, { headers }); attempts += result.attempts;
          const res = object(result.data), data = object(res.data); if (res.success !== true || data.verse_key !== key || !Array.isArray(data.words)) throw new Error('Malformed word-by-word response');
          const text = data.words.map(item => { const word = object(item), transliteration = object(word.transliteration); return `${string(word.arabic, 500)} — ${string(transliteration.text, 500)} — ${string(word.translation, 1000)}`; }).join('\n');
          const e = base(r, text, key, url); e.structuredLocator = { kind: 'quran', surah: ref.surah, start: ayah, end: ayah }; e.limitations.push('Word meanings are concise glosses, not a substitute for grammar, context, or tafsir.'); evidence.push(e);
        }
        return { outcome: 'success', evidence, attempts, limitations: [] };
      }
      if (r.type === 'tafsir') {
        const evidence: Evidence[] = []; let attempts = 0;
        for (let ayah = ref.start; ayah <= ref.end; ayah++) {
          const key = `${ref.surah}:${ayah}`, url = `https://ummahapi.com/api/tafsir/${encodeURIComponent(r.providerId)}/surah/${ref.surah}/ayah/${ayah}`;
          const result = await requestJson(url, { headers }); attempts += result.attempts;
          const res = object(result.data), data = object(res.data), tafsir = object(data.tafsir); if (res.success !== true || data.verse_key !== key || tafsir.key !== r.providerId) throw new Error('Malformed tafsir response');
          const e = base(r, string(tafsir.text, 50000), key, url); e.structuredLocator = { kind: 'quran', surah: ref.surah, start: ayah, end: ayah }; e.limitations.push('Tafsir is attributed scholarly commentary and must not be presented as the Quran text itself.'); evidence.push(e);
        }
        return { outcome: 'success', evidence, attempts, limitations: [] };
      }
      if (r.type === 'mutashabihat') {
        const evidence: Evidence[] = []; let attempts = 0;
        for (let ayah = ref.start; ayah <= ref.end; ayah++) {
          const key = `${ref.surah}:${ayah}`, url = `https://ummahapi.com/api/quran/mutashabihat/${ref.surah}/${ayah}`;
          let result; try { result = await requestJson(url, { headers }); } catch (error) { if (error instanceof ProviderError && error.outcome === 'no_match') { attempts += error.attempts; continue; } throw error; }
          attempts += result.attempts; const res = object(result.data), data = object(res.data); if (res.success !== true || data.verse_key !== key || !Array.isArray(data.similar_verses)) throw new Error('Malformed mutashabihat response');
          const field = r.language === 'ar' ? 'arabic' : 'translation', source = string(data[field], 50000);
          const parallels = data.similar_verses.map(item => { const verse = object(item); return `${string(verse.verse_key, 20)}: ${string(verse[field], 50000)}`; }).join('\n\n');
          const e = base(r, `${key}: ${source}\n\nSimilar-verse dataset:\n${parallels}`, key, url); e.structuredLocator = { kind: 'quran', surah: ref.surah, start: ayah, end: ayah }; e.limitations.push('Similarity is provider-dataset metadata, not proof that verses are interchangeable or contextually equivalent.'); evidence.push(e);
        }
        return { outcome: evidence.length ? 'success' : 'no_match', evidence, attempts, limitations: evidence.length ? [] : ['No recorded similar verses for this reference.'] };
      }
      if (!['arabic', 'translation'].includes(r.type)) return { outcome: 'unsupported', evidence: [], limitations: ['Use an Arabic, translation, tafsir, word-by-word, or mutashabihat resource for Quran lookup.'], attempts: 0 };
      const evidence: Evidence[] = []; let attempts = 0;
      for (let ayah = ref.start; ayah <= ref.end; ayah++) {
        const url = `https://ummahapi.com/api/quran/surah/${ref.surah}/ayah/${ayah}`;
        const result = await requestJson(url, { headers }); attempts += result.attempts;
        const res = object(result.data); if (res.success !== true) throw new Error('API reported failure');
        const verse = object(object(res.data).verse), key = `${ref.surah}:${ayah}`;
        if (verse.verse_key !== key || Number(verse.ayah) !== ayah) throw new Error('Malformed reference');
        const e = base(r, string(quranText(verse), 50000), key, url);
        e.structuredLocator = { kind: 'quran', surah: ref.surah, start: ayah, end: ayah }; evidence.push(e);
      }
      return { outcome: 'success', evidence, attempts, limitations: [] };
    }
    if (ref?.kind === 'hadith') {
      if (r.type !== 'hadith' || ref.collection !== r.providerId) return { outcome: 'unsupported', evidence: [], limitations: ['The approved resource does not match this hadith collection.'], attempts: 0 };
      const { data, attempts } = await requestJson(`https://ummahapi.com/api/hadith/${ref.collection}/${ref.number}`, { headers });
      const res = object(data); if (res.success !== true) throw new Error('API reported failure');
      return { outcome: 'success', evidence: [hadithEvidence(object(res.data))], attempts, limitations: [] };
    }
    if (!quotation?.trim()) return { outcome: 'unsupported', evidence: [], limitations: ['A Quran/hadith reference or quotation is required.'], attempts: 0 };
    const params = new URLSearchParams({ q: quotation.trim(), limit: '5' });
    if (r.type === 'hadith') { if (r.providerId !== 'all') params.set('collection', r.providerId); }
    else if (r.type === 'translation') params.set('translation', r.providerId);
    else if (r.type !== 'arabic') return { outcome: 'unsupported', evidence: [], limitations: ['Quotation search needs an Arabic/translated Quran or hadith resource.'], attempts: 0 };
    const endpoint = r.type === 'hadith' ? 'hadith' : 'quran';
    let result = await requestJson(`https://ummahapi.com/api/${endpoint}/search?${params}`, { headers });
    let res = object(result.data); if (res.success !== true) throw new Error('API reported failure');
    let payload = object(res.data), rows = payload[r.type === 'hadith' ? 'hadiths' : 'results'];
    if (!Array.isArray(rows)) throw new Error('Malformed search response');
    let attempts = result.attempts, usedNearMatch = false;
    if (!rows.length && r.type === 'hadith' && /\p{Script=Arabic}/u.test(quotation)) {
      const plain = quotation.normalize('NFKD').replace(/[\u064b-\u065f\u0670]/gu, '');
      const glossary: Record<string, string> = { الأعمال: 'deeds', عمل: 'deeds', النيات: 'intentions', نية: 'intentions', الدين: 'religion', الإيمان: 'faith', الاسلام: 'islam', الإسلام: 'islam', الصلاة: 'prayer', الزكاة: 'charity', الصيام: 'fasting', العلم: 'knowledge', الرحمة: 'mercy', الجنة: 'paradise', النار: 'fire', الصدق: 'truth', الكذب: 'lie', الحلال: 'lawful', الحرام: 'unlawful' };
      glossary['\u0627\u0644\u0627\u0639\u0645\u0627\u0644'] = 'deeds'; glossary['\u0627\u0644\u0627\u064a\u0645\u0627\u0646'] = 'faith';
      const translated = plain.split(/[^\p{Script=Arabic}]+/u).map(token => glossary[token]).find(Boolean);
      if (translated) {
        const fallback = new URLSearchParams({ q: translated, limit: '25' }); if (r.providerId !== 'all') fallback.set('collection', r.providerId);
        result = await requestJson(`https://ummahapi.com/api/hadith/search?${fallback}`, { headers }); attempts += result.attempts;
        res = object(result.data); if (res.success !== true) throw new Error('API reported failure');
        payload = object(res.data); rows = payload.hadiths; if (!Array.isArray(rows)) throw new Error('Malformed search response'); usedNearMatch = rows.length > 0;
      }
    }    if (!rows.length && r.type === 'arabic' && /\p{Script=Arabic}/u.test(quotation)) {
      const tokens = quotation.match(/[\p{Script=Arabic}\u064b-\u065f\u0670]+/gu) ?? [];
      const marks = /[\u064b-\u065f\u0670]/gu, article = /^[اأإآٱ][\u064b-\u065f\u0670]*ل[\u064b-\u065f\u0670]*/u;
      const candidates = tokens.map(token => ({ query: token.replace(article, ''), priority: (article.test(token) ? 100 : 0) + token.replace(marks, '').length })).filter(item => item.query.replace(marks, '').length >= 3).sort((a, b) => b.priority - a.priority);
      if (candidates[0]) {
        const fallback = new URLSearchParams({ q: candidates[0].query, limit: '25' });
        result = await requestJson(`https://ummahapi.com/api/quran/search?${fallback}`, { headers }); attempts += result.attempts;
        res = object(result.data); if (res.success !== true) throw new Error('API reported failure');
        payload = object(res.data); rows = payload.results; if (!Array.isArray(rows)) throw new Error('Malformed search response'); usedNearMatch = rows.length > 0;
      }
    }
    const evidence = rows.slice(0, 5).map(item => {
      const row = object(item); if (r.type === 'hadith') return hadithEvidence(row);
      const key = string(row.verse_key, 20), [surah, ayah] = key.split(':').map(Number);
      if (!surah || !ayah) throw new Error('Malformed Quran result');
      const text = r.type === 'arabic' ? row.arabic : row.translation;
      const e = base(r, string(text, 50000), key, `https://ummahapi.com/api/quran/surah/${surah}/ayah/${ayah}`);
      e.structuredLocator = { kind: 'quran', surah, start: ayah, end: ayah }; if (usedNearMatch) e.limitations.push('Candidate retrieved by a distinctive-token near-match search; compare the wording carefully.'); return e;
    });
    const noMatch = r.type === 'hadith'
      ? ['No matching wording was found in this approved hadith collection. Absence does not establish that a report is fabricated or absent from other collections.']
      : ['No matching wording was found in this approved Quran text or translation.'];
    return { outcome: evidence.length ? 'success' : 'no_match', evidence, attempts, limitations: usedNearMatch ? ['No exact quotation result; showing bounded translated-keyword or distinctive-token near-match candidates.'] : evidence.length ? [] : noMatch };
  } catch (e) { return { outcome: e instanceof ProviderError ? e.outcome : 'error', evidence: [], attempts: e instanceof ProviderError ? e.attempts : 1, limitations: ['UmmahAPI failed or returned invalid evidence; no religious verdict follows.'] }; }
} };
export const turath: Adapter = { capabilities: { ...capabilities, referenceLookup: false, quotationSearch: true, contextRetrieval: true, bookSearch: true }, async retrieve(r, _ref, quotation) {
  if (!/^\d+$/.test(r.providerId)) return { outcome: 'error', evidence: [], attempts: 0, limitations: ['Turath provider ID must be numeric.'] };
  if (!quotation?.trim()) return { outcome: 'unsupported', evidence: [], attempts: 0, limitations: ['Turath retrieval requires an explicit quotation; page references are provider-specific.'] };
  try {
    const params = new URLSearchParams({ q: quotation.trim(), book: r.providerId, ver: '3' });
    const { data, attempts } = await requestJson(`https://api.turath.io/search?${params}`);
    const payload = object(data); if (!Array.isArray(payload.data)) throw new Error('Malformed Turath search response');
    const evidence = payload.data.slice(0, 5).map(item => {
      const row = object(item); if (String(row.book_id) !== r.providerId) throw new Error('Turath book mismatch');
      const meta = object(JSON.parse(string(row.meta, 10000))), page = Number(meta.page), vol = string(meta.vol, 50);
      const e = base(r, string(row.text, 50000).replace(/<\/?em>/g, ''), `${vol}/${page}`, `https://app.turath.io/book/${r.providerId}?page=${Number(row.book_id) === Number(r.providerId) ? Number(meta.page_id) : ''}`);
      e.context = `Turath page ${page}, volume ${vol}; provider page ID ${String(meta.page_id)}.`;
      e.limitations.push('Turath is a live public service and may be unavailable; verify quotations against the stated print edition.'); return e;
    });
    return { outcome: evidence.length ? 'success' : 'no_match', evidence, attempts, limitations: [] };
  } catch (e) { return { outcome: e instanceof ProviderError ? e.outcome : 'error', evidence: [], attempts: e instanceof ProviderError ? e.attempts : 1, limitations: [e instanceof Error ? `Turath request failed: ${e.message}` : 'Turath request failed.'] }; }
} };
export const openiti: Adapter = { capabilities: { ...capabilities, referenceLookup: false, quotationSearch: true, contextRetrieval: true, bookSearch: true }, async retrieve(r, _ref, quotation) { return retrieveOpenITI(r, quotation); } };
export const parse: Adapter = { capabilities: { ...capabilities, referenceLookup: false }, async retrieve() { return { outcome: 'not_configured', evidence: [], attempts: 0, limitations: ['Supply and review the configured Parse API OpenAPI specification and approved source mapping before enabling extraction. Parse is an extraction service, not a scholarly authority. No scraping jobs are created.'] }; } };
export const adapters = { 'quran-foundation': quran, sunnah, ummah, turath, openiti, parse };
