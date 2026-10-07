# Controlled founder sign-in: demonstrated blocker and bounded correction brief

Status: **complete bounded founder correction prepared locally for review; no production founder account, role grant, configuration change or deployment performed.** Current production remains the accepted PR #588 merge `b0bebc343a710f7e5713efc1d36cd5d3bca68455`. Broad feature development and paid admission remain held.

## Customer outcome and authority conflict

The founder cannot yet establish legitimate access to the owner/admin workspace. An attended, authority-controlled, read-only inspection of the approved Azure target found zero `super_admin` users and zero users matching the preserved owner binding. This finding does not classify unrelated customer accounts or authorize importing former temporary accounts.

Checklist 28 requires genuine founder OAuth admission through the preserved `OWNER_OPEN_ID`, without a seeded admin or direct database role grant. The accepted runtime contradicts that assumed entry path:

- `server/_core/index.ts` mounts `registerAuthRoutes`; it does not mount `registerOAuthRoutes`.
- `server/_core/authRoutes.ts` and `server/_core/auth.ts` implement native email/password authentication. Public registration permits customer roles, never `super_admin`.
- `client/src/const.ts:getLoginUrl` leads to `/login`; `client/src/pages/Login.tsx` has no OAuth provider entry.
- `server/_core/oauth.ts` and the Manus SDK remain source files, but their callback is not an active authentication entry. Their `openId` session payload also differs from the active `userId`/`sessionVersion` session contract.
- The preserved `OAUTH_SERVER_URL` hostname is the placeholder `your-oauth-server.com`. Presence of the binding did not prove a functioning identity provider.

Ordinary controlled Agent and Agency requests to the founder context correctly return HTTP 403. This is containment evidence, not successful founder access.

## Operator decision already supplied

Edward requests a real founder/main admin account authenticated with his permanent Google identity, independent of access to the application's domain mailbox. The exact Gmail identity is recorded privately. Existing domain email continues to carry customer communications; this decision does not authorize changing the reviewed transactional sender.

Google sign-in is a bounded correction for this demonstrated founder-access blocker. It is not permission to add general customer Google signup, recover retired Manus authentication, open payments, assign customer entitlements or create production fixtures.

The operator clarified that dependable access to the permanent Gmail mailbox motivated this choice. He conditionally accepts the recommended Google sign-in approach without adding paid Google services or moving the existing stack. He subsequently reports creating the Web application OAuth client and supplied its public client ID privately. The client secret was not collected in chat. The operator subsequently attested to the exact callback URI, empty JavaScript origins, disabled AI-agent option, External/Testing audience and the consenting founder test user. This is operator settings evidence, not independent live provider proof or source/deployment acceptance.

## Complete candidate after the operator requested full blocker preparation

The combined candidate supersedes the partial proof-only PR #589 for release review.
[The canonical founder identity plan](../../database-authority/founder-google-identity-authority-2026-10-07.md)
defines the nullable, unique authority marker on `users`, ordered migrations 0095/0096,
transactional first-account creation, collision rejection, native session binding,
password/recovery exclusions, protected role/deletion paths and the normal browser
founder entry. Proof and login remain separate opt-ins with purpose-bound state.
The identity plan records the local/CI evidence requirements and exact attended
protected schema, source, provider-proof and owner-binding gates. Local simulated
provider tests cannot establish a production Google login.

The following first-slice description records the preserved historical proof-only
scope. Its account/schema/session limitations are superseded by the combined
candidate; its provider security properties remain in force.

## First bounded correction: identity proof only (historical)

`server/_core/founderGoogleIdentity.ts`, `founderGoogleStateStore.ts` and `founderGoogleIdentityRoutes.ts` implement the first browser proof step. The routes are wired into the existing API authentication rate-limit boundary. No user model, database consumer, schema, migration, owner binding, legacy OAuth route, customer login or application-session implementation is changed by this correction.

The entry remains disabled unless `FOUNDER_GOOGLE_PROOF_ENABLED=true` and the complete operator-reviewed configuration is supplied. It requires `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `FOUNDER_GOOGLE_EMAIL` and the existing `REDIS_URL`. No binding has been applied. The secret belongs only in the reviewed server configuration, never the frontend build, repository or chat. Customer email retains its domain sender.

The server starts Google's authorization-code flow with only `openid email`, an independent random state, nonce and S256 PKCE verifier. A five-minute host-only HttpOnly browser cookie is bound to shared Redis state. Redis validates the browser digest and consumes state atomically; no in-memory hosted fallback exists. Provider exchange is bounded and does not follow redirects. Google signing keys, signature, issuer, exact client audience, optional authorized-party claim, expiry, issued-at age, nonce and verified configured founder email are checked before returning proof. State remains expired if its lifetime ends during the exchange.

Success returns only a namespaced complete SHA-256 digest of the immutable Google subject: `google:` plus 43 base64url characters, exactly 50 characters. This proposed owner-binding representation fits the canonical field without truncating the provider subject. The browser response is uncached, non-indexable and uses `Referrer-Policy: no-referrer`; it never includes the code, provider tokens, client secret or founder email. No application session or admin privilege is issued. The existing owner binding remains unchanged even when the proof succeeds.

This slice resolves the missing genuine provider proof entry. It does **not** resolve privileged account creation or establish founder readiness. The canonical account uniqueness/serialization decision below remains a separate gate before any such implementation or data write. This source correction still requires all five exact-head CI checks, independent review and explicit source acceptance before deployment. Google provider configuration alone cannot satisfy that gate.

## Proposed correction contract for senior review

1. Use Google's genuine OpenID Connect authorization-code flow with an operator-owned Web application OAuth client. Limit requested permissions to identity claims; no Gmail access, offline access or stored refresh token is needed.
2. Keep the active native session contract. Validate Google's signature, issuer, client audience, token expiry, nonce, verified email and immutable subject on the server before any account lookup, privileged write or session creation. Browser state and PKCE must bind the callback to the attended initiating browser. Missing configuration, failed transport, failed validation, expired/reused state and wrong identity fail closed.
3. Establish the exact immutable Google principal through a non-privileged identity proof first. Resolve the representation against the canonical `users.openId` contract; do not truncate identifiers or silently choose an existing row by display name or email. Record only the necessary private identity evidence, never authorization codes, ID/access tokens, reset links or credentials.
4. The existing owner binding stays unchanged until the exact verified replacement principal and configuration delta receive explicit review and operator acceptance. A Google email string, public registration role, request parameter or first-arriving user cannot confer founder authority. Do not automatically overwrite the owner binding.
5. Once that mapping is accepted, the reviewed ordinary authentication flow may establish the genuine founder principal and issue the active session. Account creation must be atomic and idempotent with canonical uniqueness or an approved serialization boundary. Audit the actual identity/index contract before choosing the implementation: the current model's email index alone is not a uniqueness guarantee. Conflicting existing identities, duplicate rows and another owner must stop the flow, not trigger automatic linking, role repair or fallback SQL.
6. Founder role establishment must happen through the reviewed identity flow. Operator SQL, seed scripts, temporary admin accounts and production fixture modes remain prohibited. Preserve session-version checks and revocation; do not mint a legacy SDK cookie or bypass current authentication.
7. Use a dedicated task-owned worktree from the frozen accepted integration base. Any runtime/query/schema change must pass the relevant authentication and Database Authority regressions, all five required exact-head CI checks, independent senior review and explicit replacement-source acceptance. Any necessary protected database release remains a separately reviewed authority operation, never startup DDL or automatic migration.

Public routes implemented in this unreleased correction, subject to review: `/api/auth/google/start` and `/api/auth/google/callback`. The proposed production Google redirect URI is `https://api.propertylistifysa.co.za/api/auth/google/callback`; it is **not deployed or a usable production login link**. The URI must match the reviewed configuration and the operator's OAuth client exactly.

Google requires a real client ID/client secret, an exact redirect URI and consent-screen configuration. Secrets must travel through the existing private operator channel, not chat or repository files. Production values must remain held until the bounded correction and configuration are reviewed. [Google's OpenID Connect contract](https://developers.google.com/identity/openid-connect/openid-connect).

## Canonical account audit before implementation (historical baseline)

This is database consumer investigation against the frozen accepted source, not a schema release. `drizzle/schema/core.ts:users` defines a nullable `openId` with length 64, an autoincrement primary key and non-unique email/role indexes. The canonical baseline agrees; the active migration sequence adds no unique `openId` constraint. Database Authority status was read in this dedicated worktree. Its derived disposable local database was unavailable; no service, database or scenario was provisioned.

The retained `server/db.ts:upsertUser` uses `onDuplicateKeyUpdate` but does not supply an existing primary key. Without an identity uniqueness constraint, repeated first-login requests do not conflict on `openId`; the helper is not proof of idempotent identity creation. `getUser` also selects the first matching identity and would conceal duplicate rows. These helpers must not be revived for the new founder path. This is a demonstrated source-level contract conflict, not evidence that production already contains duplicate founders.

Before privileged account creation, the correction must settle the exact immutable Google-principal representation, duplicate detection and a database-enforced uniqueness or independently reviewed transactional serialization contract. An in-process mutex or expiring Redis lease alone cannot establish durable account uniqueness across API replicas. Any required index or identity-table expansion belongs in a separate schema-authority workstream with canonical migration review and protected release approval. No such migration, owner binding change or privileged write has been performed.

## Required acceptance evidence (proof baseline and live gates)

Local regressions must cover forged/wrong-audience/expired Google claims, wrong nonce/state, replay, unverified/wrong email, owner-principal mismatch, account collision, concurrent first login, idempotent subsequent login, session-version enforcement and provider/Redis failures. Simulate faults locally; do not disrupt production infrastructure.

The first slice has focused local signature/claims, state/replay/expiry, concurrent callback, browser cookie/origin and dependency-failure regressions. Account collision, first-account concurrency and native session behavior are not claimed by these tests because this slice deliberately has no account or session writes. Redis adapter tests use controlled client seams; they do not establish real Redis protocol execution or live Google delivery. No Redis server binary was available locally, and no production Redis exercise, package installation or Testing mutation was attempted to conceal that limitation. Actual Google/Redis proof remains an attended post-review operation.

The attended live proof must establish Google's actual founder identity, the accepted binding, normal founder login and owner-area access; ordinary Agent/Agency/Developer accounts must remain denied. Reconfirm accepted artifact agreement, security/TLS, readiness within the unchanged 8,000-ms limit, healthy workers and sales containment before resuming dependent journeys.

## Independent recovery observation

The controlled Agency recovery request at 20:14 UTC returned the same generic HTTP 200 response as an absent address. API logs identify a successful Resend submission for the correct controlled mailbox. At 20:23 UTC the provider's last event remained `sent`; by the 20:30 UTC readback it was `delivered`. The operator had reported no inbox/spam receipt before that transition. Provider delivery establishes receiving-server acceptance; the operator subsequently confirmed actual receipt, password reset and fresh sign-in to the Agency dashboard. Independent normal API requests reject the saved, unexpired pre-reset session with HTTP 401, return an empty authentication context and reject the former password with HTTP 401. The operator then reopened the used reset link and confirmed rejection with an expired-link message. That establishes used-link replay rejection; natural expiry of an unused link remains unproven. No duplicate reset send, token extraction, configuration change or delivery-related source correction was performed. [Resend event definitions](https://resend.com/docs/webhooks/event-types).

## Remaining release gates

The joined release and unpaid Agent/Agency preparation evidence remain valid within their recorded windows. Founder access, natural reset-link expiry, genuine pre-transition cookie rejection, real private property/development/unit authoring and full tenant isolation remain incomplete. Password reset, used-link replay rejection and rejection of the saved pre-reset session have separate successful evidence; they do not establish pre-transition cookie rejection. Invitation delivery, membership acceptance/revocation, finance approval and paid owner journeys retain their ordinary commercial gates.

Keep payment intake closed, admitted owners and sales deadlines absent, automatic deployments held, TiDB writers stopped and unrelated Testing configuration/staged changes preserved. This brief cannot substitute for technical review, a Google provider configuration, a verified owner binding or a successful founder journey.
