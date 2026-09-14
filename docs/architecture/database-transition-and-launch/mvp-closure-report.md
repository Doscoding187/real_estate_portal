# Post-merge MVP closure review packet

Date: 2026-09-14 (Goal 6 addendum; original closure review dated 2026-09-13).
**Outcome: the local candidate supports controlled
pre-payment onboarding; canonical billing and activation paths are contained,
and Goals 1–6 agency membership, workspace, commercial-term, private-preparation,
review/publication, and public-discovery slices are verified on the task branch.
Normal commercial activation, hosted integration, production verification, and
protected release remain blocked.** This is not a declaration that all MVP
journeys or production are verified. Database task classification: local-data workflow,
followed by bounded consumer fixes. No schema authority changed.

## Post-closure senior-review qualification

The later [Agency Journey Senior Architecture Review](../launch-readiness-and-product-convergence/14-agency-journey-senior-review.md)
preserves independent review evidence that the closure report did not prove a
complete paid customer journey. It identifies:

- a P0 agency-affiliation authority defect;
- a P1 agency commercial-entitlement, public-recipient, and CRM-access
  contradiction;
- a P0 Land public-visibility route outside the canonical
  billing/activation-containment proof; and
- a P1 assisted-support and launch-disclosure gap.

Accordingly, the Payments-disabled result below is a **local
billing/activation-containment result**, not a platform-wide assertion that no
path can make inventory public. The dedicated Land path remains an open
containment finding. These findings and their launch disposition are recorded
in [the central launch register](../launch-readiness-and-product-convergence/03-launch-register.md);
the bounded implementation order is [the sequential agency-goals tracker](../launch-readiness-and-product-convergence/15-agency-journey-closure-goals.md).
This qualification retains the original local evidence and its limits. It does
not itself prove a correction, authorize payment activation, or change a
protected environment.

## Candidate and provenance

| Identity                                            | Value                                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------------------- |
| Prior remote main / merge first parent              | `c2158b5da27a4fde9e4329e276024e9ade570e4a`                                    |
| PR 577 accepted head / second parent                | `5260e2233c708139aa618322d32bb40753f7385a`                                    |
| PR merge / observed remote main / initial candidate | `4e012b3044628fc06da7489c0055e9ce01bdc8d9`                                    |
| Accepted-head and merge tree (equal)                | `24731de54ebc739546b550376fe456eaf9731135`                                    |
| Earlier recovery/preflight fix candidate            | `c6c9f1330ae3910bfbad7021735b231e90e984b0`                                    |
| Current closure candidate                           | `c8c35fde44d00ff8b2ce83ca73fcb32dd522e9bc`                                    |
| Goal 1 authority correction (task branch)           | `cf1f93e6f2148a1fc434571475ecd9f18c646bfa`                                    |
| Goal 2 workspace correction (task branch)           | `af9fd6f2`                                                                    |
| Goal 3 commercial-term correction (task branch)     | `16a23cd9ab61cbc791f1b7e7941e62e53d1ecd7d`                                    |
| Goal 4 listing-preparation evidence (task branch)   | `a403d31d7456aff837e6d6c5e73af8033cf1634b`                                    |
| Goal 5 publication correction (task branch)         | `74bff0f983cee0911aa34a209886e7a5c96b37ff`                                    |
| Goal 6 public-discovery correction (task branch)    | `9acfea2f5dd778b5b944fb9701e4fc2f39f885af`                                    |
| Branch                                              | `verify/mvp-closure-post-577`                                                 |
| Worktree                                            | `/home/edwardspc/Desktop/Dev/worktrees/property-listify-mvp-closure-post-577` |

Claim: the initial candidate is the actual merged revision. Mechanism: GitHub
PR metadata plus fetched Git graph. Sequence: inspect worktrees/status, fetch
remote main, resolve merge parents and ancestry, create task-owned worktree,
compare trees. Evidence: [PR 577](https://github.com/Doscoding187/real_estate_portal/pull/577)
merged at 2026-09-13T01:33:50Z; both parent ancestry checks returned 0 and
accepted-head/merge trees are equal. Boundary: source identity is not founder
acceptance or deployment evidence. The closure candidate is the reviewed
branch lineage after the merged tree; it requires consolidated senior review
and a separately authorized integration/release path.

[Post-merge CI Pipeline 34730845978](https://github.com/Doscoding187/real_estate_portal/actions/runs/34730845978)
completed successfully on the exact merge SHA (push event). Database contract,
physical credential verification, lint/typecheck, unit/integration, and build
jobs passed. Checkout logs confirm the merge SHA.
[Frontend Build Guard 34730845947](https://github.com/Doscoding187/real_estate_portal/actions/runs/34730845947)
also passed. These hosted checks do not cover the later closure candidate.

Preserve [original MySQL admission evidence](merge-readiness-review.md) and
[evidence/run-34728422717](evidence/run-34728422717/SHA256SUMS).
It proves isolated MySQL Community 8.4.7 compatibility and bounded physical
credential/constraint tests, not Azure capabilities, TiDB data safety,
production grant correctness, capacity, backup restoration, or full journeys.
Later PR-head credential improvements are present in the merged source; do not
retroactively credit older artifacts with those additional tests.

## Sequential agency-goal progress (task branch only)

Goal 2, agency-member workspace authority, is locally verified at
[`af9fd6f2`](https://github.com/Doscoding187/real_estate_portal/commit/af9fd6f2).
Current canonical membership selects the agency commercial owner for the
member’s plan/entitlement projection; the onboarding route exposes that source;
and both the client route and billing service deny an individual billing path
for that member. Exact-target HTTP acceptance verified invitation acceptance,
agency-projected active access, no individual billable account, pending agency
activation remaining preparation-only, suspension/reinstatement, and rejection
of stale affiliation claims.

Goal 3, agency commercial-entitlement authority, is locally verified at
[`16a23cd9`](https://github.com/Doscoding187/real_estate_portal/commit/16a23cd9ab61cbc791f1b7e7941e62e53d1ecd7d). Subscription reads at the agency/member-facing
boundaries are explicitly scoped to the canonical owner. Paid Launch Access now
requires an eligible agency plan and a valid, unelapsed canonical UTC fixed
term before it enables workspace, public status, plan projection, or listing
publication. Exact-target acceptance proves that expiry propagates to the
member and agency workspace; focused service regressions fail closed for a
missing or malformed fixed-term end. The isolated Vitest-only S4 case proved
local finance-review activation exactly once and expiry for fixture owners. It
did not enable a normal runtime commercial path, contact a payment provider, or
authorize a paid release. The complete commands and boundaries are in
[Goal 3 verification](../launch-readiness-and-product-convergence/15-agency-journey-closure-goals.md#goal-3-verification-record--2026-09-13).

Goal 4, agency listing preparation, is locally verified at
[`a403d31d`](https://github.com/Doscoding187/real_estate_portal/commit/a403d31d7456aff837e6d6c5e73af8033cf1634b).
The production invitation and listing routers were exercised over authenticated
HTTP on the exact task-owned target. A canonical agency member uploaded and
confirmed five real local media objects, created a listing with canonical
Gauteng/Johannesburg/Sandton IDs, reopened and edited its persisted draft, and
received the expected subscription gate when attempting submission. Persisted
checks confirmed agency/agent ownership, canonical location and confirmation
state, five completed media rows, no public `properties` projection, and
cross-tenant denial for both draft reads and media reservation. The existing
media-tenant test fixture was updated to create the canonical agent profile
required by the current listing authority contract; no runtime authorization was
relaxed.

This is local branch evidence, not a hosted integration, provider, or production
claim. Goals 5–6 below close the local review/public-discovery slice; the L1
agency journey finding remains open through enquiry and CRM operation in Goals
7–8 in [LRC-AGY-001](../launch-readiness-and-product-convergence/03-launch-register.md#lrc-agy-001).
Milestone M1 remains ready for its planned senior review and M2 is now ready for
that review; M3 remains pending Goals 7–8.


Goal 5, agency submission, review, and publication, is locally verified at
[`74bff0f9`](https://github.com/Doscoding187/real_estate_portal/commit/74bff0f983cee0911aa34a209886e7a5c96b37ff).
The exact-target HTTP acceptance used a canonical invited agency member with no
individual subscription or badge, uploaded five media objects, submitted the
listing, captured structured reviewer rejection, corrected and resubmitted it,
failed closed when the agency term was suspended, then approved it after the
isolated fixture term was restored. Persisted assertions proved the rejected
queue history was retained, the source/projection title and ownership matched,
and five images were mirrored. This is a task-local fixture state; no payment
or normal runtime entitlement activation occurred.

Goal 6, public discovery, is locally verified at
[`9acfea2f`](https://github.com/Doscoding187/real_estate_portal/commit/9acfea2f5dd778b5b944fb9701e4fc2f39f885af).
The same real HTTP acceptance queried the canonical Sandton suburb identity
before and after publication. Private/unapproved inventory was absent; the
published card carried the exact canonical geography, approved title/type/source,
and five images; public detail carried the matching approved facts and five
media records. A mixed canonical-location-plus-city request was rejected with
`BAD_REQUEST`. The implementation also corrected a discovered card defect that
collapsed an approximate Sandton listing to Johannesburg. Hosted/browser and
production discovery remain unverified.

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

Final `pnpm db:authority:status` on the closure candidate again reported the
same exact target fingerprint, manifest head 0090, `schema-congruent`,
`target-connected`, and `no-incomplete-attempts`. Its reference/scenario
fields are not evaluated by that status command; the earlier canonical
reference, foundation, and scenario preparation/verification evidence above is
retained rather than inferred from status output.

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

| Journey                      | Result                                                  | Exact evidence and boundary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account access               | PASS locally                                            | scripts/mvp-account-verification.mts completed 15 HTTP checks: weak password rejection; registration; unverified denial; verification; token replay denial; login; prohibited self-assigned super-admin reduced to visitor; logout; anonymous auth.me null; recovery enumeration resistance; reset; reset replay denial; old-password denial; new-password success; pre-reset session revoked. Real persisted user/token/session paths; email transport captured locally. External delivery, expiry timing over elapsed time, and browser form completion remain unverified.                                                                                                                                                                                                                |
| Permissions                  | BLOCKED for complete scope                              | Account privilege injection denied; scripts/mvp-listing-verification.mts proved cross-tenant listing read and write HTTP 403 and unchanged persisted title. Scenario verifier proved agent/agency/developer unrelated-recipient denial and platform-operations restrictions. This is not exhaustive tenant membership revocation, every role, or admin audit proof.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Listing authoring            | PASS for HTTP private agency-preparation slice          | `pnpm test:authority -- server/__tests__/integration.agency-listing-preparation.test.ts server/__tests__/integration.agency-member-workspace-authority.test.ts server/__tests__/integration.listing-media-tenant-boundary.test.ts` passed 3 files / 5 tests on target fingerprint `a560e9f2971e7676…`. Production invitation/listing routers were exercised over authenticated HTTP; five media objects were physically PUT and served back, canonical Gauteng/Johannesburg/Sandton IDs persisted, the member reopened/edited the draft, the agency owner could view it, and an unrelated tenant was denied. Submission remained blocked by `subscription_required`; no public projection was created. Browser wizard completion and reviewer/public lifecycle remain unproven.             |
| Publication                  | PASS for isolated agency lifecycle; normal runtime blocked | Goal 5 real HTTP acceptance submitted a canonical agency listing, captured reviewer rejection reasons/note, reopened and corrected the draft, resubmitted it, observed suspended-term approval denial with no projection, restored the isolated fixture term, and approved the listing. Persisted source/queue/projection checks and five mirrored images passed; approval used a task-local subscription fixture and did not invoke payment or normal runtime activation. Hosted and production publication remain unverified. |
| Discovery                    | PASS for isolated agency slice; Land blocked    | Goal 6 real HTTP search used the canonical `suburb:<id>` authority and returned the published agency property with exact Gauteng/Johannesburg/Sandton context, matching title/type/source, and five images. Before approval the same search returned no card; mixed canonical-plus-city input returned `BAD_REQUEST`. Public detail returned the approved title, city/province, identity, five images and five media records. Land remains outside this cohort: its separate public route and full consumer journey are not verified or contained. |
| Lead investigation and audit | BLOCKED                                                 | Scenario verifies durable lead IDs 1–5, identical replay IDs, conflicting replay rejection, custody and role visibility. CRM-export/local simulated delivery is not actual provider delivery. Investigator audit trail and worker restart/crash recovery were not proven.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Payments disabled            | PASS locally — billing/activation containment candidate | `c8c35fde` defines a shared `preparation_only` state, removes payment/proof affordances from the onboarding surfaces, and fails closed before database work for invoice, checkout, proof, finance-review, lifecycle, entitlement, and provider-event functions. Exact-target HTTP proof returned tRPC 412 for agent invoice, agency checkout and developer invoice requests, and HTTP 409 for the agent Express invoice route; it then proved profile/draft preparation persisted. The worker intake/claim/complete/fail paths have the same guard. This is local candidate evidence only: it does not enable payment, entitlement mutation, free publication, provider delivery, or production release, and it does not cover the separately mounted Land approval/public-visibility path. |

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
PASS (final rerun: agency id 990010 and developer draft id 7 in the task
target). The harness deliberately called invoice/checkout paths and proved they
were rejected before an invoice, payment, entitlement mutation, or publish
operation could occur. The focused containment suite passed 43/43 tests. A
second material defect was fixed in `developer.saveDraft`: edits attempted to
write ownership columns again and used an incompatible timestamp string.
Ownership is now enforced in the WHERE predicate while only mutable draft
fields are updated, and the timestamp uses the canonical Date value.

### Agency listing-preparation evidence

Goal 4 is verified on the task branch at
[`a403d31d`](https://github.com/Doscoding187/real_estate_portal/commit/a403d31d7456aff837e6d6c5e73af8033cf1634b).
The focused exact-target run passed 3 files / 5 tests. It exercised the
production invitation and listing routers over authenticated HTTP, physically
uploaded and served five local media objects, persisted canonical location and
membership-derived agency attribution, reopened and edited the private draft,
and denied an unrelated tenant draft read and media reservation. Submission
returned the existing `subscription_required` precondition and left the draft
private without a `properties` projection. The only source correction in this
slice updates a stale media-boundary fixture to create the canonical agent
profile required by `createListing`; it does not relax runtime authority.

This is a local candidate result. It does not authorize free publishing,
commercial activation, protected release, or a new entitlement policy.

### Payment and activation containment

**LRC-PAY-001** was a material launch-containment gap: disabled provider
credentials alone did not prove that a mounted route or worker could not
attempt a commercial transition. The correction is a shared, source-controlled
`preparation_only` state. It cannot be enabled by development or deployed
environment configuration; the only exception is the isolated Vitest process
so existing paid-state fixtures can retain coverage.

The server guard runs before database acquisition in invoice requests,
manual-EFT checkout, payment-proof submission, finance review, subscription
lifecycle changes, paid-launch entitlement activation, and billing-provider
event intake/processing. The public status query reports the state without
exposing bank details. Agent, agency, developer, and finance UI surfaces show
the preparation state and do not expose payment or proof controls. The old
subscription router either rejects commercial agent/agency/developer paths or
only retains non-paid compatibility operations; it cannot create a paid legacy
subscription. The retired partner subscription router is not mounted.

The final task-local HTTP run on `c8c35fde` verified the status was disabled,
agent tRPC invoice rejection (412), agent Express invoice rejection (409),
agency checkout/session rejection (412), developer invoice rejection (412),
agency profile/resume persistence, and developer draft save/reopen/edit. The
five focused policy tests invoke every guarded service path and confirm the
failure happens before database work. No payment provider, charge, invoice,
proof, entitlement activation, free publishing policy, or commercial
credential was used.

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
restarted task runtime. Evidence: Goal 4 exact-target acceptance (3 files / 5
tests); db:authority:check (293 static tests plus utilities/schema/lifecycle);
pnpm check; pnpm build all exit 0.
On the exact closure candidate `c8c35fde`, pnpm test:ci: **582 files passed,
50 skipped; 3992 tests passed, 238 skipped**. The focused containment set:
**8 files, 43 tests passed**. `pnpm lint:check` completed with **0 errors** and
11,084 pre-existing warnings; `pnpm build` completed with the existing
large-chunk warning.
Full suite had no explicit database URL and skipped gated integration cases;
it is not a substitute for the separately executed real database/API evidence.
Final TypeScript check and production build on the committed source also passed.
Boundary: hosted CI applies only to the merge candidate; the new fixes have no
hosted CI run yet. Existing lint warnings and large-bundle warnings remain
deferred. No cosmetic or new feature changes were made.

Reproduction scripts are deliberately exact-target-bound and require this
retained task database. Start scripts/mvp-local-runtime.mts only with a private
mode-0600 stdout log. `mvp-prepayment-verification.mts` defaults to
`/tmp/listify-mvp-577-runtime.log`; set `MVP_RUNTIME_LOG` to that same private
runtime log if a different path is used. Its local email sink contains temporary
reset/verification tokens and must never be published. Then run the two
mvp-\*-verification.mts scripts. They perform real task-local account/draft
writes and use canonical scenario accounts; they are not general production
diagnostics. Credentials and raw tokens are excluded from this report and Git.

## Ranked remaining blockers and authority handoff

1. **L1 — commercial activation and marketplace publication remain unavailable
   (LRC-PAY-001):** the source containment candidate is locally proven, but a
   stakeholder cannot publish until the separately approved payment, finance,
   entitlement, and protected-release evidence exists. Controlled pre-payment
   onboarding may prepare identities and private drafts only. Do not replace
   this boundary with a free publishing entitlement or a privilege bypass.
2. **L1 — agency enquiry and CRM operation remains incomplete
   (LRC-AGY-001):** Goals 1–6 now prove the trusted membership,
   workspace-owner, fixed-term commercial-lifetime, private preparation, governed
   review/publication, agency-entitlement recipient eligibility, and canonical
   public discovery boundaries locally. Public enquiry custody, replay handling
   over the newly authored listing, assigned-agent CRM operation, membership
   removal/reassignment, and continued custody after expiry remain Goals 7–8.
   Do not reclassify local fixture publication as a paid launch.
3. **L0 — Land public-visibility containment:** the deferred first-cohort
   disposition is still not enforced at every direct route, API, review, and
   publication boundary. Land must remain outside any exposed paid cohort until
   its separate containment and acceptance slice is authorized.
4. **L1 — external/protected operational evidence:** real verification/recovery
   mail, recipient delivery, Azure grant/provider behavior, recovery and capacity
   are not proven here. Local mocks and green CI cannot authorize launch.
5. **L2 — deferred polish/performance debt:** existing lint/bundle warnings,
   optional map preview and broad optional product surfaces. These do not justify
   widening this workstream.

The [central launch register](../launch-readiness-and-product-convergence/03-launch-register.md)
contains complete records for the two fixes, the payment/publication
containment correction, and the agency-goal progress. No record is production
verified; source fixes await integration. This is a review packet, not
permission to enable payments.

## Proposed next protected-release packet (not executed)

Packet revision 1 should bind master-plan 1.3, reviewed source/tree, manifest
and model digests, exact Azure target fingerprint, accepted/expected head and
fresh runner plan digest. First finish the remaining local journey evidence.
Commercial activation remains a separate owner-approved release decision. Then
seek explicit authorization for each protected operation; a read-only plan does
not authorize apply.

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

Application fixes are committed at `c6c9f133`, `bba390b0`, `c8c35fde`,
`cf1f93e6`, `af9fd6f2`, `16a23cd9`, Goal 4 evidence/fixture correction
`a403d31d`, Goal 5 publication correction `74bff0f9`, and Goal 6 public-discovery
correction `9acfea2f`; the review packet and register are
committed in the accompanying documentation commit. Final Git status was clean after that commit. No merge, feature push,
deployment, cutover, Azure/TiDB access, protected migration, credential/grant
change, provider setting change, recovery, payment activation, entitlement
activation, or migration-history edit was performed. Running deployments were
left unchanged; owner-confirmed production containment was not reinterpreted as
release authorization. The local application runtime may be stopped without
stopping the shared database service.
