# Place reference release — senior technical acceptance

**ACCEPTED for the bounded reference-data stage.** Reviewed junior commit: `fffe937beaf8c6bb5192c4dc893a0c6416dcc8ed`. No correction to the packet or release code is required. This decision accepts the technical plan; it does not invent Edward's separate data-apply authorization or a new attended window.

The [junior packet](/home/edwardspc/Desktop/Dev/worktrees/property-listify-geography-reference-release-20261010/docs/architecture/launch-readiness-and-product-convergence/evidence/geography-reference-stage-preparation-2026-10-10/README.md) is bound to the [accepted production schema](../geography-schema-stage-accepted-2026-10-10/README.md). The senior remains production operator and sole management submitter. The junior's next responsibility is fresh independent recovery custody, rather than another implementation or CI cycle.

| Accepted binding | Value |
| --- | --- |
| Protected source | `49a48572c24d1b122fcf17b025a76e5ab77f03a8` |
| Target fingerprint | `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced` |
| Installed/required head | `0111_properties_canonical_place_reference_fk.sql` |
| Data-plan digest | `dd5d117ff786b57d6d26699558ff038e61c9128e0352ec9464f2bd34b2e38089` |
| Admitted subset | 16,944 Places; 157,728 governed assertion rows; nine pinned province packages |
| Excluded subset | 720 OSM-only Places and every held dependant; D3 remains uncleared |
| Dispatch | One exact `release-reference-apply --adapter=places` with the approved digest and acknowledgement |
| Later application source | `57ea5f5e98ff031a4d0f0814998e60fe27a82b2b`, not deployed |

## Independent review

- Verified all 11 junior packet checksums and all 23 accepted schema packet checksums.
- Compared every retained plan field and all nine package pins with the accepted plan. Independently recomputed the 720 held-ID digest and the accepted plan-file hash.
- Verified three source archive hashes, all 1,793 command-source files against frozen Git `49a48572`, and the exact 1,792-file upload carrier with no extras or symlinks.
- Verified both completed custody archive manifests. All 16 historical custody timer/service units are inactive; archived evidence remains intact.
- Reviewed canonical plan comparison, bounded inserts, assertion verification before COMMIT, reference-lock ownership/release, connection closure and the distinctions between rollback uncertainty, COMMIT uncertainty and committed cleanup failure. Recovery never retries apply automatically or removes active/unknown work.
- Fresh provider metadata reports no pending production changes, the API/email/lead offline, and the existing Redis deployment unchanged. Both API origins returned the expected 403 maintenance body at 13:41 UTC. An initial DNS lookup failed; the subsequent lookup and both GETs succeeded. These are review observations, not future dispatch admission evidence.
- Mandatory local authority status passed against the junior's exact disposable worktree. Its local database service is unavailable; no database was created and no production database command ran during review. Protected schema conclusions come from the accepted production evidence, not local status.

The junior's “32 preparation checks” include JSON/link and binding checks; they are not 32 live database tests. No unchanged product suite or hosted CI was repeated for this document review.

## Technical decisions for execution

The senior accepts **65 minutes minimum remaining at dispatch**: a 15-minute apply allocation, 15 minutes for verification, 30 minutes for incident recovery and 5 minutes for cleanup. The 15-minute allocation is not a measured production duration or a timeout. Slow or unknown active work is preserved and escalated; it is never killed to meet this allocation. The packet should be interpreted this way rather than requiring an impossible prior measurement of this first production load. Raise the reserve if fresh facts require it.

Use one task-owned runner in the reviewed production-only staged route, at most 1 vCPU/1 GiB, one idle replica, NEVER restart, no application startup or persistent database secrets. Retain the existing singleton network rules, two-hour absolute lifetime, USD 1 ceiling and independent notification-only custody. The resource design is technically accepted; actual creation waits for accepted data scope, fresh reachability and tested custody. Keep any active/unknown operation intact beyond expiry if necessary and record the deviation.

Retain the frozen Ready backup and the verified `0111` schema census/source as recovery evidence. The backup precedes the schema upgrade. It is not an automatic post-`0111` restore point, and this data-stage acceptance grants no restore authority. The planned operation inserts into empty governed tables in one transaction and performs no update, deletion or schema change. Reassess preservation only if the writer holds or initial target assertions change; such drift already blocks dispatch. Do not recreate the completed schema backup or repeat drainage.

The approved global session inventory must establish every possible reference-lock holder, including sleeping sessions. The manifest lock diagnostic observes only the migration lock. If global visibility cannot rule out another holder, stop for a fixed reviewed reference-lock diagnostic. This remains a technical operator responsibility, not a new request for Edward to select SQL or infrastructure settings.

Before dispatch, the senior builds/reviews the exact reference transport from the verified frozen archive. The historical schema transport is a quoting example only and must not be executed unchanged. Retain hidden stdin credentials, explicit operation approvals, strict TLS and all exact bindings. Record intent once and obtain the custodian's active acknowledgement before sending the command. Long database reads precede the final provider/maintenance readback so the 60-second evidence gate is genuinely fresh.

After a clean apply, use the named read-only verifier and fresh plan: zero pending rows, 157,728 governed existing assertions, unchanged held IDs/rows and complete connection/lock/session closure. Record the new post-apply digest separately from the approved pre-apply digest. Cleanup the exact runner only after independent terminal evidence and provider removal readback. Deployment, reopening and payments remain separate held scopes.

## Authorization and next junior directive

The accepted [target-specific release runbook](../../../../database-authority/canonical-place-reference-release-2026-10-08.md) says: “Obtain separate exact-target reference-data approval”. The schema approval and this senior technical review therefore do not record data-write approval. Present Edward one decision covering this concrete location load and its bounded temporary runner, with a refreshed two-hour reachability window. Do not request separate approvals for ordinary technical commands inside that accepted scope.

Give the junior:

> Senior review accepts `fffe937beaf8c6bb5192c4dc893a0c6416dcc8ed`; no further code or packet correction is requested. Remain available for fresh independent recovery/cleanup custody. Await the senior's new private lifecycle record, then privately copy it, test notification-only warning/expiry alarms outside the senior's session and acknowledge provider access and 30-second observation duty. Preserve active/unknown work and never kill, retry or delete it. Do not provision, write data, repeat migrations or launch CI. The senior owns the production operation and management report.
