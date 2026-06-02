# DLE Technical Architecture

This document summarizes the technical direction that future DLE work should preserve.

## Canonical State

Prefer canonical workflow state:

- `workflowId`
- `currentStepId`
- `completedSteps`
- `developmentData`
- `stepData`
- `stepData.unit_types.unitTypes`

Legacy root fields may remain as compatibility bridges, but they must not become the future authority.

## Main Flow Surfaces

- Wizard creation/editing: `client/src/components/development-wizard`
- Wizard state and draft snapshots: `client/src/hooks/useDevelopmentWizard.ts`
- Public development detail: `client/src/pages/DevelopmentDetail.tsx`
- Draft persistence and developer procedures: `server/developerRouter.ts`
- Development persistence: `server/services/developmentService.ts`
- Canonical payload/snapshot helpers: `server/lib`
- Shared commercial helpers: `shared/developmentDerived.ts`
- Shared readiness rules: `shared/developmentReadiness.ts`

## Transaction-Aware Inventory

Unit types are the commercial inventory core.

- Sale uses sale pricing and buyer affordability language.
- Rental uses monthly rent and rental qualification language.
- Auction uses starting bid, reserve, auction timing, and auction journey language.

Public display, search cards, dashboards, distribution catalogues, and lead capture should use transaction-aware helpers rather than stale sale-shaped fallbacks.

## Migration Discipline

- Additive changes are preferred during recovery.
- Preserve existing drafts and published developments.
- Avoid deleting legacy bridges until tests and manual flows prove the canonical path.
- Do not create new parallel paths when a canonical helper can be extended.
