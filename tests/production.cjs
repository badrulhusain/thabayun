/* eslint-disable @typescript-eslint/no-require-imports -- Mock boundaries; no live database or provider calls. */
require('./search.cjs');
const assert = require('node:assert/strict');
const Module = require('node:module'), originalLoad = Module._load;
const counters = new Map(), deletions = [];
let unavailable = false, race = false, deletionFailure = false;
const db = {
  connect: async () => {},
  Quotas: {
    init: async () => { if (unavailable) throw new Error('private database details'); },
    findOneAndUpdate: async (filter, update) => {
      if (race && update.$setOnInsert) { race = false; counters.set(filter._id, 1); throw Object.assign(new Error('duplicate'), { code: 11000 }); }
      const count = (counters.get(filter._id) || 0) + update.$inc.count;
      counters.set(filter._id, count); return { count };
    },
  },
};
for (const name of ['Submissions', 'Claims', 'Attempts', 'Retrievals', 'Findings', 'ResearchProjects', 'ProjectEvidence', 'ResearchNotes', 'Briefs', 'Comparisons']) db[name] = {
  deleteMany: async filter => { deletions.push([name, filter]); if (deletionFailure) throw new Error('private failure'); },
};
Module._load = function(name, ...args) {
  if (name === 'server-only') return {};
  if (name === './database') return db;
  if (name === '../research/models') return db;
  return originalLoad.call(this, name, ...args);
};
const { consumeQuota } = require('../lib/integrations/quota.ts');
const { deleteOwnerData } = require('../lib/integrations/data.ts');
Module._load = originalLoad;
const { jsonBody, readBody, assertSameOrigin } = require('../lib/claims/http.ts');
async function main() {
  const now = 3600000;
  const results = await Promise.allSettled(Array.from({ length: 11 }, () => consumeQuota('owner-a', now)));
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 10);
  const rejected = results.find(result => result.status === 'rejected').reason;
  assert.equal(rejected.status, 429); assert.equal(rejected.retryAfter, '60');
  await consumeQuota('owner-a', now + 60000);
  counters.clear(); race = true; await consumeQuota('race-owner', now);
  assert.ok([...counters.values()].includes(2), 'Duplicate-key insert race increments the winning counter');
  counters.clear();
  for (let i = 0; i < 100; i++) await consumeQuota(`owner-${i}`, now);
  await assert.rejects(consumeQuota('fresh-cookie-owner', now), error => error.status === 429);
  counters.clear(); counters.set(`global:3600000:${now}`, 1000);
  await assert.rejects(consumeQuota('hour-limit-owner', now + 120000), error => error.status === 429 && error.retryAfter === '3480');
  unavailable = true;
  await assert.rejects(consumeQuota('owner', now), error => error.status === 503 && !error.message.includes('private'));
  unavailable = false;
  const owner = 'a'.repeat(64); await deleteOwnerData(owner);
  assert.equal(deletions.length, 10); assert.ok(deletions.every(([, filter]) => filter.owner === owner));
  await assert.rejects(deleteOwnerData('invalid'), error => error.status === 403);
  deletionFailure = true;
  await assert.rejects(deleteOwnerData(owner), error => error.status === 503 && !error.message.includes('private'));
  assert.throws(() => assertSameOrigin(new Request('https://app.test/api/ocr', { headers: { origin: 'https://evil.test' } })), error => error.status === 403);
  assert.throws(() => assertSameOrigin(new Request('https://app.test/api/data', { headers: { 'sec-fetch-site': 'cross-site' } })), error => error.status === 403);
  await assert.rejects(readBody(new Request('https://app.test/api/ocr', { method: 'POST', body: '12345' }), 4), error => error.status === 413);
  await assert.rejects(jsonBody(new Request('https://app.test/api/data', { method: 'POST', body: 'invalid' })), error => error.status === 400);
  console.log('Shared quotas, spend budgets, sanitized failures, owner-scoped deletion and streaming body limits passed (mock database only).');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
