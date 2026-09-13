# Central Launch Register

| Field            | Authority                                                                                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status           | Post-merge MVP findings recorded; launch remains blocked.                                                                                                                                                         |
| Scope            | Central launch disposition and verification register. It is not an implementation backlog.                                                                                                                        |
| Candidate status | Verification candidate 4e012b3044628fc06da7489c0055e9ce01bdc8d9; local fixes c6c9f1330ae3910bfbad7021735b231e90e984b0 await integration and acceptance.                                                           |
| Evidence method  | [Evidence Sequence and Provenance Contract](06-evidence-sequence-and-provenance-contract.md) governs material technical claims and their boundaries; this register remains the sole launch-disposition authority. |

## Stable issue identifiers

Use `LRC-<SURFACE>-<NUMBER>`, where `<SURFACE>` is a stable short surface or journey code and `<NUMBER>` is a zero-padded sequence within that surface. Example form only: `LRC-SEARCH-001`.

Do not reuse identifiers. A corrected finding retains its original ID and gains updated evidence/status fields.

## Required fields

| Field                                   | Required record                                                                              |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| Issue ID                                | Stable `LRC-<SURFACE>-<NUMBER>` identifier                                                   |
| Date observed                           | ISO date                                                                                     |
| Exact Git SHA                           | Candidate SHA once candidate authority exists                                                |
| Page or journey                         | Journey name                                                                                 |
| URL                                     | Exact observed URL where applicable                                                          |
| User role                               | Anonymous, buyer, agent, administrator, or applicable role                                   |
| Viewport or device                      | Desktop/mobile device and viewport                                                           |
| Current behaviour                       | Observed behaviour                                                                           |
| Expected behaviour                      | Approved launch expectation                                                                  |
| Evidence reference                      | Sanitized screenshot, video, test note, or other durable reference                           |
| Severity                                | L0, L1, L2, or L3                                                                            |
| Owning engine                           | Product engine or platform authority                                                         |
| Launch decision                         | Fix now, simplify, hide, honest placeholder, manual operational fallback, or defer           |
| Approved implementation branch/worktree | Blank until an approved bounded slice exists                                                 |
| Pull request or commit                  | Blank until implementation evidence exists                                                   |
| Integrated verification                 | Candidate-level result and SHA                                                               |
| Production verification                 | Post-deploy result and deployed SHA                                                          |
| Status                                  | Open, authorised, in progress, integrated verified, production verified, deferred, or closed |
| Notes                                   | Decision rationale, dependencies, and expiry/removal condition where relevant                |

## Compact register index

This index is for navigation and programme oversight. Its **Full record** column must link to the matching complete record in this document once a real finding exists; the expected anchor form is `#lrc-search-001`.

| Issue ID        | Date observed | Page or journey                     | Severity | Owning engine                   | Launch decision | Status      | Full record                |
| --------------- | ------------- | ----------------------------------- | -------- | ------------------------------- | --------------- | ----------- | -------------------------- |
| LRC-AUTH-001    | 2026-09-13    | Account recovery                    | L1       | Authentication                  | Fix now         | in progress | [Record](#lrc-auth-001)    |
| LRC-PUBLISH-001 | 2026-09-13    | Listing publication preflight       | L1       | Property Listing Engine         | Fix now         | in progress | [Record](#lrc-publish-001) |
| LRC-PAY-001     | 2026-09-13    | Payment containment and publication | L1       | Commercial access / publication | Fix now         | Open        | [Record](#lrc-pay-001)     |

## Complete per-finding record

### LRC-AUTH-001

| Field                                   | Record                                                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Issue ID                                | LRC-AUTH-001                                                                                                                 |
| Date observed                           | 2026-09-13                                                                                                                   |
| Exact Git SHA                           | 4e012b3044628fc06da7489c0055e9ce01bdc8d9 (initial); c6c9f1330ae3910bfbad7021735b231e90e984b0 (fixed source)                  |
| Page or journey                         | Account recovery                                                                                                             |
| URL                                     | http://127.0.0.1:5000/api/auth/reset-password                                                                                |
| User role                               | Visitor                                                                                                                      |
| Viewport or device                      | HTTP API / source inspection; viewport not applicable                                                                        |
| Current behaviour                       | Fresh UTC reset deadline parsed as local time; valid reset rejected.                                                         |
| Expected behaviour                      | Valid unexpired tokens reset the password; invalid/expired tokens fail closed.                                               |
| Evidence reference                      | [MVP closure report](../database-transition-and-launch/mvp-closure-report.md) — mechanism, sequence, execution and limits    |
| Severity                                | L1                                                                                                                           |
| Owning engine                           | Authentication                                                                                                               |
| Launch decision                         | Fix now                                                                                                                      |
| Approved implementation branch/worktree | verify/mvp-closure-post-577 / /home/edwardspc/Desktop/Dev/worktrees/property-listify-mvp-closure-post-577                    |
| Pull request or commit                  | c6c9f1330ae3910bfbad7021735b231e90e984b0                                                                                     |
| Integrated verification                 | Pending; local branch evidence only                                                                                          |
| Production verification                 | Pending; no protected access or deployment                                                                                   |
| Status                                  | in progress                                                                                                                  |
| Notes                                   | UTC parsing fixed; three regression cases and real HTTP recovery pass locally. Await integration and real mail verification. |

### LRC-PUBLISH-001

| Field                                   | Record                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Issue ID                                | LRC-PUBLISH-001                                                                                                           |
| Date observed                           | 2026-09-13                                                                                                                |
| Exact Git SHA                           | 4e012b3044628fc06da7489c0055e9ce01bdc8d9 (initial); c6c9f1330ae3910bfbad7021735b231e90e984b0 (fixed source)               |
| Page or journey                         | Listing publication preflight                                                                                             |
| URL                                     | http://127.0.0.1:5000/api/trpc/listing.getSubmissionPreflight                                                             |
| User role                               | Agent / agency; payment admin boundaries inspected statically                                                             |
| Viewport or device                      | HTTP API / source inspection; viewport not applicable                                                                     |
| Current behaviour                       | HTTP 500: db.select is not a function.                                                                                    |
| Expected behaviour                      | Preflight reports canonical publishing blockers without a runtime failure.                                                |
| Evidence reference                      | [MVP closure report](../database-transition-and-launch/mvp-closure-report.md) — mechanism, sequence, execution and limits |
| Severity                                | L1                                                                                                                        |
| Owning engine                           | Property Listing Engine                                                                                                   |
| Launch decision                         | Fix now                                                                                                                   |
| Approved implementation branch/worktree | verify/mvp-closure-post-577 / /home/edwardspc/Desktop/Dev/worktrees/property-listify-mvp-closure-post-577                 |
| Pull request or commit                  | c6c9f1330ae3910bfbad7021735b231e90e984b0                                                                                  |
| Integrated verification                 | Pending; local branch evidence only                                                                                       |
| Production verification                 | Pending; no protected access or deployment                                                                                |
| Status                                  | in progress                                                                                                               |
| Notes                                   | Authorized database instance now passed to readiness evaluators; HTTP 200 proven. Publication remains separately blocked. |

### LRC-PAY-001

| Field                                   | Record                                                                                                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Issue ID                                | LRC-PAY-001                                                                                                                                                         |
| Date observed                           | 2026-09-13                                                                                                                                                          |
| Exact Git SHA                           | 4e012b3044628fc06da7489c0055e9ce01bdc8d9 (initial); c6c9f1330ae3910bfbad7021735b231e90e984b0 (fixed source)                                                         |
| Page or journey                         | Payment containment and publication                                                                                                                                 |
| URL                                     | Static source inspection; no paid request executed                                                                                                                  |
| User role                               | Agent / agency; payment admin boundaries inspected statically                                                                                                       |
| Viewport or device                      | HTTP API / source inspection; viewport not applicable                                                                                                               |
| Current behaviour                       | Paid checkout/review routes remain exposed in source; publication preflight requires active subscription.                                                           |
| Expected behaviour                      | Disabled payment UI, backend and workers; publication only under an approved canonical cohort entitlement model.                                                    |
| Evidence reference                      | [MVP closure report](../database-transition-and-launch/mvp-closure-report.md) — mechanism, sequence, execution and limits                                           |
| Severity                                | L1                                                                                                                                                                  |
| Owning engine                           | Commercial access / publication                                                                                                                                     |
| Launch decision                         | Fix now                                                                                                                                                             |
| Approved implementation branch/worktree | verify/mvp-closure-post-577 / /home/edwardspc/Desktop/Dev/worktrees/property-listify-mvp-closure-post-577                                                           |
| Pull request or commit                  | Pending                                                                                                                                                             |
| Integrated verification                 | Pending; local branch evidence only                                                                                                                                 |
| Production verification                 | Pending; no protected access or deployment                                                                                                                          |
| Status                                  | Open                                                                                                                                                                |
| Notes                                   | Static containment finding, not an executed charge. Paid activation and privilege bypass are prohibited. Owner disposition required; no payment mutation performed. |

The compact index does not replace the complete issue record. Add one complete record under a heading using the stable issue ID when a genuine finding is first registered.

### LRC-<SURFACE>-<NUMBER>

| Field                                      | Record |
| ------------------------------------------ | ------ |
| Issue ID                                   |        |
| Date observed                              |        |
| Exact Git SHA                              |        |
| Page or journey                            |        |
| URL                                        |        |
| User role                                  |        |
| Viewport or device                         |        |
| Current behaviour                          |        |
| Expected behaviour                         |        |
| Evidence reference                         |        |
| Severity                                   |        |
| Owning engine                              |        |
| Launch decision                            |        |
| Approved implementation branch or worktree |        |
| Pull request or commit                     |        |
| Integrated verification                    |        |
| Production verification                    |        |
| Status                                     |        |
| Notes                                      |        |

## Register integrity rules

- Every compact-index row must link to one complete record in this document.
- A finding is not registered until all fields applicable to its current lifecycle stage are present. Fields that are not yet applicable must remain explicitly blank or be marked `Pending`; they must not be omitted.
- Evidence references must be sanitized and durable.
- Status changes must update both the compact index and the complete issue record.
- No real finding may exist only in informal chat, an engine backlog, or an isolated implementation branch.
- Engine-backlog linkage does not replace the central finding record or its launch disposition.
- A material technical assertion referenced by a finding must use the [authority claim record](07-authority-evidence-record-templates.md#authority-claim-record) or an equivalent record that preserves its mechanism, sequence, evidence, and boundary.
- Do not invent a finding merely to demonstrate this structure.
