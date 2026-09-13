# Agency Journey Closure — Sequential Goals

| Field                | Record                                                                                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status               | **Working implementation authority.** Goals 1–3 are verified on the task branch; no goal is authorized as a protected release, payment activation, provider operation, or production deployment.    |
| Architectural source | [Agency Journey Senior Architecture Review](14-agency-journey-senior-review.md)                                                                                                                     |
| Purpose              | Convert the senior review into small, sequential, evidence-led implementation goals for the first commercially usable agency journey.                                                               |
| Cohort boundary      | One small agency in one geography is the proposed first operating cohort. Land, developer paid operation, and independent-agent launch claims remain outside this cohort until separately accepted. |

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

- **Land containment:** Land is deferred from the first paid cohort. Direct
  routes, APIs, review and public-publication boundaries must enforce that
  disposition before a launch claim; navigation hiding alone is insufficient.
  See [LRC-LAND-001](03-launch-register.md#lrc-land-001).
- **Support and disclosures:** assisted onboarding must end in a monitored
  contact channel, with final launch-specific terms and privacy information.
  See [LRC-SUPPORT-001](03-launch-register.md#lrc-support-001).
- **Protected release evidence:** Azure/provider credentials, database grants,
  restoration, hosting connectivity, capacity, worker supervision and a
  deliberately enabled commercial path remain separately required before any
  paid launch. None is authorized by this tracker.

## Milestone reviews

Use senior architectural review at these points, rather than asking it to
re-litigate every individual implementation choice.

| Milestone | Goals | Review question                                                                                                      | Status                  |
| --------- | ----- | -------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| M1        | 1–2   | Did implementation establish the correct agency identity and membership authority, or expose a deeper model problem? | READY FOR SENIOR REVIEW |
| M2        | 3–5   | Does canonical membership now connect commercial ownership, listing, review, and publication without contradiction?  | NOT STARTED             |
| M3        | 6–8   | Does publication connect correctly to public discovery, enquiry, custody, and CRM operation?                         | NOT STARTED             |
| M4        | 9–10  | Can a real agency operate safely, with observable recovery and a bounded launch decision?                            | NOT STARTED             |

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

**Status:** NOT STARTED

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

**Status:** NOT STARTED

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

**Status:** NOT STARTED

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

**Status:** NOT STARTED

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

**Status:** NOT STARTED

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

**Status:** NOT STARTED

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

**Status:** NOT STARTED

## Advancement rule

Advance only when the current goal:

1. has been implemented where necessary;
2. has appropriate direct evidence;
3. has no unresolved material P0/P1 defect within its boundary; and
4. has been reported to the founder and architectural coordination layer.

The next goal does not begin merely because the prior goal has a code change or
green unit tests.
