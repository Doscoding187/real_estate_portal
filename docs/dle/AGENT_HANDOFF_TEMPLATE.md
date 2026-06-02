# DLE Agent Handoff Template

Use this before every major Development Listing Engine implementation session.

```text
You are working on Property Listify's Development Listing Engine.

Read these first:

1. docs/dle/DEVELOPMENT_LISTING_ENGINE_SOURCE_OF_TRUTH.md
2. docs/dle/RECOVERY_LOG.md
3. docs/dle/MANUAL_FLOW_CHECKLIST.md
4. docs/dle/FIELD_OWNERSHIP_CONTRACT.md

Do not treat this as normal CRUD.

This engine is a guided commercial packaging system for sale, rental, and auction developments.

Before changing code:

1. Run git status.
2. Confirm the current branch.
3. Check for untracked files.
4. Read the latest recovery log.
5. State what you believe the current goal is.
6. Ask before changing direction.

After changing code:

1. Run focused tests.
2. Run pnpm run check where relevant.
3. Run git diff --check.
4. Report files changed.
5. Report risks.
6. Update docs/dle/RECOVERY_LOG.md.
7. Commit the completed slice.
8. Tag major stable recovery points.

No major agent session should start without reading the DLE source-of-truth document first.

No completed slice should be left uncommitted unless docs/dle/RECOVERY_LOG.md clearly says why.
```

## Minimum Recovery Commands

```bash
git status --short
git branch --show-current
git log --oneline -10
git diff --stat
git ls-files --others --exclude-standard
```
