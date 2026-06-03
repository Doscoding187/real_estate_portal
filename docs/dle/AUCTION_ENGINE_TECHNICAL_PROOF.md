# DLE Auction Engine Technical Proof Checkpoint

Date: 2026-06-03
Branch: refine/homepage-phase1-clarity-trust
Status: Focused API/unit/integration proof passed, including auction edit-published ownership; browser parity with Sale still pending.

## Purpose

This checkpoint records what is technically proven for the Auction Engine before browser/manual auction ownership work.

It does not claim that Auction is world-class or fully browser-proven. It proves that the current codebase treats auction as its own transaction lane with bid/reserve pricing, auction dates, stale sale/rent stripping, public output, and edit-published field ownership.

## Test Run

Command:

```bash
bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/pages/DevelopmentQualificationPage.test.ts client/src/pages/ReferrerDashboard.test.ts server/__tests__/distributionCatalogPricing.test.ts server/lib/developmentReadiness.shared.test.ts server/lib/sanitizeDraftData.test.ts server/__tests__/developerRouter.edit-update.test.ts server/__tests__/integration.developer-create-lead-persistence.test.ts server/__tests__/integration.development-card-data-flow.test.ts'
```

Result:

- Passed.
- 11 test files.
- 95 tests.

## What Is Technically Proven

Auction transaction normalization:

- Auction developments and unit types use `auction` transaction context instead of sale/rental defaults.
- Auction public detail, unit detail, search cards, qualification, referral, distribution, readiness, and canonical helpers use auction pricing semantics.

Auction pricing model:

- Public detail pricing uses `startingBidFrom` and `reservePriceFrom` instead of stale sale prices.
- Public unit detail labels auction pricing as starting bid/reserve price.
- Search/result card configuration pricing renders auction pricing with `listingType: auction`.
- Qualification and distribution helpers use auction starting bid/reserve pricing.
- Public detail now exposes top-level auction aggregates: `auctionStartDate`, `auctionEndDate`, `startingBidFrom`, and `reservePriceFrom`.

Auction readiness:

- Auction readiness requires starting bid and an auction start date.
- Auction readiness blocks invalid or past auction dates where applicable.
- Unit-level readiness identifies missing/invalid auction bid terms.

Auction field ownership and stale-field stripping:

- Draft sanitization strips sale and rental pricing from auction unit data.
- Canonical submit/update helpers preserve auction bid terms.
- Sale-to-auction switching preserves unit identity while removing stale sale/rental fields.
- Published auction partial edits preserve unrelated fields across location, media, marketing/highlights, governance/finance, and unit-type ownership boundaries.
- Published auction public search/detail output remains auction-native after edits, using bid/reserve aggregates and `listingType: auction` instead of stale sale/rent pricing.
- Published auction approval/searchability survives the edit sequence.

## Edit-Published API/DB Ownership Proof

Focused test:

- `server/__tests__/integration.development-card-data-flow.test.ts`
- Test name: `preserves published auction ownership across partial edits and public output`

Proof covered:

- Location partial edit changed address/suburb and preserved media, highlights, governance, auction units, bid/reserve pricing, auction dates, approval, and public output.
- Media partial edit changed hero/gallery/video/floor plan/brochure assets and preserved location, highlights, governance, auction units, bid/reserve pricing, auction dates, approval, and public output.
- Marketing partial edit changed description/highlights/tagline and preserved location, media, governance, auction units, bid/reserve pricing, auction dates, approval, and public output.
- Governance/finance partial edit changed levy/rates/transfer-cost fields and preserved location, media, highlights, auction units, bid/reserve pricing, auction dates, approval, and public output.
- Unit-types partial edit changed auction unit name, bedroom count, starting bid, reserve price, auction window, and inventory totals while preserving location, media, highlights, governance, approval, and public output.
- Stale sale-shaped `priceFrom` and rental-shaped `monthlyRentFrom` values injected during auction edits did not leak into development-level public pricing.

## What This Does Not Yet Prove

The Auction Engine is not yet at Sale browser parity.

Still pending:

- Browser-proven auction create/save/resume.
- Browser-proven auction publish/readiness.
- Browser-proven auction public development page.
- Browser-proven auction search/result card.
- Browser-proven auction public lead submission.
- Browser edit-published ownership proof for auction location, media, marketing/highlights, governance/finance, and unit-type edits.
- Product-quality audit of auction language, especially registration, auction timing, legal pack readiness, and bid CTA language.

## Next Required Slice

Run the Auction Engine browser ownership proof using the Sale ownership pattern:

1. Create or identify a published auction development.
2. Edit location and confirm media, highlights, governance, auction units, bid/reserve terms, auction dates, approval, and public output are preserved.
3. Edit media and confirm location, highlights, governance, auction units, bid/reserve terms, auction dates, approval, and public output are preserved.
4. Edit marketing/highlights and confirm public highlights update without wiping auction units/media/location.
5. Edit governance/finance and confirm auction inventory is preserved.
6. Edit auction unit types and confirm auction aggregates, public page, search cards, and lead context remain auction-native.
7. Confirm the development remains published/approved/searchable.
8. Confirm lead capture preserves development id, selected unit id/name, `transactionType: auction`, and starting-bid/reserve context.

## Autosave Decision

Autosave is still not safe to start from this checkpoint alone.

Reason:

- Sale has browser/API proof, and Rental/Auction now have strong technical/API ownership proof.
- Rental and Auction still need browser/manual ownership proof.
- The save-state truth principle still requires all transaction lanes to prove safe save/resume/edit behavior before autosave.
