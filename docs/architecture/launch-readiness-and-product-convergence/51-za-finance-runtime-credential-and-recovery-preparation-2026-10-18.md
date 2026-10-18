# ZA finance runtime credential and recovery preparation

18 October 2026. Prepared and then executed the bounded runtime-phase
workstream for the South African finance storage: the synthetic
restore-from-backup recovery exercise and the encrypted issuance of the one
dedicated runtime access key recorded in D6 (launch-readiness packet 50),
followed by local credential verification and bounded permission probes. The
workstream is recorded in
[evidence/za-finance-runtime-2026-10-18](evidence/za-finance-runtime-2026-10-18/run-record.md).
This packet does **not** bind the application, migrate records or open any
hosted window; those remain with the hosting resume.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `ZA-FINANCE-RUNTIME-PREPARATION-2026-10-18` (launch-readiness packet 51) |
| Base | `main` at `ac1ee5eb1` (contains the packet-50 D6 record via PR #643) |
| Worktree / branch | `property-listify-za-finance-runtime-20261018` / `prep/za-finance-runtime-credential-probes-20261018` |
| Precedent | Packet 29 (`aws-proof-runtime-verify.cjs`, `aws-private-proof-provision.py`): recovery precedes key issuance, envelope-then-local-verify, no hosted binding. |
| Boundary | Local files and mocked-AWS tests for preparation; the executed run used operator credentials in CloudShell against the recorded stack only, with no hosted binding, database or media change. |
| Reviewer action | Review the two gates that run before any mutation (`preflight`, `run_issue` ordering), the denied-operation contract in `runtimeProbe`, and re-run both suites. |

## What was built

| File | Change |
| --- | --- |
| `scripts/storage/aws-finance-runtime-prepare.py` | Attended operator program, pure standard library + `aws` CLI + `openssl`. Default mode is a read-only preflight that pins the D6 target: caller account/identity, stack status, outputs, operator parameter, physical resource names, both bucket locations/versioning/AES256/public-access/ownership/policies, absent lifecycle configuration, the single-domestic-backup replication rule, the runtime user's put/get-only policy, and existing access keys. `--recovery` runs the synthetic restore exercise: checksummed quote readback + budget gate, first-version PUT (`IfNoneMatch: *`), bounded replication poll, replica version hash + length + SSE readback, delete-marker loss simulation, 404 confirmation, copy-restore from the backup version, restored-current hash/SSE readback, anonymous 403 check, and a 0600 `recovery.private.json`. `--issue` refuses without passing recovery evidence and zero existing keys, preflights dummy encryption before `create-access-key`, and writes an OAEP/SHA256 RSA-4096 envelope plus `result.json`; the plaintext file is unlinked in a `finally` block. Output directories are 0700, exclusive-create, and refuse reruns. |
| `scripts/storage/aws-finance-runtime-verify.cjs` | Local verification and bounded probe. Verifies the export checksum against the operator-recorded hash, the existing local transfer key against the recorded public-key hash, the full `result.json` contract, then decrypts and validates the exact six-key envelope contract (`AKIA`/40-char patterns included). Verifies the runtime identity via signed STS `GetCallerIdentity` before any S3 call, retains the probe object (PUT `IfNoneMatch`, GET hash/SSE), requires a real 403 `AccessDenied` on ten forbidden operations (bucket-list, bucket-versioning, bucket-policy, bucket-encryption, version-read, outside-prefix-write, object-delete, backup-read, backup-write, cross-media-write), and writes 0600 evidence to a new directory outside the repository. 404/`NoSuchKey` is rejected as denial evidence; an unexpected success stops every later write and delete. |
| `scripts/storage/tests/test_finance_runtime_prepare.py` | 14 tests: policy/bucket-policy contracts, preflight accept/drift/identity refusal, quote parsing shapes and the founder spend gate, the full mocked recovery sequence (ordering, backup-version copy-source, honest flags, 403), recovery-evidence and zero-keys refusals, RSA-4096 requirement, envelope bound before key creation, encryption-failure creates no key, and the happy-path issue contract with plaintext removal and real OAEP round-trip. |
| `scripts/storage/tests/finance-runtime-verify.test.cjs` | 8 tests: checksum/incomplete-result refusal, transfer-key mismatch, envelope contract (positive + 4 negatives), bounded-probe pass with denial order and no secret in evidence, wrong-principal stop before S3, 404 not accepted as denial (two shapes), and unexpected broad access stopping later writes. |

## Sequence and gates (D6)

1. **Recovery before issuance.** `--issue` requires a passing
   `recovery.private.json`; the recovery exercise never creates the access key.
2. **Fresh dedicated transfer key.** The verifier pins the raised public key to
   the operator-recorded SHA256; the packet-29 transfer key is not reused.
3. **One key, no retries.** `--issue` refuses if any access key exists and any
   incomplete `create-access-key` response stops with "do not attempt another
   key".
4. **D4 minimal budget.** `--recovery` requires a checksummed quote readback
   and refuses when the quote exceeds the supplied budget (founder spend gate).
5. **Honest evidence.** `result.json` and `recovery.private.json` self-label
   `runtimePermissionsExercised`, `migrationCompleted` and
   `productionBindingsChanged` as false; only the local verifier sets
   `runtimePermissionsExercised: true`, and `hostedOwnerIsolationVerified`
   stays false.

## Attended run (executed 18 October 2026)

Executed in CloudShell as the account root operator on the branch at
`1e10004ea`; full detail and file hashes in the
[run record](evidence/za-finance-runtime-2026-10-18/run-record.md).

1. Fresh RSA-4096 transfer keypair generated locally; public key SHA256
   `8ee54526e70bb549d12a6878b75accfee73f7069817a1f9b236933d34dbf8555`; private
   key never left the operator machine.
2. Quote readback `{"amountUsd": 0.01}` with budget USD 1.
3. Read-only preflight: **PASS** — operator root, zero existing keys, stack and
   both buckets read back as prepared.
4. Recovery: **PASS** — replication completed, replica hash verified, delete
   marker confirmed, restored current object read back from the backup version,
   anonymous read denied (403); evidence sha256 `5112582a...`.
5. Issuance: **PASS** — one dedicated access key created (none before),
   encrypted export sha256 `62ed3d97...`; plaintext removed.
6. Local verification: **PASS** — checksum, transfer key and signed STS
   identity pinned; positive PUT/GET pass with AES256; all 10 forbidden
   operations returned 403 AccessDenied.
7. Non-secret evidence copied into this packet's evidence directory; the
   encrypted export and `runtime-credentials.private.json` stay outside the
   repository.

## Local validation

- Python storage suite: 45 tests passed under
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/storage/tests -v`
  (14 new in `test_finance_runtime_prepare.py`).
- Node suite: 8 tests passed under
  `node --test scripts/storage/tests/finance-runtime-verify.test.cjs`.
- `node --check` and `python3 -m py_compile` clean; ESLint on both new `.cjs`
  files: 0 errors, 0 warnings.
- All runs use the mocked AWS layer; no network or AWS call was made before the
  attended run.

## Open items

1. Bounded migration, hosted application binding and hosted owner isolation
   remain unexercised and wait for the hosting resume; this packet produces a
   verified credential envelope and runtime evidence only.
2. `migrationCompleted` stays false in every artifact; the control-plane
   verifier is unchanged and continues to claim control-plane status only.

## Validation commands

- `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/storage/tests -v`
- `node --test scripts/storage/tests/finance-runtime-verify.test.cjs`
- `node --check scripts/storage/aws-finance-runtime-verify.cjs`
- `python3 -m py_compile scripts/storage/aws-finance-runtime-prepare.py`
- `npx eslint scripts/storage/aws-finance-runtime-verify.cjs scripts/storage/tests/finance-runtime-verify.test.cjs`

## Register effect

The SA finance/proof storage (B11/B15) register row moves from
"CONTROL PLANE PROVISIONED AND VERIFIED — runtime probes, recovery, migration
and bindings NOT EXERCISED" to "RUNTIME PROBES AND SYNTHETIC RECOVERY
EXERCISED — migration and bindings NOT EXERCISED". No hosted window, migration,
binding or paid opening is implied.
