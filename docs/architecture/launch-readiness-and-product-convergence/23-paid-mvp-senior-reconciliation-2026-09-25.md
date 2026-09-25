# Paid MVP senior evidence review — 2026-09-25

**Launch decision: NO-GO.** Three work packages are accepted within their
defined boundaries: **B01, B02 and B04**. **B03 and B07 fail the current code
review; B05 and B06 have incomplete current evidence. B08–B18 remain open.**
There are 15 open packages, not 15 independent engineering projects.

The [central launch register](03-launch-register.md#paid-mvp-working-disposition--2026-09-25)
owns these dispositions. This report supplies their evidence and reasoning;
it is not a second release authority. B-numbers remain work-package identifiers,
not new LRC findings. This review neither approves merging PR #580 nor opens
paid sales. Services V1/PR #581 and Explore are outside this audit. No dependency
on PR #581 was established for the paid core.

## 1. Source identity and authority reconciliation

| Evidence identity | Verified value |
| --- | --- |
| Published `origin/main`, fetched and checked through GitHub | `4e012b3044628fc06da7489c0055e9ce01bdc8d9` (PR #577) |
| User's original local `main` checkout | `ad0c4247`; behind published main, not the audit baseline |
| Assembled Paid MVP source | PR #580, `e8974ec34b919ceab37bdbd7e7379f96f3abce99` |
| Candidate tree | `28d63e530449ee7357a5979684aea42ee2077bdc` |
| Actual PR CI checkout | Synthetic merge `6730d3df1dc7300d15d6a9e095571f13adf74e11`, parents published main and candidate above; **same tree as candidate** |
| Earlier closure/CI PRs | #578 and #579 both open at `c51041acd626e3973cbdc88080bb0074d8c95313`; neither is an integrated release |
| Review worktree | `/home/edwardspc/Desktop/Dev/worktrees/property-listify-paid-mvp-audit-20260925` |
| Review branch | `audit/paid-mvp-launch-reconciliation-20260925` |
| Review branch construction | Created from fetched main; after recording clean-main checks, advanced locally to PR #580's exact source to review and reconcile its register. Other worktrees and main were not changed. |
| Production API observed in this review | Still published main `4e012b30`; not PR #580 |

The governing chain is `AGENTS.md`, the central register, the provenance
contract and the database transition master plan. The
[original B01–B18 audit](19-paid-mvp-launch-blocker-audit.md) defines the package
risks and acceptance criteria. It was found at separate commit
`a9dbb7ee9d97ddbebeef8e85b445c98db6e3c298`, absent from both published main and
the PR #580 tree, and restored unchanged here for traceability. Its September 17
status column is historical; the September 25 register supersedes it.

**Repository disagreements:**

- Published main's central register says there are no findings. The populated
  register and launch implementation exist only in unmerged candidate history.
- The candidate register's long opening summary predates the assembled release.
  Its B01 policy closure never closed the separate LRC-PAY-001 runtime risk.
- B03–B06 closure packets still say review pending. No GitHub review records
  were returned for #578, #579 or #580. Repository notes record earlier bounded
  senior decisions, but do not establish whole-candidate acceptance.
- B05/B06 initial browser passes have later unsuccessful runs in B10's packet.
  Those later results cannot be discarded when assessing current closure.
- The B08 spend gate does not dispose of B09 source preservation, nor of B17
  capacity/restore criteria. The newer monitoring runbook does not waive the
  master plan's 24-hour capacity exercise.
- Green GitHub CI and successful Railway deployment status coexist with failed
  Vercel preview and production readiness. They prove different things.

## 2. Fresh verification and failure attribution

Durable observations are in [the audit evidence directory](evidence/paid-mvp-audit-2026-09-25/).
The GitHub snapshot includes PR heads, checks and reviews; provider observations
include timestamps and exact identities. Source packets remain historical
evidence with the limits stated below.

| Check | Observed result and boundary |
| --- | --- |
| Clean published-main source, focused server tests | 4 files / 26 tests passed. B03's new policy/scheduler tests do not exist on main and were not counted as executed there. |
| Candidate focused server checks | **11 files / 74 tests passed** in the registered audit worktree. Covers activation, fixed terms/notices, public eligibility, Developer media, role audit, private-proof configuration, sales pause, email policy and launch preflight. Mock/unit checks; no database initialization. |
| Candidate focused client checks | **11 files / 47 tests passed** from an exact source archive. Covers Agent journey/package/IDs/draft isolation/reconsideration, Developer billing/setup/wizard isolation. No browser journey or database claim. |
| Initial archive preflight diagnostic | 73/74 passed; preflight failed outside a registered Git worktree. The unchanged test passed 11/11, then the entire 74-test selection passed, in the registered candidate worktree. **Audit harness diagnostic, not a product blocker.** |
| GitHub [CI 36057290617](https://github.com/Doscoding187/real_estate_portal/actions/runs/36057290617) | DB contract, lint/typecheck, build, unit/integration all successful on the equal-tree synthetic merge. Server 397 files / 2,505 tests passed; 8 files / 66 tests skipped in the ordinary suite. |
| Developer supersession skip | Separately executed with `S2_DB_TESTS=1`: all 13 tests passed; combined CHECK/FK stage 2 files / 16 tests passed. Do not reopen it from the ordinary suite's skip count. |
| Downloaded CI artifacts | Fresh MySQL 8.4.7 consumer exit 0; schema congruent at candidate digest; 23/23 CHECK constraints enforced; semantic grant plan match and runtime/worker/verifier denials. Preserved original artifacts include the credential command's stdout preamble. |
| Frontend build guard | [36057290542](https://github.com/Doscoding187/real_estate_portal/actions/runs/36057290542) successful. |
| Vercel preview | Deployment `dpl_Dh6DX7vP4Xpbtds7rtwGBAtf27Qt` remains FAILURE in GitHub. Build logs were not available through the inspected tools; cause is **unestablished**. No speculative fix accepted. |
| Production API | `/api/health` 200 (liveness), `/api/version` main SHA, `/api/readiness` **503**. Target `68f2582a…`, pending head, incomplete migration attempt, schema noncongruence, blocked commercial foundation. |
| Production frontend | `/version.json` 200 **HTML**, so it does not prove a frontend build identity. |
| Railway status | API deployment `3996ee58-71f7-4976-b6a4-0cc3bc3c7731` SUCCESS on main; Redis SUCCESS; only those two services observed. No separate email supervisor or lead cron service. |
| Local Database Authority | Read-only status: exact disposable-worktree classification, expected head 0094, local service unreachable; ledger/schema not evaluated. No database was created, migrated, seeded or queried by a test. |

Tests used explicit Vitest configurations, `NODE_ENV=test APP_ENV=test
SKIP_DB_INIT=1`, and unset database URL variables. The complete file selections
and results are preserved in
[verification-results.json](evidence/paid-mvp-audit-2026-09-25/verification-results.json).
The frozen-lockfile dependency install used `--offline --ignore-scripts`.

No new database/browser fixture run is claimed. The database policy requires
explicit operational approval for establishment/migrations; this audit used
non-destructive verification and existing exact-tree CI database evidence.
Historical B04–B06 `/tmp` browser report paths were unavailable at inspection.
Durable narrative packets and checked-in test implementations are available;
missing raw reports are recorded rather than reconstructed.

### End-to-end actor coverage

| Actor | Onboarding and authority | Payment to business workflow | Ongoing operation | Launch conclusion |
| --- | --- | --- | --- | --- |
| Independent Agent | Application registration, verification, profile/coverage and reviewer approval recorded | Local joined invoice → proof → finance → term → listing/media → moderation → buyer enquiry passes; B10 records a later 2/2 | Contact/follow-up/reload, tenant denial and expiry history supported by browser and current CI/component evidence | B04 application accepted; shared B03/B07 correction and real hosted/provider/finance acceptance still gate launch |
| Agency | Canonical owner/member authority and invitation races have current CI proof | Original local Agency-owned payment → delivered-to-local-capture invitation → membership → member inventory/enquiry passed; later full browser run stopped at member profile setup | Reassignment, revoked-member denial and historical custody have supporting CI evidence | B05 current joined evidence incomplete; do not sell the historical pass as current hosted proof |
| Developer | Canonical organisation/member/publisher resolution and approval have current CI proof | Original local organisation payment → development/unit/confirmed media → moderation → enquiry/follow-up passed; later authoring browser crashed | Same-org assignment and preserved history supported; still-published expiry verified separately in current CI | B06 current joined evidence incomplete; brand approval alone remains insufficient |
| Buyer/renter counterpart | Public search/detail and consented enquiry are covered inside the actor tests | Durable replay and actor-specific recipient custody covered in current CI | Customer follow-up recorded in actor workspaces | Real hosted mobile/desktop media, acknowledgement and recipient follow-up remain B18; no buyer redesign required |

## 3. Blocking code finding: product-less commercial gate

**LRC-PAY-001, L1; B03/B07; REVIEW FAILED / REMAINS OPEN.**

At the candidate, `isCommercialActivationAvailable(env)` returns true whenever
any approved product is configured. `requireCommercialActivation(operation)`
without a product key therefore passes in a real `paid_mvp_release`.
The release mechanism was added in `da17c0df` after B03's expiry closure.

Retained billing paths still use that product-less call to supposedly contain
unsupported plans:

- `billingFoundationService.ts`, `startAgencyManualCheckout`: a plan that is
  not canonical Agency Launch Access falls through to the recurring checkout;
  the later checks require an active Agency plan and price, not an approved
  product key. Both `billing.startManualEftCheckout` and
  `billing.createCheckoutSession` remain mounted.
- `submitAgencyPaymentProof`: the retained recurring path calls the same guard.
- `reviewManualPayment`: a non-Launch-Access recurring plan reaches the generic
  guard. The code comment says this is restricted to controlled regression
  fixtures, but there is no corresponding test-runtime condition in that branch.
- `requireSubscriptionCommercialActivation`: a missing/unapproved product also
  falls back to the generic gate for lifecycle/cancellation/restoration paths.

The [executable reproduction](evidence/paid-mvp-audit-2026-09-25/reproduce-productless-gate.mts)
calls only pure policy functions with synthetic environment objects. Its
[result](evidence/paid-mvp-audit-2026-09-25/productless-gate-result.json) proves:
preparation generic gate false; configured paid-release generic gate true;
explicit unsupported product false. The defect is the caller's omission of
the product, not the allow-list parser. An additional direct invocation of
`requireCommercialActivation` in an isolated production-mode process returned
without throwing. No server or database was used.

This is a candidate release-containment defect, not a claim that production
currently accepts unsupported payments. Actual execution needs an eligible
persisted plan/invoice and configured providers; B09 has not proven their
absence. Hiding the plan from plan-list UI does not protect direct APIs.
Published main has neither this release policy nor these new tests; treating
the issue as a pre-existing failing test on clean main would be incorrect.

**Bounded correction required:** reject non-approved persisted product/owner
combinations before money/entitlement mutation in the retained paths. Remove
the stale assumption that a product-less gate is closed in an enabled release.
Add explicit production-mode negative tests for recurring, missing, wrong-owner
and otherwise unapproved plans, plus positive tests for the three approved
products and existing-term preservation. Review the callers together. No new
billing platform or schema is required by this finding.

## 4. Per-package senior review

In every record below, **main applicability = not integrated** unless stated
otherwise: candidate ancestry is not mainline evidence. Accepted application
work transfers integration and real-provider obligations to the already-defined
B16/B18 and provider packages; it never authorizes paid operation.

### B01 — Actual paid offer and launch boundary

- **Risk / claimed state:** undefined or misleading offer; CLOSED — founder approved.
- **Evidence:** LRC-PAY-001's dated founder decision; canonical-commercial-v4;
  Agent R499, Agency R999, Developer R1,499, ZAR, once-off 90 days, manual EFT,
  no auto-renewal, no VAT charged under the recorded founder policy. Agency
  membership uses Agency access; Developer owner is the organisation.
- **Review:** prior founder approval is recorded; this review accepts that
  policy boundary. It is not independent legal/accounting certification.
- **Disposition:** **ACCEPT / CLOSED — commercial-policy decision only.**
  Runtime LRC-PAY-001 remains open. Dependencies: none for this policy closure;
  its execution needs B03/B14/B15/B18. Main has no integrated decision record.

### B02 — Fresh hosted CI contract

- **Risk / claimed state:** fresh deployment cannot establish a usable schema
  and Developer enquiry scenario; older audit says failed, later PR says fixed.
- **Evidence:** #579 at `c51041ac`; successful runs 35244471497/35247037467;
  current PR #580 equal-tree run and downloaded database artifacts; explicit
  supersession/FK tests really ran. Consumer fixture capability is scoped in
  `governedContainedScenarioFixture.ts`, not a production activation variable.
- **Review/disposition:** **ACCEPT / CLOSED — fresh-CI defect.** No basis remains
  for carrying September 17's failed scenario as the current candidate status.
  No dependency remains for this scoped closure. B16 owns merge/post-merge gates;
  B08 owns provider admission. Main's own passing checks do not contain the fix.

### B03 — Payment, finance, activation, renewal and expiry

- **Risk / claimed state:** wrong owner/term, duplicate credit, unpaid access or
  expiry destroying history; EVIDENCE PASS / REVIEW PENDING at `c96bfb5e`.
- **Evidence:** [expiry packet](evidence/b03-paid-lifecycle-expiry-closure-packet.md),
  integer-cent reconciliation, overpayment acknowledgement, owner locks,
  canonical term/public eligibility and historical custody; current CI S4 6/6,
  billing foundation 2/2 and lifecycle tests; fresh unit checks pass.
- **Applicability:** later B06 owner resolution, B10 notifications, B07 production
  activation and B14 pause changed shared consumers. B07 invalidates the packet's
  claim that legacy product-less calls remain closed in normal runtime.
- **Review/disposition:** **REVIEW FAILED / REMAINS OPEN** for the finding in
  section 3. Retain accepted term/payment primitives; do not rebuild them.
  Dependencies: B01; correct alongside B07, then rerun finance/term negatives.
  Real finance rehearsal remains B14/B18. Owner: billing/security implementer.

### B04 — Independent-agent paid value loop

- **Risk / claimed state:** a paid Agent cannot publish and work their own leads;
  EVIDENCE PASS / REVIEW PENDING at `6ace317e`.
- **Evidence:** [B04 packet](evidence/b04-independent-agent-paid-mvp-closure-packet.md)
  records 2 joined browser passes through actual application registration,
  local verification, invoice, proof, finance, media, publication, buyer enquiry,
  contact/follow-up and expiry. B10 records another 2/2 after private-mail-capture
  changes. Current unit/component checks and current CI Agent, reconsideration,
  listing/media and custody regressions support the source review.
- **Review:** source/public ID mapping, owner-scoped draft hydration, rejected
  profile reconsideration and exact product projection remain in candidate.
  Later removal of a nondeterministic unequal-generated-ID browser assertion
  narrows that claim; explicit unequal-ID unit/component tests still pass.
  Controlled local email/storage are correctly declared, not provider proof.
- **Disposition:** **ACCEPT / CLOSED — B04 application work package.** No additional
  B04-owned launch defect was established. This does not close shared B03/B07.
  Dependencies retained for release: B03/B07, B10–B12, B14–B18. B16 must refresh
  the joined journey after the shared correction; main has not integrated B04.

### B05 — Agency paid value loop and invitation

- **Risk / claimed state:** duplicate individual purchase, broken invitation,
  membership race or misdirected Agency leads; EVIDENCE PASS / REVIEW PENDING.
- **Evidence:** [B05 packet](evidence/b05-agency-paid-mvp-closure-packet.md)
  at `e8b81391`, real local invitation capture and Agency-paid browser pass;
  current CI 32 membership/invitation tests; transactional row locks, identity
  revalidation, same-Agency custody and stale-member denial inspected.
- **Invalidating evidence:** B10's later packet records a joined B05 failure
  after invitation acceptance at Agent profile setup. Current CI does not run
  that browser configuration. No later successful complete run was found.
- **Review/disposition:** **EVIDENCE INCOMPLETE — current journey proof.**
  It is not proven to be a B10 defect or a product bug on clean main; the B05
  suite is absent from main. Owner: Agency journey implementer. Dependencies:
  B03/B07 and B10 capture/provider contract, then B16/B18. Reproduce on the exact
  candidate, classify the failure, fix only a demonstrated cause and preserve
  a complete pass including invitation/revocation/reassignment/mobile scope.

### B06 — Developer paid organisation-to-enquiry loop

- **Risk / claimed state:** paid brand mistaken for inventory entitlement,
  ambiguous organisation, cross-owner media or lead assignment; review pending.
- **Evidence:** [B06 packet](evidence/b06-developer-paid-mvp-closure-packet.md)
  at `f686e8c4`; actor resolver fails on multiple active organisations; scoped
  media receipts and same-organisation assignees; current CI actor 4, media 3,
  assignment 2 and development lifecycle 22 tests pass; fresh client checks pass.
- **Invalidating evidence:** B10's later browser run crashed/timed out while
  waiting for Gauteng during authoring. No later complete successful B06 run
  was found. Its browser expiry stage first unpublishes: that stage alone cannot
  prove automatic expiry withdrawal. The separate passing lifecycle integration
  explicitly expires a still-published development and proves that property.
- **Review/disposition:** **EVIDENCE INCOMPLETE — current joined proof.**
  Do not invent an expiry-code defect or blame the crash on B10 without a
  reproduction. Owner: Developer journey implementer. Dependencies B02/B03/B07,
  B10/B11 contracts, B16/B18. Rerun the complete same-owner paid loop and retain
  the still-published expiry integration alongside it.

### B07 — Security, revocation and paid-release containment

- **Risk / claimed state:** stale privileges, tenant leaks and deferred billing
  awakened by release; local implementation completed, final review not proven.
- **Evidence:** `da17c0df` and `9adfdd6e`; current CI four role/session tests;
  fresh five role-authority tests. Role mutation locks the target, increments
  session version and writes audit in the same transaction; last-admin guard
  retained. Current capture/token and private-proof controls inspected.
- **Review/disposition:** **REVIEW FAILED / REMAINS OPEN**: section 3's paid
  activation boundary contradicts the package acceptance criterion. Dependencies
  B01/B03 and final actor changes; fix with B03, then direct API negative review
  and applicable release regression. Services/Explore feature work is excluded.

### B08 — Protected production database admission

- **Risk / claimed state:** unusable provider schema/permissions; AZURE ESTABLISHED,
  RAILWAY CUTOVER DEFERRED BY FOUNDER SPEND GATE.
- **Evidence:** [establishment](../../database-authority/evidence/b08-azure-establishment-2026-09-24.json)
  and [runtime/reference](../../database-authority/evidence/b08-azure-runtime-reference-2026-09-24.json):
  95 migrations through 0094, no incomplete attempts, equal model digest,
  enforced constraints/behaviour, separate runtime/worker identities and
  canonical-commercial-v4. Schema/model still match PR #580's CI artifacts.
- **Review/disposition:** **ACCEPT recorded establishment evidence; REMAINS OPEN
  for launch connectivity/admission.** No Azure connection was made in this audit.
  Railway's current writer remains TiDB. Owner: senior DB/release operator plus
  Edward's spend decision. Dependencies B02/B16 and approved exact network,
  runtime credential/cutover plan; final use joins B09/B12/B17/B18. Do not redo
  establishment or reopen the closed TiDB V1 experiment.

### B09 — Source data transfer or signed preservation disposition

- **Risk / claimed state:** lose real accounts, money, enquiries/audit or media
  during cutover; original inventory pending, omitted from newer snapshot.
- **Evidence:** [source identification](../../database-authority/evidence/b08-tidb-source-instance-confirmation-2026-09-24.json)
  explicitly says `sourceDataInventoried=false`, `readerProvisioned=false`,
  `directSourceConnectionVerified=false`; no later signed category disposition
  was found. Source identity is not a data census.
- **Review/disposition:** **REMAINS OPEN — no-transfer closure rejected.**
  Owner: Edward/data owner plus DB operator. Dependencies: approved read-only
  source inventory now, B08 target for transfer if needed, B18 final freeze.
  Classify retain/transfer/archive/disposable and obtain owner acceptance; prove
  required-record reconciliation, or signed evidence that transfer is unnecessary.

### B10 — Real account, invitation and billing email

- **Risk / claimed state:** account/payment/invitation communications never
  arrive; engineering pass, external-provider proof pending.
- **Evidence:** [engineering packet](evidence/b10-transactional-email-engineering-packet.md),
  current CI delivery integration 10/10, fresh policy 7/7; durable dedupe,
  attempt fencing and manual ambiguous-outcome reconciliation. September 24
  Resend domain-list 403 establishes only insufficient read permission; DNS
  records and configured key do not establish mailbox delivery.
- **Review/disposition:** **Accept bounded engineering evidence; REMAINS OPEN.**
  Dependencies B12 supervision/origins, B14 mailbox/operator and B15 approved
  sender/contact. Owner: delivery engineer/Edward. Obtain verified sending
  status, consented actual receipt/reply/bounce and link lifecycle evidence.
  Do not rotate a working sending key just to obtain domain-list permission.

### B11 — Durable public media and private payment proof

- **Risk / claimed state:** lost images or disclosed financial evidence;
  hosted guardrails pass, storage/spend gate remains.
- **Evidence:** [private-proof packet](evidence/b11-private-proof-readiness-2026-09-24.md),
  distinct bucket/key and no hosted local fallback; fresh configuration tests
  pass. Last provider inventory found only the public bucket and no proof vars.
- **Review/disposition:** **REMAINS OPEN.** Existing config code is accepted, not
  provider durability/privacy. Owner: release/storage operator, Edward for
  unapproved spend. Dependencies B12 origin and B15 retention commitments.
  Bind a dedicated private bucket/credential, then prove application upload,
  owner read, anonymous/cross-tenant denial, expiry, restart durability and recovery.

### B12 — Hosted runtime, sessions and shared abuse controls

- **Risk / claimed state:** real users cannot authenticate/use the paid service;
  contract/preflight prepared, hosted rehearsal pending.
- **Evidence:** [hosted contract](../../b12-hosted-runtime-contract.md), dated
  variable-only preflight; fresh launch-preflight tests pass. Current public
  observations remain readiness 503 and frontend version HTML. Redis-backed
  auth limiter reports healthy, but cache is memory; no multi-instance proof.
  Only API and Redis Railway services were observed.
- **Review/disposition:** **REMAINS OPEN.** Owner: release engineer. Dependencies
  B08/B11/B16 and B10/B13 service bindings. Resolve preview failure from logs;
  pin frontend/API/workers, prove hosted config, sessions/CORS/cookies, abuse
  behaviour and layered readiness. Do not equate a missing staging hostname
  alone with a mandated new paid staging database.

### B13 — Durable, actionable enquiries and supervised work

- **Risk / claimed state:** accepted enquiry disappears or nobody handles
  platform custody; local custody/recovery and attention exit prepared.
- **Evidence:** [custody runbook](16-first-cohort-lead-custody-recovery-runbook.md),
  `e43ea6af` worker nonzero attention result, current CI custody/lifecycle checks.
  A customer CRM row is not proof of external message delivery. Current Railway
  status does not show the contracted lead cron.
- **Review/disposition:** **REMAINS OPEN.** Owner: lead engineer/Edward.
  Dependencies B04–B06, B12 supervision, B14 operator, B17 alerting. Rehearse
  three-owner capture/custody/replay, recipient loss, crash/lease recovery,
  exhausted/unknown attention and staffed recovery with truthful acknowledgement.

### B14 — Staffed finance, moderation, support and escalation

- **Risk / claimed state:** money/intake waits without a capable operator;
  founder-only procedure and sales-window guard prepared.
- **Evidence:** [operating procedure](19-first-customer-operating-procedure.md),
  Edward's recorded first-10–20-customer model and daily weekday checks; current
  four sales-window tests pass; candidate CI payment-backed Agency walkthrough.
- **Review/disposition:** **REMAINS OPEN — hosted rehearsal/contact evidence.**
  Do not reopen the approved sole-operator decision merely for lack of a backup.
  Owner: Edward; dependencies B03/B10–B13/B15/B17. Prove actual queue handling,
  bank reconciliation/corrections, monitored contact, pause/expiry/renewal and
  existing-paid-access preservation. Add backup only if the bounded cadence fails.

### B15 — Approved disclosures and customer consent

- **Risk / claimed state:** customers pay under placeholders or unsupported
  data/support promises; approval draft prepared, approval outstanding.
- **Evidence:** [founder candidate](evidence/b15-founder-approval-candidate-2026-09-24.md)
  still contains unresolved contact/address/provider facts; browser data inventory
  records actual first-party analytics/drafts; global Google tag removed only
  in candidate source. No final approval or hosted legal/consent proof found.
- **Review/disposition:** **REMAINS OPEN.** Owner: Edward with legal/finance review.
  Dependencies B01/B14 and provider retention facts. Supply/approve real facts,
  publish versioned Terms/Privacy/payment/refund/dispute text and prove signup,
  payment/enquiry disclosures and mobile links. Drafting is not approval.

### B16 — Independent whole-candidate review and safe integration

- **Risk / claimed state:** deploy an unreviewed or inconsistent release;
  no-spend candidate with green GitHub checks but failed Vercel preview.
- **Evidence:** #580 exact source/tree/checks above; #578/#579 are ancestors,
  not three separate launch releases. Current audit supplies bounded decisions,
  including a material code finding and two incomplete journey evidence records.
- **Review/disposition:** **REVIEW FAILED / REMAINS OPEN.** Owner: independent
  senior/release owner. Dependencies corrected B03/B07, current B05/B06 proof,
  applicable hosted/owner evidence and preview diagnosis. Review the complete
  final delta, disposition applicable skips, obtain release/merge approval,
  record actual merge/tree and post-merge CI. This audit does not approve #580.

### B17 — Recovery, capacity and monitoring

- **Risk / claimed state:** lose accepted business or fail under normal load;
  probe/runbook prepared, continuous alerts and restore pending.
- **Evidence:** [monitoring contract](20-monitoring-and-recovery-contract.md),
  dated Railway baseline, Azure 14-day retention metadata; Azure artifact says
  independent restore not proven and no post-apply full backup observed then.
  These are not current backup freshness or measured recovery/capacity results.
- **Review/disposition:** **REMAINS OPEN.** Owner: release/DB operator and Edward.
  Dependencies B08/B09/B11–B14 and representative B16 artifact. Bind continuous
  independent alerts; prove restart/backlog/object recovery and disposable
  PITR/logical restore. Retain master-plan workload, 24-hour/two-peak/2×-peak,
  integrity/latency/credit/headroom and RPO/RTO acceptance unless explicitly
  revised through that authority. No new monitoring vendor is required.

### B18 — Exact-artifact paid acceptance and go-live

- **Risk / claimed state:** sell a product never proven with real services and
  staffed operation; checklist prepared, acceptance not executed.
- **Evidence:** [acceptance preparation](21-production-v1-acceptance-preparation.md)
  and local payment-backed Agency walkthrough; no production-bound three-actor
  acceptance, source reconciliation or explicit final GO found.
- **Review/disposition:** **REMAINS OPEN / NO-GO.** Owner: senior release reviewer,
  Edward and operators. Dependencies all remaining required gates. Preserve
  exact frontend/API/worker SHA, tree, config, target, migration/data state,
  real-provider/finance proof, recovery and operator approvals. Rehearse all
  actors plus buyers on desktop/mobile and failure paths; perform separately
  approved cutover with writes closed, then obtain explicit GO and first-customer
  smoke. No switch-back TiDB writer after Azure accepts authoritative writes.

## 5. Exact remaining execution path

| Order / parallel lane | Bounded work and exit evidence | Dependency |
| --- | --- | --- |
| 1 — shared engineering correction | B03/B07: deny unsupported product/owner at persisted billing boundaries; production-mode direct-route negatives and approved-product finance/expiry regression | Ready from this audit; preserve B01 |
| 1 — owner decisions in parallel | B08 static-egress/spend; B11 private storage cost; B14 monitored contact and rehearsal availability; B15 actual facts/final approval; B09 data-classification owner | Does not require Services or Explore |
| 2 — current actor proof | B05/B06 reproduce the later failures and record complete passes. Refresh B04 after shared changes; preserve accepted source/ID/draft fixes | Shared correction and exact candidate |
| 2 — source/release preparation | B09 approved read-only census and signed retain/transfer/archive/disposable decisions; B12 obtain Vercel failure logs, exact service/config plan | Can proceed alongside actor work |
| 3 — candidate integration gate | B16 whole-diff senior review, current CI and required browser proof, provider deployment containment, explicit merge/release decision and post-merge identity | Engineering/journey gates; provider activation remains closed |
| 4 — approved hosted setup/rehearsal | B08 safe network/credential binding; B10 real email; B11 private/public storage; B12 sessions/runtime/worker and cron; B13 custody/recovery; B14 single-operator rehearsal; B15 final customer pages | Exact reviewed artifact and explicit protected-operation/spend decisions |
| 5 — resilience acceptance | B17 independent alerts, restore/PITR/logical recovery and required capacity run; B09 transfer rehearsal/reconciliation where required | Representative hosted artifact/data/provider |
| 6 — final release | B18 all-three-actor and buyer acceptance, final source freeze/reconciliation, pinned production artifact/config, writes-closed smoke, Edward's GO and monitored first customer | Every required open gate resolved |

These are decision gates, not permission to perform protected actions. Provider
preparation may run alongside engineering; none should wait on unrelated
product work. No defensible launch date can be derived until owner/provider
waits, source-data scope and the required capacity window are resolved.

## 6. Reduced launch remainder and next assignment

The status vocabulary in the central table distinguishes a reproduced defect
from missing evidence, manual action, hosted verification and dependencies.
B01's existing policy closure is retained; **B02 and B04 are accepted in this
review**. B03/B07 fail code review; B16 fails whole-release acceptance because
of those findings and unresolved evidence. B05/B06 are **EVIDENCE INCOMPLETE**,
not diagnosed product failures. All eighteen packages received an explicit
review here; a pending external decision is not substituted by senior approval.

| Remaining work category | Packages and concrete reason |
| --- | --- |
| Engineering | B03/B07: enabled-release product-less billing bypass. B05/B06: diagnose/rerun incomplete joined proof; implementation changes only if reproduction shows a defect. |
| Payment/billing | B03 persisted-plan/owner rejection; B11 private proof; B14 real bank reconciliation and correction rehearsal. |
| Database | B08 safe Azure runtime connectivity/admission; B09 source disposition and reconciliation; B17 recovery/capacity. |
| Hosted/runtime verification | B10 actual mailbox delivery; B11 real private/public object behaviour; B12 artifact/config/session/runtime proof and preview diagnosis; B13 supervised lead work; B17 alerts. |
| Legal/commercial/manual | Edward's B08/B11 spend decisions, B09 data decisions, B14 actual monitored contact/availability and B15 final approved facts/disclosures. B01 is already closed. |
| Operational rehearsal | B10 ambiguous/bounced delivery; B13 custody recovery; B14 sole-operator queues and sales-window absence; B17 restore/restart/load. |
| Integration/activation | B16 final review/merge and post-merge evidence; B18 real three-actor acceptance and explicit GO. |

**Consolidation:** the single product-less-gate correction serves B03 and B07;
do not open two implementation projects. B10/B12/B13 can share one supervised
worker/cron rehearsal, and B08/B09/B17/B18 can share a governed release packet,
while retaining distinct acceptance checks. #578/#579's incorporated history is
not extra implementation work alongside #580. No B-number is removed merely
because another package supplies its evidence.

**Outside the gateway:** Services V1/#581, Explore product work, general lint
warnings/refactoring, analytics expansion, automatic card/recurring payments,
Developer self-service team expansion, a nominal backup operator and a new
monitoring vendor. None was established as independently necessary for the
paid core. The ordinary supersession-suite skip is resolved by its separate
executed CI stage. An archive-only preflight diagnostic is not a blocker.

**Next single blocker: B03 — payment/activation containment.** Give it the
bounded section 3 correction and production-mode negative verification. B07
consumes that correction as shared evidence. This must precede final paid-loop
reacceptance and activation: a release switch that can admit an unsupported
commercial plan is a direct money/entitlement risk. After B03, proceed to B05
current Agency proof, then B06 current Developer proof, and complete B07's final
security acceptance before B16. The owner/provider preparation lane may supply
inputs during that sequence; it does not authorize infrastructure mutation.

## 7. Review limits and handoff

This was review/reconciliation, with document/evidence changes only. No runtime,
schema, migration, provider setting, paid activation, mainline merge or external
message was changed. Protected reads were limited to Railway status and public
HTTPS diagnostics; no direct Azure/TiDB SQL connection was opened. No secrets,
proof objects, mail tokens or recipient captures are included in this packet.

Do not repeat accepted B01 policy work, B02's repaired fixture or B04's established
application fixes merely because their integration is pending. Conversely, do
not carry B03/B05/B06/B07 as closed into the next phase. B08 establishment,
B10 engineering and B11 guardrails are valuable accepted partial evidence;
their remaining external conditions are explicit above.

The new authority is reviewable on the named audit branch. Until integrated,
published main still has the older register. Any later source, configuration,
provider or founder decision requires updating the affected dispositions and
their evidence; it does not retroactively change this snapshot.
