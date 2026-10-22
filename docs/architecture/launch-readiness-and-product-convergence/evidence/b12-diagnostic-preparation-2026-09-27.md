# B12 hosted diagnostic preparation — 2026-09-27

**Status: partial public diagnostics refreshed; hosted proof remains open.** This
record refreshes B12's public DNS/TLS/HTTP observations and the diagnostic plan.
Only unauthenticated GET requests and public DNS/TLS checks were used. No
provider account was accessed, and no Railway, Vercel, DNS, database, or runtime
setting was changed. The September 24 observations below are retained as
historical evidence and do not replace the September 27 public results.

## Source and evidence identity

| Source | Identity |
| --- | --- |
| B12 worktree / branch / HEAD / tree | `/home/edwardspc/Desktop/Dev/property-listify-main/.worktrees/property-listify-b12-hosted-runtime` / `feat/b12-hosted-runtime` / `bb1a5d7af53b7f62f5aa9ea7ae9068f59cd87854` / `d41a3594787f2cda74c9245cb3ce16de166a6a2a` |
| B12 worktree contract SHA-256 | `eb15737fdeec545bff6f543169ca400aef020ed50b0a61ed366a0708a6941941` |
| B16 candidate contract SHA-256 | `2daf8dc3e1966ff34be7d75fad33e4d3d6f7fe5dac4c23ff44aef43895042687` |
| Prior public baseline (historical) | `2026-09-24`, SHA-256 `5ccd844c495e785f956350eafe1ca34aa3eeba6ecb5b177a97c1cbc9147ff57f` |
| Last variable-only preflight | `2026-09-24`, SHA-256 `d8cf714953cdd630fd034ae24fe435f70907f008eab56d814fb5f2764b7dacae` |

The B12 standalone branch and the B16 candidate carry different contract file
hashes. Review the B16 candidate's copy for its no-spend disposition; do not
silently substitute either contract for the other.

## Database Authority preflight — local context only

On September 27, the required `pnpm db:authority:status`,
`pnpm db:authority:manifest`, and `pnpm db:authority:context` commands were run
from the B12 worktree above. The authority classified its resolved target as
`disposable-worktree`, with exact worktree ownership and target fingerprint
hash `ed89dd57652eff4df661f663e83ba9c40003d156f82b1f812045cec42a3fd814`.
The manifest digest was `595cb5f15235d473ee71eda7105fa802dfac2650242b950021e4dce62e091e6b`,
with expected head `0092_transactional_email_attempts.sql`.

The local database service was unreachable. The migration ledger, attempts,
target ownership, schema migration and schema congruency were not evaluated.
No local service was started and no target was provisioned, repaired or
mutated. This is local worktree context only; it is not a staging or production
database observation and does not refresh the September 24 hosted baseline.
The sanitized command record is in
[`b12-database-authority-preflight-2026-09-27.json`](b12-database-authority-preflight-2026-09-27.json).

## Current public diagnostics — September 27

The full sanitized response record, including DNS answer types, verified TLS
dates, response hashes and the readiness layer summary, is in
[`b12-public-diagnostics-2026-09-27.json`](b12-public-diagnostics-2026-09-27.json).
The API DNS name resolves through Railway, its `/api/health` and `/api/version`
routes return 200, and both identify API SHA
`4e012b3044628fc06da7489c0055e9ce01bdc8d9`. `/api/readiness` returned 503 on a
30-second retry after an initial 10-second timeout; its sanitized layers report
target ownership, migration head, migration attempt, schema migration and
congruency, commercial reference data, and release as not ready. Liveness,
service availability and target connectivity report ready.

The `www` host resolves and has a verified TLS certificate, but
`/version.json` returns the same HTML body as the home page, so frontend build
identity remains unavailable. The apex resolves but TLS hostname verification
fails before an HTTP response. Both staging names returned DNS `NXDOMAIN` for
A, AAAA and CNAME queries. The public robots and sitemap routes returned 200.

These checks used one network vantage. They do not verify the effective
provider configuration, authenticated browser/session behavior, proxy trust,
two-network rate limits, database ledger through B08, Redis recovery, S3
separation, email delivery, lead scheduling, term scheduling, or restart
behavior. B12 hosted readiness therefore remains open.

## Last observed public state (historical)

The read-only public baseline recorded DNS and TLS present for the production
hosts, API liveness at HTTP 200, API readiness at HTTP 503, and API version
`4e012b3044628fc06da7489c0055e9ce01bdc8d9`. The frontend `/version.json`
returned HTTP 200 with `text/html`, so exact frontend identity was unavailable.
Both proposed staging hostnames failed DNS resolution. Production readiness
reported a connected target but a migration head behind, incomplete migration
attempt, non-congruent schema, and commercial foundation blocked by schema.
These are the recorded September 24 observations only; none was refreshed on
September 27.

The variable-only evaluator recorded nine production candidate issues:

1. `MEDIA_STORAGE_ADAPTER` was not explicitly `s3`.
2. `MEDIA_UPLOAD_TOKEN_SECRET` was absent or did not meet the candidate contract.
3. `APP_ENV=production` and `NODE_ENV=production` were not both explicit.
4. No full 40-character build SHA appeared in persistent variables (provisional;
   Railway may inject the process commit SHA at runtime).
5. `BILLING_PROOF_S3_BUCKET` was absent.
6. `AWS_S3_BUCKET` did not equal `S3_BUCKET_NAME`.
7. `BILLING_PROOF_STORAGE_ADAPTER` was not `s3`.
8. Dedicated private-proof credentials were absent.
9. `SAVED_SEARCH_SCHEDULER_ENABLED` was not explicit `false` or validly enabled
   with its own strong action-token secret.

The same record said only API and Redis services existed; the B10 email
supervisor and B13 lead cron were unprovisioned. B11 had found only a public
media bucket. Do not fill the private-proof settings with public-media values.

## Prepared diagnostic sequence

1. **Freeze the reviewed candidate first.** Record the exact full frontend and
   backend SHAs, B16 review decision, B08 database release identity, and current
   B12 contract revision. A branch label or a successful health endpoint is not
   build identity.
2. **Refresh public DNS/TLS/HTTP evidence read-only.** Record A/AAAA/CNAME and
   certificate/redirect results for the production frontend/API and the two
   staging names. Fetch only public `/api/health`, `/api/readiness`,
   `/api/version`, frontend `/version.json`, and robots/sitemap paths. Preserve
   status, content type, sanitized response fields, timestamp and resolved
   artifact identity. Do not send credentials, cookies, customer data or
   payment data. `/api/health` proves liveness only.
3. **Review effective provider configuration read-only.** Record project,
   environment, service IDs, config-as-code path, build/start/replica/restart
   settings, and variable presence/validity through a controlled reviewer
   session. Feed values directly to the candidate's `pnpm hosted:preflight`
   evaluator; retain only issue keys and sanitized booleans. Never save or print
   secret values or full connection URLs. Do not change a setting to clear a
   diagnostic.
4. **Check origin, cookie and proxy behavior in staging.** Verify exact HTTPS
   origins, credentialed browser calls, host-only Secure/HttpOnly/SameSite=Lax
   cookie attributes, logout/sessionVersion revocation, and origin rejection.
   From two distinct client networks, compare rate-limit identity and test
   forged `X-Forwarded-For`/`X-Real-IP`; choose `TRUST_PROXY` from observed
   ingress behavior, never assumption.
5. **Exercise provider-dependent paths only in isolated staging.** With the
   separately authorized B08 target and safe accounts, test Redis fail-closed
   recovery, public/private S3 separation, proof access denial, Resend
   supervisor/backlog/restart, lead cron completion, term scheduler visibility,
   and API/worker restart. B10, B11 and B13 own their acceptance details.
6. **Return mismatches as evidence.** Stop on missing staging DNS/certificates,
   artifact mismatch, `/version.json` fallback, readiness 503, incomplete or
   non-congruent database state, unknown effective provider config, weak proxy
   proof, shared public/private storage, absent worker ownership, or any
   unexpected side effect. Keep a failed/not-run disposition; do not repair by
   mutating production configuration or database state.

## Owners and scope

Founder/provider inputs still needed include controlled staging domains and
certificates, Vercel/Railway access, isolated Redis, separate public and private
S3 resources, controlled Resend identity, and alert recipients. B08 owns the
database target and protected migration path; B10 owns real mail delivery; B11
owns durable private-proof storage; B13 owns the lead job and custody; B14 owns
support cadence and the sales pause; B15 owns approved customer copy; B16 owns
exact artifact integration review; B17 owns ongoing monitoring; B18 owns final
artifact acceptance. Hosted readiness remains OPEN.

The public DNS/TLS/HTTP checks above were limited unauthenticated observations.
This packet authorizes no provider-console access, authenticated hosted
rehearsal, protected database operation, DNS or provider-setting change,
deployment, or paid-product activation. Staging rehearsal remains a separate
reviewed B12 operation with founder-provided domains, certificates, services
and isolated resources.
