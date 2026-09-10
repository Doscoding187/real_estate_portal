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
supply types are mapped. The next implementation step is a physical P3 test
packet covering duplicate prevention at each writer, concurrent publication,
withdrawal visibility, and rebuild equivalence. Until that evidence exists,
`sourceListingId` remains nullable and duplicate detection remains an explicit
failure state.

The focused contract suite `server/services/__tests__/inventoryLinkResolver.contract.test.ts`
proves all three resolver outcomes: one valid projection resolves, a missing
projection fails closed, and duplicate projections fail closed without choosing
a row.
