/* eslint-disable @typescript-eslint/no-require-imports -- Explicit opt-in live evaluation using synthetic fixtures only. */
require("./search.cjs");
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const load = Module._load;
Module._load = function(name, ...args) { if (name === "server-only") return {}; return load.call(this, name, ...args); };
const { callModel } = require("../lib/claims/groq.ts");
Module._load = load;
const { extractClaims } = require("../lib/claims/extraction.ts");
const { analyzeClaim } = require("../lib/claims/analysis.ts");
const { scoreExtraction, analysisFixture } = require("./evaluation/scoring.cjs");
const dataset = require("./evaluation/dataset.json");
if (typeof process.loadEnvFile === "function") {
  for (const file of [".env.local", ".env"]) { const location = path.join(__dirname, "..", file); if (fs.existsSync(location)) process.loadEnvFile(location); }
}
async function main() {
  const models = ["openai/gpt-oss-20b", "openai/gpt-oss-120b"];
  const report = { datasetVersion: dataset.version, datasetReview: dataset.review, createdAt: new Date().toISOString(), models,
    status: !process.env.GROQ_API_KEY?.trim() ? "blocked_missing_groq_key" : !process.argv.includes("--live") ? "not_run_live_flag_required" : "running",
    results: [], limitations: ["Independent fluent-Arabic human review is pending.", "Exact annotation matching is a narrow metric; alternative valid claim spans or synonymous qualifications require human review.", "A ten-case synthetic engineering dataset does not establish scholarly, multilingual, or production reliability.", "No accuracy or suitability conclusions can be inferred from mocked tests or model size."] };
  if (report.status === "running") {
    const saved = [process.env.GROQ_EXTRACTION_MODEL, process.env.GROQ_ANALYSIS_MODEL];
    try {
      for (const model of models) {
        process.env.GROQ_EXTRACTION_MODEL = model; process.env.GROQ_ANALYSIS_MODEL = model;
        // Sequential: bounded application retries handle provider limits without parallel evaluation requests.
        for (const fixture of dataset.extraction) {
          try {
            const result = await extractClaims({ text: fixture.text, projectId: "evaluation-only", materialId: fixture.id, materialRevision: 1 }, callModel);
            const score = scoreExtraction(fixture, { claims: result.claims });
            report.results.push({ model, task: "extract", fixture: fixture.id, language: fixture.language, ...score, telemetry: result.telemetry });
          } catch (error) { report.results.push({ model, task: "extract", fixture: fixture.id, language: fixture.language, passed: false, errorCode: error.code ?? "VALIDATION_FAILED", telemetry: error.telemetry }); }
        }
        for (const fixture of dataset.analysis) {
          try {
            const { claim, retrieval } = analysisFixture(fixture), run = await analyzeClaim(claim, retrieval, callModel);
            report.results.push({ model, task: "analyze", fixture: fixture.id, language: fixture.language,
              passed: fixture.expectedSupport.includes(run.support), citationValid: true, assessmentAppropriate: fixture.expectedSupport.includes(run.support), support: run.support, explanation: run.explanation, evidence: run.evidence, telemetry: run.telemetry });
          } catch (error) {
            if (!fixture.evidence && error.code === 'NO_EVIDENCE') report.results.push({ model: 'none', requestedModel: model, task: 'evidence_guard', fixture: fixture.id, language: fixture.language, passed: true, errorCode: 'NO_EVIDENCE', modelCalled: false });
            else report.results.push({ model, task: "analyze", fixture: fixture.id, language: fixture.language, passed: false, citationValid: error.code === "INVALID_CITATION" ? false : null, errorCode: error.code ?? "VALIDATION_FAILED", telemetry: error.telemetry });
          }
        }
      }
    } finally {
      ["GROQ_EXTRACTION_MODEL", "GROQ_ANALYSIS_MODEL"].forEach((name, i) => { if (saved[i] === undefined) delete process.env[name]; else process.env[name] = saved[i]; });
    }
    report.status = "completed_engineering_evaluation_human_review_pending";
    report.observedWeaknesses = report.results.filter(result => !result.passed || result.languageChanged || result.attributionAbsentFromStatement).map(result => ({ model: result.model, fixture: result.fixture, task: result.task, errorCode: result.errorCode, support: result.support, qualificationFailures: result.qualificationFailures, validSpans: result.validSpans, languageChanged: result.languageChanged, attributionAbsentFromStatement: result.attributionAbsentFromStatement }));
  }
  const output = path.join(__dirname, "../docs/groq-evaluation-results.json");
  if (report.status !== "completed_engineering_evaluation_human_review_pending" && fs.existsSync(output)) {
    const previous = JSON.parse(fs.readFileSync(output, "utf8"));
    if (previous.results?.length) { console.log(`Groq evaluation readiness: ${report.status}. Existing live-results report preserved; no model calls.`); return; }
  }
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  console.log(`Groq evaluation: ${report.status}. ${report.results.length} observed results. Report: docs/groq-evaluation-results.json`);
  if (report.results.some(result => !result.passed)) process.exitCode = 1;
}
main().catch(() => { console.error("Evaluation could not be completed. No credential or provider error details were logged."); process.exitCode = 1; });
