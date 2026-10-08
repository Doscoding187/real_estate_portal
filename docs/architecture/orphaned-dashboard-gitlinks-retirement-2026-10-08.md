# Retire unresolved prototype Git links

Edward authorised the implementation agent to resolve the checkout-cleanup warning separately from the canonical Place integration on 2026-10-08. The implementation decision is to retire the four unresolved prototype Git links, rather than invent upstream repository URLs or delete local directories.

| Path | Retained historical commit pointer |
| --- | --- |
| `Dashboard/agencies-dashboard` | `b468ca0528e1a8b611f5159b13b0a52b2719a4d7` |
| `Dashboard/agent-dashboard` | `fe5ffbaa8611ad539dacd67663d02073d871d2a3` |
| `Dashboard/property-developers/test-tailwind` | `1c4c6b2486a261017cca39ccb5f6e1785455f21d` |
| `agent-hub-pro` | `6ea5cbc5b0a95d5e2799dbb3de2eab09b54dd843` |

These are all the mode-160000 entries in accepted main `7756376c9ec604b352595b4e4ba8ced73f18562b`. No `.gitmodules` definition exists in the available repository history. The role dashboard pointers were introduced by Doscoding187 in commit `1ba513f0e5cc678607d3425673538ec7db2dbfbb` on 2025-11-14 and updated in `839ee6ec3c2c656a33390040e00357ce23578895` on 2025-11-15. The agencies target object is absent from the parent repository, and neither the current main worktree nor the retained clone has a nested Git remote at these paths. Connected repository discovery found no agencies-dashboard upstream.

Current application imports, build commands, CI configuration and operational documentation contain no dependency on these four exact paths. A fresh owned checkout contains empty placeholder directories, not retrievable application source. The current application remains owned by this repository's canonical `client/` and `server/` implementations. The historical prototype pointers have no recoverable upstream ownership configuration and are retired from the active tree; their recorded identifiers and Git history remain available for a future explicitly scoped recovery.

The correction removes only the Git index entries, using `git rm --cached`. It does not delete, move, inspect private contents of, or modify any existing directory in another worktree. It adds no `.gitmodules` URL and fetches no third-party code. All four placeholders remain physically present in the dedicated cleanup worktree after the index change.

Validation: the resulting index has zero mode-160000 entries; `git submodule status` succeeds without the missing-URL error; `git diff --check` passes. This is a repository checkout correction, so no application tests or database operations are required. It does not explain or repair the geography server test failures and must be reviewed separately from PR #594.
