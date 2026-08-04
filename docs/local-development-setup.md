# Local Development Setup

This guide sets up a safe local workflow for `C:\Dev\listify-next-task` so you can run the app, test database-backed features, and visually inspect changes before production.

Do not use production credentials locally. Do not point `DATABASE_URL` at production. The production database name is guarded, but treat `.env.local` and `.env.test` as the final safety line.

Local demo accounts and demo records are local/test-only. They must never be used in production, copied into production, exported to production, or wired into deployment/start/migration workflows. Migrations may run in production; local demo seeds must not.

## Env Audit Summary

The repo loads runtime env through `server/_core/runtimeBootstrap.ts`:

- development loads `.env`, then `.env.local`
- test loads `.env.test`
- staging/production should use platform-managed variables

Mandatory for local development:

- `NODE_ENV=development`
- `APP_ENV=development`
- `DATABASE_URL`
- `JWT_SECRET`
- `APP_URL`
- `VITE_APP_URL`
- `VITE_API_URL`
- `VITE_API_BASE_URL`
- `VITE_APP_ID`

Mandatory for database-backed tests:

- `NODE_ENV=test`
- `APP_ENV=test`
- `DATABASE_URL` with database name exactly `listify_test`
- `JWT_SECRET`
- `SKIP_DB_INIT=0` or unset

Optional service groups:

- Runtime toggles: `PORT`, `SKIP_FRONTEND`, `SKIP_DB_INIT`, `TRUST_PROXY`, `NODE_ENV`, `APP_ENV`
- Email: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `EMAIL_FROM`, `VITE_USE_MOCK_EMAILS`
- Payments: `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Uploads/storage: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `AWS_S3_BUCKET`, `CLOUDFRONT_URL`, `VITE_CLOUDFRONT_URL`, `MAX_IMAGE_SIZE_MB`
- Video: `ENABLE_VIDEO_PIPELINE`, `MEDIACONVERT_ENDPOINT`, `MEDIACONVERT_ROLE_ARN`
- Maps/places: `GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY`, `GOOGLE_PLACES_API_KEY`, `GOOGLE_GEOCODING_API_KEY`, `GOOGLE_STREET_VIEW_API_KEY`, `GOOGLE_PLACES_COUNTRY_RESTRICTION`
- Redis/cache: `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`
- AI/CMS: `OPENAI_API_KEY`, `CONTENTFUL_SPACE_ID`, `CONTENTFUL_API_KEY`, `MEDIA_RULES_PATH`
- Distribution tuning: `DISTRIBUTION_AFFORDABILITY_INTEREST_RATE_ANNUAL`, `DISTRIBUTION_AFFORDABILITY_TERM_MONTHS`, `DISTRIBUTION_AFFORDABILITY_MAX_REPAYMENT_RATIO`, `DISTRIBUTION_AFFORDABILITY_LOW_CONFIDENCE_INCOME`
- Saved searches: `SAVED_SEARCH_ACTION_TOKEN_SECRET`, `SAVED_SEARCH_SCHEDULER_ENABLED`, `SAVED_SEARCH_SCHEDULER_INTERVAL_MS`
- Auth/bootstrap integrations: `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`
- Deployment metadata: `CI`, `DEV`, `PROD`, `MODE`, `VERCEL_ENV`, `VERCEL_GIT_COMMIT_SHA`, `GITHUB_SHA`, `COMMIT_SHA`, `RAILWAY_ENVIRONMENT`, `RAILWAY_ENVIRONMENT_NAME`, `RAILWAY_GIT_COMMIT_SHA`, `RAILWAY_PUBLIC_DOMAIN`, `BUILD_TIME`
- Legacy/fallback database aliases: `TIDB_HOST`, `TIDB_PORT`, `TIDB_USER`, `TIDB_PASSWORD`, `TIDB_DATABASE`, `DB_HOST`, `DB_NAME`
- Legacy/public URL aliases: `API_URL`, `BASE_URL`, `FRONTEND_URL`, `NEXT_PUBLIC_APP_URL`

Full audited variable catalog:

```text
API_URL, APP_ENV, APP_URL, AUTOCOMPLETE_CACHE_TTL_SECONDS, AUTOCOMPLETE_DEBOUNCE_MS,
AWS_ACCESS_KEY_ID, AWS_REGION, AWS_S3_BUCKET, AWS_SECRET_ACCESS_KEY, BASE_URL,
BUILD_TIME, BUILT_IN_FORGE_API_KEY, BUILT_IN_FORGE_API_URL, CI, CLOUDFRONT_URL,
COMMIT_SHA, CONTENTFUL_API_KEY, CONTENTFUL_SPACE_ID, DATABASE_URL, DB_HOST,
DB_NAME, DEV, DISTRIBUTION_AFFORDABILITY_INTEREST_RATE_ANNUAL,
DISTRIBUTION_AFFORDABILITY_LOW_CONFIDENCE_INCOME,
DISTRIBUTION_AFFORDABILITY_MAX_REPAYMENT_RATIO, DISTRIBUTION_AFFORDABILITY_TERM_MONTHS,
EMAIL_FROM, ENABLE_VIDEO_PIPELINE, FEATURE_DISTRIBUTION_NETWORK, FRONTEND_URL,
GITHUB_SHA, GOOGLE_GEOCODING_API_KEY, GOOGLE_MAPS_API_KEY, GOOGLE_PLACES_API_KEY,
GOOGLE_PLACES_COUNTRY_RESTRICTION, GOOGLE_STREET_VIEW_API_KEY, JWT_SECRET,
MAX_IMAGE_SIZE_MB, MEDIA_RULES_PATH, MEDIACONVERT_ENDPOINT, MEDIACONVERT_ROLE_ARN,
MODE, NEXT_PUBLIC_APP_URL, NODE_ENV, OAUTH_SERVER_URL, OPENAI_API_KEY,
OWNER_OPEN_ID, PORT, PROD, PROD_RESET_CONFIRM, PROD_RESET_ENABLED,
PROD_SUPERADMIN_EMAIL, PROD_SUPERADMIN_PASSWORD, RAILWAY_ENVIRONMENT,
RAILWAY_ENVIRONMENT_NAME, RAILWAY_GIT_COMMIT_SHA, RAILWAY_PUBLIC_DOMAIN, REDIS_DB,
REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, REDIS_URL, RESEND_API_KEY, RESEND_FROM_EMAIL,
S3_BUCKET_NAME, SAVED_SEARCH_ACTION_TOKEN_SECRET, SAVED_SEARCH_SCHEDULER_ENABLED,
SAVED_SEARCH_SCHEDULER_INTERVAL_MS, SKIP_DB_INIT, SKIP_FRONTEND,
STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, TIDB_DATABASE,
TIDB_HOST, TIDB_PASSWORD, TIDB_PORT, TIDB_USER, TRUST_PROXY, VERCEL_ENV,
VERCEL_GIT_COMMIT_SHA, VITE_API_BASE_URL, VITE_API_URL, VITE_APP_ENV, VITE_APP_ID,
VITE_APP_URL, VITE_ASSETS_BASE_URL, VITE_CLOUDFRONT_URL, VITE_DEPLOY_ENV,
VITE_FEATURE_AUTO_SEND_INVITES, VITE_FEATURE_TEAM_INVITATIONS,
VITE_GOOGLE_MAPS_API_KEY, VITE_MAX_TEAM_INVITATIONS_PER_AGENCY,
VITE_ONBOARDING_DRAFT_EXPIRY_HOURS, VITE_USE_MOCK_EMAILS
```

Production/reset variables must stay disabled locally:

- `PROD`
- `PROD_RESET_ENABLED`
- `PROD_RESET_CONFIRM`
- `PROD_SUPERADMIN_EMAIL`
- `PROD_SUPERADMIN_PASSWORD`

Database Authority data rule:

- The fixed `listify_local` database is quarantined and is not a development
  target for feature worktrees.
- Fixed-database seed, reset, rebuild, and reprovision commands are retired.
- Feature worktrees use only the exact owned disposable database resolved by
  Database Authority.
- Canonical geography and Search-to-Lead data are prepared through their
  operation-specific adapters; do not use ad hoc SQL or legacy seeds.

## First-Time Setup

Install dependencies:

```powershell
cd C:\Dev\listify-next-task
pnpm install --frozen-lockfile
```

Create local env files:

```powershell
Copy-Item .env.local.example .env.local
Copy-Item .env.test.example .env.test
```

Generate local secrets and paste them into `.env.local` and `.env.test`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Database Authority local runtime

The local Database Authority service is native MySQL, service-only, and
Docker-independent. It binds only to `127.0.0.1:3307`. The system MySQL
listener on host port `3306` is unrelated and prohibited. Service state is
derived from the current numeric UID under
`/var/tmp/property-listify-<uid>/mysql-3307`; the UID and service directories
must be exact-owned, mode `0700`, and non-symlinked. Do not improvise a
home-directory datadir or modify AppArmor.

Run the normal feature-worktree sequence in order:

```bash
pnpm db:authority:status
pnpm db:authority:manifest
pnpm db:authority:context

pnpm db:authority:service:start
pnpm db:authority:service:wait
pnpm db:authority:service:status

pnpm db:worktree:create

pnpm db:migrate:plan -- \
  --accepted-old-head=none \
  --expected-new-head=<manifest-head>
pnpm db:migrate:apply -- \
  --accepted-old-head=none \
  --expected-new-head=<manifest-head>
pnpm db:schema:congruency

pnpm db:reference:prepare
pnpm db:reference:verify
pnpm db:scenario:prepare
pnpm db:scenario:verify

pnpm db:readiness -- --purpose=database
pnpm db:readiness -- --purpose=location-discovery
```

Replace `<manifest-head>` with the expected head reported by
`db:authority:manifest`. The service start creates no application database,
account, grant, migration, reference data, or scenario data. Database creation
and data writes are separate approved operations. The worktree context derives
the exact database identity; do not handcraft a fixed `listify_local` URL.

Only after the requested readiness purpose is ready should you start the
application with `pnpm dev`. Browser readiness is not implied by a live
service, a migrated schema, or a reachable API.

Replay the approved adapters explicitly when deterministic evidence is needed:

```bash
pnpm db:reference:prepare
pnpm db:scenario:prepare
pnpm db:reference:verify
pnpm db:scenario:verify
```

After feature verification, re-resolve the context, obtain the exact disposal
acknowledgement, dispose only the exact owned target, and then stop the service
through its validated Unix socket:

```bash
pnpm db:authority:context
pnpm db:worktree:ack
pnpm db:worktree:dispose -- --ack=CONFIRM_DATABASE_DISPOSE_<fingerprint-prefix>
pnpm db:authority:service:stop
pnpm db:authority:service:status
```

`mysqladmin shutdown` over the exact Unix socket is the only canonical service
shutdown path. Do not fall back to TCP, direct signals, `pkill`, `killall`, or
system-service control. The first unexpected runtime result stops the sequence;
preserve the service, target, and sanitized logs for review rather than
retrying migrations or repairing data manually.

## Database Authority troubleshooting

- **AppArmor path denial:** use the authority-derived `/var/tmp` path. Do not
  create a home-directory datadir, broaden home permissions, or modify,
  disable, or reload AppArmor. A previous home path is inactive legacy residue.
- **Unexpected service-root entry:** preserve the directory and inspect the
  exact artifact. The lifecycle accepts only known MySQL artifacts, including
  the exact `mysql.sock.lock`; arbitrary lock files, symlinks, foreign ownership,
  and unexpected contents fail closed.
- **Port `3307` conflict:** stop before connecting or terminating anything and
  identify the exact owner. Never use or stop the unrelated host listener on
  port `3306`.
- **Socket shutdown failure:** preserve the running state and logs. The stop
  command validates the PID, socket, lock, marker, and port, then uses only
  `mysqladmin --no-defaults --protocol=socket` on the exact socket. It has no
  signal or TCP fallback.
- **Stale service identity:** do not overwrite, delete, or adopt ambiguous
  state. Obtain an exact cleanup authorization for only the validated residue.
- **Missing reference or scenario readiness:** do not use manual SQL or a
  general seed. Confirm the exact owned worktree target, accepted migration
  head, and operation-specific adapter verification; application readiness
  remains false until the requested data layers are ready.

The agency billing smoke uses manual EFT placeholders and private local proof storage. For local and test runs, keep values non-payable:

```text
BILLING_EFT_ACCOUNT_NAME=LOCAL TEST EFT ACCOUNT - NOT PAYABLE
BILLING_EFT_BANK_NAME=Local Test Bank
BILLING_EFT_BRANCH_CODE=000000
BILLING_EFT_ACCOUNT_NUMBER=0000000000
BILLING_EFT_ACCOUNT_TYPE=Local test account
BILLING_PROOF_STORAGE_ADAPTER=local
BILLING_PRIVATE_STORAGE_DIR=.private/billing-proofs
```

Production bank details must come from deployment configuration or a secrets manager. Production proof storage must be configured with the private S3 billing variables in `.env.example`; proof uploads must not persist public object URLs.

The legacy fixed-database demo seed/reset commands are retired. They may not
be used to create, adopt, or mutate `listify_local`. Product-specific demo
workflows require their own approved Database Authority target and adapter.

## Product-specific demo details (separate workflow)

The accounts and records below describe an older agency-workspace smoke
scenario. They are not created by the Database Authority service or the
Search-to-Lead adapter above, and they are not a prerequisite for ordinary
feature-worktree startup. Do not restore the retired fixed-database seed
commands to create them; use a separately approved target and adapter when
that product workflow is explicitly required.

Local demo credentials are supplied through development-only environment configuration:

```text
LOCAL_DEMO_AGENCY_PASSWORD=...
```

Accounts:

```text
admin@listify.local      Super Admin
agency@listify.local     Agency Principal / workspace smoke account
developer@listify.local  Developer / Development Manager
agent@listify.local      Agency / Agent referrer
referrer@listify.local   Open Referrer / Workclass-style referrer
buyer@listify.local      Buyer user
```

Seeded demo scenarios:

```text
[LOCAL DEMO] Hillside Gardens        Submit-ready opportunity
[LOCAL DEMO] River Quarter           Pending setup / explore-only opportunity
[LOCAL DEMO] Mandate Locked Estate   Blocked opportunity
```

Seeded referrer records:

```text
LOCAL-DEMO-SUBMITTED         Buyer submitted, awaiting review
LOCAL-DEMO-NEEDS-ACTION      Buyer has missing/pending required documents
LOCAL-DEMO-PAYOUT-PROGRESS   Reward approved and payout in progress
LOCAL-DEMO-AGENT-SUBMITTED   Agency-agent submitted referral
```

Seeded agency workspace checks:

```text
[LOCAL DEMO] New Buyer                    Assignment, status, follow-up, reload persistence
[LOCAL DEMO] Missing Agent Detail Buyer   Detail view with an out-of-agency agent reference
[LOCAL DEMO] Cross Agency Buyer           Isolation fixture that must not be visible to the main agency
```

## Visual Testing Walkthrough

1. Start the app:

```bash
pnpm db:authority:service:start
pnpm db:authority:service:wait
pnpm db:worktree:create
pnpm db:migrate:plan -- --accepted-old-head=none --expected-new-head=<manifest-head>
pnpm db:migrate:apply -- --accepted-old-head=none --expected-new-head=<manifest-head>
pnpm db:schema:congruency
pnpm db:reference:prepare
pnpm db:reference:verify
pnpm db:scenario:prepare
pnpm db:scenario:verify
pnpm db:readiness -- --purpose=location-discovery
pnpm dev
```

Use only records provided by the approved adapter for the feature under test;
this workflow does not create the retired agency demo seed or fixed
`listify_local` database.

2. Open `http://localhost:3009/login`.

3. Log in as `referrer@listify.local` with your configured local demo password.

4. Visit `http://localhost:3009/distribution/partner/overview`.

5. Check:

- dashboard modules show available opportunities, buyers needing action, recent next steps, and reward progress
- submit mode shows `[LOCAL DEMO] Hillside Gardens`
- explore mode shows `[LOCAL DEMO] River Quarter` and `[LOCAL DEMO] Mandate Locked Estate` with non-submit labels/messages
- buyer referral wizard shows required documents and saves local draft state while typing
- referral detail page shows buyer status, assigned manager, document progress, and payout/reward progress
- blocked opportunity messages are friendly and do not expose internal policy wording

6. Log in as `agent@listify.local` to test the agency/agent referral path.

7. Log in as `developer@listify.local` to inspect assigned referrals and manager/developer flows.

8. Log in as `admin@listify.local` to inspect development readiness, documents, commissions, and access setup.

## Running The App Locally

Start backend and frontend together:

```powershell
pnpm dev
```

Or start them separately:

```powershell
pnpm dev:backend
pnpm dev:frontend
```

Default local URLs:

- Frontend: `http://localhost:3009`
- Backend: `http://localhost:5000`

After frontend changes, visually inspect the relevant route in the browser before merging.

## Test Workflow

Run backend/frontend tests:

```bash
pnpm test
```

Run targeted frontend distribution tests:

```bash
pnpm vitest run client/src/pages/distribution/PartnerDashboardPage.test.tsx client/src/pages/distribution/PartnerSubmitReferralPage.test.tsx client/src/pages/distribution/PartnerReferralDetailPage.test.tsx
```

Run TypeScript checks:

```bash
pnpm exec tsc -p tsconfig.check.json --noEmit
```

Run visual tests when a browser flow changes:

```bash
pnpm test:visual
```

Run the local agency workspace smoke:

```bash
LOCAL_DEMO_AGENCY_PASSWORD='local-only-password' pnpm test:agency-browser-smoke
```

## Distribution Referral Integration Test

This test requires `.env.test` and the disposable `listify_test` database.

1. Confirm `.env.test` contains:

```text
NODE_ENV=test
APP_ENV=test
DATABASE_URL=mysql://listify_test:listify_test_password@127.0.0.1:3307/listify_test
```

2. Run test migrations:

```powershell
pnpm db:migrate:test
```

3. Run the integration test:

```powershell
pnpm vitest run server/__tests__/distributionPartnerReferralSubmission.integration.test.ts
```

If the test is skipped, `DATABASE_URL` is missing or `.env.test` was not loaded. If the DB target guard fails, the database name is not `listify_test`. If tables or columns are missing, rerun `pnpm db:migrate:test`.

## Missing Scripts And Blockers

- Fixed-database local bootstrap, `db:migrate:fresh:local`, `db:reprovision:local`,
  and local demo seed/reset commands are retired. Use the Database Authority
  sequence above.
- The system MySQL listener on port `3306` is unrelated and prohibited. The
  approved local service uses only `127.0.0.1:3307` and the UID-bound native
  runtime path under `/var/tmp`.
- `.env.vercel` is a local Vercel environment file and is intentionally ignored by Git. Create it locally from `.env.vercel.example`, populate the required values through the appropriate provider or local environment, and never commit real credentials or tokens.
- Earlier repository revisions contained concrete `.env.vercel` credential material. Removing the current file from the main tree does not remove those historical values from Git history or revoke them at their providers. Credential rotation and the Git-history remediation decision remain separate operational obligations.
- Durable local drafts/autosave may still use browser-local state unless a feature adds schema-backed drafts.

## Preview And Staging Recommendation

Use three rings:

1. Local: `.env.local`, the Database Authority service, an exact disposable
   worktree database, approved adapters, purpose-aware readiness, browser
   inspection, targeted tests, and TypeScript check.
2. Preview: per-PR deployment with preview-only env vars and a disposable or staging-safe database. Never use production DB credentials in preview.
3. Staging: production-like env with `APP_ENV=staging`, database name `listify_staging`, production-style integrations in sandbox/test mode, and explicit smoke checks before promotion.

For risky database or referral-engine work, run local integration tests first, then deploy a preview against a non-production DB, then promote only after the distribution/referrer flow is visually checked end to end.
