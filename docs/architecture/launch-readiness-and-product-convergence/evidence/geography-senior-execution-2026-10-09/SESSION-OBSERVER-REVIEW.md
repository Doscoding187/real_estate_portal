# Senior decision: bounded session observer

Edward authorized technical ownership and immediate attended release preflight on October 9. The previous packet identified missing global session visibility but had no executable authorized observer. This amendment implements the missing read-only engineering capability without changing any database privilege, application identity or schema.

Use the existing operator credential in secure local custody (`azure-db.env`), explicitly classified bootstrap-admin, solely through the new `release-session-inspect` operation. Do not relabel it as a SELECT-only credential. Operation authorization requires the exact production Azure target fingerprint and a protected approval reference; the canonical connection creator verifies TLS and selected database. After session initialization, the returned connection rejects every statement except the four fixed metadata queries and rejects all execute calls/parameters.

The projections read current identity/connection ID, own grants, session IDs/accounts/database/command/age, and transaction connection IDs/state/modified-row count. They omit SQL text, client addresses, credentials and customer content. PROCESS visibility must be demonstrated and the observer must appear in the result. The report is a snapshot, never a freeze certificate. Unknown accounts remain blockers until accounted for.

This is an operator-tool source addition, not a replacement schema or application deployment source. The approved 49a48572 schema source and its exact digest remain unchanged. The observer must be transferred as a separately checksum-bound tool bundle, removed after use, with credentials supplied only over the protected input channel. No grants, writes, connection kills or service changes are included.

The new route is reviewed by Codex under Edward's explicit delegation of engineering decisions. This resolves the prior restriction against an improvised/borrowed admin connection by adding a named canonical operation with an enforced query allowlist. It does not extend generic diagnostics to admin credentials. No change to payment/reopening/data-application holds.

Validation: 48 focused context/observer/readiness-connection tests passed; database authority gate passed (710 static tests, utility inventory, schema sanity, deterministic inventory and lifecycle contract). Production TypeScript check passed; touched-file ESLint has zero errors after correcting cleanup error handling. These checks were required by the new authority operation, not repetitions of unchanged product tests.
