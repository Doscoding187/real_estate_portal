# Authority Evidence Record Templates

| Field | Authority |
| --- | --- |
| Status | **Current governance-slice templates. Reusable when the Evidence Sequence and Provenance Contract is accepted.** |
| Method | [Evidence Sequence and Provenance Contract](06-evidence-sequence-and-provenance-contract.md) |
| Boundary | Templates record evidence; they do not authorise implementation, merge, deployment, candidate creation, or worktree retirement. |

Use sanitized references. Never put credentials, complete credential-bearing URLs, personal data, or secrets in a record.

## Authority claim record

Use for every material technical, repository, platform, or operational claim.

| Field | Record |
| --- | --- |
| Claim |  |
| Mechanism |  |
| Sequence | Trigger → inputs → internal decisions → side-effect gates → side effects → observable output → completion/failure path. |
| Evidence | Source class, source identity, timestamp/freshness, and sanitized reference. |
| Boundary | What this evidence does not prove or authorise. |
| Authority owner |  |
| Status | `Verified`; `Observed`; `Inferred`; `Partial`; `Unknown`; `Conflicted`; `Blocked`; `Not applicable`; or `Outside current scope` |
| Next gate |  |

## Audit finding record

| Field | Record |
| --- | --- |
| Finding |  |
| Severity |  |
| Mechanism |  |
| Sequence |  |
| Evidence |  |
| Impact |  |
| Boundary |  |
| Decision |  |
| Required correction |  |
| Validation method |  |

## PR readiness record

| Field | Record |
| --- | --- |
| Base | Branch and SHA. |
| Head | Current branch and exact SHA. |
| Tree | Current head tree SHA. |
| Scope | Commit count, authorised file list, additions/deletions, and GitHub-patch confirmation. |
| Review state | Current-head threads, change requests, and reviewer coverage. |
| Current-head checks | Check/job name, associated SHA, status, and conclusion. |
| Remaining blockers |  |
| Merge authorization | Method, expected-head condition, approving authority, and result. |

## Post-merge verification record

| Field | Record |
| --- | --- |
| Accepted head | Commit SHA and accepted tree SHA. |
| Merge commit | SHA and title. |
| Parents | First parent and accepted PR-head parent. |
| Tree equality | Accepted-head tree versus merged-main tree; pass/fail. |
| Scope | PR-attributable file list, statistics, and diff-check result. |
| Detached verification | Path, exact detached SHA, content checks, and clean result. |
| Control synchronization | Starting SHA, fast-forward result, ending SHA, and clean result. |
| Historical-thread closure | Thread IDs, final merged evidence, reply, and resolution state. |
| Deployment observation | Platform, source SHA, target, state, aliases, and limitation. |
| Final authority verdict |  |

## Deployment evidence record

| Field | Record |
| --- | --- |
| Platform |  |
| Project/service |  |
| Source | Git, manual, or other authorised source. |
| Branch |  |
| Commit | Exact commit SHA. |
| Tree where available |  |
| Environment | Preview, production, staging, or other explicit target. |
| State |  |
| Aliases/domains | Sanitized public aliases only. |
| Hosted configuration authority | What source controls hosted variables; verified state and limitation. |
| Smoke evidence | Exact checks, observed result, and timestamp. |
| Boundary | What readiness and smoke results do not prove. |

## Worktree retirement record

| Field | Record |
| --- | --- |
| Path |  |
| Registration | Registered worktree evidence. |
| Branch | Branch or detached state. |
| HEAD | Exact commit SHA and tree where relevant. |
| Clean state | Tracked/staged status. |
| Untracked state | Explicit inventory result. |
| Unique commits | Containment or preservation result. |
| PR/containment | Relevant PR state and branch containment. |
| Purpose | Active, recovery, audit, or other operational purpose. |
| Preservation requirement |  |
| Retirement decision | Safe to propose / blocked / retain. |
| Approval | Separate audit and deletion approval references. |

## Record-use rules

1. Complete all five core claim fields before treating a statement as material authority.
2. Attach evidence to its actual source class; do not use CI, deployment, or review status as a proxy for another evidence class.
3. Keep current-head SHA, tree identity, and timestamps when a later change could invalidate the record.
4. State a boundary even for a passing record.
5. A record may identify a proposed action, but only a separately authorised bounded slice may execute it.
