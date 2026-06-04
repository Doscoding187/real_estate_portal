# DLE Autosave Safety Contract

Date: 2026-06-04
Status: Preflight contract. Autosave remains disabled.

## Purpose

DLE autosave must protect commercial packaging work without making claims the backend has not earned.

Autosave is not a convenience toggle. It is a persistence contract across Sale, Rental, and Auction canonical workflow state.

Manual Save Draft remains the trusted fallback until every gate in this document is proven.

## Canonical Save Scope

Autosave for create and draft journeys must persist the same canonical snapshot as Manual Save Draft:

- `workflowId`
- `currentStepId`
- `completedSteps`
- `developmentData`
- `stepData`
- `stepData.unit_types.unitTypes`
- transaction-specific pricing, terms, dates, inventory, media, highlights, and readiness state

Autosave must never introduce a second, narrower payload shape.

Edit-development progress must continue using baseline-aware partial-step ownership. It must not silently replace that contract with a full development overwrite.

## Truthful Save-State Contract

The wizard may show:

- `unsaved`: current state has not been confirmed by a real backend save.
- `saving`: one persistence request is in flight.
- `saved`: the backend confirmed success for the exact current state signature.
- `error`: the latest persistence attempt failed or returned `success: false`.

Rules:

- A local Zustand persist write is not a backend save.
- A resolved API request with `success: false` is a failed save.
- A save of an older state must not mark newer edits as saved.
- A failed save must remain visible until a real retry succeeds.
- Exit must not discard state after a failed Save & Exit attempt.
- The UI must not say work will be saved unless it actually attempts a real persistence path.

## Concurrency And Identity Contract

- Only one autosave request may execute at a time.
- A queued newer save must run after the in-flight save and become the authoritative status.
- Once a new draft receives an ID, every later save must reuse that ID, including saves queued before React rerenders.
- Autosave must not create duplicate drafts because of stale `currentDraftId` closures.
- Transaction changes must use canonical sanitization so stale sale, rental, or auction pricing cannot leak across lanes.

## Failure And Recovery Contract

- Backend safe-failure responses, thrown errors, network failures, and session failures must all produce a visible failed state.
- Manual Save Draft must remain available before Review for create/draft journeys.
- Save Progress must remain available for edit journeys and preserve field ownership.
- Retry must use the latest canonical state.
- Save & Exit must keep the developer in the wizard when persistence fails.
- A later successful retry may clear the failed state and show `saved` only if the current state still matches the saved signature.

## Enablement Gates

Autosave may be enabled only after all of these pass:

1. Sale, Rental, and Auction manual save/resume/publish proof.
2. Sale, Rental, and Auction edit-published field-ownership proof.
3. Manual Save Draft is available before Review for create/draft journeys.
4. Backend `success: false` is treated as failure.
5. Failed saves produce persistent visible error state.
6. Successful retry clears error and marks only the confirmed current signature as saved.
7. Save & Exit does not navigate or reset after failure.
8. New-draft queued saves reuse the first confirmed draft ID.
9. Autosave is gated behind hydration and does not save stale persisted local state before route draft/edit hydration.
10. Focused browser proof covers success, failure, retry, resume, and no duplicate draft creation.

## Current Preflight Decision

Autosave remains disabled.

The 2026-06-04 preflight slice establishes the contract and fixes the first trust blockers:

- backend `success: false` is rejected;
- existing draft updates persist successfully instead of failing on an unsafe explicit timestamp write;
- manual and progress-save failures enter a persistent error state;
- Save & Exit only leaves after confirmed persistence;
- new draft IDs are held in a synchronous ref for later saves;
- Manual Save Draft is available before Review for create/draft journeys.

The 2026-06-04 coordinator guardrail slice proves the shared save coordinator without enabling
DLE background autosave:

- three or more rapid save requests execute through one serialized queue;
- each request preserves the data snapshot and save destination captured when requested;
- only the latest requested revision may own `saved`, `error`, or final `isSaving` state;
- stale queued failures do not replace the status of a newer requested save;
- debounced background failures are caught and exposed through status and `onError`;
- changing only callback identity does not schedule a save;
- disabled manual saves remain inert;
- StrictMode mount effects do not schedule an initial save;
- mount-cycle state changes are ignored until the coordinator is ready to observe real
  post-mount changes.

The 2026-06-04 DLE persistence-boundary slice proves the focused wizard contract without enabling
background autosave:

- Manual Save Draft and future autosave writes share one DLE-level serialized persistence queue;
- overlapping new-draft writes preserve their requested canonical snapshots;
- a queued write reuses the first confirmed draft ID instead of creating a second draft;
- autosave observes the same full canonical snapshot persisted by Manual Save Draft, rather than a
  narrower UI-state subset;
- save-state signatures ignore `_savedAt` metadata while still tracking canonical owned-field
  changes;
- fresh-create mode rejects stale cached draft hydration;
- draft hydration explicitly requires a draft route;
- focused create, draft-resume, and edit tests confirm autosave remains disabled while the correct
  canonical route snapshot is exposed.

Still required before enablement:

- real-backend browser proof that overlapping/queued saves cannot create duplicate drafts;
- route hydration-gate browser proof for create, draft resume, and edit modes;
- browser failure/retry proof against the real backend path;
- a deliberate debounce decision based on developer workflow, not an arbitrary timer;
- transaction-lane browser proof that autosave resumes the latest confirmed canonical state.

## Recommended Next Slice

Prove the DLE-specific browser recovery contract without enabling background saves:

1. Prove create, draft-resume, and edit routes do not persist before the intended canonical state
   is loaded.
2. Prove queued real-backend saves reuse the first confirmed draft ID and do not create duplicates.
3. Force a browser save failure, confirm visible recovery, retry, and verify
   the persisted canonical snapshot.
4. Only then choose a guarded rollout strategy and deliberate debounce for create/draft journeys
   before considering edit-development autosave.
