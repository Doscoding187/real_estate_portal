# Recovery from a failed compatible application start

The senior owns recovery operations. Schema 0111 and admitted reference data are accepted and must survive an application failure. This preparation implements no automatic recovery action.

On build/config/start/readiness/version/search failure, keep maintenance, paused sales, disabled lead cron and held workers. Record exact deployment/source/artifact, effective configuration digests, exit/signal, request correlation, sanitized logs, readiness layers and provider metrics before any change. Classify the failure: source/version mismatch; static configuration; DB target/permission/TLS/readiness; Redis/media; scheduler/worker; customer journey; or hosted performance. A healthy schema is not permission to ignore another failed layer.

If a new compatible process must stop, the senior first checks active requests, scheduler/worker work and any unknown operation. Use provider controls and the existing natural shutdown path only in the authorized incident/application scope. API SIGTERM drains startup/HTTP/schedulers/readiness and attempts independent cleanup; unchanged watchdog is 20 seconds and nonzero failures are retained. Email finishes its active batch then closes DB. Lead is a one-shot operation whose unknown delivery state must be preserved/reconciled, not automatically killed/deleted/replayed. A notification, expiry or failed probe must never kill or delete an active/unknown operation automatically.

Do not roll back to pre-0111 application writers, replay migrations, reapply reference data, seed a missing role, alter ledgers, patch grants, introduce alternate-schema SQL or widen canonical geography. A corrected application/configuration candidate needs exact-source review and the relevant focused checks; it reuses the accepted database. This packet changes no application code.

The pre-0111 Ready backup is an incident option requiring a separate senior/human decision. Restoring it would remove the accepted schema/reference stages and is not a frontend/API rollback. Retain backup and release evidence; do not restore or delete it during application preparation.

Reference custody is closed, not reused as an open runner window. Any future temporary operation would need its own actual lifecycle/correlation and independent custody directive; no new runner is part of this application packet. Keep the original archive receipts, alarm-test evidence and active-intent acknowledgement intact.
