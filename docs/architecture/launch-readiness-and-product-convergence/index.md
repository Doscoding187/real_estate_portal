# Property Listify Launch Readiness and Product Convergence

| Field | Current authority |
| --- | --- |
| Programme status | **Stage 1 — launch-readiness governance authority merged, post-merge verified, and complete. Stage 2A — local environment-authority audit complete and under architectural review in this branch. Environment linkage has not been repaired, and the complete local-environment authority contract is not yet established.** |
| Purpose | Establish one durable place for launch decisions, manual findings, and the evidence needed before implementation or release progression. |
| Current authorised stage | Stage 2A documentation closure only. It does not authorise environment repair, runtime, deployment, database, media, frontend, backend, or feature changes. |

## Authority roles

- **Edward** is the founder, product owner, manual acceptance tester, and final product-approval authority.
- **ChatGPT** holds architecture, scope, review, and implementation-authorization authority.
- **Codex** is responsible for bounded implementation, repository inspection, validation, and technical evidence.

## Current boundary

Broad feature and engine implementation is paused while launch convergence is established. Security, data-integrity, and severe operational-risk work remain subject to separately approved bounded slices.

No canonical integrated local preview or launch candidate exists yet. A future candidate will be short-lived, acceptance-specific, and tied to one exact Git SHA; it is not a permanent `release/launch-candidate` branch. Stages 3–6 remain unauthorised.

## Documents in this authority slice

1. [Launch convergence charter](00-launch-convergence-charter.md)
2. [Source-of-truth and release authority](01-source-of-truth-and-release-authority.md)
3. [Manual audit and triage method](02-manual-audit-and-triage-method.md)
4. [Central launch register](03-launch-register.md)
5. [Engine backlog authority](04-engine-backlog-authority.md)

## Ordered programme stages

1. **Stage 1 — governance authority:** establish this documentation authority and its central register.
2. **Stage 2 — local environment authority:** repair and prove the approved local-environment model without creating a canonical candidate.
3. **Stage 3 — integrated local-preview authority:** establish a repeatable full-stack local-preview procedure and its exact-SHA evidence.
4. **Stage 4 — deployment and migration authority:** reconcile production startup, migration, deployment, and rollback controls.
5. **Stage 5 — media authority:** establish an explicit separation between local/development and production media storage.
6. **Stage 6 — acceptance candidate and promotion:** create a short-lived candidate, conduct integrated acceptance, and promote the exact approved SHA through the controlled production sequence.

## Progression beyond Stage 2A

Stage 2B requires a separately approved scope to define the complete local-environment authority contract and implement non-mutating diagnostics. It must not repair worktree links, create a canonical launch candidate, alter deployment authority, or broaden into feature work.
