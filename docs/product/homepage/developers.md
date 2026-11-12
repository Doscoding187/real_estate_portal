# Developers (homepage section 4)

Component: `client/src/components/TopDevelopers.tsx` · Province ids: `client/src/lib/homeProvinceOptions.ts`
Server: `cataloguePublisher.listPublishers` (`server/cataloguePublisherRouter.ts:176`) → `cataloguePublisherService.listPublicPublishers` → `developerIdentityService.listPublicCataloguePublishers` (`server/services/developerIdentityService.ts:631`).

## 1. Why this section exists

**Today:** show visitors who is building where they want to live, so the homepage gives a face to the new-development side of the portal.

**Intended design (owner's screenshot):** the section follows the province chosen in the Trending section above it: "Developers building in Gauteng", with the line "Explore developers with approved, published projects in Gauteng." It has no search box of its own.

**End goal: a paid or priority placement for developers.** A small, scarce row, sold separately, like the Trending rail. Until it exists the row is filled organically (section 4). Keep the code ready for placements coming first.

## 2. What it shows

Heading and line: "Developers building in {province}" / "Explore developers with approved, published projects in {province}." Only if the API is one version behind: national wording "Explore real estate developers" / "Explore developer profiles and publicly listed projects across South Africa." (see status).

One card per developer in a carousel (arrows on desktop, swipe on touch). **Owner decision, 2026-11-12:** a calmer card with one link, one stat line and an optional status chip. Card rules:

- **Same width, radius and border as the Trending listing cards**, at every breakpoint, so the two rows line up. On phones the rail swipes with the next card peeking in.
- Header: 56 px logo tile (alt "<name> logo"). With no logo, the developer's initials (at most two letters) on a light brand-tinted tile; never an invented logo. Name on one or two lines, head office underneath (or "Developer profile").
- **One stat line**, for example "5 active · 3 selling now · 1 launching soon". Zero or missing numbers are left out; if none exist the line is omitted. National fallback: "{n} public projects" (singular for 1), only when the server returns a number.
- **Status chip, only when true:** green "Selling now" if the developer has projects selling now, otherwise amber "Launching soon" if any are launching soon, otherwise no chip.
- **The whole card is one link** to the developer page. The only other cue is a quiet text "View developer" at the bottom (it is part of the same link, not a second link). There is no black button, no stat boxes, no duplicate rows and no "View local projects".
- Soft hover lift and a visible keyboard focus ring.
- A slot for a **future strip of up to three project thumbnails** exists in the code (`projectThumbnails` prop on `DeveloperCard`); nothing is passed or drawn for it today.
- Under the rail, a real link button "Explore All Developers" to `/developers`.

## 3. States

1. **Loading:** three skeleton cards sized like the cards.
2. **Error:** one plain line "Developer profiles could not be loaded." and _Try again_.
3. **Nobody listed (or developments held):** the section stays. Empty state "No developers are listed yet." with action "Talk to us about listing your development" (`/contact`) and a text link "See developers across South Africa" (`/developers`).
4. **Results:** up to 10 cards.

## 4. Ordering

**Today:** whatever `listPublishers` returns: visible publishers with public authority, newest created first (`developerIdentityService.ts:694`). Limit 12 requested, 10 shown.

**Planned:** developers with active selling projects first, then launching soon, then the rest; paid placements ahead of all of these. `listPublishersByPlace` (`developerIdentityService.ts:730`) already orders by project count then latest publication and returns selling and launching counts; it only accepts an exact reviewed Place.

## 5. Search engines

Every card links to the developer page with real `<a href>` links; "Explore All Developers" is a real link. The homepage is browser-rendered today, so crawlers see little of it until prerendering.

## 6. Status (2026-11-12)

| Rule                                         | Status                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Old card design restored, no area search box | Built                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Follows the Trending province                | Built in the page (card 58). Server: `listPublishers({ provincePlaceId, limit: 12 })` returns developers with approved, published projects in the province, with `activeDevelopments`, `sellingNow` and `launchingSoon`. Heading "Developers building in {province}", line "Explore developers with approved, published projects in {province}."                                                                                    |
| Province card stats                          | Built (redesigned, card 61): one stat line and an optional chip, see section 2. Each number only when the server returned one                                                                                                                                                                                                                                                                                                       |
| Empty province                               | Built: "No developers are listed in {province} yet.", the /contact action and "See developers across South Africa"                                                                                                                                                                                                                                                                                                                  |
| Works when the API is one version behind     | Built (card 58, `TopDevelopers.tsx`). The web host deploys on merge, the API separately. A tRPC `BAD_REQUEST` on the province query (an older API rejects `provincePlaceId`) switches the section to the national `listPublishers({ limit: 12 })`, heading "Explore real estate developers" and the national card (project count). Remembered in a module variable for the page session. Remove once the API is deployed everywhere |
| Priority placement                           | Not started                                                                                                                                                                                                                                                                                                                                                                                                                         |

## 7. History

- **Before 2026-10-27:** developers by province: province-name query, cards with "Active in {province}", "Selling now", "Launching soon".
- **2026-10-27, `9c1c72050`:** removed the province props when developments moved to reviewed canonical Places; a Place search box replaced the province link.
- **2026-11-12:** card 55a removed the search box and restored the card design; province following was blocked on the server.
- **2026-11-12 (card 61):** card redesigned (owner-approved): larger logo or initials tile, one stat line, optional status chip, whole card one link, same size as the Trending cards; stat boxes, duplicate rows, "View local projects" and the black button removed. Future: project thumbnails strip.
- **2026-11-12 (card 58):** province mode built against the new server support (cards 47/48/56), with the older-API national fallback.
