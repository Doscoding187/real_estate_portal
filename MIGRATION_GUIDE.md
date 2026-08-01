# Database Migration Guide

> **Current authority.** This concise entry point replaces historical migration
> instructions. It does not authorize a migration, seed, backfill, repair or
> manual SQL operation.

All database changes are governed by the [Database Authority entry contract](docs/database-authority/00-database-authority-agent-entry.md),
the [Database Change Protocol](docs/database-authority/database-change-protocol.md),
and the [canonical migration README](server/migrations/README.md).

The canonical authority defines the approved migration tree, review gates,
environment protections and rollback or containment requirements. Feature
documentation, `.kiro/specs/**`, historical completion reports and legacy
setup guides cannot override it. Production seed authority is `none`.

If a requested change is not covered by the canonical authority, stop and
obtain an approved database workstream before operating on data or schema.
