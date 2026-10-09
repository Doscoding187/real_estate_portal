# Concrete geography release sequence — review only

No operation below was applied by this packet. The source currently proposed is runtime merge **b36fcfbb8acd6f5e4ce53b8ebc6904e19dbab847**, combining passing #595 candidate `9c28b3aa` with B12 main `1ead53cd`. After separately approved source integration, record the actual main merge SHA and verify its runtime tree matches this reviewed source; all deployment artifacts and fresh plans must bind that accepted source. A changed base, source, manifest, target or plan stops for reconciliation.

## Target, schema and reference inventory

Intended protected target: registered Azure MySQL production fingerprint **b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced**. This is the intended target identity, not a fresh live-state assertion. The historical SELECT-only inspection on **2026-10-08 at 14:11:12.785 UTC** observed Azure MySQL 8.4.9, 97 released migrations through `0096_user_founder_authority_unique.sql`, no incomplete attempts, no seven Place/Search Area tables or three canonical consumer columns and 23 enforced CHECKs. Today no protected connection was opened.

The unchanged active manifest digest is **600ccfc5ae5ddc480fe0274edc8a5e3624c2bab32aa3da65f314acd3803cef3c**; expected head **0111_properties_canonical_place_reference_fk.sql**. The 15 pending transitions expected from historical head 0096 are in [the ordered inventory and checksums](historical-protected-plans-2026-10-08/migration-inventory.md): seven authority tables, then saved-search, listing and property Place columns/keys/indexes. Preserve all 97 released prefix entries and source pins. Do not guess current head from the deployment source.

Protected Place policy **admitted-national-non-osm-only-v1**:

| Assertions | Desired rows | Held rows |
| --- | ---: | ---: |
| Place | 16,944 | 720 |
| Name | 25,618 | 807 |
| Relationship | 16,935 | 720 |
| Evidence | 79,189 | 736 |
| External mapping | 19,042 | 750 |

Desired digest **3c8f2e80908b8d6d7d565e83f7c1cafe6b10fea7a53fc757ec01650b02be2728**; held digest **d9fa78e371be33ada65362b3b1ce8b848fb4212a9518e4bc06da4f18ff5dc5e2**; adapter digest **d8d2725fd93a6c4d2de9fb95b59c07e4dbe826f53f8faaf449b3e579ade9943a**. All nine immutable source/admission pins are in [the historical reference plan](historical-protected-plans-2026-10-08/protected-reference-plan.json); the inputs remain unchanged. Never substitute the full 17,664-Place disposable national storage fixture or its licensing overrides.

## 1. Fresh schema plan, review and separately approved application

Once the exact source is accepted, use the repository Database Authority protected process with the registered target and dedicated SELECT-only inspector. Revalidate TLS, target fingerprint, physical metadata, complete prefix checksums, ledger/attempt state and current head. Plan from the actual approved old head; if the expected historical state has changed, stop and present the new transition instead of forcing 0096.

```sh
pnpm db:release:reference:inspect -- --adapter=places
pnpm db:release:plan -- --accepted-old-head=0096_user_founder_authority_unique.sql --expected-new-head=0111_properties_canonical_place_reference_fk.sql
```

Present the new schema plan ID/digest, ordered statements, target, exact source, preservation/incident owner, writer freeze and attended execution/time budget for schema approval. Historical digest **d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d** is a comparison value only; approval must bind the fresh plan. Do not reopen service-wide readiness sampling during local editing.

After explicit schema approval, the operator provides a distinct same-target migration credential through ephemeral `DATABASE_MIGRATION_URL`, with the protected operation approval in the current process. Never save it in a worktree, service variable, evidence or history. Apply the reviewed digest once through the named runner:

```sh
pnpm db:release:apply -- --accepted-old-head=0096_user_founder_authority_unique.sql --expected-new-head=0111_properties_canonical_place_reference_fk.sql --plan-digest=<fresh-approved-schema-digest> --ack=CONFIRM_RELEASE_APPLY_b23d640cdf242812
```

Return to read-only verification: prove head 0111, zero pending work, clear attempt state, schema congruency, intended foreign keys/indexes and all 39 expected CHECKs enforced. A failed or ambiguous apply stops with durable attempt evidence and the named recovery procedure; no silent retry, ledger repair, archived SQL replay or claim of transactional DDL rollback.

## 2. Applicable reference plan, separate approval, application and verification

The historical reference plan has `readyForDataRelease=false` and `planDigest=null` because the schema was not installed. It cannot approve a reference apply. After verified schema installation, generate the actual applicable plan:

```sh
pnpm db:release:reference:plan -- --adapter=places
```

Review its exact source/target/head, physical prerequisites, observed assertions, pending rows, exclusions, immutable pins and fresh digest. Stop on drift, conflicts, a partial installation or unexpected authority rows. No data deletion/update/adoption is permitted to force agreement. Obtain separate reference-application approval for this precise plan and target.

```sh
pnpm db:release:reference:apply -- --adapter=places --plan-digest=<fresh-approved-place-reference-digest> --ack=CONFIRM_RELEASE_REFERENCE_APPLY_b23d640cdf242812
pnpm db:release:reference:verify -- --adapter=places
pnpm db:release:reference:plan -- --adapter=places
```

The adapter bounds statements to 250 rows, 4,096 parameters and 262,144 estimated bytes within one transaction; verification precedes COMMIT. Preserve confirmed transaction outcome, lock cleanup and connection closure, then require zero pending reference assertions. Do not replay after ambiguous commit, even as a zero-write demonstration. Runtime/worker credentials must have the canonical required access to installed Place objects; a privilege defect goes to its reviewed named grant process, not an improvised broad grant. No commercial reference-data apply is authorised by this Place release.

## 3. Compatible, attended deployment after separate approval

The release expands the physical schema. Do not assume the previously deployed artifact will remain ready under strict schema congruency during that transition, or promise that reverting to the old source is a compatible recovery. The approved window must define maintenance/write containment and a source compatible with head 0111 and its reference data for recovery. Preserve successful schema/reference writes; no destructive rollback is part of this plan.

Read back actual hosting source/deployment/staged identities and holds immediately before the approved window. Prior October 8 observations pinned API/email/lead to `7756376c9`; they are historical, not today's state. B12's source merge does not establish what is live. Vercel `main` automatic deployment remains disabled in unchanged source configuration; keep all provider deployment holds and payment/commercial settings in place.

Deploy the exact approved merged artifact in the established order: **API → matching workers → matching manual frontend**. Record project/environment/service, source/build SHA, artifact/deployment ID, provider terminal result and layered readiness for each. Do not rebuild from moving main or redeploy the latest provider source blindly. A queued upload or health response alone is not deployment success. Any environment/configuration change must be included in the reviewed release decision.

Run the established actual-release checks once, plus explicit Place verification: target/TLS, manifest/head, congruency, Place data/exclusions, existing unchanged commercial/readiness layers, API health and fresh full readiness, worker health, frontend/backend artifact agreement and affected consumer smoke. The generic `release:predeploy:production` wrapper defaults reference commands to commercial data; it cannot replace `--adapter=places`. It grants no commercial-data application authority.

B12 makes the readiness observation concrete: capture assessment ID, source/deployment/replica, target fingerprint, phase starts (`authorize`, `connect`, `verify`, `cleanup`), active stage, duration, snapshot age, verdict and refresh lag. Retain the existing 30-second freshness rule, single in-flight verification and fail-closed result. A stuck/slow phase or expired/negative snapshot is a stop condition; inspect the correlated event rather than bypassing readiness or looping broad suites. Diagnostic observer errors cannot authorise a ready verdict.

The pre-B12 search performance result has narrow local headroom and does not certify hosted concurrency plus readiness work or B17 capacity. Record any approved bounded deployment smoke as its own evidence; do not reopen the completed local performance project. Failed provider deployment, artifact mismatch, schema/reference/readiness failure or consumer smoke stops before customer writes.

## 4. North Riding private draft and image verification

Only after the approved release passes its checks, follow [the customer continuation](customer-continuation.md). Use the existing authorised customer, stable listing identity and original property facts. Explicit canonical **North Riding** selection must resolve `pl-place-01-6a145c6d642ba208a2c12de7`; do not create a legacy numeric mapping or substitute a provider label.

Prove server-private draft save → fresh authenticated reload → three normal confirmed image uploads → persisted associations/order/primary image update → another fresh reload with image contents and unchanged details. Preserve private status and record private evidence separately. Geography deployment does not turn browser-local recovery into server persistence, and three test photos are not publication approval.

Then continue the affected Developer checks while preserving IKaya's existing organisation and pending review; prove discovery from the genuine customer homepage path, eligible public card, correct locality, detail and durable enquiry under the approved controlled unpaid session. A private draft remains absent from public inventory. Do not recreate/approve IKaya or auto-publish the private stock-photo test to manufacture discovery.

Do not repeat completed founder-login, logout or Developer-registration corrections without regression evidence. Payments stay closed pending separate commercial launch acceptance. Merge, schema application, reference application and deployment each require their own exact approval; this review packet performs none of them.
