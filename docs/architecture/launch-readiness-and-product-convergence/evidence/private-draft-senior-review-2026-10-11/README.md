# Private draft and media persistence — senior correction and review

Date: 11 October 2026. Reviewer and correction owner: senior Codex through Edward.

Decision: accept the corrected local source for publication and required hosted CI. This is not production deployment or launch acceptance. The final source SHA and tree are bound in the senior's private candidate receipt and management review record after this packet is committed.

## Source and scope

- Production base: `c927351b2a0db4972b8cbc244102c795e2588d3c`.
- Reviewed junior candidate: `d107fe2c9b00c2da1bed3fd26a4a8dca0ef02edb`, tree `360095753dd92fcbd85a014d1cafb9f7e1741164`.
- Senior branch: `fix/private-draft-request-isolation-senior-20261011`.
- Senior worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-private-draft-senior-20261011`.

The senior correction changes only ListingWizard, MediaUploadStep, their two interaction test files, and this review packet. The junior's worktree and evidence are preserved. No database query, schema, migration, permission, geography, readiness or Explore behavior changes in this correction.

## Findings and correction

Three independent regressions failed on the junior implementation: a late create response overwrote a different draft's loaded form; a late update continued review submission after navigating to another draft; and a late media reservation continued after its listing binding changed.

Owner identity alone did not distinguish drafts opened by the same account. The wizard now binds asynchronous work to the owner, authoring route and explicit fresh-start generation. Starting a new draft or changing the authoring route invalidates old callbacks. Pending guards belong to that generation, so an old request neither blocks the new draft nor releases the new draft's pending guard. A confirmed create response cannot replace the current account's pointer after navigation. A previous account's confirmed ID may still be retained under that account's storage key.

Fresh server reads also capture the generation and cancel on an explicit fresh start. This prevents a delayed restore from reattaching the discarded draft ID. A verified existing listing can be updated even while an unrelated create remains uncertain; its uncertainty marker stays in storage until the original operation is reconciled.

Uploads capture the draft context and owner. Late reservations and confirmations do not enter a changed form. Assigning the first saved ID to the same draft keeps its context stable, so uploads started before that first save can still finish. The server's reservation, PUT and confirmation-token authority remain unchanged.

## Independent validation

| Check | Result |
| --- | --- |
| Junior's two new UI files, unchanged source | 15 passed |
| Added regressions before correction | 3 failed as expected; failure evidence preserved |
| Final focused client suite | 36 passed across 5 files |
| Supported application check, final source | Exit 0 |
| Explicit typecheck of both changed test files, final source | Exit 0 |
| Changed-file ESLint, final source | 0 errors, 37 warnings |
| Production frontend build, final source | Exit 0; chunk-size warning |
| Diff whitespace validation | Pass |
| Junior evidence checksums | All 29 match |
| Extracted server input schema | All three original declarations match after TypeScript transpilation and comment/export normalization |

The final 36 checks comprise 17 wizard persistence cases, 4 upload cases, 9 mapper cases, 3 owner-isolation cases and 3 canonical-location cases. Six new cases cover navigation, fresh-start restore, pending-operation ownership and upload binding, including first-save continuity. Only the three initial regressions are claimed as independently run before correction.

Private senior evidence is held at `/home/edwardspc/.local/state/property-listify/private-draft-senior-review-20261011/`. Final command outcomes and hashes are recorded there. Intermediate failures remain preserved; they are not passing results.

The junior's genuine local HTTP/database/storage acceptance remains applicable to unchanged server behavior and is described in [the original validation packet](../private-draft-media-persistence-2026-10-11/VALIDATION.md). Its final affected runs support 54 server/media/lifecycle checks. The senior did not recreate the disposed database or repeat unchanged database suites. The original broad TypeScript scan's 265 inherited diagnostics remain a reported limitation; this review relies on the supported application check and explicit changed-test compilation, not a claim that the broad scan passed.

## Acceptance boundaries

Local storage acceptance uses the real local object adapter, not hosted production storage. UI orchestration uses mocked APIs and real query navigation; no live customer or hosted browser acceptance is claimed. The missing production save/image/reload proof remains the next release check after hosted CI and senior release review.

Unknown create responses require manual reconciliation. There is no server idempotency guarantee across tabs or devices. The existing inventory API filters some domain records after pagination, so a short visible page alone does not prove the absence of a draft. No automatic create retry is accepted on that basis. The explicit user reconciliation flow and its visible 100-result guard do not constitute a complete inventory certificate.

Nothing was pushed, merged or deployed during this review. Public reopening, workers and payments remain held. Runner compute was already stopped; its service deletion still requires Railway dashboard two-factor verification. This packet does not authorize runner provisioning, provider cleanup retries, database operations or release-window extensions.

The next directive is [NEXT-JUNIOR-DIRECTIVE.md](NEXT-JUNIOR-DIRECTIVE.md). Only the senior writes the final management review.
