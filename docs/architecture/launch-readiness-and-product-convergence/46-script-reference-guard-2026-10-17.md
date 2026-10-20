# Script reference guard

17 October 2026. Sweeps the repository's executable reference surfaces for
dead file targets after the packet-43 removal of the `test:dominance:*`
family, finds no remaining live dead references, and adds a protected guard so
new ones fail CI. Repository hygiene only; B08–B18, the paid-opening NO-GO and
every owner-blocked item retain their existing dispositions.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `SCRIPT-REFERENCE-GUARD-2026-10-17` (launch-readiness packet 46) |
| Base | `main` at `9a70f824a` (contains packet 45 via PR #638) |
| Worktree / branch | `property-listify-dead-reference-sweep-20261017` / `fix/dead-reference-sweep-20261017` |
| Boundary | Repository files and local unit tests only. No database, hosted, provider, payment or protected action was accessed or changed. |
| Reviewer action | Run the focused suite or inspect the guard's extraction rules; the guard runs in CI's server project via `scripts/**/*.test.ts`. |

## Sweep method and findings

Checked every executable reference surface against the tree:

| Surface | Checked | Live dead references |
| --- | --- | --- |
| `package.json` scripts | 324 entrypoint/config/`--config` path targets | 0 |
| `.github/workflows/*.yml` | entrypoint and `node --test` file targets; every `pnpm <script>` name against `package.json` | 0 |
| `vitest.*.config.ts`, `vitest.*.workspace.ts`, `tsconfig*.json`, `playwright.config.ts` | `include`/`--config` targets and glob bases | 0 |
| `scripts/**` source scan | string-literal path references resolved relative to the referencing file, with `.js`/`.mjs`/`.cjs`→TS ESM fallback | 0 |

Remaining hits were verified non-issues: path strings inside
`scripts/__tests__/databaseUtilityAuthority.test.ts` are deliberate fixtures
for the utility-authority scanner; `tests/fixtures/...` in
`scripts/storage/tests/*.py` resolve against `ROOT = scripts/storage`; and
`.js` specifiers in `scripts/db-contract-verify.ts`/`debug-listings.ts` map to
TypeScript sources. Packets 42/43 keep their historical mentions of the
removed dominance scripts as a record and were left intact.

## Guard added

| File | Change |
| --- | --- |
| `scripts/scriptReferences.ts` | Pure extraction contract: `extractLocalFileTargets` (tsx/node/bash/sh entrypoints including multiple `node --test` targets, plus `--config` values; ignores prose, binaries and non-path arguments), `extractPnpmScriptNames` (workflow `pnpm` invocations; skips binaries, pnpm internals and comments), `unresolvedFileTargets` (existence check with `.js`/`.mjs`/`.cjs`→`.ts`/`.mts`/`.cts` fallback). |
| `scripts/__tests__/scriptReferences.test.ts` | 4 extraction unit tests plus 3 repository guard tests: every `package.json` script file target must exist; every workflow `pnpm <script>` must name an existing script; every workflow file target must exist. Each guard asserts a non-zero number of extracted references so it cannot pass vacuously. |

## Validation

- Focused suite: 7 tests passed.
- `pnpm check`: clean.
- ESLint on the new files: 0 errors, 0 warnings.
- CI: the guard runs in the server project (`scripts/**/*.test.ts`) with the
  Unit & Integration job.

## Register effect

None. B17's local harness (packets 43/44) and hosted-window runbook (packet
45) are unchanged; this packet only protects their script references (and the
rest of the repository) from silent decay.
