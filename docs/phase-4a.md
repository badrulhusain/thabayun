# Phase 4A implementation and setup

The existing Next.js/IndexedDB project and OCR/Groq flows remain. Verification retrieval now uses server-only providers and MongoDB Atlas through Mongoose. The ten Palmer excerpts remain a **local demonstration collection** for the separate library/search tools; they are never substituted for approved provider evidence.

## Configuration

Set `MONGODB_URI` to an Atlas SRV URI and optionally `MONGODB_DB`. Grant a dedicated database user access only to this database and configure Atlas network access for the deployment. Set `QF_CLIENT_ID`, `QF_CLIENT_SECRET`, and `QF_ENV=prelive` or `production`. Prelive covers surahs 1 and 2. Set `SUNNAH_API_KEY` for Sunnah reference lookup. Existing `GROQ_API_KEY` and model variables enable contextual analysis. Never use NEXT_PUBLIC variables for these values. `.env.local` is not modified by this phase.

## Controlled resource review

Copy `docs/resources.example.json` to a private reviewed configuration. The sample is pending, not mentor-approved. Confirm each resource's edition, language, provider identifier, provenance and permission to retain passages. Record a real reviewer, ISO `reviewedAt`, `reviewNotes`, and `approval=approved` only after review. Run `node scripts/resources.cjs <file.json>`. Re-run with `rejected` to revoke. There is no public approval endpoint.

Quran Arabic uses `type=arabic, providerId=text_uthmani, language=ar`. Translations and tafsir use numeric resource IDs from the official resources API and `type=translation` or `tafsir`; configure each separately, with translator/author and edition. Sunnah resources use the exact official collection identifier, `type=hadith`, and one returned language (`en` or `ar`). Approval covers this explicitly identified collection/language/edition, not the entire website.

## Capabilities and verified contracts

| Provider | Implemented | Limits |
| --- | --- | --- |
| Quran Foundation | OAuth client credentials, token reuse/renewal, explicit surah:ayah and up to five verses, Arabic and individually approved translation/tafsir resources | No quotation search, no surrounding context; existence checked against returned verse_key |
| Sunnah | Official collection:hadithNumber lookup, original returned body, language selection, named grade attribution | No quotation search; limited API coverage, no inference of fabrication |
| Turath | Adapter boundary, honest unavailable outcome | No authorized contract verified; no guessed endpoints or live-looking fixtures |
| Parse | Extraction adapter boundary, honest not-configured outcome | Existing key alone is insufficient. Configured API OpenAPI specification and permitted source mapping are missing; no requests or paid jobs run |

Contracts inspected October 7, 2026: [Quran OAuth quickstart](https://api-docs.quran.com/docs/quickstart/), [verse-key API](https://api-docs.quran.com/docs/content_apis_versioned/4.0.0/verses-by-verse-key/), [Sunnah official OpenAPI](https://github.com/sunnah-com/api/blob/master/spec.v1.yml), [Parse canonical docs](https://docs.parse.bot/introduction), [Parse spec export](https://docs.parse.bot/api-reference/export/export-as-openapi-spec). Parse's configured generated API has its own methods and schemas; these must be inspected before implementing an executable adapter.

## End-to-end demonstration

1. Configure Atlas and an official provider; import reviewed resource records.
2. Start the app, create/open a project, paste a short claim with an explicit reference (e.g. `2:255`), or use the existing screenshot OCR review. Extract or manually add a claim. Confirm the quotation and reference.
3. Retrieve evidence. The screen shows individual outcomes, original source text with automatic RTL, links, resource metadata, attributed grades and missing context. MongoDB receives submission, claim, retrieval attempt, immutable evidence and deterministic finding records.
4. Select passages and run analysis. The server loads only this anonymous owner's stored retrieval, rechecks approval, validates generated evidence IDs and verbatim citations, and stores the analysis. Groq failure leaves evidence and deterministic findings intact. Existing personal notes/history remain in IndexedDB.

No login system existed. A cryptographically random HttpOnly SameSite owner cookie scopes server submission/claim/retrieval/finding records. This is anonymous session ownership, not account authentication; clearing cookies loses server access. Production extraction, verification, analysis, and OCR now share MongoDB-backed atomic limits of ten requests per session per minute, 100 across the app per minute, and 1,000 across the app per hour. Development retains the in-process session limiter. Production paid requests fail closed if shared protection is unavailable. Users can explicitly delete personal records through `/data`; research records are not automatically expired. Same-origin checks and development-only extension CORS remain. See [Vercel deployment](vercel-deployment.md) for configuration and live validation steps.

No object storage existed: screenshots are transient OCR inputs in the original workflow. MongoDB has an upload-reference field but this phase does not persist image bytes or invent an object storage service. Full-file retention needs a chosen storage service; evidence/submission text persistence works independently.

Provider requests are bounded to two attempts and eight-second timeouts, with bounded response sizes, redirect rejection and sanitized errors. Rate-limit delays longer than one second are surfaced rather than slept through. Retrieval attempts omit quotation bodies and store only parsed references. There is no shared evidence retrieval cache because provider retention/caching terms still require review; stored snapshots preserve history. Live analysis bypasses local analysis reuse and rechecks approval before model use and after analysis. Historical snapshots remain inspectable after revocation.

## Checklist and verification

- [x] Server-only adapters, Atlas connection and indexed collection schemas.
- [x] Explicit reference parsing, approval filtering and rechecks, partial results, immutable version hashes.
- [x] Submission/claim persistence, deterministic findings, stored retrieval ownership, validated Groq citations and finding persistence.
- [x] Existing evidence-screen integration and conservative provider/setup outcomes.
- [x] Controlled resource import and pending example, placeholder-only environment documentation.
- [x] Documented-shape provider fixtures and synthetic manipulated wording cases.
- [ ] Live Atlas persistence/ownership smoke test (Atlas URI missing).
- [ ] Live Quran/Sunnah smoke tests (credentials and reviewed resources missing).
- [ ] Executable Parse integration (configured API spec and approved source mapping missing).
- [ ] Authorized Turath integration (contract missing).
- [ ] Persistent screenshot object storage (service not established).

Run `npm test`, `node tests/integrations.cjs`, `npm run lint`, `npm run typecheck`, `npm run build`. Existing browser tests written for Palmer fixture retrieval need updated configured/mock server-storage setup before they can validate the new live flow. Fixture success is not live integration success. Research notebooks/workspaces/exports are existing features and were not expanded in this phase.
