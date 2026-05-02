# Railway Production Startup (Stable)

Use this for the backend service that serves `api.propertylistifysa.co.za`.

## Required start command

Set Railway service start command to:

`pnpm start:prod`

This keeps API boot independent from migration execution and avoids startup-loop failures when a migration check fails.

## Why this matters

If migrations are run inside startup and one step fails, the process exits and Railway serves `502 Bad Gateway`.  
Browsers then often surface CORS errors as a secondary symptom because the app never returns normal headers.

## Deploy verification checklist

After each deploy, confirm logs include:

- server boot success on `NODE_ENV=production`
- no startup retries/crash loop
- healthy `GET /api/trpc/auth.me` from `https://www.propertylistifysa.co.za`

Use the release procedure in `docs/railway-release-procedure.md` for migration and schema checks.
