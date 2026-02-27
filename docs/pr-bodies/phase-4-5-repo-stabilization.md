## What was broken (symptom)

- Pre-existing TypeScript blocker in distribution router path.
- Explore build/typecheck failures due to missing modules/hooks.
- Repo stability gate blocked (`pnpm check` was not reliably clean before fixes).

## Root cause (file + function)

- `server/distributionRouter.ts` around registration user-id filtering path (typed array mismatch).
- Missing/undefined Explore helper modules imported by feed components/hooks.

## Fix implemented

- Fixed typed array handling in distribution router path to satisfy procedure/schema expectations.
- Restored missing Explore module surfaces and related hooks/components.
- Resolved wiring drifts so compile/typecheck/build complete cleanly.

## Merge discipline

- Branch: `hardening/phase-4-5-repo-stabilization`
- Target: `hardening/phase-4-transactions`
- Merge-base confirmation: `merge-base(phase-4, phase-4.5) = 504243b`
- Key commit: `c036224`

## Verification steps

- `pnpm check` -> PASS
- `pnpm build` -> PASS
- Focused smoke/regression suite including explore/lead/transaction paths -> PASS

## Regression coverage added

- Existing focused tests exercised after fixes; no new test files in this phase.

## Risks

- Environment runtime drift can still affect reliability if Node major differs from project baseline (handled in later Phase 5 CI alignment).
