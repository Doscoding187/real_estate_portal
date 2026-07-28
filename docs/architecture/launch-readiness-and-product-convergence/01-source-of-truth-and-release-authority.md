# Source of Truth and Release Authority

| Field | Authority |
| --- | --- |
| Status | **Accepted target authority; current implementation is mixed as recorded below** |
| Verified current repository state | `main` was verified at the Stage 1 base SHA; no canonical integrated preview worktree exists. |
| Not yet implemented | Candidate authority, deployment reconciliation, and development-media authority. |

## Authority hierarchy

| Authority | Purpose | May modify it | Must not modify it directly | Required evidence | Current status |
| --- | --- | --- | --- | --- | --- |
| Application implementation | Committed Git source for application behaviour | Approved reviewed changes | Dirty worktrees, dashboard edits, or uncommitted local files | Commit SHA, review, validation | **Partial** — committed source exists; preview topology is fragmented |
| Production source | `main` is the accepted production source authority; branch protection must be evidenced before production promotion | Controlled exact-SHA promotion | Feature worktrees or direct hosting-source edits | `main` SHA and protected-branch evidence | **Partial** — Git `main` is verified; branch protection and live deployment relationship are not yet verified |
| Integrated local acceptance | Future short-lived candidate for one full-product acceptance cycle | Approved integrations into that candidate | A permanent drifting branch or ad-hoc edits | Candidate branch, exact SHA, clean status, local validation | **Not yet established** |
| Production deployment | Deploy the exact approved `main` SHA | Controlled deployment process | Branch ambiguity, unrelated dashboard changes, or an unrecorded redeploy | Provider deployment SHA, health/version evidence, smoke evidence | **Conflicted** — tracked startup/deployment configuration and runbooks require reconciliation |
| Database schema | Canonical migrations and approved migration ledger | Dedicated database-authority work | Manual DDL, schema push, archived migrations | Migration checksum, ledger, database contracts | **Established** — see [database authority entry](../../database-authority/00-database-authority-agent-entry.md) and [database authority policy](../database-authority-policy.md) |
| Local development data | Approved local MySQL target for development and manual testing | Approved local bootstrap/seed workflows | Production imports or unacknowledged destructive reset | Local target guard, bootstrap and demo verification | **Partial** — target authority exists; environment linkage must be repaired in Stage 2 |
| Production business data | Production database holding business records | Approved production operations and migrations | Local scripts or candidate workflows | Production target guard and release evidence | **Partial** — target policy exists; deployment execution authority is not reconciled |
| Local/development media | Future explicitly approved development storage | Approved Stage 5 storage design | Production buckets or ungoverned shared storage | Storage target and isolation proof | **Not yet established** |
| Production media | Approved durable production object storage | Controlled production storage operations | Local fallback or development storage | Production storage/preflight evidence | **Partial** — production requirements exist; full separation is not yet proven |
| Launch findings and decisions | This committed launch-readiness documentation | Approved documentation updates | Untracked notes, isolated engine documents, or informal chat alone | Issue ID, SHA, evidence, decision, verification fields | **Established by Stage 1** |

## Candidate rule

The accepted authority model rejects a permanent, continuously drifting `release/launch-candidate` branch. A future candidate must be short-lived, tied to an exact recorded SHA, and discarded after its acceptance/promotion cycle. It is an integration and acceptance artefact, not a second permanent production authority.

## Boundary with existing authority

This programme does not replace the established [database authority policy](../database-authority-policy.md), its migration authority, or any separately approved engine architecture. It records launch disposition and cross-cutting evidence only.
