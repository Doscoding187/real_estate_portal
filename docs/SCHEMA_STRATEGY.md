# Retired Schema Strategy

> **Superseded governance document.** This historical strategy is not a
> source of truth and must not be used for migrations, backfills, manual SQL,
> production changes, rollback, or schema design decisions. Git history
> retains the former document.

Current schema and database authority is defined by:

- [`database-authority/00-database-authority-agent-entry.md`](database-authority/00-database-authority-agent-entry.md);
- [`database-authority/database-change-protocol.md`](database-authority/database-change-protocol.md);
- [`architecture/database-authority-policy.md`](architecture/database-authority-policy.md); and
- [`../server/migrations/README.md`](../server/migrations/README.md).

Production seed authority is `none`. Any future schema or data transition
requires an approved Database Authority workstream and operating contract.
