# Homepage guidance cues

Updated 14 October 2026.

Property Listify covers property search, local insights, exploration and connections with property professionals and service providers. Keep the existing homepage identity and visual design.

The final change adds two cues to the original hero:

- “What are you looking for?” above the existing journey pills.
- An “Upcoming property tools” disclosure, closed initially, which reveals the existing Listmate, Buymate and Search by commute cards with their Planned badges.

The title remains “South Africa’s smarter property platform”, with the original subtitle, spacing, colours, search panel, filter layout and content-sized pills. All sections below the hero match integration base `d12dcfb73`. Search behaviour and location authority are unchanged.

The disclosure supports keyboard activation. Its mobile card strip can receive keyboard focus and scroll.

## Validation

- 18 existing homepage/journey tests pass.
- ESLint for the changed hero and `git diff --check` pass.
- Desktop (1440px) and mobile (390px) browser comparisons confirm the original heading text and identical pill-row dimensions. Individual Rent and Developments pills retain different widths based on their content.
- The dropdown starts closed, toggles with Enter, and reveals all three original tools.
- Neither checked viewport has page-level horizontal overflow.

## Review preview

Open `http://localhost:3010/`. Expand “Upcoming property tools” to see the original cards.

Branch: `feat/homepage-ux-review-20261013`.

Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-homepage-ux-review-20261013`.

The final branch diff against `d12dcfb73` contains only the hero changes described here and this review note. Review the final branch diff when integrating.

Local captures are in `/tmp/listify-home-ux/revised-desktop-closed.png`, `revised-desktop-open.png`, `revised-desktop-rent.png` and the corresponding mobile captures. The preview uses a temporary read-only loopback proxy on port 3000 connected to the other thread’s sample backend on port 5000. Use the existing demo on port 3009 for account writes. Those existing servers were not changed or restarted.
