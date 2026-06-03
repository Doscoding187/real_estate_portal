# DLE Sale Journey Product Audit

Date: 2026-06-02

This audit records the sale-development journey after the manual save/resume proof and the publish/public-page proof.

The standard is the DLE source of truth: a guided commercial packaging engine, not normal listing CRUD. Backend correctness is the foundation; product joy, commercial clarity, and buyer-facing trust are the standard.

## Current Browser-Proven Sale Journey

Environment:

- Frontend: `http://localhost:3009`
- Backend: `http://localhost:5000`
- Database: `listify_local`
- Account: `developer@listify.local`
- Draft resumed: `/developer/create-development?draftId=2`
- Published development id: `4`
- Published slug: `dle-qa-sale-flow-1780436367449-2vp50t`

Browser-proven steps:

| Step | What is collected | Why it matters | Current product read |
|---|---|---|---|
| Project Setup | Development category, transaction goal, structural type | Establishes whether the package is sale, rent, or auction and chooses the right workflow | Guided and commercially clear. This is one of the strongest parts of the current journey. |
| Identity & Market | Name, tagline, status, ownership type | Creates the market-facing identity and basic buyer confidence | Useful, but still feels field-led. It could preview how the public hero/search card will read. |
| Location | Address, suburb, city, province, postal code | Drives buyer context, search relevance, and public trust | Functional. Needs stronger buyer-facing context and map proof in future QA. |
| Governance & Finances | Governance and finance fields | Explains ownership, buyer costs, and operating context | Commercially important, but still reads like admin data entry. |
| Amenities & Features | Common amenities and selected features | Adds lifestyle, convenience, and trust signals | Guided through quick-start, which is good. Public-page surfacing must stay aligned. |
| Marketing Summary | Description, selling points, highlights | Turns raw data into sales language and publish readiness | Required highlights were easy to miss until Review blocked publish. |
| Media & Documents | Hero image, gallery, brochure | Proves the development visually and gives buyers downloadable context | Strong packaging intent. Needs buyer-facing output proof for all media/document buckets. |
| Unit Types | Sale unit type, inventory, price | Commercial inventory core of the DLE | Correctly central. This should feel like configuring product inventory, not only adding a form row. |
| Review & Publish | Readiness checks, final confirmation | Protects publish quality and data integrity | Effective guardrail, but several requirements surface late. |
| Public Detail Page | Buyer-facing listing page | Proves whether the engine creates a market-ready product | Now renders, but does not yet fully prove the packaging quality. |

## Functional Result

Pass:

- Resumed the saved sale draft.
- Publish readiness correctly blocked the development until required highlights were added.
- Added three highlights and returned to Review.
- Published the development successfully after fixing date persistence.
- Verified the published row in the database with `isPublished = 1`, transaction type `for_sale`, and sale price range.
- Verified persisted sale unit inventory.
- Loaded the public development page after fixing the public detail render-order bug.
- Public page showed development name, sale pricing, unit type, and enquiry CTA.

Partial:

- Public page did not surface the newly added highlights in the initial 2026-06-02 browser text checks. This was fixed on 2026-06-03 by selecting/normalizing public detail highlights and rendering a Market Highlights section.
- Search-card output, lead capture, and edit-published field ownership were later verified for the sale flow on 2026-06-03. Rent/auction output and edit-published ownership remain pending.

## Bugs Fixed During Proof

### Publish Date Persistence

Problem:

- Publishing failed with a backend 500 because MySQL received an ISO datetime like `2026-08-01T00:00:00.000Z` for `launch_date`.

Fix:

- `server/services/developmentService.ts` now normalizes development dates through `sanitizeDevelopmentDate`.
- ISO date strings are converted to MySQL-compatible `YYYY-MM-DD HH:mm:ss`.
- Date-only and existing MySQL datetime strings are preserved.

Regression test:

- `server/services/__tests__/developmentService.date.test.ts`

### Public Detail Render Order

Problem:

- Public detail failed with `ReferenceError: Cannot access 'formatLabel' before initialization`.
- Amenity groups were built before component-scoped helper functions had initialized.

Fix:

- Amenity label/group helpers moved to module scope in `client/src/pages/DevelopmentDetail.tsx`.
- The helpers are exported for regression coverage.

Regression test:

- `client/src/pages/DevelopmentDetail.test.ts`

## Repetition And Gap List

- Readiness requires highlights, but the need becomes most obvious at Review. This creates avoidable late-stage friction.
- The wizard header can show `Saved` before a real manual save has succeeded. That remains a truth-in-UX issue and must be fixed before autosave.
- Manual `Save Draft` is only obvious on Review & Publish. Earlier steps need either a real save affordance or clearer unsaved/local-progress language.
- Marketing Summary and Review are connected by validation, but the UI does not yet make the buyer-facing output visible enough while the user is writing.
- Unit Types are technically the commercial core, but the UI can make the sale inventory/package meaning stronger through summary previews and buyer-language examples.
- Public detail now renders and shows required highlights after the 2026-06-03 public highlight surfacing fix.
- Sale public list output now includes transaction type, public highlights, and sale unit configuration.
- Sale lead capture now preserves selected unit and normalized transaction context for downstream routing/reporting readiness.

## Recommended Improved Sale Journey

The sale journey should feel like packaging a market-ready development:

1. Project Setup
   - Keep transaction goal selection prominent.
   - Tell the user they are building a sale inventory package.

2. Identity & Market
   - Show a small live preview of the public hero/search-card language.
   - Rename fields around the market outcome where appropriate, for example "Buyer-facing tagline".

3. Location
   - Explain that this powers search, map confidence, and public area context.
   - Keep address entry functional, but add clearer verification feedback.

4. Governance & Finances
   - Group fields by buyer meaning: ownership, monthly costs, once-off costs, completion timing.
   - Hide advanced finance fields behind progressive disclosure when not needed.

5. Amenities & Features
   - Keep quick-start.
   - Add a preview of the trust/lifestyle chips that will appear publicly.

6. Marketing Summary
   - Surface highlight requirements before Review.
   - Show examples like "No transfer duty", "Limited launch pricing", or "Investor-ready units" without locking the user into generic copy.

7. Media & Documents
   - Keep local upload fallback for QA.
   - Show which assets will feed hero, gallery, brochure, and public document sections.

8. Unit Types
   - Treat each unit type as a product SKU: price, inventory, size, bedrooms, buyer costs, and availability.
   - Show a sale-specific buyer card preview for each unit type.

9. Review & Publish
   - Keep readiness guardrails.
   - Make failed readiness items deep-link back to the exact step and field.

10. Public Detail
   - Confirm every publish-critical field appears in buyer-facing form: highlights, sale inventory, pricing, media, trust signals, brochure, and CTA.

## Source-Of-Truth Data And Output Targets

| Data area | Source of truth | Should appear later in |
|---|---|---|
| Workflow state | `workflowId`, `currentStepId`, `completedSteps`, `stepData` | Wizard resume, dashboard, audit logs |
| Sale inventory | `stepData.unit_types.unitTypes` and canonical development payload | Unit cards, public detail, search cards, lead forms, distribution views |
| Pricing | Transaction-aware derived helpers | Search cards, public pricing, enquiry context, dashboards |
| Highlights | Marketing summary/canonical payload | Review readiness, public hero/highlight section, search cards |
| Media/documents | Media step/canonical payload | Public hero, gallery, brochure download, admin review |
| Governance/finance | Governance step/canonical payload | Buyer cost sections, due diligence, developer dashboards |
| Lead context | Public page unit/transaction context | Lead routing, referral/distribution views, CRM handoff |

## Before Autosave

- Keep the fixed header save state covered so it never claims `Saved` unless a real save succeeded.
- Decide whether manual `Save Draft` belongs on every step or whether earlier steps need explicit local/unsaved language.
- Prove resumed drafts restore media, documents, unit types, highlights, and readiness state.
- Confirm save/resume data uses canonical `stepData.unit_types.unitTypes`.
- Sale edit-published ownership has browser/API/DB proof for location, media, marketing highlights, governance/finance, and unit types.
- Add rent and auction edit-published ownership proof before enabling autosave for every transaction mode.

## Before Calling Sale World-Class

- Required highlights are now visible on the public page in a Market Highlights section.
- Public page should show sale inventory as product cards, not generic property rows.
- Search cards now carry sale transaction and inventory data in public list output; the visual card treatment still needs a product-quality audit, and rent/auction proof remains pending.
- Lead forms now preserve development id, transaction type, selected unit type context, price label, and price for the sale path; rent/auction proof remains pending.
- Sale edit-published development ownership is proven without unrelated field wipes; rent/auction edit-published proof remains pending.
- The wizard should expose more live previews so the developer sees the market-ready package forming as they work.

## Evidence

- Readiness blocker: `docs/dle/evidence/2026-06-02/qa-dle-publish-button-disabled.png`
- Blocked Review state: `docs/dle/evidence/2026-06-02/qa-dle-publish-review-blocked-before-fix.png`
- Marketing before highlights: `docs/dle/evidence/2026-06-02/qa-dle-publish-marketing-before-highlights-fixed.png`
- Marketing after highlights: `docs/dle/evidence/2026-06-02/qa-dle-publish-marketing-highlights-added-fixed.png`
- Review ready after date fix: `docs/dle/evidence/2026-06-02/qa-dle-publish-review-ready-after-date-fix.png`
- Publish confirmation: `docs/dle/evidence/2026-06-02/qa-dle-publish-confirm-dialog-after-date-fix.png`
- Publish success: `docs/dle/evidence/2026-06-02/qa-dle-publish-result-after-date-fix.png`
- Public page pre-fix error: `docs/dle/evidence/2026-06-02/qa-dle-public-page-sale-published.png`
- Public page rendered: `docs/dle/evidence/2026-06-02/qa-dle-public-page-sale-rendered.png`
- Public page highlights visible: `docs/dle/evidence/2026-06-03/qa-dle-public-highlights-visible.png`
- Sale lead context submitted: `docs/dle/evidence/2026-06-03/qa-dle-lead-context-submitted.png`
- Sale edit-published ownership summary: `docs/dle/evidence/2026-06-03/qa-dle-edit-published-field-ownership-summary.md`
- Sale edit-published final public page: `docs/dle/evidence/2026-06-03/qa-dle-edit-published-public-page-final.png`
- Sale edit-published lead submitted: `docs/dle/evidence/2026-06-03/qa-dle-edit-published-lead-submitted.png`
