# Production geography schema — senior acceptance, 10 October 2026

**Schema stage complete and independently accepted.** Production is at `0111_properties_canonical_place_reference_fk.sql`. This packet closes schema installation; reference-data application, compatible application deployment, reopening and payments remain held.

| Evidence | Result |
| --- | --- |
| Approved schema source | `49a48572c24d1b122fcf17b025a76e5ab77f03a8` |
| Protected fingerprint | `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced` |
| Accepted schema digest | `d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d` |
| Actual apply | Exactly one named release command, 15 migrations; completed 12:40:23 UTC |
| Ledger | Original 97 checksums unchanged; 112 entries total; zero incomplete attempts |
| Physical schema | Congruent; zero differences; 39/39 CHECKs enforced; expected indexes/FKs and all three consumer reference columns present |
| Migration lock/connection | Independently released; owned command connections closed |
| Frozen backup | `pl-geog-pre0111-20261009`, FULL/Customer/Ready, completed 11:54:12 UTC after the 388.53-second freeze |
| Runner cleanup | Both task-owned runners deleted; deployments REMOVED; no pending provider work |
| Runtime containment | API, email and lead remain offline; cron paused; both API origins return 403 maintenance; Redis unchanged |
| Reference data | Zero existing/written Place assertions; fresh applicable plan prepared |

The accepted 15-migration source and SQL digest were not changed. The first window completed provider removal, the no-writer freeze and backup but could not retain the 65-minute schema reserve. Its idle runner was removed. Edward confirmed refreshed reachability; the separately available custodian tested replacement notification-only alarms and 30-second read-only observations. The replacement runner verified its exact deployment/instance, all 1,792 upload hashes, dependency lock, effective allowed egress and absence of persistent database/application secrets. The operator bundle contains 1,793 frozen files, adding only `.env.local.example`.

The first final-admission collection aged its provider snapshot while database checks ran. The guard stopped before any apply intent or DDL. Collecting provider/backup/maintenance after the independent database reads resolved this; the successful gate retained 84.87 minutes and the unchanged 65-minute minimum. No apply retry or criteria change occurred.

Use [execution summary](execution-summary.json), [pre-schema inspection](pre-schema-inspection.json), [apply report](schema-apply-report.json), [independent inspection](schema-inspection.json), [physical congruency](physical-congruency.json), [command provenance](command-provenance.json), [final lock](final-manifest-lock.json), [session inventory](final-session-inventory.json), [runner removal](runner-removal.json), and [provider readback](final-provider-readback.json). The original frozen backup was retained; no second backup, restore, grant or firewall amendment occurred. All 39 CHECKs are enforced on Azure MySQL 8.4; no TiDB setting was changed. [Packet validation](packet-validation.json) records the ledger comparison, evidence checks and checksum coverage.

The fixed-query lock inspector is a checksum-bound operator artifact using existing `diagnostics`/read-only authorization and connection creation. It executes one literal `IS_USED_LOCK` query, requires NULL, and emits success after connection closure. Its strict API type/syntax validation and 11 pure checks are in [validation](manifest-lock-validation.json); senior scope review is preserved. It adds no runtime or schema authority.

## Next data stage

The [applicable data plan](place-reference-plan.json) binds head `0111`, the same manifest and nine package pins. Plan digest:

`dd5d117ff786b57d6d26699558ff038e61c9128e0352ec9464f2bd34b2e38089`

It admits 16,944 Places across nine provinces and 157,728 assertion rows, while excluding 720 OSM-only Places and all held dependants. Current rows are zero. No schema, provider-suburb, legacy-ID remap or label-backfill operation is included. This does not certify national public-search launch readiness.

The separate reference stage requires acceptance of this exact target/data plan, fresh attended custody/admission, the named one-transaction apply, and independent exact reconciliation. See [next-stage instructions](NEXT-REFERENCE-STAGE.md). Application source `57ea5f5e98ff031a4d0f0814998e60fe27a82b2b` remains undeployed. After data acceptance and separately authorized compatible deployment, prove North Riding discovery/selection, private house draft save/reload and image persistence through the approved customer account.

No unchanged product suites or hosted CI were repeated. The measured incremental Railway usage snapshot for both task runners totals $0.006467, below the USD 1 ceiling; this is not a settled final bill. Full private evidence remains in the directories recorded in the execution summary. Existing workstreams and historical evidence were preserved.
