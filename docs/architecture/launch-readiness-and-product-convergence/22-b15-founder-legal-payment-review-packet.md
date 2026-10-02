# B15 founder review: legal, payment and disclosure

Status: Edward's proposed final wording is prepared for factual completion and
approval. Customer-facing Terms and Privacy are still placeholder pages in
`client/src/pages/NavLandingPage.tsx`; `/terms` and `/privacy` resolve to them.
This packet does not close B15 or authorize payment collection.

The [Edward approval candidate](evidence/b15-founder-approval-candidate-2026-09-24.md)
contains the proposed payment disclosure, Terms and Privacy notice. It carries
the approved V1 operator assignment: Edward alone owns legal/release approval,
finance and support; daily weekday checks; pause new sales, invoices and
payment activation for an absence longer than one business day. The older
[working draft](evidence/b15-customer-copy-review-draft-2026-09-24.md) is
superseded for review. The candidate is not yet suitable for publication
because the factual fields below are unresolved.

## Locked commercial facts from B01

| Topic | Founder-approved fact to carry into final copy |
| --- | --- |
| Supplier/payee | Property Listify (Pty) Ltd, registration 2026/702814/07; public brand Property Listify |
| Products | Independent Agent R499, Agency R999, Developer R1,499, each once-off for 90 days |
| Collection | Manual EFT against product invoice and reference; private proof; actual bank receipt and owner/amount reconciliation; authorized finance approval before access |
| Term | Starts at verified activation; no automatic renewal; renewal is a new manually purchased term |
| Tax state | Founder reports not VAT registered; VAT is not charged; invoice metadata says `not_vat_registered` |
| Exceptions | Unmatched/partial/duplicate/overpayments require manual finance resolution; no automatic extra entitlement |
| Refund | Before activation after received funds, default full refund subject to verified payer and applicable law; no blanket no-refunds rule after activation |
| Scope | Paid access is the three approved value loops; no promise of leads, sales, traffic, ranking, nationwide inventory or externally verified professional status |

## Facts and review needed before Edward can approve publication

Edward must provide or approve the following in one resolved version of the
Terms, Privacy and invoice/payment text:

1. Registered and legal-service address and monitored public support/privacy
   mailbox. These remain founder-confirmation facts. The EFT payee is already
   confirmed as **Property Listify (Pty) Ltd**. Do not publish a bank account
   number in this repository. Edward does not currently offer a V1 public
   support telephone; verify whether a company disclosure telephone is
   required for this electronic offer before payment publication.
2. Scope of service and customer eligibility for Agent, Agency and Developer;
   customer content and moderation rules; attribution and lead handling;
   suspension/expiry; dispute route and governing contact.
3. Review the candidate cancellation, refund and correction process before and
   after activation, including payer verification, timing and statutory rights.
   Confirm how a customer sees it before initiating EFT.
4. Verify current VAT registration status and invoice/receipt wording at release
   time; do not infer status from expected first-cohort revenue. The founder's
   current statement and canonical B01 metadata say VAT is not charged.
5. Complete the actual provider/location, retention/deletion and cookie
   schedules after B10–B12 binding. The [source-level browser data inventory](evidence/b15-browser-data-inventory-2026-09-24.md)
   now identifies necessary session storage, device-local personal drafts,
   first-party event logging, Google Fonts/Maps and the removed global Google
   Analytics tag in the candidate. Verify the candidate notice against the
   released account, enquiry, proof and lead flows. Include real Resend, object
   storage, Railway/frontend and database providers. Do not describe Azure as
   the runtime while Railway remains on TiDB.
6. Customer-facing acceptance mechanism and version/date of Terms and Privacy.
   A link to a placeholder page is not meaningful acceptance.

The government-published [Electronic Communications and Transactions Act,
section 43](https://www.gov.za/sites/default/files/gcis_document/201409/a25-02.pdf)
lists a physical address and telephone among disclosures for a covered
electronic offer. The founder has not supplied either for publication; the
application of that provision and any lawful alternative must be resolved
before taking payment. A South African legal/accounting review is prudent,
while Edward remains the named V1 approver. Primary references are the
[Electronic Communications and Transactions Act](https://www.gov.za/documents/electronic-communications-and-transactions-act),
the [Consumer Protection Act](https://www.gov.za/documents/consumer-protection-act),
and [POPIA](https://www.gov.za/documents/protection-personal-information-act).
SARS publishes the [current VAT registration threshold](https://www.sars.gov.za/faq/what-is-the-new-threshold-for-vat-registration/);
the threshold alone does not establish this company's registration status.

## Engineering acceptance after approval

- Replace the two placeholder pages with the approved, versioned text and a
  real contact route. Make `/terms`, `/privacy`, footer, registration and lead
  collection links reach that same current version.
- Show the exact supplier, amount, once-off 90-day/manual-EFT basis, activation
  condition, tax wording and cancellation/refund route before the customer
  commits to payment. Invoice and customer email must agree with the page.
- Verify the three roles in desktop/mobile browsers, including link opening
  from Agency onboarding and public lead forms. Check that no flow suggests
  instant activation, automatic renewal, VAT charge or guaranteed enquiries.
- Save the legal approver, approval date, copy digest, released SHA and observed
  URLs in the B16/B18 evidence packet. Any later legal text change gets a new
  version and review.

Until these decisions and implementation checks are complete, keep the normal
runtime paid activation gate closed. This is a founder/legal decision gate,
separate from the B08 Railway Pro spend gate.
