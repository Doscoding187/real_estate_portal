# Senior recovery checkpoint — October 10, 2026

The schema stage did not begin. The independent runner failed its read-only database preflight. No ingress block, process drainage, backup creation, DDL, reference write, production application deployment or payment activation was performed by this execution.

## Evidence and diagnosis

- The protected inspection before the interruption showed head 0096; the schema-plan digest remained `d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d`.
- The new bounded session observer proved global PROCESS visibility through the existing administrator identity, without changing grants. That observation was through the API and is not independent-runner connectivity proof.
- Runner deployment `4d280d07-010e-4a47-950c-c2186f3afa66` successfully started an idle process. Its protected inspection failed before a transaction started; its transient source was removed.
- Runner network flows showed incomplete outbound TCP to Azure port 3306. A later HTTPS egress lookup returned `34.21.135.52`; it is absent from the four Azure allowlist entries. This strongly supports a network-access mismatch. It does not independently establish the NAT address used by the earlier MySQL connection or prove a firewall rejection from server logs.
- The live API has static outbound addresses `208.77.246.240`, `.241` and `.242`, all already allowed. The runner must not assume it inherits those settings.

## Cleanup and timing deviation

The approved window ended October 9 at 19:26:13 UTC. The runner remained idle during the interrupted session beyond its two-hour allowance. This was a lifecycle-control failure; the spend cap is not claimed as verified.

The exact temporary service `3160d05c-44f0-4d5f-af9c-7bfe5f5ce37e` was deleted at approximately 22:39 UTC. Subsequent provider readback confirmed four original services, unchanged deployment IDs, zero reported service issues and no pending work. No volume was detached. No replacement runner was provisioned during recovery.

## Technical recovery direction

1. Prepare the same immutable schema source and bounded operator overlay. Keep source, schema digest and reference exclusions unchanged.
2. Configure the replacement runner's static outbound networking before its first deployment. Inspect assigned addresses explicitly. Railway documents that assignment changes require deployment to take effect; assignment to the API's same addresses must not be assumed.
3. Compare every assigned address with the existing Azure rules. If all are already allowed, no firewall change is needed. If any differ, stop before credentials or database operations and present the exact narrow network amendment; the approved scope excludes firewall broadening. Never enable all-address or all-Azure access.
4. Verify the effective outbound route and then run the governed read-only inspector and session observer from the runner. Do not stop application services until both pass.
5. Prevent another orphan: assign an absolute expiry to the idle runner and a cleanup owner before creation. An idle-only watchdog may stop an unused runner; it must never kill an active migration. Do not begin DDL without enough time for completion and recovery. Provider service deletion must be verified, not inferred from an idle-process exit.
6. Refresh the maintenance window and live process bindings immediately before containment. The expired window does not authorize a delayed unattended database operation. This is the remaining business timing decision; routine engineering corrections remain senior-owned.
7. Follow the existing drain, no-restart, global-session, frozen-backup and schema gates. Reference application, application deployment, reopening and payments remain separate held stages.

Provider reference: https://docs.railway.com/networking/static-outbound-ips (read October 10 SAST). The record is a stop/recovery checkpoint, not schema acceptance or a new B12 gate.
