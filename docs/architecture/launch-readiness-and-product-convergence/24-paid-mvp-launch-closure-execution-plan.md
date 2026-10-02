# Paid MVP launch closure execution plan — 25 September 2026

Version 1. This is the execution companion to the accepted
[25 September reconciliation](23-paid-mvp-senior-reconciliation-2026-09-25.md).
The [central register](03-launch-register.md#paid-mvp-working-disposition--2026-09-25)
remains the sole blocker-status authority: **3 CLOSED, 15 remaining, NO-GO**.
Planning changes no disposition. B01, B02 and B04 retain their accepted scope.

The user has accepted the reconciliation and requested this binding closure
sequence. Execute one assigned engineering instruction, return evidence for
senior review, then issue the next instruction. The founder preparation lane
can proceed alongside it. This document supplies the first instruction only.
It grants no purchase, merge, deployment, protected database operation or paid
activation. Those decisions attach to concrete reviewed execution packets.

## 1. Authority, scope and execution controls

Preserve AGENTS.md, Database Authority and the
[database transition master plan](../database-transition-and-launch/master-plan.md),
including G1–G9, capacity thresholds and recovery objectives. This plan orders
the accepted work; it does not replace database authority, commercial policy,
or the register. The evidence baseline is accepted review commit
`32b141270235f755cb7bb99ce269f671ef194848`, based on PR #580 candidate
`e8974ec34b919ceab37bdbd7e7379f96f3abce99`. Published main observed by that
review was `4e012b3044628fc06da7489c0055e9ce01bdc8d9`.

Each assignment records its actual candidate/main SHA and checks subsequent
changes only for material impact on its evidence. Do not repeat the broad
audit. Services V1/#581, Explore, architecture cleanup, card/recurring billing
and optional expansion remain excluded. #578/#579 contain incorporated
ancestry; they are not extra releases to implement or independently merge.

Use these work classifications; combinations are intentional:

| Class | Meaning | Default response |
| --- | --- | --- |
| A | Build or fix a demonstrated gap | Bounded change and regression evidence |
| B | Existing implementation needs fresh proof | Execute the existing contract first; fix only a reproduced cause |
| C | Hosted/provider configuration missing | Bind approved resources and verify effective settings |
| D | Founder approval, account access, expenditure or external action | Edward supplies facts/decision or authorizes a named operator |
| E | Proof depends on integrated artifacts | Prepare now; execute after the integration gate |

Every closure packet must include exact SHA/tree, commands and real results,
environment and sanitized target fingerprint, provider deployment/configuration
identities where relevant, acceptance-criterion-to-evidence mapping, failure
classification and remaining limits. Preserve durable reports/traces and
checksums in the existing evidence hierarchy; a missing `/tmp` report, green
summary or provider dashboard screenshot alone is insufficient. Never commit
credentials, recipient tokens, bank details or payment-proof contents.

Senior outcomes are ACCEPT/CLOSED, REVIEW FAILED/OPEN, or EVIDENCE INCOMPLETE;
the register can retain its more specific manual/hosted/dependency status.
An unavailable environment does not establish implementation failure. An
unrelated existing CI failure is separately classified; a genuine paid-core
risk stays under its correct existing package. Required branch checks still
govern merging. No bypass is implied.

Amend this plan only when evidence changes a dependency, scope, accepted
criterion, release identity or risk: record the finding, affected packages,
schedule/cost impact and senior disposition; obtain Edward's decision where
business objectives, expenditure or protected operations change. Small bounded
fixes within an assigned package need no new product audit.

## 2. Authoritative sequence and approximately ten-day path

Critical dependency chain:

**B03 containment → B05 Agency proof → B06 Developer proof → B07 final security
review and B04 refresh → B16 integration → B08 Azure admission + hosted
B10/B11/B12/B13/B14/B15 proof → B17 resilience → B18 cutover and GO.**

B09 data disposition, B15 approval, provider access/spend and staffing join this
chain before the stages that consume them. They can become the critical path.
B08 database establishment already exists; repeating it is not scheduled.

The target window is **25 September–4 October**, with **5 October** the next
weekday launch window if the weekend is unstaffed. Dates are planning targets,
not approvals. Assume one implementation agent/operator queue, prompt senior
reviews and Edward available for decisions. Calendar overlap below is mainly
founder work, provider waiting and automated runs; it does not assume several
unassigned engineers. Any additional operator must have a named scope.

| Stage / target | Required exit and successor | Active effort estimate | Principal schedule risk |
| --- | --- | --- | --- |
| 1. Day 1–2, Sep 25–26 | Fix B03 once for B03/B07; senior accepts money/entitlement containment. Start founder queue immediately. Next B05. | 4–10 engineering hours + 1–2 review hours | Medium: overlooked retained mutation path |
| 2. Day 2–3, Sep 26–27 | Complete current B05, then B06; refresh B04 and finalize B07 negatives on accumulated changes. Next integration review. | 6–14 engineering hours + 2–3 review hours; a real actor defect can add 1–3 days | Medium/high: browser environment vs real workflow defect |
| 3. Day 3–4, Sep 27–28 | Incorporate approved B15 copy and any census-proven B09 source/mapping requirement; resolve Vercel failure from logs; B16 whole-candidate review, approved merge, post-merge CI and exact artifacts. Hold deployment/sales. | 4–10 engineering/release hours + 2–3 review hours | High: late founder facts, source-data scope, preview/build cause, moving main |
| 4. Day 4–6, Sep 28–30 | B08 network/credential admission; bind B10/B11/B12 services; execute shared hosted and operator exercises for B10–B15. B09 transfer rehearsal if needed. | 8–16 operator/engineering hours + 2–4 founder hours, excluding material data transfer | High: access, DNS, provider approval, grant/config mismatches |
| 5. Day 6–8, Sep 30–Oct 2 | B17 restores, alerts, recovery and uninterrupted representative capacity run; finish B09 rehearsal. G5/G6 senior/founder acceptance. | 6–12 operator hours + **at least 24 elapsed hours** load + 2–3 review hours | High: restore duration, B1ms credits, data reconciliation; scale/fix requires new relevant proof |
| 6. Day 8–10, Oct 2–4 | Final B18 three-actor proof, freeze/import/reconcile, writes-closed production smoke, explicit GO, first-customer smoke. Prefer a staffed weekday; otherwise Oct 5. | 4–8 operator hours + 2–4 founder hours + 1–2 review hours | High consequence: freeze mismatch or failed exact-artifact acceptance stops opening |

These ranges total roughly **32–70 technical hours**, plus review and founder
time, with an irreducible capacity window and external waits. Ten days is
plausible at the lower/middle range if no substantial transfer or new product
defect emerges. It is not a defensible unconditional promise. Weekends may
host unattended load with alert coverage; they do not imply Edward accepts
weekend customer support or a staffed cutover.

Daily control: record the next single assignment, accepted evidence, external
wait owner and forecast date. If essential access/facts are unavailable by
Day 2, integration is not accepted by Day 4, or a representative hosted setup
cannot start B17 by Day 6, reforecast the date immediately. Do not shorten the
24-hour run, omit a restore or waive an actor journey to recover the schedule.

## 3. Integration, Azure and commercial activation boundaries

1. **Preparation now:** founder approvals, provider inventory, Vercel logs,
   source census authorization, config/restore/import plans and local evidence.
   Separately approved isolated resource preparation may overlap engineering.
   It must not redirect current production writers or deploy unreviewed code.
2. **Integrate at B16, before final hosted proof:** review the accumulated paid
   candidate after B03/B05/B06/B07 and B04 refresh, approved copy and CI. Record
   how auto-deploys are held or traffic is kept safely closed **before merge**.
   Obtain the concrete merge decision; deploy only the accepted merged SHA.
   B16 closure proves safe integrated release preparation, not public sales.
   B08–B15/B17 hosted outcomes remain explicit release holds under B18. This
   avoids making integration depend on hosted evidence that itself needs main.
3. **Azure admission after integration:** retain the accepted through-0094
   establishment. Revalidate exact target, engine, ledger, congruency, reference
   data and runtime/worker grants against the integrated candidate. Admit
   narrow Railway egress and demonstrate TLS connectivity from each process.
   Reconcile existing establishment evidence with the master plan's G3/G4
   release record; historical Azure work is not implicit G3 approval. Any new
   schema/reference apply requires its own plan/approval. Keep the live TiDB
   writer unchanged until the final cutover.
4. **Hosted rehearsal after integration:** use authenticated staging with
   separate secrets, Redis, object stores, email identity and an authorized
   isolated Azure target. A temporary restored Azure target can serve this
   purpose and B17 recovery evidence; a permanent second Azure server is not
   required. Declare the target's purpose and retire it only through approval.
   No production customer data goes into ordinary staging. A recovery target
   containing protected data remains isolated under its recovery authority.
5. **Bounded paid rehearsal:** before any hosted payment mutation, senior and
   Edward approve the exact isolated target, accounts, controlled external
   payment procedure and short staffed window. Use the normal hosted release
   policy with environment-specific release/approval references and canonical
   products; never a hosted test bypass or copied production secrets. This
   permits real application finance/provider proof while production sales stay
   closed. Staging preparation without this approval remains unactivated.
6. **Cutover only after G5/G6:** B09 required-data decisions and import rehearsal,
   B17 measured recovery/capacity, hosted acceptance and an approved staffed
   packet must pass. Freeze all TiDB writers, capture the final consistent
   source, transfer only required data, reconcile, then bind every production
   API/worker to Azure with public traffic/writes closed. Repeat exact-target
   readiness and smoke. Admission is earlier; production cutover is here.
7. **Paid production opening only at B18/G7:** pin exactly
   `agent_launch_access,agency_launch_access,developer_launch_access`, the
   release ID, approval reference and valid finite sales window. Configuration
   is parsed at process startup: changes require reviewed redeployment and
   readback, not an assumed live toggle. Edward explicitly approves public
   writes and sales after the closed-traffic checks. Enable workers in the
   reviewed order and observe the first accepted business. No general sales
   enablement is needed merely to run earlier tests.

If final production-bound acceptance requires controlled application writes
before public opening, the G6 packet must authorize their exact scope with
traffic restricted and the source already frozen/reconciled. Treat the first
authoritative Azure write as the irreversible source-authority boundary.
From then on recover within Azure; never switch a TiDB writer back on. Before
that boundary, source resumption is allowed only through an independently
reviewed safe procedure. TiDB retention is 14 days with day-7/day-14 reviews;
retirement is post-launch G9 work and does not delay GO for 14 days.

The older B12/B18 phrases about “B16 activation” refer to release preparation.
This plan requires B18/G7 for public paid opening. B12's ban on production
activation in staging continues to prohibit copying production release
configuration; a separately authorized staging rehearsal uses its own
approval, resources and canonical product identifiers.

## 4. Closure contracts for every remaining blocker

### B03 — Payment/activation containment

1. **Gap:** an enabled paid release makes product-less guards pass. Retained
   recurring, missing/unapproved-plan and lifecycle paths can pass that guard
   without an approved persisted product/owner. This is a demonstrated code gap.
2. **Class/type:** A; engineering, payment/security. Shared fix with B07.
3. **Closure work:** reject unsupported persisted product/owner combinations
   before checkout, proof, finance and entitlement/lifecycle mutation. Inventory
   the mounted callers of generic gates; preserve accepted fixed-term payment,
   reconciliation, expiry and historical-access semantics.
4. **Prerequisites:** accepted B01 and candidate baseline; governed local/CI
   test environment for database proof. No provider or production dependency.
5. **Safe parallel work:** founder queue; provider logs/plans and approved
   source census. Actor test preparation can happen; final passes wait for fix.
6. **Agent:** bounded caller/policy correction, direct API/service negatives
   under real production-mode release configuration, exact-product positives,
   payment idempotency/concurrency and lifecycle regression. No new billing
   platform, new schema or UI redesign.
7. **Founder:** no new commercial choice; confirm local execution assignment
   when handing it off. No live payment or provider change for this closure.
8. **Evidence:** failing-before/passing-after regression, route/caller matrix,
   exact source identity, raw focused results and isolated CI database results;
   explicit zero mutation for denied cases.
9. **Accept iff:** recurring, unknown/missing product, wrong owner/segment,
   stale actor and forged client product cannot create/approve/restore paid
   access; the three legitimate owner products still work; cents, locking,
   duplicate rejection, renewal, expiry/history and paused-sales preservation
   pass without a blanket test-mode bypass. A generic visibility predicate may
   remain if no mutation treats it as exact-product authority.
10. **After closure:** assign B05. Mark B07's shared finding satisfied by this
    evidence, retaining its final security review until actor changes settle.

### B05 — Agency/member joined journey

1. **Gap:** a later B10 browser run failed at member profile setup after
   invitation acceptance. An earlier complete pass does not settle that result.
2. **Class/type:** B; engineering verification; A only for a reproduced defect.
3. **Closure work:** reproduce on the corrected candidate, separate fixture,
   browser/environment and product causes; obtain a complete current run.
4. **Prerequisites:** B03; governed fixture and local email-capture contract.
   Real provider email remains B10/B18, not a prerequisite to local closure.
5. **Safe parallel work:** founder/provider preparation; B06 setup analysis
   if an operator is actually available. Avoid simultaneous candidate edits.
6. **Agent:** run existing Agency journey and membership/race checks; fix the
   narrow reproduced cause. Cover owner approval/payment, invitation delivery
   to local capture, acceptance, member profile, inventory/publication, buyer
   enquiry, assignment/follow-up, revocation and retained custody/mobile scope.
7. **Founder:** supply no new product design; later participate in hosted
   Agency-owner/member acceptance with controlled accounts.
8. **Evidence:** durable complete browser trace/report, source and target tuple,
   diagnosis of the later failure, invitation/race and tenant-negative results.
9. **Accept iff:** Agency owns the term and enquiries; authorized member gets
   Agency access without buying personal access; revoked/cross-Agency/stale
   identities fail; the joined flow completes without SQL membership/term
   shortcuts. Disclose local provider limits, carried by B10/B18.
10. **After closure:** assign B06; preserve the pass for B16 impact review.

### B06 — Developer joined journey

1. **Gap:** the later authoring browser run crashed/timed out selecting Gauteng;
   no later full pass exists. Automatic expiry has separate passing evidence.
2. **Class/type:** B; engineering verification; A only if a defect is reproduced.
3. **Closure work:** diagnose/rerun complete organisation-to-enquiry flow;
   retain still-published expiry integration alongside browser evidence.
4. **Prerequisites:** B02 retained, B03, canonical organisation fixture and
   local mail/private-media contracts. Hosted providers follow later.
5. **Safe parallel work:** founder/provider/data preparations; B16 evidence
   indexing. Final security review consumes the resulting exact candidate.
6. **Agent:** test zero/one/multiple organisation authority, approved owner and
   organisation-paid term, development/unit/media authoring, moderation,
   public discovery, enquiry, same-org assignment/follow-up and history.
7. **Founder:** later act as controlled Developer customer; no need to approve
   team expansion or rebuild onboarding for this evidence gap.
8. **Evidence:** complete durable browser run with failure diagnosis; actor,
   signed-media, assignment and still-published expiry regression results.
9. **Accept iff:** brand approval/login alone grants no publication; ambiguous
   ownership fails closed; media and enquiries cannot cross organisations;
   publication/lead intake stops at expiry while history remains. A browser
   run that first unpublishes is not sole proof of automatic expiry.
10. **After closure:** refresh B04 after shared changes, finalize B07, assemble
    B16 with approved copy and resolved frontend deployment cause.

### B07 — Security and release containment

1. **Gap:** shares B03's generic gate defect; final direct-route security proof
   is still required on the accumulated candidate.
2. **Class/type:** A shared with B03, then B; engineering/security review.
3. **Closure work:** consume the one B03 patch; execute scoped role/session,
   tenant, proof/media and deferred-paid-route negative matrix.
4. **Prerequisites:** B03, final B05/B06 changes and applicable B04 regression.
   Provider-specific proxy/outage checks stay B12/B18.
5. **Safe parallel work:** B15 facts/approval and B16 CI/preview diagnosis.
6. **Agent:** direct API tests for buyer/member/owner/admin boundaries, stale
   revoked sessions, transactional audit/sessionVersion changes, last-admin
   protection, private proof, unsupported products and absent/expired sales
   window. Retain governed local fixtures only in their authorized environment.
7. **Founder:** provide named operational accounts later; never share an
   unrestricted Super Admin login as the staffing model.
8. **Evidence:** final candidate security matrix/results and review of changed
   callers. B03 evidence is linked once, with no duplicate implementation.
9. **Accept iff:** paid-route bypass closed, no cross-owner access/mutation,
   revocation effective and audited, production rejects fixture/capture
   selectors, supported sales pause preserves existing access. Hosted ingress
   obligations are explicitly mapped to B12 rather than silently claimed.
10. **After closure:** submit B16 whole-candidate integration packet.

### B08 — Azure database admission and runtime binding

1. **Gap:** established Azure target through 0094 has accepted schema/grant
   evidence, but Railway still writes TiDB; safe production connectivity and
   admission to the integrated release remain unproven.
2. **Class/type:** C/D/E; infrastructure/provider and integration/release.
3. **Closure work:** approve static egress; record addresses for every DB-using
   Railway service; narrow Azure firewall, verify TLS and separate runtime,
   worker, read-only verifier and ephemeral migration identities. Revalidate
   exact head/congruency/commercial reference and layered readiness.
4. **Prerequisites:** B02 retained, founder network/spend decision, B16 merged
   artifact and operation-specific authority. Production switching additionally
   requires B09/B12/B17 and B18 G6; it is not an early B08 action.
5. **Safe parallel work:** provider account/budget and network planning now;
   B09 census; temporary-target planning for B12/B17.
6. **Agent/operator:** prepare sanitized read-only admission/release packet;
   execute only approved target-specific steps; prove real connections from
   API/email/lead processes and deny DDL/control-table mutation under runtime.
   Do not re-establish the accepted database or repair TiDB history.
7. **Founder:** authorize Railway Pro/static egress expenditure and scoped
   Azure/operator access; approve exact network/credential operations when
   their concrete plans are ready. Credentials use protected channels.
8. **Evidence:** accepted establishment artifact plus current target fingerprint,
   engine/head/attempt/congruency/reference results, grant-denial/TLS and
   per-service connection evidence; recorded G3/G4 reconciliation and release
   source. Fingerprint baseline starts `b23d640c…`, not a copied display name.
9. **Accept iff:** reviewed integrated runtime can use the admitted canonical
   Azure target with narrow network access and least privilege, no incomplete
   migration, exact schema/reference state and no hidden startup migration.
   Final production switch/readback remains an explicit B18 obligation.
10. **After closure:** execute hosted B10–B15 proof and B17 against authorized
    targets; preserve TiDB source pending G6 cutover.

### B09 — Source preservation/transfer disposition

1. **Gap:** source identity is known; read-only reader, actual census and signed
   data disposition are absent. “No transfer needed” is unproven.
2. **Class/type:** D then B/E; founder/data owner, database/release. A only if
   the census proves a required mapping/import gap.
3. **Closure work:** authorize/provision exact read access; inventory accounts,
   authority, inventory, money/terms, leads/delivery/audit and media references.
   Edward classifies each as transfer, retained archive or disposable with
   reason. Prepare governed mapping and rehearsal only for required records.
4. **Prerequisites:** source access approval now; B08 admitted model/isolated
   target for import rehearsal; final freeze belongs to B18.
5. **Safe parallel work:** census and decisions while B03–B07 proceeds; archive
   retrieval and synthetic mapping before integration, without source writes.
6. **Agent/operator:** produce sanitized counts, relationship/money totals and
   writer census; prove repeatable reconciliation and archive retrieval. Do
   not import old schema, legacy commercial plans or migration ledgers. An
   unsupported real paid obligation is escalated for explicit disposition.
7. **Founder:** authorize protected source read, identify real customer/business
   obligations, sign every category decision and choose retention/transfer
   treatment. No silent deletion or assumption that prelaunch means empty.
8. **Evidence:** source fingerprint/time, category counts and signed decisions;
   required mapping and rehearsal reconciliation, archive retrieval, freeze and
   final-delta procedure; or signed census-backed no-transfer finding.
9. **Accept iff:** every required record/relationship/money/media reference has
   a proven destination or approved retrievable archive, zero unexplained
   rehearsal differences and a complete final freeze plan. Scope closure to
   disposition/rehearsal; B18 must still prove final frozen reconciliation.
10. **After closure:** feed G6 cutover packet. A material transfer discovery
    immediately reforecasts schedule; B18 cannot substitute a late waiver.

### B10 — Essential transactional email

1. **Gap:** durable delivery/retry engineering exists; verified sender, actual
   receipt/reply/bounce and supervised hosted work remain unproven. Domain-list
   API 403 established a read-permission limit, not failed delivery.
2. **Class/type:** B/C/D/E; hosted verification and provider setup.
3. **Closure work:** verify sending identity/DNS through provider console or
   authorized read; bind supervised worker; execute safe real mailbox cases.
4. **Prerequisites:** B12 service/origin setup, B14 monitored recipient and B15
   approved sender/contact. Their prerequisites need readiness, not circular
   final closure; accept shared exercise together when all criteria pass.
5. **Safe parallel work:** domain/account verification, quota forecast and
   monitored mailbox setup while engineering continues.
6. **Agent:** retain existing outbox/attempt fencing; demonstrate registration,
   reset, Agency invitation, invoice/payment and term emails as applicable;
   wrong-recipient/token-expiry rejection, restart and ambiguous-send handling.
7. **Founder:** provide account/DNS access, approve public sender/reply address,
   consented inboxes and operator; authorize quota upgrade only if forecast
   and required delivery cadence exceed available allowance.
8. **Evidence:** provider message IDs/status plus independent received-mail and
   working-link evidence, replies reaching operator, safe provider bounce test,
   batch/restart timestamps and attention resolution without exposing tokens.
9. **Accept iff:** messages reach intended inboxes with correct HTTPS links and
   identity; expired/rotated links fail; dedupe and retry do not duplicate
   effects; unknown outcomes require operator reconciliation; backlog and quota
   allow the agreed cadence. Provider acceptance alone is not mailbox receipt.
10. **After closure:** use real mail for shared Agency/B18 and B14 rehearsals;
    retain worker alerts for B17.

### B11 — Public media and private payment evidence

1. **Gap:** storage guardrails exist; dedicated private proof bucket/credential
   and real privacy/durability/recovery evidence are missing.
2. **Class/type:** C/D/B/E; provider/manual then hosted verification.
3. **Closure work:** bind a separate private bucket and least-privilege key,
   public access blocked, encryption, approved retention and recoverable object
   policy. Preserve existing public media service where it satisfies the contract.
4. **Prerequisites:** founder storage budget/access and retention facts;
   B12 exact runtime for application proof; B15 commitments must match.
5. **Safe parallel work:** resource/policy plan and approved bucket preparation
   alongside engineering; B17 recovery planning can consume the same design.
6. **Agent/operator:** configure accepted adapter, prove upload/read by owner
   and authorized finance, anonymous/wrong-tenant denial, signed-read expiry,
   public listing media, restart persistence and controlled object recovery.
7. **Founder:** authorize incremental storage/requests/recovery copies, retention
   and legal holds; grant scoped account access. No proof uploads to public media.
8. **Evidence:** sanitized bucket/IAM/config identities, access matrix and expiry
   results, durable object checksums across restart, restored controlled object,
   policy and actual effective settings; no private object content in reports.
9. **Accept iff:** proof never becomes anonymous/public or cross-tenant, hosted
   local fallback impossible, objects survive runtime replacement, approved
   retention/recovery works and public media remains usable. Shared public
   bucket/key or recovery policy without recovery evidence fails.
10. **After closure:** enable controlled finance rehearsal; include object
    dependency alert/recovery in B17 and final B18 smoke.

### B12 — Hosted runtime and shared controls

1. **Gap:** production observation was readiness 503 and frontend version HTML;
   candidate Vercel preview failed without established cause. Email/lead
   services and effective full configuration were not proven.
2. **Class/type:** C/B/E; hosted/integration; A only if logs establish code defect.
3. **Closure work:** diagnose Vercel logs early; implement only identified
   correction. After B16, bind exact frontend/API/email/lead artifacts and
   [hosted contract](../../b12-hosted-runtime-contract.md) settings; run rehearsal.
4. **Prerequisites:** B16 artifact, B08 admitted hosted target, B11 bindings,
   B10 sender/worker and B13 cron setup. B15 approved public origins/contact.
5. **Safe parallel work:** logs, config manifest, domain/access decisions before
   integration. B10/B11/B13/B14 evidence shares one hosted exercise.
6. **Agent/operator:** exact HTTPS origins/CORS, cookie/session/token/revocation,
   two-network proxy/IP spoof tests, Redis outage fail-closed/recovery, restart,
   worker supervision and effective command/cron/replica verification. Bind
   Redis cache as required by the existing exact-release probe; no cache rewrite.
7. **Founder:** authorize hosting account access, commercial-eligible Vercel
   plan if needed, domain/DNS changes and time-limited isolated resources.
8. **Evidence:** 40-character frontend/API/worker SHAs, config manifest and
   deployment IDs; JSON identity endpoints, readiness 200, real browser
   cookies/origins, IP/outage/restart results and repeated worker executions.
9. **Accept iff:** all required contract variables/aliases agree, correct
   artifacts actually run, auth/abuse controls hold at real ingress, no hosted
   fixture/mock/local-storage selectors, liveness/readiness are distinguished
   and stable service progress is observable. Preview success cannot replace
   authenticated staging or final production identity checks.
10. **After closure:** finalize shared B10/B11/B13/B14/B15 proof and run B17;
    repeat production-specific readback at B18 without repeating source audit.

### B13 — Durable enquiries and supervised recovery

1. **Gap:** custody/retry code is evidenced locally; real cron, failure attention
   and staffed recovery are unproven. CRM acceptance is not external delivery.
2. **Class/type:** B/C/E; hosted verification and operations.
3. **Closure work:** bind the existing one-shot lead worker to the five-minute
   cron; exercise three-owner custody, replay, recipient loss and failure recovery.
4. **Prerequisites:** accepted B04–B06, B12 supervisor, B14 operator and B17 alert
   setup. Full B17 load closure follows this basic functional proof.
5. **Safe parallel work:** recipient/custody runbook preparation and founder
   training; share hosted B10/B12 and alert exercises.
6. **Agent/operator:** prove accepted enquiry durability, correct owner, dedupe,
   stale lease/crash recovery, correct platform-custody escalation and
   exhausted/unknown nonzero attention; verify no unsafe forced resend.
7. **Founder:** operate assigned platform-custody case, resolve recipient loss
   through the existing authorized route, record follow-up and escalation owner.
8. **Evidence:** consented enquiry IDs and correlation trail (redacted), cron
   start/finish at least twice, crash/retry/attention logs, actual alert receipt,
   tenant negatives and operator case timestamps.
9. **Accept iff:** zero lost, duplicate durable or misowned enquiries; truthful
   browser acknowledgement, recoverable queue, unknown/exhausted work cannot
   appear healthy, and every customer/platform obligation has an owner.
10. **After closure:** carry the same scenarios into B17 stress/restart and B18
    buyer-to-customer follow-up acceptance.

### B14 — Founder-operated finance, moderation and support

1. **Gap:** sole-operator model and expiring sales guard are accepted in design;
   monitored contacts and real queue/bank/absence rehearsal are missing.
2. **Class/type:** D/B/E; founder/manual and hosted operations.
3. **Closure work:** establish staffed windows and monitored support/privacy/
   finance/bounce/alert routes; rehearse finance reconciliation, moderation,
   support and absence using the existing operating procedure.
4. **Prerequisites:** B03 and B10–B13 functional readiness, B15 truthful promises,
   B17 alert binding; these can share a rehearsal before B17 capacity closes.
5. **Safe parallel work:** contacts, operator calendar, bank/payee facts, consented
   participants and runbook walkthrough now.
6. **Agent:** prepare controlled cases and evidence capture; prove pause,
   missing/expired window and reviewed renewal behaviour without weakening
   production policy. Do not build a new admin console or staff platform.
7. **Founder:** use own authorized accounts to match actual bank receipt to
   invoice/payer/reference/amount/product/owner; handle partial, unmatched,
   duplicate/excess and refund/correction case without automatic credit;
   moderate inventory, answer support and acknowledge alert. Set exact next
   check/absence plan and finite UTC sales window, maximum next weekday/72h.
8. **Evidence:** redacted bank-to-invoice reconciliation, queue/correction/audit
   references and timestamps, inbound/reply contact proof, alert response,
   pause/expiry/renewal and existing-paid-user continuation results.
9. **Accept iff:** Edward can meet recorded weekday checks and one-business-day
   matched-payment target, unattended intake/approval closes automatically,
   existing entitlements/history survive sales pause, and pending obligations
   remain owned. Add cover only if this bounded model demonstrably cannot work.
10. **After closure:** reserve staffed G6/G7 window and first-cohort checks;
    B18 copies the actual operator/window, not an unfilled role template.

### B15 — Approved customer commitments and consent

1. **Gap:** approval packet has unresolved factual fields and no final founder
   approval or hosted disclosure/consent proof.
2. **Class/type:** D then limited A/B/E; founder/legal-commercial, copy and proof.
3. **Closure work:** complete existing approval packet; implement approved
   versioned copy and verify actual browser disclosure/consent behaviour.
4. **Prerequisites:** B01 retained, B14 contacts/operating promise and actual
   provider/location/retention facts from B08/B10–B12. Approval/copy should
   precede B16; final hosted display proof follows integration.
5. **Safe parallel work:** Edward's facts/legal/finance review now; agent can
   map existing page/consent locations without inventing missing facts.
6. **Agent:** apply only approved Terms/Privacy/payment/refund/dispute facts,
   immutable versions/effective dates; verify offer, invoice, email and UI agree;
   capture mobile signup/payment/enquiry links, consent and network/storage use.
7. **Founder:** supply publishable address, disclosure telephone or reviewed
   applicability decision, company/office-bearer facts, support/privacy contacts,
   provider/processing-location, retention and cookie schedules; confirm payee,
   tax status, refund/dispute wording, effective date and explicit final approval.
   Obtain legal/finance advice as needed; the agent cannot approve these facts.
8. **Evidence:** dated approval and copy digest/versions, resolved publication
   checklist, current provider facts, browser/network screenshots and consent
   records. Keep bank credentials out of the public packet.
9. **Accept iff:** no unresolved placeholders or unsupported promises; approved
   R499/R999/R1,499 once-off 90-day manual-EFT terms and ownership agree across
   surfaces, no automatic renewal implied, disclosures are accessible before
   commitment and recorded consent references the released versions. Observed
   browser data use matches the notice.
10. **After closure:** freeze legal versions in B18 release record; changed
    provider/retention facts require bounded reapproval before public opening.

### B16 — Independent review and candidate integration

1. **Gap:** candidate remains unmerged; known containment finding and incomplete
   current actor proof prevent whole-candidate acceptance; preview cause unknown.
2. **Class/type:** B/E; integration/release and independent acceptance.
3. **Closure work:** review one converged candidate with all bounded corrections,
   approved copy, current required checks and actor evidence; resolve preview;
   approve controlled integration and verify the actual merged result.
4. **Prerequisites:** B03/B05/B06/B07, retained B01/B02/B04 plus B04 refresh,
   B09 census/disposition sufficient to resolve launch data/consumer scope,
   B15 approved source copy and concrete deployment containment. Full hosted
   B08–B15/B17 proof is an explicit subsequent release hold under B18.
5. **Safe parallel work:** prepare whole-diff evidence map, deployment hold and
   preview diagnosis while actor proof proceeds. Avoid unrelated merges into
   the candidate after acceptance.
6. **Agent:** assemble CI/browser/security/source provenance, resolve relevant
   conflicts, request independent review; after named merge authorization,
   record merged SHA/tree and run post-merge gates. The actual production
   artifact must derive from main; synthetic merge CI alone is not deployment.
7. **Founder:** approve concrete integration/release-scope decision and provider
   deployment hold where needed. This is separate from paid-sales approval.
8. **Evidence:** reviewed full delta, current check URLs/raw artifacts and skip
   dispositions, successful frontend build/deployment validation, merge record,
   post-merge CI, artifacts and remaining hosted hold list. Reuse equal-tree
   evidence only with an explicit identity/impact explanation.
9. **Accept iff:** no unresolved code/actor launch finding, integrated source
   matches reviewed content, required CI passes, frontend artifact can deploy,
   deployments cannot expose an unadmitted DB or accidentally open sales;
   hosted holds are assigned and no longer masquerade as integrated proof.
10. **After closure:** authorize concrete B08/provider execution packets in
    dependency order. A later relevant code change returns through review/CI
    and refreshes affected hosted evidence; B18 always uses the final tuple.

### B17 — Recovery, capacity and monitoring

1. **Gap:** monitoring contract/probe exists; continuous alerts, actual backup
   freshness, independent restore and measured capacity remain unproven.
2. **Class/type:** B/C/D/E; infrastructure, hosted resilience verification.
3. **Closure work:** bind independent continuous checks/recipients, exercise
   restart/outage/worker/object recovery; prove PITR and encrypted logical
   restore to separately admitted isolated targets; run required capacity test.
4. **Prerequisites:** B08 admitted target, B09 representative data/transfer
   treatment, B11–B14 functional hosted readiness, B16 exact artifact and
   Edward-approved forecast/recovery objectives/resource budget.
5. **Safe parallel work:** approve forecast, monitoring destination and restore
   budget early. During the 24-hour run, finish evidence review and founder
   documentation. Run disruptive restores/restarts on separate isolated
   resources or scheduled test phases; do not contaminate the normal-load run.
6. **Agent/operator:** execute existing probe and recovery runbooks; capture
   timing, integrity and resource metrics; validate copied credential isolation,
   external-effect containment and application reconnect/worker restart. Use
   actual production-equivalent engine/SKU/region/network and artifact; explain
   any difference. Never load-test or restore over a customer production DB.
7. **Founder:** accept explicit RPO/RTO and workload forecast before tests,
   approve temporary restored-server/independent-backup costs and an alert
   recipient; authorize minimum compute change only if capacity fails.
8. **Evidence:** scheduled probe history plus induced alert receipt/action;
   backup timestamps and independent copy/access boundary; restore target
   fingerprints, reconciled checksums/counts, measured RPO/RTO; full 24-hour
   workload/metrics, two peak windows and 30-minute 2× peak results.
9. **Accept iff:** all numerical criteria in section 7 and master-plan G5 pass,
   zero integrity/security loss, successful application/object/database recovery,
   independent monitoring detects failures, and operator response is demonstrated.
   Backup metadata or a single healthy probe cannot close B17.
10. **After closure:** senior/Edward review G6 final cutover readiness; proceed
    to B18 only with current backup, data and exact release records.

### B18 — Final paid acceptance and GO

1. **Gap:** no exact production-bound three-actor acceptance, frozen-source
   reconciliation, complete release record or explicit public GO exists.
2. **Class/type:** E/D/B; final acceptance and controlled integration/release.
3. **Closure work:** assemble final release tuple and approvals; execute all
   three actor/buyer loops and failure controls with real providers/controlled
   external payment evidence; perform G6/G7 cutover sequence in section 3.
4. **Prerequisites:** B01–B17 accepted in their defined scopes; B09 final-delta,
   B08 actual production binding and B12 production readback are completed
   inside this gate before GO. No material stale code/config/data evidence.
5. **Safe parallel work:** marketing assets and accurate non-paying interest
   preparation, customer scheduling conditional on GO; no public payable launch.
6. **Agent/operator:** freeze exact frontend/API/worker/config/legal/product/DB
   tuple; run identity and target checks, real desktop/mobile application
   acceptance and negatives, final reconciliation and written abort/recovery
   record. Use application authority for payment/terms, not SQL activation.
7. **Founder:** approve test accounts/payment procedure, staffed cutover,
   confirmed bank/disclosure facts and named operational approvers; issue
   explicit GO for the recorded tuple, then observe first-customer operation.
8. **Evidence:** durable three-actor reports, provider/finance/custody results,
   zero unexplained frozen-source differences, all-process Azure fingerprint,
   readiness/identity/preflight, recovery/alert proof, approved legal versions,
   finite sales window and signed GO followed by first-customer smoke record.
9. **Accept iff:** the LAUNCH READY definition in section 8 is met, actual
   production smoke passes, Edward's GO is recorded and first-customer smoke
   succeeds. Any material identity, money, security, data or readiness failure
   stops/pauses new paid intake and invokes the reviewed recovery procedure.
10. **After closure:** operate first 10–20 customers within accepted capacity
    and staffing; monitored marketing rollout. Keep day-7/day-14 TiDB reviews
    and stabilization under G8/G9, without expanding the launch gateway.

## 5. Founder-action queue — start alongside B03

| Priority / needed by | Edward's action and tangible output | Packages / parallelism |
| --- | --- | --- |
| F1 — Day 1 | Confirm access to Azure, Railway, Vercel, Resend, AWS and DNS; name authorized release/data operator. Approve spend envelope itemized as recurring usage and temporary rehearsal resources. | B08/B10–B12/B17; independent of code fix |
| F2 — Day 1–2 | Decide Railway Pro/static egress; confirm actual Vercel plan is commercially eligible; permit scoped service/IP planning. Approve private proof storage and independent recovery copies. | B08/B11/B12; critical to Day 4 hosting |
| F3 — Day 1–2 | Authorize exact TiDB read-only reader/census, identify business data owner and sign category decisions once census arrives. | B09; unknown transfer size is schedule risk |
| F4 — Day 1–2 | Supply monitored support, privacy, finance/reply/bounce and alert routes; approve actual email sender and consented recipient accounts; demonstrate inbound access. One mailbox with tested aliases/ownership is sufficient. | B10/B14/B15; no mandatory new helpdesk product |
| F5 — Day 1–3 | Complete B15 publication fields, provider/retention facts, payee/tax confirmation, versions and dated approval. Resolve any required legal/finance advice early. | B15; source copy before B16 |
| F6 — Day 2–4 | Confirm production and authenticated staging DNS/TLS ownership; approve isolated temporary Azure/Redis/storage/email resources and narrow per-service network rules after concrete plans. | B08/B10–B12/B17; no production writer switch |
| F7 — Before Day 6 test | Approve first-cohort/90-day forecast or retain provisional floor, measured recovery objectives, temporary restore budget and independent backup destination. Confirm restore-region quota/capacity can actually be provisioned. | B17; cannot change forecast retrospectively to pass |
| F8 — Day 5–8 | Perform bank/finance, moderation, support, custody and alert exercises; sign actual staffing calendar/absence plan and choose a staffed cutover window. | B13/B14/B18 |
| F9 — Only after concrete packets pass | Approve merge (B16), named protected operations, then G6 cutover and finally G7 paid GO separately. Record exact release and valid sales-window end. | Integration, DB authority and public activation remain distinct decisions |

An operator can prepare configurations and evidence; Edward supplies account,
commercial and legal decisions. Provider credentials go through protected
channels. A DNS ticket or verified sender can be initiated early without
waiting for B03 review. Provider actions that alter live resources still need
their concrete scope and existing authority checks.

## 6. Minimum provider configuration and justified spending

Provider documentation checked for this planning pass; reconfirm account terms,
regional availability and actual checkout costs before purchase. Prices below
are published USD baselines, not a total monthly quote or approved expenditure.

| Component | Minimum launch requirement | Spend decision / upgrade trigger |
| --- | --- | --- |
| Azure MySQL | Reuse established canonical Flexible Server; exact admitted engine/head; TLS, narrow per-service firewall, distinct credentials; 14-day automated backup/PITR; independent encrypted logical copy outside primary region/runtime deletion authority. | B1ms remains conditional on B17. If it fails, approve the smallest General Purpose configuration that passes and rerun affected proof. No automatic HA, replica or geo-redundant upgrade. Temporary independently restored targets and recovery-copy storage are necessary test/recovery usage. [Azure tiers](https://learn.microsoft.com/en-au/azure/mysql/flexible-server/concepts-service-tiers-storage), [restore model](https://learn.microsoft.com/en-au/azure/mysql/flexible-server/concepts-backup-restore). |
| Railway | API one replica, continuous email worker, five-minute lead cron and environment-owned Redis. Static outbound addresses for **each** service connecting to Azure; pin region and allowlist every assigned address. API alone is insufficient. TLS/credentials remain required because addresses can be shared. | **Pro is required for this chosen static-egress design**, published $20/month including $20 usage; usage above allowance adds cost. Hobby baseline is $5. No Enterprise requirement. Record effective addresses after enable/redeploy; region changes invalidate allowlist evidence. [Static outbound IPs](https://docs.railway.com/networking/static-outbound-ips), [plans](https://docs.railway.com/pricing/plans). |
| Vercel | Exact frontend build, JSON version, commercial-eligible account, production/staging domain bindings and deploy control. Diagnose the existing preview failure through logs. | Confirm current plan first. If Hobby, commercial use requires a suitable plan, ordinarily Pro; if already eligible, no upgrade is justified by a failing build alone. [Hobby use restriction](https://vercel.com/docs/plans/hobby). |
| Resend | Verified controlled sender/domain, correct DNS, usable sending key, monitored replies/bounces, delivery evidence and quota adequate for launch traffic and retries. | Retain current plan if sufficient. Published free transactional allowance is 100/day and 3,000/month, including applicable sent/received usage. Forecast actor onboarding, lead alerts, invoices/notices and retries with headroom; upgrade only if required cadence exceeds quota. Do not fund a higher tier simply to query domains with a sending-only key. [Quota contract](https://resend.com/docs/knowledge-base/account-quotas-and-limits). |
| S3 public/private | Reuse working public media; distinct private proof bucket and scoped credentials, Block Public Access, encryption, retention and demonstrated controlled recovery. Separate staging resources. | Approve incremental storage/requests, retained versions or recovery copies. Existing S3 encryption can satisfy the encryption need; customer-managed KMS/enterprise storage is not automatically required. Validate effective policies. [Block Public Access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html), [encryption](https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-bucket-encryption.html). |
| Redis / monitoring | Shared auth/enquiry limits and probe-compatible cache, persistent configuration/restart proof, bounded access; independent scheduled exact-release probe and real worker/backlog alerts to Edward. | Reuse existing Redis if B12/B17 pass. No mandatory managed HA Redis, paid APM or new monitoring vendor. A laptop-only check cannot meet continuous monitoring. Budget alerting must not silently turn off an operating paid service. |
| DNS / mailbox / payments | Owned HTTPS frontend/API and same-site authenticated staging names, provider-required mail records, monitored public/legal and operational contacts; verified manual-EFT bank/payee configuration. | Reuse current registrar/mailbox with tested aliases if fit. No dedicated IP email, payment gateway, card processor or recurring-billing subscription is needed. Missing DMARC alone was not established as a launch blocker; satisfy verified sender/delivery requirements. |

Production runtime must follow B12's full variable manifest, including exact
origins and aliases, `NODE_ENV=production`, appropriate `APP_ENV`, full build
SHA, strong distinct secrets, explicit S3 adapters, public bucket alias
equality, separate proof credentials, worker commands, Redis bindings and
`SAVED_SEARCH_SCHEDULER_ENABLED=false` unless separately approved. No migration
credential persists in API or worker settings. One API owns term scheduling;
do not duplicate it in another service. Railway/API drain allowance must be
at least the contract's 20 seconds.

Keep an itemized budget record: existing spend, incremental monthly provider
usage, temporary restore/load resources, storage/egress and a founder-approved
cap. Unknown account plans, Azure region/SKU quotations or usage forecasts
are founder/operator inputs; this plan does not invent a total cost.

## 7. Engineering queue, reviews and measurable gates

The sequential assignment queue is: **B03 → B05 → B06 → B07/B04 regression →
B15 approved-copy/B12 diagnosed build correction if needed → B16 integration →
B08 and hosted shared setup/proof → B09 rehearsal if required → B17 → B18**.
Within the hosted stage, provision B11 and B12 service prerequisites first,
then execute B10/B11/B12/B13/B14/B15 together. Each packet returns for review;
no next implementation instruction is issued by this plan.

Safe preparation alongside this queue: provider logs/config plans, evidence
indexing, approved read-only source census, legal fact mapping, restore/load
scripts already required by the contract and test setup. With one agent these
are queued during waits, not assumed concurrent coding capacity. One reviewable
branch/worktree per assignment; consolidate accepted commits into the one
candidate. No unrelated branch cleanup or parallel release authority.

| Senior gate | Required decision | Hold if unmet |
| --- | --- | --- |
| After B03 | Exact persisted product/owner controls and approved product regressions pass | No final paid-loop reacceptance or hosted activation |
| After B05, then B06 | Complete current joined evidence; cause of later failure accounted for | Package remains evidence incomplete or diagnosed open |
| Before integration | Final B07 negatives, B04 refresh, approved copy, whole delta, required CI/preview, deploy containment; B16/G3 record | No merge/release approval |
| After Azure admission | Exact source/target, previous establishment applicability, constraints/reference/grants, narrow connectivity; G4 evidence reconciled | No hosted dependence on an unadmitted target |
| After shared hosted rehearsal | B10–B15 criterion map, provider and operator proof, protected test scope | No resilience claim built on a nonfunctional runtime |
| After B17 and B09 rehearsal | All capacity/recovery/data/security results; explicit B1ms and RPO/RTO decision; G5/G6 | No source freeze/cutover |
| Final B18 | Exact production tuple, frozen reconciliation, complete actors/negatives, ready operators, readiness/smoke and explicit Edward G7 GO | Public paid sales remain closed |

B17 retains the master-plan thresholds; the forecast/objective acceptance
decision is required before execution. These are the planning acceptance
baseline, not provider guarantees:

| Measure | Required proof |
| --- | --- |
| Workload | At least 2× accepted 90-day data forecast; absent forecast use 10,000 listings, 2,000 users, 100 developments, 50,000 leads, 250,000 activity/provider/delivery events with realistic skew. |
| Duration/traffic | ≥24h representative traffic/background work, two expected peaks, 30min at 2× planned peak; provisional 5 requests/s sustained, 20/s peaks (therefore 40/s double-peak interval), unless forecast is accepted before testing. |
| Integrity/errors | Zero lost accepted writes, duplicate durable outcomes, tenant leaks or enforcement failures; unexpected application errors <0.1% during normal/peak load; no DB-attributable timeouts. |
| Latency | Read p95 ≤750ms/p99 ≤2s; write p95 ≤1s/p99 ≤2s excluding separately measured external provider latency; connection acquisition p95 ≤250ms with no exhaustion. |
| Resource headroom | CPU credits lowest ≥30% full balance, no progressive depletion and recover before next peak; memory p95 <80%, no OOM/leak/restart; aggregate app/worker connections ≤40 with ≥10 operational reserved, subject to engine/memory limits; storage ≥30% free and ≥90-day forecast headroom. |
| Work/restart | No duplicate effects, agreed due-work SLO met, peak backlog drains ≤15min; application reconnect/recovery ≤5min without manual pool repair or lost work. |
| Recovery | Compatible application rollback/maintenance ≤30min; in-region DB RPO ≤15min/RTO ≤4h; regional RPO/RTO ≤24h using independently stored encrypted backup and demonstrated provisioning; source transfer zero unexplained required-record loss. |
| Backup/alerts | 14-day Azure retention, actual fresh restore points and scheduled independent logical copy younger than regional RPO; measured PITR and logical restores. Continuous independent identity/readiness checks and operator alert receipt; term tick within 45min, missed two lead runs detected, email/proof/custody attention exercised. |

Any accepted forecast/threshold amendment is written before its test. A missed
objective is a failed gate until corrected and re-proven, or the governing
plan is explicitly revised through senior/Edward authority. The date itself
is never the rationale for weaker acceptance. Reuse a test's evidence across
packages where identities and criteria match; do not perform duplicate restores
or duplicate payment implementations solely to obtain separate B-number files.

**Can close without touching production:** B03, local B05/B06, B07 and B16
with a verified deployment hold. B15 source approval is preparable locally;
its complete closure needs hosted display evidence. B10–B14 and much of B17
can be proved on authorized isolated hosting; final production-specific
identity/binding remains B18. B09 requires authorized source read, not source
mutation. B08 needs protected Azure/provider evidence even before live cutover.

## 8. LAUNCH READY, B18 GO and marketing

**LAUNCH READY** means the following are simultaneously true for the frozen
production-bound release, ready for the staffed G6/G7 procedure:

- B01–B17 accepted in their explicit scopes, with final B18 readback/freeze
  obligations enumerated and executable; no concrete unresolved paid-core
  money, security, data-loss or unusable-journey gap.
- One integrated reviewed mainline release; recorded frontend/API/worker SHAs,
  tree, deployment IDs, effective configuration digest, exact target/head/model,
  reference-data version, legal versions and commercial approval references.
- All three actors and buyer counterparts proven in desktop/mobile hosted
  flows using application authority, real mail/media/private proof and controlled
  external payment evidence. Agency members inherit Agency access; Developer
  organisation owns its entitlement. Invoice/proof alone never activates.
- Renewal/expiry/history, role/session/tenant denial, unsupported products,
  partial/duplicate/unmatched payment, missing proof, unknown delivery and
  founder-unavailable cases behave as specified. Safe time-boundary tests use
  governed isolated scenarios; no production clock changes or SQL term seeding.
  A full 90-day elapsed hosted run is not required: retain accepted deterministic
  lifecycle/expiry tests on the exact candidate, plus hosted eligibility and
  scheduler evidence. Record this scope explicitly instead of claiming that
  a fresh production term was observed to expire naturally.
- Azure admitted; B09 signed data treatment and rehearsal complete; every
  source writer, final snapshot/reconciliation and abort boundary is accounted
  for. Measured B17 capacity/recovery passes with working independent alerts.
- Actual sender/contacts/provider quotas and private storage work; approved
  disclosures contain real facts. Edward has rehearsed finance, moderation,
  custody, support, incidents and sales-window renewal and owns the launch window.

**B18 public GO** additionally requires completed final freeze/import/reconcile,
every production process bound to the exact Azure target, production identity
and readiness/smoke passing with traffic closed, current backup/recovery
position and Edward's explicit dated approval for the exact tuple. Opening
uses only the three approved 90-day once-off manual-EFT products and a valid
staffed finite sales window. Record first-customer smoke immediately; close
B18 on that evidence. If it fails, pause new sales and invoke the recorded
recovery plan while preserving accepted customer obligations.

Marketing preparation can begin now: approved factual content, audiences and
consented expressions of interest, with launch contingent on GO. Any publicly
used surface must itself work and make accurate commitments. Start payable
onboarding and paid acquisition only after B18 GO and the first-customer smoke.
Begin within the approved first 10–20-customer operating envelope; increase
volume only within measured capacity and demonstrated staffing. No arbitrary
extra waiting period, Services delivery or Explore work is added to launch.

## 9. First implementation instruction — B03 only

**Objective:** close B03's persisted product/owner containment defect. The same
patch supplies B07's shared finding; B07's final review remains later.

1. Read the current register, accepted reconciliation section 3 and B03 closure
   evidence. Inspect worktrees/status. Create a clean task-owned feature
   worktree from the accepted Paid MVP candidate including the reconciliation
   and this plan; record exact base/main SHA and relevant intervening changes.
   Do not start from old main and accidentally omit the assembled candidate.
2. Apply repository Database Authority for consumer/database-test work: read
   its skill, entry, playbook, policy and exception register; run read-only
   status before database work. This assignment's product scope needs no
   schema/migration change. Governed disposable-local or isolated-CI proof is
   the intended test environment; prepare the exact required local operation
   packet if existing authorization does not cover its provisioning. Do not
   use quarantined `listify_local`, a shared DB or a protected target.
3. Reproduce the real production-mode generic-gate failure, then inspect
   `commercialActivationPolicy.ts`, `billingFoundationService.ts` and mounted
   billing/lifecycle callers. Cover recurring checkout/proof/finance and
   `requireSubscriptionCommercialActivation` missing/unapproved-plan fallback,
   cancellation/restoration and any other money/entitlement mutation relying
   on a product-less gate. UI visibility is not access control.
4. Enforce exact persisted canonical product and billable-owner authority
   before mutation, fail closed for missing/unsupported/mismatched records,
   and preserve supported fixed-term operations. A client-supplied product or
   globally enabled release is insufficient evidence of entitlement authority.
5. Add meaningful production-mode regressions with exactly the three approved
   release products, valid release references and a short valid sales window.
   Reject recurring, unknown, missing, wrong-segment/wrong-owner and forged
   product cases through the relevant service/direct API boundaries; prove
   zero denied-case writes. Exercise supported Agent/Agency/Developer owners,
   duplicate/concurrent finance protection, cents, renewal, expiry/history,
   sales pause and existing paid access. No blanket test-fixture bypass may
   stand in for these production-mode tests.
6. Run focused regression plus required CI/authority gates for the changed
   consumer. Preserve previous failure and passing evidence with exact source,
   test target, commands, counts and raw durable artifacts. If an environment
   is unavailable, report the missing proof; do not silently downgrade a DB
   negative to a policy-only assertion. Classify unrelated mainline failures
   separately and reproduce there only when needed to establish attribution.
7. Return the reviewable diff/commit and evidence packet: caller-to-control
   matrix, denied/allowed cases and mutation outcomes, retained invariants,
   actual test/CI results, unresolved limits, final Git status and explicit
   protected-access statement. Request senior B03 acceptance and stop.

No provider change, deployment, merge, production activation, new billing
system, Services/Explore work or B05 implementation belongs in this assignment.
The next instruction is issued only after its evidence review.

## 10. Planning-pass record

This pass used the accepted findings and targeted authority/provider-document
reads, not a new product audit. Read-only `pnpm db:authority:status` on the
accepted audit worktree reported the governed disposable-worktree identity,
expected head 0094 and local service unreachable; ledger/schema were not
evaluated. No database was started, provisioned, migrated or restored. No
product change, purchase, provider configuration, merge, deployment or paid
activation was performed. Documentation links and unchanged register
dispositions are checked separately from runtime evidence.
