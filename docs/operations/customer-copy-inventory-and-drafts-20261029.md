# B15 customer-copy inventory and draft — 2026-10-29

**INTERNAL DRAFT — NOT APPROVED OR READY TO PUBLISH.** Terms of Service and Privacy Notice below are drafts for independent lawyer review. Keep paid intake closed until every [FOUNDER: ...] field is resolved, the exact copy is approved, installed in the released legal bundle, and rendered/checked on each customer surface.

This draft uses the accepted B01/B03 facts in docs/architecture/launch-readiness-and-product-convergence/22-b15-founder-legal-payment-review-packet.md and the existing review copy in evidence/b15-founder-approval-candidate-2026-09-27-v0.4.md. It does not add a card gateway, recurring charge, new product, licensing review, or Land offer. Land stays dark behind its existing launch flag.

## Customer-visible surface inventory

| Customer sees | File and component/route | What is currently shown |
| --- | --- | --- |
| Product price, payment term and outcome claims | client/src/pages/AdvertiseWithUs.tsx (AdvertiseWithUs); client/src/components/advertise/FAQSection.tsx; client/src/pages/advertise/AgentProductLandingPage.tsx; AgencyProductLandingPage.tsx; DeveloperProductLandingPage.tsx; client/src/pages/SubscriptionPlans.tsx; client/src/pages/DeveloperPlans.tsx | Catalog price/term, manual-EFT steps, activation and expiry; product pages also disclaim guaranteed placement, traffic, leads or sales. |
| Product plan details and displayed price | client/src/pages/SubscriptionPlans.tsx; client/src/pages/DeveloperPlans.tsx; client/src/lib/commercialCatalog.ts | Values are catalog-driven. DeveloperPlans conditionally displays “Displayed price includes VAT” only when the catalog flag is true; B01 says no VAT is charged. Verify exact catalog values before publication. |
| Agent invoice request, payment proof and acceptance | client/src/pages/agent/AgentPackageSelection.tsx; client/src/components/commercial/PaidCommitmentDisclosure.tsx; client/src/hooks/usePaidLegalAcceptance.ts | Shared payment facts, current Terms/Privacy links, unchecked purchase acceptance, invoice and proof flow. |
| Developer plan/invoice and proof statuses | client/src/pages/DeveloperPlans.tsx; client/src/components/developer/BillingPanel.tsx; client/src/components/commercial/PaidCommitmentDisclosure.tsx | Catalog price, once-off term, payment proof submission and finance-verification statuses. |
| Invoice, proof and activation messages | server/services/billingFoundationService.ts; server/services/transactionalEmailPolicy.ts | Invoice issued, proof received/rejected, partial/duplicate/excess payment, verified activation. Check current rendered email/template and invoice fields against the copy below. |
| Terms and Privacy pages | client/src/App.tsx routes /terms and /privacy; client/src/pages/NavLandingPage.tsx; client/src/pages/LegalDocumentPage.tsx | Route to API-provided released legal bundle. There is no approved public legal text embedded in this worktree; runtime release contents were not queried. |
| Registration Terms/Privacy acceptance | client/src/pages/Login.tsx; server/services/registrationLegalAcceptanceService.ts | Versioned Terms link and Privacy Notice availability; Terms checkbox. |
| Privacy notice at enquiry capture | client/src/components/property/PropertyContactModal.tsx; client/src/components/agent/AgentProfileEnquiryDialog.tsx; client/src/components/development/DevelopmentLeadDialog.tsx; client/src/pages/DevelopmentQualificationPage.tsx; client/src/components/developer/LeadCaptureForm.tsx; client/src/components/explore/ContactAgentModal.tsx | Privacy Notice link where customer details are submitted. |
| Footer legal links | client/src/components/Footer.tsx; ModernFooter.tsx; client/src/components/services/ServicesSiteFooter.tsx | Terms and/or Privacy links. |
| Agency/Developer terms and authority statements | client/src/components/agency/AgencySetupWizard.tsx; client/src/pages/AgencyOnboarding.tsx; client/src/components/developer/DeveloperSetupWizard.tsx; client/src/components/wizard/steps/ReviewStep.tsx | Agency/Developer terms acceptance and authority/accuracy confirmations; some wording does not link the versioned released bundle. |
| Development listing terms at submit | client/src/components/development-wizard/phases/FinalisationPhase.tsx | “By submitting, you agree to our listing terms”; the referenced terms need to be linked to the approved version. |
| Buyer viewing and listing disclaimer | client/src/pages/PropertyDetailPage.tsx; client/src/components/property/PropertyContactModal.tsx | A viewing request is not a confirmed appointment. Product pages also say search placement/leads/sales are not guaranteed. |
| Advertiser/developer information disclaimer | client/src/components/property/PropertyMediaTypeSection.tsx; client/src/components/property/DeveloperBrandSection.tsx; client/src/pages/DeveloperPublisherPage.tsx | Public property information is supplied by the advertiser; developer identification does not itself imply endorsement or verification. |
| Other visible outcome disclaimer | client/src/pages/services/ServiceProviderProfilePage.tsx | Published feedback is one input, not a guarantee of outcome. This Services statement is separate from B01 Launch Access. |
| Listing authoring agreement check | client/src/components/listing-wizard/ListingWizard.tsx; client/src/components/listing-wizard/steps/BasicInformationStep.tsx; client/src/components/listing-wizard/steps/MediaUploadStep.tsx | No standalone Agent/Agency listing agreement was found in the routed property wizard; current screens give accuracy prompts. Use the proposed authority confirmation below if a customer agreement is required. |
| Separate referral privacy wording | client/src/pages/distribution/PartnerSubmitReferralPage.tsx | Partner privacy notice and consent documents are distinct from B01 Launch Access and need their own reviewed schedule. |

The old client/src/pages/agency/SubscriptionPage.tsx and client/src/pages/agency/BillingDashboard.tsx are not imported by the current route source inspected; /agency/subscription redirects to /agency/billing. LaunchAccessAudiencePage.tsx and SocialProofSection.tsx also have no current production-route import in the inspected source; they are excluded from the active inventory. They are not treated as active copy surfaces without route evidence.

## Copy proposed for customer use after fact resolution

### Price and payment disclosure — before an invoice request and again with invoice instructions

Property Listify (Pty) Ltd (registration 2026/702814/07) offers Independent Agent Launch Access for **R499**, Agency Launch Access for **R999**, and Developer Launch Access for **R1,499**. Each amount is for one fixed **90-day** term and is payable once by manual EFT. There is no automatic renewal. The current B01 decision says Property Listify is not VAT registered and VAT is not charged. [FOUNDER: confirm the prices and VAT position remain correct on the publication date.]

The EFT payee is Property Listify (Pty) Ltd. Request the invoice for your product, pay using the invoice reference, and submit proof through the authenticated billing page. An invoice request, bank transfer or proof upload does not activate access. Finance checks the actual received funds against the invoice, payer, product, amount and owner before approving activation. The term starts only when that activation is recorded. Normal activation target: within one business day after valid proof and matched funds, during the published support hours. [FOUNDER: confirm this activation target remains achievable before publishing.]

For a payment question, contact support@propertylistifysa.co.za. [FOUNDER: confirm this mailbox is active and monitored before publication.] Never send a bank password or public payment-proof link. Bank account details appear only on the issued invoice or signed-in billing page; do not place account numbers in public copy.

### Invoice and payment messages

- **Invoice issued:** “Your Launch Access invoice is ready. Pay the amount shown using the invoice reference, then submit proof from your signed-in billing page. Your 90-day term starts only after finance verifies the received funds and records activation.”
- **Proof received:** “We received your payment proof for invoice [INVOICE NUMBER]. Finance will compare it with the invoice and bank receipt. This message does not confirm payment or activate access.”
- **Payment needs attention:** “We could not verify this payment yet. Check the invoice reference and amount, then contact support@propertylistifysa.co.za or submit corrected information from your signed-in billing page. [FOUNDER: confirm support mailbox is live before publication.]”
- **Payment verified:** “Your payment is verified and your 90-day Launch Access is active from [START DATE] through [END DATE]. It will not renew automatically.”
- **Refund request:** “We received your cancellation/refund request. We will verify the payer, payment and activation status and explain the next step. [FOUNDER: set the normal refund-processing time; applicable legal deadlines still apply.]”

### Terms of Service — draft for lawyer review

**Draft status.** This proposed Terms of Service is for independent lawyer review and founder approval. It is not the published contract. Effective date: [FOUNDER: approve effective date and version].

**Supplier and contact.** The service is supplied by Property Listify (Pty) Ltd, registration number 2026/702814/07. Customer-facing business address recorded in the current founder review is 96 Jorissen Street, Braamfontein. General enquiries: info@propertylistifysa.co.za. Customer and billing support: support@propertylistifysa.co.za. WhatsApp messages: 078 555 8542; this is founder-managed messaging, not a staffed phone line. [FOUNDER: confirm the address is suitable for formal/legal service, any required company disclosures, and that both email addresses and WhatsApp are active and monitored.]

**Service and accounts.** Property Listify provides online property listing, discovery, enquiry and business-workspace tools. Use accurate account, organisation, property and contact details. Submit a listing only when you own it or are authorised to represent it. Keep price, availability, features and contact details current; correct or withdraw information when it changes. Do not submit unlawful, deceptive or infringing material or use another person’s account or enquiry details without authority. Property Listify may review, withhold or remove material under its published safety and publication rules.

**Launch Access.** The Agent, Agency and Developer products, prices, included capabilities and safeguards are shown before purchase. Each approved Launch Access product is a one-time manual-EFT purchase for 90 days. The current B01 amounts are R499, R999 and R1,499 respectively. [FOUNDER: reconfirm amounts and VAT status at publication.] The term starts only after finance matches the received funds to the correct invoice and records activation. Requesting an invoice or uploading proof alone does not activate access. There is no automatic renewal; a later term requires a new invoice and payment. Property Listify does not promise a future renewal price.

**Payment handling.** Pay the invoice amount to the supplier using the invoice reference. Partial, unmatched, duplicate, excess or unreadable payments require manual review and do not create extra access. Do not send bank credentials. Keep payment proof within the authenticated billing flow.

**Listings and enquiries.** You are responsible for the truth and currency of information you submit and for having the right to publish it. Property Listify can make a listing or development public only after the applicable review and publication requirements pass. Approval on the platform does not by itself verify an external professional licence or registration. You permit Property Listify to host and display your submitted material and route related enquiries as needed to provide the service. A buyer or renter enquiry is not a confirmed sale, lease or viewing; the listing representative must confirm availability, terms and appointments.

**Limits and outcomes.** Property Listify provides the tools and workflows described before purchase. It does not guarantee search position, audience size, traffic, enquiries, viewings, sales or transactions. Any numerical product limit comes from the current product page and invoice.

**Cancellation and refunds.** Before activation, if Property Listify has received the funds, the current B01 default is a full refund after payer and payment verification, subject to applicable law. After activation, refund and cancellation requests are reviewed individually; there is no blanket “no refunds” rule and no statutory right is excluded. Contact support@propertylistifysa.co.za with the invoice reference. [FOUNDER: confirm the expected processing time after an approved refund and the final request route; the support mailbox must be operational.]

**Support and interruption.** Support and billing monitoring is Monday–Friday, 09:00–17:00 South Africa time, excluding South African public holidays. Requests can be submitted at any time and are handled during the next operating period. Support is founder-managed; no immediate reply is promised. When the responsible operator is unavailable for more than one business day, new sales, invoice issuance and payment activation pause. [FOUNDER: confirm this support schedule and pause rule remain current.]

**Privacy, marketing and changes.** The Privacy Notice explains personal-information handling and is available where information is collected. Optional marketing choice is separate from required service acceptance. Material Terms changes will be versioned and shown before they apply to a new purchase. South African law applies, subject to rights the law does not permit a supplier to exclude.

### Privacy Notice — draft for lawyer review

**Draft status.** This proposed Privacy Notice is for independent lawyer review and founder approval. It is not the published notice. Version/effective date: [FOUNDER: approve Privacy Notice version and effective date].

**Who is responsible.** Property Listify (Pty) Ltd, registration 2026/702814/07, is responsible for the service processing described here. Its recorded customer-facing address is 96 Jorissen Street, Braamfontein. [FOUNDER: confirm the address and required company disclosures.] Privacy requests: support@propertylistifysa.co.za, subject “Privacy Request”. [FOUNDER: confirm this mailbox is active and monitored.] The current review record does not establish whether the company’s Information Officer registration is complete. [FOUNDER: confirm the status and approved contact wording; do not claim registration is complete without evidence.]

**Information and purposes.** We use account, contact, organisation, professional-verification, listing, development, media, enquiry, payment, billing, support and security information to create and protect accounts; review and display eligible listings; route enquiries; administer invoices and payments; provide support; prevent abuse; and meet applicable legal obligations. We ask you to provide another person’s information only when you are authorised to do so.

**Sharing and storage.** We do not sell personal information. We share an enquiry with the authorised listing, agency or development recipient so they can respond. We use service providers only as needed to operate the service. Private payment proofs are restricted to finance-authorised staff and the relevant account owner. [FOUNDER: list the exact providers, what each handles, processing countries and safeguards from the final accepted production configuration.] No provider or country is guessed in this draft.

**Security.** We use account and access controls appropriate to the service. Payment proofs use a separate private-storage path. No system can be promised risk-free. [FOUNDER: confirm the production provider and security schedule before publication.]

**Your requests.** You may contact us to ask about access to or correction of your personal information, deletion where we are no longer allowed or required to retain it, objection where applicable, or withdrawal of consent where consent is the basis for a use. Email support@propertylistifysa.co.za with “Privacy Request” in the subject. [FOUNDER: confirm mailbox operation.] A complaint may be sent to support first; doing so does not remove any right to contact the Information Regulator.

**Marketing and browser data.** Required account/service messages are separate from optional marketing. We do not treat account creation as marketing consent. Necessary authentication, security and session storage may be used. The current MVP decision excludes advertising and behavioural-tracking cookies. [FOUNDER: list the exact cookies, browser storage, analytics, external requests and any user choice required by the accepted production artifact.]

**Retention.** We do not intend to keep personal information indefinitely. We retain information while needed for its stated purpose and any applicable legal requirement, then delete or de-identify it where appropriate. Finance/tax records follow their required retention period. [FOUNDER: approve category-by-category retention, deletion and legal-hold periods against the current Azure data inventory.]

**Changes.** The current notice version and effective date will be shown on the website. Material changes will be versioned, and registration/collection screens will link to the applicable notice.

### Listing-authority confirmation and marketplace disclaimers

**Agent/Agency property listing confirmation:** “I confirm that I own this property or am authorised to represent it and publish this listing. The price, availability, features, location and contact details I supplied are accurate to the best of my knowledge today. I will correct or withdraw the listing if those details change. I understand the listing is subject to Property Listify’s review and publication rules and that publication does not guarantee enquiries or a transaction.”

**Developer profile confirmation:** “I am authorised to prepare this organisation profile and the information provided is accurate. I will correct it if it changes.” Use the same reviewed statement where the DeveloperSetupWizard and AgencyOnboarding currently ask for authority/accuracy confirmation.

**Development submission:** “I am authorised to submit this development and its details. The information and source material are accurate to the best of my knowledge. Submission does not make the development public; it remains subject to review and publication approval.” Link “development listing terms” to the exact approved version; do not leave the current unlinked phrase.

**Buyer/renter enquiry notice:** “Your details will be sent to the authorised representative for this property so they can respond. A viewing request is not an appointment; the representative must confirm the date and time. Confirm current price, availability and property details with the representative before making a decision.”

**Paid-product result notice:** “Launch Access provides the workspace and capabilities listed for your product. It does not guarantee search placement, traffic, enquiries, viewings, sales or a completed property transaction.”

## Collected founder blanks and recommended defaults

| Blank to resolve | Recommended default |
| --- | --- |
| Prices and tax status at publication | Keep the B01 amounts and no-VAT wording only after same-day founder confirmation against the canonical product catalogue. |
| Effective dates and versions | Use Terms 1.0 and Privacy 1.0, effective on the first paid-launch date after approval. |
| Company place of registration, formal-service address and required disclosure fields | Use only the known company name, registration number and business address until the founder/legal reviewer confirms every required field. |
| Email/WhatsApp support availability and published schedule | Keep the designated email/WhatsApp and 09:00–17:00 weekday schedule only after inbox and contact readback; promise no immediate reply. |
| Refund processing period | Do not publish a number until reviewed. Process approved refunds promptly and within any shorter legal deadline. |
| Provider names, data locations and safeguards | Name only the providers and locations verified against the final production configuration; no guesses from old documents. |
| Retention/deletion periods | Use category-based periods approved against actual data and legal duties; do not promise indefinite storage or invent a blanket period. |
| Cookies, browser storage and external requests | Say only what the final browser artifact uses; keep advertising/behavioural tracking out unless separately approved and correctly disclosed. |
| Information Officer registration/contact wording | Do not claim completed registration until the founder supplies or verifies evidence; use only the lawyer-approved neutral wording meanwhile. |
| Exact Terms/Privacy version approval | Lawyer review, founder approval, fixed digest, installation and customer-browser proof before paid intake opens. |

**Review sources:** B01/B03 terms above; existing B15 founder review packet and v0.4 copy; [POPIA text, Department of Justice](https://www.justice.gov.za/legislation/acts/2013-004.pdf); [Consumer Protection Act, South African Government](https://www.gov.za/sites/default/files/32186_467.pdf); [Information Regulator eServices](https://eservices.inforegulator.org.za/services.aspx). These links are reference material for lawyer review, not legal clearance.
