# DLE Operating Layer Audit

Date: 2026-06-04
Status: Architecture audit complete. No runtime changes in this slice.

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
- `client/src/components/developer/DevelopmentsList.tsx` shows publish/readiness status but not a
  live operating snapshot for inventory, lead risk, distribution state, or transaction outcomes.
- Lead stages are still sale-shaped in their canonical names: offer, bond, sale, closed won/lost.
  Rental and Auction can use the pipeline mechanically, but the product language and outcome model
  are not transaction-native yet.
- Development and unit inventory fields track totals, available, reserved, and auction status, but
  there is no dedicated operating event/audit model for reservations, releases, lets, sold units,
  auction registration, auction results, price changes, or phase changes.
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

## First Implementation Slice Recommendation

Build a read-only `Development Operations Snapshot` inside the developer dashboard.

The first slice should avoid schema changes and should not mutate inventory.

Recommended surface:

- Add a transaction-aware operations panel to either:
  - each row/card in `client/src/components/developer/DevelopmentsList.tsx`, or
  - the selected-development area in `client/src/components/developer/Overview.tsx`.

Recommended first data sources:

- `trpc.developer.getDevelopments`
- existing development fields: `transactionType`, `totalUnits`, `availableUnits`, approval/publish
  state, pricing fields, auction dates
- derived inventory helper: `calculateInventorySummary`
- existing funnel KPIs and attention data where a development is selected
- distribution settings where a development is selected

Recommended visible outputs:

- Sale: available/reserved/sold snapshot, buyer lead risk, sales pipeline link.
- Rental: rentals available/held/let estimate, rental lead risk, leasing pipeline link.
- Auction: lots open/reserved/outcome snapshot, bidder lead risk, auction pipeline link.
- A clear `Manage leads` CTA carrying `developmentId`.
- A clear `Edit public package` CTA for packaging edits.
- A disabled or informational `Update inventory` CTA until the mutation/audit model is designed.

Guardrails:

- Read-only first.
- No schema or migration in the first implementation slice.
- No edit-development autosave change.
- No inventory mutation until field ownership, audit events, and transaction-native statuses are
  designed.
- Do not reuse sale labels for Rental and Auction.
- Keep distribution status explanatory, not hidden behind a toggle.

## Next Architecture Work After The First Surface

Before adding inventory mutations, define:

- A transaction-native operating status model for unit inventory.
- An operating event/audit model for inventory, pricing, lead stage, distribution handoff, and
  publish/update events.
- A safe ownership contract separating packaging edits from operating updates.
- Transaction-native lead-stage labels or stage overlays for Sale, Rental, and Auction.
- Distribution/referral readiness rules per development.
- Browser proof requirements for the operations panel and later inventory mutations.
