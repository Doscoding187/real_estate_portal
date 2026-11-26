# Runtime grant plan bound to migration 0200

**Status: review plan and tooling only. Nothing here connects to a database, grants or revokes until a separately approved release run.**

This plan covers the two application tables created by migrations 0199 and
0200 for provider website onboarding. It is bound to the 201-entry migration
manifest ending at `0200_services_provider_credentials.sql`, manifest digest
`19c5a60156f850cca36567ad47f00938d544070d89c309d870fd135289b0acc2`, and the
227-table canonical model digest
`4bf6f12700b27b86b5b38119223be245681a3c4ff1c1c1eccf555a65f49df23d`.

Migration 0198 only adds columns to `service_provider_profiles`, a baseline table
already covered by the table-scoped runtime grants of the 0094 provisioner. It
needs no new grant. The post-apply probe confirms this.

## Operation matrix (runtime role `propertylistify_app_runtime` only)

| Table | Runtime privileges | Evidence in source |
| --- | --- | --- |
| `service_provider_projects` | SELECT, INSERT, UPDATE, DELETE | `server/services/servicesEngineService.ts`: select 1132,2992; update 2809,2900,3022; insert 2917; delete 2965 |
| `service_provider_credentials` | SELECT, INSERT, UPDATE | `server/services/servicesEngineService.ts`: select 1147,3122,3177,3195; insert 3088; update 3203. No SQL DELETE call site. |

No grant for the worker, read-only or migration roles. No database-wide grant,
DDL privilege or `GRANT OPTION`.

## Tooling

- Offline plan: `pnpm db:runtime-grants:0200:plan` (source-bound, no apply authority).
- Fixed apply plan and acknowledgement: `pnpm db:runtime-grants:0200:apply-plan`.
- Apply and rollback (`runtime-0200-grant`, production, bootstrap-admin, protected
  target, exact plan digest and acknowledgement): `db:runtime-grants:0200:apply` and
  `db:runtime-grants:0200:rollback`. Each refuses unless the planned privileges are
  absent (apply) or all present (rollback), and verifies after == before +/- exactly
  the plan.
- Read-only probe: `pnpm db:runtime-grants:0200:probe` (selects from every table,
  reports SHOW GRANTS; writes nothing).

The 0197 grants are already applied in production. The 0197 apply path now
refuses on this tree by design (accepted schema source changed).

## Release order

Migrations 0198-0200 must be applied and the ledger at 0200 before the grant
apply (it verifies ledger and physical schema congruence). Then probe.
