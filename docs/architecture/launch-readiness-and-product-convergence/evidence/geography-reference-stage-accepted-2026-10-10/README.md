# Production canonical Place reference stage — accepted 10 October 2026

Senior decision: **ACCEPT** the authorized reference-data stage. The exact protected database now contains **16,944 approved Places and 157,728 governed assertions** across nine provinces. All **720 held Places and their dependants remain excluded**. This closes the production reference-materialisation step; application deployment and the customer journey remain separate.

The single canonical apply committed, released its reference lock and closed its connection. Independent read-only verification found zero pending assertions. No schema migration was repeated. The temporary runner was deleted; direct provider lookup reports its exact deployment **REMOVED**. Maintenance remains active; application and workers remain stopped. Payments and automatic deployment holds are preserved.

## Release bindings

| Binding | Accepted value |
| --- | --- |
| Frozen command/data source | `49a48572c24d1b122fcf17b025a76e5ab77f03a8` |
| Protected target fingerprint | `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced` |
| Pre-apply approved digest | `dd5d117ff786b57d6d26699558ff038e61c9128e0352ec9464f2bd34b2e38089` |
| Post-apply observed digest | `92f3a3bdc232f79f89a8a82f6c879c08e4ee85a3918ac3b3b96d485a8385b30c` |
| Installed schema | `0111_properties_canonical_place_reference_fk.sql` |
| Manifest digest | `600ccfc5ae5ddc480fe0274edc8a5e3624c2bab32aa3da65f314acd3803cef3c` |
| Correlation | `reference-20261010-cfacb630-80c5-4fe1-b8cf-b3955af8033e` |
| Runner service / deployment | `7dade655-e2d3-49c6-885f-f3ac0e8a8e2e` / `d4115bdc-7293-41a0-b468-e5cdb78cf2bb` |

Edward authorized this exact load and one bounded runner. The recorded attended window was 15:46:01–17:46:01 SAST. Independent junior custody, notification tests and exact active-intent acknowledgement were verified before the single dispatch. The runner's removal was verified at 16:45:28 SAST, before expiry. The post-apply digest changes because observed assertions changed; source pins, admitted identities and all held identities remain identical.

## Execution and verification

| Outcome | Evidence |
| --- | --- |
| Exactly one dispatch; committed, connection closed | [Apply report](apply-report.json), [dispatch marker](dispatch-marker.json), [provenance](apply-provenance.json) |
| All desired rows present; zero pending | [Independent verify](verify-report.json), [fresh post-apply plan](post-apply-plan.json) |
| All 112 migration ledger entries unchanged; zero incomplete attempts | [Inspection](post-apply-inspection.json), [zero-pending schema plan](zero-pending-schema-plan.json) |
| Physical schema congruent, 39/39 CHECKs enforced | [Congruency](physical-congruency.json) |
| Global session privilege verified; no application sessions/transactions | [Session inventory](global-session-inventory.json), [closure provenance](sessions-provenance.json) |
| Migration manifest lock clear; runner idle | [Lock read](manifest-lock-clear.json), [process inspection](runner-idle.json) |
| Exact deployment REMOVED, service absent, no pending production work | [Direct deployment read](runner-deployment-readback.json), [removal confirmation](runner-removal.json), [runtime](provider-runtime.json) |
| Both maintenance origins retain expected 403 response | [Maintenance readback](maintenance-readback.json) |
| Protected backup still Ready | [Backup readback](backup-readback.json) |

The apply wrote 157,728 rows in 633 bounded statements. The command measured **291,325 ms (4m 51.325s)** for its local operation; remote command start-to-completion, including source preparation, was longer. Independent verification ran from 16:31:07 to 16:35:39 SAST. These are actual observations, not forecasts. Per-table rows: Place 16,944; name 25,618; relationship 16,935; evidence 79,189; external mapping 19,042. No operational coverage signal was inserted.

Two admission observations were stopped before dispatch: one session observation exceeded the unchanged 60-second freshness bound; one maintenance GET failed with details not retained by orchestration. A reviewed read-only transport reused the already checksum-verified frozen carrier and refreshed all admission records. The same reserved intent was retained. The eventual admission had 81.77 minutes remaining against the unchanged 65-minute minimum. Neither stop was a data attempt or apply retry.

## Limits and remaining work

The database stage proves admitted reference rows, schema and exclusions. It does not prove that the undeployed application selects North Riding, saves a house, uploads an image, or meets hosted search performance. North Riding's legacy city ID 211 was preserved; no invented suburb or public property was created.

The original pre-0111 frozen backup remains Ready. Restoring it would undo the schema stage as well as these reference rows; no restore is authorized here.

Provider estimates for this runner were **USD 0.00630421** when read at 16:45:09 SAST, below the USD 1 cap. This is an accumulated-usage estimate, not a settled bill. Measured peak memory was 0.994697216 GB against a 0.999997440 GB limit; future release preparation should allow more headroom rather than infer this allocation is comfortable. No resource limit was changed.

For future transports, retain sanitised structured CLI failure records before removing raw stdout from provenance. This operation succeeded and its full success reports were retained; the potential failure-capture limitation did not affect this result. Provider diagnosis could not find the deleted deployment, but the independent direct GraphQL lookup confirmed `REMOVED`; the diagnosis result was not used as removal proof.

[Acceptance record](acceptance.json), [next application-stage direction](NEXT-APPLICATION-STAGE.md), [custodian closeout](CUSTODIAN-CLOSEOUT.txt), [evidence provenance index](evidence-index.json), and [checksums](SHA256SUMS) define the handoff. Only the senior writes the management acceptance. The independent junior archives their custody and stops this window's notification/observation timers; its archive receipt remains a documentation follow-up, not an unremoved runner.

All 231 offline release/evidence checks passed. Run the offline evidence validator with `python3 validate-evidence.py`. No unchanged product tests or hosted CI were repeated for this completed release.
