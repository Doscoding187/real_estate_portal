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
