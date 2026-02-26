## What was broken (symptom)

Distribution deal/commission transitions could write partial state across deal rows, commission rows, and event rows when an intermediate step failed.

## Root cause (file + function)

- `server/distributionRouter.ts`
  - `submitDeal`
  - `advanceDealStage`
  - admin/manager commission status transition paths

These flows performed multi-step writes without a single transaction boundary in all critical paths.

## Fix implemented

- Wrapped logical transition units in `db.transaction(async tx => { ... })`.
- Ensured deal state updates, commission updates, and event/audit writes execute atomically.
- Added/updated transaction boundary regression tests:
  - `server/__tests__/distributionRouter.transactionBoundaries.test.ts`

## Merge discipline

- Branch: `hardening/phase-4-transactions`
- Target: `main`
- Key commit: `504243b`

## Verification steps

- `pnpm check` -> PASS
- `pnpm vitest run --silent server/__tests__/distributionRouter.transactionBoundaries.test.ts` -> PASS

## Regression coverage added

- `server/__tests__/distributionRouter.transactionBoundaries.test.ts`

## Risks

- Behavior change is concentrated in transactionality; verify DB lock/perf in staging under concurrent stage updates.
