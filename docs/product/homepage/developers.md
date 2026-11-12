# Developers (homepage section 4)

Component: `client/src/components/TopDevelopers.tsx` · Province ids: `client/src/lib/homeProvinceOptions.ts`
Server: `cataloguePublisher.listPublishers` (`server/cataloguePublisherRouter.ts:176`) → `cataloguePublisherService.listPublicPublishers` → `developerIdentityService.listPublicCataloguePublishers` (`server/services/developerIdentityService.ts:631`).

## 1. Why this section exists

**Today:** show visitors who is building where they want to live, so the homepage gives a face to the new-development side of the portal.

**Intended design (owner's screenshot):** the section follows the province chosen in the Trending section above it: "Developers building in Gauteng", with the line "Explore developers with approved, published projects in Gauteng." It has no search box of its own.

**End goal: a paid or priority placement for developers.** A small, scarce row, sold separately, like the Trending rail. Until it exists the row is filled organically (section 4). Keep the code ready for placements coming first.

## 2. What it shows

Heading and line today: "Explore real estate developers" / "Explore developer profiles and publicly listed projects across South Africa." (see status: the province wording is waiting on a server change.)

One card per developer in a carousel (arrows on desktop, swipe on touch, 44 px targets):
- Logo tile (alt "<name> logo"; neutral tile when there is no logo), name, head office or "Developer profile".
- Stat box: number of public projects. Shown only when the server returns a number; never 0 or a placeholder.
- Row "View projects" (link to the developer page, projects section) and a dark "View Developer" link.
- Under the row, a real link button "Explore All Developers" to `/developers`.

Stats in the original design that are **not shown** because the national list does not return them: "Active in {province}", "Selling now", "Launching soon". They return when the province query exists (section 6).

## 3. States

1. **Loading:** three skeleton cards sized like the cards.
2. **Error:** one plain line "Developer profiles could not be loaded." and *Try again*.
3. **Nobody listed (or developments held):** the section stays. Empty state "No developers are listed yet." with action "Talk to us about listing your development" (`/contact`) and a text link "See developers across South Africa" (`/developers`).
4. **Results:** up to 10 cards.

## 4. Ordering

**Today:** whatever `listPublishers` returns: visible publishers with public authority, newest created first (`developerIdentityService.ts:694`). Limit 12 requested, 10 shown.

**Planned:** developers with active selling projects first, then launching soon, then the rest; paid placements ahead of all of these. `listPublishersByPlace` (`developerIdentityService.ts:730`) already orders by project count then latest publication and returns selling and launching counts; it only accepts an exact reviewed Place.

## 5. Search engines

Every card links to the developer page with real `<a href>` links; "Explore All Developers" is a real link. The homepage is browser-rendered today, so crawlers see little of it until prerendering.

## 6. Status (2026-11-12)

| Rule | Status |
|---|---|
| Old card design restored, no area search box | Built |
| Follows the Trending province | **Blocked, needs a server change.** `listPublishers` scopes only by `canonicalPlaceId`, matched exactly against reviewed development site assignments (`listDevelopmentIdsForCanonicalPlace`, `developmentPlaceAssignmentService.ts:306`). A province id matches only developments assigned to the province itself, not those in its cities and suburbs. Needed: a province-scope option on the publisher listing (as `searchPublicInventory` does for listings via `provincePlaceId`) that also returns active, selling and launching counts per province |
| Selling now and Launching soon stats | Waiting on the same server change |
| Priority placement | Not started |

## 7. History

- **Before 2026-10-27:** developers by province: province-name query, cards with "Active in {province}", "Selling now", "Launching soon".
- **2026-10-27, `9c1c72050`:** removed the province props when developments moved to reviewed canonical Places; a Place search box replaced the province link.
- **2026-11-12:** card 55a removed the search box and restored the card design; province following is blocked as above.
