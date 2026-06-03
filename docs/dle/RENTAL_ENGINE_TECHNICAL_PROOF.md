# DLE Rental Engine Technical Proof Checkpoint

Date: 2026-06-03
Branch: recovery/lead-routing-verification-2026-06-02
Status: Focused API/unit/integration proof passed, including rental edit-published ownership; browser parity with Sale still pending.

## Purpose

This checkpoint records what is technically proven for the Rental Engine before the browser/manual rental ownership slice.

It does not claim that Rental is world-class or fully browser-proven. It establishes that the current codebase already has meaningful rental transaction guardrails, and it defines the remaining proof needed before autosave or broad UI/product upgrades.

## Test Run

Command:

```bash
bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/pages/DevelopmentQualificationPage.test.ts client/src/pages/ReferrerDashboard.test.ts server/__tests__/distributionCatalogPricing.test.ts server/lib/developmentReadiness.shared.test.ts server/lib/sanitizeDraftData.test.ts server/__tests__/developerRouter.edit-update.test.ts server/__tests__/integration.developer-create-lead-persistence.test.ts server/__tests__/integration.development-card-data-flow.test.ts'
```

Result:

- Passed.
- 11 test files.
- 94 tests.

Environment note:

- The first sandboxed attempt could not reach the local MySQL test database and failed with `connect EPERM 127.0.0.1:3306`.
- The same command passed when run with approved local DB access.

## What Is Technically Proven

Rental transaction normalization:

- `for_rent`, `to-rent`, and rental aliases normalize to the rental transaction model in public detail, unit detail, qualification, referral, distribution, readiness, and canonical draft helpers.

Rental pricing model:

- Public detail pricing uses `monthlyRentFrom` and `monthlyRentTo` instead of stale sale prices.
- Public unit detail labels rental units as monthly rent.
- Search/result card configuration pricing renders rental pricing as monthly rent.
- Qualification uses monthly rental budget language instead of purchase price language.
- Referral/distribution pricing uses rental ranges instead of stale sale aggregates.

Rental readiness:

- Rental readiness requires monthly rent.
- Inverted rental ranges are flagged as blockers.
- Unit-level rental readiness identifies `monthlyRentFrom` and invalid `monthlyRentTo` correctly.

Rental field ownership and stale-field stripping:

- Draft sanitization strips sale and auction pricing from rental unit data.
- Canonical submit/update helpers preserve rental ranges.
- Sale-to-rental transaction switching preserves unit identity while removing stale sale prices.
- Rental-to-sale switching removes stale rental fields when the transaction changes away from rent.
- Canonical `unit_types` partial saves can switch sale inventory to rental without owning unrelated fields.
- Published rental partial edits preserve unrelated fields across location, media, marketing/highlights, governance/finance, and unit-type ownership boundaries.
- Published rental public search/detail output remains rental-native after edits, using monthly rent aggregates and `listingType: rent` instead of stale sale-shaped prices.
- Published rental approval/searchability survives the edit sequence.

Rental public/search output:

- Public development search uses rental unit inventory for configurations instead of stale sale shadows.
- Published rental developments expose `transactionType: for_rent`, rental aggregates, and `listingType: rent` configurations in focused integration coverage.

Rental lead context:

- Public lead persistence normalizes rental transaction context to `rent`.
- Persisted rental lead context includes the unit price label such as `Rent from`.
- Rental lead context remains in the interest funnel stage when no affordability payload is supplied.

## Edit-Published API/DB Ownership Proof

Focused test:

- `server/__tests__/integration.development-card-data-flow.test.ts`
- Test name: `preserves published rental ownership across partial edits and public output`

Proof covered:

- Location partial edit changed address/suburb and preserved media, highlights, governance, rental unit types, monthly rent, approval, and public output.
- Media partial edit changed hero/gallery/video/floor plan/brochure assets and preserved location, highlights, governance, rental unit types, monthly rent, approval, and public output.
- Marketing partial edit changed description/highlights/tagline and preserved location, media, governance, rental unit types, monthly rent, approval, and public output.
- Governance/finance partial edit changed levy/rates/transfer-cost fields and preserved location, media, highlights, rental unit types, monthly rent, approval, and public output.
- Unit-types partial edit changed rental unit name, bedrooms, monthly rent range, deposit/lease/furnished metadata, and inventory totals while preserving location, media, highlights, governance, approval, and public output.
- Stale sale-shaped `priceFrom`/`priceTo` values injected during rental edits did not leak into development-level public pricing.

## What This Does Not Yet Prove

The Rental Engine is not yet at Sale parity.

Still pending:

- Browser-proven rental create/save/resume.
- Browser-proven rental publish/readiness.
- Browser-proven rental public development page.
- Browser-proven rental search/result card.
- Browser-proven rental public lead submission.
- Browser edit-published ownership proof for rental location, media, marketing/highlights, governance/finance, and unit-type edits.
- Product-quality audit of rental language, especially avoiding sale-shaped inventory copy such as sold/sold-out where leasing language is more appropriate.

## Next Required Slice

Run the Rental Engine browser ownership proof using the Sale ownership pattern:

1. Create or identify a published rental development.
2. Edit location and confirm media, highlights, governance, rental units, monthly rent, approval, and public output are preserved.
3. Edit media and confirm location, highlights, governance, rental units, monthly rent, approval, and public output are preserved.
4. Edit marketing/highlights and confirm public highlights update without wiping rental units/media/location.
5. Edit governance/finance and confirm rental inventory is preserved.
6. Edit rental unit types and confirm rental aggregates, public page, search cards, and lead context remain rental-native.
7. Confirm the development remains published/approved/searchable.
8. Confirm lead capture preserves development id, selected unit id/name, `transactionType: rent`, and `Rent From`/monthly-rent context.

## Autosave Decision

Autosave is still not safe to start from this checkpoint alone.

Reason:

- Rental has strong focused technical/API coverage, including edit-published ownership, but not full browser/manual ownership proof.
- Auction has not yet reached the same technical/browser checkpoint.
- The save-state truth principle still requires all transaction lanes to prove safe save/resume/edit behavior before autosave.
