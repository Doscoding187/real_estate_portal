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
