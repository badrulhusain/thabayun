/* eslint-disable @typescript-eslint/no-require-imports -- Documented provider shapes with synthetic source text, no live requests. */
require('./search.cjs');
const assert = require('node:assert/strict');
const Module = require('node:module'), load = Module._load;
Module._load = function(name, ...args) { return name === 'server-only' ? {} : load.call(this, name, ...args); };
const { quran, sunnah, turath, parse } = require('../lib/integrations/providers.ts');
const { requestJson } = require('../lib/integrations/request.ts');
const { parseReference, comparison } = require('../lib/integrations/contracts.ts');
Module._load = load;
const resource = { id: 'fixture-quran', provider: 'quran-foundation', providerId: 'text_uthmani', type: 'arabic', title: 'Synthetic fixture', language: 'ar', edition: 'fixture-only', url: 'https://quran.com', approval: 'approved' };
async function main() {
  const original = global.fetch;
  process.env.QF_CLIENT_ID = 'fixture'; process.env.QF_CLIENT_SECRET = 'fixture'; process.env.SUNNAH_API_KEY = 'fixture';
  try {
    assert.deepEqual(parseReference('Quran 2:255'), { kind: 'quran', surah: 2, start: 255, end: 255 });
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
    global.fetch = async () => new Response(null, { status: 401 }); await assert.rejects(requestJson('https://fixture.test'), e => e.outcome === 'error' && e.attempts === 1);
    global.fetch = async () => new Response(null, { status: 429, headers: { 'retry-after': '60' } }); await assert.rejects(requestJson('https://fixture.test'), e => e.outcome === 'unavailable' && e.attempts === 1);
    let count = 0; global.fetch = async () => { count++; throw new DOMException('Synthetic timeout', 'TimeoutError'); }; await assert.rejects(requestJson('https://fixture.test'), e => e.outcome === 'unavailable' && e.attempts === 2); assert.equal(count, 2);
    assert.equal((await turath.retrieve(resource)).outcome, 'unavailable'); assert.equal((await parse.retrieve(resource)).outcome, 'not_configured');
    console.log('Phase 4A provider/reference/comparison/failure fixtures passed; no live provider calls.');
  } finally { global.fetch = original; }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
