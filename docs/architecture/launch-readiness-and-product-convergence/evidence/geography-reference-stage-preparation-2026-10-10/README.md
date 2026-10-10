# Place reference release — junior preparation, 10 October 2026

**Preparation for senior review. No reference apply, runner provisioning, migration, application deployment or reopening is authorized by this packet.** The accepted schema is `0111_properties_canonical_place_reference_fk.sql`; continue from that head. Both schema runners are deleted and their completed custody is archived. The senior owns protected execution and technical acceptance; the junior retains recovery custody through Edward when a new window is admitted.

Task branch: `prep/geography-reference-release-20261010`. Task worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-geography-reference-release-20261010`. Base: accepted senior checkpoint `3be3482be`, descended from merged application source `57ea5f5e9`. This worktree contains preparation evidence; it is not the protected command or application deployment source.

## Authority and immutable bindings

Read the [senior directive](../geography-schema-stage-accepted-2026-10-10/NEXT-REFERENCE-STAGE.md), [schema acceptance](../geography-schema-stage-accepted-2026-10-10/README.md), [canonical Place release runbook](../../../../database-authority/canonical-place-reference-release-2026-10-08.md), Database Authority entry/playbook, manifest, policy and compatibility register. The canonical Place adapter and genuine connection authorization remain the only execution authority.

| Binding | Value |
| --- | --- |
| Reference command source | `49a48572c24d1b122fcf17b025a76e5ab77f03a8` |
| Installed and required head | `0111_properties_canonical_place_reference_fk.sql` |
| Protected target | Production Azure MySQL `propertylistify-mysql/propertylistify_database`, South Africa North |
| Target fingerprint | `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced` |
| Manifest digest | `600ccfc5ae5ddc480fe0274edc8a5e3624c2bab32aa3da65f314acd3803cef3c` |
| Applicable data-plan digest | `dd5d117ff786b57d6d26699558ff038e61c9128e0352ec9464f2bd34b2e38089` |
| Policy | `admitted-national-non-osm-only-v1` |
| Railway project / production | `8cdd7515-ddd2-4252-bbee-df5a5c209d4b` / `63070d99-357a-40ba-99c3-6d1368f61652` |
| Future compatible application | `57ea5f5e98ff031a4d0f0814998e60fe27a82b2b`, undeployed |

[Reference binding](reference-plan-binding.json) retains the exact accepted plan-file hash, adapter/registry/desired/held digests, all nine package pins and held-ID binding. The accepted snapshot has zero existing assertions and 157,728 pending assertions:

| Table | Admitted rows | Held rows |
| --- | ---: | ---: |
| `place` | 16,944 | 720 |
| `place_name` | 25,618 | 807 |
| `place_relationship` | 16,935 | 720 |
| `place_evidence` | 79,189 | 736 |
| `place_external_mapping` | 19,042 | 750 |

The D3 ODbL hold remains uncleared. No approval here releases held Places/dependants, changes source pins, deletes/adopts unexpected assertions, remaps legacy IDs, backfills labels or writes provider suburbs. Valid operational discovery coverage signals are reconciled separately by the existing adapter; they are not additional admitted assertions or a reason to alter the immutable plan.

## Completed custody and current observations

[Completed custody](completed-custody.json) records both exact runner bindings, removal confirmations and mode-0600 private archive locations. Each archive retains lifecycle snapshots, observation logs, alarm results, scripts, available unit definitions, the systemd journal and a verified checksum manifest. Already-finished transient units were unloaded by systemd; their schedule/receipt/script/journal evidence is preserved. Both observers and remaining warning/expiry timers were stopped after complete source records and provider absence were established. No provider resource was deleted by the junior. No completed window is extended or reused.

[Preparation readback](evidence/provider-and-maintenance.json) confirms no pending production work, no active API/email/lead deployments, paused lead cron, the unchanged Redis deployment and 403 attended-maintenance responses at both API origins. The provider's latest historical FAILED API deployment is not a newly running application. These observations are timestamped preparation, not future 60-second admission evidence. The senior's accepted schema inspection proves physical `0111`, 112 immutable ledger entries, zero incomplete attempts, 39 enforced CHECKs and closed/released migration connections. This junior preparation made no production database connection.

## Prepare the new window and source transport

1. Obtain **separate exact-target reference-data approval** for the digest above, named `release-reference-apply` operation and distinct migration credential. Complete [approval template](reference-approval.template.json) with the actual approval actor/reference; a plan review or previous schema approval does not fill these fields. Leave deployment/reopening/payment approval false. The current templates deliberately refuse admission.
2. Record a fresh attended UTC window, senior cleanup owner and acknowledged independent junior custodian in a private copy of [lifecycle template](lifecycle-record.template.json). Before creation, test notification/log-only warning and expiry alarms outside the senior session and verify real provider access. Start durable source-record and read-only provider observations every 30 seconds. Alarm failure or loss of observation is reported through Edward and becomes unknown. Do not promise continued model availability from working timers.
3. Set expiry to the earlier of window end and actual creation plus two hours. Reserve the last five minutes for eligible cleanup/readback; retain the monitored USD 1 incremental cost ceiling. The closed schema windows grant no fresh infrastructure authority. A new runner requires senior acceptance of this concrete preparation and fresh infrastructure/custody admission.
4. Retain at least the existing **65-minute apply/verification/recovery/cleanup reserve** as a conservative proposed data-stage floor: 15 apply, 15 independent verification, 30 incident reserve and 5 cleanup. The senior must accept an actual production estimate and raise the reserve when needed; the disposable 11.5-second result is not that estimate. Keep the existing `budgetsMinutes.schema >= 65` and `containment >= 105` fields for compatibility with the accepted time-only gate. Run its `lifecycle schema` mode as a conservative remaining-time check before reference dispatch; its name authorizes no schema command. This additional data-stage budget requires senior acceptance. If new containment is necessary, stop for its separate scope and unchanged 105-minute gate; do not repeat completed drainage.
5. [Artifact bindings](artifact-bindings.json) verify the existing immutable archives, all 1,793 command-source inventory entries and the closed 1,792-file upload carrier. Recheck after transfer; the command archive adds only frozen `.env.local.example`. Keep the session-observer archive separate from reference command source. Do not overlay the future application SHA, replace the lockfile, or upload the previously oversized full archive as the carrier.
6. Reuse the corrected transport shape: local subprocess argv list, **one remote command argument** constructed with `node -e ` plus `shlex.quote(remote)`, and private JSON configuration plus the frozen archive through process stdin. Secrets never enter argv/history/logs/provider variables or a persistent runner file. The old private transports are historical pattern references only: they contain deleted runner bindings, schema modes, old-head checks and schema approval. Never invoke them unchanged. A reference dispatch must use only the explicit operations/argv in [command plan](command-plan.json), fresh bindings and the new operation approval. Have the senior review that exact dispatch before live use. No new transport was executed here.

## Senior operator checklist — one step at a time

### A. Provision only after fresh infrastructure acceptance

Use the accepted [production-only staged route](../geography-schema-resume-preparation-2026-10-10/evidence/production-runner-route.json), refreshed against current provider contracts: stage only a uniquely named empty runner's creation and reviewed idle configuration in production; inspect the otherwise empty patch; commit with the exact production ID and `skipDeploys:true`. Never commit unrelated staged changes or use direct non-fork creation as a scope experiment. Preserve Testing's unrelated patch and Staging/production baselines. Follow the [accepted runner checklist](/home/edwardspc/Desktop/Dev/worktrees/property-listify-geography-runner-prep-20261010/docs/architecture/launch-readiness-and-product-convergence/evidence/geography-runner-preparation-2026-10-10/README.md), with the resume packet's corrected route/source/observer bindings.

Require one idle replica in `asia-southeast1-eqsg3a`, NEVER restart, at most 1 vCPU/1 GiB, no cron/domain/TCP proxy/volume/application startup/Git trigger/healthcheck and no inherited or persistent database/application secrets. Assign static networking before the first upload. All assigned addresses and actual MySQL/TLS route must fit the unchanged singleton firewall rules. Do not broaden access, create grants, relabel credentials or introduce another connection factory. Capture new service/deployment/instance IDs and actual creation time in both private custody records; old IDs stay only in archived evidence. Observe the exact uploaded deployment's SUCCESS and verify its idle process/source/resource/network identity. Provisioning is held during this preparation.

### B. Fresh read-only admission from the exact new instance

Use the genuine SELECT-only inspector for `release-reference-plan`, `release-plan` and `diagnostics`, each under its own operation approval. Run the read-only command plan against installed `0111`: Place inspection, zero-pending schema plan, physical congruency and applicable Place plan. Require 112 successful immutable ledger entries, zero incomplete attempts, all 39 enforced CHECKs, expected indexes/FKs and consumer reference columns, and exact target/source/manifest/registry/package/desired/held bindings. Require the approved plan digest and unchanged initial subset/assertion counts; any conflict, null digest, foreign target or drift stops for senior review.

Use the separately bound approved session observer and existing bootstrap-admin identity only for `release-session-inspect`; its four fixed queries remain unchanged. Establish actual global session/transaction visibility, observer connection ID and all writer ownership. Reconfirm ingress/cron/automatic-deployment holds and absence of restarts/pending rollout. Keep the accepted frozen backup evidence and recovery target available; assess its applicability to the current `0111` data stage. It was taken before the schema upgrade, so do not claim a restore would already contain `0111`. Any new backup/restore needs its concrete accepted scope; never recreate or overwrite the named schema-stage backup.

Verify migration-lock absence with the checksum-bound accepted manifest-lock diagnostic. The Place lock is a different name, `property-listify:canonical-places:release`; the manifest diagnostic does not inspect it. Establish no possible foreign reference-lock holder through the approved all-session inventory (including sleeping sessions), or a separately reviewed fixed diagnostics observation. If ownership cannot be established, stop. Do not expand the session observer's allowlist or issue improvised SQL. The canonical adapter proves ownership after acquiring its reference lock and requires `RELEASE_LOCK=1` before success.

Every acquired read-only connection must close successfully before its evidence counts as terminal. Refresh operational evidence on the exact project/environment/service/deployment/instance/operation binding within 60 seconds immediately before dispatch. Collect provider/maintenance observations after longer database checks to avoid the previously rejected stale-admission pattern. A new timestamp alone cannot refresh evidence. Require fresh custodian acknowledgement, remaining-time gate, accepted data estimate and clear operation state.

### C. One separately authorized reference apply

Before dispatch, persist a private single-attempt intent with the exact argv, source/archive/target/plan/approval/binding and operation correlation. Custodian acknowledges `active` before the senior sends it. Existing intent or an interrupted dispatch is not permission to retry. Keep connection IDs, timings and structured output under private custody. The Place adapter does not create a DDL attempt ledger; `migrationAttemptIds` belongs to the unchanged schema, while reference-command intent/outcome must be recorded separately.

Supply the distinct same-target migration input through the ephemeral authority channel with strict TLS and the exact `release-reference-apply` approval. No persistent secret, timeout or wrapper retries. Dispatch only:

```sh
pnpm db:release:reference:apply -- --adapter=places --plan-digest=dd5d117ff786b57d6d26699558ff038e61c9128e0352ec9464f2bd34b2e38089 --ack=CONFIRM_RELEASE_REFERENCE_APPLY_b23d640cdf242812
```

The existing adapter acquires its named session lock, rechecks the exact plan under one transaction, inserts Places before dependants, verifies every governed assertion before COMMIT and releases the lock. Each statement remains bounded to 250 rows, 4,096 parameters and 262,144 estimated payload bytes. Preserve the original error and independent rollback/lock/connection-close flags. Never run `db:release:apply`, any migration replay, a generic seed, provider SQL or an automatic repeat reference apply.

### D. Independent verification and cleanup

After a terminal successful apply, restore read-only authority and run:

```sh
pnpm db:release:reference:verify -- --adapter=places
pnpm db:release:reference:plan -- --adapter=places
```

Require exact admitted subset reconciliation, zero pending assertions, 157,728 governed existing assertions and unchanged held-ID/held-row bindings. Valid operational coverage signals remain separately counted. The post-apply plan digest is recorded afresh because observed assertions changed; compare the apply's `acceptedPlanDigest` to the approved **pre-apply** digest. Do not demand that the post-apply digest equal the old empty-target digest, and do not repeat apply to prove replay. The full disposable national verifier is invalid for this protected subset.

Capture `transactionOutcome=committed`, `connectionClosed=true`, actual wall-clock dispatch/closure timings, written rows, insert statement counts and observed batch maxima. `localOperationDurationMs` excludes source loading and preflight; it is not the whole attended runtime. Independently verify unchanged schema/attempts, no remaining operation sessions/transactions or lock holder and closed resources. A clean canonical result certifies its reference-lock release; the custodian also establishes actual session closure through approved global observation. If any outcome is missing or ambiguous, remain active/unknown and use [recovery](RECOVERY.md).

Only then acknowledge idle/complete. Preserve sanitized evidence, close protected shells and refresh exact-binding cleanup evidence within 60 seconds. Run the accepted `lifecycle cleanup` gate, recheck the operation and use only the senior's new runner-specific cleanup scope. Require provider deployment REMOVED, service absent in production/project, no replicas/pending removal, original services/Redis preserved and actual cost evidence. Archive the new custody only after confirmed removal. Expiry or the USD 1 ceiling cannot interrupt active/unknown work.

## Later held scopes

The [compatible deployment manifest](../geography-schema-resume-preparation-2026-10-10/compatible-deployment.json) retains API/email/lead and Vercel bindings, real production build configuration and source `57ea5f5e9`. Prepare its concrete technical review after data acceptance; do not deploy a development-stamped CI artifact. No application/worker/frontend deployment, cron resumption, reopening or payments is included here. The prior Vercel preview failure/exception is unchanged.

After separately accepted deployment, the controlled customer check is North Riding discovery/explicit selection → private house draft save/reload → confirmed image upload/reload/order/details, plus the dependent Developer journey preserving IKaya's organisation/pending review. Use the previously approved account/inventory; no production draft/image writes occur in preparation. Canonical geography remains one authority per request and the Land public classification allow-list remains unchanged.

## Preparation verification

Local `pnpm db:authority:status` resolves this exact disposable worktree with canonical manifest `0111`; the local service is unavailable, so no schema/attempt/readiness state was evaluated or local database created. The protected state above comes from the accepted senior evidence, not that local status. Validation checks accepted packet checksums, source/carrier/archive hashes, JSON/relative links, command and approval scope, exact counts/exclusions and custody archive checksums. No unchanged CI/product suite is repeated. See [validation](packet-validation.json).
