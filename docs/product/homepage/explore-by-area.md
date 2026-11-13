# Explore South Africa by area (homepage section 5)

Component: `client/src/components/ExploreCities.tsx` · Illustrations: `client/src/components/home/CityGlyphs.tsx` · Static fallback data: `client/src/lib/cityGuides.ts` (the table of published cities with their evidence) · Server: `homeAreas.getPopularAreasByProvince` (`server/homeAreasRouter.ts`).

## 1. Why this section exists

A fast, scannable way into place pages for visitors who think in places before properties. Each tile is a real link to a published place page, where the visitor then chooses buy or rent, so it is also an entry point that search engines can follow. It sits near the end of the page, after the search-led sections, as a "keep exploring" block.

**Owner decision (2026-11-12):** the whole homepage follows one pattern: pick a province, see what is popular in it. This section shows the selected province's popular areas, each with the number of properties listed there.

## 2. What it shows

- Heading "Explore South Africa by area", the line "Popular areas in {province}, with the number of properties listed in each.", and the "Browse locations" button (to `/south-africa`) in the header.
- The nine **province pills** (the same component as Trending; see the README for the shared selection). Changing the pills here changes the province for the whole page, and the other way round.
- A grid of up to **12 compact tiles**: 4 columns from 1024 px, 3 from 768 px, 2 below. Each tile has the area's glyph, a divider, the area name and a second line.
- Under the grid, a text link "View all areas in {province}" to the province page the server names (`province.href`), or `/south-africa` when there is none.

## 3. Tiles and the counts rule

White tile, rounded corners, 1 px slate border; a 56 px soft-tinted square with a small line illustration, a thin divider, then the name (semi-bold) and a small muted line. About 72 px tall on desktop, 64 px on phone. Hover: blue border, slight lift (off for reduced-motion). The whole tile is one link (accessible name = the area name) to the area's own place page; the illustration is decorative.

- **Second line, never "0":** "{n} properties" (thousands separated; "1 property" for one) when the server sent a listing count above zero; otherwise the province name. The client never shows "0 properties" and never shows a number the server did not send.
- **Glyph:** the city's own drawing from `CityGlyphs.tsx` when it has one (matched by the area's path), otherwise the generic skyline-with-pin glyph.
- **No photos:** we will not have a good photo for every area, and a grid that mixes photo cards and gaps looks unfinished. Illustrations are original, one family: 48 x 48, brand-blue 1.75 px line, one warm accent fill, no text.

## 4. States and fallbacks

- **Loading:** 12 skeleton tiles.
- **Counts from the server:** the normal case. Areas with listings come first; the server tops the list up with well-known cities of the province that have no listings yet (those show the province name, not a count).
- **Older API** (the procedure is missing: tRPC `NOT_FOUND`, or `BAD_REQUEST`), **any other failure, or an empty list:** the static curated list from `cityGuides.ts` for that province (popular cities first, up to 12, no counts, province name on the second line). Never an error panel. A missing procedure is remembered for the rest of the page session, so the section stops asking; "View all areas" then goes to `/south-africa`.
- **A province with no city in the static list** (today North West) and no server data: a plain note "Areas in {province} will appear here as more homes are listed." with a link "Explore {province}" to the province page.

## 5. Selection and ordering

- **Server (card 64):** the province's areas ranked by publicly visible sale + rent listings, only areas with a published page; the client asks for 12.
- **Static fallback:** `cityGuides.ts` lists 20 published cities with evidence for their pages; the fallback filters them by province and keeps `POPULAR_CITY_SLUGS` order first. A city can only appear if it exists in that published list.

## 6. Search engines

Tiles and "View all areas in {province}" are real `<a href>` links to published pages. Only the selected province's tiles are in the page at a time; the province pages are also linked from the footer and from `/south-africa`.

## 7. Status (2026-11-13)

Built on branch `feat/home-38a-clarity` (card 65): province pills, server-driven tiles with counts, static fallback. Needs the card 64 server procedure deployed to show counts; until then the section shows the static list. Preview fixtures: `scripts/preview/fixtures/getPopularAreasByProvince.json`; `MOCK_LEGACY_API=1` shows the fallback.

## 8. History

- Before 2026-10-28: city cards existed and were removed in PR #693 with other sections.
- **2026-11-12 (card 44):** restored as photo cards (16:9 city photos, "Show more cities").
- **2026-11-12 (card 53):** owner decided against large photo cards and asked for compact tiles with a small illustration and the name. The city photos in `client/public/images/city-guides-v1` stay in the repository for city guide pages; this section no longer uses them.
- **2026-11-12 (cards 64 and 65, owner direction):** the "Popular cities / Provinces" tabs and the curated 12-city list were replaced by the province pills and the selected province's popular areas with listing counts ("never show 0"), with the static curated list kept as the fallback. The fixed Provinces tab is gone: provinces are now the pills, and each province page is one link away ("View all areas in {province}").
- **2026-11-13 (card 65):** one province choice drives all four sections, remembered for the session.
- **2026-11-13 (card 67, glyph rule):** most tiles repeated the generic skyline, so every main area of every province now has its own original glyph (35 added to the original 12), matched by place name (case, spacing and apostrophes ignored; aliases such as Mafikeng and Witbank resolve). Where nothing well known and simple fits, a varied neutral motif (house row, tree, farmland, hill) is used so neighbouring tiles differ. The generic skyline-with-pin stays only for names without a drawing. New glyphs must follow the family rules in section 3 and be checked as a rendered sheet at 32 px. Also in this card: the "One place for every property move" panel keeps its benefit tiles in a three-column row under the text below 1280 px (two columns only from 1280 px), with the secondary links kept as one group.
