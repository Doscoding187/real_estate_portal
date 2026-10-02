# B14 first-customer operating procedure

Status: founder-only bootstrap model recorded; operating hours are aligned to
the accepted B15 review copy, and staffed/unavailable-state rehearsal remains
open. No production or provider rehearsal is claimed. This procedure follows
the founder-approved [B01 commercial policy](03-launch-register.md#lrc-pay-001-b01-founder-commercial-and-operating-decision--2026-09-17)
and the accepted [B15 review copy v0.3](evidence/b15-founder-approval-candidate-2026-09-27-v0.3.md).

## Confirmed operating period

Support and billing/payment monitoring is founder-managed Monday–Friday,
09:00–17:00 South Africa time, excluding South African public holidays.
Requests may be submitted at any time. Support and billing/payment requests
received outside an operating period are monitored and answered during the
next operating period. This does not promise a staffed call centre, a dedicated
voice line, or an immediate WhatsApp response. The operating schedule and
customer wording are recorded in [B15-FOUNDER-REVIEW-0.3](evidence/b15-founder-approval-candidate-2026-09-27-v0.3.md);
actual channel monitoring and reply proof remain open.

## Before the first payable customer

Edward is the V1 Founder/Managing Director/Release Approver, Finance Operator
and Support Operator. No secondary operator is appointed. For the first 10–20
paying customers, one operator is acceptable as a bounded bootstrap model if
he performs the finance and support checks during the confirmed operating
period, monitors the approved public support/reply routes, and checks email,
leads and readiness within that schedule. Publish the response window without
implying round-the-clock staffing. The normal activation target after a valid
proof and received-funds match to the invoice is within one business day;
processing takes place during operating hours, excluding South African public
holidays. Activation is not instant; proof never activates access
automatically.

A named backup is not an automatic V1 requirement. Customer-owned leads remain
in the authorized CRM even if an email alert fails. Manual EFT stays pending
until Edward verifies funds. Platform-managed/manual leads, support and
security incidents still need a human. Before accepting money, rehearse the
actual Agent, Agency and Developer queues plus one exceptional platform-held
lead with Edward alone. Accept the cohort only if every due obligation can be
resolved or explicitly owned within the disclosed window. Reassess at 10
customers, before expanding to 20, and after any missed check, delayed finance
decision or unattended platform lead. Add a real authorized secondary operator
if the founder-only schedule and pause procedure cannot meet those obligations;
never create a nominal backup account to satisfy a checklist.

Confirm the exact released SHA, product activation reference, readiness and
legal pages under B16/B18. Confirm the B10 email supervisor and B13 lead cron
are running, the B11 private bucket has passed a real controlled put/read, and
the B17 monitor reaches Edward through a route independent of the application.
These are separate acceptance records; a green API liveness response is
insufficient.

## Checks during operating periods

1. Check `/api/readiness` and `/api/version` against the accepted release.
   Investigate a 503, wrong SHA, stale term-scheduler tick or missing worker
   run before claiming the service is ready.
2. Check `pnpm email:backlog` or the super-admin
   `admin.getTransactionalEmailBacklog` surface. Record counts and oldest age
   for due, claimed, unknown and permanent-failure rows. Never automatically
   resend an unknown provider outcome. Reconcile it only with provider evidence
   through the audited `admin.reconcileUnknownTransactionalEmail` route.
3. Check the lead worker's latest completed run and backlog. Open
   `/admin/ecosystem` for platform-managed/manual custody and routing attention.
   Follow the [B13 recovery runbook](16-first-cohort-lead-custody-recovery-runbook.md).
   An internal CRM lead is already in customer custody; an email alert is not
   proof of lead receipt.
4. During each operating day, check `billing.admin.financeQueue` for submitted
   and under-review proofs. Compare the private proof and invoice with the
   actual bank receipt, payer, owner, amount and reference. Record when the
   valid proof and received funds are matched to the invoice, the decision
   time, and the audit ID. The normal activation target is within one business
   day of a valid match; count business days Monday–Friday, excluding South
   African public holidays. A request or proof received outside an operating
   period is handled during the next operating period. Use the authorized
   `billing.admin.reviewManualPayment` route only after the match and during an
   operating period. Proof upload alone never activates access. Preserve
   unmatched, partial, overpaid, duplicate and unreadable cases for manual
   resolution under B01. If queue load or an absence makes the target
   unreliable, pause new sales before accepting further payable onboarding.
   Never copy a payment proof into a public issue or repository.
5. Check identity, agency/developer approval, publication and support queues.
   Preserve the approved role/ownership boundary. Escalate ambiguous customer
   identity or a wrong entitlement; do not correct it with direct SQL.
6. Review the monitored reply/support mailbox and provider bounce outcomes.
   A provider acceptance result does not prove mailbox delivery. Record a
   customer-safe follow-up where a required notice failed.
7. Only after taking ownership of due items, use the South African public-
   holiday calendar to identify the next actual attended operating check.
   Renew `PAID_MVP_SALES_OPEN_UNTIL` through reviewed hosted configuration to
   no later than that check, using an exact UTC timestamp inside the existing
   weekday-specific runtime limit and 72-hour maximum. Do not increase either
   limit to accommodate a weekend or holiday closure. For example, use a
   Friday-to-Monday 09:00 South Africa time deadline only when its exact UTC
   value passes the existing weekday-specific validator and 72-hour maximum.
   If the next actual check falls beyond the allowed window, let the current
   deadline expire and keep new sales paused until checks resume and a fresh
   bounded window is set. Verify the
   operator status shows the intended deadline and `salesPaused=false` only
   while the window is valid. The app checks expiry on each invoice or
   finance-approval request, without waiting for a restart at the deadline.
   Record the renewal, exact UTC deadline and next attended check in the
   protected operations log. A missed or expired renewal fails closed; it is
   not a reason to raise the runtime cap.

## Planned and unplanned unavailability

Before a planned absence longer than one business day, or any shorter absence
likely to miss the next attended finance check or one-business-day activation
target, Edward records the start and expected return in the protected
operations log and clears or explicitly records every due finance, support,
email and lead item. Set `PAID_MVP_SALES_PAUSED=true` through the reviewed
hosted-runtime configuration and restart. Confirm
`billing.commercialActivation.salesPaused` is true, controlled invoice,
checkout and finance-approval requests reject, pending invoices and proofs
remain recorded, and an existing paid customer's access still works. Keep the
enabled product list unchanged. This is a sales intake control, not a
commercial-entitlement switch. Put an honest away notice on the approved
support channel. Tell customers with open obligations when to expect the next
update. Do not accept payment with a known inability to meet the disclosed
activation target. Customer-owned CRM leads stay visible to their authorized
customer; platform-managed/manual leads need actual human follow-up before
leaving the queue unattended.

Existing invoices and submitted proofs remain recorded while sales are
paused; approval and activation stay blocked. On return, keep sales paused
while triaging and reconciling those obligations. Review readiness and the
oldest support, security/privacy, customer-access, payment and lead items;
match receipts to invoices, handle overdue proofs, assign an owner to every due
obligation, and record any missed customer target and required follow-up. This
return-time reconciliation happens before resumption, while finance activation
is still blocked. If the schedule is not credible or obligations lack an
owner, remain paused. Only after that review, set
`PAID_MVP_SALES_PAUSED=false` with a fresh exact UTC
`PAID_MVP_SALES_OPEN_UNTIL` inside the existing weekday-specific limit and
72-hour maximum, restart, and verify the operator status, invoice/checkout
route, and finance-approval behavior. Approve a pending proof only after
controlled resumption and only when the normal finance match is complete. Do
not change the enabled product list to pause sales: that list also gates
existing paid access.

If Edward becomes unexpectedly unavailable, the last bounded sales window
expires at its exact UTC deadline and automatically pauses new invoices and
finance approval. A missing or expired window also keeps a hosted paid release
paused. Existing paid access remains available. The server rejects late
requests even if a browser still displays an older availability result.
Existing invoices may still receive EFT funds and submitted proofs may still
arrive; pending records remain intact and no proof activates access
automatically. On return, keep sales paused during readiness checks, queue
triage and receipt/proof reconciliation; finance approval remains blocked
until controlled resumption with a fresh bounded window. This automatic cutoff
does not resolve existing obligations or replace a human operator.
Existing support requests stay queued with a clear response expectation.
Automated workers may persist and
alert but are not a human substitute. The service must preserve proofs, queue
rows and leads without auto-approving payment or inventing delivery success.
The first available authorized operator reviews the oldest obligations in
this order: platform-managed leads and security/privacy incidents; customer
access/outages; received funds and pending proofs; bounced/unknown essential
email; other support. Until that review, no new finance approval occurs. If
Edward cannot resume before the stated customer response window, there is no
honest escalation to another human today: record the breach, tell affected
customers as soon as contact is possible, resolve or refund as applicable, and
do not reopen payable intake until the cadence is credible. A repeated breach
or a time-sensitive lead that cannot wait until the next staffed check requires
a real secondary operator or a narrower customer-facing service before
further paid intake.

## Interruptions and recovery

For API/database/Redis failure, stop payable onboarding and new finance
approvals. Record onset, affected release, readiness response and provider
status, then use B17 recovery. Keep existing Railway TiDB and established Azure
unchanged while B08 is parked. Do not improvise a database switch.

For an ambiguous email or lead delivery, preserve the unknown state and seek
provider evidence; never blind retry. For a failed private-proof read, hold the
finance decision until the original object is safely available. For a mismatch
between bank receipt and invoice, do not approve. Record the next attended
operating check before ending an operating period with open obligations.

## Rehearsal and evidence form

Before paid activation, rehearse with controlled records, including the
following schedule and recovery cases:

1. **Ordinary weekend:** finish Friday's queue checks, set a Friday exact UTC
   deadline that remains within the existing runtime weekday-specific limit
   and 72-hour maximum and ends no later than the next attended Monday check,
   then verify the configured deadline. Submit a controlled support request,
   invoice request and proof during the weekend. Confirm any records accepted
   before expiry remain available for Monday review, no finance decision is
   made outside the operating period, and already-paid access stays available.
2. **Extended holiday closure:** when the next attended check would fall
   beyond the existing runtime bound, do not extend the deadline. Allow the
   current window to expire or pause sales before the closure; verify fresh
   invoice/checkout and finance approval are blocked, pending records are
   retained, and paid access is unchanged. Resume only after the first actual
   operating-period review and a fresh bounded window.
3. **Missed check or renewal:** leave the current window unrenewed and prove
   that expiry or a missing window rejects new invoice/checkout and finance
   approval without a restart at expiry. Confirm pending invoices/proofs and
   paid-customer access remain intact, then record the attended review and
   controlled resumption.
4. **Planned pause and return:** before the planned absence, set the manual
   sales pause, restart, and verify invoice/checkout and finance-approval
   rejection, pending-record retention and existing paid access. On return,
   while still paused, triage support/security/privacy/access/payment/lead
   obligations and reconcile bank receipts with proofs. Prove approval remains
   blocked during this work. Then set the pause false with a fresh bounded
   exact UTC window, restart, verify controls and approve only a fully matched
   pending case.
5. **Unexpected absence:** allow the prior finite window to expire. During
   return-time triage, prove the system remains fail-closed and records are
   retained; only the controlled resumption above may reopen finance approval.

Also rehearse one correct Agent, Agency and Developer
invoice/proof/finance/entitlement flow; one unmatched proof; one ambiguous
email outcome; one platform-custodied lead; and one private-proof retrieval
failure. Record actor, local operating time and UTC time, artifact SHA, target
identity, sanitized IDs, exact deadline, observed before/after states,
recovery action and customer contact. No real customer proof or secret belongs
in this repository. The run is accepted only when every pending obligation has
an owner and the product state agrees with the audit record.

Open evidence: actual monitored support/reply route, bounce route, independent
alert delivery, and hosted proof of the schedule-aware pause/resumption
controls. Edward owns the queues initially. Record successful founder-only
rehearsal in the protected operations record before first payment; do not put
personal contact details here. The agreed B15 schedule is reflected in the
review copy, but B14 operational acceptance remains open until rehearsal.
