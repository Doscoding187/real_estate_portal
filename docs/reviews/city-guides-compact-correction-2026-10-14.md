# Compact homepage city-guide correction

The founder rejected the large image-led city cards in `ca5d3d7cb`. Restore the original compact image-left/text-right composition, using the generated city images in place of building icons. This correction supersedes the earlier report's four-card homepage presentation.

## Result

- All 12 existing guide records appear immediately: four columns and three rows on desktop. Tablets use two columns; mobile uses three compact rows in a native horizontal swipe rail.
- Small square city thumbnails sit beside the city name, province and Explore guide link. Desktop has no elevated card border or large picture area. Loading placeholders match the compact layout.
- One quiet image disclosure replaces the repeated badges on the thumbnails. The images' accessible text still identifies them as AI-generated city scenes.
- Existing canonical guide links, province browser, error/retry handling and real guide discovery are retained. This is a frontend presentation correction, with no query, schema, seed or data changes.

## Evidence

Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-homepage-ux-review-20261013`; branch: `feat/homepage-ux-review-20261013`.

Preview: http://localhost:3010

Screenshots and browser evidence: `/home/edwardspc/Desktop/Dev/review-artifacts/city-guides-compact-20261014/`.

11 existing component/homepage tests passed; typecheck, affected-file lint and whitespace checks passed. Browser checks at 1440, 768, 390 and 320px confirmed 12 guide links, compact images beside text, three desktop/mobile rows, no page-width overflow or page exceptions, and nine province choices. Scoped axe WCAG A/AA found zero violations. Desktop and mobile screenshots were reviewed visually.

Local-data verification reused the existing owned disposable demo. Database Authority status remained exact-worktree-owned, manifest-head-ready, schema-congruent and ready. Target fingerprint: `536d822ba96d14486486fb53065a78e2935b9d65c7a23484c3b06f05b7dda890`. No data writes, protected access, push, merge or deployment.

Changed files: `ExploreCities.tsx`, its existing tests, `HomeDesktopView.tsx`, `HomeMobileView.tsx`, and this review record. City-guide page redesign is outside this correction.
