# Evidence Sequence and Provenance Contract

| Field | Authority |
| --- | --- |
| Status | **Evidence Sequence and Provenance Contract established through PR #422 and corrected through PR #423. PR #423 is merged, tree-equivalent, post-merge verified, synchronized, and its historical review findings are closed. This contract is current repository authority.** |
| Purpose | Make every material authority claim traceable from mechanism through evidence, limitation, and authorised action. |
| Does not authorise | GME-B until separately approved; the Worktree Lifecycle Reconciliation Audit until GME-B is completed and verified plus Edward separately approves its bounded read-only scope; Controlled Worktree Retirement; Stage 2B; environment reconciliation; a canonical preview or candidate; runtime changes; or deployment changes. |

## 1. Permanent authority rule

No material authority claim may be accepted because its wording sounds plausible. It must follow this complete chain:

```text
Implementation or mechanism
        ↓
Execution sequence
        ↓
Observed or inspected result
        ↓
Evidence source and identity
        ↓
Supported authority claim
        ↓
Explicit evidence boundary
        ↓
Authorised decision or action
```

If a step is not directly evidenced, label it **Inferred**, **Unknown**, **Partial**, **Conflicted**, or **Blocked** as appropriate. Do not replace an unknown sequence with plausible wording.

### Mandatory claim record

Every material claim uses the five mandatory fields below. The reusable form is in [Authority evidence record templates](07-authority-evidence-record-templates.md#authority-claim-record).

| Field | Required content |
| --- | --- |
| Claim | The exact proposition asserted. |
| Mechanism | The implementation, process, or platform producing the behaviour. |
| Sequence | The relevant order of decisions, side-effect gates, actions, and output. |
| Evidence | The direct source proving the claim, with source identity and freshness where material. |
| Boundary | What the evidence does not prove or authorise. |

Useful optional fields are authority owner, evidence timestamp, commit/tree identity, environment, confidence, contradiction state, and next gate. Optional fields may add detail; they never replace a core field.

## 2. Initiating case study and governance implication

The PR #419–#422 review cycle is the initiating case study, not a substitute for this permanent method.

| Repository evidence | Supported lesson | Boundary |
| --- | --- | --- |
| PR #419 merged with one source commit while three actionable review threads remained unresolved. | Known current-head review evidence must block merge; passing checks and technical mergeability do not override it. | This record does not itself prove the final audit wording in later `main`. |
| PR #420 merged with final head `cf728f…` and no separately authorised corrective commit. | Discussed corrective work must be proven in the current PR head and GitHub patch before merge consideration. | CI on an unchanged head cannot prove an uncommitted correction. |
| PR #421 added a second corrective commit `13b8adf…`; its merge commit was `3cae0178…` and the accepted and merged trees were verified equal. | A different merge-commit SHA is acceptable only when accepted-head and promoted-tree identity are proven equal. | Tree equality does not prove hosted environment correctness or product acceptance. |
| PR #422 merged with final head `b6b4af…`, one source commit, and two unresolved non-outdated P2 threads. | Documentation alone does not technically enforce merge authority; a later GitHub Merge Gate Enforcement slice is required before the worktree audit. | This record does not prove current GitHub ruleset or branch-protection enforcement. |
| PR #422 CI Pipeline run `30431380874` used the `pull_request` event; its checkout logs show `refs/pull/422/merge` at `cd573dc…`, generated from head `b6b4af…` and base `3cae017…`. | API run metadata, PR-head identity, and actual checkout identity are distinct evidence and must all be recorded. | This observed run does not prove that every workflow or future PR uses the same checkout strategy. |
| Existing Git integration created Vercel preview `dpl_6cSGHRSd9evrv5c1FbHBnBvmdfLd` for PR head `b6b4af…` and production deployment `dpl_2ziTndDNXh66gS95SWRyFoaRNGUH` for merge `c77766e…`; no manual deployment or deployment-configuration change occurred. | Automatic preview and automatic production deployment are platform evidence and must be recorded separately from manual deployment/configuration changes. | `READY` does not prove Railway, hosted-environment correctness, complete runtime correctness, or product acceptance. |
| The Stage 2A status command implementation and observed sanitized run were inspected separately from filesystem inspection. | Internal classification and connection gating must be distinguished from later human-visible output; each filesystem fact must retain its own evidence source. | One command run does not inherit filesystem checks it does not perform. |

### Claim record: PR #422 CI provenance

| Field | Record |
| --- | --- |
| Claim | PR #422 CI success was evidence for its synthetic merge source pair, not direct execution of the raw PR-head SHA. |
| Mechanism | `pull_request` workflows with default `actions/checkout@v4` checkout; GitHub Actions CI Pipeline run `30431380874`. |
| Sequence | GitHub generated the pull-request merge ref from head `b6b4af…` and base `3cae017…`; each recorded job checked out `refs/pull/422/merge` at `cd573dc…`; checks then completed. |
| Evidence | Workflow source, run metadata, and checkout logs for run `30431380874`; all four jobs logged the same synthetic checkout identity. |
| Boundary | This proves the observed workflow/source pair only. It does not prove all workflows or future PRs use the same ref, nor that the checks resolved review findings. |

## 3. Evidence classes

| Class | Typical sources | What it can support | Required boundary |
| --- | --- | --- | --- |
| **Static implementation evidence** | Source, configuration, scripts, schema, tests, documented contracts | Intended or coded behaviour. | Does not prove execution in any runtime. |
| **Execution evidence** | Sanitized command/test output, logs, observed process results | What occurred in the observed execution context. | Does not prove other environments or future executions. |
| **Filesystem evidence** | File type, owner/group, mode, link resolution, timestamps, worktree registration | Metadata and path state at inspection time. | State whether symbolic links were followed; it is not semantic configuration proof. |
| **Structural evidence** | Variable-name inventory, duplicate/malformed findings, headings, parsed schema shape | Format or inventory properties. | Parsing success does not prove semantic correctness or runtime necessity. |
| **Repository evidence** | Branch, commit, parent, tree SHA, diff, containment, PR head, worktree state | Source identity, scope, and history. | Distinguish commit identity from tree identity; clean tracked state does not prove no untracked work. |
| **Review evidence** | Review comments, thread states, change requests, current-head coverage | Review disposition for an identified head. | Resolved/outdated state must be tied to the current head SHA. |
| **CI evidence** | Check/job/step, associated SHA, status, conclusion | Only the checks that ran against that source identity. | Does not prove review correction, acceptance, deployment correctness, or environment correctness. |
| **Platform/deployment evidence** | Vercel, Railway, GitHub deployment state, aliases, hosted bindings | The platform completed its recorded deployment state. | `READY` does not prove complete runtime correctness, hosted secrets, backend equivalence, or acceptance. |
| **Human acceptance evidence** | Edward’s desktop/mobile/functional walkthrough and explicit result | Product approval for the exact accepted commit and tree. | It does not generalise to a changed tree or other environment. |
| **External research evidence** | Official platform documentation, primary research, regulatory sources | Applicability-supported external facts. | Record source freshness and applicability; do not substitute generic advice for repository authority. |
| **Negative evidence** | Scoped search with no result, no unresolved thread, no unique commit | Absence within the stated search scope. | Never expand it into an absolute claim beyond that scope. |

One evidence source must not receive credit for a fact another source proved. Static inspection and observed execution remain separately labelled.

## 4. Execution-sequence method

For every material process claim, record:

1. Trigger.
2. Inputs.
3. Relevant internal decisions.
4. Side-effect gates.
5. Side effects.
6. Observable output.
7. Completion state.
8. Failure path.

Agents must distinguish internal state from printed output; classification from reporting; decision from action; validation from mutation; connection eligibility from connection occurrence; command start from its first side effect; deployment creation from readiness; readiness from acceptance; and merge-commit identity from tree identity.

For example, a command can classify a target internally, gate connection, query an approved target, and only then print a final report. It is inaccurate to say that an operator saw the classification before connection unless output ordering is independently verified.

## 5. Provenance, identity, and confidence rules

1. Attribute a fact only to the mechanism that directly proved it.
2. Do not inherit guarantees from another evidence source.
3. Label static implementation inspection and observed execution separately.
4. Do not attribute filesystem facts to an application command unless its implementation explicitly checks them.
5. Do not credit CI with review, merge, deployment, or human-acceptance evidence.
6. Do not credit platform `READY` with complete runtime correctness.
7. Do not generalise human acceptance beyond the exact accepted tree.
8. Label inferences as **Inferred** and surface contradictory evidence as **Conflicted**.
9. Record evidence freshness and source identity whenever they affect authority.
10. A correction is not complete until the current GitHub PR head and its patch contain it.

### Controlled authority labels

| Label | Use only when |
| --- | --- |
| **Verified** | Direct, identified, sufficiently fresh evidence proves the full claim and sequence needed for that claim. |
| **Observed** | A bounded execution or inspection was witnessed, without generalising beyond its context. |
| **Inferred** | A reasoned conclusion follows from evidence but was not directly observed. |
| **Partial** | Evidence proves only a stated subset of the claim. |
| **Unknown** | Required evidence is absent or sequence/identity is not established. |
| **Conflicted** | Credible evidence sources disagree or current authority is inconsistent. |
| **Blocked** | A required gate cannot be safely completed. |
| **Not applicable** | The criterion does not apply to the declared scope. |
| **Outside current scope** | The question is real but is not authorised for this slice. |

Do not use **Verified** for indirect evidence, inferred sequence, unknown identity, stale material evidence, or a claim only partly supported.

## 6. Claim boundaries and contradiction handling

Every material conclusion states its explicit limit. At minimum, retain these distinctions:

- A merged PR does not prove local control-worktree synchronization.
- An identical tree does not prove deployment-environment correctness.
- A `READY` Vercel deployment does not prove Railway deployment.
- An approved database target does not prove complete application configuration.
- A clean worktree does not prove branch containment in `main`.
- A merged PR does not prove untracked local work is absent.
- An existing fallback does not prove that fallback is safe or honest.
- A variable reference does not prove the variable is required.
- Absence from one search does not prove repository-wide absence.

When evidence conflicts, record the competing mechanisms, identities, timestamps, and boundaries. Do not silently choose the more convenient claim; block the dependent action until the conflict is resolved or an authorised exception records the risk.

## 7. Pull-request, merge, and post-merge gates

### Before merge

The PR readiness record must prove all of the following:

1. Exact base and current head identity.
2. Commit count and authorised file scope.
3. GitHub patch contains the authorised correction.
4. No unresolved actionable review thread on the current head.
5. No current-head change request.
6. Required checks completed successfully against the exact source identity each workflow actually tested.
7. Required local worktrees are clean.
8. Merge method is authorised.
9. Expected head is used as a merge condition where supported.

For a pull-request workflow using GitHub's synthetic merge ref, record the tested merge ref and SHA together with the PR-head SHA and base SHA that generated it. For a workflow explicitly checking out the head, record the head SHA as the tested identity. Record the workflow event, workflow name, run, attempt, check/job, status, and conclusion. A change to either source identity invalidates the previous synthetic-merge result and requires a new tested merge identity and checks.

Green CI alone is insufficient. A previously reviewed or passing source pair cannot validate a changed head or base, and a correction discussed in chat cannot substitute for a commit visible in the current GitHub patch.

### After merge

Post-merge closure requires merge commit and parent verification; accepted-head tree versus merged-main tree equality; PR-attributable scope verification; detached verification at the exact merge commit; clean fast-forward synchronization of the control worktree; historical-thread closure only after final merged evidence; automatic-deployment observation where applicable; and temporary-verifier cleanup.

### Governed pull-request preservation rule

For an ordinary governed pull request, record the accepted PR-head commit and tree, merge commit, and merged-`main` tree at that merge commit. The accepted PR-head tree must equal the merged-`main` tree under the preservation-based merge rule. A tree difference invalidates the reviewed PR authority and requires renewed review.

### Launch-candidate promotion rule

For a launch candidate, record the accepted candidate commit and tree, exact environment, and Edward's founder-acceptance evidence separately from PR review evidence. The accepted candidate tree must equal the promoted-`main` tree. Any tree difference requires a new candidate acceptance cycle. This related integrity mechanism does not turn ordinary PR review into founder launch acceptance.

## 8. Future candidate and deployment evidence

No candidate is created by this document. Before a future canonical-preview or launch-candidate claim is accepted, record candidate commit and tree; environment-contract version; sanitized database-target classification; migration state; frontend and backend source identities; storage/media environment; feature/configuration manifest; desktop, mobile, and functional acceptance; known limitations; Edward’s approval; promotion identity; production-deployment identity; post-promotion tree equality; and production smoke evidence.

Keep Vercel and Railway evidence separate. A Vercel deployment may prove the frontend deployment record; it does not prove Railway/backend deployment authority or hosted binding correctness.

## 9. Worktree reconciliation and controlled retirement

### Worktree Lifecycle Reconciliation Audit

The Worktree Lifecycle Reconciliation Audit may begin only after all three prerequisites are satisfied:

1. This Evidence Contract Review Closure is merged and post-merge verified.
2. The GitHub Merge Gate Enforcement slice is completed and its resulting authority is verified.
3. Edward separately approves a bounded read-only audit scope.

After those gates, the audit may inventory worktrees, inspect repository and filesystem state, classify them, identify preservation requirements, and recommend retain, investigate, recovery-required, or safe-to-propose categories. It may not remove worktrees, delete branches, discard changes, alter environment files or links, or perform retirement.

### Controlled Worktree Retirement

A later mutating phase may classify a named worktree safe to retire only when a retirement record proves its exact path and registration, branch/detached state, HEAD, clean tracked state, no staged changes, no untracked files, no unique commits requiring preservation, branch containment or accepted PR promotion, PR state, no active operational purpose, no recovery designation, and no other worktree dependency. It also requires a separately approved procedure naming exact targets, preservation evidence, removal commands, local/remote branch-deletion policy, recovery/rollback, and post-removal verification.

Merged PR alone, clean tracked state alone, and branch containment alone are each insufficient. Retirement audit and deletion are separate authorisation phases.

## 10. Propagation decision

This contract is the initial authority. Wider propagation needs a separate approved slice except where a future small cross-reference is explicitly authorised.

| Target | Timing | Reason |
| --- | --- | --- |
| `AGENTS.md` | **Required before Stage 2B** | Agents need the claim-chain rule before variable and fallback analysis. |
| Database-authority skill | **Required before Stage 2B** | Database status, target classification, and evidence provenance are the initiating operational case. |
| Launch-readiness methods and launch register templates | **Required immediately through this slice** | This document and the linked templates establish the initial method without changing unrelated operating instructions. |
| PR template/review guidance | **Required before the next implementation PR** | Current-head patch, review, and check gates must govern code changes. |
| Audit templates | **Required before Stage 2B** | Variable classification requires direct evidence and boundaries per finding. |
| Candidate-acceptance templates | **Required before candidate creation** | Candidate commit/tree and human acceptance must be recorded before promotion. |
| Deployment-verification templates | **Required before Stage 4** | Platform, backend, tree, and smoke evidence must remain separate. |
| GitHub Merge Gate Enforcement | **Required before Worktree Lifecycle Reconciliation Audit** | PR #422 proved that documented gates do not establish technical enforcement by themselves. |
| Worktree-retirement procedure | **Required before Controlled Worktree Retirement execution** | Retirement must apply this record model before any worktree is removed. |
| Optional engine-specific templates | **Deferred** | No real engine finding yet requires them. |

## 11. Merge-enforcement boundary, use, and validation

This contract defines the required merge authority but does not by itself technically block a manual merge. GitHub rulesets or branch protection are **Partial** or **Unknown** until a dedicated GitHub Merge Gate Enforcement audit verifies required checks, required conversation resolution, stale-review handling where applicable, force-push/deletion controls for `main`, permitted merge methods, administrator bypass behaviour, and current head/base source-pair freshness. That enforcement slice must complete before the Worktree Lifecycle Reconciliation Audit begins.

Use the reusable records in [Authority evidence record templates](07-authority-evidence-record-templates.md). Every material existing-behaviour statement in an audit exposes all five fields—Claim, Mechanism, Sequence, Evidence, and Boundary—either inline in a structured surrounding record or in the authority-claim template. `Sequence: Not applicable` is permitted only with an explicit reason; it must never be silently omitted.

This contract does not supersede the [database authority entry contract](../../database-authority/00-database-authority-agent-entry.md), launch-register disposition, or an approved security/data-integrity procedure. It controls how their claims are evidenced, bounded, and promoted into a decision.
