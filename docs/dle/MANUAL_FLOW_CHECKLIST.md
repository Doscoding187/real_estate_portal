# DLE Manual Flow Checklist

Use this checklist before calling the Development Listing Engine stable.

| Flow | Required Result | Status | Evidence |
|---|---|---|---|
| Create development | Development can be created without data loss | Pass | Browser reached authenticated sale workflow from Project Setup through Review & Publish, including media upload and sale unit-type creation. The resumed draft was then published to development id `4`. Edit-after-publish ownership remains separately pending. Evidence: `docs/dle/evidence/2026-06-02/qa-dle-publish-result-after-date-fix.png`. |
| Manual Save Draft | Draft saves through real backend path | Pass | Browser clicked `Save Draft` on Review & Publish. No API failures captured. Evidence: `docs/dle/evidence/2026-06-02/qa-dle-flow-manual-save-draft.png`. |
| Draft appears in My Drafts | Saved draft is visible | Pass | Draft `DLE QA Sale Flow 1780436367449` appeared in `/developer/drafts`. Evidence: `docs/dle/evidence/2026-06-02/qa-dle-flow-my-drafts-visible.png`. |
| Resume draft | Canonical state restores correctly | Pass | Resume opened `/developer/create-development?draftId=2` and restored the saved development identity. Evidence: `docs/dle/evidence/2026-06-02/qa-dle-flow-draft-resumed.png`. |
| Edit location | Only location fields change | Pending | |
| Edit media | Only media fields change | Pending | |
| Edit governance/finance | Only governance/finance fields change | Pending | |
| Edit sale unit types | Sale inventory/pricing updates safely | Partial | Browser created a sale unit type with pricing/inventory and reached Review. Edit-after-save/publish ownership still pending. Evidence: `docs/dle/evidence/2026-06-02/qa-dle-flow-unit-type-created.png`. |
| Edit rental unit types | Rental inventory/pricing updates safely | Pending | |
| Edit auction unit types | Auction inventory/pricing updates safely | Pending | |
| Publish development | Publish validation passes correctly | Pass | Publish readiness correctly blocked missing highlights, highlights were added, and the sale draft published successfully after the backend date-format fix. Evidence: `docs/dle/evidence/2026-06-02/qa-dle-publish-button-disabled.png` and `docs/dle/evidence/2026-06-02/qa-dle-publish-result-after-date-fix.png`. |
| Public page | Correct sale/rent/auction display | Partial | Public sale page now renders with development name, sale pricing, unit type, and CTA after the amenity helper render-order fix. Required highlights were not confirmed in public page text checks, so buyer-facing packaging is still incomplete. Evidence: `docs/dle/evidence/2026-06-02/qa-dle-public-page-sale-rendered.png`. |
| Search cards | Correct sale/rent/auction pricing and ordering | Pending | |
| Lead capture | Lead context matches transaction type and unit interest | Pending | |
| Edit published development | No unrelated field wipes | Pending | |

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
- Public detail must visibly reflect publish-critical highlights, or the backend readiness intelligence is not fully visible in the showroom.
- The header still needs a truth-in-UX fix before autosave: do not claim `Saved` unless a real save path has succeeded.
- Manual `Save Draft` remains review-only in the browser-proven journey.

Before autosave:

- Fix truthful save-state messaging.
- Decide whether every step gets a manual save affordance or clearer unsaved/local-progress copy.
- Prove resumed drafts restore media, documents, highlights, unit types, and readiness state.
- Prove edit-after-resume and edit-after-publish do not wipe unrelated fields.

Before UI/product upgrade:

- Make highlights and sale inventory more visible in the public page.
- Add sale journey previews in the wizard so developers can see the buyer-facing package taking shape.
- Verify search-card and lead-form transaction context.
