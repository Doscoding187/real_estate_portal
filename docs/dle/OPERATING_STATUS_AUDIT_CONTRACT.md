# DLE Operating Status and Audit Contract

Date: 2026-06-04
Status: Contract implemented through operating note/readback, Sale reserve/release, Rental
hold/release, Auction registration open/rollback, and Auction time-gated activation. Outcomes remain
future transaction-specific slices.

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
- `unit_types.auction_status`: `scheduled`, `registration_open`, `active`, `sold`, `passed_in`,
  `withdrawn`.
- `lead_activities`: lead-level notes, calls, meetings, and status changes.
- `audit_logs` and `managerial_audit_logs`: generic platform audit anchors.
- `distribution_deal_events`: distribution deal stage/event history.
- Read-only dashboard surfaces now show inventory, lead risk, and distribution readiness.

Missing DLE operating anchors:

- No transaction-native unit operating status model beyond the first Sale `available`/`reserved`,
  Rental `available`/`held`, and Auction `scheduled`/`registration_open`/`active` transitions.
- No Rental application/lease outcome or Auction outcome mutations yet.
- No DLE operating event stream coverage yet for price, release phase, public status, or
  distribution handoff changes.

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

Completed after that:

- Browser-proof Sale, Rental, and Auction note creation/readback from the developer dashboard.
- Add transaction-native inventory status changes for one engine at a time.
- Start with Sale `available` -> `reserved` -> `available`, using
  `docs/dle/SALE_OPERATING_STATUS_MUTATION_DESIGN.md`.

Current mutation status:

- Sale `available` -> `reserved` -> `available` has been implemented from the developer dashboard.
- The Sale mutation updates `unit_types.available_units`, `unit_types.reserved_units`, refreshes
  `developments.available_units`, and inserts `development_operating_events` in one transaction.
- Browser proof confirms reserve/release count changes, operating history readback, event payloads,
  aggregate availability, and no media/location/highlights/pricing/package wipe.
- Rental `available` -> `held` -> `available` has been implemented from the developer dashboard.
- The Rental mutation keeps lease-native API, dashboard, and event language while using
  `unit_types.reserved_units` only as the underlying held-count projection.
- Browser proof confirms hold/release counts, `available`/`held` event statuses, aggregate
  availability, stable lease/package fields, and continued Rental language on public/search output.
- Auction `scheduled` -> `registration_open` -> `scheduled` has been implemented from the developer
  dashboard.
- Auction `registration_open` -> `active` has been implemented from the developer dashboard with a
  server-side auction-window guard.
- Auction lifecycle uses canonical `unit_types.auction_status`; registered bidders are not faked
  through `reserved_units`.
- Browser proof confirms registration open/rollback, early activation failure, in-window
  activation, no count mutation, stable Auction packaging fields, and continued Auction
  public/search language.

## Browser Proof Requirements

Before calling operating mutations safe, prove:

- Sale operating note/event appears in dashboard history. Status: passed in browser proof.
- Rental operating note/event appears in dashboard history. Status: passed in browser proof.
- Auction operating note/event appears in dashboard history. Status: passed in browser proof.
- Failed operating event write does not claim success. Status: passed with injected browser failure.
- Sale reserve/release cannot wipe media/location/highlights/pricing/unit definitions. Status:
  passed in browser/DB proof.
- Rental hold/release cannot wipe rent/deposit/lease/furnished/media/location/governance/highlights/
  unit definitions. Status: passed in browser/DB proof.
- Rental public page and search-card labels remain transaction-native after the operating update.
  Status: passed.
- Auction public page and search-card labels remain transaction-native after registration open.
  Status: passed.
- Failed Sale reserve, Rental hold, and Auction registration mutations do not claim success, refresh
  the dashboard back to backend truth, and write no operating events. Status: passed in browser/DB
  proof.
- Sale public page labels remain transaction-native after the operating update.
- Lead CTA links still preserve selected development and transaction context.

## Open Questions Before Broader Operating Mutation Work

- Should Rental and Auction get transaction-specific lead stage enums, or should the current shared
  lead funnel keep a transaction label overlay?
- Should distribution deal events be mirrored into DLE operating events, or referenced by ID only?
- What is the rollback policy when an operating state change succeeds but downstream distribution or
  lead-stage sync fails?
- What fields and records should become the canonical bidder-registration model after Auction
  registration-open lifecycle proof?
