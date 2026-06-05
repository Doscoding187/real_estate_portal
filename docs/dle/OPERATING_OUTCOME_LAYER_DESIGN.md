# DLE Operating Outcome Layer Design

Date: 2026-06-04
Status: Sale sold from reserved inventory and Rental let from held inventory are implemented and
browser-proven. Auction sold/passed-in/withdrawn outcomes remain future transaction-specific
slices.

## Purpose

Define the next operating-layer contract before implementing sold, let, or auction outcome
mutations.

The DLE operating layer now has first live transitions:

- Sale reserve/release.
- Sale sold from reserved inventory.
- Rental hold/release.
- Rental let from held inventory.
- Auction registration open/rollback.
- Auction time-gated activation.

The next step is not another generic status toggle. Outcomes are commercial commitments. They affect
inventory, public availability, lead stages, developer reporting, distribution/referral workflows,
and audit history. They must be modeled transaction-first.

## Design Principle

Outcome mutations answer: "What commercial result happened to this inventory?"

They are not packaging edits and they are not normal draft/update saves.

Outcome mutations must:

- Use operating endpoints, not edit-development payloads.
- Verify developer ownership and transaction type server-side.
- Validate current operating state.
- Write an operating event in the same transaction as the state projection.
- Update only operating-owned fields.
- Preserve media, location, governance, highlights, pricing semantics, unit definitions, and
  canonical wizard `stepData`.
- Refresh public availability and dashboard state after success.
- Never claim success if the state projection or event insert fails.

## Current Implementation Anchors

Current canonical records:

- `developments`
  - `transaction_type`
  - `status`
  - `total_units`
  - `available_units`
  - transaction pricing fields
- `unit_types`
  - `total_units`
  - `available_units`
  - `reserved_units`
  - rental lease/rent/deposit fields
  - auction bid/window/status fields
- `development_units`
  - unit-level `status`: `available`, `reserved`, `sold`
- `leads`
  - shared sale-shaped stages and `funnel_stage`
- `development_operating_events`
  - operating audit stream
- distribution/referral records
  - partner access, deals, deal events, documents, commissions

Current constraints:

- `unit_types` does not have explicit `sold_units`, `let_units`, or `passed_in_units` columns.
- `unit_types.reserved_units` is already used as Sale reserved and Rental held projection.
- Auction lifecycle uses `unit_types.auction_status`.
- `development_units.status` has individual-unit Sale-friendly states, but the current DLE
  operating dashboard works primarily at unit-type level.
- Lead stages are shared and sale-shaped, so transaction-native outcome language currently needs an
  overlay.

## Projection Decision

Do not implement outcomes only as events.

Events are audit history. The current operating state must also be queryable without replaying the
event stream.

For implementation slices, use these projections deliberately and document the temporary limits:

- Sale outcome:
  - decrement `unit_types.reserved_units`;
  - decrement `unit_types.available_units` only if the sold unit is taken directly from available
    stock;
  - keep `developments.available_units` equal to the sum of active unit-type available stock;
  - write `inventory_status_changed` with `reserved` or `available` -> `sold`.
- Rental outcome:
  - decrement `unit_types.reserved_units` when a held rental becomes let;
  - decrement `unit_types.available_units` only if the let is taken directly from available stock;
  - keep `developments.available_units` equal to active rental availability;
  - write `inventory_status_changed` with `held` or `available` -> `let`.
- Auction outcome:
  - update `unit_types.auction_status` from `active` to `sold`, `passed_in`, or `withdrawn`;
  - do not use `reserved_units` as bidder or auction outcome count;
  - write `auction_outcome_recorded` for sold/passed-in and `inventory_status_changed` or
    `auction_outcome_recorded` for withdrawn, depending on the final implementation contract.

Longer-term schema recommendation:

- Add explicit type-level outcome counters before broad reporting:
  - Sale: `sold_units`.
  - Rental: `let_units`.
  - Auction: use lifecycle status per lot/type, and add bidder/outcome records if lot-level
    granularity becomes necessary.

Reason:

- Inferring sold/let only from `total - available - reserved` is acceptable as a temporary display
  projection, but it is weak for audit, reporting, and partial outcome reversals.

Hard guardrail:

- Do not call inferred sold/let counts canonical reporting data until explicit projections or
  individual-unit outcomes are implemented.
- Do not reuse `reserved_units` for sold units, let units, bidder counts, auction registrations, or
  passed-in outcomes.
- Do not update public copy to imply precise sold/let reporting if the current slice only supports
  outcome actions and temporary display projection.

## Sale Outcome Engine

### Intended Commercial Meaning

Sale outcome means a unit has moved from live buyer pipeline into a completed sale.

### Allowed Transitions

Initial implementation should support:

- `reserved` -> `sold`
- optionally `available` -> `sold` only when the user explicitly confirms a direct sale

Do not implement:

- offer/bond intermediate states in the same slice;
- bulk sold-out automation without explicit proof;
- lead-stage conversion side effects without a separate lead synchronization contract.

### Required Inputs

- `developmentId`
- `unitTypeId`
- outcome source:
  - `reserved`
  - `available_direct`
- optional `leadId`
- optional note
- optional sold price, if it will be captured

### State Rules

- `reserved` -> `sold` requires `reserved_units > 0`.
- `available_direct` -> `sold` requires `available_units > 0`.
- The mutation must update `developments.available_units` from the active unit-type sum.
- The mutation must not change sale pricing, media, location, governance, or unit definition fields.

### Public Output

- If unit type availability reaches zero, public unit card should move toward `Sold out` or waitlist
  language.
- Development-level public status should become `sold-out` only when all active sale unit types have
  zero available and no remaining releasable reserved inventory.
- Search cards should not disappear from public output unless existing product rules explicitly
  filter sold-out developments.

### Lead And Distribution Impact

- If `leadId` is provided, lead may later move to `closed_won`, but the first outcome slice should
  not silently mutate lead stages until the lead sync contract is written.
- Distribution deal/commission outcome should be a later explicit handoff, not hidden in inventory
  mutation.

## Rental Outcome Engine

### Intended Commercial Meaning

Rental outcome means a rental unit has become let or lease-signed.

### Allowed Transitions

Initial implementation should support:

- `held` -> `let`
- optionally `available` -> `let` only when explicitly confirmed as direct let

Do not implement:

- full application pipeline;
- lease document workflow;
- available-soon recycling;
- automatic lead-stage changes.

### Required Inputs

- `developmentId`
- `unitTypeId`
- outcome source:
  - `held`
  - `available_direct`
- optional `leadId`
- optional note
- optional lease start/end dates, if captured

### State Rules

- `held` -> `let` requires held count (`reserved_units`) greater than zero.
- `available_direct` -> `let` requires `available_units > 0`.
- The mutation must update `developments.available_units` from the active rental unit-type sum.
- The mutation must preserve monthly rent, deposit, lease term, furnished state, media, location,
  governance, highlights, and unit definitions.

### Public Output

- If availability reaches zero, public unit card should say `Fully let` or equivalent rental-native
  language, not `Sold out`.
- Development-level status should remain transaction-aware. Do not reuse Sale `sold-out` language
  visually for Rental unless the UI maps it to `Fully let`.

### Lead And Distribution Impact

- Rental closed outcome should be presented as `Lease signed` / `Let`, even if the current shared
  lead stage stores `closed_won`.
- Referral leasing commissions and document handoffs need a separate contract before automation.

## Auction Outcome Engine

### Intended Commercial Meaning

Auction outcome means an active auction lot reached a final auction result.

### Allowed Transitions

Initial implementation should support:

- `active` -> `sold`
- `active` -> `passed_in`
- `scheduled` / `registration_open` / `active` -> `withdrawn`

Do not implement:

- bidder registration records;
- winning bidder records;
- deposit/payment collection;
- automatic reserve validation;
- post-auction negotiation workflow.

### Required Inputs

- `developmentId`
- `unitTypeId`
- outcome:
  - `sold`
  - `passed_in`
  - `withdrawn`
- optional `leadId`
- optional note
- optional hammer price, reserve-met flag, bidder reference, and terms acceptance evidence

### State Rules

- `sold` requires current `auction_status = active`.
- `passed_in` requires current `auction_status = active`.
- `withdrawn` may apply to non-final statuses.
- Outcome mutation updates only `unit_types.auction_status` and writes an audit event.
- Outcome mutation must not change starting bid, reserve price, auction window, public media,
  documents, legal terms, location, governance, highlights, unit definitions, or wizard `stepData`.

### Public Output

- `sold` displays as `Sold at auction`.
- `passed_in` displays as `Passed in`.
- `withdrawn` displays as `Withdrawn`.
- Search cards should preserve Auction pricing language where shown, but inactive outcome lots
  should not invite active bidding.

### Lead And Distribution Impact

- If a winning bidder or bidder-ready lead is linked later, it may map to `closed_won`; otherwise
  outcome capture should remain inventory-only.
- Passed-in and withdrawn outcomes should not automatically mark all bidder leads lost without a
  later lead policy.

## Shared Failure Rules

Every outcome mutation must prove:

- wrong transaction type fails;
- missing unit type fails;
- invalid current status fails;
- zero available/held/reserved stock fails where relevant;
- failed mutation does not show success;
- failed mutation writes no operating event;
- successful mutation writes exactly one operating event;
- successful mutation returns/refetches updated dashboard state;
- unrelated packaging fields remain unchanged.

## Public Availability Rules

Outcome implementation must update or preserve public availability deliberately:

- Sale: zero available should show Sale-native sold/waitlist language.
- Rental: zero available should show Rental-native fully-let/waitlist language.
- Auction: outcome status should override generic available-count language.

Do not rely on one generic `available_units = 0` message for all transactions.

Search/list cards and public unit cards must use transaction-native outcome labels:

- Sale: `Sold`, `Sold out`, `Request callback`, or `Join waitlist`.
- Rental: `Let`, `Fully let`, `Rental waitlist`, or `Check next availability`.
- Auction: `Sold at auction`, `Passed in`, `Withdrawn`, or `Auction closed`.

Outcome states must also suppress incompatible CTAs. For example, an Auction lot marked
`passed_in` must not still invite active bidding, and a fully-let Rental unit must not use Sale
sold-out wording.

## Lead Stage Policy

The current lead model is shared and sale-shaped.

Initial outcome mutations should not automatically transition leads unless:

- the user explicitly supplies a `leadId`;
- the transition is allowed by `shared/developerFunnel.ts`;
- a `lead_stage_changed` operating event is written or referenced;
- transaction-native display labels are applied in dashboards.

Recommended label overlay:

- Sale `closed_won`: Sold.
- Rental `closed_won`: Lease signed / Let.
- Auction `closed_won`: Sold at auction.
- Auction `closed_lost`: Passed in / withdrawn follow-up, only when explicitly chosen.

## Distribution And Referral Policy

Outcome mutations should not silently complete referral deals.

Before distribution automation:

- define whether `distribution_deal_events` should be mirrored into
  `development_operating_events`;
- define commission readiness requirements;
- define document and checklist requirements;
- define whether manager review is required before closing a referral deal.

## Developer Dashboard Contract

Outcome actions must be exposed as operating actions, not packaging actions.

The dashboard should show:

- current transaction engine: Sale, Rental, or Auction;
- current inventory status using transaction-native labels;
- the next valid outcome actions for the current state;
- recent operating events including the actor, timestamp, from/to status, and note where present;
- no success state unless both the state projection and operating event write succeeded.

Outcome actions should be narrow:

- Sale sold action should only appear when Sale inventory has reserved stock, unless a later direct
  sale action is explicitly designed.
- Rental let action should only appear when Rental inventory has held stock, unless a later direct
  let action is explicitly designed.
- Auction sold/passed-in actions should only appear for active lots. Withdrawn may appear for
  non-final lots where policy allows.

## Admin Review Impact

Operating outcomes are not the same as publish approval.

Initial outcome mutations should not automatically move a development back to pending review unless
they change public claims that require moderation. Public-facing outcome labels are expected live
operations, but later slices may require manager/admin review for:

- manual outcome reversals;
- suspicious bulk outcome changes;
- public price/rent/bid changes after an outcome;
- distribution deal closure or commission triggers;
- withdrawal reason disputes.

## Readiness Before Coding

Before any outcome implementation starts, the agent must confirm:

- the current transaction type is derived from the development record;
- the target unit type belongs to the development and matching transaction engine;
- current state supports the requested transition;
- the mutation can update state and write the event in one transaction;
- the UI can refetch and show backend truth after success or failure;
- public output has transaction-native copy for the resulting state;
- the browser proof can compare before/after packaging fields to catch field wipes.

## Implementation Status

Implemented Sale sold from reserved inventory:

- Added `developer.markSaleUnitTypeSold`.
- Requires Sale development ownership and `reserved_units > 0`.
- Decrements only `unit_types.reserved_units`.
- Keeps `unit_types.available_units` unchanged for reserved-to-sold.
- Refreshes `developments.available_units` from active unit types.
- Writes `inventory_status_changed` with `reserved` -> `sold` and `quantity_delta = 0`.
- Shows `Mark Sold` in the Sale dashboard only when reserved stock exists.
- Browser proof covers success, event readback, dashboard projection refresh, no false success on
  stale reserved-stock failure, and packaging-field preservation.

The dashboard exposes `sold projection` from `total_units - available_units - reserved_units`.
That remains a temporary projection, not canonical sold-count reporting.

Implemented Rental let from held inventory:

- Added `developer.markRentalUnitTypeLet`.
- Requires Rental development ownership and `reserved_units > 0` as the current held-count
  projection.
- Decrements only `unit_types.reserved_units`.
- Keeps `unit_types.available_units` unchanged for held-to-let.
- Refreshes `developments.available_units` from active unit types.
- Writes `inventory_status_changed` with `held` -> `let` and `quantity_delta = 0`.
- Shows `Mark Let` in the Rental dashboard only when held stock exists.
- Browser proof covers success, event readback, dashboard projection refresh, no false success on
  stale held-stock failure, public Rental language, and packaging-field preservation.

The dashboard exposes `let projection` from `total_units - available_units - reserved_units`.
That remains a temporary projection, not canonical let-count reporting.

## Recommended Implementation Order

1. Implement Auction sold/passed-in/withdrawn outcome from active/non-final lifecycle.
2. Strengthen transaction-native public availability language for all outcome states.
3. Design and implement lead-stage synchronization explicitly.
4. Design and implement distribution/referral outcome handoff explicitly.

## Completed First Implementation Slice

Implement Sale sold outcome first.

Why:

- Sale already has the strongest proof baseline.
- `development_units.status` already has `sold`, even if the current DLE dashboard is unit-type
  oriented.
- The existing Sale reserve/release mutation provides the safest immediate transition:
  `reserved` -> `sold`.

First Sale sold slice should:

- add `developer.markSaleUnitTypeSold` or equivalent narrow endpoint;
- require `reserved_units > 0`;
- decrement `reserved_units`;
- keep `available_units` unchanged for reserved-to-sold;
- update development aggregate availability from unit types;
- write `inventory_status_changed` with `reserved` -> `sold`;
- show Sale-native sold/outcome action in the dashboard;
- browser-proof no false success, event readback, public availability language, and field
  ownership.

Do not include:

- automatic lead conversion;
- commission/deal closure;
- new sold-count reporting claims;
- edit-development autosave;
- broad inventory editing.

## Completed Second Implementation Slice

Implement Rental let outcome from held inventory.

First Rental let slice should:

- add a narrow Rental outcome endpoint;
- require `reserved_units > 0` as the current held-count projection;
- decrement only `reserved_units`;
- keep `available_units` unchanged for held-to-let;
- write `inventory_status_changed` with `held` -> `let`;
- show Rental-native `Mark Let` / `Lease signed` action in the dashboard;
- browser-proof no false success, event readback, Rental-native public availability language, and
  field ownership.

Do not include:

- full application pipeline;
- lease document workflow;
- automatic lead conversion;
- commission/deal closure;
- edit-development autosave.

## Next Implementation Slice Recommendation

Implement Auction sold/passed-in/withdrawn outcome from the active/non-final lifecycle.

First Auction outcome slice should:

- add a narrow Auction outcome endpoint;
- require `auction_status = active` for `sold` and `passed_in`;
- allow `withdrawn` only from explicitly permitted non-final statuses;
- update only `unit_types.auction_status`;
- write `auction_outcome_recorded` or a documented event contract for each outcome;
- show Auction-native outcome actions in the dashboard;
- browser-proof no false success, event readback, public Auction outcome language, and field
  ownership.

Do not include:

- bidder registration records;
- winning bidder automation;
- deposit/payment workflow;
- automatic reserve validation;
- post-auction negotiation workflow;
- automatic lead conversion or distribution deal closure.
