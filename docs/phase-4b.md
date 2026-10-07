# Phase 4B: research workspace and cited briefs

The `/research` workspace uses the existing MongoDB Atlas connection and Groq adapter. Phase 4A verification is preserved. Add selected passages through **Add to research project** in any verification result; the server resolves immutable evidence and your stored claim/retrieval/finding, rather than accepting browser passage text.

## Setup and access

Set `TABAYYUN_RESEARCH_SINGLE_USER=true` in your private local environment, then run `npm run dev` and open `http://localhost:3000/research`. Existing `MONGODB_URI`, `MONGODB_DB`, `GROQ_API_KEY`, model settings, provider credentials and reviewed resources apply. No new credential or provider is introduced. No secrets were modified by implementation.

There is no account login in this repository. Research API access is explicitly restricted to local single-user development, requires the opt-in flag, and is disabled in production even if the flag is set. The existing server-issued HttpOnly bearer cookie isolates records and verifies access. Run only on your own trusted development machine. Clearing that cookie loses access; it is not account authentication. A real authenticated server identity must replace this development guard before deployment.

## Storage and behavior

Mongoose adds `projects`, `projectEvidence`, `notes`, `briefs`, and `comparisons`. Indexes cover ownership/project lookups, unique evidence/claim associations, unique document IDs and project/revision pairs. Project revision allocation and expiring generation leases use atomic MongoDB updates. Existing Phase 4A records are not migrated or rewritten. The legacy `/projects` collection remains in IndexedDB; new server projects are listed under `/research`. Submitting inside a research project creates an idempotent local project bridge for the existing text/screenshot/claim interface. Verification material and claim editing remain browser-local; server verification records are retained by Phase 4A.

Evidence associations retain the immutable content hash, passage, context, language, translation identity, edition, locator, source URL, retrieval timestamp, source attribution and stored finding. Removing an association removes note links but never deletes shared evidence or historical document citations. Existing `/data` deletion also removes the new owner-scoped research records.

Relationship labels require a specific proposition; unset is allowed. User edits carry user attribution; schemas also retain AI attribution should suggestions be added later. Notes are plain text and cannot substantiate generated source-dependent statements. Tafsir is shown as attributed scholarly interpretation. Brief/comparison content is labelled AI analysis.

Generation selects up to eight project associations (two or three for comparison), resolves all content on the server, checks current approval and edition/language before and after Groq, and rejects foreign/missing selections. Structured output requires all sections and source IDs on every paragraph; missing, invented or cross-project citations reject the entire response. Bibliography is rendered from snapshots, never model-generated. All statements are marked **needs review**: citation identity validation does not prove entailment. No automatic factual support guarantee is made.

Interactive citations show the original passage, available context, original URL, source attribution, version, claim proposition and stored finding. Revoked resources block new generation and flag historical documents while preserving their original citations. Groq's existing 45-second timeout, input/output bounds, concurrency controls and server-only credentials apply. An atomic project lease prevents overlapping generation. Failures leave prior documents, notes and evidence intact.

The editor uses plain textareas. Citation IDs remain separate from display numbering. Draft state survives view switches, and regeneration saves that edited revision before creating another. All edits continue to need support review. New revisions do not replace earlier revisions. Copy includes readable citation numbers and a stored source list.

## Demonstration

1. Configure Atlas, Groq and an existing live provider; approve individual resource records using the Phase 4A review process.
2. Create a research project with an open question, optional description and resource/language scope.
3. In Evidence, choose **Submit material in this project**. Paste text or review screenshot OCR; manually add or extract claims and retrieve approved sources. Collect three to five passages using **Add to research project**. Refresh collected evidence.
4. Inspect an original passage and its finding. Add a researcher note linked to selected passages in Notes. Optionally label a passage against a stated proposition.
5. Select two or three passages and compare. Inspect saved comparison citations and uncertainty.
6. Select evidence and generate the first brief. Inspect citations, edit text, save, and copy with sources.
7. Use **Save draft and regenerate new revision**. Selected workspace passages are used if present; otherwise that revision's original set is used. Earlier edits remain in their original revision.
8. Reload, reopen the project, and inspect evidence, notes, comparisons and prior brief revisions.

## Verification and limits

`node tests/research.cjs` exercises labelled synthetic evidence with mocked database/model boundaries: ownership, idempotent collection, versions, note associations, comparison and citation validation, malformed/timeout recovery, empty/foreign evidence, approval revocation, generation locking, edit/revision preservation, unlinking shared evidence and reopen. `tests/browser/research-workspace.spec.ts` uses labelled mocked API responses for narrow-screen Arabic, note linking, draft state across views, regeneration and interactive citations; it is not a live end-to-end demonstration. `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` are the regression checks.

Live retrieval/Atlas/model behavior requires configured credentials, network access and reviewed resources; fixture tests cannot establish it. Existing Turath and Parse adapter limitations remain. Document/PDF input is not supported by Phase 4A; text and screenshot OCR are reused. Collaboration, semantic search, autonomous loops, rich-text editing, PDF export and extension changes are deferred. Notes and drafts must be saved before leaving the project; the browser warns on page unload with an edited brief. Authenticated multi-user deployment remains deliberately blocked.
