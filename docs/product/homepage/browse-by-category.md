# Browse by city, category and property journey (homepage section 3)

Component: `client/src/components/DiscoverProperties.tsx` · City ids: `client/src/lib/cityGuides.ts` · Photos: originals in `client/image-originals/categories/` (sources in `SOURCES.md`), web versions built by `pnpm images:categories` (`scripts/images/build-category-images.mjs`) into `client/public/images/categories/`.

## 1. Why this section exists

For visitors who do not know exactly what to search yet. They pick a **city** and a **kind of property**, and land on real results. The category names are chosen to match **what people actually type into search engines** (houses, apartments, townhouses, farms, plots and land, offices, shops), so each card is also an entry point search engines can follow.

## 2. What it shows

- **City pills:** Cape Town, Johannesburg, Pretoria, Durban, Bloemfontein, Gqeberha, Polokwane, Kimberley, Mbombela, Mahikeng. Picking one sets the homepage area (the same area the "Choose or change area" picker sets), and the cards read "in {city}". Pressing it again clears the area. Only cities whose page is published are listed; Mahikeng uses the published place "Mafikeng".
- **Groups:** Properties for Sale, Properties for Rent, New Developments.
- **Cards (owner, 2026-11-12: Villas removed; Offices, Shops, Farms, Plots & Land added):**
  - For Sale: Houses, Apartments, Townhouses, Cluster Homes, Farms, Plots & Land, Offices, Shops
  - For Rent: Houses, Apartments, Townhouses, Offices, Shops
  - New Developments: Ready to Move, New Launch, Affordable Housing, Luxury Projects (brand-colour cards until photos are supplied)
- Each card is a **real link** with a photo, the label, a "For sale"/"To rent" chip and "in {area}".

## 3. Where each card goes

| Card | Destination |
|---|---|
| Houses, Apartments, Townhouses, Cluster Homes, Farms | Property search filtered by type (`/property-for-sale?propertyType=…`, or `/property-to-rent`), plus the chosen area |
| Plots & Land | `/plots-and-land` (land is switched off until there is land inventory; that page must show an honest empty state, not internal wording) |
| Offices, Shops | Commercial page filtered by use (`/commercial?useTypes=office` / `retail`); commercial is leasing only today |
| New Developments cards | New developments page, or the chosen area's page |

With no area chosen, cards open national results. Zero results show the normal "no results" page, never an error.

## 4. Layout

- **Card shape rule (owner, 2026-11-12): every card is a tall 7:10 portrait at every screen width.** The owner's reference screenshot shows about 210 x 300 px beside the list and called it perfect. An earlier build let the card height follow the accordion, so cards were 4:5 or squarer (224 x 260) between 1280 and 1536 px. Now the card width is set per breakpoint and the height follows from 7:10; the accordion stretches to the cards' height, never the other way round.
- Desktop (≥1024 px): the Sale / Rent / Developments list on the left, photo cards on the right, same top and bottom edges. 1024-1279 px: list plus 3 whole cards; 1280 px and up: list plus 4 whole cards; arrows page the rest.
- Tablet (768-1023 px): a Sale / Rent / New Developments switch on top, 7:10 cards in a swipeable row, three and a peek.
- Phone (below 768 px): switch on top, 7:10 cards 152 px wide in a snap row, two and a peek.
- Photos: 7:10 portrait crops, WebP at up to three widths, lazy-loaded, with alt text such as "Townhouses for sale". Never loaded from other websites. Crops are made by `pnpm images:categories`; Apartments and Houses use a fixed left crop to keep their subject.

## 5. History

- **2026-11-12 (card 53):** card shape fixed at 7:10 (section 4); images regenerated at 7:10.
- Photo cards existed until **2026-11-10, PR #757 (`7d43a4156`)**, which removed them because they were loaded directly from Unsplash's servers.
- City pills existed until **2026-10-28, PR #693 (`cbff3e7b3`)**.
- **2026-11-12 (card 45):** restored with the owner's own photos stored in the repository, city pills back, categories changed as above.

## 6. Open items

- Photo sources and licences: to be supplied by the owner (`SOURCES.md`).
- Farms photo is small (598 px wide); a larger South African farm photo is wanted.
- New Developments category photos not supplied yet.
- Plots & Land and Commercial destination pages still show "not available" wording on the live site; to be replaced by the designed empty state.
