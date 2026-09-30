# Agency Journey Senior Architecture Review

| Field                              | Record                                                                                                                                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status                             | **Reasoning record.** The supplied assessment below is preserved as the architectural source for the agency-journey closure workstream.                                                                           |
| Reviewed candidate                 | \`6e208d8a\`, including source changes through \`c8c35fde\`.                                                                                                                                                      |
| Review evidence stated by reviewer | 173 tests across 22 files, database-authority inspection, and two read-only counterexample probes.                                                                                                                |
| Boundary                           | This records the supplied independent review. It does not turn its local/static evidence into production verification, authorize commercial activation, or replace the protected-release evidence still required. |
| Working implementation sequence    | [Agency Journey Closure — Sequential Goals](15-agency-journey-closure-goals.md)                                                                                                                                   |

## Preservation rule

The following supplied senior assessment is the reasoning record for this
workstream. Preserve its substance and its stated evidence boundaries. The
sequential-goals document translates it into bounded implementation work; it
does not supersede, dilute, or silently reinterpret this assessment.

## Supplied senior assessment

Property Listify is not ready for paying customers yet. It has substantial
working foundations, but there are concrete breaks between membership,
commercial entitlement, public visibility and lead access. The remaining work
is therefore more than collecting the four evidence areas listed in the
closure report.

The next implementation should concentrate on one complete agency-to-agent
operating journey, contain Land, and then prove a tightly scoped paid launch.
It should preserve the broader Property & Home Lifestyle OS direction while
narrowing what the first customers are promised.

The closure candidate at \`6e208d8a\`, including source changes through
\`c8c35fde\`, was reviewed. The review independently reran 173 tests across 22
files, checked database authority, and executed two read-only counterexample
probes. The local database remained worktree-owned, schema-congruent at 0090,
with no incomplete attempts. The entire reported suite was not rerun, there
was no new browser acceptance run, no repository file was changed, and no
protected system was accessed.

The [MVP closure report](../database-transition-and-launch/mvp-closure-report.md)
remains useful evidence, but its platform-wide containment conclusion needs
qualification.

### 1. P0 — Agents can supply an agency affiliation that influences commercial ownership

The authenticated agent profile endpoint accepts \`agencyId\`, and
\`saveProfile\` writes it directly. Listing creation subsequently derives agency
attribution from the user or agent profile. Its membership check rejects an
inactive membership when a row exists, but permits attribution when no
membership row exists.

Publication resolves the commercial owner from those persisted agency claims.
The isolated probe confirmed that it resolves an agency owner without querying
membership.

This establishes an authority defect in the implementation. A complete
unauthorized public publication over HTTP was not demonstrated; downstream
public custody checks provide additional restrictions. Those restrictions do
not make self-assigned tenant attribution acceptable.

Sources:

- profile input:
  \`server/routes/agentOnboarding.ts:24\`
- profile mutation:
  \`server/services/agentOnboardingService.ts:305\`
- listing attribution:
  \`server/db.ts:1993\`
- commercial-owner resolution:
  \`server/services/listingPublicationEntitlementService.ts:597\`

Required change: establish agency affiliation exclusively through authorized
membership transitions. Remove the missing-membership allowance and validate
membership at attribution and publication boundaries. Cover forged
affiliation, absent membership, suspension, removal and legitimate
invitations.

### 2. P1 — A paid agency’s agent does not have a consistent path from publication to discovery and lead handling

Listing publication supports inheriting the agency’s entitlement. However, the
general plan projection treats an ordinary agent as an individual billing
owner. The agent lead page then disables its queries and locks the CRM when
that individual entitlement says \`canReceiveLeads: false\`.

Public recipient eligibility introduces another mismatch: it accepts an
approved agent with either a verification badge or an individual paid
entitlement. The subscription loader does not include the agency’s paid
entitlement. Consequently, an approved agency member without the optional
badge or personal subscription can pass agency-backed publication checks yet
fail public recipient eligibility.

These are strongly supported implementation contradictions, not merely missing
screenshots. They also explain why fixtures using verified agents can pass
while a normal newly approved agency member encounters problems.

Sources:

- plan-owner selection:
  \`server/services/planAccessService.ts:281\`
- CRM gate:
  \`client/src/pages/AgentLeads.tsx:233\`
- public-entitlement loading:
  \`server/services/publicPropertyEligibilityService.ts:423\`
- recipient eligibility:
  \`server/services/publicLeadCustodyService.ts:108\`

Required change: derive workspace capabilities and recipient eligibility from
current membership and the appropriate commercial owner. An agency employee
should not need a second individual purchase to handle the agency’s assigned
enquiries.

Also separate permission to receive new commercial opportunities from
permission to access already-custodied leads. The current screen-wide gate can
obstruct continued handling after entitlement expiry.

### 3. P0 containment / P1 launch scope — Land has an independent route to public visibility without commercial gating

Land submission and review use their own lifecycle. Approval activates the
marketing authority and asset and sets the listing to approved. Public Land
queries accept that state. Neither the approval path nor public eligibility
checks the commercial activation policy or publishing subscription.

A read-only probe returned public eligibility true while commercial activation
was false. The existing Land approval test also succeeds without subscription
evidence.

This requires an authorized reviewer; it is not anonymous publication.
Nevertheless, the claim that preparation-only operation consistently prevents
marketplace publication is contradicted by this path.

Sources:

- Land approval:
  \`server/services/landWorkflowService.ts:384\`
- public eligibility:
  \`server/services/landPublicService.ts:118\`

Hosted navigation already controls supplemental journeys, including Land, but
direct routes and APIs remain mounted. Navigation hiding does not establish
backend containment.

### 4. P1 — Several proposed assisted fallbacks terminate at a placeholder contact page

Developer team management deliberately offers assisted provisioning. Rejected
or suspended agents also need support. Yet \`/contact\` leads to descriptive
text and links back to advertising and referrals, rather than a usable contact
mechanism.

Terms and privacy routes likewise contain drafting instructions and placeholder
descriptions. The enquiry form links customers to these pages.

This is an implementation/content gap. It does not require a support platform
or an extensive legal engineering project: provide a monitored contact channel
and finalized launch-specific terms and privacy information.

Sources:

- developer-team fallback:
  \`client/src/components/developer/TeamManagement.tsx:19\`
- contact destination:
  \`client/src/pages/NavLandingPage.tsx:539\`
- terms/privacy placeholders:
  \`client/src/pages/NavLandingPage.tsx:362\`

### Current supported slices and their limits

| Journey              | What exists and is supported                                                                                                                                 | What prevents a complete launch claim                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent                | Registration/verification/recovery have recorded local HTTP evidence. Professional setup, approval, draft preparation and workspace routing exist.           | Membership-authority defect; agency-entitlement mismatch; full browser publication-to-follow-up journey unproven.                                  |
| Agency               | Setup/resume, branding, roster operations, listing preparation, review integration and lead workspaces exist.                                                | Assigned-agent commercial/public/CRM decisions disagree. Invitation, revocation and reassignment need connected acceptance.                        |
| Developer            | Organisation/publisher identity, pending-profile draft access, draft editing, review queue, publication and lead operations exist.                           | Complete enabled commercial journey unproven. Team management is explicitly assisted, not self-service.                                            |
| Public property user | Search/detail eligibility checks connect approved source inventory, public projections and recipient custody. Enquiries use stable request IDs and consent.  | Newly authored inventory has not been demonstrated through the complete browser journey on this candidate; agency recipient mismatch matters here. |
| Land                 | Dedicated parcel, marketing authority, evidence, review, disclosure, geography and enquiry model exists.                                                     | Commercial-containment defect; complete author/reviewer/consumer journey unproven.                                                                 |
| Commercial           | Canonical invoices, payment proofs, finance review, activation and lifecycle functions exist. Preparation containment is well supported for those functions. | Deliberately disabled in normal runtime; enabled customer journey and protected release unproven.                                                  |
| Leads                | Atomic capture/custody, replay handling, recipient workspaces, delivery records and admin correction tools exist.                                            | Customer-access mismatch; alert delivery and recovery need explicit operating acceptance.                                                          |

Account access, private-draft persistence and durable enquiry capture are
completed local slices within their demonstrated boundaries. No stakeholder’s
entire registration-to-paid-operation journey should be signed off as complete.

### Strengths to retain

Residential listing review is connected to publication. Approval runs
transactionally, rechecks the listing owner’s entitlement, creates the public
projection and synchronizes media. Private revisions retain a review boundary.
This is substantial implementation, even though the closure run stopped before
proving it through the browser. Publication implementation:
\`server/db.ts:3575\`.

Developer review correctly distinguishes approval from public visibility: an
approved development can remain private when Launch Access is unavailable. Its
lifecycle includes changes requested, resubmission and self-review denial. That
distinction should remain explicit in the UI. Developer review:
\`server/services/developmentService.ts:3205\`.

Lead handling also deserves a more precise assessment than “delivery
unverified.” An accepted customer enquiry and its primary custody obligation
commit together. Internal CRM custody can therefore be a real delivery
channel; external email is a separate outcome. Capture transaction:
\`server/services/publicLeadCaptureService.ts:1588\`.

The current agent email alert runs after commit without a durable retry
obligation. The worker executable only registers publisher email dispatch, and
expired claims become unknown to avoid unsafe duplicate sends. That is sensible
failure containment, but the operator still needs a demonstrated reconciliation
process. An admin audit/correction surface already exists; building another
dashboard is not the immediate need. Worker dispatch:
\`scripts/runLeadDeliveryWorker.ts:14\`; claim recovery:
\`server/services/leadDeliveryService.ts:818\`; admin operations:
\`server/\_core/systemRouter.ts:404\`.

For first customers, internal CRM delivery with a staffed
notification/escalation procedure is acceptable. If dependable email alerts
are part of the sold promise, implement durable notification obligations and
prove their recovery before making that promise.

### Land disposition

Land should be deferred from the first paid cohort unless the founder has
actual Land customers waiting.

Its intended journey is coherent: author a parcel-backed listing, declare
marketing authority, supply evidence and disclosures, undergo specialist
review, search within one governed geography, inspect the Land detail, then
enquire to the authorized recipient. The geography/classification
implementation has meaningful coverage; the relevant tests were rerun
successfully.

But that journey adds specialist review and operating obligations. It is not
simply another residential filter. Preserve the four public classifications and
existing geography contract. For initial launch, enforce its deferred
disposition at routes, APIs and publication boundaries. If Land is commercially
necessary now, give it a separate acceptance slice and commercial policy before
exposure.

### Defects, verification gaps, and deferrals

The distinction between defects and evidence gaps should drive remaining work:

- Fix before exposing more outside users: the self-assigned agency-affiliation
  path and Land’s preparation-only containment exception.
- Fix before selling the agency journey: inherited agency capability across
  publishing, public discovery, recipient eligibility and CRM access.
- Complete before paid launch: usable support, launch-specific customer
  disclosures, and the deliberately enabled commercial path.
- Prove rather than presume broken: browser media upload,
  submission/rejection/resubmission/publication, production mail, worker
  supervision, operator recovery, protected database grants, restoration and
  hosting connectivity.
- Defer: developer self-service team administration, broad lifestyle/services
  expansion, advanced analytics, additional Land classifications, automated
  CRM integrations and general lint cleanup.

Protected Azure/provider/capacity evidence remains insufficient in this review.
Retain the required credential, integrity and restore checks. Tie performance
admission to the selected launch cohort and hosting configuration. The existing
24-hour test specifically addresses sustained operation and burstable capacity;
changing that requirement needs an explicit revised decision, not an assumption
that a small cohort makes it unnecessary.

### Most valuable next implementation assignment

Close the agency membership → commercial entitlement → publication → public
enquiry → assigned-agent CRM journey, with Land contained and payment activation
still controlled.

Its acceptance criteria are concrete:

1. A verified agency owner completes setup and receives approval.
2. An invited agent joins through canonical membership, with no individual
   subscription and no optional verification badge.
3. That agent prepares a listing with actual uploaded media and confirmed
   geography.
4. In an isolated enabled candidate, a finance reviewer verifies the canonical
   payment and grants the intended fixed-term access exactly once.
5. Listing rejection produces usable feedback; correction and resubmission
   preserve the draft.
6. Approval makes the same inventory discoverable by geography, with matching
   detail and media.
7. An anonymous enquiry produces one durable lead; replay produces the same
   lead.
8. The assigned agent and agency administrator can open it, record contact and
   schedule follow-up. An unrelated tenant cannot.
9. Membership removal/reassignment and subscription expiry produce the
   intended access changes without losing custody or silently abandoning
   existing enquiries.
10. A deliberately failed alert or interrupted delivery produces an
    actionable, auditable recovery outcome.

Run the equivalent independent-agent variation before advertising
independent-agent support. Require a separate developer variation before
presenting developers as a fully supported paid launch audience.

Prepare the activation change as an explicit release candidate. The current
Vitest exception permits paid-state fixtures while normal runtime remains
disabled; passing those tests does not demonstrate that a customer can activate
commercially.

If first revenue were the immediate objective, recruit one small agency in one
geography as the initial operating cohort, finish that journey, complete
protected-release verification, and personally observe its first listings and
enquiries.

Measure time to first published listing, enquiry visibility, time to first
response, unresolved lead exceptions and willingness to continue paying. Those
observations should determine the next OS capabilities. The immediate
architectural objective is to make the existing systems agree on who can act,
who pays, what becomes public, and who must follow up.
