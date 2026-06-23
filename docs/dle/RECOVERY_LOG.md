# DLE Recovery Log

This log records completed Development Listing Engine slices, verification, risks, and handoff context.

No completed slice should be left uncommitted unless this log clearly explains why.

## Entry Template

```text
Date:
Branch:
Goal:
Files changed:
Focused tests run:
pnpm run check:
git diff --check:
Manual flows verified:
Remaining risks:
Next recommended slice:
Commit hash/tag:
Uncommitted reason, if any:
```

## 2026-06-02 - Documentation Foundation

Date: 2026-06-02
Branch: recovery/lead-routing-verification-2026-06-02
Goal: Create the DLE docs foundation so future agents share the same product vision, recovery discipline, and implementation guardrails.
Files changed:
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/MANUAL_FLOW_CHECKLIST.md
- docs/dle/PRODUCT_VISION.md
- docs/dle/TECHNICAL_ARCHITECTURE.md
- docs/dle/FIELD_OWNERSHIP_CONTRACT.md
- docs/dle/AGENT_HANDOFF_TEMPLATE.md
Focused tests run: Not applicable; documentation-only slice.
pnpm run check: Not run; documentation-only slice.
git diff --check: Passed.
Manual flows verified: None; this slice only creates documentation guardrails.
Remaining risks:
- Manual DLE browser flows still need a dedicated recovery audit.
- Autosave remains a future slice behind manual save/resume proof.
Next recommended slice: Run the DLE recovery audit and manual flow proof checklist.
Commit hash/tag: `97e9a7bb docs(dle): add source of truth and recovery discipline`
Uncommitted reason, if any: None. Slice committed.

## 2026-06-02 - Recovery Audit

Date: 2026-06-02
Branch: recovery/lead-routing-verification-2026-06-02
Goal: Run the source-of-truth recovery audit before continuing major DLE implementation work.
Files changed:
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run server/lib/canonicalDevelopmentPayload.test.ts server/lib/developmentCanonicalSnapshot.test.ts server/lib/sanitizeDraftData.test.ts server/services/__tests__/developmentTransactionAggregates.test.ts server/__tests__/developerRouter.drafts.test.ts server/__tests__/developerRouter.edit-update.test.ts'`
- Result: Passed. 6 test files, 77 tests.
pnpm run check: Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check: Passed after this log update. Direct trailing-whitespace scan of `docs/dle/` also passed.
Manual flows verified: None. Browser-level DLE flows still require a runtime/dev-server-capable environment.
Recovery audit evidence:
- Current branch: `recovery/lead-routing-verification-2026-06-02`
- Current status before this log update: only `docs/dle/` was untracked.
- Recent stable DLE tag present: `dle-wizard-recovery-verified-2026-06-02`
- Recent lead-routing recovery tag present: `lead-routing-recovery-verified-nodb-sessiondb-2026-06-02`
- Latest commit on branch: `d3c83631 fix(upload): support local media uploads for manual QA`
- Untracked files before this log update: `docs/dle/*`
- `git diff --stat` before this log update: empty because the docs folder was untracked.
- Node/pnpm note: this shell does not load Node by default; source `~/.nvm/nvm.sh` first. Verified Node `v22.22.3` and pnpm `10.4.1`.
Key DLE files confirmed present:
- server/lib/canonicalDevelopmentPayload.ts
- server/lib/developmentCanonicalSnapshot.ts
- server/lib/sanitizeDraftData.ts
- server/services/developmentService.ts
- shared/developmentDerived.ts
- shared/developmentReadiness.ts
- client/src/components/development-wizard/phases/UnitTypesPhase.tsx
- client/src/pages/DevelopmentDetail.tsx
- server/__tests__/developerRouter.edit-update.test.ts
- server/__tests__/developerRouter.drafts.test.ts
- server/lib/canonicalDevelopmentPayload.test.ts
- server/lib/developmentCanonicalSnapshot.test.ts
- server/services/__tests__/developmentTransactionAggregates.test.ts
Remaining risks:
- Manual browser flows remain unverified in this audit.
- `docs/dle/` remains uncommitted until user approval.
Next recommended slice:
- Then run browser-level manual flow proof for create, manual save draft, My Drafts, resume, publish, and public display.
Commit hash/tag: `97e9a7bb docs(dle): add source of truth and recovery discipline`
Uncommitted reason, if any: None. Slice committed.

## 2026-06-02 - Browser Manual Flow Preflight

Date: 2026-06-02
Branch: recovery/lead-routing-verification-2026-06-02
Goal: Start browser-level DLE manual flow proof using the local developer demo account.
Files changed:
- docs/dle/MANUAL_FLOW_CHECKLIST.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-02/*.png
Focused tests run:
- Not rerun in this slice. Prior focused DLE guardrails passed: 6 files, 77 tests.
pnpm run check:
- Not rerun in this slice. Prior `pnpm run check` passed after sourcing `~/.nvm/nvm.sh`.
git diff --check:
- Passed.
Manual flows verified:
- Partial browser preflight only.
- Login form rendered and authenticated local developer route worked.
- Authenticated developer reached `/developer/create-development`.
- Project Setup displayed development type and sale/rent/auction transaction choices.
- Sale workflow started as `residential_sale`.
- Configuration, Identity & Market, Location, Governance & Finances, Amenities & Features, and Marketing Summary were reached through browser navigation.
- Location data entry advanced to Governance & Finances.
- Amenities quick-start applied common amenities and advanced to Marketing Summary.
Evidence:
- docs/dle/evidence/2026-06-02/qa-login-signin-form-dle.png
- docs/dle/evidence/2026-06-02/qa-dle-wizard-start.png
- docs/dle/evidence/2026-06-02/qa-dle-wizard-step-after-start.png
- docs/dle/evidence/2026-06-02/qa-dle-wizard-identity.png
- docs/dle/evidence/2026-06-02/qa-dle-location-ready.png
- docs/dle/evidence/2026-06-02/qa-dle-after-location-next.png
- docs/dle/evidence/2026-06-02/qa-dle-marketing-summary.png
Product/UX findings:
- The wizard has a visible guided packaging shape: setup selector, transaction goal, step-level explanations, result-card recommendations, and amenities quick-start.
- Explicit Manual Save Draft is only visible in the final review/publish step, not in earlier wizard steps. This matters for the autosave/truth-in-UX principle because earlier steps show `Saved` status while autosave remains disabled.
- Headless browser did not find a `.gm-style` map element during Location, but address/city/province/postal fields still advanced successfully.
Remaining risks:
- No final create/publish submit through browser yet.
- No browser proof yet for Media, Unit Types, Review, Manual Save Draft, My Drafts, Draft Resume, Publish, Public Page, Search Cards, or lead capture.
- Login rate limiting can be hit during repeated QA scripts; restart local backend to clear in-memory limiter during local-only testing.
Next recommended slice:
- Continue browser manual proof from Marketing Summary through Media and Unit Types.
- Confirm whether Manual Save Draft should be exposed before Review, or document as intentional review-only behavior before autosave work.
Commit hash/tag: `ada5b495 docs(dle): record browser manual flow preflight`
Uncommitted reason, if any: None. Slice committed.

## 2026-06-02 - Browser Manual Save/Resume Proof

Date: 2026-06-02
Branch: recovery/lead-routing-verification-2026-06-02
Goal: Continue from the existing recovery checkpoint and prove the DLE sale workflow through manual save, My Drafts visibility, and draft resume without repeating basic recovery setup.
Files changed:
- docs/dle/MANUAL_FLOW_CHECKLIST.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-02/*.png
Focused tests run:
- Browser manual flow proof through Playwright against local frontend/backend.
- No API failures captured during the successful run.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed.
Manual flows verified:
- Developer login.
- Sale development workflow start.
- Residential configuration.
- Identity and market entry.
- Location entry.
- Governance/finance step advance.
- Amenities quick-start.
- Marketing summary step advance.
- Local media upload for hero/gallery image and brochure.
- Sale unit type creation with pricing/inventory.
- Review & Publish reached.
- Manual Save Draft from Review.
- Draft appeared in My Drafts.
- Resume opened `/developer/create-development?draftId=2` and restored the saved development identity.
Evidence:
- docs/dle/evidence/2026-06-02/qa-dle-flow-login-to-create.png
- docs/dle/evidence/2026-06-02/qa-dle-flow-identity-filled.png
- docs/dle/evidence/2026-06-02/qa-dle-flow-location-filled.png
- docs/dle/evidence/2026-06-02/qa-dle-flow-amenities-filled.png
- docs/dle/evidence/2026-06-02/qa-dle-flow-marketing-filled.png
- docs/dle/evidence/2026-06-02/qa-dle-flow-media-uploaded.png
- docs/dle/evidence/2026-06-02/qa-dle-flow-unit-types-start.png
- docs/dle/evidence/2026-06-02/qa-dle-flow-unit-type-created.png
- docs/dle/evidence/2026-06-02/qa-dle-flow-review-ready.png
- docs/dle/evidence/2026-06-02/qa-dle-flow-manual-save-draft.png
- docs/dle/evidence/2026-06-02/qa-dle-flow-my-drafts-visible.png
- docs/dle/evidence/2026-06-02/qa-dle-flow-draft-resumed.png
Product/UX findings:
- The wizard has a guided packaging shape, especially setup, amenities, media quality, and unit inventory.
- The header still shows `Saved` before a backend-backed manual save has happened, which conflicts with the autosave truth principle.
- Manual `Save Draft` is only visible on Review & Publish, leaving earlier steps without an obvious trusted backend save fallback.
- Publish/public-page proof is still needed before judging buyer-facing quality.
Remaining risks:
- Publish/submit-for-review was not attempted in this slice.
- Public development detail page, search cards, lead capture, rental flow, auction flow, and edit-published ownership proof remain pending.
- Resume proof confirmed identity restoration; media/doc/unit canonical restoration should be asserted more deeply before autosave.
Next recommended slice:
- Run publish/submit-for-review and public development page proof for the saved sale development, then inspect public/search-card transaction language.
- After that, prove rental and auction unit-type paths through browser and decide the pre-Review save-state UX fix.
Commit hash/tag: `527e3762 docs(dle): record manual save resume proof`
Uncommitted reason, if any: None. Slice committed.

## 2026-06-02 - Sale Publish/Public Page Proof

Date: 2026-06-02
Branch: recovery/lead-routing-verification-2026-06-02
Goal: Continue from the manual save/resume checkpoint by proving sale draft publish and public development detail rendering, then audit the sale journey product gaps before autosave.
Files changed:
- server/services/developmentService.ts
- server/services/__tests__/developmentService.date.test.ts
- client/src/pages/DevelopmentDetail.tsx
- client/src/pages/DevelopmentDetail.test.ts
- docs/dle/MANUAL_FLOW_CHECKLIST.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/SALE_JOURNEY_PRODUCT_AUDIT.md
- docs/dle/evidence/2026-06-02/*.png
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run server/services/__tests__/developmentService.date.test.ts client/src/pages/DevelopmentDetail.test.ts'`
- Result: Passed. 2 test files, 14 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed.
Manual flows verified:
- Resumed saved sale draft id `2`.
- Publish readiness correctly blocked missing highlights.
- Added three highlights in Marketing Summary.
- Published development id `4` after backend date normalization fix.
- Verified database row with `isPublished = 1`, transaction type `for_sale`, sale price range, and published unit inventory.
- Fixed public detail amenity helper render-order crash.
- Public detail page rendered with development name, sale pricing, unit type, and CTA.
Evidence:
- docs/dle/evidence/2026-06-02/qa-dle-publish-resumed-draft.png
- docs/dle/evidence/2026-06-02/qa-dle-publish-button-disabled.png
- docs/dle/evidence/2026-06-02/qa-dle-publish-review-blocked-before-fix.png
- docs/dle/evidence/2026-06-02/qa-dle-publish-marketing-before-highlights-fixed.png
- docs/dle/evidence/2026-06-02/qa-dle-publish-marketing-highlights-added-fixed.png
- docs/dle/evidence/2026-06-02/qa-dle-publish-review-ready-after-date-fix.png
- docs/dle/evidence/2026-06-02/qa-dle-publish-confirm-dialog-after-date-fix.png
- docs/dle/evidence/2026-06-02/qa-dle-publish-result-after-date-fix.png
- docs/dle/evidence/2026-06-02/qa-dle-public-page-sale-published.png
- docs/dle/evidence/2026-06-02/qa-dle-public-page-sale-rendered.png
Product/UX findings:
- The readiness guardrail is useful, but missing highlights are discovered too late in the flow.
- Public detail now renders, but required highlights were not confirmed on the public page. This is a gap between backend readiness and buyer-facing proof.
- The save-state truth issue remains: the UI must not claim progress is saved unless a real save has succeeded.
Remaining risks:
- Search cards and lead capture were not verified.
- Edit-published field ownership remains unverified.
- Rental and auction browser flows remain unverified.
- Autosave remains behind manual save/resume and truth-in-UX fixes.
Next recommended slice:
- Fix public highlight surfacing and save-state truth, then verify search-card/lead-form transaction context before starting autosave.
Commit hash/tag: `d4e0adaf fix(dle): publish sale drafts and render public detail`
Uncommitted reason, if any: None. Slice committed.

## 2026-06-03 - Public Highlights And Save-State Truth

Date: 2026-06-03
Branch: recovery/lead-routing-verification-2026-06-02
Goal: Fix the two blockers identified before autosave: publish-critical highlights must be visible on the public sale page, and the wizard must not claim progress is saved before a real save succeeds.
Files changed:
- server/services/developmentService.ts
- server/services/__tests__/developmentService.date.test.ts
- client/src/pages/DevelopmentDetail.tsx
- client/src/pages/DevelopmentDetail.test.ts
- client/src/components/wizard/WizardHeader.tsx
- client/src/components/wizard/WizardEngine.tsx
- client/src/components/development-wizard/DevelopmentWizard.tsx
- client/src/components/development-wizard/DevelopmentWizard.test.tsx
- docs/dle/MANUAL_FLOW_CHECKLIST.md
- docs/dle/SALE_JOURNEY_PRODUCT_AUDIT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-03/qa-dle-public-highlights-visible.png
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run server/services/__tests__/developmentService.date.test.ts client/src/pages/DevelopmentDetail.test.ts client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx'`
- Result: Passed. 4 test files, 27 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Manual flows verified:
- Public sale page for `dle-qa-sale-flow-1780436367449-2vp50t` rendered without error boundary.
- Public sale page showed `Market Highlights`.
- Public sale page showed `No transfer duty`, `Prime Sandton address`, and `Launch-ready investor units`.
- Public sale page still showed sale pricing and the sale unit type.
Evidence:
- docs/dle/evidence/2026-06-03/qa-dle-public-highlights-visible.png
Product/UX findings:
- Public detail now reflects publish-critical highlights, so the public showroom better proves the readiness engine.
- Header save state now starts as unsaved/manual-save-ready and only shows saved after a real manual save or save-progress path succeeds.
Remaining risks:
- Manual `Save Draft` is still most obvious on Review & Publish; earlier-step save affordance or clearer copy remains unresolved.
- Search-card browser proof and lead-form submission proof remain pending.
- Edit-published field ownership remains unverified.
- Rental and auction browser flows remain unverified.
- Autosave should still wait behind deeper resumed-draft and field-ownership proof.
Next recommended slice:
- Verify search-card and lead-form transaction context through browser/API, then prove edit-published ownership before autosave.
Commit hash/tag: `dd89ceab fix(dle): surface public highlights and truthful save state`
Uncommitted reason, if any: None. Slice committed.

## 2026-06-03 - Search Card And Lead Context Proof

Date: 2026-06-03
Branch: recovery/lead-routing-verification-2026-06-02
Goal: Verify sale public list/search output and public lead capture carry the DLE commercial context before autosave work.
Files changed:
- client/src/components/development/DevelopmentLeadDialog.tsx
- client/src/components/development/DevelopmentLeadDialog.test.tsx
- client/src/pages/DevelopmentDetail.tsx
- client/src/pages/DevelopmentUnitDetailPage.tsx
- server/developerRouter.ts
- server/services/publicLeadCaptureService.ts
- server/services/developmentService.ts
- server/__tests__/contract.developer-create-lead.test.ts
- server/__tests__/integration.developer-create-lead-persistence.test.ts
- server/__tests__/integration.development-card-data-flow.test.ts
- docs/dle/MANUAL_FLOW_CHECKLIST.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-03/qa-dle-lead-context-submitted.png
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/components/development/DevelopmentLeadDialog.test.tsx client/src/pages/DevelopmentDetail.test.ts server/__tests__/contract.developer-create-lead.test.ts server/__tests__/integration.developer-create-lead-persistence.test.ts server/__tests__/integration.development-card-data-flow.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx'`
- Result: Passed. 6 test files, 31 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Manual flows verified:
- Republished local QA development id `4` through `developmentService.publishDevelopment(4, 2)`.
- Verified public list output includes slug `dle-qa-sale-flow-1780436367449-2vp50t`, `transactionType: for_sale`, public highlights, and sale unit configuration with `priceFrom: 1750000`.
- Submitted a sale unit lead through the public development page in a headless browser.
- Verified `developer.createLead` returned HTTP `200` and closed the dialog.
- Verified persisted lead includes development id, selected unit id/name, unit price, unit price label, normalized `transactionType: sale`, and `funnel_stage: interest`.
Evidence:
- docs/dle/evidence/2026-06-03/qa-dle-lead-context-submitted.png
Product/UX findings:
- Public list/search output now visibly carries sale transaction and inventory context instead of behaving like a generic listing feed.
- Public lead capture now preserves selected-unit commercial context for routing/reporting readiness.
- Local QA data mismatch found: the captured unit is named `2 Bedroom Garden Apartment`, but the persisted lead bedroom count is `1`.
Remaining risks:
- Rent and auction search-card/lead-context browser proof remain pending.
- Edit-published field ownership remains unverified and should be next before autosave.
- Manual `Save Draft` remains most obvious on Review & Publish rather than throughout the wizard.
Next recommended slice:
- Prove edit-published field ownership for location, media, governance/finance, and sale unit types without wiping unrelated fields.
- Then run focused rent and auction public/lead-context proof.
Commit hash/tag: `4e107027 fix(dle): preserve lead context and searchable publish state`
Uncommitted reason, if any: None. Slice committed.

## 2026-06-03 - Edit-Published Field Ownership Proof

Date: 2026-06-03
Branch: recovery/lead-routing-verification-2026-06-02
Goal: Prove published sale development edits preserve unrelated fields before autosave work.
Files changed:
- server/services/developmentService.ts
- server/__tests__/integration.development-card-data-flow.test.ts
- docs/dle/MANUAL_FLOW_CHECKLIST.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/SALE_JOURNEY_PRODUCT_AUDIT.md
- docs/dle/evidence/2026-06-03/qa-dle-edit-published-field-ownership-summary.md
- docs/dle/evidence/2026-06-03/qa-dle-edit-published-public-page-final.png
- docs/dle/evidence/2026-06-03/qa-dle-edit-published-lead-submitted.png
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run server/__tests__/integration.development-card-data-flow.test.ts client/src/components/development/DevelopmentLeadDialog.test.tsx client/src/pages/DevelopmentDetail.test.ts server/__tests__/contract.developer-create-lead.test.ts server/__tests__/integration.developer-create-lead-persistence.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx'`
- Result: Passed. 6 test files, 32 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Manual flows verified:
- Published sale development id `4` location edit preserved media, highlights, governance, unit types, pricing, approval, and public visibility.
- Media edit preserved location, highlights, governance, unit types, pricing, approval, and public visibility.
- Marketing edit updated public `Market Highlights` and preserved location, media, governance, unit types, pricing, approval, and public visibility.
- Governance/finance edit preserved location, media, highlights, unit types, pricing, approval, and public visibility.
- Unit-types edit preserved location, media, highlights, governance, approval, and public visibility.
- Public page rendered the edited sale development with updated highlights, unit name, and sale price range.
- Post-edit lead capture returned HTTP `200` and persisted selected-unit sale context.
Bug fixed:
- Partial unit-type edits could leave development-level `totalUnits` and `availableUnits` stale when the caller omitted top-level inventory totals.
- `updateDevelopment` now derives development inventory totals from the effective unit set whenever unit types are edited.
Evidence:
- docs/dle/evidence/2026-06-03/qa-dle-edit-published-field-ownership-summary.md
- docs/dle/evidence/2026-06-03/qa-dle-edit-published-public-page-final.png
- docs/dle/evidence/2026-06-03/qa-dle-edit-published-lead-submitted.png
Product/UX findings:
- Sale edit-published ownership is now strong enough that autosave is no longer blocked by the sale path alone.
- Public output proves the edited sale package remains a commercial product page after location/media/governance/marketing/unit edits.
Remaining risks:
- Rent and auction edit-published ownership remain pending.
- Resumed draft restoration still needs deeper proof for media, documents, highlights, unit types, and readiness.
- Manual save remains the trusted fallback until autosave gets its own failure and recovery UX.
Next recommended slice:
- Prove rent and auction edit-published ownership using the same field-ownership pattern, then decide the first autosave implementation slice.
Commit hash/tag: `2ee9b40f fix(dle): preserve inventory totals on published edits`
Uncommitted reason, if any: None. Slice committed.

## 2026-06-03 - Transaction Engine Architecture Audit

Date: 2026-06-03
Branch: recovery/lead-routing-verification-2026-06-02
Goal: Pause before rent/auction ownership proof and document the transaction-first architecture model for Sale, Rental, and Auction sub-engines.
Files changed:
- docs/dle/TRANSACTION_ENGINE_ARCHITECTURE_AUDIT.md
- docs/dle/TECHNICAL_ARCHITECTURE.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Not run; documentation-only architecture audit.
pnpm run check:
- Not run; documentation-only architecture audit.
git diff --check:
- Passed.
Manual flows verified:
- None in this slice. This audit reviewed existing implementation references and prior sale browser proof.
Current implementation summary:
- Transaction-aware schema fields, shared helpers, readiness, publish normalization, public pricing, lead context, and distribution/referral pricing already exist for sale/rent/auction.
- Sale manual and edit-published ownership proof is complete.
- Rental and auction still need browser/API ownership proof before autosave.
Remaining risks:
- Rental and auction public/product behavior may still be sale-shaped in inventory language, dashboards, admin review, and qualification/distribution flows.
- Rental and auction field ownership under partial edits remains unproven.
Next recommended slice:
- Run Rental Engine edit-published ownership and public/lead proof using the sale ownership pattern, then run Auction Engine proof.
Commit hash/tag: Current commit for this slice.
Uncommitted reason, if any: None. Slice committed.

## 2026-06-03 - Rental Edit-Published API Ownership Proof

Date: 2026-06-03
Branch: refine/homepage-phase1-clarity-trust
Goal: Prove published rental development partial edits preserve unrelated fields and rental-native public output before autosave work.
Files changed:
- server/__tests__/integration.development-card-data-flow.test.ts
- docs/dle/RENTAL_ENGINE_TECHNICAL_PROOF.md
- docs/dle/MANUAL_FLOW_CHECKLIST.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run server/__tests__/integration.development-card-data-flow.test.ts'`
- Result: Passed. 1 test file, 12 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/pages/DevelopmentQualificationPage.test.ts client/src/pages/ReferrerDashboard.test.ts server/__tests__/distributionCatalogPricing.test.ts server/lib/developmentReadiness.shared.test.ts server/lib/sanitizeDraftData.test.ts server/__tests__/developerRouter.edit-update.test.ts server/__tests__/integration.developer-create-lead-persistence.test.ts server/__tests__/integration.development-card-data-flow.test.ts'`
- Result: Passed. 11 test files, 94 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed.
Manual flows verified:
- None in this slice. This is API/DB edit-published ownership proof; browser proof remains pending.
API/DB ownership proof:
- Published rental location edit preserved media, highlights, governance, rental units, monthly rent, approval, and public output.
- Published rental media edit preserved location, highlights, governance, rental units, monthly rent, approval, and public output.
- Published rental marketing/highlights edit preserved location, media, governance, rental units, monthly rent, approval, and public output.
- Published rental governance/finance edit preserved location, media, highlights, rental units, monthly rent, approval, and public output.
- Published rental unit-types edit preserved location, media, highlights, governance, approval, public output, and stale sale-shaped prices did not leak into rental public pricing.
Remaining risks:
- Rental browser edit-published proof remains pending.
- Rental browser create/save/resume/publish/public/search/lead proof remains pending.
- Auction technical/browser ownership proof remains pending.
- Autosave remains blocked until transaction-lane save/resume/edit safety is proven.
Next recommended slice:
- Run Rental Engine browser proof for public page/search/lead and edit-published ownership, or move to Auction technical ownership proof if browser runtime is not available.
Commit hash/tag: Current commit for this slice.
Uncommitted reason, if any: None. Slice committed.

## 2026-06-03 - Rental Engine Technical Proof Checkpoint

Date: 2026-06-03
Branch: recovery/lead-routing-verification-2026-06-02
Goal: Establish focused technical proof for the Rental Engine before browser/manual rental ownership work.
Files changed:
- docs/dle/RENTAL_ENGINE_TECHNICAL_PROOF.md
- docs/dle/MANUAL_FLOW_CHECKLIST.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/pages/DevelopmentQualificationPage.test.ts client/src/pages/ReferrerDashboard.test.ts server/__tests__/distributionCatalogPricing.test.ts server/lib/developmentReadiness.shared.test.ts server/lib/sanitizeDraftData.test.ts server/__tests__/developerRouter.edit-update.test.ts server/__tests__/integration.developer-create-lead-persistence.test.ts server/__tests__/integration.development-card-data-flow.test.ts'`
- Result: Passed. 11 test files, 93 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed.
Manual flows verified:
- None in this slice. This checkpoint is focused automated/API/DB proof only.
Technical proof:
- Rental pricing uses monthly rent fields on public detail, unit detail, search/result cards, qualification, referral, and distribution helpers.
- Rental readiness requires monthly rent and blocks inverted rental ranges.
- Rental sanitization/canonical update paths strip stale sale and auction fields.
- Rental public search configurations use rental aggregates and `listingType: rent`.
- Rental lead persistence normalizes transaction context to `rent` and preserves the rental unit price label.
Remaining risks:
- Rental browser create/save/resume/publish/public/search/lead proof remains pending.
- Rental edit-published ownership remains pending.
- Auction proof remains pending.
- Autosave remains blocked until all transaction lanes prove save/resume/edit safety.
Next recommended slice:
- Run Rental Engine browser/API edit-published ownership proof using the Sale ownership pattern.
Commit hash/tag: Current commit for this slice.
Uncommitted reason, if any: None. Slice committed.

## 2026-06-03 - Auction Edit-Published API Ownership Proof

Date: 2026-06-03
Branch: refine/homepage-phase1-clarity-trust
Goal: Prove published auction development partial edits preserve unrelated fields and auction-native public output before autosave work.
Files changed:
- server/__tests__/integration.development-card-data-flow.test.ts
- server/services/developmentService.ts
- docs/dle/AUCTION_ENGINE_TECHNICAL_PROOF.md
- docs/dle/MANUAL_FLOW_CHECKLIST.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run server/__tests__/integration.development-card-data-flow.test.ts'`
- Result: Passed. 1 test file, 13 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/pages/DevelopmentQualificationPage.test.ts client/src/pages/ReferrerDashboard.test.ts server/__tests__/distributionCatalogPricing.test.ts server/lib/developmentReadiness.shared.test.ts server/lib/sanitizeDraftData.test.ts server/__tests__/developerRouter.edit-update.test.ts server/__tests__/integration.developer-create-lead-persistence.test.ts server/__tests__/integration.development-card-data-flow.test.ts'`
- Result: Passed. 11 test files, 95 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed.
Manual flows verified:
- None in this slice. This is API/DB edit-published ownership proof; browser proof remains pending.
API/DB ownership proof:
- Published auction location edit preserved media, highlights, governance, auction units, bid/reserve pricing, auction dates, approval, and public output.
- Published auction media edit preserved location, highlights, governance, auction units, bid/reserve pricing, auction dates, approval, and public output.
- Published auction marketing/highlights edit preserved location, media, governance, auction units, bid/reserve pricing, auction dates, approval, and public output.
- Published auction governance/finance edit preserved location, media, highlights, auction units, bid/reserve pricing, auction dates, approval, and public output.
- Published auction unit-types edit preserved location, media, highlights, governance, approval, public output, and stale sale/rent prices did not leak into auction public pricing.
- Public development detail now exposes top-level auction aggregates used by the frontend pricing helpers: `auctionStartDate`, `auctionEndDate`, `startingBidFrom`, and `reservePriceFrom`.
Remaining risks:
- Auction browser create/save/resume/publish/public/search/lead proof remains pending.
- Rental browser proof remains pending.
- Autosave remains blocked until transaction-lane browser save/resume/edit safety is proven.
Next recommended slice:
- Run Rental and Auction browser proof for public page/search/lead and edit-published ownership, then decide the first autosave implementation slice.
Commit hash/tag: Current commit for this slice.
Uncommitted reason, if any: None. Slice will be committed after hygiene checks.

## 2026-06-03 - Rental/Auction Browser Merchandising And Lead Proof

Date: 2026-06-03
Branch: refine/homepage-phase1-clarity-trust
Goal: Make Rental and Auction backend intelligence visible in public merchandising and prove browser lead capture preserves transaction-specific unit context.
Files changed:
- client/src/components/property-results/ListingResultCard.tsx
- client/src/components/property-results/__tests__/ListingResultCard.test.tsx
- client/src/pages/SearchResults.tsx
- playwright.config.ts
- e2e/dle/rental-auction-public-merchandising.spec.ts
- docs/dle/MANUAL_FLOW_CHECKLIST.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-03/qa-dle-rental-browser-public-page.png
- docs/dle/evidence/2026-06-03/qa-dle-rental-browser-search-card.png
- docs/dle/evidence/2026-06-03/qa-dle-rental-browser-lead-context.png
- docs/dle/evidence/2026-06-03/qa-dle-auction-browser-public-page.png
- docs/dle/evidence/2026-06-03/qa-dle-auction-browser-search-card.png
- docs/dle/evidence/2026-06-03/qa-dle-auction-browser-lead-context.png
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:5173 pnpm exec playwright test e2e/dle/rental-auction-public-merchandising.spec.ts --project="Desktop Chrome" --workers=1'`
- Result: Passed. 1 browser spec, 2 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/components/property-results/__tests__/ListingResultCard.test.tsx client/src/pages/DevelopmentQualificationPage.test.ts client/src/pages/ReferrerDashboard.test.ts server/__tests__/distributionCatalogPricing.test.ts server/lib/developmentReadiness.shared.test.ts server/lib/sanitizeDraftData.test.ts server/__tests__/developerRouter.edit-update.test.ts server/__tests__/integration.developer-create-lead-persistence.test.ts server/__tests__/integration.development-card-data-flow.test.ts'`
- Result: Passed outside the sandbox with local MySQL access. 12 test files, 98 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Manual flows verified:
- Rental browser public detail rendered transaction-native output: `Rent From`, `Monthly Rent`, rental unit name, and visible monthly rent range.
- Rental browser search card rendered `Rent from R 12,500` instead of generic sale-shaped `From R ...`.
- Rental browser lead dialog submitted successfully and DB verification preserved development id, selected unit id/name, `transactionType: rent`, `unitPriceLabel: Rent from`, `leadSource: development_detail_contact`, and `funnelStage: interest`.
- Auction browser public detail rendered transaction-native output: `Starting Bid`, auction unit name, and visible bid/reserve range.
- Auction browser search card rendered `Bid from R 850,000` instead of generic sale-shaped `From R ...`.
- Auction browser lead dialog submitted successfully and DB verification preserved development id, selected unit id/name, `transactionType: auction`, `unitPriceLabel: Starting bid`, `leadSource: development_detail_contact`, and `funnelStage: interest`.
Product fix:
- Unified search/result cards now accept development `listingType` and use transaction-aware price labels for development inventory: sale remains `From`, rental uses `Rent from`, and auction uses `Bid from`.
- `SearchResults` now passes `card.listingType` through to `ListingResultCard`.
- Playwright config can skip its `webServer` hook via `PLAYWRIGHT_SKIP_WEBSERVER=1` so DLE browser QA can reuse already-running local frontend/backend processes.
Evidence:
- docs/dle/evidence/2026-06-03/qa-dle-rental-browser-public-page.png
- docs/dle/evidence/2026-06-03/qa-dle-rental-browser-search-card.png
- docs/dle/evidence/2026-06-03/qa-dle-rental-browser-lead-context.png
- docs/dle/evidence/2026-06-03/qa-dle-auction-browser-public-page.png
- docs/dle/evidence/2026-06-03/qa-dle-auction-browser-search-card.png
- docs/dle/evidence/2026-06-03/qa-dle-auction-browser-lead-context.png
Remaining risks:
- Rental and auction edit-published ownership are API/DB-proven, but browser edit-published ownership remains pending.
- Rental and auction browser create/save/resume/publish wizard flows remain pending.
- Autosave remains blocked until transaction-lane save/resume/edit safety and truthful failure/recovery behavior are proven.
Next recommended slice:
- Prove rental and auction edit-published ownership through browser-level flows, then decide the first autosave implementation slice.
Commit hash/tag: This entry is included in `test(dle): prove rental auction browser merchandising`.
Uncommitted reason, if any: None. Slice committed.

## 2026-06-03 - Rental/Auction Edit-Published Browser Ownership Proof

Date: 2026-06-03
Branch: refine/homepage-phase1-clarity-trust
Goal: Prove Rental and Auction edit-published ownership survives partial edit sequences in browser-rendered public output before autosave work.
Files changed:
- e2e/dle/rental-auction-edit-published-ownership.spec.ts
- docs/dle/MANUAL_FLOW_CHECKLIST.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/RENTAL_ENGINE_TECHNICAL_PROOF.md
- docs/dle/AUCTION_ENGINE_TECHNICAL_PROOF.md
- docs/dle/evidence/2026-06-03/qa-dle-rental-edit-published-public-page.png
- docs/dle/evidence/2026-06-03/qa-dle-rental-edit-published-search-card.png
- docs/dle/evidence/2026-06-03/qa-dle-rental-edit-published-lead-context.png
- docs/dle/evidence/2026-06-03/qa-dle-auction-edit-published-public-page.png
- docs/dle/evidence/2026-06-03/qa-dle-auction-edit-published-search-card.png
- docs/dle/evidence/2026-06-03/qa-dle-auction-edit-published-lead-context.png
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:5173 pnpm exec playwright test e2e/dle/rental-auction-edit-published-ownership.spec.ts --project="Desktop Chrome" --workers=1'`
- Result: Passed. 1 browser spec, 2 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/components/property-results/__tests__/ListingResultCard.test.tsx client/src/pages/DevelopmentQualificationPage.test.ts client/src/pages/ReferrerDashboard.test.ts server/__tests__/distributionCatalogPricing.test.ts server/lib/developmentReadiness.shared.test.ts server/lib/sanitizeDraftData.test.ts server/__tests__/developerRouter.edit-update.test.ts server/__tests__/integration.developer-create-lead-persistence.test.ts server/__tests__/integration.development-card-data-flow.test.ts'`
- Result: Passed outside the sandbox with local MySQL access. 12 test files, 98 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed before this log update.
Manual flows verified:
- Rental location edit updated public suburb while preserving rental unit identity, monthly-rent pricing, and highlights.
- Rental media edit did not wipe browser-rendered location, highlights, unit identity, or monthly-rent pricing.
- Rental marketing edit updated public highlights while preserving location, media, unit identity, and monthly-rent pricing.
- Rental governance/finance edit did not wipe browser-rendered location, highlights, unit identity, or monthly-rent pricing.
- Rental unit edit updated browser-visible unit name and rent range, and post-edit search/lead remained rental-native.
- Auction location edit updated public suburb while preserving auction unit identity, bid/reserve range, and highlights.
- Auction media edit did not wipe browser-rendered location, highlights, unit identity, or bid/reserve pricing.
- Auction marketing edit updated public highlights while preserving location, media, unit identity, and bid/reserve pricing.
- Auction governance/finance edit did not wipe browser-rendered location, highlights, unit identity, or bid/reserve pricing.
- Auction unit edit updated browser-visible unit name and bid/reserve range, and post-edit search/lead remained auction-native.
Evidence:
- docs/dle/evidence/2026-06-03/qa-dle-rental-edit-published-public-page.png
- docs/dle/evidence/2026-06-03/qa-dle-rental-edit-published-search-card.png
- docs/dle/evidence/2026-06-03/qa-dle-rental-edit-published-lead-context.png
- docs/dle/evidence/2026-06-03/qa-dle-auction-edit-published-public-page.png
- docs/dle/evidence/2026-06-03/qa-dle-auction-edit-published-search-card.png
- docs/dle/evidence/2026-06-03/qa-dle-auction-edit-published-lead-context.png
Remaining risks:
- This browser proof validates public output after backend partial edits; it does not claim full rental/auction wizard edit UX parity.
- Rental and auction browser create/save/resume/publish wizard flows remain pending.
- Autosave remains blocked until transaction-lane wizard save/resume behavior and truthful failure/recovery behavior are proven.
Next recommended slice:
- Run Rental and Auction wizard save/resume/publish proof, including draft visibility, resume hydration for media/highlights/unit types/readiness, and public output after publish.
Commit hash/tag: This entry is included in `test(dle): prove rental auction edit ownership in browser`.
Uncommitted reason, if any: None. Slice committed.

## 2026-06-04 - Auction Wizard Canonical Save/Publish Parity

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Close the focused auction wizard guardrail gap before autosave by proving resumed auction drafts save and publish through canonical transaction-specific payloads without stale sale/rental pricing.
Files changed:
- client/src/components/development-wizard/DevelopmentWizard.test.tsx
- client/src/components/development-wizard/phases/FinalisationPhase.test.tsx
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/development-wizard/phases/FinalisationPhase.test.tsx'`
- Result: Passed. 2 test files, 13 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/development-wizard/phases/FinalisationPhase.test.tsx client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/pages/DevelopmentQualificationPage.test.ts client/src/pages/ReferrerDashboard.test.ts server/__tests__/distributionCatalogPricing.test.ts server/lib/developmentReadiness.shared.test.ts server/lib/sanitizeDraftData.test.ts server/__tests__/developerRouter.edit-update.test.ts server/__tests__/integration.developer-create-lead-persistence.test.ts server/__tests__/integration.development-card-data-flow.test.ts'`
- Result: First sandbox run failed because server tests could not connect to local MySQL (`EPERM 127.0.0.1:3306`). Rerun outside the sandbox passed with local MySQL access. 13 test files, 108 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed before this log update.
Proof added:
- `DevelopmentWizard` now proves a resumed auction canonical draft hydrates into `residential_auction`, manual-save persists auction transaction context, auction bid/reserve/date fields, review-readiness dismissals, and synchronized `stepData.unit_types.unitTypes`.
- `DevelopmentWizard` now proves route `draftId` hydration replaces stale local sale state before auction manual save.
- Auction manual-save output strips stale sale/rental unit pricing: no `priceFrom`, `basePriceFrom`, or `monthlyRentFrom` leaks into auction unit snapshots.
- `FinalisationPhase` now proves create-mode publish of a resumed auction canonical draft builds auction-native submit payloads with auction dates, `startingBidFrom`, `reservePriceFrom`, inventory totals, canonical `stepData.unit_types.unitTypes`, and no stale sale/rental pricing.
- Existing rental finalisation tests now reset through explicit rental fixtures so auction fixtures cannot leak into rental publish assertions.
Remaining risks:
- This is focused component/canonical payload proof, not full browser create/save/resume/publish proof for rental or auction.
- Browser-level draft visibility, resume hydration for media/highlights/readiness, and post-publish public output from the wizard remain pending.
- Autosave remains blocked until transaction-lane browser save/resume behavior and truthful failure/recovery behavior are proven.
Next recommended slice:
- Run browser-level rental and auction wizard save/resume/publish proof using authenticated local QA, covering draft visibility, resume hydration for media/highlights/unit types/readiness, publish/public output, search cards, and lead context.
Commit hash/tag: This entry is included in `test(dle): prove auction wizard canonical parity`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-09 - Required Document Semantics Metadata

Date: 2026-06-09
Branch: refine/homepage-phase1-clarity-trust
Goal: Add formal document-template lane/readiness metadata so Rental and Auction programme
semantics can be configured explicitly instead of relying only on document label inference.
Files changed:
- drizzle/schema/distribution.ts
- server/migrations/0071_add_development_required_document_semantics.sql
- scripts/db-verify-distribution-schema.ts
- server/services/distributionRequiredDocumentsService.ts
- server/services/distributionProgrammeSemanticsService.ts
- server/services/distributionDealDocumentsService.ts
- server/distributionRouter.ts
- server/services/__tests__/distributionProgrammeSemanticsService.test.ts
- docs/dle/DISTRIBUTION_PROGRAMME_SEMANTICS_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run server/services/__tests__/distributionProgrammeSemanticsService.test.ts`
  first hit sandbox-blocked local MySQL access, then passed with local test DB access allowed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `development_required_documents` now stores explicit metadata for:
  transaction lane, participant type, readiness role, required stage, payout blocking, review
  owner, public shareability, and programme specificity.
- The distribution schema verifier now treats those metadata columns as required distribution
  infrastructure.
- Super-admin required-document configuration accepts, persists, and returns the metadata.
- Required-document reads preserve existing category/template data on partially migrated
  databases and default only the new metadata to neutral values.
- The programme semantics read model now prefers explicit metadata and falls back to legacy
  category/code/label inference.
- Focused semantics tests prove explicit Rental metadata configures readiness, wrong-lane Sale
  metadata is ignored for Rental readiness, and payout automation remains disabled.
Guardrails:
- No payout calculation, commission status, stage transition, lead, inventory, operating-event, or
  reward-readiness mutation was added.
- `blocksPayout` is readback metadata only; it does not move money or mark rewards ready.
- Existing manager/admin programme semantics surfaces remain display/review context only.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Admin UI controls for editing the new metadata fields are not yet built; this slice adds the
  server/schema contract first.
- Manual review actions for Rental lease readiness and Auction bidder readiness still need a
  dedicated product slice before any automation can be considered.
Next recommended slice:
- Add admin UI controls/readback for configuring document-template semantics, then design manual
  review actions for Rental lease readiness and Auction bidder readiness while keeping payout and
  stage automation disabled.
Commit hash/tag: This entry will be included in
`feat(dle): add document semantics metadata`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-07 - Manager Transaction-Lane Assignment Triage

Date: 2026-06-07
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the manager distribution operations surface transaction-first before deeper
Rental/Auction programme semantics are introduced.
Files changed:
- server/distributionRouter.ts
- client/src/pages/distribution/ManagerDevelopmentOpsPage.tsx
- client/src/pages/distribution/ManagerDevelopmentOpsPage.test.ts
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/distribution/ManagerDevelopmentOpsPage.test.ts` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `distribution.manager.getAssignedDevelopments` now returns each assigned development's
  `transactionType`.
- The manager distribution operations page now shows Sale, Rental, and Auction assignment counts.
- Each assigned development card now carries a transaction-native engine badge.
- Managers can filter assignments by `All engines`, `Sale engine`, `Rental engine`, or
  `Auction engine` before entering deal review.
Guardrails:
- No schema, migration, deal-stage, commission, lead, or inventory mutation changes.
- Distribution stage and commission ownership remain in distribution services.
- This is a reporting/triage surface only; it does not claim Rental/Auction-specific payout or
  programme semantics are solved.
Remaining risks:
- The manager deal checklist and programme terms remain shared and sale-shaped in places.
- Browser proof for the assignment filter can be added later if this surface becomes a primary QA
  checkpoint; the focused helper test currently protects the lane mapping and filtering logic.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Next recommended slice:
- Define Rental/Auction-specific referral programme terminology and document/payout assumptions,
  or add browser proof around manager transaction-lane triage if this becomes a release gate.
Commit hash/tag: This entry will be included in `feat(dle): add manager transaction lane triage`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-06 - Unit Pricing Repair Diagnostics

Date: 2026-06-06
Branch: refine/homepage-phase1-clarity-trust
Goal: Show exact public-vs-live pricing diagnostics inside the Unit Types repair panel so pricing
remediation is actionable from the dashboard handoff.
Files changed:
- client/src/components/development-wizard/phases/UnitTypesPhase.tsx
- client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx
- client/src/lib/developmentHydrationAdapter.ts
- client/src/lib/developmentHydrationAdapter.test.ts
- e2e/dle/dashboard-pricing-health.spec.ts
- docs/dle/evidence/2026-06-06/qa-dle-dashboard-rental-pricing-health.png
- docs/dle/evidence/2026-06-06/qa-dle-dashboard-auction-pricing-health.png
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/developer/Overview.test.ts client/src/lib/developmentHydrationAdapter.test.ts` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/dashboard-pricing-health.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual/browser flows verified:
- Auction pricing-health drift still routes from the dashboard into
  `/developer/create-development?id=<auctionId>&remediation=pricing`.
- The editor lands on `Unit Types`, shows the shell-level `Pricing health review` cue, and shows the
  Unit Types repair panel.
- The Auction repair panel displays `Public bid from` with `R 800 000` and `Live lot bid from` with
  `R 850 000`, proving the wizard can compare stale public mirrors against live lot inventory.
- Rental dashboard pricing health remains aligned and browser evidence was refreshed.
Proof and fixes:
- Added `getUnitTypesPhasePricingRepairDiagnostic` with Sale, Rental, and Auction-specific public
  mirror and live inventory labels.
- Rendered diagnostic value cards inside `unit-pricing-repair-hints`.
- Fixed edit hydration so top-level transaction pricing mirrors (`priceFrom/priceTo`,
  `monthlyRentFrom/monthlyRentTo`, `startingBidFrom/reservePriceFrom`) are preserved from edit
  payloads instead of disappearing from wizard `developmentData`.
- Extended unit and browser coverage for the diagnostic values and the hydration boundary.
Remaining risks:
- The repair panel now shows exact public and live values, but it still does not visually mark the
  individual unit row that caused the drift.
- Sale and Rental diagnostics have helper proof; Auction has full dashboard-to-wizard browser proof
  in this slice.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Highlight the affected unit row(s) or add row-level pricing drift badges so developers know where
  to edit without comparing values manually.
Commit hash/tag: `50d5ebee feat(dle): show pricing repair diagnostics`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Developer Dashboard Pricing Health

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Add a read-only operating-layer pricing health signal so developers can see whether public
price/rent/bid mirrors align with live unit inventory before follow-up, promotion, or distribution.
Files changed:
- client/src/components/developer/Overview.tsx
- client/src/components/developer/Overview.test.ts
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/developer/Overview.test.ts` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual/browser flows verified:
- Focused helper/component proof only; no browser screenshot in this slice.
Proof and fixes:
- Added `buildOverviewPricingHealth` as a transaction-aware helper for Sale public price bands,
  Rental public rent ranges, and Auction public starting-bid mirrors.
- The selected-development `Operating Readiness` panel now shows a `Pricing health` card after the
  relevant live inventory query has loaded.
- Sale compares public price mirrors against live unit sale pricing.
- Rental compares public rent mirrors against live rental unit rent ranges.
- Auction compares public bid-from mirrors against live lot starting bids.
- The panel is read-only and does not mutate inventory, pricing, lead stages, distribution deals,
  commissions, schemas, or autosave behavior.
Remaining risks:
- This is component-helper proof; browser screenshot evidence for dashboard pricing health remains
  useful.
- The health check only compares current mirror fields to unit inventory; it does not yet create a
  pricing adjustment workflow or operating event.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Browser-proof dashboard pricing health for Rental and Auction, or design the first audited
  pricing-adjustment workflow if live pricing edits should become an operating action.
Commit hash/tag: This entry will be included in `feat(dle): show dashboard pricing health`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Unit Type Packaging Readiness Browser Proof

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Browser-proof that Rental and Auction unit setup visibly shows the transaction-native
packaging readiness panel inside the Unit Types pricing tab.
Files changed:
- client/src/components/development-wizard/phases/UnitTypesPhase.tsx
- e2e/dle/unit-packaging-readiness.spec.ts
- docs/dle/evidence/2026-06-05/qa-dle-rental-unit-readiness-desktop.png
- docs/dle/evidence/2026-06-05/qa-dle-rental-unit-readiness-mobile.png
- docs/dle/evidence/2026-06-05/qa-dle-auction-unit-readiness-desktop.png
- docs/dle/evidence/2026-06-05/qa-dle-auction-unit-readiness-mobile.png
- docs/dle/RECOVERY_LOG.md
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/unit-packaging-readiness.spec.ts --project="Desktop Chrome" --workers=1` passed after rerun outside the Linux sandbox.
- `pnpm vitest run client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual/browser flows verified:
- Seeded a canonical Rental draft directly at the Unit Types step, opened the existing unit type,
  switched to Pricing, and verified `Rental package readiness`, `5/5 ready`, rent, deposit, lease
  term, furnished state, and rental availability.
- Seeded a canonical Auction draft directly at the Unit Types step, opened the existing unit type,
  switched to Pricing, and verified `Auction package readiness`, `5/5 ready`, starting bid, auction
  window, reserve strategy, registration-open lifecycle, and lot availability.
- Switched to a 390x844 viewport for both lanes and verified the readiness panel stayed within the
  viewport while the transaction title remained visible.
Proof and fixes:
- Added accessible labels to duplicate, edit, and remove unit-card action buttons so browser proof
  can use stable user-level controls.
- Added a focused Playwright spec for the readiness panel instead of expanding the full
  save-resume-publish journey.
- The first browser attempt failed before assertions because Chromium cannot launch in the Linux
  sandbox; the unsandboxed run caught and fixed brittle text selectors/date formatting, then passed.
Remaining risks:
- This proves the readiness panel in the existing seeded-unit edit flow, not the full new-unit entry
  flow from an empty draft.
- The panel is still advisory; publish/readiness enforcement remains in the existing validation
  paths.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Continue developer operating-layer proof for Rental/Auction dashboards, or add an empty-draft
  Unit Types packaging proof if the new-unit creation path needs the same browser evidence.
Commit hash/tag: This entry will be included in `test(dle): prove unit packaging readiness`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Unit Type Packaging Readiness Panel

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Make Rental and Auction unit setup feel like guided transaction packaging instead of generic
pricing fields.
Files changed:
- client/src/components/development-wizard/phases/UnitTypesPhase.tsx
- client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual/browser flows verified:
- Component/helper proof only; no browser screenshot in this slice.
Proof and fixes:
- Added `getUnitTypesPhasePackagingChecklist` as a transaction-aware helper for Buyer, Rental, and
  Auction unit package readiness.
- Rental unit setup now surfaces a readiness panel for monthly rent, deposit, lease term, furnished
  state, and rental availability while the developer edits pricing.
- Auction unit setup now surfaces a readiness panel for starting bid, auction window, reserve
  strategy, lifecycle, and lot availability while the developer edits pricing.
- The panel is advisory only and does not change persistence, validation, schemas, APIs, or runtime
  save behavior.
Remaining risks:
- The panel has focused helper tests but has not yet been browser-proofed in the wizard dialog.
- Legal-pack/document readiness is still represented at development/media level, not as a dedicated
  auction unit field.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Browser-proof the Unit Types pricing tab for Rental and Auction, including mobile dialog fit, then
  continue toward dashboard/admin/distribution operating surfaces.
Commit hash/tag: This entry will be included in `feat(dle): show unit packaging readiness`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Auction Time-Gated Activation Operating Mutation

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Implement and browser-proof Auction Stage B so `registration_open` lots can become `active`
only inside the configured auction window, with early activation failure visible and no false
success.
Files changed:
- server/services/developmentOperatingEventsService.ts
- server/services/__tests__/developmentOperatingEventsService.test.ts
- server/developerRouter.ts
- client/src/components/developer/Overview.tsx
- e2e/dle/auction-operating-activation.spec.ts
- docs/dle/evidence/2026-06-04/qa-dle-auction-operating-activation-early-failed.png
- docs/dle/evidence/2026-06-04/qa-dle-auction-operating-activation-active.png
- docs/dle/evidence/2026-06-04/qa-dle-auction-operating-activation-public-active.png
- docs/dle/evidence/2026-06-04/qa-dle-auction-operating-activation-search-language.png
- docs/dle/AUCTION_OPERATING_LIFECYCLE_DESIGN.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command:
  `bash -lc 'source ~/.nvm/nvm.sh && SKIP_DB_INIT=1 pnpm vitest run server/services/__tests__/developmentOperatingEventsService.test.ts client/src/components/developer/Overview.test.ts client/src/pages/DevelopmentDetail.test.ts'`
- Result: Passed. 3 test files, 32 tests.
Focused browser proof run:
- Command:
  `bash -lc 'source ~/.nvm/nvm.sh && PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/auction-operating-activation.spec.ts --project="Desktop Chrome" --workers=1'`
- Result: Passed. 1 test file, 1 browser test.
Focused regression browser proof run:
- Command:
  `bash -lc 'source ~/.nvm/nvm.sh && PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/auction-operating-registration.spec.ts --project="Desktop Chrome" --workers=1'`
- Result: Passed after restarting local backend/frontend. The first attempt failed before app
  assertions because `:3009` was not listening.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Added `getAuctionActivationReadinessIssue` to enforce valid start/end windows and reject early or
  late activation.
- Added `activateAuctionLot`, which requires owned Auction development, active lot, current
  `registration_open` status, and current time inside the auction window.
- Activation updates only `unit_types.auction_status` to `active` and writes an
  `inventory_status_changed` event with `registration_open` -> `active` in the same transaction.
- Activation does not change inventory counts, bids, reserve, dates, media, documents, location,
  governance, highlights, unit definitions, or development aggregate availability.
- Added `developer.activateAuctionLot`.
- Added dashboard `Activate Auction` action for `Registration open` lots and `Auction active`
  readback after success.
- Browser proof verifies early activation error, no `Auction lot activated.` success on early
  failure, registration-open state remains stable, in-window activation succeeds, event readback is
  correct, public detail shows `Auction active`, and search card pricing remains `Bid from`.
Manual flows verified:
- Local frontend `:3009`, backend `:5000`, and `listify_local`.
- Auction registration open/rollback regression after adding the activation button.
Remaining risks:
- Auction outcomes are not implemented: sold, passed-in, and withdrawn still need a separate
  outcome design and proof.
- Bidder registrations, proof-of-funds/FICA readiness, terms acceptance, and registration deposits
  still need a canonical model.
- Sale sold and Rental let/application outcomes remain future transaction-specific slices.
- The existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Design the outcome layer before coding: Sale sold, Rental let, Auction sold/passed-in/withdrawn,
  public availability impact, lead-stage impact, and distribution/referral impact.

Commit hash/tag: This entry will be included in
`feat(dle): add auction activation operations`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Failed Operating Mutation No-False-Success Proof

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Prove failed Sale, Rental, and Auction operating mutations do not claim success, do not write
false operating events, and refresh the developer dashboard back to backend truth before moving to
Auction activation or autosave.
Files changed:
- client/src/components/developer/Overview.tsx
- e2e/dle/operating-mutation-failure-trust.spec.ts
- docs/dle/evidence/2026-06-04/qa-dle-operating-failed-sale-no-false-success.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-failed-rental-no-false-success.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-failed-auction-no-false-success.png
- docs/dle/AUCTION_OPERATING_LIFECYCLE_DESIGN.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command:
  `bash -lc 'source ~/.nvm/nvm.sh && SKIP_DB_INIT=1 pnpm vitest run client/src/components/developer/Overview.test.ts server/services/__tests__/developmentOperatingEventsService.test.ts'`
- Result: Passed. 2 test files, 13 tests.
Focused browser proof run:
- Command:
  `bash -lc 'source ~/.nvm/nvm.sh && PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/operating-mutation-failure-trust.spec.ts --project="Desktop Chrome" --workers=1'`
- Result: Passed. 1 test file, 1 browser test.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Sale, Rental, and Auction operating mutation error handlers now refetch the relevant operating
  inventory panel, operating history, and development snapshot after showing the backend error.
- Added a backend-backed browser proof that creates valid published Sale, Rental, and Auction
  packages, then deliberately makes the dashboard stale with direct DB changes before each failed
  click.
- Sale proof: stale `Reserve` click after availability is changed to zero shows
  `No available units can be reserved for this unit type.`, does not show `Unit reserved.`, refreshes
  to `0 available, 0 reserved`, and writes no operating event.
- Rental proof: stale `Hold` click after availability is changed to zero shows
  `No available rental units can be held for this unit type.`, does not show `Rental unit held.`,
  refreshes to `0 rentals available, 0 held`, and writes no operating event.
- Auction proof: stale `Open Registration` click after the canonical lot status is changed to
  `registration_open` shows the backend transition error, does not show
  `Auction registration opened.`, refreshes to `Registration open`, and writes no operating event.
- Captured screenshots for all three failed-mutation states.
Manual flows verified:
- Local frontend `:3009`, backend `:5000`, and `listify_local`.
- Browser proof required valid published package fixtures; initial attempts correctly hit publish
  readiness validation for short descriptions, missing highlights, and missing launch/completion
  dates before the fixture was brought into compliance.
Remaining risks:
- This slice proves no-false-success for representative stale-state/availability failure paths, not
  every possible network/session/server failure mode.
- Time-gated Auction activation is not implemented.
- Sold, let, passed-in, withdrawn, price-change, release-phase, showing, and lead-stage operating
  mutations remain future slices.
- The existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Implement time-gated Auction activation: `registration_open` -> `active` only inside the auction
  window, with failed early activation proof and no false success state.
Commit hash/tag: This entry will be included in
`test(dle): prove operating mutation failure handling`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Rental/Auction Wizard Save-Resume-Publish Browser Proof

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Prove Rental and Auction browser draft visibility, resume hydration, manual save, publish, public page, search cards, and lead context from review-ready canonical drafts before autosave work.
Files changed:
- e2e/dle/rental-auction-wizard-save-publish.spec.ts
- docs/dle/MANUAL_FLOW_CHECKLIST.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/RENTAL_ENGINE_TECHNICAL_PROOF.md
- docs/dle/AUCTION_ENGINE_TECHNICAL_PROOF.md
- docs/dle/evidence/2026-06-04/qa-dle-rental-wizard-draft-visible.png
- docs/dle/evidence/2026-06-04/qa-dle-rental-wizard-resume-hydrated.png
- docs/dle/evidence/2026-06-04/qa-dle-rental-wizard-public-page.png
- docs/dle/evidence/2026-06-04/qa-dle-rental-wizard-search-card.png
- docs/dle/evidence/2026-06-04/qa-dle-rental-wizard-lead-context.png
- docs/dle/evidence/2026-06-04/qa-dle-auction-wizard-draft-visible.png
- docs/dle/evidence/2026-06-04/qa-dle-auction-wizard-resume-hydrated.png
- docs/dle/evidence/2026-06-04/qa-dle-auction-wizard-public-page.png
- docs/dle/evidence/2026-06-04/qa-dle-auction-wizard-search-card.png
- docs/dle/evidence/2026-06-04/qa-dle-auction-wizard-lead-context.png
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/rental-auction-wizard-save-publish.spec.ts --project="Desktop Chrome" --workers=1'`
- Result: Passed. 1 browser spec, 2 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/development-wizard/phases/FinalisationPhase.test.tsx client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/pages/DevelopmentQualificationPage.test.ts client/src/pages/ReferrerDashboard.test.ts server/__tests__/distributionCatalogPricing.test.ts server/lib/developmentReadiness.shared.test.ts server/lib/sanitizeDraftData.test.ts server/__tests__/developerRouter.edit-update.test.ts server/__tests__/integration.developer-create-lead-persistence.test.ts server/__tests__/integration.development-card-data-flow.test.ts'`
- Result: Passed. 13 test files, 108 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Manual flows verified:
- Rental canonical draft appeared in My Drafts with one unit type.
- Rental resume hydrated Review & Publish with name, media, highlights, rental unit identity, monthly rent, and publish controls.
- Rental manual save hit `developer.saveDraft`; DB retained `workflowId: residential_rent`, canonical `stepData.unit_types.unitTypes`, monthly rent fields, and no stale sale/auction unit pricing.
- Rental publish created an approved, published `for_rent` development.
- Rental public page, search card, and lead capture stayed rental-native after wizard publish.
- Auction canonical draft appeared in My Drafts with one unit type.
- Auction resume hydrated Review & Publish with name, media, highlights, auction unit identity, starting bid, and publish controls.
- Auction manual save hit `developer.saveDraft`; DB retained `workflowId: residential_auction`, canonical `stepData.unit_types.unitTypes`, bid/reserve fields, auction dates, and no stale sale/rental unit pricing.
- Auction publish created an approved, published `auction` development.
- Auction public page, search card, and lead capture stayed auction-native after wizard publish.
Remaining risks:
- This proves browser save/resume/publish from review-ready canonical seeded drafts; it does not claim a fully hand-entered Project Setup through every form step rental/auction UX pass.
- Autosave should not start as a blind wiring task. It needs a dedicated preflight for truthful save states, failed-save messaging, retry behavior, conflict handling, and transaction-scoped payload ownership.
- Rental and auction product language still need polishing so the wizard feels like guided commercial packaging, not generic listing CRUD.
Next recommended slice:
- Run an autosave preflight design/guardrail slice, or run a full hand-entered rental/auction wizard UX proof if product polish needs that evidence first.
Commit hash/tag: This entry will be included in `test(dle): prove rental auction wizard browser flow`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Autosave Safety Preflight And Truthful Manual Fallback

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Establish the DLE autosave safety contract and fix the first persistence-trust blockers without enabling background autosave.
Files changed:
- client/src/components/development-wizard/DevelopmentWizard.tsx
- client/src/components/development-wizard/DevelopmentWizard.test.tsx
- client/src/components/development-wizard/phases/FinalisationPhase.tsx
- client/src/components/wizard/WizardEngine.tsx
- client/src/components/wizard/WizardEngine.test.tsx
- e2e/dle/rental-auction-wizard-save-publish.spec.ts
- server/developerRouter.ts
- server/__tests__/developerRouter.drafts.test.ts
- docs/dle/AUTOSAVE_SAFETY_CONTRACT.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/MANUAL_FLOW_CHECKLIST.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-04/*.png
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/wizard/WizardEngine.test.tsx client/src/components/development-wizard/phases/FinalisationPhase.test.tsx'`
- Result: Passed. 3 test files, 21 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/rental-auction-wizard-save-publish.spec.ts --project="Desktop Chrome" --workers=1'`
- Result: Passed. 1 browser spec, 2 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run server/__tests__/developerRouter.drafts.test.ts'`
- Result: Passed with local MySQL access. 1 test file, 8 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/wizard/WizardEngine.test.tsx client/src/components/development-wizard/phases/FinalisationPhase.test.tsx client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/pages/DevelopmentQualificationPage.test.ts client/src/pages/ReferrerDashboard.test.ts server/__tests__/developerRouter.drafts.test.ts server/__tests__/distributionCatalogPricing.test.ts server/lib/developmentReadiness.shared.test.ts server/lib/sanitizeDraftData.test.ts server/__tests__/developerRouter.edit-update.test.ts server/__tests__/integration.developer-create-lead-persistence.test.ts server/__tests__/integration.development-card-data-flow.test.ts'`
- Result: Initial sandbox run could not access local MySQL. Rerun with approved local DB access passed. 15 test files, 124 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after final docs update.
Proof and fixes:
- Autosave remains deliberately disabled behind `autoSaveEnabled = false`.
- Added `docs/dle/AUTOSAVE_SAFETY_CONTRACT.md` as the authoritative save-state and enablement contract.
- Centralized draft persistence so manual save, future autosave, and Save & Exit share the same canonical backend path.
- Backend `success: false` responses now fail draft saves instead of silently becoming saved state.
- Browser response checks now require payload `success: true`; HTTP `200` alone is not accepted as persistence proof.
- The stricter browser check exposed an existing-draft update bug: the route wrote an ISO timestamp string into the MySQL `lastModified` timestamp column and returned a safe-failure response.
- Removed the unsafe explicit timestamp write and added route-level proof that an existing canonical draft updates and reloads successfully.
- New drafts require a persistent returned draft id before the UI can confirm success.
- A synchronous draft-id ref ensures later saves reuse the first confirmed id without waiting for React rerender.
- Manual-save and edit-progress failures now remain visible in the header as `error`.
- A successful retry clears the failure and marks only the confirmed current state signature as `saved`.
- Changes made after a confirmed save return the header to `unsaved`.
- Edit Save Progress now treats resolved `success: false` updates as persistence failures.
- Save & Exit now remains in the wizard after failed persistence and exits only after confirmed save.
- Create/draft journeys now expose Manual Save Draft before Review; edit journeys continue using baseline-aware Save Progress.
- Rental and auction browser flows proved the pre-Review Save Draft button uses the real backend before returning to Review and publishing.
Evidence:
- docs/dle/evidence/2026-06-04/qa-dle-rental-wizard-pre-review-save.png
- docs/dle/evidence/2026-06-04/qa-dle-auction-wizard-pre-review-save.png
Remaining risks:
- Background autosave is not enabled.
- Focused queued-save/stale-response behavior and hydration gating still need dedicated proof.
- Browser failure/retry proof still needs a deliberately failed real save path.
- Debounce timing and guarded rollout scope still require a deliberate decision.
Next recommended slice:
- Build the autosave coordinator guardrail slice: queued saves, stale response handling, hydration gates, duplicate-draft prevention, and browser failure/retry proof. Keep background autosave disabled until those gates pass.
Commit hash/tag: This entry will be included in `fix(dle): establish autosave safety preflight`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Autosave Coordinator Serialization Guardrails

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Harden and prove the shared autosave coordinator before any DLE background autosave enablement.
Files changed:
- client/src/hooks/useAutoSave.ts
- client/src/hooks/__tests__/useAutoSave.test.tsx
- docs/dle/AUTOSAVE_SAFETY_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/hooks/__tests__/useAutoSave.test.tsx client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/wizard/WizardEngine.test.tsx'`
- Result: Passed. 3 test files, 26 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after final docs update.
Proof and fixes:
- Replaced the incomplete single-flight wait with a serialized promise queue, so three or more rapid save requests cannot overlap.
- Each queued request now preserves the data snapshot, save destination, and error handler captured when it was requested.
- Only the latest requested revision may own final saved/error/saving status; stale failures cannot overwrite newer status.
- Debounced background failures are handled after status and `onError` expose the failure, avoiding unhandled rejections.
- Callback identity changes no longer reschedule debounced saves.
- Disabled saves remain inert.
- Added a mount initialization barrier so React StrictMode mount effects and immediate mount-cycle hydration changes do not schedule an initial save.
- DLE background autosave remains deliberately disabled behind `autoSaveEnabled = false`.
Remaining risks:
- Shared coordinator behavior is proven, but DLE-specific real-path queued saves still need duplicate-draft-ID proof.
- Route hydration gating still needs browser proof for create, draft resume, and edit modes.
- A deliberate real-backend failure/retry browser proof remains pending.
- Debounce timing and rollout scope remain undecided.
Next recommended slice:
- Prove DLE route hydration and duplicate-draft prevention through the real persistence path, then add deliberate browser failure/retry proof. Keep background autosave disabled.
Commit hash/tag: This entry will be included in `fix(dle): serialize autosave coordinator`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - DLE Canonical Persistence Boundary Guardrails

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Prove exact canonical snapshot ownership, route hydration gating, and duplicate-draft prevention at the DLE persistence boundary while background autosave remains disabled.
Files changed:
- client/src/components/development-wizard/DevelopmentWizard.tsx
- client/src/components/development-wizard/DevelopmentWizard.test.tsx
- docs/dle/AUTOSAVE_SAFETY_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/hooks/__tests__/useAutoSave.test.tsx client/src/components/wizard/WizardEngine.test.tsx'`
- Result: Passed. 3 test files, 27 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/hooks/__tests__/useAutoSave.test.tsx client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/wizard/WizardEngine.test.tsx client/src/components/development-wizard/phases/FinalisationPhase.test.tsx client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/pages/DevelopmentQualificationPage.test.ts client/src/pages/ReferrerDashboard.test.ts server/__tests__/developerRouter.drafts.test.ts server/__tests__/distributionCatalogPricing.test.ts server/lib/developmentReadiness.shared.test.ts server/lib/sanitizeDraftData.test.ts server/__tests__/developerRouter.edit-update.test.ts server/__tests__/integration.developer-create-lead-persistence.test.ts server/__tests__/integration.development-card-data-flow.test.ts'`
- Result: Passed with local test database access. 16 test files, 133 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after final docs update.
Proof and fixes:
- Manual Save Draft and future autosave writes now share one DLE-level serialized persistence queue.
- An overlapping autosave/manual-save proof confirms the first new-draft write runs alone, the queued write preserves its own canonical snapshot, and the queued write reuses the first returned draft ID.
- Autosave now observes and persists the full canonical draft snapshot rather than a narrower hand-selected UI-state object.
- Manual save captures the exact canonical snapshot at request time.
- Save-state signatures ignore changing `_savedAt` metadata while tracking canonical owned-field changes.
- Draft hydration now explicitly requires draft mode, preventing cached draft data from hydrating a fresh-create route.
- Focused create, draft-resume, and edit tests confirm stale state is replaced by the correct canonical route snapshot while background autosave remains disabled.
Remaining risks:
- Browser proof against the real backend is still required for route hydration, queued no-duplicate behavior, and deliberate save failure/retry.
- Debounce timing and guarded rollout scope remain undecided.
- Background autosave remains deliberately disabled behind `autoSaveEnabled = false`.
Next recommended slice:
- Add browser-level real-backend hydration/no-duplicate/failure-retry evidence while background autosave remains disabled, then make the guarded rollout and debounce decision.
Commit hash/tag: This entry will be included in `fix(dle): guard canonical draft persistence`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Autosave Browser Preflight And Route-Target Safety

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Close the real-runtime autosave preflight gates without enabling background autosave, and prove one mounted wizard cannot carry stale canonical state between route targets.
Files changed:
- client/src/components/development-wizard/DevelopmentWizard.tsx
- client/src/components/development-wizard/DevelopmentWizard.test.tsx
- e2e/dle/autosave-preflight-browser.spec.ts
- docs/dle/AUTOSAVE_SAFETY_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-04/qa-dle-autosave-browser-failure-visible.png
- docs/dle/evidence/2026-06-04/qa-dle-autosave-browser-one-draft-identity.png
- docs/dle/evidence/2026-06-04/qa-dle-autosave-browser-retry-saved.png
- docs/dle/evidence/2026-06-04/qa-dle-autosave-edit-hydrated-without-save.png
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/autosave-preflight-browser.spec.ts --project="Desktop Chrome" --workers=1'`
- Result: Passed. 1 browser spec, 3 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/autosave-preflight-browser.spec.ts e2e/dle/rental-auction-wizard-save-publish.spec.ts --project="Desktop Chrome" --workers=1'`
- Result: Passed. 2 browser specs, 5 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/hooks/__tests__/useAutoSave.test.tsx client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/wizard/WizardEngine.test.tsx client/src/components/development-wizard/phases/FinalisationPhase.test.tsx client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/pages/DevelopmentQualificationPage.test.ts client/src/pages/ReferrerDashboard.test.ts server/__tests__/developerRouter.drafts.test.ts server/__tests__/distributionCatalogPricing.test.ts server/lib/developmentReadiness.shared.test.ts server/lib/sanitizeDraftData.test.ts server/__tests__/developerRouter.edit-update.test.ts server/__tests__/integration.developer-create-lead-persistence.test.ts server/__tests__/integration.development-card-data-flow.test.ts'`
- Result: Passed with local test database access. 16 test files, 134 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after final docs update.
Proof and fixes:
- Browser navigation from a resumed draft directly to an edit target exposed stale canonical state because the mounted wizard retained `isHydrated: true`.
- Added a route-target hydration key so create, draft, edit, and brand-target changes clear the previous target before hydrating the new canonical state.
- Focused component proof confirms a mounted draft wizard rehydrates the edit target and keeps autosave disabled.
- Browser proof confirms create, draft-resume, and edit routes make no persistence calls during hydration.
- A deterministic `success: false` browser save remains visibly failed and leaves the database unchanged; a later real-backend retry clears the failure and persists the canonical rental snapshot.
- Two overlapping new-draft browser saves remain serialized, create exactly one real database row, and send the first returned draft ID with the second request.
- Rental and Auction save-resume-publish browser flows still pass after the route-target fix.
- Background autosave remains deliberately disabled behind `autoSaveEnabled = false`.
Evidence:
- docs/dle/evidence/2026-06-04/qa-dle-autosave-browser-failure-visible.png
- docs/dle/evidence/2026-06-04/qa-dle-autosave-browser-retry-saved.png
- docs/dle/evidence/2026-06-04/qa-dle-autosave-browser-one-draft-identity.png
- docs/dle/evidence/2026-06-04/qa-dle-autosave-edit-hydrated-without-save.png
Remaining risks:
- A deliberate debounce and explicit create/draft-only rollout switch are still required.
- Sale, Rental, and Auction need browser proof with guarded background autosave actually enabled.
- Edit-development autosave must remain a separate later decision because it requires baseline-aware partial-step ownership.
Next recommended slice:
- Design and implement a guarded create/draft-only autosave rollout switch and deliberate debounce, then prove transaction-lane autosave success/resume/failure/retry before broader rollout.
Commit hash/tag: This entry will be included in `fix(dle): prove autosave browser preflight`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Guarded Create/Draft Autosave Rollout

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Make create/draft autosave available behind an explicit default-off rollout switch while
keeping edit-development autosave disabled and preserving truthful save-state behavior.
Files changed:
- .env.example
- .env.local.example
- client/src/components/development-wizard/DevelopmentWizard.tsx
- client/src/components/development-wizard/DevelopmentWizard.test.tsx
- e2e/dle/autosave-guarded-rollout.spec.ts
- docs/dle/AUTOSAVE_SAFETY_CONTRACT.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-04/qa-dle-sale-guarded-autosave-resume.png
- docs/dle/evidence/2026-06-04/qa-dle-rental-guarded-autosave-resume.png
- docs/dle/evidence/2026-06-04/qa-dle-auction-guarded-autosave-resume.png
- docs/dle/evidence/2026-06-04/qa-dle-rental-guarded-autosave-retry.png
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/hooks/__tests__/useAutoSave.test.tsx client/src/components/wizard/WizardEngine.test.tsx'`
- Result: Passed. 3 test files, 33 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:5173 pnpm exec playwright test e2e/dle/autosave-preflight-browser.spec.ts e2e/dle/autosave-guarded-rollout.spec.ts e2e/dle/rental-auction-wizard-save-publish.spec.ts --project="Desktop Chrome" --workers=1'`
- Result: Passed with `VITE_DLE_CREATE_DRAFT_AUTOSAVE_ENABLED=true`. 3 browser specs, 7 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/hooks/__tests__/useAutoSave.test.tsx client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/wizard/WizardEngine.test.tsx client/src/components/development-wizard/phases/FinalisationPhase.test.tsx client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/pages/DevelopmentQualificationPage.test.ts client/src/pages/ReferrerDashboard.test.ts server/__tests__/developerRouter.drafts.test.ts server/__tests__/distributionCatalogPricing.test.ts server/lib/developmentReadiness.shared.test.ts server/lib/sanitizeDraftData.test.ts server/__tests__/developerRouter.edit-update.test.ts server/__tests__/integration.developer-create-lead-persistence.test.ts server/__tests__/integration.development-card-data-flow.test.ts'`
- Result: Passed with local test database access. 16 test files, 139 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Added the explicit default-off `VITE_DLE_CREATE_DRAFT_AUTOSAVE_ENABLED` switch to the runtime
  and environment references.
- The switch enables real-developer create and draft autosave only; edit-development and
  publisher-emulator autosave remain disabled regardless of the flag.
- Focused component proof confirms publisher-emulator create remains excluded even when the
  rollout switch is enabled.
- Chose a 10-second inactivity debounce based on the commercial packaging workflow and documented
  the rationale and rollback triggers.
- Create, draft, and edit hydration now establish a canonical skip baseline without producing a
  backend write or falsely showing `Saved`.
- Corrected immediate workflow-transition saving to watch canonical `currentStepId` instead of the
  legacy `currentPhase`.
- Sale, Rental, and Auction each autosaved a canonical step transition and resumed the latest
  confirmed step from the database.
- A failed Rental background autosave stayed visibly failed and left the database unchanged; a
  later latest-state transition retried successfully and resumed correctly.
- Existing hydration, manual failure/retry, one-new-draft identity, Rental publish, Auction publish,
  public output, search, and lead-context browser proofs still pass with the switch enabled.
Evidence:
- docs/dle/evidence/2026-06-04/qa-dle-sale-guarded-autosave-resume.png
- docs/dle/evidence/2026-06-04/qa-dle-rental-guarded-autosave-resume.png
- docs/dle/evidence/2026-06-04/qa-dle-auction-guarded-autosave-resume.png
- docs/dle/evidence/2026-06-04/qa-dle-rental-guarded-autosave-retry.png
Remaining risks:
- The rollout switch remains false/unset by default. A controlled environment must enable and
  monitor it before any broad rollout.
- Edit-development autosave remains out of scope because published-development progress requires
  baseline-aware partial-step ownership rather than create/draft full-snapshot persistence.
- Publisher-emulator autosave remains out of scope until it has a proven publisher-scoped draft
  persistence path; `developer.saveDraft` requires a real developer profile.
- The 10-second field-edit debounce is coordinator- and component-proven; browser evidence focuses
  on immediate canonical step transitions because they are deterministic and commercially
  meaningful.
Next recommended slice:
- Run a controlled create/draft autosave rollout with the switch enabled and monitor the documented
  rollback triggers, then return to the transaction-first wizard product experience audit.
Commit hash/tag: This entry will be included in `feat(dle): add guarded draft autosave rollout`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Transaction Engine Wizard Guidance

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Start turning the proven transaction architecture into visible product experience by making
the active Sale, Rental, or Auction engine explicit inside the shared wizard shell.
Files changed:
- client/src/components/wizard/WizardEngine.tsx
- client/src/components/wizard/WizardEngine.test.tsx
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/PRODUCT_VISION.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/components/wizard/WizardEngine.test.tsx client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/pages/DevelopmentDetail.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/pages/DevelopmentUnitDetailPage.test.ts'`
- Result: Passed. 5 test files, 49 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/rental-auction-wizard-save-publish.spec.ts --project="Desktop Chrome" --workers=1'`
- Result: Passed. 1 browser spec, 2 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Added a shared transaction-engine guidance band to the active wizard shell.
- The band makes the active engine visible as Sale Engine, Rental Engine, or Auction Engine.
- Sale copy now calls out price bands, buyer costs, available/reserved stock, and purchase lead
  context.
- Rental copy now calls out monthly rent ranges, deposit/lease terms, rental availability, and
  lease lead context.
- Auction copy now calls out starting bid, auction window, bidder readiness, and auction lead
  context.
- The band maps the current workflow step to a commercial packaging focus, so generic steps such
  as Identity, Location, Media, Unit Types, and Review carry transaction-first meaning.
- Added product audit documentation that separates current transaction-aware mechanics from the
  still-needed transaction-first experience upgrades.
Remaining risks:
- This is the first visible product layer, not a full wizard redesign.
- The wizard still needs live public-preview feedback for identity, highlights, media, and unit
  cards.
- Rental and Auction still need deeper product-language improvements for lease terms, bidder
  registration, auction/legal packs, and post-publish operations.
Next recommended slice:
- Add a transaction-aware unit-card preview inside Unit Types so developers can see how sale,
  rental, and auction inventory will merchandise publicly before publishing.
Commit hash/tag: This entry will be included in `feat(dle): surface transaction engine guidance`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Transaction-Aware Unit Card Preview

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the Unit Types step visibly transaction-first by previewing how Sale, Rental, and Auction
unit inventory will merchandise publicly before publish.
Files changed:
- client/src/components/development-wizard/phases/UnitTypesPhase.tsx
- client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx client/src/components/wizard/WizardEngine.test.tsx'`
- Result: Passed. 2 test files, 10 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx client/src/components/wizard/WizardEngine.test.tsx client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/development-wizard/phases/FinalisationPhase.test.tsx client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/hooks/useDevelopmentWizard.test.ts'`
- Result: Passed. 8 test files, 84 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Added a presentation-only Unit Types merchandising preview for Sale, Rental, and Auction.
- Sale previews now show price-band language, for-sale availability, purchase enquiry context, and
  buyer-facing CTA copy.
- Rental previews now show monthly-rent language, deposit, lease term, rental availability, rental
  lead context, and rental CTA copy.
- Auction previews now show starting-bid language, auction window, reserve tracking, open-lot
  availability, auction interest context, and auction CTA copy.
- Changed the existing unit-card availability fallback from sale-only `Sold Out` to the
  transaction-neutral `No availability`.
Remaining risks:
- This is still an in-wizard preview, not a full public-page redesign.
- Identity, highlights, and media still need live public-preview treatment.
- Rental and Auction still need deeper first-class packaging surfaces for qualification,
  registration, legal packs, outcomes, and post-publish operations.
Next recommended slice:
- Extend the same transaction-first showroom treatment to the public page sections and developer
  dashboard operations, starting with Rental/Auction-specific merchandising and lead readiness.
Commit hash/tag: This entry will be included in `feat(dle): preview transaction unit merchandising`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Public Unit Availability Merchandising

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Make public development unit-card availability and CTA language transaction-aware so Rental
and Auction no longer inherit sale-only merchandising language.
Files changed:
- client/src/pages/DevelopmentDetail.tsx
- client/src/pages/DevelopmentDetail.test.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/pages/DevelopmentDetail.test.ts'`
- Result: Passed. 1 test file, 15 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/components/property-results/__tests__/ListingResultCard.test.tsx client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx client/src/components/wizard/WizardEngine.test.tsx client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/development-wizard/phases/FinalisationPhase.test.tsx client/src/hooks/useDevelopmentWizard.test.ts'`
- Result: Passed. 9 test files, 89 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Kept Sale unit availability behavior intact: `Sold out`, `Only X left`, `X available`, and
  sale-style callback/waitlist CTAs.
- Added Rental-native public availability labels: `Fully let`, `X rentals available`, rental
  waitlist, and rental-details CTAs.
- Added Auction-native public availability labels: `Auction closed`, `X lots open`, register
  interest, and auction-interest CTAs.
- Surfaced the availability state as a visible badge on public unit cards instead of using it only
  for the primary button label.
- Kept the existing selected-unit lead path unchanged so unit identity, price label, and transaction
  type continue to flow into `DevelopmentLeadDialog`.
Remaining risks:
- This improves public unit-card merchandising, but does not yet add full Rental/Auction public
  sections for lease qualification, bidder registration, legal packs, or auction urgency.
- The action panel still contains sale/qualification-oriented copy that should become
  transaction-aware in a later public-page slice.
Next recommended slice:
- Make the public action panel and quick-qualification block transaction-aware so Rental and Auction
  have native next-step language before the lead dialog opens.
Commit hash/tag: This entry will be included in `feat(dle): localize public unit availability`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Public Action Panel Transaction Copy

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the public development action panel transaction-aware so Sale, Rental, and Auction pages
ask for the right next step before qualification or lead capture begins.
Files changed:
- client/src/pages/DevelopmentDetail.tsx
- client/src/pages/DevelopmentDetail.test.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/pages/DevelopmentDetail.test.ts'`
- Result: Passed. 1 test file, 18 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/components/property-results/__tests__/ListingResultCard.test.tsx client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx client/src/components/wizard/WizardEngine.test.tsx client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/development-wizard/phases/FinalisationPhase.test.tsx client/src/hooks/useDevelopmentWizard.test.ts'`
- Result: Passed. 9 test files, 92 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Added an exported public action-panel copy model for Sale, Rental, and Auction.
- Sale action-panel copy continues to focus on affordability, full qualification, brochures, and
  the sales team.
- Rental action-panel copy now focuses on rental fit, lease details, rental packs, and the leasing
  team.
- Auction action-panel copy now focuses on bidder readiness, auction packs, auction-team contact,
  and obligation-free auction interest.
- Threaded the public detail pricing transaction type into the live mobile and sticky-sidebar
  `DevelopmentActionPanel` instances.
- Kept the existing qualification route, brochure lead, contact lead, and selected-unit lead context
  behavior unchanged.
Remaining risks:
- The qualification route itself may still need deeper Rental/Auction language and calculations.
- The older hidden desktop conversion card still contains sale-oriented copy but is not rendered by
  its current classes; it should be removed or reconciled in a cleanup slice.
- Full Rental/Auction public merchandising sections for lease terms, bidder registration, legal
  packs, and auction urgency remain outstanding.
Next recommended slice:
- Audit and update the qualification route/lead-dialog copy so Rental and Auction remain
  transaction-native after the action-panel CTA is clicked.
Commit hash/tag: This entry will be included in `feat(dle): localize public action panel`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Public Lead Dialog Transaction Copy

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Keep Sale, Rental, and Auction language and transaction context intact inside the public lead
dialog after a buyer, renter, or bidder clicks a transaction-native CTA.
Files changed:
- client/src/components/development/DevelopmentLeadDialog.tsx
- client/src/components/development/DevelopmentLeadDialog.test.tsx
- client/src/pages/DevelopmentDetail.tsx
- client/src/pages/DevelopmentUnitDetailPage.tsx
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/components/development/DevelopmentLeadDialog.test.tsx'`
- Result: Passed. 1 test file, 5 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/components/development/DevelopmentLeadDialog.test.tsx client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/pages/DevelopmentQualificationPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/components/property-results/__tests__/ListingResultCard.test.tsx client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx client/src/components/wizard/WizardEngine.test.tsx client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/development-wizard/phases/FinalisationPhase.test.tsx client/src/hooks/useDevelopmentWizard.test.ts'`
- Result: Passed. 11 test files, 101 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Added a transaction-normalized lead-dialog copy model for Sale, Rental, and Auction.
- Sale dialog copy continues to use sales, brochure, pricing, and full-qualification language.
- Rental dialog copy now uses leasing team, rental pack, rental details, lease terms, and rental fit
  language.
- Auction dialog copy now uses auction team, auction pack, auction interest, bidder readiness,
  registration, and starting-bid language.
- Added transaction-aware suggested-message generation for brochure, contact, qualification, and
  information lead modes.
- Added page-level `transactionType` support so general brochure/contact/qualification leads
  preserve Sale/Rental/Auction context even when no unit is selected.
- Kept existing `leadSource` identifiers stable while improving user-facing copy and submitted
  `transactionType`.
Remaining risks:
- The qualification route itself still needs deeper Rental/Auction language and result treatment.
- Lead routing and dashboard follow-up still need operating-layer surfaces for sales, leasing, and
  auction workflows.
Next recommended slice:
- Make `DevelopmentQualificationPage` copy/results transaction-native after the user enters through
  the public action panel or lead dialog.
Commit hash/tag: This entry will be included in `feat(dle): localize public lead dialog`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Qualification Route Transaction Copy

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Keep the public qualification route transaction-native after a buyer, renter, or bidder enters
from the public action panel or lead dialog.
Files changed:
- client/src/pages/DevelopmentQualificationPage.tsx
- client/src/pages/DevelopmentQualificationPage.test.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/pages/DevelopmentQualificationPage.test.ts'`
- Result: Passed. 1 test file, 5 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/pages/DevelopmentQualificationPage.test.ts client/src/components/development/DevelopmentLeadDialog.test.tsx client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/components/property-results/__tests__/ListingResultCard.test.tsx client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx client/src/components/wizard/WizardEngine.test.tsx client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/development-wizard/phases/FinalisationPhase.test.tsx client/src/hooks/useDevelopmentWizard.test.ts'`
- Result: Passed. 11 test files, 102 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Added a transaction-normalized qualification experience copy model for Sale, Rental, and Auction.
- Sale qualification copy remains affordability, qualification, deposit, and sales-team oriented.
- Rental qualification copy now uses rental fit, monthly rent capacity, upfront amount, rental lead,
  lease availability, and leasing-team language.
- Auction qualification copy now uses bidder readiness, auction capacity, starting bid, bidder
  context, deposit/cash contribution, auction registration, and auction-team language.
- The route now updates its meta text, hero, step labels, result card, submitted state, sidebar
  checklist, and submit button from the transaction copy model.
- Submitted qualification leads now include page-level `transactionType`; selected-unit
  qualification context also includes `unitPriceLabel` and unit-level `transactionType`.
Remaining risks:
- The qualification calculations still use shared affordability assumptions. Rental lease
  qualification ratios and Auction proof-of-funds/bidder registration requirements need deeper
  product and rules work.
- Operating-layer lead stages and team-specific follow-up workflows remain outstanding.
Next recommended slice:
- Add richer Rental/Auction qualification assumptions and prompts, then start the operating-layer
  audit for live development inventory and lead-stage management.
Commit hash/tag: This entry will be included in `feat(dle): localize qualification route`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Qualification Route Transaction Assumptions

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the public qualification route explain transaction-specific assumptions so Sale,
Rental, and Auction users understand what the estimate does and does not prove.
Files changed:
- client/src/pages/DevelopmentQualificationPage.tsx
- client/src/pages/DevelopmentQualificationPage.test.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/pages/DevelopmentQualificationPage.test.ts'`
- Result: Passed. 1 test file, 5 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/pages/DevelopmentQualificationPage.test.ts client/src/components/development/DevelopmentLeadDialog.test.tsx client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/components/property-results/__tests__/ListingResultCard.test.tsx client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx client/src/components/wizard/WizardEngine.test.tsx client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/development-wizard/phases/FinalisationPhase.test.tsx client/src/hooks/useDevelopmentWizard.test.ts'`
- Result: Passed. 11 test files, 102 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Added transaction-specific assumption copy to the qualification experience model.
- Sale now explains the bond-term/prime-rate estimate, deposit effect, and finance approval limits.
- Rental now explains rental-fit estimates, lease approval limits, income proof, deposit
  confirmation, and lease-document expectations.
- Auction now explains bidder-readiness estimates, auction-registration limits, FICA, proof of
  funds/deposit proof, and auction-term expectations.
- The Step 2 accuracy prompt now changes by transaction type instead of reusing generic
  affordability language.
- The result and sidebar now surface the active transaction assumptions before the user submits
  contact details.
Remaining risks:
- The underlying qualification math still uses a shared affordability-derived model. Dedicated
  Rental lease qualification ratios and Auction registration/proof-of-funds workflows remain future
  product/rules work.
- Operating-layer lead stages and team-specific follow-up workflows remain outstanding.
Next recommended slice:
- Start the operating-layer audit for live development inventory and lead-stage management, then
  define the first small post-publish operations surface.
Commit hash/tag: This entry will be included in `feat(dle): clarify qualification assumptions`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Operating Layer Architecture Audit

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Define the DLE operating layer before implementing post-publish dashboard or inventory
surfaces, so Sale, Rental, and Auction operations do not collapse back into generic listing CRUD.
Files changed:
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/RECOVERY_LOG.md
Focused inspection run:
- Read `docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md`.
- Inspected current developer dashboard surfaces:
  `client/src/components/developer/Overview.tsx`,
  `client/src/components/developer/DevelopmentsList.tsx`,
  `client/src/components/developer/LeadsManager.tsx`,
  `client/src/components/developer/UnitsManager.tsx`,
  `client/src/pages/DeveloperRoutes.tsx`,
  `client/src/components/dashboard/EntityStatusCard.tsx`.
- Inspected current backend/shared operating contracts:
  `server/developerRouter.ts`, `server/services/developerFunnelService.ts`,
  `shared/developerFunnel.ts`, `shared/developmentDerived.ts`,
  `drizzle/schema/developments.ts`, and `drizzle/schema/leads.ts`.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Added `docs/dle/OPERATING_LAYER_AUDIT.md`.
- Documented the current operating base: transaction fields, unit inventory fields, derived
  inventory helpers, developer overview KPIs, lead control center, lead stages, SLA policy,
  assignment, activity logging, next actions, and distribution/referral infrastructure.
- Documented current weak points: placeholder Units Manager, generic development cards, sale-shaped
  lead stage names, missing live inventory mutations, missing operating event/audit model, and
  missing transaction-native dashboard outcomes.
- Defined the intended shared operating shell for live developments after publish.
- Defined Sale, Rental, and Auction operating concepts and product language separately.
- Recommended the first implementation slice: a read-only Development Operations Snapshot using
  existing data, with no schema changes, no inventory mutations, and no edit-development autosave
  changes.
- Registered `OPERATING_LAYER_AUDIT.md` in the source-of-truth document and moved the strategic
  order toward a read-only operating-layer surface.
Remaining risks:
- This slice is documentation-only. The dashboard does not yet show the operating snapshot.
- Inventory mutation, reservation/let/sold/auction outcome tracking, audit events, and
  transaction-native lead-stage overlays remain unimplemented.
- The existing developer worktree still contains unrelated homepage/evidence/playwright changes
  that were not touched or staged in this slice.
Next recommended slice:
- Implement the first read-only Development Operations Snapshot in the developer dashboard, using
  current development fields, existing derived inventory helpers, and existing lead/distribution
  queries.
Commit hash/tag: This entry will be included in `docs(dle): define operating layer audit`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Read-Only Development Operations Snapshot

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Implement the first operating-layer surface without schema changes or inventory mutations, so
live development cards begin reflecting Sale, Rental, and Auction operations after publish.
Files changed:
- client/src/components/dashboard/EntityStatusCard.tsx
- client/src/components/dashboard/EntityStatusCard.test.ts
- client/src/components/developer/DevelopmentsList.tsx
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/components/dashboard/EntityStatusCard.test.ts'`
- Result: Passed. 1 test file, 7 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/components/dashboard/EntityStatusCard.test.ts client/src/pages/DevelopmentQualificationPage.test.ts client/src/components/development/DevelopmentLeadDialog.test.tsx client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/components/property-results/__tests__/ListingResultCard.test.tsx client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx client/src/components/wizard/WizardEngine.test.tsx client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/development-wizard/phases/FinalisationPhase.test.tsx client/src/hooks/useDevelopmentWizard.test.ts'`
- Result: Passed. 12 test files, 109 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Added a transaction-aware `getEntityStatusCardOperationsSnapshot` helper for development cards.
- Sale development cards can now show a read-only Sales inventory snapshot with available,
  reserved, sold-estimate counts, and a buyer-leads CTA.
- Rental development cards can now show a read-only Leasing inventory snapshot with rentals
  available, held, let-estimate counts, and a rental-leads CTA.
- Auction development cards can now show a read-only Auction lots snapshot with lots open,
  registered-or-held, auction-outcome counts, and a bidder-leads CTA.
- Live development cards use existing `calculateInventorySummary` logic and current development
  fields only.
- The developer developments list now routes the operations lead CTA to
  `/developer/leads?developmentId=<id>`.
- The UI explicitly marks inventory operations as read-only until the operating status/audit model
  exists.
- Updated the operating audit and source-of-truth to record the implemented first surface and the
  next operating-layer order.
Remaining risks:
- The operations snapshot is intentionally read-only and still uses derived sold/let/outcome counts
  from current total/available/reserved fields.
- Lead risk, distribution readiness, inventory mutation, reservation/let/sold/auction outcome
  tracking, and audit events remain unimplemented.
- Browser proof for the dashboard surface has not been captured in this slice.
Next recommended slice:
- Broaden the read-only operations snapshot with existing lead-risk and distribution-readiness data,
  then define the transaction-native operating status/audit model before any inventory mutation.
Commit hash/tag: This entry will be included in `feat(dle): add read-only operations snapshot`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Operating Readiness Lead and Distribution Snapshot

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Broaden the read-only operating layer with selected-development lead risk and distribution
readiness, without schema changes, inventory mutations, or edit-development autosave changes.
Files changed:
- client/src/components/developer/Overview.tsx
- client/src/components/developer/Overview.test.ts
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/components/developer/Overview.test.ts'`
- Result: Passed. 1 test file, 4 tests.
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run client/src/components/developer/Overview.test.ts client/src/components/dashboard/EntityStatusCard.test.ts client/src/pages/DevelopmentQualificationPage.test.ts client/src/components/development/DevelopmentLeadDialog.test.tsx client/src/pages/DevelopmentDetail.test.ts client/src/pages/DevelopmentUnitDetailPage.test.ts client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx client/src/components/property-results/__tests__/ListingResultCard.test.tsx client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx client/src/components/wizard/WizardEngine.test.tsx client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/development-wizard/phases/FinalisationPhase.test.tsx client/src/hooks/useDevelopmentWizard.test.ts'`
- Result: Passed. 13 test files, 113 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Added transaction-normalized operating readiness helpers to the developer overview.
- Added an `Operating Readiness` panel when a development is selected in the Developer Control
  Tower.
- Sale selected-development copy now uses buyer lead risk, qualified buyers, sales outcomes,
  referral sales readiness, and buyer queue language.
- Rental selected-development copy now uses rental lead risk, rental-fit leads, lease outcomes,
  referral leasing readiness, and leasing queue language.
- Auction selected-development copy now uses bidder lead risk, bidder-ready leads, auction
  outcomes, referral auction readiness, and bidder queue language.
- The panel summarizes warning/breach risk, qualified/readiness count, closed outcome count,
  distribution state, eligible partner count, and referral deal count from existing dashboard
  queries.
- The risk/readiness/outcome tiles route into the existing lead attention/pipeline views while
  preserving the selected development filter.
- Updated the operating audit and source-of-truth to mark read-only inventory, lead-risk, and
  distribution-readiness surfaces as implemented.
Remaining risks:
- Browser proof for the dashboard operating surfaces has not been captured in this slice.
- The underlying lead stage model remains shared and sale-shaped; Rental and Auction are currently
  represented through transaction-native labels over the existing stage counts.
- Inventory mutation, reservation/let/sold/auction outcome tracking, audit events, and
  transaction-native lead-stage overlays remain unimplemented.
Next recommended slice:
- Define the transaction-native operating status/audit model before adding inventory mutations, and
  capture browser proof for the dashboard operating surfaces.
Commit hash/tag: This entry will be included in `feat(dle): surface operating readiness`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Operating Status and Audit Contract

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Define the transaction-native operating status and audit contract before any live inventory
mutations are added to the DLE.
Files changed:
- docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/RECOVERY_LOG.md
Focused inspection run:
- Read `docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md`.
- Read `docs/dle/OPERATING_LAYER_AUDIT.md`.
- Inspected existing schema anchors:
  `drizzle/schema/developments.ts`, `drizzle/schema/leads.ts`,
  `drizzle/schema/distribution.ts`, and `drizzle/schema/core.ts`.
- Confirmed current anchors: development transaction fields, unit inventory counts, unit auction
  status, lead activities, generic audit logs, managerial audit logs, and distribution deal events.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Added `docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md`.
- Defined the boundary between packaging edits and operating updates.
- Defined shared abstract operating buckets: open, held, committed, blocked, closed.
- Defined transaction-native Sale statuses and transitions: available, reserved, under offer,
  bond/deal progress, sold, withdrawn.
- Defined transaction-native Rental statuses and transitions: available, held, application in
  progress, lease ready, let, available soon, withdrawn.
- Defined transaction-native Auction statuses and transitions: scheduled, registration open,
  active, sold at auction, passed in, withdrawn, closed.
- Defined the recommended `development_operating_events` stream, minimum fields, event types, and
  source surfaces.
- Added mutation guardrails requiring explicit development ownership, transaction normalization from
  the development record, operating-field-only updates, same-transaction event writing, and no
  canonical wizard `stepData` rewrites.
- Recommended the first mutation slice as event-only `operating_note_added` before inventory counts
  or statuses are mutated.
- Registered the contract in the source-of-truth and linked it from the operating audit.
Remaining risks:
- This slice is documentation-only. No schema, migration, API, service, or dashboard history surface
  exists yet for `development_operating_events`.
- Browser proof for the read-only dashboard operating surfaces remains outstanding.
- Transaction-native lead-stage overlays remain a future design/implementation slice.
Next recommended slice:
- Implement an event-only operating note mutation/readback surface, then capture browser proof before
  adding inventory status or quantity mutations.
Commit hash/tag: This entry will be included in `docs(dle): define operating status contract`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Event-Only Operating Note Mutation

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Implement the first DLE operating mutation as an event-only note/readback surface, proving
developer ownership, audit writing, and dashboard history before any inventory count or status
mutation.
Files changed:
- drizzle/schema/developmentOperations.ts
- drizzle/schema/index.ts
- server/migrations/0068_create_development_operating_events.sql
- server/services/developmentOperatingEventsService.ts
- server/services/__tests__/developmentOperatingEventsService.test.ts
- server/developerRouter.ts
- client/src/components/developer/Overview.tsx
- client/src/components/developer/Overview.test.ts
- docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command:
  `bash -lc 'source ~/.nvm/nvm.sh && pnpm vitest run server/services/__tests__/developmentOperatingEventsService.test.ts client/src/components/developer/Overview.test.ts'`
- Result: Blocked by sandboxed DB access. Vitest loaded `.env.test` and failed global DB init with
  `connect EPERM 127.0.0.1:3306`.
- Command:
  `bash -lc 'source ~/.nvm/nvm.sh && SKIP_DB_INIT=1 pnpm vitest run server/services/__tests__/developmentOperatingEventsService.test.ts client/src/components/developer/Overview.test.ts'`
- Result: Passed. 2 test files, 8 tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Added `development_operating_events` as the DLE-specific operating event stream.
- Added a SQL migration for the operating event stream with development, unit type, lead,
  distribution deal, actor, event type, source surface, metadata, and before/after JSON anchors.
- Added a development operating events service that verifies developer ownership, normalizes
  transaction type from the development record, writes `operating_note_added`, and reads the event
  back before returning success.
- Added `developer.getOperatingEvents` and `developer.addOperatingNote` procedures.
- Added Operating History to the selected-development Operating Readiness panel.
- Developers can add compact internal operating notes and see recent events without changing
  inventory, media, location, governance, highlights, unit definitions, public packaging, or
  canonical wizard `stepData`.
- Added focused helper tests for source-surface normalization and event note JSON parsing on the
  service and dashboard sides.
- Updated the source-of-truth, operating audit, and operating status contract to record that the
  first event-only mutation is implemented.
Remaining risks:
- Browser proof for Sale, Rental, and Auction operating note creation/readback is still outstanding.
- The focused server test did not exercise real DB insertion in this restricted environment; it
  exercised the policy helpers with DB initialization skipped.
- Inventory status transitions, quantity adjustments, operating projections, and
  transaction-native lead-stage overlays remain unimplemented.
- The existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Browser-proof the event-only operating note flow for Sale, Rental, and Auction dashboards, then
  design the first Sale `available` -> `reserved` -> `available` status mutation against this event
  stream.
Commit hash/tag: This entry will be included in `feat(dle): add operating event notes`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Operating Note Browser Readback Proof

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Browser-proof the first event-only DLE operating mutation across Sale, Rental, and Auction
before any inventory count or status mutation.
Files changed:
- e2e/dle/operating-note-readback.spec.ts
- docs/dle/evidence/2026-06-04/qa-dle-operating-note-sale.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-note-rental.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-note-auction.png
- docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/RECOVERY_LOG.md
Local DB migration:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm db:migrate:local'`
- Result: Passed. Applied `0068_create_development_operating_events.sql` to
  `127.0.0.1:3306/listify_local` and `db:verify:distribution` passed.
Focused browser proof run:
- Command:
  `bash -lc 'source ~/.nvm/nvm.sh && PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/operating-note-readback.spec.ts --project="Desktop Chrome" --workers=1'`
- Result: Passed. 1 test file, 1 browser test.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Added a repeatable Playwright proof that seeds one approved developer with Sale, Rental, and
  Auction developments.
- The proof authenticates as the seeded developer, opens `/developer/dashboard`, selects each
  development, adds an operating note, and verifies dashboard readback.
- The proof verifies DB events for each lane with `eventType: operating_note_added`,
  `sourceSurface: developer_dashboard`, actor user ID, metadata note, afterData note, and
  transaction type normalized from the development record.
- Captured dashboard evidence screenshots for Sale, Rental, and Auction operating note history.
- Updated the operating docs to mark success readback as browser-proven and keep failed-write proof
  plus inventory/status mutation as future gates.
Remaining risks:
- Failed operating event write UX has not yet been browser-proven.
- Inventory status transitions, quantity adjustments, operating projections, and
  transaction-native lead-stage overlays remain unimplemented.
- The existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Prove failed operating event writes do not claim success, then design the first Sale
  `available` -> `reserved` -> `available` status mutation against the event stream.
Commit hash/tag: This entry will be included in `test(dle): prove operating note readback`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Operating Note Failed-Write Browser Proof

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Prove the Operating History surface does not claim success when an operating note write fails.
Files changed:
- e2e/dle/operating-note-readback.spec.ts
- docs/dle/evidence/2026-06-04/qa-dle-operating-note-sale.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-note-rental.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-note-auction.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-note-failure-visible.png
- docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/RECOVERY_LOG.md
Focused browser proof run:
- Command:
  `bash -lc 'source ~/.nvm/nvm.sh && PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/operating-note-readback.spec.ts --project="Desktop Chrome" --workers=1'`
- Result: Passed. 1 test file, 2 browser tests.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Extended the operating-note Playwright proof with an injected failed
  `developer.addOperatingNote` response.
- Confirmed the failed write keeps the developer-entered note in the textarea.
- Confirmed the dashboard does not show the `Operating note added.` success toast on failure.
- Confirmed the DB event count for the selected development does not increase after the failed
  write.
- Captured failed-write evidence in
  `docs/dle/evidence/2026-06-04/qa-dle-operating-note-failure-visible.png`.
- Updated the operating docs to mark failed-write no-false-success proof as satisfied.
Remaining risks:
- Inventory status transitions, quantity adjustments, operating projections, and
  transaction-native lead-stage overlays remain unimplemented.
- Inventory mutation still needs its own field-ownership/browser proof to show it cannot wipe
  media, location, governance, or unit definitions.
- The existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Design the first Sale `available` -> `reserved` -> `available` status mutation against the event
  stream, then implement it as a narrow operating-only mutation.
Commit hash/tag: This entry will be included in `test(dle): prove operating note failure handling`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Sale Operating Status Mutation Design

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Define the first Sale inventory status mutation before coding live count changes.
Files changed:
- docs/dle/SALE_OPERATING_STATUS_MUTATION_DESIGN.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
Focused inspection run:
- Read `docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md`.
- Read `docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md`.
- Read `docs/dle/OPERATING_LAYER_AUDIT.md`.
- Inspected current inventory anchors in `drizzle/schema/developments.ts`,
  `shared/developmentDerived.ts`, `server/services/developmentOperatingEventsService.ts`,
  `server/services/developmentService.ts`, and
  `client/src/components/dashboard/EntityStatusCard.tsx`.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Added `docs/dle/SALE_OPERATING_STATUS_MUTATION_DESIGN.md`.
- Defined the first mutation as Sale-only, unit-type count-level reserve/release:
  `available` -> `reserved` and `reserved` -> `available`.
- Defined transaction boundaries: unit count update, development available-unit aggregate refresh,
  and `development_operating_events` insert must happen in one DB transaction.
- Clarified that `unit_types` is the first inventory source of truth because it has both
  `available_units` and `reserved_units`; `developments.available_units` is a refreshed aggregate
  projection and `developments` has no reserved count column.
- Defined hard exclusions: no wizard `stepData`, no edit autosave, no media/location/governance/
  highlights/description/pricing/public-packaging changes, and no Rental/Auction mutation in this
  first slice.
- Defined browser proof requirements for reserve, release, event readback, no false success on
  failure, public Sale language preservation, and field-ownership safety.
Remaining risks:
- This is a design-only slice. No Sale reserve/release API or UI has been implemented yet.
- Inventory mutation field-ownership proof remains outstanding.
- Rental and Auction operating mutations remain future work.
- The existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Implement the Sale reserve/release mutation service/router/dashboard surface against this design.
Commit hash/tag: This entry will be included in `docs(dle): design sale operating status mutation`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Sale Reserve/Release Operating Mutation

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Implement and browser-proof the first Sale operating inventory mutation without reusing the
edit-development wizard or wiping public packaging fields.
Files changed:
- server/services/developmentOperatingEventsService.ts
- server/developerRouter.ts
- client/src/components/developer/Overview.tsx
- server/services/__tests__/developmentOperatingEventsService.test.ts
- e2e/dle/sale-operating-reservation.spec.ts
- docs/dle/evidence/2026-06-04/qa-dle-sale-operating-reserve.png
- docs/dle/evidence/2026-06-04/qa-dle-sale-operating-release.png
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md
- docs/dle/SALE_OPERATING_STATUS_MUTATION_DESIGN.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command:
  `bash -lc 'source ~/.nvm/nvm.sh && SKIP_DB_INIT=1 pnpm vitest run server/services/__tests__/developmentOperatingEventsService.test.ts client/src/components/developer/Overview.test.ts'`
- Result: Passed. 2 test files, 9 tests.
Focused browser proof run:
- First sandboxed attempt failed before test execution because Chromium could not shut down its Linux
  sandbox.
- Command:
  `bash -lc 'source ~/.nvm/nvm.sh && PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/sale-operating-reservation.spec.ts --project="Desktop Chrome" --workers=1'`
- Result: Passed outside the command sandbox. 1 test file, 1 browser test.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Added Sale-only operating inventory readback via `developer.getSaleOperatingInventory`.
- Added Sale-only reserve/release mutation via `developer.transitionSaleUnitReservation`.
- The mutation verifies developer ownership, derives transaction type from the development record,
  rejects non-Sale developments, updates one unit at a time, and writes
  `inventory_status_changed` in the same transaction as the count update.
- `unit_types.available_units` and `unit_types.reserved_units` are the count source of truth for
  this first mutation; `developments.available_units` is refreshed as the aggregate sum of active
  unit types.
- Added a Sale-only `Sales Inventory` dashboard panel with Reserve and Release controls.
- Browser proof seeded a Sale development with 8 available and 2 reserved units, reserved one unit
  to reach 7 available and 3 reserved, then released one unit back to 8 available and 2 reserved.
- Browser/DB proof verified event type, transaction type, unit type ID, from/to statuses, quantity
  deltas, metadata transition, before/after data snapshots, aggregate available units, and unchanged
  media/location/highlights/pricing/unit definition fields.
Manual flows verified:
- Developer dashboard Sale inventory reserve/release against local frontend `:3009`, backend
  `:5000`, and `listify_local`.
- Evidence screenshots captured:
  `qa-dle-sale-operating-reserve.png` and `qa-dle-sale-operating-release.png`.
Remaining risks:
- Failed reserve/release no-false-success UX is not yet browser-proven.
- Governance and wizard workflow fields should be included in the next broader operating
  field-ownership proof fixture.
- Public page/search card Sale-language preservation after reserve/release should be included in the
  next broader public-merchandising proof.
- Rental held/release and Auction registration lifecycle mutations remain future slices.
- The existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Either browser-proof failed Sale reserve/release handling, or design Rental
  `available` -> `held` -> `available` with the same operating-event and field-ownership contract.
Commit hash/tag: This entry will be included in `feat(dle): add sale reservation operations`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Rental Operating Status Mutation Design

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Define the first Rental inventory mutation as a separate lease-native operating sub-engine
before coding live count changes.
Files changed:
- docs/dle/RENTAL_OPERATING_STATUS_MUTATION_DESIGN.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
Focused inspection run:
- Read `docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md`.
- Read `docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md`.
- Read `docs/dle/OPERATING_LAYER_AUDIT.md`.
- Inspected Rental inventory, monthly-rent, deposit, lease-term, furnished-state, and operating-event
  anchors in `drizzle/schema/developments.ts`, `drizzle/schema/developmentOperations.ts`,
  `server/services/developmentOperatingEventsService.ts`, `server/developerRouter.ts`, and
  `client/src/components/developer/Overview.tsx`.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and decisions:
- Added `docs/dle/RENTAL_OPERATING_STATUS_MUTATION_DESIGN.md`.
- Defined the first Rental mutation as unit-type count-level hold/release:
  `available` -> `held` and `held` -> `available`.
- Defined Rental-native public contracts and dashboard language: `hold`, `release`, and `held`, not
  Sale-shaped `reserve` or `reserved`.
- Documented that the existing `unit_types.reserved_units` column may serve only as the underlying
  held-count projection until a future physical-unit model is justified.
- Defined transaction boundaries: unit count update, development available-unit aggregate refresh,
  and `development_operating_events` insert must happen in one DB transaction.
- Defined hard exclusions: no rent/deposit/lease/furnished changes, no wizard `stepData`, no edit
  autosave, no public-packaging changes, and no Sale/Auction mutation in this slice.
- Defined browser proof requirements for Rental language, hold/release, event readback, no false
  success, public Rental language, and lease/packaging field ownership.
Remaining risks:
- This is a design-only slice. No Rental hold/release API or UI has been implemented yet.
- Failed Sale reserve/release no-false-success proof remains outstanding.
- Auction operating mutation design remains future work.
- The existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Implement the Rental hold/release mutation service/router/dashboard surface against this design,
  then browser-proof it with DB and field-ownership assertions.
Commit hash/tag: This entry will be included in `docs(dle): design rental operating hold`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Rental Hold/Release Operating Mutation

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Implement and browser-proof the first Rental operating inventory mutation as a distinct
lease-native sub-engine without regressing Sale or wiping Rental packaging fields.
Files changed:
- server/services/developmentOperatingEventsService.ts
- server/developerRouter.ts
- client/src/components/developer/Overview.tsx
- server/services/__tests__/developmentOperatingEventsService.test.ts
- e2e/dle/rental-operating-hold.spec.ts
- docs/dle/evidence/2026-06-04/qa-dle-rental-operating-hold.png
- docs/dle/evidence/2026-06-04/qa-dle-rental-operating-release.png
- docs/dle/evidence/2026-06-04/qa-dle-rental-operating-public-language.png
- docs/dle/evidence/2026-06-04/qa-dle-rental-operating-search-language.png
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md
- docs/dle/RENTAL_OPERATING_STATUS_MUTATION_DESIGN.md
- docs/dle/RECOVERY_LOG.md
Focused tests run:
- Command:
  `bash -lc 'source ~/.nvm/nvm.sh && SKIP_DB_INIT=1 pnpm vitest run server/services/__tests__/developmentOperatingEventsService.test.ts client/src/components/developer/Overview.test.ts'`
- Result: Passed. 2 test files, 10 tests.
Focused browser proof runs:
- First Rental attempt correctly failed fixture publish validation because the seeded leasing
  development lacked a required launch date. The fixture was corrected to satisfy the real publish
  contract.
- Command:
  `bash -lc 'source ~/.nvm/nvm.sh && PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/rental-operating-hold.spec.ts --project="Desktop Chrome" --workers=1'`
- Result: Passed. 1 test file, 1 browser test.
- Sale regression command:
  `bash -lc 'source ~/.nvm/nvm.sh && PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/sale-operating-reservation.spec.ts --project="Desktop Chrome" --workers=1'`
- Result: Passed. 1 test file, 1 browser test.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Added Rental-only operating inventory readback via `developer.getRentalOperatingInventory`.
- Added Rental-only hold/release mutation via `developer.transitionRentalUnitHold`.
- Added Rental-native transition mapping: `hold` writes `available` -> `held`; `release` writes
  `held` -> `available`.
- Kept Sale and Rental public contracts separate while moving only the shared atomic count,
  aggregate-refresh, and event-write mechanics into private service infrastructure.
- The existing `unit_types.reserved_units` column is used only as Rental's underlying held-count
  projection; Rental API snapshots, events, dashboard copy, and controls expose `held`, not
  `reserved`.
- Added a Rental-only `Rental Inventory` dashboard panel showing monthly rent, deposit, lease term,
  furnished state, rentals available, held count, Hold, and Release.
- Browser/DB proof seeded a published Rental development with 6 available and 1 held unit, held one
  unit to reach 5 available and 2 held, then released it back to 6 available and 1 held.
- Browser/DB proof verified Rental event type, transaction type, unit type ID, `available`/`held`
  statuses, quantity deltas, metadata transition, before/after held snapshots, and aggregate
  available units.
- Field-ownership assertions verified stable monthly rent, deposit, lease term, furnished state,
  media, brochures, highlights, location, ownership/governance fields, and unit definitions.
- Public-page and search-card proof after the operating update verified continued Rental pricing
  and transaction language.
- Sale reserve/release browser regression proof passed after the shared private refactor.
Manual flows verified:
- Developer dashboard Rental hold/release against local frontend `:3009`, backend `:5000`, and
  `listify_local`.
- Published Rental public detail and rental search-card output after the operating mutation.
Remaining risks:
- Failed Rental hold/release no-false-success UX is not yet browser-proven.
- Failed Sale reserve/release no-false-success UX remains outstanding.
- Canonical wizard workflow state should be added to a future operating field-ownership fixture.
- Auction registration/active/outcome operating mutation remains future work.
- The existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Design the first Auction `scheduled` -> `registration_open` -> `active` operating lifecycle
  without forcing Auction through Sale/Rental count semantics.
Commit hash/tag: This entry will be included in `feat(dle): add rental hold operations`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Auction Operating Lifecycle Design

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Define the first Auction operating lifecycle without forcing Auction through Sale/Rental
count semantics or creating a split source of truth.
Files changed:
- docs/dle/AUCTION_OPERATING_LIFECYCLE_DESIGN.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Focused inspection run:
- Read `docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md`.
- Read `docs/dle/TRANSACTION_ENGINE_ARCHITECTURE_AUDIT.md`.
- Read `docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md`.
- Read `docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md`.
- Inspected Auction schema, wizard, sanitizer/type, readiness, derived-listing, public merchandising,
  and migration anchors.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Audit findings and decisions:
- The intended Auction operating lifecycle includes `registration_open`, but canonical
  `unit_types.auction_status` currently supports only `scheduled`, `active`, `sold`, `passed_in`,
  and `withdrawn`.
- Event-only registration state would create a split source of truth, so
  `unit_types.auction_status` must remain the canonical current lot lifecycle projection and gain
  `registration_open` through a coordinated schema/migration/type update.
- Registered-bidder counts must not be faked through `unit_types.reserved_units`; no canonical DLE
  bidder-registration model exists yet.
- Defined Stage A as Auction registration open/rollback:
  `scheduled` -> `registration_open` and explicit rollback to `scheduled`, with
  `registration_status_changed` audit events and no inventory-count changes.
- Defined Stage B activation separately because it must be time-gated:
  `registration_open` -> `active` only inside the auction window.
- Defined later outcome transitions separately: `active` -> `sold` / `passed_in`, plus withdrawn.
- Defined packaging/operating ownership: lifecycle mutations cannot change starting bid, reserve
  price, auction window, media, documents, location, governance, highlights, unit definitions, or
  wizard `stepData`.
- Identified a legacy ownership risk: the packaging wizard currently exposes `scheduled` and
  `active`; live Auction activation should move to the operating layer after publish.
- Defined Auction dashboard, public merchandising, browser/DB proof, field-ownership, and failure
  requirements.
Remaining risks:
- This is a design-only slice. No schema migration or Auction lifecycle mutation has been
  implemented yet.
- Edit-published compatibility must ensure packaging saves cannot reset a live Auction lifecycle
  status.
- Bidder registrations, proof-of-funds/FICA readiness, terms acceptance, and registration deposits
  still need a future canonical model.
- Failed Sale/Rental operating mutation no-false-success proof remains outstanding.
- The existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Implement Auction Stage A: extend the canonical status enum with `registration_open`, update
  schema/types/sanitizers/tests, add Auction operating readback and registration open/rollback, then
  browser-proof lifecycle, public language, and field ownership.
Commit hash/tag: This entry will be included in `docs(dle): design auction operating lifecycle`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Auction Registration Open/Rollback Operating Mutation

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Implement and browser-proof Auction Stage A as a distinct lot lifecycle mutation without
reusing Sale/Rental count semantics or allowing packaging edits to activate a live Auction.
Files changed:
- server/migrations/0069_add_auction_registration_open_status.sql
- drizzle/schema/developments.ts
- client/src/hooks/useDevelopmentWizard.ts
- client/src/lib/developmentSubmitPayload.ts
- server/services/developmentService.ts
- server/services/developmentOperatingEventsService.ts
- server/developerRouter.ts
- client/src/components/developer/Overview.tsx
- client/src/components/developer/Overview.test.ts
- client/src/components/development-wizard/phases/UnitTypesPhase.tsx
- client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx
- client/src/pages/DevelopmentDetail.tsx
- client/src/pages/DevelopmentDetail.test.ts
- server/services/__tests__/developmentOperatingEventsService.test.ts
- e2e/dle/auction-operating-registration.spec.ts
- docs/dle/evidence/2026-06-04/qa-dle-auction-operating-registration-open.png
- docs/dle/evidence/2026-06-04/qa-dle-auction-operating-registration-closed.png
- docs/dle/evidence/2026-06-04/qa-dle-auction-operating-public-registration.png
- docs/dle/evidence/2026-06-04/qa-dle-auction-operating-search-language.png
- docs/dle/AUCTION_OPERATING_LIFECYCLE_DESIGN.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Local DB migration:
- Command: `bash -lc 'source ~/.nvm/nvm.sh && pnpm db:migrate:local'`
- Result: Passed. Applied `0069_add_auction_registration_open_status.sql` to
  `127.0.0.1:3306/listify_local`; `db:verify:distribution` passed.
Focused tests run:
- Command:
  `bash -lc 'source ~/.nvm/nvm.sh && SKIP_DB_INIT=1 pnpm vitest run server/services/__tests__/developmentOperatingEventsService.test.ts client/src/components/developer/Overview.test.ts client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx client/src/pages/DevelopmentDetail.test.ts'`
- Result: Passed. 4 test files, 37 tests.
Focused browser proof run:
- Command:
  `bash -lc 'source ~/.nvm/nvm.sh && PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/auction-operating-registration.spec.ts --project="Desktop Chrome" --workers=1'`
- Result: Passed. 1 test file, 1 browser test.
pnpm run check:
- Passed with `bash -lc 'source ~/.nvm/nvm.sh && pnpm run check'`.
git diff --check:
- Passed after this log update.
Proof and fixes:
- Extended canonical `unit_types.auction_status` with `registration_open` through schema, SQL
  migration, wizard/submit types, and persistence sanitizer compatibility.
- Added Auction registration readiness validation for starting bid, reserve range, future auction
  start, and valid auction window.
- Added Auction-only operating inventory readback via `developer.getAuctionOperatingInventory`.
- Added Auction-only registration lifecycle mutation via `developer.transitionAuctionRegistration`.
- Opening registration atomically updates only `unit_types.auction_status` from `scheduled` to
  `registration_open` and writes `registration_status_changed`.
- Closing registration atomically moves `registration_open` back to `scheduled` with the reverse
  event.
- Auction lifecycle mutations do not change available/reserved counts or development aggregates.
- Added an Auction-only `Auction Lots` dashboard panel showing current lifecycle, starting bid,
  internal reserve context, auction window, Open Registration, and Close Registration.
- The Auction dashboard does not expose Sale Reserve or Rental Hold controls and does not claim a
  fictional registered-bidder count.
- Corrected packaging/operating ownership in Unit Types: Auction lifecycle is now read-only there,
  new lots remain Scheduled, and live changes are directed to the developer dashboard.
- Public Auction unit merchandising now shows `Registration open` when the canonical lot lifecycle
  is open.
- Browser/DB proof verified open/rollback events, transaction type, lot ID, statuses, null quantity
  deltas, no count mutation, stable bids/reserve/window/media/documents/location/governance/
  highlights/unit definitions, public Registration-open language, and Auction search pricing.
Manual flows verified:
- Developer dashboard Auction registration open/rollback against local frontend `:3009`, backend
  `:5000`, and `listify_local`.
- Published Auction public detail during registration-open lifecycle.
- Auction search-card price language after registration opened.
Remaining risks:
- Failed Auction lifecycle write no-false-success UX is not yet browser-proven.
- Failed Sale/Rental operating mutation no-false-success proof remains outstanding.
- Time-gated `registration_open` -> `active` is not implemented.
- Sold, passed-in, and withdrawn outcome mutations are not implemented.
- Bidder registrations, proof-of-funds/FICA readiness, terms acceptance, and registration deposits
  still need a future canonical model.
- Canonical wizard workflow state should be added to a future operating field-ownership fixture.
- The existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Browser-proof failed Sale/Rental/Auction operating mutations do not claim success, then implement
  time-gated Auction activation.
Commit hash/tag: This entry will be included in `feat(dle): add auction registration operations`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-04 - Latest Checkpoint Pointer

Latest completed DLE operating checkpoint in this worktree:

- `test(dle): prove operating mutation failure handling`
- `feat(dle): add auction activation operations` (pending commit in this slice)

Do not follow the older stale recommendation above. Failed Sale/Rental/Auction operating mutation
no-false-success proof is complete, and Auction time-gated activation is implemented and
browser-proven in this slice.

Next recommended slice:
- Design the outcome layer before coding: Sale sold, Rental let, Auction sold/passed-in/withdrawn,
  public availability impact, lead-stage impact, and distribution/referral impact.

## 2026-06-04 - Operating Outcome Layer Design

Date: 2026-06-04
Branch: refine/homepage-phase1-clarity-trust
Goal: Document the transaction-first outcome contract before implementing Sale sold, Rental let, or
Auction sold/passed-in/withdrawn mutations.
Files changed:
- docs/dle/OPERATING_OUTCOME_LAYER_DESIGN.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm run check` passed.
- `git diff --check` passed.
- `git status --short` reviewed; unrelated homepage/evidence/playwright dirty files were not
  staged.
Manual flows verified:
- None. This is a design-only slice with no runtime behavior changes.
Design decisions:
- Outcomes are commercial commitments, not packaging edits or generic status toggles.
- Outcome mutations must use operating endpoints, verify ownership and transaction type server-side,
  validate current state, update a current-state projection, and write a DLE operating event in the
  same transaction.
- Event history is not enough as the current-state source of truth.
- Sale sold and Rental let can use current unit-type availability/held projections for the first
  narrow mutation, but inferred sold/let counts must not be treated as canonical reporting.
- `reserved_units` must not be reused for sold units, let units, bidder counts, auction
  registrations, or passed-in outcomes.
- Auction outcomes should use canonical `unit_types.auction_status` values: `sold`, `passed_in`,
  and `withdrawn`; `Sold at auction` is a display label, not the stored status.
- Public cards, unit cards, dashboard actions, lead labels, admin review, and distribution/referral
  handoff all need transaction-native outcome semantics.
Remaining risks:
- No Sale sold, Rental let, or Auction outcome mutation has been implemented yet.
- No explicit `sold_units` or `let_units` projection exists on `unit_types`.
- `development_units.status` exists but the current DLE operating surface is unit-type oriented.
- Lead stages and funnel labels remain sale-shaped underneath transaction-native overlays.
- Distribution/referral outcome automation still needs a separate handoff contract.
- The existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Implement Sale sold outcome from reserved inventory first, with browser proof for event readback,
  no false success, field ownership, and Sale-native public availability language.
Commit hash/tag: This entry will be included in `docs(dle): design operating outcome layer`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Sale Sold Operating Outcome

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Implement the first Sale outcome mutation by moving reserved Sale inventory to sold without
rewriting packaging fields or enabling autosave.
Files changed:
- server/services/developmentOperatingEventsService.ts
- server/developerRouter.ts
- client/src/components/developer/Overview.tsx
- server/services/__tests__/developmentOperatingEventsService.test.ts
- e2e/dle/sale-operating-reservation.spec.ts
- e2e/dle/operating-mutation-failure-trust.spec.ts
- docs/dle/evidence/2026-06-04/qa-dle-sale-operating-reserve.png
- docs/dle/evidence/2026-06-04/qa-dle-sale-operating-sold.png
- docs/dle/evidence/2026-06-04/qa-dle-sale-operating-release.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-failed-sale-no-false-success.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-failed-sale-sold-no-false-success.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-failed-rental-no-false-success.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-failed-auction-no-false-success.png
- docs/dle/OPERATING_OUTCOME_LAYER_DESIGN.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md
- docs/dle/SALE_OPERATING_STATUS_MUTATION_DESIGN.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `SKIP_DB_INIT=1 pnpm vitest run server/services/__tests__/developmentOperatingEventsService.test.ts client/src/components/developer/Overview.test.ts` passed.
- `pnpm run check` passed before browser proof.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/sale-operating-reservation.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/operating-mutation-failure-trust.spec.ts --project="Desktop Chrome" --workers=1` passed.
- Final `pnpm run check` passed.
- Final `git diff --check` passed.
- `git status --short` reviewed; unrelated homepage/evidence/playwright dirty files were not
  staged.
Manual flows verified:
- Local frontend `:3009`, backend `:5000`, and `listify_local`.
- Sale dashboard reserve -> mark sold -> release flow.
- Sale operating history readback for `available` -> `reserved`, `reserved` -> `sold`, and
  `reserved` -> `available`.
- Stale `Mark Sold` failure shows backend truth, shows no success toast, and writes no event.
Proof and fixes:
- Added `developer.markSaleUnitTypeSold`.
- The mutation requires owned Sale development, active unit type, and `reserved_units > 0`.
- The mutation decrements only `unit_types.reserved_units`; `available_units` remains unchanged for
  reserved-to-sold because public availability was already reduced at reservation time.
- The mutation refreshes `developments.available_units` from active unit types and writes
  `inventory_status_changed` with `reserved` -> `sold`, `quantity_delta = 0`.
- The dashboard shows a Sale-only `Mark Sold` action and a `sold projection` derived from
  `total_units - available_units - reserved_units`.
- Failed `Mark Sold` refetches backend truth and does not claim success.
Remaining risks:
- Sale sold count is still an inferred dashboard projection, not an explicit canonical
  `sold_units` column.
- No lead-stage conversion or distribution/referral deal outcome is automated.
- Rental let and Auction sold/passed-in/withdrawn outcomes remain future slices.
- The existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Implement Rental let outcome from held inventory with Rental-native dashboard copy, event
  readback, no false success proof, and field-ownership proof.
Commit hash/tag: This entry will be included in `feat(dle): add sale sold outcome`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Rental Let Operating Outcome

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Implement the first Rental outcome mutation by moving held Rental inventory to let without
rewriting packaging fields or enabling autosave.
Files changed:
- server/services/developmentOperatingEventsService.ts
- server/developerRouter.ts
- client/src/components/developer/Overview.tsx
- server/services/__tests__/developmentOperatingEventsService.test.ts
- e2e/dle/rental-operating-hold.spec.ts
- e2e/dle/operating-mutation-failure-trust.spec.ts
- docs/dle/evidence/2026-06-04/qa-dle-rental-operating-hold.png
- docs/dle/evidence/2026-06-04/qa-dle-rental-operating-let.png
- docs/dle/evidence/2026-06-04/qa-dle-rental-operating-release.png
- docs/dle/evidence/2026-06-04/qa-dle-rental-operating-public-language.png
- docs/dle/evidence/2026-06-04/qa-dle-rental-operating-search-language.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-failed-rental-no-false-success.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-failed-rental-let-no-false-success.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-failed-sale-no-false-success.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-failed-sale-sold-no-false-success.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-failed-auction-no-false-success.png
- docs/dle/OPERATING_OUTCOME_LAYER_DESIGN.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md
- docs/dle/RENTAL_OPERATING_STATUS_MUTATION_DESIGN.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `SKIP_DB_INIT=1 pnpm vitest run server/services/__tests__/developmentOperatingEventsService.test.ts client/src/components/developer/Overview.test.ts` passed.
- `pnpm run check` passed before browser proof.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/rental-operating-hold.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/operating-mutation-failure-trust.spec.ts --project="Desktop Chrome" --workers=1` passed.
- Final `pnpm run check` passed.
- Final `git diff --check` passed.
- `git status --short` reviewed; unrelated homepage/evidence/playwright dirty files were not
  staged.
Manual flows verified:
- Local frontend `:3009`, backend `:5000`, and `listify_local`.
- Rental dashboard hold -> mark let -> release flow.
- Rental operating history readback for `available` -> `held`, `held` -> `let`, and
  `held` -> `available`.
- Stale `Mark Let` failure shows backend truth, shows no success toast, and writes no event.
- Rental public detail and search language remain Rental-native after the operating update.
Proof and fixes:
- Added `developer.markRentalUnitTypeLet`.
- The mutation requires owned Rental development, active unit type, and `reserved_units > 0` as the
  current held-count projection.
- The mutation decrements only `unit_types.reserved_units`; `available_units` remains unchanged for
  held-to-let because public availability was already reduced at hold time.
- The mutation refreshes `developments.available_units` from active unit types and writes
  `inventory_status_changed` with `held` -> `let`, `quantity_delta = 0`.
- The dashboard shows a Rental-only `Mark Let` action and a `let projection` derived from
  `total_units - available_units - reserved_units`.
- Failed `Mark Let` refetches backend truth and does not claim success.
Remaining risks:
- Rental let count is still an inferred dashboard projection, not an explicit canonical
  `let_units` column.
- No application pipeline, lease document workflow, lead-stage conversion, or distribution/referral
  deal outcome is automated.
- Auction sold/passed-in/withdrawn outcomes remain future slices.
- The existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Implement Auction sold/passed-in/withdrawn outcomes from the active/non-final lifecycle with
  Auction-native dashboard copy, event readback, no false success proof, public outcome language,
  and field-ownership proof.
Commit hash/tag: This entry will be included in `feat(dle): add rental let outcome`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Auction Outcome Operating Mutation

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Implement Auction sold, passed-in, and withdrawn operating outcomes from the canonical
Auction lot lifecycle without rewriting packaging fields or enabling autosave.
Files changed:
- server/services/developmentOperatingEventsService.ts
- server/developerRouter.ts
- client/src/components/developer/Overview.tsx
- server/services/__tests__/developmentOperatingEventsService.test.ts
- e2e/dle/auction-operating-outcomes.spec.ts
- e2e/dle/operating-mutation-failure-trust.spec.ts
- docs/dle/evidence/2026-06-04/qa-dle-auction-operating-outcomes-dashboard.png
- docs/dle/evidence/2026-06-04/qa-dle-auction-operating-outcomes-public.png
- docs/dle/evidence/2026-06-04/qa-dle-auction-operating-outcomes-search.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-failed-auction-sold-no-false-success.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-failed-auction-no-false-success.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-failed-rental-let-no-false-success.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-failed-rental-no-false-success.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-failed-sale-no-false-success.png
- docs/dle/evidence/2026-06-04/qa-dle-operating-failed-sale-sold-no-false-success.png
- docs/dle/OPERATING_OUTCOME_LAYER_DESIGN.md
- docs/dle/AUCTION_OPERATING_LIFECYCLE_DESIGN.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `SKIP_DB_INIT=1 pnpm vitest run server/services/__tests__/developmentOperatingEventsService.test.ts client/src/components/developer/Overview.test.ts client/src/pages/DevelopmentDetail.test.ts` passed.
- `pnpm run check` passed before browser proof.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/auction-operating-outcomes.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/operating-mutation-failure-trust.spec.ts --project="Desktop Chrome" --workers=1` passed after fixing the browser selectors to match Sale generic and Auction lot-aware button labels.
- Final focused tests, `pnpm run check`, and `git diff --check` passed.
- `git status --short` reviewed; unrelated homepage/evidence/playwright dirty files were not
  staged.
Manual flows verified:
- Local frontend `:3009`, backend `:5000`, and `listify_local`.
- Auction dashboard active lot -> sold outcome.
- Auction dashboard active lot -> passed-in outcome.
- Auction dashboard registration-open lot -> withdrawn outcome.
- Auction operating history readback for three `auction_outcome_recorded` events.
- Stale Auction `Mark Sold` failure shows backend truth, shows no success toast, and writes no
  event.
- Auction public detail and search language remain Auction-native after outcomes.
Proof and fixes:
- Added `developer.recordAuctionLotOutcome`.
- The mutation requires owned Auction development, active unit type, and transaction type
  `auction`.
- `sold` and `passed_in` require current `unit_types.auction_status = active`.
- `withdrawn` is allowed only from non-final Auction statuses.
- The mutation updates only `unit_types.auction_status`; it does not mutate counts, starting bid,
  reserve price, auction window, unit size, parking, media, documents, location, governance,
  highlights, unit definitions, or canonical wizard `stepData`.
- The mutation writes `auction_outcome_recorded` with before/after lot snapshots and outcome
  metadata.
- The dashboard shows Auction-native `Mark Sold`, `Mark Passed In`, and `Withdraw` actions and
  refetches Auction inventory, operating events, developments, and funnel KPIs after success or
  failure.
Remaining risks:
- No bidder-registration record, winning-bidder record, deposit/payment workflow, reserve
  validation, or post-auction negotiation workflow is automated.
- No lead-stage conversion or distribution/referral deal outcome is automated.
- Sale sold and Rental let counts remain inferred projections until explicit reporting fields are
  designed.
- The existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Design lead-stage synchronization and distribution/referral outcome handoff before automating
  cross-surface side effects from Sale sold, Rental let, or Auction outcomes.
Commit hash/tag: This entry will be included in `feat(dle): add auction outcome operations`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Outcome Handoff Contract

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Document the explicit handoff contract for lead-stage synchronization and
distribution/referral outcomes before automating side effects from Sale sold, Rental let, or Auction
outcomes.
Files changed:
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OPERATING_OUTCOME_LAYER_DESIGN.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `git diff --check` passed.
- `pnpm run check` passed.
- `git status --short` reviewed; unrelated homepage/evidence/playwright dirty files were not
  staged.
Manual flows verified:
- None. This is a documentation-only contract slice with no runtime behavior changes.
Design decisions:
- Inventory outcomes remain inventory-only by default.
- Lead synchronization must be explicit, must use the current shared funnel guardrails, and must
  display transaction-native labels for Sale, Rental, and Auction.
- Distribution/referral handoff must be explicit and must not bypass distribution deal-stage,
  document, payout milestone, manager review, or commission readiness guardrails.
- Failed downstream handoff should not roll back inventory truth unless a later bundled transaction
  contract explicitly requires it.
- DLE operating events should link outcome, lead-stage, and distribution handoff events without
  treating metadata alone as the current-state source of truth.
Remaining risks:
- No lead-stage sync mutation is implemented yet.
- No distribution/referral handoff mutation is implemented yet.
- Sale sold and Rental let counts remain inferred projections until explicit reporting fields are
  designed.
- The existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Implement explicit lead-stage synchronization first, requiring a selected `leadId`, writing
  `lead_stage_changed` DLE events and lead activities, preserving transaction-native labels, and
  leaving distribution deal/commission automation for a later contract-backed slice.
Commit hash/tag: This entry will be included in `docs(dle): add outcome handoff contract`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Lead Outcome Sync Operating Handoff

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Implement the first explicit selected-lead outcome synchronization slice before any
distribution/referral or commission handoff automation.
Files changed:
- server/services/developerFunnelService.ts
- server/services/developmentOperatingEventsService.ts
- server/developerRouter.ts
- client/src/components/developer/LeadsManager.tsx
- server/services/__tests__/developmentOperatingEventsService.test.ts
- e2e/dle/lead-outcome-sync.spec.ts
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/OPERATING_OUTCOME_LAYER_DESIGN.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/OPERATING_STATUS_AUDIT_CONTRACT.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-04/qa-dle-lead-outcome-sync-sale-sold.png
- docs/dle/evidence/2026-06-04/qa-dle-lead-outcome-sync-invalid-no-false-success.png
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/lead-outcome-sync.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `SKIP_DB_INIT=1 pnpm vitest run server/services/__tests__/developmentOperatingEventsService.test.ts` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
- `git status --short` reviewed; unrelated homepage/evidence/playwright dirty files were not
  staged.
Manual flows verified:
- Local frontend `:3009`, backend `:5000`, and `listify_local`.
- Developer lead detail panel shows transaction-native Sale `Sold` Outcome Sync.
- Selected Sale deal-stage lead syncs to `closed_won`, updates `leads.status`/`funnelStage`, writes
  a `lead_stage_changed` DLE operating event, and logs a local lead activity.
- Unsafe direct close from `qualified` to `closed_won` is rejected by the backend, shows no success
  toast, leaves the lead projection unchanged, and writes no extra operating event.
Proof and fixes:
- Added `developer.syncLeadOutcome`.
- The service derives transaction type from the owned development and requires the selected lead to
  belong to the development.
- Lead sync uses shared funnel transition guardrails instead of bypassing the canonical lead model.
- Sale sold, Rental let, Auction sold, Auction passed-in, and Auction withdrawn outcome mappings
  are defined; Auction passed-in/withdrawn require a note.
- The mutation updates only the selected lead and audit/activity rows; it does not mutate
  inventory, distribution deals, commission state, media, location, governance, highlights, pricing,
  unit definitions, or wizard `stepData`.
- Fixed the Leads Control Center query limit to match the router maximum of 200, avoiding false
  empty-state output from rejected tRPC queries.
- Normalized shared lead timestamp writes to MySQL-compatible timestamp strings.
- Used the local `lead_activities.activityType` shape for the activity audit row because the local
  QA database table is older than the Drizzle schema projection.
Remaining risks:
- Browser proof currently covers the Sale selected-lead path and unsafe direct close rejection.
  Rental and Auction outcome sync mappings are covered by helper tests but still need browser proof
  when those flows become active UI priorities.
- Distribution/referral deal handoff is still intentionally not automated.
- Commission readiness, documents, payout milestones, and manager review remain owned by
  distribution services.
- Local `lead_activities` schema differs from the current Drizzle schema (`activityType` vs `type`,
  no `userId`); this slice used a raw insert to preserve local QA compatibility without adding a
  migration.
- Sale sold and Rental let counts remain inferred projections until explicit reporting fields are
  designed.
- The existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Design and implement the first explicit distribution/referral handoff slice from
  `docs/dle/OUTCOME_HANDOFF_CONTRACT.md`, requiring a selected `distributionDealId` and preserving
  distribution deal-stage, document, payout milestone, manager review, and commission guardrails.
Commit hash/tag: This entry will be included in `feat(dle): add lead outcome sync`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Distribution Handoff Review Bridge

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Implement the first explicit distribution/referral handoff bridge from the DLE operating
layer without bypassing distribution deal-stage, document, manager, milestone, or commission
guardrails.
Files changed:
- server/services/developmentOperatingEventsService.ts
- server/developerRouter.ts
- client/src/components/developer/Overview.tsx
- server/services/__tests__/developmentOperatingEventsService.test.ts
- e2e/dle/distribution-handoff.spec.ts
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-05/qa-dle-distribution-handoff-review.png
Tests run:
- `pnpm vitest run server/services/__tests__/developmentOperatingEventsService.test.ts` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/distribution-handoff.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual flows verified:
- Local frontend `:3009`, backend `:5000`, and `listify_local`.
- Developer dashboard Distribution Impact panel lists recent referral deals for the selected
  development.
- Developer can open `Request Review`, add a note, and submit an explicit handoff request.
- Success appears only after the backend mutation succeeds.
- Operating history shows a `Referral handoff` DLE event.
Proof and fixes:
- Added `developer.createDistributionHandoff`.
- Added service guardrails for `link_only`, `request_review`, and guarded
  `stage_transition_requested` handoff actions.
- The service verifies owned development scope, selected distribution deal ownership, optional lead
  ownership, and optional source operating event ownership.
- A handoff writes both a `distribution_deal_events` note and a
  `distribution_handoff_created` DLE operating event in one transaction.
- Browser/database proof confirms `distribution_deals.current_stage` remains `contract_signed` and
  `commission_status` remains `not_ready` after the handoff review request.
- Direct `commission_pending` and `commission_paid` stage request shortcuts are rejected by helper
  guardrails.
- The mutation does not mutate inventory, leads, public packaging, media, location, governance,
  pricing, unit definitions, wizard `stepData`, distribution deal stage, or commission state.
Remaining risks:
- This is a review bridge only; it does not implement manager-side approval workflow or stage
  transition from the DLE surface.
- Future stage movement must remain inside distribution services and reuse their document, manager,
  milestone, and commission readiness checks.
- The browser proof covers the Sale/referral dashboard handoff path; Rental and Auction may need
  transaction-specific distribution semantics before claiming full referral maturity.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Add manager/developer review readback around handoff requests or continue operating-layer
  reporting without allowing DLE to silently advance distribution stages or commission state.
Commit hash/tag: This entry will be included in `feat(dle): add distribution handoff review`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Distribution Handoff Queue Readback

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Make distribution handoff review requests visible on the referral deal row after success,
without turning DLE readback into distribution deal-stage or commission automation.
Files changed:
- server/distributionRouter.ts
- client/src/components/developer/Overview.tsx
- e2e/dle/distribution-handoff.spec.ts
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-05/qa-dle-distribution-handoff-review-readback.png
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/distribution-handoff.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual flows verified:
- Local frontend `:3009`, backend `:5000`, and `listify_local`.
- Developer dashboard Distribution Impact panel lists the selected development's referral deals.
- After `Request Review` succeeds, the same referral deal row shows latest DLE handoff readback:
  `Review requested`, note text, and timestamp.
- The operating history still shows the `Referral handoff` DLE event.
Proof and fixes:
- Enriched `distribution.developer.listDeals` with `latestDleHandoff` from
  `development_operating_events` for `distribution_handoff_created` events.
- The readback is derived from DLE operating events and does not mutate `distribution_deals`.
- Browser/database proof still confirms `distribution_deals.current_stage` remains
  `contract_signed` and `commission_status` remains `not_ready` after review request.
- Added row-level Playwright assertions for the readback block and note text.
Remaining risks:
- This is developer-side readback only; manager-side review handling is still not implemented.
- Future stage movement must remain inside distribution services and reuse their document, manager,
  milestone, and commission readiness checks.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Add manager-side handoff review visibility or continue transaction-engine product experience work,
  while keeping DLE readback separate from deal-stage and commission mutation.
Commit hash/tag: This entry will be included in `feat(dle): show distribution handoff readback`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Manager Distribution Handoff Readback

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Make developer-created DLE handoff review requests visible to distribution managers on their
deal review list without creating a DLE-owned stage or commission action.
Files changed:
- server/distributionRouter.ts
- client/src/pages/distribution/ManagerDevelopmentDealsPage.tsx
- e2e/dle/distribution-handoff.spec.ts
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-05/qa-dle-distribution-handoff-review-readback.png
- docs/dle/evidence/2026-06-05/qa-dle-distribution-handoff-manager-readback.png
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/distribution-handoff.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `pnpm run check` passed before docs; rerun after docs before commit.
- `git diff --check` pending final hygiene.
Manual flows verified:
- Local frontend `:3009`, backend `:5000`, and `listify_local`.
- Developer dashboard sends a review handoff and reads it back on the referral deal row.
- Distribution manager deal list reads back the same latest DLE handoff status, note, and timestamp.
- The handoff remains visible as review context, not as a stage transition control.
Proof and fixes:
- Added shared distribution-router readback helper for latest `distribution_handoff_created` DLE
  event by distribution deal id.
- Reused the helper in developer and manager deal list responses.
- Manager deal rows now show `Developer review requested` and the developer note when a handoff
  exists.
- Browser/database proof still confirms `distribution_deals.current_stage` remains
  `contract_signed` and `commission_status` remains `not_ready` after the handoff request.
Remaining risks:
- Manager-side acknowledgement/processing is not implemented; this slice is readback only.
- Future acknowledgement or transition actions must stay separate from DLE readback and must reuse
  distribution service guardrails for document, manager, milestone, and commission readiness.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Add an explicit manager acknowledgement action for handoff notes, or shift to transaction-engine
  product experience work, without allowing DLE readback to mutate deal stage or commission state.
Commit hash/tag: This entry will be included in `feat(dle): show manager handoff readback`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Manager Handoff Acknowledgement

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Let distribution managers acknowledge DLE referral handoff review requests as audit-only
notes, then show that acknowledgement back to both manager and developer surfaces without changing
deal stage or commission state.
Files changed:
- server/distributionRouter.ts
- client/src/pages/distribution/ManagerDevelopmentDealsPage.tsx
- client/src/components/developer/Overview.tsx
- e2e/dle/distribution-handoff.spec.ts
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-05/qa-dle-distribution-handoff-manager-acknowledged.png
- docs/dle/evidence/2026-06-05/qa-dle-distribution-handoff-developer-acknowledged.png
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/distribution-handoff.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual flows verified:
- Local frontend `:3009`, backend `:5000`, and `listify_local`.
- Developer dashboard sends a referral handoff review request and reads it back on the selected
  referral deal row.
- Distribution manager deal list reads back the latest DLE handoff, then acknowledges it.
- Manager row reads back `Acknowledged`, timestamp, and acknowledgement note.
- Developer Distribution Impact row reads back `Manager acknowledged`, timestamp, and
  acknowledgement note.
- Browser/database proof confirms `distribution_deals.current_stage` remains `contract_signed` and
  `commission_status` remains `not_ready`.
Proof and fixes:
- Added `distribution.manager.acknowledgeDleHandoff` as a manager-scoped audit-only mutation.
- The mutation validates that the selected DLE handoff event belongs to the selected distribution
  deal and writes a `distribution_deal_events` note with source
  `distribution.manager.acknowledgeDleHandoff`.
- Extended latest handoff readback to include acknowledgement timestamp, actor id, and note.
- Manager deal rows can acknowledge the latest DLE handoff and read back `Acknowledged`.
- Developer Distribution Impact rows read back `Manager acknowledged`.
- Browser proof generated manager and developer acknowledgement screenshots under
  `docs/dle/evidence/2026-06-05/`.
Remaining risks:
- Acknowledgement does not process or advance the deal; future processing must remain inside
  distribution service guardrails.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- After this passes, decide whether to add manager processing actions behind distribution
  guardrails or move back to transaction-engine product experience work.
Commit hash/tag: This entry will be included in `feat(dle): acknowledge manager handoffs`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Explicit Sale/Rental Outcome Counters

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Replace temporary inferred Sale/Rental sold/let display projections with explicit
unit-type outcome counters so operating reports are not derived from
`total_units - available_units - reserved_units`.
Files changed:
- drizzle/schema/developments.ts
- server/migrations/0070_add_unit_outcome_counters.sql
- server/services/developmentService.ts
- server/services/developmentOperatingEventsService.ts
- client/src/components/developer/Overview.tsx
- e2e/dle/sale-operating-reservation.spec.ts
- e2e/dle/rental-operating-hold.spec.ts
- e2e/dle/operating-mutation-failure-trust.spec.ts
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OPERATING_OUTCOME_LAYER_DESIGN.md
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
- Refreshed focused operating evidence under `docs/dle/evidence/2026-06-04/`
Tests run:
- `pnpm db:migrate:local` passed after sandbox elevation; local target confirmed
  `127.0.0.1:3306/listify_local`, migration `0070_add_unit_outcome_counters.sql` executed, and
  `db:verify:distribution` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/sale-operating-reservation.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/rental-operating-hold.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/operating-mutation-failure-trust.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `pnpm run check` passed.
- `git diff --check` pending final hygiene.
Manual flows verified:
- Local frontend `:3009`, backend `:5000`, and `listify_local`.
- Sale dashboard reads explicit `sold_units` as `sold`, increments it on `Mark Sold`, and preserves
  available/reserved behavior.
- Rental dashboard reads explicit `let_units` as `let`, increments it on `Mark Let`, and preserves
  available/held behavior.
- Failed Sale/Rental mutations now refresh backend truth without fabricating sold/let counts from
  stale available/reserved count edits.
Proof and fixes:
- Added `unit_types.sold_units` and `unit_types.let_units` with migration backfill by parent
  transaction type.
- New unit persistence initializes explicit counters from supplied values or from the legacy
  inferred remainder for first-time imported/seeded Sale/Rental unit inventory.
- Sale sold outcome decrements `reserved_units` and increments `sold_units` in the same
  transaction as the operating event.
- Rental let outcome decrements `reserved_units` and increments `let_units` in the same
  transaction as the operating event.
- Operating event snapshots and metadata now name the explicit outcome projection columns.
Remaining risks:
- Auction still uses lifecycle status per lot/type; bidder/outcome records remain future work if
  lot-level auction reporting becomes necessary.
- Direct-available Sale sold and Rental let remain future explicit outcome paths.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Continue transaction-engine product experience work or add direct-available sold/let outcome
  paths behind explicit confirmation and the same event/counter guardrails.
Commit hash/tag: This entry will be included in `feat(dle): add explicit outcome counters`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Direct Sale/Rental Outcome Transitions

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Let developers record a confirmed Sale sold or Rental let outcome directly from available
inventory while preserving transaction-first state truth, explicit counters, public availability,
and operating event audit history.
Files changed:
- server/services/developmentOperatingEventsService.ts
- server/developerRouter.ts
- client/src/components/developer/Overview.tsx
- e2e/dle/sale-operating-reservation.spec.ts
- e2e/dle/rental-operating-hold.spec.ts
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OPERATING_OUTCOME_LAYER_DESIGN.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm run check` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/sale-operating-reservation.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/rental-operating-hold.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `git diff --check` passed.
Manual flows verified:
- Local frontend `:3009`, backend `:5000`, and `listify_local`.
- Sale dashboard confirms direct sold from available inventory, refreshes `7 available, 1 reserved,
  4 sold`, and writes an `available` -> `sold` event with explicit `sold_units`.
- Rental dashboard confirms direct let from available inventory, refreshes `5 rentals available, 0
  held, 5 let`, and writes an `available` -> `let` event with explicit `let_units`.
Proof and fixes:
- `developer.markSaleUnitTypeSold` now accepts `source: reserved | available_direct`.
- Reserved Sale outcomes keep existing `reserved` -> `sold` behavior and leave public availability
  unchanged.
- Direct Sale outcomes require available stock, decrement `available_units`, increment
  `sold_units`, refresh aggregate development availability, and write `available` -> `sold` with
  `quantity_delta = -1`.
- `developer.markRentalUnitTypeLet` now accepts `source: held | available_direct`.
- Held Rental outcomes keep existing `held` -> `let` behavior and leave public availability
  unchanged.
- Direct Rental outcomes require available stock, decrement `available_units`, increment
  `let_units`, refresh aggregate development availability, and write `available` -> `let` with
  `quantity_delta = -1`.
- Developer dashboard exposes separate `Direct Sold` and `Direct Let` actions with confirmation
  copy that public availability will reduce.
Remaining risks:
- Auction still uses lifecycle status per lot/type; bidder/outcome records remain future work if
  lot-level auction reporting becomes necessary.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- After focused proof passes, continue transaction-engine product experience work or strengthen
  public availability copy around live sold/let outcome states.
Commit hash/tag: This entry will be included in `feat(dle): support direct outcome transitions`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Unit Detail Transaction-Native Merchandising

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the public development unit-detail page speak the correct commercial language for Sale,
Rental, and Auction before a buyer, renter, or bidder opens the lead path.
Files changed:
- client/src/pages/DevelopmentUnitDetailPage.tsx
- client/src/pages/DevelopmentUnitDetailPage.test.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/DevelopmentUnitDetailPage.test.ts` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual flows verified:
- Focused helper proof only; no browser screenshots in this slice.
Proof and fixes:
- Sale unit-detail availability keeps existing `Only X left`, `X available`, `Currently sold out`,
  and `Availability on request` behavior.
- Rental unit-detail availability now uses `Only X rentals available`, `X rentals available`,
  `Fully let`, and `Rental availability on request`.
- Auction unit-detail availability now uses `Only X lots open`, `X lots open`,
  `Registration closed`, `Auction availability on request`, and lifecycle outcome labels for sold,
  passed-in, and withdrawn lots.
- Unit-detail action copy now changes by transaction lane: Sale keeps affordability/sales copy,
  Rental uses rental pack/rental fit/leasing-team copy, and Auction uses bidder pack/bidder
  readiness/auction-team copy.
- Mobile unit-detail action labels now follow the same transaction lane instead of always showing
  sale-shaped `Enquire` / `Afford` copy.
Remaining risks:
- This is component-helper proof, not a full browser merchandising screenshot pass.
- Broader public development page sections and search-card merchandising still need continued
  product audit.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Continue public merchandising with search card/result-card outcome language or run a browser
  screenshot proof for Rental/Auction unit-detail pages.
Commit hash/tag: This entry will be included in `feat(dle): tailor unit detail merchandising`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Search Card Transaction Inventory Merchandising

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Make public development search cards carry transaction-native availability/outcome labels and
contact intent before users open the public page or lead form.
Files changed:
- shared/types.ts
- server/services/developmentDerivedListingService.ts
- server/services/__tests__/developmentDerivedListingService.test.ts
- client/src/pages/SearchResults.tsx
- client/src/components/property-results/ListingResultCard.tsx
- client/src/components/property-results/__tests__/ListingResultCard.test.tsx
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/property-results/__tests__/ListingResultCard.test.tsx server/services/__tests__/developmentDerivedListingService.test.ts` passed after rerun outside the sandbox because the first sandbox run hit local MySQL `EPERM`.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual flows verified:
- Focused component/service proof only; no browser screenshots in this slice.
Proof and fixes:
- `ListingResultCard` now accepts optional `totalUnits`, `availableUnits`, and `auctionStatus`.
- Development search cards now show transaction-native inventory labels: Sale available/sold out,
  Rental rentals available/fully let, and Auction registration/open/outcome labels.
- Development search card contact buttons now read `Contact Leasing Team` for Rental and
  `Contact Auction Team` for Auction while Sale keeps `Contact Developer`.
- Derived development search results now carry `totalUnits`, `availableUnits`, and `auctionStatus`
  from the unit inventory row into shared search-card results.
- `SearchResults` now passes those inventory fields into the rendered search result card.
Remaining risks:
- Existing grid-mode `PropertyCard` still uses its own normalization path; this slice covers the
  primary list-card path.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Browser-proof Rental/Auction search-card merchandising or continue deeper public page
  merchandising sections.
Commit hash/tag: This entry will be included in `feat(dle): show search card inventory intent`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Grid Card Transaction Inventory Merchandising

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Make public search grid cards preserve the same transaction-native development inventory,
pricing, and contact language as list-mode search cards.
Files changed:
- client/src/lib/developmentSearchCardMerchandising.ts
- client/src/components/property-results/ListingResultCard.tsx
- client/src/components/PropertyCard.tsx
- client/src/lib/normalizers.ts
- client/src/lib/normalizers.test.ts
- client/src/components/__tests__/PropertyCard.development-merchandising.test.tsx
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/property-results/__tests__/ListingResultCard.test.tsx client/src/lib/normalizers.test.ts client/src/components/__tests__/PropertyCard.development-merchandising.test.tsx` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual flows verified:
- Focused component/normalizer proof only; no browser screenshots in this slice.
Proof and fixes:
- Shared Sale/Rental/Auction search-card merchandising helpers now live in
  `client/src/lib/developmentSearchCardMerchandising.ts`.
- List-mode result cards and grid-mode property cards now use the same availability and contact
  labels.
- Grid-mode Rental development cards now render `Rent from`, rental availability, and
  `Contact Leasing Team`.
- Grid-mode Auction development cards now render `Bid from`, auction lifecycle/availability, and
  `Contact Auction Team`.
- `searchCardResultToPropertyCardProps` now carries `totalUnits`, `availableUnits`, and
  `auctionStatus` into `PropertyCard`.
Remaining risks:
- This is component-level proof; browser view-switch screenshots are still useful before calling
  search merchandising fully product-proven.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Browser-proof SearchResults grid/list switching for Sale, Rental, and Auction, or continue
  deeper public page merchandising sections.
Commit hash/tag: This entry will be included in `feat(dle): show grid card inventory intent`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Search Grid/List Browser Proof

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Browser-proof that Sale, Rental, and Auction search-result merchandising survives switching
between list and grid views.
Files changed:
- e2e/dle/search-grid-list-transaction-merchandising.spec.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/search-grid-list-transaction-merchandising.spec.ts --project="Desktop Chrome" --workers=1` passed after rerun outside the sandbox.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual/browser flows verified:
- Seeded one publish-ready Sale, Rental, and Auction development in `listify_local`.
- Sale search route showed `From`, `5 available`, and `Contact Developer` in list and grid modes.
- Rental search route showed `Rent from`, `2 rentals available`, and `Contact Leasing Team` in list
  and grid modes.
- Auction search route showed `Bid from`, `Registration open`, and `Contact Auction Team` in list
  and grid modes.
Proof and fixes:
- Added a deterministic Playwright spec that seeds transaction-lane developments through
  `developmentService`, publishes/approves them, and validates public search rendering through the
  actual route/query/view-toggle path.
- The first sandbox Playwright run failed before app assertions because Chromium could not launch
  under the Linux sandbox.
- The first unsandboxed app run caught fixture readiness gaps (`Description must be at least 50
  characters`, then `Add at least 3 highlights`); the fixture data now satisfies those publish gates.
- A single orphan seed from the first readiness failure was cleaned from `listify_local`; the spec
  now tracks created IDs before publish so cleanup still runs if publish readiness fails again.
Remaining risks:
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
- This proves search-result route merchandising, not deeper public page section layout.
Next recommended slice:
- Continue public development-page merchandising sections, or add a browser screenshot evidence pass
  for unit-detail/search cards now that the transaction wording is stable.
Commit hash/tag: This entry will be included in `test(dle): prove search card view switching`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Public Detail Commercial Pack Merchandising

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the public development detail page summarize the transaction-specific commercial pack
before users reach unit inventory or lead capture.
Files changed:
- client/src/pages/DevelopmentDetail.tsx
- client/src/pages/DevelopmentDetail.test.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/DevelopmentDetail.test.ts` passed.
- `pnpm run check` passed after adding explicit numeric inventory reducer typing.
- `git diff --check` passed.
Manual/browser flows verified:
- Focused helper/render code proof only; no browser screenshot in this slice.
Proof and fixes:
- Added `getDevelopmentDetailCommercialPack` as a pure transaction-aware helper.
- Sale public detail pages now surface a `Buyer Pack` summary for pricing, available homes, buyer
  readiness, ownership, and brochure access.
- Rental public detail pages now surface a `Rental Pack` summary for rent, rental availability,
  lease signals, renter readiness, and rental-pack access.
- Auction public detail pages now surface an `Auction Pack` summary for bid guidance, auction
  status, lots, bidder readiness, and auction-pack access.
- The commercial pack is rendered on the public detail page before available units, with CTA labels
  aligned to the transaction lane.
Remaining risks:
- Component/helper proof only; a browser screenshot pass would still be useful for visual spacing
  and mobile layout.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Browser-proof the public detail commercial pack for Rental and Auction, or continue refining the
  wizard-side guided packaging experience.
Commit hash/tag: This entry will be included in `feat(dle): show public detail commercial pack`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-05 - Public Detail Commercial Pack Browser Proof

Date: 2026-06-05
Branch: refine/homepage-phase1-clarity-trust
Goal: Browser-proof that Rental and Auction public development detail pages visibly render the new
transaction-specific commercial pack section on desktop and remain within the viewport on mobile.
Files changed:
- e2e/dle/public-detail-commercial-pack.spec.ts
- e2e/dle/rental-auction-public-merchandising.spec.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/public-detail-commercial-pack.spec.ts --project="Desktop Chrome" --workers=1` passed, including mobile viewport fit checks.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual/browser flows verified:
- Seeded a publish-ready Rental development through `developmentService`, opened its public detail
  page, and verified `Rental Pack`, `Lease path at a glance`, rent range, rental availability,
  deposit signal, document availability, `Check Rental Fit`, and `Download Rental Pack`.
- Seeded a publish-ready Auction development through `developmentService`, opened its public detail
  page, and verified `Auction Pack`, `Bidder path at a glance`, starting-bid range,
  registration/reserve signal, lot availability, document availability, `Check Bidder Readiness`,
  and `Download Auction Pack`.
- Switched the browser viewport to 390x844 and verified the Rental and Auction commercial pack
  sections stay within the viewport while their transaction-specific primary CTAs remain visible.
Proof and fixes:
- Added a narrow Playwright proof for the new commercial-pack section instead of overloading the
  broader public merchandising spec with search and lead capture.
- Updated the older Rental/Auction public merchandising helper to recognize transaction-native unit
  CTAs such as `Request Rental Details` and `Register Auction Interest`.
- Earlier attempts to extend the broad public merchandising spec confirmed the commercial pack was
  visible, but the full lead/search flow exceeded the useful timeout budget for this narrow slice.
Remaining risks:
- This browser proof validates text, route rendering, and basic mobile viewport fit, not screenshot
  diffing.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Continue with browser screenshot evidence for public detail mobile/desktop layout, or move to
  wizard-side guided packaging improvements for Rental and Auction.
Commit hash/tag: This entry will be included in `test(dle): prove public detail commercial pack`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-06 - Dashboard Pricing Health Browser Proof

Date: 2026-06-06
Branch: refine/homepage-phase1-clarity-trust
Goal: Browser-proof that the developer dashboard pricing-health panel makes transaction-specific
public-vs-live inventory alignment visible for Rental and Auction packages.
Files changed:
- e2e/dle/dashboard-pricing-health.spec.ts
- docs/dle/evidence/2026-06-06/qa-dle-dashboard-rental-pricing-health.png
- docs/dle/evidence/2026-06-06/qa-dle-dashboard-auction-pricing-health.png
- docs/dle/RECOVERY_LOG.md
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/dashboard-pricing-health.spec.ts --project="Desktop Chrome" --workers=1` passed after rerunning outside the sandbox because Chromium could not launch inside the restricted sandbox.
- `pnpm vitest run client/src/components/developer/Overview.test.ts` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual/browser flows verified:
- Seeded a publish-ready Rental development through `developmentService`, selected it in the
  developer dashboard, and verified `Rental pricing health`, `Aligned`, `Public rent range`,
  `Live unit rent range`, and matching `R13.5k - R15.5k / month` values.
- Seeded a publish-ready Auction development, deliberately drifted the public `startingBidFrom`
  mirror from the live lot starting bid, selected it in the developer dashboard, and verified
  `Auction bid health`, `Review needed`, `Public bid from`, `Live lot bid from`, `R800k`, and
  `R850k`.
- Captured screenshot evidence for both dashboard states.
Proof and fixes:
- Added a focused Playwright browser proof for the dashboard pricing-health panel added in the
  previous implementation slice.
- Proved both the happy aligned Rental state and the attention Auction drift state through the real
  developer dashboard, not only helper-level tests.
Remaining risks:
- This proof covers Rental and Auction dashboard pricing mirrors. Sale coverage remains in the
  component/helper tests unless a future browser slice needs parity evidence.
- The panel is read-only operating guidance; remediation still depends on follow-up edit/package
  workflows.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Continue toward guided packaging improvements in the wizard/dashboard, especially making
  transaction-specific remediation paths actionable when pricing health needs review.
Commit hash/tag: This entry will be included in `test(dle): prove dashboard pricing health`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-06 - Dashboard Pricing Health Remediation Path

Date: 2026-06-06
Branch: refine/homepage-phase1-clarity-trust
Goal: Turn dashboard pricing-health drift from a passive warning into a transaction-aware packaging
remediation path.
Files changed:
- client/src/components/developer/Overview.tsx
- client/src/components/developer/Overview.test.ts
- e2e/dle/dashboard-pricing-health.spec.ts
- docs/dle/evidence/2026-06-06/qa-dle-dashboard-rental-pricing-health.png
- docs/dle/evidence/2026-06-06/qa-dle-dashboard-auction-pricing-health.png
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/developer/Overview.test.ts` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/dashboard-pricing-health.spec.ts --project="Desktop Chrome" --workers=1` passed outside the sandbox.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual/browser flows verified:
- Rental aligned pricing health still shows the aligned rent-range state without a remediation CTA.
- Auction public-bid drift now shows `Review Auction Bids` inside the pricing-health panel.
- Clicking `Review Auction Bids` routes the developer to `/developer/create-development?id=<auctionId>`
  for the same development, preserving the transaction-first packaging path.
- Refreshed dashboard screenshot evidence captures the updated Rental and Auction pricing-health
  states.
Proof and fixes:
- Added transaction-native remediation labels and helper text to pricing-health output for Sale,
  Rental, and Auction drift states.
- Rendered the remediation block only when pricing health needs attention.
- Extended helper tests for Rental and Auction drift guidance.
- Extended the existing browser proof to verify the Auction CTA and route into the package editor.
Remaining risks:
- The CTA opens the package editor but does not yet deep-link to the exact pricing/unit step.
- The wizard still needs a transaction-aware "pricing health repair" landing state so the developer
  knows exactly what to align after navigation.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Add a focused package-editor landing cue for `?id=<developmentId>` pricing remediation, or add a
  supported query parameter that opens the relevant transaction pricing/unit step directly.
Commit hash/tag: This entry will be included in `feat(dle): guide pricing health remediation`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-06 - Pricing Remediation Editor Landing

Date: 2026-06-06
Branch: refine/homepage-phase1-clarity-trust
Goal: Make dashboard pricing-health remediation land inside the packaging editor with explicit
pricing intent and the correct unit-inventory step.
Files changed:
- client/src/components/developer/Overview.tsx
- client/src/components/development-wizard/DevelopmentWizard.tsx
- client/src/components/development-wizard/DevelopmentWizard.test.tsx
- client/src/components/wizard/WizardEngine.tsx
- e2e/dle/dashboard-pricing-health.spec.ts
- docs/dle/evidence/2026-06-06/qa-dle-dashboard-rental-pricing-health.png
- docs/dle/evidence/2026-06-06/qa-dle-dashboard-auction-pricing-health.png
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/developer/Overview.test.ts` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/dashboard-pricing-health.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual/browser flows verified:
- Auction dashboard pricing-health drift now routes to
  `/developer/create-development?id=<auctionId>&remediation=pricing`.
- The editor hydration respects the pricing remediation intent and lands on `unit_types` instead of
  the previously saved edit step.
- The wizard shell renders a `Pricing health review` cue explaining that the public pricing mirror
  must be aligned with live unit inventory before promotion, follow-up, or distribution.
- The browser proof verifies the dashboard CTA, the remediation query, the visible repair cue, and
  the `Unit Types` step.
Proof and fixes:
- Added a narrow `remediation=pricing` route intent from the developer dashboard.
- Added edit-mode hydration handling that prefers the `unit_types` step when the pricing
  remediation intent is present and valid for the workflow.
- Passed the remediation intent into `WizardEngine` and surfaced it in transaction-engine guidance.
- Added component proof that remediation edit routes disable autosave, pass the intent to the shell,
  and hydrate to `unit_types`.
Remaining risks:
- The remediation cue is step-level guidance; it does not yet highlight the exact stale field or unit
  row that caused the drift.
- A future slice should connect pricing-health diagnostics to specific field-level repair hints.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Add field-level pricing repair hints inside `UnitTypesPhase` for Sale, Rental, and Auction when
  opened via `remediation=pricing`, or extend the dashboard health object with the exact stale
  public-vs-live values for the wizard to display.
Commit hash/tag: This entry will be included in `feat(dle): land pricing remediation in editor`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-06 - Unit Pricing Repair Hints

Date: 2026-06-06
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the pricing-remediation Unit Types landing explain the exact transaction-specific fields
developers should inspect.
Files changed:
- client/src/components/development-wizard/phases/UnitTypesPhase.tsx
- client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx
- e2e/dle/dashboard-pricing-health.spec.ts
- docs/dle/evidence/2026-06-06/qa-dle-dashboard-rental-pricing-health.png
- docs/dle/evidence/2026-06-06/qa-dle-dashboard-auction-pricing-health.png
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/developer/Overview.test.ts` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/dashboard-pricing-health.spec.ts --project="Desktop Chrome" --workers=1` passed after tightening field-label locators.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual/browser flows verified:
- Auction pricing-health drift still routes from the dashboard into
  `/developer/create-development?id=<auctionId>&remediation=pricing`.
- The editor lands on `Unit Types`, shows the shell-level `Pricing health review` cue, and now also
  shows a Unit Types repair panel.
- The Auction repair panel displays `Auction bid repair fields` plus exact field chips for
  `Starting bid`, `Reserve price`, and `Auction window`.
Proof and fixes:
- Added `getUnitTypesPhasePricingRepairCopy` with Sale, Rental, and Auction-specific repair fields.
- Rendered `unit-pricing-repair-hints` only when the route has `remediation=pricing`.
- Extended Unit Types helper tests so repair hints remain transaction-specific.
- Extended the browser proof to verify the Auction field-level repair hints after dashboard handoff.
Remaining risks:
- The repair panel names the fields but does not yet compute which individual unit row caused the
  public-vs-live drift.
- Rental and Sale remediation panels have helper proof but not separate browser proof in this slice.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Carry the exact public-vs-live pricing diagnostics into the wizard so the Unit Types repair panel
  can identify the stale mirror and affected unit row.
Commit hash/tag: This entry will be included in `feat(dle): show unit pricing repair hints`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-06 - Unit Pricing Row-Level Repair Guidance

Date: 2026-06-06
Branch: refine/homepage-phase1-clarity-trust
Goal: Make pricing remediation point developers to the unit rows that define the live pricing values
currently drifting from the public mirror.
Files changed:
- client/src/components/development-wizard/phases/UnitTypesPhase.tsx
- client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx
- e2e/dle/dashboard-pricing-health.spec.ts
- docs/dle/evidence/2026-06-06/qa-dle-dashboard-rental-pricing-health.png
- docs/dle/evidence/2026-06-06/qa-dle-dashboard-auction-pricing-health.png
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/components/developer/Overview.test.ts client/src/lib/developmentHydrationAdapter.test.ts` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/dashboard-pricing-health.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual/browser flows verified:
- Auction pricing-health drift still routes from the dashboard into
  `/developer/create-development?id=<auctionId>&remediation=pricing`.
- The repair panel now shows `Rows to review` and names the affected auction lot that sets the live
  bid-from value.
- The affected unit card now carries `Pricing attention: Sets live bid from`, so the developer sees
  the remediation target where the edit action lives.
- The browser proof verifies the public mirror `R 800 000`, the duplicated live value `R 850 000`
  in both the diagnostic and row badge, and the affected auction lot name.
Proof and fixes:
- Added `getUnitTypesPhasePricingRepairAffectedUnits` for Sale, Rental, and Auction row-level
  drift contributors.
- Rendered row-level repair guidance inside `unit-pricing-repair-hints`.
- Added card-level amber styling and a pricing-attention badge for affected units during pricing
  remediation.
- Extended helper and browser coverage for row-level drift guidance.
Remaining risks:
- Row guidance identifies the current live min/max contributors, not the historical source of the
  stale public mirror. That is the honest available evidence without a pricing audit trail.
- Sale and Rental row guidance has helper proof; Auction has full dashboard-to-wizard browser proof
  in this slice.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Add the same full browser proof standard for Sale and Rental pricing remediation, or begin an
  audit-history-backed pricing change trail if row-level historical causality becomes important.
Commit hash/tag: `9ba1622d feat(dle): show pricing repair row guidance`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-07 - Sale Rental Auction Pricing Remediation Browser Proof

Date: 2026-06-07
Branch: refine/homepage-phase1-clarity-trust
Goal: Prove dashboard-to-wizard pricing remediation and row-level repair guidance across Sale,
Rental, and Auction transaction engines.
Files changed:
- e2e/dle/dashboard-pricing-health.spec.ts
- docs/dle/evidence/2026-06-07/qa-dle-dashboard-sale-pricing-health.png
- docs/dle/evidence/2026-06-07/qa-dle-dashboard-rental-pricing-health.png
- docs/dle/evidence/2026-06-07/qa-dle-dashboard-auction-pricing-health.png
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/developer/Overview.test.ts client/src/components/development-wizard/phases/UnitTypesPhase.test.tsx` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/dashboard-pricing-health.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual/browser flows verified:
- Sale pricing drift shows `Review Sale Pricing`, routes to
  `/developer/create-development?id=<saleId>&remediation=pricing`, and renders Sale repair guidance
  with `Public price band`, `Live unit price band`, `Rows to review`, the affected sale unit, and
  `Pricing attention: Sets live price from, Sets live price to`.
- Rental pricing drift shows `Review Rental Pricing`, routes to
  `/developer/create-development?id=<rentalId>&remediation=pricing`, and renders Rental repair
  guidance with `Public rent range`, `Live unit rent range`, `Rows to review`, the affected rental
  unit, and `Pricing attention: Sets live rent from, Sets live rent to`.
- Auction bid drift still shows `Review Auction Bids`, routes to
  `/developer/create-development?id=<auctionId>&remediation=pricing`, and renders Auction repair
  guidance with `Public bid from`, `Live lot bid from`, `Rows to review`, the affected auction lot,
  and `Pricing attention: Sets live bid from`.
Proof and fixes:
- Expanded the dashboard pricing-health browser proof seed to create Sale, Rental, and Auction
  developments with deliberately stale public pricing mirrors.
- Added transaction-specific assertions for dashboard warning copy, remediation CTA, wizard
  handoff URL, exact repair diagnostics, affected row names, and card-level pricing attention
  badges.
- Wrote new browser evidence under `docs/dle/evidence/2026-06-07/`.
Remaining risks:
- This slice proves pricing remediation, not actual developer correction and save/update of the
  stale mirrors.
- Pricing row guidance still identifies current live min/max contributors rather than historical
  causality.
- Existing unrelated homepage/evidence/playwright dirty files were not touched or staged.
Next recommended slice:
- Prove the correction path: edit the affected row or public mirror, save progress/update, return
  to dashboard, and verify pricing health becomes aligned for Sale, Rental, and Auction.
Commit hash/tag: This entry will be included in `test(dle): prove transaction pricing remediation`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-07 - Pricing Remediation Correction Proof

Date: 2026-06-07
Branch: refine/homepage-phase1-clarity-trust
Goal: Prove that stale public pricing mirrors can be corrected and that Sale, Rental, and Auction
dashboard pricing health returns to aligned after correction.
Files changed:
- e2e/dle/dashboard-pricing-health.spec.ts
- server/services/developmentService.ts
- server/__tests__/developerRouter.edit-update.test.ts
- docs/dle/evidence/2026-06-07/qa-dle-dashboard-sale-pricing-health.png
- docs/dle/evidence/2026-06-07/qa-dle-dashboard-rental-pricing-health.png
- docs/dle/evidence/2026-06-07/qa-dle-dashboard-auction-pricing-health.png
- docs/dle/RECOVERY_LOG.md
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/dashboard-pricing-health.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
- `pnpm vitest run server/__tests__/developerRouter.edit-update.test.ts -t "preserves auction terms through helper submit and partial edit"` was attempted, but the local test DB is behind the current schema and failed before the new assertion with `Unknown column 'sold_units' in 'field list'`.
Manual/browser flows verified:
- Sale pricing drift still routes to pricing remediation, then backend correction updates the public
  mirror to `R1.2M - R1.7M` and the dashboard returns to `Aligned`.
- Rental pricing drift still routes to pricing remediation, then backend correction updates the
  public mirror to `R13.5k - R15.5k / month` and the dashboard returns to `Aligned`.
- Auction bid drift still routes to pricing remediation, then backend correction updates the public
  mirror to `R850k` and the dashboard returns to `Aligned`.
Proof and fixes:
- Extended the dashboard pricing-health browser proof so it verifies detection and correction for
  all three transaction engines in one serial flow.
- Fixed `developmentService.updateDevelopment` so auction public mirror fields `startingBidFrom`
  and `reservePriceFrom` are treated as decimal update fields and actually persist during partial
  updates.
- Added a focused server regression assertion for auction mirror correction; it is blocked by local
  test DB schema drift until the test database has the current `unit_types` columns.
Remaining risks:
- The correction proof uses the backend update service directly rather than manual unit-edit UI
  controls, so it proves persistence/alignment but not the full developer editing UX.
- The server regression should be rerun after applying the current test DB schema, because the
  existing failure happens before the new auction mirror assertion.
- Existing unrelated homepage, older evidence, Playwright report, and test-results changes were not
  touched or staged.
Next recommended slice:
- Fix or migrate the local test DB schema so the server regression can run, then add UI-level
  correction proof once the unit-edit controls are stable enough for deterministic browser coverage.
Commit hash/tag: This entry will be included in `fix(dle): persist auction pricing mirror updates`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-07 - Test DB Schema Unblocked Auction Mirror Regression

Date: 2026-06-07
Branch: refine/homepage-phase1-clarity-trust
Goal: Unblock the focused auction mirror persistence regression by bringing the local test database
up to the current DLE operating schema.
Files changed:
- docs/dle/RECOVERY_LOG.md
External/local state changed:
- Applied `pnpm db:migrate:local` to `listify_local`; `0070_add_unit_outcome_counters.sql` skipped
  existing `sold_units` and `let_units` columns and reran the outcome backfill statements.
- Applied `pnpm db:migrate:test` to `listify_test`; Drizzle migrations and SQL migrations completed,
  including `0070_add_unit_outcome_counters.sql`.
Tests run:
- `pnpm db:migrate:local` passed.
- `pnpm db:migrate:test` first failed inside the sandbox with `connect EPERM 127.0.0.1:3306`, then
  passed when rerun with local MySQL access.
- `pnpm vitest run server/__tests__/developerRouter.edit-update.test.ts -t "preserves auction terms through helper submit and partial edit"` passed after migrating `listify_test`.
Proof and fixes:
- Confirmed the prior server-regression blocker was test DB schema drift, not the auction mirror
  persistence implementation.
- The focused regression now proves partial updates persist `startingBidFrom` and `reservePriceFrom`
  without syncing or wiping unit inventory.
Remaining risks:
- This slice changed local database state only; it does not add a new migration because the required
  migration already exists as `server/migrations/0070_add_unit_outcome_counters.sql`.
- Existing unrelated homepage, older evidence, Playwright report, and test-results changes were not
  touched or staged.
Next recommended slice:
- Add UI-level pricing correction proof for the developer editing path, or continue Rental/Auction
  operating proof now that backend persistence and test DB schema are aligned.
Commit hash/tag: This entry will be included in `docs(dle): log test db schema recovery`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-07 - UI Pricing Correction Proof

Date: 2026-06-07
Branch: refine/homepage-phase1-clarity-trust
Goal: Prove that dashboard pricing remediation can be corrected through the actual developer Unit
Types editor and Save Progress path, not only through backend service calls.
Files changed:
- e2e/dle/dashboard-pricing-health.spec.ts
- docs/dle/evidence/2026-06-07/qa-dle-dashboard-sale-pricing-health.png
- docs/dle/evidence/2026-06-07/qa-dle-dashboard-rental-pricing-health.png
- docs/dle/evidence/2026-06-07/qa-dle-dashboard-auction-pricing-health.png
- docs/dle/RECOVERY_LOG.md
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/dashboard-pricing-health.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `pnpm vitest run server/__tests__/developerRouter.edit-update.test.ts -t "preserves auction terms through helper submit and partial edit"` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual/browser flows verified:
- Sale remediation opens the flagged unit row, edits the sale pricing fields in the Unit Types
  dialog, saves the unit, clicks Save Progress, and returns the dashboard pricing health to
  `Aligned` with `R1M - R1.5M` shown for both public and live pricing.
- Rental remediation opens the flagged rental row, edits monthly rent from/to in the Unit Types
  dialog, saves the unit, clicks Save Progress, and returns pricing health to `Aligned` with
  `R12k - R15k / month` shown for both public and live rent.
- Auction remediation opens the flagged auction lot, edits the starting bid in the Unit Types
  dialog, saves the lot, clicks Save Progress, and returns bid health to `Aligned` with `R800k`
  shown for both public and live bid-from.
Proof and fixes:
- Replaced the previous backend-only correction helper in the browser proof with real UI editing
  through the Unit Types dialog.
- Seeded test units now include descriptions, and the proof explicitly fills the Basic Info
  description field before saving so it exercises the real editor validation path.
- Increased this single browser proof timeout to 90 seconds because it now performs full
  Sale/Rental/Auction detection, correction, Save Progress, and dashboard verification.
Remaining risks:
- The UI proof aligns live unit values to the stale public mirror values. It proves the developer
  can repair drift through unit editing; public-mirror editing remains a separate UX path if needed.
- The proof still uses one unit per transaction engine. Multi-row min/max correction can be added if
  pricing diagnostics need broader inventory coverage.
- Existing unrelated homepage, older evidence, Playwright report, and test-results changes were not
  touched or staged.
Next recommended slice:
- Continue Rental/Auction proof at the operating layer, or add multi-row pricing remediation if
  product requirements demand row-level min/max correction across larger inventory sets.
Commit hash/tag: This entry will be included in `test(dle): prove UI pricing correction`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-07 - Operating Unit Detail Merchandising Proof

Date: 2026-06-07
Branch: refine/homepage-phase1-clarity-trust
Goal: Extend the Rental and Auction operating-layer browser proof to the unit-detail merchandising
surface so live operating changes are visible beyond the dashboard, public development page, and
search cards.
Files changed:
- e2e/dle/rental-operating-hold.spec.ts
- e2e/dle/auction-operating-outcomes.spec.ts
- docs/dle/evidence/2026-06-07/qa-dle-rental-operating-unit-detail.png
- docs/dle/evidence/2026-06-07/qa-dle-auction-operating-unit-detail-sold.png
- docs/dle/evidence/2026-06-07/qa-dle-auction-operating-unit-detail-passed-in.png
- docs/dle/evidence/2026-06-07/qa-dle-auction-operating-unit-detail-withdrawn.png
- docs/dle/RECOVERY_LOG.md
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/rental-operating-hold.spec.ts e2e/dle/auction-operating-outcomes.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `pnpm vitest run client/src/pages/DevelopmentUnitDetailPage.test.ts` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual/browser flows verified:
- Rental operating mutations still prove hold, mark-let, release, direct-let, DB event logging,
  public rental language, and rental search-card output.
- After direct-let, the rental unit-detail route shows the unit name, `5 rentals available`,
  `Request rental pack`, and `Check rental fit`.
- Auction operating outcomes still prove sold, passed-in, withdrawn, DB event logging, public
  outcome labels, and auction search-card output.
- Auction unit-detail routes now prove sold lots show `Sold at auction`, passed-in lots show
  `Passed in`, withdrawn lots show `Withdrawn`, and auction-native bidder CTAs remain visible.
Proof and fixes:
- Added unit-detail route assertions and screenshots to the existing Rental and Auction operating
  browser specs.
- Hardened two dashboard label assertions with exact matching so explanatory text does not collide
  with the metric labels during browser proof.
Remaining risks:
- Rental browser proof verifies changed availability after operating mutation, but does not fully
  let every unit; the fully-let unit-detail label remains covered by the focused helper unit test.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged. The focused browser run refreshed the older 2026-06-04
  operating screenshots because those specs still write their original evidence paths; this slice
  records the new unit-detail proof under 2026-06-07 only.
Next recommended slice:
- Continue from operating proof into either fully-let browser coverage or lead-stage/distribution
  workflow proof for Rental and Auction.
Commit hash/tag: This entry will be included in `test(dle): prove operating unit detail merchandising`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-07 - Rental/Auction Lead Outcome Sync Browser Proof

Date: 2026-06-07
Branch: refine/homepage-phase1-clarity-trust
Goal: Bring Rental and Auction selected-lead outcome synchronization up to the same browser-proof
standard as Sale before broader autosave or UI upgrade work.
Files changed:
- e2e/dle/lead-outcome-sync.spec.ts
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/evidence/2026-06-07/qa-dle-lead-outcome-sync-sale-sold.png
- docs/dle/evidence/2026-06-07/qa-dle-lead-outcome-sync-invalid-no-false-success.png
- docs/dle/evidence/2026-06-07/qa-dle-lead-outcome-sync-rental-let.png
- docs/dle/evidence/2026-06-07/qa-dle-lead-outcome-sync-auction-sold.png
- docs/dle/evidence/2026-06-07/qa-dle-lead-outcome-sync-auction-withdrawn.png
- docs/dle/RECOVERY_LOG.md
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/lead-outcome-sync.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `pnpm vitest run server/services/__tests__/developmentOperatingEventsService.test.ts` first failed inside the sandbox with local MySQL `EPERM`, then passed with local DB access.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual/browser flows verified:
- Sale selected-lead outcome sync still closes one deal-stage lead as `Sold`, writes a
  `lead_stage_changed` DLE event, writes a lead activity, and rejects unsafe direct close from
  `qualified` without false success.
- Rental selected-lead outcome sync closes one deal-stage renter lead with `Lease signed / Let`,
  writes `transactionType: for_rent`, preserves a Rental-native display label in DLE event metadata,
  and writes Rental-native lead activity copy.
- Auction selected-lead sold sync closes one deal-stage bidder lead with `Sold at auction`, writes
  `transactionType: auction`, and preserves Auction-native display label metadata.
- Auction selected-lead withdrawn sync requires note input, moves only the selected bidder to
  canonical `closed_lost`, stores the note and `Withdrawn follow-up` display label in DLE event
  metadata, and writes Auction-native lead activity copy.
Proof and fixes:
- Extended the existing browser spec from Sale-only to Sale/Rental/Auction selected-lead outcome
  sync coverage.
- Added deterministic cleanup for multiple seeded developments and switched this spec's evidence
  output to the 2026-06-07 folder to avoid refreshing older proof images.
- Updated the outcome handoff and operating-layer docs so the architecture evidence reflects the
  new Rental/Auction browser proof.
Remaining risks:
- Auction passed-in lead sync is still covered by the service mapping tests but not by a separate
  browser screenshot; the browser proof covers the same lost-outcome note path through withdrawn.
- Lead-stage synchronization remains explicit and selected-lead only. It intentionally does not
  mutate inventory, distribution deals, or commission state.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Next recommended slice:
- Add Rental/Auction distribution/referral handoff proof, or build a dashboard reporting/readback
  layer that summarizes lead outcome sync state next to operating history without moving
  distribution stages from DLE.
Commit hash/tag: This entry will be included in `test(dle): prove rental auction lead outcome sync`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-07 - Rental/Auction Distribution Handoff Browser Proof

Date: 2026-06-07
Branch: refine/homepage-phase1-clarity-trust
Goal: Extend the explicit distribution/referral handoff proof beyond Sale so Rental and Auction can
request manager review without DLE mutating distribution deal stages or commission state.
Files changed:
- e2e/dle/distribution-handoff.spec.ts
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/evidence/2026-06-07/qa-dle-distribution-handoff-review-readback.png
- docs/dle/evidence/2026-06-07/qa-dle-distribution-handoff-manager-readback.png
- docs/dle/evidence/2026-06-07/qa-dle-distribution-handoff-manager-acknowledged.png
- docs/dle/evidence/2026-06-07/qa-dle-distribution-handoff-developer-acknowledged.png
- docs/dle/evidence/2026-06-07/qa-dle-distribution-handoff-rental-review-readback.png
- docs/dle/evidence/2026-06-07/qa-dle-distribution-handoff-auction-review-readback.png
- docs/dle/RECOVERY_LOG.md
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/distribution-handoff.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `pnpm vitest run server/services/__tests__/developmentOperatingEventsService.test.ts` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual/browser flows verified:
- Sale referral handoff still proves developer dashboard review request, developer row readback,
  manager row readback, manager acknowledgement, developer acknowledgement readback, DLE handoff
  event, distribution note events, and unchanged deal stage/commission state.
- Rental referral handoff now proves the developer can request review from the dashboard, read back
  the note, persist `transactionType: for_rent` on the DLE handoff event, and leave distribution
  deal stage and commission state unchanged.
- Auction referral handoff now proves the developer can request review from the dashboard, read
  back the note, persist `transactionType: auction` on the DLE handoff event, and leave
  distribution deal stage and commission state unchanged.
Proof and fixes:
- Generalized the distribution handoff e2e seed to create Sale, Rental, or Auction developments
  under the same DLE handoff contract.
- Moved this spec's evidence output to 2026-06-07 so the current proof is grouped with the active
  recovery work.
- Updated the handoff contract and operating-layer audit to reflect Rental/Auction browser proof.
Remaining risks:
- Rental and Auction manager acknowledgement are not separately screenshotted in this slice; Sale
  continues to prove the manager acknowledgement path, while Rental/Auction prove transaction type
  and no hidden stage/commission mutation through the same service path.
- Distribution programme semantics are still shared and sale-shaped. Rental leasing referral terms
  and Auction bidder/referral payout rules remain future product work.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Next recommended slice:
- Add a transaction-native manager reporting/readback surface for Rental/Auction handoffs, or
  define Rental/Auction-specific distribution programme semantics before allowing any stage
  transition requests from DLE.
Commit hash/tag: This entry will be included in `test(dle): prove rental auction distribution handoff`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-07 - Transaction-Native Handoff Readback Labels

Date: 2026-06-07
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the already-proven Sale/Rental/Auction distribution handoff transaction type visible in
developer and manager readback surfaces.
Files changed:
- server/distributionRouter.ts
- client/src/components/developer/Overview.tsx
- client/src/pages/distribution/ManagerDevelopmentDealsPage.tsx
- e2e/dle/distribution-handoff.spec.ts
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/evidence/2026-06-07/qa-dle-distribution-handoff-review-readback.png
- docs/dle/evidence/2026-06-07/qa-dle-distribution-handoff-manager-readback.png
- docs/dle/evidence/2026-06-07/qa-dle-distribution-handoff-manager-acknowledged.png
- docs/dle/evidence/2026-06-07/qa-dle-distribution-handoff-developer-acknowledged.png
- docs/dle/evidence/2026-06-07/qa-dle-distribution-handoff-rental-review-readback.png
- docs/dle/evidence/2026-06-07/qa-dle-distribution-handoff-auction-review-readback.png
- docs/dle/RECOVERY_LOG.md
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/distribution-handoff.spec.ts --project="Desktop Chrome" --workers=1` passed.
- `pnpm vitest run server/services/__tests__/developmentOperatingEventsService.test.ts` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Manual/browser flows verified:
- Sale handoff readback now shows `Sale referral review` on both developer and manager surfaces.
- Rental handoff readback now shows `Rental referral review` on both developer and manager
  surfaces.
- Auction handoff readback now shows `Auction referral review` on both developer and manager
  surfaces.
- The handoff remains review-only: no distribution deal stage or commission state changes.
Proof and fixes:
- Exposed `transactionType` from the latest DLE handoff readback helper in `distributionRouter`.
- Added transaction-native handoff context badges to the developer dashboard and manager deals page.
- Extended the browser handoff proof to assert the new labels across Sale, Rental, and Auction.
Remaining risks:
- The underlying distribution programme semantics are still shared and sale-shaped. This slice only
  improves readback clarity; it does not introduce Rental/Auction-specific payout or stage models.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Next recommended slice:
- Define Rental/Auction-specific distribution programme semantics or add manager reporting filters
  for handoff transaction type.
Commit hash/tag: This entry will be included in `feat(dle): show transaction handoff labels`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-07 - Manager Checklist Transaction Context

Date: 2026-06-07
Branch: refine/homepage-phase1-clarity-trust
Goal: Carry Sale/Rental/Auction context into the manager deal checklist so the distribution review
surface no longer reads as one generic sale-shaped payout checklist.
Files changed:
- server/services/distributionDealDocumentsService.ts
- server/__tests__/distributionManagerChecklist.integration.test.ts
- client/src/components/distribution/manager/ManagerDealChecklistPanel.tsx
- client/src/components/distribution/manager/ManagerDealChecklistPanel.test.tsx
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/distribution/manager/ManagerDealChecklistPanel.test.tsx`
  passed.
- `pnpm vitest run server/__tests__/distributionManagerChecklist.integration.test.ts` attempted but
  failed inside the sandbox with `connect EPERM 127.0.0.1:3306`; the escalated rerun request was
  not approved, so DB-backed proof is pending.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `getDealChecklist` now returns the development `transactionType`.
- The manager checklist panel now labels Sale as buyer review, Rental as rental-applicant review,
  and Auction as bidder review.
- Rental and Auction readiness copy explicitly says lease/deposit/bidder/auction payout semantics
  still need programme support before any stage or commission assumption is made.
Guardrails:
- No schema, migration, deal-stage, commission, lead, or inventory mutation changes.
- Distribution stage and commission movement remain owned by distribution services.
- The checklist copy improves transaction clarity without pretending Rental/Auction programme
  semantics are complete.
Remaining risks:
- The DB integration assertion for `transactionType` is written but still needs a local MySQL
  run outside the sandbox.
- The underlying distribution programme terms and stage names remain shared and sale-shaped.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Next recommended slice:
- Run the DB-backed checklist integration test with local MySQL access, then define
  Rental/Auction-specific document and payout programme terminology.
Commit hash/tag: This entry will be included in `feat(dle): add checklist transaction context`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-07 - Partner Referral Transaction Journey Labels

Date: 2026-06-07
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the partner/referrer referral tracker show buyer, renter, and bidder journeys instead of
presenting every referral as a sale-shaped buyer pipeline.
Files changed:
- server/services/distributionReferralSubmissionService.ts
- client/src/pages/distribution/PartnerMyReferralsPage.tsx
- client/src/pages/distribution/PartnerMyReferralsPage.test.tsx
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/distribution/PartnerMyReferralsPage.test.tsx` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `listMyReferrals` and `getMyReferralDeal` now return the development `transactionType`.
- The partner referral tracker now labels shared pipeline stages as Sale, Rental, or Auction
  journey states where appropriate.
- Rental referrals show renter/application/lease language; Auction referrals show
  bidder/registration/auction-terms language.
- Reward tracking remains tied to programme terms and does not move stages or commission state.
Guardrails:
- No schema, migration, deal-stage, commission, lead, inventory, or payout mutation changes.
- The shared referral stage model remains intact; this slice is a transaction-aware display
  overlay.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Partner detail, commission, and programme-terms surfaces still need deeper Rental/Auction
  terminology.
- The underlying distribution programme terms and stage names remain shared and sale-shaped.
Next recommended slice:
- Carry the same transaction-aware referral terminology into partner referral detail and programme
  terms, or define Rental/Auction-specific referral document/payout semantics.
Commit hash/tag: This entry will be included in `feat(dle): label partner referral journeys`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-07 - Partner Referral Detail Transaction Context

Date: 2026-06-07
Branch: refine/homepage-phase1-clarity-trust
Goal: Carry buyer/renter/bidder transaction language from the referral list into the partner
referral detail page without changing distribution stage, commission, or payout ownership.
Files changed:
- client/src/pages/distribution/PartnerReferralDetailPage.tsx
- client/src/pages/distribution/PartnerReferralDetailPage.test.tsx
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/distribution/PartnerReferralDetailPage.test.tsx` passed.
- `pnpm vitest run server/__tests__/distributionManagerChecklist.integration.test.ts` passed,
  completing the DB-backed checklist proof that was previously blocked by sandbox MySQL access.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Referral detail now derives transaction context from `referral.development.transactionType`,
  falling back to affordability transaction metadata.
- Sale, Rental, and Auction detail pages now use transaction-aware status rails, next-action
  hints, participant labels, WhatsApp labels, summary labels, and application-document copy.
- Rental detail uses renter/application/lease language; Auction detail uses
  bidder/registration/auction-terms language.
Guardrails:
- No schema, migration, deal-stage, commission, lead, inventory, or payout mutation changes.
- Payout rules remain programme-owned through existing distribution services.
- This is a transaction-aware detail display overlay over the shared referral stage model.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Partner programme terms and referral submission still contain buyer/sale-shaped copy in places.
- The underlying distribution programme terms and stage names remain shared and sale-shaped.
Next recommended slice:
- Carry transaction-aware language into partner referral submission and programme terms, or define
  Rental/Auction-specific referral document/payout semantics.
Commit hash/tag: This entry will be included in `feat(dle): label referral detail journeys`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-07 - Partner Referral Submit Transaction Context

Date: 2026-06-07
Branch: refine/homepage-phase1-clarity-trust
Goal: Carry buyer/renter/bidder transaction language into partner referral submission without
changing the distribution referral API, deal stage, commission, or payout ownership.
Files changed:
- client/src/pages/distribution/PartnerSubmitReferralPage.tsx
- client/src/pages/distribution/PartnerSubmitReferralPage.test.tsx
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/distribution/PartnerSubmitReferralPage.test.tsx` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Referral submission now derives transaction context from the selected development's
  `transactionType`.
- Sale remains a buyer submission journey.
- Rental opportunities now show renter capture, renter fit, rental route, monthly rent range,
  renter application documents, and renter submission language.
- Auction opportunities now show bidder capture, bidder fit, bidder route, bid range, bidder
  application documents, and bidder submission language.
Guardrails:
- No schema, migration, tRPC route, deal-stage, commission, payout, inventory, or lead mutation
  changes.
- The existing `submitReferral` payload remains intact; this slice is a transaction-aware
  product-language layer over the current distribution submission contract.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Programme terms, public distribution marketing, accelerator copy, commissions, and some manager
  dashboard labels still contain buyer/sale-shaped wording.
- Rental/Auction-specific payout and document semantics remain future programme-design work.
Next recommended slice:
- Carry transaction-aware language into partner programme terms, development opportunity cards,
  or the referral accelerator before defining Rental/Auction-specific payout semantics.
Commit hash/tag: This entry will be included in `feat(dle): label referral submit journeys`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-07 - Partner Opportunity Card Transaction Context

Date: 2026-06-07
Branch: refine/homepage-phase1-clarity-trust
Goal: Make partner development opportunity cards and brochure actions show buyer/renter/bidder
journeys before the partner enters referral submission.
Files changed:
- client/src/pages/distribution/PartnerDevelopmentsPage.tsx
- client/src/pages/distribution/PartnerDevelopmentsPage.test.tsx
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/distribution/PartnerDevelopmentsPage.test.tsx` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Partner opportunity cards now derive opportunity labels and submit CTA copy from each
  development's `transactionType`.
- Sale opportunities remain `Open for buyers` with `Submit Buyer`.
- Rental opportunities now show `Open for renters` with `Submit Renter`.
- Auction opportunities now show `Open for bidders` with `Submit Bidder`.
- Brochure action copy now has transaction-native `Pre-Qualify` and submit labels for the selected
  development.
Guardrails:
- No schema, migration, tRPC route, deal-stage, commission, payout, inventory, lead, or
  accelerator route changes.
- This slice only makes programme-term transaction context visible on the partner opportunity
  merchandising surface.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- The referral accelerator, public distribution marketing page, commissions page, and some
  dashboard/pipeline labels still contain buyer/sale-shaped wording.
- Rental/Auction-specific payout and document semantics remain future programme-design work.
Next recommended slice:
- Carry transaction-aware language into the referral accelerator or partner dashboard opportunity
  modules, then define Rental/Auction-specific payout/document semantics once the display surfaces
  stop implying every referral is a sale.
Commit hash/tag: This entry will be included in `feat(dle): label partner opportunity lanes`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-08 - Partner Dashboard Transaction Context

Date: 2026-06-08
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the partner dashboard read as a transaction-first referral workspace instead of a
buyer-only hub when available stock includes Rental and Auction programmes.
Files changed:
- client/src/pages/distribution/PartnerDashboardPage.tsx
- client/src/pages/distribution/PartnerDashboardPage.test.tsx
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/distribution/PartnerDashboardPage.test.tsx` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Dashboard transaction normalization now treats `for_rent` as Rental and `on_auction` as Auction.
- Mixed Sale/Rental/Auction stock now renders the partner home as `My Referral Hub`, with neutral
  client/referral matching, KPI, funnel, attention, and reward copy.
- Row-level stock CTAs now show `Submit Buyer`, `Submit Renter`, or `Submit Bidder` by
  transaction type.
- Auction dashboard pricing now displays `Bid from` language instead of plain sale-shaped price
  text.
Guardrails:
- No schema, migration, tRPC route, deal-stage, commission, payout, inventory, lead, or
  accelerator route changes.
- Dashboard actions still route through existing partner submit, accelerator, referrals, and
  developments surfaces.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- The standalone referral accelerator and public distribution marketing page still contain
  buyer/sale-shaped language.
- Rental/Auction-specific payout and document semantics remain future programme-design work.
Next recommended slice:
- Carry transaction-aware language into the referral accelerator match grid and qualification
  copy, then revisit Rental/Auction-specific distribution programme semantics.
Commit hash/tag: This entry will be included in `feat(dle): label partner dashboard lanes`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-08 - Referral Accelerator Transaction Context

Date: 2026-06-08
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the partner referral accelerator stop presenting qualification and matched inventory as
a buyer-only purchase journey when Rental and Auction matches are present.
Files changed:
- client/src/components/distribution/partner/AffordabilityForm.tsx
- client/src/components/distribution/partner/AffordabilityForm.test.tsx
- client/src/components/distribution/partner/ResultsPanel.tsx
- client/src/components/distribution/partner/ResultsPanel.test.tsx
- client/src/components/distribution/partner/MatchesGrid.tsx
- client/src/components/distribution/partner/MatchesGrid.test.tsx
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/distribution/partner/MatchesGrid.test.tsx client/src/components/distribution/partner/AffordabilityForm.test.tsx client/src/components/distribution/partner/ResultsPanel.test.tsx` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Accelerator form now captures `Client name` and `Client phone` instead of buyer-only fields.
- Results panel now labels the output as an `Indicative affordability ceiling` instead of an
  indicative purchase price.
- Match grid now normalizes `for_rent` and `on_auction` correctly.
- Rental match cards show rental affordability ceiling, monthly rent, and renter submit copy.
- Auction match cards show bidder affordability ceiling, `Bid from` starting-bid copy, and bidder
  submit copy.
Guardrails:
- No schema, migration, tRPC route, deal-stage, commission, payout, inventory, lead, or
  assessment mutation changes.
- Accelerator actions still use the existing assessment, match snapshot, and submit-referral
  route contract.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Public distribution marketing page, programme terms card copy, and commissions page still
  contain buyer/sale-shaped wording in places.
- Rental/Auction-specific payout and document semantics remain future programme-design work.
Next recommended slice:
- Carry transaction-aware language into partner programme terms cards or the public distribution
  marketing page, then define Rental/Auction-specific payout/document semantics.
Commit hash/tag: This entry will be included in `feat(dle): label accelerator match lanes`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-08 - Partner Programme Terms Transaction Context

Date: 2026-06-08
Branch: refine/homepage-phase1-clarity-trust
Goal: Make partner programme terms cards and requirements dialogs stop describing every
supporting pack and application document as buyer-only when Rental and Auction programmes are
present.
Files changed:
- client/src/components/distribution/partner/PartnerProgramTermsCard.tsx
- client/src/components/distribution/partner/ProgramRequirementsDialog.tsx
- client/src/components/distribution/partner/partnerProgramTermsCopy.ts
- client/src/components/distribution/partner/PartnerProgramTermsCard.test.tsx
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/distribution/partner/PartnerProgramTermsCard.test.tsx`
  passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Programme terms card transaction normalization treats `for_rent` as Rental and `on_auction` as
  Auction.
- Sale supporting packs remain `buyer-ready`.
- Rental supporting packs now show `renter-ready` and the requirements dialog describes renter
  application documents.
- Auction supporting packs now show `bidder-ready` and the requirements dialog describes bidder
  registration/readiness documents.
Guardrails:
- No schema, migration, tRPC route, deal-stage, commission, payout, inventory, lead, document
  ownership, or referral-readiness mutation changes.
- Programme requirements still use existing configured source documents and required-document
  templates.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Rental/Auction-specific payout, deposit, bidder-registration, legal-pack, and document-template
  semantics remain future programme-design work.
- Public distribution marketing page and commissions page may still contain buyer/sale-shaped
  wording in places.
Next recommended slice:
- Continue with public distribution marketing or commissions-page transaction context, then define
  Rental/Auction-specific programme semantics when product rules are ready.
Commit hash/tag: This entry will be included in `feat(dle): label programme terms lanes`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-08 - Public Distribution Marketing Transaction Context

Date: 2026-06-08
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the public distribution-network funnel stop presenting the referral programme as a
buyer-only Sale journey when Rental and Auction developments can appear in the same public
opportunity feed.
Files changed:
- client/src/pages/distribution/DistributionNetworkPublicPage.tsx
- client/src/pages/distribution/DistributionNetworkPublicPage.test.ts
- client/src/components/distribution/ReferralApplyForm.tsx
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/distribution/DistributionNetworkPublicPage.test.ts` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Public distribution hero, matcher, problem framing, timeline, payout, and social-proof copy now
  describe a mixed buyer/renter/bidder referral network instead of a buyer-only funnel.
- Public opportunity cards now use `Refer a Buyer`, `Refer a Renter`, or `Refer a Bidder` from
  development transaction type.
- The public application form now uses neutral client/referral language by default.
- Selected-development application context now labels buyer, renter, or bidder referrals when the
  public card passes transaction type.
Guardrails:
- No schema, migration, tRPC route, deal-stage, commission, payout, inventory, lead, referrer
  application, or partner-access mutation changes.
- Payout copy now refers to configured programme milestones and does not claim Rental/Auction
  payout semantics are solved.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Partner commissions page still needs transaction-lane reward labels.
- Rental/Auction-specific programme payout, deposit, bidder-registration, legal-pack, and
  document-template semantics remain future product-design work.
Next recommended slice:
- Carry transaction context into the partner commissions page, then define Rental/Auction-specific
  programme semantics when product rules are ready.
Commit hash/tag: This entry will be included in `feat(dle): label public distribution lanes`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-08 - Partner Rewards Transaction Context

Date: 2026-06-08
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the partner commissions/rewards page show Sale, Rental, and Auction reward rows with
buyer/renter/bidder participant context instead of displaying every linked participant as a buyer.
Files changed:
- server/distributionRouter.ts
- client/src/pages/distribution/PartnerCommissionsPage.tsx
- client/src/pages/distribution/PartnerCommissionsPage.test.ts
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/distribution/PartnerCommissionsPage.test.ts` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Partner `myCommissionEntries` now returns development `transactionType` as read-only context.
- Partner rewards page normalizes `for_rent` as Rental and `on_auction` as Auction.
- Sale rows show `Sale reward` and `Buyer`.
- Rental rows show `Rental reward`, `Renter`, and lease/programme-rule guardrail copy.
- Auction rows show `Auction reward`, `Bidder`, and bidder/registration/auction-terms guardrail
  copy.
Guardrails:
- No schema, migration, commission calculation, trigger-stage, payout status, deal-stage, lead,
  inventory, or referral-detail navigation changes.
- Rental/Auction payout wording remains tied to configured programme terms instead of claiming
  lease, deposit, bidder-registration, or auction payout semantics are solved.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Deeper Rental/Auction-specific programme payout, deposit, bidder-registration, legal-pack, and
  document-template semantics remain future product-design work.
- Distribution manager dashboard/deal list may still contain buyer-shaped labels in older
  operational surfaces.
Next recommended slice:
- Audit distribution manager dashboard/deal-list labels, then define Rental/Auction-specific
  programme semantics when product rules are ready.
Commit hash/tag: This entry will be included in `feat(dle): label partner reward lanes`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-08 - Manager Referral Operations Transaction Context

Date: 2026-06-08
Branch: refine/homepage-phase1-clarity-trust
Goal: Make manager validation, pipeline, and development referral lists show Sale, Rental, and
Auction referral context instead of treating every row as a buyer/deal surface.
Files changed:
- server/distributionRouter.ts
- client/src/pages/distribution/DistributionManagerDashboard.tsx
- client/src/pages/distribution/DistributionManagerDashboard.test.ts
- client/src/pages/distribution/ManagerDevelopmentDealsPage.tsx
- client/src/pages/distribution/ManagerDevelopmentDealsPage.test.ts
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/distribution/DistributionManagerDashboard.test.ts client/src/pages/distribution/ManagerDevelopmentDealsPage.test.ts client/src/pages/distribution/ManagerDevelopmentOpsPage.test.ts`
  passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Manager assignment, validation, viewing, pipeline, and development-deal read models now return
  development `transactionType` where the client needs lane labels.
- Distribution manager dashboard normalizes `for_rent` as Rental and `on_auction` as Auction.
- Manager validation and pipeline rows now show Sale/Rental/Auction referral badges with
  Buyer/Renter/Bidder participant labels.
- Manager stage action button labels now use sale, lease, or auction terminology while preserving
  existing stage codes.
- Manager development deals list now shows `Development Referrals`, `Referrals`, and
  Buyer/Renter/Bidder unknown-participant copy.
- Validation-queue actions now submit the returned `dealId` instead of an undefined row id.
Guardrails:
- No schema, migration, manager-stage transition, commission calculation, payout status,
  handoff acknowledgement, document verification, lead, or inventory mutation changes.
- Rental/Auction stage labels remain overlays on the existing distribution-owned stage model.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Deeper Rental/Auction-specific programme payout, deposit, bidder-registration, legal-pack, and
  document-template semantics remain future product-design work.
- Super-admin distribution network tables may still contain buyer-shaped copy in non-partner,
  non-manager surfaces.
Next recommended slice:
- Audit super-admin distribution network tables and any remaining distribution readback surfaces,
  then define Rental/Auction-specific programme semantics when product rules are ready.
Commit hash/tag: This entry will be included in `feat(dle): label manager referral lanes`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-08 - Super Admin Distribution Transaction Context

Date: 2026-06-08
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the super-admin distribution network deal and reward tables show Sale, Rental, and
Auction referral context instead of rendering every participant and payout as buyer/commission
language.
Files changed:
- server/distributionRouter.ts
- client/src/pages/admin/DistributionNetworkPage.tsx
- client/src/pages/admin/DistributionNetworkPage.test.ts
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/admin/DistributionNetworkPage.test.ts` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Super-admin `distribution.admin.listDeals` now returns development `transactionType` and
  `buyerName` as read-only table context.
- Super-admin `distribution.admin.listCommissionEntries` now returns development
  `transactionType` as read-only reward context.
- Distribution Network header, referral pipeline, and rewards/incentives copy now describe a mixed
  Sale/Rental/Auction referral network.
- Deal pipeline rows now badge Sale/Rental/Auction referral lanes and label participants as
  Buyer/Renter/Bidder.
- Rewards rows now label Sale commission, Rental reward, or Auction reward rows while preserving
  existing payout status and amount fields.
Guardrails:
- No schema, migration, stage transition, payout calculation, commission status, partner access,
  onboarding, referral application, lead, inventory, or operating-event mutation changes.
- Rental/Auction reward language remains display context only; payout milestones, documents,
  deposit, bidder-registration, and legal-pack semantics remain future product-design work.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Deeper Rental/Auction-specific programme payout, deposit, bidder-registration, legal-pack, and
  document-template semantics remain future product-design work.
- A final distribution-wide copy sweep may still find isolated buyer/deal wording in generic
  labels that do not yet carry transaction type.
Next recommended slice:
- Run a distribution-wide transaction-language sweep, then move from labels into Rental/Auction
  programme semantics only once product rules are explicit.
Commit hash/tag: This entry will be included in `feat(dle): label admin distribution lanes`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-08 - Distribution Referrer Application Neutral Copy

Date: 2026-06-08
Branch: refine/homepage-phase1-clarity-trust
Goal: Remove buyer-only onboarding language from the public referrer application page so the
distribution entry point matches the Sale/Rental/Auction referral network.
Files changed:
- client/src/pages/distribution/DistributionReferralApplyPage.tsx
- client/src/pages/distribution/DistributionReferralApplyPage.test.ts
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/distribution/DistributionReferralApplyPage.test.ts` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The individual applicant type now reads `Individual With Qualified Referral` instead of
  `Individual With Qualified Buyer`.
- The public application intro now says no buyer, renter, or bidder is required to apply.
- Submitted `partnerType` values, notes generation, approval flow, activation flow, routing, and
  distribution application mutation behavior are unchanged.
Guardrails:
- No schema, migration, tRPC route, review mutation, account activation, referral submission,
  payout, commission, lead, inventory, or operating-event changes.
- This is copy/readiness alignment only; it does not introduce Rental/Auction programme terms or
  payout semantics.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Some internal variable names and legacy local-storage keys still use `buyer` as compatibility
  names while rendering transaction-aware copy.
- Deeper Rental/Auction-specific programme semantics remain future product-design work.
Next recommended slice:
- Continue the distribution-wide copy sweep for remaining visible buyer-only wording, then move to
  Rental/Auction programme semantics when product rules are explicit.
Commit hash/tag: This entry will be included in `feat(dle): neutralize referrer application copy`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-08 - Partner Dashboard Reward Language Alignment

Date: 2026-06-08
Branch: refine/homepage-phase1-clarity-trust
Goal: Remove commission-only wording from the partner dashboard prequalification/match surface so
Sale, Rental, and Auction stock all read as referral reward opportunities.
Files changed:
- client/src/pages/distribution/PartnerDashboardPage.tsx
- client/src/pages/distribution/PartnerDashboardPage.test.tsx
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/distribution/PartnerDashboardPage.test.tsx` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Renter, bidder, mixed-lane, and buyer dashboard empty match states now say estimated reward
  instead of estimated commission.
- Match result cards now use lane-aware reward labels:
  `Est. rental reward`, `Est. auction reward`, `Est. referral reward`, or `Est. sale reward`.
- Existing reward amount calculation inputs and outputs remain unchanged.
Guardrails:
- No schema, migration, tRPC route, affordability calculation, match scoring, commission amount,
  payout status, deal stage, lead, inventory, or operating-event changes.
- Reward language is display context only; Rental/Auction payout milestones and document/legal
  semantics remain future product-design work.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Internal field names still use `commission` where the distribution data model owns payout
  calculations.
- Deeper Rental/Auction-specific programme semantics remain future product-design work.
Next recommended slice:
- Continue the distribution copy sweep for remaining visible `Deal #`/`Open Commissions` wording
  in partner referral detail/tracker surfaces, then move to product-defined Rental/Auction
  programme semantics.
Commit hash/tag: This entry will be included in `feat(dle): align partner reward language`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-08 - Partner Referral Tracker Reward Labels

Date: 2026-06-08
Branch: refine/homepage-phase1-clarity-trust
Goal: Remove visible internal deal/commission labels from partner referral tracker and referral
detail surfaces so Sale, Rental, and Auction journeys read as referral/reward operations.
Files changed:
- client/src/pages/distribution/PartnerMyReferralsPage.tsx
- client/src/pages/distribution/PartnerMyReferralsPage.test.tsx
- client/src/pages/distribution/PartnerReferralDetailPage.tsx
- client/src/pages/distribution/PartnerReferralDetailPage.test.tsx
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/distribution/PartnerMyReferralsPage.test.tsx client/src/pages/distribution/PartnerReferralDetailPage.test.tsx` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Partner referral tracker status filter now displays `Reward Pending` and `Reward Paid`.
- Partner referral rows now display `Referral #...` instead of `Deal #...`.
- Tracker quick actions now display `Open Rewards` and `Open Referral` instead of
  `Open Commissions` and `Open Deal`.
- Partner referral detail header now displays `Referral #...`.
- Partner referral detail payout action now displays `Open Rewards`.
- Manager follow-up mailto subject/body now references the referral rather than an internal deal.
Guardrails:
- No schema, migration, tRPC route, route path, action code, stage code, payout calculation,
  commission status, deal mutation, lead, inventory, or operating-event changes.
- Internal `dealId` and `commission_*` fields remain as distribution-owned compatibility/model
  terms.
- Rental/Auction payout milestones, document/legal terms, and programme semantics remain future
  product-design work.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Some other admin/internal pages may still correctly use deal/commission terminology where the
  audience is operating the distribution data model rather than viewing partner-facing referrals.
- Deeper Rental/Auction-specific programme semantics remain future product-design work.
Next recommended slice:
- Finish the distribution copy sweep by distinguishing partner-facing reward language from
  admin/internal commission model language, then move to product-defined Rental/Auction programme
  semantics.
Commit hash/tag: This entry will be included in `feat(dle): label partner referral rewards`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-08 - Partner Rewards Navigation Labels

Date: 2026-06-08
Branch: refine/homepage-phase1-clarity-trust
Goal: Finish the partner-facing rewards label cleanup by removing remaining visible
`Commissions`/`Deal #` copy from the referral sidebar and rewards row references.
Files changed:
- client/src/components/referral/ReferralSidebar.tsx
- client/src/components/referral/ReferralSidebar.test.ts
- client/src/pages/distribution/PartnerCommissionsPage.tsx
- client/src/pages/distribution/PartnerCommissionsPage.test.ts
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/referral/ReferralSidebar.test.ts client/src/pages/distribution/PartnerCommissionsPage.test.ts` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Partner workspace navigation now labels the payout destination as `Rewards` while preserving the
  existing `/distribution/partner/commissions` route.
- Partner rewards rows now display `Referral #...` instead of `Deal #...`.
- Reward page transaction copy remains Sale/Rental/Auction-aware and payout calculations are
  unchanged.
Guardrails:
- No schema, migration, tRPC route, route path, nav destination, badge calculation, payout
  calculation, commission status, deal mutation, lead, inventory, or operating-event changes.
- Internal `commission` route/data-model names remain as distribution-owned compatibility/model
  terms.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Internal/operator surfaces may still use deal/commission language where the audience is managing
  the distribution model directly.
- Deeper Rental/Auction-specific programme semantics remain future product-design work.
Next recommended slice:
- Move from copy sweep to product-defined Rental/Auction programme semantics, starting with a
  focused document/readiness contract for rental lease/deposit and auction bidder-registration
  requirements.
Commit hash/tag: This entry will be included in `feat(dle): label partner rewards navigation`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-09 - Distribution Programme Semantics Contract

Date: 2026-06-09
Branch: refine/homepage-phase1-clarity-trust
Goal: Define the product and operating guardrails required before Rental/Auction distribution work
moves beyond labels into document readiness, stage movement, payout readiness, or reward
automation.
Files changed:
- docs/dle/DISTRIBUTION_PROGRAMME_SEMANTICS_CONTRACT.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `test -f docs/dle/DISTRIBUTION_PROGRAMME_SEMANTICS_CONTRACT.md` passed.
- `rg "Rental Programme Semantics|Auction Programme Semantics|DLE Handoff Rules" docs/dle/DISTRIBUTION_PROGRAMME_SEMANTICS_CONTRACT.md` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Added a dedicated contract for Rental and Auction distribution programme semantics.
- Defined current allowed state, hard not-allowed automation, shared distribution shell ownership,
  Sale baseline semantics, Rental lease/deposit semantics, Auction bidder/registration semantics,
  document template requirements, payout rule requirements, DLE handoff rules, implementation
  order, and non-goals.
- Source-of-truth now warns future DLE sessions not to automate Rental/Auction programme behavior
  from display labels.
- Operating audit now points future distribution/referral work to the contract.
Guardrails:
- Documentation-only slice.
- No schema, migration, tRPC route, runtime behavior, payout calculation, commission status, deal
  mutation, lead, inventory, operating-event, UI component, or test fixture changes.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Contract still needs implementation in future schema/read-model/document-template/product slices.
- Rental/Auction payout and document semantics remain unimplemented until a future code slice
  explicitly adds them.
Next recommended slice:
- Implement the first read-only programme semantics surface: expose configured transaction lane,
  document/readiness roles, and payout trigger labels without changing stage movement or reward
  status.
Commit hash/tag: This entry will be included in `docs(dle): define programme semantics contract`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-09 - Read-Only Partner Programme Semantics Surface

Date: 2026-06-09
Branch: refine/homepage-phase1-clarity-trust
Goal: Implement the first read-only programme semantics surface so partner programme terms show
Sale baseline, Rental lease/deposit readiness, and Auction bidder/outcome readiness without
changing distribution stage or reward behavior.
Files changed:
- client/src/components/distribution/partner/partnerProgramTermsCopy.ts
- client/src/components/distribution/partner/PartnerProgramTermsCard.tsx
- client/src/components/distribution/partner/ProgramRequirementsDialog.tsx
- client/src/components/distribution/partner/PartnerProgramTermsCard.test.tsx
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/distribution/partner/PartnerProgramTermsCard.test.tsx`
  passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Partner programme cards now include a read-only programme semantics panel derived from the
  development transaction type.
- Requirements dialogs now show lane-specific readiness checkpoints:
  - Sale: buyer documents, configured sale milestone, and manager approval where required.
  - Rental: lease signed, deposit received, and rental documents verified.
  - Auction: bidder approved, auction terms accepted, and winning bidder confirmed.
- Rental copy states that a let outcome can support review but does not prove reward readiness by
  itself.
- Auction copy states that an auction sold outcome can support review but does not prove reward
  readiness by itself.
Guardrails:
- No schema, migration, tRPC route, server read model, stage mutation, payout calculation,
  commission status, deal mutation, lead, inventory, or operating-event changes.
- This is a display/readiness guardrail only; configured distribution programme terms remain the
  authority for rewards.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Rental/Auction document templates still do not carry formal lane/readiness-role metadata.
- Rental/Auction payout/readiness automation remains intentionally unimplemented until programme
  terms, document templates, manager review, and tests explicitly support it.
Next recommended slice:
- Add document-template lane/readiness metadata or a read model for required Rental/Auction
  readiness roles, then show missing readiness in manager/admin review without changing payout
  status.
Commit hash/tag: This entry will be included in
`feat(dle): surface programme semantics guardrails`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-09 - Manager Checklist Programme Semantics Readback

Date: 2026-06-09
Branch: refine/homepage-phase1-clarity-trust
Goal: Show managers the missing Rental/Auction document/readiness semantics before automation,
without adding schema fields or changing document, stage, reward, or payout behavior.
Files changed:
- client/src/components/distribution/manager/ManagerDealChecklistPanel.tsx
- client/src/components/distribution/manager/ManagerDealChecklistPanel.test.tsx
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/distribution/manager/ManagerDealChecklistPanel.test.tsx`
  passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Manager deal checklist now includes a read-only programme semantics panel.
- Sale shows as the current baseline for configured document verification and payout milestone
  checks.
- Rental shows missing readiness metadata and required readiness before automation:
  lease signed, deposit received, and rental documents verified.
- Auction shows missing readiness metadata and required readiness before automation:
  bidder approved, auction terms accepted, and winning bidder confirmed.
- The panel explicitly states Rental/Auction document templates do not yet identify the relevant
  readiness roles and warns managers not to move/pay rewards from DLE outcomes alone.
Guardrails:
- No schema, migration, tRPC route, server read model, document mutation, stage mutation, payout
  calculation, commission status, deal mutation, lead, inventory, or operating-event changes.
- Existing document status controls and batch verification actions remain unchanged.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Formal document-template metadata still needs a dedicated schema/read-model slice.
- Admin review surfaces still rely on existing deal/reward tables; the manager checklist now has
  the clearest missing-readiness readback, but admin-specific readiness panels remain future work.
Next recommended slice:
- Design and add explicit document-template lane/readiness metadata or an equivalent read model,
  with tests proving wrong-lane templates are ignored/rejected safely and payout status remains
  unchanged until manager/admin review accepts readiness.
Commit hash/tag: This entry will be included in
`feat(dle): show manager programme semantics readiness`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-09 - Programme Semantics Required-Document Read Model

Date: 2026-06-09
Branch: refine/homepage-phase1-clarity-trust
Goal: Add an equivalent read model for document-template lane/readiness semantics so managers can
see expected roles, configured roles, missing roles, and wrong-lane template warnings without a
schema migration or automation behavior change.
Files changed:
- server/services/distributionProgrammeSemanticsService.ts
- server/services/__tests__/distributionProgrammeSemanticsService.test.ts
- server/services/distributionDealDocumentsService.ts
- client/src/components/distribution/manager/ManagerDealChecklistPanel.tsx
- client/src/components/distribution/manager/ManagerDealChecklistPanel.test.tsx
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/distribution/manager/ManagerDealChecklistPanel.test.tsx`
  passed.
- `pnpm vitest run server/services/__tests__/distributionProgrammeSemanticsService.test.ts`
  passed with local MySQL test setup allowed after sandbox blocked `127.0.0.1:3306`.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Added `buildDistributionProgrammeSemanticsReadModel` to derive:
  transaction lane, expected readiness roles, configured roles, missing roles, wrong-lane template
  warnings, per-document inferred roles, and payout-automation blocking state.
- `getDealChecklist` now includes `computed.programmeSemantics`.
- Manager deal checklist uses the server read model when available, showing:
  - required readiness before automation;
  - configured roles from current templates;
  - missing readiness metadata;
  - wrong-lane template warnings.
- Server tests prove Rental readiness-role derivation, Auction missing payout context, wrong-lane
  Sale document detection in a Rental programme, and `automationAllowed: false`.
- Client tests prove the manager checklist surfaces configured/missing/wrong-lane read model data.
Guardrails:
- No schema, migration, tRPC route, document mutation, stage mutation, payout calculation,
  commission status, deal mutation, lead, inventory, or operating-event changes.
- Existing required-document verification and batch actions remain unchanged.
- The read model is explicitly display-only and does not make Rental/Auction rewards ready.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- The read model infers roles from existing category/code/label data; formal template columns are
  still needed before any blocking or automation behavior can rely on these roles.
- Admin review surfaces do not yet expose the same read model.
Next recommended slice:
- Surface `computed.programmeSemantics` in the admin deal/reward review context, then design the
  formal schema/migration for lane/readiness metadata with backwards-compatible migration rules.
Commit hash/tag: This entry will be included in
`feat(dle): derive programme readiness roles`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-09 - Admin Programme Semantics Readback

Date: 2026-06-09
Branch: refine/homepage-phase1-clarity-trust
Goal: Surface the programme-semantics read model in super-admin deal and reward review rows
without changing payout, stage, commission, document, or operating behavior.
Files changed:
- server/distributionRouter.ts
- client/src/pages/admin/DistributionNetworkPage.tsx
- client/src/pages/admin/DistributionNetworkPage.test.ts
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/admin/DistributionNetworkPage.test.ts` passed.
- `pnpm vitest run server/services/__tests__/distributionProgrammeSemanticsService.test.ts`
  passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Super-admin `listDeals` rows now include `programmeSemantics` derived from existing required
  document templates.
- Super-admin `listCommissionEntries` rows now include the same read model.
- Admin deal-pipeline rows and reward-entry rows show a compact read-only notice for:
  - missing readiness roles;
  - wrong-lane template warnings;
  - automation-disabled state.
- Admin helper tests prove the notice keeps reward automation disabled in the visible copy.
Guardrails:
- No schema, migration, route path, document mutation, stage mutation, payout calculation,
  commission status, deal mutation, lead, inventory, or operating-event changes.
- Admin status override behavior and justification requirements are unchanged.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- The read model still infers roles from existing document category/code/label data.
- Formal document-template columns and migration rules remain future work.
Next recommended slice:
- Design the formal schema/migration for document-template lane/readiness metadata, including
  backwards-compatible defaults and tests for wrong-lane rejection/ignore behavior before any
  payout or stage automation is considered.
Commit hash/tag: This entry will be included in
`feat(dle): show admin programme semantics`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-09 - Admin Required Document Semantics Controls

Date: 2026-06-09
Branch: refine/homepage-phase1-clarity-trust
Goal: Make persisted required-document transaction semantics visible and configurable in the admin
partner-development onboarding drawer without enabling payout, stage, document-verification, or
reward automation.
Files changed:
- client/src/components/admin/distribution/PartnerDevelopmentOnboardingDrawer.tsx
- client/src/components/admin/distribution/PartnerDevelopmentOnboardingDrawer.test.tsx
- docs/dle/DISTRIBUTION_PROGRAMME_SEMANTICS_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/admin/distribution/PartnerDevelopmentOnboardingDrawer.test.tsx`
  passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Each admin required-document row now exposes controls for:
  transaction lane, participant type, readiness role, review owner, required stage, payout
  blocking, public shareability, and programme specificity.
- Existing server-provided metadata is hydrated into the drawer and preserved on save.
- Document starter packs now seed explicit Sale/buyer/developer/supporting semantics where the
  commercial meaning is known.
- Brand presets and copy-to-other-development flows preserve the metadata instead of dropping it.
- Focused component tests prove metadata readback/save preservation and starter-pack semantics in
  the outbound `setDevelopmentRequiredDocuments` payload.
Guardrails:
- No server route, schema, migration, payout calculation, commission status, stage transition,
  document verification, lead, inventory, operating-event, or reward-readiness mutation was added.
- `blocksPayout` remains authoring/readback metadata only.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Manual review actions for Rental lease readiness and Auction bidder readiness are still not
  implemented.
- The authoring controls are functional but dense; future UX polish should make lane-specific
  presets clearer before calling the distribution setup experience complete.
Next recommended slice:
- Design and implement explicit manual review actions/read models for Rental lease readiness and
  Auction bidder readiness, keeping stage and payout automation disabled until review and payout
  rules are proven.
Commit hash/tag: This entry will be included in
`feat(dle): configure document semantics in admin`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-10 - Manual Rental/Auction Readiness Review

Date: 2026-06-10
Branch: refine/homepage-phase1-clarity-trust
Goal: Add explicit manager manual readiness review actions for Rental lease readiness and Auction
bidder readiness without enabling stage, payout, commission, lead, inventory, or reward automation.
Files changed:
- server/services/distributionDealDocumentsService.ts
- server/distributionRouter.ts
- server/__tests__/distributionManagerChecklist.integration.test.ts
- client/src/pages/distribution/ManagerDealChecklistPage.tsx
- client/src/components/distribution/manager/ManagerDealChecklistPanel.tsx
- client/src/components/distribution/manager/ManagerDealChecklistPanel.test.tsx
- docs/dle/DISTRIBUTION_PROGRAMME_SEMANTICS_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/distribution/manager/ManagerDealChecklistPanel.test.tsx`
  passed.
- `pnpm db:migrate:test` passed to bring the local test DB up to the latest document-semantics
  schema.
- `pnpm vitest run server/__tests__/distributionManagerChecklist.integration.test.ts` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `getDealChecklist` now derives lane-specific manual readiness review state for Rental and
  Auction from required-document semantics and prior validation events.
- Rental lease readiness acceptance is blocked until required lease-role documents are verified.
- Auction bidder readiness acceptance is blocked until both auction registration and auction terms
  documents are verified.
- Accepted/rejected manual reviews are stored as `distribution_deal_events` validation events with
  metadata proving `stageChanged`, `commissionChanged`, and `payoutReadyChanged` are false.
- The manager checklist UI shows blockers, notes, accepted/rejected state, actor readback, and
  manual Accept/Reject controls.
Guardrails:
- No schema, migration, stage transition, payout calculation, commission status mutation, reward
  readiness automation, lead mutation, DLE inventory mutation, or operating-event mutation was
  added.
- Manual review acceptance is review context only; it does not replace payout milestone rules.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Manual review readback is currently on the manager checklist; admin deal/reward rows may still
  need compact readback of the latest manual decision.
- Full Rental/Auction reward automation remains intentionally unimplemented until programme terms,
  payout triggers, and override rules are proven.
Next recommended slice:
- Add admin readback or browser proof for manager manual readiness review before considering any
  guarded payout/stage automation.
Commit hash/tag: This entry will be included in
`feat(dle): add manual readiness review`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-10 - Admin Manual Readiness Readback

Date: 2026-06-10
Branch: refine/homepage-phase1-clarity-trust
Goal: Surface manager-recorded Rental/Auction manual readiness decisions in super-admin deal and
reward review rows without adding payout, stage, commission, document, lead, inventory, or reward
automation.
Files changed:
- server/distributionRouter.ts
- client/src/pages/admin/DistributionNetworkPage.tsx
- client/src/pages/admin/DistributionNetworkPage.test.ts
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/admin/DistributionNetworkPage.test.ts` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Super-admin deal rows now include `manualReadinessReviews` derived from the latest
  `manual_readiness_review` validation event per deal and transaction lane.
- Super-admin reward rows now include the same manual readiness readback.
- Reward rows also receive `programmeSemantics`, matching the existing UI expectation and keeping
  semantics warnings visible in the reward review surface.
- Admin UI copy summarizes pending, accepted, and rejected manual readiness reviews while always
  stating that reward automation remains disabled.
Guardrails:
- No schema, migration, stage transition, payout calculation, commission status mutation, reward
  readiness automation, document status mutation, lead mutation, DLE inventory mutation, or
  operating-event mutation was added.
- Manual readiness remains review context only.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Browser proof of a full manager decision appearing in admin rows is still useful before any
  guarded payout/stage automation is considered.
- Full Rental/Auction reward automation remains intentionally unimplemented until programme terms,
  payout triggers, and override rules are proven.
Next recommended slice:
- Add browser proof for manager manual readiness review readback across manager checklist and admin
  deal/reward rows, or begin the next Rental/Auction operating proof that does not automate payout.
Commit hash/tag: This entry will be included in
`feat(dle): show admin manual readiness`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-10 - Admin Manual Readiness Browser Proof

Date: 2026-06-10
Branch: refine/homepage-phase1-clarity-trust
Goal: Prove in-browser that manager-recorded Rental/Auction manual readiness decisions appear in
super-admin deal and reward review rows without changing payout, stage, commission, document
ownership, lead, inventory, or reward automation.
Files changed:
- e2e/dle/distribution-handoff.spec.ts
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-10/qa-dle-admin-manual-readiness-manager-rental.png
- docs/dle/evidence/2026-06-10/qa-dle-admin-manual-readiness-manager-auction.png
- docs/dle/evidence/2026-06-10/qa-dle-admin-manual-readiness-deal-pipeline.png
- docs/dle/evidence/2026-06-10/qa-dle-admin-manual-readiness-reward-rows.png
Tests run:
- `pnpm db:migrate:local` passed and verified `listify_local` distribution schema readiness.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/distribution-handoff.spec.ts --project="Desktop Chrome" --workers=1 -g "shows manager manual readiness"` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The browser test seeds Rental and Auction referral deals with verified readiness documents and
  pending reward rows.
- The manager checklist UI accepts Rental lease readiness and Auction bidder readiness with notes.
- Super-admin deal pipeline rows show the accepted manual readiness decision, reviewer, note, and
  explicit `Reward automation remains disabled` copy.
- Super-admin reward rows show the same manual readiness readback.
- DB assertions prove deal stage and commission status remain unchanged after manual readiness
  acceptance, and validation-event metadata records `stageChanged`, `commissionChanged`, and
  `payoutReadyChanged` as false.
Guardrails:
- No schema, migration file, payout calculation, stage transition, commission status mutation,
  reward readiness automation, lead mutation, DLE inventory mutation, or operating-event mutation
  was added.
- `pnpm db:migrate:local` was required only because the local manual-QA DB was behind the committed
  document-semantics migration.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Manual readiness is now proven as readback context, but full Rental/Auction reward automation is
  still intentionally unimplemented until programme terms, payout triggers, and override rules are
  proven.
Next recommended slice:
- Continue Rental/Auction operating proof that does not automate payout, or begin a separate
  design/test slice for guarded payout/stage automation rules.
Commit hash/tag: This entry will be included in
`test(dle): prove admin manual readiness readback`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-10 - Manager Checklist Truthful Optimistic Readiness

Date: 2026-06-10
Branch: refine/homepage-phase1-clarity-trust
Goal: Prevent the manager checklist from briefly claiming payout/readiness is ready from verified
documents alone when server-owned payout milestone blockers or manual/programme readback still
exist.
Files changed:
- client/src/pages/distribution/ManagerDealChecklistPage.tsx
- client/src/pages/distribution/ManagerDealChecklistPage.test.ts
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/distribution/ManagerDealChecklistPage.test.ts` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Optimistic document-status updates preserve existing server-computed fields such as
  `programmeSemantics` and `manualReadinessReviews`.
- Optimistic updates remove stale document-verification blockers but preserve non-document
  blockers such as payout milestone requirements.
- Local UI can downgrade readiness when a verified document is changed away from verified, but it
  cannot locally upgrade payout readiness ahead of the authoritative backend response.
Guardrails:
- No schema, API, payout calculation, stage transition, commission status mutation, document
  mutation, lead mutation, DLE inventory mutation, or automation behavior was added.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- The visible phrase `Referral Review Ready` still maps to `computed.payoutReady`; future UX may
  need clearer milestone-vs-document wording before guarded Rental/Auction automation.
Next recommended slice:
- Continue with a design/test slice for guarded Rental/Auction payout/stage automation rules, or
  further tighten manager checklist language around document readiness versus payout readiness.
Commit hash/tag: This entry will be included in
`fix(dle): keep manager readiness optimistic state truthful`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-10 - Manager Checklist Manual Review Copy

Date: 2026-06-10
Branch: refine/homepage-phase1-clarity-trust
Goal: Tighten Rental/Auction manager checklist language so verified documents and milestone checks
are described as checklist readiness for manual review, not as solved referral/reward readiness.
Files changed:
- client/src/components/distribution/manager/ManagerDealChecklistPanel.tsx
- client/src/components/distribution/manager/ManagerDealChecklistPanel.test.tsx
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/distribution/manager/ManagerDealChecklistPanel.test.tsx`
  passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Rental readiness card copy now says `Rental Checklist Readiness` and
  `Checklist Not Ready for Manual Review` / `Checklist Ready for Manual Review`.
- Auction readiness card copy now says `Auction Checklist Readiness` and
  `Checklist Not Ready for Manual Review` / `Checklist Ready for Manual Review`.
- Rental and Auction notes explicitly state that payout/reward movement still requires explicit
  transaction-specific programme rules and manual review.
- Focused component tests assert the new language and keep Sale payout copy unchanged.
Guardrails:
- No schema, API, payout calculation, stage transition, commission status mutation, document
  mutation, lead mutation, DLE inventory mutation, or automation behavior was added.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- This is copy/readback correctness only. Full Rental/Auction payout and stage automation still
  requires a separate rules design and tests.
Next recommended slice:
- Design/test the explicit guarded Rental/Auction payout/stage automation rules, keeping them
  disabled until programme terms, document requirements, manager approval, and DLE outcome
  conditions are all represented.
Commit hash/tag: This entry will be included in
`fix(dle): clarify manager checklist readiness copy`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-10 - Rental/Auction Payout Automation Guard

Date: 2026-06-10
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the next Rental/Auction payout/stage automation boundary explicit in code and tests:
shared checklist readiness may be true, but Rental/Auction commission-stage automation must remain
blocked until transaction-specific programme terms, document requirements, manager approval, and
DLE outcome conditions are represented.
Files changed:
- server/services/distributionDealDocumentsService.ts
- server/__tests__/distributionManagerChecklist.integration.test.ts
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- Initial sandboxed `pnpm vitest run server/__tests__/distributionManagerChecklist.integration.test.ts`
  failed with `EPERM 127.0.0.1:3306` while connecting to the local MySQL test DB.
- Escalated `pnpm vitest run server/__tests__/distributionManagerChecklist.integration.test.ts`
  passed with 16 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `getDealChecklist` now exposes `computed.payoutAutomation` with transaction lane, allowed flag,
  and blockers.
- Sale remains the only lane where the existing shared payout-ready shell can allow commission
  stage automation.
- Rental and Auction produce explicit automation blockers even when shared `payoutReady` is true.
- `assertDealPayoutReady` now blocks Rental/Auction commission-stage transitions with a
  transaction-specific guard message.
- Integration tests prove Rental and Auction deals with verified readiness docs and accepted manual
  readiness reviews still cannot move to `commission_pending`.
- The tests also prove the failed transition leaves deal stage, commission status, and commission
  entries unchanged.
Guardrails:
- No schema, migration, payout calculation, commission amount, reward-entry creation, document
  mutation, DLE inventory mutation, lead mutation, or operating-event mutation was added.
- Rental/Auction manual readiness remains review context only.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Sale remains backed by the existing shared stage/milestone model. Full Rental/Auction payout
  automation still requires a separate product-rules slice before it can be enabled.
Next recommended slice:
- Design the explicit Rental/Auction programme rule model for payout triggers such as lease signed,
  deposit received, first rent paid, winning bidder confirmed, auction terms signed, deposit paid,
  and settlement confirmed, then keep implementation behind tests and admin/manual approval gates.
Commit hash/tag: This entry will be included in
`fix(dle): guard rental auction payout automation`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-11 - Transaction Rule Model Readback

Date: 2026-06-11
Branch: refine/homepage-phase1-clarity-trust
Goal: Represent the explicit Sale/Rental/Auction payout-trigger vocabulary and required conditions
in the distribution programme semantics read model without enabling Rental/Auction payout, stage,
commission, document, lead, inventory, or operating automation.
Files changed:
- server/services/distributionProgrammeSemanticsService.ts
- server/services/__tests__/distributionProgrammeSemanticsService.test.ts
- docs/dle/DISTRIBUTION_PROGRAMME_SEMANTICS_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run server/services/__tests__/distributionProgrammeSemanticsService.test.ts`
  passed with 5 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `DistributionProgrammeSemanticsReadModel` now includes `transactionRuleModel`.
- Sale exposes the current shared-shell trigger vocabulary:
  `contract_signed`, `bond_approved`, `transfer_registered`, and `manual_approval`.
- Rental exposes transaction-specific trigger vocabulary:
  `lease_signed`, `deposit_received`, `first_rent_paid`, and `manual_approval`.
- Auction exposes transaction-specific trigger vocabulary:
  `winning_bidder_confirmed`, `auction_terms_signed`, `deposit_paid`,
  `settlement_confirmed`, and `manual_approval`.
- Rental and Auction rule models are explicitly marked `transaction_specific_rules_required`;
  Sale is marked `shared_sale_shell`.
Guardrails:
- No schema, migration, route mutation, payout calculation, commission entry creation,
  deal-stage transition, document verification, lead mutation, DLE inventory mutation, or
  operating-event mutation was added.
- The model is readback/design context only. Runtime Rental/Auction automation remains blocked by
  `computed.payoutAutomation`.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- The rule model is not yet configurable programme data. Rental/Auction automation still needs a
  future admin-authored rule surface and tests before it can become runtime behavior.
Next recommended slice:
- Surface `transactionRuleModel` in manager/admin review copy so ops users can see which explicit
  Rental/Auction rule conditions are still missing before any reward movement is possible.
Commit hash/tag: This entry will be included in
`feat(dle): expose transaction rule model`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-11 - Transaction Rule Model Review Visibility

Date: 2026-06-11
Branch: refine/homepage-phase1-clarity-trust
Goal: Surface the Sale/Rental/Auction transaction rule model in manager and super-admin review
surfaces as read-only operating context without enabling Rental/Auction payout, stage, commission,
document, lead, inventory, or operating automation.
Files changed:
- client/src/components/distribution/manager/ManagerDealChecklistPanel.tsx
- client/src/components/distribution/manager/ManagerDealChecklistPanel.test.tsx
- client/src/pages/admin/DistributionNetworkPage.tsx
- client/src/pages/admin/DistributionNetworkPage.test.ts
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/distribution/manager/ManagerDealChecklistPanel.test.tsx`
  passed with 10 tests.
- `pnpm vitest run client/src/pages/admin/DistributionNetworkPage.test.ts` passed with 10 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Manager deal checklist semantics card now renders `transactionRuleModel` when present.
- The manager surface shows implementation status, payout trigger vocabulary, and required
  conditions before automation.
- Super-admin deal/reward notices now summarize the transaction rule-model status, trigger
  vocabulary, and condition count.
- Focused tests prove Rental rule visibility without claiming reward readiness and keep Sale
  read-only baseline language intact.
Guardrails:
- No schema, migration, API mutation, payout calculation, commission entry creation, deal-stage
  transition, document verification, lead mutation, DLE inventory mutation, or operating-event
  mutation was added.
- This slice is display/readback only. Runtime Rental/Auction automation remains blocked by
  `computed.payoutAutomation`.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- The rule model is visible but not yet admin-configurable programme data. Rental/Auction
  automation still needs a future rule authoring and approval model before runtime enablement.
Next recommended slice:
- Add an admin-authored draft rule configuration surface or continue browser proof that manager
  and admin rows display the transaction rule model correctly for seeded Rental/Auction deals.
Commit hash/tag: This entry will be included in
`feat(dle): show transaction rule model in review`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-11 - Transaction Rule Model Browser Proof

Date: 2026-06-11
Branch: refine/homepage-phase1-clarity-trust
Goal: Prove in-browser that seeded Rental and Auction manager/admin review surfaces show the
transaction rule model as read-only context while manual readiness remains non-automating and
distribution stage/commission state remains unchanged.
Files changed:
- e2e/dle/distribution-handoff.spec.ts
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-11/qa-dle-transaction-rule-manager-rental.png
- docs/dle/evidence/2026-06-11/qa-dle-transaction-rule-manager-auction.png
- docs/dle/evidence/2026-06-11/qa-dle-transaction-rule-admin-deal-pipeline.png
- docs/dle/evidence/2026-06-11/qa-dle-transaction-rule-admin-reward-rows.png
Tests run:
- Initial
  `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/distribution-handoff.spec.ts --project="Desktop Chrome" --workers=1 -g "shows manager manual readiness"`
  failed because the new Auction required-condition copy made a loose `Bidder readiness review`
  locator ambiguous.
- Rerun of the same focused Playwright command passed after tightening the locator.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The manager Rental checklist shows `Transaction rule model`,
  `Transaction-specific rules required`, Rental trigger vocabulary, and the Rental manual-review
  condition.
- The manager Auction checklist shows the same rule-model section with Auction trigger vocabulary
  and the Auction manual-review condition.
- Super-admin deal pipeline rows show transaction-specific rule-model status, trigger vocabulary,
  and required-condition count for seeded Rental and Auction deals.
- Super-admin reward rows show the same rule-model readback.
- Existing DB assertions continue proving manual readiness acceptance does not change deal stage,
  commission status, or payout-readiness metadata.
Guardrails:
- No schema, migration, route mutation, payout calculation, commission entry creation, deal-stage
  transition, document verification, lead mutation, DLE inventory mutation, or operating-event
  mutation was added.
- This slice extends browser proof only. Runtime Rental/Auction automation remains blocked by
  `computed.payoutAutomation`.
- The focused test regenerated older 2026-06-10 manual-readiness evidence screenshots; those files
  were already dirty and are not part of this slice.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- The rule model is visible and browser-proven but still not configurable programme data.
Next recommended slice:
- Add an admin-authored draft rule configuration surface for Rental/Auction payout triggers and
  required conditions, keeping it read-only/non-automating until approval gates and mutation tests
  exist.
Commit hash/tag: This entry will be included in
`test(dle): prove transaction rule model review`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-11 - Draft Transaction Rule Authoring

Date: 2026-06-11
Branch: refine/homepage-phase1-clarity-trust
Goal: Add the first admin-authored Rental/Auction transaction-rule draft surface without enabling
runtime payout, stage, commission, document, lead, inventory, or operating automation.
Files changed:
- client/src/components/admin/distribution/PartnerDevelopmentOnboardingDrawer.tsx
- client/src/components/admin/distribution/PartnerDevelopmentOnboardingDrawer.test.tsx
- docs/dle/DISTRIBUTION_PROGRAMME_SEMANTICS_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/admin/distribution/PartnerDevelopmentOnboardingDrawer.test.tsx`
  passed with 18 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The partner-development onboarding drawer now detects Rental and Auction developments from
  development transaction type.
- Rental exposes draft trigger options: `lease_signed`, `deposit_received`, `first_rent_paid`, and
  `manual_approval`.
- Auction exposes draft trigger options: `winning_bidder_confirmed`, `auction_terms_signed`,
  `deposit_paid`, `settlement_confirmed`, and `manual_approval`.
- Applying a draft rule sets the existing payout milestone to `custom` and writes structured
  `[DLE draft transaction rule]` notes with lane, trigger, required conditions, and automation
  disabled copy.
- Focused tests prove Rental draft notes save with `isReferralEnabled: false`, `payoutMilestone:
  custom`, and the expected trigger note.
Guardrails:
- No schema, migration, route mutation, payout calculation, commission entry creation, deal-stage
  transition, document verification, lead mutation, DLE inventory mutation, or operating-event
  mutation was added.
- Draft transaction-rule notes are programme context only. Runtime Rental/Auction automation
  remains blocked by `computed.payoutAutomation`.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Draft notes are not yet structured persisted rule records. A future slice must parse, review, or
  persist explicit rule state before any runtime gate can consume it.
Next recommended slice:
- Surface saved draft transaction-rule notes in manager/admin rule-model readback, or add a
  server-side parser that recognizes draft notes as context while keeping automation disabled.
Commit hash/tag: This entry will be included in
`feat(dle): draft transaction rule notes`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-11 - Draft Transaction Rule Readback

Date: 2026-06-11
Branch: refine/homepage-phase1-clarity-trust
Goal: Parse saved `[DLE draft transaction rule]` programme notes into manager/admin rule-model
readback while keeping Rental/Auction runtime payout, stage, commission, document, lead, inventory,
and operating automation disabled.
Files changed:
- server/services/distributionProgrammeSemanticsService.ts
- server/services/__tests__/distributionProgrammeSemanticsService.test.ts
- server/services/distributionDealDocumentsService.ts
- server/distributionRouter.ts
- client/src/components/distribution/manager/ManagerDealChecklistPanel.tsx
- client/src/components/distribution/manager/ManagerDealChecklistPanel.test.tsx
- client/src/pages/admin/DistributionNetworkPage.tsx
- client/src/pages/admin/DistributionNetworkPage.test.ts
- docs/dle/DISTRIBUTION_PROGRAMME_SEMANTICS_CONTRACT.md
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run server/services/__tests__/distributionProgrammeSemanticsService.test.ts`
  passed with 7 tests.
- `pnpm vitest run client/src/components/distribution/manager/ManagerDealChecklistPanel.test.tsx client/src/pages/admin/DistributionNetworkPage.test.ts`
  passed with 20 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `parseDraftTransactionRuleNotes` recognizes structured `[DLE draft transaction rule]` notes from
  programme payout milestone notes.
- Parsed draft context includes source, lane, trigger, required conditions, and disabled automation
  status.
- The read model only includes parsed draft context when the saved note lane matches the
  development transaction lane.
- Manager deal checklist readback now receives programme payout milestone notes and shows saved
  draft trigger context.
- Super-admin deal/reward readback now receives programme payout milestone notes and summarizes
  saved draft trigger context.
Guardrails:
- No schema, migration, route mutation, payout calculation, commission entry creation, deal-stage
  transition, document verification, lead mutation, DLE inventory mutation, or operating-event
  mutation was added.
- Parsed draft notes are readback context only. Runtime Rental/Auction automation remains blocked
  by `computed.payoutAutomation`.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- Draft notes are still text-based context, not structured persisted rule records. A future slice
  should add explicit persisted rule state before runtime gates can consume it.
Next recommended slice:
- Add browser proof that a saved draft Rental/Auction rule note appears in manager/admin rule-model
  readback, or design a persisted transaction-rule table behind read-only admin gates.
Commit hash/tag: This entry will be included in
`feat(dle): read draft transaction rules`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-11 - Draft Transaction Rule Browser Proof

Date: 2026-06-11
Branch: refine/homepage-phase1-clarity-trust
Goal: Browser-prove that saved Rental/Auction draft transaction-rule notes render back to manager
and super-admin review surfaces as read-only context while automation remains disabled.
Files changed:
- e2e/dle/distribution-handoff.spec.ts
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-11/qa-dle-transaction-rule-manager-rental.png
- docs/dle/evidence/2026-06-11/qa-dle-transaction-rule-manager-auction.png
- docs/dle/evidence/2026-06-11/qa-dle-transaction-rule-admin-deal-pipeline.png
- docs/dle/evidence/2026-06-11/qa-dle-transaction-rule-admin-reward-rows.png
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/distribution-handoff.spec.ts --project="Desktop Chrome" --workers=1 -g "shows manager manual readiness"`
  passed with 1 test.
Functional proof:
- The seeded Rental programme saves structured draft notes using the Deposit Received trigger and
  the seeded Auction programme saves structured draft notes using the Winning Bidder Confirmed
  trigger.
- Manager Rental and Auction checklist pages show the transaction rule model, saved draft rule
  notes, selected trigger, and draft required-condition text.
- Super-admin deal and reward rows show the saved draft rule summary for Rental and Auction.
- Existing assertions still verify manual readiness decisions appear in admin readback and that
  distribution stage/commission state remain unchanged.
Guardrails:
- No app runtime code, schema, migration, route, payout calculation, commission movement, stage
  transition, document verification, lead mutation, DLE inventory mutation, or operating-event
  mutation was added.
- Draft transaction-rule notes remain review context only. Rental/Auction reward automation stays
  blocked until explicit transaction-specific programme terms, document rules, manager/admin gates,
  and DLE outcome conditions are implemented and tested.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Notes:
- The first browser run exposed locator ambiguity because the same trigger/condition copy now
  appears in both the rule vocabulary/conditions and saved draft notes. The spec was tightened to
  distinguish list-item vocabulary from saved `Trigger:` readback instead of weakening coverage.
Remaining risks:
- Draft notes are still text-based context, not structured persisted rule records. Runtime gates
  should not consume them until an explicit persisted rule model exists.
Next recommended slice:
- Design the persisted transaction-rule review/publish model behind read-only admin gates, or move
  back to the next DLE transaction proof slice if the operating layer is intentionally paused.
Commit hash/tag: This entry will be included in
`test(dle): prove draft transaction rule readback`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-11 - Lead Outcome Transaction Readback Labels

Date: 2026-06-11
Branch: refine/homepage-phase1-clarity-trust
Goal: Make selected-lead outcome sync visibly transaction-native in the developer Leads Control
Center without changing canonical lead stages, distribution stages, reward state, or payout
semantics.
Files changed:
- client/src/components/developer/LeadsManager.tsx
- e2e/dle/lead-outcome-sync.spec.ts
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-07/qa-dle-lead-outcome-sync-sale-sold.png
- docs/dle/evidence/2026-06-07/qa-dle-lead-outcome-sync-invalid-no-false-success.png
- docs/dle/evidence/2026-06-07/qa-dle-lead-outcome-sync-rental-let.png
- docs/dle/evidence/2026-06-07/qa-dle-lead-outcome-sync-auction-sold.png
- docs/dle/evidence/2026-06-07/qa-dle-lead-outcome-sync-auction-withdrawn.png
Tests run:
- `pnpm run check` passed before browser proof.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/lead-outcome-sync.spec.ts --project="Desktop Chrome" --workers=1`
  passed with 3 tests.
Functional proof:
- Sale selected-lead sync still moves the explicit selected lead through the existing
  `lead_stage_changed` path and now shows `Sold` as outcome readback in the list row and detail
  panel.
- Rental selected-lead sync still uses canonical `closed_won` stage projection, while the Leads
  Control Center now shows `Lease signed / Let`.
- Auction selected-lead sync now shows `Sold at auction` for won bidder context and
  `Withdrawn follow-up` for explicit loss follow-up context.
- The existing unsafe direct-close rejection still proves no false success and no extra operating
  event is written for an invalid lead-stage transition.
Guardrails:
- No route, schema, migration, lead transition rule, distribution deal-stage, commission, payout,
  document verification, inventory mutation, or operating-event mutation was changed.
- Canonical `closed_won` / `closed_lost` stage values remain visible for audit and filtering.
- The new labels are readback overlays only; they do not imply distribution/reward readiness.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- This slice still derives the label in the UI from development transaction type and lead notes for
  Auction loss-follow-up nuance. A future structured lead-outcome projection should remove that
  note-based inference if reporting needs become deeper.
Next recommended slice:
- Continue operating-layer reporting with linked outcome/lead/distribution context on dashboard
  review surfaces, or design structured lead-outcome projection if note-derived labels become too
  weak for audit/reporting.
Commit hash/tag: This entry will be included in
`feat(dle): label lead outcome readback`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-11 - Structured Lead Outcome Readback

Date: 2026-06-11
Branch: refine/homepage-phase1-clarity-trust
Goal: Move developer lead outcome labels from UI note inference to structured readback sourced
from DLE `lead_stage_changed` operating events, without changing lead transitions, inventory
outcomes, distribution stages, reward state, or payout semantics.
Files changed:
- server/services/developerFunnelService.ts
- server/services/__tests__/developerFunnelService.contract.test.ts
- client/src/components/developer/LeadsManager.tsx
- e2e/dle/lead-outcome-sync.spec.ts
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-07/qa-dle-lead-outcome-sync-sale-sold.png
- docs/dle/evidence/2026-06-07/qa-dle-lead-outcome-sync-invalid-no-false-success.png
- docs/dle/evidence/2026-06-07/qa-dle-lead-outcome-sync-rental-let.png
- docs/dle/evidence/2026-06-07/qa-dle-lead-outcome-sync-auction-sold.png
- docs/dle/evidence/2026-06-07/qa-dle-lead-outcome-sync-auction-withdrawn.png
Tests run:
- `pnpm run check` passed.
- `pnpm vitest run server/services/__tests__/developerFunnelService.contract.test.ts` passed with
  7 tests after rerunning outside the sandbox so it could reach the local MySQL test database.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/lead-outcome-sync.spec.ts --project="Desktop Chrome" --workers=1`
  passed with 3 tests.
Functional proof:
- `deriveLeadOutcomeReadbackFromEvent` parses only `lead_stage_changed` operating events that carry
  a `displayLabel`, returning label, outcome, source event id, from-stage, to-stage, and source.
- `listDeveloperLeads` now attaches the latest structured `lead.outcome` readback for returned
  leads from `development_operating_events`.
- The Leads Control Center prefers structured `lead.outcome.label` and only falls back to legacy
  transaction/note inference for older rows without event readback.
- Browser/API proof verifies Sale `Sold`, Rental `Lease signed / Let`, Auction `Sold at auction`,
  and Auction `Withdrawn follow-up` readback through the developer lead read model and visible UI.
Guardrails:
- No route, schema, migration, lead transition rule, distribution deal-stage, commission, payout,
  document verification, inventory mutation, or operating-event mutation was changed.
- The operating event readback is display context only. It does not become a new authority for
  lead transitions, distribution handoff, commission readiness, or reward payout.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- The structured readback still depends on `displayLabel` metadata written by the existing lead
  sync mutation. If future reporting needs require richer analytics, add a persisted
  lead-outcome projection or typed metadata contract instead of deriving broader state from labels.
Next recommended slice:
- Add dashboard review context that links inventory outcome, selected lead sync, and distribution
  handoff state in one read-only operating surface, without moving distribution deal stages from
  DLE.
Commit hash/tag: This entry will be included in
`feat(dle): structure lead outcome readback`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-11 - Operating Review Context

Date: 2026-06-11
Branch: refine/homepage-phase1-clarity-trust
Goal: Add a read-only dashboard review context that links inventory outcome, selected-lead sync,
and distribution handoff state in one operating surface without moving distribution stages,
commission state, reward state, payout readiness, lead stages, or DLE inventory.
Files changed:
- client/src/components/developer/Overview.tsx
- client/src/components/developer/Overview.test.ts
- e2e/dle/distribution-handoff.spec.ts
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-07/qa-dle-distribution-handoff-review-readback.png
- docs/dle/evidence/2026-06-07/qa-dle-distribution-handoff-manager-readback.png
- docs/dle/evidence/2026-06-07/qa-dle-distribution-handoff-manager-acknowledged.png
- docs/dle/evidence/2026-06-07/qa-dle-distribution-handoff-developer-acknowledged.png
Tests run:
- `pnpm vitest run client/src/components/developer/Overview.test.ts` passed with 12 tests.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/distribution-handoff.spec.ts --project="Desktop Chrome" --workers=1 -g "requests referral handoff review without changing"`
  passed with 1 test after tightening stale/ambiguous selectors.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The Developer Control Tower now shows an `Operating Review` card for the selected development.
- The card reads back separate `Inventory outcome`, `Selected lead sync`, and `Referral handoff`
  lanes.
- Missing inventory and lead states are explicit: `Inventory outcome not recorded` and
  `Lead sync not recorded`.
- The referral handoff lane reads back `Review requested` plus the developer handoff note after a
  Sale referral review request.
- Existing browser proof still verifies manager readback, manager acknowledgement, developer
  acknowledgement readback, DLE audit event, distribution note events, and unchanged deal stage and
  commission state.
Guardrails:
- No schema, migration, route, mutation, stage transition, commission movement, payout readiness,
  document verification, lead transition, DLE inventory mutation, or operating-event write path was
  changed.
- The new dashboard surface is readback only. It links operating context without becoming an
  authority for inventory outcomes, selected-lead sync, distribution handoff, rewards, or payouts.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- The Operating Review card currently chooses the latest matching event/readback per lane. Deeper
  audit workflows may need a typed linkage model connecting a specific inventory outcome, lead sync,
  and distribution handoff as one review bundle.
Next recommended slice:
- Add a richer dashboard proof where all three lanes are recorded and linked, or design a typed
  operating review linkage model before using the card for manager/admin decision workflows.
Commit hash/tag: This entry will be included in
`feat(dle): show operating review context`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-11 - Rental Operating Review Linked Lanes

Date: 2026-06-11
Branch: refine/homepage-phase1-clarity-trust
Goal: Browser-prove that the developer dashboard Operating Review can show a Rental inventory
outcome, selected-renter lead sync, and referral handoff review together as separate recorded
lanes without changing distribution stage, commission status, payout readiness, or DLE inventory
ownership beyond the explicit Rental outcome.
Files changed:
- client/src/components/developer/Overview.tsx
- client/src/components/developer/Overview.test.ts
- e2e/dle/distribution-handoff.spec.ts
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-07/qa-dle-operating-review-rental-linked-lanes.png
Tests run:
- `pnpm vitest run client/src/components/developer/Overview.test.ts` passed with 12 tests.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/distribution-handoff.spec.ts --project="Desktop Chrome" --workers=1 -g "shows Rental operating review"`
  passed with 1 test after rerunning outside the restricted sandbox so Chromium could launch.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- A seeded Rental development starts with held rental inventory and a selected renter lead in the
  deal stage.
- The developer dashboard marks the held unit `let`, creating an `inventory_status_changed` event
  and showing `Inventory outcome` / `held -> let` in Operating Review.
- The Leads Control Center syncs the selected renter lead and shows `Lease signed / Let`.
- The developer dashboard then requests a referral handoff review and the Operating Review card
  shows `Review requested` with the handoff note.
- DB assertions verify the operating event order:
  `distribution_handoff_created`, `lead_stage_changed`, and `inventory_status_changed`.
- DB assertions verify the distribution deal stage and commission status remain unchanged.
Guardrails:
- No schema, migration, route, payout calculation, commission movement, distribution stage
  transition, document verification, or hidden Rental reward automation was added.
- The Operating Review card remains readback only. It links recorded facts without becoming the
  authority for lead transitions, referral deal movement, rewards, or payouts.
- The dashboard now fetches up to 20 operating events for selected-development review context so
  unrelated notes do not easily push inventory/lead/handoff lanes out of the readback window.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Remaining risks:
- The three lanes are still matched by latest event per lane, not by a typed review bundle linking
  one inventory outcome to one lead sync and one distribution handoff.
- Auction now has the same all-three-lanes Operating Review proof, but the readback still uses
  latest-event-per-lane matching rather than a typed review bundle.
Next recommended slice:
- Design typed operating-review linkage if the dashboard should support manager/admin decisions
  against one specific inventory outcome, lead sync, and distribution handoff bundle.
Commit hash/tag: This entry will be included in
`test(dle): prove rental operating review lanes`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-12 - Auction Operating Review Linked Lanes

Date: 2026-06-12
Branch: refine/homepage-phase1-clarity-trust
Goal: Browser-prove that the developer dashboard Operating Review can show an Auction outcome,
selected-bidder lead sync, and referral handoff review together as separate recorded lanes without
changing distribution stage, commission status, payout readiness, or Auction packaging ownership
beyond the explicit Auction outcome.
Files changed:
- e2e/dle/distribution-handoff.spec.ts
- docs/dle/OPERATING_LAYER_AUDIT.md
- docs/dle/OUTCOME_HANDOFF_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-07/qa-dle-operating-review-auction-linked-lanes.png
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/distribution-handoff.spec.ts --project="Desktop Chrome" --workers=1 -g "shows Auction operating review"`
  passed with 1 test after rerunning outside the restricted sandbox so Chromium could launch.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- A seeded Auction development starts with an active auction lot and a selected bidder lead in the
  deal stage.
- The developer dashboard marks the active lot `sold`, creating an `auction_outcome_recorded`
  event and showing `Auction outcome` / `active -> sold` in Operating Review.
- The Leads Control Center syncs the selected bidder lead and shows `Sold at auction`.
- The developer dashboard then requests a referral handoff review and the Operating Review card
  shows `Review requested` with the handoff note.
- DB assertions verify the operating event order:
  `distribution_handoff_created`, `lead_stage_changed`, and `auction_outcome_recorded`.
- DB assertions verify the distribution deal stage and commission status remain unchanged.
Guardrails:
- No schema, migration, route, payout calculation, commission movement, distribution stage
  transition, document verification, or hidden Auction reward automation was added.
- The Operating Review card remains readback only. It links recorded facts without becoming the
  authority for bidder lead transitions, referral deal movement, rewards, or payouts.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Notes:
- The first browser run exposed that the Auction outcome button's accessible name includes the lot
  name. The selector was tightened to match the real accessible label instead of visible text only.
Remaining risks:
- Rental and Auction now have all-three-lanes proof, but the card still matches latest event per
  lane. A future typed review bundle is needed before the surface becomes a decision-grade
  manager/admin workflow.
Next recommended slice:
- Decide whether to design typed operating-review linkage next, or return to packaging/product
  experience upgrades now that Rental and Auction have stronger operating readback parity.
Commit hash/tag: This entry will be included in
`test(dle): prove auction operating review lanes`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-12 - Wizard Engine Band Browser Proof

Date: 2026-06-12
Branch: refine/homepage-phase1-clarity-trust
Goal: Browser-prove that Rental and Auction saved-draft resume flows show the transaction-engine
guidance band in the real wizard shell before publish, then continue through manual save, publish,
public merchandising, search, and transaction-native lead capture.
Files changed:
- e2e/dle/rental-auction-wizard-save-publish.spec.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-04/qa-dle-rental-wizard-engine-band.png
- docs/dle/evidence/2026-06-04/qa-dle-auction-wizard-engine-band.png
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/rental-auction-wizard-save-publish.spec.ts --project="Desktop Chrome" --workers=1`
  passed with 2 tests after rerunning outside the restricted sandbox so Chromium could launch.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Rental saved draft resume shows `Rental Engine`, `Monthly rent ranges`, rental public-output
  language, and the `review_publish` packaging focus before publish.
- Auction saved draft resume shows `Auction Engine`, `Auction window`, auction public-output
  language, and the `review_publish` packaging focus before publish.
- The same browser run still verifies manual Save Draft, canonical draft data, publish, public
  page, search card, unit-level lead dialog context, transaction-native lead submit labels, and DB
  lead context for both lanes.
Guardrails:
- No app runtime behavior, schema, migration, route, save, publish, lead, distribution, or
  operating mutation was changed.
- The spec now follows the current transaction-native public CTA labels:
  `Request Rental Details` and `Register Auction Interest` / `Request Auction Details`.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes were not staged.
Notes:
- The first browser run exposed stale generic lead CTA selectors after the product UI had already
  moved to transaction-native labels. The spec was tightened to assert the current labels rather
  than preserving generic `Request Callback` / `Send Enquiry` wording.
- The full browser path now has a 120-second per-test timeout because each lane covers draft
  resume, manual save, publish, public page, search, lead dialog, lead submission, and DB readback.
Remaining risks:
- Sale engine-band browser proof is still component-level only in this slice. Rental and Auction
  were prioritized because they needed parity before broader UI upgrades.
Next recommended slice:
- Add Sale browser proof for the wizard engine band if we want all three lanes browser-proven, or
  move to the next product gap: live public-preview feedback for identity, highlights, and media.
Commit hash/tag: This entry will be included in
`test(dle): prove wizard engine band`.
Uncommitted reason, if any: None. Slice will be committed after final hygiene checks.

## 2026-06-12 - Sale Wizard Engine Band Browser Proof

Date: 2026-06-12
Branch: refine/homepage-phase1-clarity-trust
Goal: Browser-prove that a saved Sale canonical draft resumes into the real wizard shell with the
Sale Engine guidance band visible before the next UI/product upgrade slice.
Files changed:
- e2e/dle/sale-wizard-engine-band.spec.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-12/qa-dle-sale-wizard-engine-band.png
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/sale-wizard-engine-band.spec.ts --project="Desktop Chrome" --workers=1`
  passed with 1 test after rerunning outside the restricted sandbox so Chromium could launch.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- A seeded Sale canonical draft appears in `/developer/drafts` with one unit type.
- Resuming the saved draft lands on `/developer/create-development?draftId=...` at the
  review/publish shell with `Publishing Controls`, `Save Draft`, and enabled `Publish Listing`.
- The resumed wizard shows the saved sale identity, sale unit, highlight, sale price, and hero
  media.
- The active wizard shell renders `Sale Engine packaging context` with sale price bands, buyer
  costs, sale public-output language, and the `readiness, publish safety, and public conversion`
  step focus.
Guardrails:
- No app runtime behavior, schema, migration, route, save, publish, lead, distribution, or
  operating mutation is intended in this slice.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes must not be staged.
Remaining risks:
- This is a narrow saved-draft resume proof. It does not re-run Sale publish/public/search/lead
  proof, which was already handled in prior Sale flow slices.
Next recommended slice:
- If this proof passes, move to the next product gap: live public-preview feedback for identity,
  highlights, and media.
Commit hash/tag: Included in `test(dle): prove sale wizard engine band`.
Uncommitted reason, if any: None.

## 2026-06-12 - Wizard Public Preview Feedback

Date: 2026-06-12
Branch: refine/homepage-phase1-clarity-trust
Goal: Add live wizard-shell feedback that tells developers whether identity, highlights, and media
are ready to support buyer-facing public pages, search cards, and unit enquiries before publish.
Files changed:
- client/src/components/wizard/WizardEngine.tsx
- client/src/components/wizard/WizardEngine.test.tsx
- e2e/dle/sale-wizard-engine-band.spec.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-12/qa-dle-sale-wizard-engine-band.png
- docs/dle/evidence/2026-06-12/qa-dle-sale-wizard-public-preview-feedback.png
Tests run:
- `pnpm vitest run client/src/components/wizard/WizardEngine.test.tsx` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/sale-wizard-engine-band.spec.ts --project="Desktop Chrome" --workers=1`
  passed with 1 test.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The wizard shell now renders `Public preview feedback` from canonical wizard data.
- The feedback reports readiness for identity, highlights, and media, with attention-state messages
  when any public-preview basic is missing.
- Component proof verifies a fully ready package shows `3 of 3 ready` and that an incomplete
  package asks for missing identity, two more highlights, and hero media.
- Browser proof resumes a saved Sale canonical draft and verifies the real wizard shell shows the
  feedback panel with ready identity, three highlights, and hero media/gallery feedback.
Guardrails:
- No schema, migration, route, save, publish, lead, distribution, or operating mutation is intended
  in this slice.
- The panel reads canonical wizard data and does not create another persistence source.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes must not be staged.
Remaining risks:
- This first preview-feedback slice covers shared identity/highlights/media basics. Rental-native
  deposit/lease/furnished/availability feedback and Auction-native timing/reserve/legal-pack
  feedback remain separate transaction-engine slices.
Next recommended slice:
- If verification passes, make Rental packaging feel more lease-native inside the wizard, starting
  with deposit, lease term, furnished state, availability, and renter qualification feedback.
Commit hash/tag: Included in `feat(dle): show wizard public preview feedback`.
Uncommitted reason, if any: None.

## 2026-06-12 - Rental Wizard Packaging Feedback

Date: 2026-06-12
Branch: refine/homepage-phase1-clarity-trust
Goal: Make Rental feel lease-native in the wizard shell by surfacing aggregate packaging feedback
for rent, deposit, lease term, furnished state, availability, and renter qualification context.
Files changed:
- client/src/components/wizard/WizardEngine.tsx
- client/src/components/wizard/WizardEngine.test.tsx
- e2e/dle/rental-auction-wizard-save-publish.spec.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-04/qa-dle-rental-wizard-packaging-feedback.png
Tests run:
- `pnpm vitest run client/src/components/wizard/WizardEngine.test.tsx` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/rental-auction-wizard-save-publish.spec.ts --project="Desktop Chrome" --workers=1`
  passed with 2 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The wizard shell now renders `Rental packaging feedback` only for the Rental engine.
- The feedback reads canonical unit inventory and reports readiness for rent range, deposit, lease
  term, furnished state, rental availability, and renter qualification context.
- Component proof verifies a complete rental package shows `6 of 6 ready` and incomplete rental
  inventory asks for deposit, lease term, furnished state, availability, and qualification clarity.
- Browser proof resumes a saved Rental canonical draft and verifies the real wizard shell shows
  `Lease-ready renter journey`, `6 of 6 ready`, rent, deposit, `12 months` lease term, furnished
  state, 8 available rental units, and lead qualification context before continuing through the
  existing Rental/Auction manual save, publish, public page, search, and lead assertions.
Guardrails:
- No schema, migration, route, save, publish, lead, distribution, or operating mutation is intended
  in this slice.
- The panel reads canonical wizard unit inventory and does not create another persistence source.
- Existing unrelated homepage files, older evidence screenshots outside this slice, Playwright
  report output, and test-results changes must not be staged.
Remaining risks:
- Rental qualification is still packaging-level guidance. Deeper qualification semantics such as
  lease ratios and proof-of-income workflows remain future product work.
Next recommended slice:
- Make Auction packaging feel auction-native inside the wizard, starting with auction window,
  reserve strategy, bidder registration, legal-pack readiness, and urgency.
Commit hash/tag: Included in `feat(dle): show rental packaging feedback`.
Uncommitted reason, if any: None.

## 2026-06-12 - Auction Wizard Packaging Feedback

Date: 2026-06-12
Branch: refine/homepage-phase1-clarity-trust
Goal: Make Auction feel bid-native in the wizard shell by surfacing aggregate packaging feedback
for starting bid, auction window, reserve strategy, bidder registration lifecycle, legal-pack
documents, and auction urgency.
Files changed:
- client/src/components/wizard/WizardEngine.tsx
- client/src/components/wizard/WizardEngine.test.tsx
- e2e/dle/rental-auction-wizard-save-publish.spec.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-04/qa-dle-auction-wizard-packaging-feedback.png
Tests run:
- `pnpm vitest run client/src/components/wizard/WizardEngine.test.tsx` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/rental-auction-wizard-save-publish.spec.ts --project="Desktop Chrome" --workers=1`
  passed with 2 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The wizard shell now renders `Auction packaging feedback` only for the Auction engine.
- The feedback reads canonical unit inventory plus media documents and reports readiness for
  starting bid, auction window, reserve strategy, bidder registration lifecycle, legal-pack
  documents, and auction urgency.
- Component proof verifies a complete auction package shows `6 of 6 ready` and incomplete auction
  inventory asks for auction window, reserve, registration lifecycle, legal-pack, and urgency
  clarity.
- Browser proof resumes a saved Auction canonical draft and verifies the real wizard shell shows
  `Bid-ready auction journey`, `6 of 6 ready`, bid, auction window, reserve, scheduled lifecycle,
  1 bidder document, and 2 open lots inside a scheduled auction window before continuing through
  the existing Rental/Auction manual save, publish, public page, search, and lead assertions.
Guardrails:
- No schema, migration, route, save, publish, lead, distribution, or operating mutation is intended
  in this slice.
- The panel reads canonical wizard unit inventory and media documents and does not create another
  persistence source.
- Existing unrelated homepage files, older evidence screenshots outside this slice, Playwright
  report output, and test-results changes must not be staged.
Remaining risks:
- Auction bidder qualification is still packaging-level guidance. Deeper bidder registration,
  legal-pack acceptance, and proof-of-funds workflows remain future product work.
Next recommended slice:
- Decide whether to move to deeper Rental/Auction qualification semantics, or strengthen public
  development pages with transaction-specific merchandising beyond current wizard feedback.
Commit hash/tag: Included in `feat(dle): show auction packaging feedback`.
Uncommitted reason, if any: None.

## 2026-06-12 - Public Detail Transaction Package Proof

Date: 2026-06-12
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the buyer-facing public development page echo the transaction package proof now visible
inside the wizard, so Sale, Rental, and Auction commercial packs show concrete readiness signals
before users reach unit cards or lead forms.
Files changed:
- client/src/pages/DevelopmentDetail.tsx
- client/src/pages/DevelopmentDetail.test.ts
- e2e/dle/public-detail-commercial-pack.spec.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/DevelopmentDetail.test.ts` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/public-detail-commercial-pack.spec.ts --project="Desktop Chrome" --workers=1`
  passed with 1 test.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The public `commercial-pack` section now renders a `Package proof` strip from the existing
  transaction-aware commercial-pack helper.
- Sale proof items cover price package, inventory package, ownership signal, and buyer next step.
- Rental proof items cover monthly rent package, lease terms, deposit expectation, rental
  availability, and renter next step.
- Auction proof items cover starting bid package, auction window, reserve strategy, registration
  lifecycle, bidder next step, legal pack, and lot urgency.
- Component proof verifies helper output for Sale, Rental, and Auction.
- Browser proof seeds real published Rental and Auction developments, opens their public
  `/development/:slug` pages, and verifies the proof strip appears beside existing commercial-pack
  pricing, availability, document, CTA, and mobile fit checks.
Guardrails:
- No schema, migration, route, save, publish, lead, distribution, or operating mutation is intended
  in this slice.
- The new proof strip is presentation-only and reuses the existing public-detail pricing,
  inventory, document, and transaction helpers.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes must not be staged.
Remaining risks:
- Rental and Auction qualification remain packaging-level public signals. Dedicated lease
  qualification ratios, proof-of-income workflows, bidder registration acceptance, and proof-of-funds
  workflows remain future product semantics.
Next recommended slice:
- Move from public-package proof into either richer public transaction storytelling modules or the
  deeper Rental/Auction qualification semantics that turn these signals into dedicated next-step
  workflows.
Commit hash/tag: Included in `feat(dle): surface public package proof`.
Uncommitted reason, if any: None.

## 2026-06-12 - Public Detail Transaction Journey

Date: 2026-06-12
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the public development detail page explain the transaction-specific buyer, renter, or
bidder journey, not only the price/proof/CTA layer, so Rental and Auction feel like real
sub-engines on the public page.
Files changed:
- client/src/pages/DevelopmentDetail.tsx
- client/src/pages/DevelopmentDetail.test.ts
- e2e/dle/public-detail-commercial-pack.spec.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/DevelopmentDetail.test.ts` passed with 23 tests.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/public-detail-commercial-pack.spec.ts --project="Desktop Chrome" --workers=1`
  passed with 1 test.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The public detail page now renders a `transaction-journey` section between the commercial pack
  and available-unit inventory.
- Sale journey copy covers buyer package, qualification, brochure request, and sales-team
  follow-up.
- Rental journey copy covers lease package, rental fit, rental-pack request, and leasing-team
  follow-up.
- Auction journey copy covers bid package, bidder readiness, auction-pack request, and auction-team
  follow-up.
- Component proof verifies Rental and Auction journey helper output.
- Browser proof seeds real published Rental and Auction developments, opens their public
  `/development/:slug` pages, and verifies the transaction journey appears on desktop and mobile
  alongside the existing commercial-pack proof.
Guardrails:
- No schema, migration, route, save, publish, lead, distribution, or operating mutation is intended
  in this slice.
- The journey section is presentation-only and reuses existing public-detail transaction, pricing,
  document, and inventory helpers.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes must not be staged.
Remaining risks:
- The journey is explanatory. Dedicated Rental qualification ratios, proof-of-income workflows,
  bidder registration acceptance, legal-pack acceptance, proof-of-funds workflows, and live
  operating history remain future product semantics.
Next recommended slice:
- Add public document/trust preview for Rental and Auction packs, or move deeper into dedicated
  Rental/Auction qualification semantics if the next priority is conversion correctness over page
  storytelling.
Commit hash/tag: Included in `feat(dle): show public transaction journey`.
Uncommitted reason, if any: None.

## 2026-06-12 - Public Detail Trust Preview

Date: 2026-06-12
Branch: refine/homepage-phase1-clarity-trust
Goal: Add transaction-native document, developer-profile, cost, and review trust signals to the
public development detail page, strengthening Rental and Auction buyer-facing trust before unit
inventory and enquiry.
Files changed:
- client/src/pages/DevelopmentDetail.tsx
- client/src/pages/DevelopmentDetail.test.ts
- e2e/dle/public-detail-commercial-pack.spec.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/DevelopmentDetail.test.ts` passed with 25 tests.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/public-detail-commercial-pack.spec.ts --project="Desktop Chrome" --workers=1`
  passed with 1 test.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The public detail page now renders a `trust-preview` section after the transaction journey and
  before available-unit inventory.
- Sale trust copy covers brochure, developer profile, ownership context, and buyer cost context.
- Rental trust copy covers rental pack, developer profile, lease cost context, and leasing review
  expectations.
- Auction trust copy covers legal pack, developer profile, cost context, and bidder review
  expectations.
- Component proof verifies Rental and Auction trust-preview helper output.
- Browser proof seeds real published Rental and Auction developments, opens their public
  `/development/:slug` pages, and verifies the trust preview appears on desktop and mobile.
Guardrails:
- No schema, migration, route, save, publish, lead, distribution, or operating mutation is intended
  in this slice.
- The trust preview is presentation-only and reuses existing public-detail transaction, document,
  developer-profile, and cost helpers.
- Public route data is treated truthfully: if verified-developer or levy/rates fields are not
  present on the public detail response, the UI shows developer-profile or team-confirmed cost
  fallback text rather than claiming unavailable facts.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes must not be staged.
Remaining risks:
- This is not a dedicated document portal. Rich document metadata, legal-pack acceptance,
  proof-of-income workflows, proof-of-funds workflows, and operating-status history remain future
  product semantics.
Next recommended slice:
- Move from public trust preview into either richer document metadata/pack previews or deeper
  Rental/Auction qualification semantics if conversion correctness is the next priority.
Commit hash/tag: Included in `feat(dle): show public trust preview`.
Uncommitted reason, if any: None.

## 2026-06-12 - Qualification Transaction Models

Date: 2026-06-12
Branch: refine/homepage-phase1-clarity-trust
Goal: Move Rental and Auction qualification from relabelled affordability copy toward
transaction-specific estimate semantics and persist the selected model metadata with qualification
leads.
Files changed:
- client/src/pages/DevelopmentQualificationPage.tsx
- client/src/pages/DevelopmentQualificationPage.test.ts
- server/developerRouter.ts
- server/services/publicLeadCaptureService.ts
- server/__tests__/contract.developer-create-lead.test.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/pages/DevelopmentQualificationPage.test.ts` passed with 6 tests.
- `pnpm vitest run server/__tests__/contract.developer-create-lead.test.ts` initially failed inside
  sandbox with `EPERM 127.0.0.1:3306`; rerun with local DB access passed with 3 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The qualification route now uses `getDevelopmentQualificationModel` to select a model per
  transaction lane.
- Sale uses `sale_affordability` with bond-style affordability semantics.
- Rental uses `rental_fit` with a 30% income-to-rent guide after monthly commitments.
- Auction uses `bidder_readiness` with a conservative 28% income guide plus available cash
  contribution.
- The selected model, capacity label, monthly capacity, and ratio are visible in the qualification
  UI and included in `affordabilityData`.
- `developer.createLead` now accepts and passes qualification model metadata to public lead capture.
Guardrails:
- No autosave, draft, publish, schema, migration, public detail, search card, unit card, operating
  mutation, or distribution automation is intended in this slice.
- The model remains an early estimate. It does not approve leases, register bidders, verify proof of
  funds, or move distribution payout/readiness stages.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes must not be staged.
Remaining risks:
- Rental proof-of-income capture, lease application workflow, Auction legal-pack acceptance,
  bidder registration, and proof-of-funds workflows remain future product semantics.
Next recommended slice:
- Continue qualification depth with document/readiness capture for Rental and Auction, or move to
  operating-dashboard visibility for post-publish lead stages and inventory outcomes.
Commit hash/tag: Included in `feat(dle): add qualification models`.
Uncommitted reason, if any: None.

## 2026-06-12 - Lead Qualification Operating Visibility

Date: 2026-06-12
Branch: refine/homepage-phase1-clarity-trust
Goal: Carry saved Sale/Rental/Auction qualification model metadata from lead capture into the
developer lead operating surface.
Files changed:
- client/src/components/developer/LeadsManager.tsx
- client/src/components/developer/leadQualificationDisplay.ts
- client/src/components/developer/leadQualificationDisplay.test.ts
- server/services/developerFunnelService.ts
- server/services/__tests__/developerFunnelService.contract.test.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/developer/leadQualificationDisplay.test.ts` passed with 4 tests.
- `pnpm vitest run server/services/__tests__/developerFunnelService.contract.test.ts` passed with 8 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Developer lead read models now include parsed saved `affordabilityData` when present.
- The Leads Control Center shows a qualification badge on lead rows when saved qualification
  context exists.
- The selected lead detail shows Qualification Context with model and capacity language.
- Sale affordability, Rental fit, and Bidder readiness labels are covered by helper tests.
- The server funnel contract covers safe parsing of saved qualification JSON for read-model use.
Guardrails:
- No schema, migration, lead-capture mutation, qualification calculation, autosave, publish,
  distribution automation, or operating-stage mutation is intended in this slice.
- The surfaced context is read-only. It does not approve a lease, register a bidder, verify proof
  of funds, or move payout/readiness stages.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes must not be staged.
Remaining risks:
- Rental proof-of-income capture and lease application review remain future semantics.
- Auction legal-pack acceptance, bidder registration, and proof-of-funds workflows remain future
  semantics.
Next recommended slice:
- Continue operating-layer depth with transaction-specific lead stage language/actions, or move
  deeper into Rental/Auction document/readiness capture before automating any readiness movement.
Commit hash/tag: Included in `feat(dle): show lead qualification context`.
Uncommitted reason, if any: None.

## 2026-06-12 - Transaction-Aware Lead Operating Labels

Date: 2026-06-12
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the developer lead operating surface read as Sale, Rental, or Auction work instead of
showing one generic sales pipeline vocabulary for every transaction lane.
Files changed:
- client/src/components/developer/LeadsManager.tsx
- client/src/components/developer/leadOperatingStageDisplay.ts
- client/src/components/developer/leadOperatingStageDisplay.test.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/developer/leadOperatingStageDisplay.test.ts` passed with 4 tests.
- `pnpm vitest run client/src/components/developer/leadQualificationDisplay.test.ts` passed with 4 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Lead row and detail stage badges now show transaction-aware labels while preserving canonical
  stage values underneath.
- Transition options now display transaction-aware labels without changing mutation payloads.
- Next-action quick buttons, selector labels, and timeline readback now adapt to Sale, Rental, and
  Auction context.
- Helper tests cover Sale buyer/sale language, Rental renter/lease language, Auction bidder/pack
  language, and fallback handling.
Guardrails:
- No schema, migration, lead-stage transition graph, mutation payload, SLA rule, distribution gate,
  outcome sync, autosave, draft, publish, or lead-capture behavior is intended in this slice.
- Canonical stages remain shared; this slice only improves operator-facing language.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes must not be staged.
Remaining risks:
- Rental still needs true lease application/document readiness workflows.
- Auction still needs bidder registration, legal-pack acceptance, and proof-of-funds workflows.
- Deeper dashboards and operating audit history remain future.
Next recommended slice:
- Continue lead operations with transaction-specific stage guidance/readiness prompts, or move into
  Rental/Auction document readiness capture before automating any readiness state.
Commit hash/tag: Included in `feat(dle): label lead operations by transaction`.
Uncommitted reason, if any: None.

## 2026-06-12 - Transaction-Aware Lead Stage Guidance

Date: 2026-06-12
Branch: refine/homepage-phase1-clarity-trust
Goal: Add operator-facing guidance to the lead detail surface so Sale, Rental, and Auction stages
explain their lane-specific next proof and guardrail.
Files changed:
- client/src/components/developer/LeadsManager.tsx
- client/src/components/developer/leadStageGuidance.ts
- client/src/components/developer/leadStageGuidance.test.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/developer/leadStageGuidance.test.ts` passed with 4 tests.
- `pnpm vitest run client/src/components/developer/leadOperatingStageDisplay.test.ts` passed with 4 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The selected lead detail now shows a Stage Guidance panel.
- Guidance is selected from the canonical lead stage and normalized development transaction type.
- Sale guidance covers buyer intent, finance/deposit path, offer tracking, and sale completion proof.
- Rental guidance covers renter intent, rental fit, proof-of-income/deposit readiness, application
  review, and lease review.
- Auction guidance covers bidder intent, auction-pack/legal-pack access, bid intent, bidder
  readiness, and manual auction outcome evidence.
- Helper tests cover Sale, Rental, Auction, and fallback guidance.
Guardrails:
- No schema, migration, transition graph, mutation payload, SLA rule, distribution gate, outcome
  sync, lead-capture behavior, autosave, draft, or publish behavior is intended in this slice.
- Guidance is read-only and does not approve leases, register bidders, verify proof of funds, or
  automate readiness movement.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes must not be staged.
Remaining risks:
- Rental still needs real document capture and lease application workflow semantics.
- Auction still needs real bidder registration, legal-pack acceptance, and proof-of-funds workflow
  semantics.
- Deeper dashboards and operating audit history remain future.
Next recommended slice:
- Move from guidance to explicit Rental/Auction document/readiness capture models, or add
  transaction-specific lead detail evidence fields before automating any readiness state.
Commit hash/tag: Included in `feat(dle): guide lead stages by transaction`.
Uncommitted reason, if any: None.

## 2026-06-12 - Transaction-Aware Lead Evidence Checklist

Date: 2026-06-12
Branch: refine/homepage-phase1-clarity-trust
Goal: Make the developer lead detail surface show lane-specific evidence prompts for Sale, Rental,
and Auction without claiming readiness has been achieved.
Files changed:
- client/src/components/developer/LeadsManager.tsx
- client/src/components/developer/leadEvidenceChecklist.ts
- client/src/components/developer/leadEvidenceChecklist.test.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/developer/leadEvidenceChecklist.test.ts` passed with 4 tests.
- `pnpm vitest run client/src/components/developer/leadStageGuidance.test.ts` passed with 4 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The selected lead detail now shows a transaction-specific Evidence checklist.
- Sale checklist prompts buyer intent, finance path, unit context, and sale completion proof.
- Rental checklist prompts rental fit, proof of income, deposit readiness, and lease review.
- Auction checklist prompts bidder intent, legal-pack access, proof of funds, and registration review.
- Checklist items use explicit Capture, Manual review, or Optional status labels.
- Helper tests cover Sale, Rental, Auction, and status-label rendering.
Guardrails:
- No schema, migration, persistence, readiness state, lead mutation, transition graph, SLA rule,
  distribution gate, outcome sync, autosave, draft, publish, or inventory update behavior is
  intended in this slice.
- The checklist is a prompt for required evidence. It does not claim evidence is collected, approve
  leases, register bidders, verify funds, or automate readiness movement.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes must not be staged.
Remaining risks:
- Rental still needs persisted document capture and lease application workflow semantics.
- Auction still needs persisted bidder registration, legal-pack acceptance, and proof-of-funds
  workflow semantics.
- Deeper dashboards and operating audit history remain future.
Next recommended slice:
- Add persisted Rental/Auction evidence capture/readiness models, or create browser proof for the
  lead operating panels before moving toward automation.
Commit hash/tag: Included in `feat(dle): show lead evidence checklist`.
Uncommitted reason, if any: None.

## 2026-06-12 - Lead Evidence Review Activity Notes

Date: 2026-06-12
Branch: refine/homepage-phase1-clarity-trust
Goal: Let operators turn transaction-specific evidence prompts into a lead activity note without
introducing premature readiness automation.
Files changed:
- client/src/components/developer/LeadsManager.tsx
- client/src/components/developer/leadEvidenceChecklist.ts
- client/src/components/developer/leadEvidenceChecklist.test.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/developer/leadEvidenceChecklist.test.ts` passed with 5 tests.
- `pnpm vitest run client/src/components/developer/leadStageGuidance.test.ts` passed with 4 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The Evidence checklist panel now includes a Prepare note action.
- Prepare note sets the activity type to `note` and pre-fills the activity description with a
  transaction-specific evidence review template.
- The generated note lists each evidence item with its Capture or Manual review status and ends
  with `Decision: pending manual review.`
- Helper tests cover the generated Auction evidence review note and status-label rendering.
Guardrails:
- No schema, migration, structured evidence persistence, readiness state, lead transition, SLA rule,
  distribution gate, outcome sync, autosave, draft, publish, or inventory update behavior is
  intended in this slice.
- The generated note uses the existing activity log path. It does not mark evidence complete,
  approve leases, register bidders, verify funds, or automate readiness movement.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  test-results changes must not be staged.
Remaining risks:
- Rental still needs persisted document capture and lease application workflow semantics.
- Auction still needs persisted bidder registration, legal-pack acceptance, and proof-of-funds
  workflow semantics.
- Deeper dashboards and operating audit history remain future.
Next recommended slice:
- Create browser proof for the lead operating panels, or move to a structured evidence/readiness
  model once the manual note flow is proven enough for the product direction.
Commit hash/tag: Included in `feat(dle): prepare evidence review notes`.
Uncommitted reason, if any: None.

## 2026-06-13 - Lead Evidence Panel Browser Proof

Date: 2026-06-13
Branch: refine/homepage-phase1-clarity-trust
Goal: Prove the Rental/Auction lead operating evidence panels in browser and keep the activity-note
capture path working against the local schema.
Files changed:
- e2e/dle/lead-outcome-sync.spec.ts
- server/services/developerFunnelService.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/lead-outcome-sync.spec.ts --project="Desktop Chrome" --workers=1 -g "renders transaction evidence panels"` passed with 1 test.
- `pnpm vitest run client/src/components/developer/leadEvidenceChecklist.test.ts` passed with 5 tests.
- `pnpm vitest run server/services/__tests__/developerFunnelService.contract.test.ts` passed with 8 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- Rental lead detail renders Stage Guidance and Rental evidence checklist in browser.
- Rental Prepare note fills the activity composer and saves through the existing activity log path.
- Database proof verifies a saved `note` activity containing Rental evidence review and Proof of
  income language.
- Auction lead detail renders Stage Guidance and Auction evidence checklist in browser.
- Auction Prepare note fills the activity composer with Auction evidence checklist, Registration
  review, and pending-manual-review language.
- Existing lead outcome browser assertions now expect transaction-aware stage labels instead of raw
  canonical stage IDs.
- `logDeveloperLeadActivity`, lead transition activity, and next-action activity now write to
  local `lead_activities` via compatibility SQL using the actual `activityType` column.
Guardrails:
- No schema, migration, structured evidence persistence, readiness state, transition graph, SLA rule,
  distribution gate, outcome sync semantics, autosave, draft, publish, or inventory update behavior
  is intended in this slice.
- The activity compatibility insert preserves the manual activity path; it does not automate
  readiness movement or claim evidence completion.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Rental still needs persisted document capture and lease application workflow semantics.
- Auction still needs persisted bidder registration, legal-pack acceptance, and proof-of-funds
  workflow semantics.
- Deeper dashboards and operating audit history remain future.
Next recommended slice:
- Move toward a structured evidence/readiness model only after deciding the manual note flow is
  insufficient, or add dashboard/readback proof for saved lead activity notes.
Commit hash/tag: Included in `test(dle): prove lead evidence panels`.
Uncommitted reason, if any: None.

## 2026-06-13 - Lead Evidence Activity Timeline Readback

Date: 2026-06-13
Branch: refine/homepage-phase1-clarity-trust
Goal: Make evidence review notes saved through the existing lead activity path visible again in the
developer lead detail timeline after reload.
Files changed:
- client/src/components/developer/LeadsManager.tsx
- server/services/developerFunnelService.ts
- e2e/dle/lead-outcome-sync.spec.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/lead-outcome-sync.spec.ts --project="Desktop Chrome" --workers=1 -g "renders transaction evidence panels"` passed with 1 test.
- `pnpm vitest run client/src/components/developer/leadEvidenceChecklist.test.ts` passed with 5 tests.
- `pnpm vitest run server/services/__tests__/developerFunnelService.contract.test.ts` passed with 8 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `listDeveloperLeads` now reads recent rows from the actual local `lead_activities` table shape
  and attaches them to the lead read model.
- Lead detail Activity Timeline now renders saved activity rows with type, relative timestamp, and
  note body instead of relying only on legacy `lead.notes`.
- The timeline still falls back to `lead.notes` if no activity rows exist.
- Browser proof saves a Rental evidence review note, reloads the lead detail, and verifies the
  timeline contains the saved Proof of income and Income/employment evidence language.
Guardrails:
- No schema, migration, structured evidence persistence, readiness state, transition graph,
  distribution gate, outcome sync semantics, autosave, draft, publish, inventory, or public listing
  behavior is intended in this slice.
- The activity timeline readback makes saved manual notes visible; it does not mark evidence
  complete, verify documents, approve leases, register bidders, or automate readiness.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Rental still needs a structured document/evidence workflow when the product moves beyond manual
  evidence review notes.
- Auction still needs persisted bidder registration, legal-pack acceptance, and proof-of-funds
  readiness semantics.
- Deeper manager dashboards and operating audit views remain future.
Next recommended slice:
- Continue with the next transaction-operating proof only if it advances Rental/Auction from
  visible evidence prompts into structured readiness, or pause to define the structured evidence
  model before coding it.
Commit hash/tag: Included in `test(dle): read back lead evidence activity`.
Uncommitted reason, if any: None.

## 2026-06-13 - Lead Evidence Readiness Model Summary

Date: 2026-06-13
Branch: refine/homepage-phase1-clarity-trust
Goal: Make Rental and Auction lead evidence panels show an explicit transaction-specific readiness
model without adding premature readiness automation.
Files changed:
- client/src/components/developer/LeadsManager.tsx
- client/src/components/developer/leadEvidenceChecklist.ts
- client/src/components/developer/leadEvidenceChecklist.test.ts
- e2e/dle/lead-outcome-sync.spec.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/developer/leadEvidenceChecklist.test.ts` passed with 7 tests.
- `pnpm run check` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/lead-outcome-sync.spec.ts --project="Desktop Chrome" --workers=1 -g "renders transaction evidence panels"` passed with 1 test.
- `git diff --check` passed.
Functional proof:
- `getLeadEvidenceReadinessSummary` now returns transaction-specific readiness model copy, guardrail
  copy, and evidence status counts.
- Rental lead detail shows `Rental readiness model`, `Manual lease review required`, and a guardrail
  that inventory must not be marked let or distribution-ready until evidence is manually accepted.
- Auction lead detail shows `Auction readiness model`, `Manual bidder review required`, and a
  guardrail that bidders must not be treated as registered or funds-ready until manual acceptance.
- Focused browser proof verifies the Rental and Auction readiness model copy inside the evidence
  panel before preparing evidence notes.
Guardrails:
- No schema, migration, persisted document checklist, evidence completion state, readiness
  transition, lead-stage movement, distribution gate, reward automation, autosave, draft, publish,
  inventory, or public listing behavior is intended in this slice.
- The readiness model is a visible operating summary only. It does not approve leases, register
  bidders, verify proof of funds, mark evidence complete, or mutate inventory.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Rental still needs persisted document capture and lease application review semantics before it can
  become true structured readiness.
- Auction still needs persisted bidder registration, legal-pack acceptance, and proof-of-funds
  workflow semantics before it can become true structured readiness.
- Dashboard-level evidence review and audit history remain future.
Next recommended slice:
- Define or implement the persisted evidence artifact model for Rental/Auction only after agreeing
  on document roles, acceptance states, and operating ownership, or continue improving dashboard
  visibility using the current non-mutating readiness summaries.
Commit hash/tag: Included in `feat(dle): summarize lead evidence readiness`.
Uncommitted reason, if any: None.

## 2026-06-13 - Lead Queue Evidence Readiness Labels

Date: 2026-06-13
Branch: refine/homepage-phase1-clarity-trust
Goal: Make Rental and Auction evidence readiness visible in the lead queue, not only inside the
selected lead detail panel.
Files changed:
- client/src/components/developer/LeadsManager.tsx
- e2e/dle/lead-outcome-sync.spec.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm run check` passed.
- `pnpm vitest run client/src/components/developer/leadEvidenceChecklist.test.ts` passed with 7 tests.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/lead-outcome-sync.spec.ts --project="Desktop Chrome" --workers=1 -g "renders transaction evidence panels"` passed with 1 test.
- `git diff --check` passed.
Functional proof:
- Lead queue rows now show the transaction-specific evidence readiness status from
  `getLeadEvidenceReadinessSummary`.
- Rental lead rows show `Manual lease review required`.
- Auction lead rows show `Manual bidder review required`.
- Focused browser proof verifies the Rental and Auction queue labels before checking the detail
  evidence panel.
Guardrails:
- No schema, migration, persisted document checklist, evidence completion state, readiness
  transition, lead-stage movement, distribution gate, reward automation, autosave, draft, publish,
  inventory, or public listing behavior is intended in this slice.
- The lead queue label is display-only; it does not approve leases, register bidders, verify proof
  of funds, mark evidence complete, or mutate inventory.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Rental still needs persisted document capture and lease application review semantics before the
  queue can show true evidence completion state.
- Auction still needs persisted bidder registration, legal-pack acceptance, and proof-of-funds
  workflow semantics before the queue can show true bidder readiness state.
- Broader dashboard aggregation and audit history remain future.
Next recommended slice:
- Either define the persisted evidence artifact model for Rental/Auction or add a non-mutating
  dashboard aggregate that counts leads needing manual lease/bidder review.
Commit hash/tag: Included in `feat(dle): show lead queue evidence readiness`.
Uncommitted reason, if any: None.

## 2026-06-13 - Dashboard Evidence Review Demand Aggregate

Date: 2026-06-13
Branch: refine/homepage-phase1-clarity-trust
Goal: Make Rental and Auction manual evidence review demand visible in the Developer Control Tower
without adding persisted evidence acceptance or readiness automation.
Files changed:
- client/src/components/developer/Overview.tsx
- client/src/components/developer/Overview.test.ts
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/developer/Overview.test.ts` passed with 14 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `buildOverviewEvidenceReviewAggregate` now derives a non-mutating review-demand count from active
  qualified/viewing/offer/deal funnel stages.
- Rental dashboards show `Leads needing lease evidence review` with
  `Manual lease review required`.
- Auction dashboards show `Leads needing bidder evidence review` with
  `Manual bidder review required`.
- Overview helper tests prove Rental/Auction language does not claim verified lease readiness,
  bidder registration, proof-of-funds readiness, or inventory mutation.
Guardrails:
- No schema, migration, persisted document checklist, evidence completion state, readiness
  transition, lead-stage movement, distribution gate, reward automation, autosave, draft, publish,
  inventory, or public listing behavior is intended in this slice.
- The dashboard aggregate is review-demand visibility only; it does not approve leases, register
  bidders, verify proof of funds, mark evidence complete, or mutate inventory.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Rental still needs persisted document capture and lease application review semantics before the
  dashboard can report true evidence completion state.
- Auction still needs persisted bidder registration, legal-pack acceptance, and proof-of-funds
  workflow semantics before the dashboard can report true bidder readiness state.
- Audit-history and acceptance-state dashboards remain future.
Next recommended slice:
- Define the persisted evidence artifact contract for Rental/Auction document roles, acceptance
  states, ownership, and readback before implementing true evidence completion.
Commit hash/tag: Included in `feat(dle): show dashboard evidence review demand`.
Uncommitted reason, if any: None.

## 2026-06-13 - Evidence Artifact Contract

Date: 2026-06-13
Branch: refine/homepage-phase1-clarity-trust
Goal: Define the persisted Rental/Auction evidence artifact contract before implementing evidence
completion runtime behavior.
Files changed:
- docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `test -f docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md` passed.
- `rg "EVIDENCE_ARTIFACT_CONTRACT|Evidence Artifact Semantics|Thirty-Third Product-Visibility Slice" docs/dle` passed.
- `git diff --check` passed.
Functional proof:
- A dedicated evidence artifact contract now defines DLE-owned proof records for Rental/Auction
  evidence without collapsing them into Sale or distribution payout assumptions.
- The contract defines scope, artifact roles, artifact types, statuses, review owners, read models,
  event/audit requirements, source surfaces, security/privacy requirements, implementation gates,
  and the first safe runtime slice.
- The DLE source of truth now states that future Rental/Auction proof-of-income, signed-lease,
  legal-pack, auction-terms, bidder-registration, proof-of-funds, evidence acceptance, or evidence
  completion work must follow the contract.
- The product audit now records the evidence artifact contract as the gate before true structured
  evidence completion.
Guardrails:
- Documentation-only slice. No schema, migration, API, runtime, readiness, stage, inventory,
  distribution, payout, reward, autosave, draft, publish, or public listing behavior changed.
- The contract explicitly states that current evidence prompts, activity notes, timeline readback,
  lead queue labels, and dashboard review-demand counts are operating visibility only.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Runtime evidence artifact persistence still needs implementation.
- File-upload/storage authorization for sensitive proof documents still needs design before public
  or external applicant upload.
- Distribution/admin ownership boundaries must be preserved when artifacts are linked to referral
  deals or platform review.
Next recommended slice:
- Implement the first narrow runtime artifact model for DLE lead-level Rental/Auction evidence
  request/submission/readback, with status-only audit and no readiness/inventory/stage movement.
Commit hash/tag: Included in `docs(dle): define evidence artifact contract`.
Uncommitted reason, if any: None.

## 2026-06-16 - Runtime Lead Evidence Artifacts

Date: 2026-06-16
Branch: refine/homepage-phase1-clarity-trust
Goal: Implement the first narrow runtime evidence artifact model for DLE lead-level Rental/Auction
request/submission/readback, with audit only and no evidence completion automation.
Files changed:
- drizzle/schema/developmentOperations.ts
- server/migrations/0072_create_dle_evidence_artifacts.sql
- server/services/dleEvidenceArtifactService.ts
- server/services/__tests__/dleEvidenceArtifactService.test.ts
- server/developerRouter.ts
- client/src/components/developer/leadEvidenceChecklist.ts
- client/src/components/developer/leadEvidenceChecklist.test.ts
- client/src/components/developer/LeadsManager.tsx
- e2e/dle/lead-outcome-sync.spec.ts
- docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/developer/leadEvidenceChecklist.test.ts server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 13 tests.
- `pnpm db:migrate:local` passed against `listify_local` and applied `0072_create_dle_evidence_artifacts.sql`.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/lead-outcome-sync.spec.ts --project="Desktop Chrome" --workers=1` passed with 4 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `dle_evidence_artifacts` now persists lead-level evidence artifacts with transaction lane,
  artifact role, artifact type, requested/submitted status, review owner, creator, metadata, and
  timestamps.
- Developer lead detail can request or submit Rental/Auction manual-attestation evidence artifacts
  and read them back in the evidence panel.
- Rental roles are validated against Rental-only semantics such as proof of income, deposit
  readiness, and signed lease.
- Auction roles are validated against Auction-only semantics such as legal-pack acknowledgement,
  proof of funds, and bidder registration.
- Each request/submission writes a `development_operating_events` audit row using
  `evidence_artifact_requested` or `evidence_artifact_submitted`.
- Browser/API/DB proof creates a Rental proof-of-income manual attestation, reads it back in the
  lead detail panel, verifies the DB artifact row, verifies the operating audit event, and confirms
  the lead status/funnel stage did not move.
Guardrails:
- No uploaded-file evidence, public applicant/bidder upload, acceptance/rejection workflow,
  evidence completion, readiness transition, lead-stage movement, inventory mutation, distribution
  deal movement, payout/reward readiness, autosave, draft, publish, public listing, search-card, or
  wizard behavior is intended in this slice.
- Sale leads do not call the Rental/Auction-only evidence artifact endpoint from the lead detail UI.
- The UI copy explicitly states persisted evidence artifacts do not approve lease readiness, bidder
  registration, inventory, or rewards.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Evidence artifact file upload/storage authorization still needs a dedicated privacy/security
  slice before accepting sensitive proof documents from applicants or bidders.
- `under_review`, `accepted`, `rejected`, `expired`, and `withdrawn` mutations remain future.
- Evidence completion read models, admin/distribution review linkage, and readiness automation
  remain future and must preserve transaction ownership boundaries.
Next recommended slice:
- Add the artifact review-state slice for Rental/Auction: under-review/accepted/rejected status
  transitions, review notes, role-owned authorization, readback, and audit, still without inventory,
  lead-stage, payout/reward, public listing, or autosave mutation.
Commit hash/tag: Included in `feat(dle): persist lead evidence artifacts`.
Uncommitted reason, if any: None.

## 2026-06-16 - Evidence Artifact Review States

Date: 2026-06-16
Branch: refine/homepage-phase1-clarity-trust
Goal: Add lead-level Rental/Auction evidence artifact review-state transitions with readback and
audit, without turning accepted artifacts into lease/bidder readiness or operational automation.
Files changed:
- server/services/dleEvidenceArtifactService.ts
- server/services/__tests__/dleEvidenceArtifactService.test.ts
- server/developerRouter.ts
- client/src/components/developer/LeadsManager.tsx
- e2e/dle/lead-outcome-sync.spec.ts
- docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/developer/leadEvidenceChecklist.test.ts server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 15 tests.
- `pnpm run check` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/lead-outcome-sync.spec.ts --project="Desktop Chrome" --workers=1` passed with 4 tests.
Functional proof:
- Developer lead detail can move Rental/Auction evidence artifacts to `under_review`, `accepted`,
  or `rejected`.
- Rejections require a review note.
- Requested artifacts cannot be accepted/rejected directly; submitted or under-review artifacts can
  be accepted/rejected.
- Accepted/rejected artifacts record review note, reviewer, reviewed timestamp, updated user, and
  status readback.
- Review transitions write `development_operating_events` audit rows using
  `evidence_artifact_review_started`, `evidence_artifact_accepted`, or
  `evidence_artifact_rejected`.
- Browser/API/DB proof accepts a Rental proof-of-income artifact, verifies the accepted artifact
  readback, verifies the DB reviewer/timestamp/review note, verifies the audit event, and confirms
  the lead status/funnel stage did not move.
Guardrails:
- No uploaded-file evidence, public applicant/bidder upload, evidence completion/readiness model,
  lead-stage movement, inventory mutation, distribution deal movement, payout/reward readiness,
  autosave, draft, publish, public listing, search-card, or wizard behavior is intended in this
  slice.
- Accepted artifacts remain artifact-level evidence decisions only. They do not mark lease
  readiness, bidder registration, proof-of-funds readiness, inventory let/sold, or distribution
  readiness.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Uploaded sensitive evidence files still need a dedicated protected storage and authorization
  slice.
- Evidence completion read models still need transaction-specific mandatory-role semantics before
  any readiness claim.
- Admin/distribution review linkage remains future and must preserve ownership boundaries.
Next recommended slice:
- Define the evidence completion read model for Rental/Auction mandatory roles without automation:
  accepted artifact coverage by role, missing-role summaries, and explicit "not lease/bidder ready"
  guardrails.
Commit hash/tag: Included in `feat(dle): review lead evidence artifacts`.
Uncommitted reason, if any: None.

## 2026-06-17 - Evidence Coverage Read Model

Date: 2026-06-17
Branch: refine/homepage-phase1-clarity-trust
Goal: Add a non-mutating Rental/Auction evidence coverage read model that shows accepted and missing
required artifact roles without claiming lease/bidder readiness or triggering automation.
Files changed:
- client/src/components/developer/leadEvidenceChecklist.ts
- client/src/components/developer/leadEvidenceChecklist.test.ts
- client/src/components/developer/LeadsManager.tsx
- e2e/dle/lead-outcome-sync.spec.ts
- docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/developer/leadEvidenceChecklist.test.ts server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 17 tests.
- `pnpm run check` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/lead-outcome-sync.spec.ts --project="Desktop Chrome" --workers=1` passed with 4 tests.
Functional proof:
- `getLeadEvidenceArtifactCoverageSummary` derives transaction-specific accepted coverage from
  accepted evidence artifact roles.
- Rental coverage tracks proof of income, deposit readiness, and signed lease.
- Auction coverage tracks legal-pack acknowledgement, proof of funds, and bidder registration.
- Lead detail shows accepted count, required count, accepted role labels, missing role labels, and
  a transaction-specific guardrail.
- Browser proof accepts Rental proof of income, then verifies `1 of 3 required evidence roles
  accepted`, `Accepted: Proof of income`, `Missing: Deposit readiness, Lease review`, and the
  guardrail that this is not lease readiness, inventory let status, or distribution payout
  readiness.
Guardrails:
- Read-model only. No artifact status mutation, lead-stage movement, inventory mutation,
  distribution deal movement, reward/payout readiness, autosave, draft, publish, public listing,
  search-card, or wizard behavior is intended in this slice.
- Accepted coverage is not evidence completion automation and must not be used as lease readiness,
  bidder registration, proof-of-funds readiness, let/sold status, or payout readiness.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Uploaded sensitive proof files still need protected storage and authorization.
- Evidence completion automation remains future and requires transaction-specific mandatory role
  rules plus explicit owner approval.
- Admin/distribution readback of accepted-role coverage remains future.
Next recommended slice:
- Add a non-mutating dashboard/lead-queue aggregate for accepted coverage versus missing evidence
  roles across Rental/Auction leads, still without readiness automation.
Commit hash/tag: Included in `feat(dle): summarize evidence coverage`.
Uncommitted reason, if any: None.

## 2026-06-17 - Dashboard Evidence Coverage Aggregate

Date: 2026-06-17
Branch: refine/homepage-phase1-clarity-trust
Goal: Add a non-mutating Developer Control Tower aggregate for accepted Rental/Auction evidence
coverage versus missing required roles across active leads.
Files changed:
- server/services/dleEvidenceArtifactService.ts
- server/services/__tests__/dleEvidenceArtifactService.test.ts
- server/developerRouter.ts
- client/src/components/developer/Overview.tsx
- client/src/components/developer/Overview.test.ts
- e2e/dle/lead-outcome-sync.spec.ts
- docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-07/*.png
Tests run:
- `pnpm vitest run client/src/components/developer/Overview.test.ts client/src/components/developer/leadEvidenceChecklist.test.ts server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 35 tests.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/lead-outcome-sync.spec.ts --project="Desktop Chrome" --workers=1` passed with 4 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `buildDevelopmentEvidenceCoverageSummary` now aggregates accepted required evidence roles across
  active Rental/Auction leads.
- The aggregate returns complete, partial, and no-accepted-evidence lead counts plus accepted and
  missing role counts.
- `developer.getDevelopmentEvidenceCoverageSummary` exposes the aggregate for a developer-owned
  selected development and returns no aggregate for non Rental/Auction transaction lanes.
- The Developer Control Tower shows the selected development's Rental/Auction evidence coverage
  aggregate, top missing roles, and a guardrail below the operating-readiness review demand panel.
- Browser proof accepts Rental proof-of-income, opens the selected Rental development dashboard,
  verifies `0 of 1 active lead(s)` have complete accepted coverage, verifies deposit readiness and
  lease review remain missing, and verifies the guardrail says this is not verified lease
  readiness.
Guardrails:
- Read-model/dashboard-only slice. No artifact status mutation, lead-stage movement, inventory
  mutation, distribution deal movement, reward/payout readiness, autosave, draft, publish, public
  listing, search-card, or wizard behavior is intended.
- Accepted coverage is not evidence completion automation and must not be used as lease readiness,
  bidder registration, proof-of-funds readiness, let/sold status, or payout readiness.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Uploaded sensitive proof files still need protected storage and authorization.
- Evidence completion automation remains future and requires transaction-specific mandatory role
  rules plus explicit owner approval.
- Lead queue row aggregate badges and admin/distribution readback of accepted-role coverage remain
  future.
Next recommended slice:
- Add lead queue row accepted/missing evidence coverage labels for Rental/Auction active leads,
  still without readiness automation.
Commit hash/tag: Included in `feat(dle): show evidence coverage dashboard`.
Uncommitted reason, if any: None.

## 2026-06-17 - Lead Row Evidence Coverage Labels

Date: 2026-06-17
Branch: refine/homepage-phase1-clarity-trust
Goal: Surface accepted/missing evidence coverage on Rental/Auction lead queue rows before opening
lead detail, without introducing lease/bidder readiness automation.
Files changed:
- server/services/dleEvidenceArtifactService.ts
- server/services/__tests__/dleEvidenceArtifactService.test.ts
- server/developerRouter.ts
- client/src/components/developer/LeadsManager.tsx
- e2e/dle/lead-outcome-sync.spec.ts
- docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-07/*.png
Tests run:
- `pnpm vitest run client/src/components/developer/leadEvidenceChecklist.test.ts server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 21 tests.
- `pnpm run check` passed.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 pnpm exec playwright test e2e/dle/lead-outcome-sync.spec.ts --project="Desktop Chrome" --workers=1` passed with 4 tests.
- `git diff --check` passed.
Functional proof:
- `buildLeadEvidenceCoverageSummary` now derives lead-row coverage labels from accepted required
  Rental/Auction evidence roles.
- `developer.listLeadEvidenceCoverageSummaries` returns bulk, read-only summaries only for
  developer-owned Rental/Auction lead IDs.
- Developer Leads Manager requests coverage for visible Rental/Auction rows and shows a compact
  accepted/required badge, missing required roles, and the transaction-specific guardrail.
- Browser proof accepts Rental proof-of-income, verifies the selected lead-detail coverage, then
  verifies the lead row shows `1/3 evidence accepted`, keeps `Deposit readiness` and `Lease review`
  missing, and says the row is not lease readiness.
Guardrails:
- Read-model/lead-row visibility only. No artifact status mutation, lead-stage movement, inventory
  mutation, distribution deal movement, reward/payout readiness, autosave, draft, publish, public
  listing, search-card, or wizard behavior is intended.
- Accepted row coverage is not evidence completion automation and must not be used as lease
  readiness, bidder registration, proof-of-funds readiness, let/sold status, or payout readiness.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Uploaded sensitive proof files still need protected storage and authorization.
- Evidence completion automation remains future and requires transaction-specific mandatory role
  rules plus explicit owner approval.
- Admin/distribution readback of accepted-role coverage remains future.
Next recommended slice:
- Add protected evidence-file upload/storage design for Rental/Auction proof artifacts before
  accepting sensitive uploaded documents.
Commit hash/tag: Included in `feat(dle): show lead evidence coverage rows`.
Uncommitted reason, if any: None.

## 2026-06-17 - Evidence File Upload Security Contract

Date: 2026-06-17
Branch: refine/homepage-phase1-clarity-trust
Goal: Define the protected storage, authorization, download, audit, and product guardrails required
before DLE Rental/Auction evidence artifacts can support uploaded files.
Files changed:
- docs/dle/EVIDENCE_FILE_UPLOAD_SECURITY_CONTRACT.md
- docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `test -f docs/dle/EVIDENCE_FILE_UPLOAD_SECURITY_CONTRACT.md` passed.
- `rg "EVIDENCE_FILE_UPLOAD_SECURITY_CONTRACT|private storage namespace|authenticated download broker|public media" docs/dle` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The new contract states that uploaded Rental/Auction evidence files are private proof documents,
  not public media assets.
- The contract rejects direct reuse of `upload.presign` unless wrapped by evidence-specific
  ownership, validation, and download authorization.
- The contract defines private storage keys, file metadata, upload intent/completion/download API
  shape, authorization matrix, MIME/size validation, local development behavior, UI requirements,
  audit requirements, and implementation gates.
- The DLE source-of-truth and evidence artifact contract now require future upload/download work to
  follow the file-upload security contract.
Guardrails:
- Documentation-only slice. No schema, migration, API, runtime upload, download, artifact mutation,
  lead-stage movement, inventory mutation, distribution deal movement, reward/payout readiness,
  autosave, draft, publish, public listing, search-card, or wizard behavior changed.
- Uploaded evidence files remain future runtime work and must not use public media URLs, raw
  storage keys, public development pages, search cards, or unauthenticated lead forms.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Runtime upload intent, upload completion, authenticated download broker, file metadata readback,
  and denial tests still need implementation.
- Malware scanning/quarantine remains future and should be added before broad public applicant or
  bidder upload.
Next recommended slice:
- Implement developer-only protected evidence-file upload intent for existing Rental/Auction lead
  artifacts with private storage keys and no public download URL.
Commit hash/tag: Included in `docs(dle): define evidence file upload security`.
Uncommitted reason, if any: None.

## 2026-06-17 - Protected Evidence Upload Intent

Date: 2026-06-17
Branch: refine/homepage-phase1-clarity-trust
Goal: Implement developer-only protected upload intents for existing Rental/Auction lead evidence
artifacts, with private storage keys and no public download URL.
Files changed:
- server/services/dleEvidenceArtifactService.ts
- server/services/__tests__/dleEvidenceArtifactService.test.ts
- server/developerRouter.ts
- docs/dle/EVIDENCE_FILE_UPLOAD_SECURITY_CONTRACT.md
- docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm db:migrate:test` passed and applied `0072_create_dle_evidence_artifacts.sql` to the test DB where missing.
- First focused test run failed because `listify_test.dle_evidence_artifacts` was missing before
  the test migration was applied.
- `pnpm vitest run server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 13 tests after test DB migration.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `developer.createLeadEvidenceFileUploadIntent` now creates a developer-owned Rental/Auction
  uploaded-file evidence artifact intent.
- Evidence upload validation allows PDF/JPEG/PNG/WebP only and rejects unsupported MIME types,
  extension mismatches, missing/invalid sizes, and files above 10 MB.
- Private evidence storage keys are generated under `dle/evidence/{environment}/development-{id}/lead-{id}/artifact-{id}/...`.
- The response returns an opaque upload token and never returns a public URL.
- If private S3 upload storage is not configured, local development returns an explicit
  `uploadUnavailableReason` instead of falling back to public local media URLs.
- DB-backed proof creates a Rental upload intent, verifies `artifactType = uploaded_file`,
  `status = requested`, `uploadStatus = pending_upload`, private storage metadata, `externalUrl =
  null`, and confirms lead status/funnel stage did not move.
Guardrails:
- Upload-intent-only slice. No upload completion, authenticated download, artifact submission
  event, artifact acceptance, lead-stage movement, inventory mutation, distribution deal movement,
  reward/payout readiness, autosave, draft, publish, public listing, search-card, lead form, or
  wizard behavior is intended.
- Uploaded evidence is not evidence completion automation and must not be used as lease readiness,
  bidder registration, proof-of-funds readiness, let/sold status, or payout readiness.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Upload completion verification, checksum capture, authenticated download broker, file metadata
  readback, denial tests for unrelated developers/public callers, and audit events for verified
  submission remain future.
- Malware scanning/quarantine remains future and should be added before broad public applicant or
  bidder upload.
Next recommended slice:
- Implement upload completion verification for protected evidence files, setting uploaded metadata
  and `submitted` status only after the private upload is verified.
Commit hash/tag: Included in `feat(dle): create protected evidence upload intents`.
Uncommitted reason, if any: None.

## 2026-06-17 - Protected Evidence Upload Completion Verification

Date: 2026-06-17
Branch: refine/homepage-phase1-clarity-trust
Goal: Add a protected completion gate for Rental/Auction evidence uploads so uploaded-file evidence
can become `submitted` only after token, ownership, private namespace, and storage verification.
Files changed:
- server/services/dleEvidenceArtifactService.ts
- server/services/__tests__/dleEvidenceArtifactService.test.ts
- server/developerRouter.ts
- docs/dle/EVIDENCE_FILE_UPLOAD_SECURITY_CONTRACT.md
- docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 15 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `developer.completeLeadEvidenceFileUpload` now exposes a protected developer-only completion
  endpoint.
- Upload tokens are HMAC-signed and tampered tokens are rejected before completion.
- Completion verifies artifact id, lead id, development id, developer ownership, private evidence
  storage key, `uploaded_file` artifact type, and pending upload status before any mutation.
- Completion requires private S3 storage and `HeadObject` verification before changing status to
  `submitted`.
- Successful completion writes `uploadStatus = uploaded`, uploader/time metadata, verified file
  metadata, and an `evidence_artifact_submitted` operating event without a public URL.
- DB-backed proof confirms that when private storage is not configured, completion fails without
  changing artifact status, external URL, lead status, or funnel stage.
Guardrails:
- Completion-verification-only slice. No authenticated download, public applicant/bidder upload,
  artifact acceptance, evidence completion/readiness automation, lead-stage movement, inventory
  mutation, distribution deal movement, reward/payout readiness, autosave, draft, publish, public
  listing, search-card, lead form, or wizard behavior is intended.
- Successful completion should write only file metadata and an `evidence_artifact_submitted`
  operating event; it must not store document contents or public URLs.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Authenticated evidence-file download, malware scanning/quarantine, public applicant/bidder
  upload, file metadata client readback, distribution/admin linkage, and readiness automation
  remain future.
Next recommended slice:
- Implement authenticated evidence-file download broker once upload completion has a verified
  private-storage path and denial tests.
Commit hash/tag: Included in `feat(dle): verify protected evidence uploads`.
Uncommitted reason, if any: None.

## 2026-06-17 - Protected Evidence Download Broker

Date: 2026-06-17
Branch: refine/homepage-phase1-clarity-trust
Goal: Add a protected developer-only download broker for submitted Rental/Auction evidence files
without exposing public URLs or weakening the private evidence storage boundary.
Files changed:
- server/services/dleEvidenceArtifactService.ts
- server/services/__tests__/dleEvidenceArtifactService.test.ts
- server/developerRouter.ts
- docs/dle/EVIDENCE_FILE_UPLOAD_SECURITY_CONTRACT.md
- docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- First `pnpm vitest run server/services/__tests__/dleEvidenceArtifactService.test.ts` failed
  because the new pending-download fixture used invalid `funnel_stage = new`.
- `pnpm vitest run server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 17 tests after correcting the fixture.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `developer.getLeadEvidenceFileDownloadUrl` now exposes a protected developer-only query.
- Download brokering verifies developer ownership, uploaded-file artifact type, submitted/uploaded
  state, private evidence storage namespace, and absence of a public external URL before issuing a
  URL.
- The broker returns a short-lived signed GET URL only when private S3 storage is configured.
- DB-backed proof confirms pending uploads cannot receive download URLs.
- DB-backed proof confirms submitted/uploaded artifacts still do not receive download URLs when
  private storage is not configured, and no download metadata, public URL, lead status, or funnel
  stage is changed in that failure path.
Guardrails:
- Download-broker-only slice. No public applicant/bidder upload, artifact acceptance,
  evidence completion/readiness automation, lead-stage movement, inventory mutation, distribution
  deal movement, reward/payout readiness, autosave, draft, publish, public listing, search-card,
  lead form, or wizard behavior is intended.
- This slice does not add `evidence_artifact_downloaded` operating events because the runtime event
  enum needs a deliberate schema/migration slice before download audit dashboards rely on it.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Dedicated download operating events, admin/distribution download authorization, malware
  scanning/quarantine, public applicant/bidder upload, file metadata client readback, and readiness
  automation remain future.
Next recommended slice:
- Add a deliberate evidence download audit-event schema slice or expose submitted uploaded-file
  metadata in the Developer Leads Manager before broadening upload/download to admin/distribution.
Commit hash/tag: Included in `feat(dle): broker protected evidence downloads`.
Uncommitted reason, if any: None.

## 2026-06-17 - Evidence Download Operating Event Audit

Date: 2026-06-17
Branch: refine/homepage-phase1-clarity-trust
Goal: Add operating-event audit support for protected Rental/Auction evidence download URL
issuance without exposing signed URLs, storage keys, public URLs, or document contents.
Files changed:
- server/migrations/0073_add_dle_evidence_download_event.sql
- drizzle/schema/developmentOperations.ts
- server/services/dleEvidenceArtifactService.ts
- server/services/__tests__/dleEvidenceArtifactService.test.ts
- docs/dle/EVIDENCE_FILE_UPLOAD_SECURITY_CONTRACT.md
- docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm db:migrate:test` passed and applied `0073_add_dle_evidence_download_event.sql` to the
  test DB.
- `pnpm vitest run server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 18 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `development_operating_events.event_type` now supports `evidence_artifact_downloaded`.
- The Drizzle schema contract includes `evidence_artifact_downloaded`.
- Successful protected evidence download URL issuance now writes an
  `evidence_artifact_downloaded` operating event after the signed URL is issued.
- Download event metadata contains artifact id, role, display name, private storage namespace,
  expiry, and download count only.
- DB-backed proof confirms protected download denial paths do not write download metadata or
  `evidence_artifact_downloaded` events.
Guardrails:
- Audit-event-only slice. No public applicant/bidder upload, artifact acceptance, evidence
  completion/readiness automation, lead-stage movement, inventory mutation, distribution deal
  movement, reward/payout readiness, autosave, draft, publish, public listing, search-card, lead
  form, or wizard behavior is intended.
- Download audit events must not include storage keys, signed URLs, public URLs, or document
  contents.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Download audit dashboard/readback, admin/distribution download authorization, malware
  scanning/quarantine, public applicant/bidder upload, file metadata client readback, and readiness
  automation remain future.
Next recommended slice:
- Expose submitted uploaded-file metadata and audit status in the Developer Leads Manager so
  operators can see uploaded/downloadable evidence without exposing private storage details.
Commit hash/tag: Included in `feat(dle): audit evidence downloads`.
Uncommitted reason, if any: None.

## 2026-06-18 - Evidence File Metadata Readback

Date: 2026-06-18
Branch: refine/homepage-phase1-clarity-trust
Goal: Surface submitted uploaded-file metadata and protected download affordance in Developer Leads
Manager without exposing private storage keys, signed URLs, public URLs, or document contents.
Files changed:
- server/services/dleEvidenceArtifactService.ts
- server/services/__tests__/dleEvidenceArtifactService.test.ts
- client/src/components/developer/LeadsManager.tsx
- docs/dle/EVIDENCE_FILE_UPLOAD_SECURITY_CONTRACT.md
- docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 18 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `listLeadEvidenceArtifacts` now returns a safe `file` object for uploaded-file artifacts.
- The file read model includes original filename, MIME type, file size, upload status, uploaded
  timestamp, uploader id, last download issue timestamp, last requester id, download count, and a
  derived `isDownloadable` flag.
- DB-backed proof confirms pending uploaded evidence is visible with safe metadata and is not
  marked downloadable.
- DB-backed proof confirms submitted/uploaded evidence is visible as downloadable while storage
  keys and external URLs remain absent from the read model.
- Developer Leads Manager now renders uploaded-file metadata and requests a protected download URL
  only when an operator clicks the file action.
Guardrails:
- Readback/UI-only slice. No public applicant/bidder upload, artifact acceptance, evidence
  completion/readiness automation, lead-stage movement, inventory mutation, distribution deal
  movement, reward/payout readiness, autosave, draft, publish, public listing, search-card, or lead
  form behavior is intended.
- No private storage key, signed URL, public URL, or document contents are exposed in the artifact
  list read model.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Browser proof for the download button, download audit dashboard/readback, admin/distribution
  download authorization, malware scanning/quarantine, public applicant/bidder upload, and
  readiness automation remain future.
Next recommended slice:
- Add browser/component proof for the Developer Leads Manager uploaded-file metadata row and
  protected download affordance, or add admin/distribution download authorization if product
  priority shifts to reviewer workflows.
Commit hash/tag: Included in `feat(dle): show evidence file metadata`.
Uncommitted reason, if any: None.

## 2026-06-18 - Evidence File Metadata UI Helper Proof

Date: 2026-06-18
Branch: refine/homepage-phase1-clarity-trust
Goal: Add focused component-helper proof for Developer Leads Manager uploaded-file metadata labels,
download affordance state, and guardrail copy.
Files changed:
- client/src/components/developer/leadEvidenceChecklist.ts
- client/src/components/developer/leadEvidenceChecklist.test.ts
- client/src/components/developer/LeadsManager.tsx
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/developer/leadEvidenceChecklist.test.ts` passed with 14 tests.
- `pnpm vitest run server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 18 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `getLeadEvidenceFileDisplay` now centralizes uploaded-file title, metadata line, download-count
  label, downloadable state, and guardrail copy.
- Helper tests prove uploaded evidence file size formatting, downloadable submitted-file display,
  and pending-file non-downloadable display.
- Developer Leads Manager uses the helper for uploaded-file metadata display and protected
  download affordance state.
Guardrails:
- UI-helper-proof-only slice. No backend storage behavior, public applicant/bidder upload,
  artifact acceptance, evidence completion/readiness automation, lead-stage movement, inventory
  mutation, distribution deal movement, reward/payout readiness, autosave, draft, publish, public
  listing, search-card, or lead form behavior is intended.
- Display helper text must not imply lease readiness, bidder readiness, inventory movement,
  distribution readiness, or payout completion.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Browser proof for the full Developer Leads Manager panel, download audit dashboard/readback,
  admin/distribution download authorization, malware scanning/quarantine, public applicant/bidder
  upload, and readiness automation remain future.
Next recommended slice:
- Add browser proof for the full Developer Leads Manager uploaded-file row if local seeded
  uploaded-file fixtures are available, otherwise continue with admin/distribution download
  authorization contract.
Commit hash/tag: Included in `test(dle): prove evidence file display`.
Uncommitted reason, if any: None.

## 2026-06-18 - Evidence Access Authorization Contract

Date: 2026-06-18
Branch: refine/homepage-phase1-clarity-trust
Goal: Define the authorization boundary for future admin and distribution access to protected DLE
evidence files before broadening runtime access beyond developer-owned workflows.
Files changed:
- docs/dle/EVIDENCE_ACCESS_AUTHORIZATION_CONTRACT.md
- docs/dle/EVIDENCE_FILE_UPLOAD_SECURITY_CONTRACT.md
- docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `test -f docs/dle/EVIDENCE_ACCESS_AUTHORIZATION_CONTRACT.md` passed.
- `rg "EVIDENCE_ACCESS_AUTHORIZATION_CONTRACT|metadata|download|review_mutation|distribution deal|admin_review" docs/dle/EVIDENCE_ACCESS_AUTHORIZATION_CONTRACT.md docs/dle/EVIDENCE_FILE_UPLOAD_SECURITY_CONTRACT.md docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The new contract defines developer, admin review, distribution manager, and future public
  applicant/bidder evidence access boundaries.
- Access levels are explicit: metadata, download URL, and review mutation.
- Admin access is policy-scoped rather than global-by-default.
- Distribution access requires explicit deal, programme, handoff, share, or future grant linkage.
- The first safe runtime expansion is documented as a pure access-policy helper with endpoints
  unchanged until helper tests prove the policy.
Guardrails:
- Documentation-only slice. No runtime, schema, API, upload, download, readiness, inventory,
  distribution, payout, public listing, wizard, draft, or autosave behavior is intended.
- This slice does not broaden admin or distribution access and does not issue any new download
  URLs.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Runtime access-policy helper, admin/distribution endpoint expansion, malware scanning/quarantine,
  public applicant/bidder upload, and public scoped-token access remain future.
- Admin/distribution UI copy still needs to distinguish uploaded evidence, accepted evidence, and
  transaction readiness when those surfaces are implemented.
Next recommended slice:
- Implement a pure DLE evidence access-policy helper with unit tests for developer, admin,
  distribution, public, unrelated-developer, and unrelated-reviewer decisions while keeping current
  endpoints unchanged.
Commit hash/tag: Included in `docs(dle): define evidence access authorization`.
Uncommitted reason, if any: None.

## 2026-06-18 - Evidence Access Policy Helper

Date: 2026-06-18
Branch: refine/homepage-phase1-clarity-trust
Goal: Implement the first runtime guardrail from the evidence access contract: a pure policy helper
that evaluates DLE evidence access decisions without broadening endpoints.
Files changed:
- server/services/dleEvidenceArtifactService.ts
- server/services/__tests__/dleEvidenceArtifactService.test.ts
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/EVIDENCE_ACCESS_AUTHORIZATION_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 22 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `evaluateDleEvidenceAccess` evaluates `metadata`, `download`, and `review_mutation` access
  decisions with explicit allow/deny results and denial reasons.
- Developer access is limited to developer-owned artifacts through the developer leads surface.
- Admin access requires admin identity, admin review surface, and linked review context; download
  additionally requires a review reason and protected download guards.
- Distribution access requires active manager access plus explicit deal, programme, handoff, share,
  or grant linkage; DLE review mutation is denied for distribution managers.
- Public applicant access remains denied until a future scoped-token contract is implemented.
- Download access checks uploaded-file type, downloadable status, verified upload state, private DLE
  evidence namespace, no public external URL, private storage availability, and audit availability.
Guardrails:
- Pure-helper slice. No router endpoint, schema, upload, download, admin, distribution, public,
  readiness, inventory, lead stage, payout, public listing, wizard, draft, or autosave behavior is
  intended to change.
- Existing developer download runtime still uses the existing DB-backed ownership checks and has
  not been widened.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Existing developer download broker still needs to be wired through the policy helper in a focused
  no-access-broadening slice.
- Admin/distribution endpoints, source-surface download audit, explicit linkage persistence,
  malware scanning/quarantine, and public applicant/bidder upload remain future.
Next recommended slice:
- Wire the existing developer-only protected download broker through `evaluateDleEvidenceAccess`,
  preserving current behavior and denial semantics before opening any admin/distribution surface.
Commit hash/tag: Included in `feat(dle): add evidence access policy helper`.
Uncommitted reason, if any: None.

## 2026-06-18 - Developer Evidence Download Policy Wiring

Date: 2026-06-18
Branch: refine/homepage-phase1-clarity-trust
Goal: Route the existing developer-only protected evidence download broker through the DLE evidence
access-policy helper without broadening access.
Files changed:
- server/services/dleEvidenceArtifactService.ts
- server/services/__tests__/dleEvidenceArtifactService.test.ts
- docs/dle/EVIDENCE_ACCESS_AUTHORIZATION_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 23 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `getLeadEvidenceFileDownloadUrl` now calls `evaluateDleEvidenceAccess` before issuing any signed
  download URL.
- The endpoint remains developer-only and constrains current runtime downloads to submitted,
  uploaded-file evidence artifacts.
- Existing denial semantics are preserved for pending uploads, non-private evidence namespace,
  public external URLs, and missing private storage configuration.
- New regression proof rejects uploaded evidence that has a public `externalUrl` and confirms no
  download metadata, download audit event, lead-stage mutation, or funnel-stage mutation occurs.
Guardrails:
- No admin, distribution, public, schema, router, upload, readiness, inventory, payout, public
  listing, wizard, draft, or autosave behavior is intended to change.
- Admin/distribution access remains closed; the policy helper can evaluate those future decisions
  but no endpoint exposes them.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Download audit metadata still uses the existing developer surface and needs explicit
  source-surface/reason fields before admin/distribution expansion.
- Admin/distribution endpoints, explicit linkage persistence, malware scanning/quarantine, and
  public applicant/bidder upload remain future.
Next recommended slice:
- Add source-surface-aware metadata to protected evidence download audit events for the existing
  developer surface, preserving current access scope and avoiding keys, signed URLs, public URLs,
  and document contents.
Commit hash/tag: Included in `feat(dle): enforce evidence download policy`.
Uncommitted reason, if any: None.

## 2026-06-18 - Evidence Download Source-Surface Audit Metadata

Date: 2026-06-18
Branch: refine/homepage-phase1-clarity-trust
Goal: Add source-surface-aware protected evidence download audit metadata for the existing
developer-only download event without exposing sensitive storage or document details.
Files changed:
- server/services/dleEvidenceArtifactService.ts
- server/services/__tests__/dleEvidenceArtifactService.test.ts
- docs/dle/EVIDENCE_ACCESS_AUTHORIZATION_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 24 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `buildEvidenceDownloadAuditMetadata` now centralizes the safe audit metadata shape for protected
  evidence download events.
- Developer download audit metadata includes artifact id, artifact role, display name, source
  surface, access level, actor type, private storage namespace, expiry, and download count.
- Helper proof confirms the metadata does not expose storage keys, signed/download URLs, public
  external URLs, or document contents.
- The existing developer download event now uses the helper while preserving developer-only access
  and existing policy checks.
Guardrails:
- Audit-metadata-only slice. No admin, distribution, public, schema, router, upload, readiness,
  inventory, lead stage, payout, public listing, wizard, draft, or autosave behavior is intended to
  change.
- Admin/distribution access remains closed.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Admin/distribution endpoints, explicit linkage persistence, reviewer surface tests, malware
  scanning/quarantine, and public applicant/bidder upload remain future.
- Live signed-download event writeback still needs environment-backed S3/browser proof when private
  storage credentials are available.
Next recommended slice:
- Define the admin/distribution evidence linkage persistence shape before exposing any
  reviewer/manager metadata endpoint.
Commit hash/tag: Included in `feat(dle): enrich evidence download audit metadata`.
Uncommitted reason, if any: None.

## 2026-06-18 - Evidence Linkage Persistence Contract

Date: 2026-06-18
Branch: refine/homepage-phase1-clarity-trust
Goal: Define how DLE evidence artifacts may be linked to admin review and distribution workflows
before opening any reviewer/manager metadata or download endpoint.
Files changed:
- docs/dle/EVIDENCE_LINKAGE_PERSISTENCE_CONTRACT.md
- docs/dle/EVIDENCE_ACCESS_AUTHORIZATION_CONTRACT.md
- docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `test -f docs/dle/EVIDENCE_LINKAGE_PERSISTENCE_CONTRACT.md` passed.
- `rg "EVIDENCE_LINKAGE_PERSISTENCE_CONTRACT|distribution_deal_id|access_grants|admin_review_item_id|storage key|autosave" docs/dle` passed.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The new contract documents existing linkage anchors: `dle_evidence_artifacts.distribution_deal_id`,
  `lead_id`, and `development_operating_events.distribution_deal_id`.
- It defines when the existing `distribution_deal_id` link is sufficient and when a future
  explicit grant/link table is required.
- It defines a future `dle_evidence_artifact_access_grants` shape for multi-surface, expiring, or
  revocable admin/distribution access.
- It documents safe metadata exposure and download audit requirements without storage keys, signed
  URLs, public URLs, or document contents.
Guardrails:
- Documentation-only slice. No runtime, schema, router, upload, download, admin, distribution,
  public, readiness, inventory, lead stage, payout, public listing, wizard, draft, or autosave
  behavior is intended to change.
- Existing admin/distribution evidence endpoints remain closed.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- A pure linkage/read-model helper still needs to be implemented and tested before endpoints are
  opened.
- Admin/distribution endpoint design, explicit grant persistence, reviewer surface tests, malware
  scanning/quarantine, and public applicant/bidder upload remain future.
Next recommended slice:
- Implement a pure DLE evidence linkage helper that recognizes existing `distribution_deal_id`
  linkage, reserves future access-grant inputs, and proves unlinked/wrong-development/revoked
  cases without opening admin/distribution endpoints.
Commit hash/tag: Included in `docs(dle): define evidence linkage persistence`.
Uncommitted reason, if any: None.

## 2026-06-18 - Evidence Linkage Helper

Date: 2026-06-18
Branch: refine/homepage-phase1-clarity-trust
Goal: Implement the first pure linkage helper for DLE evidence access without opening admin or
distribution metadata/download endpoints.
Files changed:
- server/services/dleEvidenceArtifactService.ts
- server/services/__tests__/dleEvidenceArtifactService.test.ts
- docs/dle/EVIDENCE_LINKAGE_PERSISTENCE_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 27 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `buildDleEvidenceLinkageDecision` normalizes existing artifact `distribution_deal_id` linkage,
  supplied distribution deal context, and future access-grant rows into access-policy inputs.
- Helper tests prove valid distribution deal linkage, wrong-development deal denial, active future
  distribution/admin grants, revoked grants, and expired grants.
- The helper returns linkage flags, role relevance, grant ids, and denial reasons without DB writes
  or endpoint exposure.
Guardrails:
- Pure-helper slice. No admin, distribution, public, schema, router, upload, download, readiness,
  inventory, lead stage, payout, public listing, wizard, draft, or autosave behavior is intended to
  change.
- Admin/distribution evidence endpoints remain closed.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Existing distribution access-policy tests still use manual linkage inputs rather than this
  helper's normalized output.
- Admin/distribution endpoint design, explicit grant persistence, reviewer surface tests, malware
  scanning/quarantine, and public applicant/bidder upload remain future.
Next recommended slice:
- Wire the existing distribution access-policy helper tests through
  `buildDleEvidenceLinkageDecision` so the policy proof uses the same linkage normalization path
  that future endpoints will use.
Commit hash/tag: Included in `feat(dle): normalize evidence linkage`.
Uncommitted reason, if any: None.

## 2026-06-18 - Distribution Evidence Linkage Policy Proof

Date: 2026-06-18
Branch: refine/homepage-phase1-clarity-trust
Goal: Route the Distribution evidence access-policy proof through `buildDleEvidenceLinkageDecision`
so future endpoints use the same linkage normalization path tested by the policy helper.
Files changed:
- server/services/__tests__/dleEvidenceArtifactService.test.ts
- docs/dle/EVIDENCE_LINKAGE_PERSISTENCE_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 27 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The Distribution access-policy test now derives linked-deal access context from
  `buildDleEvidenceLinkageDecision` instead of hand-built linkage flags.
- The policy proof still denies Distribution access when no explicit linkage exists.
- The policy proof allows linked, role-relevant Distribution downloads through normalized linkage
  output.
- The policy proof denies role-irrelevant Distribution downloads through normalized linkage output.
Guardrails:
- Test/proof-only slice. No admin, distribution, public, schema, router, upload, download,
  readiness, inventory, lead stage, payout, public listing, wizard, draft, or autosave behavior is
  intended to change.
- Admin/distribution evidence endpoints remain closed.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Admin linkage policy still needs the same normalized-linkage proof path.
- Admin/distribution endpoint design, explicit grant persistence, reviewer surface tests, malware
  scanning/quarantine, and public applicant/bidder upload remain future.
Next recommended slice:
- Wire the admin evidence access-policy helper proof through `buildDleEvidenceLinkageDecision`
  using future admin-review grant inputs, keeping admin endpoints closed.
Commit hash/tag: Included in `test(dle): prove distribution evidence linkage policy`.
Uncommitted reason, if any: None.

## 2026-06-18 - Admin Evidence Linkage Policy Proof

Date: 2026-06-18
Branch: refine/homepage-phase1-clarity-trust
Goal: Route the Admin evidence access-policy proof through `buildDleEvidenceLinkageDecision` using
future admin-review grant inputs while keeping admin endpoints closed.
Files changed:
- server/services/__tests__/dleEvidenceArtifactService.test.ts
- docs/dle/EVIDENCE_LINKAGE_PERSISTENCE_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 27 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The Admin access-policy test now derives `adminReviewLinked` from
  `buildDleEvidenceLinkageDecision` using a future active admin-review grant shape.
- The policy proof still denies Admin access when no linked review item exists.
- The policy proof allows policy-scoped Admin downloads through normalized linkage output and a
  review reason.
- Admin review mutation remains denied unless a future explicit review-owner policy allows it.
Guardrails:
- Test/proof-only slice. No admin, distribution, public, schema, router, upload, download,
  readiness, inventory, lead stage, payout, public listing, wizard, draft, or autosave behavior is
  intended to change.
- Admin/distribution evidence endpoints remain closed.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Explicit grant persistence, reviewer surface tests, endpoint design, malware
  scanning/quarantine, and public applicant/bidder upload remain future.
Next recommended slice:
- Design the explicit evidence access grant persistence implementation or stop the access-control
  thread and return to Rental/Auction public merchandising or operating proof, depending on product
  priority.
Commit hash/tag: Included in `test(dle): prove admin evidence linkage policy`.
Uncommitted reason, if any: None.

## 2026-06-18 - Evidence Access Grant Persistence

Date: 2026-06-18
Branch: refine/homepage-phase1-clarity-trust
Goal: Add the first explicit DLE evidence access-grant persistence anchor and prove persisted Admin
Review grants feed the existing linkage/access-policy path without opening admin or distribution
evidence endpoints.
Files changed:
- drizzle/schema/developmentOperations.ts
- server/migrations/0074_create_dle_evidence_access_grants.sql
- server/services/dleEvidenceArtifactService.ts
- server/services/__tests__/dleEvidenceArtifactService.test.ts
- docs/dle/EVIDENCE_LINKAGE_PERSISTENCE_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm db:migrate:test` passed and applied
  `0074_create_dle_evidence_access_grants.sql` to the test DB.
- `pnpm vitest run server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 28
  tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `dle_evidence_artifact_access_grants` now persists artifact, development, lead,
  distribution-deal/program, admin-review item, source surface, target surface, access level,
  reason, status, expiry/revocation, actor, and metadata context for future evidence access.
- `buildDleEvidenceAccessGrantInput` maps persisted grant rows into
  `buildDleEvidenceLinkageDecision` inputs.
- DB-backed proof creates active, revoked, expired, and wrong-development Admin Review grants and
  verifies only the active, unexpired, same-development grant produces `adminReviewLinked`.
- The proof then runs the existing Admin evidence access policy through that persisted linkage and
  confirms policy-scoped Admin download access can be allowed in helper space.
Guardrails:
- No admin, distribution, public, router, upload, download, readiness, inventory, lead-stage,
  payout, public listing, wizard, draft, or autosave behavior is intended to change.
- Admin/distribution evidence metadata and download endpoints remain closed.
- This slice does not accept evidence, complete Rental lease readiness, complete Auction bidder
  readiness, move distribution stages, or automate rewards/commissions.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Distribution-manager grant seeding still needs proof with real distribution deal/programme rows.
- Read-only admin metadata endpoint design, admin download endpoint design, malware
  scanning/quarantine, public applicant/bidder upload, and reviewer surface UX remain future.
Next recommended slice:
- Add distribution-manager evidence access-grant persistence proof with a real linked deal/programme
  row, still without opening manager metadata/download endpoints; or return to controlled
  create/draft autosave monitoring depending on product priority.
Commit hash/tag: Included in `feat(dle): persist evidence access grants`.
Uncommitted reason, if any: None.

## 2026-06-18 - Distribution Evidence Grant Persistence Proof

Date: 2026-06-18
Branch: refine/homepage-phase1-clarity-trust
Goal: Prove persisted Distribution Manager evidence access grants with a real distribution
programme/deal linkage while keeping manager evidence endpoints closed.
Files changed:
- server/services/__tests__/dleEvidenceArtifactService.test.ts
- docs/dle/EVIDENCE_LINKAGE_PERSISTENCE_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run server/services/__tests__/dleEvidenceArtifactService.test.ts` passed with 29
  tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The DB-backed test now creates a real `distribution_programs` row and a real
  `distribution_deals` row linked to the same Auction development as the evidence artifact.
- The test persists active, revoked, expired, and wrong-development Distribution Manager grants.
- `buildDleEvidenceAccessGrantInput` maps persisted rows into `buildDleEvidenceLinkageDecision`.
- The linkage proof accepts only the active, unexpired, same-development grant and derives
  `dealLinked`, `programmeRoleMappedAndShared`, `accessGrantRecorded`, and role relevance from
  persisted data.
- The Distribution Manager access-policy helper is then evaluated through that normalized linkage
  and can allow policy-scoped helper download access without opening a runtime endpoint.
Guardrails:
- Test/proof-only slice. No admin, distribution, public, schema, router, upload, download,
  readiness, inventory, lead-stage, payout, public listing, wizard, draft, or autosave behavior is
  intended to change.
- Distribution evidence metadata/download endpoints remain closed.
- This slice does not accept evidence, complete Auction bidder readiness, move distribution deal
  stages, or automate payout/reward state.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Read-only admin metadata endpoint design, read-only distribution metadata endpoint design,
  download endpoint design, malware scanning/quarantine, public applicant/bidder upload, and
  reviewer surface UX remain future.
Next recommended slice:
- Decide between designing read-only admin/distribution evidence metadata endpoints or returning to
  controlled create/draft autosave monitoring and edit-development autosave ownership design.
Commit hash/tag: Included in `test(dle): prove distribution evidence grants`.
Uncommitted reason, if any: None.

## 2026-06-18 - Edit Autosave Ownership Boundary

Date: 2026-06-18
Branch: refine/homepage-phase1-clarity-trust
Goal: Define and prove the first edit-development autosave ownership boundary without enabling
background edit autosave.
Files changed:
- client/src/lib/developmentSubmitPayload.ts
- client/src/lib/developmentSubmitPayload.test.ts
- docs/dle/EDIT_DEVELOPMENT_AUTOSAVE_OWNERSHIP_CONTRACT.md
- docs/dle/AUTOSAVE_SAFETY_CONTRACT.md
- docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/lib/developmentSubmitPayload.test.ts` passed with 27 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- `buildDevelopmentEditAutosavePayload` now exists as the named future edit-autosave payload
  boundary.
- The boundary delegates to the existing baseline-aware edit progress path instead of create/draft
  full-snapshot persistence.
- Focused payload tests prove edit autosave location payloads exclude media, governance, and unit
  ownership.
- Focused payload tests prove edit autosave media payloads exclude location, governance, and unit
  ownership.
- The new contract documents the remaining component and browser proof gates before edit autosave
  can be enabled.
Guardrails:
- Edit-development autosave remains disabled.
- No wizard scheduling, backend endpoint, route enablement, publish, public listing, search-card,
  lead, evidence, distribution, inventory, payout, reward, or operating behavior is intended to
  change.
- Save Progress remains the manual fallback for edit journeys.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Component proof is still needed for any future edit-autosave rollout switch.
- Browser proof is still needed for Sale, Rental, and Auction edit routes preserving unrelated
  fields and public output.
- Failed edit-autosave visibility, stale partial payload handling, and retry behavior remain future.
Next recommended slice:
- Either continue controlled create/draft autosave rollout monitoring, or add component proof that a
  future edit-autosave switch remains disabled by default and can only route through
  `buildDevelopmentEditAutosavePayload`.
Commit hash/tag: Included in `test(dle): prove edit autosave ownership`.
Uncommitted reason, if any: None.

## 2026-06-18 - Edit Autosave Component Gate Proof

Date: 2026-06-18
Branch: refine/homepage-phase1-clarity-trust
Goal: Add component proof that future edit-development autosave remains default-off and can only
route through the baseline-aware partial update path.
Files changed:
- client/src/components/development-wizard/DevelopmentWizard.tsx
- client/src/components/development-wizard/DevelopmentWizard.test.tsx
- docs/dle/EDIT_DEVELOPMENT_AUTOSAVE_OWNERSHIP_CONTRACT.md
- docs/dle/AUTOSAVE_SAFETY_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/lib/developmentSubmitPayload.test.ts` passed with 53 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- The wizard now has a dedicated `VITE_DLE_EDIT_AUTOSAVE_ENABLED` gate for future edit autosave
  eligibility.
- Edit autosave remains disabled by default even when an edit route has a persisted baseline.
- When the future edit switch is explicitly enabled, the autosave callback builds a
  baseline-aware partial payload and calls `developer.updateDevelopment`.
- The explicitly enabled edit-autosave callback does not call the create/draft `saveDraft` path.
- Publisher-context edit autosave remains excluded by the shared publisher API guard.
Guardrails:
- Default runtime behavior remains unchanged: edit autosave is off unless the dedicated switch is
  explicitly enabled.
- No browser rollout, backend endpoint, schema, migration, publish, public listing, search-card,
  lead, evidence, distribution, inventory, payout, reward, or operating behavior is intended to
  change.
- Save Progress remains the trusted manual fallback for edit journeys.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Browser proof is still needed for Sale, Rental, and Auction edit routes preserving unrelated
  fields and public output.
- Failed edit-autosave visibility, stale partial payload handling, retry behavior, and rollout
  monitoring remain future.
Next recommended slice:
- Keep edit autosave disabled and add browser proof for Sale, Rental, and Auction edit-autosave
  field ownership before considering rollout enablement; or return to controlled create/draft
  autosave monitoring if that is higher priority.
Commit hash/tag: Included in `test(dle): prove edit autosave gate`.
Uncommitted reason, if any: None.

## 2026-06-18 - Edit Autosave Failure Retry Proof

Date: 2026-06-18
Branch: refine/homepage-phase1-clarity-trust
Goal: Prove future edit-development autosave safe-failure and retry behavior at the component
boundary while keeping edit autosave default-off.
Files changed:
- client/src/components/development-wizard/DevelopmentWizard.test.tsx
- docs/dle/EDIT_DEVELOPMENT_AUTOSAVE_OWNERSHIP_CONTRACT.md
- docs/dle/AUTOSAVE_SAFETY_CONTRACT.md
- docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `pnpm vitest run client/src/components/development-wizard/DevelopmentWizard.test.tsx client/src/lib/developmentSubmitPayload.test.ts` passed with 54 tests.
- `pnpm run check` passed.
- `git diff --check` passed.
Functional proof:
- With `VITE_DLE_EDIT_AUTOSAVE_ENABLED=true`, a backend `success: false` edit-autosave response
  rejects as `Development progress could not be persisted`.
- The failed edit-autosave attempt does not call `saveDraft`.
- The failed edit-autosave attempt does not advance the persisted edit baseline.
- A later retry after a canonical marketing-summary change sends the latest baseline-aware partial
  payload through `developer.updateDevelopment`.
- The successful retry advances the persisted edit baseline to the latest partial snapshot.
Guardrails:
- Edit autosave remains disabled by default.
- No runtime rollout, backend endpoint, schema, migration, publish, public listing, search-card,
  lead, evidence, distribution, inventory, payout, reward, or operating behavior is intended to
  change.
- Browser proof is still required before any edit-autosave rollout enablement.
- Existing unrelated homepage files, older evidence screenshots, Playwright report output, and
  unrelated test-results changes must not be staged.
Remaining risks:
- Browser proof is still needed for Sale, Rental, and Auction edit routes preserving unrelated
  fields and public output.
- Browser proof is still needed for visible failed edit-autosave state, stale partial payload
  handling, and retry behavior in a real runtime.
Next recommended slice:
- Keep edit autosave disabled and add browser proof for Sale, Rental, and Auction edit-autosave
  field ownership plus visible failure/retry before considering rollout enablement.
Commit hash/tag: Included in `test(dle): prove edit autosave retry`.
Uncommitted reason, if any: None.

## 2026-06-19 - Rental Edit Autosave Browser Failure/Retry Proof

Date: 2026-06-19
Branch: refine/homepage-phase1-clarity-trust
Goal: Add the first browser-level proof for future edit-development autosave failure/retry behavior
while keeping edit autosave gated and disabled by default.
Files changed:
- e2e/dle/edit-autosave-browser.spec.ts
- docs/dle/EDIT_DEVELOPMENT_AUTOSAVE_OWNERSHIP_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
- docs/dle/evidence/2026-06-19/qa-dle-edit-autosave-browser-failure-visible.png
- docs/dle/evidence/2026-06-19/qa-dle-edit-autosave-browser-retry-saved.png
- docs/dle/evidence/2026-06-19/qa-dle-edit-autosave-browser-public-preserved.png
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm exec playwright test e2e/dle/edit-autosave-browser.spec.ts --project="Desktop Chrome" --workers=1`
- Result: Passed. 1 test.
Functional proof:
- The spec seeds a published, approved Rental development with stable media, location, highlights,
  governance/finance, and one rental unit.
- With `VITE_DLE_EDIT_AUTOSAVE_ENABLED=true`, a deterministic backend `success: false` response
  leaves the wizard in visible `Save Failed` state.
- The failed edit-autosave attempt does not update the database description and preserves location,
  media, approval status, and rental unit pricing.
- A later browser retry sends the latest `marketing_summary` partial payload through
  `developer.updateDevelopment` with `canonicalUpdateMode: partial_step`.
- The retry payload does not own `unitTypes`, `city`, or `images`.
- After retry, the persisted description updates while rental unit pricing, location, media,
  approval, and public rental page output remain intact.
Guardrails:
- Edit-development autosave remains disabled by default and requires
  `VITE_DLE_EDIT_AUTOSAVE_ENABLED=true` for this proof.
- This slice proves only the Rental marketing-summary failure/retry path. It does not enable edit
  autosave and does not prove Sale or Auction browser edit-autosave ownership.
- No backend endpoint, schema, publish, search-card, lead, evidence, distribution, inventory,
  payout, reward, or operating behavior is intended to change.
- Existing unrelated homepage files, listing-wizard V2 files, older evidence screenshots,
  Playwright report output, and unrelated test-results changes must not be staged.
Remaining risks:
- Sale and Auction edit-autosave browser proof remain required before rollout enablement.
- Browser proof is still needed for location, media, and unit-edit autosave ownership.
- Browser proof is still needed for stale partial payload handling beyond the latest marketing retry.
Next recommended slice:
- Keep edit autosave disabled and add Auction edit-autosave browser failure/retry proof, or broaden
  this spec into a parameterized Sale/Rental/Auction proof for marketing-summary partial ownership
  before moving to location/media/unit autosave ownership.
Commit hash/tag: Pending.
Uncommitted reason, if any: Current worktree contains unrelated homepage changes, listing-wizard V2
WIP, older evidence screenshot churn, Playwright report output, and unrelated test-results changes.
Commit only this DLE slice after staging its exact files.

## 2026-06-20 - Completion Audit And Junior Execution Playbook

Date: 2026-06-20
Branch: feature/developer-listing-engine-isolated
Goal: Align future DLE work to the clean isolated worktree and create senior-reviewed execution
instructions for junior developer slices.
Files changed:
- docs/dle/GOAL_COMPLETION_AUDIT.md
- docs/dle/JUNIOR_EXECUTION_PLAYBOOK.md
- docs/dle/JUNIOR_SLICE_001_EDIT_AUTOSAVE_MARKETING_PROOF.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- Not run. Documentation/control slice only.
git diff --check:
- Passed.
Functional proof:
- Confirmed the clean DLE worktree is
  `/home/edwardspc/Desktop/Dev/listify-developer-listing-engine` on
  `feature/developer-listing-engine-isolated`.
- Confirmed homepage, navigation, intelligent listing engine, and listing wizard overhaul work live
  in separate worktrees and must not be used for DLE execution.
- Added a completion-gap audit covering edit autosave, hand-entered Rental/Auction UX, product
  polish, evidence runtime product, distribution semantics, and final end-to-end acceptance.
- Added a junior execution playbook with worktree rules, required reading, senior review gates,
  slice workflow, approved next slices, and commit discipline.
- Added the first copy-paste-ready junior slice for Sale/Rental/Auction marketing-summary edit
  autosave browser proof expansion.
Guardrails:
- No app code, schema, migrations, tests, public pages, autosave behavior, evidence runtime,
  distribution, inventory, payout, reward, or operating behavior changed.
- Edit autosave remains disabled.
Remaining risks:
- The DLE goal remains incomplete; this slice only aligns execution control.
- Junior work must still be senior-reviewed before commit/merge.
Next recommended slice:
- Assign one narrow approved slice from `docs/dle/JUNIOR_EXECUTION_PLAYBOOK.md`, preferably
  Sale/Rental/Auction marketing-summary edit-autosave browser proof expansion or a no-code
  hand-entered Rental/Auction UX audit.
Commit hash/tag: Pending.
Uncommitted reason, if any: Pending senior/user approval to commit documentation-control slice.

## 2026-06-20 - Junior Slice 001 - Sale/Rental/Auction Edit Autosave Marketing Proof

Date: 2026-06-20
Branch: feature/developer-listing-engine-isolated
Goal: Extend the existing edit-autosave browser proof so Sale, Rental, and Auction each prove
marketing-summary edit-autosave failure/retry behavior per the ownership contract.
Files changed:
- e2e/dle/edit-autosave-browser.spec.ts
- docs/dle/EDIT_DEVELOPMENT_AUTOSAVE_OWNERSHIP_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm exec playwright test e2e/dle/edit-autosave-browser.spec.ts --project="Desktop Chrome" --workers=1`
- Result: Passed after senior cleanup. Earlier junior run did not complete. Senior runtime review
  later proved the edit page
  eventually reached `Marketing Summary`; backend logs confirmed auth, ownership, development
  hydration, and marketing-only update payloads were working. The clean rerun failed because a
  temporary diagnostic called `page.evaluate` during navigation and triggered
  `Execution context was destroyed`. That diagnostic has been removed.
- Final focused browser result: 6 passed, 0 failed.
- `pnpm run check`: Passed after senior cleanup.
- `git diff --check`: Passed after senior cleanup.
Evidence screenshots:
- docs/dle/evidence/2026-06-20/qa-dle-rental-edit-autosave-failure-visible.png
- docs/dle/evidence/2026-06-20/qa-dle-rental-edit-autosave-retry-saved.png
- docs/dle/evidence/2026-06-20/qa-dle-rental-edit-autosave-public-preserved.png
- docs/dle/evidence/2026-06-20/qa-dle-sale-edit-autosave-failure-visible.png
- docs/dle/evidence/2026-06-20/qa-dle-sale-edit-autosave-retry-saved.png
- docs/dle/evidence/2026-06-20/qa-dle-sale-edit-autosave-public-preserved.png
- docs/dle/evidence/2026-06-20/qa-dle-auction-edit-autosave-failure-visible.png
- docs/dle/evidence/2026-06-20/qa-dle-auction-edit-autosave-retry-saved.png
- docs/dle/evidence/2026-06-20/qa-dle-auction-edit-autosave-public-preserved.png
Functional proof intended by this slice:
- Refactored the Rental-only spec into typed seed helpers (RentalSeed, SaleSeed, AuctionSeed)
  and a shared transaction-lane runner.
- Added `seedPublishedSaleEditDevelopment` and `seedPublishedAuctionEditDevelopment` fixtures.
- Corrected Sale/Auction seeds to use persisted publish-ready ownership values (`full-title`), and
  corrected Auction to use the canonical `auction` transaction type plus unit-level auction dates.
- Each lane seeds a published, approved development with stable location, media, highlights,
  governance/finance, and one unit type.
- With `VITE_DLE_EDIT_AUTOSAVE_ENABLED=true`, the first `developer.updateDevelopment` request is
  intercepted and returns `{ success: false }`.
- Each lane asserts UI shows visible `Save Failed`, DB description is unchanged, and unrelated fields
  (city, suburb, media, unit inventory) remain preserved after failure.
- Each lane changes the description again and asserts the retry succeeds.
- Each lane asserts the retry payload has `canonicalUpdateMode: partial_step`, owns marketing fields
  only, and does not own `unitTypes`, `city`, or `images`.
- Each lane asserts the public development page renders transaction-native output after retry.
- Sale: sale unit name, `Price From R 1 750 000 - R 2 200 000` pricing visible.
- Rental: `Rent From R 18 500 - R 21 000`, `R 18 500 / month`, rental unit name.
- Auction: `Starting Bid`, auction unit name.
- The retry-payload ownership proof now uses the same shared lane descriptors rather than copied
  Sale/Rental/Auction blocks.
Guardrails:
- Edit-development autosave remains disabled by default.
- No backend endpoint, schema, migration, publish, search-card, lead, evidence, distribution,
  inventory, payout, reward, or operating behavior changed.
- Existing unrelated homepage, navigation, listing intelligence, and listing wizard files were not
  touched.
Remaining risks:
- Edit autosave is not enabled by default and must not be claimed as ready.
- Browser proof is still needed for location, media, and unit-edit autosave ownership across all
  three lanes.
- Browser proof is still needed for stale partial payload handling beyond the latest marketing retry.
Next recommended slice:
- Continue to location edit-autosave ownership proof for Sale, Rental, and Auction.
Commit hash/tag: Included in `test(dle): prove edit autosave across transaction lanes`.
Uncommitted reason, if any: None. Slice committed.

## 2026-06-22 - Sale/Rental/Auction Edit Autosave Location Ownership Proof

Date: 2026-06-22
Branch: feature/developer-listing-engine-isolated
Goal: Extend the edit-autosave browser proof so Sale, Rental, and Auction each prove Location step
failure/retry behavior without letting a location edit wipe marketing, media, governance, pricing,
or unit inventory.
Files changed:
- e2e/dle/edit-autosave-browser.spec.ts
- docs/dle/EDIT_DEVELOPMENT_AUTOSAVE_OWNERSHIP_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm exec playwright test e2e/dle/edit-autosave-browser.spec.ts --project="Desktop Chrome" --workers=1`
- Result: Passed. Final focused browser result: 12 passed, 0 failed.
- `pnpm run check`: Passed.
- `git diff --check`: Passed.
Evidence screenshots:
- docs/dle/evidence/2026-06-22/qa-dle-rental-edit-autosave-location-failure-visible.png
- docs/dle/evidence/2026-06-22/qa-dle-rental-edit-autosave-location-retry-saved.png
- docs/dle/evidence/2026-06-22/qa-dle-rental-edit-autosave-location-public-preserved.png
- docs/dle/evidence/2026-06-22/qa-dle-sale-edit-autosave-location-failure-visible.png
- docs/dle/evidence/2026-06-22/qa-dle-sale-edit-autosave-location-retry-saved.png
- docs/dle/evidence/2026-06-22/qa-dle-sale-edit-autosave-location-public-preserved.png
- docs/dle/evidence/2026-06-22/qa-dle-auction-edit-autosave-location-failure-visible.png
- docs/dle/evidence/2026-06-22/qa-dle-auction-edit-autosave-location-retry-saved.png
- docs/dle/evidence/2026-06-22/qa-dle-auction-edit-autosave-location-public-preserved.png
Functional proof intended by this slice:
- Reuses the published, approved transaction-lane seeds from the marketing proof.
- Moves the edit wizard to the Location step before each location proof.
- With `VITE_DLE_EDIT_AUTOSAVE_ENABLED=true`, intercepts the first
  `developer.updateDevelopment` request and returns `{ success: false }`.
- Each lane asserts UI shows visible `Save Failed`, DB address is unchanged, and unrelated fields
  (description, city, province, suburb, postal code, media, governance/finance, approval status,
  and unit inventory) remain preserved after failure.
- Each lane changes the address again and asserts the retry succeeds.
- Each lane asserts the retry payload has `canonicalUpdateMode: partial_step`, owns location
  fields only, and does not own marketing, media, governance, unit inventory, or
  transaction-specific pricing fields.
- Each lane asserts the public development page renders transaction-native output after retry.
Guardrails:
- Edit-development autosave remains disabled by default.
- No backend endpoint, schema, migration, publish, search-card, lead, evidence, distribution,
  inventory, payout, reward, or operating behavior changed.
- This is address-level Location step proof; city/suburb/province/postal browser coverage can still
  be added before rollout if needed.
Remaining risks:
- Edit autosave is not enabled by default and must not be claimed as ready.
- Browser proof is still needed for media and unit-edit autosave ownership across all three lanes.
- Browser proof is still needed for stale partial payload handling beyond the latest retry checks.
Next recommended slice:
- Continue to media edit-autosave ownership proof for Sale, Rental, and Auction after this slice
  passes.
Commit hash/tag: Included in `test(dle): prove location edit autosave ownership`.
Uncommitted reason, if any: None. Slice committed.

## 2026-06-22 - Sale/Rental/Auction Edit Autosave Media Ownership Proof

Date: 2026-06-22
Branch: feature/developer-listing-engine-isolated
Goal: Extend the edit-autosave browser proof so Sale, Rental, and Auction each prove Media step
upload failure/retry behavior without letting a media edit wipe location, marketing, governance,
pricing, or unit inventory.
Files changed:
- e2e/dle/edit-autosave-browser.spec.ts
- docs/dle/EDIT_DEVELOPMENT_AUTOSAVE_OWNERSHIP_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm exec playwright test e2e/dle/edit-autosave-browser.spec.ts --project="Desktop Chrome" --workers=1`
- Result: Passed after increasing the autosave response wait to match the 10s debounce plus
  heavier Auction hydration path. Final focused browser result: 18 passed, 0 failed.
- `pnpm run check`: Passed.
- `git diff --check`: Passed.
Evidence screenshots:
- docs/dle/evidence/2026-06-22/qa-dle-rental-edit-autosave-media-failure-visible.png
- docs/dle/evidence/2026-06-22/qa-dle-rental-edit-autosave-media-retry-saved.png
- docs/dle/evidence/2026-06-22/qa-dle-rental-edit-autosave-media-public-preserved.png
- docs/dle/evidence/2026-06-22/qa-dle-sale-edit-autosave-media-failure-visible.png
- docs/dle/evidence/2026-06-22/qa-dle-sale-edit-autosave-media-retry-saved.png
- docs/dle/evidence/2026-06-22/qa-dle-sale-edit-autosave-media-public-preserved.png
- docs/dle/evidence/2026-06-22/qa-dle-auction-edit-autosave-media-failure-visible.png
- docs/dle/evidence/2026-06-22/qa-dle-auction-edit-autosave-media-retry-saved.png
- docs/dle/evidence/2026-06-22/qa-dle-auction-edit-autosave-media-public-preserved.png
Functional proof intended by this slice:
- Seeds each published, approved transaction-lane development with stable media in the canonical
  `development_media.photos` slice, matching the Media UI source of truth.
- Moves the edit wizard to the Development Media step before each media proof.
- Uploads a real tiny PNG through the local upload fallback.
- With `VITE_DLE_EDIT_AUTOSAVE_ENABLED=true`, intercepts the first
  `developer.updateDevelopment` request and returns `{ success: false }`.
- Each lane asserts UI shows visible `Save Failed`, DB media does not include the failed
  local-upload URL, and unrelated fields (description, address, city, province, suburb, postal
  code, governance/finance, approval status, and unit inventory) remain preserved after failure.
- Each lane uploads a second image and asserts the retry succeeds with the latest media payload.
- Each lane asserts the retry payload has `canonicalUpdateMode: partial_step`, owns media fields
  only, and does not own location, marketing, governance, unit inventory, or transaction-specific
  pricing fields.
- Each lane asserts the public development page renders transaction-native output after retry.
Guardrails:
- Edit-development autosave remains disabled by default.
- No backend endpoint, schema, migration, publish, search-card, lead, evidence, distribution,
  inventory, payout, reward, or operating behavior changed.
- This is media upload/add proof; remove/reorder browser coverage can still be added before rollout
  if needed.
Remaining risks:
- Edit autosave is not enabled by default and must not be claimed as ready.
- Browser proof is still needed for unit-edit autosave ownership across all three lanes.
- Browser proof is still needed for stale partial payload handling beyond the latest retry checks.
Next recommended slice:
- Continue to unit edit-autosave ownership proof for Sale, Rental, and Auction after this slice
  passes.
Commit hash/tag: Included in `test(dle): prove media edit autosave ownership`.
Uncommitted reason, if any: None. Slice committed.

## 2026-06-22 - Sale/Rental/Auction Edit Autosave Unit Ownership Proof

Date: 2026-06-22
Branch: feature/developer-listing-engine-isolated
Goal: Extend the edit-autosave browser proof so Sale, Rental, and Auction each prove Unit Types
pricing failure/retry behavior without letting a unit edit wipe location, marketing, media,
governance, approval, or public listing context.
Files changed:
- client/src/components/development-wizard/DevelopmentWizard.tsx
- e2e/dle/edit-autosave-browser.spec.ts
- docs/dle/EDIT_DEVELOPMENT_AUTOSAVE_OWNERSHIP_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- Focused sale unit proof after payload-contract correction:
  `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm exec playwright test e2e/dle/edit-autosave-browser.spec.ts --project="Desktop Chrome" --workers=1 --grep "sale edit autosave.*unit"`
  - Result: Passed. Final focused browser result: 2 passed, 0 failed.
- Full Sale/Rental/Auction edit-autosave browser suite:
  `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm exec playwright test e2e/dle/edit-autosave-browser.spec.ts --project="Desktop Chrome" --workers=1`
  - Result: Passed. Final browser result: 24 passed, 0 failed.
- `pnpm run check`: Passed.
- `git diff --check`: Passed.
Evidence screenshots:
- docs/dle/evidence/2026-06-22/qa-dle-rental-edit-autosave-unit-failure-visible.png
- docs/dle/evidence/2026-06-22/qa-dle-rental-edit-autosave-unit-retry-saved.png
- docs/dle/evidence/2026-06-22/qa-dle-rental-edit-autosave-unit-public-preserved.png
- docs/dle/evidence/2026-06-22/qa-dle-sale-edit-autosave-unit-failure-visible.png
- docs/dle/evidence/2026-06-22/qa-dle-sale-edit-autosave-unit-retry-saved.png
- docs/dle/evidence/2026-06-22/qa-dle-sale-edit-autosave-unit-public-preserved.png
- docs/dle/evidence/2026-06-22/qa-dle-auction-edit-autosave-unit-failure-visible.png
- docs/dle/evidence/2026-06-22/qa-dle-auction-edit-autosave-unit-retry-saved.png
- docs/dle/evidence/2026-06-22/qa-dle-auction-edit-autosave-unit-public-preserved.png
Functional proof intended by this slice:
- Fixes edit-mode autosave observation for Unit Types by subscribing the wizard to a stable
  canonical draft signature, so unit dialog saves are visible to the edit-autosave watcher without
  introducing a render loop.
- Extends each published, approved transaction-lane seed so the seeded unit passes the real Unit
  Type edit dialog validation.
- Moves the edit wizard to the Unit Types step before each unit proof.
- Opens the seeded unit through the real edit dialog, changes the transaction-native pricing field,
  and saves from the Stock tab:
  - Sale: `priceFrom`.
  - Rental: `monthlyRentFrom`.
  - Auction: `startingBid`.
- With `VITE_DLE_EDIT_AUTOSAVE_ENABLED=true`, intercepts the first
  `developer.updateDevelopment` request and returns `{ success: false }`.
- Each lane asserts UI shows visible `Save Failed`, DB unit pricing is unchanged after failure,
  and unrelated fields (description, address, city, province, suburb, postal code, media,
  governance/finance, and approval status) remain preserved.
- Each lane reopens the unit, changes the pricing value again, and asserts the retry succeeds with
  the latest unit payload.
- Each lane asserts the retry payload has `canonicalUpdateMode: partial_step`, owns
  unit/inventory fields only, and does not own location, marketing, media, or governance fields.
- Each lane asserts the public development page renders the retried transaction-native unit pricing
  value after retry.
- Sale unit payload assertions use the current canonical vocabulary: `basePriceFrom` inside the
  unit payload and development-level `priceFrom` for the public aggregate.
- Public output assertions target the visible commercial-pack merchandising copy instead of hidden
  duplicate price nodes.
Guardrails:
- Edit-development autosave remains disabled by default.
- No backend endpoint, schema, migration, publish, search-card, lead, evidence, distribution,
  inventory outcome, payout, reward, or operating behavior changed.
- This is transaction-native unit pricing proof; remove/reorder, search-card, and lead-context
  assertions can still be added before rollout if needed.
Remaining risks:
- Edit autosave is not enabled by default and must not be claimed as ready.
- Browser proof is still needed for stale in-flight partial response ordering beyond the latest
  retry checks.
Next recommended slice:
- Keep edit-development autosave disabled and add browser proof that an older in-flight partial
  response cannot mark a newer edit as saved.
Commit hash/tag: Included in `test(dle): prove unit edit autosave ownership`.
Uncommitted reason, if any: None. Slice committed.

## 2026-06-23 - Sale/Rental/Auction Edit Autosave Stale Response Proof

Date: 2026-06-23
Branch: feature/developer-listing-engine-isolated
Goal: Prove an older in-flight successful edit-autosave response cannot mark a newer unsaved edit
as saved across Sale, Rental, and Auction.
Files changed:
- e2e/dle/edit-autosave-browser.spec.ts
- docs/dle/EDIT_DEVELOPMENT_AUTOSAVE_OWNERSHIP_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- Focused stale-success browser proof:
  `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm exec playwright test e2e/dle/edit-autosave-browser.spec.ts --project="Desktop Chrome" --workers=1 --grep "stale successful marketing"`
  - Result: Passed. Final focused browser result: 3 passed, 0 failed.
- Full Sale/Rental/Auction edit-autosave browser suite:
  `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm exec playwright test e2e/dle/edit-autosave-browser.spec.ts --project="Desktop Chrome" --workers=1`
  - Result: Passed. Final browser result: 27 passed, 0 failed.
- `pnpm run check`: Passed.
- `git diff --check`: Passed.
Evidence screenshots:
- None added in this slice. The proof is request/status/DB based and intentionally avoids
  rewriting older evidence screenshots.
Functional proof intended by this slice:
- Adds a delayed-success route helper that holds the first `developer.updateDevelopment` response
  open, then releases it after the browser has accepted a newer description edit.
- For Sale, Rental, and Auction, verifies the stale successful response does not show `Saved` for
  the newer unsaved content.
- Verifies the header remains `Manual save ready` until the newer marketing payload is sent and
  persisted.
- Verifies both stale and newer payloads use `canonicalUpdateMode: partial_step` and own marketing
  fields only.
- Verifies the newer persisted description eventually becomes the DB baseline while approval stays
  approved.
Guardrails:
- Edit-development autosave remains disabled by default.
- No app runtime code, backend endpoint, schema, migration, publish, search-card, lead, evidence,
  distribution, inventory outcome, payout, reward, or operating behavior changed.
- This is marketing-step stale-success proof; repeat for high-risk media/unit remove/reorder flows
  if needed before rollout.
Remaining risks:
- Edit autosave is not enabled by default and must not be claimed as ready.
- Media remove/reorder and unit remove/reorder autosave ownership are not browser-proven.
- Search-card and lead-context preservation after autosaved unit edits remain optional rollout
  hardening gates.
Next recommended slice:
- Keep edit-development autosave disabled and add either media/unit remove-reorder proof or
  post-autosave search-card/lead-context proof, depending on rollout priority.
Commit hash/tag: Included in `test(dle): prove stale edit autosave status`.
Uncommitted reason, if any: None. Slice committed.

## 2026-06-23 - Sale/Rental/Auction Edit Autosave Merchandising And Lead Context Proof

Date: 2026-06-23
Branch: feature/developer-listing-engine-isolated
Goal: Prove autosaved Unit Types pricing changes flow from edit packaging into public
merchandising and unit-level lead context across Sale, Rental, and Auction.
Files changed:
- e2e/dle/edit-autosave-browser.spec.ts
- docs/dle/EDIT_DEVELOPMENT_AUTOSAVE_OWNERSHIP_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- Comparison unit autosave ownership proof after hardening the shared unit update response wait:
  `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm exec playwright test e2e/dle/edit-autosave-browser.spec.ts --project="Desktop Chrome" --workers=1 --grep "keeps failed unit autosave visible"`
  - Result: Passed. Final focused browser result: 3 passed, 0 failed.
- Focused unit autosave merchandising and lead-context browser proof:
  `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm exec playwright test e2e/dle/edit-autosave-browser.spec.ts --project="Desktop Chrome" --workers=1 --grep "search card and lead context"`
  - Result: Passed. Final focused browser result: 3 passed, 0 failed.
- `pnpm run check`: Passed.
- `git diff --check`: Passed.
Evidence screenshots:
- None added in this slice. The proof is browser/API/DB based and intentionally avoids rewriting
  older evidence screenshots.
Functional proof intended by this slice:
- Extends the edit-autosave browser lane config with valid merchandising pricing values and
  expected lead transaction context for Sale, Rental, and Auction.
- Hardens the shared unit update helper so it starts waiting for the update response before modal
  edits begin.
- For each transaction lane:
  - Opens the published, approved development at the Unit Types step.
  - Edits the seeded unit through the real Edit Unit Type dialog.
  - Forces the first `developer.updateDevelopment` request to return `{ success: false }`.
  - Asserts `Save Failed` remains visible.
  - Retries with a valid transaction-native unit price and asserts `Saved`.
  - Asserts failed and retry payloads have `canonicalUpdateMode: partial_step` and own unit fields
    only.
  - Asserts non-unit commercial package fields, approval status, media, location, marketing, and
    governance remain preserved.
  - Asserts public development detail shows the retried transaction-native unit price.
  - Asserts public search/list cards show the retried transaction-native price language:
    Sale `From`, Rental `Rent from`, Auction `Bid from`.
  - Submits a unit-level public lead and asserts the persisted lead keeps development id, unit id,
    unit name, `development_detail_contact` source, `interest` funnel stage, normalized transaction
    type, and unit price label.
Guardrails:
- Edit-development autosave remains disabled by default.
- No app runtime code, backend endpoint, schema, migration, publish behavior, search-card logic,
  lead persistence logic, distribution, inventory outcome, payout, reward, or operating behavior
  changed.
- This is transaction-native unit pricing proof from packaging to merchandising to conversion;
  media/unit remove-reorder coverage can still be added before rollout if needed.
Remaining risks:
- Edit autosave is not enabled by default and must not be claimed as ready.
- Media remove/reorder and unit remove/reorder autosave ownership are not browser-proven.
- Stale-response ordering proof currently covers marketing; high-risk media/unit stale ordering
  can still be added before rollout if needed.
Next recommended slice:
- Keep edit-development autosave disabled and add media/unit remove-reorder proof or media/unit
  stale-response ordering proof before any production enablement.
Commit hash/tag: Included in `test(dle): prove autosaved unit merchandising context`.
Uncommitted reason, if any: None. Slice committed.

## 2026-06-23 - Sale/Rental/Auction Edit Autosave Media Removal Proof

Date: 2026-06-23
Branch: feature/developer-listing-engine-isolated
Goal: Prove Media step removal failure/retry behavior across Sale, Rental, and Auction without
letting a visible media removal fall back to stale published hero media or wipe unrelated
commercial package fields.
Files changed:
- client/src/components/development-wizard/phases/MediaPhase.tsx
- e2e/dle/edit-autosave-browser.spec.ts
- docs/dle/EDIT_DEVELOPMENT_AUTOSAVE_OWNERSHIP_CONTRACT.md
- docs/dle/RECOVERY_LOG.md
Tests run:
- Local DB setup for this environment:
  - Started a throwaway MySQL datadir under `/tmp/listify-mysql-v2` on `127.0.0.1:3307`.
  - Ran `pnpm db:migrate:drizzle:local`: Passed.
  - Ran `pnpm db:migrate:local`: Passed, including `[db:verify:distribution] OK`.
- Focused media removal browser proof:
  `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm exec playwright test e2e/dle/edit-autosave-browser.spec.ts --project="Desktop Chrome" --workers=1 --grep "media removal"`
  - Result: Passed. Final focused browser result: 3 passed, 0 failed.
Environment notes:
- Backend was started with `pnpm dev:backend`.
- Frontend must be started with `VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm dev:frontend` for this
  browser proof; setting the flag only on the Playwright command is not enough once Vite is already
  running.
Evidence screenshots:
- None added in this slice. The proof is browser/API/DB based and intentionally avoids rewriting
  older evidence screenshots.
Functional proof intended by this slice:
- Fixes Media step persistence so each media write carries the derived `heroImage` mirror, including
  `null` when the last hero/photo is removed. This prevents the edit-autosave payload builder from
  resurrecting stale published hero media after a visible removal.
- Adds a browser helper that removes a rendered media card through the real Media UI and waits for
  the `developer.updateDevelopment` response.
- For each transaction lane:
  - Opens the published, approved development at the Development Media step.
  - Removes the seeded published media.
  - Forces the first `developer.updateDevelopment` request to return `{ success: false }`.
  - Asserts `Save Failed` remains visible.
  - Asserts the failed removal payload has `canonicalUpdateMode: partial_step`, owns media fields
    only, and excludes the removed media URL.
  - Asserts the failed removal does not delete persisted media from the DB.
  - Uploads a replacement image and asserts the retry succeeds with the latest media payload.
  - Asserts the retry payload excludes the removed media URL and persists the replacement upload.
  - Asserts location, marketing, governance, approval status, and unit inventory remain preserved.
Guardrails:
- Edit-development autosave remains disabled by default.
- No backend endpoint, schema, migration, publish behavior, search-card logic, lead persistence
  logic, distribution, inventory outcome, payout, reward, or operating behavior changed.
- This is seeded-media removal proof; media reorder and unit remove/reorder remain separate rollout
  hardening gates.
Remaining risks:
- Edit autosave is not enabled by default and must not be claimed as ready.
- Media reorder and unit remove/reorder autosave ownership are not browser-proven.
- Stale-response ordering proof currently covers marketing; high-risk media/unit stale ordering can
  still be added before rollout if needed.
Next recommended slice:
- Keep edit-development autosave disabled and add media reorder, unit remove/reorder, or high-risk
  media/unit stale-response ordering proof before any production enablement.
Commit hash/tag: Included in `test(dle): prove media removal edit autosave ownership`.
Uncommitted reason, if any: None. Slice committed.
