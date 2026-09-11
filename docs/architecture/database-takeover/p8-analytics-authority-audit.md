# P8 analytics authority audit

Explore engagement rows are append-only facts keyed to canonical
`explore_content` items. The service already avoids exposing legacy Explore
write routes, but its short-stat projection incorrectly reported total views as
`uniqueViewCount`.

The projection now counts distinct authenticated users and anonymous session
identities for `view` events. Repeated views by one actor no longer inflate the
unique metric, while total `viewCount` remains the raw event counter. The
focused contract verifies that both identity branches are present in the
authoritative query.

Marketplace bundle attribution is now backed by the canonical relational
`bundle_attributions` table introduced by migration 0077. Bundle view,
partner-engagement, and lead-attribution writes use the Drizzle schema, and the
legacy logging and zero-count analytics paths now write and read that table.
The migration is registered in the active manifest lineage and included in the
generated canonical model inventory.

The unmounted `partnerLeadRouter` and its stub `leadGenerationService` were
removed. Their disconnected `partner_leads` table was retired by migration
0078 after a repository-wide reachability search found no runtime imports or
route registration. The active partner and lead journeys use the canonical
`partners`, `leads`, and `lead_deliveries` authorities.

Migration 0079 adds the canonical client event identity for browser engagement
retries. Migration 0080 is now the current manifest head.

Migration 0080 adds a durable request identity for service-lead fan-out. Each
provider obligation is keyed from the request identity, and creation of the
lead plus its initial `created` event now commits in one transaction. A retry
returns the existing lead IDs instead of creating duplicate service requests.

Partner analytics no longer probes the retired table or converts schema errors
into zero-valued reports. Explore content metrics are read from their canonical
tables, while lead counts remain explicitly unavailable until a governed
cross-domain attribution relation is defined.

Browser engagement events now require a client event identity at the governed
discovery boundary. Migration 0079 adds the nullable historical-compatible
column and unique key; current service writes always provide an ID, and a
duplicate key is treated as an idempotent replay without incrementing metrics.

The demand engine now wraps the demand lead, candidate reads, customer leads,
assignments, matches, status transitions, and notifications in one transaction.
A failure in the assignment branch rolls back the complete routing graph. A
physical failure-injection test remains required to prove that rollback on the
disposable target.

Media evidence currently covers canonical listing-media reconciliation and
property-card projection reads: `pnpm test:authority --
server/__tests__/integration.listing-media-reconciliation.test.ts
server/__tests__/integration.property-card-data-flow.test.ts` passed four
physical tests against the disposable target. The upload boundary contract
also proves that a client-supplied property namespace cannot escape the
authenticated draft scope. Cross-tenant media denial and a complete public
media rebuild proof remain P8/P9 review items.

Demand routing now has physical failure-injection evidence:
`pnpm test:authority --
server/__tests__/integration.demand-routing-rollback.test.ts` passed against
the disposable target. The test creates a real verified agency recipient,
active membership, matching property, and active campaign, then fails after
the routing callback; `demand_leads`, `demand_lead_assignments`,
`demand_lead_matches`, `leads`, and `notifications` are all absent after
rollback.

The media authority unit and listing lifecycle contracts were rerun:
`pnpm vitest run server/services/__tests__/listingMediaAuthority.test.ts
server/__tests__/contract.listing-lifecycle.test.ts` passed 47 tests. This
includes token scope/content validation, cross-tenant reservation denial,
confirmation custody rechecks, and approval-time media mirroring. Physical
cross-tenant media denial remains an integration-level review item.

Physical media custody evidence now covers the live router boundary:
`pnpm test:authority --
server/__tests__/integration.listing-media-tenant-boundary.test.ts` passed
against the disposable target. An unrelated user was denied before a Listing
media reservation was issued, and the owner listing retained zero media rows.
Confirmation after reassignment/deletion and public media rebuild equivalence
remain separate review items.

The same physical media boundary suite now also proves token invalidation after
listing deletion. A token minted for the owner is rejected with `FORBIDDEN`
by the confirmation route after the listing is removed, before storage-object
verification.

The active `marketingRouter.launchCampaign` path previously dynamically
imported `revenueCenterSync.ts`, whose revenue and failed-payment tables are
placeholder objects rather than canonical schema authorities. That launch path
is now explicitly gated with `PRECONDITION_FAILED` and no longer activates a
campaign or reports success until an admitted campaign/billing authority exists.
The placeholder module remains quarantined as historical reference and must be
replaced or removed before campaign launch is implemented.
