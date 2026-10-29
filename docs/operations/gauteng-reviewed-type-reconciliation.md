# Gauteng reviewed type reconciliation — 2026-10-29

**Status:** release draft. No Azure data has been read or changed.

## What changes

Comparing the 0111 Gauteng package with the current admitted package identifies exactly 48 existing Place IDs:

- 41 change from `town` to `suburb`; 7 change from `town` to `locality`.
- All 48 change their derived search scope from `metro_city` to `locality`.
- All 48 have one evidence note updated to describe the reviewed type.
- Search eligibility remains enabled for all 48. Publication eligibility stays the same: 44 remain ineligible and 4 remain eligible; all four are verified.
- Place IDs, names, relationships, mappings, licensing classifications and all eligibility flags stay unchanged.

Search scope affects how the Place is presented and selected in a search. Four verified, publication-eligible Places will be projected as locality routes rather than metro-city routes; review those canonical URLs and SEO output before opening public traffic. The other 44 do not become public guide pages.

The reconciliation does not rewrite listing or other foreign-key references: all 48 Place IDs remain the same. In the disposable fixture the only listing points to the separate Fordsburg duplicate. No Azure reference rows were inspected, so use the read-only checks in [`gauteng-place-azure-read-only-checks.sql`](gauteng-place-azure-read-only-checks.sql) before release.

## Reviewed operation

The adapter pins the historical 0111 package and exact 48-ID set, then checks each live row against both the old and current package. It accepts only the complete old state or the complete corrected state. Missing rows, partial changes, other field drift, or evidence differences stop the operation.

After the verified backup, schema migrations and Fordsburg retirement, the operator runs the read-only plan for `gauteng-type-reconciliation`, reviews its exact digest and source/target row summary, and applies that digest once. The adapter updates only `place.place_type`, `place.search_scope` and the matching `place_evidence.note` rows in one bounded transaction under the canonical Place release lock. It verifies all 96 updated rows before commit. The next step loads the current Places package.

The local rehearsal command is `pnpm db:places:type-reconciliation:prepare`; the protected release path is `db:release:reference:plan/apply/verify --adapter=gauteng-type-reconciliation`. No new Place IDs or eligibility changes are involved. A failure stops the sequence; no automatic retry or down-migration is allowed.
