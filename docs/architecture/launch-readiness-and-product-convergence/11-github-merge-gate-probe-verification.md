# GME-B2 — Controlled Merge Gate Probe Verification

## Objectives and status

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| Activation and rollback, pending-check blocking, conversation blocking and clearance, intentional failed-check blocking, exact revert, fresh-source recovery, tree restoration, ordinary merge-commit behavior and detached post-merge verification passed. | Active ruleset `19965838`, bounded PR observations, one isolated client test, normal revert, exact tree comparison, committed before/after conversation snapshots, and PR #428 merge/tree/parent evidence. | Activate and drill rollback; observe pending checks; create/resolve one COMMENT thread; commit and revert one failing test; await fresh checks; compare trees; capture durable states; merge PR #428 normally; verify detached post-merge state and synchronize control. | Records below and the post-merge closure record. | Strict-base isolation remains partial/bounded; historical failed-check attribution and historical recovery CLEAN/MERGEABLE capture remain partial/bounded. |

GME-B2 enforcement is active and governance-complete through PR #428 merge, detached post-merge verification, closure publication and control synchronization.

## Post-merge closure record

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| GME-B2 is governance-complete through PR #428 merge, detached post-merge verification, closure publication and control synchronization. | Ordinary GitHub pull-request merge under Active ruleset `19965838`, exact commit/tree/parent readback, detached verification and control-worktree `--ff-only` synchronization. | Accepted base `13a645b8697a1152ddf9ba3a8f9fe1c6c1a73820` → reviewed head `7b047530d04c7b92b593e5cec5b024af381b744a` → merge commit `1a27213310e635c39dc9924f5b0d0fd269d7cb22` → detached verification → closure publication → synchronized control. | PR #428 closure comment [`issuecomment-5123300616`](https://github.com/Doscoding187/real_estate_portal/issues/428#issuecomment-5123300616); first parent `13a645b8697a1152ddf9ba3a8f9fe1c6c1a73820`; second parent `7b047530d04c7b92b593e5cec5b024af381b744a`; accepted-head and merge tree `bbd45bc2fe517c10d57ea0e2dbcfd86af36bbe3b`; exact eight-file scope; four JSON snapshots parsed and hashes matched; detached post-merge verification passed; ruleset `19965838` remained Active and exact; production deployment `dpl_3WDixt8yWYz1GSi5uFfoV2Egztck4` was `READY`; control synchronized to `1a27213310e635c39dc9924f5b0d0fd269d7cb22`. | Strict-base evidence remains partial/bounded. Historical failed-check isolated BLOCKED attribution and historical recovery CLEAN/MERGEABLE capture remain partial/bounded because contemporaneous payloads were not retained. |

## Activation and rollback prerequisite

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| The exact Active payload and its recovery path were verified. | `PUT /repos/Doscoding187/real_estate_portal/rulesets/19965838`, API `2022-11-28`, followed by exact ruleset and effective-rule reads. | Active PUT 200 → Active readback → Disabled PUT 200 → effective rules `[]` → Active PUT 200 → restored Active readback. | Active digest `e46b0d22d7b8617ce2d652930a60e67198cfc040638c99e66a6023ab0d736706`; Disabled digest `7ddc2ceecf5b09afcc510b330cb913bae12638cfef9044530eb6410348ea3209`; `main` remained `1ab5f635…`; repository settings unchanged; detailed record: [document 10](10-github-merge-gate-active-enforcement.md). | Proves activation and rollback only; no malfunction occurred and rollback was not required during probes. |

## Probe evidence

### Pending-check blocking

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| Pending required checks blocked PR #428 in a clean, independently isolated observation. | Active strict required-status-check evaluation and GitHub GraphQL/API readbacks. | After evidence-gap correction `2e8dbef1…` was published and all five review threads were resolved, capture at `2026-07-29T19:02:10Z` recorded head `2e8dbef1174c458afd195333d8be2b04f19a8fec`, base `13a645b8697a1152ddf9ba3a8f9fe1c6c1a73820`, potential synthetic merge `6b2419b2ac4f726d6560a4a19d7cfd07762f2444`, and pending run `30482533905`; the pending DB Contract Verification check was job `90679991987`. | [GraphQL pending-check snapshot](evidence/gme-b2-pending-check-2026-07-29T19-02-10Z.json), SHA-256 `0ef24149f7cb95ebfadba21158be347a052a0f54edd835aeaf7d8210be51efbf`; [Actions jobs snapshot](evidence/gme-b2-pending-jobs-30482533905.json), SHA-256 `e58592721a655e67c6d329c26db76ec5bb2c3e3c29b275c6072101abed1954f2`; `mergeStateStatus: BLOCKED`; check rollup `PENDING`; unresolved-thread count zero; no merge attempt; Vercel was pending and DB Contract Verification in progress. The committed JSON files are the durable sanitized source payloads authenticated by the recorded SHA-256 digests; `/tmp` was only the original capture location. | No merge attempt, no `REQUEST_CHANGES`, no unresolved conversation or other review blocker contributed. This clean re-observation independently proves pending-check blocking; later checks may complete normally. |

### Source/base advancement

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| A fresh main source was incorporated through a normal merge and fresh checks ran. | Normal merge of `origin/main` into the probe branch. | PR #427 merge `311e7de05…`, PR #429 merge `13a645b…`; branch merge `de476ec2013ebb5fec0ffdd65b999a46f03cf681`; fresh checks followed. | No rebase, force-push, or direct main push. | Original stale-base blocking was confounded by genuine unresolved threads; independently isolated strict-base blocking is partial/bounded evidence. |

### Controlled unresolved conversation

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| An unresolved conversation blocked merge eligibility and resolution cleared the blocker on an unchanged source pair. | Active pull-request rule requiring resolved conversations. | Boundary-correction head `5feb9f8138e1d40b997226e312b6648e570ad033`, synthetic merge `cf380ec91d6c1983873e7806e28e68bcb3a93076`; one remaining inline COMMENT thread was observed with all six checks successful, then resolved without changing the head. | Before snapshot [conversation BLOCKED](evidence/gme-b2-conversation-blocked-2026-07-29T19-56-59Z.json), captured `2026-07-29T19:56:59Z`, SHA-256 `716e4a0fd3dbf729d75905a59f9c6e5d5eca29c5bcbfda614dea1d3b2e53c04a`; after snapshot [conversation CLEAN](evidence/gme-b2-conversation-clean-2026-07-29T19-57-42Z.json), captured `2026-07-29T19:57:42Z`, SHA-256 `4316f0b3a2d4ce88746ab1acf3315929e227ec78f2e8389b3079dd5900f71778`; thread `PRRT_kwDOQQWnOM6U4rH6`; unresolved count one then zero; all six checks successful; no `REQUEST_CHANGES`. | No merge attempt, no source mutation, no approval requirement, and no other unresolved conversation contributed. |

### Intentional failed required check

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| The intentional probe produced a deterministic failure in a required check. | One isolated temporary Vitest file and the required Unit & Integration Tests context. | Failure commit `69c6839b2e61843d70c4dc6a8864b0d3d23035f6` added one isolated client test; workflow `30476107598` ran; job `90658458432` failed in `Run tests`; the commit was then reverted exactly. | Failed workflow, job, assertion and synthetic merge `6ccf1817e0a60cc50dcf53ba0ecc15c175080410` are durably identified; expected `GME-B2-EXPECTED-PASS` but received `GME-B2-FAILURE-PROBE`. | The original contemporaneous merge-state payload was not retained. Historical attribution of `BLOCKED` solely to this failed check is partial/bounded. Required-check enforcement is independently proven by the committed clean pending-check observation. |

### Exact revert and fresh-source recovery

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| The exact revert removed the failure and triggered fresh successful checks for the new source pair. | Normal `git revert`, GitHub synthetic-merge checks and exact tree comparison. | Revert `886fc948a5d0bbdbad9b06e55258dbdd5106c676` removed the test; recovery workflow `30477349193` ran; required checks passed; recovered tree equals the pre-probe tree. | Revert identity, recovery workflow, successful required checks, temporary-test absence and tree `071b71710c0a2b2b166b68211c7a3d0bbe178841` are durably preserved. | The complete contemporaneous historical `CLEAN/MERGEABLE` payload was not retained. Historical merge-state recovery is partial/bounded; current-head eligibility is independently proven by final successful checks and current clean PR state. |

### Tree restoration

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| The final tracked tree equals the pre-probe tree. | Git tree identity comparison. | Compare pre-probe head `6dc26934…` with recovery head `886fc948…`. | Both trees equal `071b71710c0a2b2b166b68211c7a3d0bbe178841`; temporary test path is absent. | Commit history differs by the intentional failure and exact revert. |

### Merge-only and destructive-protection boundaries

| Claim | Mechanism | Sequence | Evidence | Boundary |
| --- | --- | --- | --- | --- |
| The Active ruleset configures merge-commit-only promotion. | Ruleset and effective-rule readback. | Read ruleset `19965838` and effective `main` rules before and after probes. | Empty bypass actors; zero approvals; resolved conversations; `allowed_merge_methods: ["merge"]`; four checks with App ID `15368`; deletion and non-fast-forward rules. | Configuration is verified. Eligible-PR behavior passed through the ordinary merge-commit method used by PR #428; no squash, rebase, destructive deletion, force-push, or direct-push attempt is authorized. |

## Probe matrix

| Probe | Status |
| --- | --- |
| Activation | Passed |
| Rollback | Passed |
| Pending checks | Passed through clean, independently isolated re-observation |
| Head-change invalidation | Passed |
| Intentional failed-check execution | Passed |
| Historical failed-check isolated BLOCKED attribution | Partial/bounded; contemporaneous payload not retained |
| Exact revert | Passed |
| Fresh required-check rerun | Passed |
| Unresolved conversation | Passed through durable independently isolated before/after snapshots |
| Tree restoration | Passed |
| Historical recovery CLEAN/MERGEABLE snapshot | Partial/bounded; contemporaneous payload not retained |
| Merge-method configuration | Passed by exact readback |
| Merge-method behavior | Passed through ordinary PR #428 merge commit |
| Strict base advance | Partial/bounded; independent stale-base blocking was not isolated |
| Merge-only/readback boundaries | Verified by readback; no destructive attempt |
| Final PR merge | Passed |
| Post-merge verification | Passed |
| Control synchronization | Passed |

## Rollback boundary

If active behavior differs from the accepted contract, submit the complete Disabled payload, verify empty effective rules, close probe PRs without merge, and stop. No enforcement malfunction was observed during these probes.

PR #428 is the completed GME-B2 closure vehicle. Conversation enforcement is durably proven by the committed before/after snapshots recording one unresolved conversation with all checks successful and `BLOCKED`, followed by zero unresolved conversations and `CLEAN` on the unchanged source pair. Merge-method behavior passed through the ordinary merge-commit method under the Active ruleset. GME-B2 is governance-complete through the closure record above.
