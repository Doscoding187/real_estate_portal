# Rejected zero-statement migration evidence

Files in this directory are immutable evidence of migration attempts that
failed before executing any statement and were then explicitly reviewed and
replaced. They are not active migration authority and must never be executed.

`0019_catalogue_publisher_authority_immutability.sql` was rejected because it
uses a MySQL trigger, which is unsupported by Property Listify's TiDB target.
Its source is retained unchanged so its SHA-256 checksum continues to match the
durable failed-attempt record.
