# Railway Production Startup (Stable)

Use this for the backend service that serves `api.propertylistifysa.co.za`.

## Required start command

Railway starts the API with:

`pnpm start:prod`

This is pinned in `railway.json`. Launch preflight, migration planning, and
explicit release application are deliberately outside server startup; use the
release procedure before deployment. Server startup must not mutate a protected
database or silently turn a failed preflight into an application boot.

The production commands explicitly pin both `NODE_ENV=production` and
`APP_ENV=production`, so a stale service variable cannot make the release
select a development or staging database target.

## Why this matters

If production environment values are incomplete, unsafe, or still pointing at local/test placeholders, the release preflight must fail before a deployment is approved. If a dependency fails at runtime, the API must return a controlled response rather than leave a browser request pending; browsers can otherwise surface CORS as a secondary symptom because no normal response headers arrive.

## Launch preflight

Run the same gate manually before deploy:

```bash
pnpm launch:preflight
```

Required production groups:

- production database target: `listify_property_sa`
- strong `JWT_SECRET`
- HTTPS app/API URLs: `APP_URL` or `NEXT_PUBLIC_APP_URL`, `VITE_APP_URL`, `VITE_API_URL` or `VITE_API_BASE_URL`
- public media S3: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`
- manual EFT billing details: `BILLING_EFT_*`, `BILLING_SUPPORT_EMAIL`
- private billing proof storage: `BILLING_PROOF_STORAGE_ADAPTER=s3`, proof bucket/region/credentials
- transactional email: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` or `EMAIL_FROM`
- shared auth rate limiting: a valid reachable `REDIS_URL` using `redis://` or
  `rediss://`. Attach the Railway Redis service or supply its managed URL; do
  not substitute an in-process fallback in production.

Recommended production groups:

- `GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY`
- `SAVED_SEARCH_ACTION_TOKEN_SECRET`

Optional auth availability tuning is bounded by the API and validated at
preflight: `AUTH_RATE_LIMIT_STORE_TIMEOUT_MS` (250-5000, default 1500) and
`AUTH_RATE_LIMIT_STORE_COOLDOWN_MS` (1000-60000, default 5000). A Redis outage
returns a fail-closed `503` with `Retry-After`; it must never become an
in-memory production limiter or an indefinitely pending browser request.

## Deploy verification checklist

After each deploy, confirm logs include:

- server boot success on `NODE_ENV=production`
- no startup retries/crash loop
- healthy `GET /api/trpc/auth.me` from `https://www.propertylistifysa.co.za`

Then run the no-account-creation auth-boundary smoke check:

```bash
AUTH_BOUNDARY_SMOKE_API_URL=https://api.propertylistifysa.co.za \
AUTH_BOUNDARY_SMOKE_ORIGIN=https://www.propertylistifysa.co.za \
pnpm release:smoke:auth-boundary
```

It requires both a successful CORS preflight and a fast `400` validation
response to an intentionally empty registration payload. A `503`, timeout, or
missing CORS header means the release is not ready; inspect Railway's managed
Redis service, its `REDIS_URL` binding, and the deploy logs without printing
the URL or credentials.

Use the release procedure in `docs/railway-release-procedure.md` for migration and schema checks.
