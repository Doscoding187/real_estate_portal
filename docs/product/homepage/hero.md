# Hero and journey tabs (homepage section 1)

Component: `client/src/components/EnhancedHero.tsx` · Tab rules: `client/src/lib/publicNavigation.ts` · Journey pages: `client/src/pages/JourneyComingSoonPage.tsx`, `client/src/pages/JourneyHeldPage.tsx`

## 1. Why this section exists

The first thing a visitor meets: what are you looking for, and where. One tab per journey, each changing the search wording and filters, so the visitor never has to guess where a section lives.

## 2. What it shows

Seven tabs on every build, in this order: **Buy · Rent · New Developments · Shared Living · Commercial · Plots & Land · Find an Agent**. Each tab changes the placeholder, the filters and where the search goes. Find an Agent goes straight to `/agents`.

| Tab                                     | Search goes to                                                                                                                                                                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buy, Rent                               | the property search results                                                                                                                                                                                                                     |
| New Developments                        | `/new-developments` (public; empty state until developments are listed)                                                                                                                                                                         |
| Shared Living, Commercial, Plots & Land | their own page (`/shared-living`, `/commercial`, `/plots-and-land`), search kept in the web address. Today each shows the designed empty state ("No shared living rooms are listed yet." and so on) with "Contact us" and a link to home search |
| Find an Agent                           | `/agents`                                                                                                                                                                                                                                       |

## 3. States

- On a phone the seven tabs sit in one row that scrolls sideways. A soft fade at the edge shows that more tabs exist, and the chosen tab scrolls into view. Tabs are at least 44 px tall.
- A tab for a journey with nothing listed still works: the visitor reaches a page with an honest empty state, never an error and never a dead end.

## 4. Rules

- **Tab-only switch.** Showing a tab does not release the journey in the menu or footer. The hero uses `isHomepageHeroTabVisible` / `isHomepageHeroTabEnabled`; the menu and footer use `isPublicHeroJourneyReleased`. `LAUNCH_HELD_JOURNEYS` (Shared Living, Commercial, Plots & Land) still keeps those three out of the menu and footer.
- **New Developments is public** (removed from `LAUNCH_HELD_JOURNEYS`, added to the hosted baseline). Nothing is seeded; every place that lists developments shows its empty state.
- Pages for held journeys are built by `JourneyComingSoonPage` (add an entry to `COMING_SOON_JOURNEYS` to reuse it). They are not indexed by search engines while there is no inventory. Detail addresses (`/shared-living/:slug`, `/commercial/:slug`, `/land/:slug`) show a plain not-found state with a link back.
- Plots & Land stays switched off as a product (`shared/landLaunchPolicy.ts` is unchanged); only its page wording changed.
- Plain language in all visible text.

## 5. Current implementation status (2026-11-12)

| Rule                                                                 | Status                                             |
| -------------------------------------------------------------------- | -------------------------------------------------- |
| Seven tabs on hosted builds                                          | Built                                              |
| Empty-state pages for the three held journeys                        | Built (hosted builds; Plots & Land on every build) |
| Mobile fade and scroll-into-view                                     | Built                                              |
| New Developments search wording ("Project Place", "approved Places") | Not changed; shared with other pages               |

## 6. History

- **2026-11-12 (card 49):** owner decided all seven tabs show on hosted builds, New Developments becomes public, and the three other journeys get empty-state pages instead of "This section is not available yet".
