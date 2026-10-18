# ZA finance runtime credential and recovery run record

18 October 2026. Attended execution of the packet-51 workstream on branch
`prep/za-finance-runtime-credential-probes-20261018` at `1e10004ea`, run in AWS
CloudShell (af-south-1) as the account root operator
(`arn:aws:iam::914683204061:root`), with local verification on the operator
machine. No hosted binding, migration, temporary paid resource or media
configuration change occurred.

## Steps and results

| Step | Inputs | Result |
| --- | --- | --- |
| Read-only preflight | none | PASS. Operator root; `existingAccessKeys: 0`; stack `listify-finance-af-south-1` (`4e86f630-ca78-11f1-b384-0effe60af513`); both buckets, policies, replication rule and runtime policy read back as prepared. |
| Quote readback | `{"amountUsd": 0.01}`, budget USD 1 | Recorded (`quoteReadbackSha256 ffbfb7f7ac1c0f447ea55732ce1dfeea2c8a1a04c517a2c0a31425b90eae0765`); within budget; no paid resource created. |
| Recovery | `--recovery --quote-readback quote.json --budget-usd 1` | PASS. Probe key `billing-proofs/recovery-verification-c9db381b5129445999fbb0ac562fe7db.txt`; source and replica version `3GHgItcjCYiRZLROpslWMyyd7pW6pl45` (1 replica, AES256); delete marker `Pq_pZJUxyPxiGnC5OQOz.Umtf90Q4b5E`; restored-current version `ySXiL_8NMPC3VTB...` from the backup copy-source; payload sha256 `ce3c867e...`; anonymous GET 403; evidence sha256 `5112582a...`. |
| Issue | `--issue --public-key transfer.public.pem --expected-public-key-sha256 8ee54526... --recovery-evidence ...` | PASS. Public key SHA256 `8ee54526e70bb549d12a6878b75accfee73f7069817a1f9b236933d34dbf8555` (RSA-4096); one access key created (none before); export `finance-runtime.encrypted` sha256 `62ed3d9755a9b1ecfd8ec1303c47fa580f23aa3f07ae075492e64c6285ac385a`. |
| Local verify | `aws-finance-runtime-verify.cjs` with the private transfer key | PASS. Checksum, transfer key and signed STS identity (`...ProofRuntimeUser-AZx3gkrzcgMx`) verified; positive PUT/GET pass with AES256; 10/10 forbidden operations returned 403 AccessDenied (bucket-list, bucket-versioning, bucket-policy, bucket-encryption, version-read, outside-prefix-write, object-delete, backup-read, backup-write, cross-media-write); probe object retained by design. |

## Evidence file hashes

| File | SHA256 |
| --- | --- |
| `recovery.private.json` | `5112582a0e640cd0f8b6ba9dd673b91b239351d006ecc110ccc123ce39c43ee2` |
| `result.json` | `00a5e1b9a313148e72f9ec0c8613c7b1bee3b2d662071a6cbf54addb5833872c` |
| `transfer-verification.json` | `1b282a0c0ea4da61ba2b94448e2ad074d5dc66206b329dcc139b2a2be23385d8` |
| `runtime-verification.json` | `bbd71d9a07199cac66fffa8ae29ef3ae33e163a12eed3dc1acfc01209f0f37f2` |

`result.json`'s `recoveryEvidenceSha256` equals the recovery file hash; the
encrypted export hash equals `result.json`'s `encryptedCredentialsSha256`; the
operator-inspected replication readback confirmed the packet-51 fix
(`ID` vs `Id`).

## Custody

- Private transfer key: `~/property-listify-finance-transfer-key/transfer.private.pem`
  (0600, operator machine only; never uploaded).
- Encrypted export + `result.json`: `~/property-listify-finance-runtime-issue/`
  (0600).
- Runtime credential plaintext for any later binding decision:
  `~/property-listify-finance-verify/run-20261018/runtime-credentials.private.json`
  (0600).
- CloudShell directories `~/property-listify-finance-recovery/` and
  `~/property-listify-finance-runtime-issue/` are preserved; do not rerun
  either program.
- This repository directory contains non-secret evidence only.

## Remaining

- Bounded migration, hosted application binding and hosted owner isolation
  remain unexercised and wait for the hosting resume.
- The control-plane verifier (`southAfricanFinanceStorage.ts`) is unchanged and
  continues to claim control-plane status only.
- Retained probe objects in `billing-proofs/` are deliberate: the runtime
  identity cannot delete, and `object-delete` denial is part of the evidence.
