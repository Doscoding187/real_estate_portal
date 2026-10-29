# B11 private finance storage readback — 2026-10-29

**Evidence boundary:** repository, committed configuration and existing decision packets only. No AWS console, credentials, secret values or hosted runtime were accessed.

## What the record says

The approved primary bucket is listify-finance-914683204061-af-south-1 in AWS af-south-1 (Cape Town). The same-region versioned backup is listify-finance-af-south-1-financebackup-kce1wayc2h2e. Packet 50 records both buckets provisioned and control-plane verified; packet 51 records one dedicated proof-runtime key, positive/denied permission probes and a synthetic recovery exercise. Neither packet says the application was bound to these resources.

Authority: `docs/architecture/launch-readiness-and-product-convergence/49-founder-decisions-recorded-2026-10-17.md` records the founder's D6 storage decision. The specific bucket/control-plane record is `50-za-finance-storage-control-plane-verified-2026-10-17.md`; runtime-key/probe/recovery preparation is `51-za-finance-runtime-credential-and-recovery-preparation-2026-10-18.md`. The required app variable names are governed by `docs/b12-hosted-runtime-contract.md`, which does not prove current values or app binding. The central B11 row in `03-launch-register.md` still says “only public S3 exists”; that sentence is stale against packets 50/51.

## What committed app configuration says

- Public media uses AWS_REGION, S3_BUCKET_NAME and CLOUDFRONT_URL on the server; browser media resolution uses VITE_CLOUDFRONT_URL or VITE_ASSETS_BASE_URL. Video/media paths also read AWS_S3_BUCKET and the hosted contract requires it to equal S3_BUCKET_NAME. Values are not committed as current live settings. The server env helper has a development fallback of us-east-1; deployed security checks require explicit region/bucket values. Some old media setup documents describe eu-north-1 and listify-properties-sa; they are not the finance-bucket authority.
- Financial proofs use separate BILLING_PROOF_STORAGE_ADAPTER=s3, BILLING_PROOF_S3_BUCKET, BILLING_PROOF_S3_REGION=af-south-1, BILLING_PROOF_S3_PREFIX (defaults to billing-proofs), BILLING_PROOF_AWS_ACCESS_KEY_ID and BILLING_PROOF_AWS_SECRET_ACCESS_KEY. Production requires a separate bucket and dedicated credentials; the bucket must differ from S3_BUCKET_NAME. No real env values or credentials are committed, so current hosted bindings cannot be confirmed.
- Private access exists in code: billing proof writes are server-mediated and AES256-encrypted; retrieval is authenticated and limited to finance admins or the owning agent/agency/developer, then returned through the API after a hash check. No pre-signed download URL is generated for finance proofs. This does not prove the live bucket policy or app binding.

## Exact AWS console checks for the founder

1. Select AWS account 914683204061 and region af-south-1. Open CloudFormation stack listify-finance-af-south-1; confirm CREATE_COMPLETE and outputs match both bucket names above.
2. For each bucket, confirm region af-south-1, Versioning Enabled, default encryption SSE-S3/AES256, Object Ownership Bucket owner enforced, and all four Block Public Access controls enabled.
3. Check each bucket policy has TLS-only access and no public principal. Confirm the primary allows only the documented operator/root/runtime/replication principals; confirm the runtime principal has no backup access.
4. On the primary, confirm the single enabled replication rule points to the named backup and has an empty prefix filter (whole dedicated bucket), delete-marker replication is disabled, and no lifecycle rule expires objects. Confirm the backup is versioned and retained.
5. Open the dedicated runtime user listify-finance-af-south-1-ProofRuntimeUser-AZx3gkrzcgMx. Confirm its policy grants only PutObject/GetObject under the primary billing-proofs/* object prefix, with no bucket listing, delete, version administration, media-bucket, or backup permissions. Confirm only the expected active key exists; never copy its value into chat or the repository.
6. Confirm the named stack/resources still exist and match the template and packets 50/51. Do not create a key, change policy, run a probe, or modify resources as part of this readback.

After this readback, the separate hosted owner must verify application environment bindings and repeat the bounded positive/denial/restart checks under the approved procedure. AWS-console readback alone does not close B11.
