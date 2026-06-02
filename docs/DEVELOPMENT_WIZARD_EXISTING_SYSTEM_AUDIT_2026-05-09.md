# Development Wizard Existing System Audit - 2026-05-09

## Scope and Guardrails

This is a read-only audit of the existing Development Listing Wizard implementation. It does not propose or perform application-code changes, package changes, schema changes, migrations, tests, formatters, build fixes, UI redesign, or a new wizard.

The audit focuses only on:

- Development creation and editing.
- Draft saving and draft resume.
- Wizard steps, step state, and route/query behavior.
- Unit types.
- Development listing data and listing media.
- Frontend/backend persistence for create/edit/draft.
- Development DB tables directly used by the wizard.

## Executive Summary

The active wizard is a Vite React/tRPC/Express/Drizzle implementation, not a Next.js App Router implementation. The active frontend wizard is `client/src/components/development-wizard/DevelopmentWizard.tsx`, reached through `client/src/pages/CreateDevelopment.tsx`.

The highest-risk finding is state-model drift. The wizard currently carries several overlapping state models: legacy numeric phase state, keyed workflow state, raw `stepData`, mirrored `developmentData`, and root `unitTypes`. Local Zustand persistence stores a relatively complete snapshot, but server-side draft persistence does not. Edit-mode hydration reconstructs wizard state from DB rows and can choose an early step because workflow progress is not persisted in DB development records.

Autosave is wired but explicitly disabled. Several UI paths still call `saveNow()` or communicate draft/phase save behavior, but `saveNow()` is a no-op while autosave is disabled. Draft persistence is therefore effectively manual/disabled depending on the UI path, and even when invoked it saves a reduced server draft payload that omits the keyed workflow snapshot.

The smallest safe first implementation PR should stabilize edit/draft persistence without visual redesign: one canonical wizard snapshot, stable hydration, protected partial updates, stable unit type identity, and regression tests for the existing failure modes.

## Actual Project Structure

### Runtime and package shape

- Root package uses Vite, not Next.js. `package.json` has `build: vite build` and `dev:frontend: vite`.
- `next-themes` exists as a dependency, but the app is not a Next.js app.
- `vite.config.ts` sets the frontend root to `client`, outputs to `dist/public`, and proxies API traffic to the backend.
- The backend is Express with tRPC mounted at `/api/trpc`.

Evidence:

- `package.json`: scripts include `dev:frontend`, `build`, `build:frontend`, `test`, and Vite dependencies.
- `server/_core/index.ts`: imports Express and `createExpressMiddleware`; mounts `appRouter` at `/api/trpc`.
- `client/src/lib/trpc.ts`: exports `trpc = createTRPCReact<AppRouter>()`.
- `server/routers.ts`: exports `appRouter`, with `developer` and `superAdminPublisher` routers.

### Frontend folders relevant to this audit

- `client/src/pages/CreateDevelopment.tsx`: imports and renders the active wizard.
- `client/src/components/development-wizard/`: active wizard UI.
- `client/src/hooks/useDevelopmentWizard.ts`: Zustand store and persistence logic.
- `client/src/lib/workflows/`: keyed workflow definitions.
- `client/src/components/wizard/WizardEngine.tsx`: keyed workflow renderer.
- `client/src/components/developer/DevelopmentsList.tsx`: developer edit entry point.
- `client/src/pages/developer/MyDrafts.tsx`: draft resume entry point.
- `client/src/pages/admin/publisher/PublisherDevelopments.tsx`: publisher edit entry point.

### Backend folders relevant to this audit

- `server/developerRouter.ts`: developer draft/create/edit/get/publish procedures.
- `server/superAdminPublisherRouter.ts`: publisher create/edit/get/publish procedures.
- `server/services/developmentService.ts`: create/update/load/publish service logic.
- `server/lib/sanitizeDraftData.ts`: server draft payload sanitizer.
- `drizzle/schema/developments.ts`: development, draft, phase, unit, and unit type schema.
- `drizzle/migrations/` and `migrations/`: migrations touching development wizard tables.

## Active Routes and Entry Points

| Flow | Entry point | Route/query | Active component/procedure |
| --- | --- | --- | --- |
| Create development | `client/src/pages/CreateDevelopment.tsx` | `/developer/create-development`, `/developments/create`, `/development-wizard` | `DevelopmentWizard` from `client/src/components/development-wizard/DevelopmentWizard.tsx` |
| Developer edit | `client/src/components/developer/DevelopmentsList.tsx` | `/developer/create-development?id={id}` | `trpc.developer.getDevelopment` then wizard hydration |
| Draft resume | `client/src/pages/developer/MyDrafts.tsx` | `/developer/create-development?draftId={draftId}` | `trpc.developer.getDraft` then wizard hydration |
| Publisher create/edit | `client/src/pages/admin/publisher/PublisherDevelopments.tsx` | `/developer/create-development?id={id}&brandProfileId={brandProfileId}` | `trpc.superAdminPublisher.getDevelopmentById` for edit |
| Brand-profile create | `client/src/components/developer/DeveloperBrandProfile.tsx` | `/developer/create-development?brandProfileId={profile.id}` | Wizard reads `brandProfileId` query |

Route/query parsing happens in `client/src/components/development-wizard/DevelopmentWizard.tsx`:

- `draftId` -> draft mode.
- `id` -> edit mode.
- `brandProfileId` -> publisher/brand context support.
- `isEditMode = editId != null`.
- `isDraftMode = draftId != null`.

## Router and Backend Procedure Map

### tRPC router structure

- `server/routers.ts` exposes `developer: developerRouter`.
- `server/routers.ts` exposes `superAdminPublisher: superAdminPublisherRouter`.
- `server/_core/index.ts` mounts `appRouter` with `createExpressMiddleware` at `/api/trpc`.

### Developer router procedures used by the wizard

| Procedure | File | Purpose |
| --- | --- | --- |
| `developer.saveDraft` | `server/developerRouter.ts` | Saves sanitized draft payload to `development_drafts`. |
| `developer.getDraft` | `server/developerRouter.ts` | Loads one draft by id and developer profile. |
| `developer.getDrafts` | `server/developerRouter.ts` | Lists drafts for the developer profile. |
| `developer.createDevelopment` | `server/developerRouter.ts` | Creates development through `developmentService.createDevelopment`. |
| `developer.updateDevelopment` | `server/developerRouter.ts` | Updates development through `developmentService.updateDevelopment`. |
| `developer.getDevelopment` | `server/developerRouter.ts` | Loads existing development through `developmentService.getDevelopmentWithPhases`. |
| `developer.publishDevelopment` | `server/developerRouter.ts` | Publishes through `developmentService.publishDevelopment`. |

### Publisher router procedures used by the wizard

| Procedure | File | Purpose |
| --- | --- | --- |
| `superAdminPublisher.getDevelopmentById` | `server/superAdminPublisherRouter.ts` | Loads a development and validates brand ownership. |
| `superAdminPublisher.updateDevelopment` | `server/superAdminPublisherRouter.ts` | Updates a development with brand context. |
| `superAdminPublisher.publishDevelopment` | `server/superAdminPublisherRouter.ts` | Publishes a brand-owned development. |

## Active Wizard Implementation

The active wizard is `client/src/components/development-wizard/DevelopmentWizard.tsx`.

Important traits:

- The file is marked `// @ts-nocheck`.
- It reads route query params with `new URLSearchParams(window.location.search)`.
- It uses `useDevelopmentWizard` for all wizard state.
- It uses `useAutoSave`, but passes `enabled: false`.
- It hydrates edit data using `hydrateDevelopment(editData)`.
- It hydrates draft data using `hydrateDevelopment(loadedDraft.draftData)`.
- It initializes keyed workflows with `initializeWorkflow(devType, txType)`.
- It attempts to select a workflow step from `currentStepId`, first incomplete step, or first visible step.

## Wizard State Model Drift

The wizard has five active state models that can disagree.

| State model | Created | Updated | Read | Persisted to server draft | Persisted to DB development | Restored on edit | Restored on draft resume | Canonical or derived | Conflict/progress risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `currentPhase` | Initial state in `useDevelopmentWizard.ts` as `1`; legacy numeric comment says it is to be migrated. | `setPhase`, `initializeWorkflow`, legacy config phases, finalization edit links. | Autosave phase-change effect, validation, legacy navigation, finalization edit cards. | Only if present before server sanitize; current client `getDraftData()` explicitly does not include UI state like currentPhase. Server sanitizer can preserve `draft.currentPhase`, but client generally does not send it. | No. | No stable DB restore; edit branch preserves current state rather than forcing source phase. | Not reliably, because `DevelopmentWizard` passes `loadedDraft.draftData` directly and `getDraftData()` omits currentPhase. | Legacy state. | Can move backward or jump to mismatched numeric phase, especially from finalization edit links or legacy skip logic. |
| `currentStepId` | Initial state as `null`; set by `initializeWorkflow`. | `setWorkflowStep`, `goWorkflowNext`, `goWorkflowBack`, edit hydration preferred step selection. | `WizardEngine`, workflow navigation, edit hydration, persisted local state. | No. `getDraftData()` omits it; `sanitizeDraftData()` does not include it. | No. | Only if DB response happens to include it, which normal DB rows do not. Edit hydration otherwise picks first incomplete/visible step. | LocalStorage may restore it, but server draft resume does not reliably restore it. | Intended keyed workflow state. | Missing/stale value can force first visible step and appear to reset progress. |
| `stepData` | Initial state as `{}`. | `saveWorkflowStepData(stepId, data)` from active phases. | `buildWizardData`, phases, workflow validation, `MediaPhase`, unit types. | No. `getDraftData()` omits it; `sanitizeDraftData()` omits it. | Flattened/derived portions are written on create/update, but raw `stepData` is not persisted. | Reconstructed in `hydrateDevelopment` from flat DB rows and nested media/unit types. | Not reliably. The draft-specific branch would preserve `source.stepData`, but the caller passes `loadedDraft.draftData`, and server sanitizer omits `stepData`. | Closest current source of truth for keyed workflow input. | Losing it drops exact step form state and causes fallback/default reconstruction. |
| `developmentData` | Initial state includes name, status, transaction, location, media, amenities, etc. | Legacy setters, `saveWorkflowStepData` mirror, `hydrateDevelopment`, media helpers. | `buildWizardData`, validations, finalization payload assembly. | Yes, reduced into `draftData.developmentData`. | Yes, mapped into `developments` columns on create/update. | Yes, reconstructed from DB rows and JSON fields. | Yes, but reduced/sanitized and missing keyed workflow metadata. | Mirrored/derived legacy model. | Can conflict with `stepData` because `buildWizardData` gives `stepData` precedence for many fields. |
| Root `unitTypes` | Initial state as `[]`. | Unit helpers, `saveWorkflowStepData('unit_types')`, `hydrateDevelopment`. | Validation, finalization payload, `getUnitTypes`, `getDraftData`, local persistence. | Yes, as top-level `unitTypes` in `getDraftData()` and sanitizer. | Yes, saved to `unit_types` table through `persistUnitTypes`. | Yes, loaded from DB `unit_types` and normalized. | Yes, but IDs may be regenerated if absent/mismatched. | Mirrored model; canonical read prefers `stepData.unit_types.unitTypes`. | Can conflict with `stepData.unit_types.unitTypes`. ID drift can cause stale units or duplicates. |

### Canonicality assessment

The code is moving toward keyed workflow state where `stepData` is canonical and `developmentData`/root slices are compatibility mirrors. This is visible in `buildWizardData()`, which uses strict precedence of `stepData` over selector state and legacy `developmentData`. However, persistence is not aligned with that model:

- Local Zustand persistence includes `currentStepId`, `workflowId`, `completedSteps`, and `stepData`.
- Server draft persistence does not.
- DB development persistence stores flattened fields and unit types, not the wizard snapshot.

## Autosave and Draft Persistence

### Frontend autosave state

`client/src/components/development-wizard/DevelopmentWizard.tsx` calls `useAutoSave(stateToWatch, { enabled: false, ... })`.

`client/src/hooks/useAutoSave.ts` exits early when disabled:

- `performSave()` returns immediately if `!enabled`.
- `saveNow()` clears the timer and calls `performSave()`.
- The debounce effect also returns if `!enabled`.

Therefore, all `saveNow()` calls in this wizard are no-ops while `enabled: false`.

### UI behavior vs actual behavior

The wizard still has code paths that imply save behavior:

- Phase-change effect calls `saveNow()` when `currentPhase` changes.
- Confirm-exit flow calls `saveNow()` before reset/navigation.
- The exit confirm text implies progress will be saved as a draft.

Actual behavior: with autosave disabled, these calls do not save.

### `getDraftData()`

`useDevelopmentWizard.getDraftData()` returns a reduced consolidated draft:

- `developmentData`
- root identity fields such as `name`, `status`, `marketingRole`, `ownershipTypes`
- `classification`
- `overview`
- root `unitTypes`
- `finalisation`
- config slices
- selected amenities/unit groups
- `_version`
- `_savedAt`

It explicitly comments that metadata is "NOT UI state like currentPhase."

Missing from `getDraftData()`:

- `stepData`
- `workflowId`
- `currentStepId`
- `completedSteps`
- `currentStep`
- `stepErrors`
- raw root `transactionType` unless mirrored into `developmentData.transactionType`

### Server draft sanitizer

`server/lib/sanitizeDraftData.ts` returns only a reduced shape:

- `currentPhase`, if provided.
- `developmentType`
- config slices
- `listingIdentity`
- `selectedAmenities`
- `classification`
- `overview`
- `finalisation`
- normalized top-level `unitTypes`
- `developmentData`

Missing from server sanitized draft:

- `stepData`
- `workflowId`
- `currentStepId`
- `completedSteps`
- `stepErrors`

### `developer.saveDraft`

`server/developerRouter.ts`:

- Accepts `{ id?, brandProfileId?, draftData }`.
- Runs `sanitizeDraftData(input.draftData ?? {})`.
- Derives `currentStep` from `sanitized.currentPhase`.
- Derives `progress` as `currentStep / 11`.
- Saves into `development_drafts.draftData`.
- On errors, logs a warning and returns a fallback response with `success: false`.

The fallback response can contain an id-like value even when persistence failed, so callers must not treat any id as proof of durable save.

### `developer.getDraft`

`server/developerRouter.ts`:

- Loads a draft by id and developer profile id.
- Returns `draftData: sanitizeDraftData(draft.draftData ?? {})`.

This means even if older stored drafts contain extra fields, the returned API response removes fields outside the sanitizer allowlist.

### What exactly gets saved into `development_drafts.draftData`

Confirmed saved:

- Sanitized `developmentData`.
- Sanitized `unitTypes`.
- Sanitized basic config/classification/overview/finalisation slices.
- Possibly `currentPhase` if client sends it, but current client `getDraftData()` does not.

Confirmed not saved:

- Keyed workflow state: `currentStepId`, `workflowId`, `completedSteps`.
- Raw `stepData`.
- Validation/error state.
- Exact step-level draft snapshot.

### Draft save mode

Current behavior is best described as "autosave disabled, server draft snapshot incomplete." There may be manual UI paths that invoke draft save, but the central autosave/phase-save behavior in the active wizard is disabled.

## Draft Resume Path

1. `client/src/pages/developer/MyDrafts.tsx` calls `setLocation('/developer/create-development?draftId=${draftId}')`.
2. `DevelopmentWizard.tsx` parses `draftId`.
3. `trpc.developer.getDraft.useQuery({ id: currentDraftId })` runs when not edit mode and not publisher API mode.
4. On loaded draft, the wizard calls `hydrateDevelopment(loadedDraft.draftData)`.
5. `hydrateDevelopment` checks `isDraft = data.draftData !== undefined`.

Risk: `developer.getDraft` returns an object whose `draftData` has already been extracted by `DevelopmentWizard`. Because the wizard passes `loadedDraft.draftData`, the object normally does not contain a nested `draftData` property. That means `hydrateDevelopment` may take its non-draft branch for a server draft. The draft-specific path that preserves `source.stepData` and `source.currentPhase` is therefore unlikely to execute for the current resume path.

Even if the draft branch executed, server sanitizer omits `stepData`, `currentStepId`, `workflowId`, and `completedSteps`.

## Edit Mode Hydration

### Developer edit flow

1. `client/src/components/developer/DevelopmentsList.tsx` calls `setLocation('/developer/create-development?id=${id}')`.
2. `DevelopmentWizard.tsx` parses `id` into `editId`.
3. `trpc.developer.getDevelopment.useQuery({ id: editId })` runs.
4. `server/developerRouter.ts` calls `developmentService.getDevelopmentWithPhases(input.id)`.
5. The router verifies the development belongs to the current developer profile.
6. The wizard calls `hydrateDevelopment(editData)`.
7. It derives development type and transaction type.
8. It calls `initializeWorkflow(devType, txType)`.
9. It computes visible workflow steps from `getWorkflow(wizardData)`.
10. It sets preferred step to:
    - `wizardData.currentStepId`, or
    - first visible step not in `wizardData.completedSteps`, or
    - first visible step.

### Publisher edit flow

1. `client/src/pages/admin/publisher/PublisherDevelopments.tsx` calls `setLocation('/developer/create-development?id=${id}&brandProfileId=${selectedBrandId}')`.
2. The wizard resolves publisher context and chooses `superAdminPublisher.getDevelopmentById`.
3. `server/superAdminPublisherRouter.ts` calls `developmentService.getDevelopmentWithPhases`.
4. The router checks `developerBrandProfileId` matches the selected brand profile.
5. Hydration proceeds through the same frontend path.

### Backend data load

`developmentService.getDevelopmentWithPhases(id)`:

- Reads the development row from `developments`.
- Reads related `unit_types`.
- Reads related `development_phases`.
- Parses JSON-ish fields such as images, videos, brochures, amenities, highlights, features, and unit type nested fields.
- Returns a flattened development object with `media`, `unitTypes`, and `phases`.

### Where flat DB rows become wizard state

`hydrateDevelopment` in `client/src/hooks/useDevelopmentWizard.ts` converts:

- Flat row fields into `developmentData`.
- Flat address/suburb/city/province fields into `developmentData.location`.
- DB `images`/`media`/`brochures` into `developmentData.media`.
- DB `unitTypes` into root `unitTypes` and `stepData.unit_types`.
- DB values into reconstructed `stepData` sections such as `identity_market`, `location`, `governance_finances`, `amenities_features`, `marketing_summary`, `development_media`, and `unit_types`.

### Edit mode drop/default risks

- DB rows do not contain wizard `currentStepId`, `workflowId`, or `completedSteps`.
- Edit hydration initializes the workflow and then picks the first available incomplete/visible step when no progress exists.
- `mixed_use` is mapped to `mixed` in `DevelopmentWizard.tsx`, but frontend workflow types use `mixed_use` and the workflow registry has no mixed-use workflow.
- Unit type IDs are generated when missing; generated IDs can mismatch existing DB IDs later.
- Media/docs are reconstructed from mixed columns/objects, including `media.documents`, `media.brochures`, and DB `brochures`.

## Create and Submit Persistence

The finalization phase assembles a payload from `getWizardData()` and store state. It extracts:

- Images from canonical media state.
- Videos from canonical media state.
- Document/brochure URLs from canonical media documents.
- Unit types from canonical wizard data.
- Config slices and development fields.

Create path:

- `developer.createDevelopment` or publisher create.
- `developmentService.createDevelopment`.
- Inserts into `developments`.
- Persists `unitTypes` through `persistUnitTypes`.

Edit path:

- `developer.updateDevelopment` or publisher update.
- `developmentService.updateDevelopment`.
- Updates provided scalar/JSON fields.
- Persists unit types only if `unitTypes` is present.

After successful save/update, `FinalisationPhase.tsx` navigates to:

- `/admin/overview` for super admin.
- `/developer/developments` for normal developer.

## Update Persistence Risk

### Partial or full payloads

`developer.updateDevelopment` accepts `{ id, data: z.record(z.any()) }`, so the frontend can send partial or broad payloads. `developmentService.updateDevelopment` then applies only fields where `developmentData.field !== undefined`.

This guards against omitted fields being overwritten. However:

- Explicit `null` can still overwrite fields depending on sanitizer behavior.
- Unknown/unmapped fields are ignored.
- Frontend omissions are safe only if the service truly treats them as `undefined`.
- Arrays sent as empty arrays can have field-specific semantics.

### Fields allowed to update

The service conditionally updates many development columns, including:

- Basic listing fields: name, description, tagline, subtitle, status, nature.
- Type fields: developmentType, transactionType, propertyCategory, subCategory.
- Location fields: address, suburb, city, province, postalCode, latitude, longitude.
- Date and role fields: completionDate, marketingRole, gpsAccuracy.
- Pricing/unit summary fields: price/rent/rates/levies/area/bed/bath style fields.
- JSON/media fields: images, videos, floorPlans, brochures, amenities, highlights, features.
- Ownership/structure fields: ownershipType, floors, structuralType, transferCostsIncluded.
- Config fields: residentialConfig, landConfig, commercialConfig, mixedUseConfig.
- Metadata: metaTitle, metaDescription.
- Brand/agent linking: brandProfileId -> developerBrandProfileId, agentId.

### Fields not clearly persisted or drifted

Some frontend/schema/service concepts are not consistently aligned:

- Raw `stepData` is not persisted to DB.
- Keyed workflow state is not persisted to DB.
- Some V2 migration fields such as `property_type`, `parent_development_id`, and `copy_parent_details` are not consistently represented in the active Drizzle schema.
- `shared/types.ts` and `shared/db-enums.ts` contain development types/statuses that differ from Drizzle and the wizard.

### Unit type update behavior

`developmentService.updateDevelopment`:

- If `unitTypes` is omitted, preserves existing unit types.
- If `unitTypes` is an empty array, logs that existing unit types are preserved.
- It still calls `persistUnitTypes`, but `persistUnitTypes` returns early for empty payloads.

`persistUnitTypes`:

- Loads existing unit type IDs.
- Normalizes incoming IDs.
- Deletes missing existing rows only if there is proof incoming IDs match DB IDs, or no existing rows exist.
- If no incoming IDs match existing IDs, it triggers a safety path and skips deletion.
- Creates new UUIDs for missing or non-matching incoming IDs.

Risks:

- Removed-all-units cannot be represented by an empty array update.
- If frontend-generated IDs do not match DB IDs, stale DB unit types can survive.
- If incoming IDs are missing or unstable, duplicate unit types can be created.
- Edit/update can preserve stale units even though the user removed them.

### Media/documents in update path

Development listing media is handled as JSON columns/fields on `developments`, primarily:

- `images`
- `videos`
- `floorPlans`
- `brochures`

Unit type media is stored under `unit_types.base_media`.

There is no separate wizard-specific development document bank in the current create/edit path.

## Route and Navigation Regression Map

### Route/query causes

| Cause | Behavior | Risk |
| --- | --- | --- |
| Missing `id` | Create mode; if neither edit nor draft, wizard resets after persistence hydration. | A stale/removed query can turn edit into fresh create. |
| Missing `draftId` | Not draft mode. | Draft resume cannot occur. |
| Both `id` and `draftId` | Edit mode wins because draft query is disabled when `isEditMode` is true. | Ambiguous URL silently becomes edit mode. |
| Missing/stale `brandProfileId` | Publisher API may not run; developer API may be used instead. | Publisher edit can fail or hydrate wrong context. |
| Invalid numeric params | `parseNumericParam` returns null. | Mode silently changes. |

### Wizard movement causes

- `WizardEngine` uses keyed workflow `currentStepId` for next/back.
- `goWorkflowNext` validates current step, advances to next visible step, and appends to `completedSteps`.
- `goWorkflowBack` moves to previous visible step.
- If current step is not found in visible steps, navigation resets to first visible step.
- `initializeWorkflow` resets `currentPhase`, `currentStep`, `completedSteps`, and `stepErrors`, then sets first visible keyed step.
- Finalization edit cards call legacy `setPhase(1)`, `setPhase(5)`, `setPhase(7)`, `setPhase(9)`, and `setPhase(10)`.
- Legacy skip logic sets `currentPhase` from `6` to `7` for land/commercial.

### Redirect out causes

- Confirm exit in `DevelopmentWizard.tsx` calls `saveNow()`, `reset()`, then navigates to `/admin/overview` or `/developer`.
- Successful final save/update in `FinalisationPhase.tsx` navigates to `/admin/overview` or `/developer/developments`.
- Draft start-fresh clears query params with `window.history.replaceState`, resets state, and continues on the same path.

### After failed save/update

The service/router can throw or return errors; finalization surfaces failures through toast/error handling. No confirmed rollback of local wizard state occurs. Since the wizard can already have local state ahead of DB state, failed saves can leave the user on a state that is not durable.

### After refresh

- Local Zustand persistence may rehydrate more complete state than server draft persistence.
- Create mode then calls `reset()` once persistence is ready when not edit or draft.
- Edit mode refetches DB state and reconstructs wizard state.
- Draft mode refetches sanitized server draft state and reconstructs wizard state without full keyed workflow metadata.

## Dead/Duplicate Wizard Implementation

There is an older/simple wizard at:

`client/src/components/developer/DevelopmentWizard.tsx`

Search results found no active imports/routes for this file. The active import is:

`client/src/pages/CreateDevelopment.tsx -> @/components/development-wizard/DevelopmentWizard`

Assessment:

- The old file appears unreachable by current routes.
- It uses old assumptions/local state rather than the active tRPC/Zustand/workflow path.
- It should be marked as a dead-code candidate.
- It creates naming confusion with the active wizard.
- It should not be deleted in PR 1 unless a separate cleanup PR validates no external imports/build references.

## Schema and Type Drift

### Drizzle schema

`drizzle/schema/developments.ts` includes:

- `developments`
  - `developmentType`: `residential`, `commercial`, `mixed_use`, `land`.
  - `status`: `launching-soon`, `selling`, `sold-out`.
  - `legacyStatus`: planning/build/completion style enum.
  - `approvalStatus`: `draft`, `pending`, `approved`, `rejected`.
  - `nature`: `new`, `phase`, `extension`, `redevelopment`.
  - `transactionType`: `for_sale`, `for_rent`, `auction`.
  - `floorPlans`, `brochures`, `images`, and other listing fields.
- `development_drafts`
  - `draftData`
  - `progress`
  - `currentStep`
  - developer and brand links.
- `unit_types`
  - development FK.
  - price/rent/auction fields.
  - `baseMedia`.
  - nested extras/specifications/amenities/features fields.
- `development_phases`
  - development FK and phase status/spec fields.
- `development_units`
  - development and phase linkage.

### Migration drift

`drizzle/migrations/add-wizard-v2-fields.sql` adds concepts including:

- `developments.property_type`
- `developments.parent_development_id`
- `developments.copy_parent_details`
- `development_drafts.is_draft`
- `development_drafts.last_saved_at`

These concepts are not consistently visible in the active Drizzle `developments.ts` schema or active wizard persistence path. This indicates schema/migration drift around wizard V2 fields.

### Shared type drift

`shared/types.ts`:

- `DevelopmentType = 'residential' | 'commercial' | 'mixed_use' | 'estate' | 'complex'`
- `DevelopmentStatus = 'planning' | 'under_construction' | 'completed' | 'coming_soon'`

`shared/db-enums.ts`:

- Includes `mixed_use`, `estate`, `complex`, but not `land` in `DEVELOPMENT_TYPES`.
- Uses underscore status values like `launching_soon`.

Frontend wizard types:

- `DevelopmentType = 'residential' | 'mixed_use' | 'land' | 'commercial'`
- `DevelopmentStatus = 'launching-soon' | 'selling' | 'sold-out'`

Drizzle:

- Allows `residential`, `commercial`, `mixed_use`, `land`.
- Uses hyphenated status values.

Risk: type-level agreement is weak across frontend, shared, backend, and schema layers.

## Product Type Readiness

| Development type | Current support | Risky assumptions | Files involved |
| --- | --- | --- | --- |
| Residential sale | Supported but fragile. Active workflow exists. | Draft/edit state can reset; unit IDs can drift. | `client/src/lib/workflows/residential-sale.ts`, `DevelopmentTypePhase.tsx`, `FinalisationPhase.tsx`, `developmentService.ts`. |
| Residential rental | Partially supported. Active workflow exists and DB has rent fields. | Needs regression coverage for rent-specific unit ranges and update persistence. | `client/src/lib/workflows/residential-rent.ts`, `UnitTypesPhase.tsx`, `developmentService.ts`, `unit_types`. |
| Commercial sale | Not supported in active wizard flow. Backend/schema have commercial type and frontend config component exists. | Development type option/workflow readiness is incomplete. | `CommercialConfigPhase.tsx`, `client/src/lib/workflows/index.ts`, `developmentService.ts`. |
| Commercial rental | Not supported in active wizard flow. | No commercial workflow; rental fields are residential-workflow oriented. | Same as commercial sale plus rental fields. |
| Mixed-use | Not supported in active wizard flow. | `DevelopmentWizard.tsx` maps `mixed_use` to `mixed`, but workflow registry has no mixed workflow. | `MixedUseConfigPhase.tsx`, `DevelopmentWizard.tsx`, `client/src/lib/workflows/index.ts`. |
| Phased developments | Partially supported at DB/service level. | `development_phases` exists, and service can persist phases, but active wizard step coverage and parent-development V2 fields are drifted. | `development_phases`, `developmentService.ts`, `add-wizard-v2-fields.sql`. |
| Student accommodation | Partially supported as residential subtype/community type. | No separate product workflow or DB type; depends on residential config/classification. | `client/src/types/wizardTypes.ts`, `ResidentialConfigPhase.tsx`. |
| Land/stands | Not supported in active workflow. | Schema/backend have `land`; land config component exists; workflow registry has no land workflow. | `LandConfigPhase.tsx`, `client/src/lib/workflows/index.ts`, `FinalisationPhase.tsx`. |

## Development Listing Media and Document-Like Assets

This section covers only assets currently captured by the Development Listing Wizard and saved as listing/development media. It does not define or reference a separate distribution document model.

| Concept | Frontend wizard appearance | Backend/DB save location | Linked to development | Linked to unit type | Marketing/listing asset | Ambiguous |
| --- | --- | --- | --- | --- | --- | --- |
| Brochure | `MediaPhase.tsx` treats PDFs/docs under `documents`; fallback accepts `media.brochures`. `FinalisationPhase.tsx` extracts document URLs as `brochures`. | `developments.brochures` JSON/text via `developmentService.createDevelopment/updateDevelopment`; also returned in `media.brochures`. | Yes. | No. | Yes. | Yes, because "documents" and "brochures" overlap. |
| Floor plan | Development-level `floorPlans` exists in service/schema; unit-level floor plans are captured in `UnitTypesPhase.tsx` under `baseMedia.floorPlans`. | Development: `developments.floorPlans`; unit type: `unit_types.base_media`. | Yes for development-level field. | Yes for unit floor plans. | Yes. | Yes, because development vs unit-level floor plans are separate but similarly named. |
| Price list | No clear dedicated active wizard field found. Pricing is represented through development price/rent ranges and unit type pricing. | Development price/rent columns and `unit_types` price/rent fields. | Yes through pricing fields. | Yes through unit type fields. | Listing data rather than uploaded file. | Yes, if users upload a price-list PDF as generic document/brochure. |
| Site map/site plan | Store `Document` type includes `site-plan`; media docs can hold PDFs. No confirmed dedicated active wizard field. | Likely `developments.brochures` or `developmentData.media.documents` if uploaded. | Yes if saved as development document/media. | No. | Yes. | Yes. |
| Application form/template | No active wizard capture found. | None in development wizard path. | No confirmed link. | No. | No. | No current support. |
| Supporting documents | Generic `documents` in media state; validation requires at least one brochure/document. | Stored as `brochures`/media documents, not a typed document table. | Yes if saved in development media. | No. | Usually yes. | Yes, because document purpose/type is not explicit. |
| Development documents | Generic media documents only. | `developments.brochures` or media object. | Yes. | No. | Yes/ambiguous. | Yes. |
| Media files | `MediaPhase.tsx` captures hero, photos, videos, documents. | `developments.images`, `developments.videos`, `developments.brochures`; reconstructed into `media`. | Yes. | No. | Yes. | Some ambiguity around docs vs brochures. |
| Unit type files | `UnitTypesPhase.tsx` captures gallery and floor plans under unit media. Older `unit-types/tabs/MediaTab.tsx` also supports unit media categories. | `unit_types.base_media`. | Indirect through unit type development FK. | Yes. | Yes. | Lower ambiguity; still no durable uploaded-file object model beyond media JSON. |

## Unexpected Distribution Coupling

Direct wizard frontend code under `client/src/components/development-wizard` does not appear to import/call distribution modules.

Backend coupling exists in shared development services/router files:

| File path | Import/procedure/table involved | Why it is coupled | Used by wizard? | Decouple later? |
| --- | --- | --- | --- | --- |
| `server/developerRouter.ts` | Distribution settings procedures and feature flag helpers; `calculateDevelopmentReadiness` import. | The developer router hosts both development wizard procedures and distribution settings procedures. | The wizard uses the same router namespace for development procedures, but not the distribution settings procedures. | Yes, router boundaries could be clearer later. Not PR 1. |
| `server/services/developmentService.ts` | `distributionPrograms` joins/fields in development listing reads. | Development service enriches some development results with distribution program fields. | Possibly in list/detail data returned around developments, but not a wizard target architecture. | Yes, if service responsibilities become harder to reason about. Not PR 1. |

This audit does not use distribution as the target architecture for the wizard.

## Confirmed vs Likely vs Unknown Risk Table

| Risk | Status | Evidence | Files involved | User impact | Recommended fix direction | Should be in PR 1 |
| --- | --- | --- | --- | --- | --- | --- |
| Autosave is disabled while UI/save hooks imply autosave or phase-save behavior. | Confirmed | `DevelopmentWizard.tsx` passes `enabled: false`; `useAutoSave.ts` returns early when disabled. | `DevelopmentWizard.tsx`, `useAutoSave.ts` | Users may believe progress is saved when no server draft save occurred. | Align UI and behavior; either enable reliable manual/autosave or remove false save promises. | Yes |
| Server draft does not preserve keyed workflow state. | Confirmed | `getDraftData()` omits `stepData/currentStepId/workflowId/completedSteps`; `sanitizeDraftData()` omits them too. | `useDevelopmentWizard.ts`, `sanitizeDraftData.ts`, `developerRouter.ts` | Draft resume can reset or lose exact progress. | Persist one canonical wizard snapshot with workflow metadata. | Yes |
| Draft resume may use edit-style hydration instead of draft hydration. | Likely | Wizard calls `hydrateDevelopment(loadedDraft.draftData)` while hydrate checks `data.draftData !== undefined`. | `DevelopmentWizard.tsx`, `useDevelopmentWizard.ts` | Draft-specific restoration logic may not run. | Normalize hydration API: pass wrapper or explicit mode; restore canonical snapshot. | Yes |
| Edit mode can reset to an early/first workflow step. | Confirmed | Edit data lacks workflow progress; edit hydration chooses currentStepId or first incomplete/visible step. | `DevelopmentWizard.tsx`, `useDevelopmentWizard.ts`, `developmentService.ts` | Editing an existing development can appear to move backward. | Store/derive stable edit current step, do not infer from missing completed steps. | Yes |
| Multiple state models can conflict. | Confirmed | `currentPhase`, `currentStepId`, `stepData`, `developmentData`, and root `unitTypes` are all active. | `useDevelopmentWizard.ts`, phases, `WizardEngine.tsx` | Data may display/save differently depending on which model a step reads. | Choose canonical snapshot and make mirrors derived. | Yes |
| Empty `unitTypes` update preserves stale DB units. | Confirmed | `updateDevelopment` logs preserving existing; `persistUnitTypes` returns early for empty payload. | `developmentService.ts` | User cannot remove all unit types through edit. | Explicit full-sync semantics with stable IDs and deletion intent. | Yes |
| Unit type ID mismatch can preserve stale rows or create duplicates. | Confirmed | `persistUnitTypes` skips deletion if no incoming IDs match; missing IDs get new UUIDs. | `developmentService.ts`, `unit_types` | Edits can leave old units or duplicate units. | Preserve DB IDs on hydration and require stable client IDs in update payloads. | Yes |
| Schema/type enums drift. | Confirmed | Frontend, shared types, shared DB enums, and Drizzle use different development/status values. | `wizardTypes.ts`, `shared/types.ts`, `shared/db-enums.ts`, `developments.ts` | Invalid values or unsupported product types can slip through. | Do not redesign schema in PR 1; document and guard active residential paths first. | No |
| Commercial/mixed/land appear supported but lack active workflows. | Confirmed | Components/schema exist; workflow registry only has residential workflows. | `client/src/lib/workflows/index.ts`, config phases, schema | Users/admins may reach unsupported combinations. | Keep out of PR 1; later product-type readiness PR. | No |
| Media "documents" vs "brochures" semantics are ambiguous. | Confirmed | Media phase uses `documents`; finalization maps docs to `brochures`; schema has `brochures`. | `MediaPhase.tsx`, `FinalisationPhase.tsx`, `developments.ts`, `developmentService.ts` | Uploaded PDFs may be saved without clear type/purpose. | In PR 1 preserve current behavior; later clarify media/document taxonomy. | No |
| Route query ambiguity can silently change mode. | Confirmed | Wizard mode depends on parsed `id`, `draftId`, `brandProfileId`; edit disables draft query. | `DevelopmentWizard.tsx`, route entry files | Stale/missing query params can load create instead of edit/draft. | Add route-mode guards and tests for params. | Yes |
| Distribution code shares backend router/service namespace. | Confirmed | Developer router and development service include distribution/readiness imports/fields. | `developerRouter.ts`, `developmentService.ts` | Increases audit confusion; no direct wizard frontend coupling found. | Leave alone in PR 1; decouple later only if needed. | No |
| `developer.saveDraft` fallback can return id-like response on failure. | Confirmed | Catch block returns fallback object with `success: false`. | `developerRouter.ts` | Caller may confuse failed save with durable draft if not checking `success`. | Make clients respect `success`; show durable-save failure clearly. | Yes |
| Create/edit payload mapping may differ. | Likely | Create and update both map many fields but via different branches; edit hydrates from DB reconstruction. | `FinalisationPhase.tsx`, `developmentService.ts`, `useDevelopmentWizard.ts` | Data can survive create but drift or drop on edit. | Shared mapping tests for create/edit canonical payload. | Yes |
| Existing tests do not cover the current persistence regression fully. | Likely | Existing unit type/service tests exist, but required wizard hydration/draft/edit cases are not visibly covered. | `server/tests`, `client/src/hooks/useDevelopmentWizard.test.ts` | Regressions remain easy to reintroduce. | Add focused regression tests before/with fixes. | Yes |

## Tests Required Before Fixes

Do not write these tests as part of this audit task. They are required before or during the first implementation PR.

### Store/hydration tests

- Hydrating an existing DB development does not reset the workflow to the first step when a stable saved step exists.
- Hydrating a server draft restores the exact `currentStepId`, `workflowId`, and `completedSteps` once canonical snapshot persistence is added.
- `stepData` remains the canonical source and `developmentData`/root slices are derived mirrors.
- `unitTypes` read path prefers `stepData.unit_types.unitTypes` and remains synchronized with root `unitTypes`.

### Draft persistence tests

- `getDraftData()` includes the canonical wizard snapshot.
- `sanitizeDraftData()` preserves the canonical wizard snapshot while still stripping unserializable file/blob data.
- `developer.saveDraft` stores the canonical snapshot in `development_drafts.draftData`.
- `developer.getDraft` returns the same wizard snapshot needed for resume.
- Disabled autosave/manual save UI state is reflected honestly in the UI.

### Edit/update tests

- `developer.updateDevelopment` does not null/wipe omitted fields.
- Explicit null behavior is tested and intentional.
- Unit types keep stable DB IDs across edit/update.
- Removed unit types are deleted when full-sync deletion is intended.
- Empty unit type payload cannot silently preserve stale units unless the API explicitly means "preserve."
- Create/edit produce equivalent canonical payloads for the same wizard state.

### Route/navigation tests

- `/developer/create-development?id={id}` enters edit mode and hydrates correctly after refresh.
- `/developer/create-development?draftId={id}` enters draft mode and restores workflow state.
- URLs with both `id` and `draftId` behave intentionally and visibly.
- Missing/stale `brandProfileId` in publisher edit does not silently use the wrong API.
- Final save/update success redirects to the expected route.
- Failed save/update keeps the user in place and does not imply durable persistence.

### Media/unit media tests

- Development hero/photos/videos/documents round-trip through create/edit.
- Brochure/document URLs persist to the expected development fields.
- Unit type gallery/floor plan media round-trips through `unit_types.base_media`.
- Uploaded document-like listing assets are not dropped during draft resume or edit hydration.

## Recommended First Implementation PR

Recommended title:

`Stabilize development wizard edit persistence without visual redesign`

### PR 1 acceptance criteria

- Editing an existing development does not reset the wizard step.
- Draft resume restores the same current step and completed steps.
- Saving a draft persists the canonical wizard snapshot.
- Updating a development does not wipe fields missing from the frontend payload.
- Unit types keep stable identities across edit/update.
- Existing UI is preserved.
- Regression tests prove the above.

### PR 1 should include

- Define one canonical wizard snapshot for server drafts, including:
  - `workflowId`
  - `currentStepId`
  - `completedSteps`
  - `stepData`
  - normalized `developmentData`
  - stable `unitTypes`
- Update draft save/resume to persist and restore that snapshot.
- Make edit hydration preserve or deterministically select stable workflow position without moving users backward.
- Ensure update payloads cannot wipe omitted data.
- Preserve unit type DB IDs through hydration and update.
- Add focused regression tests around draft resume, edit hydration, partial update safety, and unit type identity.

### PR 1 should avoid

- Visual redesign.
- Full schema redesign.
- Commercial/mixed-use/land expansion.
- Route rewrites.
- Deleting the legacy wizard.
- Document model work outside the development listing wizard.
- Broad cleanup.

## Top Five Confirmed Risks

1. Autosave is explicitly disabled, but UI/save flows still imply draft or phase save behavior.
2. Server draft persistence omits keyed workflow state and raw `stepData`.
3. Edit hydration reconstructs workflow state from DB rows and can choose the first visible step.
4. Unit type update logic can preserve stale rows or create duplicates when IDs mismatch.
5. Frontend/shared/backend/schema enums and wizard V2 fields are drifted.

## Top Five Likely Causes of the Persistence Regression

1. The canonical keyed workflow model was added without updating server draft persistence.
2. `getDraftData()` intentionally excludes UI state, but the keyed workflow now needs some of that state to resume correctly.
3. Draft hydration receives `loadedDraft.draftData`, while `hydrateDevelopment` detects drafts by looking for a nested `draftData` property.
4. Edit mode relies on reconstructed DB rows that do not store wizard progress.
5. Unit type identity is unstable across frontend-generated IDs and DB IDs.

## Final Recommendation

Do not start with homepage redesign, product-type expansion, schema redesign, or distribution document work. Start with a narrow persistence PR that makes the current residential development wizard reliable for create/edit/draft resume while preserving the existing UI.
