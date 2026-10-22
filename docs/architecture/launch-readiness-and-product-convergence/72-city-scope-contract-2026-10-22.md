# The city scope contract: uniform everywhere, narrow by default

**Branch:** `feat/suburb-first-search-ux-20261022`
**Base:** `origin/main` (includes the merged national place discovery work, PR #673)
**Date:** 2026-10-22
**Target:** disposable worktree target `listify_wt_suburb_first_search_20261022_53581aab324f`
(fingerprint `840e8d36baa6bb48`, manifest head `0148`, schema congruent, foundation ready)

## Decision

**A city is a discovery target, not a property-search target. A locality and a province are
property-search targets. One rule, every province, from launch.**

| Customer selects | What happens | Authorised scope |
| --- | --- | --- |
| A locality (suburb, town, village) | straight to listings | the locality itself — works in every province today |
| A province | straight to listings | every place in the province — works in every province today |
| A city or metro | **discovery** — the city's areas are offered so the customer drills down | no property search unless a city scope is separately authorised |

Where a city scope *is* authorised — today, the founder-reviewed published slice for the 269
Gauteng cities that have members — the city's page keeps an explicit "search for sale in
Johannesburg" action. The rule is the same everywhere; only the *availability* of that extra
action differs, and it is visible rather than silent.

## Why, measured

### A city-scoped Place Authority search returns nothing

`canonicalPlaceSearchMembers` returns the city place itself for a non-province scope, and a
listing's canonical place is its own locality (`server/db.ts:2440`, `assignment.execution.placeId`).
So a city-scoped Place search matches only listings placed at the city record, and not the
listings in the city's suburbs. **"A city search returns the city only" is not a narrow scope, it
is an empty result set.** It cannot be the national standard.

### The municipality shortcut is refuted at set level

`scripts/measure-city-scope-members.mts`, joined by canonical place identity through the
published-place registry, so no name matching is involved:

| Scope candidate | Places |
| --- | --- |
| B — the published city's published places | **1,077** across 331 published cities |
| C — the municipality container's localities | **82,267** |
| in both | 1,068 |
| only in B | 9 |
| only in C | **81,199** |

C is 76 times wider. Per city, joined by identity:

| City | B published | C container | in both | only B | only C |
| --- | --- | --- | --- | --- | --- |
| Johannesburg | 381 | 385 | 380 | 1 | 5 |
| Pretoria | 248 | 249 | 244 | 4 | 5 |
| Alberton | 14 | 293 | 14 | 0 | **279** |
| Centurion | 1 | 249 | 0 | 1 | **249** |
| Diepsloot / Soweto / Randburg | **0** | 385 | 0 | 0 | **385** |

Selecting "Alberton" would return 293 places instead of 14. Selecting "Diepsloot" would return the
whole City of Johannesburg. C is only nearly right for the two founder-reviewed metros, and even
there it is not equal.

### The published geography publishes 63 city rows with no members

Diepsloot, Soweto, Randburg, Discovery, Albertynsville, Chartwell, Doornkop and the rest are
published as city rows with no suburbs at all, in the published projection and in the Place
Authority alike. Their membership is absent from the source data, not undecided. **A customer who
types "Diepsloot" today gets a location with zero properties.** That is a live product bug,
separate from the scope question, and it needs its own source of membership.

### The municipality edge is still the right edge for discovery

The container's localities are the areas a customer can drill into, and they are canonical and
available in every province today. Offering them as *search targets* asserts nothing: each is
searched on its own identity. **Using an edge to offer a customer a choice is not the same as
using it to widen a scope**, and only the second one needs an authorisation.

## What this removes from the launch path

The 13,920-row national town-cluster review is **not a launch prerequisite**. It becomes a
per-city, on-demand authorisation: when a customer in a given city wants to search the whole
city, that city's membership is reviewed and authorised, and the action appears on that city's
page. The review shrinks to the cities that ask for it.

## What this does not fix

- The 63 empty main places remain empty. Their membership is absent from the source data and
  needs a source, not a decision.
- A customer outside Gauteng cannot yet search a whole city in one action. They drill to a
  locality, which is the narrower behaviour the product wants, but it is still a capability gap.
- Gauteng's city scope is wider than the national behaviour, because Gauteng's slice was reviewed
  and the others have not been. That difference is explicit on the page and is the honest state.

## Evidence

- `scripts/measure-city-scope-members.mts` — the set-level comparison above, on the disposable
  worktree target.
- `server/services/canonicalPlaceSearchService.ts` — `canonicalPlaceSearchMembers`, the reviewed
  city-to-suburb membership rule.
- `server/db.ts:2440` — a listing's canonical place is its own locality.
- `docs/architecture/launch-readiness-and-product-convergence/70-city-scope-membership-is-a-founder-decision-2026-10-21.md`
  — the membership is a founder decision, made for two metros and deferred elsewhere.
