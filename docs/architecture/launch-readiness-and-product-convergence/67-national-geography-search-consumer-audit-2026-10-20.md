# Consumer audit — legacy geography projection readers

**Branch:** `feat/national-geography-search-authority-20261020`
**Base:** `origin/main` = `b1edc724b`
**Date:** 2026-10-20

## Why this audit exists

The runtime projection in `provinces` / `cities` / `suburbs` holds **Gauteng only**: 332
city scopes and 1,081 locality scopes. Every other province has one placeholder row. The
canonical Place Authority holds all nine provinces. Public search therefore has two
authorities with two different coverages, and a customer can find a place in one journey
and not in another.

This audit classifies every reader of the projection, its dependency on the projection, its
migration risk, and whether it must move before national discovery works. It does **not**
assume that all readers move together.

## The two search paths that already exist

| Path                                  | Authority         | Coverage               | Used by                                                                                                       |
| ------------------------------------- | ----------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `placeAuthority.discover`             | Place Authority   | **All nine provinces** | The listing form's canonical place selector (`client/src/components/location/CanonicalPlaceSelector.tsx:257`) |
| `location.searchDiscoverySuggestions` | legacy projection | **Gauteng only**       | The city guide's suburb finder (`client/src/components/city-guide/CityGuideJourney.tsx:48`)                   |

Public property search already accepts a `canonicalPlaceId` and resolves it through the Place
Authority (`server/services/publicSearchService.ts:491`). The legacy `locationId` path is the
fallback for a numeric runtime identity.

## Classification

**Must move for national discovery** — these decide what a customer can find.

| #   | Consumer                                       | Reads                           | Risk                                                                          | Why it must move                                                                                                                                                                                                      |
| --- | ---------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `server/services/searchDiscoveryService.ts`    | provinces, cities, suburbs      | **Low** — a read-only suggestion query with an existing result shape          | The suburb finder and the location picker's suggestions are Gauteng-only. A customer in Cape Town finds nothing.                                                                                                      |
| 2   | `server/services/locationResolverService.ts`   | provinces, cities, suburbs      | **Medium** — it is the public search scope resolver and refuses ambiguity     | A slug or numeric location id resolves only to a Gauteng place. It is also the authority for refusing an ambiguous or widened scope, so its rules must be preserved exactly.                                          |
| 3   | `server/services/locationPagesService.ts`      | provinces, cities, suburbs      | **Medium** — it backs the province, city and suburb pages and the suburb grid | The guide's suburb grid and every suburb page are populated from the projection, so a guide outside Gauteng shows an empty suburb directory.                                                                          |
| 4   | `server/services/listingLocationResolver.ts`   | provinces, cities, suburbs      | **Medium** — it is the listing authoring path                                 | The listing form must resolve a place the same way search does, or an agent lists in a place that search cannot find. It already resolves a `canonicalPlaceId` first, so the legacy branch is the fallback to retire. |
| 5   | `server/services/cityGuideDiscoveryService.ts` | via `geographyAuthorityService` | **Low** — a single query behind one procedure                                 | The city guide list is what a guide offers as destinations. Outside Gauteng it is empty.                                                                                                                              |
| 6   | `server/services/provinceGuideService.ts`      | via `geographyAuthorityService` | **Low** — already centralised                                                 | The province guide's place links. A province outside Gauteng links to nothing.                                                                                                                                        |

**Can move later** — these do not decide discoverability.

| #   | Consumer                                                                                         | Risk               | Note                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7   | `server/services/locationInsightsService.ts`                                                     | Low                | Suburb insight reads. Content, not findability.                                                                                                                                                                                                          |
| 8   | `server/services/homeMarketInsightsService.ts`                                                   | Low                | Homepage market panels.                                                                                                                                                                                                                                  |
| 9   | `server/services/priceInsightsService.ts`                                                        | Low                | Price panels, scoped to a selected place.                                                                                                                                                                                                                |
| 10  | `server/services/propertySearchService.ts`                                                       | Medium             | Already carries 18 Place references; the suburb read is a narrow join.                                                                                                                                                                                   |
| 11  | `server/services/agentPublicProfileService.ts`                                                   | Medium             | Agent coverage areas. Already has 8 Place references.                                                                                                                                                                                                    |
| 12  | `server/services/landWorkflowService.ts`                                                         | Medium             | Land authoring and public reads.                                                                                                                                                                                                                         |
| 13  | `server/services/sharedLivingAuthoringService.ts`                                                | Medium             | Already has 12 Place references.                                                                                                                                                                                                                         |
| 14  | `server/services/sharedLivingPublicService.ts`                                                   | Medium             | Shared-living public reads.                                                                                                                                                                                                                              |
| 15  | `server/locationRouter.ts`                                                                       | Medium             | A large public surface. It already has 14 Place references, so much of it is ready.                                                                                                                                                                      |
| 16  | `server/enhancedLocationRouter.ts`                                                               | Medium             | A second location surface with no Place references. It needs its own decision.                                                                                                                                                                           |
| 17  | `server/db.ts`                                                                                   | **High**           | The listing write path and the public projection copy. It already has 4 Place references and clears the legacy handles when a canonical Place is used.                                                                                                   |
| 18  | `server/services/locationAutoPopulation.ts`                                                      | **Do not migrate** | This path writes provider observations into the projection. The coverage contract classifies it **RETIRED** with an exit condition, and states that a provider observation can never create or promote a public geography row. It is retired, not moved. |
| 19  | `scripts/check-location-data.ts`, `scripts/check-provinces.ts`, `scripts/test-location-pages.ts` | Low                | Diagnostics. They report on the projection and must be rewritten or retired with it.                                                                                                                                                                     |

## The minimum safe migration

Edward's priority: national discoverability first, and the 17 individual consumer switches
only where they are prerequisites.

The minimum safe migration is therefore **the six consumers marked "must move"**, and within
those, the smallest change that unifies the experience:

1. **One suggestion authority.** `location.searchDiscoverySuggestions` resolves through the
   Place Authority and keeps its existing result shape, so no client contract changes. The
   legacy projection read becomes the fallback, not the default.
2. **One scope resolver.** `locationResolverService` keeps its exact refusal rules — an
   ambiguous place is still refused, an unknown place is still not widened — and gains the
   Place Authority as the source it resolves from.
3. **One place page source.** `locationPagesService` reads the place's identity from the
   Place Authority and keeps the projection only for the fields the Place Authority does not
   carry.

## Rules that must not move

- **Only released and searchable places may appear in public search.** The release policy
  holds `osm_only_odbl_provisional` identities, and the 720 held Gauteng records must not
  leak into a public result. The `search_eligible` flag and the licensing gate are read
  exactly as the admission builder sets them.
- **No gate may be weakened to gain coverage.** Licensing, source evidence, spatial confidence
  and boundary conflict keep their current meaning.
- **Identity and classification are corrected separately.** A township, suburb, town or
  settlement keeps the identity and display label its source supports. Nothing is
  reclassified by name, and nothing is moved under a nearby city to make a count work.
- **A place is never widened.** A selected place resolves to that place's exact scope. The
  Place Authority's own scope policy already refuses to widen a city or locality to its
  descendants.

## Rollback

The migration is confined to six read paths plus one procedure. Each is behind a single
resolution point, so a rollback is a revert of that consumer to the projection read. The
projection is not removed as part of this work, so the fallback stays available until every
consumer has moved and the projection is retired separately.

## The bridge that does not exist, and what it forces

The legacy tables carry a `place_id` column in the schema (`drizzle/schema/locations.ts:35`
for provinces, `:63` for cities, `:142` for the flat `locations` table). Measured on the
disposable target:

```
provinces  9 rows, 0 with a place_id bridge
cities   340 rows, 0 with a place_id bridge
suburbs 1089 rows, no place_id column at all
city rows that resolve to a canonical Place: 0
```

The two authorities are not merely uneven, they are **disconnected in the database**. There is
no pointer from a runtime row to its Place, in either direction.

**What this forces.** The public discovery contract carries a numeric runtime handle —
`canonicalLocationId` is `province:3`, `city:42`, `suburb:91` — and the client compares a
result's parent against the guide's own numeric city id
(`client/src/lib/cityGuideDiscovery.ts`, `parentCanonicalLocationId === 'city:' + cityId`).

For the 15,198 places outside Gauteng there is no numeric handle, because the numeric handle
_is_ the projection and the projection does not contain them. A contract-preserving switch is
therefore not possible for them: there is no id to preserve.

**The end state the migration must reach:** the canonical handle in the public discovery
contract becomes the Place id (`pl-place-01-…`). The URL contract is unaffected, because
`buildLocationDiscoveryPath` is slug-based and the slug chain comes from
`place_relationship`. The listing form already selects places by Place id through
`CanonicalPlaceSelector` and `placeAuthority.discover`, so this is the identity the product
already uses when an agent lists a property — it is the consumer surfaces that still use the
older one.

This is the one place where the instruction to preserve existing API contracts cannot be met,
and the reason is measured rather than assumed.
