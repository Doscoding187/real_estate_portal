# Land Consumer Journey Contract

## Geography authority

Every public Land search has one geography authority: one admitted
`canonicalPlaceId`, or a same-level sibling OR selection of admitted
`canonicalPlaceIds`. Both forms identify Places in the canonical Place
authority.

The router rejects mixed or retired inputs, including typed city/province,
numeric location IDs, Search Areas, and display text. Services do not choose a
winner, merge scopes, widen the boundary, or fall back to listing labels. A
manual edit replaces the selected Place handoff before the request is sent.

Canonical IDs resolve through Place Authority. Multi-Place Land searches
resolve to the exact selected siblings only. The public Land consumer remains
gated until canonical Land assignments are available.

## Public classification

Only `LAND_PUBLIC_CLASSIFICATIONS` may appear in public Land search and Land
authoring. Adding a classification requires an end-to-end authoring,
publication, and public-search contract with tests; it must not expose an
authoring-only value to consumers.
