# Developer phase release contract

**Status:** Canonical product and runtime contract for phase-managed development inventory.

## Inventory authority

- `unit_types` is the active aggregate inventory source. Its `total_units`,
  `available_units`, and `reserved_units` values remain authoritative.
- `development_units` is retired from runtime inventory reads and writes.
- `development_phases` owns phase identity, description, dates, and lifecycle
  status. Its stored unit-count columns are not an inventory authority; phase
  totals are derived from active `unit_types` assigned to that phase.
- `unit_types.phase_id` assigns a whole unit-type group to at most one phase.
  Unit splitting and merging are out of scope.
- A null `phase_id` means existing development-level inventory and retains the
  development's current publication behavior. Inventory assigned to a phase
  follows that phase's release status.

## Preparation and release

- New phases are created in `planning`. `planning` and `pre_launch` inventory
  is private to the developer workspace.
- A developer may assign only a whole, active unit type that is currently
  fully available (`available_units = total_units`, `reserved_units = 0`).
  This prevents moving reserved or unknown non-available inventory into a
  planned phase. The phase workflow never changes inventory counts.
- Only the dedicated release operation may move a prepared phase into
  `selling`. It requires the authenticated developer organisation to own the
  development, the parent development to satisfy the canonical public
  eligibility policy, and the phase to contain valid active inventory with at
  least one available unit.
- The release transition and `managerial_audit_logs` event commit in one
  transaction. The event records the actor, prior and new status, phase
  identity, release time, and inventory snapshot. Generic development edits
  cannot set phase status or phase assignment.
- A phase with assigned unit types cannot be deleted through aggregate
  development edits. A later cancellation or retraction flow requires its own
  explicit, audited transition.

## Market visibility and inventory reporting

- Public search, public detail, and partner inventory reads may include an
  assigned type only when its phase belongs to the same development and has
  status `selling`.
- The parent development must independently satisfy the existing public
  eligibility policy. A released phase cannot make a private or unapproved
  development public.
- Developer phase totals are derived from active assigned unit types. Report
  available, reserved, and unclassified remainder separately. Never infer the
  unclassified remainder is sold inventory.
- Phase release changes visibility only. It does not alter total, available,
  reserved, or unclassified quantities. Live availability remains a separate
  reasoned and audited action.
- Generic aggregate edits cannot change phase membership, delete phase-linked
  types, alter reserved values, or change counts on phase-linked or otherwise
  non-available inventory. Counts for live developments continue through the
  audited availability operation.

## Deferred work

This increment does not split or merge unit-type inventory, add interactive
site maps, introduce phase-specific document approvals, or add phase document
versioning.
