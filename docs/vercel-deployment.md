# Vercel deployment

Import this repository with the **Next.js** preset, repository root, and **Node.js 24.x**. `vercel.json` uses `npm ci` and runs an environment preflight before the Next.js build. No static export or custom output directory is needed; the APIs require Node.js functions.

## Environment variables

Set variables in **Project Settings → Environment Variables**. Use separate Atlas databases and provider credentials for Preview and Production. Never commit `.env.local` or put credentials in `NEXT_PUBLIC_*` variables.

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Stable public HTTPS origin, e.g. `https://your-project.vercel.app`, without a path. |
| `APP_OPERATOR_NAME` | Actual operator's person/organization name, published on legal pages. |
| `APP_SUPPORT_EMAIL` | Monitored privacy, security, and support email, published publicly. |
| `APP_POSTAL_ADDRESS` | Operator's postal contact address, published on the privacy page. |
| `MONGODB_URI` | Atlas SRV URI; required for distributed protection on production paid endpoints. |
| `MONGODB_DB` | Database name; default `tabayyun`. Use a separate preview database. |
| `GROQ_API_KEY` | Enables extraction and analysis. |
| `GROQ_EXTRACTION_MODEL`, `GROQ_ANALYSIS_MODEL` | Optional defaults listed in `.env.example`. |
| `OCR_SPACE_API_KEY` | Enables screenshot OCR. |
| `QF_CLIENT_ID`, `QF_CLIENT_SECRET` | Both required when Quran Foundation is enabled. |
| `QF_ENV` | `production` with approved production credentials; `prelive` for preview testing. |
| `SUNNAH_API_KEY` | Optional Sunnah lookup. |

The preflight prints missing **names**, never secret values. It blocks publishing without real operator/contact details. It validates configuration shape, not credential validity. Redeploy after editing environment variables: legal details and metadata are rendered at build time.

`TABAYYUN_BACKEND_ORIGIN` and `TABAYYUN_EXTENSION_ORIGIN` belong to the development-only extension workflow; they do not set the website URL. Production extension requests remain unsupported. Parse and Turath remain unavailable until their contracts are reviewed.

## Atlas and providers

Use a dedicated Atlas database user, configure network access for Vercel's outbound networking, and choose a function region near Atlas. Credentials need permissions to create required indexes, including the transient quota TTL index. Research data is not automatically expired. The shared limiter fails closed if Atlas or its counter index is unavailable.

OCR, extraction, retrieval, and analysis share limits across Vercel instances: **10/session/minute**, **100/app/minute**, and **1,000/app/hour**. A rejected budget returns 429 with `Retry-After`. Global budgets protect against cookie resets but can be exhausted by an attacker; configure provider spend caps and Vercel firewall rules. These request limits are not dollar caps. Add authenticated users before offering private cloud accounts or paid subscriptions.

Import individually reviewed resources using [the existing resource review workflow](phase-4a.md). Never mark the example resources approved automatically. Production Quran access requires approved production scopes and credentials. The application uses **Content API client credentials**, not Quran.com user login or User APIs.

## Quran Foundation form

Replace the example origin with your actual public deployment:

| Field | URL |
| --- | --- |
| Logo URL | `https://your-project.vercel.app/logo.svg` |
| Client URL | `https://your-project.vercel.app` |
| Privacy policy URL | `https://your-project.vercel.app/privacy` |
| Terms of service URL | `https://your-project.vercel.app/terms` |

These routes must be reachable without Vercel Deployment Protection or login. The logo is an original SVG asset; export it to PNG and host that asset if the console requires a raster format.

Review the policies against actual provider contracts, jurisdiction, and [Quran Foundation privacy requirements](https://api-docs.quran.com/legal/developer-privacy/). They describe the implemented workflow and do not establish legal or platform approval. Configure Atlas backups and Vercel log retention, and document their actual deletion schedules. Active-record deletion does not erase provider logs, backups, public source records, or downloaded exports. Server personal records currently remain until explicit deletion; cookie expiry does not delete research.

## Validation and launch

To test Quran Foundation credentials directly from `.env.local`, run `npm run test:quran` (Windows PowerShell: `npm.cmd run test:quran`). This read-only smoke test requests a Content API token and verse `1:1` in the configured `QF_ENV`, reporting only HTTP statuses and success/failure. It never prints credentials or tokens, writes database records, or approves resources. A passing credential test does not verify MongoDB persistence or the app's approved-resource workflow.

You can test a specific verse with `npm.cmd run test:quran -- 94:5`. Authentication can succeed while a verse lookup returns 404 in prelive; test access does not establish production coverage. To compare submitted wording in the app, set the claim type to Quran quotation or attribution, enter the submitted wording in Explicit quotation, supply the verse reference, and retrieve from a reviewed, approved Arabic resource. An empty retrieval disables analysis and the API rejects it before any Groq request.

1. Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` with Node 24. Run `npm run check:production` with the intended deployment configuration.
2. Deploy a Preview with isolated test configuration. Check `/`, `/projects`, `/sources`, `/privacy`, `/terms`, `/data`, and `/logo.svg` on desktop and mobile.
3. Verify Atlas persistence and indexes. With real provider keys and approved resources, smoke-test OCR, extraction, reference retrieval, and analysis. Fixture tests do not verify live integrations.
4. In two browser profiles, create disposable test records. Explicitly delete one session's records through `/data` and verify the other remains intact. Optional local deletion clears only that browser's research. Automated deletion tests use a mock database, never live records.
5. Verify 429 and `Retry-After`, security headers, and API `Cache-Control: private, no-store`. Function budgets are 60 seconds for OCR/model calls and 300 seconds for bounded sequential source retrieval; confirm your Vercel plan supports these durations.
6. Publish Production, verify public policy links, and enter the URLs above into the Quran Foundation console.

Deployment, DNS, real credentials, operator policy review, backup retention, resource approval, and live provider testing remain operator setup steps; the repository does not provision them automatically.

References: [Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [function duration](https://vercel.com/docs/functions/configuring-functions/duration), [Next.js headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers).
