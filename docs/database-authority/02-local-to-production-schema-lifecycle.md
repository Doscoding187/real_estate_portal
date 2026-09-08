# Local-to-production schema lifecycle

**Authority:** Database Authority v3  
**Status:** Canonical operating contract

The local database is a disposable implementation and verification target. It
is not itself the source of truth. The source of truth is the reviewed Git
change consisting of the Drizzle model, generated inventory, active migration,
manifest checksum, runtime consumers, and executable tests.

Production is a deployed instance of that reviewed contract. It must never be
used to design a schema, and a provider console must never become a second
migration authority.

```text
author → Drizzle model → migration → manifest → PR/CI → protected release → verify
          disposable local database       disposable CI databases   production
```

| Environment | Purpose | Schema mutation |
| --- | --- | --- |
| Worktree local | Develop and prove a change | Database Authority only |
| CI | Reproduce from empty and test consumers | Isolated disposable database |
| Staging/disposable TiDB | Prove provider compatibility | Approved test target |
| Production TiDB | Serve users | Named protected release only |

“It works locally” means a fresh worktree database can be created from the
active migration chain and application contracts pass. It does not mean a
manual `ALTER TABLE` or an uncommitted local change is releasable.

## Mandatory change path

1. Change the canonical Drizzle definition and affected runtime consumer.
2. Create one ordered migration for the smallest independently verifiable
   expansion. Keep TiDB-sensitive columns, indexes, foreign keys, and checks
   independently executable.
3. Regenerate and review `canonical-model-inventory.json`.
4. Add the migration to `server/migrations/manifest.json`; never edit an
   applied checksum or execute archived SQL.
5. Run the authority-owned worktree migration, congruency, readiness, and
   focused consumer tests.
6. Run the static authority gate and fresh-database CI contract suite. Any
   provider-sensitive change also needs the TiDB compatibility gate.
7. After merge, create a read-only protected release plan and review its target
   fingerprint, heads, pending files, attempts, and digest.
8. An explicitly approved operator applies the exact plan, then reruns
   migration, congruency, readiness, and relevant smoke checks.

Application startup must not migrate, seed, repair, or converge a protected
target. If the checklist cannot be satisfied, stop in inspect/plan and clarify
the authority. The lifecycle checker itself never connects to a database or
mutates data.
