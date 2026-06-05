# DLE Outcome Handoff Contract

Date: 2026-06-05
Status: Design contract. No runtime automation is implemented in this slice.

## Purpose

Define how DLE operating outcomes may later synchronize with leads and distribution/referral deals
without turning inventory mutations into hidden CRM, commission, or referral closure mutations.

Sale sold, Rental let, and Auction sold/passed-in/withdrawn outcomes are now browser-proven as
inventory operations. The next risk is cross-surface coupling: an inventory outcome could be
mistakenly treated as permission to close leads, close distribution deals, trigger commission, or
mark every related referral as won or lost.

This contract keeps the DLE transaction-first:

- Inventory outcomes say what happened to live development inventory.
- Lead synchronization says what happened to a specific prospect or enquiry.
- Distribution handoff says what happened to a specific partner/referral deal.
- Commission readiness says whether the distribution service's own requirements are satisfied.

Those are related, but they are not the same mutation.

## Current Implementation Anchors

Current lead anchors:

- `shared/developerFunnel.ts`
  - canonical lead stages: `new`, `contacted`, `qualified`, `viewing_scheduled`,
    `viewing_completed`, `offer_made`, `deal_in_progress`, `closed_won`, `closed_lost`, `spam`,
    `duplicate`, `archived`
  - allowed transitions through `isLeadTransitionAllowed`
  - owner types: `developer_sales`, `agency`, `distribution_partner`, `unassigned`
- `drizzle/schema/leads.ts`
  - lead development context: `developmentId`
  - selected unit context: `unitId`, `unitName`, `unitPriceFrom`, bedrooms, bathrooms
  - older lead status and `funnelStage` fields that remain sale-shaped
- `server/developerRouter.ts`
  - `transitionLead`, `logLeadActivity`, `assignLead`, `setLeadNextAction`
- `development_operating_events`
  - event type contract already includes `lead_stage_changed`

Current distribution/referral anchors:

- `drizzle/schema/distribution.ts`
  - `distribution_deals.current_stage` values:
    `viewing_scheduled`, `viewing_completed`, `application_submitted`, `contract_signed`,
    `bond_approved`, `commission_pending`, `commission_paid`, `cancelled`
  - `distribution_deal_events` for deal-stage audit
  - commission status and trigger fields
  - deal documents and requirement status tables
- `server/distributionRouter.ts`
  - supervised deal-stage transition logic
  - commission-protected stage transitions
- `server/services/distributionPayoutMilestoneService.ts`
  - payout readiness checks for configured milestones
- `development_operating_events`
  - event type contract already includes `distribution_handoff_created`

## Hard Boundary

An inventory outcome mutation must not automatically:

- move a lead to `closed_won` or `closed_lost`;
- change the older `leads.status` or `leads.funnelStage`;
- assign a lead to a partner;
- create, close, cancel, or advance a distribution deal;
- create a commission entry;
- mark commission pending, approved, paid, or cancelled;
- mark all leads for a unit as lost because one unit sold, let, passed in, or was withdrawn;
- rewrite public packaging, media, location, governance, pricing, unit definitions, or wizard
  `stepData`.

Outcome mutations may later accept optional explicit handoff inputs, but the default behavior stays
inventory-only.

## Lead Synchronization Model

Lead synchronization should be a separate operating mutation or an explicit optional sub-action
inside a future outcome endpoint.

Required inputs:

- `developmentId`
- `leadId`
- transaction engine: derived from the development, not trusted from the client
- target lead stage
- outcome source event id, when triggered from an inventory outcome
- optional unit type id or unit id
- optional note
- actor user id
- source surface

Server rules:

- Verify the lead belongs to the development.
- Verify the actor owns or is allowed to operate the development or assigned lead.
- Use `isLeadTransitionAllowed` for the canonical stage transition unless an explicit supervised
  override contract is added.
- Write or reference a `lead_stage_changed` operating event.
- Log a lead activity using transaction-native language.
- Preserve the original inventory outcome event; do not rewrite history.
- Return refreshed lead, funnel, and operating-history state.
- Never show success unless the lead projection and event/activity audit both succeed.

Initial target mappings:

| DLE outcome | Allowed lead sync | Display overlay |
|---|---|---|
| Sale sold | specific lead may move to `closed_won` from `deal_in_progress` | Sold |
| Sale sold | unrelated leads stay active or require manual follow-up | Buyer follow-up |
| Rental let | specific lead may move to `closed_won` from `deal_in_progress` | Lease signed / Let |
| Rental fully unavailable | unrelated leads stay active or move manually | Rental waitlist / next availability |
| Auction sold | winning bidder lead may move to `closed_won` from `deal_in_progress` | Sold at auction |
| Auction passed in | specific bidder lead may move to `closed_lost` only by explicit choice | Passed in follow-up |
| Auction withdrawn | affected leads require manual follow-up or explicit `closed_lost` | Withdrawn follow-up |

Do not map every transaction to sale-shaped language in the UI. The stored stage may be
`closed_won`, but the dashboard and activity copy must say Sold, Lease signed, or Sold at auction
depending on the transaction engine.

## Distribution/Referral Handoff Model

Distribution handoff should be a separate operating mutation or an explicit optional sub-action
after lead synchronization.

Required inputs:

- `developmentId`
- `distributionDealId`
- optional `leadId`
- source DLE outcome event id, when applicable
- requested distribution action
- optional note
- actor user id
- source surface

Allowed first actions:

- create a DLE operating event referencing an existing distribution deal;
- create a distribution handoff note for manager review;
- request review for a possible stage transition;
- link an inventory outcome event to a distribution deal without changing the deal stage.

Disallowed first actions:

- direct commission payment;
- direct `commission_pending` or `commission_paid` transition;
- unsupervised deal cancellation because an Auction lot passed in or was withdrawn;
- silent distribution deal closure from Sale/Rental/Auction inventory outcomes;
- bypassing distribution document, milestone, manager assignment, or commission readiness checks.

Distribution stage changes must remain owned by distribution services. If a later DLE handoff
mutation advances a deal, it must call or share the same guardrails used by `transitionDealStage`,
including payout readiness checks for commission-protected stages.

## Transaction-Specific Handoff Semantics

### Sale

Inventory outcome:

- Sale unit type moved from reserved projection to sold projection.

Lead handoff:

- Only a specific linked buyer lead may move toward `closed_won`.
- Other active leads should become follow-up candidates, not automatic losses.

Distribution handoff:

- A linked referral deal may be flagged for contract, bond, attorney, or commission review.
- Commission readiness remains controlled by distribution deal stage and payout milestone checks.

### Rental

Inventory outcome:

- Rental unit type moved from held projection to let projection.

Lead handoff:

- Only a specific renter lead may move toward `closed_won` with display copy `Lease signed` or
  `Let`.
- Other renter leads should remain active, waitlisted, or manually closed with rental-native
  reasons.

Distribution handoff:

- Leasing/referral deals may need a separate Rental commission model before any automatic stage or
  commission transition.
- Do not reuse Sale bond/attorney assumptions unless the program explicitly supports them.

### Auction

Inventory outcome:

- Auction lot status moved to `sold`, `passed_in`, or `withdrawn`.

Lead handoff:

- `sold` may sync one winning bidder lead to `closed_won` only when a winning bidder record or
  explicit selected lead is supplied.
- `passed_in` and `withdrawn` do not automatically close all bidder leads.
- Bidder readiness, proof of funds, FICA, auction terms, and deposit/payment records remain future
  models.

Distribution handoff:

- Auction referral/deal closure must wait for explicit auction partner terms, bidder identity, and
  payout rules.
- Passed-in and withdrawn outcomes should create review/follow-up tasks before any deal cancellation
  automation.

## Event Linkage Policy

Use `development_operating_events` as the DLE-level audit stream.

Recommended event references:

- Inventory outcome event metadata may include candidate `leadId` or `distributionDealId` only when
  explicitly supplied.
- Lead sync events should include:
  - `sourceOutcomeEventId`
  - `leadId`
  - `fromStage`
  - `toStage`
  - transaction display label
- Distribution handoff events should include:
  - `sourceOutcomeEventId`
  - `distributionDealId`
  - requested action
  - result: `review_requested`, `linked_only`, `stage_transition_requested`, or
    `stage_transition_completed`

Do not rely only on metadata when a current projection changes. If a lead or distribution deal
stage changes, the owning table must change and the owning audit stream must record it.

## Failure And Recovery Rules

Every future lead or distribution handoff mutation must prove:

- wrong transaction type fails;
- lead/deal not belonging to the development fails;
- disallowed lead stage transition fails;
- disallowed distribution stage transition fails;
- missing payout/document readiness blocks commission-protected stages;
- failed mutation shows no false success;
- failed mutation writes no partial handoff event unless explicitly recorded as a failed attempt;
- successful mutation writes the owning audit event and refreshes dashboard/readback state;
- inventory outcome state is not rolled back by a failed downstream handoff unless the user chose a
  same-transaction bundled action and the contract explicitly requires rollback.

Preferred first implementation mode:

- Inventory outcome already exists.
- Handoff is a separate explicit action.
- Failed handoff does not undo inventory truth.
- UI says the handoff failed and leaves the lead/deal in backend truth.

## Dashboard And UI Contract

The developer dashboard should eventually show:

- inventory outcome status;
- linked lead, if any;
- linked distribution deal, if any;
- handoff state:
  - `No linked lead`
  - `Lead follow-up needed`
  - `Lead synced`
  - `Distribution review needed`
  - `Distribution handoff linked`
  - `Commission readiness blocked`
  - `Commission ready`
- transaction-native labels:
  - Sale: buyer, offer, deal, sold
  - Rental: renter, application, lease, let
  - Auction: bidder, registration, auction result, sold at auction / passed in / withdrawn

The UI must not imply a commission, referral deal, or lead is complete merely because inventory
changed.

## Next Implementation Slice Recommendation

Implement lead-stage synchronization first, before distribution handoff:

1. Add a narrow service for explicit lead outcome sync.
2. Require a selected `leadId`.
3. Support only safe first mappings:
   - Sale sold -> `closed_won`
   - Rental let -> `closed_won`
   - Auction sold -> `closed_won`
   - Auction passed-in/withdrawn -> `closed_lost` only with explicit note
4. Write `lead_stage_changed` DLE operating events and lead activities.
5. Browser-proof no false success, transaction-native labels, and no inventory field wipes.

After that, design and implement distribution/referral handoff using existing distribution deal
stage and commission readiness guardrails.
