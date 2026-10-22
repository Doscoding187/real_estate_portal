# B05 dependency and governed setup continuation

Date: 2026-09-25

Status: dependency blocker resolved; governed local setup passed. B05 joined
browser acceptance and regression evidence remain outstanding.

## Source and authority

- Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-b05-agency-member-joined-20260925`
- Branch: `fix/b05-agency-member-joined-reproduction`
- HEAD: `5e4fe9244441e4138a836bc084c8d1e01881bc99`
- Tracked source diff SHA-256: `3e292cce43aafefb20075190bf6064b8e2c22ef1785843873f8dffe43880ea76`
- The six-file accepted B03 correction is unchanged. No B05 product, test,
  package manifest, lockfile, schema, migration, or authority source was edited.
- Classification: local-data workflow; completed apply and setup verification.
- Authority: repository AGENTS.md; Database Authority skill, entry contract,
  operating playbook, authority manifest, operation policy, and active migration
  manifest. The user's continuation authorized dependency installation and
  resuming governed setup, with a stop on an unexpected failure.

The earlier prerequisite-stop record is retained as historical evidence. Its
missing `tsx` condition was resolved by installing the pinned dependencies.

## Exact local target

- Class: `disposable-worktree`
- Database: `listify_wt_b05_agency_member_joined_20260_bb9bf51b1b70`
- Fingerprint: `a741e71c34cbf6b800c49d9067aebfcd2018945810e023448a04fb2fd926078f`
- Ownership key: `bb9bf51b1b707bc9a6719b5e`
- Service: `127.0.0.1:3307`, `/var/tmp/property-listify-1000/mysql-3307`
- Service fingerprint: `2425e54d0472ee5b308127a7c63380733f077ec7531767d6dba21a2c2a9177f2`
- Manifest digest: `93d871e6f8760477f460b8821685d71d212374eb86ddd53bc6e2ccfc30608efc`
- Migration head: `0094_content_topics_primary_key.sql`

## Command sequence

Every command below exited 0. Each stage completed successfully before the
dependent stage started. Full output is retained in the named adjacent files.

| Command | Evidence |
| --- | --- |
| `pnpm install --frozen-lockfile --prefer-offline` | `dependency-install.txt` |
| `pnpm db:authority:status` | `authority-status-initial.txt` |
| `pnpm db:authority:manifest` | `authority-manifest.txt` |
| `pnpm db:authority:context` | `authority-context-initial.txt` |
| `pnpm db:authority:service:start` | `service-start.txt` |
| `pnpm db:authority:service:wait` | `service-wait.txt` |
| `pnpm db:authority:service:status` | `service-status.txt` |
| `pnpm db:worktree:create` | `worktree-create.txt` |
| `pnpm db:migrate:plan` | `migration-plan-before.txt` |
| `pnpm db:migrate:apply -- --accepted-old-head=none --expected-new-head=0094_content_topics_primary_key.sql` | `migration-apply.txt` |
| `pnpm db:schema:congruency` | `schema-congruency.txt` |
| `pnpm db:reference:prepare` | `reference-prepare.txt` |
| `pnpm db:foundation:prepare` | `foundation-prepare.txt` |
| `pnpm db:scenario:prepare` | `scenario-prepare.txt` |
| `pnpm db:reference:verify` | `reference-verify.txt` |
| `pnpm db:foundation:verify` | `foundation-verify.txt` |
| `NODE_ENV=test APP_ENV=test pnpm db:scenario:verify` | `scenario-verify.txt` |
| `pnpm db:readiness -- --purpose=location-discovery` | `readiness-location-discovery.txt` |

Node was v22.22.3; installation used the repository-pinned pnpm v10.4.1 and
completed in 4.7 seconds. The existing package build-script allow-list was
retained. The package manifest and frozen lockfile were unchanged.

Provisioning reported `changed: true` with exact ownership. Migration planning
proved a fresh target with `acceptedOldHead: null` and 95 pending migrations,
including the canonical baseline. Apply used that plan's accepted old head and
expected manifest head, applied all 95 migrations, and exited successfully.
Plan digest: `74b5736029f5ed09e9c69b8577a2e03f6086030ac875ab2cca85bf349fda0554`.

Schema congruency reported no differences. Geography verification reported
9 provinces, 340 cities and 1089 suburbs. Foundation verification confirmed all
three canonical Launch Access products. The scenario verifier used its required
process-scoped test runtime, retaining exact target and capability checks, and
passed contained application verification. No fixture guard was bypassed.

Location-discovery readiness reported `applicationReady: true`, exact target
ownership, canonical schema head, schema congruency, reference/scenario readiness,
and no running, failed, or blocked migration attempts. This readiness purpose
does not evaluate commercial foundation; its separate verifier passed above.

## Handoff

At this setup handoff, the service and exact B05 disposable database remained
available for the joined browser reproduction; the journey and regressions had
not yet run. Current browser/regression results and the completed exact-target
cleanup are recorded in
[the B05 acceptance supplement](../b05-agency-member-joined-2026-09-25-acceptance-supplement.md).

Only canonical migrations and governed data adapters wrote the owned local
target. No protected or remote target was accessed; no production credentials,
credential-bearing URLs, or secrets were printed or retained. Schema authority
is unchanged. B06, B07 final review, merge, deployment, and production activation
were not started.
