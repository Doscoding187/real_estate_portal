# Founder Google identity: complete bounded correction

Status: local preparation for independent senior review. No protected operation,
production configuration, owner binding or deployment is authorized by this document.

The operator requested completion of the entire demonstrated founder-access blocker
before senior review. This candidate includes the non-privileged Google proof from
PR #589 and the account, native session and normal browser entry that complete its
local implementation. The integration base is
`b0bebc343a710f7e5713efc1d36cd5d3bca68455`, manifest head
`0094_content_topics_primary_key.sql`. PR #589 is a preserved partial candidate;
release the complete candidate only after its own exact-head checks and acceptance.

## Classification and target

Classification: additive schema authority with its bounded authentication consumer.
The task-owned disposable target is
`listify_wt_founder_google_identity_author_6090840f0ab1` at the approved local
MySQL service, fingerprint
`ce3f52c307ce1d9022fc7b700996acc188afe7bf29b68cb06f98c06148a36544`, credential
class `local-owner`. Local service start does not authorize any protected connection.
No production fixtures, customer entitlements or direct role grants are included.

## Canonical identity decision

The existing nullable, non-unique `users.openId` cannot serialize founder creation.
Append nullable `users.founder_authority`, whose sole non-null enum value is
`platform_founder`, with unique index `users_founder_authority_unique`. Many ordinary
users retain NULL; only one row can hold founder authority. The same row owns the
immutable Google principal, role and session version. There is no parallel identity
table, second binding write, seed, backfill or automatic account promotion.

The principal remains `google:` plus the full 43-character base64url SHA-256 digest
of the verified Google subject. It fits the canonical 64-character `openId` field.
`OWNER_OPEN_ID` must exactly match the actual independently proven principal.
Existing email/principal collisions, duplicate rows, a different founder and any
pre-existing super admin before first creation stop the flow. Later sign-in validates
the same durable row without role repair or linking. The unique non-null authority
serializes first creation across API replicas even if a missing row has no gap lock.
A competing insert or other transaction failure rolls back the entire user insertion.
There is no SQL retry, schema fallback, in-process mutex or Redis lease substitute.

Enabled founder registration reserves the reviewed mailbox. Google founder accounts
cannot use native password login, verification, reset or activation links. Native
sessions preserve `userId` and `sessionVersion`, add the verified principal and
revalidate current configuration and the durable founder row on owner requests.
A session lacking provider proof, changed binding, disabled login or revoked version
is rejected. Ordinary customer and managed-admin authentication retain their contract.
The existing administrative role-change and deletion paths protect the founder row;
identity transfer requires a separately reviewed transition.

## Migration contract

`0095_user_founder_authority.sql` appends the nullable column in one ALTER statement.
`0096_user_founder_authority_unique.sql` adds its unique index in one CREATE INDEX
statement. Their manifest entries follow the unchanged 0094 checksum. The immutable
baseline, preceding migrations and existing column ordinals remain unchanged.
Generated inventory, canonical Drizzle model and migration classification must agree.
The preservation regression removes only the new column/index and checks the exact
previous desired-schema digest.

Existing reviewed API and worker permissions apply to `users`. This additive
column/index changes no table privilege inventory; do not reprovision identities or
reapply secret bindings. Old source continues using its existing explicit projections.
The new source expects manifest head 0096 and must not bypass canonical readiness
while the protected schema release remains pending.

## Local proof and review requirements

Run canonical local migration planning/application and physical congruency on the
exact owned target. Exercise real SQL account creation, independent concurrent first
sign-ins, different competing configurations, identity collisions and transaction
rollback. The HTTP integration uses a locally signed simulated Google provider with
real canonical SQL, native cookies and the normal protected owner procedure. It
also proves ordinary Agent/Agency/Developer denial and session-version revocation.
The test must run before canonical reviewer fixtures; it must never delete or demote
a reviewer to make the empty-founder precondition pass. Required CI contains this
unseeded physical test before scenario preparation, and excludes its second execution
after the canonical reviewer exists.

Provider signature/claims, purpose-separated state, expiry/replay, Redis failure,
account configuration, native authentication and browser availability regressions
remain required. Simulated Google and Redis seams establish local control behavior;
they do not claim an actual Google callback or production founder admission.
All five required checks apply to the complete exact head. Independent senior review
and explicit replacement-source acceptance remain required before merge/deployment.

## Observed local checkpoint, 7 October 2026

The canonical fresh migration applied all 97 manifest entries exactly once on the
owned disposable target, ending at 0096. Plan digest:
`91010b7e97cec1ddc0c034978bca77a94c58c1753d2da8956b089c82aca9b3d1`.
Physical and desired schema digests both equal
`0a805c57c0b0498a061106ebdeb2da45c2cc82806385096290617e7bdf4874d1`;
there were no differences, and all 23 CHECK constraints remained enforced.

All ten physical founder tests passed against that target. The simulated signed
provider callback issued the native session, the owner procedure accepted it,
ordinary Agent/Agency/Developer sessions were denied and revocation invalidated
the old session. Competing configurations created exactly one founder; transaction
failure left no account. These are disposable local observations, not live Google
or production customer outcomes.

The complete local authority gate passed 449 tests, utility classification, schema
sanity, deterministic inventory and lifecycle checks. Provider/account/session
regressions passed 117 tests, existing managed-role tests passed five, and the founder
entry plus retained registration audience checks passed 14. The canonical
`pnpm check` type-check passed. Exact-head CI and independent review remain release
gates; the separately stored review packet records their final status.

## Attended protected continuation after review

1. Freeze the accepted source, verify the identical-tree merge, and refresh attendance,
   backend readiness and containment. Keep automatic deployments held and TiDB writers
   stopped. Payment intake remains closed; admission/deadline settings remain absent.
2. Obtain a canonical read-only protected release plan for the approved Azure target.
   Review fingerprint, old head 0094, ordered pending 0095/0096, expected head 0096,
   durable attempt state and plan digest. Apply only through the separately approved,
   exact acknowledged protected release path using the ephemeral migration credential.
   Verify the new head and physical congruency independently. Never use startup DDL,
   provider SQL, ledger edits, fixtures or runtime credentials for migration.
3. Review the actual Google Web client settings and bounded API-only configuration.
   Preserve existing reviewed values. Add `FOUNDER_GOOGLE_PROOF_ENABLED=true`,
   `GOOGLE_OAUTH_CLIENT_ID`, privately supplied `GOOGLE_OAUTH_CLIENT_SECRET`, exact
   `GOOGLE_OAUTH_REDIRECT_URI` and `FOUNDER_GOOGLE_EMAIL`; keep
   `FOUNDER_GOOGLE_LOGIN_ENABLED` absent/false and the owner binding unchanged.
   Existing `REDIS_URL` is reused. No secrets enter chat, Git or frontend build values.
4. Deploy only the frozen accepted release through the reviewed API/worker/frontend
   sequence. Re-establish exact artifact agreement, security/TLS, official joined
   probe and sustained readiness within the unchanged 8,000-ms limit.
5. Attend the normal `/api/auth/google/start` proof flow with the permanent Google
   identity. Success issues no account/session in proof mode. Preserve only the
   necessary principal evidence, never callback codes, tokens or browser cookies.
6. Review and explicitly accept replacement of `OWNER_OPEN_ID` with that exact proven
   principal and the separate `FOUNDER_GOOGLE_LOGIN_ENABLED=true` configuration delta.
   Refresh attendance and readiness before applying that accepted delta. A Google
   email string, first request, client ID or code merge does not authorize this binding.
7. Use the normal browser founder sign-in. Confirm one durable founder account, owner
   area access, ordinary customer denial, repeat login, logout/revocation and closed
   intake. Return expected versus actual outcomes for the next checkpoint.

The Google Web client uses the exact callback
`https://api.propertylistifysa.co.za/api/auth/google/callback`, no JavaScript origins,
External/Testing with the consenting founder test user, and the AI-agent option off.
These are operator-attested settings; actual live proof remains a post-review gate.
The existing domain sender, Azure/Redis/storage and separate runtime credentials are
preserved. No paid Google services or infrastructure migration is required by this work.
