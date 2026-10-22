# Distribution Network Product Contract

## Status and source

This is the working product contract reconstructed from Edward's 17 October
2026 direction and the earlier discussion summary supplied in this workstream.
It records agreed boundaries and separates them from commercial and workflow
decisions that are still open. The original discussion transcripts were not
found in the repository, so this document does not claim to be a transcript or
proof of production behavior.

## Purpose

The Distribution Network is a workspace for Property Listify staff, developers,
agents, agencies, and individual introducers to participate in configured
property opportunities. It connects public development inventory, partner
participation, buyer referrals, guided deal progress, and commercial outcomes.
It is broader than a referral link or agent lead marketplace.

The launch anchor is Cosmopolitan Projects. During the pilot, Property Listify
staff publish Cosmopolitan developments and related pages through the admin.
Enquiries submitted from development and SEO pages are captured by Property
Listify and manually sent to Cosmopolitan. Enquiries submitted from the listing
results page go to the selected distribution practitioners. After Cosmopolitan
subscribes and publishes through its own profile, enquiries from its
development and SEO pages go directly to Cosmopolitan. For listing enquiries,
the publisher determines custody regardless of where the listing appears:
Cosmopolitan-posted listings go to Cosmopolitan, while Property Listify-posted
listings go to the selected distribution team. Developer inventory remains
sourced from the developer's publishing authority; a displayed unit or
development is not itself proof of current availability.

## Opportunity ownership boundaries

These opportunity types must remain distinct:

| Opportunity                                                   | Origin and custody                                                                                                                                                                         | Distribution Network role                                                                                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pilot development/SEO enquiry                                 | During the pilot, a consumer submits an enquiry from a Cosmopolitan development page or related SEO page published by Property Listify admin.                                              | Property Listify captures the enquiry and manually sends it to Cosmopolitan. It does not enter the distribution-partner queue.                                                 |
| Cosmopolitan development/SEO enquiry after profile activation | After Cosmopolitan subscribes and publishes through its own profile, a consumer submits an enquiry from a Cosmopolitan development or related SEO page.                                    | Route directly to Cosmopolitan as the developer-owned enquiry.                                                                                                                 |
| Pilot listing-results enquiry                                 | During the pilot, a consumer opens a Cosmopolitan unit from Property Listify Search Results and submits from the development unit page.                                                    | Place the lead in the shared selected-team queue for a Distribution Network manager to assign. Preserve the development, unit, search-results origin, and source attribution.  |
| Cosmopolitan-posted listing enquiry                           | After profile activation, a consumer submits an enquiry about a Cosmopolitan-posted listing, whether it appears on a development page, SEO page, listing-results page, or another surface. | Route to Cosmopolitan. The listing publisher controls lead custody, not the page where the consumer saw it.                                                                    |
| Property Listify-posted listing enquiry                       | After profile activation, a consumer submits an enquiry about a Property Listify-posted listing, regardless of the page or surface where it appears.                                       | Assign the lead to the selected distribution practitioners. Do not make this lead queue available to all general partners by default. Preserve listing and source attribution. |
| Partner-submitted buyer referral                              | An approved partner introduces a buyer to a configured development program, with the buyer's permission.                                                                                   | Track the referring partner, selected program, responsible team, progress, outcome, and applicable program terms.                                                              |
| Future agent-to-agent collaboration                           | One agent has a buyer and another has an eligible property or seller relationship.                                                                                                         | Treat as a separate collaboration capability with explicit participation and commercial terms; it is not an automatic consequence of joining the developer referral program.   |

Selected distribution practitioners form a curated team for leads from
Property Listify-posted listings. General approved partners remain a separate
group and may participate in configured referral programs according to their
permissions; membership in the wider partner network does not automatically
grant access to the selected team's lead queue. These listing leads enter a
shared team queue. A Distribution Network manager assigns each lead to a
practitioner; assignment is not automatic or round-robin.

The system must distinguish **discovery surface**, **capture surface**,
**inventory publisher**, **custody**, **work assignment**, and **commercial
entitlement**. During the pilot, the verified discovery journey determines
whether an enquiry is handled through the Cosmopolitan manual handoff or the
selected practitioner team. The discovery surface may differ from the form's
capture surface: a Search Results unit opens a development unit page, and both
that page and SEO/development pages use the same enquiry form. After
Cosmopolitan profile activation, the listing publisher determines custody for
listing enquiries, regardless of discovery or capture surface. A lead's source
alone does not decide who may contact it or who earns a payment.

| Phase                                 | Verified journey and publisher                                                                                               | Custody and handling                                                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Cosmopolitan pilot                    | Development or SEO enquiry form on Property Listify admin-published inventory.                                               | Property Listify retains platform custody; its operations team manually sends the enquiry to Cosmopolitan.               |
| Cosmopolitan pilot                    | Search Results unit card, followed by the same development-unit enquiry form, on Property Listify admin-published inventory. | Property Listify retains platform custody; place the enquiry in the selected team's shared queue for manager assignment. |
| After Cosmopolitan profile activation | Direct development/SEO enquiry for a Cosmopolitan development, or listing enquiry for a Cosmopolitan-published listing.      | Route to Cosmopolitan under developer custody.                                                                           |
| After Cosmopolitan profile activation | Listing enquiry for a Property Listify-published listing, regardless of discovery or capture surface.                        | Property Listify retains platform custody; place the enquiry in the selected team's shared queue for manager assignment. |

For the pilot, only a server-verifiable Search Results journey may move a
platform-published development enquiry into the selected team queue. Bind that
journey context to the canonical development and unit. If it is absent or
invalid, retain the normal Property Listify operations route for manual
Cosmopolitan handoff. This context proves attribution only; it does not change
publisher, custody, partner eligibility, consumer permission, or payout
eligibility. Once Cosmopolitan publishes through its own first-party profile,
that publisher authority overrides the journey context.

For a Property Listify-posted listing lead routed to the selected team, primary
lead custody remains with Property Listify. The shared Distribution queue is a
controlled work-assignment layer: a manager assigns one authorized practitioner
to handle the lead. It must not be implemented by disguising the team as the
listing publisher or by broadening access for every approved partner. Record the
queue item and the assignment history separately from the primary custody
delivery so routing, ownership, assignment, and notification remain auditable.

## Partner workspace journey

The intended journey should guide a first-time introducer as well as an
experienced agent:

1. Apply or authenticate as the appropriate partner type.
2. See only the opportunities and programs available to that partner.
3. Review the selected program's plain-language information sheet, privacy
   notice, required consent documents, and referral terms before entering the
   prospect's identifiable details.
4. Obtain the prospect's signed authorization to share the referral details
   with the named parties for the stated purpose. Record the document versions
   and signature evidence with the referral.
5. Collect and attach the prospect's identity evidence through a private,
   access-controlled document flow before proceeding with the referral.
6. Record the buyer's needs and show indicative affordability and development
   matches. An estimate is not a lender's approval or a guarantee of
   qualification.
7. Offer a separate, clearly explained credit-report authorization. A credit
   report request must remain blocked until the required authorization is
   recorded and the platform has an approved provider and lawful operating
   path.
8. Submit the referral and guide the partner through the responsible team's
   next action, required information, outcome, and any program-defined payment
   status.

The information and privacy documents are program-configurable and versioned;
their purpose, recipient and required signatures must be visible before the
prospect signs. Property Listify's baseline privacy notice and permission to
share a prospect with the selected program are not silently replaced by a
developer's custom workflow. The product's requirement to record signed
permission for a partner referral is a business rule; it is not a claim that
consent is the only lawful basis for every kind of personal-information
processing.

The prospect's identity document is identity evidence, not permission to share
their information and not authorization to request a credit report. Referral
sharing, ID verification and credit-report authorization are separate gates.
Edward's intended launch journey includes an ID attachment before referral
work proceeds; the minimum acceptable identity evidence, access roles and
retention rule still need approval before documents can be accepted. Private
identity and consent files belong to the Distribution referral record, not to
a generic public enquiry or Prospect Engine profile. Restrict them to the
assigned, authorized team and retain or delete them under an approved retention
rule.

The interface should use plain language and explain one next action at a time.
It must not assume that every partner has property-sales experience.

## Referral payout language and legal boundary

Use **referral payout** in partner-facing and manager-facing product copy. Keep
the existing `commission*` fields, API procedures, stage values, and storage
names as implementation details until a separately reviewed data migration is
approved. This vocabulary choice is for product clarity; it does not
characterize the arrangement or avoid legal requirements. The [Property
Practitioners Act](https://www.gov.za/sites/default/files/gcis_document/201910/42746gon1295.pdf)
states in section 48(6) that the section applies irrespective of the label a
person or entity is described by, and section 56 addresses remuneration or
other payment for specified practitioner acts. A South African legal reviewer
must assess the actual activities, partner roles, and payment arrangements,
including individual introducers, before the program is enabled or pays anyone.

The current percentage model also lacks a reliable calculation basis. The
partner-program configuration stores a percentage but no basis; referral
submission currently copies an affordability assessment's indicative purchase
price into `commissionBaseAmount`, and the payout service calculates the
percentage from that amount. This is not the eventual contract or transfer
price. The manager setup now warns about the missing basis, but runtime payout
calculation is not yet blocked. Do not present a percentage as a settled
amount or enable it for a live program until the agreed basis is represented in
program terms and the calculation uses the right transaction evidence.

## Developer-specific configuration

The engine must support different developer programs without assuming that all
developers use the same:

- eligible partner roles and access rules;
- buyer information and assessment requirements;
- referral acceptance and lead-handling process;
- required documents and workflow steps;
- Property Listify's baseline information/privacy documents and ID evidence,
  plus developer-specific application documents and verification steps;
- referral payout model, currency, eligibility, or payment milestone.

Program terms and workflow configuration should be shown before a referral is
submitted and preserved with the referral so later program edits do not
silently rewrite its recorded terms. Exact rates, eligibility conditions,
contract language, and settlement triggers remain developer and business
decisions; this contract does not invent them.

Developer-specific documents, additional verification rules, authorized
recipient groups, and credit-report availability may vary by program.
Property Listify's baseline signed information/permission documents and ID
evidence remain part of the intended referral gate. A developer can add
requirements, but must not bypass the platform's permission, privacy, secure
storage, or audit controls.

## Lead Passport: provenance and commercial record

Preserve the opportunity's origin through reassignment and progression; do not
replace the referrer or source with the latest handler. The Lead Passport
should identify, where applicable:

- the verified discovery surface and the form/capture surface;
- the canonical development, unit, or listing and its persisted publisher;
- the original source, campaign, and referring partner;
- the custody owner, responsible team, current assignee, and assignment history;
- the program terms shown at referral time;
- progression and outcome evidence; and
- any referral payout decision and settlement evidence.

Correcting locked attribution should be an audited action. The Passport records
provenance; it does not itself grant permission to contact a prospect or an
entitlement to a referral payout.

Attribution credit, permission to work a lead, operational assignment, and
eligibility for a referral payout are separate facts. Access to buyer information
must follow role, custody, and consent rules.

For a partner-submitted referral, preserve an auditable record of the signed
information/permission document versions, who signed and when, who captured
the evidence, the stated sharing purpose and recipients, verification status,
and any withdrawal or superseding authorization. Credit-report authorization
must be a separate evidence record tied to the relevant prospect and request;
a partner's Boolean checkbox alone is not sufficient product evidence. Keep
identity-file access, consent evidence and any eventual credit-report result
out of broad partner lists and general-purpose document links.

## Privacy and credit-check design input

This contract records a product workflow, not a legal opinion or approved
consent wording. The [Protection of Personal Information Act](https://www.justice.gov.za/legislation/acts/2013-004.pdf)
sets conditions covering lawful processing, minimality, purpose, openness,
security, and data-subject participation. It also recognizes multiple bases
for processing; where consent is the basis, the responsible party bears the
burden of proving it and a data subject may withdraw it. The [Information
Regulator's approved Credit Bureau Association code](https://inforegulator.org.za/wp-content/uploads/2022/10/Code%20of%20Conduct%20for%20the%20Credit%20Bureau%20Associaltion%20%28CBA%29.pdf)
sets sector rules for its member credit bureaus; its existence does not by
itself establish Property Listify's or a partner's authority to request a
report.

The product consequence is to preserve separate, purpose-specific evidence for
referral sharing, identity verification, and any credit-report request, then
have the approved business process and wording reviewed before connecting a
real bureau. An ID copy by itself is not evidence of permission to share or a
credit-report authorization.

## Current repository evidence and gaps

### Current worktree implementation status

This worktree adds a first selected-team listing queue implementation. Three
additive migrations create a curated practitioner roster, one queue item per
lead, and append-only assignment events. The admin can activate, pause, or
remove an approved agent from the selected team. A Distribution manager sees
the shared queue, assigns or reassigns a lead, returns it to the unassigned
queue, closes or reopens it with an audit note, and reviews its event history.
An assigned practitioner can work the lead through the existing agent leads
workspace. Accounts with multiple agent profiles are excluded from assignment
because the current workspace does not resolve that identity unambiguously.

Queue assignment does not change primary lead custody or publisher. The queue
row is separate from the canonical lead-delivery row. Only selected-team
members with an active assignment can see a queued lead through the agent
workspace; general referral partners do not receive access through this path.
Reopening a closed item clears its former assignment and returns it for manager
assignment.

The Search Results unit-card path carries a short-lived, server-signed context
bound to the canonical development and unit. A platform-published development
unit enquiry enters the selected queue only when that context validates. Direct
development and SEO enquiries without the context keep the existing Property
Listify operations handoff. First-party developer custody takes precedence.
Property Listify platform-published listing enquiries enter the selected queue
regardless of the page from which the consumer reached the listing.

The new path is guarded by `FEATURE_DISTRIBUTION_SELECTED_TEAM_QUEUE`, which
defaults to false independently of `FEATURE_DISTRIBUTION_NETWORK`. The new
migrations are present in this worktree but have not been applied to a database
or deployed. Enable the queue only after the migrations are applied and the
target schema is verified. Partner referral intake is fail-closed in this
worktree. A super-admin can now create program-specific policy drafts covering
document versions and text, purpose, named recipients, signature method,
identity-evidence rules, retention events, optional credit-report authorization,
and guided process steps. Publishing validates completeness, stores a content
digest and approval-record reference, and retires the prior active version.
This records configuration; it is not a legal approval. Referral intake remains
paused until the private evidence workflow exists. No migrations have been
applied or deployed. Private ID evidence, approved policy values, referral-time
policy snapshots, and payout basis remain open work.

### Existing engine and remaining product gaps

The current code already contains partner applications and access controls,
development programs, affordability assessments and match snapshots, referral
deals, manager assignments, document checklists, payout records, and
public developer inventory. The developer public enquiry path is distinct from
the partner referral submission path.

The repository also contains configurable program workflow tables that have no
runtime consumers in the current audit (`distribution_program_workflows` and
`distribution_program_workflow_steps` are defined in
`drizzle/schema/distribution.ts`, while runtime progression remains based on
the fixed `DISTRIBUTION_DEAL_STAGE_VALUES` state machine). Program payout
milestones do not map consistently to the fixed payout-trigger stages. Milestones without a
system evidence check now remain blocked from ordinary payout readiness; a
super administrator can record a manual settlement only after required
documents are verified and with a justification note. The manager checklist
shows the developer's configured milestone notes. Paid payout records also
require a deal at the payout stage and an actual payment or receipt reference;
the system no longer fabricates a `DIST-PAYOUT-*` reference. Distribution is
not a typed destination in the shared lead-delivery service. Public marketing
previously claimed fixed qualification and payment outcomes that the
configured program data did not establish; those claims are being removed.
Although partner-facing language now says referral payout, the existing
`commission*` storage/API fields and the percentage calculation described
above still need commercial and legal review.

The canonical custody model resolves a persisted first-party developer
publisher to that developer, while a Property Listify platform-reference
property resolves to manual Property Listify operations. The shared
`lead_deliveries` recipient types remain agent, agency, developer, and manual;
the selected team is modeled as a separate work queue rather than a new
lead-custody recipient. The existing developer lead-assignment gate continues
to handle developer leads marked distribution/referral. The selected listing
team is a separate curated roster and assignment path.

The Search Results service creates development unit cards linking to
`/development/:slug/unit/:unitTypeId`; those cards still do not collect
enquiries. The unit page and SEO/development pages use the same enquiry form.
The current worktree adds a signed token to Search Results unit-card links and
passes it through the unit and affordability journey. The server checks its
signature, expiry, development, and unit before placing a platform-published
unit enquiry into the selected queue. Client-supplied `source`, `leadSource`,
`sourceSurface`, and `referrerUrl` remain non-authoritative. The signed token
records that a Search Results link was issued; it is not consumer permission,
publisher authority, lead custody, or payout eligibility. After profile
activation, the persisted publisher controls custody for listing enquiries
regardless of surface.

The live partner submission path previously accepted buyer contact details
before any signed information or permission evidence was verified. The
affordability accelerator also stored a prospect's name, phone, gross income,
deductions, and deposit before checking signed program information or
referral-sharing permission. Its credit-check placeholder accepted a
partner-submitted Boolean and timestamp; it did not call a bureau or attach
signed authorization evidence. The post-referral checklist stores general file
URLs and cannot hold identity documents.

This worktree now fails closed at the UI, router, and service boundaries for
new affordability assessments, referral submissions, and credit-check
placeholder requests. The partner pages show a paused state, and the existing
server actions return a precondition error before writing assessment or deal
data. The older `distributionQualificationRouter` is not mounted, and its
assessment/referral entry points also have the guard in case they are
reconnected. This is a temporary safety gate, not the completed evidence
workflow. Policy releases are program-specific and immutable after publishing;
editing a published policy requires a new draft. Readiness reports whether a
policy is published, whether a private evidence store is configured, and
separately reports that the end-to-end evidence workflow is unavailable, so
publishing a policy or configuring storage cannot make the program ready for
partner referrals. The code now includes a version-pinned intake-session
schema with no buyer contact fields, private evidence metadata and review
states, PII-free lifecycle events, and an expiry/deletion worker. The worker
checks the exact schema capability before querying it, expires only draft
sessions whose pinned deadline has passed, and deletes evidence only for
withdrawn, closed, or expired sessions after their recorded retention deadline.
Deletion claims have a lease, retries are idempotent, and successful deletion
clears the storage key, file hash, MIME type, and size while keeping a minimal
audit event. Submitted referrals are not eligible for deletion.

These are code and schema foundations, not a live intake flow. The 0120–0122
migrations have not been applied; the worktree database was unavailable during
this change. The retention scheduler is opt-in and defaults to disabled; when
enabled, it waits for the canonical tables before processing anything. No route
creates an intake session or uploads/reviews evidence, and
the existing referral, affordability, and credit-report entry points remain
closed. No prospect documents are currently accepted or processed. The
published policy stores an approval reference but does not prove that the
documents, recipient roles, or retention rules received legal approval. Exact
retention settings and transitions for active, withdrawn, and closed referrals
remain product/legal decisions before any upload workflow can open.

This gap also intersects with the [Prospect Privacy And Status
Contract](./stakeholder-domain-map/prospect-privacy-and-status-contract.md),
which excludes storing credit, bank, or identity documents in the first
Prospect Engine slice. The Distribution Network must keep any approved
document handling inside its own private referral boundary rather than
expanding generic prospect storage.

This is evidence of existing code, not confirmation that the end-to-end journey
is ready for launch.

## Launch boundary and open decisions

The first product slice should support the Cosmopolitan Projects anchor program
without merging pilot development/SEO enquiries sent to Cosmopolitan, pilot
listing-results enquiries placed in the shared selected-team queue for manager
assignment, Cosmopolitan-posted listing enquiries, Property Listify-posted
listing enquiries, and partner-submitted referrals. Record both the enquiry
surface and listing publisher so routing remains correct when the same listing
appears in several places. Define the team's contact and reassignment
permissions and how the consumer is informed.

## Recommended implementation order

1. Extend the new queue path into a complete Lead Passport with auditable
   discovery and capture surfaces, persisted publisher, custody owner, and
   partner referral attribution where applicable. The queue currently records
   its coarse routing source and assignment history; it is not a complete
   provenance model.
2. Complete and safely roll out the Cosmopolitan anchor path: apply and verify
   the queue migrations before enabling the dedicated feature flag; confirm
   pilot development/SEO enquiries stay with Property Listify operations for
   manual Cosmopolitan handoff; confirm Search Results unit enquiries enter
   the selected team's queue; then confirm first-party publisher custody
   overrides the journey context and listing leads route by publisher,
   regardless of surface. Do not trust client source labels.
3. Approve each program's signed information/permission documents, named
   recipients, allowed ID evidence, signature method, and retention schedule.
   Then build authenticated session creation, private upload and review, and
   consent-gated collection of buyer details on top of the version-pinned
   session and deletion foundation. Keep new submissions paused until that
   complete path is ready.
4. Connect the approved workflow to affordability and the existing deal
   progression, with affordability beginning only after required evidence is
   verified. Keep real credit-report requests off until an approved provider
   and separate evidence-backed authorization flow exist.
5. Reconcile outcomes and referral payouts only against the active program's
   recorded terms and verified evidence.
6. Add agent-to-agent collaboration as a later capability with its own
   ownership, consent and commercial rules.

The following remain open and must not be guessed in code or public claims:

- partner eligibility and approval criteria for each developer program;
- how verified discovery and capture surfaces are represented alongside the
  listing publisher and custody owner in the complete Lead Passport;
- which managers can access and assign from the shared team queue, and what
  contact, reassignment, and response rules apply;
- the assigned team's contact process and response commitments;
- duplicate buyer/referral policy and how disputes are resolved;
- approved prospect information and privacy documents, named recipients,
  signature method, minimum acceptable ID evidence, and access roles;
- approved expiry for abandoned pre-referral uploads and the retention/deletion
  schedule and trigger for submitted, withdrawn, and closed referrals;
- credit bureau/provider, permissible purpose, authorization wording and
  evidence, request/response handling, report access, and dispute process;
- commission rates, eligible outcomes, approval evidence, and settlement
  timing;
- the legal status and permitted activities of each paid partner role, and
  the calculation basis for any percentage payout;
- the evidence needed when a developer selects a custom payment milestone;
- whether and when agent-to-agent collaboration enters the launch scope.

The public entry point remains `/distribution-network`. Advertising products and
campaign purchase routes remain separate from the operational partner and
referral workspace.
