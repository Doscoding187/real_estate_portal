# Agency Journey Closure — Sequential Goals

| Field                | Record                                                                                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status               | **Working implementation authority.** Goals 1–10 are verified on the task branch within the stated controlled pre-payment onboarding boundary. Goal 10 has a consolidated real-application acceptance and the scoped Goal 9 recovery companion; neither authorizes a protected release, normal-runtime payment activation, provider operation, or production deployment. |
| Architectural source | [Agency Journey Senior Architecture Review](14-agency-journey-senior-review.md)                                                                                                                     |
| Purpose              | Convert the senior review into small, sequential, evidence-led implementation goals for the future commercial agency journey while containing the currently permitted pre-payment preparation path. |
| Cohort boundary      | One small agency in one geography is the proposed controlled pre-payment onboarding cohort. Any later paid launch is separate. Land, developer paid operation, and independent-agent launch claims remain outside this cohort until separately accepted. |

## Operating model

The goals are intentionally sequential. The implementation agent receives one
goal at a time and has discretion over investigation, architecture, and the
smallest safe implementation. A goal describes the required product outcome; it
does not prescribe files, a UI design, or a replacement commercial model.

For every goal, report:

1. what was investigated;
2. what changed, if anything;
3. what was proved, with source identity and exact scope;
4. what remains; and
5. whether the goal is actually complete.

Use only these goal states:

| State           | Meaning                                                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NOT STARTED** | No bounded investigation or implementation has begun.                                                                                                    |
| **IN PROGRESS** | Investigation and/or a bounded correction is underway.                                                                                                   |
| **VERIFIED**    | The intended outcome and material authority/state transitions have direct, stated evidence; no unresolved material P0/P1 defect remains within the goal. |
| **BLOCKED**     | A required dependency, authority decision, or evidence gate prevents safe completion.                                                                    |

Being coded does not make a goal complete. A goal is complete only when the
intended product outcome works and its important authority and state transitions
have been demonstrated.

No goal may silently broaden commercial entitlement, create a free publishing
tier, bypass membership authority, enable payments, change provider settings,
or perform a protected operation. Normal runtime remains
\`preparation_only\`. A controlled enabled-commercial candidate requires its
own explicit release authorization.

## Cross-cutting release conditions

These are not extra agency-journey goals and must not be hidden by a completed
goal status:

- **Land containment:** Land is deferred from the controlled pre-payment
  onboarding cohort and any later paid launch. Direct
  routes, APIs, review and public-publication boundaries must enforce that
  disposition before a launch claim; navigation hiding alone is insufficient.
  See [LRC-LAND-001](03-launch-register.md#lrc-land-001).
- **Support and disclosures:** `144e90d1` provides a persisted, review-only
  assisted-onboarding intake, but assisted onboarding must still end in a
  named, monitored contact operation with final launch-specific terms and
  privacy information. See [LRC-SUPPORT-001](03-launch-register.md#lrc-support-001)
  and the [assisted-onboarding queue runbook](18-assisted-onboarding-queue-runbook.md).
- **Protected release evidence:** Azure/provider credentials, database grants,
  restoration, hosting connectivity, capacity, worker supervision and a
  deliberately enabled commercial path remain separately required before any
  paid launch. None is authorized by this tracker.
- **Canonical agent coverage:** `f40ca8a3` replaces label/CSV coverage claims
  with exact server-resolved location identities at the onboarding, public
  discovery, and serving-agent boundary. Older unstructured values deliberately
  fail closed until an agent reselects them. This is not a change to the
  property-listing geography contract. See [LRC-GEO-001](03-launch-register.md#lrc-geo-001).

## Milestone reviews

Use senior architectural review at these points, rather than asking it to
re-litigate every individual implementation choice.

| Milestone | Goals | Review question                                                                                                      | Status                  |
| --------- | ----- | -------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| M1        | 1–2   | Did implementation establish the correct agency identity and membership authority, or expose a deeper model problem? | READY FOR SENIOR REVIEW |
| M2        | 3–5   | Does canonical membership now connect commercial ownership, listing, review, and publication without contradiction?  | READY FOR SENIOR REVIEW |
| M3        | 6–8   | Does publication connect correctly to public discovery, enquiry, custody, and CRM operation?                         | READY FOR SENIOR REVIEW |
| M4        | 9–10  | Can a real agency operate safely, with observable recovery and a bounded launch decision?                            | READY FOR SENIOR REVIEW |

## Goal 1 — Establish the trusted agency foundation

**Outcome**

A legitimate agency has a trustworthy identity and membership foundation. A
verified agency owner can complete agency setup, establish the agency’s
canonical identity, receive the intended approval, and establish legitimate
membership relationships through the authorized membership mechanism.

Agency affiliation must not be established merely by an agent supplying an
agency identifier.

**Why this goal exists**

The senior review identified a P0 authority defect in which persisted agent
profile data can influence agency attribution without consistently requiring
canonical membership. The required direction is that agency affiliation
originates from authorized membership transitions.

**Completion evidence**

- A verified agency owner completes setup.
- Agency approval succeeds through the intended workflow.
- A legitimate membership can be established through the canonical mechanism.
- Forged or self-assigned affiliation cannot establish agency authority.
- Absent membership cannot establish agency attribution.
- Suspended and removed membership are not treated as active membership.
- A legitimate invitation and membership remain functional.

**Senior-review reference**

[P0 agency-affiliation authority defect](14-agency-journey-senior-review.md#1-p0--agents-can-supply-an-agency-affiliation-that-influences-commercial-ownership)

**Status:** VERIFIED (task branch evidence; integration and production verification pending)

### Goal 1 verification record — 2026-09-13

The bounded correction is committed at
[`cf1f93e6`](https://github.com/Doscoding187/real_estate_portal/commit/cf1f93e6f2148a1fc434571475ecd9f18c646bfa)
on `verify/mvp-closure-post-577` in the task-owned worktree. It removes
profile-supplied agency affiliation from the agent profile contract and
mutation, derives listing attribution and publication ownership from a current
canonical membership (or the agency principal’s own organisation authority),
requires canonical membership for agency assignment, and fails closed on
ambiguous current membership. The obsolete onboarding assertion was updated to
the settled pre-payment preparation-workspace contract.

Direct evidence:

- `pnpm test:authority -- server/__tests__/integration.agency-principal-bootstrap.test.ts server/__tests__/integration.agency-membership-authority.test.ts server/__tests__/integration.agency-listing-attribution.test.ts` passed **3 files / 14 tests** on the exact task-owned disposable target (`a560e9f2971e7676…`). This covers verified owner setup/bootstrap, legitimate invitation acceptance, persisted canonical membership, agency listing attribution, forged profile input, absent membership, suspended membership, and reassignment/removal lifecycle.
- `pnpm exec vitest run --project server server/services/__tests__/agencyMembershipService.test.ts server/services/__tests__/listingPublicationEntitlementService.test.ts server/__tests__/contract.agent-onboarding-journey.test.ts server/__tests__/commercial-agent-s2.contract.test.ts server/__tests__/contract.agency-listing-inventory.test.ts server/__tests__/contract.commercial-agency-workflow-boundary.test.ts server/__tests__/contract.agency-lead-visibility-followup.test.ts` passed **7 files / 53 tests**. The focused authority unit set includes the multiple-current-membership fail-closed regression.
- `pnpm check` passed; `pnpm build` passed (existing large-chunk warning only).
- `pnpm db:authority:check` passed its static authority suite (**35 files / 293 tests**), utility classification (**119 surfaces**), schema sanity (**212 canonical tables / 91 active migrations**), deterministic inventory, and lifecycle checks. Final target status remained `schema-congruent`, migration head `0090_retire_disconnected_boost_campaigns.sql`, `target-connected`, and `no-incomplete-attempts`.

The evidence is branch-local and uses the authorized disposable worktree target.
It does not establish hosted integration, production verification, payment or
entitlement activation, provider delivery, or any protected database operation.
Goal 2 is recorded below as task-branch verified. Milestone M1 is ready for its planned senior architectural review; this tracker does not claim that review has occurred.


### Goal 1 invitation-acceptance qualification — 2026-09-15

The original legitimate-invitation evidence is now explicitly bounded: canonical
team membership begins only after the agency has an effective canonical
commercial term. Commit [`415a9472`](https://github.com/Doscoding187/real_estate_portal/commit/415a947261a65c160f4fb77c39712050bab35b8) closes the direct-acceptance gap
left by deferred delivery alone. A queued pre-payment token cannot create
membership, profile, affiliation, or workspace authority; the recipient must
also have verified email. The browser return path uses the canonical safe `next`
parameter.

The exact target run passed the affected authority suite (**5 files / 25
tests**), delivery/commercial contracts (**2 files / 16 tests**), client
navigation (**2 files / 70 tests**), and the three-test governed Chromium
pre-payment suite. The active-term invitation fixtures are isolated test
semantics only. This qualification does not enable normal-runtime payment,
entitlement, mail delivery, or production operation.

### Goal 1 operational-workspace authority qualification — 2026-09-15

A continued stale-membership audit found that the original Goal 1 correction,
the private-work supplement, and the inventory supplement had not yet reached
four agency operational entries. A suspended agent's retained historical
profile affiliation still allowed `agency.getListingPerformance` to return a
private listing-performance snapshot. The performance queue, commission
settlements, and My Day had the same missing canonical-membership entry guard.

Commit [`32ce7524`](https://github.com/Doscoding187/real_estate_portal/commit/32ce7524b642519300a5ae6daddac5ae2c393486) makes the resolved agency-workspace
actor the common authority at those paths. An agent must now have an approved
profile and one current canonical membership for the exact agency before
performance reads, review/revision operations, queue access, commission
settlements, or daily work proceed. Agency-manager authority remains unchanged.

The first exact-target authority-wrapped run deliberately failed because the
suspended agent received the performance snapshot. The corrected regression
keeps both historical profile IDs, then proves `FORBIDDEN` for performance,
queue, commission, and My Day after suspension. The combined authority-wrapped
set passed **4 files / 20 tests**, including active-member persisted
performance and commission workflow coverage, and the final focused rerun
passed **2 files / 15 tests**. Typecheck, static database authority, targeted
ESLint with zero errors, and `git diff --check` passed.

This strengthens Goal 1's task-branch authority evidence. It does not prove
hosted integration, a payment/entitlement transition, provider delivery, or
production operation, and it does not change the settled pre-payment boundary.

### Goal 1 viewing/deal workspace authority qualification — 2026-09-15

The next exact-target audit found that the remaining agent-facing viewing, deal,
offer, and transaction routes still began from the retained session/profile
agency ID. The canonical membership lifecycle correctly preserves that field
for audit, so a membership-only suspension left a former member able to read a
full private viewing row and enter the deal workspace.

Commit [`47e059ef`](https://github.com/Doscoding187/real_estate_portal/commit/47e059efaf3404db0f16d3f86b7a577ddb4f1ff3) applies the existing resolved
current-workspace actor guard to those entry points. It preserves active
same-agency viewing and deal workflows while denying the suspended member before
private data read or mutation. The exact-target authority regression first
failed with the private viewing disclosure; after correction it retains the
historical profile IDs and proves `FORBIDDEN` for viewing list/detail/status and
deal workspace. The viewing suite passed **1 file / 5 tests**, active deal
engine passed **1 file / 4 tests**, and related membership/performance coverage
passed **2 files / 15 tests**. Typecheck, static authority, targeted ESLint with
zero errors, and `git diff --check` passed.

This is an additional task-branch Goal 1 authority qualification. It does not
change listing lifecycle, commercial entitlement, payment activation, Land,
provider delivery, hosted integration, or production operation.

### Goal 1 Agent Home workspace authority qualification — 2026-09-15

The continuing exact-target audit found the same retained-affiliation flaw in
Agent Home. A suspended agency member could still receive full private
inventory through `agent.getMyListings`; the dashboard, scheduling options,
commission/CSV paths, and generic property mutations shared that unguarded
agent-profile entry condition.

Commit [`a0fc9e8b`](https://github.com/Doscoding187/real_estate_portal/commit/a0fc9e8b95be1275844e11aaed4bf57bc1ff2bd3)
adds a shared workspace-profile resolver. It leaves independent agents and
no-profile preparation paths available, while requiring a current canonical
membership wherever an existing agent profile carries an agency affiliation.
The direct regression retains stale user/profile agency IDs after suspension
and proves `FORBIDDEN` across Agent Home inventory, dashboard, scheduling,
commissions, export, update, and archive. The final authority-wrapped run
passed **3 files / 18 tests**; canonical showings/inventory contracts passed
**2 files / 9 tests**; typecheck, static authority (**35 files / 295 tests**),
targeted ESLint with zero errors, and `git diff --check` passed.

This is task-branch Goal 1 authority evidence. It does not enable payment,
entitlement, publication, Land, provider delivery, hosted integration, or
production operation.

### Goal 1 public-recommendation authority qualification — 2026-09-15

The same retained-affiliation risk extended to anonymous serving-agent
recommendations. `monetization.getRecommendedAgents` previously joined agency
verification and branding through `agents.agencyId`, although the public
property recipient boundary already resolves current canonical membership. The
exact-target regression confirmed an active unbadged member was recommended
through a verified agency, suspended only canonical membership while retaining
the profile affiliation, and initially received the former member in the
public result.

Commit [`049e2a92`](https://github.com/Doscoding187/real_estate_portal/commit/049e2a92fa2b025d4ad589d9d8a63b40489b9db6)
removes that profile join. It derives verified-agency eligibility and visible
agency identity from the one current canonical membership. A personally
entitled independent result remains available without stale agency branding;
ambiguous current membership retains the shared fail-closed authority behavior.
The corrected authority-wrapped run passed **5 files / 49 tests** on the exact
task target, including the persisted active-member positive and
retained-profile suspended-member negative cases. Typecheck, static authority
(**35 files / 295 tests**), and the client recommendation component (**1 file /
3 tests**) passed; targeted ESLint had zero errors.

This extends Goal 1's task-branch membership authority to the public
recommendation boundary and supports Goal 6's public-discovery evidence. It
does not establish browser, hosted, provider, payment, entitlement, or
production verification.

## Goal 2 — Establish agency-member workspace authority

**Outcome**

A legitimately affiliated agent can enter and operate in the correct agency
workspace without an unnecessary individual commercial purchase. Workspace
capability is derived from current membership and the appropriate agency
authority.

**Completion evidence**

- An approved agency member can access the intended workspace.
- An individual subscription is not incorrectly required for agency operation.
- An unrelated user cannot obtain agency-workspace authority.
- Membership changes produce the intended workspace-access changes.

**Senior-review reference**

[P1 agency commercial/public/CRM contradiction](14-agency-journey-senior-review.md#2-p1--a-paid-agencys-agent-does-not-have-a-consistent-path-from-publication-to-discovery-and-lead-handling)

**Status:** VERIFIED (task branch evidence; integration and production verification pending)

### Goal 2 verification record — 2026-09-13

The bounded correction is committed at
[`af9fd6f2`](https://github.com/Doscoding187/real_estate_portal/commit/af9fd6f2)
on `verify/mvp-closure-post-577`. It makes a current canonical agency
membership select the agency commercial owner for the agent’s plan and
entitlement projection. The onboarding response exposes that authority source,
the package route waits for it before querying individual billing, and the
billing service itself rejects an individual invoice/proof/workspace path for a
current agency member. A member whose agency is awaiting activation remains in
the settled preparation state (`await_agency_activation`); this does not create
an entitlement, free publishing tier, payment mutation, or publication bypass.

Direct evidence:

- `pnpm test:authority -- server/__tests__/integration.agency-member-workspace-authority.test.ts` passed **1 file / 1 test** against the exact task-owned disposable target (`a560e9f2971e7676…`). It uses the production invitation mutation, authenticated HTTP onboarding-status route, persisted agency plan fixture, and billing router. It proves an approved, invited member without an individual subscription or optional badge receives the agency projection; individual billing is rejected; pending agency activation remains preparation-only; suspension removes agency workspace authority; canonical reinstatement restores it; and stale user/profile agency claims without membership do not obtain it.
- `pnpm exec vitest run --project server server/__tests__/contract.agent-onboarding-journey.test.ts server/__tests__/commercial-agent-s2.contract.test.ts server/__tests__/commercial-launch-access-s4.contract.test.ts server/services/__tests__/agencyMembershipService.test.ts server/services/__tests__/listingPublicationEntitlementService.test.ts` passed **5 files / 47 tests**.
- `pnpm exec vitest run --project client client/src/components/agent/AgentStatusStrip.test.tsx client/src/pages/agent/AgentPackageSelection.test.tsx` passed **2 files / 9 tests**.
- `pnpm check`, `pnpm build`, and `pnpm db:authority:check` passed. The authority gate passed **35 files / 293 tests**, utility classification of **119 surfaces**, schema sanity for **212 canonical tables / 91 active migrations**, deterministic inventory, and lifecycle checks. The build retained only the existing large-chunk warning.

The active subscription used in the isolated acceptance fixture is persisted
test data; no invoice, finance activation, entitlement mutation, provider,
protected database, or deployment operation was performed. This establishes
Goal 2’s workspace-selection boundary only. Commercial lifecycle/expiry
semantics remain Goal 3; public recipient eligibility remains Goal 7; and
continued CRM custody is Goal 8. Milestone M1 is ready for planned senior
architectural review.

## Goal 3 — Establish agency commercial-entitlement authority

**Outcome**

The agency is the correct commercial owner for agency-backed participation. The
system consistently understands who pays, which entitlement applies, which
members inherit that entitlement, and what happens when it expires.

This goal may use controlled tests and isolated paid-state fixtures already
permitted to Vitest. It must not enable commercial activation in normal runtime
or introduce payment/entitlement mutation outside the existing Vitest-only
fixture boundary.

**Completion evidence**

- The agency entitlement is associated with the canonical commercial owner.
- Eligible agency members inherit the intended capability.
- Individual billing state does not incorrectly override agency participation.
- Entitlement expiry produces deliberate access changes.
- Preparation-only operation remains correctly gated until separately approved
  commercial activation.

**Senior-review reference**

[P1 agency commercial/public/CRM contradiction](14-agency-journey-senior-review.md#2-p1--a-paid-agencys-agent-does-not-have-a-consistent-path-from-publication-to-discovery-and-lead-handling)

**Status:** VERIFIED (task branch evidence; integration and production verification pending)

### Goal 3 verification record — 2026-09-13

The bounded correction is committed at
[`16a23cd9`](https://github.com/Doscoding187/real_estate_portal/commit/16a23cd9ab61cbc791f1b7e7941e62e53d1ecd7d) on `verify/mvp-closure-post-577`. It keeps the
current canonical agency membership as the owner selection from Goal 2, then
makes the commercial decision owner-scoped at every changed subscription read.
Agency workspace, public agency status, plan projection, and publication
preflight now evaluate a paid Launch Access term against its eligible agency
plan and canonical UTC fixed-term end. A stale raw `active` status, a missing
fixed-term end, a malformed end, or a wrong-owner subscription can no longer
unlock agency commercial capability.

Direct evidence:

- `pnpm test:authority -- server/__tests__/integration.agency-member-workspace-authority.test.ts` passed **1 file / 1 test** against the exact task-owned disposable target (`a560e9f2971e7676…`). It uses the production invitation mutation and authenticated HTTP onboarding-status route, then expires a paid agency term. The member projects the canonical agency owner but becomes `expired`, loses full commercial features and `canReceiveLeads`; the agency owner sees `billingActivated: false` and publishing/reporting disabled. The existing plan projection persists the elapsed term as expired; fixture restoration is test-only.
- `pnpm test:authority -- server/__tests__/commercial-launch-access-s4.integration.test.ts` passed **1 file / 5 tests** on the same target. Its permitted Vitest-only finance path proves owner isolation, request/proof/review activation exactly once, fixed 90-day access, and expiry for agency and related fixture owners. It did not call a payment provider, alter a deployed environment, or enable normal runtime activation.
- `pnpm test:authority -- server/__tests__/integration.agency-operating-home.test.ts server/__tests__/integration.commercial-listing-capacity.test.ts server/__tests__/integration.listing-publication-readiness.test.ts` passed **3 files / 6 tests**, covering agency access, commercial capacity enforcement, publication readiness, and rollback on the exact target.
- `pnpm exec vitest run --project server server/services/__tests__/commercialTerm.test.ts server/services/__tests__/listingPublicationEntitlementService.test.ts server/__tests__/commercial-access-authority.contract.test.ts server/__tests__/contract.agent-continuity.test.ts server/__tests__/contract.agency-onboarding-journey.test.ts server/__tests__/commercial-agent-s2.contract.test.ts server/__tests__/commercial-launch-access-s4.contract.test.ts` passed **7 files / 62 tests**. The added regressions cover UTC MySQL `DATETIME` interpretation and fail-closed paid fixed terms with absent or malformed ends.
- `pnpm check`, targeted ESLint (0 errors; existing warnings only), `pnpm build`, and `pnpm db:authority:check` passed. The authority gate passed **35 files / 293 tests**, utility classification of **119 surfaces**, schema sanity for **212 canonical tables / 91 active migrations**, deterministic inventory, and lifecycle checks. Final `pnpm db:authority:status` reported the same exact owned target, migration head `0090_retire_disconnected_boost_campaigns.sql`, `schema-congruent`, `target-connected`, and `no-incomplete-attempts`.

This establishes the branch-local membership-to-commercial-owner and
fixed-term-expiry boundary. It does not prove listing creation/media or the
review/publication browser path (Goals 4–5), public discovery and recipient
eligibility (Goals 6–7), continued CRM custody (Goal 8), provider delivery, or
an enabled customer commercial journey. Normal runtime remains
`preparation_only`; the isolated Vitest state transition is not payment or
release authorization.

## Goal 4 — Complete agency listing preparation

**Outcome**

A legitimate agency member can prepare real inventory for publication.

**Completion evidence**

- The agent can create the intended listing.
- Actual media can be uploaded.
- Geography is correctly established.
- The listing remains private while it is not commercially and publicly
  activated.
- A draft can be saved, reopened, and edited.
- Listing ownership and agency attribution come from trusted authority.

**Senior-review reference**

[Current supported agency slice](14-agency-journey-senior-review.md#current-supported-slices-and-their-limits) and
[Most valuable next implementation assignment](14-agency-journey-senior-review.md#most-valuable-next-implementation-assignment)

**Status:** VERIFIED (task branch evidence; integration and production verification pending)

### Goal 4 verification record — 2026-09-14

The bounded acceptance coverage is committed at
[`a403d31d`](https://github.com/Doscoding187/real_estate_portal/commit/a403d31d7456aff837e6d6c5e73af8033cf1634b)
on `verify/mvp-closure-post-577`. It uses the production listing and invitation
routers over authenticated HTTP against the task-owned disposable target. A
verified agency owner invites a member through the canonical membership path;
the member reserves and physically uploads five media objects through the local
media route, confirms each upload, resolves canonical Gauteng/Johannesburg/
Sandton location IDs, and creates a real listing. Persisted assertions verify
the canonical owner, agent, agency, location, confirmation source, draft state,
and five completed media rows. The member reopens and edits the draft, the
agency owner can view it through workspace custody, and an unrelated tenant is
denied both read and media-reservation access. Submission remains blocked by
the existing `subscription_required` gate; no public projection is created.

Direct evidence:

- `pnpm test:authority -- server/__tests__/integration.agency-listing-preparation.test.ts server/__tests__/integration.agency-member-workspace-authority.test.ts server/__tests__/integration.listing-media-tenant-boundary.test.ts` passed **3 files / 5 tests** on the exact target fingerprint (`a560e9f2971e7676…`). The run includes actual HTTP media PUTs and a served-object byte check, canonical membership acceptance, persisted draft reopen/edit, cross-tenant denial, and deleted/reassigned-listing media-token denial. The tenant-boundary fixture was corrected to create the canonical agent profile required by the current listing authority contract; this was a stale test fixture, not a runtime relaxation.
- `pnpm check` passed; `pnpm build` passed with the existing large-chunk warning; and `pnpm db:authority:check` passed its **35 files / 293 tests**, **119-surface** utility classification, **212-table / 91-active-migration** schema sanity, deterministic inventory, and lifecycle checks.
- Final `pnpm db:authority:status` reported the exact owned target fingerprint (`a560e9f2971e7676be194015ed933f1964e0948c5fd44d5844a74dcbf494e321`), migration head `0090_retire_disconnected_boost_campaigns.sql`, `schema-congruent`, `target-connected`, and `no-incomplete-attempts`. The status command leaves canonical reference and scenario fields unevaluated; no readiness claim is inferred from those fields.

This proves the private preparation slice only. It does not prove browser wizard
completion, reviewer rejection/resubmission, paid activation, public
publication, discovery, enquiry, CRM handling, hosted integration, or
production verification. Normal runtime remains `preparation_only`; no payment,
entitlement mutation, provider, protected database, or deployment operation was
performed.

## Goal 5 — Complete agency submission, review, and publication

**Outcome**

Agency inventory can move through the governed lifecycle:

\`draft → submission → review → rejection/correction → resubmission → approval → publication\`

This goal must preserve the existing commercial gate. A real commercial
activation or public release is outside current authority; any enabled
candidate needed later must be separately authorized.

**Completion evidence**

- A listing can be submitted.
- A reviewer can review it.
- Rejection produces usable feedback.
- Correction preserves the draft.
- Resubmission works.
- Approval performs the intended entitlement and ownership checks.
- Approved inventory becomes publicly discoverable only when commercial and
  publication conditions are satisfied.
- The same inventory remains coherent across publication, detail, and media.

**Senior-review reference**

[Strengths to retain](14-agency-journey-senior-review.md#strengths-to-retain) and
[Most valuable next implementation assignment](14-agency-journey-senior-review.md#most-valuable-next-implementation-assignment)

**Status:** VERIFIED (task branch evidence; integration and production verification pending)

### Goal 5 verification record — 2026-09-14

The bounded publication correction and acceptance are committed at
[`74bff0f9`](https://github.com/Doscoding187/real_estate_portal/commit/74bff0f983cee0911aa34a209886e7a5c96b37ff)
on `verify/mvp-closure-post-577`; the public-search follow-up is
[`9acfea2f`](https://github.com/Doscoding187/real_estate_portal/commit/9acfea2f5dd778b5b944fb9701e4fc2f39f885af).
The production listing and reviewer routers now exercise submission, structured
rejection, private correction, resubmission, entitlement recheck, approval, and
projection publication. Approval updates only the current pending/reviewing
queue row, preserving the earlier rejected audit record. Agency public
eligibility inherits the active canonical agency entitlement for the current
member; it does not require an individual subscription or optional verification
badge.

Direct evidence:

- `pnpm test:authority -- server/__tests__/integration.agency-listing-publication-lifecycle.test.ts server/services/__tests__/propertySearchApprovedProjection.test.ts server/services/__tests__/publicSearchService.contract.test.ts server/__tests__/contract.public-search-pagination.test.ts server/__tests__/contract.property-search-detail-lead-ownership.test.ts` passed **5 files / 59 tests** on the exact task-owned disposable target. The real HTTP acceptance proved canonical invitation/membership, five uploaded media objects, listing submission, reviewer rejection with reasons and note, persisted correction/resubmission, rejected and pending queue history, suspended-subscription approval denial with no projection, and successful approval after restoration.
- The same acceptance verifies the persisted published source and public projection contain one title, owner, agent, agency, canonical Gauteng/Johannesburg/Sandton IDs, and five mirrored images. Anonymous detail returns the approved projection and media; an agency member without an individual subscription or badge is eligible through the agency term.
- `pnpm check`, `pnpm build`, targeted ESLint (0 errors; existing warnings only), and `pnpm db:authority:status` passed. Build retained the existing large-chunk warning.

This is task-branch evidence only. It does not enable payments, create a free
publishing entitlement, authorize a hosted release, or establish production
verification. Goal 5 is complete locally; milestone M2 is ready for the planned
senior review.

## Goal 6 — Complete public discovery

**Outcome**

Newly published agency inventory is discoverable through the intended public
geographic and search journey.

**Completion evidence**

- Published inventory appears in the intended search.
- Geography is correct.
- Public detail matches the approved inventory.
- Media is correctly available.
- Private and unapproved inventory remain unavailable.
- Agency publication authority and public visibility agree.

**Senior-review reference**

[Current supported public-property-user slice](14-agency-journey-senior-review.md#current-supported-slices-and-their-limits)

**Status:** VERIFIED (task branch evidence; integration and production verification pending)

### Goal 6 verification record — 2026-09-14

The public-geography correction and acceptance coverage are committed at
[`9acfea2f`](https://github.com/Doscoding187/real_estate_portal/commit/9acfea2f5dd778b5b944fb9701e4fc2f39f885af)
on `verify/mvp-closure-post-577`. Public manual search now retains the
canonical suburb label joined from the approved projection even when the
listing's public address precision is approximate; the card no longer collapses
Sandton to Johannesburg.

Direct evidence:

- The real HTTP acceptance searches with `locationId = suburb:<canonical
  Sandton id>`, `listingType = sale`, `propertyType = house`, and
  `listingSource = manual`. Before approval, the resolved search returns no
  card for the private/unapproved listing. After approval, it returns the same
  property ID, corrected title, Gauteng/Johannesburg/Sandton card geography,
  manual source, and all five approved images.
- The response includes an exact resolved `locationContext` with the canonical
  province, city, suburb hierarchy and IDs. A mixed request combining that
  canonical `locationId` with `city` is rejected by the real tRPC route with
  `BAD_REQUEST`; no precedence or geography widening is chosen.
- The same run opens public detail and verifies the approved title, city and
  province, agent/agency identity, five images, and five media records. The
  focused projection regression runs the approximate-precision case directly.

The remaining boundary is hosted/browser and production verification. This
goal does not authorize payment activation, provider access, Land exposure, or
deployment. Goal 7 remains the next sequential implementation goal.

## Goal 7 — Complete public enquiry and lead custody

**Outcome**

A public prospect can enquire about published agency inventory and the resulting
lead is durably custodied by the correct agency and assigned-agent authority.

**Completion evidence**

- An anonymous enquiry succeeds.
- One durable lead is created.
- Replay or idempotent submission does not create an unintended duplicate.
- Ownership resolves to the correct agency and assigned agent.
- An unrelated tenant cannot access the lead.

**Senior-review reference**

[Lead-handling strength and boundary](14-agency-journey-senior-review.md#strengths-to-retain) and
[Most valuable next implementation assignment](14-agency-journey-senior-review.md#most-valuable-next-implementation-assignment)

**Status:** VERIFIED (task branch evidence; integration, hosted, and production verification pending)

### Goal 7 verification record — 2026-09-14

The public enquiry and custody acceptance is committed in the agency journey
correction [`c4df6600`](https://github.com/Doscoding187/real_estate_portal/commit/c4df6600)
on `verify/mvp-closure-post-577`. The production public lead route was exercised
without an authenticated recipient selector. It derives the assigned agent and
agency from the approved listing, persists the enquiry and its primary custody
delivery, and keeps the stable capture request idempotent. A changed payload
with the same request id is rejected rather than creating a second lead.

Direct evidence:

- `pnpm test:authority -- server/__tests__/integration.agency-member-workspace-authority.test.ts server/__tests__/integration.agency-listing-publication-lifecycle.test.ts` passed **2 files / 2 tests** on the exact task-owned disposable target (`a560e9f2971e7676…`). The real tRPC public route created one persisted lead and completed `crm_export` custody for the canonical assigned agent; exact replay returned the same lead, and a tampered replay returned `CONFLICT`. Persisted assertions covered agency/agent ownership, consent, request id, and the primary delivery row.
- The same acceptance gave an unrelated verified agency administrator an empty lead list, `NOT_FOUND` detail, and no retry authority. The owning agency and assigned agent could see the one lead. The local email sink is only a test observation; no external provider delivery was claimed.

The result is task-branch local evidence. Provider delivery, operator audit/recovery,
and worker restart handling remain Goal 9. No payment, entitlement activation,
protected database operation, or production release occurred.


### Goal 3 / Goal 7 direct-profile entitlement supplement — 2026-09-15

A later audit found that the original public listing-enquiry acceptance did not
cover the separate direct agent-profile route. That route accepted a selected
agent id but evaluated only an individual subscription, creating a P1
contradiction for an otherwise current, approved agency member with agency
Launch Access.

Commit [`1ca5fac2`](https://github.com/Doscoding187/real_estate_portal/commit/1ca5fac21e740f657ca54582157eb805c0f82932)
loads exactly one current canonical agency membership for the selected profile,
uses that membership's agency id to evaluate the matching canonical agency
billable-account subscription, and preserves the individual entitlement path
for independents. The public profile's retained agency field no longer carries
commercial authority at this boundary. The resolver checks every matching term,
so a historical expired row cannot hide a later current entitlement.

The exact-target regression first proved the pre-fix `NOT_FOUND` rejection for
an unbadged member with no individual term, then proved one durable direct-agent
lead after correction. It also suspended canonical membership while preserving
the profile agency id and proved that a new direct enquiry is rejected. The
final authority-wrapped run passed **3 files / 89 tests**; the broader
public-profile/continuity slice passed **6 files / 120 tests**. This improves
the Goal 3 commercial-owner and Goal 7 direct-enquiry boundaries locally. It
does not claim direct-profile browser UX, agency-administrator visibility for a
person-to-person lead, provider delivery, normal-runtime activation, hosted
integration, or production verification.


### Goal 3 / Goal 7 Commercial public-enquiry entitlement supplement — 2026-09-15

A further public-route audit found the same commercial-owner contradiction at
Commercial listing capture: a current, unbadged agency member without a personal
term could be held in manual attention even when the materialized listing and
canonical membership both pointed to an agency with valid Launch Access.
Membership existence alone also did not prove it was membership in that listing
owner; agency-only custody did not require an active agency term.

[`551d63fe`](https://github.com/Doscoding187/real_estate_portal/commit/551d63fe)
uses the materialized Commercial listing agency as the commercial owner,
requires the assigned member's current canonical membership to match it, and
admits the matching agency billable-account term. It retains independent-agent
and badge paths where they are authorized, fails wrong/suspended/absent
membership closed into auditable manual attention, and requires an active term
for agency-only custody.

On exact target `a560e9f2971e7676…`, the real public Commercial search and
`leads.create` route created persisted agent-and-agency `crm_export` custody for
a current unbadged member; after canonical suspension with retained profile
association, the next enquiry was recorded as manual attention. The
authority-wrapped Commercial/custody/membership regression passed **7 files /
128 tests**; typecheck and static authority **35 files / 295 tests** passed.
This closes the local Goal 3 commercial-owner and Goal 7 Commercial public
recipient boundary. It does not prove Commercial browser UX, external delivery,
hosted integration, a live paid cohort, or production activation.


### Post-goal coverage-authority correction — 2026-09-15

The later browser/persisted-state inspection found an area-specific defect at
the boundary between an agent-selected coverage location and public
recommendation: one canonical label could be stored as comma-separated text,
then split and partially matched. Commit
[`f40ca8a3`](https://github.com/Doscoding187/real_estate_portal/commit/f40ca8a3bbed5bfc1f0ffeb675b2c9d10397f35e)
supersedes that part of the earlier local evidence. It uses typed canonical IDs,
server-generated labels, exact matching, and a deliberate fail-closed treatment
for historic unstructured values. The authority-wrapped 9-file/73-test run and
local Chromium save/reload acceptance prove the bounded correction on the exact
owned target. The change neither alters property-listing geography nor claims
hosted integration, production migration, or a live re-selection operation; see
[LRC-GEO-001](03-launch-register.md#lrc-geo-001) for its release disposition.

## Goal 8 — Complete assigned-agent and agency CRM operation

**Outcome**

The assigned agent and authorized agency administrator can actually work the
lead. The system must distinguish permission to receive new commercial
opportunities from permission to access and continue handling leads already
legitimately custodied.

**Completion evidence**

- The assigned agent can open the lead.
- The assigned agent can record contact and follow-up.
- The agency administrator has the intended oversight.
- Existing legitimate custody survives entitlement changes where appropriate.
- Membership removal and reassignment produce deliberate access changes.
- Unrelated tenants cannot access the lead.

**Senior-review reference**

[P1 agency commercial/public/CRM contradiction](14-agency-journey-senior-review.md#2-p1--a-paid-agencys-agent-does-not-have-a-consistent-path-from-publication-to-discovery-and-lead-handling)

**Status:** VERIFIED (task branch evidence; integration, hosted, and production verification pending)

### Goal 8 verification record — 2026-09-14

The bounded correction is committed in [`c4df6600`](https://github.com/Doscoding187/real_estate_portal/commit/c4df6600). Agent lead routes now require an approved profile and current canonical membership for agency custody, while the agency administrator route scopes an agent to the same membership. `canReceiveLeads` remains the commercial permission for new opportunities; the separate `canAccessExistingLeads` capability keeps legitimate custody workable after term expiry. The CRM UI communicates the paused new-opportunity state instead of locking existing work.

The acceptance also closes an operational continuity defect: deactivation/reassignment now moves future active showings together with active leads and listings and notifies the replacement agent. Browser-shaped ISO showing timestamps are normalized at the API boundary to the canonical MySQL representation.

Direct evidence:

- The same governed integration passed the assigned agent’s pipeline read, contact activity, stage transition, follow-up, and viewing booking while the agency term was expired (`canReceiveLeads: false`, `canAccessExistingLeads: true`). The agency administrator observed the same custody and activity.
- Canonical invitation/reassignment then suspended the former membership, denied the former agent’s lead and agency-detail reads, moved the lead and confirmed future showing to the replacement agent, preserved the original primary-custody delivery history, exposed a reassignment notification, and allowed the replacement agent and owner to continue CRM work. An unrelated tenant remained denied.
- `pnpm vitest run client/src/pages/AgentLeads.test.tsx server/__tests__/agent.inventory-cutover.test.ts server/__tests__/agent.showings-compatibility.test.ts server/__tests__/agent.lead-response-summary.test.ts server/__tests__/agent.offer-readiness.test.ts server/__tests__/contract.agent-public-profile-route.test.ts server/__tests__/contract.agent-public-profile.test.ts server/__tests__/agent.dashboard-showings.smoke.test.ts` passed **7 files / 38 tests**, with **1 database-gated test skipped**. The client regression proves the UI keeps the pipeline enabled for existing custody and locks it when custody authority is absent.
- `pnpm check` passed; targeted ESLint reported **0 errors** (repository warnings only); `git diff --check` passed.

This is local branch evidence, not hosted or production verification. It does not
enable payments, create a free publishing entitlement, or promise external email.
Goal 9's scoped first-cohort recovery fallback is now verified below; Goal 10 has
begun, and milestone M3 remains ready for the planned senior review.

### Goal 8 viewing UTC wire-boundary supplement — 2026-09-15

The next broad authority-wrapped run exposed a material operational defect in
the otherwise verified agency viewing slice. `showings.scheduledAt` is a
canonical UTC MySQL timestamp, but the viewings API returned the zone-less
database text unchanged. A future viewing at 00:30 Africa/Johannesburg therefore
appeared as the prior local date to the detail consumer and could be omitted
from that selected My Day queue.

Commit [`4d0b1517`](https://github.com/Doscoding187/real_estate_portal/commit/4d0b1517)
serializes the persisted timestamp as an explicit ISO UTC API instant before it
is returned or evaluated for `isUpcoming`; the stored value and Johannesburg
day-boundary query remain canonical and unchanged. The deterministic persisted
regression creates a future 00:30 Johannesburg viewing, retains the exact ISO
instant through detail, and proves My Day returns it under the proper day.

The initial isolated run reproduced **1 failed / 5 tests**. The corrected
viewing suite passed **1 file / 5 tests**, and the related viewings contract,
canonical membership, and agency deal set passed **4 files / 33 tests** on the
exact owned disposable target. `pnpm check`, static database authority (**35
files / 295 tests**), targeted ESLint with zero errors, and `git diff --check`
passed. The interrupted broad invocation is not claimed as a post-fix suite
pass; a clean broad rerun remains required. This correction neither changes
membership/tenant authority nor enables payment, entitlement, publication,
Land, provider, or protected operations.

### Goal 8 client operating-date and viewing-input follow-up — 2026-09-15

The explicit UTC wire boundary made a remaining client defect observable: the
viewing calendar grouped ISO instants by their UTC date. Commit
[`fa8f9101`](https://github.com/Doscoding187/real_estate_portal/commit/fa8f9101)
now derives the calendar group and displayed date from the same
`Africa/Johannesburg` operating-day key as My Day. Its client helper regression
passed **1 file / 4 tests**, including the midnight boundary and UTC-to-local
reschedule prepopulation.

The same review identified an input-side risk. The agency API accepted a bare
browser `datetime-local` string through host-local `Date` parsing even though
durable database timestamps are UTC. Commit
[`40a37c37`](https://github.com/Doscoding187/real_estate_portal/commit/40a37c37)
treats only bare viewing input as Johannesburg wall time and preserves
explicit-offset/UTC API input as an explicit instant. It supplies a time-zone
label in both viewing entry points and prepopulates the reschedule control in
that operating time zone.

The authority-wrapped contract plus persisted viewing workflow passed **2 files
/ 13 tests** on target `a560e9f2971e7676…`. Its new route-level counterexample
forces the test API host to UTC, submits a browser-shaped 00:30 local input,
and proves both its stored explicit instant and My Day membership. The client
helper plus Agent Leads regression passed **2 files / 6 tests**; typecheck,
static authority (**35 files / 295 tests**), targeted zero-error lint, and final
authority status passed. This keeps the timestamp model and all commercial,
membership, Land, schema, and protected-operation boundaries unchanged.

## Goal 9 — Complete notification, recovery, and operational handling

**Outcome**

Important lead-delivery failures produce an actionable and auditable operational
outcome.

**Completion evidence**

- A delivery failure can be deliberately simulated.
- The failure is observable.
- Existing lead custody is not lost.
- Recovery or reconciliation can be performed by an authorized operator.
- Duplicate delivery is prevented or safely controlled.
- The operating procedure is understandable to the person responsible for lead
  handling.

If external email is part of the commercial promise, its reliability and
recovery must be demonstrated before making that promise. Internal CRM custody
with a staffed escalation procedure is the supported first-cohort fallback
described by the senior review.

**Senior-review reference**

[Lead-handling strength and boundary](14-agency-journey-senior-review.md#strengths-to-retain)

**Status:** VERIFIED (first-cohort local recovery evidence; provider, hosted, and production verification pending)

### Goal 9 verification record — 2026-09-14

The bounded correction is committed at
[`f9086ef4`](https://github.com/Doscoding187/real_estate_portal/commit/f9086ef4ee3a6fa664256a9dbebedd7e1fd9ce28).
The existing relational delivery authority already fences a claimed worker and
marks an ambiguous outcome `unknown` rather than retrying it. The focused
investigation found one operational audit-integrity defect: although the
platform delivery completion was idempotent, a repeated identical super-admin
action still rewrote the lead and appended another CRM activity. The correction
now treats that replay as a complete no-op after the original transaction and
returns `duplicate: true` to the caller.

Direct evidence:

- `pnpm test:authority -- server/__tests__/integration.lead-delivery-authority.test.ts` passed **1 file / 9 tests** on the exact task-owned disposable target (`a560e9f2971e7676…`). A deliberately interrupted worker produced an `unknown` platform-managed delivery. The real super-admin audit and queue routes surfaced it; the authorized completion route recorded a factual contact; an exact replay returned `duplicate: true`; and persisted assertions showed one completed delivery and one CRM activity before both attention surfaces cleared.
- `pnpm vitest run server/services/__tests__/leadRoutingCorrectionService.test.ts server/__tests__/contract.system-lead-routing-correction.test.ts server/__tests__/contract.system-lead-routing-audit.test.ts server/services/__tests__/leadRoutingAuditService.test.ts server/services/__tests__/leadDeliveryService.contract.test.ts` passed **5 files / 32 tests**. This covers custody authorization, audit classification, correction constraints, and delivery lifecycle contracts.
- `pnpm check` and `git diff --check` passed. Targeted ESLint reported **0 errors**; existing repository warnings remain outside this bounded correction.
- The operating procedure is recorded in the [first-cohort lead custody recovery runbook](16-first-cohort-lead-custody-recovery-runbook.md). It limits human completion to explicitly platform-managed/manual custody, directs customer-owned leads to their canonical CRM route, and preserves `unknown` external-provider outcomes for separately authorized reconciliation.

This verifies the supported first-cohort fallback: durable internal CRM custody
with an observable platform exception queue and an authorized, replay-safe
manual recovery path. It does not prove an external email provider, live worker
supervision, hosted operation, production recovery, or a paid launch. External
email must not be sold as a dependable delivery channel until that separate
evidence exists.

## Goal 10 — Prove the complete agency journey

**Outcome**

The complete agency-to-agent operating journey is demonstrated end to end:

\`agency setup → approval → canonical membership → agent workspace → listing preparation → commercial entitlement → publication → public discovery → prospect enquiry → assigned-agent CRM → continued operation\`

**Completion evidence**

- A verified agency owner completes setup and approval.
- An invited agent joins through canonical membership.
- The agent operates without an unnecessary individual subscription or optional
  badge requirement.
- The agent prepares real inventory with media and geography.
- A separately authorized isolated enabled-commercial candidate grants intended
  fixed-term access exactly once.
- A listing can be rejected, corrected, and resubmitted without losing the
  draft.
- Approved inventory becomes discoverable with correct detail and media.
- An anonymous enquiry produces one durable lead.
- The assigned agent and agency administrator can work the lead.
- An unrelated tenant cannot access it.
- Membership removal, reassignment, and entitlement expiry produce intended
  access changes without silently abandoning legitimate enquiries.
- A deliberately failed notification or delivery produces an actionable,
  audited recovery outcome.

**Final decision**

When this goal is verified, reassess the whole agency journey before treating
the initial agency cohort as launch-ready. Run the equivalent independent-agent
variation before advertising independent-agent support, and a separate
developer variation before presenting developers as a fully supported paid
launch audience.

**Senior-review reference**

[Most valuable next implementation assignment](14-agency-journey-senior-review.md#most-valuable-next-implementation-assignment)

**Status:** VERIFIED (local task-branch acceptance; integration, hosted, provider, and production verification pending)

### Goal 10 verification record — 2026-09-14

The consolidated agency acceptance is committed at
[`fbf592cc`](https://github.com/Doscoding187/real_estate_portal/commit/fbf592cc7f1a808915be2b138e2f6f39a8b88963)
on `verify/mvp-closure-post-577`. It replaces the old direct agency and active
subscription fixture in the lifecycle acceptance with the real local
application path:

`register → verification → agency onboarding → agency approval → controlled
Vitest-only finance review / active canonical term → canonical invitation
acceptance → agent profile → private media/geography draft →
submit/reject/correct/resubmit/approve → public search/detail → anonymous
enquiry/replay → agent/agency CRM → expiry and reassignment`.

Direct evidence:

- `pnpm test:authority -- server/__tests__/integration.agency-listing-publication-lifecycle.test.ts` passed **1 file / 1 test** on the exact task-owned disposable target (`a560e9f2971e7676…`). The test mounts the real auth, agent-onboarding, local-media, and tRPC routes. It registers and verifies the owner and member through HTTP; persists canonical agency onboarding and finance-pending subscription state; obtains reviewer approval; performs the isolated Vitest-only finance transition; then accepts the canonical invitation after the active term, saves the professional profile over HTTP, uploads five actual local media objects, and persists a confirmed Sandton location.
- Pre-payment owner preparation is separately browser-proven. The queued member cannot establish team authority before the active term; after a canonical member exists, the focused preparation acceptance proves its private draft remains available after the term returns to `pending_payment`, while submission fails with `PRECONDITION_FAILED`. In the permitted Vitest-only commercial state, canonical manual-EFT checkout reuses one invoice; proof submission and finance review activate the agency term once; replayed finance approval is idempotent; and the stored term is exactly 90 days. This test does not enable normal runtime activation, contact a provider, or alter a payment setting.
- The same accepted owner/member then submits, receives structured rejection feedback, corrects and resubmits the persisted draft, proves suspended-term approval denial, restores only the isolated test term, and approves the listing. Persisted assertions cover the queue history, public source projection, matching media, canonical Sandton search/detail, anonymous enquiry exact replay and conflicting replay denial, unrelated-tenant denial, CRM contact/stage/follow-up, expiry continuity, invitation-based reassignment, former-agent denial, replacement access, and preserved custody history.
- `pnpm test:authority -- server/__tests__/integration.agency-principal-bootstrap.test.ts server/__tests__/integration.agency-member-workspace-authority.test.ts server/__tests__/integration.agency-listing-publication-lifecycle.test.ts server/__tests__/integration.lead-delivery-authority.test.ts` passed **4 files / 15 tests** on the same exact target. It confirms that the full acceptance remains consistent with the canonical bootstrap, workspace-authority, and scoped recovery contracts.
- `pnpm check`, `pnpm exec eslint server/__tests__/integration.agency-listing-publication-lifecycle.test.ts`, and `git diff --check` passed. Targeted ESLint reported **0 errors and 0 warnings** after formatting.
- `pnpm db:authority:status` before the acceptance reported target class `disposable-worktree`, exact worktree ownership, migration head `0090_retire_disconnected_boost_campaigns.sql`, `schema-congruent`, `canonical-foundation-ready`, and `no-incomplete-attempts`.

The deliberately interrupted-delivery requirement remains the exact companion
acceptance in Goal 9 rather than an invented second primary channel for the
agency customer lead. Agency enquiry custody is intentionally completed through
the persisted `crm_export` channel; the Goal 9 platform-managed exception test
creates an `unknown` delivery, exposes it through the authorized audit/queue
surfaces, recovers it once, and proves replay-safe audit history. Together,
these are direct local evidence for the operating journey and its scoped
exception path.

This verifies the one-agency, one-geography operating slice on the task branch.
At this record's date it did **not** prove browser UI completion. The browser
acceptance addendum below supersedes that narrow limitation; the remaining
protected-release boundaries still apply. It does not prove a deployed customer
payment flow, external email/provider delivery, worker supervision, hosted
integration, production recovery, protected database grants, capacity, or
production launch. Normal runtime remains `preparation_only`; no free
publishing entitlement, protected operation, or provider configuration was
introduced.

Milestone M4 is ready for its planned senior architectural review. The separate
L0 Land-containment record is locally corrected, and `144e90d1` now supplies a
bounded assisted-onboarding intake. Named support operation/disclosures and
protected-release evidence remain required; no local Goal 10 result changes
those launch conditions.

### Goal 10 browser acceptance addendum — 2026-09-15

[`72dd80e0`](https://github.com/Doscoding187/real_estate_portal/commit/72dd80e04b5c76c348389f4262543022a8a9a586)
corrected the review feedback/re-entry path, and
[`a2a4e52`](https://github.com/Doscoding187/real_estate_portal/commit/a2a4e52b6b6d215263bc1f765d75a670d00ad64e)
adds focused Chromium acceptance against the same task-owned target. The
following commands passed:

- `pnpm test:browser:authority -- --config=playwright.ple-agency-operating.config.ts --reporter=line` — **5 passed**. An agency member creates a real House listing, confirms the canonical Gauteng/Johannesburg/Sandton geography, uploads five images, submits it, receives reviewer feedback, reopens the persisted listing, corrects and resubmits it, and a reviewer approves it. Persisted assertions confirm the state transitions and one public projection with five images.
- `pnpm test:browser:authority -- --config=playwright.ple-agency-operating.config.ts --reporter=line --grep "discovers only the approved"` — **1 passed**. An anonymous visitor searches using `locationId=suburb:<id>`, sees the approved inventory but not a private candidate, opens its detail, and sees its Sandton context and five-image gallery.
- `pnpm test:browser:authority -- --config=playwright.ple-agency-operating.config.ts --reporter=line --grep "captures a public enquiry"` — **1 passed**. An anonymous visitor supplies only property/prospect data and consent. The persisted lead has canonical agency/assigned-agent custody and completed `crm_export` delivery; the assigned member has no individual agent subscription, opens the real CRM workspace, records contact, and schedules a follow-up with persisted activity evidence.

The browser tests intentionally use the isolated enabled fixture already
required by Goal 10. They neither enable normal-runtime payment/entitlement
functions nor prove a paid customer activation. They also do not form one
continuous browser path through agency-owner registration, canonical invitation
delivery/acceptance, and the later member session. That acquisition path,
external provider delivery, hosted integration, and protected release remain
separate evidence requirements.

### Agency preparation-entry truthfulness follow-up — 2026-09-15

The proposed first cohort is Agency-based and normal runtime remains
`preparation_only`. The persisted Agency onboarding flow already matched that
decision: a verified owner can establish Agency identity and branding, save a
commercial preference without an invoice, open the preparation workspace, and
prepare private inventory. A focused public-entry review found that the external
Agency landing page still described paid Launch Access, manual EFT, invoice
request, marketplace participation, and active team capabilities. The separate
signed-in Agency account boundary also claimed setup would issue an invoice.

Commit [`02788ff2`](https://github.com/Doscoding187/real_estate_portal/commit/02788ff2)
makes those public entry points agree with the settled cohort boundary. The
normal page begins the real Agency-owner registration flow and explains
foundation/identity/branding, retained preparation information, and private
inventory. It states that publishing, marketplace participation, and team
activation remain protected. The previous catalog-driven commercial page is
retained only behind a separately authorized enabled runtime state.

Direct evidence is a **3-file / 16-test** focused client run and a **5-test**
governed Chromium pre-payment acceptance. The browser opens the actual public
Agency page, proves the absence of paid activation claims, enters the
Agency-owner registration dialog, and retains the verified owner/setup,
persisted `pending_payment`, and zero-invoice evidence. `pnpm check`, targeted
zero-error lint/Prettier, and the **35-file / 295-test** static authority suite
also passed on fingerprint `a560e9f2971e7676…`. This is a public
preparation-entry correction, not a paid Agency launch, provider-delivery
proof, or authorization to alter payment or entitlement policy.

### Independent-Agent preparation-entry follow-up — 2026-09-15

The Goal 10 final decision requires an equivalent independent-Agent variation
before advertising independent-Agent support. A focused review found that the
normal runtime was correctly `preparation_only`, but the public Agent landing
page still advertised a paid 90-day Launch Access term and manual-EFT invoice
path. That claim was stronger than the currently approved controlled
pre-payment onboarding path.

Commit [`7c939831`](https://github.com/Doscoding187/real_estate_portal/commit/7c939831)
makes the public entry consistent with the settled model. The normal route now
invites a prospective independent Agent to register, verify, complete their
professional presence and canonical coverage, and prepare private listing
drafts. It names the protected publication/marketplace/new-enquiry boundary and
does not show price, invoice, manual-EFT, or 90-day paid claims. The
catalog-driven commercial page remains retained only behind a separately
authorized enabled runtime state.

Direct evidence is a **2-file / 8-test** focused client run, a **4-test**
governed Chromium pre-payment acceptance including the real public entry and
registration dialog, `pnpm check`, targeted zero-error lint/Prettier, and the
**35-file / 295-test** static authority suite on fingerprint
`a560e9f2971e7676…`. This is a truthful pre-payment onboarding correction. It
does **not** satisfy the separate independent-Agent paid-operation variation or
move independent-Agent paid-launch claims into the accepted agency cohort.

### Authenticated Agent preparation-route follow-up — 2026-09-15

The public-entry correction did not by itself contain the authenticated
`/agent/select-package` route. Although its disabled invoice action returned to
the workspace, it still loaded and displayed the paid catalog, fixed term,
manual-EFT steps, and payment-proofs UI. The shared Agent journey also sent
unavailable select-payment and renewal states to activation-labelled actions.

Commit [`e1ccc2c8`](https://github.com/Doscoding187/real_estate_portal/commit/e1ccc2c8349b66887e8ab145cc772887f1322550)
retains the commercial component only behind the separately authorised enabled
state. Normal runtime now shows the direct authenticated route as Agent setup
and private-work preparation, without commercial queries or invoice wiring.
The central journey maps unavailable commercial steps to a clear preparation
action, so Agent status, settings, and locked-workspace surfaces no longer
offer activation while it is unavailable.

Direct evidence is a **7-file / 20-test** focused client run and the **8-test**
governed Chromium pre-payment acceptance. The browser completed real Agent
registration, verification, profile setup, and direct package-route navigation
before returning to the preparation workspace. `pnpm check`, targeted
zero-error lint/Prettier, `git diff --check`, and the **35-file / 295-test**
static authority suite passed on exact target fingerprint `a560e9f2971e7676…`.
This does not enable payment, entitlement mutation, publishing, a paid
independent-Agent cohort, provider delivery, or a protected release.

### Authenticated Agent preparation-lock wording follow-up — 2026-09-16

The direct package-route correction did not make every reachable Agent lock
truthful. Ten workspace surfaces already disabled their operational data while
an Agent completed the professional profile, yet their profile-completion copy
still directed that stakeholder to “activate Launch Access” in normal
`preparation_only` runtime.

Commit [`217aa1df`](https://github.com/Doscoding187/real_estate_portal/commit/217aa1df288bd7fdda32ee862570876677b0f523)
centralizes the profile-completion description and applies it across the routed
Agent workspace locks and verified setup toast. It preserves the data/custody
guards, directs the stakeholder to complete their professional presence and
private preparation, and clearly retains the commercial, publication, and
new-enquiry boundary. The focused client run passed **6 files / 13 tests** and
the governed Chromium suite passed **8 tests**. The real Agent browser path
now saves core contact and canonical coverage before asserting the reachable
analytics lock, then resumes setup and private listing preparation. `pnpm
check`, targeted zero-error lint/Prettier, static authority **35 files / 295
tests**, `git diff --check`, and database-authority status passed on fingerprint
`a560e9f2971e7676…` at migration head `0090` with no incomplete attempts.

The first browser assertion ran before the pre-existing dashboard-unlock
threshold and was redirected to setup as designed. Correcting that test setup
is a diagnostic correction only. This follow-up does not activate payment,
entitlements, publication, provider delivery, or a paid cohort.

### Authenticated Agency billing-route follow-up — 2026-09-16

The Agency public-entry correction did not contain the signed-in
`/agency/billing` deep link. In normal `preparation_only` runtime, that route
still mounted commercial billing data and displayed plans, invoices, EFT, and
proof controls even though its mutation handlers were disabled.

Commit [`d48544b9`](https://github.com/Doscoding187/real_estate_portal/commit/d48544b9a6c33de954821cbf06c0cac33f6dc0af) separates the retained commercial billing workspace
from the normal route. A signed-in Agency owner now sees only the existing
preparation notice, Agency setup action, and private-inventory action; no
billing query or payment mutation is mounted. Focused client coverage passed
**2 files / 5 tests** and the governed Chromium pre-payment acceptance passed
**8 tests**, including the real verified owner/setup path through the deep link
and return to `/agency/listings`. `pnpm check`, Prettier, `git diff --check`,
and static authority **35 files / 295 tests** passed on fingerprint
`a560e9f2971e7676…` at migration head `0090` with no incomplete attempts.

The initial full browser attempt had a non-exact test locator collision; its
rendered snapshot was correct. After making the locator exact, the focused flow
and final complete suite passed. It is recorded as a corrected test diagnostic,
not a database or product failure. This cross-cutting containment follow-up
does not reopen Goals 1–10 or enable any commercial operation.

### Authenticated Developer subscription-route follow-up — 2026-09-16

The public Developer entry and `/developer/plans` correction did not contain the
signed-in `/developer/subscription` route or its
`/developer/settings/subscription` alias. In normal `preparation_only` runtime,
those routes still mounted commercial billing data and payment-proof wiring and
presented invoices, manual EFT, and payment controls. A pending Developer was
also redirected before it could use the safe preparation route.

Commit [`bb89b2b9`](https://github.com/Doscoding187/real_estate_portal/commit/bb89b2b92ff421e54e9fe864e71112b2947b05f6)
retains the commercial billing panel only behind the separately authorised
enabled state. The normal routes now provide organisation readiness and private
development actions without commercial hooks or mutation wiring. The scoped
client run passed **4 files / 5 tests**; the governed Chromium pre-payment suite
passed **8 tests**, including real pending-Developer navigation to the route and
private draft save/resume. `pnpm check`, targeted zero-error lint, static
authority **35 files / 295 tests**, `git diff --check`, and database-authority
status passed on fingerprint `a560e9f2971e7676…` at migration head `0090` with
no incomplete attempts.

This follow-up preserves the settled commercial model: it enables preparation,
not paid activation, payment handling, entitlement mutation, publication,
provider delivery, or a protected release.

### Legacy public activation-route follow-up — 2026-09-16

The shared public-entry correction did not cover a stale anonymous
`/activation` route. It still mounted `ActivationGate`, which claimed an agency
profile was live and offered active listing and CRM-import actions despite
normal `preparation_only` runtime.

Commit [`a0ceea70`](https://github.com/Doscoding187/real_estate_portal/commit/a0ceea70940e3ee3f84b7118a0470e3b4c7b4631)
redirects that legacy inbound URL to `/advertise`. The route now joins the
settled preparation entry and does not mount a false live-agency or commercial
workspace. Focused source-contract coverage passed **1 file / 6 tests**; the
specific browser flow and final **8-test** governed Chromium suite passed.
`pnpm check`, static authority **35 files / 295 tests**, `git diff --check`, and
database-authority status passed on fingerprint `a560e9f2971e7676…` at migration
head `0090` with no incomplete attempts. This does not activate payment,
entitlement, publication, provider delivery, or a paid cohort.

### Shared public advertising and Developer preparation-entry follow-up — 2026-09-15

The role-specific public pages alone did not close the anonymous entry surface.
The routable `/advertise` and `/advertise/sell` pages still described paid
Launch Access, manual EFT, finance activation, and public commercial outcomes;
the public Developer page independently offered the same disabled commercial
path. That would have made the controlled pre-payment boundary ambiguous before
an interested stakeholder chose a role.

Commit [`234ca6e4`](https://github.com/Doscoding187/real_estate_portal/commit/234ca6e4f2c4833f5784300a1edb9ee016f2c386)
makes those shared entry surfaces and the Developer role landing agree with the
settled preparation state. Normal public entry now offers only the existing
Agent, Agency, and Developer preparation paths. The retained catalog-driven
commercial surfaces are behind the existing separately authorized enabled state;
no payment, invoice, entitlement, publication, provider, or deployment state
changed.

Evidence is an **8-file / 28-test** focused client/contract run and an **8-test**
governed Chromium pre-payment acceptance. The browser opens `/advertise` and
`/advertise/sell`, verifies that paid claims are absent, checks all three role
targets, and opens each public role landing. Commit
[`9cd6d3e3`](https://github.com/Doscoding187/real_estate_portal/commit/9cd6d3e37163b22eab4aa3a82d90616906c14db0)
also proves the Developer public-entry → registration → email-verification →
pending-organisation → private-draft-save/resume slice, including canonical
owner membership and first-party publisher scope. It does not claim Developer
organisation approval or any paid Developer operation. Those remain separate
requirements before a Developer cohort can be represented as live.

## Advancement rule

Advance only when the current goal:

1. has been implemented where necessary;
2. has appropriate direct evidence;
3. has no unresolved material P0/P1 defect within its boundary; and
4. has been reported to the founder and architectural coordination layer.

The next goal does not begin merely because the prior goal has a code change or
green unit tests.
