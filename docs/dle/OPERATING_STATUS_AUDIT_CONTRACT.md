# DLE Operating Status and Audit Contract

Date: 2026-06-04
Status: Contract implemented through the first event-only note/readback slice. Inventory status and
quantity mutations remain blocked until browser proof and transition-specific design are complete.

## Purpose

Before the Development Listing Engine allows live inventory mutations, it needs a transaction-native
operating status and audit model.

Packaging edits answer: "What is the development package?"

Operating updates answer: "What is happening to the live inventory and leads after publish?"

Those two concerns must stay separate. Updating live inventory must not reuse the edit-development
wizard path, must not enable edit-development autosave, and must not silently overwrite public
packaging fields.

## Current Anchors In The Codebase

Existing anchors:

- `developments.transactionType`: `for_sale`, `for_rent`, `auction`.
- `developments.totalUnits`, `developments.availableUnits`, transaction-level price/rent/bid
  fields, and auction dates.
- `unit_types.total_units`, `unit_types.available_units`, `unit_types.reserved_units`.
- `unit_types` sale pricing fields, rental rent/deposit/lease fields, and auction fields.
- `unit_types.auction_status`: `scheduled`, `active`, `sold`, `passed_in`, `withdrawn`.
- `lead_activities`: lead-level notes, calls, meetings, and status changes.
- `audit_logs` and `managerial_audit_logs`: generic platform audit anchors.
- `distribution_deal_events`: distribution deal stage/event history.
- Read-only dashboard surfaces now show inventory, lead risk, and distribution readiness.

Missing DLE operating anchors:

- No transaction-native unit operating status model for Sale, Rental, and Auction.
- No DLE operating event stream for inventory, price, release phase, public status, or distribution
  handoff changes.
- No mutation ownership contract separating packaging edits from operating updates.
- No browser proof for dashboard operating surfaces yet.

## Operating Scope Boundaries

Packaging-owned fields:

- Identity, description, location, media, highlights, governance/finance copy, public-page content,
  unit-type definitions, pricing semantics, readiness, publish state, and public merchandising copy.

Operating-owned fields:

- Live unit availability and reservation/hold/outcome state.
- Lead stage overlay labels and lead operating actions.
- Showing/application/registration operational state.
- Price/rent/bid adjustments after publish when treated as an operating change.
- Release phases and availability windows.
- Distribution/referral readiness and handoff events.
- Audit history for live changes.

Hard rule:

- Operating mutations may update operating fields and create operating events.
- Operating mutations must not rewrite canonical wizard `stepData`, public packaging copy, media,
  location, governance, or unrelated unit-type definition fields.

## Shared Operating Status Model

All engines should share these abstract buckets:

- `open`: inventory can receive interest.
- `held`: inventory is temporarily held, reserved, or under application/registration.
- `committed`: inventory has reached a successful commercial outcome.
- `blocked`: inventory cannot progress until a condition is resolved.
- `closed`: inventory is no longer available for this transaction cycle.

These are buckets, not user-facing labels. Each transaction engine must map them to its own language.

## Sale Operating Statuses

Recommended sale statuses:

- `available`: unit can receive buyer enquiries.
- `reserved`: buyer interest has a hold/reservation.
- `under_offer`: offer is active or being negotiated.
- `bond_in_progress`: finance/deal progress is underway.
- `sold`: sale outcome is complete.
- `withdrawn`: unit is removed from sale.

Status transitions:

- `available` -> `reserved`
- `reserved` -> `available`
- `reserved` -> `under_offer`
- `under_offer` -> `bond_in_progress`
- `bond_in_progress` -> `sold`
- any non-final status -> `withdrawn`

Dashboard labels:

- Available, Reserved, Under offer, Bond/deal progress, Sold, Withdrawn.

Public labels:

- Available, Reserved, Sold out, Request callback.

## Rental Operating Statuses

Recommended rental statuses:

- `available`: rental stock can receive renter enquiries.
- `held`: unit is temporarily held for a renter.
- `application_in_progress`: rental application or documents are in progress.
- `lease_ready`: lease pack or approval is ready.
- `let`: lease outcome is complete.
- `available_soon`: unit is not open now but expected to become available.
- `withdrawn`: unit is removed from rental.

Status transitions:

- `available` -> `held`
- `held` -> `available`
- `held` -> `application_in_progress`
- `application_in_progress` -> `lease_ready`
- `lease_ready` -> `let`
- `let` -> `available_soon`
- `available_soon` -> `available`
- any non-final status -> `withdrawn`

Dashboard labels:

- Rentals available, Held, Application in progress, Lease ready, Let, Available soon, Withdrawn.

Public labels:

- Rentals available, Fully let, Rental waitlist, Rental details.

## Auction Operating Statuses

Recommended auction statuses:

- `scheduled`: auction has been scheduled but is not active.
- `registration_open`: bidder registration or interest capture is open.
- `active`: auction is active.
- `sold_at_auction`: auction sale outcome is complete.
- `passed_in`: reserve/outcome condition was not met.
- `withdrawn`: lot is removed.
- `closed`: auction cycle is closed.

Status transitions:

- `scheduled` -> `registration_open`
- `registration_open` -> `active`
- `active` -> `sold_at_auction`
- `active` -> `passed_in`
- `sold_at_auction` -> `closed`
- `passed_in` -> `closed`
- any non-final status -> `withdrawn`

Dashboard labels:

- Scheduled, Registration open, Auction active, Sold at auction, Passed in, Withdrawn, Closed.

Public labels:

- Lots open, Register interest, Auction active, Auction closed, Passed in, Sold at auction.

## Operating Event Model

Recommended event stream: `development_operating_events`.

Minimum fields:

- `id`
- `developmentId`
- `unitTypeId` nullable
- `leadId` nullable
- `distributionDealId` nullable
- `transactionType`
- `eventType`
- `fromStatus` nullable
- `toStatus` nullable
- `quantityDelta` nullable
- `beforeData` JSON nullable
- `afterData` JSON nullable
- `metadata` JSON nullable
- `actorUserId` nullable
- `sourceSurface`
- `eventAt`
- `createdAt`

Recommended `eventType` values:

- `inventory_status_changed`
- `inventory_quantity_adjusted`
- `price_changed`
- `rent_changed`
- `auction_window_changed`
- `auction_outcome_recorded`
- `lead_stage_changed`
- `showing_scheduled`
- `application_status_changed`
- `registration_status_changed`
- `distribution_enabled`
- `distribution_disabled`
- `distribution_handoff_created`
- `publish_status_changed`
- `operating_note_added`

Recommended `sourceSurface` values:

- `developer_dashboard`
- `developer_units_manager`
- `developer_leads_manager`
- `distribution_manager`
- `admin_review`
- `system`

## Mutation Guardrails

Every future operating mutation must:

- Require an explicit `developmentId`.
- Verify developer ownership or valid publisher/admin emulation context.
- Normalize transaction type from the development record, not from the client payload alone.
- Accept only operating-owned fields.
- Validate the requested transition against the transaction engine.
- Write an operating event in the same transaction as the state change.
- Return the updated operating snapshot.
- Avoid touching canonical wizard `stepData` unless a later contract explicitly allows a bridge.

Every future operating mutation must not:

- Reuse full edit-development payloads.
- Update unrelated media, location, governance, highlights, or unit definition fields.
- Silently convert Sale labels to Rental/Auction labels or vice versa.
- Claim a save/update succeeded unless the event and state mutation both succeeded.

## First Mutation Slice Recommendation

Do not start with broad inventory editing.

Implemented first mutation:

- Add a narrow operating note/event endpoint or service that writes an `operating_note_added` event
  for a development.

Why:

- It proves ownership, event writing, dashboard readback, and audit trail without changing inventory
  counts.
- It lets browser proof verify the audit surface before mutating commercial stock.
- It gives the developer dashboard a real operating history surface.

Only after that:

- Browser-proof Sale, Rental, and Auction note creation/readback from the developer dashboard.
- Add transaction-native inventory status changes for one engine at a time.
- Start with Sale `available` -> `reserved` -> `available`, using
  `docs/dle/SALE_OPERATING_STATUS_MUTATION_DESIGN.md`.
- Then Rental `available` -> `held` -> `available`.
- Then Auction `scheduled` -> `registration_open` -> `active`.

## Browser Proof Requirements

Before calling operating mutations safe, prove:

- Sale operating note/event appears in dashboard history. Status: passed in browser proof.
- Rental operating note/event appears in dashboard history. Status: passed in browser proof.
- Auction operating note/event appears in dashboard history. Status: passed in browser proof.
- Failed operating event write does not claim success. Status: passed with injected browser failure.
- Inventory mutation cannot wipe media/location/governance/unit definitions.
- Public page labels remain transaction-native after the operating update.
- Lead CTA links still preserve selected development and transaction context.

## Open Questions Before Inventory Mutation Work

- Should operating history remain event-only for the next slice, or should the first status mutation
  project state onto unit types immediately?
- Should unit-level status be stored on `unit_types`, a new unit inventory table, or an event-sourced
  projection?
- Should Rental and Auction get transaction-specific lead stage enums, or should the current shared
  lead funnel keep a transaction label overlay?
- Should distribution deal events be mirrored into DLE operating events, or referenced by ID only?
- What is the rollback policy when an operating state change succeeds but downstream distribution or
  lead-stage sync fails?
