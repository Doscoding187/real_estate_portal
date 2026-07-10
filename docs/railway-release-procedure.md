# Railway Release Procedure (Production)

This runbook is for releases to `api.propertylistifysa.co.za`.

## 1) Before merge (PR checks)

- Confirm the PR includes migration changes only when required.
- Confirm reviewers understand migration impact and rollback plan.

## 2) Predeploy in production context

Run from the main branch tip that will be deployed:

```bash
pnpm release:predeploy:production
```

This runs:

1. `launch:preflight`
2. `db:target`
3. `migration:sql`
4. `db:verify:distribution`

If this fails, stop and fix before deploying.

## 3) Deploy to Railway

- Keep Railway start command set to `pnpm start:prod:with-migrations`.
- Trigger deploy after successful predeploy step.

## 4) Post-deploy smoke check

Run:

```bash
pnpm release:smoke:production
```

Then verify in browser/network logs:

- `https://api.propertylistifysa.co.za/api/trpc/auth.me` responds without `502`
- no repeated CORS + `502` pattern
- frontend at `https://www.propertylistifysa.co.za` can load authenticated session state

## 5) If incident happens

Immediate containment:

1. Roll back to last known-good commit/deployment.
2. Confirm Railway start command remains `pnpm start:prod:with-migrations`.
3. Re-run predeploy on a fix branch and redeploy only after green.
