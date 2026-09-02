---
name: property-listify-skill-evaluation
description: Measure whether a Property Listify agent skill improves real task outcomes before it is promoted or expanded. Use for skill pilots and revisions; do not use it as application performance profiling.
allowed-tools: Read, Glob, Grep, Bash
metadata:
  owner: property-listify
  version: 0.1.0
  status: active
  risk_tier: instruction-only
  provenance: original
---

# Property Listify Skill Evaluation

Evaluate an agent skill against real decisions, not its length, confidence, or
claimed coverage. Use a baseline and a skilled run where doing so is safe and
meaningful.

## Select representative cases

Use cases that exercise the claimed decision boundary. The first evaluation
set should include a public Land request, a database-bearing request, an
authorisation-sensitive product change, focused test selection, and an
agent-capability security review.

Do not use a skill's own wording as the sole grading rubric. Prefer canonical
contracts, targeted tests, code review, and human review of the resulting
decision.

## Measure outcomes

Record only observable evidence:

| Dimension            | Evidence                                                                      |
| -------------------- | ----------------------------------------------------------------------------- |
| Authority compliance | Correct contract read; no conflicting or widened authority.                   |
| Outcome quality      | Correct implementation, plan, or review finding.                              |
| Verification quality | Focused checks cover the changed surface and reported results are real.       |
| Safety               | Unnecessary external actions, data exposure, unsafe commands, or scope creep. |
| Efficiency           | Avoided duplicate discovery or verification without omitting needed evidence. |

## Decision record

```text
Skill and version:
Task class and baseline:
Observed improvement:
Observed regression or added cost:
Evidence source:
Decision: retain, revise, promote, or retire
Next review date:
```

Retain a skill only when its evidence is positive and it does not conflict with
repository authority. Revise the smallest instruction that explains a
demonstrated failure; do not accumulate speculative rules.
