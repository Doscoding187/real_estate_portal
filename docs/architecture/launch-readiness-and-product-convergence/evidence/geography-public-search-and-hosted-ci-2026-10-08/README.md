# Hosted CI correction and canonical Place public-search continuation

The published reviewed correction is `499cab892902ba1bd4fd6ff7524b8e0e042d17d5`
on [geography PR #594](https://github.com/Doscoding187/real_estate_portal/pull/594).
The later local search source is `b3fad5cfb1dde7c514425b56f199565da72c2507`, on
`fix/geography-ci-senior-20261008` in the owned worktree
`/home/edwardspc/Desktop/Dev/worktrees/property-listify-geography-ci-senior-20261008`.
The original dirty geography worktree and separate orphaned Git-link cleanup
were not changed.

## Exact hosted attribution

[CI Pipeline 37755969972](https://github.com/Doscoding187/real_estate_portal/actions/runs/37755969972)
passed on attempt 1; there was no workflow dispatch or rerun. All five jobs passed:
DB Contract Verification, Location Authority, Lint & TypeCheck, Unit & Integration
Tests, and Build Application. The test step passed 18 Place-command tests, 2,002
client tests and 3,082 server tests (66 explicitly skipped).
[Frontend Build Guard 37755969978](https://github.com/Doscoding187/real_estate_portal/actions/runs/37755969978)
also passed.

The hosted merge checkout was `d2581f356bfd83b724c147d540f6bb7cab3aa9a0`, with parents
`7756376c9ec604b352595b4e4ba8ced73f18562b` and the published candidate. Its tree and
the candidate tree are identical: `6805082360ddbd4df338b90dde674e25116fbfa1`.
Fresh fetches confirmed that main remained at the accepted integration base.
See `hosted-candidate.json` and the raw checkout/test-summary extraction.

The separate automatic Vercel preview status remains failing. Preview and
production deployment acceptance are not claimed. The PR description now states
the exact tested candidate and the separate later local source.

## Search behavior and approved policy

The public Buy/Rent result-page selector preserves the chosen opaque
`canonicalPlaceId` in the URL, parsed intent, API request, filtering, card and
saved-search evaluation. Editing its text clears the identity. Refresh, price
refinement, sort and pagination retain that identity. Repeated IDs, malformed
IDs, or a Place combined with typed geography, numeric handles, sibling OR
locations, factual handles or Search Areas are refused. Invalid UI requests
cannot query inventory. Existing Land classifications and mixed-authority
rejection remain unchanged and tested.

`place-inventory-scope-2026-10-07-v1` implements Edward's approved consumer policy:

- Locality membership is exact Place identity.
- Province membership contains only searchable admitted assignments whose whole
  authoritative containment chain validates to that province. Municipality
  context contributes provincial evidence and never becomes a city. Multiple
  parents, missing/retired parents, cycles, inverted/malformed scopes and an
  exhausted traversal are refused.
- City/town membership is exact assignment. The current admitted packages contain
  no reviewed descendant city membership; containment or market associations
  do not widen it. Future reviewed membership requires a new policy revision.
- Search Areas retain their separate governed journey and query boundary.

One validated graph supplies both membership and labels for a Place request.
Public cards derive their locality from active preferred Place names, not
addresses or legacy numeric joins. A public projection with a different Place
from its approved source, or competing numeric handles, fails eligibility.
Retired/non-searchable assignments and missing/ambiguous preferred labels cannot
enter public cards. No schema, migration, admission artifact or factual edge
was changed.

Development inventory has no canonical Place assignment. An explicit development
source under a Place scope reports unavailable; the mixed source search includes
only eligible Place-assigned manual properties. It never bridges development
inventory through names or unrelated numeric geography. Homepage legacy
selection and other domain-specific consumer migrations are not certified by
this result-page continuation.

## Customer proof

The real HTTP lifecycle creates and publishes a North Riding home using its
admitted identity `pl-place-01-6a145c6d642ba208a2c12de7`, plus a separately published
Bryanston control. Chromium runs the built application against the owned local
HTTP server, selects North Riding, verifies the serialized API input, sees only
the relevant listing, displays **North Riding, Gauteng**, follows the returned
property link, and sees the detail successfully. `customer-proof.json` records
the exact synthetic property IDs; `north-riding-results.png` and
`north-riding-detail.png` show the result. No external browser request is allowed
by the test. Media, enquiry and custody assertions from the original journey
also pass.

Broader-scope coverage is separate: Gauteng search includes both localities;
a published Soweto city assignment appears under Soweto search while North Riding
and Bryanston remain excluded. Unit graph tests independently exclude a different
province and reject malformed authoritative chains. The prepared graph projection
agrees with the established executable reader for pinned admitted identities.

Final focused validation passed: 103 server tests across ten files, 118 client
tests across ten files, canonical authority static checks, `pnpm check`, focused
lint (zero errors; existing warnings) and frontend build. The last combined
HTTP/browser/search regression run passed 42 tests across four files. Tests are
not double-counted across reruns. Hosted success applies only to the published
correction; this later local source has not been pushed or hosted-tested.

## Database and acceptance boundary

Route: consumer; canonical authority is modular Drizzle plus the active migration
manifest, the database policy/exceptions, the Land contract and approved geography
search policy. The registered database-authority operating guide was followed.
Local operations mutated only the exact owned `disposable-worktree` target:
`listify_wt_geography_ci_senior_20261008_415473525d2a`, fingerprint
`d6a578f82a01027cf0878262274a095803a13da294b396abada9b8f098167c89`, native port 3307.
It was recreated, fresh migrations were applied once from none through 0111,
and schema congruency proved all 39 CHECKs enforced. Reference, admitted Gauteng
Places, foundation and scenario roles were prepared; relevant role verifiers and
location-discovery readiness passed. Final status proves manifest-head-ready,
no incomplete attempt and schema congruency. The exact target was disposed after
verification; the shared native service was left available for other workstreams.

No staging/production database was accessed; production schema/reference
application, deployment, payment activation and national launch acceptance were
not performed. The protected national release and its 720 OSM-only exclusions
remain separate from disposable CI fixtures. This packet certifies the stated
local consumer behavior and the SHA-bound hosted CI repair only.

`source-provenance.json` pins the twenty source-file hashes to the local source
commit. `SHA256SUMS` covers the evidence files. Browser-harness corrections used
the approved local API origin and the card's actual accessible link; no production
environment guard was weakened.
