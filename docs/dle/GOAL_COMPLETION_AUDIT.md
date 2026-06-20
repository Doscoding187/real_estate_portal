# DLE Goal Completion Audit

Date: 2026-06-20
Worktree: `/home/edwardspc/Desktop/Dev/listify-developer-listing-engine`
Branch: `feature/developer-listing-engine-isolated`
Baseline commit: `aa3775d8 test(dle): isolate edit autosave browser proof`
Status: DLE is advanced, but not complete.

## Purpose

This audit defines what remains before the Development Listing Engine can be considered complete
against the current product goal.

It is intentionally written for execution control. A junior developer should not decide scope from
memory, screenshots, or adjacent worktrees. They should use this audit, the source of truth, and the
contracts in `docs/dle/`.

## Current Clean Lane

Use this worktree only for DLE work:

- `/home/edwardspc/Desktop/Dev/listify-developer-listing-engine`
- branch: `feature/developer-listing-engine-isolated`

Do not continue DLE work from:

- `/home/edwardspc/Desktop/Dev/real_estate_portal_clone`
- `/home/edwardspc/Desktop/Dev/listify-homepage-improvements`
- `/home/edwardspc/Desktop/Dev/listify-intelligent-listing-engine-v2`
- `/home/edwardspc/Desktop/Dev/listify-listing-wizard-overhaul`

Those worktrees are separate lanes for navigation/homepage/property-listing work.

## What Is Already Credibly Proven

### Foundation

- DLE source-of-truth, recovery discipline, field ownership, architecture, and handoff docs exist.
- Canonical workflow state is established around `workflowId`, `currentStepId`,
  `completedSteps`, `developmentData`, `stepData`, and
  `stepData.unit_types.unitTypes`.
- Focused backend and client tests cover canonical draft/update/publish paths.

### Sale Engine

Sale has credible proof for:

- manual save/resume;
- publish/public detail;
- public highlights;
- search/list output;
- lead context;
- edit-published ownership;
- guarded create/draft autosave;
- operating status mutations such as reserve, release, and sold.

Sale is not perfect product-polish complete, but it is no longer the main autosave blocker.

### Rental Engine

Rental has credible technical and browser proof for:

- transaction-native pricing using monthly rent;
- stale sale/auction field stripping;
- readiness validation;
- manual save/resume/publish from canonical draft;
- public detail/search/lead context;
- edit-published ownership;
- guarded create/draft autosave;
- operating status actions such as hold, release, let, and direct let;
- rental unit-readiness and evidence-review visibility.

Remaining rental gaps are product completeness and edit-autosave breadth, not the basic transaction
model.

### Auction Engine

Auction has credible technical and browser proof for:

- transaction-native starting-bid/reserve pricing;
- auction date/window semantics;
- stale sale/rent field stripping;
- readiness validation;
- manual save/resume/publish from canonical draft;
- public detail/search/lead context;
- edit-published ownership;
- guarded create/draft autosave;
- auction registration/activation/outcome flows;
- auction unit-readiness and evidence-review visibility.

Remaining auction gaps are product completeness and edit-autosave breadth, not the basic
transaction model.

### Operating Layer

Operating-layer proof exists for:

- Sale, Rental, and Auction outcome/status language;
- lead outcome synchronization;
- failure trust checks that avoid false success;
- dashboard pricing-health indicators;
- operating review lanes;
- distribution handoff readback and acknowledgements;
- evidence coverage and access-policy helper proofs.

The operating layer is meaningful but not complete as a live development operations platform.

### Autosave

Create/draft autosave is available behind the default-off
`VITE_DLE_CREATE_DRAFT_AUTOSAVE_ENABLED` switch.

Edit autosave remains disabled by default. The following is proven:

- baseline-aware partial-step payload boundary;
- component gate behind `VITE_DLE_EDIT_AUTOSAVE_ENABLED`;
- backend `success: false` handling at component level;
- limited Rental browser failure/retry proof for `marketing_summary`.

## Completion Gaps

### Gap 1: Edit Autosave Is Not Ready For Enablement

Status: incomplete.

Required before enablement:

- browser proof for Sale edit autosave;
- browser proof for Rental edit autosave beyond the current marketing-summary path;
- browser proof for Auction edit autosave;
- location edit autosave preserving media, governance, unit inventory, pricing, and public output;
- media edit autosave preserving location, governance, unit inventory, pricing, and public output;
- unit edit autosave preserving media, location, governance, public pricing, search cards, and lead
  context;
- stale partial payload proof so older saves cannot mark newer edits as saved;
- Save Progress remains the trusted fallback.

Primary docs:

- `docs/dle/AUTOSAVE_SAFETY_CONTRACT.md`
- `docs/dle/EDIT_DEVELOPMENT_AUTOSAVE_OWNERSHIP_CONTRACT.md`

Recommended next slice:

- Parameterize `e2e/dle/edit-autosave-browser.spec.ts` for Sale, Rental, and Auction
  `marketing_summary` failure/retry proof.
- Keep `VITE_DLE_EDIT_AUTOSAVE_ENABLED` off by default.

### Gap 2: Full Hand-Entered Rental And Auction Wizard UX Is Still Not Proven

Status: incomplete.

Current proof uses strong canonical draft/browser paths, but the docs still do not claim full
hand-entered Rental/Auction UX from Project Setup through every form step.

Required:

- full hand-entered Rental journey from Project Setup to publish;
- full hand-entered Auction journey from Project Setup to publish;
- UX gap list for confusing copy, hidden requirements, weak readiness feedback, and sale-shaped
  language.

Primary docs:

- `docs/dle/RENTAL_ENGINE_TECHNICAL_PROOF.md`
- `docs/dle/AUCTION_ENGINE_TECHNICAL_PROOF.md`
- `docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md`

Recommended slice:

- Run one no-code browser audit for hand-entered Rental and Auction. Only fix defects after the
  audit is logged.

### Gap 3: Product Polish Is Not Complete

Status: incomplete.

The engine is functionally rich, but not yet world-class across every visible surface.

Remaining surfaces to product-audit:

- wizard transaction language;
- public page merchandising;
- search cards;
- unit cards;
- lead forms;
- developer dashboard;
- admin review;
- distribution/referral views.

Required:

- transaction-specific copy should feel native for Sale, Rental, and Auction;
- Rental must avoid sale inventory language such as sold/sold-out where leasing language is needed;
- Auction must explain registration, auction timing, legal-pack readiness, and bidder next steps;
- public pages should show backend intelligence, not merely store it.

Primary docs:

- `docs/dle/PRODUCT_VISION.md`
- `docs/dle/TRANSACTION_ENGINE_PRODUCT_EXPERIENCE_AUDIT.md`
- `docs/dle/SALE_JOURNEY_PRODUCT_AUDIT.md`

### Gap 4: Evidence Artifacts Are Not A Full Runtime Reviewer Product

Status: incomplete.

Evidence contracts and access-policy helpers exist, but the runtime reviewer product is not
complete.

Remaining:

- read-only admin metadata endpoint design;
- read-only distribution metadata endpoint design;
- secure download endpoint design;
- malware scanning/quarantine;
- public applicant/bidder upload;
- reviewer UX for accepting/rejecting evidence;
- no automatic lease/bidder/readiness completion from mere prompts or notes.

Primary docs:

- `docs/dle/EVIDENCE_ARTIFACT_CONTRACT.md`
- `docs/dle/EVIDENCE_FILE_UPLOAD_SECURITY_CONTRACT.md`
- `docs/dle/EVIDENCE_ACCESS_AUTHORIZATION_CONTRACT.md`
- `docs/dle/EVIDENCE_LINKAGE_PERSISTENCE_CONTRACT.md`

### Gap 5: Distribution And Reward Semantics Need Careful Runtime Expansion

Status: incomplete.

DLE may create review context, but it must not bypass distribution-owned manager review, document
readiness, milestone checks, rewards, commissions, or payout guardrails.

Remaining:

- runtime endpoint and UI design for distribution evidence review;
- transaction-specific payout/readiness semantics for Rental and Auction;
- explicit tests that Rental/Auction do not inherit hidden sale-only assumptions.

Primary doc:

- `docs/dle/DISTRIBUTION_PROGRAMME_SEMANTICS_CONTRACT.md`

### Gap 6: Final Completion Requires End-To-End Acceptance

Status: incomplete.

Before calling DLE complete, all of these must be true:

- Sale, Rental, and Auction can be created, saved, resumed, edited, published, and publicly
  merchandised without stale transaction leakage.
- Public pages, search cards, unit cards, lead forms, dashboards, admin views, and distribution
  views show transaction-native truth.
- Autosave is truthful and does not overwrite unrelated published fields.
- Operating outcomes preserve auditability and do not falsely move distribution/payout/evidence
  state.
- Focused tests, `pnpm run check`, `git diff --check`, and browser evidence pass on the clean DLE
  worktree.

## Go/No-Go Summary

Current DLE readiness:

- Good enough for continued controlled development.
- Not complete enough for broad autosave rollout.
- Not complete enough to hand to a junior without strict slice instructions.
- Strong enough for a junior to execute well-defined test/proof/product-audit slices while a senior
  reviews every boundary.

## Immediate Next Best Moves

1. Keep DLE work in `/home/edwardspc/Desktop/Dev/listify-developer-listing-engine`.
2. Use `docs/dle/JUNIOR_EXECUTION_PLAYBOOK.md` for junior execution.
3. Start with one of these senior-approved slices:
   - parameterize edit-autosave browser marketing proof for Sale/Rental/Auction;
   - run a no-code full hand-entered Rental/Auction UX audit;
   - design read-only evidence metadata endpoints without implementing downloads.
4. Do not enable edit autosave.
5. Do not merge homepage, navigation, or property listing intelligence work into the DLE lane.
