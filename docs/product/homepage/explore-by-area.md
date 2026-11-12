# Explore South Africa by area (homepage section 5)

Component: `client/src/components/ExploreCities.tsx` · Illustrations: `client/src/components/home/CityGlyphs.tsx` · Data: `client/src/lib/cityGuides.ts` (`POPULAR_CITY_SLUGS`, `PROVINCE_TILES`, and the table of published cities with their evidence).

## 1. Why this section exists

A fast, scannable way into place pages for visitors who think in places before properties. Each tile is a real link to a published city or province page, so it is also an entry point that search engines can follow. It sits near the end of the page, after the search-led sections, as a "keep exploring" block.

## 2. What it shows

- Heading "Explore South Africa by area", one short line, and the "Browse locations" button (to `/south-africa`) in the header.
- Two tabs (a real tab list, arrow keys, Home and End work): **Popular cities** (default) and **Provinces**.
- A grid of compact tiles: 4 columns from 1024 px, 3 from 768 px, 2 below. Under the grid, a text link "View all areas" to `/south-africa`.
- **Popular cities:** always 12 tiles. Today, in this order: Johannesburg, Cape Town, Durban, Pretoria, Sandton, Gqeberha, Bloemfontein, Centurion, Stellenbosch, Mbombela, Polokwane, Kimberley. Each tile shows the city name and its province.
- **Provinces:** the nine provinces, fixed, each with its short code (GP, WC, KZN, EC, FS, LP, MP, NW, NC) and the caption "Province". Northern Cape links to its published path `/noord-kaap`.

## 3. Tile design, and why no photos

White tile, rounded corners, 1 px slate border; a 56 px soft-tinted square on the left with a small line illustration, a thin divider, then the name (semi-bold) and a small muted line. About 72 px tall on desktop, 64 px on phone. Hover: blue border, slight lift (off for reduced-motion). The whole tile is one link; its accessible name is the place name; the illustration is decorative.

**Why no photos:** we will not have a good photo for every city, and a grid that mixes photo cards and gaps looks unfinished. A small illustration is always available, so the section can list any city. Cities without their own drawing get a generic skyline-with-pin glyph.

Illustrations are original, one family: 48 x 48, brand-blue 1.75 px line, one warm accent fill, no text. They are drawn for this site and are not traced from any other site.

## 4. States

- **Loaded (always):** the lists are static data, so there is no loading, empty or error state. The section is never hidden.
- **Tab change:** the grid swaps in place; the choice is not remembered between visits.
- **Hover and keyboard focus:** hover as above; focus shows a visible blue outline on tabs and tiles.

## 5. Selection and ordering

- **Today (owner, 2026-11-12):** a curated list of 12 cities, each with a published page (publication_eligible and active in the place projection; evidence table in `cityGuides.ts`).
- **Planned algorithm:** rank cities by the number of live listings and by search demand; minimum requirement is a published page; always show 12 tiles; the order is recomputed on a schedule, not per visit. Not built. Until then, change the list by editing `POPULAR_CITY_SLUGS`.
- **Provinces:** fixed, all nine.
- A city can only appear if it exists in the published list; any city without a drawing uses the fallback glyph.

## 6. Search engines

Tiles and "View all areas" are real `<a href>` links to published pages. The tab content that is not showing (Provinces by default) is not in the page until selected; the province pages are also linked from the footer and from `/south-africa`.

## 7. Status (2026-11-12)

Built on branch `feat/home-38a-clarity`: tabs, tiles, 12 glyphs plus fallback, province monograms. Algorithmic city choice not built.

## 8. History

- Before 2026-10-28: city cards existed and were removed in PR #693 with other sections.
- **2026-11-12 (card 44):** restored as photo cards (16:9 city photos, "Show more cities").
- **2026-11-12 (card 53, same day):** owner decided against large photo cards and asked for compact tiles with a small illustration and the name (reference: a compact tile grid with tabs on another portal; this design is our own). Photo cards were replaced. The city photos in `client/public/images/city-guides-v1` stay in the repository for city guide pages; this section no longer uses them.
