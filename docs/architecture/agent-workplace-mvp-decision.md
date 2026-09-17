# Agent Workplace MVP Decision Record

| Field | Value |
| --- | --- |
| Decision IDs | AW-MVP-001, AW-MVP-002, AW-MVP-003, AW-MVP-004 |
| Status | Approved — repository authority (founder approval, Edward Banda, 2026-09-18) |
| Base commit | `4e012b3044628fc06da7489c0055e9ce01bdc8d9` (origin/main, PR #577 merge) |
| Worktree | `property-listify-agent-workplace-decision` (branch `docs/agent-workplace-mvp-decision`) |
| Owner | Founder — Edward Banda, with product and database governance |
| Related authority | `docs/architecture/product-workflow-authority.md`, `docs/architecture/database-authority-policy.md`, `docs/database-authority/00-database-authority-agent-entry.md`, `docs/database-authority/database-change-protocol.md` |
| Scope | Decision documentation only. No implementation, schema, migration, authorization, or refactor is authorized by this document. |

## Purpose

This record locks the four architecture decisions that make an Agent Workplace
Contacts implementation unambiguous and safe. It separates **current repository
fact** from **new architecture decision**. The future implementation brief must
reference the decision IDs below instead of re-litigating the architecture.

It also records the repository's standing rule for legacy material:

> Historical preservation is not a product objective. Future usefulness is.
> Legacy structures and data earn their place through an active operational,
> legal, audit, analytical, migration, or architectural purpose. Structures and
> data with no continuing purpose are migrated, archived, or retired in a
> controlled manner rather than preserved merely because they exist.

## Current repository facts (evidence, not decisions)

| Fact | Evidence |
| --- | --- |
| The canonical model has no contacts/person-relationship table. | `drizzle/schema/canonical-model-inventory.json` (212 tables; none is a curated contact/person authority) |
| Person data exists only as embedded per-domain fields. | `leads.name/email/phone` (`drizzle/schema/leads.ts:49-51`); `seller_prospects.ownerName/email/phone` (`drizzle/schema/canvassing.ts:112-114`); `listing_leads.name/email/phone` (`drizzle/schema/listings.ts:177`); `prospect_identities` is a platform prospect-journey identity, not an agent business contact (`drizzle/schema/leads.ts:29-39`) |
| The canonical lead writer is public capture only. | `leads.create` → `capturePublicLead` (`server/leadsRouter.ts:192`, `server/services/publicLeadCaptureService.ts`) |
| `listing_leads` has no active production writer. Its only live consumer is agency listing-performance, folded in as a non-additive legacy baseline. | No writer in `server/listingRouter.ts`; read + rationale comment at `server/agencyRouter.ts:2330-2369`; served via `agency.getListingPerformance` (`server/agencyRouter.ts:7285-7306`) → `client/src/features/agency/performance/AgencyListingPerformanceWorkspace.tsx:19-20`; also cascade-deleted in `server/db.ts:3917`; asserted canonical in `server/__tests__/contract.database-canonical-model-authority.test.ts:247-255` and the immutable baseline (`server/migrations/0000_canonical_launch_baseline.sql:868`) |
| The seller-prospect scope resolver is the proven authorization pattern. | `getSellerProspectActorScope` returns `{agencyId, agentId, isManager}` (`server/services/sellerProspectAccessService.ts:44-81`); record access is agency-scoped with per-agent assignment enforcement (`server/services/sellerProspectAccessService.ts:83-99`) |
| `seller_prospects.agency_id` is `NOT NULL` with `ON DELETE CASCADE`. | `drizzle/schema/canvassing.ts:107-109` |
| Canvassing already gates mandate→listing conversion through the authoritative listing lifecycle. | `prepareSellerProspectListingConversion` (`server/services/sellerProspectAccessService.ts:120-161`); consumed by `listing.create` via `sellerProspectId` (`server/listingRouter.ts:645`) |
| The agent leads surface uses canonical `leads`; `AgentLeadsEnhanced.tsx` is a one-line re-export shim, not a parallel page. | `/agent/leads` → `AgentLeads` (`client/src/App.tsx:316-320`); shim at `client/src/pages/agent/AgentLeadsEnhanced.tsx:1`; data from `agent.getLeadsPipeline` (`server/agentRouter.ts:796-859`) |
| Viewings already operate against `showings` inside the agent productivity workspace. | `agent.getMyShowings`/`bookShowing`/`updateShowingStatus` (`server/agentRouter.ts:2115-2408`); `ShowingsCalendar` mounted in `client/src/pages/agent/AgentProductivity.tsx:538` |
| Task/follow-up capability today is lead follow-up; no general task entity exists. | `agent.getMyFollowUps` from `leads.nextFollowUp` (`server/agentRouter.ts:1547-1608`); completion writes `leadActivities` (`server/agentRouter.ts:1703-1764`) |
| `activityService.ts` is a declared stub whose sole consumer is a dead endpoint. | Stub header (`server/services/activityService.ts:1-4`); fake writes and empty reads (`:61-105`); consumer `developer.getActivityFeed` (`server/developerRouter.ts:1631-1633`) has zero client callers. Real trails are per-domain: `lead_activities` (`drizzle/schema/leads.ts:307`) and `seller_prospect_activities` (`drizzle/schema/canvassing.ts:171`) |
| Database authority is a governed, fail-closed control plane. | Manifest `a511e70ae06ffbae4027cf02b1de8cc0f586ff7c23cb7cb11a0990606cf728ed`, head `0090`; change admission in `docs/database-authority/database-change-protocol.md:28-56` |

## AW-MVP-001 — Canonical Contact / Person Authority

| Field | Value |
| --- | --- |
| Status | Approved (founder, 2026-09-18) |
| Decision | `contacts` becomes the single canonical **curated person and relationship authority** for the Agent Workplace. No new domain may introduce a competing mutable person/customer/contact authority without an explicit architecture decision. |

### Context and problem

Every workplace domain currently maintains its own embedded representation of
a person (`leads`, `seller_prospects`, `listing_leads`; facts table above).
An Agent Workplace that needs "this is my property business database" cannot be
built on per-domain person columns without perpetuating fragmentation.

### The semantic distinction this record locks

| Concept | Meaning | Retention rule |
| --- | --- | --- |
| **Capture/source record** | Preserves what entered a business workflow with its historical/source context (e.g. an enquiry's submitted name/email/phone with consent evidence). | Retained per the future-useful retention rule in this document: classified as source/audit data where it has operational, legal, audit, analytical, migration, or architectural value; retired deliberately where it does not. |
| **Contact** | The maintained person identity/relationship used by the workplace across workflows. Agent- or organisation-curated; mutable by its owner. | The single place where relationship data is curated going forward. |

### Decision detail

1. `contacts` is the canonical curated person/relationship authority for the
   Agent Workplace. Existing person fields on `leads` and `seller_prospects`
   remain domain/source data of those workflows.
2. New invariant: **a change to a Contact must not silently rewrite historical
   or source capture data** unless an explicitly designed synchronization rule
   exists and is approved as part of the Contacts implementation. (This record
   makes no claim that current lead/prospect columns are technically immutable
   — repository evidence for that is insufficient.)
3. Linkage between Contacts and leads/seller prospects is **optional at capture
   time** (a lead may exist without a contact) and **required when a workplace
   user curates a person into the relationship layer**. The precise linkage
   cardinality is an implementation-brief concern, bounded by this decision.
4. What must not be duplicated going forward: no new curated person/customer/
   contact authority inside any engine (Agent, Agency, Developer) or domain
   (leads, canvassing, deals, viewings). Engines consume `contacts`; they do
   not fork it.
5. Enforcement: design the strongest **practical** database-authority guardrail
   around *competing person authority* — not a brittle column-name ban.
   Capture snapshots, invitations, transactional/delivery records, audit
   records, and third-party payload snapshots legitimately contain copied
   person data. The enforceable concept is "no second mutable/curated person
   authority", expressed as: (a) canonical-model review at manifest admission
   (`docs/database-authority/database-change-protocol.md:28-56`) treating a new
   curated-person table as a competing authority requiring explicit decision;
   (b) a focused authority check in the database-authority static suite
   asserting that `contacts` (or its explicitly approved successors) is the
   only curated-person table in `drizzle/schema/`; and (c) the standing rule
   that unregistered compatibility code has no authority
   (`docs/architecture/database-authority-policy.md`). If a fully reliable
   automated test cannot express this safely, the documented review gate is the
   enforcement mechanism of record.
6. Retention corollary: embedded person data on `leads`, `seller_prospects`,
   `listing_leads` and related domains **must be classified, not presumed
   permanent**. Where it is useful source/capture or audit evidence, it remains
   or migrates deliberately; where it is redundant with no continuing purpose,
   it is retired in a controlled manner.

### Explicitly not authorized

- No contacts schema, migration, or Drizzle model is created by this record.
- No import/dedupe programme, buyer/seller classification model, or CRM schema
  design is authorized.

### Follow-up

Contacts implementation workstream (schema via the Database Change Protocol in
a dedicated schema-authority worktree; router; UI; guardrail check).

## AW-MVP-002 — Contact Ownership and Visibility

| Field | Value |
| --- | --- |
| Status | Approved (founder, 2026-09-18) |
| Decision | The Contacts ownership/visibility model is defined before implementation and generalizes the proven seller-prospect scope pattern. It is a security contract, not CRUD convention. |

### Context and problem

Contacts will hold private business relationship data across four actor
shapes. Access must follow explicit scope, never accidental UI reach.

### Decision detail

The model must support, at minimum:

| Actor | Ownership | Visibility |
| --- | --- | --- |
| Independent agent | Owns private business contacts under their own operating scope (user-owned). | Private to the agent. |
| Agency agent | Owns private contacts; can distinguish private records from agency-shared records. | Private records: agent-only. Agency-shared records: visible within agency scope per sharing rules fixed by the implementation brief. |
| Agency manager / admin | Operates agency-scoped records through explicit manager scope. | Team visibility follows explicit agency/manager scope — never accidental access through UI routes. |
| Developer (future-compatible) | Organisation-owned context is **not built** in v0.1. | The schema/ownership vocabulary must not structurally prevent a future organisation-owned contact context. Future-compatible, not future-built. |

### Required invariants for implementation

1. Generalize the proven pattern — do not invent a second security model. The
   resolver shape `{agencyId, agentId, isManager}`
   (`server/services/sellerProspectAccessService.ts:44-81`) is the repository's
   proven scope pattern. The Contacts implementation must express independent
   agents (no agency) as a first-class scope rather than a rejection branch.
2. Every contacts procedure uses the narrowest existing procedure guard that
   matches its operation
   (`docs/architecture/product-workflow-authority.md:44-46`). `protectedProcedure`
   alone is not sufficient.
3. Ownership columns and the sharing model are fixed in the implementation
   brief before schema authorship; row-level ownership must be enforced in
   queries (as `requireSellerProspect` does at
   `server/services/sellerProspectAccessService.ts:83-99`), not in UI logic.
4. Authorization invariants must be executable: focused contract tests per
   Contacts surface proving agent-private isolation, agency-shared visibility,
   and manager scope boundaries.

### Explicitly not authorized

- No agency hierarchy redesign, no team/permission framework change, and no
  developer organisation contact schema in this workstream.

### Follow-up

Ownership/visibility matrix finalized in the Contacts implementation brief;
any structural deviation returns to this record.

## AW-MVP-003 — Independent-Agent Canvassing Sequence

| Field | Value |
| --- | --- |
| Status | Approved (founder, 2026-09-18) |
| Decision | v0.1 keeps the existing canvassing authority agency-scoped. Independent-agent canvassing is a deliberate v0.2 Database Change Protocol workstream, not a launch blocker. |

### Repository reason (fact)

- `seller_prospects.agency_id` is `NOT NULL` with `ON DELETE CASCADE`
  (`drizzle/schema/canvassing.ts:107-109`); supporting tables
  (`seller_prospect_activities` at `:171-194`, `seller_mandate_operations` at
  `:196+`) share the agency-anchored shape.
- `getSellerProspectActorScope` requires an agency and an approved agency
  agent profile (`server/services/sellerProspectAccessService.ts:48-78`).
- The router already returns an explicit `independent_growth` workspace mode
  for users without an agency rather than a dead query surface
  (`server/canvassingRouter.ts:297-324`).

### v0.1 disposition

1. Existing canvassing remains agency-scoped (Launch for agency agents;
   consistent with the Launch/Pilot/Hidden principle).
2. Independent agents are not blocked from the broader Agent Workplace: their
   v0.1 operating experience uses capabilities that do not require rewriting
   the seller-prospect ownership model (AW-MVP-004).
3. The UI must not misleadingly expose an unusable canvassing workflow to an
   independent agent. The existing explicit `independent_growth` mode is the
   pattern: an honest, non-dead-end explanation, not a "coming soon" surface.

### v0.2 decision requirements (not designed here)

- A Database Change Protocol workstream addressing the non-null agency anchor
  and the authorization/query assumptions built on it.
- The future solution reuses the ownership concepts proven by the Contacts
  work (AW-MVP-002) rather than creating a separate ownership vocabulary.
- No migration, schema change, or authorization rewrite is authorized here.

### Follow-up

v0.2 architecture decision, sequenced after the Contacts foundation.

## AW-MVP-004 — Agent Workplace v0.1 Boundary

| Field | Value |
| --- | --- |
| Status | Approved (founder, 2026-09-18) |
| Decision | The Agent Workplace MVP is composition of existing authorities plus the smallest necessary new person/contact foundation. It converges and reuses the existing authoritative systems required for v0.1. It does not replace a proven operational authority merely for architectural cleanliness. Legacy, redundant or superseded structures may still be migrated, archived or retired through bounded evidence-backed workstreams when they no longer provide operational, legal, audit, analytical, migration or architectural value. |

### v0.1 composition (evidence-backed)

| Surface | Composes | Evidence | v0.1 status |
| --- | --- | --- | --- |
| Workplace shell/home | Existing agent pages composed behind one entry experience | `/agent/leads`, `/agent/productivity`, `/agent/canvassing`, `/agent/listings` routes (`client/src/App.tsx:278-345`) | **Must exist** for v0.1 — it is the convergence surface. |
| Contacts | New domain per AW-MVP-001/002 | — | **Must exist** for v0.1 (create/view/search; ownership per scope model). Minimal linking to make contacts useful across domains is included; exhaustive linking is not. |
| Leads | Existing lead CRM | `agent.getLeadsPipeline` (`server/agentRouter.ts:796-859`); `leads` authority per `docs/architecture/product-workflow-authority.md:71-77` | **Must exist** (already operational; surface inside shell). |
| Canvassing | Existing seller-prospect CRM, agency-scoped | `server/canvassingRouter.ts`; AW-MVP-003 | **Must exist for agency agents** (already operational). Independent agents see the honest `independent_growth` mode. |
| Listings | Existing listing authority | `listings` lifecycle (`docs/architecture/product-workflow-authority.md:48-77`); mandate→listing conversion (`server/listingRouter.ts:645`) | **Must exist** (already operational). |
| Viewings | Existing showings | `agent.getMyShowings`/`bookShowing` (`server/agentRouter.ts:2115-2408`); `ShowingsCalendar` in productivity (`client/src/pages/agent/AgentProductivity.tsx:538`) | **Should exist**; already launch-ready in the productivity workspace. |
| Follow-up | Compose existing lead + canvassing follow-up | `agent.getMyFollowUps` (`server/agentRouter.ts:1547-1608`); canvassing follow-up queue (`server/canvassingRouter.ts:513+`) | **Should exist** as composition. No general tasks engine. |
| Activity | Per-domain sources only | `lead_activities` (`drizzle/schema/leads.ts:307`); `seller_prospect_activities` (`drizzle/schema/canvassing.ts:171`) | **Should exist** via per-domain reads. See hygiene decisions. |

### Architecturally desirable but post-launch

Universal task/reminder engine; unified activity timeline; contact
import/export; deduplication; buyer database and matching; area polygon/GIS
expansion; agency shared-contact model beyond the AW-MVP-002 vocabulary;
developer CRM.

### v0.1 non-goals (explicit)

Unless repository evidence reveals an unavoidable dependency, this workstream
excludes: another lead system; another listing system; universal
tasks/reminders; import/export programme; sophisticated deduplication;
buyer-property matching; full buyer CRM; canvassing ownership rewrite; area
polygon/GIS expansion; agency hierarchy redesign; mega-router decomposition;
broad UI cleanup; generic activity architecture rewrite; developer CRM.

### Contained hygiene decisions (recorded, not cleanup projects)

1. **`listing_leads`** — current fact: no active production writer; the sole
   live consumer is agency listing-performance, which already folds it in as a
   *non-additive legacy baseline* under canonical `leads` precedence with an
   explicit reconciliation rationale (`server/agencyRouter.ts:2357-2369`); the
   table is asserted canonical and anchored in the immutable baseline
   (`server/__tests__/contract.database-canonical-model-authority.test.ts:247-255`,
   `server/migrations/0000_canonical_launch_baseline.sql:868`).
   **Disposition:** leave untouched at runtime; treat as legacy/parallel
   capture retained for the non-additive baseline; the Agent Workplace must
   not extend it, and lead functionality must not depend on it. Any
   retirement requires a bounded authority verification (prove overlap, avoid
   double-counting, then retire via the Database Change Protocol) — which may
   not be worth its cost before launch; it is recorded here as the follow-up
   decision, not this workstream.
2. **Activity** — v0.1 uses proven per-domain activity sources. The
   Agent Workplace must not become dependent on the known `activityService.ts`
   stub (`server/services/activityService.ts:1-4`, sole consumer is a dead
   endpoint at `server/developerRouter.ts:1631-1633`). A bounded retirement of
   the stub and its dead consumer is worthwhile if inexpensive; a universal
   timeline waits.

### What this explicitly does not authorize

Any new lead, listing, identity, developer, or agency authority; any parallel
workflow to `docs/architecture/product-workflow-authority.md`; any schema,
migration, or authorization change.

## Approval

Approved by the founder (Edward Banda) on 2026-09-18, subject to one wording
correction in AW-MVP-004, which is applied in this revision. With this commit
the record becomes repository authority alongside the other
`docs/architecture/` decision documents.

The evidence corrections recorded in this document are retained as part of the
approval: `listing_leads` has a real residual non-additive reporting use and
must not be casually deleted; `AgentLeadsEnhanced.tsx` is a re-export rather
than a genuine competing leads experience; agent viewings/showings already
exist operationally inside Productivity and are therefore primarily a
convergence/navigation problem.

Approved implementation sequence (recorded at approval to prevent
relitigation):

1. Agent Workplace convergence shell — first bounded implementation slice;
2. Contacts authority workstream per AW-MVP-001/002;
3. minimal contact linking;
4. launch journey hardening.

Contacts remains a v0.1 requirement per AW-MVP-004; the shell precedes it so
that the real integration requirements for Contacts are discovered from the
running workplace rather than designed abstractly. Implementation must derive
directly from AW-MVP-001..004, follow
`docs/architecture/product-workflow-authority.md`, and use the Database Change
Protocol wherever schema is touched.
