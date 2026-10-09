# Approved schema stage — read-only preflight stop

**Stopped before production changes.** Edward approved the reviewed schema-stage scope for **9 October 2026, 18:00–20:00 SAST**, with Codex operating and Edward attending. That approval remains recorded; the required graceful writer containment is not established. The window had not opened during this preflight, and attendance confirmation for its opening had been requested but not received when the stop decision was recorded.

Approved source: **49a48572c24d1b122fcf17b025a76e5ab77f03a8**. Approved target fingerprint: **b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced**. Exact approved schema digest: **d8dfd9120ee8499e4da0c19fcde9c503c4867453d3ddce2e8501f6cceef3989d**. [Approval and stop](approval-and-stop.json) binds the original [execution packet](../geography-attended-execution-2026-10-09/README.md), commit `377b6e4a8e91cce4a400164bad27c1685ca20575`.

## Containment gate

[Live read-only preflight](read-only-preflight.json) and [deployment manifest evidence](existing-deployment-drain-evidence.json) establish that both the API and email service configuration and their running deployment manifests have `drainingSeconds=null`. The provider documents a **zero-second** default before SIGKILL. The inspected stop/remove mutations accept a deployment ID and expose no explicit grace argument. The service-update tool documents configuration changes as applying on the next deployment. Those facts do not establish an effective graceful stop for these existing artifacts; do not assume a settings patch retrofits them.

The packet requires API shutdown, completion of the current email batch, connection closure, prevention of ALWAYS restarts, and a stop if a process is forcibly terminated or drainage is ambiguous. Removing the deployments first and then discovering that grace is absent would violate the prerequisite. No stop, removal, signal, configuration patch or redeployment was attempted. A shell signal alone is not proof of drained work.

The next prerequisite is a provider-supported graceful stop for these exact existing deployments, with demonstrable completion and no restart, or a concrete reviewed amendment to the containment procedure. Any required application redeployment, forced-stop exception or service reopening is outside the current authorization. Do not perform it as an implicit fix. Resume execution only after that prerequisite is resolved, Edward confirms attendance, and an approved window still has sufficient time; otherwise arrange a replacement attended window.

Sources: [Railway teardown defaults](https://docs.railway.com/deployments/reference), [deployment teardown](https://docs.railway.com/deployments/deployment-teardown). Provider behavior is not certified by unchanged application tests.

## Fresh schema state

The dedicated SELECT-only inspector ran the named protected inspection and schema plan from an immutable archive of the accepted merged source, using the existing API container only as SSH transport. It did not deploy that source. [Provenance](read-only-provenance.json) records completion at **2026-10-09T15:29:57.983Z**, verified installed dependency lock, exact source/archive identity and removal of temporary source files. [Inventory](source-archive-inventory.json) lists the archive inputs.

- [Inspection](protected-inspect.json): exactly 97 successful history entries through **0096_user_founder_authority_unique.sql**, no incomplete attempts, dedicated SELECT-only grants verified.
- [Fresh schema plan](protected-schema-plan.json): the approved digest is unchanged; 15 migrations remain pending through **0111_properties_canonical_place_reference_fk.sql**. No lock was acquired or migration applied.
- **0111 is not installed.** No new reference-data plan was generated in this attempt. The earlier pre-schema result remains non-applicable, with a null plan digest; it cannot authorize reference writes.

## Other preflight results and factual correction

The prepared maintenance ruleset passed Railway's read-only validator with no diagnostics. The current project permits five edge rules; only one is proposed. API/email/lead deployment IDs still match the packet, with no staged changes. Dedicated inspector, migrator and runtime credential custody files have mode 0600, distinct named identities and the same approved target fingerprint; no credential values were exposed or uploaded.

Current Azure metadata reports the same server/resource ID, Ready state, version 8.4 and 14-day retention. **Correction to the original packet prose:** the Azure server location is **South Africa North**, not `southeastasia`. The original attached `current-preservation.json` already recorded South Africa North. This corrects the wording without changing the approved server, target fingerprint, schema plan or backup resource. Any recovery proposal must use that actual server region. Railway's runner region remains separately `asia-southeast1-eqsg3a`; these are different providers and resources.

The accepted source archive checksum was verified, then a private local runner bundle plus the reviewed idle-runner configuration was prepared. No upload or runner creation occurred. The proposed one-vCPU/one-GB container ceiling would cost about USD 0.08328 over 120 minutes at the currently published compute rates; network usage is additional and the approved USD 1 cap remains a stop constraint, not an automatic billing limiter. No chargeable runner exists. [Railway pricing](https://docs.railway.com/pricing/plans).

No production backup creation, ingress change, worker/cron change, schema/reference write, grant, application deployment, service reopening, customer write or payment activation occurred. No unchanged tests, build or performance run was repeated. Local authority status was inspected without recreating its disposed disposable database. Protected evidence inspection and planning were SELECT-only; the transient source archive was removed from its transport container.

[SHA256SUMS](SHA256SUMS) covers this stop record. Schema approval is preserved; the execution prerequisites remain unsatisfied, and reference writes, grants, application deployment, service reopening and payments remain held.
