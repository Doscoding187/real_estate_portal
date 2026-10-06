# Controlled release: readiness refresh gap and customer checkpoint

Customer verification is **held** after a genuine joined-release readiness failure on October 6. The deployed source remains `b34b6a0eeadf46e5b855fa3d3c92b6c277c09e60`. This correction is review material and has not been merged or deployed. Fresh CI, independent senior review and explicit replacement-source acceptance remain required.

## Demonstrated blocker

The initial joined response checks passed, including frontend/API identity, TLS, four frontend security headers on HTML/actual JavaScript/CSS/version/robots/sitemaps, content types and production indexing. Readiness returned HTTP 200 in 3,255 ms; the later strict backend probe returned 200 in 1,375 ms and confirmed the approved Azure fingerprint, canonical 0094/schema/foundation, connected Redis and active scheduler. Background verification timestamps refreshed.

The official joined probe then failed at `2026-10-06T17:15:19.630Z` with HTTP 503. Customer writes stopped; the owned browser was interrupted and successful onboarding writes were reconciled read-only. The probe's combined “status/build mismatch” label does not establish a SHA mismatch.

A bounded diagnostic captured **two real 503 responses among 36 ordinary read-only samples**:

- `17:21:30.279Z`, request `12323de1-31f4-4de3-8571-cdb085689dac`, 910 ms.
- `17:22:06.826Z`, request `6198c909-bdc1-45c1-8e4a-4abb6a4367ac`, 819 ms.

Both responses retained the exact deployed SHA and approved target, with connected Redis/security stores. Database connectivity reported `readiness-verification-pending-or-expired`; readiness recovered after the next full sweep. Full failed responses and every sample's status/timing are in [the diagnostic](evidence/readiness-refresh-cadence-20261006/readiness-freshness-diagnostic.json). No production failure was induced. Runtime logs were retained privately; their only error-level row in the bounded window was a successful location-search telemetry event, not a database failure.

The monitor measures freshness from assessment **start**, but previously waited another five seconds after each assessment completed. Observed completed sweep timestamps were roughly 17.5–19.5 seconds apart. Two approximately 12.5–13.5-second sweeps plus five seconds idle can exceed the unchanged 30-second age bound before the replacement completes. The strict expiry correctly fails closed; the unnecessary idle time creates the availability gap.

## Bounded correction and validation

After each sweep, idle delay is bounded by `min(configured delay, max(1 ms, half the age bound minus assessment duration))`. Fast sweeps retain their configured delay. A 13-second sweep with the existing 30-second bound waits approximately two seconds before starting the next sweep. The monitor remains serial and target-bound. Full database authority checks, expiry from assessment start, invalidation on failed verification, context-change handling and shutdown draining remain intact. Slow or stalled verification can still make readiness fail closed; the scheduling change does not promise availability for arbitrarily slow database checks.

This increases background sweep frequency when verification is slow: approximately one completed sweep every 15 seconds instead of about 18 seconds at a 13-second duration. Observe database/provider headroom during the reviewed deployment and later capacity exercise. There is no new resource, binding, SQL query, migration, schema authority, production timeout or configuration change. The hosted freshness limit remains 30,000 ms; the joined probe limit remains 8,000 ms.

The new local regression uses alternating 12,500/14,500/12,800/13,200-ms full assessments and samples across a minute, including the first sweep's expiry boundary. The initial 13,500-ms variation failed on the deployed implementation (null instead of a fresh completed result); the expanded 14,500-ms variation passes with the correction. All 15 focused monitor, HTTP readiness and Redis connection/recovery tests pass, alongside TypeScript, touched lint (zero errors/warnings) diff checks and build (existing bundle-size warning). Existing expiry/failure/context/shutdown regressions remain covered. No local database was provisioned and no production Redis/database disruption was used. [Validation record](evidence/readiness-refresh-cadence-20261006/local-regression-and-validation.json).

## Deployed identity and containment

The reviewed head was `154f9aaa29e4bc3de681d27efe083b493b1d35c9`; accepted merge `b34b6a0eeadf46e5b855fa3d3c92b6c277c09e60` has the identical reviewed tree `a9ce841bebf64eab7ad32286c58e2b8f83fdce18`.

| Service | Deployment ID | October 6 observation |
| --- | --- | --- |
| API | `89ffe531-1194-43cd-83ad-8872b1d14bc3` | SUCCESS; running at the frozen SHA; intermittent readiness expiry reproduced |
| Email worker | `b5aac779-1ad5-407f-b67c-373b72343e4a` | SUCCESS; running at the same SHA; recent batches, zero stale/permanent/unknown delivery states |
| Lead job | `64838822-59cd-4354-8547-2f92e16b8bf8` | SUCCESS; same SHA; normal exit, five-minute cron, recent execution and zero failed/unknown work |
| Frontend | `dpl_9h2A4GiPTtKmJqGCWh5eCm1A6gDq` | READY at the same SHA; custom domains and response checks passed |

Readbacks preserve reviewed secret bindings and separate API/worker identities. All three runtime services retain `PAID_MVP_SALES_PAUSED=true`; admitted-owner, sales-deadline and migration-credential settings remain absent. Railway Git triggers are absent, superseded backend artifacts are removed, Production staging is empty and unrelated Testing configuration/staged changes are unchanged. Vercel has no queued/building deployment; the accepted source retains the automatic-main hold and the operator's prior empty Deploy Hooks readback. No deployment/configuration change occurred in this continuation; TiDB writers were not restarted. Earlier October 2 evidence is historical, including its then-pending frontend marker.

## Expected and observed customer outcomes

| Journey | Expected | Actual / remaining evidence |
| --- | --- | --- |
| Agent registration and verification | Normal signup, real email, blocked unverified login, successful verification | Signup 201; unverified login 401 `EMAIL_UNVERIFIED`; operator confirmed inbox receipt/link success on October 2 |
| Fresh Agent login | Verified account reaches private setup | October 6 fresh login 200; prior saved session expired and was rejected. This is not evidence for pre-transition cookie rejection |
| Profile media | Normal upload/save, display and persistence | Presign, S3 PUT and profile save 200; CloudFront PNG 200; byte hash equals upload; displayed after reload |
| Canonical onboarding | Choose current canonical location and preserve it | Normal suggestion `city:1`, parent `province:3`; profile save 200; read-only reload confirms Johannesburg, Gauteng association |
| Private profile completion | Prepare workspace without public/commercial activation | Completion 200, `isPublic=false`, status pending, `pending_approval`; profile description, slug and media persist. Further authoring held |
| Agency verification | Real email and verified login | Original normal signup 201; unverified login rejected. Receipt/link success unconfirmed. Operator requested a replacement controlled mailbox; no new signup/email sent while held |
| Founder / old sessions | Genuine founder sign-in; real old session rejection | Operator check remains pending; no seeded owner, direct role grant or imported legacy identities |
| Private property/development authoring | Normal saved canonical drafts | Unexecuted beyond Agent profile setup; held on readiness failure |
| Invitations / tenant isolation / recovery | Actual email delivery, acceptance/revocation, denied other-owner writes, one-use recovery | Pending; idle worker health is not customer delivery |
| Closed-intake enforcement | Normal invoice/retained checkout/finance paths deny activation | Configuration containment confirmed; authenticated end-to-end denials remain pending |

The private evidence excludes mailbox addresses, credentials, sessions and token-bearing screenshots. [Evidence and hashes](evidence/readiness-refresh-cadence-20261006/README.md).

Next gate: fresh five-job CI on the exact correction head, independent senior review and explicit source acceptance, then an attended release keeping frontend/API/workers reconciled to one frozen accepted SHA. Verify multiple full background refresh cycles and the official joined probe before resuming the pending normal unpaid journeys. The existing failed Vercel preview exception is unchanged.

Paid admission and payment/proof-owner journeys retain separate attended approval. Publication/correctly delivered enquiries, alerts, recovery/RPO/RTO, representative capacity, founder operating rehearsal and final disclosures remain open obligations. Payment intake stays closed and TiDB writers stay stopped.
