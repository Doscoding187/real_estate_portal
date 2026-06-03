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
- Passed before this log update.
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
Commit hash/tag: Pending.
Uncommitted reason, if any: Verification still running for this slice.
