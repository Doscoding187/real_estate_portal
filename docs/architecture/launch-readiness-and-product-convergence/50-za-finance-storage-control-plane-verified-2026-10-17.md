# South African finance storage provisioned and control-plane verified — 17 October 2026

17 October 2026 (late evening UTC). Executes the [D6 decision](49-founder-decisions-recorded-2026-10-17.md)
in an attended AWS CloudShell session: the domestic finance primary bucket, the
same-region versioned backup, replication and the dedicated proof runtime user
now exist in `af-south-1`, and the repository's control-plane verifier reports
`control_plane_verified`. No object was written, no access key exists, no
application binding, migration or recovery ran, and the hosted runtime,
paid-opening NO-GO and register acceptance statuses are unchanged.

## Authority and boundary

| Field | Record |
| --- | --- |
| Packet | `ZA-FINANCE-STORAGE-CONTROL-PLANE-2026-10-17` (launch-readiness packet 50) |
| Authority | D6 in packet 49 under the aggregate usage approval (packet 28); D4 backup destination; packet 39 domestic arrangement; packet 29 provisioning pattern |
| Base | `main` at `3c7b4be0a` (contains packet 49 via PR #642) |
| Worktree / branch | `property-listify-d6-za-finance-storage-20261017` / `docs/d6-za-finance-storage-20261017` |
| Attended run | AWS Console CloudShell, region `af-south-1` (enabled by Edward immediately before the run). Edward performed every console/CloudShell action; the repository supplied the reviewed template and verifier only. Deployer identity: account root console session (recorded below). |
| Boundary | AWS account `914683204061` only, inside `af-south-1` only. The eu-north-1 leaf bucket/canary, the media uploader identity and media configuration, the application, hosted services, databases and payment paths were not touched. No access keys were created anywhere. |

## Provisioned resources (stack `listify-finance-af-south-1`)

| Resource | Value |
| --- | --- |
| Stack | `arn:aws:cloudformation:af-south-1:914683204061:stack/listify-finance-af-south-1/4e86f630-ca78-11f1-b384-0effe60af513`, `CREATE_COMPLETE` |
| Template | `scripts/storage/south-african-finance-storage.template.json`, SHA-256 `7845e994054c7a97af68c638d67238649484202bab1ec03d63853efb786656b7`, deployed from public `main` raw source with `--capabilities CAPABILITY_IAM`; the template's own condition creates resources only in region `af-south-1` for account `914683204061` |
| Finance primary bucket | `listify-finance-914683204061-af-south-1` |
| Same-region backup bucket | `listify-finance-af-south-1-financebackup-kce1wayc2h2e` (versioned, replication target) |
| Replication | `listify-finance-af-south-1-ReplicationRole-jRMcboiYzXcD`, primary → backup, delete-marker replication disabled |
| Proof runtime user | `listify-finance-af-south-1-ProofRuntimeUser-AZx3gkrzcgMx` (no access key; `billing-proofs/*` Put/Get only; no delete; no backup access) |
| Operator principal | `arn:aws:iam::914683204061:user/listify-finance-operator` (UserId `AIDA5J526CHOQPJTUOJAQ`, created 2026-10-17T22:14:59Z, tag `purpose=finance-storage-operator`; no console login, no access keys) |
| Operator policy | `FinanceStorageOperator`: `s3:*` restricted to the four ARNs of the two buckets above |
| Deployer identity | `arn:aws:iam::914683204061:root` (console session; recorded, not reused as the named operator) |

## Verification

The reviewed verifier `scripts/storage/verifySouthAfricanFinanceStorage.ts`
(fetched unmodified from public `main`, run with the session credentials)
reported `status: control_plane_verified` at `2026-10-17T22:33:32.558Z`:

- Both buckets: region `af-south-1`, versioning `Enabled`, `AES256`, all four
  public-access blocks, TLS-only access, no automatic expiry.
- Principal exceptions — primary: operator, root, proof runtime user,
  replication role; backup: operator, root, replication role
  (**the proof runtime user is correctly denied on the backup**).
- `backupReplicationConfigured: true`.
- Explicitly untested flags: `runtimePermissionsExercised: false`,
  `recoveryExercised: false`, `migrationCompleted: false`.

Full output: [verification.json](evidence/za-finance-storage-2026-10-17/verification.json).
Chronology and raw readbacks: [run-record.md](evidence/za-finance-storage-2026-10-17/run-record.md).
Operator policy document: [operator-policy.json](evidence/za-finance-storage-2026-10-17/operator-policy.json).

## Custody and security notes

- No access key, login profile or MFA device was created for any identity; the
  operator user exists as a named principal with scoped S3 rights only.
- Every check and readback was read-only against the buckets; no object was
  written and no migration or restore was attempted.
- The CloudShell working directory `~/za-verify` is session-local and
  disposable; the deployed template equals the repository file recorded above.
- Session note for later phases: CloudShell Node is v20.20.2 and the AWS SDK
  warns that v3 releases published after the first week of January 2027
  require Node ≥22 — plan the future runtime-credential issuance phase
  accordingly.

## Remaining storage sequence (unchanged)

1. Runtime credential issuance for the proof runtime user via the packet-29
   encrypted-envelope pattern, then runtime denial/positive probes.
2. Synthetic recovery exercise under the D4 minimal-budget rule (verified
   quote readback first; no restore has run).
3. Bounded migration and application/hosted bindings when the hosted runtime
   resumes.
4. Confirm the existing cost/budget workflow covers the two new buckets.

Register effect: the B11/B15 storage row now reads control plane provisioned
and verified, and the D6 founder-decision row is updated. No acceptance scope,
hosted execution or paid-opening status changes.
