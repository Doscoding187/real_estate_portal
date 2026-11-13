# Local preview mock API

**For local preview only. Never deployed, never imported by `client/` or `server/`.**

No API or database runs on a review machine, so the homepage data sections show error panels. This
small Node server answers the homepage's tRPC calls with fictional sample data so the cards render
in the local Vite preview and in Playwright screenshots. Responses and fixtures carry
`"sample": true`, and the server prints a banner on start. It refuses to start when
`NODE_ENV=production`, binds to 127.0.0.1 only, and uses no dependencies.

## Run it

Two terminals, from the repository root:

```
VITE_API_URL=http://localhost:5000 VITE_DEPLOY_ENV=development pnpm exec vite --port 3010
node scripts/preview/mock-api.mjs
```

(Use whatever command you already use for the Vite dev server; the page must be on http://localhost:3010
or http://localhost:3011, the only CORS origins allowed, and property photos load from port 3010.)
Set `PORT` to move the mock off 5000, and point `VITE_API_URL` at the same port.

## What it feeds

| Procedure                                    | Homepage section                                             |
| -------------------------------------------- | ------------------------------------------------------------ |
| `properties.searchPublicInventory`           | Explore property (Buy and Rent rails, by province)           |
| `cataloguePublisher.listPublishers`          | Explore real estate developers                               |
| `homeAreas.getPopularAreasByProvince`        | Explore South Africa by area (province pills, tiles, counts) |
| `homeMarketInsights.getProvinceInsights`     | Property price insights (province pills, city chips, cards)  |
| `homeMarketInsights.getHomepageCityInsights` | Not called by the homepage any more (kept for older checks)  |
| `auth.me`                                    | Signed-out visitor (returns `null`)                          |
| `GET /api/readiness`                         | Maintenance gate (returns `{ kind: 'readiness', ok: true }`) |

Gauteng and Western Cape have 8 sale and 6 rent listings, KwaZulu-Natal has 3 sale, every other
province is empty (so the empty state can be reviewed). Any other procedure returns a tRPC
`NOT_FOUND` error and logs `[mock-api] NOT_FOUND procedure: <name>` so missing fixtures are obvious.

## Newer API features, and the "older API" switch

The mock answers the newer homepage inputs the way the merged server does:

- `searchPublicInventory` with `developmentResultShape: 'unit_type'` mixes sample development
  unit-type cards (the server's `DevelopmentUnitTypeCard` shape, href `/development/<slug>/unit/<id>`)
  into Gauteng and Western Cape sale and rent results at slots 3, 5 and 8 (`unitTypes` in the
  fixture), respecting `pageSize`. `requirePhoto: true` drops cards without an image (one Gauteng
  sale unit type has none, to show it). `listingSource: 'manual'` returns no unit types.
  KwaZulu-Natal rent has only unit types (the "all unit types" case).
- `listPublishers` with `provincePlaceId` returns that province's developers with
  `activeDevelopments`, `sellingNow` and `launchingSoon` (Gauteng 4, Western Cape 3, KwaZulu-Natal 1,
  every other province empty). Without it, the national list as before.

**`MOCK_LEGACY_API=1`** makes the mock behave like the currently deployed API: it rejects the new
inputs (`sortOption: 'trending'`, `requirePhoto`, `developmentResultShape`, `provincePlaceId`) with
HTTP 400 and a tRPC `BAD_REQUEST` envelope shaped like a strict zod input failure. Use it to watch
the homepage fall back to the previous behaviour (date order, manual listings, national
developers):

```
MOCK_LEGACY_API=1 node scripts/preview/mock-api.mjs
```

The fallback is remembered per page load, so reload the page after switching the mock.

## Areas and insights by province

Fixtures: `fixtures/getPopularAreasByProvince.json` and `fixtures/getProvinceInsights.json`.

- Popular areas: Gauteng has 8 areas with counts (Johannesburg, Pretoria, Sandton, Centurion, Midrand,
  Randburg, Roodepoort, Soweto) and 4 zero-count fallbacks; Western Cape 5 + fallbacks;
  KwaZulu-Natal 2 + fallbacks; every other province has fallbacks only (all zero, so tiles show the
  province name). Hrefs are published paths from `cityGuides.ts` where one exists.
- Province insights: Gauteng (province figures + 3 cities), Western Cape (province + 1 city),
  KwaZulu-Natal (`province: null`, 1 city), every other province empty.
- `MOCK_LEGACY_API=1` answers both procedures with `NOT_FOUND` (the page falls back to the static
  area list and the insights empty state). `MOCK_EMPTY_INSIGHTS=1` empties `getProvinceInsights` too.

Restart the mock after pulling this change: it only reads fixtures live, not the handlers.

## Property price insights switches

`homeMarketInsights.getHomepageCityInsights` returns four sample cities (Johannesburg, Cape Town,
Pretoria, Durban; `fixtures/getHomepageCityInsights.json`). Cape Town has no price per m², its
leading locality has no page, and Durban has no city page, so the "leave it out" cases are visible.

- `MOCK_LEGACY_API=1` answers this procedure with `NOT_FOUND` (an API that does not have it yet);
  the section shows its empty state.
- `MOCK_EMPTY_INSIGHTS=1` returns an empty list; the section shows its empty state.

Restart the mock after changing either switch.

## Add or change a fixture

Fixtures are JSON files in `scripts/preview/fixtures/`, read on every request (no restart needed).

- Listings: edit `searchPublicInventory.json`. Entries are compact; the server expands them to the full
  card shape. `image` is an index into the `images` list (files under `client/public/properties/`).
- Developers: edit `listPublishers.json`.
- A new procedure: add a fixture file, a handler returning `{ json, meta? }` (superjson shape) and an
  entry in the `PROCEDURES` map in `mock-api.mjs`.

## Self-test

Start the mock on a spare port, then run the checks (exits non-zero on failure):

```
PORT=5055 node scripts/preview/mock-api.mjs &
MOCK_PORT=5055 node scripts/preview/selftest.mjs
```

The self-test also checks the insights procedure; give it the same `MOCK_LEGACY_API` or
`MOCK_EMPTY_INSIGHTS` value as the mock. `PORT=5055` works for the self-test as well as `MOCK_PORT`.

Run it a second time against `MOCK_LEGACY_API=1 PORT=5055 node scripts/preview/mock-api.mjs` with
`MOCK_LEGACY_API=1 MOCK_PORT=5055 node scripts/preview/selftest.mjs` to check the legacy rejections.
