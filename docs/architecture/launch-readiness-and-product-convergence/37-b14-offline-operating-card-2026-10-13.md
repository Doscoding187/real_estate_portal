# B14 founder operating card

13 October 2026. Prepared procedure, synthetic examples and one completed founder desk scenario. No hosted rehearsal or full B14 acceptance. B14 OPEN; eight scopes accepted.
This follows the approved business copy in packet 36 and the October 12 calendar.

## Owner and calendar

Edward owns finance, moderation, customer support, privacy requests, pending
email obligations, absence containment and the decision to resume sales. There
is no appointed backup. A later delegate must have an explicit responsibility
and the appropriate access before taking over. The architect prepares release
and verification evidence; it does not approve a bank match as Edward.

Operating hours: Monday–Friday 09:00–17:00 SAST, excluding South African public
holidays. Edward confirmed queue checks at 09:00, 13:00 and 16:30 SAST. These are
07:00, 11:00 and 14:30 UTC. Incoming requests outside hours remain recorded for
the next operating period. A response is not promised immediately on WhatsApp.

At each check:

1. Check personal availability and admitted system readiness. Inspect outstanding
   payments/refunds, moderation, support/privacy, email delivery exceptions and
   independently delivered alerts. Record the check even when a queue is empty.
2. Give each unresolved item a case reference, owner, state, action required and
   exact next staffed check. Link private evidence rather than copying proofs,
   IDs or bank payloads into a public log.
3. At opening, only after the release is separately admitted and readiness
   reconciled, use its governed operation to renew a finite sales window. The
   operating target is the same day at 17:00 SAST (15:00 UTC). Do not create an
   unattended recurring renewal or use this card as deployment approval.
4. At 16:30, reconcile unresolved obligations and their next check. Prepare the
   next operating day. The finite sales window ends at 17:00; the closing check
   does not extend sales overnight or through a weekend or holiday.

The current source bounds a window by the next weekday/72-hour maximum and
expires it automatically. It **does not calculate public holidays**. The
operator must select the actual staffed day and pause for holidays or absence;
the 72-hour maximum is not permission for unattended weekend sales. Evidence:
`server/services/commercialActivationPolicy.ts`, `parseSalesOpenUntil` and
`effectiveSalesPause`. Missing availability is a reason to leave sales paused.

## Finance decisions

| Situation                 | Decision and customer handling                                                                                                                                                         | Next action                                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Correct receipt           | Compare actual bank receipt with invoice, payer, reference, amount, product and canonical owner. Approve the correct term once. Proof alone cannot activate.                           | Normally activate within one business day after valid proof and matched funds, within operating hours. Retain bank/invoice/audit references. |
| Partial payment           | Keep pending, explain the shortfall privately and request correction.                                                                                                                  | Next staffed check; preserve the original amount and outstanding obligation.                                                                 |
| Unmatched payer/reference | Keep pending and request only the information needed to resolve the match.                                                                                                             | Next staffed check; never infer a recipient or entitlement from a screenshot alone.                                                          |
| Duplicate/excess          | Keep reconciliation under review; no additional term or automatic extension. Review correction/refund with the verified payer.                                                         | Record each bank transaction and the single original invoice/term.                                                                           |
| Unreadable proof          | Request a corrected private upload from the authorised owner.                                                                                                                          | Preserve pending state; do not seek a public document link.                                                                                  |
| Wrong-owner request       | Deny private access and keep the proof private.                                                                                                                                        | Investigate an unexpected access attempt separately; do not disclose another owner's document.                                               |
| Refund/cancellation       | Verify payer and receipt. Before activation, the approved default is full refund subject to applicable law. After activation, review individually against service supplied and rights. | Explain the decision and refund route privately; no blanket no-refunds rule.                                                                 |

## Moderation, support and privacy

Moderation checks identity, authority and the relevant content rule. Record the
decision, reason, evidence and correction/appeal route where lawful and
practicable. Approval of an account does not claim independent professional
licence verification. Refusal of content does not erase payment or support
obligations.

Support and privacy cases use `support@propertylistifysa.co.za`; general enquiries
use `info@propertylistifysa.co.za`. Identify privacy requests by subject and
substance, not by requiring a particular subject line as a condition of rights.
Record the request, necessary identity/authority verification, relevant records,
applicable due action and outcome. Review attachments separately and collect
only necessary identity information. A customer can approach the regulator
without first exhausting the support route. No new legal deadline is invented
by this card; use the applicable reviewed request procedure.

For a bounce or ambiguous delivery, preserve the obligation and inspect the
authoritative provider/queue outcome before using an approved retry. Do not
assume a timeout means nothing was sent. Record the send attempt and outcome
reference. Missing delivery or an alert requiring action remains assigned to
Edward; a local test capture is not a delivered mailbox message.

## Absence, incident and return

The approved source copy requires pausing new sales, invoice issuance and
payment activation before a known absence exceeding one business day. Record
the planned return and next check. Preserve accepted payments, existing term
history, outstanding enquiries, refund requests and service obligations. Do
not represent this as a tested hosted pause or a new weekend shift.

For unexpected absence, leave the finite window to expire and keep obligations
recorded. For an incident, use the approved containment/recovery procedure and
record the independent alert and decision. Do not continue an ambiguous finance
approval, resend or restore without resolving its authority and outcome.

On return, review bank/invoice reconciliation, pending refunds, moderation,
support/privacy, delivery exceptions and system readiness before a reviewed
finite renewal. A fresh check is necessary; do not reopen merely because the
calendar says the founder has returned.

## Synthetic desk examples

These timestamps illustrate the calendar; no message, bank transaction or
founder action is claimed to have occurred.

| Example                                             | Expected next staffed check                                                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Tuesday 13 October 2026, 12:40 SAST unresolved case | Same day 13:00 SAST / 11:00 UTC                                                                                                   |
| Friday 16 October, 16:45 SAST unmatched payment     | Monday 19 October 09:00 SAST / 07:00 UTC, subject to actual availability and the public-holiday calendar                          |
| Saturday 17 October, 11:00 SAST support message     | Monday 19 October 09:00 SAST / 07:00 UTC, under the same conditions                                                               |
| Founder unavailable on the planned next day         | Sales remain paused; record the actual return/next staffed check rather than pretending the ordinary calendar is staffed          |
| Designated public holiday in a rehearsal            | Skip the simulated non-operating day and choose the next confirmed staffed period; this source guard does not do that calculation |

## Evidence capture and remaining work

Use one record per case: case reference, observed time, owner, category, current
state, verified evidence references, decision/action, next check, applicable
deadline basis, customer message reference and closure/result. Actual bank and
identity payloads remain private. Do not prefill actual outcomes with these
expected decisions.

Packet 35 retains 33 real disposable-MySQL cases, including owner isolation,
manual-EFT lifecycle, overpayment under review, rejected-proof resubmission and
paused-sales preservation. Its synthetic operator/bank/email fixtures prove
local application behaviour. They do not complete the founder walkthrough,
actual bank matching, private-document delivery, mailbox reply, independent
alert, holiday handling or hosted pause/resumption.

The human walkthrough and specified hosted observations remain to capture in
the shared return-day exercise. This card resolves the approved policy into
one usable procedure; it does not change the accepted-scope count or admit a
worker, deployment, finance mutation or paid sale.

## Founder desk scenario completed — 13 October 2026

Edward answered the Friday wrong-reference EFT plus Monday/Tuesday absence
scenario in this conversation. Decision: record received funds as unmatched and
unreconciled, retain private bank evidence/amount/date and seek the intended
account/invoice; no allocation, receipt or activation before correct matching.
Preserve existing customers' access and obligations, review deadlines/support
before leaving, and tell affected customers what awaits his return. With no
backup, pause sales requiring payment verification, activation or unsupported
service delivery; enquiries may be recorded without taking payment or promising
an unsupported start date. Check before Friday close and again **Wednesday
09:00 SAST** after return, reconcile before dependent action and preserve all
pending obligations. This is a founder desk walkthrough, not a bank event or a
live pause/renewal. The response is retained verbatim in the existing B15
closeout evidence folder's progression receipt.

Outcome: this combined unmatched-payment, weekend, absence and return desk case
is complete. It does not claim the other finance/moderation/support cases,
monitored mailbox/alert, actual bank matching or hosted pause/resumption. Those
specific observations continue in the existing shared exercise; no new general
review or adviser approval is introduced.
