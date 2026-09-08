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
2. `db:release:plan`
3. `db:release:reference:plan`
4. `db:release:reference:verify`

If this fails, stop and fix before deploying.

The predeploy command is intentionally read-only for database state. Once the
release plan is approved, the explicit production sequence is:

1. `pnpm db:release:plan`
2. `pnpm db:release:reference:plan`
3. `pnpm db:release:apply -- --accepted-old-head=<accepted-head> --expected-new-head=<manifest-head> --ack=CONFIRM_RELEASE_APPLY_<fingerprint-prefix>`
4. `pnpm db:release:reference:apply -- --ack=CONFIRM_RELEASE_REFERENCE_APPLY_<fingerprint-prefix>`
5. `pnpm db:release:reference:verify`
6. `pnpm db:readiness`

Each protected operation must receive the exact approval reference, actor and
target fingerprint through the Database Authority release environment. The
acknowledgement values are emitted by `pnpm db:release:ack` and
`pnpm db:release:reference:ack`; do not guess them. The release owner must
explicitly authorize both apply steps. Application startup never performs
canonical reference preparation automatically.

## 3) Deploy to Railway

- Keep Railway start command set to `pnpm start:prod` (the value pinned in `railway.json`).
- Trigger deploy after successful predeploy step.

## 4) Post-deploy smoke check

Run:

```bash
pnpm release:smoke:production
```

Then run the auth-boundary smoke from the deployed browser/API pair:

```bash
AUTH_BOUNDARY_SMOKE_API_URL=https://api.propertylistifysa.co.za \
AUTH_BOUNDARY_SMOKE_ORIGIN=https://www.propertylistifysa.co.za \
pnpm release:smoke:auth-boundary
```

The second check performs no account creation. It requires `OPTIONS
/api/auth/register` to return the exact browser CORS origin and an empty
`POST /api/auth/register` to reach validation with `400`. A timeout, `503`, or
missing CORS header is a release failure, not a browser-only issue.

Then verify in browser/network logs:

- `https://api.propertylistifysa.co.za/api/trpc/auth.me` responds without `502`
- registration, login, password recovery, and resend-verification do not show repeated CORS/network failures
- frontend at `https://www.propertylistifysa.co.za` can load authenticated session state

## 5) If incident happens

Immediate containment:

1. Roll back to last known-good commit/deployment.
2. Confirm Railway start command remains `pnpm start:prod`.
3. For `AUTH_RATE_LIMIT_STORE_UNAVAILABLE`, inspect the Railway Redis service health and its `REDIS_URL` binding without exposing credentials. Do not add an in-memory production limiter or loosen CORS to mask the failure.
4. Re-run predeploy and `release:smoke:auth-boundary` on a fix branch; redeploy only after both are green.
