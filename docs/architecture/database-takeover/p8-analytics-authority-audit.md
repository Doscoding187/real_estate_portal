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

Replay deduplication for browser events remains a separate P8 requirement; the
current event contract has no client event identity, so a unique database key
cannot be introduced without first defining that product-level identity.
