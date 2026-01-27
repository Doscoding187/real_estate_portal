# Wizard Workflow Engine

The Wizard Workflow Engine replaces the legacy fixed-step navigation with a dynamic, data-driven workflow system. This engine allows for flexible step ordering, conditional steps, and distinct workflows for different development types (e.g., "Residential Sale").

## Core Concepts

### 1. Workflows (`lib/workflows/`)
A workflow defines an ordered list of steps specific to a business case.
- **File:** `client/src/lib/workflows/residential-sale.ts`
- **Structure:** Array of `WizardStep` objects.
- **Key Fields:**
  - `id`: Unique step identifier (e.g., `identity_market`).
  - `componentKey`: Maps to a React component in `WizardEngine`.
  - `shouldShow(data)`: (Optional) Predicate to conditionally hide steps.
  - `validate(data)`: (Optional) Returns validation errors.

### 2. Workflow Resolver (`lib/workflows/index.ts`)
The resolver determines which workflow to use based on the development's identity:
- `Residential` + `For Sale` -> `residential_sale` workflow.
- Future: `Residential` + `For Rent` -> `residential_rent` workflow.

### 3. Wizard Engine (`components/wizard/WizardEngine.tsx`)
The engine is the main render component. It:
- Retrieves the current workflow and step from the Zustand store.
- Computes `visibleSteps` dynamically based on current data.
- Renders the active step's component.
- Displays validation errors (non-blocking in Phase 1).
- Provides "Next" / "Back" navigation.

### 4. Logic & State (`hooks/useDevelopmentWizard.ts`)
State management has been enhanced to be workflow-aware:
- `workflowId`: Active workflow ID.
- `currentStepId`: Active step ID.
- `stepErrors`: Validation errors for steps.
- `goWorkflowNext()`: Advances to the next *visible* step.
- `setPhase(n)`: **Backward Compatibility Layer** checks the legacy phase number and maps it to the corresponding Workflow Step ID, allowing existing step components to trigger navigation correctly.

## Adding a New Workflow

1.  **Define the Workflow:** Create a new file in `lib/workflows/` (e.g., `commercial-lease.ts`).
2.  **Register it:** Add it to `WORKFLOWS` map in `lib/workflows/index.ts`.
3.  **Update Resolver:** Update `getWorkflow` to return your new workflow ID for the matching criteria.
4.  **Define Types:** Ensure `WorkflowId` and `WizardStepId` in `lib/types/wizard-workflows.ts` include your new identifiers.

## Validation (Phase 1)

In this phase, validation is **advisory only**.
- `validate()` functions run on "Next" navigation.
- Errors are displayed in a UI block at the top of the step.
- Navigation is **not blocked** even if errors exist (per Phase 1 requirements).
- Strict gating will be added in Phase 2 (Publish Guard).

## Navigation Logic

- **Dynamic Visibility:** The engine recalculates which steps are visible on every navigation. If you toggle a field that hides the *next* step, the engine will skip it automatically.
- **Auto-Correction:** If the user is on a step that becomes invisible (e.g., via a side-effect), the engine snaps to the nearest valid step.
