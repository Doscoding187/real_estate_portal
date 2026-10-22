# B04 / B07 Candidate Security Review Evidence

**Disposition requested:** return this candidate for senior acceptance. B04 and B07
verification on the composed candidate is complete. No B16 integration, merge,
deployment, or production activation was performed.

**Evidence updated:** 2026-09-27, with a focused, governed rerun of the mounted
role/session audit suite after the last-super-admin test review.

## Source and target identity

| Identity | Value |
| --- | --- |
| Task branch | `verify/b04-b07-security-matrix-b5a347` |
| Task worktree | `/home/edwardspc/Desktop/Dev/worktrees/property-listify-b04-b07-security-matrix-b5a347` |
| Worktree HEAD | `f3f99f806ea9ae6be3132e093ce1cf1a6f185a32` |
| HEAD parent | `5e4fe9244441e4138a836bc084c8d1e01881bc99` |
| HEAD tree | `b5a3475633ea330469507551574c7e61a73b0900` — the reviewed B03/B05/B06 composition |
| Current candidate implementation tree | `2600386978a46b29f371c230f05511c81be2465f` — accepted composition plus the seven current B04/B07 source files; excludes this evidence directory |
| Current seven-file source diff SHA-256 | `aeea344252f553d0f05babe0958f2d1a441acfc6e97c05dcbfab7c7b088a672c` — `git diff --binary HEAD --` over the seven source files |
| Current role/session test SHA-256 | `6b69d0beb855f700e2d0e79bad30927673c67d256842279cb871c11c066f4c28` |
| Prior pre-amendment implementation tree | `b39b7474142ea94296cabc2bc4febc9446b72351` — historical identity for the earlier six-file run |
| Prior six-file B04/B07 verification diff SHA-256 | `04af5b71791155f3dd9615caf8b1a18caf3857639b80257921d5493492b699ab` — historical source only |
| B03 accepted six-file diff SHA-256 | `3e292cce43aafefb20075190bf6064b8e2c22ef1785843873f8dffe43880ea76` |
| B05 accepted test diff SHA-256 | `1e210e5e348576d82663136a2fa2f215f9def31a1fe364dcddf6298072bfd754` |
| Accepted combined eight-file diff SHA-256 | `926086a2e3cf68e9edc1c3d0969717352af6feb42c0d5c91f01c5970b129a711` |
| Accepted B06 spec SHA-256 | `2ce67a21dc05c0bcb9cae67ea8001dbe7a594c71cc48d92f06db57dfb17944d7` |
| Runtime/toolchain | Node `22.22.3`; pnpm `10.4.1`; `pnpm-lock.yaml` SHA-256 `a565f7331ef0a76881c135ad39c965b99b0bd75827b3edea3b7fd70eb822b9f1` |

The accepted B03/B05 diff identities were recomputed from the accepted base and match
the accepted values. The composed base tree is exactly `b5a347…`; ancestry alone is
not being used as proof. The current source has seven working changes:

- `server/services/commercialActivationPolicy.ts` and
  `server/services/__tests__/commercialActivationPolicy.test.ts`: require an explicit
  exact product selector before a governed browser fixture can enable commercial
  availability; cover email-capture-only preparation mode.
- `server/_core/securityRuntimeConfiguration.test.ts`: cover production rejection of
  the browser fixture, product selector, scenario fixture, and B04/B05/B06 email-capture
  selectors.
- `playwright.b04-independent-agent.config.ts` and
  `e2e/b04/independent-agent-paid-mvp.spec.ts`: scope the runtime to Agent Launch Access,
  raise the journey timeout to four minutes, and assert public property ID differs from
  source listing ID.
- `e2e/prepayment/agent-onboarding.spec.ts`: declare the configured private runtime-log
  path, wait for the profile-save API response before navigation, and assert canonical
  Sandton coverage persisted.
- `server/__tests__/integration.b07-role-session-audit.test.ts`: exercise each mounted
  role endpoint with an asserted sole-admin precondition, preserve the separate
  multiple-admin success case, and verify unchanged role/session version and no audit
  event for each rejected last-admin change.

No schema, migration, billing, entitlement, publication, or enquiry product code changed
in this verification pass.

## Database Authority and cleanup

Dependencies were installed with `pnpm install --frozen-lockfile`. Database Authority
provisioned and owned this disposable MySQL target:

| Target field | Value |
| --- | --- |
| Database | `listify_wt_b04_b07_security_matrix_b5a347_843c043861ee` |
| Fingerprint SHA-256 | `9db48aa2c8f2962e9fa34c579157f92f8ab6816ecec6a8035dd3fb715f4f11fd` |
| Worktree ownership key | `843c043861ee049d73764e0f` |
| Local service fingerprint | `2425e54d0472ee5b308127a7c63380733f077ec7531767d6dba21a2c2a9177f2` |
| Migration head | `0094_content_topics_primary_key.sql` |
| Manifest digest | `93d871e6f8760477f460b8821685d71d212374eb86ddd53bc6e2ccfc30608efc` |
| Physical schema digest | `a8ca8cf34bb3627594eab1b722b85115c6460225a0165db7992228a8547798e9` |
| Canonical geography | `canonical-geography-v2`, `6c3fb68b54fd0db64ea7a67a4b30383a3d6c610babf3e1de1aa531f54827093c`; 9 provinces, 340 cities, 1,089 suburbs |
| Search-to-lead scenario | `search-to-lead-v5`, `a7b62da33e3f416e31728b6306c9b38d46f9b604db9d19b091c98f33ba16165b`; 3 properties, 1 development, Gauteng / Johannesburg / Sandton |

Pre-disposal `pnpm db:authority:status` reported an exact worktree-owned, connected
target at manifest head, no incomplete migration attempts, and schema congruency.
`NODE_ENV=test APP_ENV=test pnpm db:scenario:verify` passed and
`pnpm db:readiness -- --purpose=location-discovery` returned `applicationReady=true`.

After all verification, `pnpm db:worktree:ack` returned the exact acknowledgement
`CONFIRM_DATABASE_DISPOSE_9db48aa2c8f2962e`; then
`pnpm db:worktree:dispose -- --ack=CONFIRM_DATABASE_DISPOSE_9db48aa2c8f2962e` returned
`changed=true` for the same target and ownership key. The approved local service stop
completed via `pnpm db:authority:service:stop`; the subsequent service status was
`stopped` with the same service fingerprint. No protected/shared database was used.

The browser runs used local MySQL, in-memory Redis, a local email-capture transport, and
the worktree-namespaced local media adapter. Private email captures, runtime logs,
Playwright reports/results, local billing-proof fixtures, and the worktree media
namespace were removed after recording sanitized results. The worktree `.env.local`
remains a symlink to the mode-protected central local environment; its contents and all
test credentials/tokens are omitted here.

### Focused role/session rerun and cleanup (2026-09-27)

The earlier full-matrix target above had already been disposed and its local service
stopped. For the last-super-admin follow-up, Database Authority recreated the same
worktree-derived disposable identity: database
`listify_wt_b04_b07_security_matrix_b5a347_843c043861ee`, fingerprint
`9db48aa2c8f2962e9fa34c579157f92f8ab6816ecec6a8035dd3fb715f4f11fd`, ownership key
`843c043861ee049d73764e0f`. The migration plan began at an empty ledger and applied the
canonical manifest through `0094_content_topics_primary_key.sql` (plan ID
`eccda9275fb6c6337b04201e`; digest
`eccda9275fb6c6337b04201e7979e3ed3b7a520ccf525f4b929343237e75bc9a`). Schema
congruency passed with desired and actual digest
`a8ca8cf34bb3627594eab1b722b85115c6460225a0165db7992228a8547798e9`.

This focused role-only target did not prepare reviewer, foundation, or Search-to-Lead
scenario data. It began without seeded administrator accounts; test-owned fixtures
supplied the sole-admin subject and the separate multi-admin success case. No unrelated
fixture administrator was removed, demoted, or changed. Database Authority status showed
the target as not-ready because canonical foundation data was not prepared; the
location-discovery readiness command was not run for this schema-only test target. The
authority test wrapper confirmed the same target fingerprint. The suite passed 1 file / 5 tests in
6.40 seconds, after which the exact target was disposed with the emitted Database
Authority acknowledgement. The local MySQL service was stopped and status confirmed
`stopped`; recovery was a clean no-op. Per-case sanitized output is in
`role-session-audit-cases.json`.

## B04 journey and regressions

| Check | Result |
| --- | --- |
| B04 joined browser journey | **PASS — 2/2**; paid Agent value loop and same-browser private-draft isolation. |
| B04 focused server regressions | **PASS — 7 files / 23 tests**. |
| B04 client/component regressions | **PASS — 9 files / 38 tests**. |
| Preparation-only/browser fixture containment | **PASS — 10/10 browser tests**; public Agent, Agency, and Developer entry points stay non-activated; real Agent registration/verification persists canonical Sandton coverage before routing onward. |
| Dedicated B05 Agency compatibility journey | **PASS — 1 joined browser journey**; verifies paid Agency, member, publication, enquiry, revocation, and history behavior with the exact Agency selector. Supporting compatibility evidence only; B05 remains closed. |
| Adjacent PLE smoke | **1 failed / 9 not run**, with the single pre-registration expectation mismatch described under “Observed harness limitation.” No PLE/B05 spec or product code was changed. |

```sh
pnpm test:browser:authority -- --config=playwright.prepayment-onboarding.config.ts
pnpm test:browser:authority -- --config=playwright.b05-agency-paid-mvp.config.ts
pnpm test:browser:authority -- --config=playwright.ple-agency-operating.config.ts
```

Results in order: preparation-only 10/10 passed; B05 Agency paid compatibility 1/1
passed; adjacent PLE 1 failed and 9 were not run.

The B04 browser journey proves registration, verification, profile setup and approval,
Agent-owned paid invoice/proof/finance activation, sale and rental authoring, upload and
attachment of real test media, moderation, public discovery/detail, buyer enquiry and
replay, Agent custody/follow-up/history, expiry behavior, and same-browser account
isolation. The focused authority files cover Agent journey, lead transitions, profile
reconsideration, publication readiness, tenant-bound media reservation/confirmation,
media reconciliation, and paid Launch Access consumers.

### B04 commands and counts

```sh
pnpm test:browser:authority -- --config=playwright.b04-independent-agent.config.ts
```

Result: 2 passed; full joined journey 2.5 minutes, private-draft isolation 31.4 seconds.

```sh
pnpm vitest run --config vitest.client.config.ts \
  client/src/lib/agentJourney.test.ts \
  client/src/lib/agentListingActionIds.test.ts \
  client/src/components/dashboard/EntityStatusCard.agentIds.test.tsx \
  client/src/hooks/__tests__/useListingWizard.ownerIsolation.test.ts \
  client/src/pages/agent/AgentPackageSelection.test.tsx \
  client/src/pages/advertise/AgentProductLandingPage.commercialTruth.test.tsx \
  client/src/components/agent/AgentSetupWizard.test.tsx \
  client/src/pages/admin/AgentApprovals.reconsideration.test.tsx \
  client/src/components/agent/AgentStatusStrip.test.tsx --reporter=basic
```

Result: 9 files, 38 tests passed.

```sh
JWT_SECRET=<ephemeral test-only value redacted> pnpm test:authority -- \
  --no-file-parallelism \
  server/__tests__/integration.agent-launch-journey.test.ts \
  server/__tests__/integration.agent-lead-transitions.test.ts \
  server/__tests__/integration.agent-profile-reconsideration.test.ts \
  server/__tests__/integration.listing-publication-readiness.test.ts \
  server/__tests__/integration.listing-media-tenant-boundary.test.ts \
  server/__tests__/integration.listing-media-reconciliation.test.ts \
  server/__tests__/commercial-launch-access-s4.integration.test.ts
```

Result: 7 files, 23 tests passed. Database-backed tests were serialized to avoid
concurrent fixture lock contention. The JWT value was synthetic and was not retained.

The first preparation-only journey attempt exposed a test race: the browser navigated
away after clicking “Save & Continue” without waiting for its profile mutation. The
coverage row was consequently still empty when the next route was opened. The test now
waits for that POST response and confirms the canonical coverage row before navigation.
With the test correction and no product-code change, the focused journey passed 1/1 and
the complete preparation-only suite passed 10/10. A separate test-only `runtimeLog`
reference error was also corrected using the path already defined by its Playwright
configuration.

## B07 direct API security matrix

The original 11-file matrix command ran serially through Database Authority on
2026-09-26 with a synthetic test-only `JWT_SECRET` (the literal is redacted):

```sh
JWT_SECRET=<ephemeral test-only value redacted> pnpm test:authority -- \
  --no-file-parallelism \
  server/__tests__/integration.b07-role-session-audit.test.ts \
  server/__tests__/commercial-launch-access-s4.integration.test.ts \
  server/__tests__/integration.agency-membership-authority.test.ts \
  server/__tests__/integration.agency-member-workspace-authority.test.ts \
  server/__tests__/integration.agent-lead-transitions.test.ts \
  server/__tests__/integration.listing-media-tenant-boundary.test.ts \
  server/__tests__/integration.developer-actor-resolution.test.ts \
  server/__tests__/integration.developer-lead-assignment-authority.test.ts \
  server/__tests__/integration.developer-media-authority.test.ts \
  server/__tests__/integration.development-publication-lifecycle.test.ts \
  server/__tests__/contract.property-search-detail-lead-ownership.test.ts
```

Result: **11 files, 99 tests passed** for that source and target. The current role
session test was rerun separately on 2026-09-27 (1 file / 5 tests passed); the other ten
matrix files were not rerun in this follow-up. The matrix acceptance mapping is:

| Boundary | Verification | Result |
| --- | --- | --- |
| Buyer / public user | Public search, property detail DTO minimization, canonical owner resolution for enquiry, replay, and private/non-public detail denial; the direct-router property search/detail/lead contract has 15 tests. B04/B05 browser buyer contexts independently submit real public enquiries. | PASS |
| Agency member | Queued invitation does not grant membership before an active Agency term; canonical membership, workspace inheritance, and no individual member billing; 32 membership tests plus 1 workspace test and B05 browser acceptance. | PASS |
| Owner | Agent, Agency, and Developer billing owners can request/submit for their own product; unrelated owners cannot submit/read another owner’s proof or mutate owned inventory/media. Paid Launch Access owner-isolation integration is part of the 99-test set; the billing proof API adds 2 persisted integration tests. | PASS |
| Administrator | Mounted role endpoints restrict changes to super admins; role mutations are atomic with audit entries and sessionVersion increments, old sessions are rejected, and last-super-admin removal is denied. The current focused role/session file has 5 passing tests, including one exact-one-admin rejection case for each mounted endpoint and a separate multiple-admin success case. Developer publication lifecycle additionally exercises privileged review and self-review denial. | PASS |
| Cross-owner/cross-organisation access and mutation | Agent lead custody, listing media reservation, Developer assignment and unit/media scopes deny unrelated, suspended, Agency, and cross-Developer actors; ownership changes/deletion invalidate prior media confirmation authority. | PASS |
| Stale/revoked sessions | B07 role changes invalidate old session tokens; commercial mutations reject stale sessions before invoice, approval, and restore writes. | PASS |
| Private payment proof | Owner and finance-admin proof retrieval works; unrelated Agency access is denied. Hosted proof storage fails closed when it would reuse public media credentials or bucket. Billing integration: 2 tests; storage contract: 2 tests. | PASS |
| Signed media ownership/expiry | Listing media tenant-boundary: 3 integration tests; Developer media reserve/upload/confirm, foreign unit scope, missing receipt, and expired receipt: 3 integration tests. | PASS |
| Unsupported/deferred paid routes and forged product input | Commercial integration rejects unsupported persisted product/owner pairs before writes, including missing, unknown, recurring, malformed and forged product metadata. Commercial term and activation policy reject malformed/unsupported state; preparation browser suite checks legacy/deferred routes remain gated. | PASS |
| Missing/expired sales window and pause | `paidMvpSalesPause` verifies absent window fails closed, elapsed UTC deadline pauses sales, malformed/overlong dates reject, and active paid availability survives pause. Commercial integration verifies existing access remains while new invoices and finance activation are blocked. | PASS |
| Production fixture/capture selectors | Production security configuration rejects browser fixture, browser product selector, scenario fixture, and B04/B05/B06 email-capture selectors. | PASS |
| Publication/enquiry/history after entitlement transitions | Development publication lifecycle (22 tests) includes expiry removing public eligibility without deleting the approved development; B04/B05 browser journeys preserve previously accepted enquiry/follow-up history across term expiry/revocation. | PASS |

Additional direct proof and policy results:

```sh
JWT_SECRET=<ephemeral test-only value redacted> pnpm test:authority -- \
  --no-file-parallelism server/__tests__/billing.foundation.acceptance.integration.test.ts
```

Result: 1 file, 2 tests passed.

```sh
pnpm vitest run --config vitest.server.config.ts \
  server/services/__tests__/commercialTerm.test.ts \
  server/services/__tests__/paidMvpSalesPause.test.ts \
  server/services/__tests__/commercialActivationPolicy.test.ts \
  server/_core/securityRuntimeConfiguration.test.ts \
  server/services/__tests__/billingProofStorage.hosted.test.ts \
  server/__tests__/commercial-launch-access-s4.contract.test.ts --reporter=basic
```

Result: 6 files, 55 tests passed. This includes the B03 containment correction and the
new email-only fixture regression.

### Focused last-super-admin follow-up

```sh
pnpm test:authority -- --no-file-parallelism \
  server/__tests__/integration.b07-role-session-audit.test.ts --reporter=verbose
```

Result: **1 file, 5 tests passed** against the recreated, worktree-owned disposable
target. Two independent test cases asserted that the canonical count was exactly one
immediately before calling `user.updateRole` and `admin.updateUserRole`. Each endpoint
returned `PRECONDITION_FAILED`; the sole subject remained `super_admin` at
`sessionVersion: 10`, the canonical count stayed one, and the subject had zero audit
events before and after. The separate success case asserted more than one super admin
before a mounted admin-route demotion and confirmed that the acting super admin remained.
The other route authorization and atomic-audit rollback cases passed. Sanitized case
details and the exact source/target identity are recorded in
`role-session-audit-cases.json`.

## Observed harness limitation

The adjacent PLE command
`pnpm test:browser:authority -- --config=playwright.ple-agency-operating.config.ts`
stopped at its first assertion: its config enables the exact
`agency_launch_access` product selector, while the first PLE test expects the public
Agency landing page to say “Preparation-only onboarding.” The observed page correctly
showed `R999 once-off` under that selector. This occurred before registration or any
journey write in the spec; the remaining nine cases did not run. The PLE test/config is outside
B04/B07 verification scope and was left unchanged. The dedicated B05 Agency paid flow
with the same exact selector passed end to end. Senior review should decide whether a
separate PLE test/config correction is required. This failed/not-run PLE disposition is
carried forward from 2026-09-26; it was not rerun in the focused role test and remains a
separate follow-up for B16. It does not invalidate the passing B04 refresh or dedicated
B05 journey.

The historical Gauteng-selection failure from the earlier B06 run remains unattributed,
as recorded by B06 senior acceptance. This candidate’s B04 browser flow passed; local
checks do not establish hosted-provider readiness.

## Final checks and limits

| Check | Result |
| --- | --- |
| `pnpm check` | PASS |
| `pnpm lint:check` | 0 errors; 13,409 repository warnings |
| `pnpm build` | PASS; Vite retained its large-chunk advisory |
| `git diff --check` | PASS before evidence creation; rerun for this packet below |
| Database Authority disposal | PASS; exact target removed, local service stopped |

Commands: `pnpm check`; `pnpm lint:check`; `pnpm build`; `git diff --check`.

Local email and media substitutes do not test hosted mail delivery, S3/object policy,
hosted ingress/proxy behavior, or outage recovery. Those remain B10/B11/B12/B18 concerns;
hosted ingress/proxy/outage obligations remain B12/B18. This packet makes no production
readiness claim and does not advance B16.

## Sanitization

No emails, passwords, session cookies, payment-proof bytes, media objects, verification
tokens, invitation tokens, or raw runtime logs are included. Browser HTML/reports,
captures, temporary private proofs, and local media created for this run were removed.
`SHA256SUMS` covers this report and its machine-readable result summary.
