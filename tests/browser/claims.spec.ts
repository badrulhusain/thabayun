import { test, expect } from "@playwright/test";
import { retrieve } from "../../lib/claims/retrieval";
import { validateAnalysis } from "../../lib/claims/analysis";
import { passages } from "../../lib/collection";
import type { Claim } from "../../lib/types";

test("Phase 1 IndexedDB upgrade preserves projects, material, evidence, and notes", async ({ page }) => {
  await page.goto("/sources");
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open("tabayyun-research", 1);
      open.onupgradeneeded = () => ["projects", "materials", "evidence"].forEach(name => open.result.createObjectStore(name, { keyPath: "id" }));
      open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["projects", "materials", "evidence"], "readwrite");
      const now = new Date().toISOString();
      tx.objectStore("projects").put({ id: "legacy-project", title: "Legacy research", researchQuestion: "Existing research question", createdAt: now, updatedAt: now });
      tx.objectStore("materials").put({ id: "legacy-material", projectId: "legacy-project", inputType: "text", originalText: "Existing material", editedText: "Existing corrected material", createdAt: now });
      tx.objectStore("evidence").put({ id: "legacy-evidence", projectId: "legacy-project", passageId: "legacy-passage", passageSnapshot: { id: "legacy-passage", sourceId: "legacy-source", text: "TEST FIXTURE legacy evidence", locator: "Test fixture", tags: [] }, citationSnapshot: { id: "legacy-source", title: "TEST FIXTURE source snapshot", author: "Fixture", sourceType: "Test", language: "English", URL: "https://example.com", reuseTerms: "Test only" }, userNote: "Preserve my Phase 1 note", savedAt: now });
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    }); db.close();
  });
  await page.goto("/projects/legacy-project");
  await expect(page.getByRole("heading", { name: "Legacy research", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Research text", exact: true })).toHaveValue("Existing corrected material");
  await expect(page.getByRole("textbox", { name: "Personal note", exact: true })).toHaveValue("Preserve my Phase 1 note");
  await page.getByRole("button", { name: "Add claim manually", exact: true }).click();
  await page.getByLabel("Standalone claim statement").fill("TEST FIXTURE retained material claim");
  await page.getByRole("button", { name: "Save claim", exact: true }).click();
  await expect(page.getByText("Claim saved.", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: /Investigate: TEST FIXTURE retained/ })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Personal note", exact: true })).toHaveValue("Preserve my Phase 1 note");
});

test("claim review, actual retrieval, mocked grounded analysis, notes, history, stale edits, and reopen", async ({ page, request }) => {
  // Model responses are controlled test fixtures, never inserted into the curated collection.
  await page.goto("/projects");
  await page.getByLabel("Title", { exact: true }).fill("Phase 2 fixture project");
  await page.getByLabel("Research question", { exact: true }).fill("Test evidence relationships");
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  const materialText = passages[2].text;
  await page.getByLabel("Paste or edit text").fill(materialText);
  await page.getByRole("button", { name: "Save material", exact: true }).click();
  await expect(page.getByRole("button", { name: "Extract claims", exact: true })).toBeEnabled();
  const claimConfig = await (await request.get("/api/claims/config")).json();
  await page.route("**/api/claims/extract", async route => {
    const body = route.request().postDataJSON();
    const claim: Claim = { id: "browser-fixture-claim", projectId: body.projectId, materialId: body.materialId, materialRevision: body.materialRevision,
      revision: 1, excerpt: materialText, start: 0, end: materialText.length, statement: "TEST FIXTURE: this passage calls for patience and prayer.",
      type: "Quran quotation or attribution", quotation: materialText, speaker: "", reference: passages[2].id, validationIssue: "", coverageNote: "Test fixture; limited collection." };
    await route.fulfill({ json: { claims: [claim], model: claimConfig.extractionModel, promptVersion: claimConfig.extractionPrompt } });
  });
  await page.getByRole("button", { name: "Extract claims", exact: true }).click();
  await expect(page.getByText("1 claims extracted.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Extract claims", exact: true }).click();
  await expect(page.getByText("Reusing saved extraction and your claim corrections. No model request was sent.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit claim", exact: true }).click();
  await page.getByLabel("Standalone claim statement").fill("TEST FIXTURE: the cited text asks for aid with patience and prayer.");
  await page.getByRole("button", { name: "Save claim", exact: true }).click();
  await page.route("**/api/claims/retrieve", async route => {
    const { claim } = route.request().postDataJSON() as { claim: Claim };
    await route.fulfill({ json: { retrieval: retrieve(claim) } });
  });
  await page.getByRole("checkbox", { name: /Investigate:/ }).check();
  await page.getByRole("button", { name: "Retrieve selected claims (up to 5)", exact: true }).click();
  await expect(page.getByText("Retrieved 1 of 1 claims.", { exact: false })).toBeVisible();
  await expect(page.getByText("exact-reference · Local demonstration source", { exact: true })).toBeVisible();
  const evidence = page.getByLabel("Claim detail and evidence");
  await evidence.getByText("Surrounding context", { exact: true }).first().click();
  await expect(evidence.getByRole("link", { name: "Original source", exact: true }).first()).toHaveAttribute("href", /wikisource/);
  await page.route("**/api/claims/analyze", async route => {
    const body = route.request().postDataJSON(), claim = body.claim as Claim;
    const run = retrieve(claim); run.passages = run.passages.filter(p => body.passageIds.includes(p.id));
    const support = run.passages.length ? "Supported by retrieved evidence" : "Insufficient evidence";
    const output = { support, quotationRelationship: "Uncertain", explanation: run.passages.length ? "TEST FIXTURE AI explanation: the cited source asks for aid with patience and prayer." : "TEST FIXTURE AI explanation: the searched collection has no relevant passage.",
      evidence: run.passages.length ? [{ passageId: passages[2].id, excerpt: "Seek aid with patience and prayer", relation: "supporting", directConflict: false }] : [],
      limitations: ["Controlled model fixture"], unresolvedQuestions: [], nextStep: "Consult the original edition or expand the verified collection." };
    await route.fulfill({ json: { analysis: validateAnalysis(output, claim, run, "openai/gpt-oss-120b") } });
  });
  await page.getByRole("button", { name: "Run evidence-based analysis", exact: true }).click();
  const preview = page.getByRole("article", { name: "Finding preview", exact: true });
  await expect(preview.getByText("Exact match", { exact: true })).toBeVisible();
  await expect(preview.getByText("Supported by retrieved evidence", { exact: true })).toBeVisible();
  await preview.getByLabel("Finding personal note").fill("My saved finding note");
  await preview.getByRole("button", { name: "Save finding", exact: true }).click();
  await expect(page.getByRole("article", { name: "Saved finding", exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Run evidence-based analysis", exact: true }).click();
  await expect(page.getByText("Reusing the saved finding:", { exact: false })).toBeVisible();
  await expect(preview).toHaveCount(0);
  await page.getByRole("button", { name: "Run fresh analysis", exact: true }).click();
  await preview.getByRole("button", { name: "Save finding", exact: true }).click();
  await expect(page.getByRole("article", { name: "Saved finding", exact: true })).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole("article", { name: "Saved finding", exact: true })).toHaveCount(2);
  await expect(page.getByLabel("Finding personal note").nth(1)).toHaveValue("My saved finding note");
  await page.getByRole("button", { name: "Edit claim", exact: true }).click();
  await page.getByLabel("Standalone claim statement").fill("quantum computing");
  await page.getByLabel("Explicit quotation", { exact: true }).fill("");
  await page.getByLabel("Cited reference", { exact: true }).fill("");
  await page.getByRole("button", { name: "Save claim", exact: true }).click();
  await expect(page.getByText("Potentially outdated: claim removed or edited, or material changed.", { exact: true })).toHaveCount(2);
  await page.getByRole("checkbox", { name: /Investigate:/ }).check();
  await page.getByRole("button", { name: "Retrieve selected claims (up to 5)", exact: true }).click();
  await expect(page.getByText("No relevant evidence retrieved.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run evidence-based analysis", exact: true })).toBeDisabled();
  await expect(page.getByText("Analysis needs at least one selected source passage.", { exact: false })).toBeVisible();
  await page.getByRole("textbox", { name: "Research text", exact: true }).fill(materialText + " Additional research material.");
  await page.getByRole("button", { name: "Save edits", exact: true }).click();
  await expect(page.getByText("Potentially outdated: claim removed or edited, or material changed.", { exact: true })).toHaveCount(2);
  await page.reload();
  await expect(page.getByRole("article", { name: "Saved finding", exact: true })).toHaveCount(2);
  expect((await request.post("/api/claims/retrieve", { data: { claim: {} } })).status()).toBe(400);
  const storedClaim = await page.evaluate(async () => new Promise<Claim>(resolve => {
    const open = indexedDB.open("tabayyun-research", 4); open.onsuccess = () => { const db = open.result;
      const get = db.transaction("claims").objectStore("claims").getAll(); get.onsuccess = () => { resolve(get.result[0]); db.close(); }; };
  }));
  expect([400, 403]).toContain((await request.post("/api/claims/analyze", { data: { claim: storedClaim, passageIds: ["invented-id"] } })).status());
  await page.screenshot({ path: "test-results/phase2-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/phase2-mobile.png", fullPage: true });
});

test("manual claims and retrieval work while model is unavailable; cancel delayed extraction", async ({ page, request }) => {
  await page.goto("/projects");
  await page.getByLabel("Title", { exact: true }).fill("Manual fixture");
  await page.getByLabel("Research question", { exact: true }).fill("Manual research without provider");
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await page.getByLabel("Paste or edit text").fill("TEST FIXTURE: investigate quantum computing.");
  await page.getByRole("button", { name: "Save material", exact: true }).click();
  await page.route("**/api/claims/extract", route => route.fulfill({ status: 503, json: { error: { message: "Automated extraction requires server configuration. Manual claims remain available." } } }));
  await page.getByRole("button", { name: "Extract claims", exact: true }).click();
  await expect(page.getByRole("alert").first()).toContainText("server configuration");
  await page.getByRole("button", { name: "Add claim manually", exact: true }).click();
  await page.getByLabel("Standalone claim statement").fill("quantum computing");
  await page.getByRole("button", { name: "Save claim", exact: true }).click();
  const config = await (await request.get("/api/claims/config")).json();
  expect(config).not.toHaveProperty("apiKey");
  if (!config.configured) {
    const response = await request.post("/api/claims/extract", { data: { text: "TEST FIXTURE: investigate quantum computing.", projectId: "fixture-project", materialId: "fixture-material", materialRevision: 1 } });
    expect(response.status()).toBe(503);
    expect((await response.json()).error.message).toContain("GROQ_API_KEY");
  }
  await page.getByRole("checkbox", { name: /Investigate:/ }).check();
  await page.getByRole("button", { name: "Retrieve selected claims (up to 5)", exact: true }).click();
  await expect(page.getByText("No relevant evidence retrieved.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run evidence-based analysis", exact: true })).toBeDisabled();
  await expect(page.getByText("Analysis needs at least one selected source passage.", { exact: false })).toBeVisible();
  await page.unroute("**/api/claims/extract");
  let complete: () => void = () => {};
  const delayed = new Promise<void>(resolve => { complete = resolve; });
  await page.route("**/api/claims/extract", async route => { await delayed; await route.fulfill({ json: { claims: [] } }).catch(() => {}); });
  await page.getByRole("button", { name: "Extract claims", exact: true }).click();
  await page.getByRole("button", { name: "Cancel claim operation", exact: true }).click(); complete();
  await expect(page.getByText("Canceled. Completed claims and findings are preserved.", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Investigate:/ })).toHaveCount(1);
  await page.unroute("**/api/claims/extract");
  let finishStale: () => void = () => {};
  const stale = new Promise<void>(resolve => { finishStale = resolve; });
  await page.route("**/api/claims/extract", async route => { await stale; await route.fulfill({ json: { claims: [] } }).catch(() => {}); });
  await page.getByRole("button", { name: "Extract claims", exact: true }).click();
  await page.getByRole("textbox", { name: "Research text", exact: true }).fill("TEST FIXTURE: changed material during extraction.");
  await page.getByRole("button", { name: "Save edits", exact: true }).click();
  await expect(page.getByText("Potentially outdated: material changed. Edit and confirm the claim.", { exact: true })).toBeVisible();
  finishStale();
  await expect(page.getByRole("button", { name: "Extract claims", exact: true })).toBeEnabled();
  await expect(page.getByRole("checkbox", { name: /Investigate:/ })).toHaveCount(1);
  await expect(page.getByText("0 claims extracted.", { exact: false })).toHaveCount(0);
});
