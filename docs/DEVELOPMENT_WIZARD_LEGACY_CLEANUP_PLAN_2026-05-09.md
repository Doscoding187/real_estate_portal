# Development Wizard Legacy Cleanup Plan

Date: 2026-05-09

Scope: identify legacy or duplicate development-wizard code that can be removed or quarantined in a later cleanup PR. This document does not authorize deletion by itself and is intentionally separate from PR 1 persistence work.

## Current Active Path

The active Development Listing Wizard is reached through `client/src/pages/CreateDevelopment.tsx`, which imports `DevelopmentWizard` from `client/src/components/development-wizard/DevelopmentWizard.tsx`.

Known active routes:

- `/developer/create-development` in `client/src/pages/DeveloperRoutes.tsx`
- `/developer/developments/new`, which redirects to `/developer/create-development`
- `/developments/create` in `client/src/App.tsx`
- `/development-wizard` in `client/src/App.tsx`

The active keyed workflow engine is `client/src/components/wizard/WizardEngine.tsx`, backed by `client/src/hooks/useDevelopmentWizard.ts` and registered workflows in `client/src/lib/workflows`.

## Cleanup Candidates

| File/path/symbol | Why it appears legacy or dead | Imported anywhere | Route reachable | Tests reference it | Deletion risk | Recommendation | Safe cleanup PR phase |
|---|---|---:|---:|---:|---|---|---|
| `client/src/components/developer/DevelopmentWizard.tsx` | Duplicate standalone wizard with local `currentStep` state, hard-coded steps (`Info`, `Location`, `Media`, `Pricing`, `Floor Plans`, `Documents`, `Preview`), manual HTML forms, and no active tRPC/persistence wiring found in the search results. | No active import found by `rg "components/developer/DevelopmentWizard\|DevelopmentWizard" client/src server shared -S`; only the file's own declaration/export appears. | No route found pointing to this file. Active routes use `client/src/pages/CreateDevelopment.tsx`, which imports `components/development-wizard/DevelopmentWizard`. | No test reference found in searched output. | Low if import graph stays clean, but confirm with TypeScript/build after deletion because the default export name collides with the active component name. | Delete later after one PR that proves no imports, no route reachability, and no story/demo dependency. | Phase 1: dead duplicate removal. |
| `client/src/components/wizard/ClassificationPhase.tsx` | Uses legacy numeric `setPhase(3)` / `setPhase(1)` and `validatePhase`; not registered in `WizardEngine` step components. The active workflow uses `DevelopmentTypePhase`, `IdentityPhase`, `LocationPhase`, etc. | Search found only its own export and useDevelopmentWizard import; no active import into `WizardEngine`. | No route found. | No direct test reference found in searched output. | Medium. It may be an old generic wizard phase, but the `components/wizard` directory is shared by multiple wizard surfaces. | Quarantine first by documenting unused status; delete only after route/test/build confirmation. | Phase 2: unused phase quarantine. |
| `client/src/components/wizard/DevelopmentPreview.tsx` | Standalone preview component reading development wizard types, not registered in `WizardEngine`, and no import found besides its own export. | No active import found in searched output. | No route found. | No direct test reference found in searched output. | Medium, because previews are user-facing and may be intended for later use. | Quarantine as unused candidate; do not delete until product confirms no preview route is planned. | Phase 2: unused phase quarantine. |
| `client/src/components/wizard/PhaseIndicator.tsx` | Numeric `currentPhase` progress component appears aligned to legacy phase navigation, not keyed workflow steps. | No active import found in searched output. | No route found. | No direct test reference found in searched output. | Low to medium. It is generic and may be reusable outside development wizard. | Quarantine or move to legacy folder after verifying no import aliases. | Phase 2: shared wizard cleanup. |
| `client/src/components/development-wizard/phases/CommercialConfigPhase.tsx` | Commercial-specific phase exists, but registered workflows only include `residential_sale`, `residential_rent`, and `residential_auction`; no commercial workflow is registered. Uses numeric `setPhase(4)` / `setPhase(2)`. | Imported only by its own module in search results; not registered in `WizardEngine`. | Not reachable through current registered workflows. | No direct test reference found in searched output. | Medium to high. It represents future product-type work, so deleting may remove intended but incomplete functionality. | Keep but label as dormant/incomplete; do not delete in the persistence cleanup. | Phase 3: product-type quarantine after roadmap decision. |
| `client/src/components/development-wizard/phases/LandConfigPhase.tsx` | Land-specific phase exists, but no land workflow is registered. Uses numeric `setPhase(4)` / `setPhase(2)`. | Imported only by its own module in search results; not registered in `WizardEngine`. | Not reachable through current registered workflows. | No direct test reference found in searched output. | Medium to high for the same roadmap reason as commercial. | Keep dormant; add a clear "not active workflow" note in a later cleanup PR. | Phase 3: product-type quarantine after roadmap decision. |
| `client/src/components/development-wizard/phases/MixedUseConfigPhase.tsx` | Mixed-use phase exists, but no mixed-use workflow is registered. Uses numeric `setPhase(4)` / `setPhase(2)`. | Imported only by its own module in search results; not registered in `WizardEngine`. | Not reachable through current registered workflows. | No direct test reference found in searched output. | Medium to high because mixed-use expansion is explicitly out of PR 1 scope. | Keep dormant; do not delete until mixed-use strategy is known. | Phase 3: product-type quarantine after roadmap decision. |
| `currentPhase`, `currentStep`, `setPhase`, and numeric phase mapping in `client/src/hooks/useDevelopmentWizard.ts` | Legacy numeric model coexists with keyed `workflowId`, `currentStepId`, `completedSteps`, and `stepData`. Comments call `currentPhase` legacy. `setPhase` maps numeric phases to workflow step ids for residential workflows. | Actively used by `DevelopmentWizard.tsx`, `FinalisationPhase.tsx`, inactive config phases, and legacy shared wizard pieces. | Yes, indirectly through active wizard because `DevelopmentWizard.tsx` still renders/provides numeric progress and phase-save behavior. | Existing `useDevelopmentWizard.test.ts` exercises store behavior. | High. Removing now would break active wizard navigation and review edit links. | Keep for now. Plan migration only after keyed workflow navigation fully replaces numeric edit/back/progress behavior. | Phase 4: keyed workflow migration. |
| `client/src/components/development-wizard/DevelopmentWizard.tsx` numeric phase orchestration | Active component still references `currentPhase`, phase-change save behavior, and skip logic for phase 6. This is not dead code, but it is legacy logic embedded in active code. | Active import through `CreateDevelopment.tsx`. | Yes. | Covered indirectly by wizard store tests, not enough UI route tests. | High. | Keep. Only refactor after persistence regression coverage is stable. | Phase 4: keyed workflow migration. |
| `client/src/components/development-wizard/phases/FinalisationPhase.tsx` review edit links using `setPhase(1/5/7/9/10)` | Active final review phase uses numeric phase jumps instead of keyed step ids. It can move users to legacy phase positions rather than workflow step ids. | Active through `WizardEngine` as `ReviewStep`. | Yes. | No focused test found for review edit jumps. | High because it is active submit/update surface. | Keep in PR 1; later replace review edit targets with workflow step ids and tests. | Phase 4: keyed workflow migration. |
| `/development-wizard` route alias in `client/src/App.tsx` | Legacy-looking route alias to `CreateDevelopment`; canonical developer route is `/developer/create-development`. | Route entry exists. | Yes. | No direct route tests found. | Medium. External bookmarks or admin links may still use it. | Keep until analytics/logs confirm unused; later redirect to canonical route rather than hard delete. | Phase 5: route alias cleanup. |
| `/developments/create` route alias in `client/src/App.tsx` | Alternate create route to `CreateDevelopment`; may predate developer dashboard route. | Route entry exists. | Yes. | No direct route tests found. | Medium. Could be externally linked. | Keep until route usage is audited; later redirect to `/developer/create-development` if product agrees. | Phase 5: route alias cleanup. |
| `/developer/developments/new` redirect in `client/src/pages/DeveloperRoutes.tsx` | Old route alias already redirects to `/developer/create-development`. | Route entry exists. | Yes, as redirect. | No direct route tests found. | Low to medium. Redirect is safer than deletion. | Keep until usage is known; can remain indefinitely as a compatibility alias. | Phase 5: route alias cleanup. |
| `client/src/types/wizardTypes.ts` product/status enums | Defines broad development/product types (`mixed_use`, `land`, `commercial`) and statuses that do not fully align with active registered workflows or shared backend types. This is not dead, but it is a drift source. | Used by wizard/store code. | Active indirectly. | No focused enum drift tests found. | High if changed casually. | Keep. Add type-drift tests/documentation before any enum cleanup. | Phase 6: schema/type alignment. |
| `shared/types.ts` development enums | Shared type set includes `residential`, `commercial`, `mixed_use`, `estate`, `complex` and statuses `planning`, `under_construction`, `completed`, `coming_soon`, which differ from wizard UI/status expectations. | Shared backend/frontend type surface. | Active indirectly. | Unknown from searched output. | High. | Keep; align only in schema/type PR, not cleanup PR. | Phase 6: schema/type alignment. |
| `drizzle/schema.ts.backup` | Backup schema contains older/duplicate development enum definitions and may confuse text searches. It is not an active schema module if imports use `drizzle/schema/*`. | Not checked exhaustively for imports in this pass. | No route relevance. | Unknown. | Medium. Backup files can still be imported accidentally or relied on by migration scripts. | Verify import graph and migration tooling before deleting or moving out of source tree. | Phase 7: repository hygiene. |

## Additional Observations

- `client/src/components/wizard/DraftManager.tsx` and `client/src/components/wizard/GradientProgressIndicator.tsx` are shared and actively imported by other non-development wizard flows. They should not be deleted as part of development wizard cleanup.
- `client/src/components/development-wizard/phases/EstateProfilePhase.tsx` is active through `WizardEngine` as `GovernanceStep`; it should not be treated as dead simply because the file name contains "Estate".
- The active workflow registry currently registers only residential sale, residential rent, and residential auction workflows. Product-type phases for commercial, mixed-use, and land are dormant until corresponding workflows exist.
- Several files use the word "legacy" for unrelated platform areas. Future cleanup searches should constrain by development wizard paths before editing.

## Recommended Cleanup PR Sequence

1. Phase 1: remove the unreachable duplicate `client/src/components/developer/DevelopmentWizard.tsx` after confirming no imports, no route references, and no tests depend on it.
2. Phase 2: quarantine unused generic wizard components that are not registered in the active Development Listing Wizard (`ClassificationPhase`, `DevelopmentPreview`, `PhaseIndicator`) by moving or marking them only after build/test confirmation.
3. Phase 3: explicitly mark dormant product-type phases (`CommercialConfigPhase`, `LandConfigPhase`, `MixedUseConfigPhase`) as inactive, or move them behind a product-type roadmap folder. Do not delete without product confirmation.
4. Phase 4: migrate active numeric phase jumps to keyed workflow step ids. This needs tests around review edit links, draft resume, and edit hydration.
5. Phase 5: audit route alias usage before changing `/development-wizard`, `/developments/create`, or `/developer/developments/new`.
6. Phase 6: align wizard/frontend/shared/schema development enums in a dedicated schema/type PR.
7. Phase 7: clean backup schema or stale migration artifacts only after confirming tooling does not import them.

## Commands Used

```bash
rg -n "components/developer/DevelopmentWizard|DevelopmentWizard" client/src server shared -S
rg -n "currentPhase|setPhase|phaseConfig|legacy|WizardPhase|currentStep|currentStepId|workflowId" client/src -S
rg -n "planning|under_construction|completed|coming_soon|launching_soon|launching-soon|mixed|mixed_use|estate|complex|land" client/src shared server drizzle -S
rg -n "/development-wizard|/developments/create|/developer/create-development" client/src -S
rg -n "CommercialConfigPhase|LandConfigPhase|MixedUseConfigPhase|ClassificationPhase|DevelopmentPreview|DraftManager|PhaseIndicator|GradientProgressIndicator" client/src -S
```
