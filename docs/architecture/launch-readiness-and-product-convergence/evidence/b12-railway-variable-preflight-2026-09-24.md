# B12 Railway variable-only preflight — 2026-09-24

Status: read-only comparison at 15:27 UTC. Railway Production service
variables were read in process and passed to the candidate's
`hostedRuntimeConfigurationIssues` evaluator with expected runtime class
`production`. No variable values, credentials or complete URLs were printed or
stored. No Railway setting or deployment changed. This is a variable-only
candidate check, not execution of the current deployed artifact and not hosted
acceptance.

Project `successful-tranquility`, environment `production`, API service
`real_estate_portal` returned **nine** candidate configuration issues:

1. `MEDIA_STORAGE_ADAPTER` is not explicitly `s3`.
2. `MEDIA_UPLOAD_TOKEN_SECRET` is absent or does not meet the 32-character
   non-placeholder contract.
3. `APP_ENV=production` and `NODE_ENV=production` are not both explicit.
4. No full 40-character build SHA is present in the persistent variable set.
5. `BILLING_PROOF_S3_BUCKET` is absent.
6. `AWS_S3_BUCKET` does not equal `S3_BUCKET_NAME`.
7. `BILLING_PROOF_STORAGE_ADAPTER` is not `s3`.
8. Dedicated private-proof AWS access and secret keys are absent.
9. `SAVED_SEARCH_SCHEDULER_ENABLED` is neither explicit `false` nor validly
   enabled with its own strong action-token secret.

The SHA result is provisional: Railway may inject its commit SHA only into a
running deployment. The exact deployed process must still prove build identity
through `/api/version` and deployment details. The other findings are concrete
gaps in persistent configuration for the candidate code. B11's [read-only AWS
inventory](b11-private-proof-readiness-2026-09-24.md) found only the public
media bucket, so private-proof values cannot be safely filled by reusing it.

The project currently has only the API and Redis services. The B10 email
supervisor and B13 five-minute lead cron remain unprovisioned. Their commands
and service contracts are already in the repository; creating or deploying
them is a separate B12 hosted operation after the release candidate and
provider boundaries are reviewed. Railway Production continues using TiDB.
