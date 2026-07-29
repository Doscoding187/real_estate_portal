# Evidence Sequence and Provenance Contract

| Field | Authority |
| --- | --- |
| Status | **Current governance slice. Proposed repository authority until this document is reviewed and merged.** |
| Purpose | Make every material authority claim traceable from mechanism through evidence, limitation, and authorised action. |
| Does not authorise | Stage 2B, environment reconciliation, a canonical preview, candidate creation, worktree retirement, runtime changes, or deployment changes. |

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

The PR #419–#421 review cycle is the initiating case study, not a substitute for this permanent method.

| Repository evidence | Supported lesson | Boundary |
| --- | --- | --- |
| PR #419 merged with one source commit and later review findings. | A merged PR is not proof that every actionable finding was corrected. | This record does not itself prove the final audit wording in later `main`. |
| PR #420 merged with final head `cf728f…` and no separately authorised corrective commit. | Discussed corrective work must be proven in the current PR head and GitHub patch before merge consideration. | CI on an unchanged head cannot prove an uncommitted correction. |
| PR #421 added a second corrective commit `13b8adf…`; its merge commit was `3cae0178…` and the accepted and merged trees were verified equal. | A different merge-commit SHA is acceptable only when accepted-head and promoted-tree identity are proven equal. | Tree equality does not prove hosted environment correctness or product acceptance. |
| The Stage 2A status command implementation and observed sanitized run were inspected separately from filesystem inspection. | Internal classification and connection gating must be distinguished from later human-visible output; each filesystem fact must retain its own evidence source. | One command run does not inherit filesystem checks it does not perform. |

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
6. Required checks completed successfully on the current head SHA.
7. Required local worktrees are clean.
8. Merge method is authorised.
9. Expected head is used as a merge condition where supported.

Green CI alone is insufficient. A previously reviewed or passing SHA cannot validate a later head, and a correction discussed in chat cannot substitute for a commit visible in the current GitHub patch.

### After merge

Post-merge closure requires merge commit and parent verification; accepted-head tree versus merged-main tree equality; PR-attributable scope verification; detached verification at the exact merge commit; clean fast-forward synchronization of the control worktree; historical-thread closure only after final merged evidence; automatic-deployment observation where applicable; and temporary-verifier cleanup.

Different commit SHAs are acceptable only under the release rule: accepted candidate tree SHA equals resulting `main` tree SHA. Any tree difference invalidates acceptance and requires a new acceptance cycle.

## 8. Future candidate and deployment evidence

No candidate is created by this document. Before a future canonical-preview or launch-candidate claim is accepted, record candidate commit and tree; environment-contract version; sanitized database-target classification; migration state; frontend and backend source identities; storage/media environment; feature/configuration manifest; desktop, mobile, and functional acceptance; known limitations; Edward’s approval; promotion identity; production-deployment identity; post-promotion tree equality; and production smoke evidence.

Keep Vercel and Railway evidence separate. A Vercel deployment may prove the frontend deployment record; it does not prove Railway/backend deployment authority or hosted binding correctness.

## 9. Future worktree-retirement evidence

No worktree inventory or deletion is authorised by this document. A worktree may be classified safe to retire only when a retirement record proves its exact path and registration, branch/detached state, HEAD, clean tracked state, no staged changes, no untracked files, no unique commits requiring preservation, branch containment or accepted PR promotion, PR state, no active operational purpose, no recovery designation, and no other worktree dependency.

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
| Worktree-retirement procedure | **Required before Worktree Lifecycle Reconciliation Audit execution** | Retirement must apply this record model before any worktree is classified or removed. |
| Optional engine-specific templates | **Deferred** | No real engine finding yet requires them. |

## 11. Use and validation

Use the reusable records in [Authority evidence record templates](07-authority-evidence-record-templates.md). A material existing-behaviour statement in an audit must have a mechanism, evidence source, and boundary; use a claim record when those details are not visible in surrounding text.

This contract does not supersede the [database authority entry contract](../../database-authority/00-database-authority-agent-entry.md), launch-register disposition, or an approved security/data-integrity procedure. It controls how their claims are evidenced, bounded, and promoted into a decision.
