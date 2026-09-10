# P7 domain supply and geography audit

The governed Land boundary is explicit: a public request has exactly one
geography authority (typed city/province, one canonical location, same-level
sibling locations, or one authorised Search Area). The Land public and
authoring routers validate `LAND_PUBLIC_CLASSIFICATIONS`; public services
also apply the allow-list at query time. Mixed geography and authoring-only
classifications fail closed in the focused suites.

The authority-run development publication lifecycle currently passes 21
physical tests. It covers owner-scoped publication, review transitions,
Launch Access expiry, public withdrawal, external availability updates,
ownership isolation, concurrent review decisions, and atomic rejection of
invalid auction terms. Unit availability updates lock both the development and
active unit-type rows before validating and writing the counters.

Focused Land and geography suites pass 47 tests across the public service,
projection, router, Search Area authority, and geography contract surfaces.

The Commercial office contract suite now passes 20 tests, including ordered
availability provenance and strict UTC microsecond timestamp normalization.
This packet is not closed. A complete P7 acceptance still needs independent
physical evidence for mixed-authority Land requests against the running public
journey, plus dedicated Commercial economics and Shared Living ownership and
moderation proofs. The current evidence supports retaining the existing
canonical geography and domain tables while those tests are added.
