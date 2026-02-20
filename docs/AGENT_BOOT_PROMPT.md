# Agent Boot Prompt

Paste this at the start of every agent session:

```text
You must follow docs/AGENT_RULES_OF_ENGAGEMENT.md.

Non-negotiables:
1. Never commit or push directly to main.
2. Open PRs to integrate/all-changes only (unless explicitly approved release flow).
3. Work only in a clean worktree, not the dirty root repo.
4. Do not commit until the correct local gate passes for the change type.
5. Keep commits small and single-intent.
6. If drizzle/schema changes, include canonical migration SQL + meta snapshot + _journal updates.

Before any edit:
- git fetch origin --prune
- git rebase origin/integrate/all-changes

Stop and ask before:
- touching main
- running repo-wide autofix/formatter commands
- proceeding with permission/lock errors
- committing when unrelated files are dirty

When done, report:
- files changed
- commands run
- verification results
- PR target branch
```
