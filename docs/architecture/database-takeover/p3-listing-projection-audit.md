# P3 listing projection audit

The current model has two distinct identities: `listings.id` is the authored
source and `properties.id` is a public projection. `properties.sourceListingId`
is nullable and non-unique. That is intentional for the current product: the
projection also supports manually authored inventory and the runtime already
detects duplicate source links rather than selecting an arbitrary row.

Public eligibility requires a non-null source link, a published and approved
source listing, and a source listing that is not a revision. The inventory link
resolver refuses both missing and duplicate source links; bounded ordering is
used only to inspect evidence, never to choose a duplicate authority.

Archive operations preserve the projection row while archiving the linked
authored listing, so saved private facts do not lose their subject identity.

No schema change is admitted in this packet. Adding a unique constraint would
break existing valid manual and domain-specific projection paths before all
supply types are mapped. The current physical property-card and agency
attribution flows prove listing-backed attribution, missing-media fail-closed
behavior, and refusal to fall back to mutable source identity. The next
implementation step is a physical P3 test packet covering duplicate
prevention at each writer, concurrent publication, withdrawal visibility, and
rebuild equivalence. Until that evidence exists,
`sourceListingId` remains nullable and duplicate detection remains an explicit
failure state.

The existing `integration.agency-listing-performance-mvp.test.ts` contains the
rebuild-equivalence assertions: a revision approval updates the live listing
and public projection while preserving the original projection ID. Its guard
now admits `listify_wt_*` disposable authority targets, and an authority run
on the current target passed the full persisted workflow (including revision,
publication, access, and projection identity checks).

Following the empty-target rebuild, the broader physical lifecycle packet was
rerun on the same authority: development publication lifecycle, listing
publication readiness, and agency attribution passed 25 tests.

The authority-run suites
`server/__tests__/integration.property-card-data-flow.test.ts` and
`server/__tests__/integration.agency-listing-attribution.test.ts` provide the
current physical attribution evidence. The focused contract suite
`server/services/__tests__/inventoryLinkResolver.contract.test.ts`
proves all three resolver outcomes: one valid projection resolves, a missing
projection fails closed, and duplicate projections fail closed without choosing
a row.

Additional authority-run evidence on the disposable target:
`pnpm test:authority -- server/__tests__/integration.development-publication-lifecycle.test.ts
server/__tests__/integration.listing-publication-readiness.test.ts
server/__tests__/integration.agency-listing-attribution.test.ts` passed 25
physical tests. These cover approval/publication gating, withdrawal and
expired-access visibility, owner isolation, concurrent review decisions,
atomic publication rejection, listing readiness, and agency attribution.
Duplicate projection writer census and an explicit projection rebuild
comparison remain open P3 evidence items.

The writer census found no active callers of the legacy `createProperty` or
`createPropertyImage` facade exports. Those direct writers were removed in
`5de2d1bf`; the retirement contract now asserts they are absent. The only
runtime `properties` insert remaining outside governed fixtures is the
source-linked `upsertCanonicalPublicPropertyProjection` path, which rejects
multiple existing mirrors before writing.
