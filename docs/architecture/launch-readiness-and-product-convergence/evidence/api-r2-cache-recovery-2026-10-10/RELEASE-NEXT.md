# Production geography release — remaining sequence

Prepared by the senior on October 10 after the [verified R2 recovery](RECOVERY-RESULT.md). This is the resume checklist. It activates no new window and makes no production change.

The actual progress is that the original API and email children have exited with code zero, their descriptors are closed, lead execution is paused and both API origins remain contained. The old API no longer prevents the database upgrade. Canonical geography is merged in source but is not installed in the production database. Maintenance therefore remains necessary for the database transition and compatible application release.

## Delivery decisions

- Reuse the green hosted CI and original completed shutdown evidence. Do not repeat a full test cycle for unchanged source, re-arm a drained process or send another shutdown signal.
- Use one senior-owned operator checklist and an independent runner custodian. A junior may prepare evidence and retain cleanup custody; the senior executes protected operations and owns technical acceptance.
- Refresh evidence that can change: provider/process identity, effective network access, database sessions, attempts/locks, backup completion and installed schema. These checks answer current operational questions; they are not another implementation test cycle.
- Keep an operation active or unknown until its durable outcome and connection closure are established. Interruption never permits automatic retry or deletion of a runner executing DDL.
- Edward is consulted for availability, incident/business decisions and commercial reopening. His technical delegation does not create a missing data-release digest or certify a backup.

## One sequence, with concrete outcomes

1. **Resume protected access.** Reuse the reviewed immutable schema runner and observer inventories, creating only a fresh task-owned host after current custody, expiry, network/access and time-budget admission. Obtain acknowledged independent cleanup custody and an external expiry alarm before creation. The deleted runner cannot be reused. Reconfirm the already-exited processes; do not repeat drainage. Outcome: a working governed observer, exact target identity, unchanged schema plan and no unexplained database writer.
2. **Protect and upgrade the database.** Follow the existing exact-deployment removal gates, then the six-minute observed no-writer freeze. Create the named frozen backup once and require Ready/completion after freeze. Apply the already-approved 15 migrations once, preserving digest `d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d`. Outcome: physically verified `0111`, clear durable attempts/lock state and an applicable canonical Place data-release plan.
3. **Install approved geography.** Review the newly applicable digest and privileges at that checkpoint before admitting reference writes. Preserve 16,944 admitted Places and the 720 OSM-only exclusions. Do not reuse the pre-schema null digest or infer that source merge populated production. Outcome: verified canonical Place materialisation, including North Riding.
4. **Release the compatible application.** Refresh the prepared deployment manifest to integrated source `57ea5f5e98ff031a4d0f0814998e60fe27a82b2b`, preserving schema/reference authority and production deployment holds. Review this concrete release binding before execution. Build with actual production configuration/stamps; do not relabel a development CI artifact. Align API, workers and frontend. Outcome: the corrected application is live on the installed geography database.
5. **Verify and decide reopening.** Run actual-release readiness/version/security checks once, then North Riding selection → private draft save/reload → image upload/reload and the affected Developer journey. Stop only for a concrete failure or unknown outcome. Customer reopening and payment activation remain separate decisions; this sequence does not equate technical success with commercial launch acceptance.

The first execution scope ends after verified schema and applicable reference-plan generation, as in the existing approval. Later stages require their concrete technical acceptance; they should be prepared while the preceding stage runs, avoiding another planning handoff. Do not automatically fall through a protected stage boundary.

## Timing and custody

The completed recovery-only window ended at **10:13:01 UTC / 12:13:01 SAST**. It is not a migration window. The next schema execution needs fresh attendance/reachability and acknowledged independent cleanup custody. Reserve a **two-hour** window for that stage; do not promise all subsequent release stages complete within it. Existing admission minimums remain **105 minutes before containment and 65 minutes before schema apply**, with higher estimates enforced. Do not reduce these gates to fit an expiring runner.

Read-only/local preparation can continue before that window. No unnecessary wait until an arbitrary tomorrow/evening slot is introduced. Record actual start/end when attendance arrives. The temporary runner remains subject to its absolute two-hour lifetime and USD 1 monitored cost ceiling; no claim is made that either is an automatic provider safeguard.

The existing detailed operational/recovery procedures remain authoritative: [execution handoff](/home/edwardspc/Desktop/Dev/worktrees/property-listify-national-place-search-senior-20261008/docs/architecture/launch-readiness-and-product-convergence/evidence/geography-execution-handoff-2026-10-10/README.md). The path is a cross-worktree reference and must be verified locally; use the exact absolute repository worktree location in operator custody rather than moving or modifying that workstream.
