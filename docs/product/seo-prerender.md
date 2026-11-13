# Build-time HTML for search engines and link previews

## What is prerendered

`pnpm build:frontend` writes a real HTML file for each of these, in addition to `/south-africa`:

| Family                                                                                                                                           | Source of truth                                                                                     | Approx. count |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------- |
| Homepage (`/`)                                                                                                                                   | `homePage()` in `server/_core/prerenderPages.ts`                                                    | 1             |
| Hand-approved places only: Gauteng, Johannesburg, Sandton, Rosebank (`shared/placeIndexAllowlist.ts`)                                            | `publishedCanonicalPlaceUrls()` filtered by the allowlist                                           | 4             |
| Fixed-content pages: `/about`, `/company/about`, `/faq`, `/support/faq`, `/terms`, `/privacy`, `/legal/*`, `/cookies`, `/compliance`, `/contact` | `client/src/lib/navLandingPages.ts` and the legal and contact pages                                 | 16            |
| Advertise pages: `/advertise`, `/advertise/sell/{agents,agencies,developers}`                                                                    | the preparation variants of those pages (only while `COMMERCIAL_ACTIVATION_STATE.enabled` is false) | 4             |

Each file is the application shell Vite built (scripts and styles untouched) with its own title,
description, canonical link, Open Graph and Twitter tags, robots, JSON-LD and a short readable body
inside `#root`. React replaces `#root` on boot. The client updates the head tags in place
(`client/src/lib/seo.ts` upserts singletons; managed JSON-LD is removed and rewritten), so nothing is
duplicated. The canonical link carries `data-route-meta="canonical"` so `MetaControl` removes it on
routes that set none.

### Place indexing rule (decision D3)

Build time has no listing data, so only the allowlisted places get raw `index, follow` HTML. Every
other published place (3,655 of 3,659) is served by the app shell and never prerendered; it still
opens for visitors. After boot the client sets robots from the server `indexable` flag
(`server/services/placeIndexabilityService.ts`): published AND (allowlisted OR at least one public
sale/rent listing OR at least one accepted development in its scope). The same flag filters
`/sitemap-places.xml`. Raw HTML must never say `noindex` for a page that can later become
indexable, so noindex is client-side only.

## Why

Link-preview bots (WhatsApp, Facebook, LinkedIn, X) and many crawlers do not run JavaScript. Before
this, every address returned the same empty shell and generic title. See memo 39, option A.

## The rule that keeps it honest

The prerendered head must equal what the React page sets after boot, and the body must contain only
text the live page shows. Place pages mirror `CanonicalPlacePage.tsx` (title, description, canonical,
breadcrumb, type line, intro line, sale and rent links). Static pages import the same config the page
renders from. Do not add child-place link lists to a place page body unless the page shows them.

## How to add a page family

1. Add a builder in `server/_core/prerenderPages.ts` that returns `PrerenderPage` objects (path, title,
   description, canonical path, robots, JSON-LD, escaped body HTML) and call it from `listPrerenderPages`.
2. Take the values from the same module or config the React page uses, never a second copy of the text.
3. Add a test in `server/__tests__/prerender.pages.test.ts`. Paths must be unique, lower-case, query-free.
4. No Vercel change is needed: the `{ handle: 'filesystem' }` route serves any generated `<path>/index.html`.

Pages that need live data (`/property/:id`, `/development/:slug`, agent pages) are not covered; that is
memo 39, option B.

## Budgets

With the allowlist only about 24 files are generated (static pages plus 4 places), so the earlier
3,679-file, 17 MB measurement no longer applies. `PRERENDER_LOCALITIES=false` still drops allowlisted
localities (Sandton, Rosebank).

## Routing

`vercel.ts` lists the `/south-africa` rule, then `{ handle: 'filesystem' }`, then the catch-all to
`/index.html`. In Vercel's routes format, routes before `handle: 'filesystem'` run first and the
filesystem is checked before any route after it, so a generated file wins and every other path still
reaches the application shell. Keep the handler directly before the catch-all (a test enforces this).

## How to verify once deployed

```
curl -s -A "Mozilla/5.0 (compatible; Googlebot/2.1)" https://www.propertylistifysa.co.za/gauteng | grep -E "<title>|rel=\"canonical\"|og:image|<h1>"
curl -s -A "WhatsApp/2.23" https://www.propertylistifysa.co.za/ | grep -E "<title>|og:title|<h1>"
curl -sI https://www.propertylistifysa.co.za/gauteng/akasia | head -5
```

Check that the title differs per page, the canonical is the page's own absolute URL, exactly one
canonical and one `<title>` exist, and an unknown path such as `/not-a-page` still returns the generic
shell. Confirm on a preview deployment first that `/gauteng` (no trailing slash) serves the generated
file; if it does not, add an explicit rewrite as the `/south-africa` rule does.

## Known limits

- The share image is `/assets/placeholder-home.jpg`, an existing file; replace it with a branded image.
- After boot, `applySeo` drops `og:image` and the place JSON-LD on place pages because the page sets
  neither. Crawlers read the prerendered head, which is what they need.
- Homepage body text mirrors the current hero; update it when the hero copy changes.
