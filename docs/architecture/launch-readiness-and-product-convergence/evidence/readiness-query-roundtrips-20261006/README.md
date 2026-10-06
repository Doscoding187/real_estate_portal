# Readiness transport correction evidence

This is a **failed deployment checkpoint and an undeployed correction**, not joined-release acceptance. API source is the accepted identical-tree #587 merge `90620e2790029f5b1e9dd71be6db932d9ddbc48a`; workers/frontend remain at `b34b6a0eeadf46e5b855fa3d3c92b6c277c09e60` because sustained readiness failed before dependent deployments.

The packet preserves operator acceptance, the reviewed-head CI result, frozen merge identity, successful provider artifact, initial strict readiness, every failed-window response, actual worker artifacts and recent executions, containment and verified public frontend settings. Read-only profiles contain hashes and timings for SQL statements and sanitized readiness layers, without SQL parameters or row contents. The direct-query profile is a diagnostic wrapper using existing authorized methods; production service code was unchanged. Timing variance remains a limitation. Local validation covers the proposed correction; its fresh CI/review/source acceptance gates remain outstanding.

`artifact-digests.json` hashes the 16 evidence artifacts. `SHA256SUMS` covers those artifacts and the digest manifest (17 entries). Verify with `sha256sum -c SHA256SUMS` in this directory. Private runtime/build logs remain in the operator evidence directory; only their digest is shared here. No credential-bearing connection URL, secret binding, account address, session value, verification token or raw operator screenshot is included.

See [the checkpoint](../../controlled-release-readiness-query-blocker-2026-10-06.md) for observed outcomes, the declared version mixture, failure, bounded correction and the remaining release/customer gates.
