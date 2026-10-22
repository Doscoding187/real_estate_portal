# Private-owner MVP product and architecture contract

**Version:** 0.1 — founder review draft. **Date:** 12 October 2026.

**Disposition:** strategic direction agreed in principle; recommendations and future acceptance requirements below are not approved runtime authority. No owner product, price, role, entitlement, schema change, commercial activation or release is authorised by this document. Open decisions are in the [founder decision record](founder-decision-record.md).

**Verified source baseline:** freshly fetched `origin/main` at `c475ed7249c3cc263a7554deb274e8d5bfd76dd0`, including the owner information panel/public chrome cleanup (#602/#603), held-worker diagnostic (#604) and Services V1 reconciliation (#607, superseding #581). These are merged-source findings, not live-deployment or hosted-acceptance claims.

**Task branch:** `docs/private-owner-mvp-contract-20261012`. Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-private-owner-mvp-contract-20261012`. Scope: documentation only. Existing professional launch acceptance remains independent.

## 1. Product and audience boundaries

The proposed service helps a private seller or landlord prepare a property, publish through review and commercial controls, attract interest through defined marketing deliverables, and manage enquiries while retaining control.

Two strategic routes remain distinct:

- **Private route:** the owner chooses and purchases listing/marketing services and manages buyer or tenant discussions. This draft defines the minimum proposed product.
- **Professional assistance:** the owner may browse professionals or submit an accurately described request. Introductions, mandates, viewing assistance, negotiation and managed transactions are unavailable until their contracts, authorisation and delivery process are separately approved.

| Relationship | Authority | It does not grant |
| --- | --- | --- |
| Listing account custodian | Authenticated person authorised to create/manage this listing; resolved server-side | Proof of legal property ownership or professional permissions |
| Legal owner / authorised representative | Right to advertise, declaration and evidence under the approved review process | Automatic publication or payment entitlement |
| Buyer / tenant | Public discovery and consented enquiry submission | Private listing, owner-document or other enquiry access |
| Agent / agency | Only the representation or participation explicitly authorised for the property | Ownership transfer merely because assistance was requested |
| Service provider | The specifically selected service request under Services V1 | Listing edit/publication rights or access to property buyer/tenant enquiries |
| Property Listify operator | The minimum audited access needed for assigned moderation, marketing, finance or support work | Unrestricted commercial overrides or unrecorded impersonation |

A single person may have several relationships. The `users.role` enum must not be used as proof of ownership or the sole description of a property's commercial context. Initially excluding professional-account private listings is a possible pilot restriction requiring D01, not a reason to misattribute their property to an agency.

## 2. Smallest useful proposed scope

Support residential **sale and rental** semantics. Select the first paid pilot cohort through D01; do not quietly include rental operational services merely because a rental listing is supported.

Recommended initial property allow-list: House, Apartment and Townhouse, subject to canonical type mapping. One property and one selected sale/rental journey per package. A change of owner, property or commercial journey is not a silent edit to reuse an entitlement.

The owner can prepare and save a draft, edit supported fields/media, submit through the approved process, see status/rejection reasons, receive and manage enquiries, and withdraw the listing. Renewal requires an explicit decision and valid entitlement. A compact “My properties” surface is proposed; a duplicate professional CRM or portfolio-management platform is not needed.

Initial exclusions: Land, Commercial, auction, specialist shared-living, automatic owner-to-agent handoff, automated valuation, tenant screening, lease drafting, deposits/rent collection, property management, guaranteed leads/results and automated performance advice. Land and Commercial remain governed by their own contracts; the generic wizard must not widen into them.

**Current public entry remains unchanged:** preparation `/advertise` states owner self-service is unavailable and links to `/contact?area=other&topic=listing-preparation` and `/agents`. An assisted request does not publish a property. Future owner routes are design decisions, not enabled paths in this draft.

## 3. Listing authority and permissions

Reuse the authored canonical Listing and public Property projection. `Listing.ownerId` identifies account custody, not independently verified title. Preserve agent/agency custody rules for professional inventory.

Private-owner context must be explicit and durable in the approved design, with server-derived relationships. Absence of an agent, a label in the client, a current role or generic metadata cannot mint owner publication authority. No new owner role is prescribed; determine the minimum representation/commercial-context model in the architecture decision before schema work.

### Proposed permission matrix

“Own” means the exact server-authorised listing/order/request relationship. These are requirements for future implementation, not claims about present permissions.

| Actor | Draft / media | Submit / withdraw | Approve / publish | Payment evidence | Buyer/tenant enquiries | Services request |
| --- | --- | --- | --- | --- | --- | --- |
| Anonymous | None | None | None | None | Submit only for eligible public inventory under public enquiry rules; no private reads | Browse published directory; sign in when required to request |
| Owner A | Own only | Own; eligibility/lifecycle gates apply | Cannot self-approve; publication only through governed command | Own order/proof only | Own listing enquiries only | Own selected-provider request |
| Owner B / unrelated account | None for A | None for A | None for A | None for A | None for A | None for A |
| Agent/agency, no owner authorisation | No private-owner access | None | None | None | None | Only their own request |
| Selected provider | No listing/media authority; only intentionally shared service context | None | Cannot approve property publication | No owner order/proof access | No property-enquiry access | Assigned request only, under Services V1 custody |
| Assigned content/marketing operator | Approved minimum draft/assets and agreed edits; audit required | No owner consent substitution | No publication power solely from assignment | None by default | None by default | No unrelated request access |
| Approved reviewer | Necessary listing/disclosure evidence | Review disposition; protective removal under approved policy | Approval authority; entitlement must still pass | None by default | No general inbox access | Provider publication remains separate super-admin authority |
| Finance operator | None by default | None | Cannot self-approve/publicise inventory | Necessary reconciliation/refund evidence, audited | None | None |
| Delivery worker | No browsing/editing authority | None | None | None | Only admitted delivery obligations and minimum recipient data | Existing Services transport only if separately supported |
| Operational support / super-admin | Explicit justified, audited exception under existing authority | Protective action within approved scope | No entitlement/consent bypass | Authorised support/finance scope only | Minimum incident/customer-support scope | Existing Services operational exception |

Implementation must enforce the matrix in APIs and data access, not merely routes. A client-supplied owner, agency, recipient, provider or order ID cannot expand scope. Account switching must clear/re-scope draft hydration and private caches. Document/media reservations and delivery destinations must belong to the authorised principal.

## 4. Lifecycle: four separate dimensions

Keep **authorship/review**, **commercial entitlement**, **public eligibility** and **marketing fulfilment** distinct. Display states below are conceptual; they do not instruct adding four competing schema lifecycles or new enum values. Map them to existing authorities in the approved design.

Recommended first payment sequence: draft → non-publishing suitability/right-to-advertise precheck → agreed order/invoice → verified payment → formal review → controlled publication. The precheck does not warrant approval. D03 must approve payment timing and rejection/cancellation remedies before money is accepted. Approval-before-payment is an alternative requiring an explicit owner-review design; current professional submission entitlement checks must remain intact.

| Customer condition | Required transition / authority | Public consequence |
| --- | --- | --- |
| Draft saved | Server derives custodian/context; validates supported data/media/location | Private; no public projection or enquiry acquisition |
| Preparation/precheck | Approved operator checks completeness and right-to-advertise evidence; unresolved disputes stop progression | Private; no approval/publication claim |
| Order awaiting payment | Approved package, exact listing/customer, terms/amount/currency/reference; invoice is not entitlement | Private |
| Proof uploaded / payment pending | Private evidence and authorised finance review | Private; proof alone cannot activate |
| Partial, unmatched, duplicate or uncertain payment | Recorded operator disposition; reconcile identity/reference/amount; retries are idempotent | No additional entitlement or publication |
| Payment accepted | Canonical finance event establishes the scoped commercial right under approved owner product authority | Still private until review and all public guards pass |
| Submitted / pending review | Owner eligibility, valid content/disclosures, media, location and applicable entitlement; reviewer records reason/evidence | Submission is not publication |
| Rejected | Owner sees appropriate actionable reasons; resubmission and refund/undelivered work follow approved terms | Private |
| Approved but not public | Reviewer acceptance exists, but paid/release/recipient/public eligibility may still block | No “live” claim until public readback succeeds |
| Published | Current reviewed revision, owner authority, term, release admission and actionable enquiry custody all pass | Existing Property projection/search/PDP becomes eligible; record start/end |
| Material edit | Create/review canonical revision; do not silently mutate approved public facts | Previous valid revision stays until replacement approval; remove if a protective issue requires it |
| Withdrawn / expired / sold / rented | Stop acquisition through canonical lifecycle/public eligibility; preserve history and existing enquiry custody | Exclude public search/PDP/enquiry acquisition; communicate accurately |
| Renewal / reactivation | Explicit renewed package and fresh eligibility where needed | No automatic renewal, hidden reset or free term extension |
| Refund / payment reversal / dispute | Finance and fulfilment records reconcile actual obligations and any entitlement effect | Apply approved access/publication policy; retain lawful history, never erase payment evidence |

**Proposed term rule:** standard listing visibility begins on the first successful governed publication, not invoice creation, proof upload or an unverified bank event. Manual work may begin earlier only with customer consent and disclosed cancellation treatment. D03 must decide maximum pre-publication delay and suspension/credit/refund treatment; no numeric duration is approved.

Expiry is enforced by public eligibility at read/acquisition time, so a stopped scheduler cannot indefinitely preserve visibility. Existing enquiries remain accessible to their authorised parties according to retention rules; expiry does not reroute or release them to other principals. Withdrawal must invalidate future promotion tasks and remove/update controlled channel posts where possible, without promising deletion of third-party copies.

## 5. Packages and deliverable boundaries

Names below are internal proposals. Prices, listing term, service timing and refund rules remain open. Do not inherit professional Launch Access pricing or its 90-day duration.

| Package | Proposed deliverable specification | Availability condition |
| --- | --- | --- |
| Owner listing + marketing starter | One eligible property; defined visibility term; reviewed description/photo presentation; one approved share-asset pack; one defined organic social deliverable on an agreed channel; owner enquiry/status access | D01–D06 resolved, actual marketing operator/channel capacity, functioning owner journey and hosted proof |
| Enhanced marketing | Starter plus separately itemised content/video or campaign work; client ad budget distinguished from service fee | Real supplier/operator, scope/rights/approvals, campaign controls and delivery proof; not initial availability by default |
| Assisted package | Specified higher-touch preparation/coordination, with named deliverables and limits | Separate operating and regulatory approval; no implied mandate, negotiation or managed sale/letting |
| Optional service | A named supplier's scope, quotation/pricing method, responsibility, rights, cancellation/remedy process | A real contract/delivery process; Services V1 directory request alone is not a purchase |

The starter's exact content/asset/channel specification needs D02. If a promised marketing task cannot be staffed and evidenced, revise the package before selling it; do not quietly remove marketing from the proposition or substitute a footer social link.

### Manual marketing operating record

Minimum record: order/listing/revision reference, purchased deliverables, owner asset/copy approval, publication/media rights, assigned operator/supplier, agreed channel/budget, due/status information, delivery link or protected evidence, cost/time, update/withdrawal action, customer acceptance/complaint and remedy. A controlled operations register can support an attended pilot; it must have access control and traceable references and cannot grant runtime publication/payment permissions.

No fabricated property features, testimonial, valuation, reach or campaign result. Material image alteration, renders/virtual staging and paid relationships require appropriate disclosure. Existing Explore organic/editorial/sponsored separation remains binding. A quality-gated `featured` flag does not establish purchased placement, campaign fulfilment or exposure guarantees.

## 6. Enquiries and optional professional support

Residential owner enquiries extend the canonical public-lead capture/custody/delivery authority. Do not dual-write into Services leads, agency CRM or a new owner enquiry store. Existing `lead_deliveries.recipientUserId` may be reusable; approved recipient/purpose/source semantics and worker permissions must be established before claiming delivery.

Required behavior:

- Resolve owner recipient and verified destination from the current server-authorised listing context. Reject invalid or unpublishable target; do not accept client recipient overrides.
- Record the enquiry and durable delivery obligation atomically where required. Replay of the same key/payload returns the same obligation; changed material payload cannot silently reuse it.
- Separate “enquiry received” from “delivered” and “owner responded.” Provider acceptance, mailbox receipt and the eventual viewing are distinct evidence.
- Keep owner inbox access scoped; explicitly address wrong-owner reads, reassignment, revoked sessions, duplicate retry, worker restart and uncertain delivery outcomes. Never force-resend an unknown outcome without reconciliation.
- Let the owner record basic follow-up state only if that writer and its provenance are approved. A viewing request is not a confirmed viewing. Do not require a full calendar/transaction CRM before the pilot.
- Public contact exposure, especially WhatsApp and precise address, is a D04 privacy decision. Existing professional submission requirements must not silently force an owner's private details into public DTOs.

### Services V1 relationship

The merged [Services V1 contract](../services-v1-product-contract.md) supports published-provider discovery and one selected provider request, using `service_leads` and its events. It does not implement booking, escrow, formal quotations, automatic matching, paid plans or guaranteed fulfilment. A status named “quoted” is not a formal quote contract.

Owner services requests stay in that authority. Share only the chosen request details and authorised property context; never forward buyer enquiries, proof documents or the entire owner draft. Services' exact listed-coverage matching is not canonical location/radius proof. Do not retrofit its geography or widen a request in this owner workstream.

Actual agent introductions or representation need a separately approved, owner-authorised process covering scope, data sharing, fees and listing control. An assistance form or `/agents` link must not claim such a process has completed. Listing custody remains unchanged unless an explicit authorised transfer/delegation command is separately designed and approved.

## 7. Evidence, privacy, abuse and reporting

For the starter, show only sourced status, listing term, recorded enquiry/delivery counts and fulfilled marketing tasks, with date/window/definition and “unavailable” where data is absent. Public detail request counters are not unique visitors, bot-filtered reach or a valid conversion denominator. Authenticated recently-viewed facts are consumer history, not an owner exposure stream. The generic Express analytics tracker currently does not persist its payload.

Do not publish conversion rates, guaranteed leads, time-to-sale/let reductions or price recommendations from current counters. Later reporting needs event definitions, purpose/consent, identity/bot policy, aggregation, owner-scope checks and measured coverage. Time on market alone cannot trigger advice to reduce price, renovate or appoint an agent.

Specify retention separately for draft assets, right-to-advertise evidence, customer consent, buyer enquiries, service requests, finance documents and marketing receipts. Use approved private document storage and existing public media delivery; public assets must never embed proof documents, internal tokens or unauthorised private contact details. Keep raw personal information out of analytics/operational public evidence.

Pilot controls include rate/size limits, authorised upload manifests, duplicate listing/spam review, impersonation/property-right disputes, takedown, account/session revocation and a staffed escalation path. Define a documented pause/remedy for suspected fraud; do not infer ownership from successful payment or contact confirmation.

## 8. Architecture boundaries and smallest approved-design changes

| Concern | Reuse candidate | Missing contract / minimum design question |
| --- | --- | --- |
| Accounts | `users`, default consumer account, email verification | Owner capability and property authority; multi-persona policy; no automatic new role |
| Authoring | Listing owner/media/geography, wizard hooks, revisions and review queue | Explicit private-owner context, owner surface and scoped preparation/review access |
| Commercial | Canonical billable accounts/invoices/payment/document/finance services | Owner principal and per-property package entitlement. Current account CHECK/enum is professional-only; unique user account behavior needs deliberate multi-persona design |
| Publication | Existing entitlement service, review and Property projection | Owner rule across every publish-capable path, term/read eligibility, manual owner review; no verified-agent fast-track inheritance |
| Public identity | Existing eligible supply DTO, search/card/PDP | Explicit owner provenance/contact representation; legacy private-card label is not authorization |
| Enquiry | Canonical public capture, custody, delivery and existing typed user reference | Owner recipient/purpose/source, scoped reads and verified delivery/worker consumers |
| Marketing | Existing descriptions/media/SEO; controlled manual register | Purchased task evidence; no revived retired boost model or hidden paid organic rank |
| Optional supplier request | Services V1 request authority | Actual contractual fulfilment remains separate; no cross-domain lead dual write |

Review under [Database Authority](../../database-authority/00-database-authority-agent-entry.md), [policy](../database-authority-policy.md), [exception register](../database-compatibility-exceptions.md) and [change protocol](../../database-authority/database-change-protocol.md). Approve exact model/invariants before authoring canonical migration, inventory and consumers together. No legacy schema guessing, alternate runner, parallel owner database or metadata workaround for professional-only CHECKs.

Current evidence paths: `drizzle/schema/core.ts`, `drizzle/schema/listings.ts`, `drizzle/schema/billing.ts`, `drizzle/schema/leads.ts`; `server/services/listingContentCustody.ts`, `listingPublicationEntitlementService.ts`, `publicPropertyEligibilityService.ts`, `publicLeadCustodyService.ts`, `publicLeadCaptureService.ts`, `leadDeliveryService.ts`; `server/listingRouter.ts`, `server/routers.ts`; `shared/types.ts`, `shared/commercialActivation.ts`; `client/src/pages/AdvertiseWithUs.tsx`, `PropertyDetailPage.tsx` and `client/src/hooks/useListingWizard.ts`.

## 9. Commercial and operational approval

Complete the founder decision record before presenting packages as available. Estimate each offer with net revenue, direct supplier cost, loaded operator/support time, payment fees, client media/pass-through budget, refunds/disputes, acquisition cost and renewal assumptions. Gross margin and contribution are different; founder labour is not free. Do not infer demand, CAC or renewal from code inspection.

Named accountable functions: customer/support and disputes, property review, finance/refunds, marketing/channel operation, optional supplier coordination, privacy/security and release acceptance. These are responsibilities, not new application roles. Approved working hours and absence coverage must fit pilot capacity. No response SLA, completion time or viewing assistance is promised until an actual process supports it.

Obtain a focused South African assessment of the specific paid-marketing/advertising model, professional participation, remuneration/referrals, applicable registration/FFC/FICA/trust-money duties, owner disclosures, customer terms and privacy/direct marketing. This draft does not resolve legal classification. In particular, owner control does not establish a regulatory exemption. Tenant screening/lease/deposit/management scope stays deferred. Review the actual offer with the [PPRA licensing guidance](https://theppra.org.za/faqs/faq-licensing/), [Information Regulator direct-marketing guidance](https://inforegulator.org.za/wp-content/uploads/2020/07/GUIDANCE-NOTE-ON-DIRECT-MARKETING-IN-TERMS-OF-THE-PROTECTION-OF-PERSONAL-INFORMATION-ACT-4-OF-2013-POPIA.pdf) and applicable consumer/electronic-service obligations; no fees or refund policy are approved here.

## 10. Delivery and acceptance gates

1. **Contract decision:** Edward records D01–D07; architecture reviewer approves the permission/lifecycle/commercial design. Unresolved deliverables remain unavailable. Acceptance of this draft is not permission for migrations or release.
2. **Private owner preparation:** authorised implementation adds owner context, private draft UI/access and evidence flow; no payment or publication. Prove owner A/B isolation, account switching, professional custody and media/private-document safety in an owned disposable target.
3. **Paid owner value loop:** separately authorised billing/entitlement, manual review, public identity and owner enquiry custody. Prove rejected/unpaid/expired/withdrawn/wrong-owner paths and preserved professional journeys.
4. **Attended pilot:** approved staffed release scope, actual consented customer/payment/publication/delivery and marketing fulfilment evidence, incident handling and cleanup. No production fixture activation or diagnostic execution implied by this document.
5. **Expansion:** demand/cost/capacity evidence decides enhanced packages, reporting, distribution and assisted services. Core marketing that is sold remains a gate, not a post-launch promise.

Minimum future acceptance scenarios: own draft create/edit/reload/media; wrong-owner reads/writes; professional same-user context; right-to-advertise rejection/dispute; partial/unmatched/duplicate payment; paid but rejected listing/remedy; public eligibility and exact contact identity; approved revision replacement; owner enquiry storage, actual authorised delivery and replay; withdrawal/expiry with stopped workers; existing enquiry retention; selected-provider request separation; privacy/session revocation; purchased marketing task completion. Exercise sale and rental pricing/disclosures if both are offered. Source mocks cannot establish physical DB admission, real mailbox receipt or fulfilment.

The private-owner MVP is complete only when an authorised owner can manage the correct property, buy the disclosed service through approved finance authority, receive reviewed public visibility and its marketing deliverables, receive an enquiry in their own custody and withdraw/expire safely. The existing professional launch does not wait for this future product.

## 11. Documentation verification and handoff

Read-only investigation found no open PRs at the initial baseline check. Source authorities relevant to the earlier owner assessment were compared against current main; core listing/account/billing/public-custody controls are unchanged. The `server/db.ts` delta concerns Services verification/publication withdrawal, not owner authoring. No separate owner contract exists on the recorded main baseline.

Database routing: contract/consumer assessment, inspect/plan only, disposable worktree target. `pnpm db:authority:status` completed; authority version 3, head `0111_properties_canonical_place_reference_fk.sql`, manifest digest `600ccfc5ae5ddc480fe0274edc8a5e3624c2bab32aa3da65f314acd3803cef3c`. Target fingerprint `3a3bcc71dfb97e01494d0fbff0cc2981821837e0f3bbff858c0e09a9f33b5901`; service unreachable, schema/ledger/reference/scenario readiness not evaluated. No service provisioning, migration, database writes or protected connection. No claims of new executable owner test coverage.

Review-only outcome: this contract and its decision record in one task-owned branch/worktree. No application/configuration changes, commit, push, merge or deploy. Whitespace, local links and referenced source paths are checked; a full application suite is unnecessary for this documentation-only change. The prior assessment's mocked test results are historical evidence, not tests executed for this contract.
