# Raw-error log sweep, phase 2d: root scripts, tests, and zero guard baseline

18 October 2026. Closes the residual inventory recorded in
[packet 59](59-raw-error-log-sweep-phase-2c-2026-10-18.md): repo-root
`scripts/*.ts`, test-file diagnostics, and the two example/backup files.
After this packet the second-argument ESLint guard has a repo-wide zero
baseline — any new raw-error console payload is a visible warning.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `RAW-ERROR-LOG-SWEEP-PHASE-2D-2026-10-18` (launch-readiness packet 60) |
| Base | `main` at `2a40806bd` (contains packet 59 via PR #652) |
| Worktree / branch | `property-listify-error-log-sweep-2d-20261018` / `fix/raw-error-log-sweep-phase2d-20261018` |
| Governing text | Packet 59 "Residual inventory"; founder phased-sweep decision |
| Boundary | Logging payloads in dev tools and tests only: 61 sites across 57 files. No runtime change. |
| Reviewer action | Confirm the guard scan reports zero, the emoji-site note, and that no new ESLint errors were introduced in root scripts. |

## What changed

- 46 repo-root `scripts/*.ts` developer utilities: import from
  `../server/_core/safeError`; raw error payloads summarized.
- 13 sites in 10 test files (database bootstrap/cleanup diagnostics) summarized;
  test-process stderr only, no assertion impact.
- 1 example and 1 backup file, cosmetically consistent.

Method: exact positional splice derived from the ESLint guard's own
line/column data (single- and multi-line calls handled uniformly). Two sites
contain a surrogate-pair emoji (💥) before the error identifier; ESLint
columns are UTF-16 while the splice tool counts code points, so those two
were skipped by the guard clause (no corruption) and fixed by hand.

## Guard baseline and lint scope

- `pnpm exec eslint server scripts shared` → **0** new-selector violations.
- The `no-restricted-syntax` block covers `server/**`, `shared/**`,
  `scripts/**`; note CI's `lint:check` only lints `client/src`, `server`,
  `shared`, so root scripts are outside the CI lint yet clean when linted.
- Pre-existing ESLint errors in some root scripts (`@ts-ignore` policy,
  shebang parse) exist at base, are outside `lint:check`, and are unchanged.

## Validation

- Typecheck: 290 pre-existing errors, 0 in touched files.
- Changed test suites (11 files): 6 passed / 5 DB-dependent skips,
  65 tests passed (41 skipped).
- No source-text contracts assert console forms in these files.

## Register effect

None. The raw-error logging theme (packets 52, 55, 57, 58, 59, 60) is now
closed: every raw-error console payload in the repository is summarized and
guarded.
