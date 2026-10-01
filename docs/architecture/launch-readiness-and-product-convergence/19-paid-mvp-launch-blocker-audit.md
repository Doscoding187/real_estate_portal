# Paid MVP launch: ranked blocker audit and execution handoff

Date: 2026-09-17. Status: audited launch-closure plan; not launch approval.
Product decision: Edward clarified that the MVP must let **independent agents,
agencies and their members, and developers do real paid business**. An invited
agency-only pilot or preparation-only signup release does not satisfy this goal.
Service providers and Explore may wait. Staffing and the latest affordable
launch date have not yet been supplied.

## 1. Senior conclusion

**We cannot yet tell any of the three stakeholder groups that their complete
paid journey is launch-ready.** There is substantial reusable implementation,
not evidence that the product must be rebuilt. Normal runtime deliberately
blocks commercial activation; the strongest browser proof substitutes a local
test entitlement for payment. Hosted CI also has a concrete fresh-scenario
failure. Production infrastructure, delivery, recovery and operating evidence
remain separate gaps.

The finish line is: each paying stakeholder can join, be verified/approved,
pay through the approved process, receive the correct entitlement, publish
valid inventory, receive an accurately attributed enquiry, and follow up;
the business can operate, support and recover that service. Buyers/renters
are necessary counterparties to that value loop, even though they are not the
three paying audiences. No promise of guaranteed traffic, enquiries or sales.

Recommendation: finish the existing canonical **manual-EFT → proof → finance
verification → fixed-term Launch Access** model first. Do not add card checkout,
recurring billing, a second billing system or a new analytics platform merely
to launch. This recommendation requires Edward's operational confirmation;
manual EFT is real payment, but payment proof alone is not verified money.

This is a dependency-aware execution queue, not another launch-disposition
authority. The [central launch register](03-launch-register.md) remains the
sole disposition authority; the [transition master plan](../database-transition-and-launch/master-plan.md)
retains its release gates. `B01`–`B18` below are work-package numbers, not new
LRC issue IDs. No protected access, spending, migration, activation, merge or
deployment is authorized by this document. Approve bounded implementation
assignments and reconcile their outcomes into those existing authorities.

## 2. Evidence snapshot and limits

Inspected source: MVP PR head `f0ba2c6030070e5b1d81552c7ad6078bb0663d46`;
executable candidate `d61eb2c37940ecf3ed1946d45400818df65dd7f9`, tree
`3b1744d5f0eb53a6caca5196899da4290419e294`. Remote integration base was still
`4e012b3044628fc06da7489c0055e9ce01bdc8d9` during this audit. This document is
isolated on `docs/launch-blocker-audit`, based on that integration commit;
it does not change the tested MVP branch.

| Evidence | Observed result | Boundary |
| --- | --- | --- |
| [PR 578](https://github.com/Doscoding187/real_estate_portal/pull/578) | Draft; blocked. | No whole-branch approval or integration. |
| [CI run 35181998860](https://github.com/Doscoding187/real_estate_portal/actions/runs/35181998860) | DB Contract Verification failed at `db:scenario:verify`, 04:29 UTC on September 17: `Development not available for public enquiries.` | Lint/typecheck, unit/integration and application build jobs were skipped, not passed. Root cause is not yet diagnosed. |
| Frontend checks and Vercel status | Frontend builds and Vercel status succeeded. | Automatic preview status is not backend readiness or production acceptance. |
| [Senior correction record][corrections] | Local full suite: 648 files / 4,291 tests passed; 9 files / 67 tests skipped. Typecheck, lint, build, authority passed; both Chromium suites 10/10. | Local proof on one exact candidate; not bank settlement, real email or hosted acceptance. |
| Local billing tests in that run | S4 integration 5 tests, S4 contracts 6, billing foundation 2, billable-account integration 3, agent journey 1 and developer prepayment approval 1 passed. | Component/service proof exists. It is not three complete paid browser journeys. |
| Local authority status | Owned disposable fingerprint `4f437bfb3c64ad31c6d4232324cc7625e38692d155ba893c3e6d319089b3fb2b`; head `0090`; congruent; no incomplete attempts. | No protected database queried for this audit. No database initialized or mutated. |

Source findings below are static inspection unless an execution is explicitly
named. Missing hosted evidence means **unverified**, not necessarily missing
implementation or broken infrastructure. Historical reports are not current
failure claims: for example, current credential verification now calls
`assertIsolatedCiGrants` and probes additional denials; do not reimplement the
older merge-readiness report's grant gap without checking current code.

Important skipped coverage: the 13-test developer supersession suite is skipped
in the ordinary local run; hosted CI has a separate `S2_DB_TESTS=1` stage, which
must actually execute. The other skips include Explore suites, agency
canvassing, property-schema and trending-suburb properties. B07/B16 require a
per-file Live/deferred disposition; aggregate test counts cannot waive them.

### Can these customers do business today?

| Journey | Reusable evidence | Remaining paid-launch gap |
| --- | --- | --- |
| Independent agent | Registration/verification, profile/coverage/private preparation; local entitlement/listing/lead and billing service tests. | Real payment-to-activation-to-publication-to-enquiry browser and hosted proof, including expiry and billing correction. |
| Agency and member | Owner setup; canonical invitation/membership; local member publication/review/discovery/enquiry/follow-up browser continuity. | Agency payment/finance activation and actual invitation delivery replace the explicit test term and database-read token; host verification and revocation. |
| Developer | Registration, pending organisation, private project draft, reviewer-approved public brand without project entitlement; canonical billing services. | Complete paid organisation → development/unit publication → public enquiry → developer follow-up; current fresh-scenario CI rejection resolved. Brand approval is not publication. |
| Buyer/renter | Local discovery, detail, enquiry and durable custody checks. | Hosted mobile/desktop discovery with real inventory/media, consent, truthful acknowledgement, correct recipient and real follow-up. |

## 3. Ranked blockers: highest impact first

Rank means customer/revenue risk and leverage, **not** “wait for every earlier
row before starting.” Dependencies and parallel lanes below govern execution.
Every row is required for this three-audience paid launch unless an explicit
scope decision records a safe alternative. Lower-ranked does not mean optional.
Effort is focused engineering person-days, excluding owner/provider wait;
ranges are planning judgments, not measured task estimates or promises.

| Rank | Blocker | Current state | Accountable role | Effort |
| --- | --- | --- | --- | --- |
| B01 | Approve the actual paid offer and launch boundary | Owner decisions outstanding | Edward + product/finance | 0.5–1 |
| B02 | Repair and pass the fresh hosted CI contract | Confirmed failing execution | Junior + senior DB review | 1–2 |
| B03 | Complete payment, finance, activation and expiry for all three | Implemented foundations; normal runtime disabled | Billing engineer + finance owner | 3–5 |
| B04 | Independent-agent paid value loop | Partial/local evidence | Product engineer | 1–3 |
| B05 | Agency paid value loop and genuine invitation delivery | Fixture-assisted local continuity | Product engineer | 1–3 |
| B06 | Developer paid value loop | Preparation proof; paid end-to-end gap | Product engineer | 2–5 |
| B07 | Security, revocation and deferred-surface containment | Local corrections; final release proof outstanding | Senior reviewer + engineer | 1–3 |
| B08 | Admit and establish the protected production database | Provider/security release evidence unverified | Senior DB/release operator | 2–4 |
| B09 | Decide and prove required data transfer/preservation | Protected inventory not evidenced here | Data owner + DB operator | 1–3, then re-estimate |
| B10 | Real account, invitation and billing email | Local sink proof only | Delivery owner + engineer | 1–2 |
| B11 | Durable public media and private payment documents | Local functionality; hosted storage unverified | Release engineer | 1–2 |
| B12 | Hosted runtime, domains, sessions and shared abuse protection | Configuration code, not hosted acceptance | Release engineer | 1–2 |
| B13 | No lost enquiries: custody, delivery and supervised work | Local CRM/replay proof; operational proof missing | Engineer + lead-operations owner | 1–3 |
| B14 | Staffed approval, finance, support and escalation | Durable queues; ownership incomplete | Edward + operations | 0.5–2 |
| B15 | Approved customer-facing terms, privacy and payment disclosures | Draft/placeholder pages confirmed | Edward + legal/finance owner | 0.5–1 plus owner review |
| B16 | Independent whole-branch review and safe integration | Draft, CI failed, not merged | Independent senior + release owner | 1–2 |
| B17 | Backup/restore, capacity, monitoring and recovery | Governing criteria exist; target results unverified | Release/DB operator + Edward | 2–4 plus 24-hour run |
| B18 | Exact-artifact paid acceptance and final go-live | Not performed | Senior + Edward + operators | 1–3 |

### B01 — Agree what customers are buying and who operates it

- **Finding/mechanism:** runtime is `preparation_only`; commercial policy is a
  release decision, not something provider credentials enable. The S4 revenue
  contract already records Agent R499, Agency R999 and Developer R1,499 once-off
  for 90 days, no auto-renewal, with canonical entitlements. These are repository
  product records, not a newly approved public offer or tax opinion.
- **Sequence / work:** Edward confirms the three offers, payment method, legal
  seller, bank recipient, tax/invoice wording, refund/dispute treatment, activation
  turnaround, expiry/renewal communications, launch geography/property classes,
  supported capabilities and named finance/reviewer owners. Record Live/Pilot/
  Hidden decisions in the central register before enabling routes.
- **Done:** one signed-off commercial matrix matches catalogue, invoice, finance
  procedure and all three public entry journeys; no unsupported “full platform”
  promise. Independent agents and agencies are distinct commercial owners;
  agency members are not forced to buy duplicate personal access.
- **Evidence/boundary:** [commercial source][commercial],
  [activation constant][activation]. Existing price metadata does not authorize
  payment collection. Dependencies: none. Owner decision due at the start,
  while B02 and non-mutating infrastructure preparation proceed.

### B02 — Clear the actual CI failure, not just the dashboard

- **Finding/mechanism:** fresh hosted schema/data preparation reaches
  `db:scenario:verify`; its development enquiry is rejected. The same message
  is emitted for development ineligibility or unresolved custody, so the log
  does not yet identify which condition failed.
- **Sequence / work:** reproduce the named consumer contract on an authorized
  disposable target; trace the seeded development, publisher/organisation,
  commercial eligibility and recipient custody. Fix the stale fixture or real
  consumer defect identified by evidence. Do not broaden public eligibility,
  insert legacy fields, skip the scenario or set a deployed test bypass.
- **Done:** fresh MySQL 8.4 CI completes consumer verification, semantic grants,
  CHECK/FK/lifecycle tests and all dependent jobs; preserve run URL, actual
  checkout SHA (including synthetic merge ref), head/base and artifacts.
- **Evidence/boundary:** [failed run][ci], `publicLeadCaptureService.ts` and
  `searchToLeadScenario.ts` at the inspected head. Root cause/effort may change
  after reproduction. Dependencies: none; this is the first engineering task.

### B03 — Make payment lead to correct, auditable service

- **Finding/mechanism:** `billingFoundationService` contains invoice, proof,
  finance review and lifecycle operations, but `requireCommercialActivation`
  rejects them in normal runtime. Passing Vitest fixtures bypass that policy
  only in test. Payment proof must not itself activate access.
- **Sequence / work:** after B01, review and complete the canonical payable
  flow for each owner type: correct invoice/amount/currency → actual EFT
  reconciliation → private proof → authorized finance decision → exactly one
  correctly owned paid term → usable entitlement. Include rejection/correction,
  partial/unmatched/duplicate payment, concurrent approval, replay, wrong owner,
  expiry, cancellation/refund handling and restoration where supported.
- **Done:** tests plus recorded finance rehearsal prove all three owner types,
  exact term boundaries and no double credit or privilege grant. A documented
  manual reconciliation/refund process is acceptable if approved and auditable;
  a new refund engine is not automatically required. Finite-term expiry must
  truthfully stop new paid activity without destroying existing customer records.
- **Evidence/boundary:** [billing implementation][billing], [S4 contract][commercial].
  Dependencies: B01; real hosted proof also needs B08/B10/B11/B14/B15. Review
  every retained UI/route awakened by activation; do not merely flip the global
  flag and assume deferred audiences or recurring products remain closed.

### B04 — Prove the independent agent earns usable product value

- **Finding/mechanism:** local preparation/browser and service tests exist,
  but they do not prove a new paying independent agent's complete experience.
- **Sequence / work:** public Agent entry → correct account → real verification
  → profile and canonical coverage → approved payment → activation → persistent
  property draft/media → correction/review/publication → anonymous search/detail
  → enquiry → the same agent's lead workspace → contact and next action.
- **Done:** one continuous browser record uses the same account, billable owner,
  invoice, listing and lead; repeat key steps on mobile. Test rejected listing
  correction, withdrawn exclusion, unpaid/expired denial and unrelated-agent
  non-disclosure. Returning sign-in resumes the right task.
- **Evidence/boundary:** [candidate packet][packet],
  `integration.agent-launch-journey.test.ts`; existing isolated entitlement is
  not payment evidence. Dependencies: B03; shares B07/B10–B13 and B18 acceptance.

### B05 — Prove an agency can pay, onboard members and operate

- **Finding/mechanism:** the current 10/10 operating journey explicitly supplies
  a disposable term and reads a queued invitation token from the local DB.
  That is good membership/publication proof, not customer activation/delivery.
- **Sequence / work:** owner registration/verification → agency approval/setup
  → agency-owned payment/finance activation → actually delivered invitation →
  verified invitee acceptance → canonical membership → member publication →
  public enquiry → agency/assigned-member custody → follow-up/reassignment.
- **Done:** no SQL/test entitlement or token extraction; correct recipient email,
  refreshed session and one membership. Prove stale/expired/wrong-user invitation
  denial, suspension/removal after login, old media-token denial, no cross-agency
  access, and no extra personal purchase. Existing lead custody after term expiry
  follows its canonical policy rather than disappearing.
- **Evidence/boundary:** [candidate packet][packet] and [senior corrections][corrections].
  Dependencies: B03/B10/B14; final hosted proof B18. Do not rebuild the already
  corrected membership model or treat a retained profile affiliation as authority.

### B06 — Prove the developer's distinct paid product, not just a brand page

- **Finding/mechanism:** approved professional presence and a private project
  draft are proven locally. They deliberately retain `missing_launch_access`.
  Current CI separately demonstrates a development enquiry acceptance failure.
- **Sequence / work:** developer account/verified email → correct organisation
  and approved first-party publisher → developer-owned invoice/payment/finance
  term → project, unit types, inventory and media → review/publication → public
  development and unit detail/search → enquiry → correct developer workspace
  → contact/next action. Preserve identity across organisation, publisher,
  development and unit; none is interchangeable with login user ID.
- **Done:** a continuous positive paid browser journey plus wrong-organisation,
  unapproved/unpaid/expired, withdrawn development, duplicate enquiry and
  publication-correction negatives. Prove the promised portfolio entitlement.
  Audit existing developer billing coverage before claiming feature absence.
- **Evidence/boundary:** `developer-journey-architecture.md` is a domain map, not
  current runtime proof; [packet][packet], [commercial][commercial] and [CI][ci]
  are the current scoped evidence. Dependencies: B02/B03 and shared provider gates.
  Developer multi-user teams/distribution need not launch unless sold in B01.

### B07 — Close security and containment on the actual paid release

- **Finding/mechanism:** membership, owner, media and Land corrections pass
  locally. Paid activation exposes retained routes that preparation-only tests
  alone cannot accept. Unselected products must not acquire live write paths.
- **Sequence / work:** build a route/worker inventory for Live and deferred
  capabilities; test direct APIs as anonymous, wrong role, wrong tenant,
  suspended/removed member and stale session. Include finance/reviewer powers,
  invoice/proof access, developer ownership, public data minimization, token
  replay, upload validation and abuse controls. Check activation's blast radius.
- **Done:** no open L0/L1 security or integrity defect; corrected regressions run
  against the final integrated release. Deferred navigation, APIs and workers
  have an explicit safe state. No production test markers or mock-email mode.
  Dispose of skipped Live coverage by running or replacing equivalent tests,
  not by quietly relabelling it optional.
- **Evidence/boundary:** [corrections][corrections], LRC-MEM/GEO/AUTH/LAND/COMMERCIAL.
  Dependencies: B01/B03 and journey changes. Land remains deferred under its
  current contract; enabling it is a separate reviewed scope expansion, not
  an automatic consequence of enabling paid agents/developers.

### B08 — Prove the launch database and its permission boundaries

- **Finding/mechanism:** local/MySQL CI evidence does not admit the selected
  Azure production resource, actual engine, TLS, grants or physical constraints.
  Existing control-plane implementation must be reused, not recreated.
- **Sequence / work:** senior reviews G1/G2 and migration dispositions; identify
  exact protected resource/engine/fingerprint and approved budget; authorize
  read-only planning; review accepted/expected heads, digest and attempts;
  separately authorize establishment/apply; verify independently with public
  traffic closed. Provision canonical reference/foundation data only through
  protected release paths, never disposable scenario adapters.
- **Done:** canonical head, zero incomplete attempts, congruent enforced
  CHECK/FK/lifecycle behaviour, verified required data and least-privilege
  runtime/worker/migration/verifier identities; actual denied operations and
  normalized grants retained. No migration credential in application settings.
- **Evidence/boundary:** master plan WP1/WP2/WP5, G1/G2/G4; current CI identity
  verifier already implements semantic comparison. Dependencies: B02/B16 before
  protected establishment, B01 budget/owners. Junior prepares; named senior
  operator executes approved protected operations. No cloud admission claimed here.

### B09 — Resolve old data before it becomes a launch surprise

- **Finding/mechanism:** the master plan requires TiDB inventory/classification,
  required-data reconciliation and controlled cutover. No current protected
  census or “there is nothing to migrate” decision was supplied to this audit.
- **Sequence / work:** obtain read-only source approval; inventory required
  accounts, inventory, financial/lead/audit records and media references; owner
  classifies retain/transfer/archive/disposable; prepare deterministic mapping
  and rehearsal, quarantined rejects, writer census and final reconciliation.
- **Done:** every required record/category has a signed disposition; rehearsal
  and final frozen-source reconciliation have no unexplained loss. If no business
  data needs transfer, evidence and owner approval formally remove that work;
  do not assume an empty source. Never transfer old schema or migration ledgers.
- **Evidence/boundary:** master plan WP4/WP8. Dependencies: B08 target model;
  inventory/preparation can start earlier with exact approval. The 1–3 day range
  is discovery/preparation only if data is simple; findings may materially change
  the forecast. Final cutover belongs to B18, retirement is post-launch.

### B10 — Deliver real email, not local verification links

- **Finding/mechanism:** local browser tests use a private email sink; deployed
  unconfigured email correctly fails closed. Real mailbox delivery is unproven.
- **Sequence / work:** owner supplies provider account, authenticated sender
  domain, monitored reply/bounce route and secret owner; configure through the
  approved release path; exercise verification/resend/reset, agency invitations
  and promised invoice/activation notifications with consented recipients.
- **Done:** record provider acceptance and actual receipt separately; links use
  the correct public HTTPS origin; replay/expiry/return paths work; failure,
  bounce and retry are visible and handled without duplicate side effects or
  account enumeration. No tokens/secrets in evidence. Invitation timing follows
  lawful agency activation, not signup.
- **Evidence/boundary:** `emailService`, `launchPreflight`, LRC-AUTH/INVITE;
  [packet][packet]. Dependencies: B01/B12 and owner domain access; preparation
  starts immediately. DNS/provider wait is not junior coding time.

### B11 — Keep listings durable and payment proof private

- **Finding/mechanism:** preflight requires production public-media S3 and
  private billing-proof storage. A local image upload is not durable cloud proof.
- **Sequence / work:** approve bucket/account/credential ownership and isolation;
  validate listing photos, developer images/documents, agency branding and
  invoice proofs through real application flows; restart/redeploy and re-read.
- **Done:** public approved media remains available; private proof/attachments
  cannot be fetched anonymously or by another tenant; upload/confirmation MIME,
  size and custody checks hold; signed access expires; no development bucket or
  local filesystem is a production authority. Retention/removal ownership is
  recorded; preserved financial evidence is not deleted by a cleanup shortcut.
- **Evidence/boundary:** `launchPreflight.ts` storage checks, listing custody
  regressions and billing document routes. Dependencies: B01 provider budget,
  B12 hosted origin; B03/B04–B06 consume this capability.

### B12 — Make the real frontend/backend environment work safely

- **Finding/mechanism:** `railway.json`, `vercel.json` and launch-preflight code
  define intended deployment, not current provider branch settings or runtime
  configuration. Preflight requires Redis-backed shared auth rate limiting.
- **Sequence / work:** obtain read-only provider/source/auto-deploy evidence;
  prepare exact frontend/backend commit bindings, HTTPS/DNS/API origin, CORS,
  secure cookie/session, trusted proxy, secrets, shared limiter and health/
  layered readiness. Separate liveness from database/data/application readiness.
- **Done:** production preflight and real cross-origin login/logout/reset work;
  multi-instance abuse limiting and dependency failure behave safely; frontend,
  backend and workers identify the approved artifact and target. No credential
  URL in logs; no accidental production deployment caused by an uncontained merge.
- **Evidence/boundary:** inspected configuration and `launchPreflight.ts`;
  Vercel preview success proves less than this. Dependencies: B08 for complete
  readiness, B16 before production promotion; settings inspection starts early.

### B13 — Make every accepted enquiry recoverable and actionable

- **Finding/mechanism:** local capture/CRM/replay tests pass. The lead worker is
  one-shot and expects a deployment supervisor; unsupported channels go to
  attention-required rather than proving external delivery.
- **Sequence / work:** for agent, agency and developer enquiries, prove consent,
  inventory eligibility, canonical custody, idempotent replay and durable CRM;
  exercise recipient absence/removal, provider failure, worker crash/restart,
  lease expiry, retry exhaustion and recovery. Register/supervise only the
  required jobs; use approved provider adapters or explicit staffed fallback.
- **Done:** accepted enquiries are never silently lost, duplicated or sent to
  another tenant; promised delivery matches actual state. Backlog/attention
  has an alert and operator, acknowledgement is truthful, and contact/follow-up
  survives reload/restart. If CRM plus manual handling is the launch promise,
  staff it and state it; do not pretend email delivery succeeded.
- **Evidence/boundary:** `runLeadDeliveryWorker.ts`, `publicLeadCaptureService`,
  LRC-LEAD/AGY and master-plan worker criteria. Dependencies: B04–B06/B10/B14;
  hosted operational proof also B08/B12/B17.

### B14 — Staff the work the software deliberately hands to people

- **Finding/mechanism:** persisted assisted intake exists, but a queue is not a
  monitored service. Agency verification in the browser proof uses an
  authenticated reviewer API; the mounted agency-management page has no such
  control in that evidence.
- **Sequence / work:** name primary/backup for identity/organisation review,
  listing moderation, bank reconciliation/finance review, support and lead
  recovery. Specify working hours, response targets, reply channel, escalation,
  rejected-content/payment correction and outage handling. Train operators on
  existing authorized UI/API; do not invent a broad admin console project.
- **Done:** synthetic customer case goes through acknowledgement, actual review,
  reply, escalation and closure with timestamps/audit trail. Operators have
  individually authorized accounts, usable procedures and a backup; no shared
  super-admin secret or direct SQL activation. Capacity matches the sold SLA.
- **Evidence/boundary:** LRC-SUPPORT and candidate packet's reviewer limitation.
  Dependencies: owner appointments now; tools B03/B10/B13. Staffing is an Edward
  dependency, not something the junior can close by writing documentation alone.

### B15 — Replace drafting instructions with approved disclosures

- **Finding/mechanism:** `NavLandingPage.tsx` serves `/terms` and `/privacy`
  via legal-page aliases. Terms explicitly say full legal copy is not finalized;
  privacy text says what the content should explain, rather than making final
  operator commitments.
- **Sequence / work:** Edward/legal/finance approve operator/contact identity,
  offered service and limits, prices/tax/term, payment-verification delay,
  cancellation/refund/dispute process, listing rights, lead sharing/consent,
  privacy/retention/deletion and communication commitments. Junior implements
  approved text and consistent links/versioning, not legal guesses.
- **Done:** all three signup/payment flows and buyer enquiry have the correct
  disclosures and required recorded consent; mobile links work; staff can fulfil
  stated deletion/support commitments. No placeholder support address.
- **Evidence/boundary:** direct page inspection and LRC-SUPPORT. This audit is
  not legal advice or a compliance certification. Dependencies: B01/B14;
  content approval is external elapsed time and must start immediately.

### B16 — Review and integrate one coherent release

- **Finding/mechanism:** PR578 is a consolidated draft, not approved or merged;
  source fixes are not on the integration base. Older register summaries predate
  final local tests, so they must not reopen already-corrected defects by mistake.
- **Sequence / work:** fix B02; independent senior reviews the entire base-to-head
  delta and paid-release additions, not only last commits. Refresh main, resolve
  current-head findings, disposition skips, confirm deployment containment,
  obtain merge approval, record actual merge/tree and post-merge required checks.
- **Done:** clean reviewed exact release, hosted checks green, no unresolved
  scope-blocking findings, traceable code/schema/data authority and artifacts.
  Update central register with integrated evidence, leaving hosted fields open
  until genuinely verified. Documentation plans need not trigger repeated full
  runtime tests; executable changes invalidate affected frozen-candidate evidence
  under the review packet's complete-check rule.
- **Evidence/boundary:** [PR578][pr], [packet][packet], master-plan G3.
  Dependencies: B02 and final Live changes B03–B07; inspection/review preparation
  happens in parallel. No merge authorization is supplied by this audit.

### B17 — Demonstrate recoverability and acceptable operating capacity

- **Finding/mechanism:** master-plan Azure recovery/capacity conditions remain
  required; no fresh target-bound results were obtained in this audit.
- **Sequence / work:** owner accepts budget/workload and recovery objectives;
  approved operator proves independent restore, PITR and logical-backup recovery,
  secret rotation, restart/reconnection, application rollback compatibility,
  alerts and supervisor recovery on authorized isolated restored targets.
  Run the required 24-hour workload with two peaks and a 30-minute 2× peak.
- **Done:** attach measured results against every master-plan threshold,
  including zero lost/duplicate accepted outcomes, <0.1% unexpected errors,
  latency/connection limits, backlog drain ≤15 minutes and recovery objectives.
  Proposed recovery targets remain in-region RPO ≤15 minutes/RTO ≤4 hours,
  regional ≤24 hours, with 14-day automated retention and independent backups.
  B1ms is conditional, not pre-approved; review actual credits/memory/headroom.
- **Evidence/boundary:** master-plan WP6/G5. Dependencies: B08/B09/B12/B13 and
  representative final artifact. Do not silently shorten the test or lower
  criteria to meet a date. A failure calls for bounded correction/retest or an
  explicit reviewed change, not a provider workaround. Calendar waiting is
  unavoidable but does not require continuous agent narration.

### B18 — Accept the paid product on the exact artifact and open deliberately

- **Finding/mechanism:** no current record proves all three paid customer loops
  on the production-bound release with actual services and staffed operations.
- **Sequence / work:** assemble B01–B17 evidence; obtain Stage-2/cutover review;
  rehearse all three paid flows and buyer enquiries on the approved hosted
  artifact, desktop and mobile. Use approved consented participants and real
  finance verification for payment acceptance, not SQL entitlements. Any live
  payment/test transaction or cleanup requires its own approved procedure.
  Freeze writers, capture/import/reconcile required source data, pin all
  processes, verify production with public writes closed, then request Edward's
  explicit GO before opening writes and enabling the approved jobs.
- **Done:** all Live journeys pass; no L0/L1 unresolved; finance/moderation/
  support staffed; exact SHAs, targets, configs, recovery route, alert owners,
  customer offer and GO recorded. Run first-customer smoke immediately after
  opening; pause intake if money, isolation, inventory or lead integrity fails.
  Name an owner for a weekly customer-learning review using existing records:
  paid activation, time to first published inventory, enquiries received,
  follow-up completion, support failures and customer feedback for each audience.
  This is an operating checklist, not a prerequisite to build new analytics.
- **Evidence/boundary:** master-plan G6/G7 and this three-stakeholder acceptance
  matrix. Dependencies: every prior required blocker. After Azure accepts
  authoritative writes, no switch-back writer on TiDB. Local fixtures, hosted
  previews and “works on my machine” cannot close this item.

## 4. Execution order that minimizes elapsed time

Do not serialize the table blindly. Start four lanes immediately, with named
people; these are work assignments, not instructions to create more agents.

| Lane | First work | Then | Must converge before |
| --- | --- | --- | --- |
| Product/revenue engineering | B02 fresh-CI diagnosis; B03 payment-path review after B01 | B04/B05/B06 complete stakeholder loops; B07 security | B16 final integration |
| Owner/operations | B01 commercial matrix; B14 staffing; B15 approved content | B10 sender/provider access; finance/support rehearsal | Paid hosted acceptance |
| Release/data | Read-only deployment inventory; approved B09 source inventory; B08 plans | After admission/integration and exact approvals: B08 establishment, B11/B12 services, B13 supervision | B17 recovery/capacity |
| Independent senior | Review current evidence, CI diagnosis and payment/security design | B16 exact-head review; provider/data/restore approvals | B18 explicit go/no-go |

Critical path: B01/B02 → B03 + B04/B05/B06/B07 → B16 → B08/B12 operational
candidate → B17 → B18. B09/B10/B11/B14/B15 can become the critical path if
ignored; start their owner/provider lead times now. Reuse shared billing,
identity, media and lead fixes across all three journeys. Do not add their
shared work three times to the schedule.

### First two working days

1. Edward confirms B01, names finance/support/release owners, supplies staffing,
   deadline, provider access and budget ceiling. No credentials in tickets.
2. Junior reproduces B02 and returns the causal trace and bounded fix; senior
   reviews it. Keep CI contracts intact. Do not start a schema redesign.
3. Engineer performs a paid-path gap walkthrough for all three audiences and
   turns B03–B06 into named, testable tasks, explicitly separating existing code
   from missing behaviour and missing proof.
4. Release operator inventories provider/auto-deploy/data state under the
   required read-only approvals; request legal/email/storage decisions now.
5. Senior publishes a revised forecast from these facts. Any task forecast above
   two days gets an explicit sub-checkpoint and blocker owner, not silent drift.

### Time and budget forecast

These are provisional ranges based on the inspected evidence, **not a promised
launch date**. Assumptions: reuse the manual-EFT model, no new provider/Explore/
Land scope, timely owner decisions, available approved cloud resources, no
large source-data remediation and no major security/paid-journey redesign.

- Plan approximately **25–40 focused engineering person-days**, plus independent
  senior/release/operator work and external approvals. This is a deduplicated
  planning allowance within the broad per-row ranges, not a completed estimate.
- With **two full-time capable engineers**, daily senior review and a release
  operator/Edward available in parallel: target **4–6 working weeks**.
- With **one junior and intermittent senior/release help**: budget approximately
  **6–10 working weeks**; owner/provider delays can push beyond it. Do not plan
  as if one junior can safely replace the protected-release operator.
- A reliable **one-week full paid launch is not supported by current evidence**.
  Conversely, the audit does not establish a need for another three-month rebuild.
- Within two working days, replace these assumptions with actual task owners,
  capacity, remaining gaps and dates. At the end of week one, compare burn,
  closed evidence and critical path with the affordable deadline. If they do not
  fit, Edward chooses staffing, approved operational simplification or explicit
  scope/date change; no silent downgrade to agency-only or signup-only.

The mandatory 24-hour capacity test is an elapsed-time floor within B17, not
24 hours of continuous engineering attention. TiDB's 14-day read-only retention
is **after opening**, so it does not add 14 days before the first customer.
Bank/domain/legal/provider access lead time is not controlled by the junior.

Budget worksheet: approved engineering days × actual daily cost + senior/release
time + temporary test/restore resources + recurring hosting/email/storage +
legal/operations + contingency. Edward supplies rates and cash ceiling; this
audit neither quotes provider prices nor authorizes expenditure. Review the
forecast weekly, not after the budget is exhausted.

## 5. What must not delay this launch

Keep service-provider marketplace and Explore deferred as Edward requested.
Propose retaining current deferral of Land, paid placement/boosts, distribution/
referral expansion, sophisticated campaign tooling, roadmap AI and benchmarking,
developer multi-user collaboration not sold in B01, and new recurring/card
checkout. Confirm exact Live capabilities in B01; existing shared security/data
obligations still apply even to hidden features. “Hidden” is not just no menu link.

Do not spend launch time clearing all 11,460 lint warnings, redesigning the
whole interface, creating a second billing/analytics authority or completing
every dashboard. A warning becomes a launch blocker only when linked to a
measured Live-path security, correctness, accessibility or performance failure.
Mobile completion of the core journeys is not optional polish.

Do not reopen locally fixed membership/media rollback defects as new feature
work. Their remaining burden is integration, regression and hosted proof.
Do not rebuild grant comparison already present in current source. Do not use
obsolete master-plan status paragraphs to discard later accepted evidence;
refresh the owning gate with current evidence instead.

Post-launch work: supervised stabilization; day-7/day-14 TiDB retention reviews
and separately approved retirement; ongoing backup/restore/access/cost cadence;
then measured improvements. Establish that operating ownership before launch,
but do not wait for 14 days of post-launch operation to authorize first opening.

## 6. Complete junior-to-senior return packet

All B01–B18 begin **OPEN** in this audit. A code fix can be implemented while
its hosted/provider/owner evidence remains open. Use `OPEN`, `IN PROGRESS`,
`BLOCKED — named dependency`, `EVIDENCE PASS — REVIEW PENDING`, and `CLOSED —
named approver`. No junior self-approval of protected release or product policy.

For **every** blocker return:

```text
Blocker number / associated LRC or master-plan gate:
Accountable person and implementer:
Claim and mechanism:
Observed sequence (including failure/retry path):
Status; remaining dependency and next action/date:
Source SHA/tree; base; PR; exact tested/merged/deployed identities:
What changed; what existing implementation was reused:
Commands, execution results, test/skipped-test dispositions:
Sanitized evidence links; actor/tenant and relevant target fingerprint:
Approval reference if required; evidence boundary:
Acceptance checklist, reviewer and sign-off date:
```

Keep raw tokens, payment proofs, bank credentials and customer data out of the
packet. Keep one release evidence index so successors do not repeat completed
work. Record each new finding against the relevant existing blocker; a genuinely
new launch blocker needs a mechanism, reproduction, impact and explicit scope
decision. A hypothetical enhancement cannot silently extend the finish line.

### Central-register crosswalk (covers every current issue family)

| Existing authority | Closure work in this audit |
| --- | --- |
| LRC-AUTH-001 | B04–B07, B10, B12, B16, B18 |
| LRC-PUBLISH-001 | B03–B06, B11, B16, B18 |
| LRC-PAY-001 | B01, B03, B08, B15, B18 |
| LRC-MEM-001 | B05, B07, B13, B16, B18 |
| LRC-AGY-001 | B03, B05, B10, B13, B14, B18 |
| LRC-INVITE-001 / LRC-INVITE-002 | B05, B07, B10, B18 |
| LRC-GEO-001 | B04–B07, B09, B18 |
| LRC-AGENT-001 | B01, B03, B04, B18 |
| LRC-ADVERTISE-001 | B01, B03–B07, B15, B18 |
| LRC-DEV-001 | B02, B03, B06, B07, B18 |
| LRC-COMMERCIAL-001 | B01, B07, B13, B18: select supported property classes explicitly; no generic-workflow bypass |
| LRC-LEAD-001 | B04–B06, B13, B14, B17, B18 |
| LRC-LAND-001 | B01/B07 containment, then B16/B18 integrated/hosted proof; Land enablement remains separate |
| LRC-SUPPORT-001 | B10, B14, B15, B18 |
| Master plan G1/G2/G3 | B02, B07, B08, B16 |
| Master plan G4/G5/G6/G7 | B08–B13, B17, B18; B09 transfer/reconciliation |
| Master plan G8/G9/WP10 | Pre-launch owner/runbook in B14/B17/B18; stabilization and retirement after opening |

### Final answer required at the next senior review

“All three paid stakeholder journeys passed on release `<SHA>`, including the
buyer enquiry and recipient follow-up. B01–B18 have evidence and named approval,
or an explicit approved scope disposition that still delivers all three paid
journeys. Here are the remaining risks, operating owners and recovery position.
We request the specific final opening decision.”

If that statement cannot be supported, return the exact open blocker, its owner
and the next finish estimate—not “MVP complete” based only on local tests.
No document can guarantee zero undiscovered defects; this finite scope and
evidence gate define launch sufficiency without demanding perfection everywhere.

[pr]: https://github.com/Doscoding187/real_estate_portal/pull/578
[ci]: https://github.com/Doscoding187/real_estate_portal/actions/runs/35181998860
[packet]: https://github.com/Doscoding187/real_estate_portal/blob/f0ba2c6030070e5b1d81552c7ad6078bb0663d46/docs/architecture/database-transition-and-launch/mvp-candidate-review-packet.md
[corrections]: https://github.com/Doscoding187/real_estate_portal/blob/f0ba2c6030070e5b1d81552c7ad6078bb0663d46/docs/architecture/database-transition-and-launch/mvp-senior-review-corrections.md
[commercial]: https://github.com/Doscoding187/real_estate_portal/blob/f0ba2c6030070e5b1d81552c7ad6078bb0663d46/docs/architecture/stakeholder-domain-map/commercial-revenue-architecture.md
[activation]: https://github.com/Doscoding187/real_estate_portal/blob/f0ba2c6030070e5b1d81552c7ad6078bb0663d46/shared/commercialActivation.ts
[billing]: https://github.com/Doscoding187/real_estate_portal/blob/f0ba2c6030070e5b1d81552c7ad6078bb0663d46/server/services/billingFoundationService.ts
