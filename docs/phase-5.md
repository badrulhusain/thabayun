# Phase 5 — hackathon submission readiness

## What was blocking the website

The Phase 4B API deliberately rejected every production request because account authentication had not been implemented. The local `/projects` workspace and cloud `/research` workspace also represented different storage systems without an obvious sign-in path. Provider keys alone did not unlock research or approve sources.

## Implemented in this change

- Username/password registration, sign-in and sign-out at `/account`. MongoDB stores salted scrypt password hashes and hashes of random session tokens. HttpOnly, SameSite=Strict cookies are Secure in production; sessions expire after seven days and are revoked on logout. Account requests use shared database rate limits.
- Account identity authorizes production research and owns verification records. Existing guest records never become account credentials. Sign in before retrieving evidence for a project; retrieve older guest evidence again after signing in.
- `/research` gives unauthenticated visitors a sign-in path. Collection errors link to accounts and source availability.
- `/sources` reports database availability, credential presence and approved-resource counts. Presence is explicitly not proof of valid credentials. It exposes no secret values.
- Homepage examples include Quran/hadith references. Supplying a reference creates a reviewable claim without requiring AI extraction.
- Resource selection filters by the requested provider/collection before applying the result limit. Quran prelive references outside surahs 1 and 2 return unsupported coverage, not a no-match conclusion.
- Resource imports work with deployment environment variables even without `.env.local`.

## Release gates

| Gate | State | Required evidence |
| --- | --- | --- |
| Code and production access | Implemented; automated checks pass | Build, regression suite, production access test |
| Account persistence | Unit tested with mocked database boundary | Register, sign out/in and reopen records against isolated Atlas database |
| Approved live retrieval | Awaiting configured deployment | Real Quran and hadith lookups, retained citations and grading authority |
| Research workflow | UI tested with labelled synthetic responses | Collect real evidence, save note, compare, generate/edit/reopen cited brief |
| Public hackathon demo | Awaiting deployment URL and live checks | Repeat the sequence below on the actual deployed site |

## Configure and demonstrate

1. Follow [Vercel setup](vercel-deployment.md), including public operator details, `APP_URL`, server-only `MONGODB_URI` and `MONGODB_DB=tabayyun`. Configure Atlas network access and an account able to create indexes.
2. Set `GROQ_API_KEY`, Quran Foundation client credentials and `QF_ENV`, and/or `SUNNAH_API_KEY`. Set `OCR_SPACE_API_KEY` only if demonstrating screenshot OCR. Redeploy after updating configuration. Never paste credentials into issues or commit them.
3. Have the mentor review specific resources, including language, edition/translation, provider IDs and attribution. Import those records with `npm run resources:import -- /path/to/reviewed-resources.json`. The examples are pending, not automatic approvals; see [Phase 4A](phase-4a.md).
4. Open `/sources`. Require connected storage and a positive approved-resource count for each provider being demonstrated. Run `npm run test:quran` in a securely configured environment to test Quran credentials separately.
5. Create an account at `/account`. Open `/research` and create a project. On the homepage choose Quran 1:1 (supported by prelive), investigate, inspect the generated claim, select it and retrieve evidence. Confirm the original source, exact passage and context. Add the passage to the research project. Repeat for enough approved passages to support the question. The sample English hadith wording may differ from the source translation; it is a query example, not an authenticated quotation.
6. In `/research`, inspect the collected passages; save a note, compare two or three passages, generate a brief, inspect every citation, edit and save it. Reload, sign out/in and verify the saved project and revision. Inspect on mobile as well.
7. Use a separate account/browser to confirm it cannot see the first account's project. On disposable test data, verify deletion at `/data`. Sign-out alone does not clear the browser-local recent inquiries.
8. Demonstrate an invalid reference and a provider failure. Neither may produce a fabricated-quotation finding. Record the successful live sequence for the submission.

## Validation performed in this workspace

`npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` pass. Auth regressions cover password hashing, session expiry/revocation, stable identity, account isolation, guest/account separation, same-origin enforcement, production access and database failure. Database and provider boundaries are mocked in these tests.

Production browser checks cover public policies/headers, confirmed deletion error/retry handling, the signed-out research gate, and a labelled synthetic research workflow with Arabic passage display, notes, brief editing, revisions and citations. Additional Phase 5 checks cover sign-in navigation, the no-model reference shortcut and the availability response. Chromium was supplied temporarily for local validation; it is not an application dependency. To reproduce normally, run `npx playwright install chromium`, start the production server and run `npm run test:browser`.

No live Atlas account, provider credential or deployed site was available for this review. These checks do not establish live integration success or complete the release gates above.

## Explicit prototype limits

- Turath has a tested bounded search adapter, but book 963 remains unapproved until source review and usage permission are resolved. OpenITI is authenticated-preview-only. Shamela is outside the current scope and its wildcard resource is disabled. Parse remains not configured. No resource becomes public evidence from technical ingestion alone.
- Live Quran/hadith lookup needs explicit references. Full-corpus quotation search, semantic search and autonomous research are not implemented.
- Text and screenshot input are supported; PDF input/export is not. Homepage screenshot input accepts PNG/JPEG up to 1 MB; OCR supports Arabic, English, and automatic detection and always needs review.
- Accounts have no password reset, email verification, credential deletion UI or collaboration. `/data` deletes research records; it retains account credentials. Browser-local inquiries are separate from account research and are not synchronized.
- Citation validation checks identity and quotation provenance; generated interpretation still needs scholarly review. API failure is not a finding of fabrication.
