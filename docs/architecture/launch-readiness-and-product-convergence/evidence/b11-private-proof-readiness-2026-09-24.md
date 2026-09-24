# B11 private proof storage readiness — 2026-09-24

## Disposition

The hosted billing proof path now requires a private S3 bucket and a dedicated
access key. The runtime and launch preflight both reject reuse of the public
media bucket or access key. Hosted reads cannot fall back to local filesystem
proofs or public media credentials. Local development storage remains available.

This is code readiness only. Production proof storage is **not verified**:
Railway Production has no `BILLING_PROOF_*` storage variables, and no private
bucket put/get, encryption, access-denial, persistence, backup, or retention
evidence has been collected. Do not accept customer payment proofs until the
provider configuration and a controlled end-to-end proof exercise pass.

## Verification

- `pnpm check` passed.
- `pnpm vitest run server/services/__tests__/billingProofStorage.hosted.test.ts server/__tests__/launch-preflight.contract.test.ts server/_core/hostedRuntimeConfiguration.test.ts --reporter=dot` passed (29 tests).
- A subsequent focused run of `billingProofStorage.hosted.test.ts` passed (2 tests).

## Remaining B11 gate

Provision and bind a private durable bucket with credentials scoped to that
bucket; verify put/read, private access denial, process restart persistence,
retention, and recovery using controlled test data. The hosted B12 preflight
must pass with these same settings before paid activation.
