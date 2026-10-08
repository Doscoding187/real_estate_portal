# Concrete protected release sequence for review

This sequence is prepared for review, not executed. **The current recommendation is to hold production release:** the national-dataset diagnostic fails the agreed concurrent search latency limits. Source integration acceptance and completed hosted CI do not authorise these operations. A focused performance correction and exact-source evidence must close that gate before release approval; any revised source requires fresh plan reconciliation.

## Exact identities and current evidence

- Artifact source: **04821fe7ae6401e781925adce099a93ead08490a**, identical tree **9839a1d085edd6fcdc4786125cba54e4c29fd4ef** to accepted `0760bbf412eb7b0773949ca069160b0ddcfaa86e`.
- Target: registered Azure MySQL production **b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced**. Fresh SELECT-only inspection at 2026-10-08 14:11:12.785 UTC reports MySQL 8.4.9-azure, 97 applied migrations through `0096_user_founder_authority_unique.sql`, no incomplete attempts, no Place/Search Area tables, no canonical consumer columns and 23 current enforced CHECKs.
- Schema: 15 additive single-statement migrations, 0097–0111, preserving the released prefix. [Inventory and checksums](migration-inventory.md). Expected head **0111_properties_canonical_place_reference_fk.sql**.
- Fresh schema plan digest: **d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d**. Named runner reports no lock, no applied migrations; this is read-only planning.
- Reference policy: **admitted-national-non-osm-only-v1**. Desired 16,944 Places, 25,618 names, 16,935 relationships, 79,189 evidence rows and 19,042 mappings. Desired digest **3c8f2e80908b8d6d7d565e83f7c1cafe6b10fea7a53fc757ec01650b02be2728**. All nine source/admission pins are included in [the fresh reference plan](protected-reference-plan.json).
- Licensing hold: 720 OSM-only Places, 807 names, 720 relationships, 736 evidence rows and 750 mappings remain excluded. Held digest **d9fa78e371be33ada65362b3b1ce8b848fb4212a9518e4bc06da4f18ff5dc5e2**. No release override or fabricated legacy mapping is permitted.
- Current reference plan: `readyForDataRelease=false`, `planDigest=null` because the physical schema remains 0096. It is a fresh pre-schema target-specific plan, not applicable reference-apply approval.
- Hosting: Railway production API/email/lead services remain pinned to `7756376c9`; Vercel `main` automatic trigger remains disabled. The preview failure remains unresolved. Protected schema/reference application, artifact deployment and commercial launch are separate decisions.

## Stage 1 — schema, only after explicit target-specific approval

Agree the attended execution window and bounded DDL/reference timing budget, operator/incident handoff, preservation evidence and authoring/reference-writer freeze. Keep commercial sales paused and admission/deadline absent. No new resources, payment intake or unapproved incremental spend are needed for this preparation. Do not treat a client timeout as a release time budget.

Re-inspect target state at execution and regenerate the schema plan through the named runner using the merged manifest. Compare the full digest, prefix checksums, actual head and pending order with this packet. Any changed source, target, digest or failed/running/blocked attempt stops for review.

Only the separately approved operator supplies distinct same-target migration credentials through ephemeral `DATABASE_MIGRATION_URL`. Never use the runtime credential or save this URL in service variables, `.env`, history or evidence. The approved operation binds target, heads and plan digest. Named schema apply and exact acknowledgement from the existing runbook:

```sh
pnpm db:release:apply -- --accepted-old-head=0096_user_founder_authority_unique.sql --expected-new-head=0111_properties_canonical_place_reference_fk.sql --plan-digest=d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d --ack=CONFIRM_RELEASE_APPLY_b23d640cdf242812
```

The displayed digest is usable only if the fresh execution plan still matches it. Apply once. DDL is not described as transactionally rolled back. An ambiguous or failed operation stops with durable evidence and the named recovery process; there is no automatic retry, ledger edit or archived SQL replay.

Return to SELECT-only authority. Prove zero pending migrations at 0111, canonical schema congruency and all 39 expected CHECKs enforced, with the intended foreign keys and indexes. This target is Azure MySQL; no TiDB capability mutation is part of this release.

## Stage 2 — fresh applicable Place plan and separate reference approval

After Stage 1 verification, run:

```sh
pnpm db:release:reference:plan -- --adapter=places
```

Present the newly emitted exact target/head, desired/held/source pins, observed assertions, pending counts and applicable plan digest. Reference approval cannot use the current null digest. Stop on partial installation, unexpected existing assertions or drift; never delete, update or adopt rows to force agreement.

After separate exact-target approval, apply through the named `db:release:reference:apply --adapter=places` path with its actual fresh digest and `CONFIRM_RELEASE_REFERENCE_APPLY_b23d640cdf242812`. Keep the policy exclusions fixed and competing reference writers frozen. The adapter bounds statements to 250 rows, 4,096 parameters and 262,144 estimated bytes, within one transaction; verification precedes COMMIT. Require confirmed COMMIT, lock cleanup and connection closure. Preserve any ambiguous result and inspect before further review; do not replay.

Verify with `db:release:reference:verify --adapter=places` and a fresh zero-pending Place plan. The full national disposable storage verifier has a different role and must not certify this protected subset. A zero-write repeat apply is still a mutation requiring its own authority and is not requested by this packet.

## Stage 3 — matching deployment and release checks once

Deploy only the separately approved merged artifact, preserving automatic holds and existing provider settings. Use the existing coordinated API/email/lead/frontend release order: matching API artifact and strict layered readiness first, then matching worker artifacts and worker health, then the manual matching frontend artifact and frontend/backend identity agreement. Pin all artifacts to the accepted source and record every deployment ID and result; do not rebuild from an advancing branch or silently retag another source.

Perform the established predeploy/environment, target, schema, reference and postdeploy health/readiness/artifact/smoke checks once for this actual release, recording results for the exact artifact/target. Use explicit heads and `--adapter=places` for Place reference checks; the generic package predeploy wrapper defaults to commercial reference data and cannot replace them. Any existing commercial-reference verification is a separate unchanged readiness layer, not permission to apply commercial data. Reuse exact-source hosted CI; do not repeat unchanged founder-login, logout, registration or broad local suites.

An unsuccessful deployment, readiness layer or consumer smoke stops the window before customer writes. A health response alone does not prove schema/reference readiness. Keep maintenance/compatible artifact recovery and incident ownership explicit; do not promise DDL rollback or erase successful reference writes.

## Stage 4 — controlled unpaid customer proof

Execute [the focused customer continuation](customer-continuation.md): canonical North Riding selection, private house server save/reload, three confirmed images with persisted order/details, then dependent Developer checks preserving IKaya's existing organisation and pending status. Use the existing controlled session without reopening completed identity corrections unless a regression appears.

Record the actual homepage entry, canonical search request, eligible public result, locality label, detail and normal enquiry outcome. A private draft must remain absent from public inventory. Publication/media eligibility and browser-save/hero gaps are explicit in the continuation record; do not invent a public listing or approve IKaya to remove them. Payments remain closed until separate commercial launch acceptance and do not prevent these approved unpaid engineering journeys.
