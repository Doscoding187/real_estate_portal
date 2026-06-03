# DLE Rental Engine Technical Proof Checkpoint

Date: 2026-06-03
Branch: recovery/lead-routing-verification-2026-06-02
Status: Focused API/unit/integration proof passed, including rental edit-published ownership. Browser public-output parity for edit-published ownership is now proven.

## Purpose

This checkpoint records what is technically proven for the Rental Engine, including the later browser public-output proof for edit-published ownership.

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

## Edit-Published Browser Public-Output Proof

Focused browser spec:

- `e2e/dle/rental-auction-edit-published-ownership.spec.ts`
- Test name: `proves rental edit-published ownership remains visible in browser output`

Proof covered:

- Published rental location edit updated the public suburb while preserving rental unit identity, monthly rent, and highlights.
- Published rental media edit did not wipe location, highlights, rental unit identity, or monthly rent on the public page.
- Published rental marketing edit updated public highlights while preserving location, media, unit identity, and monthly rent.
- Published rental governance/finance edit did not wipe public location, highlights, unit identity, or monthly rent.
- Published rental unit edit updated the visible unit name and rent range while preserving location, media, highlights, approval/searchability, and transaction-native lead context.
- Post-edit rental search card rendered `Rent from R 13,500`.
- Post-edit rental lead capture persisted selected unit id/name, `transactionType: rent`, and `unitPriceLabel: Rent from`.

Evidence:

- `docs/dle/evidence/2026-06-03/qa-dle-rental-edit-published-public-page.png`
- `docs/dle/evidence/2026-06-03/qa-dle-rental-edit-published-search-card.png`
- `docs/dle/evidence/2026-06-03/qa-dle-rental-edit-published-lead-context.png`

## What This Does Not Yet Prove

The Rental Engine is not yet at Sale parity.

Still pending:

- Browser-proven rental create/save/resume through the wizard.
- Browser-proven rental publish/readiness through the wizard.
- Product-quality audit of rental language, especially avoiding sale-shaped inventory copy such as sold/sold-out where leasing language is more appropriate.

## Next Required Slice

Run the Rental Engine wizard save/resume/publish proof:

1. Create a rental development through the browser wizard.
2. Manually save the rental draft.
3. Confirm it appears in My Drafts.
4. Resume the draft and verify identity, media, highlights, rental units, monthly rent, and readiness state.
5. Publish/submit the rental development through the wizard readiness path.
6. Confirm public page, search card, and lead context still match the transaction-first rental engine.

## Autosave Decision

Autosave is still not safe to start from this checkpoint alone.

Reason:

- Rental has strong focused technical/API coverage and browser public-output edit-published ownership proof.
- Rental wizard create/save/resume/publish remains pending.
- The save-state truth principle still requires transaction-lane save/resume behavior before autosave.
