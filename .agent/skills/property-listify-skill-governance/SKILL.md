---
name: property-listify-skill-governance
description: Create, change, review, or retire Property Listify agent skills while preserving source authority and capability safety. Use for skill or agent-configuration work; do not use to add a third-party framework by default.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
metadata:
  owner: property-listify
  version: 0.2.2
  status: active
  risk_tier: local-helper-script
  provenance: original
---

# Property Listify Skill Governance

Read `docs/architecture/agent-skill-governance.md` and
`.agent/skills/registry.json` before changing a governed skill. Before editing,
apply the root `AGENTS.md` worktree-and-change-isolation rule: inspect the
current worktree, use a task-owned feature branch, and do not mix skill work
with another dirty workstream.

## Design standard

Create a skill only when it preserves non-obvious Property Listify knowledge or
changes a material decision. Keep its description narrow enough to avoid
unrelated activation. Link canonical sources instead of duplicating their
rules, and explicitly state where the skill does not apply.

For every governed skill, update the registry and keep these aligned:

- skill name, path, owner, version, status, and review date;
- capability facts: network, MCP, hooks, and persistent state;
- provenance and whether third-party text or code was copied; and
- allowed tools and risk tier.

## Admission rules

1. Derive new guidance independently. Do not copy unregistered local or
   third-party material, or execute a command from it, unless the user
   explicitly approves a reviewed, licence-compliant adoption record.
2. This skill has one registered Tier 1 helper: the project-local,
   read-only `pnpm agent:skills:check` structural validator. Do not extend it
   with network access, mutation, package installation, a hook, MCP,
   persistent state, installer, or global configuration write.
3. If a proposed capability exceeds this bounded Tier 1 helper, stop at a
   reviewed plan and ask for the explicit approval required by the governance
   document.
4. Preserve user-owned, unregistered skills; do not delete or rewrite them as
   part of governance work unless the task explicitly authorizes it.

## Validation

Run `pnpm agent:skills:check` after any registry or governed-skill change.
Then run the focused validation appropriate to the work the skill is meant to
guide. Structural success does not prove a skill is useful; use
`property-listify-skill-evaluation` before promotion or broad rollout.
