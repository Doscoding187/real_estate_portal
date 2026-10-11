# Private draft and media persistence candidate

Base: `c927351b2a0db4972b8cbc244102c795e2588d3c`.
Branch: `fix/private-draft-media-persistence-20261010`.
Scope: generic listing wizard draft/media persistence. Senior retains review, merge, hosted CI and production execution.

## Result

Save private draft uses the existing create/update APIs independently of review. It accepts the existing draft input contract, including zero images and incomplete publication readiness. Required input errors stay visible; no facts or location authority are invented. The server input schema is shared with the browser without changing its validation: original and extracted schema bodies match after whitespace/export normalization.

A confirmed draft ID is retained under its authenticated owner. Further saves and submission update that ID. An account/route verifies custody through a fresh getById request, bypassing previous-session query cache. Open saved draft reacts to query-only navigation and hydrates server content even when device state is absent. Existing media returns as listing-scoped existing:<id> references. Starting a new draft clears only the current pointer/form, preserving prior server inventory. Non-draft edits never show a private-draft save action or force a status transition.

A synchronous shared guard prevents concurrent save/submit/create. A browser marker is written before create dispatch: a failed/lost acknowledgement can follow insertion. Further creates remain blocked across reload until the user checks fresh owned inventory and selects a verified private draft, or explicitly confirms no draft exists. Inventory failures and a potentially truncated 100-result page cannot enable a new create. This is browser orchestration, not server idempotency across tabs, devices or arbitrary API callers.

Uploads retain reservation, actual PUT and server confirmation-token authority. Reservations bind to the saved draft when available. Late reservation/confirmation callbacks cannot enter another account's form after unmount/account change. Full private payload/hydration console logging was removed. Device recovery is labelled separately; later unsaved edits are not described as persisted.

## Focused validation

Results combine the latest affected runs; they are not a claim that one combined suite ran after every correction.

| Check                                                               | Result                                                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Wizard API orchestration, real wouter query navigation, mocked APIs | 13/13                                                                              |
| Upload ownership/PUT/confirmation orchestration, mocked transport   | 2/2                                                                                |
| Submit mapper                                                       | 9/9                                                                                |
| Persisted owner isolation                                           | 3/3                                                                                |
| Canonical LocationStep                                              | 3/3                                                                                |
| Actual HTTP API, database and local object storage acceptance       | 2/2                                                                                |
| Existing listing lifecycle contract                                 | 45/45                                                                              |
| Existing media tenant boundary                                      | 3/3                                                                                |
| Existing media reconciliation                                       | 1/1                                                                                |
| Shared media contract                                               | 3/3                                                                                |
| Application check (`pnpm check --incremental false`)                | Pass                                                                               |
| Explicit strict typecheck of all three touched test files           | Pass                                                                               |
| Touched-file lint                                                   | 0 errors; 53 warnings (any types and existing code warnings)                       |
| Production frontend build                                           | Pass; existing chunk-size warning                                                  |
| Diff whitespace check                                               | Pass                                                                               |
| Broad tsconfig.json scan compared with exact base                   | Same 265 diagnostics after source-root normalization; no added/removed diagnostics |

The broad scan includes existing tests and examples excluded by the supported application check. Its failures are preserved separately; it is not reported as passing. ListingWizard's pre-existing ts-nocheck remains; typed test compilation and interaction tests provide focused coverage.

Client command: `pnpm exec vitest run --config vitest.client.config.ts` with the wizard persistence, upload persistence, submit mapper, owner-isolation and canonical LocationStep files. Server command: `SKIP_DB_INIT=1 pnpm test:authority -- --config vitest.server.config.ts` with agency-listing-preparation, media reconciliation, media tenant boundary, lifecycle contract and shared media files. The final agency acceptance and wizard corrections were rerun individually.

Explicit test compilation extends tsconfig.check.json with incremental=false, Vitest/jest-dom types, no test exclusion, and includes exactly ListingWizard.persistence.test.tsx, MediaUploadStep.persistence.test.tsx and integration.agency-listing-preparation.test.ts.

## Real persistence evidence

All writes used the owned disposable worktree database. After verification, its context was re-resolved and only that exact target was disposed using its emitted acknowledgement; validation logs remain preserved:

- Database: `listify_wt_private_draft_media_persistenc_4fd94a45278e`.
- Target fingerprint: `168cf4e878ba9b23af947385b70bb8de9ed2d14ebfd7ecc35400e6893c9960fc`.
- Accepted head: `0111_properties_canonical_place_reference_fk.sql`.
- Physical and desired schema digest: `a3567c76721b8c3526c83287478ce51284aa102b365435c3daf28dc6bac99b97`; congruent, all 39 physical CHECK constraints enforced.
- Local reference/foundation verification passed. Only the governed local `za-gp` Place package was prepared/verified for required fixtures; no national replay or production initialization occurred.

The real acceptance uses signed authenticated sessions and fresh HTTP clients against the actual router and disposable database. It creates a zero-image draft, reads it from the server, reserves media bound to that ID, PUTs real PNG bytes, obtains confirmation tokens, saves one image, and proves fresh server reload with that single completed image while the listing remains draft. It then attaches five confirmed images and repeats updates, asserting one listing for the owner/title and five media rows. Delivered object bytes match the PNG. Fresh clients see updated title/media; another owner cannot read/update/reserve against the listing. Review remains PRECONDITION_FAILED under held commercial activation, and no public Property projection exists.

A separate fault injection replaces only the post-insert agent event function. Create reports INTERNAL_SERVER_ERROR after the durable insert; exactly one owned draft is independently found and reopened, then updated using its recovered ID. Database, authentication and storage are real; this one event failure is deliberately injected. The UI mock tests separately prove that such an error blocks another create and retains the form across reload.

## Preserved interruptions and limits

The first local service start found stale PID metadata and refused. Reviewed governed recovery proved stale state and removed only exact PID/socket/lock artifacts. No database/data directories or historical attempt records were removed. One premature read-only congruency check observed a still-running fresh migration; after that single migration completed, congruency passed. No failed migration was reset or replayed. The first acceptance run lacked explicit lazy getDb initialization with SKIP_DB_INIT; adding the authority-backed connection setup corrected the harness, and the genuine acceptance passed. Initial test/compile failures and corrected results remain in private evidence.

No production/frontend browser session or hosted R2/S3 verification was run. Storage proof uses the real local storage adapter and actual HTTP object transport. Geography, readiness, migrations, grants and production services were not changed by this candidate. No push, hosted CI dispatch, deployment, public reopening, worker start, org approval or payment activation occurred.

Runtime recovery custody continues independently. The computer shutdown cleared transient timers; the 30-second read-only/notification-only observer was restored. Fired warning/expiry receipts remain preserved, including one interrupted observation line. Runner compute is stopped; service deletion remains staged and requires Railway dashboard two-factor verification. Custody cannot be archived as completed until provider deletion is confirmed. Expiry never authorizes automatic mutation of active/unknown work.
