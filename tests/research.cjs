/* eslint-disable @typescript-eslint/no-require-imports -- Synthetic fixtures with mocked database and model. */
require('./search.cjs');
const assert = require('node:assert/strict'), Module = require('node:module');
const { statements, briefSections, comparisonSections, ids } = require('../lib/research/validation.ts');
const valid = (selected, sections = briefSections) => sections.map(section => ({ section, text: 'SYNTHETIC fixture statement; source support requires review.', evidenceIds: selected }));
assert.throws(() => statements(valid([]), [], briefSections));
assert.throws(() => statements(valid(['invented']), ['fixture-link'], briefSections));
assert.throws(() => statements(valid(['other-project']), ['fixture-link'], briefSections));
assert.throws(() => statements([{ section: 'Main findings', text: 'Unsupported', evidenceIds: [] }], ['fixture-link'], briefSections));
assert.throws(() => statements(valid(['fixture-link']).slice(1), ['fixture-link'], briefSections));
assert.throws(() => ids(['duplicate', 'duplicate']));
assert.equal(statements(valid(['fixture-link']), ['fixture-link'], briefSections)[0].review, 'needs-review');
function matches(row, filter) { return Object.entries(filter).every(([k, v]) => {
  if (k === '$or') return v.some(f => matches(row, f));
  const value = k === 'run.passages.id' ? row.run.passages.map(p => p.id) : row[k];
  if (v && typeof v === 'object' && !(v instanceof Date)) { if ('$in' in v) return v.$in.includes(value); if ('$all' in v) return v.$all.every(i => value?.includes(i)); if ('$lt' in v) return value < v.$lt; if ('$exists' in v) return (value !== undefined) === v.$exists; }
  return value === v;
}); }
function model(initial = []) {
  const rows = initial;
  function doc(row) { if (!row) return null; return { ...structuredClone(row), toObject() { const result = { ...this }; delete result.save; delete result.toObject; return result; }, async save() { Object.assign(row, this.toObject()); } }; }
  function query(result) { const q = { sort() { if (Array.isArray(result)) result.sort((a,b) => (b.revision ?? 0)-(a.revision ?? 0)); return q; }, limit() { return q; }, lean: async () => structuredClone(result), then(resolve, reject) { return Promise.resolve(Array.isArray(result) ? result.map(doc) : doc(result)).then(resolve, reject); } }; return q; }
  function update(row, data, insert = false) { if (insert) Object.assign(row, data.$setOnInsert); Object.assign(row, data.$set); for (const [k,v] of Object.entries(data.$inc ?? {})) row[k] = (row[k] ?? 0) + v; for (const k of Object.keys(data.$unset ?? {})) delete row[k]; for (const [k,v] of Object.entries(data.$pull ?? {})) row[k] = row[k].filter(i => i !== v); }
  return { rows, find: f => query(rows.filter(r => matches(r, f))), findOne: f => query(rows.find(r => matches(r, f)) ?? null), exists: async f => rows.some(r => matches(r,f)), countDocuments: async f => rows.filter(r => matches(r,f)).length,
    create: async r => { rows.push(structuredClone(r)); return doc(r); },
    async updateOne(f,u,o = {}) { let row = rows.find(r => matches(r,f)); const insert = !row; if (!row && o.upsert) { row = { ...f }; rows.push(row); } if (row) update(row,u,insert); },
    async updateMany(f,u) { for (const row of rows.filter(r => matches(r,f))) update(row,u); },
    async findOneAndUpdate(f,u) { const row = rows.find(r => matches(r,f)); if (!row) return null; update(row,u); return doc(row); },
    async deleteOne(f) { const i = rows.findIndex(r => matches(r,f)); if (i >= 0) rows.splice(i,1); } };
}
const resource = { id: 'fixture-resource', type: 'arabic', approval: 'approved', edition: 'fixture-edition', language: 'ar', title: 'SYNTHETIC resource' };
const snapshots = [1,2,3].map(n => ({ id: `fixture-evidence-${n}`, resourceId: resource.id, contentHash: `immutable-version-${n}`, originalText: 'نَصٌّ تَجْرِيبِيٌّ '.repeat(80), context: 'SYNTHETIC context', locator: `fixture:${n}`, sourceUrl: 'https://example.org/fixture', edition: resource.edition, language: resource.language, retrievedAt: new Date().toISOString() }));
const db = { connect: async () => {}, Resources: model([resource]), EvidenceRecords: model(snapshots), Claims: model([{ owner: 'fixture-owner', claimId: 'fixture-claim', claim: { statement: 'SYNTHETIC proposition' }, revision: 1 }]), Retrievals: model([{ owner: 'fixture-owner', claimId: 'fixture-claim', claimRevision: 1, run: { passages: snapshots.map(e => ({ id: e.id, source: { title: resource.title, sourceType: 'arabic', edition: resource.edition } })) } }]), Findings: model([{ owner: 'fixture-owner', claimId: 'fixture-claim', evidenceIds: snapshots.map(e => e.id), explanation: 'SYNTHETIC finding' }]) };
const models = { ResearchProjects: model(), ProjectEvidence: model(), ResearchNotes: model(), Briefs: model(), Comparisons: model() };
let outputMode = 'valid', hold;
const mockModel = async request => {
  if (hold) await hold;
  if (outputMode === 'timeout') throw new Error('SYNTHETIC timeout');
  return { model: 'SYNTHETIC-MODEL', output: outputMode === 'malformed' ? { statements: [{ text: 'invalid' }] } : { statements: valid(request.data.evidence.map(e => e.id), request.instructions.includes('research compare') ? comparisonSections : briefSections) } };
};
const original = Module._load;
Module._load = function(name,...args) { if (name === 'server-only') return {}; if (name === '../integrations/database') return db; if (name === './models') return models; if (name === '../claims/model') return { callModel: mockModel }; return original.call(this,name,...args); };
const { mutate, workspace, projectAccess } = require('../lib/research/service.ts'); Module._load = original;
async function main() {
  const p = await mutate('fixture-owner', { action: 'create', title: 'SYNTHETIC project', question: 'SYNTHETIC open investigation' });
  await assert.rejects(projectAccess('different-owner', p.id), e => e.status === 404);
  const request = { projectId: p.id, action: 'collect', claimId: 'fixture-claim', evidenceIds: snapshots.map(e => e.id) };
  await mutate('fixture-owner', request); await mutate('fixture-owner', request);
  assert.equal(models.ProjectEvidence.rows.length, 3, 'duplicate collection is idempotent');
  const selected = models.ProjectEvidence.rows.map(e => e.id);
  assert.equal(models.ProjectEvidence.rows[0].snapshot.contentHash, 'immutable-version-1');
  await mutate('fixture-owner', { projectId: p.id, action: 'note', content: 'SYNTHETIC researcher input', linkedEvidenceIds: [selected[0]] });
  await assert.rejects(mutate('fixture-owner', { projectId: p.id, action: 'note', content: 'bad link', linkedEvidenceIds: ['foreign-link'] }));
  await mutate('fixture-owner', { projectId: p.id, action: 'compare', selectedEvidenceIds: selected.slice(0,2) });
  assert.equal(models.Comparisons.rows.length, 1);
  await mutate('fixture-owner', { projectId: p.id, action: 'brief', selectedEvidenceIds: selected });
  const brief = models.Briefs.rows[0]; const edits = valid(selected); edits[0].text = 'SYNTHETIC edited draft';
  await mutate('fixture-owner', { projectId: p.id, action: 'editBrief', id: brief.id, statements: edits });
  await mutate('fixture-owner', { projectId: p.id, action: 'brief', selectedEvidenceIds: selected });
  assert.equal(models.Briefs.rows.length, 2); assert.equal(models.Briefs.rows[0].statements[0].text, 'SYNTHETIC edited draft'); assert.equal(models.Briefs.rows[0].userEdits, true);
  for (const mode of ['timeout','malformed']) { outputMode = mode; await assert.rejects(mutate('fixture-owner', { projectId: p.id, action: 'brief', selectedEvidenceIds: selected })); assert.equal(models.Briefs.rows.length,2); assert.equal(models.ResearchProjects.rows[0].generationToken, undefined); }
  outputMode = 'valid';
  await assert.rejects(mutate('fixture-owner', { projectId: p.id, action: 'brief', selectedEvidenceIds: [] }));
  await assert.rejects(mutate('fixture-owner', { projectId: p.id, action: 'brief', selectedEvidenceIds: ['foreign-link'] }));
  db.Resources.rows[0].approval = 'rejected';
  await assert.rejects(mutate('fixture-owner', { projectId: p.id, action: 'brief', selectedEvidenceIds: selected }), e => e.status === 409);
  assert.equal((await workspace('fixture-owner', p.id)).briefs[0].citations[0].approved, false);
  db.Resources.rows[0].approval = 'approved';
  let release; hold = new Promise(resolve => { release = resolve; });
  const running = mutate('fixture-owner', { projectId: p.id, action: 'brief', selectedEvidenceIds: selected });
  await new Promise(resolve => setTimeout(resolve, 10));
  await assert.rejects(mutate('fixture-owner', { projectId: p.id, action: 'brief', selectedEvidenceIds: selected }), e => e.status === 409);
  release(); await running; hold = undefined;
  await mutate('fixture-owner', { projectId: p.id, action: 'removeEvidence', id: selected[0] });
  assert.equal(db.EvidenceRecords.rows.length,3); assert.equal(models.ProjectEvidence.rows.length,2); assert.equal(models.Briefs.rows[0].citations.length,3); assert.deepEqual(models.ResearchNotes.rows[0].linkedEvidenceIds,[]);
  const reopened = await workspace('fixture-owner', p.id); assert.equal(reopened.notes.length,1); assert.equal(reopened.briefs.length,3);
  console.log('Phase 4B SYNTHETIC fixtures passed: ownership, collection/deduplication, versions, notes, comparison, citations, edits/revisions, timeout/malformed recovery, revocation, generation lock, association removal and reopen. No Atlas or live model calls.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
