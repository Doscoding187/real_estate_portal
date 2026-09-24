# B15 founder review: legal, payment and disclosure

Status: review packet prepared on 2026-09-24. Customer-facing Terms and Privacy
are still placeholder pages in `client/src/pages/NavLandingPage.tsx`; `/terms`
and `/privacy` resolve to them. This packet is not approved legal copy and does
not close B15 or authorize payment collection.

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

## Decisions and supplied facts needed before copy can be final

The founder and a South African legal/accounting reviewer should provide or
approve the following in one marked-up version of the Terms, Privacy and
invoice/payment text:

1. Registered and service addresses, public support email and telephone,
   company office-bearer details where required, and the exact bank/payee
   display name. Do not publish a bank account number in this repository.
2. Scope of service and customer eligibility for Agent, Agency and Developer;
   customer content and moderation rules; attribution and lead handling;
   suspension/expiry; dispute route and governing contact.
3. Cancellation, refund and correction process before and after activation,
   including timing, evidence, payer verification and statutory exceptions.
   Confirm how a customer sees this before initiating EFT.
4. Invoice/receipt wording, tax representation and accounting treatment.
   Verify current VAT registration status with the accountant at release time;
   do not infer status from expected first-cohort revenue.
5. Privacy notice: responsible party and contact, purpose and legal basis for
   account, enquiry, proof and lead processing; recipient categories and
   provider locations; retention/deletion; access/correction/objection route;
   cookies, direct marketing and incident contact. Include real B10 Resend,
   B11 object storage, Railway/Vercel and database flows once bound.
6. Customer-facing acceptance mechanism and version/date of Terms and Privacy.
   A link to a placeholder page is not meaningful acceptance.

The legal reviewer should confirm which consumer and electronic-commerce
provisions apply to these specific B2B/B2C flows. Primary references for that
review are the [Electronic Communications and Transactions Act](https://www.gov.za/documents/electronic-communications-and-transactions-act),
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
