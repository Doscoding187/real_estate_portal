# Developer Engine and Distribution Network Integration Contract

## Status and purpose

This is the integration contract for the parallel Developer Engine and
Distribution Network workstreams. It aligns their product boundaries without
merging or changing files in the Distribution Network worktree. The contract
uses the current Developer Engine inventory authority and the working
Distribution Network product contract; neither worktree's uncommitted changes
are treated as deployed or database-applied.

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
access remain additional gates. The model does not yet have an explicit
partner-channel publication control or revocable resource delivery. Resolve
those gaps before broadening partner access or representing shared files as
revocable.

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
named agency, broker, or phase, and it does not revoke direct file-URL access.
Only material cleared for the full audience of the development's partner
catalog should be shared through this path. Phase-specific material must remain
unshared until the relevant phase is released. The existing document record is
not phase-scoped, so the workspace cannot yet express or enforce selective
phase-document sharing.

Before sensitive sales resources or direct site contacts are exposed, the
Distribution Network read boundary must apply the intended partner entitlement
on the server. The current partner-terms service now resolves development
access through Distribution's partner-access service before building its
results. That is progress, but it does not prove that every list, detail,
resource, admin, dashboard, and submission path enforces the same actor scope.
Do not treat catalog visibility as proof of selected-team membership or
authority to contact a buyer.

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

For the MVP, the intended entitlement should be explicit access to that
development's sales audience. The current boolean `visibleToPartners` and
development-wide resource share mean “all users admitted to that partner
catalog,” not a named team. If the Distribution Network cannot prove the
actor's development/program access, it should return the public-safe project
summary only and omit contacts and sales resources.

## Current implementation alignment

The Developer worktree now has a server-side `DevelopmentSalesProjection`
reader for approved project content, currently marketable sale/rent quantities
and prices, selling unarchived phases, partner-visible contacts, and explicitly
shared sales resources. It returns aggregate inventory only when phase scope
is unambiguous, omits item allocations and storage URLs, and includes an
observation time and content revision. The Developer Project Library now
records its share decisions in `development_documents`; `development_required_documents`
remains for Distribution's referral-process requirements.

The Developer worktree also now has a server-only
`DevelopmentSalesWorkspaceReference` read contract for publisher-scoped
development enumeration and administrative labels. It exposes publisher
linkage, project identity/location, lifecycle and publication setup facts, and
an explicitly named configured active-unit-type count. That count is not
marketability; current availability and prices still come only from
`DevelopmentSalesProjection`. Callers must authorize the publisher or explicit
development scope before using this administrative reference.

The Distribution worktree has removed Developer facts from the partner-terms
read and now returns placeholders with campaign visibility and marketability
marked unverified. Referral submission requires an explicit sale/rent mode and
fails closed while current Developer availability is disconnected. A
Distribution-owned terms-snapshot builder can capture a supplied projection,
but the projection is not yet fetched at submission or persisted with the
referral. This is a safe integration seam, not a working partner catalogue.
Some other Distribution admin and developer-dashboard paths still read
Developer tables directly and need a path-by-path authority review.

The projection is a server-side Developer contract, not a partner-facing route.
The secure resource retrieval path is not implemented. Current source assets
can still have direct URLs, so unsharing removes them from the partner resource
list but does not revoke a URL already obtained. Distribution currently keeps
partner-facing Developer resource links empty. Do not describe the integration
or revocable download boundary as complete.

The Distribution Network worktree adds a selected-practitioner roster, a
manager-assigned listing-lead queue, signed search-results attribution, and a
versioned referral-intake foundation. Those changes do not transfer inventory
authority to the Distribution Network. Their migrations have not been applied
or deployed.

The two worktrees currently assign overlapping canonical migration sequence
numbers: the Distribution Network worktree uses `0116`–`0122`, while this
Developer Engine worktree uses `0116`–`0124`. The migration manifests cannot be
combined as they stand. Integration must select one ordered chain, update the
other workstream's filenames, parent links, checksums, and migration-authority
records, then validate the single canonical manifest before any database
release. No migration from either worktree is applied by this integration
contract.

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
6. Keep migration identifiers in one serialized canonical chain. Resolve the
   current sequence collision before either workstream is integrated or
   released.

## Next integration sequence

1. Keep Developer workspace references as the source for publisher-scoped
   enumeration and administrative labels. Keep the sales projection as the
   source for approved campaign facts, mode-specific marketability,
   partner-visible contacts, and shared-resource metadata. Keep Distribution
   terms and referral policy in Distribution.
2. Replace Distribution admin and reporting joins with the reference contract;
   replace partner-catalogue development facts and availability with the sales
   projection. Never use configured active-unit-type count as availability.
3. Review all remaining Distribution Developer-table reads and actor-scoped
   read paths. Preserve fail-closed placeholders until the projection is wired.
4. Serialize both migration sequences into one canonical chain before
   integrating either worktree; do not edit the other active worktree to do it.
5. Wire the projection into partner catalogue reads and referral submission;
   re-fetch the requested sale/rent mode at submission and persist the supplied
   projection revision and terms snapshot with the referral.
6. Implement an authorization-aware resource delivery boundary before
   returning any partner download link. Until source files are privately
   stored, shared-resource metadata must not imply revocable access.
7. Validate public and partner projections against released, unreleased,
   archived, sold-out, for-sale, and for-rent examples after integration.
