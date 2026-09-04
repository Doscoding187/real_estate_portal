# Rejected zero-statement migration evidence

Files in this directory are immutable evidence of migration attempts that
failed before executing any statement and were then explicitly reviewed and
replaced. They are not active migration authority and must never be executed.

`0019_catalogue_publisher_authority_immutability.sql` was rejected because it
uses a MySQL trigger, which is unsupported by Property Listify's TiDB target.
`0001_public_search_to_lead_reliability.sql` was rejected because TiDB cannot
create a unique index on columns introduced by the same `ALTER TABLE` job. The
sources are retained unchanged so their SHA-256 checksums continue to match the
durable failed-attempt records.
