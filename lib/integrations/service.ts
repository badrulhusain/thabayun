import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import type { Claim, Material, RetrievalRun, RetrievedPassage, AnalysisRun } from '../types';
import { ClaimsError } from '../claims/validation';
import { adapters } from './providers';
import { parseReference, comparison, type Resource, type Evidence } from './contracts';
import { connect, Resources, Submissions, Claims, EvidenceRecords, Attempts, Retrievals, Findings } from './database';
export async function retrieveApproved(claim: Claim, owner: string, material?: Material): Promise<RetrievalRun> {
  await connect(); let reference;
  try { reference = parseReference(claim.reference); } catch { throw new ClaimsError('Use a valid explicit reference and at most five Quran verses.'); }
  if (material && (material.id !== claim.materialId || material.projectId !== claim.projectId || (material.revision ?? 1) !== claim.materialRevision || material.editedText.slice(claim.start, claim.end) !== claim.excerpt)) throw new ClaimsError('Claim does not match submitted material.');
  const submission = await Submissions.findOneAndUpdate({ owner, materialId: claim.materialId, revision: claim.materialRevision }, { $setOnInsert: { inputType: material?.inputType ?? 'text', submittedText: material?.originalText ?? claim.excerpt, extractedText: material?.editedText ?? claim.excerpt, status: 'retrieving' } }, { upsert: true, new: true });
  await Claims.updateOne({ owner, claimId: claim.id, revision: claim.revision }, { $setOnInsert: { submissionId: String(submission._id), claim, parsedReference: reference } }, { upsert: true });
  // Apply provider/collection constraints before the cap; unrelated resources must not crowd out a valid lookup.
  const resourceFilter = { approval: 'approved', ...(reference ? { provider: reference.kind === 'quran' ? 'quran-foundation' : 'sunnah', ...(reference.kind === 'hadith' ? { providerId: reference.collection } : {}) } : {}) };
  const resources = await Resources.find(resourceFilter).limit(8).lean() as unknown as Resource[];
  const applicable = resources.filter(r => reference ? r.provider === (reference.kind === 'quran' ? 'quran-foundation' : 'sunnah') && (reference.kind !== 'hadith' || r.providerId === reference.collection) : true);
  const passages: RetrievedPassage[] = [], limitations: string[] = [], attempts: NonNullable<RetrievalRun['attempts']> = [];
  if (!applicable.length) { limitations.push('No applicable approved resources. A reviewer must approve individual resources before retrieval.'); attempts.push({ provider: 'resources', outcome: 'not_configured', limitations: ['Resource approval required.'] }); }
  for (const r of applicable) {
    const started = Date.now(), result = await adapters[r.provider].retrieve(r, reference);
    limitations.push(...result.limitations); attempts.push({ provider: r.provider, outcome: result.outcome, limitations: result.limitations });
    await Attempts.create({ owner, claimId: claim.id, provider: r.provider, lookupType: reference ? 'reference' : 'quotation', reference: reference ? JSON.stringify(reference) : '[quotation omitted]', durationMs: Date.now() - started, attempts: result.attempts, outcome: result.outcome });
    // Recheck approval after network I/O. No unapproved or revoked evidence is consumed.
    if (!await Resources.exists({ id: r.id, approval: 'approved', updatedAt: (r as Resource & { updatedAt: Date }).updatedAt })) { limitations.push('Resource approval or metadata changed during retrieval.'); continue; }
    for (const e of result.evidence.slice(0, 5)) {
      // Timestamp is excluded from content identity; changed text/context/grades create a new record.
      const versionHash = createHash('sha256').update(JSON.stringify({ ...e, retrievedAt: undefined })).digest('hex');
      const filter = { resourceId: r.id, edition: e.edition, language: e.language, translationIdentity: e.translationIdentity, locator: e.locator, contentHash: versionHash };
      const stored = await EvidenceRecords.findOneAndUpdate(filter, { $setOnInsert: { ...e, id: randomUUID(), contentHash: versionHash } }, { upsert: true, new: true });
      passages.push({ id: stored.id, sourceId: r.id, text: e.originalText, locator: e.locator, surroundingContext: e.context, tags: [], score: 0, method: 'exact-reference', provenance: 'live', grades: e.grades, limitations: e.limitations, source: { id: r.id, title: r.title, author: r.author ?? 'Not supplied', translator: r.translator, edition: r.edition, sourceType: r.type, language: e.language, URL: e.sourceUrl, reuseTerms: 'Provider terms apply; no shared evidence cache enabled.' } });
    }
  }
  const run: RetrievalRun = { id: randomUUID(), projectId: claim.projectId, claimId: claim.id, claimRevision: claim.revision, materialRevision: claim.materialRevision, queries: [{ query: claim.reference || '[quotation search unsupported]', method: 'exact-reference' }], collectionVersion: 'approved-providers-v1', searchedAt: new Date().toISOString(), sourcesSearched: passages.map(p => p.source), coverage: [...new Set(limitations)].join(' '), passages: passages.slice(0, 8), attempts };
  await Retrievals.create({ owner, claimId: claim.id, claimRevision: claim.revision, run }); await Submissions.updateOne({ _id: submission._id }, { $set: { status: 'retrieved' } });
  await Findings.create({ owner, claimId: claim.id, evidenceIds: run.passages.map(p => p.id), outcome: comparison(claim.quotation, run.passages.map(p => ({ originalText: p.text, translationIdentity: p.source.sourceType === 'translation' ? p.sourceId : '' } as Evidence))), explanation: 'Deterministic wording comparison only. Automated contextual analysis has not run.', limitations: [run.coverage, 'Translation differences do not establish alteration.'], analyzedAt: new Date(), model: 'deterministic', promptVersion: 'comparison-v1' });
  return run;
}
export async function loadRetrieval(claim: Claim, owner: string) {
  await connect(); const record = await Retrievals.findOne({ owner, claimId: claim.id, claimRevision: claim.revision }).sort({ createdAt: -1 });
  if (!record || JSON.stringify((await Claims.findOne({ owner, claimId: claim.id, revision: claim.revision }))?.claim) !== JSON.stringify(claim)) throw new ClaimsError('Retrieve this claim before analysis.', 403);
  const run = record.run as RetrievalRun;
  const resources = await Resources.find({ id: { $in: run.passages.map(p => p.sourceId) }, approval: 'approved' }).lean();
  run.passages = run.passages.filter(p => resources.some(r => r.id === p.sourceId && r.edition === p.source.edition && r.language === p.source.language));
  return run;
}
export async function saveAnalysis(owner: string, analysis: AnalysisRun) {
  await Findings.create({ owner, claimId: analysis.claimId, evidenceIds: analysis.evidence.map(e => e.passageId), outcome: analysis.quotation === 'Exact match' ? 'exact_match' : 'inconclusive', explanation: analysis.explanation, limitations: analysis.limitations, analyzedAt: new Date(analysis.createdAt), model: analysis.model, promptVersion: analysis.promptVersion, analysis });
}
