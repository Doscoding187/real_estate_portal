# DBA-S3C7 Production Seed Security Containment

## Status

Repository containment complete pending the external security operation.

## Evidence

- Control commit: `2274ff873d4051d22e60c0143d7d378f105293e1`
- Audit worktree: `audit/database-authority-production-seed-security-s3c7`
- Database connection opened: no
- Migration, seed, reset, Docker, or environment-file load: none

The six related scripts had no package-command caller. The production-targeting
seed loaded a production environment file, opened a direct MySQL connection,
embedded an account password input, and wrote a super-admin account. The
account/debug utilities were also unowned direct database utilities. One
additional utility contained a hard-coded production database connection object
and queried production data; another performed unguarded direct account
mutations with an embedded account password.

## Repository Disposition

The following paths are retired and listed in the migration-tree prohibition
registry:

- `server/scripts/seed-prod-super-admin.ts`
- `scripts/debug_user_status.ts`
- `scripts/repro-superadmin-seed.ts`
- `server/scripts/seed_super_admin.ts`
- `scripts/check_prod_data.ts`
- `scripts/create-verified-user.ts`

They have no replacement production seed authority. Account recovery or an
emergency administrator bootstrap requires a separately approved, owned,
auditable operational procedure; it must not be a tracked executable utility.

`server/__tests__/contract.database-production-seed-security.test.ts` protects
the retirement, embedded bcrypt inputs, hard-coded production database
connection objects, and unguarded direct account mutations with embedded
passwords. It also protects the exact local/test target guards in
`server/scripts/localDemoSeed.ts`. `pnpm test:db-authority:static` runs through
an isolated one-project workspace without the normal Vitest workspace, setup
files, environment loading, or database access.

## External Security Action Required

The formerly embedded super-admin password and the exposed production database
credential must be treated as compromised. The security owner must rotate both
outside Git, invalidate active sessions or refresh tokens for the affected
super-admin account, rotate any password reuse, and record the completion in
the incident or operations system. This repository change cannot perform or
attest to either external rotation.

Git-history remediation is intentionally deferred until the security owner has
completed both rotations and assessed the full exposure surface. Historical
audit documents retain non-secret evidence of the retired utilities.
