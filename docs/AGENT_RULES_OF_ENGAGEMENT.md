# AGENT RULES OF ENGAGEMENT (Repo Guardrails)

## Non-negotiables
- Never commit or push directly to `main`.
- `main` is protected/stable only.
- All work must land in a feature branch (or fix branch) and then merge into `integrate/all-changes` first (integration trunk).
- No commits until the local gate passes for your change type (see Gates below).
- Local edits are allowed freely, but do not create commits until checks pass.
- Work only in a clean worktree (preferred), never in the dirty root repo:
  - Use `.worktrees/<branch>`.
- Do not run wide auto-fix tools across the repo unless explicitly asked (for example: global lint `--fix`).
- Keep diffs scoped.
- Schema changes require canonical migrations:
  - If `drizzle/schema/*` changes, include migration SQL + snapshot + journal updates.

## Branch + Worktree Workflow (Required)
### Start from integration trunk
```bash
git fetch origin --prune
git worktree add .worktrees/<your-branch> -B <your-branch> origin/integrate/all-changes
cd .worktrees/<your-branch>
```

### If the branch already exists
```bash
git fetch origin --prune
git rebase origin/integrate/all-changes
```

## Daily Sync Rule
Before starting any work session:
```bash
git fetch origin --prune
git rebase origin/integrate/all-changes
```
- Do not begin implementation work if the branch is behind trunk.

## Local Gates (Before Committing)
### Gate A: UI-only changes
```bash
pnpm build
pnpm vitest run <path-to-test> --reporter=verbose
```
- Commit only if these pass.

### Gate B: Server/service changes (no schema)
```bash
pnpm build
pnpm vitest run <affected server tests> --reporter=verbose
```
- Commit only if these pass.

### Gate C: DB/schema changes (MySQL Docker required)
```powershell
$env:DATABASE_URL="mysql://root:root@127.0.0.1:3306/listify_test"
docker exec real-estate-mysql mysql -uroot -proot -e "DROP DATABASE IF EXISTS listify_test; CREATE DATABASE listify_test;"
pnpm drizzle-kit migrate --config drizzle.config.ts
pnpm vitest run <affected suites> --reporter=verbose
pnpm build
```
- Commit only if these pass.

## Commit Rules
- Small commits only (one intent per commit).
- Do not mix misc cleanup into feature commits.
- Commit message formats:
  - `fix(area): ...`
  - `feat(area): ...`
  - `test(area): ...`
  - `db(migrations): ...`

## Push + Merge Rules
- Push only your branch:
```bash
git push -u origin <your-branch>
```
- Open PR into `integrate/all-changes`, never into `main`.
- PR must include:
  - What changed
  - Why
  - How verified (exact commands + results)
  - Any known follow-ups

## Conflict/Merge Safety Rules
- If merge conflicts happen: resolve carefully; do not use `-X theirs` unless explicitly instructed.
- If overwrite risk is suspected: run an overwrite audit on conflicted files (both diff directions) before finalizing.

## STOP Conditions (Ask Before Proceeding)
- You need to touch `main`.
- You need to run a repo-wide formatter/lint autofix.
- You see permission/lock errors in `.git` or staging.
- The worktree is unexpectedly dirty with unrelated changes.

## Definition of Done (DoD)
Work is done only when:
- Local gate passed for the change type.
- Diff is scoped.
- Commit(s) made.
- Branch pushed.
- PR opened to `integrate/all-changes`.
- Notes written (what/why/how verified).
