# DLE Autosave Safety Contract

Date: 2026-06-04
Status: Guarded create/draft rollout available behind a default-off switch. Edit autosave remains disabled.

## Purpose

DLE autosave must protect commercial packaging work without making claims the backend has not earned.

Autosave is not a convenience toggle. It is a persistence contract across Sale, Rental, and Auction canonical workflow state.

Manual Save Draft remains the trusted fallback during the guarded rollout.

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

## Guarded Rollout Decision

Developer create/draft autosave is available only when
`VITE_DLE_CREATE_DRAFT_AUTOSAVE_ENABLED=true`. The switch is unset/false by default. Publisher
emulator create/draft routes remain excluded until a publisher-scoped draft persistence path is
proven.

The guarded rollout uses:

- a 10-second inactivity debounce so canonical development packages are not written on every
  field interaction;
- an immediate save request when canonical `currentStepId` changes;
- a hydrated canonical baseline so create, draft-resume, and edit routes do not save merely
  because they loaded;
- the same full canonical snapshot and serialized persistence queue used by Manual Save Draft;
- Manual Save Draft as the always-visible fallback before Review.

Ten seconds is deliberately long enough to avoid chatty writes while a developer is actively
packaging a section, but short enough to protect work during normal pauses. A canonical step
transition saves immediately because it is a strong signal that the developer completed a
meaningful packaging slice.

Rollback is immediate: set `VITE_DLE_CREATE_DRAFT_AUTOSAVE_ENABLED=false` and redeploy/restart the
frontend. Roll back if any of these are observed:

- duplicate draft creation;
- hydration-triggered writes;
- a false `Saved` claim;
- stale Sale, Rental, or Auction state after resume;
- save failures that are not visible and recoverable;
- request volume inconsistent with the 10-second debounce and step-transition contract.

Edit-development and publisher-emulator autosave remain disabled regardless of the switch.

## Preflight Foundation

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

The 2026-06-04 browser preflight proves the real-runtime safety boundary:

- create, draft-resume, and edit routes make no persistence calls while hydrating;
- changing route targets inside one mounted wizard clears the previous target and hydrates the new
  canonical target;
- a deterministic backend `success: false` response remains visibly failed and leaves the database
  unchanged;
- a later real-backend retry clears the failure and persists the canonical snapshot;
- two overlapping new-draft saves execute serially, create one database row, and send the first
  returned draft ID with the second request;
- Rental and Auction save-resume-publish browser flows still pass after the route-target fix.

The 2026-06-04 guarded rollout slice proves the switch-enabled boundary:

- developer create and draft routes become eligible only after hydration; edit and publisher
  emulator routes remain disabled;
- loaded canonical state becomes a skip baseline without falsely claiming it is saved;
- later canonical changes become eligible for autosave;
- canonical `currentStepId` transitions request an immediate save;
- Sale, Rental, and Auction each autosave and resume the latest confirmed canonical step;
- a failed background rental save remains visible, leaves the database unchanged, and a later
  latest-state retry succeeds;
- the previous browser failure/retry and one-new-draft-identity proofs still pass with the rollout
  switch enabled.

Edit-development autosave is a separate later decision. It must preserve baseline-aware partial-step
ownership and must not reuse create/draft full-snapshot persistence as a published-development
overwrite path.

The 2026-06-18 edit-autosave ownership slice defines the first named payload boundary without
enabling default background edit autosave:

- `buildDevelopmentEditAutosavePayload` delegates to the baseline-aware edit progress path;
- edit-autosave payloads require a persisted canonical baseline;
- location edit-autosave payloads exclude media, governance, and unit inventory ownership;
- media edit-autosave payloads exclude location, governance, and unit inventory ownership;
- component proof shows edit autosave remains disabled by default and can only become eligible
  behind `VITE_DLE_EDIT_AUTOSAVE_ENABLED=true`;
- component proof shows explicitly enabled edit autosave routes through baseline-aware partial
  updates and does not call the create/draft `saveDraft` path;
- `docs/dle/EDIT_DEVELOPMENT_AUTOSAVE_OWNERSHIP_CONTRACT.md` defines the remaining browser proof
  gates before rollout enablement.

## Recommended Next Slice

Run a limited create/draft rollout with the switch enabled in a controlled environment and monitor
the rollback triggers. Keep edit-development autosave disabled. If edit autosave becomes the next
priority, add browser proof for Sale, Rental, and Auction field-ownership preservation before
considering rollout enablement.
