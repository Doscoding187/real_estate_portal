# B14 first-customer operating procedure

Status: founder-only bootstrap model recorded; staffed and unavailable-state
rehearsal remains open. No production or provider rehearsal is claimed. This
procedure follows the founder-approved [B01 commercial policy](03-launch-register.md#lrc-pay-001-b01-founder-commercial-and-operating-decision--2026-09-17).

## Before the first payable customer

Edward is the V1 Founder/Managing Director/Release Approver, Finance Operator
and Support Operator. No secondary operator is appointed. For the first 10–20
paying customers, one operator is acceptable as a bounded bootstrap model if
he performs the founder-approved daily weekday finance and support checks,
monitors a public support/reply route, and checks email, leads and readiness
within that schedule. Publish the response window without implying round-the-clock
staffing. B01's normal target after a valid matched proof is within one
business day; proof never activates access automatically.

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

## Daily staffed checks

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
4. Check `billing.admin.financeQueue` for submitted and under-review proofs.
   Compare the private proof and invoice with the actual bank receipt, payer,
   owner, amount and reference. Use the authorized
   `billing.admin.reviewManualPayment` route only after the match. Proof upload
   alone never activates access. Record the decision/audit ID, and preserve
   unmatched, partial, overpaid and duplicate cases for manual resolution under
   B01. Never copy a payment proof into a public issue or repository.
5. Check identity, agency/developer approval, publication and support queues.
   Preserve the approved role/ownership boundary. Escalate ambiguous customer
   identity or a wrong entitlement; do not correct it with direct SQL.
6. Review the monitored reply/support mailbox and provider bounce outcomes.
   A provider acceptance result does not prove mailbox delivery. Record a
   customer-safe follow-up where a required notice failed.
7. Only after taking ownership of due items, renew
   `PAID_MVP_SALES_OPEN_UNTIL` through reviewed hosted configuration to the next
   staffed weekday check. Use an exact UTC timestamp no more than 72 hours
   ahead; a missed renewal must close new sales automatically. Verify the
   operator status shows the new deadline and `salesPaused=false`. The app
   checks expiry on each invoice or finance-approval request, without waiting
   for a restart at the deadline. Record the renewal and next check time in
   the protected operations log.

## Planned and unplanned unavailability

Before a planned absence longer than one business day, Edward records the
start and expected return in the protected operations log, clears or records
every due finance, support, email and lead item, and stops issuing new payable
invoices or accepting new paid onboarding or payment activation. For the paid
release, set `PAID_MVP_SALES_PAUSED=true` through the reviewed hosted-runtime
configuration and restart; confirm `billing.commercialActivation.salesPaused`
is true, a controlled invoice request and finance approval both reject, and
an existing paid customer's access still works. This is a sales intake control,
not a commercial-entitlement switch. Put an honest away notice on the approved
support channel. Tell customers with open obligations when to expect the next
update. Do not accept payment with a known inability to meet the disclosed
activation target. Customer-owned CRM leads stay visible to their authorized
customer; platform-managed/manual leads need actual human follow-up before
leaving the queue unattended.

Existing invoices and submitted proofs remain recorded while sales are
paused; no one is authorized to approve them in Edward's absence. On return,
review those obligations and bank receipts first. Only then set
`PAID_MVP_SALES_PAUSED=false` with a fresh `PAID_MVP_SALES_OPEN_UNTIL` through
the reviewed runtime configuration and
verify the public status and invoice route reopen. Do not change the enabled
product list to pause sales: that list also gates existing paid access.

If Edward becomes unexpectedly unavailable, the last founder-renewed sales
window expires no later than the next staffed weekday check and automatically
pauses new invoices and finance approval. A missing window also keeps a hosted
paid release paused. Existing paid access remains available. The server rejects
late requests even if a browser still displays an older availability result.
Existing invoices may still receive EFT funds and submitted proofs may still
arrive; no proof activates access automatically. This automatic cutoff does not
resolve existing obligations or replace a human operator. Before first payment,
rehearse expiry on the exact hosted candidate with a short controlled window,
then renew it and verify paid access stays active during the pause.
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
between bank receipt and invoice, do not approve. Record the next founder
check time before ending a staffed period with open obligations.

## Rehearsal and evidence form

Before paid activation, rehearse with controlled records: one correct Agent,
Agency and Developer invoice/proof/finance/entitlement flow; one unmatched
proof; one ambiguous email outcome; one platform-custodied lead; one private
proof retrieval failure; and a planned founder-unavailable pause/resume with
an outstanding support and lead item. Record actor, UTC time, artifact SHA,
target identity, sanitized IDs, observed before/after
states, recovery action and customer contact. No real customer proof or secret
belongs in this repository. The run is accepted only when every pending
obligation has an owner and the product state agrees with the audit record.

Open human facts: actual monitored support/reply route, bounce route,
independent alert delivery, and hosted proof of the sales-pause control. Edward
owns all four queues initially. Record these and the successful
founder-only rehearsal in the protected operations record before first
payment; do not put personal contact details here.
