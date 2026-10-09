ment # Tabayyun AI

Evidence-first research for reviewing Islamic quotations, references, and claims.

Tabayyun AI is a Next.js research workspace that turns pasted text or screenshots into reviewable claims, retrieves evidence only from explicitly approved sources, and helps a signed-in researcher organize notes, comparisons, and cited briefs. It is designed to make provenance, source coverage, uncertainty, and human review visible at every step.

> **Important:** Tabayyun is a research aid, not a fatwa service, hadith grader, or autonomous truth engine. AI output and retrieved excerpts require qualified human review.

## The problem

Religious quotations and attributed claims are frequently shared without enough information to verify them responsibly. A normal web or AI search can obscure several important questions:

- What exact claim or quotation is being checked?
- Which edition, translation, collection, or provider supplied the evidence?
- Is the source approved for this deployment and permitted for the intended use?
- Does the evidence support the claim, merely provide context, or leave the question unresolved?
- Can another researcher reopen the work and inspect the cited passage?

The result is often a confident answer without a reproducible evidence trail.

## The solution

Tabayyun separates the research process into explicit, inspectable stages:

1. **Capture** text by paste, screenshot OCR, or the development Chrome extension.
2. **Review claims** extracted by AI or entered manually. The user can correct the statement, quotation, speaker, reference, and claim type.
3. **Retrieve evidence** from resources that have passed the application's approval gate.
4. **Compare carefully** using deterministic quotation/reference checks and bounded AI analysis based only on selected evidence.
5. **Collect research** in an account-owned workspace with notes, passage relationships, comparisons, cited briefs, and revision history.

No search miss is treated as proof that a quotation is fabricated or absent from the wider Islamic tradition. Source coverage and provider failures remain visible limitations.

## What the project provides

- Account registration and sign-in with salted password hashes, server-side sessions, and account-scoped research records.
- Browser-local inquiry projects for text, screenshots, manual claims, saved findings, and immutable analysis history.
- MongoDB-backed research projects for approved evidence, notes, user labels, comparisons, and editable cited briefs.
- Arabic and English claim extraction and evidence analysis through Groq structured output.
- Screenshot OCR through OCR.space, with mandatory user review before saving.
- Approved-source adapters for Quran and hadith lookup, plus controlled corpus ingestion and preview workflows.
- A local curated demonstration collection and an authenticated OpenITI book-preview search.
- A Manifest V3 Chrome extension for explicit page-selection capture, investigation, and versioned notebook export/import.
- Same-origin protections, bounded requests, sanitized errors, rate limits for paid production endpoints, and source eligibility checks before generation.

## System overview

```text
Browser / Chrome extension
        |
        v
Next.js pages and API routes
        |
        +-- Claim extraction and analysis ----> Groq
        +-- Screenshot OCR -------------------> OCR.space
        +-- Approved-source retrieval --------> Quran / hadith / corpus adapters
        +-- Accounts and research ------------> MongoDB Atlas
        +-- Legacy inquiry workspace ---------> IndexedDB / chrome.storage.local
```

The browser-local `/projects` workspace and account-backed `/research` workspace are intentionally separate. They are not synchronized. Approved evidence can be collected into `/research`; extension notebooks can be transferred through explicit JSON export/import.

## Technology

| Area | Implementation |
| --- | --- |
| Application | Next.js 16 App Router, React 19, TypeScript |
| Server persistence | MongoDB Atlas through Mongoose |
| Local persistence | IndexedDB and `chrome.storage.local` |
| AI | Groq SDK with strict structured outputs |
| OCR | OCR.space |
| Testing | Node test suites and Playwright browser tests |
| Deployment | Vercel with Node.js 24.x |

## Quick start

### Prerequisites

- Node.js 24.x
- npm
- MongoDB Atlas for accounts, live verification, and the research workspace
- Provider credentials only for the integrations you intend to use

### Install and run

```powershell
git clone <repository-url>
cd thabayun
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On Windows systems that block PowerShell script shims, use `npm.cmd` instead of `npm`.

For a minimal local UI review, the application starts without every optional provider key. Accounts and server-backed research require MongoDB. AI, OCR, and live source retrieval remain unavailable until their corresponding credentials and approved resource records are configured.

## Environment configuration

All credentials are server-only. Never prefix a secret with `NEXT_PUBLIC_`, commit `.env.local`, or include credential values in screenshots and issue reports.

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_URL` | Production | Canonical application origin. |
| `APP_OPERATOR_NAME` | Production | Operator name shown on legal pages. |
| `APP_SUPPORT_EMAIL` | Production | Public support/privacy contact. |
| `APP_POSTAL_ADDRESS` | Production | Public postal contact on the privacy page. |
| `MONGODB_URI` | Server workflows | MongoDB Atlas SRV URI for accounts, research, evidence, and distributed quotas. |
| `MONGODB_DB` | No | Database name; defaults to `tabayyun`. |
| `GROQ_API_KEY` | AI features | Claim extraction, evidence analysis, comparisons, and briefs. |
| `GROQ_EXTRACTION_MODEL` | No | Extraction model; defaults to `openai/gpt-oss-20b`. |
| `GROQ_ANALYSIS_MODEL` | No | Analysis model; defaults to `openai/gpt-oss-120b`. |
| `OCR_SPACE_API_KEY` | OCR | Screenshot text extraction. |
| `QF_CLIENT_ID` / `QF_CLIENT_SECRET` | Quran API | Quran Foundation Content API credentials. Both must be set together. |
| `QF_ENV` | Quran API | `prelive` or `production`; prelive coverage is limited. |
| `SUNNAH_API_KEY` | Sunnah API | Explicit collection-and-number lookup. |
| `UMMAH_API_KEY` | No | Optional key for UmmahAPI when an approved resource uses that provider. |
| `TABAYYUN_RESEARCH_SINGLE_USER` | Development only | Allows the research workspace without an account on localhost when set to `true`. Never authorizes production access. |
| `TABAYYUN_EXTENSION_ORIGIN` | Extension development | Exact `chrome-extension://...` origin accepted by the localhost development server. |
| `TABAYYUN_BACKEND_ORIGIN` | Extension build | Local HTTP backend embedded in the extension build. |
| `PARSE_API_KEY` / `SHAMEELA_API_KEY` | Out-of-scope adapter | Key accepted by the retained Shamela adapter. Current Shamela resources are disabled and ineligible for evidence. |
| `SHAMELA_MAX_PAGES` | No | Bounded page fetch count, clamped to 1–5; defaults to `3`. |

Use [.env.example](.env.example) as the safe template. It contains variable names and non-secret defaults only. See [Vercel deployment](docs/vercel-deployment.md) for production requirements and live validation.

## Main application routes

| Route | Purpose |
| --- | --- |
| `/` | Capture and investigate text or screenshots. |
| `/account` | Register, sign in, and sign out. |
| `/projects` | Browser-local inquiry projects and saved findings. |
| `/research` | Account-backed evidence collection, notes, comparisons, and briefs. |
| `/library` | Authenticated preview search for imported books not yet eligible as evidence. |
| `/sources` | Storage/configuration status and approved-resource counts; never exposes secret values. |
| `/data` | Delete account-owned or current guest research records and manage local data. |
| `/privacy`, `/terms` | Public policy pages. |

## API overview

The APIs are intended for the Tabayyun UI, not as a public third-party platform. JSON write routes enforce same-origin requests. The Chrome extension can call selected claim routes only during localhost development and only from the configured extension origin.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET`, `POST` | `/api/auth` | Read the current session; register, sign in, or sign out. |
| `GET` | `/api/status` | Report database/configuration presence and approved-resource counts. |
| `POST` | `/api/search` | Search the small built-in demonstration collection. |
| `POST` | `/api/ocr` | Extract text from a reviewed PNG/JPEG screenshot under 1 MB. |
| `GET` | `/api/claims/config` | Return public model configuration and prompt metadata; never credentials. |
| `POST` | `/api/claims/extract` | Extract structured claims from supplied material. |
| `POST` | `/api/claims/retrieve` | Retrieve evidence for a reviewed claim from eligible resources. |
| `POST` | `/api/claims/analyze` | Analyze one claim against up to eight passages from its stored retrieval. |
| `GET`, `POST` | `/api/research` | Load projects/workspaces and perform research mutations. |
| `GET` | `/api/library` | Search or open authenticated preview-only imported book passages. |
| `POST` | `/api/data` | Delete records for the current account or guest owner after confirmation. |

Common API errors use the object shape `{ "error": { "code": "...", "message": "..." } }`.

Representative requests, limits, authentication behavior, and research actions are documented in [API reference](docs/api-reference.md).

## Source approval and corpus safety

Technical access does not make a source suitable evidence. A book resource is eligible only when all of the following are true:

- final approval is `approved`;
- source review is `approved`;
- usage permission is `permitted`; and
- technical status is `retrieval-ready`.

Resource examples are pending templates, not automatic approvals. A qualified reviewer must verify identity, edition, language, attribution, limitations, and permission before importing an approved record.

Current important limits:

- Quran Foundation prelive covers only surahs 1 and 2.
- Quran and Sunnah workflows work best with explicit references; broad full-corpus discovery is provider-dependent.
- Turath book 963 has a tested bounded adapter but remains unapproved because usage permission is unresolved.
- OpenITI is an authenticated preview only and is excluded from verification evidence.
- Shamela is outside the current milestone and its wildcard resource is disabled.
- A provider error or no-match result is not a religious or authenticity verdict.

See [Phase 4A source integrations](docs/phase-4a.md), [the fiqh corpus milestone](docs/fiqh-corpus-milestone.md), and [Shamela integration notes](docs/shamela-integration.md).

## Validation

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

For browser tests, start the application and run:

```powershell
npm run test:browser
```

Additional commands:

| Command | Purpose |
| --- | --- |
| `npm run check:production` | Validate production configuration shape without printing secrets. |
| `npm run test:quran` | Read-only Quran Foundation credential and verse smoke test. |
| `npm run eval:groq` | Inspect evaluation readiness; add `-- --live` to use configured models. |
| `npm run build:extension` | Build the development Chrome extension. |
| `npm run resources:import -- <file>` | Import explicitly reviewed resource records. |
| `npm run openiti:import` | Import the pinned OpenITI preview corpus. |

Automated tests mock database and provider boundaries unless a command explicitly says it is live. Passing fixtures does not prove that deployment credentials, Atlas networking, source approvals, or provider access work in production.

## Repository guide

```text
app/                 Next.js pages and API route handlers
components/          Research, claim-review, account, and library interfaces
lib/auth/            Password hashing and session management
lib/claims/          Extraction, analysis, validation, grounding, and model adapter
lib/integrations/    Providers, source approval, quotas, MongoDB, and retrieval
lib/research/        Account-backed project, note, comparison, and brief services
extension/           Manifest V3 capture and notebook extension
scripts/             Resource import, corpus import, and deployment checks
tests/               Unit, integration, evaluation, and Playwright suites
docs/                Deployment, milestones, evaluations, and source-review notes
```

## Security and privacy notes

- Session cookies are HttpOnly and SameSite=Strict; production cookies are Secure.
- Passwords are stored as salted scrypt hashes, and session tokens are stored as hashes.
- Production paid endpoints use MongoDB-backed shared request budgets and fail closed when protection is unavailable.
- Model and OCR credentials stay on the server.
- Screenshots are sent to OCR.space only when requested and are not persisted by this application.
- Groq receives text for extraction, or the selected claim and bounded selected evidence for analysis; it does not receive the complete research workspace.
- Research records persist until explicitly deleted; account credential deletion and password recovery are not implemented.
- Browser-local projects, recent inquiries, and extension storage are separate from server-backed account research.

Review [Privacy](app/privacy/page.tsx), [Terms](app/terms/page.tsx), and [Manage data](app/data/page.tsx) behavior before a public launch, and replace all operator placeholders with real information.

## Project status

The core workflow, account system, storage boundaries, source-approval gates, tests, and deployment checks are implemented. A public production release still depends on operator-owned deployment work: live Atlas validation, real provider credentials, reviewed and approved resources, policy review, backup/retention decisions, and end-to-end smoke testing on the deployed URL.

For the current release gates and demonstration sequence, see [Phase 5 submission readiness](docs/phase-5.md).
