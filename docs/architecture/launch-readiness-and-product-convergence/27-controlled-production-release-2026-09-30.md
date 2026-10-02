# PR #583 controlled production release

**Current disposition: controlled transition partially executed; application cutover pending; paid opening NO-GO.** This packet supersedes the draft-PR-only assignment and the successful-preview/separate-staging milestone. Edward directed controlled validation on the existing live infrastructure. No Vercel upgrade or new application staging environment is required. October 5–7 remains conditional.

## Current execution checkpoint — 1 October

PR #583 is merged as `cbc18c8fdfb0a900c7255ca695da56bd9a7660c3`, tree
`fde4200b59a2adfb65fe85d550e45dc970b3d52e`, matching its accepted head.
The merged PR's operational checkpoint records geography applied once and
verified (9 provinces / 340 cities / 1,089 suburbs), old production API
REMOVED, final frozen TiDB capture and independent USB authenticated retrieval
(218 tables / 152 rows). Edward’s stored/unplugged custody confirmation is now
consistent with fresh October 2 readback: selected USB partition absent and
zero USB storage devices enumerated. The previous attachment conflict is
superseded; no capture/retrieval was repeated. [Custody reconciliation](evidence/mvp1-aws-storage-hardening-20261001/usb-current-disconnected-custody-20261002.json).
Do not repeat those completed provisioning/capture/apply operations.

[Storage packet 29](29-mvp1-aws-storage-hardening.md) is the current storage
checkpoint: anonymous media write containment, authenticated CloudFront origin
access, private-proof bucket/user provisioning, proof-version recovery,
encrypted key export/retrieval/decryption and bounded dedicated proof runtime
permission tests are complete. The US$15/month aggregate incremental usage
approval is recorded; it is neither a forecast nor an enforced cap.

S3 budget configuration and all three recipient readbacks are complete per
Edward’s operator report; email delivery remains unverified.

Edward subsequently confirmed saving Production `VITE_CLOUDFRONT_URL` at the
expected distribution; exact production-build/hosted verification is pending.

The protected Azure media dependency inventory is complete: 214 canonical
tables / 1,450 rows, zero matched media URL/path references. The authorized
temporary single-computer firewall rule was removed, with all original rules
unchanged. [Inventory and cleanup evidence](evidence/mvp1-aws-storage-hardening-20261001/azure-media-dependency-inventory-20261002.json).

Final media policy/public-access blocks/CORS and the isolated media identity
are complete. Encrypted media-key retrieval/checksum/decryption and independent
local runtime checks passed; the 2,260 original object metadata records are
unchanged. [Execution evidence](evidence/mvp1-aws-storage-hardening-20261001/media-hardening-execution-20261002.json).

Remaining: storage-delta review, alert receipt/aggregate monitoring, exact frontend
build verification, worker provisioning, production
secret/runtime bindings, exact joined deployment and hosted customer/security
journeys under checklist 28. Keep TiDB writers stopped and intake closed.
The dated preparation observations and reusable procedure below are retained
as history; their pending provisioning wording does not supersede this checkpoint.

## Recorded decision and exact source

The [founder addendum](25-paid-launch-deadline-audit-2026-09-30.md#subsequent-founder-decision-validate-on-the-live-site) is copied only from the audit worktree's accepted decision section. Its [source path and hashes](evidence/controlled-production-release-2026-09-30/founder-decision-provenance.json) preserve provenance without absorbing other workstream files.

PR [#583](https://github.com/Doscoding187/real_estate_portal/pull/583) remains the task-owned integration. At the recorded decision, its accepted head was `4b5ef13255bf5b54ee92eec27969042fa4310f7c`, tree `02bdcb863e7442392b3ba9d5db1d573b82d64288`. All six GitHub build/database/location/lint/test jobs passed at that head; [exact check snapshot](evidence/controlled-production-release-2026-09-30/github-before-release.json). Vercel Preview failed, with cause unconfirmed. **Founder-accepted non-gating preview exception** does not mean passed, a known budget cause, or a production build waiver.

This continuation adds a version-controlled frontend deployment hold, a bounded final-archive command and the authorized narrow owner-admission control. [Admission review and short execution checklist](28-controlled-owner-admission-and-execution-2026-09-30.md) record the later directive and verification. Required checks must pass at the resulting new PR head; the older head's green checks cannot be attributed to it. Both input anchors remain ancestors: paid `a05868c66f493e3cbc972a119074c91a10797777` / tree `b21f454e215d8b02129e4daa14ba6f8d338406d1`, database/geography `b625a6dd0be7b105e100383dbc8f919a64d8b0bb` / PR #582. Published main was still `4e012b3044628fc06da7489c0055e9ce01bdc8d9` at preparation.

No legacy accounts, password hashes, sessions, listing/business data or TiDB ledger are imported. No fixture selector, synthetic entitlement, schema fallback, disabled guard, card billing, Services #581, Explore or Land expansion is part of this release.

## Historical September 30 observations and reuse

| Item | Evidence and consequence |
| --- | --- |
| Existing production API | Railway deployment `5045030c-f115-429e-af15-2b2c410a6cb1`, successful, still published main and production TiDB. `/api/version` confirms main; readiness 503 at `2026-09-30T16:49:49Z`. Frontend `/version.json` responded but supplied no verified full Git SHA. [Public baseline](evidence/controlled-production-release-2026-09-30/public-baseline.json). |
| Azure | Reuse accepted 8.4.9/0094 congruency, enforced constraints, distinct grants and backend-network connectivity. Fresh ARM reads: Ready, B1ms, 20 GB auto-grow, 14-day backup retention, geo-redundancy disabled. Engine acceptance is not application capacity/recovery acceptance. |
| Geography | Fresh read-only plan from exact `4b5ef132` source through the existing backend network: canonical 0094, zero rows, **1,438 inserts: 9 provinces / 340 cities / 1,089 suburbs**. [Complete plan](evidence/controlled-production-release-2026-09-30/geography-plan.json), [summary](evidence/controlled-production-release-2026-09-30/geography-plan-summary.json). Full plan reconstructed from unchanged canonical rows/pending keys and verified byte-for-byte against the remote full-output SHA; no apply performed. |
| TiDB archive | Reuse [preliminary capture/readback](../../database-authority/tidb-preliminary-archive-2026-09-30.md): 218 schemas / 152 rows. This is not the final frozen capture, independent custody, or restore evidence. |
| Email | Fresh Resend domain read succeeds: approved domain verified, eu-west-1. [Observation](evidence/controlled-production-release-2026-09-30/resend-domain.json). Real receipt, reply/bounce and worker restart remain unproved. |
| Storage | Existing AWS account exposes only the configured public media bucket, eu-north-1, SSE AES256, public policy, versioning disabled. No private proof bucket/credential. [Read-only configuration/storage assessment](evidence/controlled-production-release-2026-09-30/provider-readiness.json). Never reuse the public bucket/key for proofs. |
| Services and writers | API + Redis only; no email supervisor or enquiry cron. Testing uses `listify_test`; Staging uses `listify_staging`, not production source `listify_property_sa`. Both are pre-existing, not proposed new environments. Testing's unrelated pending JWT change is preserved. [Census](evidence/controlled-production-release-2026-09-30/writer-census.json). Deployment history alone is not final proof that every writer is stopped. |

Provider observations are dated reads, not lasting guarantees. Refresh at each execution boundary. No secret values, private account rows, object keys or archives are committed.

## Operational decisions and current disposition

| Item | Completed evidence / remaining action | Boundary |
| --- | --- | --- |
| Attended execution and Vercel operator | October 1 execution and archive attendance are recorded. Edward used the existing Vercel dashboard and confirmed the Production media setting. Refresh the attended cutover window, provider hold and exact production build inputs before joined deployment. | Do not infer ongoing after-hours coverage or a CLI login from a dashboard session. |
| Necessary incremental usage | Edward approved US$15/month aggregate incremental usage. The private-proof bucket/identity, recovery and transfer/runtime verification are complete. The final isolated media identity/application is complete; only the reviewed remaining workers remain in this resource sequence; do not recreate the proof resources or budget. [Current storage checkpoint](29-mvp1-aws-storage-hardening.md), [reviewed service/configuration delta](evidence/controlled-production-release-2026-09-30/production-config.proposed.json). | No plan upgrade or new application environment. Approval is not a forecast, free-tier claim or enforced spending cap. Unapproved additions remain a founder spend gate. |
| Independent archive custody | The existing USB destination, encrypted final archive copy, independent authenticated retrieval and separate local key custody are complete. Fresh disconnected-device readback now supports Edward’s previous secure-custody confirmation. Do not request another destination or repeat capture/retrieval as provisioning. | Preserve TiDB read-only. No archive/key exposure or retirement deletion is authorized. |
| Recovery exercise resource and coverage | The prepared isolated recovery proposal still needs its own exact target registration, grants, measured usage and coverage before a new write-capable recovery target is created. Existing retained recovery copies remain read-only. | Existing engine/copy evidence does not demonstrate final application recovery/capacity. No new staging app or inferred recovery-target authority. |

B15 exact-copy approval, final bank configuration and retention/customer disclosure remain paid-opening decisions, not new requests for already supplied founder/contact/schedule facts. The provider schedule can now use measured AWS eu-north-1 / Resend eu-west-1 / Railway asia-southeast1; resolve Azure and OAuth/analytics processing from actual configuration. Draft customer copy is not published as approved.

## Attended production sequence

Each phase records timestamp, operator, exact source SHA/tree, intended action, actual readback and stop result. No automated command is permission to skip a phase. The user authorized controlled production work; the operations below remain bounded to their named targets and reviewed release source.

### 1. Merge and original trigger containment — complete

PR #583 merged as M `cbc18c8fdfb0a900c7255ca695da56bd9a7660c3`, tree
`fde4200b59a2adfb65fe85d550e45dc970b3d52e`, after accepted review/checks.
Production and Testing API Git triggers were removed before merge and are read
back absent. The old trigger IDs in September 30 preparation evidence are
retired; do not delete them again or attempt another #583 merge. Edward's
Vercel hold report remains recorded; refresh live hold evidence before promotion.

Before the remaining cutover, refresh exact provider deployments/queued work,
required checks and unresolved review for the separate #584 storage delta.
Preserve other worktrees and the unrelated Testing pending patch. Do not use a
blanket accept-deploy or substitute another branch tip for M.

### 2. Canonical Azure geography — complete

Geography was applied once from M and independently verified at canonical 0094:
9 provinces / 340 cities / 1,089 suburbs, 1,438 existing rows and zero pending.
The ambiguous launcher timeout was reconciled by later readback, not replayed.
Do not run the historical reference-apply recipe again. Exact production target
fingerprint remains
`b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced`.

The later media dependency inspection also completed through the canonical
read-only inspector. Its authorized single-computer firewall exception was
removed with original rules unchanged. The old API remains stopped; never
restart a TiDB writer to regain a diagnostic route. Hosted geography journeys
remain pending on the exact joined deployment.

### 3. Writer freeze and final TiDB preservation — complete

The old production API was removed after geography verification. Independent
writer/session readbacks and the governed final frozen capture passed, followed
by independent USB retrieval and authenticated decryption: 218 tables / 152 rows.
The archive key remains separate in protected local custody. No TiDB import,
reverse replication or retirement deletion is authorized.

Keep writers stopped and TiDB read-only. The subsequent disconnected-device readback resolves the prior custody
attachment conflict; do not rerun final capture or ask for a new archive destination.
Historical freeze templates and preparation recipes are retained in Git history
and are not fresh writer attestations or instructions to recapture. New protected
operations require their own current authority/readback evidence.

### 4. Bind and deploy backend/workers, then frontend

1. Private proof provisioning, key transfer and bounded live permissions are complete; do not replay them. Media hardening and encrypted dedicated-key transfer/testing in packet 29 are also complete. Review the storage delta and exact private binding proposal before applying either identity; do not replay the operator program. Apply only the [prepared configuration delta](evidence/controlled-production-release-2026-09-30/production-config.proposed.json) to production services. API uses existing distinct Azure runtime identity; both new workers use existing distinct Azure worker identity. No migrator in application variables. Redis and existing durable public media are retained and independently verified; aliases must agree.
2. Fresh production JWT and independent media-upload signing secrets are prepared privately; application remains pending. Apply those reviewed secrets and invalidate old sessions by removing the old signing secret from all authentication runtimes, and replace the upload signing secret in the reviewed runtimes. Snapshot rollback custody privately; do not restore the old TiDB JWT on Azure. Test an old session is rejected before fresh numeric IDs can grant access. Retain the founder's existing `OWNER_OPEN_ID` and prove normal OAuth owner login; no seeded admin or direct role update.
3. Keep general paid intake closed: `PAID_MVP_SALES_PAUSED=true`, no expiring sales window, ordinary canonical billing configuration only. Candidate startup/readiness must pass strict environment/origin/storage/Redis/email requirements. The nine fresh preflight issues are actionable, not waived. A provider-injected exact Git SHA can satisfy identity; do not persist a stale BUILD_SHA across later deploys.
4. Build/deploy exact M for API using `railway.json` (`pnpm start:hosted:api`, `/api/readiness`); configure explicit required start/healthcheck because the old live service uses `pnpm run start:prod` without the reviewed readiness check. Provision email supervisor and 5-minute lead cron in existing production using their checked-in configs, distinct worker DB credentials, same source/approved origins and release identity. No startup migration/reference apply. Record deployment IDs, source SHA, strict readiness, recent scheduler lease, worker health, cron due-work and configured target fingerprint.
5. After API/worker admission, the authenticated existing Vercel operator verifies production `VITE_DEPLOY_ENV`, www/API origins and ordinary build inputs, then triggers **manual production deployment of M**, keeping repository main autodeploy held. A dashboard Git-SHA deployment is the proposed path; no failed preview promotion or upgrade. Record successful build/deployment ID, domains/TLS/redirects and frontend `/version.json` exact SHA, then joined browser behavior. Production build failures are gating and repaired within launch scope.
6. Never expose a new frontend against the old API/TiDB. Until joined readiness passes, serve existing maintenance behavior or keep API writes unavailable. Do not claim sales pause is an application-wide write maintenance gate. After Azure accepts any writes, recovery is compatible artifact/maintenance or Azure recovery; **never restart TiDB writers** or invent reverse replication.

### 5. Controlled real-provider acceptance, intake closed

Use designated consenting controlled mailboxes and accounts, clearly identified records and no uninvolved customer recipient. Tokens, proof contents and personal data stay private. Exercise normal HTTP/browser paths, no fixture modes, direct role grants or synthetic entitlement data:

| Journey | Required observation |
| --- | --- |
| Account and owner | Registration/verification/login/recovery including received and expired/replayed reset links, enumeration resistance, old-cookie rejection and regular owner OAuth admission. |
| Agent | Geographic onboarding, private authoring, real public media persistence after restart; after approved controlled payment admission, exact invoice → private proof → actual bank match → one 90-day entitlement → moderation/public discovery → correctly attributed enquiry and follow-up. |
| Agency/member | Owner normal setup, genuine invitation receipt/acceptance, organisation custody, publication, correct agency recipient, assignment and membership/session revocation with cross-tenant denial/history preserved. |
| Developer | Approved organisation/correct publisher, canonical geography, development/unit/media, correct owner payment restriction, publication, real buyer enquiry/delivery/follow-up and history protections. |
| Shared finance/security | Reject unsupported products/wrong owners, prove duplicate/retried finance actions do not duplicate terms/effects, verify anonymous/other-owner denial on private proof, authorised retrieval and storage persistence. No proof-only activation. |
| Delivery/recovery | Real receipt/reply/bounce or controlled known rejection; outbox/job retry and restart without duplicate durable effects; enquiry reaches the intended controlled recipient, queue attention is visible. |
| Terms/expiry | Reuse unchanged accepted 90-day/renewal/expiry/history evidence; do not change the live clock or rewrite production entitlement timestamps to force expiry. Any expiry simulation stays in a governed disposable target. |

Run the [prepared unpaid checklist](28-controlled-owner-admission-and-execution-2026-09-30.md#unpaid-hosted-checks) while fully paused. Edward authorized the bounded owner-admission implementation; its code and tests require review at the new PR head. Live admission remains disabled until the attended release step configures only server-resolved controlled owner pairs; a direct SDK private-object probe alone is storage evidence, not a passed invoice/proof/customer journey. Actual EFT instructions/receipts and final customer disclosures must be approved before collecting controlled money.

### 6. Recovery, operating evidence and separate paid GO

Keep B08–B18 open until their actual obligations pass. Reuse engine upgrade, canonical source, local composition and unchanged payment/security tests, but collect hosted outcome evidence where providers/bindings change. The accepted master-plan evidence thresholds remain:

- 24 hours representative final-application traffic/background work, two peaks, 30 minutes at twice planned peak, cold cache/retry/restart/backlog. Provisional workload 5 requests/sec sustained, 20/sec peaks and the documented data floor apply unless a realistic cohort/90-day forecast is approved **before** testing. Never populate public production with capacity fixtures or reduce thresholds after failure.
- Zero lost writes/duplicate outcomes/tenant leaks; unexpected errors <0.1%, no database timeouts; read p95 ≤750 ms/p99 ≤2s, write p95 ≤1s/p99 ≤2s, connection acquisition p95 ≤250 ms; CPU-credit minimum ≥30% and recovery, memory p95 <80%, aggregate application/worker connections ≤40 +10 reserve, storage ≥30% free plus 90-day headroom, backlog drains ≤15 minutes, restart ≤5 minutes.
- Demonstrated compatible application recovery ≤30 minutes; in-region RPO ≤15 minutes/RTO ≤4 hours; regional RPO/RTO ≤24 hours with independent off-region custody. Fourteen-day retention and backup freshness/actual retrieval/restore matter; Azure backup settings alone do not pass B17.
- Continuous alert delivery to a monitored operator; accepted Mon–Fri 09:00–17:00 SAST finance/support/moderation cadence and real inbox/bank/absence/pause/resumption rehearsal. No assumed weekend coverage.
- Resolve provider/retention/cookie/acceptance/invoice facts, approve the exact B15 copy/digest and prove rendered collection points. Existing founder facts remain accepted; copy drafts remain drafts until this action.

After these outcomes and exact three-audience/buyer journeys pass, return the evidence-based paid-opening recommendation for Edward's deliberate attended GO. Initial recommendation remains at most five paying customers, at most two activations per staffed day; this is an operating admission recommendation, not an existing enforced platform cap. Observe the first real activation → publishing → enquiry/follow-up, pause on material failure, then expand cautiously. Do not claim the cohort has begun until actual customers and genuine reconciled payments exist.

Restore production Railway autodeploy only after stable acceptance, using [prepared restore mutation](evidence/controlled-production-release-2026-09-30/railway-restore.graphql) and [production input](evidence/controlled-production-release-2026-09-30/railway-restore-production.variables.json), with **Wait for CI true**; read back branch/checks/new trigger ID. Testing restoration remains a separate explicitly coordinated legacy-environment action, not automatic absorption of its pending patch. Restore frontend main autodeploy in a small reviewed config-only change after stable coordinated release, checking the resulting new artifact identity. Never blindly restore old trigger defaults after merge.

## Verification and honest completion boundary

Final-archive focused contract checks pass: **19 cases**, original preliminary/type/encryption cases plus frozen metadata, wrong/stale/future/open/duplicate/empty writer evidence, expiry during capture and approval actor/reference mismatch. No protected database was contacted by these tests. Full authority gate passes **47 files / 442 tests**, typecheck/build pass, full lint passes with **zero errors / 13,419 existing warnings**, and touched-code lint has zero errors. [Verification hashes and limits](evidence/controlled-production-release-2026-09-30/verification.json) record the tested release-code commit `84e9229a428d8432f2ed0f7f9aa80fa8972f5cfc` / tree `813f246d370d17d78a102bc0ff8477139dd26a1b`; subsequent continuation edits are documentation/evidence only. Importing `vercel.ts` confirms main=false; authenticated provider readback remains pending. Exact new-head CI is tracked separately. That earlier verification changed no schema, migration SQL/checksum, canonical catalog, or customer money/access policy. The later owner-admission change is separately verified in packet 28; it restricts new invoices/activations without changing products or entitlement terms.

Prepared trigger mutations, resource proposals, configuration deltas and a read-only geography plan are **not execution evidence**. The preceding verification paragraph describes the September 30 preparation. Completed October 1 execution is distinguished in the current checkpoint above and storage packet 29. Secret application, binding switch, joined deployment, real hosted journeys and paid opening remain pending. Continue from the remaining phase under the existing containment checklist; do not replay completed geography, writer stop, final capture or proof provisioning.
