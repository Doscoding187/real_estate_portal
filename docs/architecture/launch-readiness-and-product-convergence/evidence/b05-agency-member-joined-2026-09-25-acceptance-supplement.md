# B05 joined Agency/member journey — current evidence supplement

Date: 2026-09-25

Disposition: implementation evidence ready for senior review; this supplement does not claim senior acceptance.

This supplement updates the current joined-journey evidence after the senior
review identified the later B10 profile-setup failure. It follows B05 in the
[accepted launch-closure plan](../24-paid-mvp-launch-closure-execution-plan.md#b05--agencymember-joined-journey)
and preserves the preceding B05 packet as historical implementation evidence.
It supersedes the still-unrun handoff status in the earlier prerequisite-stop
record; that file remains as contemporaneous setup history.

## Source and target identity

| Item | Value |
| --- | --- |
| Worktree | `/home/edwardspc/Desktop/Dev/worktrees/property-listify-b05-agency-member-joined-20260925` |
| Branch | `fix/b05-agency-member-joined-reproduction` |
| HEAD / accepted candidate base | `5e4fe9244441e4138a836bc084c8d1e01881bc99` |
| B05 source change | `e2e/b05/agency-paid-mvp.spec.ts`; diff SHA-256 `1e210e5e348576d82663136a2fa2f215f9def31a1fe364dcddf6298072bfd754` |
| Carried B03 correction | Six-file diff SHA-256 `3e292cce43aafefb20075190bf6064b8e2c22ef1785843873f8dffe43880ea76`; matches the senior-reviewed B03 diff and remains unchanged. |
| Database target | `listify_wt_b05_agency_member_joined_20260_bb9bf51b1b70` |
| Target class / ownership | `disposable-worktree` / exact worktree ownership |
| Target fingerprint | `a741e71c34cbf6b800c49d9067aebfcd2018945810e023448a04fb2fd926078f` |
| Migration head / manifest | `0094_content_topics_primary_key.sql` / `93d871e6f8760477f460b8821685d71d212374eb86ddd53bc6e2ccfc30608efc` |

`pnpm db:authority:context` and `pnpm db:authority:status` both exited 0
immediately before the final browser rerun and resolved this exact target. The
browser and authority integration runners also reported the matching target
fingerprint prefix `a741e71c34cbf6b8`. Governed setup stages and their full output
remain in [setup-execution.md](b05-agency-member-joined-2026-09-25/setup-execution.md).
No schema, migration, runtime billing, or authentication source changed in B05.

## Failure diagnosis

The B10 packet records that its later run reached invitation acceptance and then
failed during member profile setup, but it includes no raw Playwright trace, exact
source identity, target identity, or diagnostic stack for that failure. I could
not attribute that historic failure conclusively to product behavior, fixture
state, or browser setup.

The first run on this exact target failed earlier at reviewer sign-in with HTTP
401, before the joined member journey began. The governed PLE reviewer fixture
was absent: `pnpm db:ple-reviewer:verify` reported that the target did not have
exactly one reviewer identity row. After `pnpm db:ple-reviewer:prepare` and a
successful `pnpm db:ple-reviewer:verify`, the existing journey passed. Its first
member completed `/agent/setup`, then inventory, publication and the rest of the
journey. The final mobile-expanded run completed the same profile setup as well.

Conclusion: the reported profile failure does not reproduce on the current
candidate with its required governed reviewer fixture. No B05 product defect was
demonstrated, so no product-code correction was made. The first 401 was a fixture
prerequisite issue, not evidence explaining the separate historic profile error.

One later rerun exposed a test assertion ambiguity after the Agency deactivation
mutation returned HTTP 200: the team screen rendered two exact `suspended` labels,
one in the member row and one in the detail sheet. The assertion now scopes to the
selected member's labeled detail. The final full run passes this assertion and the
following stale-session and custody checks.

## B05-only test correction

The B05 change is limited to
[`e2e/b05/agency-paid-mvp.spec.ts`](../../../../e2e/b05/agency-paid-mvp.spec.ts):

- The invited first member uses a 390×844 mobile/touch context through profile
  setup, sale and rental authoring, and publication. Mobile public property detail,
  enquiry, and the stale revoked-member session also assert a touch-capable mobile
  viewport.
- The inventory assertion checks the exact member `ownerId` and Agency/member
  attribution. Read-only persisted checks establish that the active 90-day term is
  owned by the Agency and neither member has a personal Agent billable account.
- The same-browser private-draft isolation check retains real logout/login but uses
  a dedicated desktop context; the required member and buyer work remains mobile.
- The prior direct SQL `UPDATE subscriptions` expiry shortcut is removed. The
  browser now revokes the member through the Agency team's real deactivation flow,
  chooses the second member through the UI to reassign work, and then proves stale
  access denial and retained Agency custody. No SQL membership or term mutation is
  present in this test. B03's separately accepted persisted evidence remains the
  term-expiry authority.
- The deactivation response, member suspension, stale browser redirect, unchanged
  paid term, listing ownership, lead assignment, history, and activities are
  checked after the workflow. Assertions were strengthened; none were weakened.

All database queries in the B05 browser test are read-only assertions. A source
search for `UPDATE`, `INSERT INTO`, `DELETE FROM`, or `REPLACE INTO` found no SQL
mutation in the test.

## Current joined-journey evidence

Command:

```sh
pnpm test:browser:authority -- --config=playwright.b05-agency-paid-mvp.config.ts
```

Result: **exit 0; 1 passed, 0 failed, 0 skipped; 2.2 minutes** on the exact B05
target above. The browser config enables only `agency_launch_access` and uses the
governed local runtime and private mail-capture sink.

| Acceptance stage | Evidence |
| --- | --- |
| Agency acquisition, registration, verification, setup | The owner completes the mounted Agency flow; a pending Agency-owned plan/account is asserted. |
| Approval and payment | Privileged review is performed through the real finance UI; the owner requests and submits the R999 once-off invoice proof; finance approval activates the Agency-owned 90-day term. |
| Invitation and acceptance | The owner sends invitations through the team UI. The application-generated link is read from the mode-0600 local capture, and new and existing verified users accept through the real flow. No invitation token is read from SQL. |
| Profile and Agency-paid access | The new member completes the full profile/setup on mobile, reaches the Agent dashboard, sees that Launch Access is managed by the Agency, and cannot start a personal Agent purchase. Both members have zero personal Agent billable accounts. |
| Inventory and publication | A mobile member authors and submits sale and rental listings. Moderation approval creates the public projections; the sale is asserted to have the member as author and the Agency as commercial owner. Public sale/rental detail checks run on mobile. |
| Enquiry and operation | A mobile buyer submits and replays an enquiry; only one lead exists. The owner assigns it to member one, reassigns it to member two, records contact, note, and follow-up, then reloads and verifies history. |
| Revocation and stale session | The owner deactivates member one through `/agency/team`, reassigning its active work to member two. The member's already-authenticated mobile session is denied Agent access and redirected to `/user/dashboard`; persisted membership is suspended with an end time. |
| Retained Agency custody | The published listing retains its original member author and Agency owner while operational assignment moves to member two. Lead Agency custody, member-two assignment, response/contact/follow-up timestamps, and at least four activity rows remain. The Agency-owned subscription remains active. |

The final passing run emitted no retry trace because Playwright is configured
`trace: 'on-first-retry'`; its complete HTML report, last-run record, and command
output are retained in the owner-only external evidence directory described
below. The earlier fixture-failure report and screenshots/video are also retained
there. The B10 historical failure itself has no raw trace in the supplied packet.

## Membership races and tenant boundaries

The first membership-run attempt exited 1 because the app-router import in the
suite's `beforeAll` exceeded Vitest's default 10-second hook limit; the suite
reported 32 skipped, so that run is not counted as acceptance. Increasing only
the hook allowance to 30 seconds did not change or skip assertions and allowed
the complete persisted suite to run:

```sh
pnpm test:authority -- --hookTimeout=30000 server/__tests__/integration.agency-membership-authority.test.ts
```

Result: **exit 0; 1 file, 32 passed, 0 failed, 0 skipped**. This includes
simultaneous acceptance, cancel-versus-accept, resend-versus-accept, competing
Agency invitations, replay, and stale suspended/left membership transitions.

The Agency listing/lead tenant suite also passed on the same target:

```sh
pnpm test:authority -- --hookTimeout=30000 \
  server/__tests__/integration.agency-listing-publication-lifecycle.test.ts \
  server/__tests__/integration.agency-listing-attribution.test.ts \
  server/__tests__/contract.agency-lead-visibility-followup.test.ts \
  server/__tests__/contract.agency-listing-inventory.test.ts
```

Result: **exit 0; 4 files, 12 passed, 0 failed, 0 skipped**. The publication
lifecycle case creates a genuinely unrelated verified Agency administrator and
proves that administrator cannot list, read, or retry-deliver the other Agency's
lead. The lead contract rejects updates outside the caller's Agency. Membership
tests also prove suspended members lose private listing and operational access.

## Checks and durable artifacts

- `pnpm check`: exit 0.
- `pnpm exec eslint e2e/b05/agency-paid-mvp.spec.ts`: exit 0.
- `git diff --check`: pass.
- Build was not rerun: the B05 change is browser-test and evidence only; no B05
  application source changed. `pnpm check` covers the current TypeScript source.
- No B05 database schema or migration changed. All test mutations used application
  workflows or existing governed test-suite fixtures.

Owner-only browser reports, command logs, regression results, and hashes are
retained outside the repository at:

`/home/edwardspc/.local/share/property-listify/b05-agency-member-joined-20260925/durable-evidence/`

That directory and its parents are mode `0700`; logs are sanitized, and
`SHA256SUMS` records artifact hashes. `browser-report/index.html` is the final
pass report. `browser-initial-failure/` preserves the initial reviewer-fixture
failure report and browser artifacts. `browser-assertion-failure.log` records
the ambiguous status assertion before correction. The local invitation-capture
file is not included in this packet or the retained reports; its generated tokens
are kept out of committed evidence.

Local email capture proves that the application generated and delivered the
invitation to the governed local sink. It does **not** prove live provider
delivery, mailbox receipt, bounce handling, or production email configuration;
those remain B10/B18 evidence.

## Governed cleanup

After browser and authority regressions completed, the local capture file was
truncated to zero bytes while retaining mode `0600`. The exact B05 database was
then disposed using the freshly resolved context and the acknowledgement emitted
for that target. The acknowledgement itself is retained only in the owner-only
external evidence directory, not in the repository.

| Command | Result |
| --- | --- |
| `pnpm db:authority:context` | Exit 0; freshly resolved the exact fingerprint and ownership above. |
| `pnpm db:worktree:ack` | Exit 0; emitted the matching disposal acknowledgement. |
| `pnpm db:worktree:dispose -- --ack=<exact emitted acknowledgement>` | Exit 0; `changed: true` for the exact B05 target. |
| `pnpm db:authority:service:stop` | Exit 0; stopped cleanly through the authority-owned Unix socket. |
| `pnpm db:authority:service:recover` | Exit 0; reported cleanly stopped, recovery a safe no-op. |
| `pnpm db:authority:service:status` | Exit 0; local authority service is stopped. |

Sanitized command output is retained as `cleanup-context.txt`,
`cleanup-dispose.txt`, `service-stop.txt`, `service-recover.txt`, and
`service-status-after-cleanup.txt` in the adjacent setup evidence directory.
The exact disposable target is no longer available. No B06, B07 final review,
merge, deployment, or production activation was started.

## Remaining limit and handoff

The current candidate completes the previously reported profile step and all
required B05 joined-journey stages. Because the earlier B10 profile failure has
no raw trace or exact target/source evidence, its historic cause remains
unassigned even though it is not reproduced now. The test-only assertion
ambiguity was corrected. This work is ready for B05 senior review; B06, B07 final
security review, merge, deployment, and production activation remain outside
scope.
