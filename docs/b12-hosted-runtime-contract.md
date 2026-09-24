# B12 hosted runtime contract

Status: repository contract only. No hosted rehearsal, DNS change, protected database operation, or Paid MVP activation is authorized by this file.

Current B08 boundary (2026-09-24): Azure is established through 0094, while
Railway Production still uses TiDB. Railway Pro/static outbound IPs is a
founder spend gate. The topology and rehearsal steps below describe the later
reviewed cutover; they do not authorize changing Railway or activating paid
products while B08 is parked. See the
[central launch disposition](architecture/launch-readiness-and-product-convergence/03-launch-register.md#b08-protected-database-disposition--2026-09-24).

The [2026-09-24 public hosted baseline](architecture/launch-readiness-and-product-convergence/evidence/b12-public-hosted-baseline-2026-09-24.json)
shows valid production DNS/TLS, but the current API returns readiness 503 and
the frontend `/version.json` serves HTML. Both intended staging names did not
resolve. This single read-only observation is not B12 hosted acceptance.
The [Railway variable-only preflight](architecture/launch-readiness-and-product-convergence/evidence/b12-railway-variable-preflight-2026-09-24.md)
lists nine current configuration gaps against the candidate code and confirms
that email/lead worker services have not been created. No provider settings
were changed by that read.

## Topology and domains

Browser → Vercel `https://www.propertylistifysa.co.za` → Railway Express `https://api.propertylistifysa.co.za` → B08 database, environment-owned Redis, B11 public/private S3, Resend. Vercel owns the frontend artifact; Railway owns API, one continuous email worker, and one lead cron. One API replica owns the B03 term scheduler. The apex redirects to `www` at Vercel/DNS configuration. The API serves no frontend files (`SKIP_FRONTEND=true`).

The intended authenticated staging pair is `https://staging.propertylistifysa.co.za` and `https://api-staging.propertylistifysa.co.za`; these names are **not evidence of live DNS**. Founder must confirm domain control and attach valid certificates before deploying. Staging and production have separate database, Redis, S3 public bucket, S3 private bucket, Resend identity, and secrets. Staging never receives production customer data or production commercial activation. Generic Vercel preview hosts are untrusted, unauthenticated previews. They receive noindex rules and never enter API CORS.

`APP_ENV` is the logical target (`development`, `test`, `staging`, `production`). `NODE_ENV=production` is required for both hosted targets. Backend `APP_URL`, `FRONTEND_URL`, `BASE_URL`, `NEXT_PUBLIC_APP_URL`, and `VITE_APP_URL` when supplied must equal the exact HTTPS frontend origin. `API_URL`, `VITE_API_URL`, and `VITE_API_BASE_URL` when supplied must equal the exact HTTPS API origin. `CORS_ALLOWED_ORIGINS` may be absent or must equal `APP_URL`. No URL may have a path. Frontend builds use `VITE_DEPLOY_ENV` and require exact environment-specific `VITE_APP_URL` and `VITE_API_URL`. Vercel production additionally requires `VITE_DEPLOY_ENV=production`.

The session cookie remains `pl_session_v2`, host-only on the API, HttpOnly, Secure, SameSite=Lax, Path `/`. Browser API requests use credentials. Same registrable site is required for authenticated staging. Verification, reset and invitation links use the configured HTTPS app/API origins. The frontend build emits `/version.json`; the API exposes `/api/version`. Both require a full 40-character SHA in hosted mode. B16 records compatible frontend and backend SHAs and deploys backend before frontend.

## Runtime variable inventory

`R` = required before hosted process startup; `B` = required at frontend build; `P` = required for final launch preflight; `O` = optional; `F` = forbidden. Secret values must never appear in evidence. Development/test may use local or governed selectors under their existing authorities.

| Variable or group | Staging | Production | Secret | Owner / effect |
| --- | --- | --- | --- | --- |
| `APP_ENV`, `NODE_ENV` | `staging`, `production` R | `production`, `production` R | no | B12; exact execution mode |
| `BUILD_SHA` or provider commit SHA | full SHA R/B | full SHA R/B | no | B12/B16 artifact identity |
| `APP_URL`, app URL aliases | staging HTTPS origin R | www HTTPS origin R | no | B12/B10 customer links, CORS |
| `API_URL`, API URL aliases | staging API HTTPS origin R | production API HTTPS origin R | no | B12/B10 links and browser calls |
| `CORS_ALLOWED_ORIGINS` | absent or staging app R | absent or www app R | no | B12 exact origin |
| `TRUST_PROXY` | exact hop count R | exact hop count R | no | B12 provider proof; start with `1` only if Railway edge is one trusted sanitizing hop |
| `SKIP_FRONTEND` | `true` R | `true` R | no | B12 API/worker artifact split |
| `JWT_SECRET` | strong unique R | strong unique R | yes | B07 auth |
| `DATABASE_URL` | isolated staging R | B08 approved production R | yes | B08 runtime credential only; no migration credential in services |
| `DATABASE_MIGRATION_URL` | F in app services | F in app services | yes | B08 ephemeral release shell only |
| `REDIS_URL` | staging Redis R | production Redis R | yes | B07 auth and enquiry limits; `rediss://` if provider requires TLS |
| `AUTH_RATE_LIMIT_STORE_TIMEOUT_MS`, `AUTH_RATE_LIMIT_STORE_COOLDOWN_MS` | O bounded | O bounded | no | B07 fail closed store tuning |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`, `CACHE_ENABLED` | O, same staging resource or off | O, same production resource or off | password yes | optional performance cache, never security limiter |
| `MEDIA_STORAGE_ADAPTER`, `S3_BUCKET_NAME`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | `s3` and staging public bucket R | `s3` and production public bucket R | keys yes | B11 media, B12 binding |
| `AWS_S3_BUCKET` | equal `S3_BUCKET_NAME` R | equal `S3_BUCKET_NAME` R | no | mounted video/media code still reads this alias; prevents fallback bucket |
| `MEDIA_UPLOAD_TOKEN_SECRET` | strong unique R | strong unique R | yes | B07 media signing |
| `BILLING_PROOF_STORAGE_ADAPTER`, `BILLING_PROOF_S3_BUCKET`, `BILLING_PROOF_S3_REGION`, `BILLING_PROOF_AWS_ACCESS_KEY_ID`, `BILLING_PROOF_AWS_SECRET_ACCESS_KEY` | `s3`, separate private bucket and scoped keys R | same, production private bucket R | keys yes | B11 proof storage, B12 binding; region may inherit `AWS_REGION` |
| `BILLING_PROOF_S3_PREFIX` | O dedicated prefix | O dedicated prefix | no | B11 private object namespace |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` or `EMAIL_FROM` | controlled staging identity R | approved sender R | API key yes | B10 provider, B12 API/worker binding |
| `SAVED_SEARCH_SCHEDULER_ENABLED` | `false` R unless deliberately enabled | `false` R unless deliberately enabled | no | B12 one API owner; saved search outside initial Paid MVP |
| `SAVED_SEARCH_ACTION_TOKEN_SECRET` | R only if scheduler enabled | R only if scheduler enabled | yes | saved-search token authority |
| `COMMERCIAL_TERM_NOTICE_INTERVAL_MS` | O; default 15 min | O; default 15 min | no | B03 API-owned scheduler |
| `EMAIL_WORKER_POLL_MS` | O; default 10 sec | O; default 10 sec | no | B12 bounded 1–60 sec |
| `PAID_MVP_ENABLED_PRODUCT_KEYS`, `PAID_MVP_RELEASE_ID`, `PAID_MVP_APPROVAL_REF` | absent until approved controlled rehearsal | absent until B16 approval P | approval ref non-secret | B07/B16 exact three-product activation |
| `PAID_MVP_SALES_PAUSED` | `false` unless testing an approved pause | `false` during staffed sales; `true` for a founder absence longer than one business day | non-secret boolean; exact `true` or `false` | B14 pauses new invoices and finance activation while preserving existing paid access; change requires reviewed runtime configuration and restart |
| `BILLING_EFT_*`, `BILLING_SUPPORT_EMAIL` | controlled staging P | approved payable details P | bank details sensitive | B03 commercial launch preflight |
| `GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY` | O/P if map UX in hosted proof | O/P for map UX | keys yes | launch preflight recommendation |
| governed browser fixture/capture selectors, `LISTIFY_E2E_DATABASE_URL`, `VITEST`, `S2_DB_TESTS`, `VITE_USE_MOCK_EMAILS=true`, `SL_PHONE_OTP_DEV_MODE=1` | F | F | varies | B07/B12 deployed containment |
| `MEDIA_LOCAL_STORAGE_DIR`, local media adapter | F as selected adapter | F as selected adapter | no | B07/B11 no local fallback |

`pnpm hosted:preflight` checks static configuration without contacting providers and prints only sanitized status. `pnpm launch:preflight` remains the final commercial release gate and requires the B16-approved exact product activation; do not run it to authorize a preparation-only production deployment. Static invalid configuration stops startup. DB/schema, Redis connectivity and media config appear in `/api/readiness`; transient Resend/S3 reachability does not crash-loop the API. `/api/health` is liveness. `system.health` is not a deployment gate. Railway healthcheck uses `/api/readiness` and only HTTP 200 promotes traffic. Readiness is deploy-time only on Railway; B17 owns continuous monitoring.

## Railway effective service settings

The root `railway.json` is the **API contract**. Existing Railway config-as-code behavior overrides dashboard settings. New services must be checked in their actual deployment details; Railway's legacy config-as-code support is being retired. `railway.email-worker.json` and `railway.lead-job.json` are explicit reviewed contracts; configure each service's custom config path if supported, or set the exact same effective settings in the Railway service settings. Never allow either service to inherit root API `railway.json`. Capture the resolved deployment config in hosted evidence.

| Service | Build | Start | Replicas / schedule | Restart / gate | Ownership and signal |
| --- | --- | --- | --- | --- | --- |
| API | `pnpm build:railway` (backend only) | `pnpm start:hosted:api` | one replica initially | ON_FAILURE; `/api/readiness`, 300 sec timeout | B12; HTTP logs, health/version, term scheduler every 15 min |
| Email | `pnpm build:backend` | `pnpm email:supervisor` | one always-on replica | ALWAYS; no public domain | B12 process, B10 durable B10 claims; batch/heartbeat logs, admin backlog |
| Lead | `pnpm build:backend` | `pnpm lead-delivery:worker` | one Railway cron `*/5 * * * *` UTC | NEVER; no public domain | B12 schedule, B13 delivery; one-shot summary logs and B13 backlog |
| Migration | B08 protected release only | B08 exact reviewed command | one ephemeral release job | never normal startup | B08; no migration credentials in API/worker |

Railway cron skips a tick while an earlier process is still active. The lead command awaits pool closure; inspect deployment history for repeated completed runs and skipped overlaps. Term notices and saved searches run only in the single API replica; term notices log success/failure and expose last tick through readiness. Do not create a second term scheduler service. The email supervisor finishes an in-flight batch on SIGTERM, uses durable B10 claim semantics, and exits nonzero on an unhandled batch/configuration failure so Railway restarts it. An `unknown` provider outcome remains in B10 attention state; supervisor polling does not convert it into blind retry.

The API closes its HTTP listener, stops both local schedulers, closes Redis/cache and DB, and has a 20-second hard drain deadline. Set provider draining time to at least 20 seconds. Product activation is fixed at process start; changing it requires a new reviewed deployment, never a live toggle. B16 promotes an API compatible with the old frontend, checks backend SHA/readiness, then promotes the matching frontend and checks `/version.json`.

## Trusted proxy and cookie proof

`TRUST_PROXY` remains an exact Express hop count. Initial candidate is `1` only if Railway confirms its edge is the single trusted immediate peer and sanitizes incoming `X-Forwarded-For`/protocol headers. B07 uses Express `req.ip`; the app never reads arbitrary forwarding headers directly. A unit test can show Express's rightmost trusted-hop selection, but cannot prove Railway's external ingress sanitation. Hosted proof must use two distinct real client networks and a forged leftmost forwarded IP, confirm distinct quotas and no quota gain, then record the resolved hop count. If the provider chain differs, change the value based on observed evidence; never add speculative header parsing. Session proof must inspect `Set-Cookie` for host-only, Secure, HttpOnly, SameSite=Lax and Path `/`, and verify credentialed frontend requests, logout revocation, verification/reset links and sessionVersion revocation.

## Hosted rehearsal (staging only)

Founder supplies staging DNS/TLS, Railway/Vercel access, isolated B08 staging DB, Redis, separate S3 buckets and scoped credentials, controlled Resend sender/key and safe accounts. Record provider project/environment/service/deployment IDs without secrets. Do not supply production customer data or production commercial product keys.

1. Confirm domain certificates and HTTP→HTTPS redirects for both hosts; confirm apex redirect separately as production domain preparation.
2. Deploy one exact SHA to API, email and lead services. Capture effective build/start/cron/replica/restart settings; confirm no inherited API command. `pnpm hosted:preflight`, `/api/health`, `/api/readiness`, `/api/version` and migration head via B08 read-only authority must agree.
3. Build staging frontend with `VITE_DEPLOY_ENV=staging`, exact origins and same SHA. Record `/version.json`; inspect `robots.txt`, sitemap and `X-Robots-Tag`. Generic preview must remain noindex and untrusted.
4. In a real browser, register, verify, log in, remember, log out, reset password and reject a stale session. Record cookie attributes and credentialed request origin, not tokens.
5. Reject an unapproved Origin and generic preview Origin. From two client networks verify distinct `req.ip` rate-limit quotas; forge `X-Forwarded-For` and `X-Real-IP` and prove no extra quota. Repeat across replicas only if replicas are actually used.
6. Interrupt staging Redis briefly: auth/enquiry paths fail closed within bounded time, readiness goes 503, and recovery restores readiness. Capture sanitized logs.
7. Upload/retrieve public S3 media; verify no local route. Upload private payment proof and confirm unauthenticated denial. B11 owns durability/retention and restart proof.
8. Queue at least two safe transactional emails; prove repeated supervisor batches, backlog and restart recovery. B10 owns real provider/mailbox acceptance. Confirm lead cron completed at least twice and term scheduler tick appears; B13 owns delivery expectation.
9. Restart API and email worker; verify session/durable work persists, readiness returns 200, and exact build identities remain. Reject test selectors, fake sender, local S3, wrong product key, missing Redis, missing secret and wrong origin in isolated deployment/config rehearsals. No real customer payment.

Evidence packet: staging URLs, certificate/redirect results, frontend/backend SHA, release ID if present, B08 staging head, sanitized preflight/readiness/version, cookie and origin results, Redis IP/outage results, S3 public/private results, Resend worker/lead/term batch timestamps, restart outcome, effective provider config, and explicit no-production-data statement. B12 engineering evidence alone is **hosted rehearsal pending**.

## Boundary and open external decisions

Founder now: confirm both staging names and domain control; create or grant Vercel/Railway projects and staging service settings; supply isolated Redis, S3 and Resend accounts; choose alert recipients. Engineering now: deploy reviewed commands only after B16 integration, inspect effective provider settings and run staging proof. B08 supplies approved database target/head and protected migration release; B10 supplies real-provider/mailbox proof; B11 supplies durable public/private storage proof; B13 accepts lead cadence/custody; B16 records compatible exact artifacts and authorizes commercial activation; B17 owns ongoing monitoring/recovery; B18 reruns exact artifact acceptance. No B12 schema or migration is introduced. One API replica and provider-dashboard supervision are acceptable launch debt while status and restart behavior remain visible.

Railway settings referenced here follow [Railway config-as-code](https://docs.railway.com/config-as-code), [healthcheck behavior](https://docs.railway.com/guides/multi-region-api-failover), and [cron behavior](https://docs.railway.com/cron-jobs). Vercel conditional routing uses [programmatic `vercel.ts` configuration](https://vercel.com/docs/project-configuration/vercel-ts).
