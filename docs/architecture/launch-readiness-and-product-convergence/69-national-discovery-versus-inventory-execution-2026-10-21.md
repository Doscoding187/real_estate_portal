# National place discovery is national; national inventory search is not yet

**Branch:** `feat/national-geography-search-authority-20261020`
**Base:** `origin/main`
**Date:** 2026-10-21

## The two halves of "national search"

Discovery and inventory execution are two different questions, and only one of them is national
today.

| | Authority | Coverage | Status |
| --- | --- | --- | --- |
| **Discovery** — what a customer can find | Canonical Place Authority | 17,664 places, all nine provinces | **National** |
| **Execution** — what a scoped search returns | The published runtime projection | Gauteng only, plus the province memberships the Place Authority can prove | **Gauteng, and narrower for a city** |

A customer in Cape Town can now find a place, and every published Gauteng URL is reproduced
exactly. A customer who then searches *within* a city outside Gauteng does not yet get the city's
suburbs.

## Why, measured

`server/services/canonicalPlaceSearchService.ts` resolves a Place scope to the members the
search may return. For a province it returns every place in the province. For a locality it
returns that locality. For a **city** it returns the city itself, and the code says why:

> v1 has no reviewed descendant city membership. Neither containment nor
> municipality/market associations authorize widening a city or locality.

So a city-scoped Place Authority search does not include the city's suburbs. The published
projection does, because a city row in `cities` owns its suburb rows. Switching the search
execution scope wholesale would therefore narrow every city search in the country, which is the
opposite of a national launch.

## What this work did about it

The public search execution still resolves a city scope through the published projection, and a
published place carries the runtime handle it is searched by
(`server/services/nationalPlaceSearchService.ts`, `runtimeLocationId`). The Place Authority
identity is the canonical handle and is what the location pickers carry and what the published
URL is bound to. The runtime handle is the transitional query handle, and it is absent for every
place the projection does not carry.

A place the projection does not carry is searched through the Place Authority, which the search
contract already accepted (`canonicalPlaceId`).

**The consequence to be honest about:** a city outside Gauteng can be found and selected, and the
search that follows returns that city rather than its suburbs. A suburb outside Gauteng, a
province and a local place search correctly. The published Gauteng geography searches exactly as
it did before.

## What closes the gap

The reviewed city-to-suburb membership rule in the Place Authority. Until the Place Authority
asserts, for a city scope, which places it contains, the search execution cannot read the Place
Authority for a city without narrowing the result. That is a data and adjudication workstream,
not a code change, and it must not be worked around by widening a city to its descendants in
code.

**Removal condition for the transitional handle:** the runtime handle is removed when the search
execution reads the Place Authority for every scope, which is when the reviewed city-to-suburb
membership exists.

## The published-URL position, measured

`scripts/verify-published-urls.ts`, on the disposable worktree target:

```
Published location URLs checked : 1413
Reproduced exactly              : 1412
Different URL                   : 0
Not returned by search          : 1
```

The one that is not returned is the Sandton Convention Centre, which the Place Authority marks
not searchable. A place that is not searchable must not appear in a public result, so that is a
governed exclusion and not a gap.
