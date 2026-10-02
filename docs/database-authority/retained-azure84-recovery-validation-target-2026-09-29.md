# Exact pre-upgrade recovery validation target

Approval: Edward approved retained upgrade execution packet
`35954afc649f24027ec33cac9aa2de3c580ebcae`, including a fresh backup and restored
recovery proof. Continuation on 2026-09-29 retains that recovery requirement.

- Subscription: `384dc69e-9e22-419f-9e3d-83fbac4f58d0`
- Resource group: `rg-property-listify`
- Source server: `propertylistify-mysql`
- Recovery server: `pl-pre84-recovery-20260929-0815`
- FQDN: `pl-pre84-recovery-20260929-0815.mysql.database.azure.com`
- Database: `propertylistify_database`
- Purpose: retained Azure 8.4 pre-upgrade recovery validation.

The existing protected-target classification (`production`) is a protection
level, not a statement that this recovery copy serves application traffic.
Only `read-only-connect` and `verification`, with the read-only credential and
exact protected operation/fingerprint approval, are admitted. Every other
operation and credential class is denied before connection. Other hosts, ports,
or databases remain shared-remote and fail closed. TLS identity verification is
unchanged. No generic operation-policy permission is widened.

Before inspection, the operator must verify ARM identity, source resource and
restore timestamp from provider evidence; a proposed name alone is not proof
of a completed restore. Registration is not authorization to create, overwrite,
write, migrate, upgrade, deploy to, or delete this server. Those provider actions
remain governed by the separately approved packet. Preserve the recovery copy
and report its cost state. Review/remove this registration when the recovery
resource is retired under a later explicit cleanup decision.
