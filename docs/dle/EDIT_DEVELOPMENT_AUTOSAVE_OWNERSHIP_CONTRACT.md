# DLE Edit-Development Autosave Ownership Contract

Date: 2026-06-18
Status: Contract active. Edit-development autosave remains disabled.

## Purpose

Edit-development autosave is riskier than create/draft autosave because published developments
already have public media, location, governance, pricing, unit inventory, lead context, and
distribution context.

Create/draft autosave may persist a full canonical draft snapshot. Edit-development autosave must
not use that path. It must preserve published-development field ownership by saving only the active
step's owned payload fields against a persisted canonical baseline.

## Hard Rules

Edit-development autosave must:

- require a persisted canonical baseline snapshot;
- use `buildDevelopmentEditAutosavePayload`;
- emit `canonicalUpdateMode = partial_step`;
- include canonical workflow mirrors only as context;
- include only fields owned by the active wizard step;
- include only that active step's `stepData` slice;
- preserve unrelated media, location, governance, finance, unit inventory, pricing, public listing,
  lead, distribution, evidence, and operating state.

Edit-development autosave must not:

- call the create/draft `saveDraft` path;
- send a full development overwrite payload;
- reuse create/draft autosave full-snapshot persistence;
- publish, unpublish, approve, reject, or submit for review;
- mutate inventory outcomes, lead stages, evidence status, distribution stages, payout, reward, or
  commission state;
- claim `saved` unless the backend confirms the exact current partial payload signature.

## Current Runtime State

Implemented in this slice:

- `buildDevelopmentEditAutosavePayload` exists as the named edit-autosave payload boundary.
- The function delegates to the existing baseline-aware edit progress path.
- Focused tests prove:
  - a persisted baseline is required through the shared edit progress contract;
  - location edit-autosave payloads exclude media, governance, and unit ownership;
  - media edit-autosave payloads exclude location, governance, and unit ownership;
  - unit edit-autosave payloads own the transaction-native inventory fields without owning
    location, marketing, media, or governance.
- Component tests prove:
  - edit autosave remains disabled by default even when an edit baseline exists;
  - `VITE_DLE_EDIT_AUTOSAVE_ENABLED=true` is required before edit autosave can become eligible;
  - explicitly enabled edit autosave routes through baseline-aware partial updates and does not call
    the create/draft `saveDraft` path;
  - a backend `success: false` edit-autosave response rejects and does not advance the persisted
    edit baseline;
  - a later retry uses the latest canonical partial payload and then advances the persisted edit
    baseline.

Not implemented in this slice:

- production rollout enablement;
- edit autosave UI status changes;
- edit autosave backend endpoint changes;

## Browser Proof Progress

2026-06-20 Sale, Rental, and Auction marketing-summary proof implementation:

- `e2e/dle/edit-autosave-browser.spec.ts` now covers Sale, Rental, and Auction marketing-summary
  failure/retry behavior through the explicitly enabled edit-autosave switch. Focused Playwright
  runtime proof passed after the senior cleanup.
- For each transaction lane:
  - Seeds a published, approved development with stable location, media, highlights,
    governance/finance, and one unit type.
  - Navigates to the edit wizard marketing-summary step.
  - Intercepts the first `developer.updateDevelopment` request and returns `{ success: false }`.
  - Asserts the UI shows visible `Save Failed`.
  - Asserts the failed attempt does not change persisted DB description.
  - Asserts unrelated fields (city, suburb, media, unit inventory) remain preserved after failure.
  - Changes the description again and asserts the retry succeeds.
  - Asserts the retry payload has `canonicalUpdateMode: partial_step`.
  - Asserts the retry payload owns marketing fields only (no `unitTypes`, `city`, `images`,
    `address`, `suburb`, or transaction-specific pricing fields).
  - Asserts the public development page still renders transaction-native output after retry.
- Sale: sale unit name, sale price (Johannesburg/Sandton, full-title, `for_sale`).
- Rental: `Rent From R 18 500 - R 21 000`, `R 18 500 / month`, rental unit name.
- Auction: `Starting Bid`, auction unit name (Durban/Umhlanga, full-title, `auction`).

This proof implementation does not enable edit autosave and does not satisfy the location, media,
or unit edit-autosave browser proof gates.

2026-06-22 Sale, Rental, and Auction location proof implementation:

- `e2e/dle/edit-autosave-browser.spec.ts` now also covers address-level Location step
  failure/retry behavior for Sale, Rental, and Auction through the explicitly enabled
  edit-autosave switch.
- For each transaction lane:
  - Navigates to the edit wizard Location step.
  - Intercepts the first `developer.updateDevelopment` request and returns `{ success: false }`.
  - Asserts the UI shows visible `Save Failed`.
  - Asserts the failed location attempt does not change the persisted address.
  - Asserts unrelated fields (description, city, province, suburb, postal code, media,
    governance/finance, approval status, and unit inventory) remain preserved after failure.
  - Changes the address again and asserts the retry succeeds.
  - Asserts the retry payload has `canonicalUpdateMode: partial_step`.
  - Asserts the retry payload owns location fields only (no marketing, media, governance,
    unit inventory, or transaction-specific pricing fields).
  - Asserts the public development page still renders transaction-native output after retry.

This proof implementation does not enable edit autosave and does not satisfy the media or unit
edit-autosave browser proof gates.

2026-06-22 Sale, Rental, and Auction media proof implementation:

- `e2e/dle/edit-autosave-browser.spec.ts` now also covers Media step upload
  failure/retry behavior for Sale, Rental, and Auction through the explicitly enabled
  edit-autosave switch.
- For each transaction lane:
  - Seeds media in the canonical `development_media.photos` slice so the Media UI starts from the
    same public media baseline stored on the development.
  - Navigates to the edit wizard Development Media step.
  - Uploads a real tiny PNG through the local upload fallback.
  - Intercepts the first `developer.updateDevelopment` request and returns `{ success: false }`.
  - Asserts the UI shows visible `Save Failed`.
  - Asserts the failed media attempt does not add the new local-upload URL to persisted DB media.
  - Uploads a second image and asserts the retry succeeds with the latest media payload.
  - Asserts the retry payload has `canonicalUpdateMode: partial_step`.
  - Asserts the retry payload owns media fields only (no location, marketing, governance,
    unit inventory, or transaction-specific pricing fields).
  - Asserts the public development page still renders transaction-native output after retry.

This proof implementation does not enable edit autosave and does not satisfy the unit-edit
autosave browser proof gate.

2026-06-22 Sale, Rental, and Auction unit proof implementation:

- `e2e/dle/edit-autosave-browser.spec.ts` now also covers Unit Types step pricing
  failure/retry behavior for Sale, Rental, and Auction through the explicitly enabled
  edit-autosave switch.
- For each transaction lane:
  - Seeds the unit with the fields required to pass the real Unit Type edit dialog validation.
  - Navigates to the edit wizard Unit Types step.
  - Opens the seeded unit through the real Edit Unit Type dialog.
  - Updates the transaction-native pricing field:
    - Sale: `priceFrom`.
    - Rental: `monthlyRentFrom`.
    - Auction: `startingBid`.
  - Intercepts the first `developer.updateDevelopment` request and returns `{ success: false }`.
  - Asserts the UI shows visible `Save Failed`.
  - Asserts the failed unit pricing attempt does not change persisted DB unit pricing.
  - Reopens the unit, changes the pricing value again, and asserts the retry succeeds.
  - Asserts the retry payload has `canonicalUpdateMode: partial_step`.
  - Asserts the retry payload owns unit/inventory fields only (no location, marketing, media, or
    governance fields).
  - Asserts the public development page shows the retried transaction-native unit pricing value.

This proof implementation does not enable edit autosave. Runtime proof passed in the full
Sale/Rental/Auction browser suite:

- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm exec playwright test e2e/dle/edit-autosave-browser.spec.ts --project="Desktop Chrome" --workers=1`
- Result: 24 passed, 0 failed.

2026-06-23 Sale, Rental, and Auction stale-response proof implementation:

- `e2e/dle/edit-autosave-browser.spec.ts` now also covers stale successful marketing autosave
  responses for Sale, Rental, and Auction.
- For each transaction lane:
  - Opens a published, approved development at the Marketing Summary step.
  - Holds the first successful `developer.updateDevelopment` response open.
  - Types a newer description while that older response is still pending.
  - Releases the older successful response.
  - Asserts the wizard does not show `Saved` for the newer unsaved content.
  - Asserts the header remains at `Manual save ready` until the newer payload is sent and
    persisted.
  - Asserts both payloads use `canonicalUpdateMode: partial_step` and own marketing fields only.

This proof implementation does not enable edit autosave. Runtime proof passed in the full
Sale/Rental/Auction browser suite:

- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm exec playwright test e2e/dle/edit-autosave-browser.spec.ts --project="Desktop Chrome" --workers=1`
- Result: 27 passed, 0 failed.

2026-06-23 Sale, Rental, and Auction unit merchandising/lead proof implementation:

- `e2e/dle/edit-autosave-browser.spec.ts` now also proves autosaved Unit Types pricing changes
  remain transaction-native through public merchandising and lead capture.
- For each transaction lane:
  - Navigates to the edit wizard Unit Types step.
  - Opens the real Edit Unit Type dialog and changes the transaction-native pricing field.
  - Intercepts the first `developer.updateDevelopment` request and returns `{ success: false }`.
  - Asserts the failed attempt remains visible as `Save Failed`.
  - Retries with a valid transaction-native merchandising value and asserts the retry succeeds.
  - Asserts both failed and retry payloads use `canonicalUpdateMode: partial_step` and own
    unit/inventory fields only.
  - Asserts location, marketing, media, governance, approval, and non-unit commercial package
    fields remain preserved.
  - Asserts the public development page shows the retried transaction-native unit pricing.
  - Asserts the public search card shows the retried transaction-native price language:
    - Sale: `From`.
    - Rental: `Rent from`.
    - Auction: `Bid from`.
  - Submits a unit-level public lead and asserts the persisted lead keeps development id, unit id,
    unit name, `development_detail_contact` source, `interest` funnel stage, transaction type, and
    unit price label.

This proof implementation does not enable edit autosave. Runtime proof passed in the focused
Sale/Rental/Auction browser suite:

- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm exec playwright test e2e/dle/edit-autosave-browser.spec.ts --project="Desktop Chrome" --workers=1 --grep "search card and lead context"`
- Result: 3 passed, 0 failed.

2026-06-23 Sale, Rental, and Auction media removal proof implementation:

- `client/src/components/development-wizard/phases/MediaPhase.tsx` now persists the derived
  `heroImage` mirror with every Media step write, including `null` when the final hero/photo is
  removed. This prevents edit-autosave payloads from falling back to stale published hero media
  after a visible removal.
- `e2e/dle/edit-autosave-browser.spec.ts` now covers Media step removal failure/retry behavior for
  Sale, Rental, and Auction.
- For each transaction lane:
  - Navigates to the edit wizard Development Media step.
  - Removes the seeded published media through the real Media UI.
  - Intercepts the first `developer.updateDevelopment` request and returns `{ success: false }`.
  - Asserts `Save Failed` remains visible.
  - Asserts the failed removal payload uses `canonicalUpdateMode: partial_step`, owns media fields
    only, and does not contain the removed media URL.
  - Asserts the failed removal does not delete the persisted published media.
  - Uploads a replacement image as the retry and asserts `Saved`.
  - Asserts the retry payload owns media fields only, excludes the removed media URL, and includes
    the replacement upload.
  - Asserts non-media commercial package fields, approval status, and unit inventory remain
    preserved after both failure and retry.

This proof implementation does not enable edit autosave. Runtime proof passed in the focused
Sale/Rental/Auction browser suite:

- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm exec playwright test e2e/dle/edit-autosave-browser.spec.ts --project="Desktop Chrome" --workers=1 --grep "media removal"`
- Result: 3 passed, 0 failed.

2026-06-23 Sale, Rental, and Auction unit removal proof implementation:

- `server/lib/developmentUpdateIntent.ts` now treats canonical partial saves from the real
  `unit_types` step as full inventory syncs for unit persistence. This allows an intentional Unit
  Types removal to delete omitted unit rows while stale unit mirrors from non-inventory steps remain
  ignored or patch-only.
- `e2e/dle/edit-autosave-browser.spec.ts` now seeds a second removable unit in each transaction
  lane and covers Unit Types removal failure/retry behavior.
- For each transaction lane:
  - Navigates to the edit wizard Unit Types step.
  - Removes the secondary unit through the real Unit Types UI.
  - Intercepts the first `developer.updateDevelopment` request and returns `{ success: false }`.
  - Asserts `Save Failed` remains visible.
  - Asserts the failed removal payload has `canonicalUpdateMode: partial_step`, owns unit/inventory
    fields only, and excludes the removed unit.
  - Asserts the failed removal does not delete the persisted DB unit.
  - Edits the remaining primary unit pricing as the retry and asserts `Saved`.
  - Asserts the retry payload still excludes the removed unit.
  - Asserts persisted inventory now excludes the removed unit while non-unit commercial package
    fields, approval status, media, location, marketing, and governance remain preserved.
  - Asserts the public development page still renders the remaining primary unit with
    transaction-native pricing.

This proof implementation does not enable edit autosave. Runtime proof passed in the focused
Sale/Rental/Auction browser suite:

- `PLAYWRIGHT_SKIP_WEBSERVER=1 BASE_URL=http://localhost:3009 VITE_DLE_EDIT_AUTOSAVE_ENABLED=true pnpm exec playwright test e2e/dle/edit-autosave-browser.spec.ts --project="Desktop Chrome" --workers=1 --grep "unit removal"`
- Result: 3 passed, 0 failed.

## Required Before Enablement

Before edit-development autosave can be enabled:

1. Browser proof must cover Sale, Rental, and Auction edit routes.
2. Browser proof must show location edits preserve media, governance, unit inventory, pricing, and
   public output. Address-level proof is complete; broader city/suburb/province/postal coverage may
   still be added before rollout.
3. Browser proof must show media edits preserve location, governance, unit inventory, pricing, and
   public output. Upload/add and seeded-media removal proof are complete; reorder coverage may
   still be added before rollout.
4. Browser proof must show unit edits preserve media, location, governance, public pricing, search
   cards, and lead context. Transaction-native pricing, public page, search-card, and unit lead
   context proof is complete across all three transaction lanes. Secondary-unit removal
   failure/retry proof is also complete across all three lanes; reorder coverage may still be added
   before rollout.
5. Browser proof must show failed edit-autosave attempts remain visible and retryable.
6. Browser proof must show a stale partial payload cannot mark newer edits as saved. Marketing
   stale-success proof is complete across all three transaction lanes; repeat for other high-risk
   steps if needed before rollout.
7. Save Progress must remain the trusted manual fallback.

## Next Recommended Slice

Keep edit-development autosave disabled. The next rollout gate should add media reorder, unit
reorder, or stale-response ordering proof for high-risk media/unit flows before any production
enablement.
