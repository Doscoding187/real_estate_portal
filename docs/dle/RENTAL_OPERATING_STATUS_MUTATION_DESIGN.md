# DLE Rental Operating Status Mutation Design

Date: 2026-06-04
Status: Implemented and browser-proven for Rental hold/release and the first Rental let outcome
from held inventory.

## Purpose

Define the first narrow Rental operating mutation before implementation.

Rental is a separate DLE sub-engine. Its operating language, validation, event statuses, dashboard
copy, and future lead journey must be lease-native rather than borrowed from Sale.

The first Rental mutation should prove that the DLE can hold and release live rental inventory after
publish without reusing the edit-development wizard, enabling edit autosave, or wiping packaging
fields.

## Scope

First mutation:

- Rental only.
- Unit-type count level, not individual physical unit records.
- Two allowed transitions:
  - `available` -> `held`
  - `held` -> `available`
- One rental unit quantity per mutation.
- Same-transaction write to inventory counts and `development_operating_events`.

Out of scope for this first mutation:

- Application-in-progress, lease-ready, let, available-soon, or withdrawn transitions.
- Rent, deposit, lease-term, or furnished-state changes.
- Sale reservation transitions.
- Auction registration/active/outcome transitions.
- Public page copy changes.
- Wizard `stepData` rewrites.
- Edit-development autosave.
- Lead-stage mutation or distribution deal mutation.

## Current Data Anchors

Current Rental inventory and lease fields:

- `developments.transaction_type`
- `developments.total_units`
- `developments.available_units`
- `developments.monthly_rent_from`
- `developments.monthly_rent_to`
- `unit_types.total_units`
- `unit_types.available_units`
- `unit_types.reserved_units`
- `unit_types.monthly_rent_from`
- `unit_types.monthly_rent_to`
- `unit_types.deposit_required`
- `unit_types.lease_term`
- `unit_types.is_furnished`

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

- `unit_types.reserved_units` is the only current held/reserved count column.
- For Rental, that column may be used as the underlying held-count projection, but Rental APIs,
  events, dashboard labels, and product language must expose it as `held`, never `reserved`.
- `unit_types` remains the first inventory source of truth.
- `developments.available_units` is refreshed as the aggregate sum of active unit types.
- Do not invent a `developments.held_units` column in this first slice.

## Rental Mutation Contract

Public service function:

```ts
transitionRentalUnitHold({
  developerId,
  developmentId,
  unitTypeId,
  actorUserId,
  transition: 'hold' | 'release',
  note?: string,
  sourceSurface?: 'developer_dashboard' | 'developer_units_manager' | 'system',
})
```

Server-derived facts:

- Development ownership must be verified server-side.
- Transaction type must be read from `developments.transaction_type`.
- The mutation must reject non-Rental developments.
- The unit type must be read by `unit_types.id` and `unit_types.development_id`.
- The mutation must not trust client-supplied transaction type, before counts, or after counts.

Allowed transitions:

- `hold` maps `available` -> `held`.
- `release` maps `held` -> `available`.

Count changes:

- `hold`:
  - requires `unit_types.available_units > 0`
  - decrements `unit_types.available_units` by 1
  - increments the underlying `unit_types.reserved_units` projection by 1
  - records `quantity_delta = -1` because public rental availability decreased by one
- `release`:
  - requires the underlying `unit_types.reserved_units > 0`
  - increments `unit_types.available_units` by 1
  - decrements the underlying `unit_types.reserved_units` projection by 1
  - records `quantity_delta = 1` because public rental availability increased by one

Aggregate update:

- After the unit-type update, recompute `developments.available_units` as the sum of active
  `unit_types.available_units` for the development.
- Do not update `developments.total_units` in this first mutation.
- Do not update rent, deposit, lease term, furnished state, media, location, governance,
  highlights, descriptions, workflow fields, or public packaging copy.

Event write:

- Insert `development_operating_events.event_type = 'inventory_status_changed'`.
- Use `transaction_type = 'for_rent'` from the development record.
- Use `unit_type_id` for the changed unit type.
- Use Rental-native `from_status` and `to_status`: `available` and `held`.
- Store before and after count snapshots in `before_data` and `after_data`.
- Snapshot/API language should expose `heldUnits`; metadata may record that the current underlying
  projection column is `reserved_units`.
- Store optional note and intent metadata in `metadata`.
- Use `source_surface = 'developer_dashboard'` for the first UI proof.

## Shared Infrastructure Boundary

Sale and Rental may share private count-update and event-write infrastructure where it removes real
duplication.

They must keep distinct public contracts:

- Sale: `reserve` / `release`, `reserved`, Sale pricing context.
- Rental: `hold` / `release`, `held`, monthly rent/deposit/lease context.

The shared implementation must not make the dashboard, router, event statuses, error messages, or
returned operating snapshots generic or Sale-shaped.

## Transaction Boundary

The inventory count update, development aggregate refresh, and operating event insert must run
inside a single database transaction.

If any step fails:

- Roll back the count update.
- Do not create a partial event.
- Return an error.
- The dashboard must keep the user-facing state recoverable and must not show a success toast.

## Ownership And Validation Errors

Reject with clear Rental-native errors:

- Development not found.
- Development not owned by the developer.
- Development is not `for_rent`.
- Unit type not found for the development.
- Hold requested when no rental units are available.
- Release requested when no rental units are held.
- Event insert/readback fails.

## Dashboard Proof Requirements

Browser proof must show:

- A Rental unit type can be held from the developer dashboard. Status: passed.
- The dashboard uses `Rental Inventory`, `held`, `Hold`, and `Release`, not Sale reservation labels.
  Status: passed.
- The dashboard shows the updated available/held counts. Status: passed.
- The operating event appears in history with `available` -> `held`. Status: passed.
- A held rental unit type can be released back to available. Status: passed.
- The dashboard shows the updated counts after release. Status: passed.
- Failed hold/release does not claim success.
- The public development page and public search card still use Rental language after the operating
  update. Status: passed.
- Monthly rent, deposit, lease term, furnished state, media, location, governance, highlights, unit
  definitions, and wizard workflow state are unchanged by the mutation. Status: passed for persisted
  monthly rent, deposit, lease term, furnished state, media, location, governance, highlights, and
  unit definitions; canonical wizard workflow state remains a future seeded-fixture assertion.

## Future Extensions

After Rental hold/release and let-from-held are proven:

- Add available-soon and withdrawn outcomes.
- Add Rental-native lead-stage overlays and document/readiness signals.
- Add Auction `scheduled` -> `registration_open` -> `active`.
- Add per-unit records only if unit-type-level counts are not enough for real leasing operations.
