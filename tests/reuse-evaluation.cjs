/* eslint-disable @typescript-eslint/no-require-imports -- Controlled hashing and bilingual evaluator fixtures. */
require("./search.cjs");
const assert = require("node:assert/strict");
const { extractionKey, analysisKey, reusableFinding } = require("../lib/claims/reuse.ts");
const { validateAnalysis } = require("../lib/claims/analysis.ts");
const { scoreExtraction, analysisFixture, scoreAnalysis } = require("./evaluation/scoring.cjs");
const dataset = require("./evaluation/dataset.json");
const { passages } = require("../lib/collection.ts");
async function main() {
  const material = { id: "material", projectId: "project", revision: 1, editedText: "TEST FIXTURE: original text" };
  const key = await extractionKey(material, "model-a", "prompt-a");
  assert.equal(key, await extractionKey({ ...material }, "model-a", "prompt-a"));
  for (const changed of [{ ...material, projectId: "other-project" }, { ...material, id: "other-material" }, { ...material, revision: 2 }, { ...material, editedText: "changed" }]) assert.notEqual(key, await extractionKey(changed, "model-a", "prompt-a"));
  assert.notEqual(key, await extractionKey(material, "model-b", "prompt-a")); assert.notEqual(key, await extractionKey(material, "model-a", "prompt-b"));
  for (const fixture of dataset.extraction) {
    const output = { claims: fixture.claims.map(gold => {
      const start = fixture.text.indexOf(gold.excerpt);
      return { ...gold, start, end: start + gold.excerpt.length, statement: gold.excerpt };
    }) };
    assert.equal(scoreExtraction(fixture, output).passed, true);
    assert.equal(scoreExtraction(fixture, { claims: [] }).passed, false);
    const wrong = structuredClone(output); wrong.claims[0].start++; assert.equal(scoreExtraction(fixture, wrong).passed, false);
    if (fixture.id.includes("utf16")) assert.ok(output.claims[0].start > [...fixture.text.slice(0, output.claims[0].start)].length, "Emoji requires UTF-16 offset counting");
  }
  const fixture = dataset.analysis[0], { claim, retrieval } = analysisFixture(fixture);
  const output = { support: fixture.expectedSupport[0], quotationRelationship: "Not applicable", explanation: "Controlled test explanation", evidence: [{ passageId: retrieval.passages[0].id, excerpt: retrieval.passages[0].text, relation: "supporting", directConflict: false }], limitations: ["Test only"], unresolvedQuestions: [], nextStep: "Review source." };
  assert.equal(scoreAnalysis(fixture, output, "model-a").passed, true);
  assert.throws(() => scoreAnalysis(fixture, { ...output, evidence: [{ ...output.evidence[0], passageId: "invented" }] }, "model-a"), /unknown passage/);
  const insufficient = dataset.analysis.find(f => f.id === "ar-insufficient");
  assert.equal(scoreAnalysis(insufficient, { ...output, support: "Insufficient evidence", evidence: [] }, "model-a").passed, true);
  const keyA = await analysisKey(claim, retrieval, "model-a", "prompt-a");
  assert.equal(keyA, await analysisKey(claim, { ...retrieval, id: "new-run", searchedAt: "new-time" }, "model-a", "prompt-a"));
  for (const changed of [{ ...claim, projectId: "other-project" }, { ...claim, revision: 2 }, { ...claim, statement: "new statement" }, { ...claim, materialRevision: 2 }]) assert.notEqual(keyA, await analysisKey(changed, retrieval, "model-a", "prompt-a"));
  for (const changed of [{ ...retrieval, collectionVersion: "v2" }, { ...retrieval, passages: [] }, { ...retrieval, passages: [{ ...retrieval.passages[0], text: "new evidence" }] }, { ...retrieval, passages: [{ ...retrieval.passages[0], source: { ...retrieval.passages[0].source, edition: "new edition" } }] }]) assert.notEqual(keyA, await analysisKey(claim, changed, "model-a", "prompt-a"));
  assert.notEqual(keyA, await analysisKey(claim, retrieval, "model-b", "prompt-a")); assert.notEqual(keyA, await analysisKey(claim, retrieval, "model-a", "prompt-b"));
  const finding = { ...validateAnalysis(output, claim, retrieval, "model-a"), cacheKey: keyA };
  assert.equal(reusableFinding(finding, keyA, claim, "model-a"), true);
  assert.equal(reusableFinding({ ...finding, projectId: "other-project" }, keyA, claim, "model-a"), false);
  assert.equal(reusableFinding({ ...finding, status: "incomplete" }, keyA, claim, "model-a"), false);
  assert.ok(passages.every(p => !p.id.startsWith("fixture-")), "Bilingual test passages never enter the real collection");
  console.log("Project/material isolation, evidence/model/prompt/revision invalidation, and Arabic/English evaluator fixtures passed. These are evaluator tests, not observed Groq accuracy.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
