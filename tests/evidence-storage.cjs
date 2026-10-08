/* eslint-disable @typescript-eslint/no-require-imports -- Mock database boundary; not an Atlas integration test. */
require('./search.cjs');
const assert = require('node:assert/strict'), Module = require('node:module'), originalLoad = Module._load;
let approval = true, latest, claimRecord, capturedQuotation; const writes = [];
const resource = { id: 'fixture-resource', provider: 'turath', providerId: 'fixture-book', type: 'book', title: 'Synthetic fixture', language: 'en', edition: 'fixture', approval: 'approved', sourceReviewStatus: 'approved', usagePermissionStatus: 'permitted', technicalStatus: 'retrieval-ready', updatedAt: new Date() };
const hadithResource = { ...resource, id: 'fixture-hadith', provider: 'ummah', providerId: 'all', type: 'hadith', title: 'Synthetic hadith search', updatedAt: new Date() };
let availableResources = [resource];
const db = {
  connect: async () => {},
  Resources: { find: () => ({ limit: () => ({ lean: async () => approval ? availableResources : [] }), lean: async () => approval ? availableResources : [] }), findOne: () => ({ lean: async () => approval ? availableResources[0] : null }) },
  Submissions: { findOneAndUpdate: async (filter, update) => { writes.push(['submission', filter, update]); return { _id: 'fixture-submission' }; }, updateOne: async () => {} },
  Claims: { updateOne: async (filter, update) => { claimRecord = { ...filter, ...update.$setOnInsert }; }, findOne: async filter => filter.owner === claimRecord.owner ? claimRecord : null },
  EvidenceRecords: { findOneAndUpdate: async (filter, update) => { writes.push(['evidence', filter, update]); return update.$setOnInsert; } },
  Attempts: { create: async record => writes.push(['attempt', record]) },
  Retrievals: { create: async record => { latest = record; }, findOne: filter => ({ sort: async () => latest?.owner === filter.owner ? latest : null }) },
  Findings: { create: async record => writes.push(['finding', record]) },
};
const adapters = {
  turath: { retrieve: async () => ({ outcome: 'success', attempts: 1, limitations: ['SYNTHETIC fixture only'], evidence: [{ resourceId: resource.id, provider: 'turath', originalText: 'SYNTHETIC excerpt', normalizedText: 'SYNTHETIC excerpt', locator: 'Fixture page 1', sourceUrl: 'https://example.org/fixture', language: 'en', translationIdentity: '', edition: 'fixture', grades: [], limitations: [], retrievedAt: new Date().toISOString() }] }) },
  openiti: { retrieve: async () => ({ outcome: 'success', attempts: 1, limitations: ['SYNTHETIC fixture only'], evidence: [{ resourceId: resource.id, provider: 'openiti', originalText: 'SYNTHETIC juristic excerpt', normalizedText: 'SYNTHETIC juristic excerpt', locator: 'Fixture page 2', sourceUrl: 'https://example.org/fixture', language: 'en', translationIdentity: '', edition: 'fixture', grades: [], limitations: [], retrievedAt: new Date().toISOString() }] }) },
  ummah: { retrieve: async (_resource, _reference, quotation) => { capturedQuotation = quotation; return { outcome: 'no_match', attempts: 1, limitations: [], evidence: [] }; } },
};
Module._load = function(name, ...args) { if (name === 'server-only') return {}; if (name === './database') return db; if (name === './providers') return { adapters }; return originalLoad.call(this, name, ...args); };
const { retrieveApproved, loadRetrieval } = require('../lib/integrations/service.ts'); Module._load = originalLoad;
const claim = { id: 'fixture-claim', materialId: 'fixture-material', projectId: 'fixture-project', revision: 1, materialRevision: 1, excerpt: 'SYNTHETIC excerpt', start: 0, end: 17, statement: 'SYNTHETIC claim', quotation: 'SYNTHETIC excerpt', reference: '', type: 'Scholarly attribution' };
async function main() {
  let run = await retrieveApproved(claim, 'owner-a'); assert.equal(run.passages.length, 1); assert.ok(writes.some(w => w[0] === 'evidence')); assert.ok(writes.some(w => w[0] === 'finding')); assert.equal(writes.find(w => w[0] === 'submission')[1].owner, 'owner-a');
  assert.equal((await loadRetrieval(claim, 'owner-a')).passages.length, 1);
  await assert.rejects(loadRetrieval(claim, 'owner-b'), e => e.status === 403);
  approval = false; assert.equal((await loadRetrieval(claim, 'owner-a')).passages.length, 0, 'Revoked evidence excluded from stored retrieval');
  run = await retrieveApproved(claim, 'owner-a'); assert.equal(run.passages.length, 0); assert.equal(run.attempts[0].outcome, 'not_configured');
  approval = true; resource.usagePermissionStatus = 'unclear'; run = await retrieveApproved(claim, 'owner-a'); assert.equal(run.passages.length, 0, 'Book with unclear usage permission is ineligible');
  resource.usagePermissionStatus = 'permitted'; resource.provider = 'shamela'; run = await retrieveApproved(claim, 'owner-a'); assert.equal(run.passages.length, 0, 'Out-of-scope Shamela stays ineligible even with legacy approval');
  resource.provider = 'turath'; availableResources = [hadithResource];
  const saying = 'seek knowledge even from china';
  const legacySayingClaim = { ...claim, id: 'legacy-saying', excerpt: saying, end: saying.length, statement: saying, quotation: '', type: 'Religious interpretation' };
  run = await retrieveApproved(legacySayingClaim, 'owner-a');
  assert.equal(capturedQuotation, saying, 'short saved religious excerpts remain searchable when extraction omitted quotation');
  assert.deepEqual(run.queries, [{ query: saying, method: 'exact-quotation' }]);
  assert.equal(run.attempts[0].resource, hadithResource.title);
  resource.provider = 'openiti'; availableResources = [resource];
  run = await retrieveApproved({ ...legacySayingClaim, id: 'juristic-saying', quotation: saying }, 'owner-a');
  assert.equal(run.passages.length, 1, 'religious interpretations search eligible OpenITI books');
  assert.equal(run.attempts[0].provider, 'openiti');
  console.log('Evidence persistence operations, owner isolation and revoked resource fixtures passed (mock DB, not Atlas).');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
