# Trending properties (homepage section 2)

Component: `client/src/sections/home/HomeTrendingSection.tsx` · Province ids: `client/src/lib/homeProvinceOptions.ts`
Server: `properties.searchPublicInventory` (`server/routers.ts`) → `server/services/publicSearchService.ts` → `server/services/propertySearchService.ts` (listings) and `server/services/publicDevelopmentSearchService.ts` (developments and their unit types).

## 1. Why this section exists

**Today:** show a visitor, straight under the search, real homes they can act on in a province they care about, so the homepage never feels empty or generic.

**End goal (owner, 2026-11-12): a revenue-generating placement.** This rail is paid exposure, a marketing product sold to agents, agencies and developers. It is deliberately _not_ called "Featured": every portal has "featured properties" and the word has lost its meaning. Principles:

- A **small, scarce** space: about **10 cards per province per journey** (for example 10 homes for sale in Gauteng).
- Sold through its **own billing**, separate from subscriptions. It is additional revenue and additional marketing exposure, not a subscription perk. _(Infrastructure not built yet; keep this section's code ready for it.)_
- Until paid placement exists, the rail is filled by an **organic algorithm** (section 4). When placements exist, they come first and the algorithm fills the rest.

## 2. What it shows (content rules)

The section has **no tabs of its own for journeys**. It follows the **hero journey tabs** at the top of the page. Its own control is a row of **province pills**: Gauteng (default), Western Cape, KwaZulu-Natal, Eastern Cape, Mpumalanga, Limpopo, North West, Free State, Northern Cape.

| Hero tab                                | Heading                        | What the cards are                                                                                                                                         |
| --------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buy                                     | "Homes for sale in {province}" | Individual listings for sale **plus development unit types for sale**, mixed (rules below)                                                                 |
| Rent                                    | "Homes to rent in {province}"  | Individual rental listings **plus development unit types for rent**, mixed                                                                                 |
| New Developments                        | development wording            | **Developments themselves** (one card per development). Someone choosing Developments is specifically looking for new or existing developments in the area |
| Shared Living, Commercial, Plots & Land | journey wording                | A link card to that journey's page (no listings until those journeys have inventory)                                                                       |
| Find an Agent                           | —                              | The hero sends the visitor to `/agents`; the section shows Buy                                                                                             |

**Why unit types appear under Buy and Rent:** a unit in a development is still something for sale (or to rent). The transaction type decides where it belongs, not the fact that it comes from a development. In Buy and Rent we show the **unit type** (for example "2-bed apartment · Harbour View · from R1 250 000"), **never the whole development as one card**. Rules for unit-type cards:

- Only unit types with units still available; transaction type must match the hero tab (for sale under Buy, for rent under Rent; rent cards use the monthly rent).
- Price is the unit type's own "from" price (or monthly rent from). Never invent a price; no price, no card.
- Links to that unit type on the development page.

**New-development card (owner decision, 2026-11-12, card 61):** the same frame, width, radius and border as a listing card. **One badge only: "New development"** (no "For sale" or "To rent"; the section heading already says it). Four details in the bottom row, like a normal card: size, beds, baths, then **one fourth item chosen in this order: parking ("1 Parking"), else stand size (shown like a listing card's erf size, "220 m²"), else nothing** (owner decision 2026-11-12: never the available count). Anything the data does not state is left out, so a card may show three details. No property type is shown, because the server's value on a unit card is a development-level guess. **Heart (owner decision, 2026-11-12): device-only for now.** The heart sits in the same place and size as on a listing card. It saves the unit type in this browser only (localStorage key `pl.savedUnitTypes.v1`, newest first, capped at 200, nothing sent to the server, no sign-in prompt) and the toast says "Saved on this device. Sign-in sync for new developments is coming.". If browser storage is unavailable the page still works and the choice lasts until reload. Saved units also show on the signed-in Favorites page under "New-development units saved on this device". Account-level saving needs migration 0198 `unit_type_favorites`, an inventory re-pin and a runtime grant, applied in the order migration, then grant, then deploy; it is planned with the New Developments journey. The yard and parking fields are optional: an older API does not send them. _Future:_ project thumbnails on the developer card.

**Mixing listings and unit types:**

- No individual listings in the province → the rail may be **all unit types**.
- No unit types → all listings.
- Both → mix them in one ranked list using the same ordering as section 4. _Proposal (to confirm with the owner):_ at most 2 unit types from the same development, and unit types at most 4 of the 10 cards when at least 6 listings exist, so one development cannot fill the rail and private sellers and agents keep visibility. Paid placements, once they exist, are exempt from the cap.

## 3. States (what the visitor sees, in order)

1. **First load:** hero tab = Buy, province = Gauteng. Show 4 skeleton cards while loading.
2. **Hero tab changes** (Buy ↔ Rent ↔ Developments …): heading, wording and cards switch to that journey; province selection is kept.
3. **Province pill clicked:** cards reload for that province; heading updates; the previous province's results stay cached for 5 minutes (client query cache) so switching back is instant.
4. **Results:** up to 10 cards in a horizontal rail with arrows on desktop and swipe on touch screens. Under the cards, a real link "View all homes for sale in {province}" (or "to rent") to the full search for that province.
5. **No results in that province:** keep the heading and the pills; show the empty state "No published matches in {province} yet" with an action. Never hide the section.
6. **Error:** "Property could not be loaded", with _Try again_ and _Open property search_.

## 4. Choosing what appears (ordering)

Applied in this order:

1. **Paid placements** for that province and journey _(future; separate billing; clearly labelled to visitors as promoted; the label wording and pricing are the owner's decision)_.
2. **Organic ranking ("trending")**, when there is enough activity: a score computed on the server from signals already stored on each listing:
   `score = (enquiries × 5 + min(views, 500) ÷ 50 + 1) ÷ (age in days + 2)^1.3`
   - Enquiries weigh most: strongest sign of real interest.
   - Views count but are capped at 500 because views are not de-duplicated today (every public page load adds one).
   - Age decay lets new listings surface instead of old ones holding the space forever.
   - Planned additions: saves/likes (favourites table) once the production database user can read it; de-duplicated views.
     Implemented on the server as `sortOption: 'trending'` (card 47, `buildTrendingScoreExpression` in `propertySearchService.ts`).
3. **Fallback when there is no activity:** newest first. (With no enquiries or views the score above already reduces to newest first.)
4. **Quality gate for every card:** must have a photo (`requirePhoto`), a price and a title; unit types must have units available.

## 5. Search engines

- Province pills are buttons (they switch the rail in place). Each province gets a real link "View all homes … in {province}" so crawlers can follow it.
- Listing cards are real links to listing pages.
- _Planned:_ structured data (`ItemList` with `RealEstateListing` items) for the rail; the homepage is currently rendered in the browser only, so crawlers see little of it until prerendering (card 39).

## 6. Current implementation status (2026-11-12)

| Rule                                                    | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Follows hero tabs, province pills, headings, states 1–6 | Built (branch `feat/home-38a-clarity`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Trending order and server photo filter in use           | Built in the page (card 58): the rail asks for `sortOption: 'trending'`, `requirePhoto: true` and no `listingSource`. The server side is card 47/48/56 (merged on this branch; the API deploy is separate)                                                                                                                                                                                                                                                                                                                                                                                     |
| Unit types mixed into Buy and Rent                      | Built in the page (card 58): `developmentResultShape: 'unit_type'`. A unit-type card uses the listing card frame: development photo, chips "New development" and the transaction, "From R x" (rent "From R x pm"), title "2-bed Apartment", second line "{development} · {area}", beds / baths / size, link to the unit page. **Heart saves on this device only** (see the new-development card rule above): saving to the account takes a property id and a unit type has none, so nothing is faked                                                                                           |
| Page works when the API is one version behind           | Built (card 58, `useTrendingRailQuery.ts`). The web host deploys on merge and the API is a separate manual step, so the page can go live first. If the new request fails with a tRPC `BAD_REQUEST` (an older API rejects the unknown input), the page runs the previous request instead (`listingSource: 'manual'`, `sortOption: 'date_desc'`, client photo filter, no unit types) and shows that. Any other error shows the normal error state. Remembered in a module variable for the page session, so later province clicks do not probe again. Remove once the API is deployed everywhere |
| Developments tab shows developments                     | Not built (shows the "launching soon" empty state; developments is now public; unit types come from the server later)                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Paid placements and their billing                       | Not started (future revenue product)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Caching on the server, database index for this query    | Not started                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## 7. History

- **Before 2026-10-28:** section existed (`HomeTrendingSection`, fed by `developer.getHomeTrendingFeed`, filtered by province _name_, photo required, newest first).
- **2026-10-28, PR #693 (`cbff3e7b3`):** removed from the homepage, together with the city cards and market insights, because it depended on the legacy province/city/suburb tables that were dropped (migrations 0175–0178). The reasoning for the section was not recorded anywhere, so it was lost. This file exists to prevent that.
- **2026-11-12 (card 61):** new-development card reduced to one badge and a fourth detail (yard, parking, availability).
- **2026-11-12 (owner decision):** the fourth detail is now parking, else stand size, else nothing; the "{n} available" fallback was removed.
- **2026-11-12 (card 58):** page switched to the server's trending order, photo filter and unit-type cards, with the older-API fallback described in section 6.
- **2026-11-12:** restored from the owner's screenshot (cards 44 and 44 rework), now addressing provinces by place id through `properties.searchPublicInventory`; owner set the revenue goal and the content rules above.
