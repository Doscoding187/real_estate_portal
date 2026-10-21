# The city scope is a founder decision, not a derivable fact

**Branch:** `feat/national-geography-search-authority-20261020`
**Base:** `origin/main`
**Date:** 2026-10-21
**Target:** disposable worktree target `listify_wt_national_search_20261020_a0b9d5b4bf9c`
(fingerprint `a3017173db2650d8`, manifest head `0148`, schema congruent)

## The question

A city-scoped public search must answer "which places are inside this city". The Place Authority
asserts a municipality edge, not a town-cluster edge. This record establishes what the canonical
authority actually holds, so the membership rule can be decided rather than guessed.

## What the Place Authority holds, measured

Every relationship in the Place Authority, in all nine provinces:

| Measure | Count |
| --- | --- |
| `place_relationship` rows in the live target | 17,655 |
| of those, `administratively_contains` (the municipality edge) | 17,655 |
| `settlement_within` (a town-cluster edge) | **0** |
| edges with `search_scope_authorized = 1` | **0** |

The per-territory admission packages agree: Gauteng 1,465 edges, Eastern Cape 5,083, Western Cape
1,861, KwaZulu-Natal 2,089, Northern Cape 1,551, Free State 1,543, Limpopo 1,668, Mpumalanga
1,044, North West 1,351 — every one of them `administratively_contains`, none authorised.

**There is no town-cluster edge anywhere in the Place Authority.** A city scope and its localities
are siblings under a municipality container, not parent and child.

## Why it is not missing data

The source authorities carry the municipality edge and say, in the source itself, that the
canonical parent was not invented where it is not known:

```json
"administrative_relationships": [
  { "administrative_level": "adm2", "canonical_parent_not_invented": true,
    "relationship_type": "administrative_containment", "target_name": "City of Johannesburg" }
]
```

The Western Cape source authority carries `adm2: "City of Cape Town"` and `adm3: "City of Cape
Town"` — the municipality and the city are the same entity in the source, and there is no level
below it.

And the territory manifest's parent context registry states the governed position directly:

> Deterministic municipality → runtime market parent. **Multi-town districts deliberately register
> no default; their localities queue rather than guess.**

That registry holds exactly two entries, both founder-reviewed:

| Municipality | Runtime market parent | Evidence class |
| --- | --- | --- |
| City of Johannesburg | `gauteng/johannesburg` | `founder_reviewed_bounded_slice_plus_geoBoundaries_adm1_containment` |
| City of Tshwane | `gauteng/pretoria` | `founder_reviewed_bounded_slice_plus_geoBoundaries_adm1_containment` |

and it deliberately registers **no default** for `Ekurhuleni`, `Sedibeng` and `West Rand` — the
multi-town districts, where a single municipality holds several town clusters and a locality
cannot be attributed to one of them from the municipality edge.

## So the membership is a founder decision, already made twice

The city→suburb membership is not derivable and is not an oversight. It is a founder decision
that has been made for two metros, as a founder-reviewed bounded slice, and deliberately left
unmade for the multi-town districts. The review queue that holds the unmade cases is
`data/geography-coverage-v0.1/output/gauteng_review_queue_v0.1.jsonl` — 116 rows for Gauteng, of
which 11 carry the reason `awaiting_accepted_parent_edge`. That queue is the coverage queue and
is **not** a complete town-cluster queue; the true size of the remaining decision has to be
measured per province.

## The consequence, stated plainly

- A city-scoped Place Authority search returns the city scope, not its suburbs. This is not a
  bug in the search and must not be papered over in code: `canonicalPlaceSearchMembers` says
  "v1 has no reviewed descendant city membership. Neither containment nor
  municipality/market associations authorize widening a city or locality."
- A province-scoped search and a locality-scoped search are both correct today.
- The published projection carries the founder decision for Gauteng, which is why a published
  place keeps the runtime handle it is searched by. The transitional handle is therefore not
  debt to be cleaned up on a schedule; it is holding a decision that has not been made elsewhere.

## Where the decision goes when it is made

The canonical model already has the place for it, and it is unused:

- `settlement_within` is already a relationship type for exactly this meaning — administrative
  containment, settlement membership, market association and succession never share one
  ambiguous generic meaning.
- `place_relationship.search_scope_authorized` defaults to 0 and is granted **per edge** by the
  materializer when a contract decision permits it. `PLACE_RELATIONSHIP_SEARCH_AUTHORIZED_TYPES`
  is deliberately empty: "No relationship is implicitly a search expansion."

So a decided membership is admitted as a `settlement_within` edge with its own evidence class,
authorised per edge, and released through the place release. The search projection then reads the
authorised edges, the transitional runtime handle retires, and the published projection can be
retired by a separate reviewed migration.

## The three options, and what each costs

| | Decision | Cost | What it buys |
| --- | --- | --- | --- |
| **A** | Admit the founder-reviewed membership per province, as `settlement_within` edges | A founder review project per province, sized by each province's queue | A city-scoped national search; the projection retires; the transitional handle goes |
| **B** | Launch with the city scope as it is | Nothing | A national search where a city search returns the city and the customer narrows to a suburb or searches the province. Honest and shippable, but a Gauteng customer gets a wider city search than a Cape Town customer, because the projection carries the Gauteng slice |
| **C** | Derive the membership where a container holds exactly one city scope | A measurement | If the structure supports it, the national metros need no founder decision at all. Must be measured, not assumed |

## Recommendation

Measure **C** first, because it is free if it holds and the structure suggests it may: a
container that holds exactly one city scope and its localities may make that city's membership
derivable with no founder decision. Then run **A** for what C does not cover, province by
province, in the same decision class as the two metros already decided, and launch on **B**
meanwhile.

**Not on the table: inferring membership in code.** A city widened to its descendants by
containment inference, or by a market association, would silently widen every city search in the
country, which is exactly what D12 and the geography contract forbid.

## Evidence

- `scripts/verify-published-urls.ts` — 1,412 of 1,413 published location URLs reproduced exactly,
  0 different, 1 governed exclusion.
- `server/__tests__/contract.published-place-registry.test.ts` — the registry covers every
  published location exactly once, and the public place search offers each of them at the URL we
  publish.
- The relationship counts above were measured on the disposable worktree target with
  `pnpm db:authority:status` reporting `manifest-head-ready`, `schema-congruent`,
  `canonical-foundation-ready` and `Application Readiness: ready`.
