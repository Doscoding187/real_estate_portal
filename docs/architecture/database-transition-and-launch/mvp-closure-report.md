# Post-merge MVP closure review packet

Date: 2026-09-13. **Outcome: BLOCKED for stakeholder launch; bounded fixes ready for review.**
This is an early authority-exception handoff, not a declaration that all MVP
journeys or production are verified. Database task classification: local-data
workflow, followed by bounded consumer fixes. No schema authority changed.

## Candidate and provenance

| Identity                                            | Value                                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------------------- |
| Prior remote main / merge first parent              | `c2158b5da27a4fde9e4329e276024e9ade570e4a`                                    |
| PR 577 accepted head / second parent                | `5260e2233c708139aa618322d32bb40753f7385a`                                    |
| PR merge / observed remote main / initial candidate | `4e012b3044628fc06da7489c0055e9ce01bdc8d9`                                    |
| Accepted-head and merge tree (equal)                | `24731de54ebc739546b550376fe456eaf9731135`                                    |
| Fixed application candidate                         | `c6c9f1330ae3910bfbad7021735b231e90e984b0`                                    |
| Branch                                              | `verify/mvp-closure-post-577`                                                 |
| Worktree                                            | `/home/edwardspc/Desktop/Dev/worktrees/property-listify-mvp-closure-post-577` |

Claim: the initial candidate is the actual merged revision. Mechanism: GitHub
PR metadata plus fetched Git graph. Sequence: inspect worktrees/status, fetch
remote main, resolve merge parents and ancestry, create task-owned worktree,
compare trees. Evidence: [PR 577](https://github.com/Doscoding187/real_estate_portal/pull/577)
merged at 2026-09-13T01:33:50Z; both parent ancestry checks returned 0 and
accepted-head/merge trees are equal. Boundary: source identity is not founder
acceptance or deployment evidence. The fixed candidate changes that tree and
requires new consolidated review.

[Post-merge CI Pipeline 34730845978](https://github.com/Doscoding187/real_estate_portal/actions/runs/34730845978)
completed successfully on the exact merge SHA (push event). Database contract,
physical credential verification, lint/typecheck, unit/integration, and build
jobs passed. Checkout logs confirm the merge SHA.
[Frontend Build Guard 34730845947](https://github.com/Doscoding187/real_estate_portal/actions/runs/34730845947)
also passed. These hosted checks do not cover the later fixed candidate.

Preserve [original MySQL admission evidence](merge-readiness-review.md) and
[evidence/run-34728422717](evidence/run-34728422717/SHA256SUMS).
It proves isolated MySQL Community 8.4.7 compatibility and bounded physical
credential/constraint tests, not Azure capabilities, TiDB data safety,
production grant correctness, capacity, backup restoration, or full journeys.
Later PR-head credential improvements are present in the merged source; do not
retroactively credit older artifacts with those additional tests.

## Target and data establishment

Claim: one new product-verification target reached canonical schema/data
readiness. Mechanism: Database Authority commands. Sequence: status/manifest/
context; service start reported already available; wait/status; worktree:create;
plan; exactly one apply; congruency; reference/foundation/scenario prepare and
verify; readiness. Every stage completed successfully. No migration retry.

| Evidence                     | Observed value                                                         |
| ---------------------------- | ---------------------------------------------------------------------- |
| Target class                 | disposable-worktree, exact owned, local-owner                          |
| Endpoint/database            | 127.0.0.1:3307 / listify_wt_mvp_closure_post_577_0acaec2869a2          |
| Fingerprint hash             | `a560e9f2971e7676be194015ed933f1964e0948c5fd44d5844a74dcbf494e321`     |
| Ownership key                | `0acaec2869a261326d9b1bcd`                                             |
| Manifest digest              | `a511e70ae06ffbae4027cf02b1de8cc0f586ff7c23cb7cb11a0990606cf728ed`     |
| Plan digest                  | `60d0cd43f816dbbe86d296382943101016bb7b93beace4aab1e40f60bf35ba6f`     |
| Accepted old head            | none, verified fresh target                                            |
| Applied head                 | 0090_retire_disconnected_boost_campaigns.sql; 91 migrations            |
| Migration lock               | property_listify_manifest_migrations; verified owner connection 190    |
| Physical schema              | 212 application tables; congruent; 23/23 CHECKs enforced               |
| Desired/actual schema digest | `95f6c6b11056df70c0e1fd5639dcf0e9cb58e0616e01ac6f243564112dd24cea`     |
| Reference                    | canonical-geography-v2; 9 provinces, 340 cities, 1089 suburbs          |
| Foundation                   | canonical-launch-foundation-v1; 3 products and declared entitlements   |
| Scenario                     | search-to-lead-v3                                                      |
| Final readiness observation  | 2026-09-13T10:24:00.255Z; search-to-lead ready; no incomplete attempts |

Boundary: native local service evidence is not hosted MySQL 8.4 or production
evidence. Readiness leaves consumer/browser/release layers separate. Central
credentials remained mode 0600 and were never printed. Canonical provisioning
created the target ownership profile; contrary to the initial operator
assumption, it did not create a .env.local symlink. The task launcher uses the
canonical resolved child environment and exact fingerprint guard, plus
process-local ports and simulated email. It does not claim complete central
preview-environment reconciliation.

The original Stage 1 target
`listify_wt_database_transition_stage_1_d8173f13c5c4`
(`5b75c0ec72db92fea58941cbedecf61579a049de9a3f4fccf938969bf5e733dc`)
and successor
`listify_wt_database_transition_stage_1_fr_4388046192b2`
(`b121616eb803e0da7351ee3aa767f10d5f7f9c8585d9d3f83f3a41e07a86faf2`)
and their ownership records were not reset, reused, repaired, disposed, or
modified by this task. Quarantined listify_local was not mutated. The new
target is retained for review; failed launch acceptance is not a disposal
authorization. Shared MySQL was left available.

## Journey evidence

PASS below is restricted to the stated local scope. BLOCKED identifies an
incomplete required journey; it does not claim a failing production observation.

| Journey                      | Result                          | Exact evidence and boundary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account access               | PASS locally                    | scripts/mvp-account-verification.mts completed 15 HTTP checks: weak password rejection; registration; unverified denial; verification; token replay denial; login; prohibited self-assigned super-admin reduced to visitor; logout; anonymous auth.me null; recovery enumeration resistance; reset; reset replay denial; old-password denial; new-password success; pre-reset session revoked. Real persisted user/token/session paths; email transport captured locally. External delivery, expiry timing over elapsed time, and browser form completion remain unverified. |
| Permissions                  | BLOCKED for complete scope      | Account privilege injection denied; scripts/mvp-listing-verification.mts proved cross-tenant listing read and write HTTP 403 and unchanged persisted title. Scenario verifier proved agent/agency/developer unrelated-recipient denial and platform-operations restrictions. This is not exhaustive tenant membership revocation, every role, or admin audit proof.                                                                                                                                                                                                          |
| Listing authoring            | PASS for HTTP draft lifecycle   | Final run created listing 991014, reopened it, changed title from “MVP persisted verification home” to “MVP edited verification home”, reopened again, denied outsider overwrite, and rechecked unchanged title. Browser wizard/media upload and other asset-family authoring are not proven. Earlier harness retries retained their task-local drafts.                                                                                                                                                                                                                      |
| Publication                  | BLOCKED                         | Fixed preflight returns HTTP 200 with agency_profile_incomplete, agency_branding_incomplete, subscription_required and subscription_plan_unresolved. Draft submission returns HTTP 400 “Confirm the property location before publishing.” Approve/reject/publish sequence not run: setup/location/media prerequisites remain and canonical publication requires subscription authority. No paid activation or fabricated entitlement was used to make this pass.                                                                                                             |
| Discovery                    | BLOCKED for complete Land scope | db:scenario:verify passed real router search/detail, sale/rent separation and persisted custody checks. Browser at http://localhost:5177/property/990001 renders “Light-filled family home with garden and solar”, R3,850,000, Sandton/Johannesburg and features; /property/990005 renders “Property no longer available.” Orphan/unpublished/archived/pending/incoherent search/detail/enquiry exclusions passed in the scenario verifier. Full public Land single-geography-authority and classification journey was not run in this task.                                 |
| Lead investigation and audit | BLOCKED                         | Scenario verifies durable lead IDs 1–5, identical replay IDs, conflicting replay rejection, custody and role visibility. CRM-export/local simulated delivery is not actual provider delivery. Investigator audit trail and worker restart/crash recovery were not proven.                                                                                                                                                                                                                                                                                                    |
| Payments disabled            | BLOCKED — authority exception   | Static evidence: billingRouter requestLaunchAccessInvoice/startManualEftCheckout/createCheckoutSession/reviewManualPayment remain routable; billingFoundationService retains paid invoice/subscription mutation; AgencyOnboarding and billing workspaces call checkout. Missing provider credentials alone do not prove disabled paid activation. No paid operation was invoked. A cross-layer disable and the permitted publication entitlement model require a reviewed disposition consistent with canonical lifecycle.                                                   |

The malformed journey row in the assignment was interpreted as lead
investigation with audit evidence. No broader CRM scope was assumed.

Browser setup initially used an unapproved port (5017), then a mismatched
127.0.0.1 origin. The environment guard/CORS rejected those requests. Repeating
on the existing allowed backend port 5000 and configured localhost origin
resolved the issue without changing security policy. The transient
UNSUPPORTED_MEDIA_TYPE observation was not a product defect. Browser page
rendering is smoke evidence only, not full browser acceptance.

## Material defects and validation

### Interim pre-payment onboarding implementation

The approved interim invariant is now implemented: identity and professional
presence can be prepared before payment; private drafts can be saved, resumed
and edited; publication, marketplace visibility and commercial capabilities
remain entitlement-gated. The UI no longer forces an invoice request immediately
after agency onboarding, no longer routes a completed agent profile directly to
payment, and permits pending developer users to reach their draft routes. The
listing preflight now distinguishes `canPrepareDraft: true` from
`canStartListing: false`. Server-side publication checks were retained.

Real local HTTP evidence from `scripts/mvp-prepayment-verification.mts`:
agent profile and preflight PASS; agency profile persistence and idempotent
resume PASS; agency commercial features `false`; developer draft save/reopen/edit
PASS (draft id 5 in the task target). No invoice, payment, entitlement mutation,
or publish operation was called. The focused suite passed 18/18 tests. A second
material defect was fixed in `developer.saveDraft`: edits attempted to write
ownership columns again and used an incompatible timestamp string. Ownership is
now enforced in the WHERE predicate while only mutable draft fields are updated,
and the timestamp uses the canonical Date value.

This is a local candidate result. It does not authorize free publishing,
commercial activation, protected release, or a new entitlement policy.

### Lead-handling follow-up investigation

The next launch-critical review targeted lead custody and retry authorization.
Public capture ignores client-supplied recipient IDs and derives ownership from
canonical listing data; duplicate and conflicting request IDs, custody
visibility, and cross-role routing are covered by the contract suite. Retry
requires the owning approved agent, verified agency admin, owning developer
publisher, or super-admin and rejects other users with `FORBIDDEN`. Relational
delivery tests cover transactional rollback, concurrent claim fencing, and
stale-lease quarantine. The focused run passed 60 tests; eight database
integration tests were skipped because this invocation had no `DATABASE_URL`.
No material authorization or data-integrity defect was found, so no lead code
change was justified. Actual provider delivery, investigator audit workflow,
and crash/restart evidence remain launch blockers.

1. **LRC-AUTH-001:** newly issued one-hour reset token rejected on an
   Africa/Johannesburg host. Persisted expiry 2026-09-13 02:53:28 and database
   UTC time 01:53:56 proved a future UTC deadline, while local parsing treated
   it as expired. Auth now interprets canonical timestamp strings as UTC and
   rejects malformed or expired deadlines. Verification uses the same handling.
   Three focused reset regression cases were added; session suite 8/8 passed
   with TZ=Africa/Johannesburg. Real HTTP reset then passed.
2. **LRC-PUBLISH-001:** publication preflight passed the imported database
   helper module to readiness evaluators, producing “db.select is not a
   function.” It now supplies the authorized database instance. The HTTP
   listing harness asserts successful preflight and preserves its real blockers.

Claim: bounded fixes pass relevant local checks. Mechanism: repository commands
and HTTP harnesses. Sequence: reproduce failures, inspect canonical timestamp/
database consumers, fix, run focused and full checks, rerun HTTP against the
restarted task runtime. Evidence: db:authority:check (293 static tests plus
utilities/schema/lifecycle); pnpm check; pnpm lint:check; pnpm build all exit 0.
pnpm test:ci: **580 files passed, 50 skipped; 3985 tests passed, 238 skipped**.
Full suite had no explicit database URL and skipped gated integration cases;
it is not a substitute for the separately executed real database/API evidence.
Final TypeScript check on the committed source also passed.
Boundary: hosted CI applies only to the merge candidate; the new fixes have no
hosted CI run yet. Existing lint warnings and large-bundle warnings remain
deferred. No cosmetic or new feature changes were made.

Reproduction scripts are deliberately exact-target-bound and require this
retained task database. Start scripts/mvp-local-runtime.mts only with a private
mode-0600 stdout log at /tmp/listify-mvp-577-runtime.log; its local email sink
contains temporary reset/verification tokens and must never be published.
Then run the two mvp-\*-verification.mts scripts. They perform real task-local
account/draft writes and use canonical scenario accounts; they are not general
production diagnostics. Credentials and raw tokens are excluded from this
report and Git.

## Ranked remaining blockers and authority handoff

1. **L1 — payment containment / publishing authority (LRC-PAY-001):** do not
   onboard a public publishing cohort until payment UI/routes/workers are
   demonstrably disabled and the owner approves the canonical non-paid cohort
   entitlement policy, or narrows onboarding to accounts/drafts with publication
   unavailable. Neither a paid activation nor privilege broadening is permitted
   by this packet. The source's paid-publication prerequisite is the concrete
   authority exception stopping complete publication acceptance.
2. **L1 — missing complete journey evidence:** full reviewer approve/reject/
   publish, Land geography, investigator audit, membership revocation and worker
   recovery remain incomplete. Complete them under the reviewed cohort policy;
   do not reclassify this report's partial evidence as PASS.
3. **L1 — external/protected operational evidence:** real verification/recovery
   mail, recipient delivery, Azure grant/provider behavior, recovery and capacity
   are not proven here. Local mocks and green CI cannot authorize launch.
4. **L2 — deferred polish/performance debt:** existing lint/bundle warnings,
   optional map preview and broad optional product surfaces. These do not justify
   widening this workstream.

The [central launch register](../launch-readiness-and-product-convergence/03-launch-register.md)
contains complete records for the two fixes and the payment/publication
authority blocker. No record is production verified; source fixes await
integration. This is a review packet, not permission to enable payments.

## Proposed next protected-release packet (not executed)

Packet revision 1 should bind master-plan 1.3, reviewed source/tree, manifest
and model digests, exact Azure target fingerprint, accepted/expected head and
fresh runner plan digest. First resolve the cohort/payment decision and finish
local journey evidence. Then seek explicit authorization for each protected
operation; a read-only plan does not authorize apply.

Required evidence: exact Azure MySQL version, CHECK/FK enforcement and isolated
restored-target congruency; distinct runtime/worker/migration/verifier grants
with physical denial tests and strict TLS; restore rehearsal proving proposed
RPO <=15 minutes and RTO <=4 hours in-region, regional <=24 hours and 14-day
retention; 24-hour representative capacity with two peaks, 30-minute 2x peak,
<0.1% unexpected errors, CPU-credit floor >=30% with recovery before next peak,
and backlog drain <=15 minutes. Owner approval must confirm thresholds/budget.

TiDB requires separately authorized read-only inventory/classification,
retirement/data mapping for 0066–0090, counts and integrity reconciliation,
writer-freeze plan, final capture/import verification and custody of retained
evidence. After Azure accepts writes, no switch-back writer on TiDB. Retain
TiDB read-only for 14 days with day-7/day-14 reviews before separately approved
retirement. Include actual mail/lead delivery, monitoring, pinned frontend/
backend identities and a staffed GO/no-GO/recovery decision.

## Git and protected boundaries

Application fixes are committed at c6c9f133; this report and register are a
separate documentation commit. Final Git status is checked after that commit.
No merge, feature push, deployment, cutover, Azure/TiDB access, protected
migration, credential/grant change, provider setting change, recovery, or
migration-history edit was performed. Running provider deployments were left
unchanged; owner-confirmed production containment was not reinterpreted as
release authorization. Local application processes started by this task may
be stopped without stopping the shared database service.
