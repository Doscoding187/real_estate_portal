# B06 Developer paid MVP revalidation

Status: current B06 evidence returned for senior review; B06 remains review-pending. This addendum applies only to the candidate below. The earlier `1b937bb6` run and its worktree/evidence remain historical and untouched.

## Source and target identity

| Item | Identity |
| --- | --- |
| Accepted source candidate | `5e4fe9244441e4138a836bc084c8d1e01881bc99` |
| Source candidate tree | `b664ab9c1c6bb59fe68e6a476603aab792ca30c` |
| B03 accepted corrections in ancestry | `b80d917ea3b790ae25651ffbe30752bc88d8e107`; `f4839b0ae8f9fad043da2bb4fbb6754662c8778f` |
| B05 accepted correction identities in ancestry | direct harness/invitation correction `4a5f985a214c629c027c12c6cc1fb30702d310ab`; accepted reviewed candidate `e8974ec34b919ceab37bdbd7e7379f96f3abce99` |
| Historical B05 baseline (not the accepted correction) | `e8b813917268d9a707ecb31e8261be5a585c8c18` |
| Tested B06 overlay | The accepted base above plus the sole changed source path, `e2e/b06/developer-paid-mvp.spec.ts` (exact tested file SHA-256 in `SHA256SUMS`) |
| Task branch / worktree | `feat/b06-developer-paid-mvp-5e4fe924` / `/home/edwardspc/Desktop/Dev/worktrees/property-listify-b06-developer-paid-mvp-5e4fe924` |
| Database | `listify_wt_b06_developer_paid_mvp_5e4fe92_31389aa66242` (disposable-worktree) |
| Database ownership key | `31389aa662427b0cec274291` |
| Target fingerprint | `d701185fb52f05494fd8784627d6af73f706a2b4f92e9432cd8c344ea5ed6147` |
| Local Database Authority service fingerprint | `2425e54d0472ee5b308127a7c63380733f077ec7531767d6dba21a2c2a9177f2` |
| Manifest head | `0094_content_topics_primary_key.sql`, manifest SHA-256 `0645a178f556e24fa170d41b07a8ac73cff4e9404beedf1660a2bf54e72b4124` |

The accepted candidate was checked for the named B03/B05 ancestors and relevant correction paths before target provisioning. The candidate also contains the accepted 0094 manifest head. The distinct B05 profile-setup issue was not reopened and is not attributed to `e8974ec`.

## Controlled setup

The dedicated worktree was clean at candidate creation. `pnpm install --frozen-lockfile` completed with pnpm 10.4.1 and Node v22.22.3; `pnpm-lock.yaml` SHA-256 is recorded in `SHA256SUMS`. Database Authority status and the documented worktree lifecycle created and verified this exact disposable target. Every database operation used this local loopback disposable target; no protected or remote target was accessed. Migration plan digest: `d83ff60843aa77dcc4e0c109df01fa2b256561b114e03c76339de05bfeb0520f`; the target advanced from no prior application head through 95 migrations to the expected 0094 head. Schema congruency passed 23/23 checks (digest `a8ca8cf34bb3627594eab1b722b85115c6460225a0165db7992228a8547798e9`).

Canonical reference verification passed for `canonical-geography-v2` (digest `6c3fb68b54fd0db64ea7a67a4b30383a3d6c610babf3e1de1aa531f54827093c`): 9 provinces, 340 cities, 1,089 suburbs. Launch foundation verification passed for `canonical-launch-foundation-v1` (digest `aaac24d45d655d2702348aa948ff53742358d9c6af95f8dfcbf7da3ab758a780`), including 90-day Developer Launch Access and the canonical price. Search-to-lead scenario verification passed for `search-to-lead-v5` (digest `a7b62da33e3f416e31728b6306c9b38d46f9b604db9d19b091c98f33ba16165b`): three eligible properties and one eligible development. Post-regression scenario verification remained unchanged. Post-regression `readiness --purpose=search-to-lead` passed with `applicationReady=true`, matching target/head and no incomplete migration attempts.

The required reviewer fixture was prepared and verified on this target: distinct local `ple-reviewer@listify.local` (fixture ID 990100), privileged reviewer with verified email and no agency association, Developer profile, subscription, or entitlement. Local verification mail capture used the private mode-0600 capture file; no hosted mail provider was used. Listing media used the worktree-owned local filesystem adapter under `/home/edwardspc/.local/share/property-listify/media/worktree-b05e92df5103f16b`; the namespace hash matches the current worktree path. It contained 50 PNG media objects and 50 JSON sidecars, all mode 0600 and owner uid 1000, under mode-0700 directories. No hosted media bucket/provider was used. The local private EFT-proof store `.private/billing-proofs` contained two 70-byte PNG proof objects, one per browser run, under `developer/990003` and `developer/990004`; both files were mode 0600 and their directories mode 0700, owner uid 1000. The two proof objects were removed after verification, along with their empty run-owned directories. After verification, cleanup also removed all 100 objects/sidecars in this exact worktree namespace; the namespace is now absent and its shared media base remains. Redis used the documented in-memory fallback. The approved database was local MySQL. No hosted payment gateway was involved in the controlled invoice/finance-review path. Raw email captures, HTML, traces, and unredacted runtime logs were held privately through evidence generation and removed after the sanitized reports were checksummed; none are included in this packet.

A shell-level `cross-env` attempt failed before the authority CLI because that executable was not on the shell PATH; the supported `NODE_ENV=test APP_ENV=test pnpm db:scenario:verify` then passed. An extra `--` on the initial environment-status invocation was rejected by the CLI argument parser; the documented invocation passed. Neither was a database attempt or target failure. The worktree environment link was created only after confirming the ignored path was absent, using the repository `ensureWorktreeLink` helper.

## Gauteng diagnosis and complete browser journey

The original Gauteng crash/timeout was not reproduced on this candidate. Both browser runs passed the organisation setup Gauteng selection and the development-location Gauteng selection, including both exact Gauteng option clicks. The final report contains every nested Playwright step with title, outcome, start time, source location, and duration. All 370 nested steps passed. No page error, console error, failed request, or HTTP error was recorded during either Gauteng selection step. The canonical geography fixture was verified, and the current Desktop Chrome runtime completed both selections. The evidence does not establish the cause of the earlier report; no historical fixture or browser cause is inferred, and no product defect was demonstrated or fixed.

The exact command was run twice:

```text
pnpm test:browser:authority -- --config=playwright.b06-developer-paid-mvp.config.ts
```

- Initial reproduction: exit 0, 1/1 Desktop Chrome test passed (`1 passed (2.2m)`); diagnostics were 0 uncaught page errors, 7 console errors, 15 failed requests, and 3 HTTP responses >=400, none during either Gauteng step. Full sanitized nested report is `browser-initial-report.sanitized.json`.
- Current pass after the narrow sanitizer correction: exit 0, 1/1 Desktop Chrome test passed (`1 passed (1.4m)`); full sanitized nested report is `browser-final-report.sanitized.json`.
- Runtime: Chrome `145.0.7632.6`, Node `v22.22.3`, Linux.
- Current pass diagnostics: 0 uncaught page errors; 6 console errors; 8 failed requests; 3 HTTP responses >=400; no 5xx; none during either Gauteng step.

The 17 current diagnostic events are all represented in the sanitized JSON. Their safe classification is:

| # | Event and step | Classification |
| --- | --- | --- |
| 1 | Owner, registration: GET `/login`, `ERR_ABORTED` | Navigation cancellation during initial route transition. |
| 2 | Owner, registration: POST `/api/auth/login`, 401 | Expected pre-verification login denial. |
| 3 | Owner, registration: console resource 401 | Console echo of event 2. |
| 4 | Owner, registration: API console error | Same expected unverified-email denial; email and code redacted. |
| 5 | Owner, organisation setup: console resource 404 | Expected absent Developer profile before first setup. |
| 6 | Owner, organisation setup: GET `/api/trpc/developer.getProfile`, 404 | Expected profile-not-found before creation. |
| 7 | Owner, organisation setup: API console stack | Same expected profile-not-found; request ID and local worktree path redacted. |
| 8 | Owner, access workspace: GET subscription/workspace requests, `ERR_ABORTED` | Route/context transition cancellation. |
| 9 | Owner, development authoring: GET `/api/trpc/developer.getDraft`, `ERR_ABORTED` | Browser reports canceled request. |
| 10 | Owner, development authoring: `developer.getDraft` console network error | Correlated with event 9's `ERR_ABORTED`; no returned API response or required-step failure. |
| 11 | Public buyer: GET `/maps/api/staticmap`, `ERR_BLOCKED_BY_ORB` | External map image request blocked by browser; journey continued and discovery/enquiry passed. |
| 12 | Owner, lead operations: GET lead/funnel/home requests, `ERR_ABORTED` | Route/context transition cancellation. |
| 13 | Public before expiry: GET `/maps/api/js`, `ERR_ABORTED` | External map script cancellation during navigation. |
| 14 | Public after expiry: GET `/maps/api/js`, `ERR_ABORTED` | External map script cancellation during navigation. |
| 15 | Public after expiry: GET font asset, `ERR_ABORTED` | Asset request canceled during page teardown. |
| 16 | Owner, expired-term publication retry: POST `developer.publishDevelopment`, 403 | Expected denial after the app unpublishes the development following expiry-only checks. |
| 17 | Owner, expiry: console resource 403 | Console echo of event 16. |

The full flow passed: registration and email verification; one pending Developer organisation and publisher; separate reviewer approval without paid access; organisation-owned Launch Access invoice and access; finance proof held pending a distinct finance approval; development, unit and confirmed-media authoring; independent moderation; public discovery and enquiry; same-organisation lead assignment, contact, notes, scheduling, and retained history.

## Expiry acceptance

The expiry sequence preserves publication through the expiry action. Immediately before expiry, the development is approved, `isPublished=1`, and publicly discoverable. The exact run-owned Developer term is then moved past due. Immediately afterward, the subscription term is expired while the development remains approved and `isPublished=1`. While it is still published, fresh public search excludes it, direct public detail is unavailable, and a fresh enquiry is rejected. Only after those expiry-only checks does the browser unpublish through the application and assert success; a fresh publication retry then returns 403 for the expired term. The test confirms organisation, membership, publisher, development, inventory, lead, and activity history remain. This tests expiry-driven loss of effective public eligibility/discovery while stored publication intent remains true, consistent with the canonical lifecycle contract; it does not unpublish before expiry.

## Authority regressions and acceptance map

The exact required regression command passed on the same target:

```text
pnpm test:authority -- \
  server/__tests__/integration.developer-actor-resolution.test.ts \
  server/__tests__/integration.developer-lead-assignment-authority.test.ts \
  server/__tests__/integration.developer-media-authority.test.ts \
  server/__tests__/integration.development-publication-lifecycle.test.ts
```

Result: 4/4 files and 31/31 tests passed.

| Acceptance | Evidence |
| --- | --- |
| Zero, one, multiple, and unapproved Developer organisation handling | Actor-resolution regression: 4/4 passed; null owner for zero, coherent org for one, conflict/fail-closed for ambiguous memberships, and no paid billing for unapproved/no-publisher cases. |
| Cross-organisation assignment denied; same-org assignment and unassignment preserve custody | Lead-assignment regression: 2/2 passed, including unrelated, suspended, Agency, and cross-Developer denial. Browser journey proves same-org assignment/follow-up/history. |
| Signed-media receipt ownership and expiry | Media-authority regression: 3/3 passed; the signed Developer upload receipt is bound to its user/organisation/publisher and media scope, foreign ownership is denied, and missing/expired confirmed receipts are rejected at the shared write boundary. Unit-gallery scope and ownership also pass. |
| Publication lifecycle, expiry, moderation and history | Publication-lifecycle regression: 22/22 passed, including expired eligibility removal without destroying approved development, public read denial, independent moderation and retained rows. Browser expiry sequence proves it while still published before later app unpublish. |

## Changes and checks

The only implementation change is the B06 browser spec: journey diagnostics, named Gauteng selection steps, the expiry ordering/assertions, and idempotent URL-query redaction for the diagnostic attachment. No product code was changed because no product defect was reproduced. `pnpm check` and `git diff --check` passed after the final spec edit. This packet does not perform B07 review, merge, deployment, or production activation. After verification, the exact target was disposed through the emitted Database Authority acknowledgement (exit 0, `changed=true`), then the service was stopped within the documented bound; recovery was a safe no-op and final service status was `stopped` at the recorded service fingerprint. Database Authority disposal removed exact target `listify_wt_b06_developer_paid_mvp_5e4fe92_31389aa66242` (fingerprint hash `d701185fb52f05494fd8784627d6af73f706a2b4f92e9432cd8c344ea5ed6147`). Cleanup removed all 100 files in the worktree-owned media namespace (50 PNGs plus 50 sidecars), the two private EFT proof objects, the raw mode-0600 email capture, the 47-file task-specific `/tmp` run directory, and the temporary report-sanitizer script. Exact media/proof/run paths are absent after cleanup and the shared media base remains. A final exact-path check also removed `/tmp/property-listify-b06-developer-paid-mvp-browser-runtime.log` (9,417 bytes, mode 0600), the task-specific browser results tree (one file and one child directory), and browser report tree (one file); both trees were mode 0700, owned by uid 1000, and contained no symlinks. Those three paths are absent. The empty worktree `.private` parent was removed; the ignored `.env.local` symlink was retained. Cleanup completed before senior handoff; the historical `1b937bb6` worktree and evidence were not accessed or modified. The local B06 commit is the immutable identity for this tested spec overlay plus the evidence packet; its SHA is recorded with the handoff.

## Evidence files

- `browser-initial-report.sanitized.json` — complete initial passing browser report with all nested steps and the initial run's diagnostics.
- `browser-final-report.sanitized.json` — complete current passing browser report with all nested steps and the 17 sanitized diagnostic events.
- `SHA256SUMS` — checksums for the shared reports and this addendum.
