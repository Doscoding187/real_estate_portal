# DLE Auction Engine Technical Proof Checkpoint

Date: 2026-06-03; updated 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Status: Focused API/unit/integration proof passed, including auction edit-published ownership. Browser public-output parity for edit-published ownership is proven. Browser save/resume/publish proof from a review-ready canonical draft is now proven.

## Purpose

This checkpoint records what is technically proven for the Auction Engine, including the later browser public-output proof for edit-published ownership.

It does not claim that Auction is world-class or that the full hand-entered wizard UX has been proven from Project Setup through every form step. It proves that the current codebase treats auction as its own transaction lane with bid/reserve pricing, auction dates, stale sale/rent stripping, public output, edit-published field ownership, and review-ready canonical draft save/resume/publish behavior.

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

## Edit-Published Browser Public-Output Proof

Focused browser spec:

- `e2e/dle/rental-auction-edit-published-ownership.spec.ts`
- Test name: `proves auction edit-published ownership remains visible in browser output`

Proof covered:

- Published auction location edit updated the public suburb while preserving auction unit identity, bid/reserve range, and highlights.
- Published auction media edit did not wipe location, highlights, auction unit identity, or bid/reserve pricing on the public page.
- Published auction marketing edit updated public highlights while preserving location, media, unit identity, and bid/reserve range.
- Published auction governance/finance edit did not wipe public location, highlights, unit identity, or bid/reserve pricing.
- Published auction unit edit updated the visible unit name and bid/reserve range while preserving location, media, highlights, approval/searchability, and transaction-native lead context.
- Post-edit auction search card rendered `Bid from R 1,050,000`.
- Post-edit auction lead capture persisted selected unit id/name, `transactionType: auction`, and `unitPriceLabel: Starting bid`.

Evidence:

- `docs/dle/evidence/2026-06-03/qa-dle-auction-edit-published-public-page.png`
- `docs/dle/evidence/2026-06-03/qa-dle-auction-edit-published-search-card.png`
- `docs/dle/evidence/2026-06-03/qa-dle-auction-edit-published-lead-context.png`

## Wizard Save/Resume/Publish Browser Proof

Focused browser spec:

- `e2e/dle/rental-auction-wizard-save-publish.spec.ts`
- Test name: `proves auction wizard draft resume, manual save, publish, public output, search, and lead context`

Proof covered:

- A review-ready canonical auction draft appeared in My Drafts with one unit type.
- Resume opened the wizard with the draft id and hydrated Review & Publish with name, media, highlights, auction unit identity, starting bid, and publish controls.
- Manual `Save Draft` sent a real `developer.saveDraft` request and the DB draft retained `workflowId: residential_auction`, canonical `stepData.unit_types.unitTypes`, bid/reserve fields, auction dates, and no stale sale/rental unit pricing.
- Browser publish created an approved, published auction development with `transactionType: auction`.
- Public page, search card, and lead capture stayed auction-native after wizard publish.
- Persisted lead context included development id, selected unit id/name, `transactionType: auction`, `unitPriceLabel: Starting bid`, `leadSource: development_detail_contact`, and `funnelStage: interest`.

Evidence:

- `docs/dle/evidence/2026-06-04/qa-dle-auction-wizard-draft-visible.png`
- `docs/dle/evidence/2026-06-04/qa-dle-auction-wizard-resume-hydrated.png`
- `docs/dle/evidence/2026-06-04/qa-dle-auction-wizard-public-page.png`
- `docs/dle/evidence/2026-06-04/qa-dle-auction-wizard-search-card.png`
- `docs/dle/evidence/2026-06-04/qa-dle-auction-wizard-lead-context.png`

## What This Does Not Yet Prove

The Auction Engine is much closer to Sale browser parity, but not yet a full product-quality auction journey.

Still pending:

- Full hand-entered auction wizard UX from Project Setup through every form step.
- Product-quality audit of auction language, especially registration, auction timing, legal pack readiness, and bid CTA language.

## Next Required Slice

Run the Auction Engine autosave preflight or full hand-entered auction UX proof:

1. If preparing autosave, define and prove truthful save-state, failed-save messaging, retry, conflict handling, and transaction-scoped payload ownership.
2. If preparing product polish, run a fully hand-entered auction browser journey from Project Setup through Review & Publish and record UX gaps.

## Autosave Decision

Autosave is still not safe to start from this checkpoint alone.

Reason:

- Sale has browser/API proof, and Auction now has strong technical/API ownership proof, browser public-output edit-published proof, and browser save/resume/publish proof from a review-ready canonical draft.
- Transaction-lane save/resume/publish is no longer the main auction blocker.
- Autosave still requires a dedicated failure/retry/conflict design and proof that the UI never claims saved progress unless a real save succeeds.
