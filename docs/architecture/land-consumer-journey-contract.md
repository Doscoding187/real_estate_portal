# Land Consumer Journey Contract

## Geography authority

Every public Land search has exactly one geography authority. The accepted
authorities are a typed city/province pair, one canonical `locationId`, a
same-level sibling `locationIds` OR selection, or one governed `searchAreaId`.

Do not combine these forms. The router must reject a mixed request; services
must not select a winner, merge scopes, widen the boundary, or fall back to
listing display text. A manual edit intentionally replaces a canonical or
Search Area handoff before the request is sent.

Canonical IDs resolve through the location authority. Multi-location Land
searches resolve to exact siblings only. Search Areas resolve only when the
`plot_land` journey is explicitly authorised, and the parcel geography is the
query boundary.

## Public classification

Only `LAND_PUBLIC_CLASSIFICATIONS` may appear in public Land search and Land
authoring. Adding a classification requires an end-to-end authoring,
publication, and public-search contract with tests; it must not expose an
authoring-only value to consumers.
