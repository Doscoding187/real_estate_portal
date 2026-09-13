# Stage 1 admission report — isolated engine and credential proof

**Prepared:** 2026-09-13  
**Scope:** bounded local source and isolated-CI preparation authorized after
acceptance of closure packet `c48120d6`. This report does not admit an engine,
production target, Azure/TiDB operation, merge, deployment, or Stage 2.

## Decision and preserved incident

The preserved incident remains unchanged and linked from
[the incident continuation](stage-1-incident-continuation.md). Its target is
`listify_wt_database_transition_stage_1_d8173f13c5c4`, fingerprint
`5b75c0ec72db92fea58941cbedecf61579a049de9a3f4fccf938969bf5e733dc`, with
attempt `c242df81bf9eace7fe132d01-0000`; its original cause remains **unknown**.
No writer, migration, repair, reset, disposal, ledger edit, privilege change,
or data transfer was made against it. The accepted successor remains
`listify_wt_database_transition_stage_1_fr_4388046192b2`, fingerprint
`b121616eb803e0da7351ee3aa767f10d5f7f9c8585d9d3f83f3a41e07a86faf2`, head
`0090`, exact-owned, congruent, and untouched by this packet.

The canonical manifest digest is
`a511e70ae06ffbae4027cf02b1de8cc0f586ff7c23cb7cb11a0990606cf728ed`; the
preserved baseline migration checksum is
`19362611af5751c60bbb6e041e9f456c09aa1cc8ef77f9f5c62fbc92fa8e8e88`.

The implementation is based on accepted source `c48120d6b005416f7daaac2dab5bf3905398fdc4`
in the task-owned worktree
`feat/database-transition-stage-1-fresh-establishment`. The final review SHA
is the commit containing this report and the changes below; no hosted run has
been claimed.

## Isolated MySQL 8.4 proof route

`.github/workflows/ci.yml` now uses the verified Docker Official Image
`mysql:8.4.7@sha256:0426ec38c7a10aa45ba383887df7878f74ee70e2fd589c7b69207f3577901903`
in both disposable service jobs. The digest is the multi-platform index digest
published for the official `mysql:8.4.7` image ([Docker Hub image record](https://hub.docker.com/layers/library/mysql/8.4.7/images/sha256-f786525619c291800ac62b843d276de84dae6a6f7c6a1fc62193c080ca2b77bc:8.4.7)).
The workflow never sets `CI=true` against the developer service: the authority
also requires `GITHUB_ACTIONS=true`, test mode, loopback port 3306 and the exact
`listify_test` target.
The native evidence remains MySQL `8.0.46-0ubuntu0.24.04.3`; the isolated
candidate is MySQL `8.4.7` in the pinned image, so the local success is not an
8.4 or Azure admission result.
The workflow runtime is Node `22.22.3` with the repository-pinned pnpm action;
the hosted MySQL server version must be captured in the run artifact.

Each job provisions credentials only after checkout and dependency install,
then runs the fresh canonical consumer chain, schema congruency and full
verification. The contract job additionally runs the physical credential
boundary probe and the selected CHECK/FK and lifecycle suites with
`S2_DB_TESTS=1`. The second job provisions its own fresh service and runs the
full unit/integration suite. Bootstrap uses the service root only in the
provisioning step; `DATABASE_BOOTSTRAP_URL` is not written to `GITHUB_ENV` and
is rejected if present during verification. A hosted result is still pending.

## Credential and grant admission

The source authority now binds operation to a physical role URL only in the
isolated GitHub service. `DATABASE_CREDENTIAL_CLASS` is not a selector there;
an explicit mismatch is refused. The runtime and worker paths use separate
Drizzle pools, and a process cannot reuse one as the other.

| Identity                           | Physical grants in the isolated service                                                                                                                                      | Positive proof                                                            | Negative proof                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Application (`listify_ci_app`)     | Explicit `SELECT, INSERT, UPDATE, DELETE` on each of the 212 canonical application tables; no migration-control tables and no database-wide DML                              | Real `runtime-connect` path reads and performs a no-op application update | Control-ledger update, DDL and grant are denied                                                |
| Worker (`listify_ci_worker`)       | Exact queue/job tables: `billing_provider_events`, `catalogue_publishers`, `lead_deliveries`, `lead_delivery_attempts`, `leads`; only required read/update/insert operations | Real `worker-connect` path reads and performs a no-op lease-table update  | Control-ledger update and DDL are denied                                                       |
| Migration (`listify_ci_migration`) | Database-wide `SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES` required by the canonical runner                                                      | Fresh canonical chain writes the ledger and applies DDL                   | `GRANT` is denied; `SHOW GRANTS` is checked for no `GRANT OPTION` or account administration    |
| Verifier (`listify_ci_verifier`)   | Database-wide `SELECT` for schema metadata and readiness                                                                                                                     | Real `verification` path reads `information_schema` and target data       | Application update and DDL are denied                                                          |
| Bootstrap administrator            | Service root, step-scoped to role provisioning                                                                                                                               | Authority operation `ci-identity-bootstrap` only                          | No bootstrap URL is available to application, worker, migration or verifier child environments |

The grant plan fingerprint is derived from sorted canonical SQL statements and
the verifier records a separate digest of each role's actual `SHOW GRANTS`
output. The implementation reads the canonical model inventory and refuses
duplicates or inclusion of `sql_migration_history` or
`sql_migration_attempts` in application grants. Existing local-owner grants
were not revoked or altered.

Expected plan fingerprints (actual observed fingerprints are a required hosted
artifact) are: application `5574f8b4f8d818cf8860441097fa5b7c39c4a10a5775d0eebbf2605313252424`,
worker `626460f17cc3252b49b4db6300ffe884691cbb474fa476d4c3b4e1f2c863d973`,
verifier `adcd910f48460252b6211d7cfc46f697cb8fedd069725bbd1f25d4e803ce24da`,
and migration `a0da244a6effdffa18b4cb2ac3819388db67b25dbd15c7bfc1a21292c43d667a`.

## D-002 migration dispositions

These are proposed dispositions, not the open D-002 admission itself. Every
candidate remains in the immutable manifest; admission requires the hosted 8.4
fresh-chain and the evidence listed below.

| Migration                                       | Disposition | Required admission evidence                       |
| ----------------------------------------------- | ----------- | ------------------------------------------------- |
| 0066 favorites deduplicate                      | Retain      | 8.4 chain, uniqueness and concurrency result      |
| 0067 favorites unique                           | Retain      | 8.4 chain and duplicate rejection                 |
| 0068 recently-viewed activity cleanup           | Retain      | 8.4 chain and deterministic cleanup proof         |
| 0069 recently-viewed listing required           | Retain      | Required-listing constraint proof                 |
| 0070 recently-viewed user/listing unique        | Retain      | Duplicate rejection under concurrency             |
| 0071 recently-viewed recency index              | Retain      | Recency/ordering query result                     |
| 0072 retire legacy prospect favorites           | Retain      | No active consumer and physical reconciliation    |
| 0073 retire legacy scheduled viewings           | Retain      | No active consumer and physical reconciliation    |
| 0074 retire legacy prospects                    | Retain      | No active consumer and physical reconciliation    |
| 0075 recently-viewed microsecond recency        | Retain      | Precision and ordering result                     |
| 0076 lead-delivery relational authority         | Retain      | Lead custody, FK, lease and retry lifecycle       |
| 0077 bundle attribution relational authority    | Retain      | Attribution FK and ownership lifecycle            |
| 0078 retire unreachable partner leads           | Retain      | No active consumer and physical reconciliation    |
| 0079 explore engagement event identity          | Retain      | Idempotent event identity and access containment  |
| 0080 service lead request idempotency           | Retain      | Request replay/idempotency result                 |
| 0081 explore analytics query index              | Retain      | Query/index result                                |
| 0082 explore engagement retention indexes       | Retain      | Bounded-retention result                          |
| 0083 billing provider event identity            | Retain      | Duplicate event identity and webhook lifecycle    |
| 0084 billing provider retry budget              | Retain      | Retry budget and exhaustion result                |
| 0085 billing billable accounts                  | Retain      | Canonical ownership and account-kind CHECK result |
| 0086 billing account nullability                | Retain      | Nullability and owner lifecycle result            |
| 0087 billing provider event leases              | Retain      | Claim fencing, expiry and recovery result         |
| 0088 retire obsolete billing families           | Retain      | No active consumer and physical reconciliation    |
| 0089 retire disconnected analytics aggregations | Retain      | No active consumer and physical reconciliation    |
| 0090 retire disconnected boost campaigns        | Retain      | No active consumer and physical reconciliation    |

The local successor proves the canonical chain and selected CHECK/FK lifecycle;
it does not close D-002 without the isolated 8.4 execution and migration
lineage/checksum evidence.

## D-008 proposed scope and missing journeys

This is a recommendation for Edward/product authority; the central launch
register remains unchanged. “Pilot” does not waive authentication,
authorization, recovery, or provider-boundary requirements.

| Register        | Recommended scope                                                                                                                                               | Missing evidence before that label                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Live candidate  | Public property/development discovery, canonical Land search/detail, and consented enquiry capture only                                                         | Fresh 8.4 consumer result; auth/rate-limit/consent journey; lead custody and worker recovery; readiness and monitoring          |
| Pilot candidate | Named, non-public agency/developer workspace and reviewer flows after full tenant/auth/audit controls                                                           | Registration, recovery, role/tenant isolation, approval lifecycle, worker/retry recovery, and explicit cohort/rollback evidence |
| Hidden          | Payments/webhooks, provider-facing delivery, Explore/marketplace/distribution/commission/boost, founder/admin, imports and all unproven authenticated authoring | Complete security, reconciliation, recovery, external-provider idempotency, and product-owner scope decisions                   |

Required missing journeys are: registration and account recovery; agent/agency/
developer tenant authorization; Land canonical-location selection; lead
capture-to-custody-to-worker restart; provider webhook duplicate/retry and
reconciliation; paid entitlement/payment failure recovery; founder/admin audit;
and the consumer contract on the pinned 8.4 service. No label is an admission
until its required journey evidence is linked in the central register.

## Verification and remaining decisions

| Check                               | Result in this worktree                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| Source/type/static authority checks | Existing accepted closure remains green; new grant/operation tests added                   |
| Native local target/service         | Read-only status only; successor exact-owned, head 0090, no incomplete attempts, congruent |
| Isolated 8.4 hosted chain           | Prepared in workflow; **not executed in this environment**                                 |
| Physical credentials                | Provisioning and real-path verification prepared; hosted result pending                    |
| Azure/TiDB capability/admission     | Not attempted and not authorized                                                           |
| G1/G2/G3                            | Remain open                                                                                |

The next review must attach the hosted run URL/artifacts, observed grant
fingerprints, consumer-contract and lifecycle results, exact runtime versions,
and the final source SHA. Principal decisions D-002, D-003 and D-008 remain
open; Stage 2 remains blocked.
