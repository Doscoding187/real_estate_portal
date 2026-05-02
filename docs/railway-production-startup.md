# Railway Production Startup (Distribution-Safe)

Use this for the backend service that serves `api.propertylistifysa.co.za`.

## Required start command

Set Railway service start command to:

`pnpm start`

In this repository, `pnpm start` now runs:

1. `pnpm db:target`
2. `pnpm db:migrate`
3. `pnpm start:prod:core`

That means every deploy will:

- print DB target fingerprint
- run SQL migrations
- verify distribution schema readiness
- start the API only after checks pass

## Why this matters

Distribution onboarding saves can fail with `412 PRECONDITION_FAILED` when schema is behind.  
This startup path prevents drift by enforcing migration + verify before boot.

## Deploy verification checklist

After each deploy, confirm logs include:

- `db:target` output with the expected production DB
- successful `migration:sql`
- `[db:verify:distribution] OK`
- API boot success

If migration or verify fails, deployment should fail and API should not start on a partial schema.
