/* eslint-disable @typescript-eslint/no-require-imports -- Documented provider shapes with synthetic source text, no live requests. */
require('./search.cjs');
const assert = require('node:assert/strict');
const Module = require('node:module'), load = Module._load;
Module._load = function(name, ...args) { return name === 'server-only' ? {} : load.call(this, name, ...args); };
const { quran, sunnah, ummah, shamela, turath, parse } = require('../lib/integrations/providers.ts');
const { arabicSearchQueries, hasArabic } = require('../lib/integrations/query-planner.ts');
const { requestJson } = require('../lib/integrations/request.ts');
const { parseReference, comparison } = require('../lib/integrations/contracts.ts');
Module._load = load;
const resource = { id: 'fixture-quran', provider: 'quran-foundation', providerId: 'text_uthmani', type: 'arabic', title: 'Synthetic fixture', language: 'ar', edition: 'fixture-only', url: 'https://quran.com', approval: 'approved' };
async function main() {
  const original = global.fetch;
  process.env.QF_CLIENT_ID = 'fixture'; process.env.QF_CLIENT_SECRET = 'fixture'; process.env.SUNNAH_API_KEY = 'fixture'; process.env.PARSE_API_KEY = 'fixture'; process.env.GROQ_API_KEY = 'fixture';
  try {
    assert.deepEqual(parseReference('Quran 2:255'), { kind: 'quran', surah: 2, start: 255, end: 255 });
    assert.equal(hasArabic('seek knowledge'), false); assert.equal(hasArabic('اطلبوا العلم'), true);
    const planned = await arabicSearchQueries('seek knowledge even from china', undefined, async request => {
      assert.equal(request.task, 'search');
      return { output: { queries: ['اطلبوا العلم ولو بالصين'] }, model: 'fixture' };
    });
    assert.deepEqual(planned, ['اطلبوا العلم ولو بالصين']);
    assert.throws(() => parseReference('2:1-10')); assert.throws(() => parseReference('115:1'));
    global.fetch = async () => { throw new Error('Out-of-coverage lookup must not call the provider'); };
    process.env.QF_ENV = 'prelive';
    const outside = await quran.retrieve(resource, parseReference('49:13'));
    assert.equal(outside.outcome, 'unsupported'); assert.equal(outside.attempts, 0);
    const requests = [];
    global.fetch = async (url, init) => { requests.push([url, init]); return url.includes('oauth2/token') ? Response.json({ access_token: 'fixture-token', expires_in: 3600 }) : Response.json({ verse: { verse_key: '2:255', text_uthmani: 'نص تجريبي', translations: [{ resource_id: 20, text: 'SYNTHETIC translation' }] } }); };
    const result = await quran.retrieve(resource, parseReference('2:255')); assert.equal(result.outcome, 'success'); assert.equal(result.evidence[0].originalText, 'نص تجريبي');
    assert.ok(requests[1][0].includes('/verses/by_key/2:255?fields=text_uthmani')); assert.equal(requests[0][1].method, 'POST');
    assert.equal(comparison('نص تجريبي', result.evidence), 'exact_match'); assert.equal(comparison('SYNTHETIC altered Arabic', result.evidence), 'context_needed');
    const translated = await quran.retrieve({ ...resource, type: 'translation', providerId: '20', language: 'en' }, parseReference('2:255'));
    assert.equal(comparison('SYNTHETIC different translation', translated.evidence), 'wording_difference');
    global.fetch = async () => Response.json({ verse: { verse_key: '2:254', text_uthmani: 'Wrong reference fixture' } }); assert.equal((await quran.retrieve(resource, parseReference('2:255'))).outcome, 'error');
    const hadith = { ...resource, provider: 'sunnah', providerId: 'bukhari', type: 'hadith', language: 'en' };
    global.fetch = async url => { assert.ok(url.endsWith('/collections/bukhari/hadiths/1')); return Response.json({ collection: 'bukhari', hadithNumber: '1', hadith: [{ lang: 'en', body: 'SYNTHETIC narration', grades: [{ graded_by: 'Fixture authority', grade: 'Fixture grade' }] }] }); };
    const h = await sunnah.retrieve(hadith, parseReference('bukhari:1')); assert.equal(h.outcome, 'success'); assert.equal(h.evidence[0].grades[0].authority, 'Fixture authority');
    assert.equal((await sunnah.retrieve(hadith)).outcome, 'unsupported');
    global.fetch = async () => new Response(null, { status: 404 }); assert.equal((await sunnah.retrieve(hadith, parseReference('bukhari:1'))).outcome, 'no_match');
    global.fetch = async () => Response.json({ hadith: 'malformed' }); assert.equal((await sunnah.retrieve(hadith, parseReference('bukhari:1'))).outcome, 'error');

    const ummahHadith = { ...resource, provider: 'ummah', providerId: 'bukhari', type: 'hadith', language: 'en' };
    global.fetch = async url => { assert.ok(url.endsWith('/hadith/bukhari/1')); return Response.json({ success: true, service: 'hadith', data: { collection: 'bukhari', hadithnumber: 1, english: 'SYNTHETIC ummah narration', grade: 'Ummah fixture grade' } }); };
    const uh = await ummah.retrieve(ummahHadith, parseReference('bukhari:1')); assert.equal(uh.outcome, 'success'); assert.equal(uh.evidence[0].grades[0].grade, 'Ummah fixture grade');
    assert.equal((await ummah.retrieve(ummahHadith)).outcome, 'unsupported');
    const ummahQuran = { ...resource, provider: 'ummah', providerId: 'sahih_international', type: 'translation', language: 'en' };
    global.fetch = async url => { assert.ok(url.endsWith('/quran/surah/2/ayah/255')); return Response.json({ success: true, service: 'quran-ayah', data: { verse: { verse_key: '2:255', ayah: 255, arabic: 'SYNTHETIC Arabic', translations: { sahih_international: 'SYNTHETIC Ummah translation' } } } }); };
    const uq = await ummah.retrieve(ummahQuran, parseReference('2:255')); assert.equal(uq.outcome, 'success'); assert.equal(uq.evidence[0].originalText, 'SYNTHETIC Ummah translation');
    global.fetch = async url => { assert.ok(url.includes('/quran/search?')); return Response.json({ success: true, service: 'quran-search', data: { results: [{ verse_key: '2:45', translation: 'SYNTHETIC patience result' }] } }); };
    const uqs = await ummah.retrieve(ummahQuran, undefined, 'patience'); assert.equal(uqs.outcome, 'success'); assert.equal(uqs.evidence[0].locator, '2:45');
    let arabicSearches = 0;
    global.fetch = async url => { arabicSearches++; assert.ok(url.includes('/quran/search?')); return Response.json({ success: true, service: 'quran-search', data: { results: arabicSearches === 1 ? [] : [{ verse_key: '94:5', arabic: 'فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا' }] } }); };
    const near = await ummah.retrieve({ ...ummahQuran, providerId: 'uthmani', type: 'arabic', language: 'ar' }, undefined, 'فَإِنَّ مَعَ الْعُسْرِ عُسْرًا'); assert.equal(near.outcome, 'success'); assert.equal(near.evidence[0].locator, '94:5'); assert.equal(arabicSearches, 2); assert.match(near.limitations[0], /near-match/);
    global.fetch = async url => { assert.ok(url.endsWith('/quran/words/94/5')); return Response.json({ success: true, data: { verse_key: '94:5', words: [{ arabic: 'يُسْرًا', transliteration: { text: 'yusran' }, translation: 'ease' }] } }); };
    const words = await ummah.retrieve({ ...ummahQuran, providerId: 'words', type: 'word-by-word' }, parseReference('94:5')); assert.equal(words.outcome, 'success'); assert.match(words.evidence[0].originalText, /yusran.*ease/);
    global.fetch = async url => { assert.ok(url.includes('/tafsir/ibn_kathir/surah/94/ayah/5')); return Response.json({ success: true, data: { verse_key: '94:5', tafsir: { key: 'ibn_kathir', text: 'SYNTHETIC attributed commentary' } } }); };
    const tafsir = await ummah.retrieve({ ...ummahQuran, providerId: 'ibn_kathir', type: 'tafsir' }, parseReference('94:5')); assert.equal(tafsir.outcome, 'success'); assert.match(tafsir.evidence[0].limitations.at(-1), /commentary/);
    global.fetch = async url => { assert.ok(url.endsWith('/quran/mutashabihat/3/136')); return Response.json({ success: true, data: { verse_key: '3:136', translation: 'SYNTHETIC source verse', similar_verses: [{ verse_key: '6:10', translation: 'SYNTHETIC parallel' }] } }); };
    const similar = await ummah.retrieve({ ...ummahQuran, providerId: 'mutashabihat', type: 'mutashabihat' }, parseReference('3:136')); assert.equal(similar.outcome, 'success'); assert.match(similar.evidence[0].originalText, /6:10/);
    global.fetch = async url => { assert.ok(url.includes('/hadith/search?')); return Response.json({ success: true, service: 'hadith-search', data: { hadiths: [{ collection: 'bukhari', collection_name: 'Sahih al-Bukhari', hadithnumber: 1, english: 'SYNTHETIC search narration', grade: 'Sahih' }] } }); };
    const uhs = await ummah.retrieve(ummahHadith, undefined, 'intentions'); assert.equal(uhs.outcome, 'success'); assert.equal(uhs.evidence[0].grades[0].authority, 'Sahih al-Bukhari');
    global.fetch = async () => Response.json({ success: true, service: 'hadith-search', data: { hadiths: [] } });
    const missingHadith = await ummah.retrieve(ummahHadith, undefined, 'seek knowledge even from china'); assert.equal(missingHadith.outcome, 'no_match'); assert.match(missingHadith.limitations[0], /other collections/);
    let similarHadithSearches = 0;
    global.fetch = async url => { similarHadithSearches++; assert.ok(url.includes('/hadith/search?')); if (similarHadithSearches === 2) assert.ok(url.includes('q=deeds')); return Response.json({ success: true, service: 'hadith-search', data: { hadiths: similarHadithSearches === 1 ? [] : [{ collection: 'bukhari', collection_name: 'Sahih al-Bukhari', hadithnumber: 1, arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', english: 'Deeds depend upon intentions', grade: 'Sahih' }] } }); };
    const similarHadith = await ummah.retrieve({ ...ummahHadith, providerId: 'all', language: 'ar' }, undefined, 'إنما الأعمال بالنتائج'); assert.equal(similarHadith.outcome, 'success'); assert.equal(similarHadith.evidence[0].locator, 'bukhari:1'); assert.equal(similarHadithSearches, 2); assert.match(similarHadith.limitations[0], /near-match/);
    global.fetch = async () => new Response(null, { status: 404 }); assert.equal((await ummah.retrieve(ummahHadith, parseReference('bukhari:1'))).outcome, 'no_match');
    global.fetch = async () => Response.json({ success: false }); assert.equal((await ummah.retrieve(ummahHadith, parseReference('bukhari:1'))).outcome, 'error');

    const shamelaResource = { ...resource, id: 'fixture-shamela', provider: 'shamela', providerId: 'all', type: 'book', title: 'Shamela fixture', language: 'ar', edition: 'Online page; print edition not supplied' };
    let shamelaCalls = 0;
    global.fetch = async url => {
      shamelaCalls++;
      if (url.includes('/search_books_by_content?')) return Response.json({ status: 'success', data: { results: [{ title: 'SYNTHETIC Arabic book', author: 'Fixture author', url: 'https://shamela.ws/book/21550/41', snippet: 'SYNTHETIC matching snippet' }] } });
      assert.ok(url.includes('/get_book_page?book_id=21550&page_number=41'));
      return Response.json({ status: 'success', data: { book_id: '21550', page_number: '41', book_title: 'SYNTHETIC Arabic book', author: 'Fixture author', content: 'SYNTHETIC full Arabic page evidence' } });
    };
    const sh = await shamela.retrieve(shamelaResource, undefined, 'SYNTHETIC Arabic query');
    assert.equal(sh.outcome, 'success'); assert.equal(shamelaCalls, 2); assert.equal(sh.evidence[0].sourceTitle, 'SYNTHETIC Arabic book'); assert.equal(sh.evidence[0].locator, 'SYNTHETIC Arabic book, Shamela page 41'); assert.match(sh.evidence[0].limitations.join(' '), /independent managed wrapper/);
    global.fetch = async () => Response.json({ status: 'success', data: { results: [{ title: 'Bad URL fixture', author: '', url: 'https://evil.example/book/1/1', snippet: '' }] } });
    assert.equal((await shamela.retrieve(shamelaResource, undefined, 'fixture')).outcome, 'error');

    global.fetch = async () => new Response(null, { status: 401 }); await assert.rejects(requestJson('https://fixture.test'), e => e.outcome === 'error' && e.attempts === 1);
    global.fetch = async () => new Response(null, { status: 429, headers: { 'retry-after': '60' } }); await assert.rejects(requestJson('https://fixture.test'), e => e.outcome === 'unavailable' && e.attempts === 1);
    let count = 0; global.fetch = async () => { count++; throw new DOMException('Synthetic timeout', 'TimeoutError'); }; await assert.rejects(requestJson('https://fixture.test'), e => e.outcome === 'unavailable' && e.attempts === 2); assert.equal(count, 2);
    const turathBook = { ...resource, provider: 'turath', providerId: '963', type: 'book', title: 'إعانة الطالبين', author: 'البكري الدمياطي', edition: 'دار الفكر، الأولى، 1418/1997' };
    global.fetch = async url => { assert.ok(url.includes('api.turath.io/search?')); return Response.json({ count: 1, data: [{ book_id: 963, meta: JSON.stringify({ page_id: 194, page: 200, vol: '1' }), text: 'نص <em>الصلاة</em> التجريبي' }] }); };
    const tr = await turath.retrieve(turathBook, undefined, 'الصلاة'); assert.equal(tr.outcome, 'success'); assert.equal(tr.evidence[0].locator, '1/200'); assert.equal(tr.evidence[0].originalText, 'نص الصلاة التجريبي');
    assert.equal((await turath.retrieve(turathBook)).outcome, 'unsupported'); assert.equal((await parse.retrieve(resource)).outcome, 'not_configured');
    console.log('Phase 4A provider/reference/comparison/failure fixtures passed; no live provider calls.');
  } finally { global.fetch = original; }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
