# Azure transition: fresh accounts, archived TiDB

## Principal direction

On 2026-09-29 Edward changed the overall objective from a rehearsal-only corridor
to completing the transition to Azure. He clarified that pre-launch records and
experimental history need not dictate the destination model. When asked which
accounts should carry over, he explicitly selected:

> Start all accounts fresh; archive the TiDB data.

## Binding data disposition

- The approved canonical application/schema is the destination authority.
- No TiDB accounts, password hashes, sessions, customer/business rows, legacy
  schema, or migration ledger are imported into the Azure application database.
- Preserve a protected TiDB archive and its schema/integrity evidence before
  retirement. A capture taken while TiDB remains writable is preliminary; the
  final capture must follow writer freeze and precede retirement.
- Do not delete or reset TiDB as part of preparing this change. It must cease
  receiving application writes at cutover and remain preserved for recovery
  review, rather than become an automatic alternative writer.
- Retain approved canonical Azure reference values. Add only required governed
  launch reference data through Database Authority; no demo/scenario accounts,
  fabricated inventory, or legacy compatibility tables.
- Rotate the application's session-signing secret at cutover and invalidate
  old sessions/refresh credentials. Numeric user IDs may be reused in a fresh
  database; an old signed TiDB session must never identify a new Azure account.
- Verify fresh registration/login and the existing owner/bootstrap mechanism.
  This decision does not authorize guessing an administrator identity or
  introducing an ungoverned production super-admin seed.

## Execution boundary

The retained target's provider upgrade is governed by packet `35954afc` and its
recorded source/recovery/8.4 integrity proof. This account disposition does not
claim that application readiness, reference provisioning, archive verification,
writer freeze, capacity admission, or cutover validation has already passed.
Existing fail-closed controls still apply to each operation. No paid commercial
activation or unrelated candidate work is included merely because the database
provider changes.
