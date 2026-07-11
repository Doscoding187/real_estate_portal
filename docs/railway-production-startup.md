# Railway Production Startup (Stable)

Use this for the backend service that serves `api.propertylistifysa.co.za`.

## Required start command

Set Railway service start command to:

`pnpm start:prod:with-migrations`

This is also pinned in `railway.json`. The startup pipeline now runs launch preflight checks before migrations and server boot, then runs the production migration verifier, then starts the API.

The production commands explicitly pin both `NODE_ENV=production` and
`APP_ENV=production`, so a stale service variable cannot make the release
select a development or staging database target.

## Why this matters

If production environment values are incomplete, unsafe, or still pointing at local/test placeholders, the process must fail before it can mutate the database or accept agency signups. If migrations or startup fail, Railway serves `502 Bad Gateway`; browsers then often surface CORS errors as a secondary symptom because the app never returns normal headers.

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

Recommended production groups:

- `REDIS_URL`
- `GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY`
- `SAVED_SEARCH_ACTION_TOKEN_SECRET`

## Deploy verification checklist

After each deploy, confirm logs include:

- `Launch preflight (production) passed`
- migration verifier success
- server boot success on `NODE_ENV=production`
- no startup retries/crash loop
- healthy `GET /api/trpc/auth.me` from `https://www.propertylistifysa.co.za`

Use the release procedure in `docs/railway-release-procedure.md` for migration and schema checks.
