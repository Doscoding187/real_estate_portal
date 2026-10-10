# Geography schema resume — preparation checkpoint

Senior-owned preparation after the completed [R2 recovery](../api-r2-cache-recovery-2026-10-10/RECOVERY-RESULT.md). No runner, backup, database command, schema/reference write, application deployment or reopening occurred during this preparation. It activates no maintenance window.

The previous API and email children have already exited naturally with code zero. Do not re-arm them or repeat shutdown signals. Canonical geography is merged in source; the last production database inspection remains at `0096`. Installation is still ahead of us.

## Sources and reusable artifacts

| Purpose                      | Binding and result                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Schema commands              | `49a48572c24d1b122fcf17b025a76e5ab77f03a8`; unchanged 15-migration plan through `0111`                                        |
| Schema digest                | `d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d`                                                            |
| Protected target fingerprint | `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced`                                                            |
| Schema upload                | All 1,792 file hashes match the accepted minimal inventory; no deployment metadata was restored                               |
| Session observer             | Reviewed tool commit `2b7ecaae6c68426615ece4a1742b183d53b94179`; locally repacked from immutable Git blobs                    |
| Repacked observer archive    | `b4bef0cae668c48c2eb5ede1ae9493b311ba6fa0459d1b5cc9811f62c5bbd78d`; 1,791 file hashes checked after reopening the archive     |
| Future application           | Merged shutdown fix `57ea5f5e98ff031a4d0f0814998e60fe27a82b2b`, tree `d832836d40746d36401b6fb1a3603466e6660a00`; not deployed |

The historical observer gzip was not found in the recorded locations. The [rebound inventory](observer-rebound-inventory.json) preserves its old digest and explicitly records a new artifact binding. Ten bundled files differ from the schema base, exactly matching the reviewed observer source in the preserved senior worktree. The dependency lock matches the schema base. This is a local artifact repair, not a new observer implementation or database-authority change. The separate observer never replaces the immutable schema command directory or application source.

Private artifact locations:

- Schema upload: `/home/edwardspc/.local/share/property-listify/releases/geography-49a48572-20261009/senior-idle-runner-direct-settings`.
- Full source archive: `/home/edwardspc/.local/share/property-listify/releases/geography-49a48572-20261009/source-49a48572.tar.gz`, digest `8b021bc11b4266f72a14c7e64d059a2964538e1f65a1e50f72628226a8a244cd`.
- Rebound observer: `/home/edwardspc/.local/share/property-listify/releases/geography-observer-rebound-20261010/observer-2b7ecaae.tar.gz`.

[Source authority comparison](source-authority-parity.json) confirms that the inspected schema, migrations, database-authority implementation, policy and CLI paths are unchanged between the schema source and the future application source. A nonexistent registry path is excluded from that claim. [Compatible deployment](compatible-deployment.json) binds the future application and production frontend environment to the shutdown fix; production build and configuration application remain pending.

## Read-only provider observations

The [provider readbacks](evidence/provider-readbacks.json) retain the original API, email and lead deployments, no pending rollout and no running lead replica. A provider container marked online does not mean its held application is serving customers. No fresh process or database-session observation was made in this preparation.

[Azure server](evidence/azure-server.json): Ready, MySQL 8.4, South Africa North, 14-day retention. [Backup inventory](evidence/azure-backups.json): 16 records; latest daily backup October 9 at 14:34:07 UTC. The planned frozen backup `pl-geog-pre0111-20261009` is absent. Automatic backup availability does not satisfy the post-freeze backup gate. [Firewall](evidence/azure-firewall.json): the four existing singleton rules remain unchanged.

The [live provider schema](evidence/provider-scope-schema.json) confirms that direct `serviceCreate` with a non-fork environment may create across non-fork environments. Do not use that mutation as a scope experiment. The senior-reviewed [production runner route](evidence/production-runner-route.json) instead uses the provider's environment-specific staged creation and staged configuration contracts, then `environmentPatchCommitStaged` with the exact production ID and `skipDeploys:true`. The [live mutation schema](evidence/provider-environment-mutations.json) explicitly describes staging and commit as single-environment operations. No staged change or commit was executed here.

This supersedes `staged:false` creation/update in the accepted runner checklist. Require an otherwise empty production patch, only the new runner's create/configuration changes, and a production-specific staging response. Inspect that exact patch again immediately before its commit; stop for unrelated changes or an applying/unknown outcome. Verify the resulting idle instance/settings and unchanged original service/deployment bindings before network assignment and the first manual upload.

A service's registry identity belongs to the project; this route scopes its instance/configuration to production. Testing has an existing unrelated staged API change in patch `9f607fbe-adf1-4322-b11f-302802fc9bc3`; preserve it. Staging has no pending patch. Both recorded environment baselines must remain unchanged. This is a reviewed execution route based on current provider contracts, not a claim of verified provisioning behavior.

These observations support preparation only. Refresh changing operational evidence immediately before execution, including exact process identities, containment, global sessions, attempts/locks, actual networking and plan digest.

## Remaining live admission

Edward identified a junior on a separately available service as the proposed recovery custodian and will obtain acknowledgement. That is not yet an acknowledgement, an access check or a tested external alarm. Use the [custodian handoff](CUSTODIAN-HANDOFF.md). This session's preparation sub-agent has completed its task and is not the independent recovery operator.

Before creation, require the actual custodian's access/acknowledgement, external absolute-expiry alarm and a fresh recorded two-hour window with Edward reachable. The recovery-only window ended at 10:13:01 UTC. Do not reuse historical windows, the deleted runner or its lifecycle record. Record fresh IDs and an expiry no later than the earlier of window end and creation plus two hours.

The accepted runner gates remain unchanged: evidence at most 60 seconds old bound to the exact project/environment/service/deployment/instance and operation state; at least 105 minutes before containment and 65 before schema apply. Larger estimates can only raise those budgets. The USD 1 ceiling requires monitored cost evidence. Active or unknown migration state blocks removal irrespective of expiry.

## Execution sequence

1. Verify these artifacts, custody, actual window and the reviewed production-only staged provisioning route. Create only the fresh idle task-owned runner with deployments skipped on commit; verify static assignment against unchanged singleton rules before manual deployment, then effective networking and governed inspector/observer access.
2. Reconfirm already-completed natural exits, closed resources and no restart/global writer sessions. Remove only the exact original deployments under the accepted removal gates. Do not repeat drainage.
3. Observe six continuous minutes without writers, create the named frozen backup once and require Ready/completion after the freeze. Re-read the unchanged schema digest and current lock/attempt state.
4. Apply the approved schema once using the immutable schema source, then verify physical `0111`, immutable ledger prefix, checks, indexes, foreign keys and terminal durable attempt/lock state. Close the migration connection and retain independent outcome evidence before marking the operation idle.
5. Generate the newly applicable read-only Place reference plan and return its digest for the separate reference stage. Preserve 16,944 admitted Places and 720 exclusions. Do not apply a null or unreviewed digest, deploy the application or reopen access automatically.

The detailed accepted runner/recovery checklist is preserved in the [runner preparation worktree](/home/edwardspc/Desktop/Dev/worktrees/property-listify-geography-runner-prep-20261010/docs/architecture/launch-readiness-and-product-convergence/evidence/geography-runner-preparation-2026-10-10/README.md). This checkpoint supersedes its observer archive binding, future application source and runner creation/configuration route; lifecycle safeguards and R0–R6 boundaries remain in force.

No unchanged product tests or hosted CI were repeated. Local validation covers artifact hashes, JSON, links and this packet's diff. Payment intake remains closed. No management submission was made.
