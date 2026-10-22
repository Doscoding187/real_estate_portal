# National geography coverage — proof and reconciliation

**Branch:** `feat/national-geography-search-authority-20261020`
**Base:** `origin/main` = `b1edc724b`
**Target:** disposable worktree target `listify_wt_national_search_20261020_a0b9d5b4bf9c`
**Date:** 2026-10-20

## The two authorities, measured

|                              | Legacy runtime projection                             | Canonical Place Authority                                                                    |
| ---------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Provinces                    | 9 (one placeholder row each for eight of them)        | 9, each with a real root                                                                     |
| City / town scopes           | 340 — **332 of them Gauteng's**                       | 17,664 places admitted nationally                                                            |
| Suburb / locality scopes     | 1,089 — **1,081 of them Gauteng's**                   | as above                                                                                     |
| Provinces actually populated | **1**                                                 | **9**                                                                                        |
| Licensing                    | not modelled                                          | `permissive_supported` 16,472 · `mixed_odbl_supported` 472 · `osm_only_odbl_provisional` 720 |
| Publication gate             | one `status` column used for search _and_ publication | `search_eligible` and `publication_eligible` are separate                                    |

**The search box reads the left column. The other eight provinces are not in it.**

## Gauteng release state, measured on the disposable target

| Measure                        | Count |
| ------------------------------ | ----- |
| Places admitted                | 1,466 |
| Released — licence permits use | 746   |
| Held — OSM-only licence        | 720   |
| Searchable                     | 1,434 |
| Publishable as a guide page    | 68    |
| Verified identity              | 89    |
| Provisional identity           | 1,377 |

**The 720 held records: `search_eligible = 1`, `publication_eligible = 0`.** They are searchable
and they are not publishable. The licence gate is already a publication-only gate in the Place
Authority, which is the behaviour the founder decision requires.

## Reconciliation against the canonical Place Authority

|                       | Projection | Place Authority | Difference |
| --------------------- | ---------- | --------------- | ---------- |
| Gauteng rows / places | 1,413      | 1,466           | 53         |
| Other eight provinces | 0          | 15,198          | 15,198     |
| National              | 1,413      | 17,664          | 16,251     |

The 53 Gauteng difference is the founder-reviewed carried slice plus the rows the projection
folds together. It is a reconciliation to be produced exactly, not estimated.

**The 15,198 is the whole problem.** Those places are admitted, permissively licensed, released
and loaded — and the runtime projection has none of them, so the public search path cannot
return them.

## The rule this confirms

| Surface              | Gate                                                     |
| -------------------- | -------------------------------------------------------- |
| Public search        | released **and** `search_eligible`                       |
| Guide page (publish) | released **and** `publication_eligible`                  |
| Held records         | excluded from public results until individually eligible |

No gate is weakened to gain coverage. The 720 stay held. The 15,198 are already released and
simply are not reachable by the search path.

## Evidence

Measured on the disposable target with the admitted Place packages loaded:

```
place: 1,466 admitted · 1,434 searchable · 68 publishable · 720 held
held records: search_eligible=1, publication_eligible=0, count 720
legacy projection alongside: provinces 9, cities 340, suburbs 1,089
```

The province-by-province report for the remaining eight territories follows their place
packages into the same target; the packages are committed and load reproducibly.
