# Place Authority — National Rollout Mission State

This is the single canonical progress tracker for the national Place Authority
mission. Do not create competing trackers.

A new agent or session resumes by reading, in order:

1. `AGENTS.md`
2. `docs/architecture/geography-coverage-contract.md` (active contract)
3. `docs/architecture/database-authority-policy.md`
4. this file

## Mission objective

Deliver one reproducible, evidence-governed, territory-neutral Place Authority
for South Africa. Preserve factual geographic identity, support canonical search
and discovery, handle names and aliases correctly, support evidenced
relationships without fabricating hierarchy, keep Search Areas separate, admit
provinces through one repeatable pipeline, produce deterministic Place identities
and artifacts, and prove every change physically on authorized disposable
databases. Place Authority remains the only geographic identity source.

## Active contract

- `docs/architecture/geography-coverage-contract.md` **v0.5**
- Sections 0–19 are the delivered record. **Section 20 is the binding scope
  contract**: `province / metro_city / locality` are product search-scope
  *categories*, not mandatory levels of the factual containment hierarchy. The
  only mandatory ancestry requirement for a scope is an evidenced chain to the
  province. A locality does not require a `metro_city` ancestor.

## Branch and worktree

- Worktree: `/home/edwardspc/Desktop/Dev/property-listify-main/.worktrees/property-listify-place-authority-slice0`
- Branch: `feat/place-authority-slice0-decision`
- `main` is `ad0c4247` and is never modified by this mission.
- Sibling worktree `property-listify-gauteng-source-authority-closure` is at
  `4356c0f7` with uncommitted work from another workstream. **Do not touch it.**
  The v0.2 source it holds was copied into this branch and is committed here.

## Phase status

| Phase | Scope | State |
| --- | --- | --- |
| 0 | Typed Place Authority contract | closed (`52a8ab15`) |
| 1 | Gauteng scope contract repair | **closed** |
| 2 | Executable Place foundation | **closed** |
| 3 | Territory-neutral onboarding proof | **audit done, refactor outstanding** |
| 4 | Western Cape (Province 2) | **not started — external blocker** |
| 5 | Remaining provinces | not started — depends on Phase 4 |
| 6 | National authority verification | not started |
| 7 | National consumer handoff | not started |

## Current phase

Phases 1 and 2 are complete and physically proven. Phase 3 is partially
complete: the territory-neutrality audit has been performed and its findings are
recorded, but the code refactor it requires is outstanding.

Phase 4 is blocked on governed evidence acquisition. See "Hard blocker" below.

## Phase 3 audit findings (outstanding work)

Territory-specific *data* is permitted and was left alone:

- `server/data/marketIntelligence.ts` is market reference data keyed by province.
  That is data, not architecture.
- `server/_core/databaseAuthority/dataAdapters/searchToLeadScenario.ts` uses
  Gauteng/Johannesburg/Sandton as a fixed scenario. That is a fixture, not
  application logic.

Territory-specific *application logic* was found and must be removed:

- `tools/place-admission/build-gauteng-admission.mjs` hardcodes
  `SOURCE_DIR = data/gauteng-source-authority-v0.2`,
  `OUT_DIR = data/gauteng-place-admission-v0.1`,
  `ADMISSION_VERSION = gauteng-place-admission-v0.1`,
  `REGISTRY_PATH`, `V01_DIR`, and the `gauteng_`-prefixed artifact filenames.
- `server/_core/databaseAuthority/dataAdapters/canonicalPlaces.ts` hardcodes
  `CANONICAL_PLACES_VERSION = gauteng-place-admission-v0.1`, `PACKAGE_DIR`,
  `MANIFEST_PATH` and `REGISTRY_PATH`.

As written, admitting a second province would require a second engine, which
violates the Phase 3 gate. The required change is to introduce one committed
territory registry that maps a territory id to its source authority, admission
version, output directory and artifact filenames, and to drive both the builder
and the materializer from it. Territory data then differs by registry entry
alone, with no new application architecture.

Not yet done. This is the next engineering task and needs no external input.

## Authoritative digests

Gauteng source authority `gauteng-source-authority-v0.2`:

- Source snapshot `14666e91befd11e1aea6b220c520678fbafbfc2c12383392e29c9e727fa0a06e`
- Geography `7bba9cc217b207466916647cb674d637366eb45ed0c7c01b88c62c625e91884e`
- Names `b5021e21df8728416e0bb7d0f7858c824cb9bca4bd382b8f98cbbeed285d79fd`
- Source links `23559b7fd42c139aefbad4174fca3eadcfc7f9e717c5fa86b6d2b5888612dba7`
- Candidate dispositions `73212b62fb2999ae2d785b5c338bc6774e949c49b08de67252a1b6e245348943`

Admitted Place package `gauteng-place-admission-v0.1`:

- Materializer content digest
  `d7859a2e7face1dec4e648bac65a0866b82ef1297178232dbaef2541177adf70`
- 1,488 source identities, **1,466 admitted Places**, 22 merged groups
- 2,476 names, 1,465 `administratively_contains` edges, 4,463 evidence rows,
  2,971 external mappings, 4,350 disposition ledger rows
- **1,436 searchable** (1,096 locality, 339 metro_city, 1 province),
  **69 publishable**, 30 context-only municipalities with no scope
- 89 verified, 1,377 provisional, 720 OSM-only
- Regeneration is deterministic and `minted=0 reused=1466`; Place IDs are never
  remapped.

## Database and migration head

- Migration head: `0099_saved_searches_canonical_place_reference_fk.sql`
- 100 migrations `0000 → 0099`; 39 Place Authority CHECK constraints, all
  enforced; 219 canonical tables.
- `0098` adds the nullable `saved_searches.place_id` column; `0099` adds its
  `ON DELETE RESTRICT` foreign key. They are separate migrations because TiDB
  refuses a single `ALTER` that both introduces a column and adds a dependent
  constraint, and the canonical manifest requires one statement per incremental
  DDL migration.

## Test status

All green at the Phase 3 gate:

- Database Authority static gate **352/352**
- Executable Place behavioural suite **36/36** (includes an exhaustive
  determinism proof over all 1,436 searchable Places)
- Slice 2 admission behavioural probe **39/39**
- Geography coverage probes **1705/1705**
- Admission determinism check passes
- Regression suites: location contract, listing lifecycle, SEO/slug properties 156/156
- typecheck clean, lint 0 errors, build clean, `git diff --check` clean

Physical proof is always performed on a freshly created, owned, disposable
target and the target is disposed afterwards. Never reuse a target to claim a
from-zero proof.

## Unresolved research backlog

These are governed research cases. They are **not** admission defects and must
never be closed by manufacturing a Place:

- Kyalami / Khayalami — quarantined candidate, no accepted source identity
- Sky City — absent from the approved source
- Eden Park, Azaadville — quarantined candidates
- `Reiger Park` (two words) — quarantined; the admitted spelling is `Reigerpark`
- `Broadacres` exact — covered by the admitted `Broadacres AH`
- Missing estates, newly proclaimed extensions, new precincts generally
- Metropolitan-municipality classification: three source records carry
  `proposed_type_hints` naming `metropolitan_municipality` (City of Johannesburg,
  City of Tshwane, Ekurhuleni). They remain `local_municipality` Places. This is a
  Place-classification question requiring its own evidence, deliberately not
  resolved to satisfy a search scope.

The gate for these is **zero unexplained or unsafe admission**, not zero
outstanding research cases.

## Unsupported broad-scope expansion

Exact Place execution is proven. Broad expansion is **not**, and must fail
closed:

- A `metro_city` Place does not expand to every Place in its municipality.
- `Johannesburg` does not expand to all City of Johannesburg localities.
- `Soweto` does not expand to its constituent or market localities.
- Every `search_scope_authorized` flag is 0; `market_association` is
  non-expanding; no generic relationship traversal exists.

Expansion requires explicit governed semantics (evidenced settlement membership,
a governed executable-scope membership projection, or a Search Area).

## Production-only blockers

- **Founder ODbL gate.** 720 OSM-only Places are admitted but may be materialized
  only on a disposable target until the gate clears. The materializer refuses any
  non-disposable target that holds them. This blocks production activation only,
  not engineering.
- No consumer has been switched to Place Authority. Runtime convergence is a
  separate, bounded Phase 7 handoff.

## Hard blocker

**Phase 4 requires governed source evidence for provinces other than Gauteng,
and that evidence does not exist in this repository.**

- The only approved, digest-pinned source authority is
  `gauteng-source-authority-v0.2`.
- The Gauteng builder resolves its source from a Gauteng-specific committed path
  and a Gauteng-specific manifest.
- Admitting any other province therefore requires first building a new
  **source authority**: acquire geoBoundaries/GeoNames/OSM extracts for that
  territory, record provenance and licence classification per record, adjudicate a
  candidate catalogue, and pin it by digest. This is evidence acquisition, not
  application engineering.
- The mission forbids fabricating geographic evidence, and forbids creating a
  Place to satisfy search. A province cannot be admitted without real evidence.

This is an **EXTERNAL BLOCKER**: progress requires obtaining and governing
territory source extracts that are not present and that this mission is not
authorized to synthesize.

Everything reachable without that evidence is either complete or, in the case of
the Phase 3 refactor, recorded with its exact next step. Phases 1 and 2 are
closed and proven. Phase 3 needs no external input and can be completed
immediately; it is blocked only by the Phase 4 evidence gap if the two are
attempted in the wrong order.

## Resolved decisions that must not be reopened silently

1. Place identity is typed and authoritative; the three-level runtime projection
   is a consumer concern, not identity.
2. `province / metro_city / locality` are search-scope categories, not mandatory
   ancestry levels (contract §20.1).
3. A locality does not require a `metro_city` ancestor (§20.2).
4. Municipalities stay factual/context Places and are never re-typed as cities
   (§20.3).
5. `metro_city` is not redefined to mean municipality; the vocabulary is not
   renamed (§20.3).
6. No metropolitan-municipality Place type is introduced to complete a search
   ladder (§20.3).
7. Exact execution and broad expansion are separate capabilities (§20.4).
8. Containment reads child to parent: `from_place_id` is the child,
   `to_place_id` is the parent.

## Exact next action

**Complete the Phase 3 refactor first**, because it is unblocked and makes Phase
4 possible without new architecture:

1. Add a committed territory registry mapping territory id to source authority
   directory, admission version, output directory and artifact filenames.
2. Drive `tools/place-admission/build-gauteng-admission.mjs` (rename to a
   territory-neutral name) and `canonicalPlaces.ts` from that registry.
3. Prove neutrality with a small synthetic non-Gauteng territory that runs
   through the same code and produces an equivalent, digest-pinned package.

Then Phase 4, Western Cape, gated on evidence:

4. Acquire governed Western Cape source evidence and build the equivalent source
   authority, following the documented v0.2 shape. Requires an authorized
   territory extract and a licence/provenance determination.
5. If evidence cannot be obtained, stop and report the blocker with Phases 1-3
   closed and committed.

No further engineering work is blocked. Do not begin consumer convergence, do not
switch any runtime, and do not activate a Search Area.
