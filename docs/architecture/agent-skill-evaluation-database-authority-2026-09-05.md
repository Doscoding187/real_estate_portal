# Database Authority Skill Admission Review — 2026-09-05

**Status:** reviewed admission record; not a controlled performance benchmark

## Decision

Retain and register `property-listify-database-authority` as an active Tier 0
instruction-only skill at version `1.0.0`. Pair it with the canonical Database
Operating Playbook. It may route work and improve evidence quality; it may not
grant credentials, create connections, run a release, or introduce a helper,
hook, MCP server, network action, or persistent memory.

This admission addresses a demonstrated decision problem: database work was
spanning local worktrees, Railway deployments, TiDB Console evidence, migration
recovery, provider capability convergence, and application readiness without a
single reusable phase model. The record does not claim that the skill alone
caused any production result or that it improves elapsed time.

## Representative evidence

| Case | Failure mode to contain | Skill/playbook decision | Evidence |
| --- | --- | --- | --- |
| Railway runtime identity | A deployed process could be mistaken for a local worktree or resolve an unknown credential class. | Resolve and authorize the immutable target before any connection; report sanitized identity only. | Database Authority runtime context and production deployment logs from the 2026-09-04 cutover. |
| TiDB zero-statement migration failures | A failed migration could be retried, replayed, or “fixed” by editing history. | Preserve the durable attempt, archive rejected SQL unchanged, and use only the named reviewed recovery path. | Sequenced `0001` and `0046` recovery plans and release evidence; approved exception register. |
| Canonical reference data | A code deployment could be confused with live commercial reference-data completion. | Keep `main`/Railway/Vercel delivery separate from the protected `release-reference:*` plan/apply/verify sequence. | Canonical-commercial v3 release plan, apply, and verify output. |
| TiDB CHECK capability | A successful migration head could be treated as proof that physical CHECK enforcement exists. | Inspect provider capability and schema congruency; run the bounded convergence plan and count violations before apply. | 22 missing checks with zero violating rows in the read-only 2026-09-04 production plan; apply held for explicit review. |
| Runtime consumer drift | A failing test could invite alternate queries or retired columns. | Read the canonical model, reconcile the consumer, and fail visibly instead of guessing. | Database authority policy, consumer contracts, and the green post-fix CI run. |

## Observable dimensions

- **Authority compliance:** target, operation, manifest head, and canonical model
  are identified before action.
- **Outcome quality:** recovery and convergence are bounded to named objects
  and preserve durable evidence.
- **Verification quality:** liveness, schema congruency, data roles, readiness,
  consumer tests, and deployment smoke are reported as distinct claims.
- **Safety:** no secret-bearing URL, manual protected DDL, ledger edit,
  archived SQL replay, or unreviewed external capability was introduced.
- **Efficiency:** the playbook supplies a reusable routing record and evidence
  packet so later operators do not rediscover the same control boundaries.

## Observed added cost and limits

The playbook adds an explicit classify/resolve/inspect/plan/review/apply/verify
sequence and therefore may add a short planning step to a trivial local query.
That cost is intentional at a protected boundary. There is no paired
unskilled-vs-skilled implementation run, no token-count experiment, and no
claim of universal database-provider coverage. Generic platform advice remains
non-authoritative.

## Validation route

The admission is supported by:

```text
pnpm agent:skills:check
pnpm db:authority:check
focused database-authority contract tests
CI DB Contract Verification and application checks
```

The skill's registry record, frontmatter, manifest pointer, agent profile,
entry contract, and playbook are checked together. Future revisions must use a
new review record or an update to this one and must preserve the Tier 0
capability boundary.

## Next review

Review on or before **2026-12-05**, or sooner if a new provider, credential
class, migration runner, automated helper, protected release operation, or
repeated operator failure changes the decision boundary. Any capability beyond
instruction-only requires a separate governance proposal and explicit review.
