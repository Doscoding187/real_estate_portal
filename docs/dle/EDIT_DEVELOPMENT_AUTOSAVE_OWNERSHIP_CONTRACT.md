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

Not implemented in this slice:

- background edit autosave scheduling;
- edit autosave UI status changes;
- edit autosave browser proof;
- edit autosave backend endpoint changes;
- route enablement behind a rollout switch.

## Required Before Enablement

Before edit-development autosave can be enabled:

1. Component proof must show edit routes remain disabled unless a dedicated edit-autosave rollout
   switch is enabled.
2. Browser proof must cover Sale, Rental, and Auction edit routes.
3. Browser proof must show location edits preserve media, governance, unit inventory, pricing, and
   public output.
4. Browser proof must show media edits preserve location, governance, unit inventory, pricing, and
   public output.
5. Browser proof must show unit edits preserve media, location, governance, public pricing, search
   cards, and lead context.
6. Failed edit-autosave attempts must remain visible and retryable.
7. A stale partial payload must not mark newer edits as saved.
8. Save Progress must remain the trusted manual fallback.

## Next Recommended Slice

Keep edit-development autosave disabled. Add component proof that any future edit-autosave rollout
switch still routes through `buildDevelopmentEditAutosavePayload` and never through create/draft
full-snapshot persistence.
