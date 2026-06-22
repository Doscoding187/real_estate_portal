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
  - media edit-autosave payloads exclude location, governance, and unit ownership.
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
- media/unit edit-autosave browser proof;
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

## Required Before Enablement

Before edit-development autosave can be enabled:

1. Browser proof must cover Sale, Rental, and Auction edit routes.
2. Browser proof must show location edits preserve media, governance, unit inventory, pricing, and
   public output. Address-level proof is complete; broader city/suburb/province/postal coverage may
   still be added before rollout.
3. Browser proof must show media edits preserve location, governance, unit inventory, pricing, and
   public output.
4. Browser proof must show unit edits preserve media, location, governance, public pricing, search
   cards, and lead context.
5. Browser proof must show failed edit-autosave attempts remain visible and retryable.
6. Browser proof must show a stale partial payload cannot mark newer edits as saved.
7. Save Progress must remain the trusted manual fallback.

## Next Recommended Slice

Keep edit-development autosave disabled. Add browser proof that Sale, Rental, and Auction edit
autosave preserve unrelated fields and public output before considering rollout enablement.
