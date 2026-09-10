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
The migration is registered as the active manifest head and included in the
generated canonical model inventory.

The unmounted `partnerLeadRouter` and its stub `leadGenerationService` were
removed. Their disconnected `partner_leads` table was retired by migration
0078 after a repository-wide reachability search found no runtime imports or
route registration. The active partner and lead journeys use the canonical
`partners`, `leads`, and `lead_deliveries` authorities.

Replay deduplication for browser events remains a separate P8 requirement; the
current event contract has no client event identity, so a unique database key
cannot be introduced without first defining that product-level identity.
