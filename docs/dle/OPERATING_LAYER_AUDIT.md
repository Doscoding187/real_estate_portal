# DLE Operating Layer Audit

Date: 2026-06-04
Status: Read-only dashboard operating surfaces cover inventory, lead risk, distribution readiness,
and operating review context. Sale reserve/release, Sale sold from reserved inventory, Rental
hold/release, Rental let from held inventory, Auction registration open/rollback, Auction
time-gated activation, Auction sold/passed-in/withdrawn outcomes, explicit selected-lead outcome
sync, and distribution/referral review handoff are implemented and browser-proven.

## Purpose

The Development Listing Engine must not stop at publish.

After a development is live, the same transaction-first engine should help developers operate that
development: inventory status, lead stages, next actions, reservations, sold/let/auction outcomes,
distribution handoffs, pricing adjustments, release phases, audit history, and team follow-up.

This document defines the intended operating layer before implementation starts.

## Current Implementation Summary

What already exists:

- `developments.transactionType` supports `for_sale`, `for_rent`, and `auction`.
- `developments` carries development-level inventory and transaction pricing fields:
  `totalUnits`, `availableUnits`, `priceFrom`, `priceTo`, `monthlyRentFrom`, `monthlyRentTo`,
  `auctionStartDate`, `auctionEndDate`, `startingBidFrom`, and `reservePriceFrom`.
- `unit_types` carries unit-level inventory and transaction fields:
  `totalUnits`, `availableUnits`, `reservedUnits`, sale price fields, rental rent/deposit/lease
  fields, and auction bid/date/status fields.
- `shared/developmentDerived.ts` can derive transaction pricing and inventory summaries.
- `client/src/components/developer/Overview.tsx` already has funnel KPIs, attention queues,
  development filtering, and distribution enablement controls.
- `client/src/components/developer/LeadsManager.tsx` already has a real lead control center:
  filters, stage groups, assignment, allowed transitions, activity logging, next actions, SLA risk,
  and development filtering.
- `shared/developerFunnel.ts` defines canonical lead stages, allowed transitions, owner types, and
  SLA policy.
- `server/developerRouter.ts` exposes developer lead operations:
  `getLeads`, `assignLead`, `transitionLead`, `logLeadActivity`, `setLeadNextAction`,
  `getFunnelKPIs`, and `getFunnelAttention`.
- Distribution/referral infrastructure already exists around development access, partner
  eligibility, distribution dashboards, referrals, deal checklists, documents, commissions, and
  manager views.

What is still weak:

- `client/src/components/developer/UnitsManager.tsx` is a placeholder and is not wired as a live
  transaction inventory console.
- `client/src/components/developer/DevelopmentsList.tsx` now shows a read-only inventory snapshot,
  but not lead risk or distribution state.
- Lead stages are still sale-shaped in their canonical names: offer, bond, sale, closed won/lost.
  Rental and Auction can use the pipeline mechanically, but the product language and outcome model
  are not transaction-native yet.
- Development and unit inventory fields track totals, available, reserved, and auction status. Sale
  reserve/release now writes a DLE operating event, but lets, sold units, auction registration,
  auction results, price changes, and phase changes remain future operating mutations.
- The dashboard does not yet connect packaging quality, public merchandising, lead context, and live
  operations into one command surface.

## Intended Operating Model

### Shared Operating Shell

Every live development should expose:

- Development identity and transaction engine: Sale Engine, Rental Engine, or Auction Engine.
- Public status: draft, pending, approved/live, rejected, paused, sold out, fully let, auction
  closed, or withdrawn where applicable.
- Inventory summary: total, available, reserved/held, sold/let/outcome count, and stale data flags.
- Lead summary: new, at-risk, qualified/readiness-complete, next action due, won/lost outcomes.
- Public merchandising health: hero/media readiness, unit card readiness, CTA/lead-context health,
  brochure/document availability.
- Distribution/referral state: disabled, enabled, partner-ready, active deals, blocked by missing
  terms/docs, or manager review needed.
- Recent operating activity: edits, inventory changes, lead stage changes, distribution handoffs,
  approval changes, and publish/update events.

### Sale Engine Operations

Required operating concepts:

- Available, reserved, sold, and sold-out inventory.
- Price changes and price-band drift from public cards.
- Buyer qualification, viewing, offer, bond/deal progress, sold outcomes.
- Developer sales-team owner, agency owner, or distribution partner owner.
- Buyer-cost and governance context carried into sales follow-up where relevant.

Public/dashboard language:

- `Available`, `Reserved`, `Sold`, `Sold out`.
- `Buyer leads`, `Qualified buyers`, `Offers`, `Deals`, `Sold`.
- `Affordability follow-up`, `Viewing`, `Offer`, `Bond/deal progress`.

### Rental Engine Operations

Required operating concepts:

- Available, held, application in progress, let, fully let, and available soon inventory.
- Monthly rent changes, deposit changes, lease-term changes, furnished/unfurnished context.
- Rental-fit, viewing, application, lease docs, lease signed/let outcomes.
- Leasing-team owner, agency owner, or distribution/referral owner where enabled.
- Proof-of-income and deposit/document readiness signals.

Public/dashboard language:

- `Rentals available`, `Held`, `Application in progress`, `Let`, `Fully let`.
- `Rental leads`, `Rental fit`, `Viewings`, `Applications`, `Leases signed`.
- `Lease follow-up`, `Income proof`, `Deposit confirmation`, `Move-in timing`.

### Auction Engine Operations

Required operating concepts:

- Lots open, registration interest, registered bidders, active auction, sold, passed in,
  withdrawn, and auction closed states.
- Starting bid/reserve changes and auction-window changes.
- Bidder readiness, registration docs, proof of funds, FICA, auction terms acceptance.
- Auction-team owner, agency owner, or distribution/referral owner where enabled.
- Auction outcome capture and post-auction follow-up.

Public/dashboard language:

- `Lots open`, `Registration interest`, `Registered bidders`, `Auction active`, `Sold at auction`,
  `Passed in`, `Withdrawn`, `Auction closed`.
- `Bidder leads`, `Bidder readiness`, `Registrations`, `Auction outcomes`.
- `Proof of funds`, `FICA`, `Auction terms`, `Reserve/outcome follow-up`.

## Current Gaps By Layer

Packaging to operations:

- Publish currently makes the development visible, but it does not create an operating cockpit for
  that development.
- Wizard unit inventory is saved, but live inventory updates after publish do not have a dedicated
  workflow separate from edit-published content changes.
- Edit-development autosave remains disabled and should stay separate from operating inventory
  changes.

Merchandising to operations:

- Public CTAs and lead dialogs now preserve transaction context, but dashboard follow-up still uses
  mostly generic lead-stage language.
- Search/public unit cards show availability, but dashboard inventory controls do not yet expose
  transaction-native operating labels.
- Public pricing and dashboard pricing can drift without a visible health check.

Operations to distribution:

- Distribution settings and dashboards exist, but DLE operating surfaces do not yet summarize
  partner readiness per development.
- Lead assignment can route to distribution partners only through existing gating rules; the
  developer cockpit does not yet explain why a lead can or cannot be partner-assigned.
- Referral/deal documents exist in distribution modules, but they are not yet summarized inside the
  developer's DLE operating view.

## First Implementation Slice Status

Build a read-only `Development Operations Snapshot` inside the developer dashboard.

The first implementation slice has been completed in:

- `client/src/components/dashboard/EntityStatusCard.tsx`
- `client/src/components/developer/DevelopmentsList.tsx`
- `client/src/components/dashboard/EntityStatusCard.test.ts`

It avoids schema changes and does not mutate inventory.

Implemented surface:

- Published/live development cards now show a transaction-aware read-only operations snapshot.
- The snapshot uses Sale, Rental, and Auction labels instead of generic sale wording.
- The existing development-card enquiries action now routes to
  `/developer/leads?developmentId=<id>` and uses transaction-aware CTA labels.

Implemented first data sources:

- `trpc.developer.getDevelopments`
- existing development fields: `transactionType`, `totalUnits`, `availableUnits`, approval/publish
  state, pricing fields, auction dates
- derived inventory helper: `calculateInventorySummary`

Implemented visible outputs:

- Sale: available/reserved/sold estimate and buyer-lead CTA.
- Rental: rentals available/held/let estimate and rental-lead CTA.
- Auction: lots open/registered-or-held/outcome estimate and bidder-lead CTA.
- Informational read-only state explaining that inventory updates need the operating audit model
  first.

Guardrails:

- Read-only first: satisfied.
- No schema or migration in the first implementation slice: satisfied.
- No edit-development autosave change: satisfied.
- No inventory mutation until field ownership, audit events, and transaction-native statuses are
  designed: still enforced.
- Do not reuse sale labels for Rental and Auction: covered by focused helper tests.
- Keep distribution status explanatory, not hidden behind a toggle: still future work.

## Second Implementation Slice Status

Broaden the read-only operating surface with lead risk and distribution readiness.

The second implementation slice has been completed in:

- `client/src/components/developer/Overview.tsx`
- `client/src/components/developer/Overview.test.ts`

It avoids schema changes, does not mutate inventory, and uses existing overview data that was
already present in the developer dashboard.

Implemented surface:

- When a development is selected in the Developer Control Tower, the dashboard now shows an
  `Operating Readiness` panel.
- The panel is transaction-aware:
  - Sale: buyer lead risk, qualified buyers, sales outcomes, referral sales readiness.
  - Rental: rental lead risk, rental-fit leads, lease outcomes, referral leasing readiness.
  - Auction: bidder lead risk, bidder-ready leads, auction outcomes, referral auction readiness.
- Risk tiles link into the existing attention queue with the selected development filter.
- Readiness and outcome tiles link into the existing lead pipeline with the selected development
  filter.
- Distribution readiness is summarized as `Private`, `Needs partner access`, `Partner-ready`, or
  `Active referral pipeline`.

Implemented data sources:

- `trpc.developer.getFunnelKPIs`
- `trpc.developer.getFunnelAttention`
- `trpc.developer.getDistributionSettings`
- `trpc.distribution.developer.dashboard`
- selected-development context from `trpc.developer.getDevelopments`

Implemented visible outputs:

- Lead risk count from warning and breach counts.
- Transaction-native ready lead labels from existing qualified-stage counts.
- Transaction-native outcome labels from existing closed-won counts.
- Distribution state from distribution enablement, eligible partner count, and referral deal count.
- Transaction-native queue CTA copy for buyer, leasing, and bidder queues.

Guardrails:

- Read-only: satisfied.
- No schema or migration: satisfied.
- No inventory mutation: satisfied.
- No edit-development autosave change: satisfied.
- Existing generic lead-stage names are surfaced through transaction-native labels, but the
  underlying stage model is still shared and sale-shaped.

## Next Architecture Work After The First Surface

Before adding inventory mutations, follow
`docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md`.

The contract now defines:

- A transaction-native operating status model for unit inventory.
- An operating event/audit model for inventory, pricing, lead stage, distribution handoff, and
  publish/update events.
- A safe ownership contract separating packaging edits from operating updates.
- Transaction-native lead-stage labels or stage overlays for Sale, Rental, and Auction.
- Distribution/referral readiness rules per development.
- Browser proof requirements for the operations panel and later inventory mutations.

Implemented next implementation slice:

- Added an event-only `operating_note_added` mutation/readback surface before mutating inventory
  counts or statuses.
- Added the `development_operating_events` event stream, developer ownership checks, dashboard
  history readback, and compact Operating History note entry in the selected-development overview.
- Browser-proved Sale, Rental, and Auction note creation/readback from the developer dashboard with
  `e2e/dle/operating-note-readback.spec.ts`.
- Browser-proved that an injected failed note write keeps the note in the textarea, does not show a
  success state, and does not increase the DB event count.

Implemented next implementation slice:

- Implemented the first Sale reserve/release inventory mutation from
  `docs/dle/SALE_OPERATING_STATUS_MUTATION_DESIGN.md`.
- The developer dashboard now exposes a Sale-only `Sales Inventory` panel for the selected
  development.
- `developer.getSaleOperatingInventory` reads active Sale unit inventory and aggregate available
  units.
- `developer.transitionSaleUnitReservation` performs a Sale-only `reserve` or `release` mutation,
  verifies developer ownership, derives transaction type from the development, updates unit counts,
  refreshes the development available-unit aggregate, and writes an `inventory_status_changed`
  event in one transaction.
- Browser proof in `e2e/dle/sale-operating-reservation.spec.ts` verifies reserve/release UI counts,
  DB counts, operating event payloads, aggregate availability, and packaging-field preservation.

Implemented next implementation slice:

- Implemented and browser-proved the Rental `available` -> `held` -> `available` operating mutation
  from `docs/dle/RENTAL_OPERATING_STATUS_MUTATION_DESIGN.md`.
- Added distinct Rental inventory readback and hold/release router/service contracts while sharing
  only private atomic count/event infrastructure with Sale.
- The dashboard exposes a Rental-only `Rental Inventory` panel with monthly rent, deposit, lease
  term, furnished state, rentals available, held count, Hold, and Release.
- Browser proof in `e2e/dle/rental-operating-hold.spec.ts` verifies lease-native UI/event language,
  DB counts, event payloads, aggregate availability, lease/package field ownership, and continued
  Rental public-page/search-card language.
- Re-ran `e2e/dle/sale-operating-reservation.spec.ts` after the shared private refactor; Sale
  reserve/release regression proof passed.

Implemented Auction Stage A:

- Extended canonical `unit_types.auction_status` with `registration_open`.
- Added Auction-only operating readback and registration open/rollback mutation.
- Added an Auction-only dashboard panel with lifecycle status, starting bid, reserve context,
  auction window, and registration controls.
- Removed manual Active selection from the packaging wizard; the wizard now shows lifecycle status
  as dashboard-managed after publish.
- Browser proof in `e2e/dle/auction-operating-registration.spec.ts` verifies registration
  open/rollback, canonical status/event readback, no count mutation, field ownership, public
  Registration-open language, and Auction search pricing.
- Registered-bidder counts remain separate from `reserved_units`; time-gated activation and
  outcomes remain later Auction-specific slices.

Implemented failed operating mutation trust proof:

- Failed Sale reserve, Rental hold, and Auction registration mutations now refetch the relevant
  inventory/readiness panels after showing the backend error.
- Browser proof in `e2e/dle/operating-mutation-failure-trust.spec.ts` deliberately creates stale
  dashboard state before each click, then verifies the UI shows failure, does not show a success
  toast, refreshes back to backend truth, and records no operating event.
- Evidence captured:
  - `docs/dle/evidence/2026-06-04/qa-dle-operating-failed-sale-no-false-success.png`
  - `docs/dle/evidence/2026-06-04/qa-dle-operating-failed-rental-no-false-success.png`
  - `docs/dle/evidence/2026-06-04/qa-dle-operating-failed-auction-no-false-success.png`

Implemented Auction Stage B:

- Implemented time-gated Auction activation from
  `docs/dle/AUCTION_OPERATING_LIFECYCLE_DESIGN.md`.
- `developer.activateAuctionLot` requires `auction`, `registration_open`, and a current time inside
  the configured lot auction window.
- The dashboard now exposes `Activate Auction` only for `Registration open` lots and shows
  `Auction active` after success.
- Browser proof in `e2e/dle/auction-operating-activation.spec.ts` verifies early activation failure
  without success, in-window activation success, `registration_open` -> `active` event readback, no
  count mutation, stable Auction package fields, public `Auction active` language, and preserved
  Auction search pricing.

Implemented Auction outcome layer:

- Implemented Auction sold/passed-in/withdrawn outcomes from
  `docs/dle/OPERATING_OUTCOME_LAYER_DESIGN.md`.
- `developer.recordAuctionLotOutcome` requires an owned Auction development and active unit type.
- `sold` and `passed_in` require current `auction_status = active`; `withdrawn` is allowed only
  from non-final lifecycle statuses.
- The dashboard exposes Auction-native `Mark Sold`, `Mark Passed In`, and `Withdraw` actions.
- The mutation updates only `unit_types.auction_status` and writes `auction_outcome_recorded`.
- Browser proof in `e2e/dle/auction-operating-outcomes.spec.ts` verifies outcome success, event
  readback, no count mutation, field ownership, public outcome language, and Auction search
  pricing.
- Browser proof in `e2e/dle/operating-mutation-failure-trust.spec.ts` verifies stale Auction sold
  failure does not claim success and writes no operating event.

Implemented lead outcome sync handoff:

- Implemented explicit selected-lead synchronization from
  `docs/dle/OUTCOME_HANDOFF_CONTRACT.md`.
- `developer.syncLeadOutcome` derives the transaction type from the owned development and supports
  Sale sold, Rental let, Auction sold, Auction passed-in, and Auction withdrawn outcome actions.
- The mutation updates only the selected lead projection, writes a `lead_stage_changed` DLE event,
  and logs a local lead activity; it does not mutate inventory, distribution deals, or commission
  state.
- Browser proof in `e2e/dle/lead-outcome-sync.spec.ts` verifies Sale sold selected-lead sync,
  Rental let selected-lead sync, Auction sold selected-lead sync, Auction withdrawn selected-lead
  sync with required note, transaction-native success copy, event/activity persistence, and unsafe
  direct close rejection without false success.

Recommended next architecture work:

- Distribution/referral handoff review is now browser-proven for Sale, Rental, and Auction through
  `e2e/dle/distribution-handoff.spec.ts`. Sale covers manager acknowledgement readback end to end;
  Rental and Auction prove transaction-native DLE handoff event typing and unchanged distribution
  deal stage/commission state. Developer and manager readback surfaces now show transaction-native
  `Sale referral review`, `Rental referral review`, and `Auction referral review` labels from the
  DLE handoff event.
- The manager distribution operations assignment list now carries `transactionType`, shows Sale,
  Rental, and Auction assignment counts, labels each assigned development by engine, and supports
  transaction-lane filtering before the manager enters deal review.
- The manager deal checklist now carries the development transaction type through
  `getDealChecklist` and shows buyer, rental-applicant, or bidder review language while preserving
  distribution-owned document, milestone, payout, and commission guardrails.
- The partner referral tracker now receives referral development `transactionType` and overlays
  shared pipeline stages with buyer, renter, or bidder labels so partners do not see every DLE
  referral as a sale journey.
- The partner referral detail page now uses the same transaction context for status rails,
  next-action hints, WhatsApp/contact labels, summary fields, and application-document copy.
- Partner referral tracker/detail visible labels now use partner-facing `Referral #`,
  `Open Referral`, and `Open Rewards` language instead of exposing internal deal/commission
  labels, while preserving existing distribution ids, routes, stage codes, and payout model terms.
- Partner workspace navigation and reward-entry rows now use `Rewards` and `Referral #` labels
  while preserving the existing `/distribution/partner/commissions` route and distribution-owned
  payout model fields.
- Rental/Auction distribution programme semantics now have a dedicated contract in
  `docs/dle/DISTRIBUTION_PROGRAMME_SEMANTICS_CONTRACT.md`. Future Rental/Auction document,
  readiness, stage, and reward automation must follow that contract instead of inferring rules
  from display labels.
- The partner programme terms card and requirements dialog now surface read-only Sale, Rental, and
  Auction programme semantics guardrails. Rental explicitly calls out lease/deposit/document
  readiness before reward automation, and Auction explicitly calls out bidder/auction-term/outcome
  readiness before reward automation, while leaving distribution-owned payout status and stage
  mutations unchanged.
- The manager deal checklist now has a read-only programme semantics panel. It shows Sale as the
  current baseline, and shows Rental/Auction missing readiness metadata before automation:
  Rental needs lease/deposit/document readiness roles, while Auction needs bidder/auction-term/
  winning-bidder readiness roles. The panel is display-only and does not change document status,
  stage movement, commission status, or payout readiness.
- The manager checklist now receives a computed programme semantics read model from
  `server/services/distributionProgrammeSemanticsService.ts`. The read model derives transaction
  lane, expected roles, configured roles, missing roles, and wrong-lane template warnings from
  existing required-document templates. It is an equivalent read model, not a schema migration, and
  it always keeps automation disabled until explicit programme terms, document review rules, and
  payout triggers exist.
- Required document templates now have persisted transaction semantics metadata:
  `transactionType`, `participantType`, `readinessRole`, `requiredForStage`, `blocksPayout`,
  `reviewOwner`, `publiclyShareable`, and `programmeSpecific`. The read model prefers these
  explicit fields and keeps legacy label/code inference only as a fallback. The fields are still
  readback infrastructure: they do not move distribution stages, verify documents, or mark rewards
  ready.
- The admin partner-development onboarding drawer now exposes those template semantics on each
  required-document row and preserves them through save, starter-pack, brand-preset, and
  copy-to-other-development flows. This makes the Rental/Auction readiness contract configurable
  by admins without enabling payout or stage automation.
- Super-admin deal pipeline and reward-entry rows now receive the same computed programme
  semantics read model. Admin rows show missing readiness roles and wrong-lane template warnings
  as review context only, while payout and stage mutations remain governed by existing admin
  override rules and explicit justification requirements.
- The manager deal checklist now exposes manual readiness review controls for Rental lease
  readiness and Auction bidder readiness. Acceptance is blocked until the matching required
  document roles are verified, and accepted/rejected reviews are recorded as team-visible
  validation events only. These actions do not move stages, alter commission state, approve
  rewards, change payout readiness, or mutate DLE inventory.
- Super-admin deal pipeline and reward-entry rows now surface the latest manual Rental/Auction
  readiness decision as read-only context. Admins can see pending, accepted, or rejected manual
  readiness reviews and notes without the row implying reward readiness or changing payout/stage
  behavior.
- Browser proof in `e2e/dle/distribution-handoff.spec.ts` verifies the full manager-to-admin
  manual readiness readback path for Rental and Auction: manager accepts verified readiness,
  super-admin deal/reward rows show the decision and note, and distribution stage/commission state
  remain unchanged.
- The manager checklist optimistic document-status update now preserves server-owned computed
  readback fields and never upgrades payout/readiness locally when milestone blockers remain. This
  prevents a transient false `ready` state while the backend mutation is still returning the
  authoritative checklist.
- Rental and Auction manager checklist copy now describes the top readiness card as checklist
  readiness for manual review, not referral/reward readiness. The note explicitly says reward
  movement still needs transaction-specific programme rules and manual review.
- The manager/admin payout gate now exposes `computed.payoutAutomation` and blocks Rental/Auction
  commission-stage automation even when the shared checklist reports `payoutReady`. Rental/Auction
  can be manually reviewed as ready context, but they cannot move into reward automation until
  explicit transaction-specific programme terms, document requirements, manager approval, and DLE
  outcome conditions are represented.
- The programme semantics read model now exposes `transactionRuleModel` with Sale, Rental, and
  Auction payout trigger vocabulary plus required conditions. Sale is identified as the current
  shared-shell baseline, while Rental and Auction are explicitly marked as requiring
  transaction-specific rules before automation.
- Manager checklist and super-admin deal/reward review surfaces now show the transaction rule
  model as read-only context. Ops users can see the trigger vocabulary and condition count without
  the UI implying Rental/Auction reward automation is enabled.
- Browser proof in `e2e/dle/distribution-handoff.spec.ts` verifies seeded Rental and Auction
  manager pages plus super-admin deal/reward rows render the transaction rule model while manual
  readiness remains read-only and stage/commission state stays unchanged.
- The partner-development onboarding drawer now lets admins draft Rental/Auction transaction-rule
  notes from the approved trigger vocabulary. The notes save through the existing custom payout
  milestone notes field and remain non-automating programme context.
- Saved draft transaction-rule notes are now parsed into the programme semantics read model and
  surfaced in manager/admin review as read-only trigger context when the saved lane matches the
  development transaction lane.
- Browser proof in `e2e/dle/distribution-handoff.spec.ts` verifies saved Rental and Auction draft
  transaction-rule notes render back to manager checklist pages and super-admin deal/reward rows
  as read-only context while manual readiness, distribution stage, commission state, payout
  readiness, document verification, lead state, and DLE inventory remain unchanged.
- Developer lead outcome readback now keeps canonical lead stages for guardrails and filtering, but
  adds transaction-native outcome labels for closed synced leads: Sale `Sold`, Rental
  `Lease signed / Let`, Auction `Sold at auction`, `Passed in follow-up`, or
  `Withdrawn follow-up`. The lead read model now sources those labels from the latest
  `lead_stage_changed` DLE operating event when available, with legacy UI inference only as
  fallback. Browser proof in `e2e/dle/lead-outcome-sync.spec.ts` verifies those labels after
  selected-lead sync without changing distribution stage or reward semantics.
- The developer dashboard now has an `Operating Review` context card for the selected development.
  It links inventory outcome, selected-lead sync, and referral handoff state as separate read-only
  statuses. Missing states are explicit, and handoff state can read from the latest referral deal
  handoff without moving distribution stages, reward state, commission state, payout readiness, or
  DLE inventory.
- Rental now has browser proof that the `Operating Review` card can show all three lanes recorded
  together: a real `held` -> `let` inventory outcome, explicit selected-renter lead sync as
  `Lease signed / Let`, and a referral handoff review request. The proof keeps the distribution
  deal stage and commission status unchanged.
- The partner referral submission wizard now uses the selected development transaction type so
  Sale captures buyers, Rental captures renters, and Auction captures bidders while preserving the
  existing distribution-owned submission, stage, payout, and commission contract.
- The partner development opportunity cards now label ready Sale, Rental, and Auction programmes
  as buyer, renter, or bidder opportunities and carry the same transaction-native submit/prequalify
  CTA language into the brochure action surface.
- The partner dashboard now derives workspace copy from available Sale/Rental/Auction stock so
  mixed programmes read as a general referral hub, Rental reads as renter-led, Auction reads as
  bidder-led, and row-level submit CTAs remain transaction-native.
- The partner dashboard prequalification/match surface now describes match value as estimated
  Sale/Rental/Auction referral reward instead of commission-only language, while preserving the
  existing computed amount model.
- The referral accelerator shared components now use neutral client capture, affordability ceiling
  output language, and buyer/renter/bidder match-card submit actions from transaction type.
- The partner programme terms card and requirements dialog now label supporting packs and
  application-document explanations as buyer, renter, or bidder surfaces from development
  transaction type while leaving document ownership, payout milestones, and commission semantics
  unchanged.
- The public distribution-network marketing page now describes the funnel as a mixed
  buyer/renter/bidder referral network, uses transaction-native opportunity-card CTAs, and passes
  selected-development transaction type into the application form context.
- Partner commission entries now carry development transaction type into the partner rewards page,
  where rows are labeled as Sale, Rental, or Auction rewards with Buyer, Renter, or Bidder
  participant copy while preserving programme-owned payout semantics.
- Manager validation, pipeline, and selected-development deal lists now carry development
  transaction type into read models and label Sale, Rental, and Auction referral rows with
  Buyer, Renter, or Bidder participant context while preserving existing manager stage and payout
  mutations.
- Super-admin distribution network deal and reward tables now carry development transaction type
  into read models and label Sale, Rental, and Auction referral rows with Buyer, Renter, or Bidder
  participant context while preserving existing stage, payout, commission, onboarding, and partner
  access mutations.
- The public referrer application entry point now uses transaction-neutral individual-applicant
  copy and states that buyer, renter, or bidder referrals can come after approval, while preserving
  existing application values, review, activation, and access behavior.
- Continue distribution/referral work with deeper transaction-native referral programme semantics
  by implementing the contract in `docs/dle/DISTRIBUTION_PROGRAMME_SEMANTICS_CONTRACT.md` without
  bypassing distribution deal-stage, document, payout milestone, manager review, or commission
  readiness guardrails.
