# B14 first-customer operating procedure

Status: prepared for a staffed rehearsal; no production or provider rehearsal is
claimed. This procedure follows the founder-approved [B01 commercial policy](03-launch-register.md#lrc-pay-001-b01-founder-commercial-and-operating-decision--2026-09-17).

## Before the first payable customer

Edward is the initial finance, moderation, support and release operator. Record
a named backup with the same approved role, a contact route and a handover test
before accepting payment. A single unavailable operator cannot leave payment
proofs, customer support or platform-custodied leads unattended. Record the
staffed hours and the customer-facing response promise; B01's normal target
after a valid matched proof is within one business day.

Confirm the exact released SHA, product activation reference, readiness and
legal pages under B16/B18. Confirm the B10 email supervisor and B13 lead cron
are running, the B11 private bucket has passed a real controlled put/read, and
the B17 monitor reaches the named primary and backup. These are separate
acceptance records; a green API liveness response is insufficient.

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

## Interruptions and handover

For API/database/Redis failure, stop payable onboarding and new finance
approvals. Record onset, affected release, readiness response and provider
status, then use B17 recovery. Keep existing Railway TiDB and established Azure
unchanged while B08 is parked. Do not improvise a database switch.

For an ambiguous email or lead delivery, preserve the unknown state and seek
provider evidence; never blind retry. For a failed private-proof read, hold the
finance decision until the original object is safely available. For a mismatch
between bank receipt and invoice, do not approve. Notify the backup operator
before a shift ends with open customer obligations.

## Rehearsal and evidence form

Before paid activation, rehearse with controlled records: one correct Agent,
Agency and Developer invoice/proof/finance/entitlement flow; one unmatched
proof; one ambiguous email outcome; one platform-custodied lead; one private
proof retrieval failure; and primary-to-backup handover. Record actor, UTC
time, artifact SHA, target identity, sanitized IDs, observed before/after
states, recovery action and customer contact. No real customer proof or secret
belongs in this repository. The run is accepted only when every pending
obligation has an owner and the product state agrees with the audit record.

Open human decisions: named backup, staffed hours, support/reply mailbox owner,
bounce owner and escalation contact. Record these in the protected operations
record before first payment; do not put personal contact details here.
