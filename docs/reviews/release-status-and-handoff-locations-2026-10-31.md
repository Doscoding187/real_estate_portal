# Release status and handoff locations

**Read-only GitHub snapshot, checked immediately before this docs update on 2026-10-31.** CI states below come from `gh pr checks`. “Skipped” is not a pass; #717 is the pre-update head.

| PR | Current state | Latest reported CI |
|---|---|---|
| #706 Land canonical Place | Merged | 11 checks passed, including Browser Journey. |
| #707 Sale/Rent broad-place guides | Open; PR body says do not merge before production canonical Place tables are loaded/verified | 11 checks passed. |
| #708 maintenance mode | Merged | 9 passed; Browser Journey skipped. Edge 503/noindex remains unproven. |
| #714 Place reference-bucket digest checks | Open draft | DB Contract Verification failed; 4 passed, 4 skipped. |
| #715 Place eligibility reconciliation | Open draft, base `feat/fordsburg-runtime-retirement-20261029` | Only Vercel and Preview Comments ran; full CI is unverified. |
| #716 release candidate | Open draft, SHA 68465f0e83c91fc826ea51da776be365a7cda5b4, payload b4b3f9c49f8a91befcbf8c8a7faedcbf801d418e | 11 checks passed; a green code result is not production release evidence. |
| #717 buyer-area review | Open docs-only draft | Previous head: 8 checks passed; Browser Journey skipped. This update must receive its own CI result. |

Handoff files are on separate branches:

- `docs/handoff-release-state-20261029.md` is on `docs/release-handoff-maintenance-20261029`; the branch is present on `origin`.
- `docs/operations/prelaunch-release-runbook.md` and `docs/operations/rc-20261030-reviewer-pack.md` are on local-only `release/rehearsal-rc-20261031` at `1c16e0593c72dc28234b79916767c37facfb559d`; `git ls-remote` found no matching `origin` branch.

These paths were confirmed from the named branch trees, not inferred from the main checkout. Other worktrees and branches were left untouched.

The task worktree for #717 is /home/edwardspc/Desktop/Dev/worktrees/property-listify-gauteng-buyer-area-review-20261031 on docs/gauteng-buyer-area-review-20261031. Other worktrees were left untouched. Founder-reported Railway, Azure, database and bucket state was not checked live.
