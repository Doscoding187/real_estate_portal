# Developer Workspace Context MVP Plan

**Status:** Implementation plan for the first developer-workspace adoption slice  
**Date:** 17 October 2026  
**Worktree:** `feat/developer-workspace-context-mvp-20261017`

## Product intent

Property Listify helps developers launch, market, distribute, and sell
developments. The workspace is the shared operating context that keeps the
development, sales people, approved material, and marketplace routes connected.
It should work alongside a developer's CRM or custom software and earn deeper
adoption by making day-to-day development sales work easier.

The MVP must support the connected developer engines:

1. **Developer engine:** clear development and phase lifecycle, ownership, and
   approved sales information.
2. **Campaign engine:** a dependable active-development context for promotion.
3. **Lead and prospect engine:** a clear hand-off contact for existing partner
   enquiries, without claiming that Property Listify owns the developer's full
   sales pipeline.
4. **Marketplace revenue engine:** a cleaner partner route to current
   opportunities and a base for later attribution and performance measurement.

## Evidence and current architecture

The first-hand partner-sales examples identify three recurring operating
frictions: external users cannot quickly identify the right development contact,
cannot self-serve current site and sales material, and must search through
projects that are no longer active.

The repository already has canonical data for a bounded MVP:

- `developments.status` records `launching-soon`, `selling`, or `sold-out`.
- `development_phases.status` records `planning`, `pre_launch`, `selling`,
  `sold_out`, or `completed`.
- Partner-facing development context is exposed through the existing scoped
  distribution program terms query.
- Distribution terms can carry an explicitly curated development contact.
- `development_documents` has explicit `public` and `referrer` visibility,
  active state, document type, and a file URL.
- `development_manager_assignments` identifies referral operations managers,
  but it does not encode a site-manager or phase-team hierarchy.
- Unit inventory remains aggregate in `unit_types`. That table has no phase
  assignment, while the legacy `development_units` table is not an approved
  authority for this work. This MVP will not claim item-level availability,
  infer sold inventory from aggregate remainders, or attribute unit-type stock
  to a phase.
- Phase `selling` is an operational signal that the phase is active, but the
  current schema cannot connect a unit type or its aggregate counts to that
  phase. The workspace may show phase context; it must not claim phase-specific
  prices or inventory until that relationship has an approved authority.

No additional CRM is required. No provider-specific integration is required.

## First deliverable

### Partner Development Workspace Context

1. **Current selling portfolio by default.** Show a development to partner
   sales only when its parent is `selling` and it has a `selling` phase. When a
   development has no phase records, its explicit development status must be
   `selling`. Planned and pre-launch phases stay out of partner responses. This
   is visibility based on existing lifecycle data, not a new authorized release
   action.
2. **Lifecycle grounded in canonical states.** Use explicit development and
   phase states. A development with any selling phase remains current even if
   another phase is closed. Do not infer availability from aggregate counts.
3. **Phase context without false inventory attribution.** Show only selling
   phases in the active partner view and closed phases in archive. Never
   include planning or pre-launch phases in partner responses. Because the
   canonical model does not assign unit types to phases, omit aggregate unit
   types and prices for phased developments rather than implying they belong
   to the selling phase. Unphased developments may use aggregate unit types
   only when the development itself is explicitly selling.
4. **Sales contact.** Show only the contact explicitly curated for that
   development's partner terms, with a clear “Development sales contact” label.
   Do not call this person a site manager unless the source model says so.
5. **Self-service resources.** Show active documents marked `referrer` or
   `public` and carrying a usable file URL. Exclude internal/manager documents
   and never return storage keys or uploader identity to partner users.
6. **Mobile-friendly quick access.** Make contact actions and resource links
   available from the development card without requiring users to understand
   internal database terminology.

### Data and authorization boundaries

- Reuse the existing partner identity gate and development distribution-term
  scope.
- Read canonical development, phase, and document tables directly.
- Treat `public` and `referrer` as the document audience contract; keep
  `internal` and `manager` files server-side.
- Return only a bounded projection of each document. Never expose
  `storageKey`, uploader identity, or internal notes.
- Preserve the existing CRM boundary. Lead stages and external CRM data do not
  change inventory state in this slice.
- Do not use the development-wide `transactionType` as an individual unit's
  sale/rental state. The current public listing path selects a development-wide
  mode; it cannot represent a phased development with some allocations for
  sale and others for rent.
- Do not add schema, migration, seed, or data backfill changes.

## Sale/rent inventory: future architecture rule

Developments may offer stock for sale, rent, or both, and market conditions can
change how an allocation is offered. Treat the physical or commercial
allocation identity as stable and represent each sale or rental offering as a
separate, time-bounded offer with its own price, terms, channels, and history.
Changing the offer closes or pauses the previous offer and records an
authorized new one with a reason and effective time; it never rewrites the
asset's identity or deletes the prior listing history.

Keep marketing intent separate from occupancy and transaction commitment. A
signed tenancy means the unit is occupied and cannot be represented as
available for immediate rental. It may still be marketed for sale only if the
developer explicitly permits a sale subject to that tenancy and the public
terms disclose the possession condition. A binding sale commitment must block
new rental commitments. Any dual sale-and-rent marketing for one allocation
must be an explicit developer policy, with conflicts checked atomically before
either commitment is accepted.

The current schema cannot safely perform this conversion: `developments`
stores one transaction type for the whole development, while `unit_types`
stores sale and rent price fields but has no per-allocation offer, occupancy,
lease, or phase relationship. Do not toggle the development field to simulate
a unit-level conversion. The later inventory work must establish a fresh,
approved canonical inventory authority; do not revive `development_units` by
assumption. This is a product and data-model requirement, not part of the
current partner-context implementation slice.

## Explicitly deferred

- Per-phase site-manager, administrator, sales-team, and escalation hierarchy;
  the current model does not authoritatively represent those roles.
- Phase or batch inventory release, item-level units, reservations, holds,
  failed-deal recovery, and automated re-listing.
- Per-allocation sale/rent offer changes, tenancy/occupancy state, dual-market
  policy, and the sale-subject-to-lease workflow.
- CRM synchronization, replacement, or two-way workflow automation.
- Private-object signing/download infrastructure for documents without a
  usable canonical file URL.
- Document approvals, version review, or claims that `updatedAt` means legally
  or commercially verified.
- Campaign purchasing, lead ownership redesign, sales pipeline, and ROI
  attribution.
- Site maps or resources becoming publicly available without explicit document
  visibility.

## Follow-on path

1. Validate role and phase ownership with multiple developer organizations.
2. Add an explicit scoped team-contact model when site-manager and phase-level
   responsibilities are confirmed.
3. Introduce provider-neutral CRM links and sync only after each field has a
   declared source of truth and conflict policy.
4. Complete controlled phase and batch release on top of canonical inventory
   authority; preserve reserved/sold protections and audit history.
5. Add trustworthy campaign, lead-source, and commercial outcome measurement.

## MVP acceptance outcomes

- External sales users can default to developments with released phases and
  intentionally view archived projects.
- Planning and pre-launch phases do not appear in partner payloads; selling
  phases are visible as distinct context.
- Users can find the curated development sales contact and current partner-
  visible resources from the development workspace.
- Internal or manager-only documents and raw storage identifiers never appear
  in partner responses.
- The implementation does not make inventory or CRM claims unsupported by the
  current canonical models.
