# Development Wizard Residential Sale Handover

This report documents the current residential "for sale" development wizard flow from entry to publish.
Sources are based on the current code implementation.

## Scope
- Flow covered: Residential + For Sale workflow.
- Components covered: entry, workflow engine, steps, persistence, validation, publish.

## Entry Points and Modes
- Main container: `client/src/components/development-wizard/DevelopmentWizard.tsx`.
- URL parameters:
  - `id` -> edit mode (loads existing development).
  - `draftId` -> draft mode (loads saved draft).
  - `brandProfileId` -> passed to draft save payload.
- Modes:
  - Create mode: resets store after persistence hydration.
  - Draft mode: loads draft via `trpc.developer.getDraft`.
  - Edit mode: loads development via `trpc.developer.getDevelopment`, hydrates store, and resumes at next incomplete workflow step.
- Draft resume UI: `client/src/components/wizard/DraftManager.tsx`.
- Exit behavior: save (if hydrated) then route to `/admin/overview` for super admin, or `/developer` otherwise.

## Workflow Selection (Step 0)
- UI: `client/src/components/development-wizard/phases/DevelopmentTypePhase.tsx`.
- User selects:
  - Development type (residential, mixed_use, land, commercial).
  - Transaction type (only `for_sale` enabled for now).
- Continue triggers:
  - `getWorkflow({ developmentType, transactionType })` -> residential sale workflow.
  - `setWorkflowSelector` (alias of `initializeWorkflow`) to activate workflow and set first step.

## Workflow Definition
- Residential sale steps: `client/src/lib/workflows/residential-sale.ts`.
- Visibility: `client/src/lib/workflows/index.ts` uses `getWorkflow` and `getVisibleSteps`.
- Steps (in order):
  1. configuration -> `ResidentialConfigPhase`
  2. identity_market -> `IdentityPhase`
  3. location -> `LocationPhase`
  4. governance_finances -> `EstateProfilePhase`
  5. amenities_features -> `AmenitiesPhase`
  6. marketing_summary -> `OverviewPhase`
  7. development_media -> `MediaPhase`
  8. unit_types -> `UnitTypesPhase`
  9. review_publish -> `FinalisationPhase`

## Wizard Engine Behavior
- Engine: `client/src/components/wizard/WizardEngine.tsx`.
- Requirements to render workflow:
  - `workflowId`, `developmentType`, and `developmentData.transactionType` must be set.
  - Otherwise, user stays on the Project Setup screen (Step 0).
- Step rendering:
  - `STEP_COMPONENTS` maps workflow steps to phase components.
  - Step errors are displayed above the current step.
- Navigation:
  - `Next` and `Back` buttons call `goWorkflowNext` and `goWorkflowBack` from the store.
  - Progress is computed from visible steps.

## Data Model and Persistence
- Store: `client/src/hooks/useDevelopmentWizard.ts`.
- Canonical workflow data is stored in `stepData` by step id.
- `buildWizardData` merges step data + legacy fields to create a canonical `WizardData` object.
- `saveWorkflowStepData(stepId, data)`:
  - Updates `stepData`.
  - Mirrors updates into `developmentData` for legacy compatibility.
  - Synchronizes `unitTypes` when the `unit_types` step saves.
- `getWizardData()` is the canonical source for publish payloads and validation.
- Autosave:
  - There is an autosave hook wired in `DevelopmentWizard.tsx`.
  - Autosave is disabled (`enabled: false`) pending backend stability.

## Step-by-Step (A to Z)
1. Project Setup (Step 0)
   - File: `client/src/components/development-wizard/phases/DevelopmentTypePhase.tsx`.
   - Selects development type (residential) and transaction type (for_sale).
   - Activates workflow via `setWorkflowSelector`.

2. Configuration
   - File: `client/src/components/development-wizard/phases/ResidentialConfigPhase.tsx`.
   - Selects residential type (apartment, townhouse, freehold, retirement, student, mixed).
   - Selects community types; some trigger estate profile display.

3. Identity and Market
   - File: `client/src/components/development-wizard/phases/IdentityPhase.tsx`.
   - Captures name, subtitle, nature, marketing role.
   - Captures status, completion date or launch date depending on status.
   - Shows transaction type as read-only; requires ownership types.
   - Persists to step `identity_market`.

4. Location
   - File: `client/src/components/development-wizard/phases/LocationPhase.tsx`.
   - Map pin + address fields (city, province, suburb, postal code).
   - Writes updates into step `location`.

5. Governance and Finances
   - File: `client/src/components/development-wizard/phases/EstateProfilePhase.tsx`.
   - Governing body toggle, governance type, levy range, guidelines, rates and taxes.
   - Persists to step `governance_finances`.

6. Amenities and Features
   - File: `client/src/components/development-wizard/phases/AmenitiesPhase.tsx`.
   - Multi-tab selection from amenity registry + custom amenity support.
   - Persists to step `amenities_features`.

7. Marketing Summary
   - File: `client/src/components/development-wizard/phases/OverviewPhase.tsx`.
   - Tagline, description, key selling points (highlights).
   - Persists to step `marketing_summary` with mapping to `tagline` and `keySellingPoints`.

8. Media
   - File: `client/src/components/development-wizard/phases/MediaPhase.tsx`.
   - Uploads hero image, gallery images, videos, and documents (PDFs).
   - Uses `trpc.upload.presign` to upload to storage.
   - Persists to step `development_media`.

9. Unit Types
   - File: `client/src/components/development-wizard/phases/UnitTypesPhase.tsx`.
   - Create/edit unit types with pricing, size, parking, features, media, and stock.
   - Persists full list to step `unit_types`.
   - Includes a draft mechanism for in-progress unit type creation.

10. Review and Publish
   - File: `client/src/components/development-wizard/phases/FinalisationPhase.tsx`.
   - Aggregates canonical `wizardData`, runs `validateForPublish`.
   - Builds payload for:
     - `trpc.developer.createDevelopment` (create)
     - `trpc.developer.updateDevelopment` (edit)
     - `trpc.developer.publishDevelopment` (publish)
   - Normalizes unit types to v2 schema and computes price range.
   - Publishes media arrays (images, videos, brochures) and config metadata.

## Validation Rules (Residential Sale)
- Workflow step validation: `client/src/lib/workflows/residential-sale.ts`.
  - Identity: name, status, ownership types required for sale.
  - Location: latitude/longitude required.
  - Governance: governing body requires governance type.
  - Marketing: description >= 50 chars, at least 3 selling points.
  - Media: at least one photo.
  - Unit types: at least one unit with name, beds, baths, base price.
- Navigation validation is non-blocking: `goWorkflowNext` archives errors but still advances.
- Final publish validation: `validateForPublish` in `client/src/hooks/useDevelopmentWizard.ts`.

## Drafts and Editing
- Drafts are loaded via `trpc.developer.getDraft`.
- Edit loads via `trpc.developer.getDevelopment` and hydrates workflow state.
- When editing, the wizard tries to resume at the next incomplete step.

## Known Constraints and Notes
- Autosave is wired but disabled (`enabled: false`).
- Draft resume UI uses legacy `currentPhase` for progress display (not step ids).
- Navigation validation is non-blocking; errors are shown but do not stop advancing.
- Some UI text and metrics still reference legacy fields (ex: highlights, subtitle).

## Key Files for Future Work
- Main entry: `client/src/components/development-wizard/DevelopmentWizard.tsx`.
- Workflow engine: `client/src/components/wizard/WizardEngine.tsx`.
- Store and canonical data: `client/src/hooks/useDevelopmentWizard.ts`.
- Residential sale workflow: `client/src/lib/workflows/residential-sale.ts`.
- Step components:
  - `client/src/components/development-wizard/phases/DevelopmentTypePhase.tsx`
  - `client/src/components/development-wizard/phases/ResidentialConfigPhase.tsx`
  - `client/src/components/development-wizard/phases/IdentityPhase.tsx`
  - `client/src/components/development-wizard/phases/LocationPhase.tsx`
  - `client/src/components/development-wizard/phases/EstateProfilePhase.tsx`
  - `client/src/components/development-wizard/phases/AmenitiesPhase.tsx`
  - `client/src/components/development-wizard/phases/OverviewPhase.tsx`
  - `client/src/components/development-wizard/phases/MediaPhase.tsx`
  - `client/src/components/development-wizard/phases/UnitTypesPhase.tsx`
  - `client/src/components/development-wizard/phases/FinalisationPhase.tsx`
