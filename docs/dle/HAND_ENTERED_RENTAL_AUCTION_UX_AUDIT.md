# Hand-Entered Rental/Auction UX Audit

Date: 2026-06-25
Worktree: `/home/edwardspc/Desktop/Dev/listify-developer-listing-engine`
Branch: `feature/developer-listing-engine-isolated`
Status: No-code product audit complete. Functional publish proof exists; product polish is not complete.

## Scope

This audit reviews the real hand-entered Rental and Auction wizard journeys from Project Setup
through Review & Publish, then checks whether the published public detail, search card, and lead
form reflect transaction-native packaging.

Evidence baseline:

- `e2e/dle/rental-auction-hand-entered-wizard.spec.ts`
- Commit `4fc8072e test(dle): prove hand-entered rental auction publish`
- `docs/dle/RENTAL_ENGINE_TECHNICAL_PROOF.md`
- `docs/dle/AUCTION_ENGINE_TECHNICAL_PROOF.md`
- `docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md`

Out of scope:

- code fixes;
- autosave rollout;
- evidence runtime implementation;
- distribution, payout, reward, or operating mutations.

## Executive Summary

Rental and Auction now function as real transaction lanes, not just alternate labels. A developer can
hand-enter both packages, save a canonical draft, publish, and generate transaction-native public
detail, search, and lead context.

The main remaining weakness is product language density and timing. The backend is more intelligent
than several visible wizard labels. Review & Publish, live preview, marketing copy, and unit summary
still contain generic listing or sale-shaped language that can make Rental and Auction feel like a
customized sale form rather than fully separate commercial engines.

## Step Audit

### Project Setup

Functional status: Pass.

What works:

- The developer selects `Residential Development`.
- Transaction choice is explicit with `To Let / Rent` and `Auction`.
- The choice correctly drives `residential_rent` or `residential_auction`.

Polish issues:

- The step works, but it could do more to explain the commercial consequence of the choice: rental
  packaging should promise rent/deposit/lease clarity, and auction packaging should promise
  bid/reserve/window/legal-pack clarity.

### Configuration

Functional status: Pass.

What works:

- The flow accepts `Apartment Complex` and continues into the correct transaction lane.

Polish issues:

- The step reads as generic development configuration. It does not visibly remind Rental developers
  that configuration will shape leasing inventory, or Auction developers that it will shape lot and
  bidder merchandising.

### Identity & Market

Functional status: Pass.

What works:

- Name, subtitle, nature, status, launch/completion dates, ownership, and auction type persist.
- Auction exposes auction type during identity setup.

Polish issues:

- Launch/completion language is shared across lanes. Rental may need availability/release language;
  Auction may need auction campaign/registration timing language.
- Auction type is collected, but the developer is not shown how it will affect public bidder next
  steps.

### Location & Address

Functional status: Pass.

What works:

- Address, suburb, city, province, and postal code persist into canonical draft/public output.

Polish issues:

- Location is transaction-neutral. That is acceptable, but the UI could frame the location story
  differently for renters and bidders, such as commute/lease convenience for Rental and auction
  inspection/legal-pack context for Auction.

### Governance & Finances

Functional status: Pass.

What works:

- Rates/levy-style estimates persist and can support public trust modules.

Polish issues:

- The step name and fields feel sale/governance oriented. Rental needs lease-cost context, deposit
  expectation, and recurring cost clarity. Auction needs bidder cost and registration/deposit
  clarity.
- The current step does not clearly separate owner governance costs from renter/bidder decision
  costs.

### Amenities & Features

Functional status: Pass.

What works:

- Quick apply works and carries amenities into the package.

Polish issues:

- The step is usable but generic. It does not help a Rental developer prioritize renter-fit signals,
  or an Auction developer prioritize inspection/legal-pack/bidder confidence signals.

### Marketing Summary

Functional status: Pass.

What works:

- Summary, description, and three highlights are entered and persisted.
- Highlights surface publicly and are proven in the hand-entered publish test.

Product issues:

- Existing helper copy still includes sale-shaped language such as buyer-focused highlight guidance.
- The highlight input example `No Transfer Duty` is sale-native and awkward in Rental/Auction.
- Missing highlight requirements can still feel like a publishing blocker discovered late rather
  than a transaction-specific packaging target.

Recommended copy direction:

- Rental examples: `Lease terms visible`, `Deposit expectations clear`, `Rental availability ready`.
- Auction examples: `Auction window scheduled`, `Reserve strategy tracked`, `Bidder pack ready`.

### Development Media

Functional status: Pass.

What works:

- Hero image and brochure/document upload persist as local-upload assets.
- Public pages and lead paths can use the packaged media/document state.

Product issues:

- Documents are still treated mostly as generic brochure/document uploads. Rental needs rental pack
  language. Auction needs legal pack, bidder pack, auction terms, FICA, and proof-of-funds framing.
- The media hierarchy is technically present, but the wizard should make hero/search-card impact
  more explicit before publish.

### Unit Types

Functional status: Pass.

What works:

- Rental uses monthly rent, rent range, deposit, lease term, furnished state, and rental
  availability.
- Auction uses auction start/end, starting bid, reserve price, scheduled lifecycle, and lot
  availability.
- Wrong-lane sale/rent/auction fields are stripped or neutralized.
- Unit merchandising preview exists and is transaction-aware in helper output.

Product issues:

- Some summary surfaces still use generic `Avail` instead of `rentals available`, `fully let`, `lots
  open`, or `auction closed`.
- The Review & Publish unit summary still displays `R ...` with small contextual suffixes rather
  than always leading with `Rent from` or `Starting bid`.
- Reserve strategy is tracked but should more clearly say whether it is public, internal, or
  request-led.
- Rental available/reserved wording needs leasing semantics. `Reserved / Under Offer` can be
  confusing for rental inventory unless the UI explains application holds.

### Review & Publish

Functional status: Pass.

What works:

- Readiness blocks publish until required package fields are present.
- Manual `Save Draft` remains explicit.
- Browser publish creates approved, published Rental/Auction developments.
- Engine packaging context and Rental/Auction packaging feedback are visible.

Product issues:

- Primary controls still say `Publish Listing`, `Confirm Publication`, and listing terms. DLE should
  feel like publishing a rental package or auction package, not a generic listing.
- Confirmation copy mentions search indexing and notifications, but not transaction consequences:
  renter enquiries/lease packs for Rental, bidder interest/auction pack for Auction.
- The live preview title `Live Preview Mode` and price heading `From R ...` are too generic. Rental
  should lead with `Rent from`; Auction should lead with `Starting bid` or `Bid from`.
- The validation success message says `quality standards`; transaction lanes need clearer standards:
  rental package readiness or auction package readiness.

## Public Output Audit

### Public Detail

Functional status: Pass.

What works:

- Rental public detail shows rental package/pricing/lead language.
- Auction public detail shows auction package/pricing/lead language.
- Public commercial pack, transaction journey, trust preview, and package proof modules now carry
  meaningful transaction intelligence.

Product issues:

- The public layer is stronger than the wizard layer. The wizard should preview more of this public
  intelligence while the developer is entering data.
- Rental and Auction legal/document readiness should become more explicit before publish, especially
  when only a generic PDF brochure exists.

### Search Cards

Functional status: Pass.

What works:

- Rental search cards use `Rent from` and leasing-team intent.
- Auction search cards use `Bid from` and auction-team intent.
- Browser proof covers the hand-entered published units.

Product issues:

- Search-card quality depends heavily on the first unit and media order. The wizard should explain
  that media order and unit order directly affect public merchandising.

### Lead Forms

Functional status: Pass.

What works:

- Rental leads persist `transactionType: rent`, selected unit id/name, and `unitPriceLabel: Rent
  from`.
- Auction leads persist `transactionType: auction`, selected unit id/name, and `unitPriceLabel:
  Starting bid`.
- Lead source remains `development_detail_contact`.

Product issues:

- The form context is good after opening, but the wizard does not yet show developers enough of the
  lead handoff text that renters or bidders will see.

## Functional Blockers

No functional blockers are proven by this audit.

The current codebase has browser proof for hand-entered Rental and Auction:

- Project Setup through Review & Publish;
- manual draft save;
- publish;
- public detail;
- search card;
- lead form and persisted lead context.

## Product Polish Backlog

P0 before broad product rollout:

- Replace sale-shaped Marketing Summary examples in Rental/Auction with transaction-native example
  highlights.
- Change Review & Publish live preview price headings from generic `From R` to `Rent from` and
  `Starting bid`/`Bid from`.
- Replace generic unit summary `Avail` in Rental/Auction review contexts with leasing/auction
  availability language.
- Make publish confirmation copy transaction-native for Rental and Auction.

P1 near-term product quality:

- Add Rental-specific guidance for deposit, lease term, furnished state, application holds, and
  lease-pack documents before Review & Publish.
- Add Auction-specific guidance for auction window, reserve visibility, legal pack, bidder
  registration, auction terms, FICA, and proof-of-funds expectations before Review & Publish.
- Explain that hero image, gallery order, and unit order affect public cards and conversion.
- Show a small lead-handoff preview in Review & Publish so developers understand what renters or
  bidders will receive.

P2 later polish:

- Make Location and Amenities guidance more transaction-specific without adding new required data.
- Split generic governance/cost language into owner governance, renter cost, and bidder cost
  framing.
- Add a compact pre-publish public-preview checklist that mirrors the public commercial pack.

## Autosave Boundary

This audit does not justify enabling autosave.

Autosave remains behind:

- manual save/resume proof;
- field ownership;
- truthful save-state proof;
- default-off edit-autosave release control;
- confirmation that autosave cannot mutate broader operating, evidence, distribution, payout, or
  reward state.

## Next Recommended Slice

Implement the smallest P0 copy-only product polish slice:

- update Rental/Auction Marketing Summary example highlight copy;
- update Review & Publish preview price labels for Rental/Auction;
- keep behavior, schemas, save/publish endpoints, lead persistence, and autosave flags unchanged;
- add or update focused component tests for the changed copy.
