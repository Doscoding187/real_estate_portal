# Property market insights (homepage section 6)

Component: `client/src/sections/home/HomeMarketInsightsSection.tsx` (test: `HomeMarketInsightsSection.test.tsx`)
Server: `homeMarketInsights.getHomepageCityInsights` (`server/homeMarketInsightsRouter.ts`), built from currently published sale listings.

## 1. Why this section exists

**Today:** help a visitor judge prices in a city before they search: what homes are asking, how many are on the market, and how that differs between cities.

**Later (_proposal_, not a decision):** this could become the hook for paid market reports (a deeper report per city or area, sold separately). Nothing about payment is built or decided; the section must work on its own first.

## 2. What it shows (built 2026-11-12, card 60)

Eyebrow "Property price insights", heading "Make smarter property decisions", one plain line, then a row of **city pills** (up to 8 cities from the server, first selected, same pill style as the Trending province pills, scrolls sideways on small screens) and, for the selected city, **three cards**. Each card has a tinted header with a one-line takeaway:

1. **Local supply** (blue): takeaway "Most homes for sale in {city} are in {locality}." (only when the server names a leading locality); a tile with that locality and its listing count; link "Explore {city}" (only when the city has a page).
2. **Asking price** (amber): takeaway "Most homes are asking {band}." (the band with the most homes; a tie goes to the lower band; nothing when every band is empty); five horizontal bars with counts, drawn with plain elements (no chart library) and readable as a list ("R1m – R2m: 3 homes"); an empty band shows an empty track.
3. **Market activity** (green): rows Active sale listings, Median asking price ("R3.0m" / "R850 000") and Typical asking price / m² (row left out when the server sends none); link "View {city} homes for sale" to the Buy results for that city.

Three cards across from 1024px; below that a swipe rail with the next card peeking. Under the cards, this note, word for word, followed by "Updated {time ago}" from the server's computed time:

> Based on at least three qualifying published homes for sale. These are current asking inventory signals, not completed sales or a valuation.

## 3. States

0. **Loading:** skeletons sized like the cards.
1. **Figures:** a city has at least 3 qualifying listings, so its three cards show real numbers.
2. **City below the minimum:** the server does not return that city, so it has no pill.
3. **Nothing to show / no source yet** (empty list, or an older API that does not have the procedure yet: tRPC `NOT_FOUND` or `BAD_REQUEST`, never retried): the section keeps its heading and shows the empty state "Market insights will appear here as more homes are listed." with the action "Explore areas" (to `/south-africa`). It is never hidden.
4. **Any other error:** a plain line "Property price insights could not be loaded." with a Try again button.

## 4. Rules

- **Real figures only**, taken from **currently published** listings. No sample, estimated or invented numbers.
- **Minimum 3 listings per city** before any figure is shown for that city.
- **No trends** (up/down arrows, "prices rose x%") until there is stored history to compute them from.
- The figures are **asking inventory signals**, never sale prices and never a valuation. The note in section 2 says so on the page and must not be removed.
- Wording stays plain: no internal terms.
- The client shows only numbers the server sent, and nothing for a missing value (no "Not enough data" filler, no invented figure).

## 5. Search engines

The pills switch figures in place (buttons). _Proposal:_ each city should also link to its real city page so crawlers can follow it. Like the rest of the homepage, this section is rendered in the browser only today.

## 6. Current implementation status (2026-11-12)

| Rule                                     | Status                                                              |
| ---------------------------------------- | ------------------------------------------------------------------- |
| Section frame (heading, intro line)      | Built                                                               |
| Empty state with "Explore areas" action  | Built; shown for an empty list and for an older API                 |
| City pills, the three cards and the note | Built (2026-11-12, card 60); reviewed locally with the preview mock |
| Server procedure over published listings | Built and merged into this branch (`getHomepageCityInsights`)       |
| Trends                                   | Not planned until history exists                                    |
| Paid market reports                      | _Proposal_ only                                                     |

Status in one line: **built; pending owner review and deploy of the server procedure.** The preview mock has `MOCK_LEGACY_API=1` and `MOCK_EMPTY_INSIGHTS=1` switches (`scripts/preview/README.md`).

## 7. History

- **2026-08-27 (`00c7881bf`):** "governed market insights" added to the homepage.
- **2026-09-01 (`d207e0d1d`):** restored as "city-led market insights".
- **2026-10-28, PR #693 (`cbff3e7b3`):** removed from the homepage (with trending and the city cards) because it read the legacy cities, provinces and suburbs tables, which were dropped by migrations 0175 to 0178. The reasoning was not written down and was lost; this file exists to prevent that.
- **2026-11-12 (`f80d25153`):** frame restored with an honest empty state and no numbers. The owner's target design was set the same day.
- **2026-11-12 (card 60):** city pills, the three cards, the note and the error and older-API states built on `homeMarketInsights.getHomepageCityInsights`.
