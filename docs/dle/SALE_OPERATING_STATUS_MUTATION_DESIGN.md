# DLE Sale Operating Status Mutation Design

Date: 2026-06-04
Status: Implemented and browser-proven for Sale reserve/release and the first Sale sold outcome
from reserved inventory.

## Purpose

Define the first narrow Sale operating mutation before implementation.

The first mutation should prove that the DLE can move live inventory after publish without reusing
the edit-development wizard, without enabling edit autosave, and without wiping packaging fields.

## Scope

First mutation:

- Sale only.
- Unit-type count level, not individual physical unit records.
- Two allowed transitions:
  - `available` -> `reserved`
  - `reserved` -> `available`
- One unit quantity per mutation.
- Same-transaction write to inventory counts and `development_operating_events`.

Out of scope for this first mutation:

- Sold, under-offer, bond/deal progress, withdrawn, or price changes.
- Rental held/let transitions.
- Auction registration/active/outcome transitions.
- Public page copy changes.
- Wizard `stepData` rewrites.
- Edit-development autosave.
- Lead-stage mutation or distribution deal mutation.

## Current Data Anchors

Current Sale inventory fields:

- `developments.transaction_type`
- `developments.totalUnits`
- `developments.availableUnits`
- `unit_types.total_units`
- `unit_types.available_units`
- `unit_types.reserved_units`

Current audit/event fields:

- `development_operating_events.development_id`
- `development_operating_events.unit_type_id`
- `development_operating_events.transaction_type`
- `development_operating_events.event_type`
- `development_operating_events.from_status`
- `development_operating_events.to_status`
- `development_operating_events.quantity_delta`
- `development_operating_events.before_data`
- `development_operating_events.after_data`
- `development_operating_events.metadata`
- `development_operating_events.actor_user_id`
- `development_operating_events.source_surface`

Known projection limitation:

- `developments` has `available_units` but does not have `reserved_units`.
- `unit_types` has both `available_units` and `reserved_units`.
- Therefore the first mutation should treat `unit_types` as the unit inventory source of truth and
  refresh `developments.available_units` as the aggregate sum of active unit types.
- Reserved aggregate display should be derived from `unit_types.reserved_units` or event history in
  future dashboard work, not invented as a non-existent development column.

## Mutation Contract

Proposed service function:

```ts
transitionSaleUnitReservation({
  developerId,
  developmentId,
  unitTypeId,
  actorUserId,
  transition: 'reserve' | 'release',
  note?: string,
  sourceSurface?: 'developer_dashboard' | 'developer_units_manager' | 'system',
})
```

Server-derived facts:

- Development ownership must be verified server-side.
- Transaction type must be read from `developments.transaction_type`.
- The mutation must reject non-Sale developments.
- The unit type must be read by `unit_types.id` and `unit_types.development_id`.
- The mutation must not trust client-supplied transaction type, before counts, or after counts.

Allowed transitions:

- `reserve` maps `available` -> `reserved`.
- `release` maps `reserved` -> `available`.

Count changes:

- `reserve`:
  - requires `unit_types.available_units > 0`
  - decrements `unit_types.available_units` by 1
  - increments `unit_types.reserved_units` by 1
  - records `quantity_delta = -1` because public availability decreased by one
- `release`:
  - requires `unit_types.reserved_units > 0`
  - increments `unit_types.available_units` by 1
  - decrements `unit_types.reserved_units` by 1
  - records `quantity_delta = 1` because public availability increased by one

Aggregate update:

- After the unit-type update, recompute `developments.available_units` as the sum of active
  `unit_types.available_units` for the development.
- Do not update `developments.total_units` in this first mutation.
- Do not update pricing, media, location, governance, highlights, descriptions, workflow fields, or
  public packaging copy.

Event write:

- Insert `development_operating_events.event_type = 'inventory_status_changed'`.
- Use `transaction_type = 'for_sale'` from the development record.
- Use `unit_type_id` for the changed unit type.
- Use `from_status` and `to_status` from the transition.
- Store before and after count snapshots in `before_data` and `after_data`.
- Store optional note and intent metadata in `metadata`.
- Use `source_surface = 'developer_dashboard'` for the first UI proof.

Success criteria:

- Return updated unit-type operating snapshot.
- Return the inserted event.
- Return recent operating events for dashboard readback if useful.
- Do not claim success unless both the count update and event insert succeed.

## Transaction Boundary

The inventory count update, development aggregate refresh, and operating event insert must run
inside a single database transaction.

If any step fails:

- Roll back the count update.
- Do not create a partial event.
- Return an error.
- The dashboard must keep the user-facing state recoverable and must not show a success toast.

## Ownership And Validation Errors

Reject with clear errors:

- Development not found.
- Development not owned by the developer.
- Development is not `for_sale`.
- Unit type not found for the development.
- Reserve requested when no units are available.
- Release requested when no units are reserved.
- Event insert/readback fails.

## Dashboard Proof Requirements

Browser proof must show:

- A Sale unit type can be reserved from the developer dashboard. Status: passed.
- The dashboard shows the updated available/reserved counts. Status: passed.
- The operating event appears in history. Status: passed.
- A reserved unit type can be released back to available. Status: passed.
- The dashboard shows the updated counts after release. Status: passed.
- Failed reserve/release does not claim success.
- The public development page and public search card still use Sale language after the operating
  update.
- Media, location, highlights, unit definitions, and pricing are unchanged by the mutation. Status:
  passed through browser/DB proof.
- Governance and wizard workflow state should be included in the next broader field-ownership proof
  when those fields are present in the seeded operating fixture.

## Future Extensions

After Sale reserve/release and sold-from-reserved are proven:

- Add Rental `available` -> `held` -> `available`.
- Add Auction `scheduled` -> `registration_open` -> `active`.
- Add status projections for let, passed-in, withdrawn, and closed outcomes.
- Add per-unit records only if unit-type-level counts are not enough for real operating workflows.
