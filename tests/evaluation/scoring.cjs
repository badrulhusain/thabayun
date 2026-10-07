/* eslint-disable @typescript-eslint/no-require-imports -- Shared fixture evaluator, not application sources. */
const { validateExtraction } = require("../../lib/claims/extraction.ts");
const { validateAnalysis } = require("../../lib/claims/analysis.ts");
function scoreExtraction(fixture, output) {
  const claims = validateExtraction(output, fixture.text, { projectId: "evaluation-only", materialId: fixture.id, materialRevision: 1 });
  const matches = fixture.claims.filter(gold => claims.some(c => c.excerpt === gold.excerpt && c.type === gold.type && c.quotation === gold.quotation && c.speaker === gold.speaker && c.reference === gold.reference));
  const spanValid = claims.filter(c => !c.validationIssue).length;
  const qualificationFailures = fixture.claims.filter(gold => {
    const claim = claims.find(c => c.excerpt === gold.excerpt); if (!claim) return false;
    return (gold.mustPreserve ?? []).some(token => !claim.statement.includes(token)) || (gold.negationRequired && !/(لم|لا|ليس|غير|ما\s|\bnot\b|\bnever\b)/iu.test(claim.statement));
  }).length;
  return { expected: fixture.claims.length, returned: claims.length, exactAnnotatedMatches: matches.length, validSpans: spanValid, exactAnnotationPrecision: claims.length ? matches.length / claims.length : fixture.claims.length ? 0 : 1, exactAnnotationRecall: fixture.claims.length ? matches.length / fixture.claims.length : claims.length ? 0 : 1,
    qualificationFailures, languageChanged: fixture.language === "Arabic" ? claims.filter(c => !/\p{Script=Arabic}/u.test(c.statement)).length : 0,
    attributionAbsentFromStatement: claims.filter(c => c.speaker && !c.statement.includes(c.speaker)).length,
    passed: matches.length === fixture.claims.length && claims.length === fixture.claims.length && spanValid === claims.length && qualificationFailures === 0,
    claims };
}
function analysisFixture(fixture) {
  const source = { id: "evaluation-source", title: "SYNTHETIC BILINGUAL TEST FIXTURE — not a real source", author: "Test author", sourceType: "Test fixture", language: fixture.language, URL: "https://example.com/test-fixture", reuseTerms: "Synthetic test data" };
  const claim = { id: fixture.id, projectId: "evaluation-only", materialId: fixture.id, revision: 1, materialRevision: 1,
    excerpt: fixture.statement, start: 0, end: fixture.statement.length, statement: fixture.statement, type: "Historical or general factual claim", quotation: "", speaker: "", reference: "", validationIssue: "", coverageNote: "Test fixtures only" };
  const passage = { id: `fixture-${fixture.id}`, sourceId: source.id, text: fixture.evidence, locator: "Synthetic test fixture", tags: [], source, score: 0, method: "keyword", provenance: "test-fixture" };
  const retrieval = { id: fixture.id, projectId: claim.projectId, claimId: claim.id, claimRevision: 1, materialRevision: 1, queries: [], collectionVersion: "evaluation-fixtures-v1", searchedAt: new Date().toISOString(), sourcesSearched: [source], coverage: "Only synthetic test fixtures were supplied; no real Islamic sources were searched.", passages: fixture.evidence ? [passage] : [] };
  return { claim, retrieval };
}
function scoreAnalysis(fixture, output, model) {
  const { claim, retrieval } = analysisFixture(fixture);
  const run = validateAnalysis(output, claim, retrieval, model);
  return { passed: fixture.expectedSupport.includes(run.support), citationValid: true, assessmentAppropriate: fixture.expectedSupport.includes(run.support), support: run.support, run };
}
module.exports = { scoreExtraction, analysisFixture, scoreAnalysis };
