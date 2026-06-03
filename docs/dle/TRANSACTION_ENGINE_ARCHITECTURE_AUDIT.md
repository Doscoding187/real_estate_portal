# DLE Transaction Engine Architecture Audit

Date: 2026-06-03
Branch: recovery/lead-routing-verification-2026-06-02
Status: Documentation-only audit before rent and auction ownership proof.

## Core Correction

The Development Listing Engine is transaction-first.

Sale, Rental, and Auction are not small variations of one generic development form. They are separate commercial sub-engines under one DLE shell. The top-level branch is transaction type, and every downstream surface must respect that branch:

- wizard field model
- publish/readiness validation
- unit inventory model
- public development page
- search/result cards
- unit cards
- lead form context
- developer dashboard and inventory language
- admin review
- distribution/referral readiness

The shared DLE shell can keep common concepts such as development identity, location, media, highlights, developer brand, amenities, brochures, and canonical save/resume/edit safety. Transaction-specific pricing, inventory, legal/governance interpretation, readiness, and buyer journey must belong to the relevant sub-engine.

## A. Current Implementation Summary

The current implementation already has meaningful transaction-aware foundations.

Technical foundations already present:

- `drizzle/schema/developments.ts` stores `transactionType` on developments with `for_sale`, `for_rent`, and `auction`.
- Development-level rental aggregates exist: `monthlyRentFrom`, `monthlyRentTo`.
- Development-level auction aggregates exist: `auctionStartDate`, `auctionEndDate`, `startingBidFrom`, `reservePriceFrom`.
- Unit-level rental fields exist: `monthlyRentFrom`, `monthlyRentTo`, `depositRequired`, `leaseTerm`, `isFurnished`.
- Unit-level auction fields exist: `startingBid`, `reservePrice`, `auctionStartDate`, `auctionEndDate`, `auctionStatus`.
- `shared/developmentDerived.ts` normalizes transaction type, calculates transaction-specific price ranges, strips irrelevant unit pricing fields, and builds development-level financial payloads per transaction.
- `shared/developmentReadiness.ts` has transaction-specific unit readiness:
  - sale requires sale price.
  - rent requires monthly rent.
  - auction requires starting bid and valid auction timing.
- `server/services/publishNormalizer.ts` derives sale, rent, and auction aggregate pricing from unit types and nulls irrelevant development-level fields by transaction type.
- `server/lib/sanitizeDraftData.ts` and canonical snapshot tests prove many irrelevant fields are stripped from the wrong transaction model.
- `client/src/components/development-wizard/phases/DevelopmentTypePhase.tsx` makes transaction type an early wizard choice.
- `client/src/components/development-wizard/phases/UnitTypesPhase.tsx` conditionally renders sale, rental, and auction pricing sections.
- `client/src/pages/DevelopmentDetail.tsx`, `client/src/pages/DevelopmentUnitDetailPage.tsx`, and `client/src/components/property-results/DevelopmentResultCard.tsx` use transaction-aware labels and pricing.
- `server/services/publicLeadCaptureService.ts` preserves lead context such as transaction type and unit price label.
- Distribution/referral surfaces already carry transaction-aware price context in `server/distributionRouter.ts` and `client/src/pages/ReferrerDashboard.tsx`.

Manual/browser proof already completed:

- Sale create, manual save, resume, publish, public detail, public highlights, public list/search output, lead context, and edit-published field ownership have been proven.
- Sale edit-published ownership is strong enough that autosave is not blocked by the sale path alone.

Current architectural weakness:

- The code is transaction-aware, but the product architecture is still mostly one generic wizard with conditional fields.
- The implementation has technical fields for rent and auction, but the DLE docs do not yet define each sub-engine as a separate commercial model.
- Rental and auction need browser/API proof that their fields survive draft, publish, public display, lead capture, search cards, distribution/referral, and edit-published updates.

## B. Intended Transaction-Engine Model

### 1. Sale Engine

Purpose:

The Sale Engine packages development inventory for buyers, investors, agents, and referral partners who are evaluating purchase opportunities.

Required fields:

- Transaction type: `for_sale`.
- Development identity: name, development type, status, developer/brand ownership.
- Location: address or clear market location, city, province.
- Marketing package: description, highlights, hero image, public media.
- Commercial inventory: at least one unit type with unit name/category/subtype, unit size, bed/bath where relevant, total/available/reserved/sold counts.
- Sale pricing: `priceFrom` or `basePriceFrom` per unit type, with valid range when `priceTo` or `basePriceTo` exists.
- Governance/finance basics: ownership type, launch/completion/handover context, levies/rates where applicable.

Optional fields:

- Price-to range, extras, parking pricing, transfer costs included, levy/rates ranges.
- Brochures, floor plans, videos, virtual tour links, unit-specific media.
- Bond/repayment assumptions, buyer affordability notes, investor yield guidance.
- Phase, construction, handover, and release schedule details.

Fields that should not appear:

- Monthly rent, rental deposit, lease term, furnished flag, renter qualification language.
- Auction start/end dates, starting bid, reserve price, auction status, bidder registration language.

Pricing model:

- Primary public language: sale price, "From", "Price From", or sale price range.
- Aggregates derive from sale unit prices.
- Affordability and repayment estimates may be shown as buyer support, not as the legal sale price.

Unit inventory model:

- Unit types are sale SKUs.
- Inventory language: available, reserved, sold, sold-out.
- Total and available units should derive from the effective unit set when unit types are edited.

Ownership/legal/governance relevance:

- High buyer-facing relevance.
- Ownership type, levies, rates, transfer costs, sectional/freehold context, handover, and completion dates support trust and readiness.

Publish/readiness requirements:

- Shared basics: identity, location, description, hero image, highlights, status, ownership/developer context.
- Sale-specific: valid unit sale pricing and valid sale inventory totals.
- Public output must not publish stale rental or auction pricing.

Public development page output:

- Sale price/range, unit cards, buyer cost signals, repayment guidance, highlights, media, brochures, developer trust, and enquiry CTA.

Search/result card output:

- Sale listing type, sale price/range, availability, location, hero, highlights where available.

Unit card output:

- Unit name/category, sale price/range, bed/bath/size, inventory status, media/floor plan, sale CTA.

Lead form context:

- `transactionType: sale`.
- Selected unit id/name.
- Unit price label such as `Price From`.
- Unit sale price/range.
- Buyer affordability context only when the lead actually provides affordability signals.

Developer dashboard/inventory impact:

- Sales inventory, reservation/sold counts, price bands, launch progress, sales pipeline.

Admin review impact:

- Validate sale price, ownership/governance, buyer-facing media/highlights, unit inventory consistency, and public price language.

Distribution/referral readiness:

- Referral programs can route buyer leads against sale price/range, selected unit, availability, commission/program terms, and buyer qualification.

### 2. Rental Engine

Purpose:

The Rental Engine packages development inventory for renters, leasing teams, investors, agents, and referral partners who are evaluating monthly rental opportunities.

Required fields:

- Transaction type: `for_rent`.
- Development identity, location, media, description, and highlights.
- Rental unit inventory: at least one unit type with rentable unit details and valid available/reserved/let-style counts.
- Monthly rent: `monthlyRentFrom` per unit type, with valid `monthlyRentTo` when provided.
- Availability/status language suitable for rental inventory.

Optional fields:

- Deposit required, lease term, furnished flag.
- Utilities/inclusions/exclusions, pet policy, parking terms, occupation date, application requirements.
- Rental rules, tenant screening notes, lease documents, viewing schedule.
- Unit-specific media, floor plans, brochures.

Fields that should not appear:

- Sale list price as the primary price.
- Bond repayment, transfer duty, transfer costs, buyer affordability language, sold-out sales phrasing.
- Auction start/end dates, starting bid, reserve price, auction status, bidder registration language.

Pricing model:

- Primary public language: monthly rent, "Rent from", "R / month", or rent range.
- Deposit and lease terms are supporting commercial context.
- Rental qualification should be monthly-income/rent-capacity based, not purchase affordability.

Unit inventory model:

- Unit types are rentable SKUs.
- Inventory language should eventually distinguish available, reserved/application pending, occupied/let, and possibly upcoming availability.
- Current shared inventory fields can be reused, but user-facing copy should not feel like sales stock when the transaction is rental.

Ownership/legal/governance relevance:

- Ownership type is less buyer-facing than in sale, but rental rules, furnished state, deposit, lease term, body corporate rules, and occupancy/management terms are important.
- Levies/rates may be internal or investor-facing, not primary renter-facing language.

Publish/readiness requirements:

- Shared basics: identity, location, description, hero image, highlights, status.
- Rental-specific: at least one unit with monthly rent and valid rent range.
- Deposit/lease/furnished are technically optional today, but they should be product-reviewed before calling the Rental Engine world-class.

Public development page output:

- Monthly rent/range, rental availability, deposit/lease/furnished signals, unit cards, media, highlights, renter enquiry CTA.
- Avoid sale-first repayment blocks unless clearly reframed as rental capacity.

Search/result card output:

- Rent listing type, monthly rent/range, `/mo` or equivalent monthly language, location, availability.

Unit card output:

- Unit name/category, monthly rent/range, deposit/lease/furnished signals when available, bed/bath/size, availability, rental CTA.

Lead form context:

- `transactionType: rent`.
- Selected unit id/name.
- Unit price label such as `Rent From`.
- Monthly rent amount/range.
- Renter qualification context should not be stored as buyer affordability unless the payload explicitly means rental qualification.

Developer dashboard/inventory impact:

- Leasing inventory, availability, reserved/application pending, occupied/let counts, rental lead pipeline, viewing/application status.

Admin review impact:

- Validate rent range, availability language, deposit/lease clarity where present, rental media/highlights, and absence of stale sale pricing.

Distribution/referral readiness:

- Referral programs should route rental leads with rent capacity, selected unit, availability, lease/deposit context, and rental-specific commission/program terms.

### 3. Auction Engine

Purpose:

The Auction Engine packages development inventory for bidders, investors, agents, auction operations, and referral partners who are evaluating timed bidding opportunities.

Required fields:

- Transaction type: `auction`.
- Development identity, location, media, description, and highlights.
- Auction unit inventory: at least one auctionable unit/lot.
- Starting bid per unit type.
- Auction start and end dates with valid order and future start before publish.
- Auction status, at least `scheduled` or `active`.

Optional fields:

- Reserve price, auction terms document, registration fee/deposit, buyer premium, bid increment, auctioneer/venue, viewing schedule, legal pack, finance-proof/FICA requirements.
- Brochures, floor plans, unit/lot-specific media.

Fields that should not appear:

- Monthly rent, lease term, rental deposit/furnished language.
- Sale list price as the primary price.
- Standard "homes from" or transfer-cost-first language unless explicitly framed as post-auction purchase obligations.

Pricing model:

- Primary public language: starting bid.
- Reserve price may exist as a commercial field, but public visibility must be intentional.
- Auction date/window is part of the price model because urgency and eligibility shape the buyer journey.

Unit inventory model:

- Unit types behave more like auction lots.
- Inventory language should support scheduled, active, sold, passed-in, withdrawn, and possibly registered-bidder counts.
- Current total/available/reserved/sold fields can be reused carefully, but auction status must be first-class in public and admin language.

Ownership/legal/governance relevance:

- Very high legal/operational relevance.
- Auction terms, registration requirements, deposit, buyer premium, payment deadlines, legal pack, and mandate context should be explicit before the Auction Engine is considered world-class.

Publish/readiness requirements:

- Shared basics: identity, location, description, hero image, highlights, status.
- Auction-specific: starting bid, valid reserve when present, auction start/end dates, date order, future start, auction status.
- Future readiness should likely require auction terms/registration requirements, but this is not enforced today.

Public development page output:

- Starting bid/range, auction date/window, auction status, registration CTA, terms/document signals, unit/lot cards, highlights, media.
- Bond estimates may be secondary and clearly indicative; the page must not feel like a normal sale listing.

Search/result card output:

- Auction listing type, "Bid from" or "Starting bid", date/status, location, hero, availability/lot signal.

Unit card output:

- Unit/lot name, starting bid, reserve visibility only if intended, auction timing, auction status, unit specs, registration/enquiry CTA.

Lead form context:

- `transactionType: auction`.
- Selected unit/lot id/name.
- Unit price label such as `Starting Bid`.
- Starting bid amount.
- Registration or auction-enquiry intent should be separable from normal buyer affordability.

Developer dashboard/inventory impact:

- Auction schedule, lot status, registrations/enquiries, bidder readiness, auction outcomes, passed-in/withdrawn handling.

Admin review impact:

- Validate auction pricing/timing, terms/registration readiness, legal pack/media, reserve handling, status, and public copy.

Distribution/referral readiness:

- Referral programs should route auction leads as bidder/auction-interest opportunities with selected lot, starting bid, registration readiness, terms, and auction timeline context.

## C. Gaps Before Rent/Auction Proof

Architecture/documentation gaps:

- This audit is the first explicit transaction-engine model; future work should reference it when touching rent or auction.
- `docs/dle/TECHNICAL_ARCHITECTURE.md` still only summarizes transaction-aware inventory at a high level.

Manual proof gaps:

- Rental create/save/resume/publish/public/search/lead/edit-published proof is still pending.
- Auction create/save/resume/publish/public/search/lead/edit-published proof is still pending.
- Rent and auction resumed-draft restoration must confirm media, documents, highlights, unit fields, readiness, and public aggregates.

Product/UX gaps:

- The wizard has transaction-specific fields, but it is still structurally one generic unit-types phase. It should increasingly feel like Sale Engine, Rental Engine, or Auction Engine depending on the top-level branch.
- Rental inventory language may still inherit sale-shaped concepts such as sold-out/sold progress in places.
- Auction inventory language may still inherit generic availability and sale-like buyer affordability language.
- Public detail and qualification pages have transaction-aware labels, but rent/auction need browser proof that the whole page feels transaction-native.
- Admin review and developer dashboards likely need clearer transaction-specific review checklists and inventory labels.

Risk gaps before autosave:

- Autosave should not begin until rent and auction field ownership prove that partial saves/edits do not wipe transaction-owned fields.
- The UI must not claim rent/auction progress is saved unless a real save succeeds.

## D. Rent/Auction Fields Already Technically Present

Rental fields present:

- Development table: `transactionType`, `monthlyRentFrom`, `monthlyRentTo`.
- Unit types table: `monthlyRentFrom`, `monthlyRentTo`, `depositRequired`, `leaseTerm`, `isFurnished`.
- Wizard unit UI: monthly rent from/to, deposit, lease term, furnished flag.
- Shared helpers: rent price calculation from monthly rent, rent aggregate derivation, rent irrelevant-field stripping.
- Readiness: monthly rent required; rent range must be valid.
- Publish normalization: rent aggregates are derived from unit types and stale sale/auction aggregate fields are nulled.
- Public pages/cards: rent labels and `/ month`/`/mo` style pricing are technically present.
- Qualification/referral/distribution: rent-specific price context is technically present.

Auction fields present:

- Development table: `transactionType`, `auctionStartDate`, `auctionEndDate`, `startingBidFrom`, `reservePriceFrom`.
- Unit types table: `startingBid`, `reservePrice`, `auctionStartDate`, `auctionEndDate`, `auctionStatus`.
- Wizard unit UI: auction start/end, starting bid, reserve price, auction status.
- Shared helpers: auction price calculation from starting bid/reserve, auction aggregate derivation, auction irrelevant-field stripping.
- Readiness: starting bid required; reserve must not be below starting bid; auction start/end dates required and validated.
- Publish normalization: auction aggregates are derived from unit types and stale sale/rent aggregate fields are nulled.
- Public pages/cards: starting-bid and bid-from labels are technically present.
- Qualification/referral/distribution: auction-specific price context is technically present.

## E. Missing Or Unclear Fields

Rental missing or unclear:

- Occupation/availability date per unit or development.
- Application requirements, tenant screening requirements, income multiple, and document checklist.
- Utilities/inclusions/exclusions.
- Pet policy.
- Lease documents or lease terms document.
- Rental management/operator context.
- Clear distinction between reserved/application pending/let/occupied in inventory.
- Whether levies/rates should be public for renters, investor-only, or admin-only.

Auction missing or unclear:

- Auction terms document as a DLE development/unit readiness field.
- Registration fee/deposit and registration requirements.
- Buyer premium.
- Bid increment.
- Auctioneer/venue or online auction provider.
- Viewing dates.
- Legal pack/FICA/finance proof requirements.
- Whether reserve price is public, private, or admin-only.
- Auction outcome model beyond unit `auctionStatus`.

Cross-engine unclear:

- Admin review checklist per transaction engine.
- Developer dashboard inventory language per transaction engine.
- Distribution/referral commission and qualification model per transaction engine.
- Whether mixed transaction developments are out of scope or future scope. Current model assumes one top-level transaction type per development.

## F. Recommended Next Slice After This Audit

Next slice: Rental ownership and public proof, then Auction ownership and public proof.

Recommended sequence:

1. Start with Rental Engine proof because the field set is smaller and monthly-rent behavior is already well represented in tests.
2. Use the same field-ownership pattern from the sale checkpoint:
   - create or identify a published rental development
   - edit location
   - edit media
   - edit highlights/marketing
   - edit governance/finance
   - edit rental unit types
   - confirm unrelated fields survive each edit
   - confirm development remains published/approved/searchable
   - confirm public detail, search cards, unit cards, and lead context use rental language
3. Then run Auction Engine proof with extra attention to auction dates, auction status, starting bid/reserve, and stale sale/rent field stripping.
4. Do not start autosave until rent and auction field ownership pass.

Focused checks to run in the next slice:

- Existing rent/auction guardrail tests around canonical payloads, readiness, sanitization, edit updates, public card pricing, unit page pricing, qualification, referral, and distribution catalog pricing.
- Browser/API proof for public lead context:
  - rental lead should preserve `transactionType: rent`, selected unit id/name, and `Rent From`.
  - auction lead should preserve `transactionType: auction`, selected unit/lot id/name, and `Starting Bid`.

Decision:

- There is enough technical foundation to continue with rent/auction proof.
- There is not yet enough product proof to start autosave.
- The next implementation work should be proof and small fixes, not a large refactor into separate engine modules.
