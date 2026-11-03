# 63 — Single Geography Authority: Decision, Retirement Plan and the Verification Defect

**Date:** 2026-10-20
**Worktree:** `.worktrees/property-listify-guide-pilot-seo-20261020` (branch
`feat/guide-pilot-seo-publication-20261020`, base `origin/main` = `cd62988fb`)
**Type:** Architecture decision, retirement inventory and the first consumer switch. No schema,
migration, seed, fixture or protected database operation in this packet.

## Superseding pre-launch direction — 2026-10-27

Edward confirmed that the application is still pre-launch and should have one executable
geography path: the canonical Place Authority. Retire the legacy geography routes, consumers,
runtime projections, tables and code as part of the cutover; do not preserve compatibility
aliases, redirects, fallback matching or parallel geography reads. This supersedes the staged
retirement recommendation below. The canonical Place ID is the only geography match key;
display labels remain presentation data. Development geography is available only through a
reviewed assignment and may be null until assigned.

The 2026-10-27 application cutover authors the required canonical schema and retirement
migrations but does not apply them. Database release remains a separately governed operation.

## Founder directive

Edward's instruction of 2026-10-20:

> There were what we had as legacy code. We are going to retire it. We cannot have two concurrent
> geography authorities. We worked on the newest version, the national Place Authority. Let's start
> afresh with the new geography, connect everything to it, and retire the legacy.

This packet records that directive as the authority for the retirement programme, states the
correct sequence, corrects one instinct in the directive, and delivers the first mechanical
step of the switchover.

## Decision

**The Place Authority is the single geography authority of Property Listify.** The
`provinces` / `cities` / `suburbs` runtime projection is a compatibility read of that authority
and is retired. Nothing may extend it, and no new feature may read it.

## The one correction to the directive: retire by switching, not by deleting

"Delete the legacy code" is right as an outcome and wrong as a first action. Deleting the
projection first would break:

- **every listing's geographic handle** — `properties.provinceId` / `cityId` / `suburbId` and
  `listings.provinceId` / `cityId` / `suburbId` still reference it;
- **public search** — `server/services/locationResolverService.ts` resolves a slug to a place
  for every search;
- **the location search box** — `server/services/searchDiscoveryService.ts`;
- **the guide and location surfaces** — the province guide's place links, the city guide
  directory and the suburb grid.

It would also break the _vocabulary_. The runtime executes three scopes
(`province` / `metro_city` / `locality`). The legacy projection is three levels
(`province` / `city` / `suburb`). The mapping is not one-to-one and is deliberately not
guaranteed. A "city" row is not always a `metro_city` Place, and a "suburb" row is not always a
`locality` Place.

**The sequence is therefore: switch the consumers → prove the projection is unreferenced →
retire the projection.** This packet starts the switch.

## The retirement inventory

Twenty runtime files read the projection directly. Nineteen remain outstanding, and the
allow-list is now enforced by a contract test, so the inventory can only shrink.

| Consumer                                                                                                                                  | Outstanding work                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/db.ts`                                                                                                                            | Listing authoring and the public projection copy. Already writes `canonicalPlaceId`; the legacy handles must be cleared once every listing is Place-bound. |
| `server/locationRouter.ts`, `server/enhancedLocationRouter.ts`                                                                            | Public location reads.                                                                                                                                     |
| `server/services/locationResolverService.ts`                                                                                              | Slug → place resolution for public search. The single most important consumer to switch.                                                                   |
| `server/services/searchDiscoveryService.ts`                                                                                               | The location search box.                                                                                                                                   |
| `server/services/locationPagesService.ts`                                                                                                 | Province, city and suburb page data, and the suburb grid.                                                                                                  |
| `server/services/locationInsightsService.ts`, `homeMarketInsightsService.ts`, `priceInsightsService.ts`, `propertySearchService.ts`       | Insight and search reads.                                                                                                                                  |
| `server/services/agentPublicProfileService.ts`                                                                                            | Agent coverage-area resolution.                                                                                                                            |
| `server/services/listingLocationResolver.ts`, `landWorkflowService.ts`, `sharedLivingAuthoringService.ts`, `sharedLivingPublicService.ts` | Authoring and public reads.                                                                                                                                |
| `server/services/locationAutoPopulation.ts`                                                                                               | Location auto-population.                                                                                                                                  |
| `scripts/check-location-data.ts`, `check-provinces.ts`, `test-location-pages.ts`                                                          | Diagnostics.                                                                                                                                               |

**Delivered in this packet:** `server/services/geographyAuthorityService.ts` is now the only
place the guide read path may read the projection. `provinceGuideService` and
`cityGuideDiscoveryService` no longer import the location tables. Their existing contracts pass
unchanged, so the switch is behaviour-preserving.

**Guard:** `server/__tests__/contract.geography-authority-single-read.test.ts` fails when any
file outside the recorded allow-list reads the projection directly. When the next feature —
Services, Explore — touches geography, it either uses the authority service or it fails the
build. This is the answer to "when we work on Explore, it will still carry the legacy code".

**Registered:** `DBX-PLACE-PROJECTION-READ-2026-10-20-Edward` in
`docs/architecture/database-compatibility-exceptions.md`, with an objective removal condition:
the allow-list contains only the authority service, and that service reads the Place Authority
directly.

## Why the switch cannot be completed in this packet

The Place Authority data is reproducible from committed inputs — each province has a committed
admission artefact under `data/za-*-place-admission-v0.1/` and a release adapter
(`server/_core/databaseAuthority/dataAdapters/placeRelease.ts`) — but it is **not loaded into
the development environment**, and the runtime role in production needed a separate grant
operation before it could read the seven Place tables at all
(`docs/architecture/launch-readiness-and-product-convergence/evidence/geography-runtime-access-startup-correction-2026-10-10/README.md`).

Switching a consumer to an authority whose rows are absent in the environment where the change
is reviewed would turn a data problem into an outage. The switch therefore proceeds as
consumer-by-consumer slices, each one: load and verify the Place reference data in the target
environment, switch the consumer, prove equivalence, and remove the entry from the allow-list.

## The verification defect: "provisional" is a licence marker, not a doubt marker

Edward's observation that Rosebank should not be provisional is correct, and the cause is not
what the status name suggests.

The governed Gauteng runtime projection classifies 1,414 places. The classification is driven
by **source licensing**, not by how real or how well-sourced the place is:

| `publication_status`                        | Places | Licensing classification                                                                     | Meaning                                                                                                                                                                        |
| ------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `verified`                                  | 181    | `permissive_supported` (181)                                                                 | Promoted from a permissively licensed source.                                                                                                                                  |
| `provisional`                               | 1,169  | `osm_only_odbl_provisional` (644), `mixed_odbl_supported` (477), `permissive_supported` (48) | Promoted by the coverage pipeline, but the evidence base is OSM/ODbL or mixed, so reuse is not settled.                                                                        |
| absent (mapped to `verified` by the loader) | 64     | —                                                                                            | The curated foundation rows: Gauteng, Johannesburg, Pretoria, Sandton, Randburg, Midrand, Centurion, Benoni, Boksburg, Alberton, Kempton Park, Germiston and their localities. |

Every provisional row carries the same decision reason: _"Territory coverage pipeline promotion
(provisional); licensing mixed_odbl_supported."_

**Consequences:**

- **Rosebank is not provisional because we doubt it.** It is provisional because its evidence
  base mixes OSM/ODbL with other sources, and the ODbL determination is still open. The mission
  state records that determination as founder-owned.
- **Randburg, Sandton and Johannesburg are "verified" because they are the hand-curated
  foundation rows**, not because their evidence is better than Rosebank's.
- **48 places are provisional while already permissively licensed.** Those are pure pipeline
  conservatism and are promotion candidates with no research work at all.
- Magaliesburg, Vereeniging, Vanderbijlpark, Meyerton, Krugersdorp, Roodepoort, Soweto,
  Heidelberg, Carletonville and Randfontein are all provisional for the same licensing reason.
  The province guide already cites each of their municipal sources.

**Recommended decision:** settle the ODbL determination once, as a territory-level licensing
policy, rather than per place. That single decision promotes the 1,121 rows that are blocked
only on licensing, and removes a category of "why is this still provisional" from every future
session. Until it is settled, the pipeline is honest to mark them provisional.

## Why Rosebank appears to sit under Gauteng rather than under Johannesburg

The runtime projection has exactly three scopes: `province` → `metro_city` → `locality`. There
is **no "City of Johannesburg" metro tier**, so `gauteng/rosebank` is a direct child of the
province, exactly like `gauteng/johannesburg`.

This is a _scope_ limitation, not a Place Authority limitation. The Place Authority models
hierarchy as evidenced edges with a relationship type, and the projection records
`runtime_parent_relationship: accepted_market_or_administrative_parent`. A richer
containment edge — Rosebank inside the City of Johannesburg — can be represented and evidenced;
it cannot be _executed_ as a search scope, because the runtime executes three scopes.

Two defensible positions, and they are not the same decision:

- **Edward's position:** Rosebank is part of Johannesburg, so it should read as part of
  Johannesburg in the guide hierarchy and in Johannesburg-wide reasoning.
- **The pipeline's position:** Rosebank is a substantial commercial node with its own market.
  Giving it its own searchable scope is what lets someone search "Rosebank" and get Rosebank,
  instead of being folded into a Johannesburg-wide search they did not ask for.

**Recommendation:** keep Rosebank as an independently searchable scope, and add the
_containment_ edge to the City of Johannesburg so that it reads as part of Johannesburg in the
guide hierarchy, in breadcrumbs and in Johannesburg-wide reasoning, without being silently
widened into a Johannesburg search. This is exactly the distinction the Place Authority's
`place_relationship` table exists to express, and it is the same distinction the province
guide already draws for Roodepoort ("belongs to the Johannesburg metro", "the West Rand district
is separate").

## What this means for the Sandton pilot already delivered

Nothing changes. The pilot's guide document, sitemap entry, hosting route and indexability are
governed by the editorial publication status, not by the geography projection. The Sandton
guide's place links resolve through `provinceGuideService`, which now reads through the
geography authority service, with identical behaviour.

## Unchanged

The paid-opening NO-GO, the B08–B18 dispositions, the release-boundary conditions and the
database authority model are unchanged. This packet authorises no protected database release, no
hosted execution and no paid activation. It records an architecture decision, delivers the
first consumer switch and the boundary guard, and leaves the ODbL determination with the founder.
