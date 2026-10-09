# Tabayyun API reference

This document describes the application-facing HTTP routes implemented under `app/api`. These endpoints support the Tabayyun web interface and the localhost development extension. They are not advertised as a stable public API.

## Conventions

- JSON requests use `Content-Type: application/json` unless stated otherwise.
- Browser write requests must be same-origin.
- Cross-origin claim requests are accepted only from the exact `TABAYYUN_EXTENSION_ORIGIN`, only on localhost, and only outside production.
- Account-backed endpoints use the HttpOnly session cookie created by `/api/auth`.
- Verification routes can also create/use an anonymous owner cookie, but production research requires an account.
- Errors normally use `{ "error": { "code", "message" } }`; rate-limited responses can also include `Retry-After`.
- Provider configuration, approval, and source coverage determine whether a retrieval can run. Missing evidence is not an authenticity verdict.

## Authentication

### `GET /api/auth`

Returns the current account summary, or `{ "user": null }` when signed out.

```json
{ "user": { "username": "researcher" } }
```

### `POST /api/auth`

Register or sign in with an `action` of `register` or `login`:

```json
{
  "action": "register",
  "username": "researcher",
  "password": "a-strong-password"
}
```

Sign out with `{ "action": "logout" }`. Registration and login use shared database-backed quotas. A successful register/login sets a seven-day session cookie and returns the public username only.

## Service status

### `GET /api/status`

Reports whether configuration is present and whether MongoDB is reachable. Credential values are never returned, and a `true` flag does not prove that a provider credential is valid.

The response contains database and provider-configuration states plus approved-resource counts. `database` is one of `not_configured`, `connected`, or `unavailable`.

## Local collection search

### `POST /api/search`

Searches the small build-time demonstration collection. Send `{ "query": "patience" }`. The query must contain 1–300 characters; the complete request body is limited to 4 KB.

Results contain passage text, locator, source metadata, and an internal relevance score. That score is search ranking only, not a truth or authenticity score.

## Screenshot OCR

### `POST /api/ocr`

Accepts `multipart/form-data` with a `file` field containing a non-empty PNG or JPEG under 1,000,000 bytes. The optional `language` field is `ara` (default), `eng`, or `auto`. WebP must be converted to PNG by the browser before upload. File signatures are checked against the declared media type.

Returns `{ "text": "Extracted text requiring user review" }`. Requires `OCR_SPACE_API_KEY`. OCR output must be reviewed and explicitly saved by the user.

## Claim configuration

### `GET /api/claims/config`

Returns public extraction/analysis model settings and prompt metadata. It does not return `GROQ_API_KEY`.

## Claim extraction

### `POST /api/claims/extract`

Extracts structured, reviewable claims from one material revision. Send `text`, `projectId`, `materialId`, and `materialRevision`.

The text limit is 30,000 characters. The service returns at most 20 claims with model and prompt metadata. Extracted excerpts and offsets are validated; questionable results are flagged for correction rather than silently trusted. Requires `GROQ_API_KEY`; manual claim entry remains available without it.

## Evidence retrieval

### `POST /api/claims/retrieve`

Send a complete reviewed `claim` object. An optional `material` object can include the associated text or screenshot material. Original and edited material text are each bounded to 50,000 characters.

The endpoint retrieves eligible evidence and saves the retrieval under the current owner. Its response is `{ "retrieval": { ... } }`. Retrieval may call multiple approved providers sequentially and has a maximum route duration of 300 seconds.

Supported explicit references include Quran `surah:ayah` ranges of up to five verses and configured hadith `collection:number` identifiers. Provider capability and approved resources determine actual coverage.

## Grounded claim analysis

### `POST /api/claims/analyze`

Send the complete reviewed `claim` and a `passageIds` array containing one to eight unique IDs from its stored retrieval.

Every ID must belong to the canonical retrieval for that claim. The server reloads the evidence, validates generated citations, rechecks source eligibility, and saves a complete result only after validation. A successful response is `{ "analysis": { ... } }`.

No evidence produces a `422 NO_EVIDENCE` response before a model call. Analysis requires `GROQ_API_KEY`.

## Research workspace

### `GET /api/research`

Without parameters, returns account-owned projects and currently eligible resource summaries. Use `?projectId=<id>` to load a complete workspace containing the project, collected evidence, notes, briefs, and comparisons.

Production requires a signed-in account. Local development can use `TABAYYUN_RESEARCH_SINGLE_USER=true` on `localhost` or `127.0.0.1`.

### `POST /api/research`

All mutations use an `action` field. Actions other than `create` also require `projectId`.

| Action | Important fields | Effect |
| --- | --- | --- |
| `create` | `title`, `question`, `description`, `resourceIds`, `languages` | Create a scoped project. |
| `update` | Same fields plus `projectId` | Update project details and source scope. |
| `collect` | `projectId`, `claimId`, `evidenceIds` | Add evidence from the owner's stored retrieval. |
| `removeEvidence` | `projectId`, `id` | Remove a project-evidence association and unlink it from notes. |
| `label` | `projectId`, `id`, `proposition`, `relationship`, `annotation` | Save a user-authored evidence relationship. |
| `note` | `projectId`, optional `id`, `content`, `linkedEvidenceIds` | Create or update a researcher note. |
| `deleteNote` | `projectId`, `id` | Delete a note. |
| `compare` | `projectId`, `selectedEvidenceIds` | Generate a cited comparison from 2–3 passages. |
| `brief` | `projectId`, `selectedEvidenceIds` | Generate a cited brief from 1–8 passages. |
| `editBrief` | `projectId`, `id`, `statements` | Save reviewed edits to a brief revision. |

Comparison and brief generation require Groq and recheck source eligibility before and after generation. Researcher notes can guide emphasis but cannot substantiate source claims.

## Authenticated library preview

### `GET /api/library`

Requires an account. Use `?q=<query>` to search imported books or `?passage=<id>` to open one passage and its book metadata. With no query, the endpoint lists imported books.

The current OpenITI corpus is marked preview-only. Preview passages are excluded from verification evidence and AI analysis until source review, permission, technical readiness, and final approval all pass.

## Data deletion

### `POST /api/data`

Send `{ "confirm": true }`. The route deletes server research records associated with the current signed-in account owner or current guest-owner cookie, then removes the guest-owner cookie. A successful response is `{ "deleted": true }`.

This route does not delete account credentials, browser-local IndexedDB projects, extension storage, downloaded exports, provider logs, or database backups. The `/data` page handles the separate browser-local deletion flow.

## Operational limits

- General JSON bodies are capped at 150 KB.
- Production paid operations use shared MongoDB quotas: 10 requests per owner per minute, 100 across the app per minute, and 1,000 across the app per hour.
- Groq calls have a 45-second total deadline, no SDK retries, and at most two application attempts for eligible transient failures.
- OCR/model routes declare a 60-second maximum duration; source retrieval declares 300 seconds.
- Selected analysis evidence is capped at eight passages; comparisons require two or three.
- Resource revocation or metadata changes can block new analysis while preserving historical snapshots for inspection.

For deployment configuration, resource review, and current integration limitations, see [Vercel deployment](vercel-deployment.md), [Phase 4A](phase-4a.md), and [Phase 5](phase-5.md).
