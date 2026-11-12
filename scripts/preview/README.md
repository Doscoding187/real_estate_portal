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

| Procedure                           | Homepage section                                         |
| ----------------------------------- | -------------------------------------------------------- |
| `properties.searchPublicInventory`  | Explore property (Buy and Rent rails, by province)       |
| `cataloguePublisher.listPublishers` | Explore real estate developers                           |
| `auth.me`                           | Signed-out visitor (returns `null`)                      |
| `GET /api/readiness`                | Maintenance gate (returns `{ kind: 'readiness', ok: true }`) |

Gauteng and Western Cape have 8 sale and 6 rent listings, KwaZulu-Natal has 3 sale, every other
province is empty (so the empty state can be reviewed). Any other procedure returns a tRPC
`NOT_FOUND` error and logs `[mock-api] NOT_FOUND procedure: <name>` so missing fixtures are obvious.

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
