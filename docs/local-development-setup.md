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

Local demo seed guard:

- `LOCAL_SEED_ALLOWED=true` is required for any seed/reset command.
- Seed commands refuse `NODE_ENV=production`.
- Seed commands refuse non-local database hosts.
- Seed commands refuse the production database name `listify_property_sa`.
- Local seed must target `listify_local`.
- Test seed must target `listify_test`.

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

## Recommended Local Database

Prefer a disposable local MySQL 8 database on port `3307` so it does not collide with other MySQL installs.

Start local MySQL:

```powershell
docker run --name listify-mysql-local `
  -e MYSQL_ROOT_PASSWORD=listify_root_password `
  -e MYSQL_DATABASE=listify_local `
  -e MYSQL_USER=listify_app `
  -e MYSQL_PASSWORD=listify_app_password `
  -p 3307:3306 `
  -d mysql:8.0
```

Create the isolated test database:

```powershell
docker exec listify-mysql-local mysql -uroot -plistify_root_password -e "CREATE DATABASE IF NOT EXISTS listify_test; CREATE USER IF NOT EXISTS 'listify_test'@'%' IDENTIFIED BY 'listify_test_password'; GRANT ALL PRIVILEGES ON listify_test.* TO 'listify_test'@'%'; FLUSH PRIVILEGES;"
```

Use these URLs:

```text
# .env.local
DATABASE_URL=mysql://listify_app:listify_app_password@127.0.0.1:3307/listify_local

# .env.test
DATABASE_URL=mysql://listify_test:listify_test_password@127.0.0.1:3307/listify_test
```

If Docker is not available, install MySQL 8 locally and create the same two databases/users manually. A non-production TiDB development database can work as a fallback, but keep database names isolated and never reuse production credentials.

## Migrations And Seed Data

Run local development migrations with the local-safe script:

```powershell
pnpm db:migrate:local
```

Run test migrations:

```powershell
pnpm db:migrate:test
```

Seed local-only demo data for visual testing:

```powershell
pnpm db:seed:local
```

Reset only local demo data:

```powershell
pnpm db:reset:local
```

Seed the disposable test database:

```powershell
pnpm db:seed:test
```

The local demo seed is idempotent. It first removes only records it owns:

- emails ending in `@listify.local`
- names prefixed with `[LOCAL DEMO]`
- slugs prefixed with `local-demo-`
- referral external refs prefixed with `LOCAL-DEMO-`

Older seed scripts are available, but only run them against disposable local databases:

```powershell
pnpm tsx server/scripts/seed-local-users.ts
pnpm tsx scripts/seed.ts
pnpm tsx scripts/seed-location-data.ts
```

Do not run production seed/reset scripts locally unless you have reviewed the target database first.

## Local Demo Login Details

All local demo accounts use:

```text
Password: LocalDemo123!
```

Accounts:

```text
admin@listify.local      Super Admin
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

## Visual Testing Walkthrough

1. Start the app:

```powershell
pnpm dev
```

2. Open `http://localhost:3009/login`.

3. Log in as `referrer@listify.local` with `LocalDemo123!`.

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

```powershell
pnpm test
```

Run targeted frontend distribution tests:

```powershell
pnpm vitest run client/src/pages/distribution/PartnerDashboardPage.test.tsx client/src/pages/distribution/PartnerSubmitReferralPage.test.tsx client/src/pages/distribution/PartnerReferralDetailPage.test.tsx
```

Run TypeScript checks:

```powershell
pnpm exec tsc -p tsconfig.check.json --noEmit
```

Run visual tests when a browser flow changes:

```powershell
pnpm test:visual
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

- `pnpm db:migrate` still routes through `migration:sql`, which sets `NODE_ENV=production`. Use `pnpm db:migrate:local` for local development.
- `docker-compose.yml` defines a MySQL database named `real_estate_portal` on port `3306`. It is useful for older workflows, but the recommended local setup above uses `listify_local` and `listify_test` on port `3307` to match current runtime guards and avoid collisions.
- `.env.vercel` is tracked in this repo and appears to contain concrete deployment-style values. Review whether any value is sensitive, rotate anything that has been exposed, and prefer platform-managed env vars over committed env files.
- Durable local drafts/autosave may still use browser-local state unless a feature adds schema-backed drafts.

## Preview And Staging Recommendation

Use three rings:

1. Local: `.env.local`, local MySQL `listify_local`, browser inspection, targeted tests, and TypeScript check.
2. Preview: per-PR deployment with preview-only env vars and a disposable or staging-safe database. Never use production DB credentials in preview.
3. Staging: production-like env with `APP_ENV=staging`, database name `listify_staging`, production-style integrations in sandbox/test mode, and explicit smoke checks before promotion.

For risky database or referral-engine work, run local integration tests first, then deploy a preview against a non-production DB, then promote only after the distribution/referrer flow is visually checked end to end.
