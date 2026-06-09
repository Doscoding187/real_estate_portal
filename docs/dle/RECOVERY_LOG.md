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
