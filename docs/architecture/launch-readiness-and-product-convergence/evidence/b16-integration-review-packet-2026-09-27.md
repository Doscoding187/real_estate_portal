# B16 integration review packet — 2026-09-27

**Status: PREPARED FOR SENIOR REVIEW; B16 ACCEPTANCE PENDING.** B03–B07 are
accepted within their reviewed scopes. Hosted readiness remains open. This
packet prepares the exact B03–B07 acceptance inputs, B15 copy decision and B12
diagnostic sequence for review. It does not merge the candidate into the
integration branch, contact providers, change infrastructure, deploy, collect
payment or activate production.

## Review worktree and source boundary

| Identity | Value |
| --- | --- |
| B16 worktree / branch | `/home/edwardspc/Desktop/Dev/worktrees/property-listify-b16-no-spend-convergence` / `prep/b16-converged-candidate` |
| B16 HEAD / accepted composition base tree | `f3f99f806ea9ae6be3132e093ce1cf1a6f185a32` / `b5a3475633ea330469507551574c7e61a73b0900` |
| B16 candidate composition | The exact accepted B07 seven-file diff (`aeea344252f553d0f05babe0958f2d1a441acfc6e97c05dcbfab7c7b088a672c`) was applied to that accepted B03/B05/B06 base; the resulting accepted B03–B07 source tree is `2600386978a46b29f371c230f05511c81be2465f`. |
| B16 tested candidate tree | `b21f454e215d8b02129e4daa14ba6f8d338406d1` — accepted B03–B07 tree plus only the PLE browser spec/config expectation correction; the product runtime is unchanged. |
| Current B07 source diff SHA-256 | `aeea344252f553d0f05babe0958f2d1a441acfc6e97c05dcbfab7c7b088a672c`; current role/session test SHA-256 `6b69d0beb855f700e2d0e79bad30927673c67d256842279cb871c11c066f4c28`. |
| B16 source action | A B16-owned candidate branch now contains the exact accepted B03–B07 composition. It remains a review candidate; no merge to the integration branch, deployment, or production activation occurred. The focused PLE test/config correction is recorded separately below. |

The exact candidate identity is proven by the accepted base tree `b5a347…`,
the accepted B07 seven-file diff hash, its resulting B03–B07 tree
`260038…`, and the tested B16 candidate tree `b21f…` after the PLE-only test
correction. The candidate remains unmerged and is not a release artifact; any
later release process still needs its own explicit artifact identity and
release verification.

## B03–B07 acceptance inputs

The current senior decision records B03, B04, B05, B06 and B07 closed within
their reviewed scopes. Older task packets retain earlier review/open statuses;
those historical status lines predate the later acceptances and do not replace
the accepted source/evidence identities below.

| Workstream | Accepted source/evidence identity | Verified scope and limit |
| --- | --- | --- |
| B03 | Accepted six-file correction SHA-256 `3e292cce43aafefb20075190bf6064b8e2c22ef1785843873f8dffe43880ea76`; included in composed base tree `b5a3475633ea330469507551574c7e61a73b0900`. | Payment/term lifecycle containment and the accepted B03 policy. B03 remains closed; normal production activation remains a separate gate. |
| B04 | Refreshed B04 journey and focused regressions recorded in the current B04/B07 review packet. | Joined Agent paid journey 2/2, focused server 7 files/23 tests, client 9 files/38 tests; these results are reused because only the B07 role/session test changed after the earlier matrix. |
| B05 | Accepted test correction SHA-256 `1e210e5e348576d82663136a2fa2f215f9def31a1fe364dcddf6298072bfd754`; accepted eight-file B03/B05/B06 composition SHA-256 `926086a2e3cf68e9edc1c3d0969717352af6feb42c0d5c91f01c5970b129a711`. | Dedicated Agency paid journey 1/1 and the recorded B05 access, membership, publication, enquiry, revocation and history evidence. B05 remains closed. |
| B06 | Accepted composed source tree `b5a3475633ea330469507551574c7e61a73b0900`; accepted B06 spec SHA-256 `2ce67a21dc05c0bcb9cae67ea8001dbe7a594c71cc48d92f06db57dfb17944d7`. | Current Developer journey report 370 passing steps, including both Gauteng selections; recorded authority result 31/31. Historical Gauteng failure remains unattributed; local provider substitutes do not prove hosted readiness. |
| B07 | Senior-accepted candidate tree `2600386978a46b29f371c230f05511c81be2465f`; seven-file source diff SHA-256 above. | Earlier direct API matrix 11 files/99 tests remains valid for its recorded source. After the sole test amendment, the focused role/session file passed 1/5 on the accepted tree. No full-matrix rerun was required or performed. |

The current B04/B07 packet is
[`b04-b07-security-matrix-2026-09-26/review-packet.md`](b04-b07-security-matrix-2026-09-26/review-packet.md).
Its three sanitized evidence files have these SHA-256 checksums:

| Evidence | SHA-256 |
| --- | --- |
| `review-packet.md` | `2cdf36a7ea1e29f894d1aa522eae750915dff2d114a8c2424161c819546dd727` |
| `security-matrix.json` | `d585cd7db57817c6190d9cf10d7fb89569009e3dfe37d62f4738896aefc36995` |
| `role-session-audit-cases.json` | `4329fb5d0ecd80e9a56670d4c31d062ff5b62859cc4c4c155602d31ca1c37d57` |

The historical PLE run on September 26 stopped at its first assertion (**1
failed / 9 not run**): the config enabled the exact `agency_launch_access`
governed test selector, while the spec expected the generic preparation-only
landing. The observed Agency Launch Access page was correct for that isolated
test selector. B16 changed only the PLE test/config expectation to follow the
enabled Agency landing and its owner-account CTA; the onboarding checks still
assert that no invoice, payment request, or publishing activation occurs. The
updated Database Authority rerun result, target identity and cleanup evidence
are recorded below after verification.

The corrected command
`pnpm test:browser:authority -- --config=playwright.ple-agency-operating.config.ts`
passed **10/10 cases** on tested candidate tree `b21f454e215d8b02129e4daa14ba6f8d338406d1`
and exact disposable target fingerprint
`af8dc5d6cb434ff5e3abcd89eb43518a4b58017d407a729e2a26df6a168408e8`, migrated
to `0094_content_topics_primary_key.sql`. The run includes owner and member
registration, reviewer approval, gated invitation acceptance, private draft
and media authoring, moderation/resubmission, public publication and discovery,
enquiry custody/replay, and assigned-agent follow-up/history. The full sanitized
case report, Authority results and governed cleanup record are in
[`b16-ple-browser-journey-2026-09-27.json`](b16-ple-browser-journey-2026-09-27.json).
The test's archive, entitlement-release and no-transaction assertions passed;
Authority then disposed the exact target and stopped its local MySQL service.
Email capture, media proxy and in-memory Redis were local substitutes, not
hosted-provider evidence.

The sanitized B04/B07 review packet and its two JSON evidence files were copied
into this B16 worktree without changing the B07 source worktree. Their bundled
`SHA256SUMS` file passes in this worktree, preserving the original evidence
identity for review.

## B15 copy approval gate

B15 has a review draft and an Edward approval candidate, but no approved final
copy. The candidate explicitly says Edward has not approved it; `/terms` and
`/privacy` remain placeholders. The September 27 preparation is in
[`b15-copy-approval-preparation-2026-09-27.md`](b15-copy-approval-preparation-2026-09-27.md).
It preserves the approved B01 offer facts without claiming that the unresolved
customer, tax, legal or privacy decisions are settled.

Before B15 can be accepted, obtain verified company disclosure fields and
monitored support/privacy routes; accountant confirmation of current VAT
status and invoice text; the actual weekday service cadence; provider/transfer,
retention and cookie schedules; final Terms/Privacy version dates and customer
acceptance; named South African legal/accounting markup; and Edward's approval
of the exact resolved copy. Then prove the rendered pages and checkout/invoice
consistency on the exact candidate under B18. The current SARS FAQ reports the
compulsory threshold as R2.3 million from 1 April 2026, but that threshold does
not establish this company's VAT registration.

## B12 diagnostic gate

The September 27 public DNS/TLS/HTTP observations are refreshed in
[`b12-public-diagnostics-2026-09-27.json`](b12-public-diagnostics-2026-09-27.json).
The API returns liveness and version 200 on SHA `4e012b3044628fc06da7489c0055e9ce01bdc8d9`,
but readiness is 503; the frontend version endpoint returns HTML, apex TLS
hostname verification fails, and both staging names are NXDOMAIN. The
September 24 variable-only observations remain historical; their nine
candidate gaps were not rechecked. The new dated checklist is
[`b12-diagnostic-preparation-2026-09-27.md`](b12-diagnostic-preparation-2026-09-27.md).
No provider configuration, authenticated session or staging operation was
inspected or performed. The mandatory Database Authority preflight in the B12
worktree resolved only its owned local disposable target, which was
unreachable; ledger and schema state were not evaluated. That result is
explicitly not hosted evidence. The sanitized command record is
[`b12-database-authority-preflight-2026-09-27.json`](b12-database-authority-preflight-2026-09-27.json).

B12 diagnostics require a frozen artifact identity, sanitized public
DNS/TLS/version/readiness observations, read-only effective service config,
and isolated staging proof for cookies, origin/proxy behavior, Redis, S3,
email, lead delivery, term scheduling and restart. Preserve issue keys only;
never include secret values, full credential URLs, cookies or customer data.
Stop on artifact mismatch, readiness failure, schema/target inconsistency,
staging DNS/certificate failure or any unexpected side effect. B08 owns the
database release boundary. B10/B11/B13 own real providers and their acceptance;
B14 owns the staffed sales window; B17 owns continuous monitoring; B18 owns
exact-artifact acceptance.

## B09 source-data census and disposition prerequisite

No accepted B09 source-data census or disposition was found in the checked-in
B16 launch-convergence evidence or named B09/source-data census artifacts
reviewed on September 27. The database-takeover coverage inventory is not
accepted evidence for launch data scope. The founder decision queue therefore
remains open: **Data owner + Edward** must identify the authoritative source
systems and records, define which data is in launch scope, and record the
disposition of excluded or deferred data with evidence sufficient to approve
that scope. B16 does not infer or fabricate a B09 decision.

## Founder and owner decision queue

These decisions remain open; preparation and local verification do not supply
or imply them.

| Owner | Required input | Status |
| --- | --- | --- |
| Edward | Verified company disclosures; monitored support and privacy contacts; actual support cadence; named reviewers. | Open |
| Accountant | Confirmed VAT status, payee, and invoice/receipt wording. | Open |
| Legal/privacy reviewers + Edward | Resolved provider, retention and cookie schedules; reviewed text; dated approval of the exact copy. | Open |
| Infrastructure owner + Edward | Concrete staging resource, DNS/certificate and access proposal, costs, and operation-specific approvals. | Open |
| Data owner + Edward | B09 census/disposition sufficient to establish launch data scope. | Open |

Hosted acceptance remains a later release gate. It is not a circular
prerequisite for preparing this integration candidate; staging or provider
operations still require the concrete owner proposal and approvals above.

## B16 decision and remaining limits

This packet presents the exact accepted B03–B07 source composition in a
B16-owned candidate branch for senior review. It does not close B16 or hosted
readiness. The review should assess this source/evidence set while preserving
the open B09 data-scope decision, B15 copy gate, B12 provider proof, and the
updated PLE result and limits.

No B16 integration merge, B08 database cutover, provider setting change,
deployment, customer payment collection or production product activation was
performed. B03–B07 stay closed within their accepted scopes; hosted readiness
and B16 acceptance remain open.
