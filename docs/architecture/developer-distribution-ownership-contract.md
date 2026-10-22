# Developer and Distribution Ownership Contract

**Status:** Target architecture recommendation; not yet a database-authority approval  
**Date:** 2026-10-18

This contract keeps the Developer Engine and Distribution Network as separate
products with an explicit read boundary. It guides implementation planning; it
does not approve schema edits, migrations, database application, or integration
of the competing worktrees.

## Product boundary

The Developer Engine is the authority for a developer's operating facts:

- developer organization, developments, phases, and phase lifecycle;
- development marketing content and public publication controls;
- inventory identity, transaction mode, price basis, and marketability;
- the development and phase team directory, including partner-visible roles;
- sales collateral, its scope, sharing decision, current version, and authorized
  delivery.

The Distribution Network is the authority for partner-program facts:

- program participation, terms, referral rules, and partner entitlement;
- referral intake, attribution, assignment, referral progress, and referral
  evidence;
- the process requirements a partner must satisfy for a referral.

Distribution consumes Developer facts through Developer-owned read services. It
does not calculate marketability from `unit_types`, create a second development
catalogue, or write Developer inventory, contacts, publication, or resource
state.

## Shared read boundary

Developer exposes two distinct reads:

1. A publisher-scoped workspace listing for Distribution administration. It
   supplies canonical development identity and lifecycle labels for known
   developer organizations. It does not imply that a development is marketable
   or that a partner program is open.
2. `DevelopmentSalesProjection` for a known development ID. It supplies
   publication visibility, lifecycle, currently marketable sale and rental
   modes separately, partner-visible contacts, and metadata for explicitly
   shared resources.

The projection rules are:

- `campaign.visible` reports publication eligibility only. `campaign.lifecycle`
  is a separate fact and must not turn inventory on or off.
- Inventory marketability is computed independently from canonical release and
  allocation state. Sale and rental counts and price bases remain separate.
- Sold-out inventory is omitted from the marketable projection. A future
  mode-specific lifecycle may expose the unsold mode only when that distinction
  is represented explicitly in the contract and source model.
- Missing phase or release authority means no inventory is returned as
  marketable. Development-wide aggregate counts are not substituted.
- Contacts and resources are returned only when the Developer has explicitly
  scoped them for partner use. Private contact data and storage URLs are never
  returned.
- Distribution combines this projection with its active program and the
  authenticated partner's entitlement. It records the projection revision and
  the selected sale or rental terms with a referral; it does not rewrite
  historical referral terms after the projection changes.

## Current table findings

The repository database-takeover coverage register still marks
`development_documents`, `development_required_documents`, and
`development_manager_assignments` as having unresolved purpose and ownership.
That is a formal stop for schema-dependent runtime work; this recommendation
does not override that register.

The canonical runtime census at the current branch head shows:

- `development_documents` has no Developer-side writer. Distribution's
  `distributionDealReadinessService` and
  `distributionDealRequirementStatusService` read whether a linked document is
  active. The baseline stores both `storage_key` and `file_url`; active status
  alone does not provide revocable partner delivery.
- `development_required_documents` is read and written by Distribution
  administration and referral submission services as checklist definitions and
  evidence requirements. Its `developer_document` category and template-file
  columns mix collateral into that process model and should be retired after
  the Distribution-owned replacement is established.
- `development_manager_assignments` is read by Distribution referral
  submission to find the primary manager. The canonical runtime has no
  Developer contact-directory writer for it. Its current role is referral
  routing, not a scoped site/team directory.

A separate, unmerged Developer candidate adds share/unshare writes to
`development_documents` and returns its stored `file_url`. That candidate is
not part of this branch and is not a safe delivery contract: unsharing cannot
revoke a public URL. Reuse its workflow intent only after Developer-controlled
retrieval is implemented.

The target logical ownership is:

| Existing fact                                           | Target owner | Boundary                                                                                                                                                                                                                     |
| ------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `development_documents`                                 | Developer    | Developer owns resource metadata, scope, current/share state, and protected delivery. Distribution may retain a reference to a resource for a program requirement, but reads and validates it through the Developer service. |
| `development_required_documents`                        | Distribution | Referral checklist definitions and partner-submitted requirement evidence belong to Distribution. Developer collateral is not represented as a required referral document.                                                   |
| `development_manager_assignments`                       | Distribution | Existing primary-manager routing for referrals is not the Developer team directory. Do not reuse it to represent site managers, sales managers, or phase contacts.                                                           |
| `application_requirements`, `deal_requirement_statuses` | Distribution | These describe referral/deal process requirements. Any linked Developer resource is a read-only reference, not a second resource authority.                                                                                  |

The physical schema currently places these tables in `drizzle/schema/distribution.ts`,
and the canonical takeover register has not yet accepted the target ownership.
Relocating a TypeScript declaration alone would not resolve logical ownership,
runtime access, or migration authority. Complete the table-purpose and
reader/writer census and update the database authority packet before changing
schema definitions or runtime queries.

## Resource delivery requirements

The Developer resource library is a sales-enablement capability, not a
Distribution referral checklist. Its eventual model must support development
and optional phase scope, audience, category, current/effective status, and an
audited share or revoke decision.

Partner responses contain resource identifiers and safe metadata only.
Retrieval goes through a Developer-authorized route that checks the current
share state and caller scope on every request. Revoking a share immediately
blocks future retrieval. A direct public `file_url` cannot provide revocable
access and is not sufficient for partner delivery; eligible files need a
controlled storage key or another delivery mechanism with equivalent access
checks.

## Migration integration gate

The canonical active manifest ends at
`0115_non_geographic_place_search_eligibility.sql`. The isolated Developer and
Distribution proposals both use migration IDs beginning at `0116`, so they are
not independently mergeable into one active manifest.

The integration owner must:

1. finish the Developer and Distribution table-purpose and reader/writer
   reviews;
2. identify every database target on which either proposal was applied and
   preserve its authority evidence;
3. create one serialized integration manifest from canonical head `0115`, with
   Developer schema prerequisites before Distribution consumers;
4. preserve immutable checksums for any migration already applied to a target;
   any replaced or consolidated unreleased proposal must be recorded through the
   repository's migration authority process, not silently renamed;
5. defer the proposed destructive linked-document column drops until the
   authority packet explicitly approves their removal and the migration
   validator accepts the plan; and
6. run the required manifest, disposable-target, and schema-congruency checks
   before treating the projection as ready for Distribution integration.

No migration is applied by this contract. The current Developer worktree's
authority status reports the disposable local database as unreachable, so its
schema and ledger state remain unevaluated.
