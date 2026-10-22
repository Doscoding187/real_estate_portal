# Developer inventory authority

## Authority boundary

`unit_types` remains the development's marketing and specification layer.
`development_inventory_items` is the operational identity layer for projects
that have explicitly moved to itemized inventory. `development_units` is
retired and must not be used by new runtime code.

`developments.inventory_mode` is explicit. Existing developments stay in
`aggregate` mode. An itemized workflow may be enabled only after an authorized
reconciliation has created one operational row for every allocation and
matched those rows to the existing aggregate totals. The system must not infer
that an unclassified remainder is sold, rented, or otherwise committed.
Runtime code must branch on this stored mode; it must not infer the mode from
whether child rows happen to exist, and it must not silently fall back between
the two authorities.

## Release rules

`development_phases.status` is the macro gate. A phase becomes `selling` only
through an authorized, audited command. Inventory items begin as `planned`.
The release command may move selected items from `planned` to `available` only
when their parent phase is `selling`. Public and partner availability for an
itemized development is the set of `available` items in selling phases, further
limited by the development's publication and channel permissions.
An item must also resolve to a valid sale or monthly-rent price from its type's
range or its own override before it can become marketable. Publication checks
the same condition for every currently available item.

Archival is an independent phase visibility marker (`archived_at`), not a
replacement for the phase's commercial lifecycle status. Only itemized
developments can archive a phase until aggregate inventory has a canonical
phase-to-inventory relationship. Archive and reopen commands require an owner,
admin, or sales manager, a reason, and an audit event. Both commands are blocked
while the phase has available, reserved, under-offer, under-contract, leased,
legal-hold, or reconciliation-required inventory. Archiving preserves every
inventory row and its status. Reopening does not release stock; phase and batch
release commands remain explicit, and archived phases cannot release inventory
or make an item available.

Phase release does not release all of its inventory. Batch release is an
explicit subset operation. Release and phase state changes must update state
and write their audit records in the same database transaction. Generic phase
editors must not set the release status directly.

## Allocation and transaction mode

Each item has one current transaction mode (`for_sale` or `for_rent`) and one
operational status. A development is presented as mixed when its currently
marketable allocations include both modes; this is a derived read value and
does not expand or mutate the canonical `developments.transaction_type` enum.
Per-type sale and rental availability and total columns are projections for
public and partner reads; item rows remain authoritative in itemized mode. A
mode change is allowed only for
`planned` or `available` items, with an authorized actor, a reason, and a
version check. Reserved,
under-offer, under-contract, sold, leased, withdrawn, legal-hold, and
reconciliation-required items cannot be silently changed. A lease must first
be explicitly closed before its item can return to market or change mode.
Sale reversals remain a separate reviewed workflow and are outside this MVP.
Developer organization members with workspace-read roles can inspect inventory
and its history. Phase release, batch release, price, detail, mode, and state
changes remain limited to owners, admins, and sales managers.

Unit-type sale and monthly-rent `from–to` values describe the default advertised
range for a shared plan. In itemized mode, an allocation may carry separate sale
and rent asking-price overrides; changing its current market mode never reuses
one mode's override as the other's price. Public and partner price ranges are
derived only from currently available allocations in unarchived selling phases, so a
development can advertise “from” the lowest currently marketable allocation
price without presenting one fixed price for every home. These are asking-price
projections, not negotiated or completed transaction amounts. Deal stages,
reservation records, selected buyer options, and final transaction prices remain
in the developer's existing operating system; Property Listify records the
resulting inventory state, reason, actor, and source reference when supplied.
This MVP does not expire reservations automatically.

If an allocation outside `planned` or `available` still relies on its unit
type's default price, that mode's shared type range is locked against catalogue
edits. New prices for other planned or available allocations can be recorded as
exact item-level overrides. This prevents a shared range edit from silently
changing the price context of protected stock.

Unit types describe shared marketable plans and standard specifications,
including their size, layout, floor/structural type, features, and optional
extras. Keep materially distinct plans, sizes, or standard feature packages as
separate unit types so their public descriptions remain accurate. An allocation
may have a different asking price because of its position or included features.
Its private allocation notes can record that operational context, alongside
separate sale and rent price overrides. Those notes are not buyer-facing. If a
difference must appear in public or partner materials, represent it in a
distinct, accurately described unit type; this MVP does not publish individual
allocation details. Price changes require an audited reason. This MVP does not
record buyer selections or calculate option surcharges from a configurable
add-on matrix.

Reconciliation writes an item-targeted initial audit event for every allocation,
including its source system, starting market mode/state, and any sale/rent price
overrides. Later releases and state, mode, and price changes add separate
item-targeted history entries. Allocation details remain private to authorized
developer workspace members and are available in the per-home history.

## Development team directory

Responsibility contacts are separate records from developer logins and
distribution-manager assignments. A contact can apply to the whole development
or one phase and has a custom role title, contact method, responsibility note,
and an explicit partner-visibility setting. Owners, admins, and sales managers
maintain the directory; other authorized developer workspace roles can read
it. Partner-visible contacts for a phase are returned only when that phase is
selling, not archived, and the partner opportunity is active. Contacts are archived rather
than deleted and every change records an actor and reason.

## Existing systems and migration

Property Listify is intended to become the native workspace for this operating
workflow. A developer can continue using a CRM during adoption, but an external
CRM is not a prerequisite or permanent authority. For this MVP bridge,
developers may reconcile inventory using their current system as evidence.
Reconciliation records its source system. Reservation, offer, contract, sale,
lease, and legal-hold state changes currently require an operating-system
reference. Returning a reservation or offer to availability also requires its
cancellation or closure reference. Returning a leased home to market requires
the source system and lease close-out or termination reference, plus an
authorized confirmation.

An item with a failed or disputed contract first moves into `legal_hold`; that
hides it without canceling the deal. An authorized manager can resolve the
hold only with a cancellation/clearance record reference and reason. They
choose whether the item becomes available through active channels, returns to
planned (hidden until a new batch release), or remains withdrawn. This records
the inventory consequence; it does not determine or execute the legal
cancellation. CRM stages alone do not change inventory state. These references
are a transition mechanism: the native end state is a Property Listify
reservation or sales-work record linked to the allocation, with an external
record identifier kept only when an integration is in use. Native records
must use the same guarded inventory commands.

The current item status and audit metadata do not yet constitute native
reservation or sales-work records. Those records are a planned extension; do
not represent this MVP bridge as a complete native deal-management workflow.

Legacy aggregate developments remain on their existing read/write path until
an explicit reconciliation is completed. No backfill may assign phases,
identifiers, transaction modes, or commitment states from aggregate counts
without developer-provided evidence.

## Implementation status

The additive schema, reconciliation command, phase and batch releases, guarded
item transitions, sale/rent mode changes, allocation-specific notes and prices,
item history, developer team directory, phase archival and reopening, and public
and partner projections are implemented behind the explicit `inventory_mode`
value. Aggregate phases cannot yet be archived because canonical inventory is
not assigned to phases in that mode. The migration chain has not been applied
to a database.
