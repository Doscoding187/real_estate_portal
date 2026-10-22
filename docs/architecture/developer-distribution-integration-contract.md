# Developer Engine and Distribution Network Integration Contract

## Status and purpose

This is the integration contract for the Developer Engine and Distribution
Network. It records the shared product boundary and the current integrated
implementation state. The integration worktree is the review surface; no
database changes are considered applied or deployed by this contract.

The product should feel like one workspace to developers and their sales
partners while keeping one authority for each business fact. Property Listify's
destination is a native, developer-optimized workspace that can run the core
development sales operation itself. Bitrix24, another CRM, spreadsheets, or a
custom system may remain connected during adoption, but they do not define the
product or become a permanent prerequisite.

CRM coexistence is a migration path, not the end state. For each developer and
workflow, the operating authority must be explicit: either Property Listify or
the connected system owns that record at that stage. Integrations may import,
link, or synchronize specifically agreed facts; they must not create competing
records or silently dual-write inventory state. A developer must also be able
to use the native Property Listify workflow without configuring an external
CRM.

The native workspace should help a development team prepare phases, control
marketable inventory, find the responsible people and current resources,
receive and coordinate prospects, progress sales work, resolve failed deals,
and understand results. This is a focused property-development workspace, not
a generic CRM clone. The Lead and Prospect engine owns prospect identity,
consent, and direct lead capture under its contract; Distribution owns partner
programs, referral records, entitlement, attribution, and payout. A qualified
partner referral can be handed into the developer's sales workflow without
giving Distribution authority to change inventory.

## Ownership boundaries

| Domain fact | Authority | Distribution Network role |
| --- | --- | --- |
| Development, phase, extension, archive state | Developer Engine | Read and present the permitted development context |
| Canonical allocation, sale/rent mode, availability, asking-price projection | Developer Engine | Consume the current partner-safe projection; never infer availability from a CRM stage or referral-program status |
| Developer team responsibilities and partner-visible contacts | Developer Engine | Present only contacts explicitly marked partner-visible and currently in scope |
| Sales resources | Developer Engine owns the share decision and document association | Present only explicitly shared resources, subject to partner access |
| Developer-side sales coordination and inventory outcomes | Developer Engine | Hand off qualified partner referrals through the agreed workflow; never write inventory state |
| Direct marketplace prospect identity, consent, and lead capture | Lead and Prospect Engine | Carry attribution or referral linkage only where authorized |
| Partner and agency identity, program eligibility, referral terms | Distribution Network | Authoritative |
| Partner referral intake, attribution, and payout | Distribution Network | Authoritative; referral state does not change inventory by itself |

`developmentId` and persisted publisher identity are the shared project keys.
The Distribution `programId` is a referral-program key; it is not a phase,
release-lot, inventory, or listing identifier. A selected-practitioner queue
assignment is a lead-work assignment, not an inventory reservation or a grant
to publish a unit.

## Shared partner-facing projection

The Developer Engine exposes one server-side, partner-safe
`DevelopmentSalesProjection` for a canonical development ID in
`server/services/developmentSalesProjectionService.ts`. Distribution must
consume this contract rather than query development tables or recalculate
availability and prices itself. The projection carries:

- canonical development identity, publisher, approved marketing content, and
  source freshness/revision;
- developer-controlled project and campaign visibility;
- current available quantities and asking-price ranges separately for sale
  and rent, with explicit price bases;
- contacts explicitly marked partner-visible and scoped to the development or
  a selling, unarchived phase; and
- identifiers for resources explicitly shared by the Developer Engine, with
  retrieval delegated to an authorization-aware download path.

The contract is internal to server-side consumers; it is not a partner-facing
endpoint. Distribution still has to apply its actor-specific development or
program entitlement before returning any projected contacts, resource
identifiers, terms, or inventory details.

`inventory.phaseScope` is a fail-closed signal for the inventory source:

| Value | Meaning |
| --- | --- |
| `phase-released` | Itemized rows are counted only from available inventory in selling, unarchived phases. |
| `development-wide` | Aggregate counts are usable because the development is selling and has no phase ambiguity. |
| `unscoped-hidden` | No current inventory is projected. Do not reconstruct availability from legacy totals or another table. |

For each mode present in `inventory.modes` and each unit-type `modes` entry,
`availableCount`, `priceFrom`, and `priceTo` describe current priced stock;
`priceBasis` is `purchase_price` for sale and `monthly_rent` for rent. The
`revision` identifies the projected facts at `observedAt`, so Distribution can
snapshot the terms shown when a referral is submitted. The projection carries
no referral-program state; Distribution owns that decision.

For itemized inventory, the development's legacy `sold-out` lifecycle label
does not override current allocation truth: a development can have no homes
for sale and still have a currently marketable rental. When the projection
contains priced rental stock from a selling, unarchived phase, Distribution
must use that mode and count rather than suppressing it because the legacy
development label says `sold-out`. The Developer workspace also keeps such a
development in its active portfolio view. Aggregate inventory remains gated
by its development-level selling status because it has no item-level mode
records to establish this distinction safely.

For itemized developments, an allocation contributes to available partner
inventory only while it is `available`, its phase is `selling`, the phase is
not archived, and the developer's publication/channel rules permit it. The
partner projection groups quantities and prices; it never exposes internal
allocation IDs, buyer identities, or protected allocation details. Sale and
rental availability remain separate.

An itemized allocation has one active market mode at a time. Authorized
managers may switch a planned or currently available allocation between sale
and rent; reserved, under-offer, under-contract, leased, and sold states cannot
be silently repurposed. Sale and monthly-rent overrides are stored separately.
A switch to a currently marketable mode must have a valid asking price for that
mode before the availability projection moves it between sale and rent. A
lease can return to either market only after its end is confirmed and the
close-out reference is recorded. A completed sale reversal is outside this
simple mode-switch path.

Aggregate stock has no canonical phase association. The projection therefore
shows aggregate availability only when the development is selling and either
has no phases or every configured phase is selling and unarchived. If phase
scope is mixed or ambiguous, aggregate availability is withheld until the
inventory is itemized or the model gains an explicit phase association.

Keep three facts distinct throughout the product:

- **Project/campaign visibility** comes from developer-approved content and
  the applicable campaign scope. A permitted launch campaign may be visible
  before any inventory is open for referral.
- **Marketable now** comes from the Developer Engine's released inventory
  projection, independently for sale and rent.
- **Open for referrals** comes from the Distribution Network's opportunity,
  partner-entitlement, and intake rules. A referral submission must recheck the
  current Developer projection for the requested mode.

An unreleased phase stays hidden. A campaign may be visible without
marketable inventory only when both the developer and the relevant campaign
allow that. A referral opportunity for a mode requires current marketable
inventory in that mode. Pausing one gate must not rewrite the other engine's
state.

The current Developer model has public publication fields, partner-visible
contacts, and development-wide resource sharing. The projection's campaign
visibility reflects approved Property Listify publication; it is not itself a
partner entitlement. The Distribution opportunity and authenticated partner
access remain additional gates. The model does not yet have a separate
partner-channel publication control. Secure resource copies now use an
authorization-aware delivery path, but previously distributed direct URLs
remain outside Property Listify's revocation control.

## Partner audiences and information scope

The Distribution Network has at least two distinct external audiences:

1. selected practitioners who may receive an assigned listing lead; and
2. approved referral partners who may participate in a configured program.

They are not interchangeable permissions. The selected-team queue's active
assignment only grants work access to that lead. It does not itself grant
access to every development, phase, contact, document, or inventory record.
Likewise, an active referral identity or program does not automatically make a
person a member of a developer's sales team.

The current Project Library share is development-wide. It does not select a
named agency, broker, or phase. Only material cleared for the full audience of
the development's partner catalog should be shared through this path.
Phase-specific material must remain unshared until the relevant phase is
released. The existing document record is not phase-scoped, so the workspace
cannot yet express or enforce selective phase-document sharing.

Before sensitive sales resources or direct site contacts are exposed, the
Distribution Network read boundary must apply the intended partner entitlement
on the server. Partner terms and the protected resource-download action now
resolve development access through Distribution's partner-access service; the
download action also rechecks the Developer's current campaign and share
state. Continue auditing admin, dashboard, and referral paths for the same
actor-scope rules. Do not treat catalog visibility as proof of selected-team
membership or authority to contact a buyer.

For the MVP, an **open** referral program should mean any authenticated,
approved, active Distribution Network partner who meets that program's role,
tier, agency, and exclusion rules. A role label alone is not partner
membership. An **invite-only** program additionally requires an active
agency- or practitioner-specific grant. Pausing a program blocks new
submissions but preserves access to existing referrals for their recorded
participants while those partner accounts remain active. Suspending or
revoking a partner account blocks that partner's external access; internal
referral history and reassignment remain available to the responsible team.

Distribution's required-document model should describe referral-process
requirements and Distribution-owned intake forms only. It must not contain
Developer sales collateral or use a `developer_document` requirement as a
second Developer resource catalogue. Sales maps, price lists, and other
developer-provided materials stay in the Developer resource authority.

## Pre-launch resource requirement boundary retirement

The pre-launch integration retires `linked_development_document_id` from
Distribution application requirements and deal requirement statuses. The
former auto-verification path allowed a Developer-owned file's active flag to
satisfy a Distribution buyer requirement. That is not evidence that a buyer
uploaded or authorized the required document. Distribution requirements now
advance only through their own upload and review states; Developer resources
remain separate, partner-shared sales material. The old
`developer_document` category and its requirement rows are retired with this
pre-launch schema change; new Distribution requirements use only
`client_required_document`.

This schema retirement is authorized by the product direction to replace
pre-launch legacy behavior with the canonical Developer–Distribution boundary.
It does not authorize applying the migration to any database; migration
application remains governed by the Database Authority process.

For the MVP, the intended entitlement should be explicit access to that
development's sales audience. The current boolean `visibleToPartners` and
development-wide resource share mean “all users admitted to that partner
catalog,” not a named team. If the Distribution Network cannot prove the
actor's development/program access, it should return the public-safe project
summary only and omit contacts and sales resources.

## Current implementation alignment

The integration worktree has a server-side `DevelopmentSalesProjection`
reader for approved project content, currently marketable sale/rent quantities
and prices, selling unarchived phases, partner-visible contacts, and explicitly
shared sales resources. It returns aggregate inventory only when phase scope
is unambiguous, omits item allocations and storage URLs, and includes an
observation time and content revision. Developer resource share decisions are
recorded in `development_documents`; `development_required_documents` remains
for Distribution's referral-process requirements.

The integration worktree also has a server-only
`DevelopmentSalesWorkspaceReference` read contract for publisher-scoped
development enumeration and administrative labels. It exposes publisher
linkage, project identity/location, lifecycle and publication setup facts, and
an explicitly named configured active-unit-type count. That count is not
marketability; current availability and prices still come only from
`DevelopmentSalesProjection`. Callers must authorize the publisher or explicit
development scope before using this administrative reference.

Distribution partner terms, the admin catalogue, access policy, and reporting
labels now consume Developer-owned workspace references and sales projections
instead of querying Developer development and unit-type tables directly. The
partner catalogue is actor-scoped and includes only visible, marketable,
correctly priced sale/rent modes. Referral submission re-fetches the selected
mode, validates current marketability, and persists the projection revision
and terms snapshot. The referral intake UI remains paused until its policy is
released; server submission paths enforce that pause.

The projection is a server-side Developer contract, not a partner-facing route.
Partner terms expose resource metadata but never storage keys or direct file
URLs. A resource is downloadable only when it is an explicitly shared private
Developer copy. The Project Library can upload an approved PDF, JPEG, PNG, or
WebP copy up to 9 MiB into the private Developer resource store. Local
development uses a separate, permission-restricted directory; hosted runtimes
require the dedicated private S3 bucket and verify all four S3 Block Public
Access settings on storage operations. No schema migration is needed because
the existing `development_documents.storageKey` field holds the private key.

Each partner download request checks current Distribution partner and program
access, current Developer campaign visibility and resource projection, and the
current document share state before returning file bytes. Responses are marked
`private, no-store`. Unsharing denies subsequent Property Listify downloads;
it cannot recall a file already downloaded. A private copy is separate from
the original project attachment: removing or replacing it does not revoke an
existing public/direct URL. Legacy direct-URL resources remain metadata-only
in partner terms and cannot be downloaded through this protected route.
Resource sharing is development-wide, not phase- or agency-specific.

The integrated Distribution Network includes a selected-practitioner roster,
a manager-assigned listing-lead queue, signed search-results attribution, and a
versioned referral-intake foundation. These capabilities do not transfer
inventory authority to Distribution. Their migrations have not been applied
or deployed.

The integration branch has one serialized migration chain: Developer migrations
`0116`–`0124`, Distribution migrations `0125`–`0131`, followed by the referral
terms snapshot and resource-boundary migrations `0132`–`0133`. The canonical
manifest validates through `0133_distribution_resource_requirement_boundary.sql`.
The target database was unreachable during the latest authority check, so its
ledger and schema congruency were not evaluated and no migration was applied.

## Integration rules

1. Keep the Developer Engine as the only writer of phase, batch, transaction
   mode, allocation, and marketability state.
2. Keep lead capture, custody, partner assignment, and referral payout in
   their existing authorities. CRM integrations must call the guarded
   Developer Engine command boundary with an external record reference.
3. Build partner catalog cards from the Developer Engine's availability and
   price projections, not from development totals or referral-program
   readiness. Omit a development from the external catalogue unless the
   current Developer projection confirms `campaign.visible`; unverified
   placeholder rows are not partner-facing catalogue entries.
4. Apply actor-specific Distribution access before returning partner-visible
   contacts, resources, terms, or inventory details.
5. Keep referral-intake documents and terms distinct from developer sales
   collateral. Do not use the general sales-resource list for private buyer
   identity or consent evidence.
6. Keep migration identifiers in the serialized canonical chain and revalidate
   it whenever either workstream changes.

## Remaining integration work

1. Decide and implement the first referral-intake release policy, then unpause
   the partner submission form only when the required policy and evidence
   workflow are ready.
2. Establish the operational process for replacing existing direct-URL
   attachments with approved private copies where protected Property Listify
   downloads are required. Do not imply that copying or unsharing revokes the
   source URL.
3. Validate public and partner projections against released, unreleased,
   archived, sold-out, for-sale, and for-rent examples after the target
   database is available for authorized verification.

## Canonical migration integration order

The integration review used `origin/main` at `04fc0a401` (PR #636), whose
active manifest ends at `0115_non_geographic_place_search_eligibility.sql`.
The Developer-owned inventory, sale/rent projection, contact, and phase
archival migrations occupy `0116` through `0124`. The Distribution-owned
selected-practitioner, listing-lead queue, and referral-intake migrations are
sequenced after them at `0125` through `0131`; referral snapshot and resource
requirement boundary migrations follow at `0132` and `0133`. This is one
contiguous lineage. Recheck the base manifest before adoption if `origin/main`
advances. A valid manifest does not imply that the database has been migrated.
