# DLE Manual Flow Checklist

Use this checklist before calling the Development Listing Engine stable.

| Flow | Required Result | Status | Evidence |
|---|---|---|---|
| Create development | Development can be created without data loss | Pass | Browser reached authenticated sale workflow from Project Setup through Review & Publish, including media upload and sale unit-type creation. The resumed draft was then published to development id `4`. Edit-after-publish ownership remains separately pending. Evidence: `docs/dle/evidence/2026-06-02/qa-dle-publish-result-after-date-fix.png`. |
| Manual Save Draft | Draft saves through real backend path | Pass | Browser clicked `Save Draft` on Review & Publish. No API failures captured. Evidence: `docs/dle/evidence/2026-06-02/qa-dle-flow-manual-save-draft.png`. |
| Draft appears in My Drafts | Saved draft is visible | Pass | Draft `DLE QA Sale Flow 1780436367449` appeared in `/developer/drafts`. Evidence: `docs/dle/evidence/2026-06-02/qa-dle-flow-my-drafts-visible.png`. |
| Resume draft | Canonical state restores correctly | Pass | Resume opened `/developer/create-development?draftId=2` and restored the saved development identity. Evidence: `docs/dle/evidence/2026-06-02/qa-dle-flow-draft-resumed.png`. |
| Edit location | Only location fields change | Pass | Published sale development id `4` location edit preserved media, highlights, governance, unit types, pricing, approval, and public visibility. Evidence: `docs/dle/evidence/2026-06-03/qa-dle-edit-published-field-ownership-summary.md`. |
| Edit media | Only media fields change | Pass | Published sale development id `4` media edit preserved location, highlights, governance, unit types, pricing, approval, and public visibility. Evidence: `docs/dle/evidence/2026-06-03/qa-dle-edit-published-public-page-final.png`. |
| Edit governance/finance | Only governance/finance fields change | Pass | Published sale development id `4` governance edit preserved location, media, highlights, unit types, pricing, approval, and public visibility. Evidence: `docs/dle/evidence/2026-06-03/qa-dle-edit-published-field-ownership-summary.md`. |
| Edit sale unit types | Sale inventory/pricing updates safely | Pass | Published sale development id `4` unit edit preserved location, media, highlights, governance, approval, public list visibility, and lead context. Backend now derives development inventory totals from partial unit-type edits. Evidence: `docs/dle/evidence/2026-06-03/qa-dle-edit-published-lead-submitted.png`. |
| Edit rental unit types | Rental inventory/pricing updates safely | Pass | Focused API/DB guardrails and browser public-output proof now show published rental unit edits preserve location, media, highlights, governance, approval, search/detail output, lead context, and monthly-rent aggregates. Evidence: `docs/dle/RENTAL_ENGINE_TECHNICAL_PROOF.md`, `docs/dle/evidence/2026-06-03/qa-dle-rental-edit-published-public-page.png`, `docs/dle/evidence/2026-06-03/qa-dle-rental-edit-published-search-card.png`, and `docs/dle/evidence/2026-06-03/qa-dle-rental-edit-published-lead-context.png`. |
| Edit auction unit types | Auction inventory/pricing updates safely | Pass | Focused API/DB guardrails and browser public-output proof now show published auction unit edits preserve location, media, highlights, governance, approval, search/detail output, lead context, bid/reserve aggregates, auction dates, and inventory totals. Evidence: `docs/dle/AUCTION_ENGINE_TECHNICAL_PROOF.md`, `docs/dle/evidence/2026-06-03/qa-dle-auction-edit-published-public-page.png`, `docs/dle/evidence/2026-06-03/qa-dle-auction-edit-published-search-card.png`, and `docs/dle/evidence/2026-06-03/qa-dle-auction-edit-published-lead-context.png`. |
| Publish development | Publish validation passes correctly | Pass | Publish readiness correctly blocked missing highlights, highlights were added, and the sale draft published successfully after the backend date-format fix. Evidence: `docs/dle/evidence/2026-06-02/qa-dle-publish-button-disabled.png` and `docs/dle/evidence/2026-06-02/qa-dle-publish-result-after-date-fix.png`. |
| Public page | Correct sale/rent/auction display | Pass | Sale public page renders with development name, sale pricing, unit type, CTA, and publish-critical highlights. Rental and auction browser proof now verifies transaction-native public detail output: `Rent From`, `Monthly Rent`, rental unit pricing, `Starting Bid`, and auction bid/reserve range. Evidence: `docs/dle/evidence/2026-06-03/qa-dle-public-highlights-visible.png`, `docs/dle/evidence/2026-06-03/qa-dle-rental-browser-public-page.png`, and `docs/dle/evidence/2026-06-03/qa-dle-auction-browser-public-page.png`. |
| Search cards | Correct sale/rent/auction pricing and ordering | Pass | Sale public list output includes published development `4`, `for_sale`, public highlights, and sale unit configuration with `priceFrom: 1750000`. Rental and auction browser proof now verifies transaction-aware search card language: `Rent from R 12,500` and `Bid from R 850,000`. Evidence: `docs/dle/evidence/2026-06-03/qa-dle-rental-browser-search-card.png`, `docs/dle/evidence/2026-06-03/qa-dle-auction-browser-search-card.png`, `docs/dle/RENTAL_ENGINE_TECHNICAL_PROOF.md`, and `docs/dle/AUCTION_ENGINE_TECHNICAL_PROOF.md`. |
| Lead capture | Lead context matches transaction type and unit interest | Pass | Browser submitted sale, rental, and auction unit leads and DB verification covered development id, selected unit id/name, transaction type, price label, lead source, and `funnel_stage: interest`. Evidence: `docs/dle/evidence/2026-06-03/qa-dle-lead-context-submitted.png`, `docs/dle/evidence/2026-06-03/qa-dle-rental-browser-lead-context.png`, and `docs/dle/evidence/2026-06-03/qa-dle-auction-browser-lead-context.png`. |
| Edit published development | No unrelated field wipes | Pass | Sale edit-published ownership is browser/API/DB-proven for location, media, governance, marketing highlights, and unit types. Rental and auction edit-published ownership are API/DB-proven across the same ownership boundaries, with browser proof that public pages, search cards, and lead context remain transaction-native after edit sequences. Evidence: `docs/dle/evidence/2026-06-03/qa-dle-edit-published-field-ownership-summary.md`, `docs/dle/RENTAL_ENGINE_TECHNICAL_PROOF.md`, `docs/dle/AUCTION_ENGINE_TECHNICAL_PROOF.md`, `docs/dle/evidence/2026-06-03/qa-dle-rental-edit-published-public-page.png`, and `docs/dle/evidence/2026-06-03/qa-dle-auction-edit-published-public-page.png`. |

## Evidence Standard

Each completed row should include one of:

- Browser/manual evidence with route and timestamp.
- Focused automated test name.
- Screenshot path.
- API/database verification output.

Tests are useful, but the final stability call needs browser-level proof for create, save draft, resume, publish, and public display.

## 2026-06-02 Browser Preflight Evidence

Environment:

- Frontend: `http://localhost:3009`
- Backend: `http://localhost:5000`
- Backend health: DB/cache OK, S3 false with local upload fallback expected.
- Account: `developer@listify.local`
- Runtime note: source `~/.nvm/nvm.sh` before Node/pnpm commands.

Verified through browser:

- Login sign-in form renders and accepts the developer route return path.
- Authenticated developer can reach `/developer/create-development`.
- Project Setup shows development-type selection and transaction goal choices: For Sale, To Let / Rent, Auction.
- Sale workflow starts as `residential_sale`.
- Configuration step advances after selecting Apartment Complex.
- Identity & Market accepts development name, tagline, nature, status, and ownership type.
- Location accepts address, city, suburb, province, and postal code, then advances to Governance & Finances.
- Governance advances to Amenities.
- Amenities quick-start applies common amenities and advances to Marketing Summary.

Evidence screenshots:

- `docs/dle/evidence/2026-06-02/qa-login-signin-form-dle.png`
- `docs/dle/evidence/2026-06-02/qa-dle-wizard-start.png`
- `docs/dle/evidence/2026-06-02/qa-dle-wizard-step-after-start.png`
- `docs/dle/evidence/2026-06-02/qa-dle-wizard-identity.png`
- `docs/dle/evidence/2026-06-02/qa-dle-location-ready.png`
- `docs/dle/evidence/2026-06-02/qa-dle-after-location-next.png`
- `docs/dle/evidence/2026-06-02/qa-dle-marketing-summary.png`

Not yet verified:

- Search-card output.

## 2026-06-02 Browser Manual Save/Resume Proof

Environment:

- Frontend: `http://localhost:3009`
- Backend: `http://localhost:5000`
- Database: `listify_local`
- Account: `developer@listify.local`
- Development name used: `DLE QA Sale Flow 1780436367449`
- Browser automation result: pass through manual save/resume; no API failures captured.

Functional pass/fail:

- Pass: developer login.
- Pass: sale development workflow start.
- Pass: residential configuration.
- Pass: identity and market entry.
- Pass: location entry.
- Pass: governance/finance step advance.
- Pass: amenities quick-start.
- Pass: marketing summary step advance.
- Pass: local media upload for hero/gallery image and brochure.
- Pass: sale unit type creation with pricing/inventory.
- Pass: Review & Publish reached.
- Pass: manual Save Draft from Review.
- Pass: draft visible in My Drafts.
- Pass: draft resume restored saved identity.
- Pending: publish/submit-for-review.
- Pending: public development detail page, search cards, lead capture, and edit-published ownership proof.

Evidence screenshots:

- `docs/dle/evidence/2026-06-02/qa-dle-flow-login-to-create.png`
- `docs/dle/evidence/2026-06-02/qa-dle-flow-identity-filled.png`
- `docs/dle/evidence/2026-06-02/qa-dle-flow-location-filled.png`
- `docs/dle/evidence/2026-06-02/qa-dle-flow-amenities-filled.png`
- `docs/dle/evidence/2026-06-02/qa-dle-flow-marketing-filled.png`
- `docs/dle/evidence/2026-06-02/qa-dle-flow-media-uploaded.png`
- `docs/dle/evidence/2026-06-02/qa-dle-flow-unit-types-start.png`
- `docs/dle/evidence/2026-06-02/qa-dle-flow-unit-type-created.png`
- `docs/dle/evidence/2026-06-02/qa-dle-flow-review-ready.png`
- `docs/dle/evidence/2026-06-02/qa-dle-flow-manual-save-draft.png`
- `docs/dle/evidence/2026-06-02/qa-dle-flow-my-drafts-visible.png`
- `docs/dle/evidence/2026-06-02/qa-dle-flow-draft-resumed.png`

Product experience gaps:

- The wizard does feel guided in setup, amenities, media quality, and unit inventory, but still leans form-heavy in deeper data entry.
- The global header still shows `Saved` before a backend-backed manual save has happened. This conflicts with the autosave truth principle.
- Manual `Save Draft` is only available on Review & Publish. Earlier steps have no obvious trusted save fallback even though the header implies safety.
- The Quick Action menu can visually compete with wizard actions during QA; this is not a blocker, but it makes the workflow feel less focused.
- Public-page proof remains missing, so the buyer-facing showroom has not yet proven the backend engine.

Data-loss and field-ownership risks:

- No data wipe was observed in this manual save/resume proof.
- This run did not prove edit-after-save field ownership for location, media, governance, or unit types.
- Edit published development remains unverified and is still the highest-risk field-ownership browser flow.

Before autosave:

- Make the header save state truthful. Do not show `Saved` unless a real save path has succeeded.
- Decide whether `Save Draft` should be visible before Review & Publish, or clearly label earlier progress as local/unsaved.
- Prove resume restores media, documents, unit types, and review readiness, not only identity.
- Add a browser/API assertion that the saved draft contains canonical `stepData.unit_types.unitTypes`.

Before UI/product upgrade:

- Finish publish/public-page proof so the showroom can be audited against the commercial engine vision.
- Prove rental and auction unit-type paths through the browser.
- Surface sale/rent/auction intelligence more visibly in wizard previews, public unit cards, search cards, and lead forms.

## 2026-06-02 Browser Publish/Public Page Proof

Environment:

- Frontend: `http://localhost:3009`
- Backend: `http://localhost:5000`
- Database: `listify_local`
- Account: `developer@listify.local`
- Draft resumed: `/developer/create-development?draftId=2`
- Published development id: `4`
- Published slug: `dle-qa-sale-flow-1780436367449-2vp50t`

Functional pass/fail:

- Pass: resumed sale draft `DLE QA Sale Flow 1780436367449`.
- Pass: Review readiness blocked publishing while three required highlights were missing.
- Pass: added highlights in Marketing Summary and returned to Review.
- Pass: backend date-format bug was fixed, then publish succeeded.
- Pass: database row was verified with `isPublished = 1`, transaction type `for_sale`, and price range `1750000`.
- Pass: sale unit type persisted for published development id `4`.
- Pass: public detail render-order bug was fixed, then the public page rendered.
- Partial: public page showed name, sale pricing, unit type, and CTA, but required highlights were not confirmed in browser text checks.
- Pending: search cards, lead capture, edit-published ownership, rental flow, and auction flow.

Evidence screenshots:

- `docs/dle/evidence/2026-06-02/qa-dle-publish-resumed-draft.png`
- `docs/dle/evidence/2026-06-02/qa-dle-publish-button-disabled.png`
- `docs/dle/evidence/2026-06-02/qa-dle-publish-review-blocked-before-fix.png`
- `docs/dle/evidence/2026-06-02/qa-dle-publish-marketing-before-highlights-fixed.png`
- `docs/dle/evidence/2026-06-02/qa-dle-publish-marketing-highlights-added-fixed.png`
- `docs/dle/evidence/2026-06-02/qa-dle-publish-review-ready-after-date-fix.png`
- `docs/dle/evidence/2026-06-02/qa-dle-publish-confirm-dialog-after-date-fix.png`
- `docs/dle/evidence/2026-06-02/qa-dle-publish-result-after-date-fix.png`
- `docs/dle/evidence/2026-06-02/qa-dle-public-page-sale-published.png`
- `docs/dle/evidence/2026-06-02/qa-dle-public-page-sale-rendered.png`

Product experience gaps:

- Required highlights are a correct readiness rule, but the wizard surfaces the missing requirement too late.
- Public detail now visibly reflects publish-critical highlights after the 2026-06-03 public highlight surfacing fix.
- The header save-state truth issue was fixed in focused component coverage: it starts as manual-save-ready/unsaved and only shows saved after a real manual save succeeds.
- Manual `Save Draft` remains review-only in the browser-proven journey.

Before autosave:

- Keep truthful save-state messaging covered as autosave work starts.
- Decide whether every step gets a manual save affordance or clearer unsaved/local-progress copy.
- Prove resumed drafts restore media, documents, highlights, unit types, and readiness state.
- Prove edit-after-resume and edit-after-publish do not wipe unrelated fields.

Before UI/product upgrade:

- Make highlights and sale inventory more visible in the public page.
- Add sale journey previews in the wizard so developers can see the buyer-facing package taking shape.
- Verify search-card and lead-form transaction context.

## 2026-06-03 Public Highlights And Save-State Truth Proof

Environment:

- Frontend: `http://localhost:3009`
- Backend: `http://localhost:5000`
- Database: `listify_local`
- Published development id: `4`
- Published slug: `dle-qa-sale-flow-1780436367449-2vp50t`

Functional pass/fail:

- Pass: public detail API now selects and normalizes `highlights`.
- Pass: double-encoded JSON arrays from the `highlights` column normalize to a clean array.
- Pass: public sale page shows `Market Highlights`.
- Pass: public sale page shows `No transfer duty`, `Prime Sandton address`, and `Launch-ready investor units`.
- Pass: public sale page still shows sale pricing and the sale unit type.
- Pass: wizard header no longer defaults to `Saved`; focused component coverage proves it starts unsaved/manual-save-ready and flips to saved only after manual save succeeds.
- Pending: rent/auction public detail proof, search-card browser proof, lead-form submission proof, and edit-published ownership proof.

Evidence:

- `docs/dle/evidence/2026-06-03/qa-dle-public-highlights-visible.png`

Focused tests:

- `server/services/__tests__/developmentService.date.test.ts`
- `client/src/pages/DevelopmentDetail.test.ts`
- `client/src/components/development-wizard/DevelopmentWizard.test.tsx`
- `client/src/components/property-results/__tests__/DevelopmentResultCard.test.tsx`

## 2026-06-03 Search Card And Lead Context Proof

Environment:

- Frontend: `http://localhost:3009`
- Backend: `http://localhost:5000`
- Database: `listify_local`
- Published development id: `4`
- Published slug: `dle-qa-sale-flow-1780436367449-2vp50t`

Functional pass/fail:

- Pass: republished local QA development through `developmentService.publishDevelopment(4, 2)`.
- Pass: publish now sets `approvalStatus = approved` with `isPublished = 1`, making the development eligible for public list/search output.
- Pass: `listPublicDevelopments({ limit: 50 })` returned the QA sale development.
- Pass: public list output included `transactionType: for_sale`.
- Pass: public list output included the three public highlights.
- Pass: public list output included sale unit configuration with `listingType: sale` and `priceFrom: 1750000`.
- Pass: browser submitted a public sale unit lead through the public development page.
- Pass: `developer.createLead` returned HTTP `200`.
- Pass: persisted lead kept development id `4`, unit id `unit-1780436383320-xxsr1lrnn`, unit name `2 Bedroom Garden Apartment`, unit price `1750000.00`, and `lead_source: development_detail_contact`.
- Pass: persisted lead stored `affordability_data.leadContext.transactionType = sale` and `unitPriceLabel = Price from`.
- Pass: persisted lead stayed in `funnel_stage: interest`; lead context alone did not incorrectly promote it to affordability.
- Pending: rent and auction search-card/lead-context browser proof.
- Pending: edit-published field ownership proof.

Evidence:

- `docs/dle/evidence/2026-06-03/qa-dle-lead-context-submitted.png`

Product/data notes:

- The sale public card data is now more than a generic listing: it carries transaction type, highlights, and sale unit inventory into public list output.
- The lead dialog now passes commercial context to the backend instead of only contact details.
- Local QA data has a mismatch worth cleaning later: unit name says `2 Bedroom Garden Apartment`, while the persisted bedroom count on the captured lead is `1`.

Before autosave:

- Prove edit-published location, media, governance/finance, and unit-type changes do not wipe unrelated fields.
- Prove resumed drafts restore media, documents, highlights, unit types, and readiness state.
- Keep rent and auction proof separate from sale proof so transaction-specific behavior does not regress quietly.

## 2026-06-03 Edit-Published Field Ownership Proof

Environment:

- Frontend: `http://localhost:3009`
- Backend: `http://localhost:5000`
- Database: `listify_local`
- Published development id: `4`
- Published slug: `dle-qa-sale-flow-1780436367449-2vp50t`

Functional pass/fail:

- Pass: location partial edit changed address/suburb/city/province/postal code and preserved media, highlights, governance, unit types, pricing, approval, and public visibility.
- Pass: media partial edit changed hero/gallery/brochure assets and preserved location, highlights, governance, unit types, pricing, approval, and public visibility.
- Pass: marketing partial edit changed public `Market Highlights`, tagline, and description and preserved location, media, governance, unit types, pricing, approval, and public visibility.
- Pass: governance/finance partial edit changed levy/rates/transfer-cost fields and preserved location, media, highlights, unit types, pricing, approval, and public visibility.
- Pass: unit-types partial edit changed unit name, bedrooms, bathrooms, price range, and inventory while preserving location, media, highlights, governance, approval, and public visibility.
- Pass: backend inventory aggregate bug was fixed; development-level `totalUnits` and `availableUnits` now derive from the effective unit set during unit-type edits.
- Pass: edited public sale page rendered updated highlights, updated unit name, and updated sale pricing.
- Pass: post-edit public list/search output remained visible with `transactionType: for_sale`, updated highlights, and sale unit configuration `priceFrom: 1800000`, `priceTo: 1850000`.
- Pass: post-edit browser lead submission returned HTTP `200`.
- Pass: persisted post-edit lead included development id `4`, selected unit id/name, `unit_price_from: 1800000.00`, `unit_bedrooms: 2`, `unit_bathrooms: 1.5`, `transactionType: sale`, `unitPriceLabel: Price from`, and `funnel_stage: interest`.
- Pending: rent and auction edit-published ownership proof.

Evidence:

- `docs/dle/evidence/2026-06-03/qa-dle-edit-published-field-ownership-summary.md`
- `docs/dle/evidence/2026-06-03/qa-dle-edit-published-public-page-final.png`
- `docs/dle/evidence/2026-06-03/qa-dle-edit-published-lead-submitted.png`

Before autosave:

- Sale edit-published ownership no longer blocks autosave by itself.
- Still prove rent and auction edit-published ownership, plus deeper resumed-draft restoration for media, documents, highlights, unit types, and readiness.
