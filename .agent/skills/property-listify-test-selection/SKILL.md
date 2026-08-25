---
name: property-listify-test-selection
description: Property Listify operating guide for choosing validation scope after an implementation slice, branch synchronization, bounded correction, or main-branch advancement. Use when deciding what to test, whether previous test evidence remains valid, or when escalating from focused validation to full-suite validation. Do not use it to weaken or bypass mandatory CI, security, authorization, payment, migration, or database-authority checks.
allowed-tools: Read, Grep, Glob, Bash
---

# Property Listify Incremental Validation and Test Selection

> **Optimise for sufficient evidence, not fewer tests. Test proportionally to
> change, not proportionally to repository size.**

## Why this exists

The repository suite exceeds 3,000 tests. They are not all equally relevant to
every slice. A test written months ago for an unrelated listing workflow does
not become more informative because a slice added Shared Living schema
migrations. Treating the suite as a ritual after every change wastes execution
time and hides signal. This skill teaches reasoning about change impact instead.

## Precedence and boundaries

Repository-native authority remains authoritative, including `AGENTS.md`,
Property Listify Database Authority, and the Verification Handoff protocol.
This skill governs **local validation scope selection only**. It never permits:

- weakening or skipping mandatory CI checks to reduce test time;
- claiming unrun tests as evidence;
- skipping verification for authorization, payments, security, data integrity,
  migrations, destructive operations, or other P0/P1-oriented risk; or
- overriding an explicit instruction to run a particular check.

## The three validation tiers

Distinguish between:

1. **Focused validation** — tests directly covering the changed code, schema,
   migration, service, journey, or contract.
2. **Affected-contract validation** — tests covering shared dependencies or
   platform contracts that the change could realistically break.
3. **Full-suite validation** — the complete repository suite, reserved for
   final candidate validation, release gates, broad cross-cutting changes, or
   when repository CI explicitly requires it.

## Default rule

Do not automatically run the entire repository test suite after every slice,
branch synchronization, or small correction.

Before testing, inspect the change surface (`git status`, `git diff`, the task
definition) and determine the smallest meaningful validation set. Prefer:

```text
changed code → directly affected tests → affected shared contracts → full suite when justified
```

## Evidence preservation

Previously successful tests remain useful evidence when the underlying tested
code and contracts have not materially changed. Do not treat a branch rebase or
merge from main as sufficient reason by itself to invalidate all previous test
evidence.

When main has advanced:

1. identify what changed;
2. determine whether those changes intersect the current slice;
3. rerun affected validation; and
4. escalate to broader testing only when the dependency surface warrants it.

## Never weaken CI

Local validation may remain focused while authoritative CI performs required
repository-level checks. Reducing local scope is not a license to bypass,
disable, or weaken mandatory CI checks, gates, or acceptance criteria.

## Reporting requirement

Agents must report why a particular test scope was selected and what evidence
remains valid from earlier runs. A handoff or completion report that cannot
state its evidence basis is incomplete.

## Worked examples

**Shared Living migration slice** — sensible scope:

- migration tests;
- DB-authority tests;
- schema congruency;
- migration application on fresh DB;
- Drizzle/type checks;
- affected Shared Living contracts.

**Shared Living search service (later slice)** — do not rerun every migration
test plus every historical listing test just because the repository contains
them. Test search, geography, authorization/publication contracts, and
lead/search integration where relevant.

At the final merge or release candidate, the full required CI suite establishes
repository-wide confidence.

## Relationship to other authorities

- `property-listify-database-authority` owns database-bearing command safety
  and startup; use its approved commands for any focused database check.
- `property-listify-verification-handoff` owns final deterministic gates and
  exact-candidate evidence; this skill complements its rule to preserve
  unaffected evidence rather than mechanically repeat expensive gates.
