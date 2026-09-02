---
name: property-listify-change-routing
description: Route a Property Listify task to its owning authority before planning, editing, reviewing, or selecting validation. Use for multi-surface or ambiguous work; do not use it to replace a domain authority.
allowed-tools: Read, Glob, Grep
metadata:
  owner: property-listify
  version: 0.1.0
  status: active
  risk_tier: instruction-only
  provenance: original
---

# Property Listify Change Routing

Start by identifying the changed outcome and the authority that owns it. Return
the routing decision before proposing a cross-domain implementation.

## Route by changed surface

| Surface                                                                      | First authority to read                                                      | Routing rule                                                                   |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Public Land search or authoring                                              | `docs/architecture/land-consumer-journey-contract.md`                        | One geography authority per request. Do not merge or widen scopes.             |
| Schema, migrations, runtime DB access, seeds, fixtures, or DB contract tests | `AGENTS.md`, then `property-listify-database-authority`                      | Follow the mandatory Database Authority startup exactly.                       |
| Product journey, route, ownership, or lifecycle                              | `docs/architecture/product-workflow-authority.md`                            | Reuse the owning workflow; do not introduce a parallel state machine.          |
| Agent skill, plugin, hook, MCP, memory, or agent config                      | `docs/architecture/agent-skill-governance.md`                                | Use `property-listify-agent-security` and `property-listify-skill-governance`. |
| Validation scope or final evidence                                           | `property-listify-test-selection` or `property-listify-verification-handoff` | Choose the smallest sufficient evidence set without weakening required gates.  |

## Routing record

State the following concisely:

```text
Outcome:
Changed surfaces:
Owning authority:
Required supporting authority:
Scope conflict or ambiguity:
Focused validation direction:
```

If two authorities prescribe incompatible outcomes, stop and surface the
conflict. Do not invent a precedence rule or combine them silently.

This skill routes work only. Once routed, the owning authority determines the
implementation and validation process.
