# Controlled release: sustained readiness remains blocked

The accepted correction was merged and the API deployed once, but sustained readiness failed. Workers, frontend deployment and customer writes stopped at that gate. This packet supersedes the October 6 cadence packet's current release state; its historical evidence remains unchanged. The bounded transport correction below requires fresh exact-head CI, senior review and replacement-source acceptance before another controlled release.

## Actual release identity and outcomes

Edward explicitly accepted review head `6a234902e66179d33db9f898c4f5ba0bee75a796` and confirmed attendance. All five required jobs passed on that head. PR #587 merged as frozen source **`90620e2790029f5b1e9dd71be6db932d9ddbc48a`**, with the identical reviewed tree `7e0049c191369fd25613c2933935e8aa84c5b8e3`. Production source pins changed only to that frozen merge, with deployments skipped. Existing reviewed bindings, holds, Testing configuration and staged changes were preserved.

| Component | Actual deployment | Deployed source | Observation |
| --- | --- | --- | --- |
| API | `072491d6-0eeb-44ae-a5d1-c664134a86e9` | `90620e2790029f5b1e9dd71be6db932d9ddbc48a` | Provider SUCCESS; replica RUNNING; sustained readiness fails |
| Email worker | `b5aac779-1ad5-407f-b67c-373b72343e4a` | `b34b6a0eeadf46e5b855fa3d3c92b6c277c09e60` | Previous supervisor remains RUNNING; recent healthy batches |
| Lead job | `64838822-59cd-4354-8547-2f92e16b8bf8` | `b34b6a0eeadf46e5b855fa3d3c92b6c277c09e60` | Previous five-minute cron executes successfully; EXITED between runs |
| Frontend | `dpl_9h2A4GiPTtKmJqGCWh5eCm1A6gDq` | `b34b6a0eeadf46e5b855fa3d3c92b6c277c09e60` | No new manual deployment submitted |

The temporary version mixture is explicit: the API failed its sustained gate before the reviewed sequence could advance to workers and frontend. Worker source pins point at the frozen merge, but their running artifacts are still the prior source. Version agreement and the official joined release probe are **not passed** for this release. Previous API artifact `89ffe531-1194-43cd-83ad-8872b1d14bc3` is REMOVED. No unchanged deployment was retried or previous source redeployed.

API image digest: `sha256:d6c7657fe2e7f2049e78ae76745bf9e41cdb8fc37bdc5b7b3f11a5e22af4e112`. The initial live probe reported the frozen source at `/api/version` (200, 1,532 ms), `/api/health` (200, 1,472 ms) and `/api/readiness` (200, **1,611 ms**). Readiness confirmed the approved Azure fingerprint, canonical 0094 migration head, full schema congruency, Launch Access foundation, connected Redis and security stores, valid storage/configuration and an active scheduler. A green provider deployment and this initial response did not satisfy the sustained checkpoint.

## Material failed gate

Ordinary read-only readiness observation stopped on **sample 19** after 18 HTTP 200 responses. At `18:24:59.292Z`, request `25458dee-1d1b-47ec-bab7-50d89a3cf7a3` returned **HTTP 503 in 887 ms**, within the unchanged 8,000-ms probe limit. It retained the accepted build SHA and approved database fingerprint; Redis remained connected. Database connectivity reported `readiness-verification-pending-or-expired`.

Only two completed refresh transitions were observed before the failure. The 48-sample / multiple-cycle requirement failed. The complete 19 responses, failure summary, provider artifact and retained private log digest are preserved; the failed evidence filename does not imply a passing result.

Cadence alone was insufficient: a read-only profile of the deployed canonical verifier took **15,517 ms**, including 3,048 ms to open and verify its authorized connection, followed by 21 SQL reads. Fresh connections repeatedly prepare static statements before executing them. Two approximately 15-second serial assessments leave insufficient margin within the unchanged 30-second freshness bound. Runtime logs contain no recorded assessment durations, so the profile establishes the observed cost; it does not assert the exact duration of the failed background sweep.

## Bounded correction

`createAuthoritySqlConnection` uses the existing driver's direct `query` method for **readiness operations with no bound values**, including empty arrays. Bound values keep the native prepared `execute` path. Other authorized operations keep their existing execution path. SQL text, parameters, authority resolution, selected-target verification, strict TLS, UTC session setup, connection lifetime and full readiness assessments remain unchanged. There is no alternate schema query, retry, cached authority verdict or data mutation. Snapshot expiry, serial execution and the request probe limit are unchanged.

The driver documents direct queries and the prepare/execute behavior in its [official quickstart](https://sidorares.github.io/node-mysql2/docs). A read-only diagnostic wrapper on the exact deployed replica exercised the existing authorized direct-query method for the same zero-bound-value reads. It completed in **10,440 ms**, with identical ordered SQL statement hashes, the same success/failure sequence and identical readiness layers, including schema and foundation. Service code and provider configuration were not changed by that diagnostic. Separate single observations also contain network/connection variance; this result is evidence for the bounded correction, **not** a deployed or sustained availability guarantee.

Local verification: seven connection-boundary regressions and the full **48-file / 449-test database authority gate** pass. The eight snapshot-monitor tests also pass, preserving expiry, failure invalidation, target isolation, serial execution and shutdown behavior. The official `pnpm type-check`, frontend build, lifecycle, deterministic inventory and schema sanity pass. Touched lint reports zero errors and seven existing `any` warnings. `build:railway` is the existing no-op for a backend served through `tsx`; it is not represented as compilation proof. Fresh five-job CI and review remain required on the new exact candidate.

An initial local test invocation used a matcher unsupported by pinned Vitest; assertions were corrected without runtime changes. An incidental bare `tsc --noEmit` invoked the broad default configuration and exposed existing errors; the required CI typecheck uses `tsconfig.check.json` and passes. A workstation profile could not connect to Azure; no firewall, target, grant or credential configuration was changed. Profiling used the already authorized production replica and canonical connection authority. A first read-only SSH capability command had a quoting error; its corrected read-only invocation succeeded.

## Containment and customer outcomes

Fresh readback at `18:37:25Z` confirms `PAID_MVP_SALES_PAUSED=true` on API and both workers, absent admitted-owner/deadline settings, absent persistent migration credentials and BUILD_SHA overrides, unchanged reviewed secret bindings, absent backend Git triggers, an empty Production stage and unchanged Testing configuration/staged changes. TiDB writers were not restarted. Vercel's queue is empty; the automatic-main hold and prior operator confirmation of empty Deploy Hooks remain in effect. Production public frontend values remain the verified application/API/CloudFront origins and production environment. No values or bindings were reapplied.

Fresh worker observations at `18:39Z` show successful email batches through `18:38:51Z` and a successful lead run at `18:35:57Z`, with zero observed worker errors, permanent/unknown email delivery, stale email backlog or failed/unknown lead work. These are observations at the prior artifact SHA. Idle healthy execution does not establish customer delivery.

The previously completed controlled Agent registration, actual verification email, verified login and private pending profile/media remain recorded in the preceding packet. Successful onboarding writes were not repeated. The requested replacement Agency mailbox has **not** received a new registration email while this release gate is failed. Recovery, genuine founder access, pre-transition session rejection, remaining onboarding/private authoring, property/media isolation, invitations/revocation and closed-intake denials remain unproven or pending. No production fixtures, synthetic entitlements, direct database role grants, payment collection or paid admission occurred.

Next gate: passing exact-candidate CI, independent senior review and explicit replacement-source acceptance, then refreshed attendance and the API → workers → manual frontend sequence at a newly frozen identical-tree merge. Require provider identities, multiple fresh background cycles, unchanged strict readiness, deployed security/TLS/version checks and the official joined probe before resuming normal unpaid journeys. Keep automatic deployment holds in place.

Separate remaining obligations remain open: controlled payment/proof-owner journeys, publication and correctly delivered enquiries, continuous alerts, recovery evidence, agreed representative capacity, founder operating rehearsal and final customer disclosures. Paid opening needs its own attended approval.

Full sanitized responses and timing traces are in [the evidence directory](evidence/readiness-query-roundtrips-20261006/README.md); private bindings, credentials, logs, account addresses, session cookies and email tokens are excluded.
