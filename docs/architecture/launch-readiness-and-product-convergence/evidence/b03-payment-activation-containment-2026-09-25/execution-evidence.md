# B03 payment/activation containment execution evidence

Status: B03 senior gate PASS. The reviewed correction and persisted evidence
passed, the exact disposable target was governed-disposed, and the local
service shutdown/recovery/status sequence completed. B05 remains unstarted;
B07's independent final security review remains open.
This packet covers B03's shared containment correction only. It does not
independently close B07, begin B05, or change provider configuration.

## Source and worktree identity

- Feature branch: `fix/b03-payment-activation-containment`
- Task worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-b03-payment-activation-containment`
- Accepted Paid MVP candidate: `e8974ec34b919ceab37bdbd7e7379f96f3abce99`
- Senior reconciliation: `32b141270235f755cb7bb99ce269f671ef194848`
- Accepted execution plan/base commit: `5e4fe9244441e4138a836bc084c8d1e01881bc99`
- Tracked source diff SHA-256 (`git diff --binary`):
  `3e292cce43aafefb20075190bf6064b8e2c22ef1785843873f8dffe43880ea76`
- Local `main` observed before edits: `ad0c4247439a0bd27ebca17d4fba88dd023760f2`
- `origin/main` observed before edits: `4e012b3044628fc06da7489c0055e9ce01bdc8d9`
- The task worktree was created clean from the accepted candidate plus the
  reconciliation and plan commits, as required by the plan. The unrelated
  untracked `.worktrees/` entry in the original checkout was left untouched.

## Root cause and correction

The pre-fix production reproduction is preserved at
`../paid-mvp-audit-2026-09-25/productless-gate-result.json`. With the three
Paid MVP products enabled, `isCommercialActivationAvailable()` correctly
reported that commercial features were generally visible, but the mutation
guard delegated to the same generic predicate when callers omitted a product
key. Productless fallbacks in retained Agency checkout/proof/finance and
subscription lifecycle branches therefore passed in `paid_mvp_release` even
when the persisted plan had no approved product/owner binding.

`requireCommercialActivation` is now the authoritative mutation boundary. An
exact enabled product key still passes. A productless mutation passes only in
`governed_test_fixture`; in a paid release it raises `PRECONDITION_FAILED`
with a persisted-product/owner requirement. The general availability
predicate remains available for read-only visibility. No billing architecture,
schema, provider behavior, or production setting changed.

The caller obtains its key from the persisted plan and expected owner through
`getPaidMvpLaunchAccessProductKey`. The senior review found a second eligibility
gap there: malformed explicit product keys could fall back to the canonical
plan name, and malformed verified-payment or auto-renew flags could be
interpreted by permissive parsers. Eligibility now requires explicit,
well-formed and consistent product metadata; exact `paid_launch_access`,
integer 90-day duration, strict boolean `commercial_requires_verified_payment:
true`, strict boolean `commercial_auto_renews: false`, an active plan, and the
matching owner segment. Missing, malformed, or conflicting authority aliases
return no Paid MVP product. `getCommercialProductKey` also returns
`unidentified_product` when an explicit product key is malformed instead of
falling back to `plan.name`. Callers that cannot derive the exact product key
enter the productless guard and are denied in a paid release.

## Exact files and correction summary

- `server/services/commercialActivationPolicy.ts`: mutation calls now require
  an exact enabled product key in a paid release; the productless test-fixture
  exception is limited to governed fixtures.
- `server/services/commercialTerm.ts`: strict persisted Paid MVP product/owner
  eligibility and fail-closed handling for malformed or conflicting
  authority metadata.
- `server/services/billingFoundationService.ts`: corrected stale comments that
  described legacy productless branches as safe in normal runtimes.
- `server/services/__tests__/commercialActivationPolicy.test.ts`: production
  release allow/deny and productless provider-event regressions; reinitialize
  the cached policy after each environment-stubbed test.
- `server/services/__tests__/commercialTerm.test.ts`: all nine owner/product
  pairs, unsupported terms, and malformed/missing/conflicting persisted
  product, duration, payment-verification, and renewal metadata.
- `server/__tests__/commercial-launch-access-s4.integration.test.ts`: persisted
  production-mode denied-case mutation snapshots across billing and owner
  tables; invalid persisted terms; stale actor sessions; forged client product
  keys; and legitimate lifecycle cases run with the production release config.
  A mocked in-memory S3 boundary keeps proof upload isolated while the test
  still asserts the unchanged production storage guard reports safe storage.
- This evidence directory: synthetic production-config runner/output, focused
  Vitest and authority-runner output, build/typecheck/ESLint results, Database
  Authority target/service status and cleanup logs, this report, and checksums.

## Caller/product/owner matrix

| Caller or path | Required persisted owner → product | Denied cases and first prohibited effect |
| --- | --- | --- |
| Agent onboarding `POST /request-launch-access-invoice`; `billing.requestLaunchAccessInvoice`; Developer invoice alias; Agency Launch Access invoice path | Agent → `agent_launch_access`; Agency → `agency_launch_access`; Developer → `developer_launch_access` | The resolved owner's exact persisted plan is validated before subscription expiry/term updates or invoice/subscription writes. Missing, unsupported, recurring, wrong-segment and cross-owner plans fail closed. |
| `billing.startManualEftCheckout`; legacy `billing.createCheckoutSession` | Agency → `agency_launch_access` | An approved Agency plan routes to the shared fixed-term invoice flow. Recurring, unknown, missing and mismatched plans hit the productless paid-release guard before checkout billing writes. |
| `billing.submitLaunchAccessPaymentProof`; Developer proof alias; retained Agency `billing.submitPaymentProof` path | Persisted invoice owner → its diagonal product: Agent → `agent_launch_access`, Agency → `agency_launch_access`, Developer → `developer_launch_access` | The persisted invoice plan and owner must match before payment, proof-document, invoice, audit or history writes. Unsupported Agency recurring fallback is productless and denied. |
| `billing.admin.reviewManualPayment` | Persisted invoice owner → its diagonal product | Missing, recurring, unknown, unapproved fixed-term and mismatched records fail before payment/invoice state changes, entitlement activation, commercial history or notification. |
| `billing.admin.updateSubscriptionLifecycle` | Persisted subscription owner → its diagonal product | Plan/owner validation precedes subscription status, expiry/term, Agency shadow, lifecycle audit and invitation-delivery effects. |
| `billing.cancelSubscription`; `billing.reactivateSubscription` | Agency → `agency_launch_access` | The persisted subscription plan and Agency owner are checked before cancellation/restoration, shadow or history changes. |
| `activatePaidLaunchAccessForOwner` (called by finance review; also exposed only through governed test setup) | Supplied persisted owner → its diagonal product | Exact plan/owner validation precedes billable-account and subscription writes. No public route was added. |
| `recordBillingProviderEvent`, `claimBillingProviderEvent`, `completeBillingProviderEvent`, `failBillingProviderEvent` | No persisted Paid MVP product/owner binding exists | Productless guard rejects in paid release before provider-event database work. Provider behavior was not changed. |
| Catalog/status/feature visibility | Release allow-list only; no commercial owner | Read-only availability remains separate and does not authorize a mutation. |

`requireAnyPaidMvpLaunchAccessActivation` is only the bounded entry check that
allows a caller to read the persisted plan. Mutation paths then call the exact
product guard after resolving the plan and owner and before the first write.
The only other `isCommercialActivationAvailable` consumers are read/visibility
gates; no client-supplied product key becomes billing authority.

## Supported persisted product/owner matrix

All three entries require an active plan with `paid_launch_access`, a 90-day
duration, verified-payment requirement enabled, and auto-renew disabled.

| Billing owner | Only supported plan/product key | Intended commercial behavior |
| --- | --- | --- |
| Agent | `agent_launch_access` / `agent` segment | Once-off EFT invoice, proof review, finance activation, fixed 90-day access and expiry/history. |
| Agency | `agency_launch_access` / `agency` segment | Once-off EFT checkout, proof review, finance activation, cancellation/restoration and fixed-term expiry/history. |
| Developer | `developer_launch_access` / `developer` segment | Once-off EFT invoice, proof review, finance activation and fixed-term entitlement/expiry. |

Only the diagonal of the 3×3 product/owner matrix is accepted. The six denied
cross-pairs are Agent owner with Agency or Developer product; Agency owner
with Agent or Developer product; and Developer owner with Agent or Agency
product. Also denied are a missing/null plan or product key, an unknown/forged
product key, recurring or auto-renewing terms, an inactive plan, invalid
fixed-term metadata, and a wrong-segment plan. Client input is not used as
product authority.

## Automated regression evidence

- `server/services/__tests__/commercialActivationPolicy.test.ts` runs with a
  real `NODE_ENV=production`, `APP_ENV=production` paid-release configuration,
  the exact three product keys, synthetic release/approval references, sales
  unpaused, and a valid one-hour UTC sales window. It proves exact products
  pass, productless mutation fails, and all four productless provider event
  operations fail with `PRECONDITION_FAILED`.
- `server/services/__tests__/commercialTerm.test.ts` checks the 3×3 persisted
  product/owner matrix and rejects missing, unknown, recurring, auto-renewing,
  inactive and wrong-segment plans.
- `server/__tests__/commercial-launch-access-s4.integration.test.ts` adds a
  production-mode disposable-DB scenario. It creates persisted canonical
  owner/invoice/payment fixtures, mismatches every invoice and subscription
  against the other two canonical products, and covers request, proof, finance
  review, lifecycle expiry, Agency checkout, cancellation and restoration.
  It snapshots billable accounts, subscriptions, invoices, payments, payment
  documents, private proof-storage file names, Agency billing shadow, audit
  events and notifications around each rejection to prove no prohibited
  commercial write. It also sets current paid periods to expired values so
  denied paths cannot silently apply expiry.
- Its existing exact-product scenarios remain in place for all three owners,
  including duplicate/concurrent finance review, cents, paid-day renewal,
  expiry/history, overpayment and billing milestone notifications.
- `server/__tests__/commercial-launch-access-s4.contract.test.ts` and
  `server/services/__tests__/paidMvpSalesPause.test.ts` preserve the bounded
  product ladder, mounted billing contract, sales pause and existing paid
  access behavior.

Focused command:

```text
pnpm exec vitest run server/services/__tests__/commercialActivationPolicy.test.ts server/services/__tests__/commercialTerm.test.ts server/services/__tests__/paidMvpSalesPause.test.ts server/__tests__/commercial-launch-access-s4.contract.test.ts server/__tests__/commercial-launch-access-s4.integration.test.ts --reporter=basic
```

Latest result: **5 files passed, 40 tests passed, 8 skipped**. The eight
skipped cases are database-backed S4 acceptance cases, including persisted
production-mode denials, stale actors, forged client products, and supported
product lifecycle regressions. They skipped because this ordinary Vitest
process has no `DATABASE_URL`; the passing unit/contract tests are not
substituted for persisted proof. The latest captured result is in
`focused-vitest-latest.txt`. An earlier focused run remains in
`focused-vitest.txt` for provenance.

Production-mode configuration result is captured in `production-release-guard.json`
and reproduced by `production-release-guard.mts`. Its synthetic references are
test-only. The artifact includes its generation time and a one-hour valid UTC
sales window. It records `NODE_ENV=production`, `APP_ENV=production`,
`paid_mvp_release`, all three exact products available, the read-only
general-availability predicate true, exact product mutations allowed, and the
productless mutation denied with `PRECONDITION_FAILED`.

## Persisted database acceptance

The governed local procedure successfully resolved the exact task-owned
disposable target, started the approved local service, created the database
through `pnpm db:worktree:create`, applied the fresh baseline to manifest head,
and passed schema congruency plus reference and foundation preparation and
verification. The target is `listify_wt_b03_payment_activation_contain_eadd9b18ffc9`,
fingerprint `366cd1627b12901f6989118c07857d1a470bbd662dc475ad01984dc62b0e37a2`.
Migration head is `0094_content_topics_primary_key.sql`; a post-apply plan
reported no pending migrations. The exact command-by-command sanitized record,
including output digests and the stop condition, is in
`database-rerun-partial.txt`.

The first bare `pnpm db:scenario:verify` invocation exited 1 because the
governed scenario verifier requires test runtime. Under the subsequent explicit
instruction, `NODE_ENV=test APP_ENV=test pnpm db:scenario:verify` passed against
the exact target. Its scenario digest was
`a7b62da33e3f416e31728b6306c9b38d46f9b604db9d19b091c98f33ba16165b`, and it
verified three eligible properties, one eligible development, and migration
head `0094_content_topics_primary_key.sql`.

`pnpm db:readiness -- --purpose=location-discovery` then passed with
`applicationReady=true` and the same target fingerprint. Process liveness,
target ownership, migration head, schema congruency, canonical reference data,
and the scenario prerequisite were ready. Commercial foundation was not
evaluated by this location-discovery readiness purpose; its separate
foundation verification had already passed.

The first authority integration run reached the real stale-session test but
failed because the test runtime lacked `JWT_SECRET`. A fresh random,
test-process-only value was then supplied before the authority runner started;
the real session signing and validation code remained active. That run exposed
a test snapshot timing issue: a shared proof-storage snapshot was taken before
an unrelated Agent proof upload and later compared during the Agency stale
restore assertion. The snapshot baseline was moved to immediately before the
stale Agency call, retaining the global storage comparison for that operation.
No production authentication or validation code changed.

The final command
`JWT_SECRET="$(openssl rand -hex 32)" pnpm test:authority -- server/__tests__/commercial-launch-access-s4.integration.test.ts`
passed: **1 file, 9 tests passed, 0 failed, 0 skipped**, against target
fingerprint `366cd1627b12901f6989118c07857d1a470bbd662dc475ad01984dc62b0e37a2`.
The suite's persisted denial and successful lifecycle scenarios ran with the
`paid_mvp_release` commercial configuration. Sanitized output is in
`authority-integration-latest.txt`.

The initial pre-provision access failure in `authority-integration-attempt.txt`
is historical and does not establish lifecycle-admin unavailability. The
governed `db:worktree:create` command succeeded through the approved
local-owner/socket procedure. The earlier partial command-by-command record is
in `database-rerun-partial.txt`; its original stop point was followed by the
explicit test-runtime verification and acceptance runs recorded above.

After senior acceptance, the exact target was freshly resolved through
`pnpm db:authority:context`. The emitted `database-dispose` acknowledgement was
used for `pnpm db:worktree:dispose`; the command returned `changed=true` for the
matching target and fingerprint. The authority-owned service then passed
`pnpm db:authority:service:stop`, `pnpm db:authority:service:recover`, and
`pnpm db:authority:service:status`; final state is stopped at the expected
service fingerprint. Sanitized command evidence is in
`database-cleanup-latest.txt`.

## Repository checks

- `pnpm run check`: passed (`tsc -p tsconfig.check.json --noEmit`); raw output
  in `typecheck.txt`.
- `pnpm build`: passed after the strict metadata and production test-harness
  changes (50.84 seconds). Vite emitted its existing warning that some
  minified chunks exceed 500 kB; result is in `build-latest.txt`.
- Focused ESLint over the six changed TypeScript files: passed with zero errors
  and 45 warnings, mostly explicit-`any` and formatting warnings. These
  warnings do not weaken or skip tests; result is in `eslint-latest.txt`.
- `git diff --check`: passed; raw output is in `diff-check.txt` (empty on
  success).
- Production release-guard runner: passed under synthetic production-mode
  configuration; output and generation time are in
  `production-release-guard.json`.
- Commit: not created; this is a reviewable feature-branch diff.

## Boundary and residual risk

This is the shared B03/B07 containment correction. The B03 senior gate passed;
B07's independent actor/route security review is not closed here. B05 and later
blockers were not started. The exact disposable target is disposed and the
local service is stopped. No production or protected target was accessed.
