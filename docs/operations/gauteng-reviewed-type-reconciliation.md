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

## Azure note-hash discrepancy — 2026-10-30

The founder's read-only result has 48 Places still at the old type/scope but only 47 evidence notes matching the pinned 0111 hashes. This blocks reconciliation. The 48 SQL hashes were checked against the exact notes in `gauteng-place-admission-v0.1`; the hash set is correct. Production was loaded on 2026-10-10, before the reviewed v0.2 package changes committed on 2026-10-25 and the v0.3 corrections committed on 2026-10-27. Those package updates revise all 48 notes from `type=town` to the corrected type, so a full v0.2/v0.3 package load would not explain a 47/48 old-note result. The aggregate count cannot identify the outlier; run query 3 in the Azure read-only SQL file and compare its stored hash to the exact v0.1 and current package row for that ID.

The safe default is to stop. The reconciliation does not skip or overwrite this mismatch: it fails in preflight before starting its update transaction. Do not change the hash allow-list or auto-accept an arbitrary note. If the stored value is a confirmed accidental edit, restore that one row to its exact v0.1 note in a separately reviewed operation, then re-plan. If it matches a known later package value, record that exact state and review a narrowly scoped plan before allowing reconciliation to treat it as already current. The negative rehearsal seeds one deterministic local-only note mismatch; reconciliation must fail, and its verifier must confirm all 48 old type/scope rows and all evidence rows remain unchanged from the seeded state.
