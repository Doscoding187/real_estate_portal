---
name: property-listify-verification-handoff
description: Property Listify protocol for implementation tasks where Edward + ChatGPT explicitly own expensive deterministic final verification after an agent produces a stable candidate. Use only when that external handoff is assigned; do not use it to skip focused implementation verification, safety investigation, or repository authority requirements.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Property Listify Verification Handoff Protocol

> This skill changes **where deterministic verification is performed**. It does
> not lower Property Listify’s quality, security, database, or acceptance
> standards.

## Purpose

Property Listify is execution-led. Implementation agents should use their
reasoning, context, and execution time primarily for investigation,
architecture and authority decisions, implementation, focused tests, debugging
actual defects, security and data-integrity reasoning, and bounded corrections.

When Edward + ChatGPT explicitly own final deterministic verification, an
implementation agent should produce a coherent candidate and concise handoff
rather than repeatedly running expensive release gates locally.

## Precedence and boundaries

Repository-native authority remains authoritative, including `AGENTS.md`,
domain approvals, security requirements, and Property Listify Database
Authority. This skill does not authorize commits, broaden task scope, change
domain ownership, or override an explicit request to run a particular check.

It never permits raw DDL, `db:push`, manual migration-ledger edits, manual
database cleanup, direct source-script execution, unapproved target mutation,
or production/shared database access.

For database-bearing work, follow the mandatory `AGENTS.md` startup rule:
load `.agent/skills/property-listify-database-authority/SKILL.md`, read
`docs/database-authority/00-database-authority-agent-entry.md`, and run
`pnpm db:authority:status` before database work.

## When this protocol applies

Use this skill only when the task explicitly:

- requests a Verification Handoff Packet;
- assigns final deterministic gates to Edward + ChatGPT; or
- otherwise establishes Edward + ChatGPT as the final verification layer.

It applies across Property Listify domains, including Buy, Rent, Developments,
future services, payments, admin, security-sensitive work, and database work.
If the task requires final verification by the implementation agent, follow
that instruction instead.

## Implementation-agent responsibilities

Run focused checks needed to develop safely and establish that the changed
behavior is coherent. Choose checks according to the changed surface and risk;
examples include focused unit or integration tests, authorization or
tenant-isolation tests, narrow static or runtime diagnostics, migration-manifest
validation, and authority-approved focused database checks.

Use the canonical command defined by the repository for the purpose at hand.
Discover it from `package.json`, `AGENTS.md`, applicable repository authority,
or governing documentation. Do not assume that a generic command or a command
from another repository is valid here. For example, the current repository’s
normal lint script is `pnpm lint`; command ownership can change, so confirm it
before recommending or running a final gate.

An agent must not knowingly hand off code it knows is broken. Investigate and
correct actual failures within the approved task scope; never claim an unrun
check passed.

### Risk override

External final verification does not prevent an implementation agent from
running a broader check when it is materially necessary to establish the safety
or correctness of its own implementation. Token or context efficiency never
overrides necessary verification for authorization, payments, security,
data integrity, migrations, destructive operations, or another P0/P1-oriented
risk.

## Final verification normally handed off

After a coherent candidate exists, Edward + ChatGPT normally run expensive,
deterministic final gates. Depending on the changed surface, this can include
the repository’s full typecheck, lint, build, CI-equivalent tests, disposable
database bootstrap, schema congruency or inventory, database contract
verification, Database Authority final/static gate, `git diff --check`, and
browser suites.

These are not a universal command list. Recommend the exact, currently
canonical commands that cover the candidate’s modified surface. Do not rerun a
final gate merely to reproduce external evidence for the same eligible
candidate.

## Candidate identity and handoff packet

Verification evidence belongs to a commit SHA, not a branch name, uncommitted
worktree state, or verbal description.

When committing is authorized, final verification should normally target an
exact committed candidate SHA. This skill does not itself authorize a commit.

When the task prohibits or has not authorized a commit, return the exact base
SHA and a clear, cleanly described uncommitted-diff state. Label it an
**uncommitted candidate**, not final-verification eligible. Do not represent an
uncommitted state as exact-SHA final-verification evidence.

Return a concise packet:

```text
Verification Handoff Packet

Candidate: <full candidate commit SHA, or “uncommitted candidate”>
Base SHA: <full merge-base or stated base SHA>
Branch/worktree: <branch>; <absolute worktree path>
Candidate state: <committed and verification-eligible, or uncommitted with a concise diff/status summary>

Material changes:
- <files or domains materially changed>

Architecture and authority decisions:
- <only decisions material to review or verification>

Focused verification already run:
- <exact command> — PASS — <brief result>

Database/schema implications:
- <none, or governed classification, migration head, and focused evidence>
- <confirm no prohibited database operation was used>

Security-sensitive implications:
- <none, or authorization/data/payment/security surface and focused coverage>

Known limitations:
- <none, or bounded limitations>

Unresolved P0/P1 findings:
- <none, or each finding and why it prevents handoff>

Recommended final verification:
- <exact canonical command> — <why it covers this candidate>
```

Do not paste large successful logs. Summarize success; include relevant error
output only when it is needed for diagnosis.

## Candidate-SHA evidence invariant

Accept final verification evidence only when it identifies the exact candidate
commit SHA, the command or check performed, a clear result, sufficient
environment or target context where relevant, and the changed surface covered
when that is not otherwise obvious.

When Edward + ChatGPT provide valid evidence for the exact eligible candidate
SHA, treat that evidence as authoritative for the stated command. Do not
automatically rerun it.

Rerun or request a repeat only when the candidate SHA changed; evidence is
incomplete, ambiguous, or for a different SHA; the check did not cover the
modified surface; a correction invalidated its coverage; or a material safety
concern specifically requires re-verification.

After a code change, identify the new candidate SHA and only the checks
invalidated by the changed surface. Preserve unaffected evidence when its scope
still applies; do not mechanically repeat every expensive gate after a bounded
change. For local validation-scope selection during implementation, follow
`.agent/skills/property-listify-test-selection/SKILL.md`.

## Database protection

Database safety remains governed by Property Listify Database Authority.
Implementation agents may design approved migrations, align schema consumers,
and run focused authority-approved checks needed during development. Long
clean-bootstrap, full schema-congruency, inventory, and CI-style database
verification may be handed to Edward + ChatGPT.

If a database operation is incomplete, ambiguous, or reports unexpected
migration state: stop; preserve the exact governed command, sanitized target
classification, plan heads, durable attempt state, and relevant sanitized
output; do not retry, edit a ledger, or clean up manually; and return that
evidence for the approved governed recovery or verification operation.

## Final-verification failure routing

- **Pass:** record exact-candidate evidence. Do not send the agent back merely
  to rerun it.
- **Implementation failure:** return the material failure for diagnosis and a
  bounded correction.
- **Environment or tooling failure:** treat it as procedural unless it exposes
  a product defect.
- **New P0/P1 finding:** return it for Edward + ChatGPT materiality review
  before another substantive correction cycle.

P2/P3 findings do not automatically block shipping; report them accurately and
follow the task’s prioritization decision.

## Default workflow

```text
Edward + ChatGPT
define outcome, invariants, and risk boundaries
        ↓
Implementation agent
investigate → implement → focused verification → candidate where authorized
        ↓
Verification Handoff Packet
        ↓
Edward + ChatGPT
run deterministic final verification against the exact committed candidate SHA
        ↓
PASS → remaining integration, push, or PR work only
FAIL → classify materiality → return genuine defect for bounded correction
```

## Governing principle

Use agent intelligence for work that requires intelligence. Use deterministic
tools for deterministic verification. Move duplicated expensive execution to
the stable final-verification layer without reducing engineering quality,
security validation, database safety, or acceptance criteria.
