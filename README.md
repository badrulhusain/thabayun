# TABAYYUN AI — Phase 3

A Next.js 16 App Router research workspace for collecting material, reviewing individual claims, retrieving curated evidence, and saving grounded analysis with a revision history. Phase 1 projects, materials, source search, evidence, and notes remain available.

## Setup

Use Node.js 20.9+ and npm. Run `npm install` and `npm run dev`, then open http://localhost:3000/projects.

Checks: `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`.

For screenshot extraction, copy `.env.example` to `.env.local`, set the server-only `OCR_SPACE_API_KEY`, and restart. See the [official OCR.space documentation](https://ocr.space/ocrapi). No key is needed for pasted text, manual claims, or local collection search/retrieval.

Automated claim extraction and AI analysis use the official **groq-sdk**, exclusively in server-only modules. Configure `GROQ_API_KEY` in `.env.local` or the deployment environment. Model defaults are `GROQ_EXTRACTION_MODEL=openai/gpt-oss-20b` and `GROQ_ANALYSIS_MODEL=openai/gpt-oss-120b`; both remain configurable. `.env.example` contains names and defaults, never real credentials. Never use `NEXT_PUBLIC_` for credentials. Missing configuration returns HTTP 503 and explains that manual claims and retrieval remain available. Existing OpenAI environment variables are no longer read. Material is sent to Groq only on extraction; analysis sends only the selected claim and bounded selected evidence, not the project or personal notes. See [Groq strict structured outputs](https://console.groq.com/docs/structured-outputs) and the [official SDK](https://github.com/groq/groq-typescript).

Screenshot OCR remains the separate OCR.space integration. The selected Groq models receive text only; review, correct, confirm, and save OCR text before using the ordinary claim pipeline. No screenshot is sent to Groq.

The integration uses English (`eng`), engine 2; it does not claim Arabic OCR support. JPEG, PNG, and WebP up to 1,000,000 bytes are accepted. WebP is converted in the browser to PNG, a documented provider format; converted files must also fit the limit. Extraction sends screenshots to OCR.space only on request. Images are not persisted. Preview URLs are released; canceled or delayed requests cannot overwrite corrections. Review and explicit confirmation are required before saving screenshot text. Provider requests time out after 45 seconds. Missing credentials and failed extraction display errors with retry available. Provider success needs a configured key to verify.

## Code explanation

- `app/projects/page.tsx` and `components/projects.tsx`: create, list, rename, and delete projects. Deletion requires confirmation.
- `app/projects/[projectId]/page.tsx` and `components/workspace.tsx`: project details, material input and editing, OCR review, short editable queries, passage inspection, and evidence notes.
- `lib/types.ts`: contracts for Project, Material, Source, Passage, and SavedEvidence.
- `lib/repository.ts`: repository interface with seven IndexedDB stores. Version 2 added claims, retrieval runs, and analysis runs; version 3 adds extraction records. Both upgrades preserve existing projects and research. Writes report success only after transaction completion. Child writes update project timestamps. Project deletion cascades to all its child records. Evidence keys combine project and passage IDs to prevent duplicates.
- `lib/collection.ts`: build-time curated sources and original passage text.
- `lib/search.ts`: normalize only for matching; rank exact phrases above whole keywords; search titles and tags; break ties by ID. Original text is displayed unchanged.
- `app/api/search/route.ts`: POST JSON `{ "query": "patience" }` returns `{ "results": [...] }`.
- `lib/ocr.ts` and `app/api/ocr/route.ts`: separate server-only OCR service; POST multipart `file` returns `{ "text": "..." }`.
- API failures return `{ "error": { "code": "...", "message": "..." } }` with non-success status.

Evidence contains copies of the passage and citation, preserving meaning if the collection changes. Internal search ranking is never presented as an authenticity or truth score. Browser storage loads after mount to avoid hydration mismatches. Arabic text renders with automatic directionality.

## Persistence limitations

Projects are **Saved on this device.** There is no authentication, database, cloud synchronization, or backup. Storage belongs to the browser profile and site origin. Clearing site data, private browsing, eviction, or using another browser/device/origin may lose access. Errors are shown visibly. Screenshots are not retained; original and edited text are retained. Shared browser profiles share local projects.

## Sources and import path

The ten excerpts are from [Palmer's Baqarah transcription](<https://en.wikisource.org/wiki/The_Qur%27an_(Palmer)/Baqarah>), inspected on 4 October 2026. [The source edition page](<https://en.wikisource.org/wiki/The_Qur%27an_(Palmer)>) identifies the 1880 translation as public domain. Historical wording and transcription may contain errors. Unique excerpt-opening locators avoid guessing modern verse numbers or pages.

Coverage is deliberately limited: one English historical translation; no hadith, legal opinions, or contemporary material. No search match is not a verdict about a claim. Additional independently verified sources are needed to broaden coverage.

To import content, add Source and Passage records to `lib/collection.ts`, following `lib/types.ts`. Inspect originals and record reuse terms, attribution, translator/edition, original URL, accurate locator, and available surrounding context. Keep stable unique IDs and link each passage to its source. Preserve original text and keep editorial search tags separate. This is build-time content, not runtime JSON storage.

## Demonstration

1. Create a project with a title and research question.
2. Paste material, save it, edit it, and save changes.
3. Search “patience”, inspect a passage, open the original, and save it with a note.
4. Edit the note, refresh, and reopen the project.
5. Search “quantum computing” for the no-results state.
6. Try an invalid or oversized screenshot, then a valid PNG. Missing keys explain configuration. With a key, review extracted text, correct it, confirm, and save.
7. Check a narrow viewport and keyboard navigation. Native source dialogs support Escape and focus restoration.

Broad crawling, report generation, and collaboration remain outside this phase.

## Historical Phase 1 verification

`npm run typecheck`, `npm run lint`, and `npm test` passed (nine search assertions). `npm run test:browser` passed all four browser tests against the production server with installed Google Chrome. OCR confirmation uses a mocked endpoint in its dedicated test; real provider success remains unverified without a key. The browser suite expects Chrome and an already-running app at localhost:3000; run `npm run start` or `npm run dev` first.

Windows Application Control blocked native SWC, so ordinary `npm run build` could not run on this machine. The production build passed using a matching WebAssembly compiler and webpack. This local fallback uses internal Next.js test environment variables and is not a deployment requirement:

```powershell
npm.cmd install --no-save @next/swc-wasm-nodejs@16.3.8
$env:NEXT_TEST_WASM = '1'
$env:NEXT_TEST_WASM_DIR = Join-Path (Get-Location) 'node_modules\@next\swc-wasm-nodejs'
npm.cmd run build -- --webpack
npm.cmd run start
# For development in this restricted Windows environment:
# npm.cmd run dev -- --webpack
```

The fallback package is installed locally without changing runtime dependencies. Repeat its installation after a clean install on a machine with the same native-binary restriction. The interface uses plain CSS, so the unused Tailwind processing step is disabled; existing dependencies remain available. npm install reported five high-severity advisories in the declared dependency tree; no dependency upgrades were applied in this phase.

## Phase 2 services and workflow

- `components/claim-workspace.tsx`: per-material claim list, manual creation, review/edit/remove, selection (up to five claims), evidence inspection and inclusion, cancel/retry, finding preview, personal notes, save, and analysis history. Desktop claim and evidence columns stack on smaller screens; source text uses automatic text direction.
- `lib/claims/extraction.ts`: server-side structured claim extraction, application-generated UUIDs, exact excerpts and UTF-16 offsets. Mismatching excerpts, offsets, or quotations are flagged for correction. Questions, hypotheticals, reported views, qualifications, and negation are explicitly addressed in the extraction instructions. Users must review model extraction; these instructions cannot guarantee perfect linguistic interpretation.
- `lib/claims/retrieval.ts`: exact stored-reference lookup, exact quotation lookup, and Phase 1 keyword search, bounded to eight canonical passages. Every run records queries and methods, sources searched, version, and time. Exact-reference results are labeled separately. References resolve only against existing passage IDs or exact stored locators: this collection has no verified modern verse-number map. Original Arabic and translation text are never modified for display; exact comparison preserves Arabic letter and diacritic distinctions.
- `lib/claims/comparison.ts`: deterministic quotation and reference dimensions. Literal matching ignores surrounding/repeated whitespace only. A different edition or translation may differ in wording without being a misquotation. A paraphrase assessment may be supplied by the model only with cited evidence and cannot override an exact match.
- `lib/claims/analysis.ts`: selected-claim-only analysis, structured-output validation, exact excerpt checks against cited passage/context, and citation snapshots resolved from stored sources. Unknown passage IDs, fabricated quotations, ungrounded support, invalid dimensions, and contradictions without a directly conflicting citation are rejected. Explanations are labeled **AI analysis**. Citation validation checks provenance and quotation fidelity; relationship judgments still require human review.
- `lib/claims/model.ts`, `groq.ts`, and `config.ts`: server-only Groq Chat Completions adapter, strict JSON Schema, independently configurable extraction/analysis models, 45-second total timeout, at most two attempts, and explicit refusal/incomplete/malformed/access/rate-limit errors. SDK retries are disabled (`maxRetries: 0`) globally and per request; only the application retries 429 or server failures. `Retry-After` seconds and HTTP dates are honored. Delays exceeding the remaining deadline produce HTTP 429 with the delay preserved instead of retrying early. Other retry delays use bounded backoff. Two simultaneous calls are allowed per server process; excess requests return a retryable busy error. Model input including instructions/schema is capped at 100,000 UTF-8 bytes; output is capped at 6,000 completion tokens, including any provider-counted reasoning tokens. These local limits do not coordinate across separate deployment processes. SDK logging is explicitly off, including when `GROQ_LOG` is set. No private research text or provider error body is logged.
- `lib/claims/reuse.ts`: SHA-256 fingerprints for reuse. Extraction fingerprints include project/material identity, revision, exact text, model, and prompt version. Analysis fingerprints additionally include the claim, selected passage text/context and stored citation metadata, collection version, and coverage. Retrieval IDs/timestamps do not cause unnecessary misses. Only complete, saved, matching results are reused in the current browser profile/project; nothing is cached globally across users. Existing claim corrections and removals survive reuse. **Run fresh analysis** bypasses reuse and creates a new run. Model or prompt changes, material/claim edits, evidence inclusion changes, source/edition/context changes, and collection changes invalidate reuse. A configuration endpoint returns public model/prompt identifiers only.
- `lib/claims/validation.ts`, `schemas.ts`, and `http.ts`: runtime schemas and input guards, 150 KB bounded request reader, 30,000-character extraction limit, 20 extracted claims, 2,000-character statements, eight passages per analysis, and same-origin browser write requests. There is no authentication to add: Phase 1 remains browser-local. Curated passages are resolved server-side; arbitrary user passages are not accepted as curated evidence.

API routes (POST JSON):

- `/api/claims/extract`: `{ text, projectId, materialId, materialRevision }` → `{ claims, model, promptVersion }`.
- `/api/claims/retrieve`: `{ claim }` → `{ retrieval }`.
- `/api/claims/analyze`: `{ claim, passageIds }` → `{ analysis }`. Repeats canonical retrieval server-side and accepts only a selected subset of those results. Its fresh retrieval snapshot records the evidence actually supplied for analysis.
- `/api/claims/config` (GET): public model names, prompt versions, and configured/not-configured boolean; no credential value is returned. Responses are not cached.

Extraction, retrieval, and analysis are separate actions. Claims, extraction metadata, and retrievals save locally on completion; a finding remains an unsaved preview until **Save finding**. Each fresh saved analysis is a new immutable run, with editable personal note, claim/material revisions, evidence/citation snapshots, three dimensions, model/prompt/collection versions, creation time, and completion status. Matching saved runs can be reused without another provider request. Successful extraction/analysis records retain provider, actual model, reported input/output/total tokens (or unavailable), latency, attempt count, finish reason, completion status, and application-validation status. Failures return sanitized telemetry in the API error; the last 100 call metadata records are also retained in server-process memory, with no text or secrets. That operational buffer is not a durable monitoring system. Editing material increments its revision. Editing claims increments their revision. Previous runs display potentially outdated indicators, including after claim removal. Repository transactions reject stale claim/analysis writes. Canceled or delayed requests cannot replace newer edits; completed batch retrievals survive an individual failure.

## Analysis limitations

The three dimensions describe **retrieved evidence**, not an absolute truth verdict. No numeric truth score is displayed. Unsuccessful retrieval must yield insufficient evidence, never a false/fabricated label. Contradiction requires a directly conflicting cited passage; a model assertion that conflict exists still warrants review. Scholarly interpretation is attributed rather than presented as consensus. The current collection includes no hadith grading records, so no hadith authenticity grading is shown or independently generated. Adding such records requires verified source grading, authority, and reference metadata before display.

Coverage remains ten excerpts from one historical English translation of Baqarah, with locally available surrounding context for only one excerpt. Hadith, scholarly schools, Arabic source editions, historical claims, and other fields may be outside coverage. No unsuccessful search proves absence from Islamic literature. Automated supported/insufficient examples below require model configuration; manual claim review and retrieval work immediately without it.

## Phase 2 demonstration

Each saved material has a **Review claims and evidence for this material** link to its full-width analysis section.

1. Open or create a project. Save this material: `Seek aid with patience and prayer, though it is a hard thing save for the humble, who think that they will meet their Lord, and that to Him will they return.`
2. Click **Extract claims** with a configured model, or **Add claim manually**. Use statement “The cited text asks for aid with patience and prayer”, the exact saved excerpt, type “Quran quotation or attribution”, the full excerpt as explicit quotation, and reference `palmer-b-3`. Review attribution and qualifications before saving the claim.
3. Select the claim, click **Retrieve selected claims**, inspect the exact-reference passage, translation/edition, original source link, and surrounding-context disclosure. Run analysis. Quotation should be **Exact match**, reference **Resolved and matches the cited passage**, and contextual support should explain the limited support in that retrieved text. Review the AI explanation before saving a finding with a note.
4. Repeat analysis with unchanged inputs to reuse the saved finding. Choose **Run fresh analysis**, then save to create a second history entry. Reopen the project and confirm both entries and the note remain. Edit the claim or material and observe outdated indicators.
5. For insufficient evidence, save separate material “Investigate quantum computing.” Add a manual claim “quantum computing” with that exact excerpt and no explicit quotation/reference. Retrieve: no relevant passages appear. With model configuration, analyze the empty evidence set: only **Insufficient evidence** is accepted as contextual support. Save it with the limitation that this collection does not cover the subject.

## Phase 2 verification

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. Start the built app with `npm run start`, then run `npm run test:browser` against localhost:3000 with installed Google Chrome.

If port 3000 is occupied, start with `npm run start -- --port 3001` and set `PLAYWRIGHT_BASE_URL=http://localhost:3001` for the browser command. Verification of this migration uses that separate port so an existing local server can keep running.

The Groq migration adds the official `groq-sdk` runtime dependency and preserves the installed Next.js/React versions. Automated verification uses mocked SDK transport and controlled model fixtures; no paid provider calls are needed.

Unit tests use controlled, explicitly labeled test fixtures outside the real source collection and mock model/provider responses. They cover exact quote/reference, wrong reference, paraphrase, stronger claims with partial support, no evidence, invalid IDs/excerpts, embedded-instruction boundaries, stale revisions, Groq configuration/defaults, Retry-After seconds/date parsing, bounded SDK/application retries, refusal, timeouts, cancellation, concurrency, input/output bounds, sanitized telemetry, cache isolation/invalidation, and Arabic/English evaluation scoring. Browser tests cover the existing Phase 1 journeys, storage migration, manual claims with provider failure, extraction review/reuse, real local retrieval, mocked grounded supported/insufficient findings, saving, notes, reopening, reuse versus fresh reruns, outdated material/claim edits, cancellation, and mobile overflow. Live Groq extraction/analysis remains unverified without credentials; browser automation uses controlled model fixtures rather than real provider output.

## Arabic and English model evaluation

`tests/evaluation/dataset.json` contains four annotated extraction cases and six analysis cases across Arabic and English. Cases cover exact spans/UTF-16 offsets, diacritics, negation, questions, hypothetical statements, attributed/qualified views, embedded instructions, exact citations, empty evidence, and overgeneralization. Sources and speakers are explicitly synthetic test fixtures, kept outside the application collection. Agent-reviewed annotations are supplied; independent human review by a fluent Arabic reader is **pending**, so this is not claimed to be a completed human-reviewed benchmark.

Run `npm run eval:groq` to inspect readiness without model calls. With `GROQ_API_KEY` configured, run `npm run eval:groq -- --live` to test **both exact requested models on both tasks**, sequentially, for 20 initial calls (bounded retries can add calls). The runner loads `.env.local` then `.env` when Node supports `process.loadEnvFile`; alternatively supply environment variables directly. It records exact-annotation precision/recall, valid offsets, preserved qualifications, citation validation, expected support outcomes, provider telemetry, and failed-case observations. Review the synthetic model statements/explanations in the report manually for semantic fidelity and attribution before drawing conclusions. Exact span/word metrics can reject valid alternative boundaries or synonymous qualifications; results must be read with that limitation.

Live configuration was detected during verification, and the 20-case/model attempts completed. **20B:** extraction 0/4 case passes; analysis 4/6 (the other two were provider rejections). **120B:** extraction 2/4; analysis 6/6. All ten successful analysis outputs passed citation validation and correctly handled the empty-evidence cases. Extraction exposed offset mistakes, including Arabic/emoji cases, and occasional quotation-field and standalone-language issues. These are small engineering-fixture results, not general accuracy estimates. See [observed results and review notes](docs/groq-evaluation.md) and the [full JSON report](docs/groq-evaluation-results.json). Independent fluent-Arabic human review remains pending. Model size alone is not evidence of suitability.

## Phase 3 Chrome extension

The Manifest V3 extension has Capture, Investigation, and Notebook views. Select webpage text and right-click **Investigate with Tabayyun** or **Save research excerpt**. Both open a reviewable capture; saving always requires the explicit **Save excerpt** action and makes no AI request. The toolbar opens the panel, with **New manual paste** available for unsupported pages. Browser-internal pages and PDF viewers are not guaranteed to provide context-menu selections.

Original selections and page references remain attached to captures, independently of the active browser tab. Edits increment capture or claim revisions. Incoming selections create separate queued drafts; opening them keeps prior work. The service worker serializes durable `chrome.storage.local` writes, including pending captures, instead of keeping them in memory. Claim review, manual claims, selection of up to five claims, explicit retrieval, optional evidence exclusion, AI analysis previews, explicit finding saves, and immutable saved finding history are implemented. Text and links render safely, with automatic text direction; source passages, context, quotation/reference/support dimensions, searched collection, provenance, and limitations remain visible. Capture or claim changes mark dependent findings outdated and cancel current requests.

**Extension notebook — saved on this device.** Website IndexedDB and extension Chrome storage are separate. Export saved records as versioned JSON from Notebook. Open a destination project on the website and use **Extension notebook → Versioned notebook JSON** to import. The whole import is validated before one IndexedDB transaction. Version 4 adds an `imports` store without replacing earlier research. Project/capture keys prevent duplicates across repeated imports; older capture revisions cannot replace newer imported revisions. Project deletion also removes imports. Imported captures retain original/edited text, metadata, notes, claims/revisions, extraction metadata, retrieval/evidence snapshots, and analysis provenance. They are shown separately as user-provided research and are never inserted into the curated collection or passed off as server-verified results. Imports are a snapshot transfer, not synchronization; edit notes and reopen captures in the extension and export again when needed.

### Build and load

```powershell
npm.cmd install
# Optional: use a different localhost port. This is a public build-time setting, not a secret.
$env:TABAYYUN_BACKEND_ORIGIN = 'http://localhost:3000'
npm.cmd run build:extension
```

Load unpacked from **`C:\Users\HP\Music\thabayun\extension\dist`** (or `<checkout>/extension/dist`): open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select that directory. Pin Tabayyun if desired. The generated directory contains the manifest, bundled panel/worker scripts, HTML/CSS, and PNG icons. Executable code is local and the CSP forbids remote scripts and eval. Permissions are `contextMenus`, `sidePanel`, `storage`, `activeTab` for user-triggered page metadata, and the configured localhost backend host. There is no scripting, cookies, history, or blanket website host permission.

After loading, copy the extension ID from Chrome into `.env.local`:

```dotenv
TABAYYUN_EXTENSION_ORIGIN=chrome-extension://YOUR_32_CHARACTER_EXTENSION_ID
GROQ_API_KEY=YOUR_SERVER_ONLY_KEY
GROQ_EXTRACTION_MODEL=openai/gpt-oss-20b
GROQ_ANALYSIS_MODEL=openai/gpt-oss-120b
```

Restart `npm.cmd run dev` (or `npm.cmd run dev -- --port 3001`, matching the extension build origin). `TABAYYUN_BACKEND_ORIGIN` is read from the shell during extension builds; the builder does not load `.env` files. Rebuild and reload the extension after changing this origin. `TABAYYUN_EXTENSION_ORIGIN` is a server environment setting and requires a server restart. Groq credentials never enter extension bundles. Manual claims, excerpt saves, notebook export/import, and retrieval need no model key. OCR configuration is unchanged and not used by the extension.

The existing backend has **no authentication**. Accordingly, extension API access is allowed only in `next dev`, on localhost/127.0.0.1, from the exact configured extension origin. CORS preflight and error responses use that same allowlist. Public backend origins are rejected by the extension builder, and production cross-origin access is rejected by the server. `npm run start` supports verification of the website but deliberately does not enable extension AI access. Existing same-origin website behavior is preserved. Public deployment requires authentication, project ownership enforcement, and distributed abuse controls; an origin allowlist is not authentication. No shared secret is embedded in the extension.

The client times out at 55 seconds, propagates cancellation, and ignores responses after capture/claim edits. Requests carry IDs containing capture and claim revisions. The extension performs **zero automatic retries**, coordinating with the existing server's maximum two provider attempts and 45-second deadline. Rate limits and unavailable/offline services display explicit messages, with manual retry actions; partial batch successes are retained. Backend request, text, statement, and evidence bounds remain enforced. Selections exceeding 30,000 characters require shortening the edited text, while the original selection stays intact. Saved imports are bounded to 10 MB, 200 captures, and bounded nested records.

### Main files and verification

- `extension/worker.ts`, `panel.tsx`, `api.ts`, `build.cjs`: durable capture queue, accessible research interface, bounded requests, and standalone build using the repository's installed TypeScript and webpack compiler.
- `lib/notebook.ts`: shared safe capture types, revision checks, URL filtering, versioned export and nested import validation.
- `lib/repository.ts`, `components/notebook-import.tsx`, project route: atomic/idempotent device-local import and project snapshot review.
- Claim API routes and `lib/claims/http.ts`: development-only explicit extension origin access; existing services, models, grounding rules, and concurrency controls are reused.
- `tests/extension.cjs`, `tests/browser/notebook.spec.ts`, `tests/browser/extension-panel.spec.ts`: mocked API errors, durable queue/restart, revisions, malformed imports/URLs, website imports, and bundled panel workflow. Existing browser fixtures now open storage version 4.

Commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run build:extension`. For browser tests, start the production app on port 3001, set `PLAYWRIGHT_BASE_URL=http://localhost:3001`, then run `npm run test:browser`. Build the extension before running its bundled-panel browser test. Automated analysis uses mock responses; no paid provider request is needed.

Chrome launched during verification, but loading the unpacked extension through automation did not expose an extension service worker before the timeout. Consequently **native toolbar, context menu, and side-panel Chrome integration remain manually unverified**. The bundled-panel browser harness mocks Chrome storage and exercises the UI with real local curated retrieval and a mocked analysis; it is not a claim of native extension verification. Live Groq calls were not run for Phase 3.

Phase 3 verification passed: TypeScript, ESLint, all unit suites, the normal Next.js production build, and the extension build. Eight website browser tests passed, including migration, existing research/OCR/claim journeys and validated repeated import. The bundled-panel browser test also passed, covering real retrieval, mock analysis, explicit finding save, revision/outdated indicators, JSON export, reopening and cancellation after editing during extraction. Nine browser tests passed across those runs. Native extension loading remains the manual check described above.

### Manual checklist and two-minute demo

1. Load the unpacked extension, set its exact origin on the localhost development backend, and pin the toolbar icon. Click it; confirm Capture/Investigation/Notebook open. Close/reopen and verify the same draft remains.
2. On an ordinary HTTPS webpage, select a short excerpt and right-click **Save research excerpt**. Check the exact selection, title, URL and timestamp. Add a note and explicitly save; verify there is no backend request. Reopen it from Notebook.
3. Select another excerpt, right-click **Investigate with Tabayyun**, edit it, and inspect the retained original. Change browser tabs; the captured reference must stay fixed. Request extraction, review/correct flags, select claims, retrieve passages, expand context, choose evidence, and run analysis. Save the finding after reviewing its three dimensions, AI label, collection, and limitations.
4. While extraction or analysis runs, capture another selection. Confirm it is queued and does not replace active edits. Cancel or edit a claim and confirm delayed responses do not replace it. Verify old saved findings show outdated indicators; close/reopen the panel and confirm notes and saved findings survive.
5. Export Notebook JSON, open a destination project, import it twice, and refresh. Verify one imported record per capture, exact page/evidence snapshots, and the user-provided label. Try a malformed JSON file and verify the prior project survives. Check keyboard navigation and Arabic directionality.
6. With the backend stopped or model unconfigured, verify understandable errors and working excerpt saves/manual claims. Test unavailable selections using manual paste. Dismiss and then accept the notebook deletion confirmation.

For a two-minute demo, perform steps 2–3 with the patience/prayer excerpt and reference `palmer-b-3`, then export/import twice and reopen the saved finding. Without model configuration, use a manual claim and demonstrate real retrieval plus excerpt save/import; AI analysis requires the configured server key. Screenshot capture, page extraction, crawling, background scanning, report generation, and store publication remain outside Phase 3.
# Phase 4A source integrations

Verification now retrieves approved provider resources and persists evidence in MongoDB Atlas. See [Phase 4A setup, approval workflow, capabilities and limitations](docs/phase-4a.md). The older sections below describe the earlier local demonstration architecture.
