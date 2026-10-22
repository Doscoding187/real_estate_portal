# B06 composed-source verification

Status: the complete current B06 browser and authority pass succeeded on the composed source. B06 remains **OPEN pending senior review**. This record supersedes neither B03 nor B05; both remain closed. The earlier 96b run is preserved as historical-only evidence in [`revalidation.md`](revalidation.md).

## Source identity

| Item | Identity |
| --- | --- |
| Accepted candidate | `5e4fe9244441e4138a836bc084c8d1e01881bc99`, tree `b664ab9c1c6bb59fe68e6a476603aab792ca30c` |
| B06 branch / worktree | `feat/b06-developer-paid-mvp-5e4fe924` / `/home/edwardspc/Desktop/Dev/worktrees/property-listify-b06-developer-paid-mvp-5e4fe924` |
| B06 commit at verification | `96b6746c7bd4945975055dc755dc1968e8cd989e`, tree `c18ef2835005637324d949edec5f1374e44b5b45` |
| Composed eight-file source tree | `b5a3475633ea330469507551574c7e61a73b0900` |
| Complete eight-file source diff from accepted candidate | SHA-256 `926086a2e3cf68e9edc1c3d0969717352af6feb42c0d5c91f01c5970b129a711` |
| Accepted B03 worktree patch | SHA-256 `3e292cce43aafefb20075190bf6064b8e2c22ef1785843873f8dffe43880ea76` |
| Accepted B05 browser-spec patch | SHA-256 `1e210e5e348576d82663136a2fa2f215f9def31a1fe364dcddf6298072bfd754` |
| Lockfile / toolchain | `pnpm-lock.yaml` SHA-256 `a565f7331ef0a76881c135ad39c965b99b0bd75827b3edea3b7fd70eb822b9f1`; Node `v22.22.3`; pnpm `10.4.1`; `pnpm install --frozen-lockfile` passed. |

The exact source-file lists, source worktree identities, before/after source-worktree status, byte-for-byte file comparisons, patch hashes, and temporary-index tree proof are in [`source-composition.md`](source-composition.md). B03 and B05 source worktrees remain unchanged. Historical ancestry is not used as proof of their accepted uncommitted patches.

## Database Authority target

| Item | Result |
| --- | --- |
| Target | `listify_wt_b06_developer_paid_mvp_5e4fe92_31389aa66242` (`disposable-worktree`) |
| Target fingerprint hash | `d701185fb52f05494fd8784627d6af73f706a2b4f92e9432cd8c344ea5ed6147` |
| Exact worktree ownership key | `31389aa662427b0cec274291`; ownership matched |
| Local MySQL service fingerprint | `2425e54d0472ee5b308127a7c63380733f077ec7531767d6dba21a2c2a9177f2` |
| Manifest | `93d871e6f8760477f460b8821685d71d212374eb86ddd53bc6e2ccfc30608efc`, head `0094_content_topics_primary_key.sql` |
| Migration result | Fresh plan was 95 migrations from no prior head to 0094; post-apply status was `manifest-head-ready`, `no-incomplete-attempts`, `schema-congruent`. Final plan digest `2396d1cd47ca3dad4f9d4340567602d12bede72aea8618d0236632bcfac5c687` had no pending migrations. |
| Schema congruency | Desired/actual digest `a8ca8cf34bb3627594eab1b722b85115c6460225a0165db7992228a8547798e9`; 23/23 physical checks passed. |
| Reference data | `canonical-geography-v2`, digest `6c3fb68b54fd0db64ea7a67a4b30383a3d6c610babf3e1de1aa531f54827093c`; 9 provinces, 340 cities, 1,089 suburbs. |
| Commercial foundation | `canonical-launch-foundation-v1`, digest `aaac24d45d655d2702348aa948ff53742358d9c6af95f8dfcbf7da3ab758a780`; exact Developer product, R1,499, 90 days, no automatic renewal. |
| Search-to-Lead scenario | `search-to-lead-v5`, digest `a7b62da33e3f416e31728b6306c9b38d46f9b604db9d19b091c98f33ba16165b`; canonical `gauteng/johannesburg/sandton`, 3 eligible properties and 1 development. |
| Reviewer | `ple-reviewer-v3`, digest `ae132fcc7dfa71c38cdf89ca297e1143916beb52cf5beebe39f28bb7878440d6`; exact local reviewer ID 990100 verified as `super_admin`, with verified email and no agency, agent profile, subscription, or entitlement. |

The scenario verifier's first invocation under the default development runtime was refused by its explicit test-runtime guard. `NODE_ENV=test APP_ENV=test pnpm db:scenario:verify` then passed on this exact target. Search-to-Lead readiness reported `applicationReady=true`. Post-test authority status remained at 0094 with no incomplete migration attempts.

## Browser journey and Gauteng diagnosis

Command:

```sh
pnpm test:browser:authority -- --config=playwright.b06-developer-paid-mvp.config.ts
```

**PASS:** one joined Desktop Chrome test; 370 nested steps; 145,822 ms test duration; Chrome `145.0.7632.6`; Node `v22.22.3`. The complete sanitized step tree and diagnostics are in [`browser-composed-report.sanitized.json`](browser-composed-report.sanitized.json).

The journey passed registration, actual email verification, organisation setup and approval, organisation-owned invoice and payment/access, development and unit authoring, confirmed media, moderation, public discovery, enquiry/replay, same-organisation assignment and follow-up, then expiry. Both named province-selection steps—organisation geography and development location—selected Gauteng successfully. The verified reference/scenario data also resolved Gauteng/Johannesburg/Sandton. There were zero uncaught page errors and no browser diagnostic event during either named Gauteng selection step.

The reported Gauteng timeout/crash was **not reproduced**, so no Gauteng-specific product correction was made. Fixture classification: canonical geography and Search-to-Lead data verified, and both selectors completed. Browser/environment classification: Chrome completed the run with zero page errors; the current diagnostics show a Google Maps billing-disabled console error and blocked/aborted external map requests, but no diagnostic event coincided with either Gauteng selection. Product classification: no selection defect was reproduced. The historical failure cannot be attributed to fixture, browser/environment, or product cause from the old-source pass evidence. The current run also recorded expected negative-path 401/404/403 responses and transient request cancellations during navigation; none prevented the journey. The report contains 9 console errors, 21 request failures, and 3 HTTP-error responses, all redacted; there were no page errors.

Acceptance mapping:

| Requirement | Browser evidence |
| --- | --- |
| Registration and organisation authority | Real application registration and generated verification message; setup created exactly one pending organisation and coherent publisher; a separate reviewer approved it without granting paid access. |
| Organisation-owned commercial access | Exact Developer invoice resumed without duplication; proof remained under review until separate finance approval created organisation-owned payment and 90-day access. |
| Development, unit, and media authoring | Mounted wizard persisted residential facts and aggregate units; development hero, unit gallery, and floor plan used reserve/upload/confirm/attach; edit/reload retained authorized media. |
| Moderation and discovery | Distinct reviewer approved publication; public search/detail showed the approved Developer development and confirmed media. |
| Enquiry and custody | Public unit enquiry was durable and replay-idempotent with the same Developer organisation/publisher custody. |
| Same-organisation operations/history | Canonical operator self-assigned, marked Contacted, recorded a call and note, scheduled follow-up, reloaded, and retained activity/history. |
| Expiry while still published | Before expiry, the development was approved and `isPublished=1`. The term was expired while that state remained; discovery omitted the still-published development, detail returned not-found, and a fresh enquiry returned 404. Only after those checks did application unpublish return 200; fresh publication then returned 403. Organisation, membership, publisher, development, units, one enquiry, and at least three activity records remained. |

## Authority regressions

Command:

```sh
pnpm test:authority -- \
  server/__tests__/integration.developer-actor-resolution.test.ts \
  server/__tests__/integration.developer-lead-assignment-authority.test.ts \
  server/__tests__/integration.developer-media-authority.test.ts \
  server/__tests__/integration.development-publication-lifecycle.test.ts
```

**PASS:** 4 files, 31 tests, on the same target fingerprint.

| Regression | Proven behavior |
| --- | --- |
| `integration.developer-actor-resolution.test.ts` | Zero active organisations yields no authority; one coherent organisation/publisher resolves consistently (including a transaction); multiple memberships fail closed; unapproved/missing publisher states deny authority. |
| `integration.developer-lead-assignment-authority.test.ts` | Self, same-organisation active operator, and unassignment are allowed without custody change; unrelated, suspended, Agency, and cross-Developer targets are rejected. |
| `integration.developer-media-authority.test.ts` | Signed receipts require reserve → actual upload → confirm → owned attach; unit gallery is bound to the owned development/unit; foreign scopes, missing objects, and expired confirmed receipts are denied. |
| `integration.development-publication-lifecycle.test.ts` | Independent moderation, privacy before approval/access, approved-state retention, expiry visibility rules, and lifecycle authority negatives passed. |

`pnpm check` passed on the composed worktree. `git diff --check` and evidence checksum verification passed at handoff preparation. No schema or migration source changed. B07 final review, merge, deployment, and production activation remain outside scope.

## Local substitutions and cleanup

The run used local MySQL, the in-memory Redis fallback, the application-generated verification message in a mode-0600 local capture file, worktree-namespaced local media storage, and local private EFT-proof storage. No hosted mail, media, Redis, or payment provider was used. After the sanitized packet was captured, cleanup removed the exact B06 media namespace `/home/edwardspc/.local/share/property-listify/media/worktree-b05e92df5103f16b` (94 files, 30 directories), the one private EFT-proof object and its two nested directories, the empty worktree `.private` parent, the mode-0600 email capture (332 bytes), the mode-0600 runtime log (9,505 bytes), the one-file Playwright HTML report, and the one-file/one-directory Playwright results tree. All paths are absent; the shared media base remains. Database Authority disposed the exact target (fingerprint hash `d701185fb52f05494fd8784627d6af73f706a2b4f92e9432cd8c344ea5ed6147`, `changed=true`, exit 0), then stopped the local MySQL service through its exact Unix socket within 30 seconds. Recovery was a safe no-op and final service status was `stopped` at service fingerprint `2425e54d0472ee5b308127a7c63380733f077ec7531767d6dba21a2c2a9177f2`. The ignored `.env.local` symlink is retained. Raw credentials and verification tokens are absent from shared artifacts.
