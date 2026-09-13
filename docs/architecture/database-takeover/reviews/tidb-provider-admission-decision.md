# TiDB provider admission decision

Status: implementation required; this record does not authorize a protected
database migration.

The current offline audit intentionally refuses nine CHECK/FK overlaps. TiDB
metadata cannot prove whether a `NO ACTION` relationship was authored with an
explicit action clause, and TiDB rejects CHECK constraints that depend on FK
columns when an action clause is present. MySQL acceptance therefore does not
admit the current DDL for the deployment provider.

The future state is to preserve the relational and deletion semantics while
making the FK action provenance provider-compatible through a new, forward
migration. Historical migrations must remain unchanged. The migration must:

1. Reconcile existing rows and record a precondition that all affected foreign
   keys are present before changing them.
2. Drop and recreate only the affected keys with omitted action clauses where
   the intended behavior is restrictive/no-action.
3. Preserve cascade behavior only where the domain lifecycle explicitly treats
   the child as disposable with its parent. The affected billable-account and
   Land-claim relationships require a domain decision before migration design;
   they must not be silently converted.
4. Keep CHECK expressions unchanged and prove them after the FK transition.
5. Run the migration against a TiDB probe/database and the disposable MySQL
   target, followed by schema congruency and the complete authority suite.

The affected groups are:

| Area | Required decision |
| --- | --- |
| `catalogue_publishers` | Preserve restrictive developer-organisation ownership; prove omitted-action DDL. |
| `development_supersessions` | Preserve source/replacement and actor audit references; prove restrictive/no-action DDL. |
| `land_claims` | Decide whether deleting a parcel/asset may delete a claim or whether claims are retained as evidence. |
| `land_conflict_cases` | Preserve conflict evidence and verify the current no-action provenance. |
| `location_provider_mappings` | Preserve restrictive geography references and verify omitted-action DDL. |
| `billable_accounts` | Decide owner lifecycle semantics for agency, developer, and user owners before changing cascade behavior. |

No provider admission claim is made until the domain decisions, migration,
TiDB execution evidence, and MySQL congruency evidence all exist.

The runtime census confirms that deletion currently relies on database cascade
behavior: `agencyRouter.delete` describes related-record cleanup as cascade,
and `deleteUserById`/the user-admin delete path issue a direct user delete.
The runtime now refuses agency deletion after an agency billable account exists,
and refuses deletion of an agent user after an agent billable account exists;
these guards are covered by authority contracts. Therefore a provider migration
cannot simply replace cascades with restrictive keys. Those paths need explicit,
transactional retirement/cleanup workflows first, with audit and
billing-history retention rules tested before the FK transition is implemented.
