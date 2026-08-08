# Database Compatibility Exception Register

**Authority:** `docs/architecture/database-authority-policy.md`

## Current approved exceptions

### Exception ID: DBX-PLE-2B-property-taxonomy-enum-expansion

Status: Approved for the PLE-2B implementation slice

Owner: Property Listify senior product engineering

Approved by Edward on: 2026-08-08, through the PLE-2B migration authorization

Business reason: The manual Property Listing Engine must persist the approved
canonical physical types `townhouse`, `cluster_home`, and `plot`. The existing
`listings.propertyType` enum cannot persist those values, while the public
`properties` projection and canonical search already recognize the townhouse and
cluster values. The change is required to prevent the authoring contract from
falling back to arbitrary JSON or losing type identity.

Canonical authority: `listings.propertyType` remains the authored source
authority. `properties.propertyType` remains a derived public read model. The
runtime mapping `land → plot` is explicit and one-way into the public model.

Exact files: `server/migrations/0002_canonical_property_taxonomy.sql`,
`server/migrations/manifest.json`, `drizzle/schema/listings.ts`,
`shared/property-taxonomy.ts`, `server/listingRouter.ts`, `server/db.ts`, and
`server/_core/databaseAuthority/dataAdapters/common.ts`.

Tables and columns: `listings.propertyType`; the public target checked by
congruency is `properties.propertyType`.

Permitted read direction: Existing `land`, `commercial`, and `shared_living`
values remain readable. Historical `land` values map to public `plot` only when
the authored listing is projected.

Permitted write direction: One additive enum expansion on the owned disposable
worktree database, followed by normal runtime writes through the canonical
listing lifecycle. No direct public-property writes or legacy schema writes are
permitted.

Failure and observability behavior: Migration planning must fail closed if the
manifest, target classification, ownership, or schema lineage is inconsistent.
Projection must fail visibly for an unknown source property type rather than
guessing a public value. The migration is applied once through Database
Authority and is not retried or repaired manually.

Automated evidence: Migration manifest validation, Database Authority migration
plan/apply/readiness/congruency checks, taxonomy compatibility tests, projection
mapping tests, and the focused PLE-2B validation suite.

Expiry or objective removal condition: Retire the exception after all active
manual inventory uses the canonical source vocabulary, historical `land` rows
have been safely classified, and the deferred/legacy authoring values have a
separately approved retirement or migration plan.

Removal workstream: PLE final taxonomy and legacy-retirement convergence.

Existing code containing terms such as `legacy`, `compatibility`, `fallback`,
schema probing, alternate query strategies, or dual-model behavior does not
gain approval from historical presence.

Such code remains audit debt until Edward explicitly approves and registers it,
or an approved workstream removes it.

## Required exception record

Every approved exception must contain:

```text
Exception ID:
Status:
Owner:
Approved by Edward on:
Business reason:
Canonical authority:
Exact files:
Tables and columns:
Permitted read direction:
Permitted write direction:
Failure and observability behavior:
Automated evidence:
Expiry or objective removal condition:
Removal workstream:
```

An incomplete or unregistered exception has no architectural authority.
