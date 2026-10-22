# Cleanup Plan v2 - Ready for Codex Approval

**Worktree:** `codex/cleanup-2026-09-03` at `153b7cee`
**Date:** 2026-09-03

---

## Changes from v1

1. **Root Markdown:** Created file-by-file disposition manifest (137 files → RETAIN 20, ARCHIVE 36, DELETE 81)
2. **QUICK_REFERENCE:** All 16 files RETAIN in current locations (relative links preserved)
3. **Marketing/boost:** Out of scope (separate workstream per Codex)
4. **Location/geography:** Out of scope (separate authority audit needed)
5. **Database legacy tests:** Out of scope (authority decision needed)
6. **Build artifacts:** Added .gitignore rules before removal
7. **verify_stats.ts:** Out of scope (database authority matter)

---

## Execution Plan

### Phase 1: Build Artifact Cleanup (Approved)
- Add .gitignore rules for `lint-output.txt`, `tsc.out.txt`, `tsc.after-rootfix.txt`, `tsc.phaseC.txt`
- Delete the 4 files from tracked files

### Phase 2: Root Markdown Cleanup
- Create `docs/history/` directory structure
- Move 36 ARCHIVE files to `docs/history/` with subdirectories:
  - `docs/history/advertise/`
  - `docs/history/dashboard/`
  - `docs/history/domain/`
  - `docs/history/explore/`
  - `docs/history/redis/`
  - `docs/history/tasks/`
  - `docs/history/other/`
- Delete 81 unreferenced files
- Keep 20 RETAIN files in root

### Phase 3: Verification
- Run `pnpm type-check`
- Run `pnpm lint:check`
- Run `pnpm test`
- Verify no broken links in retained documentation

---

## Files to be Deleted (81)

See `DISPOSITION_MANIFEST.md` for complete list with rationale.

**Categories:**
- ADVERTISE (7 files)
- TASK (13 files)
- FIX (10 files)
- EXPLORE (9 files)
- PHASE (4 files)
- DEVELOPMENT (4 files)
- Other (34 files)

---

## Files to be Archived (36)

See `DISPOSITION_MANIFEST.md` for complete list.

**Clusters:**
- ADVERTISE (10 files)
- DASHBOARD (3 files)
- DOMAIN (3 files)
- EXPLORE (7 files)
- REDIS (5 files)
- TASK (5 files)
- Other (3 files)

---

## Files to be Retained (20)

See `DISPOSITION_MANIFEST.md` for complete list with references.

**Key retains:**
- `AGENTS.md`, `README.md` (core docs)
- `DATABASE_*.md` (authority material)
- `database-*.md` (authority material)
- `ROADMAP.md`, `DEPLOYMENT.md` (active docs)
- `EXPLORE_QUICK_REFERENCE.md`, `FINAL_CHECKLIST.md`, etc. (authority references)

---

## What This Does NOT Do

- Does not modify marketing/boost routers (separate workstream)
- Does not consolidate location services (separate authority audit)
- Does not delete legacy tests (authority decision needed)
- Does not touch `verify_stats.ts` (database authority matter)
- Does not implement any TODO stubs

---

## Request for Approval

Please review and confirm:
1. [ ] Disposition manifest is accurate
2. [ ] ARCHIVE locations are acceptable
3. [ ] RETAIN list is complete
4. [ ] Out-of-scope items are correctly identified
5. [ ] Ready to execute in worktree

Once approved, I will execute the cleanup and submit a PR for final review.
