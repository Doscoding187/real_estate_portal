# B08 0094 release authority decision — 2026-09-28

## Binding principal decision

Approval date: **2026-09-28**. Retain the existing Azure 0094 target. Approve
0091–0094 as canonical release migration authority. Approve B08 physical table
case normalization and fresh-establishment session GIPK handling. **Azure MySQL
8.4 is required before production cutover.** TiDB `listify_property_sa` remains
current production authority until a separate cutover approval. Repository merge
does not change deployed database authority or authorize a database operation.

## Immutable authority binding

- Verified release base: `4e012b3044628fc06da7489c0055e9ce01bdc8d9` (`origin/main`).
- B08 source: `0ed5d253568552d7b4492893c77ebc6850158220`.
- B10 schema provenance: `4a5f985a214c629c027c12c6cc1fb30702d310ab`.
- Protected registration: `898c89d819d0b0a87c03792edb423f3d28b0b781`.
- TLS hostname verification: `a40c7df5250ff3caffccde127aa6e73219b1a6ae`.
- Reconciled implementation/source SHA: `247f4a8506e7efb142304352002986ea83ef5c45`.
- Candidate branch: `fix/b08-0094-release-reconciliation`.
- Expected head: `0094_content_topics_primary_key.sql` (95 migrations).
- Canonical normalized model SHA-256: `a8ca8cf34bb3627594eab1b722b85115c6460225a0165db7992228a8547798e9`.
- Exact manifest SHA-256: `93d871e6f8760477f460b8821685d71d212374eb86ddd53bc6e2ccfc30608efc`.
- Retained target: `propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database`.
- Protected target fingerprint SHA-256: `b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced`.

The review must identify the exact candidate commit containing these artifacts;
the subsequent gate must record the reviewed/merged SHA and verify both digests.
A different digest requires renewed reconciliation, not checksum regeneration.

## Approved changes and boundaries

| Migration | Canonical effect | Established checksum |
|---|---|---|
| 0091_transactional_email_deliveries.sql | Delivery entity, unique delivery identity, scheduling/lease indexes and user FK | `f449f6485d7bc3bdbf53b83988cc9d92b1fa844a7f3079cc12dee5bdabcef813` |
| 0092_transactional_email_attempts.sql | Attempt entity, unique delivery/attempt and claim identity, delivery FK | `74217052481a7ad26dfddf4ac0f66e9b0c93e4c9dfdf9e20818b2ce45b2cc927` |
| 0093_user_onboarding_state_primary_key.sql | Explicit primary key on user_id | `fec12311f637e143f36d540e1faf07155c2035fdfeaa159466b14817dc990882` |
| 0094_content_topics_primary_key.sql | Explicit composite primary key on content_id/topic_id | `0645a178f556e24fa170d41b07a8ac73cff4e9404beedf1660a2bf54e72b4124` |

SQL files and manifest are copied unchanged from B08; 0000–0090 remain byte and
manifest-entry identical to the release base. Models, inventory and migration-tree
head are aligned: 214 application tables, 216 including runner ledgers, 23 CHECKs,
463 FKs. Email sending, workers, deployment/startup changes and commercial runtime
changes are not adopted.

Logical `propertyImages` stays canonical. The metadata comparator uses exact
matching for verified lower_case_table_names=0; verified value 1 maps physical
names and FK targets to canonical names, rejects collisions, and preserves
unknown objects as drift. Other/unavailable values fail closed.

Fresh MySQL establishment disables GIPK only on its own migration session,
verifies connection identity and UTC, and fails before DDL if state cannot be
established. Global server parameters are untouched. The runner checks null and
duplicate identities before 0093/0094; it does not repair rows. Explicit canonical
keys remove the permanent dependence on generated invisible keys.

The exact Azure target is classified as protected (the class label `production`
is a safety classification, not deployment authority). Existing operation and
credential checks remain necessary. TLS validates the certificate and hostname.

Onboarding previously performed select/insert without handling concurrent inserts.
Both router creation paths and the service now use a shared helper: only MySQL
ER_DUP_ENTRY/1062 (including wrapped driver causes) triggers a read of the exact
user's persisted winner. Nothing is overwritten; absent winners and other errors
propagate. Static concurrent regression exercises the winner and failure paths.

## Retained data and deferred admission

The established target contains at least 3 plans and 9 plan_entitlements. These
rows have B08 reference-establishment provenance; their presence does not invalidate
retaining the target. They are neither a disposable fixture nor permission to
reseed. B08 evidence names canonical-commercial-v4 whereas this narrow release
retains main's canonical-commercial-v3 adapter. This task does not silently adopt
that separate commercial workstream. Before any reference-data verifier/apply is
used, the later gate must compare exact rows and the approved reference revision;
a mismatch blocks readiness and must not trigger overwrite. Schema congruency
alone does not prove reference-data admission or cutover readiness.

## Evidence and safety

The static authority suite covers manifest lineage/checksums, inventory, schema
congruency/case folding, GIPK session safeguards, PK preconditions, protected target
and TLS controls, email schema integration, and onboarding concurrency. No physical
integration test or write-based probe is authorized in this task. Physical behavior
on 8.4 remains subject to the separate gate below.

No Azure or TiDB database write, migration, DATABASE_URL change, Azure upgrade,
production deployment, reference reseed, ledger edit or existing checksum change
is part of this reconciliation. No secrets are recorded.

Next gate, only after repository review passes: [controlled Azure 8.4 upgrade and
revalidation](azure-84-upgrade-revalidation-gate-2026-09-28.md).
