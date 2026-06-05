# DLE Auction Operating Lifecycle Design

Date: 2026-06-04
Status: Stage A registration open/rollback, Stage B time-gated activation, and Stage C outcomes
are implemented and browser-proven. Bidder registration, winning-bidder records, and
distribution/referral outcome handoff remain future Auction-specific slices.

## Purpose

Define the Auction operating lifecycle before changing schema or runtime behavior.

Auction is a separate DLE sub-engine. It must not be modeled as Sale reservations with different
labels or as Rental holds with a countdown. Auction operations revolve around lot lifecycle,
registration readiness, auction windows, bidder readiness, outcomes, and legal/terms context.

## Current-State Audit

Current canonical Auction anchors:

- `developments.transaction_type = 'auction'`
- `developments.auction_start_date`
- `developments.auction_end_date`
- `developments.starting_bid_from`
- `developments.reserve_price_from`
- `unit_types.starting_bid`
- `unit_types.reserve_price`
- `unit_types.auction_start_date`
- `unit_types.auction_end_date`
- `unit_types.auction_status`
- `unit_types.total_units`
- `unit_types.available_units`
- `unit_types.reserved_units`
- `development_operating_events`

Current `unit_types.auction_status` values:

- `scheduled`
- `registration_open`
- `active`
- `sold`
- `passed_in`
- `withdrawn`

Current gaps:

- The intended lifecycle includes `registration_open`, but the canonical enum does not.
- There is no DLE bidder-registration record or registered-bidder count.
- `reserved_units` is not semantically equivalent to registered bidders and must not be reused as
  one.
- There is no development-level Auction lifecycle status; lot/unit-type status is the current
  canonical projection.
- `sold_at_auction` and `closed` are intended product-language states but are not canonical enum
  values.
- Public/search merchandising carries Auction pricing language, but does not yet consistently expose
  the lot lifecycle projection.
- The packaging wizard currently exposes `scheduled` and `active` Auction status choices. That is a
  legacy ownership risk because live operating status should belong to the operating layer after
  publish.

## Source-Of-Truth Decision

Use `unit_types.auction_status` as the canonical Auction lot lifecycle projection.

Required schema change before the first mutation:

- Extend `unit_types.auction_status` with `registration_open`.
- Keep the existing values for compatibility:
  `scheduled`, `registration_open`, `active`, `sold`, `passed_in`, `withdrawn`.
- Update the Drizzle schema, SQL migration, TypeScript unions, sanitizers, hydration/submit types,
  and focused tests together.

Do not create a separate Auction status column on `developments` in the first slice.

Development-level Auction operating state should initially be derived from active lot statuses:

- all scheduled: `scheduled`
- any registration open, none active: `registration_open`
- any active: `active`
- all final outcomes: derive an outcome summary rather than inventing one development status

Do not treat `development_operating_events` as the only status source. Events provide audit history;
`unit_types.auction_status` provides the current lot projection.

## Intended Auction Lifecycle

Canonical first-class statuses:

- `scheduled`: lot and auction window are configured, but registration is not open.
- `registration_open`: bidder interest/registration can be accepted before the auction starts.
- `active`: bidding window is active.
- `sold`: lot reached a successful auction sale outcome.
- `passed_in`: lot did not reach the required outcome/reserve.
- `withdrawn`: lot was removed before outcome.

Product-language mapping:

- `sold` may display as `Sold at auction`.
- `passed_in` may display as `Passed in`.
- `registration_open` displays as `Registration open`.

Future `closed` behavior should be derived from final lot outcomes unless a later contract proves a
separate canonical closed state is needed.

## Transition Contract

Allowed operating transitions:

- `scheduled` -> `registration_open`
- `registration_open` -> `scheduled` only as an explicit registration rollback
- `registration_open` -> `active`
- `active` -> `sold`
- `active` -> `passed_in`
- any non-final status -> `withdrawn`

Disallowed transitions:

- `scheduled` -> `active` without passing registration readiness.
- any manual transition to `active` before the lot auction start time.
- `active` after the lot auction end time.
- any count-based reserve/hold transition for Auction.
- any outcome transition that silently changes starting bid, reserve price, dates, legal terms, or
  public packaging.

## Staged Implementation

### Stage A: Registration Open/Rollback

First implementation mutation:

```ts
transitionAuctionRegistration({
  developerId,
  developmentId,
  unitTypeId,
  actorUserId,
  transition: 'open_registration' | 'close_registration',
  note?: string,
  sourceSurface?: 'developer_dashboard' | 'developer_units_manager' | 'system',
})
```

Rules:

- Development ownership is verified server-side.
- Transaction type is read from the development and must be `auction`.
- The lot must be active as a unit type and belong to the development.
- `open_registration` requires current `auction_status = 'scheduled'`.
- `open_registration` requires valid starting bid, valid reserve when present, and valid future
  auction start/end dates.
- `close_registration` requires current `auction_status = 'registration_open'`.
- The mutation updates only `unit_types.auction_status`.
- The mutation writes a `registration_status_changed` event in the same DB transaction.
- Event statuses are `scheduled` and `registration_open`.
- No inventory counts are changed.

### Stage B: Time-Gated Activation

Second implementation mutation:

```ts
activateAuctionLot({
  developerId,
  developmentId,
  unitTypeId,
  actorUserId,
  sourceSurface?: 'developer_dashboard' | 'developer_units_manager' | 'system',
})
```

Rules:

- Current status must be `registration_open`.
- Current time must be at or after `auction_start_date` and before `auction_end_date`.
- Activation must reject missing/invalid windows and early/late activation.
- A future system scheduler may activate lots automatically; manual activation must obey the same
  time guard.
- The mutation updates only `unit_types.auction_status`.
- The mutation writes an `inventory_status_changed` event with
  `registration_open` -> `active` in the same DB transaction.

### Stage C: Outcomes

Third implementation mutation:

```ts
recordAuctionLotOutcome({
  developerId,
  developmentId,
  unitTypeId,
  actorUserId,
  outcome: 'sold' | 'passed_in' | 'withdrawn',
  note?: string,
  sourceSurface?: 'developer_dashboard' | 'developer_units_manager' | 'system',
})
```

Implemented transitions:

- `active` -> `sold`
- `active` -> `passed_in`
- non-final -> `withdrawn`

Rules:

- `sold` requires current `auction_status = 'active'`.
- `passed_in` requires current `auction_status = 'active'`.
- `withdrawn` is allowed from non-final statuses and rejected from `sold`, `passed_in`, and
  `withdrawn`.
- The mutation updates only `unit_types.auction_status`.
- The mutation writes `auction_outcome_recorded` in the same DB transaction.
- Outcome events capture outcome metadata and before/after Auction lot snapshots.
- No inventory counts, bidder records, pricing fields, auction windows, media, documents, location,
  governance, highlights, unit definitions, or canonical wizard `stepData` are changed.

## Registration Model Boundary

`registration_open` means the lot can accept registration/interest.

It does not prove:

- a bidder is registered;
- proof of funds or FICA is complete;
- auction terms were accepted;
- a registration deposit was paid;
- a bidder is eligible to bid.

Do not map registered bidders to `unit_types.reserved_units`.

A later bidder-registration model should have its own records, statuses, document/readiness
signals, and lead/distribution context. Until then, the operating dashboard may show registration
readiness and Auction enquiry counts, but not a fictional registered-bidder count.

## Packaging And Operating Ownership

Packaging-owned Auction fields:

- starting bid
- reserve price and reserve visibility policy
- auction start/end window
- legal/terms documents
- registration requirements
- buyer premium, deposit, bid increment, venue/provider when added
- media, highlights, description, location, governance, and unit definitions

Operating-owned Auction fields:

- current lot lifecycle status after publish
- registration-open/closed audit events
- active/outcome/withdrawn audit events
- future bidder registration/readiness records

Hard rule:

- Auction operating mutations must not change starting bid, reserve price, auction window, media,
  documents, location, governance, highlights, descriptions, or canonical wizard `stepData`.
- Auction window changes are separate explicit `auction_window_changed` mutations and are not
  hidden inside lifecycle transitions.

## Packaging Wizard Ownership Correction

The packaging wizard currently exposes `scheduled` and `active` as Auction status choices.

Recommended correction:

- New Auction packages default to `scheduled`.
- The packaging wizard should not manually activate a published lot.
- `registration_open` should not become a normal packaging form choice.
- Live lifecycle changes should happen from the developer operating dashboard with event audit.
- Existing draft/edit compatibility may preserve stored Auction status during migration, but edit
  saves must not silently reset a live operating status.

This correction must be designed alongside edit-published ownership so packaging saves cannot undo
an operating lifecycle transition.

## Dashboard Contract

The Auction operating panel should show:

- lot/unit name
- current lifecycle status
- starting bid
- reserve visibility state or internal reserve context
- auction start/end window
- registration readiness
- Auction-native action:
  - Scheduled: `Open Registration`
  - Registration open: `Activate Auction` and `Close Registration`
  - Active: `Mark Sold` and `Mark Passed In`
  - Non-final statuses: `Withdraw`
- no Sale `Reserve` or Rental `Hold` controls
- no fictional registered-bidder count

## Public Merchandising Contract

After an Auction lifecycle update:

- Public detail and search cards must continue using `Starting Bid` / `Bid from`.
- `scheduled` should show auction timing and interest/pack CTA.
- `registration_open` should visibly show `Registration open` and a registration-interest CTA.
- `active` should visibly show `Auction active`.
- Sold/passed-in/withdrawn states must use Auction-native outcome language.
- Selected lot and Auction transaction context must remain intact in lead capture.

Public status language is a separate product surface backed by the canonical lot projection; the
operating mutation must not rewrite public packaging copy.

## Browser And DB Proof Requirements

Stage A browser proof must show:

- A scheduled Auction lot appears in an Auction-only operating panel. Status: passed.
- The panel shows starting bid and auction window. Status: passed.
- The panel does not show Sale Reserve or Rental Hold controls. Status: passed.
- Opening registration changes the lot status to `registration_open`. Status: passed.
- The dashboard shows `Registration open`. Status: passed.
- A `registration_status_changed` event records `scheduled` -> `registration_open`. Status:
  passed.
- Closing registration changes the lot back to `scheduled` and writes the reverse event. Status:
  passed.
- Starting bid, reserve price, dates, media, documents, location, governance, highlights, unit
  definitions, and wizard workflow state remain unchanged. Status: passed for persisted bids,
  dates, media, documents, location, governance, highlights, and unit definitions; canonical wizard
  workflow state remains a future seeded-fixture assertion.
- Public detail/search output remains Auction-native and reflects registration-open language where
  designed. Status: passed.
- Failed lifecycle writes do not claim success. Status: passed for stale
  `scheduled` -> `registration_open` browser/DB proof.

Stage B browser proof must additionally show:

- Early activation is rejected without a false success state. Status: passed.
- Activation succeeds only inside the auction window. Status: passed.
- Activation writes `registration_open` -> `active` atomically. Status: passed.

Stage C browser proof must additionally show:

- Active lots can be marked `sold` and `passed_in`. Status: passed.
- A non-final lot can be marked `withdrawn`. Status: passed.
- Outcome mutations write `auction_outcome_recorded` events atomically. Status: passed.
- Starting bid, reserve price, auction window, unit size, parking, media, documents, location,
  governance, highlights, unit definitions, and public packaging fields remain unchanged. Status:
  passed for seeded DB/public proof.
- Public detail and search output use Auction-native outcome language: `Sold at auction`,
  `Passed in`, and `Withdrawn`. Status: passed.
- A stale active-state outcome failure shows the backend error, does not show success, refreshes
  backend truth, and writes no operating event. Status: passed.

## First Implementation Recommendation

Implement Stage A first:

1. Extend the canonical Auction status enum with `registration_open`.
2. Update schema/types/sanitizers and focused compatibility tests.
3. Add Auction operating inventory readback.
4. Add `open_registration` / `close_registration` mutation with same-transaction event audit.
5. Add Auction-only dashboard panel.
6. Browser-proof lifecycle, field ownership, and public Auction language.

Stage A, Stage B, and Stage C are now implemented. Do not add bidder registration, winning-bidder
automation, payment/deposit handling, reserve validation, lead conversion, or distribution/referral
closure without a separate contract and proof slice.
