# DLE Rental Engine Technical Proof Checkpoint

Date: 2026-06-03; updated 2026-06-25
Branch: recovery/lead-routing-verification-2026-06-02
Status: Focused API/unit/integration proof passed, including rental edit-published ownership. Browser public-output parity for edit-published ownership is proven. Browser save/resume/publish proof from a review-ready canonical draft is proven. Browser proof now also covers a hand-entered Rental package from Project Setup through Review & Publish draft save, publish, public detail, search card, and lead context.

## Purpose

This checkpoint records what is technically proven for the Rental Engine, including the later browser public-output proof for edit-published ownership.

It does not claim that Rental is world-class. It establishes that the current codebase already has meaningful rental transaction guardrails, including a hand-entered wizard path through Review & Publish draft save, publish, public detail, search card, and lead context, and it defines the remaining product-quality proof needed before broad UI/product upgrades.

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

## Wizard Save/Resume/Publish Browser Proof

Focused browser spec:

- `e2e/dle/rental-auction-wizard-save-publish.spec.ts`
- Test name: `proves rental wizard draft resume, manual save, publish, public output, search, and lead context`

Proof covered:

- A review-ready canonical rental draft appeared in My Drafts with one unit type.
- Resume opened the wizard with the draft id and hydrated Review & Publish with name, media, highlights, rental unit identity, monthly rent, and publish controls.
- Manual `Save Draft` sent a real `developer.saveDraft` request and the DB draft retained `workflowId: residential_rent`, canonical `stepData.unit_types.unitTypes`, monthly rent, and no stale sale/auction unit pricing.
- Browser publish created an approved, published rental development with `transactionType: for_rent`.
- Public page, search card, and lead capture stayed rental-native after wizard publish.
- Persisted lead context included development id, selected unit id/name, `transactionType: rent`, `unitPriceLabel: Rent from`, `leadSource: development_detail_contact`, and `funnelStage: interest`.

Evidence:

- `docs/dle/evidence/2026-06-04/qa-dle-rental-wizard-draft-visible.png`
- `docs/dle/evidence/2026-06-04/qa-dle-rental-wizard-resume-hydrated.png`
- `docs/dle/evidence/2026-06-04/qa-dle-rental-wizard-public-page.png`
- `docs/dle/evidence/2026-06-04/qa-dle-rental-wizard-search-card.png`
- `docs/dle/evidence/2026-06-04/qa-dle-rental-wizard-lead-context.png`

## Hand-Entered Wizard Publish Browser Proof

Focused browser spec:

- `e2e/dle/rental-auction-hand-entered-wizard.spec.ts`
- Test name: `publishes a hand-entered rental package with transaction-native public output`

Proof covered:

- Starts from `/developer/create-development` with a real seeded developer account.
- Selects `Residential Development` and `To Let / Rent` through Project Setup.
- Enters configuration, identity/status, location, governance rates, marketing description,
  highlights, hero media, brochure document, and a real Unit Types rental dialog.
- Saves the draft through the real `developer.saveDraft` route from Review & Publish.
- Asserts the persisted draft keeps `workflowId: residential_rent`, `transactionType: for_rent`,
  canonical step data, local-upload media/document URLs, rental unit identity, monthly rent range,
  deposit, lease term, furnished state, and live rental availability.
- Asserts stale auction pricing and sale pricing do not appear in the hand-entered rental unit
  payload.
- Publishes the same hand-entered package through the browser and asserts the approved published
  development remains `transactionType: for_rent`.
- Proves the public detail page renders the hand-entered unit, rental highlight, and rental price
  range.
- Proves the search card renders the hand-entered unit with `Rent from` pricing.
- Submits a lead from the public detail unit CTA and asserts persisted lead context includes
  development id, selected unit id/name, `transactionType: rent`, `unitPriceLabel: Rent from`,
  `leadSource: development_detail_contact`, and `funnelStage: interest`.

## What This Does Not Yet Prove

The Rental Engine is much closer to Sale parity, but not yet a full product-quality rental journey.

Still pending:

- Product-quality audit of rental-specific wizard language and public merchandising.
- Product-quality audit of rental language, especially avoiding sale-shaped inventory copy such as sold/sold-out where leasing language is more appropriate.

## Next Required Slice

Run a product-quality Rental UX audit focused on confusing copy, hidden requirements, weak readiness feedback, and sale-shaped leasing language.

## Autosave Decision

Create/draft autosave remains default-off and edit-development autosave remains default-off.

Reason:

- Rental now has strong focused technical/API coverage, browser public-output edit-published
  ownership proof, browser save/resume/publish proof from a review-ready canonical draft, full
  edit-autosave ownership/failure/retry/stale-response proof across transaction lanes, and
  hand-entered Rental draft-save, publish, public-output, search-card, and lead-context proof.
- Any rollout still requires explicit release control; default-off autosave posture remains the
  safe operating mode.
