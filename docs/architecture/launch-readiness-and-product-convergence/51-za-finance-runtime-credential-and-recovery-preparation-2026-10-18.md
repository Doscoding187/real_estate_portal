# ZA finance runtime credential and recovery preparation

18 October 2026. Prepares the complete, bounded runtime-phase workstream for
the South African finance storage: the synthetic restore-from-backup recovery
exercise and the encrypted issuance of the one dedicated runtime access key
recorded in D6 (launch-readiness packet 50). Every mode is locally validated
against a mocked AWS layer. This packet **does not** contact AWS, does not
create an access key, does not run the recovery exercise and does not bind the
application; execution is a short attended session with the operator's own
credentials.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `ZA-FINANCE-RUNTIME-PREPARATION-2026-10-18` (launch-readiness packet 51) |
| Base | `main` at `ac1ee5eb1` (contains the packet-50 D6 record via PR #643) |
| Worktree / branch | `property-listify-za-finance-runtime-20261018` / `prep/za-finance-runtime-credential-probes-20261018` |
| Precedent | Packet 29 (`aws-proof-runtime-verify.cjs`, `aws-private-proof-provision.py`): recovery precedes key issuance, envelope-then-local-verify, no hosted binding. |
| Boundary | Local files and mocked-AWS tests only. No AWS API call, credential, bucket, database, provider or protected action was accessed or changed. |
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

## Attended-run sequence (not yet executed)

1. Generate a fresh RSA-4096 transfer keypair locally; record the public key
   SHA256. The private key never leaves the local machine.
2. In Cost Explorer, capture the recovery/exercise quote as JSON.
3. Read-only preflight: `python3 scripts/storage/aws-finance-runtime-prepare.py`.
4. Recovery: `--recovery --quote-readback <file> --budget-usd <n>`.
5. Issuance: `--issue --public-key <pem> --expected-public-key-sha256 <hash> --recovery-evidence <path>`
   (only the public key is needed wherever this runs).
6. Locally: `node scripts/storage/aws-finance-runtime-verify.cjs <encrypted> <result.json> <private key> <export sha256> <public key sha256> <new private dir>`
   (needs `@aws-sdk/client-s3`; CloudShell precedent for scratch installs is the
   packet-50 run record).
7. Copy only non-secret evidence (`result.json`, `recovery.private.json`,
   `transfer-verification.json`, `runtime-verification.json`) into
   `evidence/za-finance-runtime-2026-10-18/`; the encrypted export and
   `runtime-credentials.private.json` stay outside the repository.

## Local validation

- Python storage suite: 45 tests passed under
  `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/storage/tests -v`
  (14 new in `test_finance_runtime_prepare.py`).
- Node suite: 8 tests passed under
  `node --test scripts/storage/tests/finance-runtime-verify.test.cjs`.
- `node --check` and `python3 -m py_compile` clean; ESLint on both new `.cjs`
  files: 0 errors, 0 warnings.
- All runs use the mocked AWS layer; no network or AWS call was made.

## Open items

1. Attended execution of steps 1–7 above, including the transfer-key generation
   and the operator quote readback.
2. The storage runtime verifier flags (`runtimePermissionsExercised`,
   `recoveryExercised`, `migrationCompleted`) remain false until the attended
   run produces the runtime evidence; `migrationCompleted` additionally waits
   for the hosted resume.
3. Hosted application binding remains a separate reviewed decision; this
   packet produces a verified credential envelope and runtime evidence only.

## Validation commands

- `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/storage/tests -v`
- `node --test scripts/storage/tests/finance-runtime-verify.test.cjs`
- `node --check scripts/storage/aws-finance-runtime-verify.cjs`
- `python3 -m py_compile scripts/storage/aws-finance-runtime-prepare.py`
- `npx eslint scripts/storage/aws-finance-runtime-verify.cjs scripts/storage/tests/finance-runtime-verify.test.cjs`

## Register effect

None. The workstream is prepared and locally validated only; no AWS mutation,
access key, recovery run, migration or binding has occurred, and every
pre-existing disposition is unchanged.
