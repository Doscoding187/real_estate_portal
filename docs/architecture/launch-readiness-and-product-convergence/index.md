# Property Listify Launch Readiness and Product Convergence

| Field | Current authority |
| --- | --- |
| Programme status | **GME-B2 is complete through PR #428 merge, detached verification, closure publication and control synchronization. The Worktree Lifecycle Reconciliation Audit report is complete as a read-only evidence stage and found no presently qualified retirement candidates. Controlled Worktree Retirement remains blocked pending founder disposition review and separate authorization. Stage 2B remains blocked and separately unauthorized.** |
| Purpose | Establish one durable place for launch decisions, manual findings, and the evidence needed before implementation or release progression. |
| Current authorised stage | **Post-GME-B2 worktree reconciliation.** Control `main` equals `origin/main` at `1a27213310e635c39dc9924f5b0d0fd269d7cb22`. The audit found zero qualified retirement candidates. Founder Worktree Disposition and Candidate Qualification Review is required next; retirement and Stage 2B have not begun. |

## Authority roles

- **Edward** is the founder, product owner, manual acceptance tester, and final product-approval authority.
- **ChatGPT** holds architecture, scope, review, and implementation-authorization authority.
- **Codex** is responsible for bounded implementation, repository inspection, validation, and technical evidence.

## Current boundary

No existing worktree or branch may be deleted, pruned, moved, repaired, reset, rebased, cleaned, switched, detached, unlocked, or modified without separately authorized retirement operations. No canonical integrated local preview or launch candidate exists. Stage 2B is a separately authorized slice to define the complete local-environment authority contract and implement only non-mutating diagnostics. It permits no `.env.local` reconciliation, worktree-link repair, canonical preview creation, broader feature/integration implementation, or machine-local reconciliation.

## Documents in this authority slice

1. [Launch convergence charter](00-launch-convergence-charter.md)
2. [Source-of-truth and release authority](01-source-of-truth-and-release-authority.md)
3. [Manual audit and triage method](02-manual-audit-and-triage-method.md)
4. [Central launch register](03-launch-register.md)
5. [Engine backlog authority](04-engine-backlog-authority.md)
6. [Local preview environment-authority audit](05-local-preview-environment-authority-audit.md)
7. [Evidence Sequence and Provenance Contract](06-evidence-sequence-and-provenance-contract.md)
8. [Authority evidence record templates](07-authority-evidence-record-templates.md)
9. [GME-A — GitHub Merge Gate Current-State Audit and Target Contract](08-github-merge-gate-enforcement-audit.md)
10. [GME-B1 — Disabled GitHub Merge Gate staging and readback](09-github-merge-gate-enforcement-execution.md)
11. [GME-B2 — Active GitHub Merge Gate enforcement](10-github-merge-gate-active-enforcement.md)
12. [GME-B2 — Controlled merge gate probe verification](11-github-merge-gate-probe-verification.md)
13. [Worktree Lifecycle Reconciliation Audit](12-worktree-lifecycle-reconciliation-audit.md)

## Canonical programme stages

1. **Stage 1 — governance authority:** establish this documentation authority and its central register.
2. **Stage 2 — local environment authority:** repair and prove the approved local-environment model without creating a canonical candidate.
3. **Stage 3 — integrated local-preview authority:** establish a repeatable full-stack local-preview procedure and its exact-SHA evidence.
4. **Stage 4 — deployment and migration authority:** reconcile production startup, migration, deployment, and rollback controls.
5. **Stage 5 — media authority:** establish an explicit separation between local/development and production media storage.
6. **Stage 6 — acceptance candidate and promotion:** create a short-lived candidate, conduct integrated acceptance, and promote the exact approved SHA through the controlled production sequence.

Stage 2B is a separately authorized slice to define the complete local-environment authority contract and implement only non-mutating diagnostics. It does not authorize `.env.local` reconciliation, worktree-link repair, canonical preview creation, broader feature or integration implementation, or machine-local reconciliation.

## Governed sequence beyond GME-B2

1. **Evidence Contract Review Closure:** complete through PR #423.
2. **GitHub Merge Gate Enforcement:** GME-A, GME-B1 and GME-B2 are complete; ruleset `19965838` is Active and effective for `main`.
3. **Worktree Lifecycle Reconciliation Audit:** complete as document 12; strictly read-only against existing worktrees and branches.
4. **Founder Worktree Disposition and Candidate Qualification Review:** required because the audit found zero qualified retirement candidates; this is a read-only disposition review and does not alter worktrees or branches.
5. **Controlled Worktree Retirement:** separately authorized named batches only; not begun.
6. **Stage 2B:** separately authorized environment-contract and non-mutating-diagnostics slice; remains blocked.
7. **Stages 3–6:** separately unauthorized.

No stage above may broaden into feature work or alter deployment authority without its own approval.
