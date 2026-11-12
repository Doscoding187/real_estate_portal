# Property market insights (homepage section 6)

Component: `client/src/sections/home/HomeMarketInsightsSection.tsx` (test: `HomeMarketInsightsSection.test.tsx`)
Server: **none yet.** A procedure that reads currently published listings is planned (card 54).

## 1. Why this section exists

**Today:** help a visitor judge prices in a city before they search: what homes are asking, how many are on the market, and how that differs between cities.

**Later (_proposal_, not a decision):** this could become the hook for paid market reports (a deeper report per city or area, sold separately). Nothing about payment is built or decided; the section must work on its own first.

## 2. What it shows (owner's target design)

A row of **city pills**, and for the selected city **three cards**:

1. **Explore local supply**
2. **Asking price bands**
3. **Market activity**

The owner named the three cards; what each one contains is not yet specified. _Proposal:_ supply = how many homes are for sale now; price bands = how current asking prices spread across bands; activity = a signal from current listings only (no completed sales).

Under the cards, this note, word for word:

> Based on at least three qualifying published homes for sale. These are current asking inventory signals, not completed sales or a valuation.

## 3. States

1. **Figures:** a city has at least 3 qualifying listings, so its three cards show real numbers.
2. **City below the minimum:** that city shows the empty state, not thin or misleading numbers.
3. **Nothing to show / no source yet:** the section keeps its heading and shows the empty state "Market insights will appear here as more homes are listed." with the action "Explore areas" (to `/south-africa`). It is never hidden.

## 4. Rules

- **Real figures only**, taken from **currently published** listings. No sample, estimated or invented numbers.
- **Minimum 3 listings per city** before any figure is shown for that city.
- **No trends** (up/down arrows, "prices rose x%") until there is stored history to compute them from.
- The figures are **asking inventory signals**, never sale prices and never a valuation. The note in section 2 says so on the page and must not be removed.
- Wording stays plain: no internal terms.

## 5. Search engines

The pills switch figures in place (buttons). _Proposal:_ each city should also link to its real city page so crawlers can follow it. Like the rest of the homepage, this section is rendered in the browser only today.

## 6. Current implementation status (2026-11-12)

| Rule                                     | Status                                                           |
| ---------------------------------------- | ---------------------------------------------------------------- |
| Section frame (heading, intro line)      | Built (restored 2026-11-12, `f80d25153`)                         |
| Empty state with "Explore areas" action  | Built; this is all the section shows today (it shows no numbers) |
| City pills, the three cards and the note | Not built                                                        |
| Server procedure over published listings | Planned (card 54); not started                                   |
| Trends                                   | Not planned until history exists                                 |
| Paid market reports                      | _Proposal_ only                                                  |

Status in one line: **frame and empty state only.**

## 7. History

- **2026-08-27 (`00c7881bf`):** "governed market insights" added to the homepage.
- **2026-09-01 (`d207e0d1d`):** restored as "city-led market insights".
- **2026-10-28, PR #693 (`cbff3e7b3`):** removed from the homepage (with trending and the city cards) because it read the legacy cities, provinces and suburbs tables, which were dropped by migrations 0175 to 0178. The reasoning was not written down and was lost; this file exists to prevent that.
- **2026-11-12 (`f80d25153`):** frame restored with an honest empty state and no numbers. The owner's target design above was set the same day. A server procedure that reads published listings is planned as card 54.
