# Property discovery acceptance artifacts

This directory contains visual direction and implementation artifacts used to
agree the public discovery journey.

- `search-results-card-direction-v1.png` — first-pass desktop Buy results and
  property-card direction, grounded in the 2026-08-28 local preview audit.
- `search-results-card-direction-v2.png` — accepted direction refined with
  distinct internal-area and erf/plot icons, compact structured highlights,
  and the quiet `View property` action.
- `search-results-card-implementation-desktop.png` — superseded narrow-shell
  implementation retained only as an audit record.
- `search-results-card-implementation-mobile.png` — superseded responsive
  implementation retained only as an audit record.
- `search-results-card-implementation-desktop-v2-corrected.png` — corrected
  implementation aligned to the accepted wide v2 composition, with an
  internal-area-first facts row, content-level Save/Compare controls, and
  typed highlight chips.
- `search-results-card-implementation-mobile-v2-corrected.png` — responsive
  verification of the corrected composition and highlight treatment.

## Reproducing the implementation captures

With the local backend and frontend running on `localhost:5000` and
`localhost:3009`, run:

```sh
pnpm artifacts:property-discovery
```

The capture uses the authority-owned local public-search scenario for real
card identity, navigation, pricing, facts, and controls. At the browser
transport boundary it substitutes only a deterministic, typed highlight fixture
so the compact-highlight state is visibly verified without mutating local data.
