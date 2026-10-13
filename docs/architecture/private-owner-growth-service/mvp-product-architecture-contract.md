# Private-owner MVP product and architecture contract

**Version:** 0.2 — founder review draft, source-validated 13 October 2026. **Date:** 13 October 2026.

**Disposition:** strategic direction agreed in principle; recommendations and future acceptance requirements below are not approved runtime authority. No owner product, price, role, entitlement, schema change, commercial activation or release is authorised by this document. Open decisions are in the [founder decision record](founder-decision-record.md).

**Provenance:** version 0.1 (12 October 2026) was the architect's proposal draft. Version 0.2 is a validation pass against current `origin/main`: every material technical claim was re-verified against source with exact references, stale findings were corrected, and verified facts are annotated. The architect's originals are preserved untouched in their own worktree; this file is the carried, revised copy.

**Verified source baseline:** freshly fetched `origin/main` at `c475ed7249c3cc263a7554deb274e8d5bfd76dd0` (unchanged since the 0.1 draft's fetch), including the owner information panel/public chrome cleanup (#602/#603), held-worker diagnostic (#604) and Services V1 reconciliation (#607, superseding #581). These are merged-source findings, not live-deployment or hosted-acceptance claims.

**Task branch:** `docs/private-owner-mvp-contract-validation-20261013`. Worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-private-owner-mvp-contract-validation-20261013`. Scope: documentation only. Existing professional launch acceptance remains independent.

**Companion documents (this revision):**

- [Capability, permission and lifecycle mapping](capability-and-lifecycle-mapping.md) — source-backed owner-action and lifecycle tables.
- [Implementation batches](implementation-batches.md) — ordered, separately reviewable implementation steps with acceptance criteria.

## 1. Product and audience boundaries

The proposed service helps a private seller or landlord prepare a property, publish through review and commercial controls, attract interest through defined marketing deliverables, and manage enquiries while retaining control.

Two strategic routes remain distinct:

- **Private route:** the owner chooses and purchases listing/marketing services and manages buyer or tenant discussions. This draft defines the minimum proposed product.
- **Professional assistance:** the owner may browse professionals or submit an accurately described request. Introductions, mandates, viewing assistance, negotiation and managed transactions are unavailable until their contracts, authorisation and delivery process are separately approved.

| Relationship | Authority | It does not grant |
| --- | --- | --- |
| Listing account custodian | Authenticated person authorised to create/manage this listing; resolved server-side (`drizzle/schema/listings.ts:33`, `server/services/listingContentCustody.ts:58-96`) | Proof of legal property ownership or professional permissions |
| Legal owner / authorised representative | Right to advertise, declaration and evidence under the approved review process | Automatic publication or payment entitlement |
| Buyer / tenant | Public discovery and consented enquiry submission (`server/services/publicLeadCaptureService.ts:73-111`) | Private listing, owner-document or other enquiry access |
| Agent / agency | Only the representation or participation explicitly authorised for the property (`server/services/listingContentCustody.ts:82-96`) | Ownership transfer merely because assistance was requested |
| Service provider | The specifically selected service request under Services V1 (`drizzle/schema/servicesEngine.ts:246-301`) | Listing edit/publication rights or access to property buyer/tenant enquiries |
| Property Listify operator | The minimum audited access needed for assigned moderation, marketing, finance or support work | Unrestricted commercial overrides or unrecorded impersonation |

A single person may have several relationships. The `users.role` enum (`visitor`, `agent`, `agency_admin`, `property_developer`, `service_provider`, `super_admin`; default `visitor` — `drizzle/schema/core.ts:37-46`) must not be used as proof of ownership or the sole description of a property's commercial context. Initially excluding professional-account private listings is a possible pilot restriction requiring D01, not a reason to misattribute their property to an agency.

**Validated account facts:** consumer accounts exist as the `visitor` default with `emailVerified` (`core.ts:36`) and durable session revocation via `sessionVersion` (`core.ts:74`; token issued with the version at `server/_core/auth.ts:97-116`, mismatched versions rejected at `server/_core/auth.ts:224`, revocation bumps at `server/db.ts:709-726`). No owner role exists and none is prescribed by this contract.

## 2. Smallest useful proposed scope

Support residential **sale and rental** semantics (`listings.action` enum `sell`/`rent`/`auction` — `drizzle/schema/listings.ts:36`; auction is a legacy transport value excluded from the current authoring journey, `client/src/hooks/useListingWizard.ts:281-283`). Select the first paid pilot cohort through D01; do not quietly include rental operational services merely because a rental listing is supported.

Recommended initial property allow-list: House, Apartment and Townhouse, subject to canonical type mapping (`listings.propertyType` enum already contains all three — `listings.ts:37-47`). One property and one selected sale/rental journey per package. A change of owner, property or commercial journey is not a silent edit to reuse an entitlement.

The owner can prepare and save a draft, edit supported fields/media, submit through the approved process, see status/rejection reasons, receive and manage enquiries, and withdraw the listing. Renewal requires an explicit decision and valid entitlement. A compact "My properties" surface is proposed; a duplicate professional CRM or portfolio-management platform is not needed.

**Validated authoring facts:** an authenticated user of any role can already create a private listing draft — creation is a `protectedProcedure` that passes the authenticated user into listing creation without a professional-role gate (`server/listingRouter.ts:510-514, 581-582`), and private-draft custody already resolves to the materialized `ownerId` when the listing carries no agency (`listingContentCustody.ts:69-72`: "Personal drafts remain the author's private preparation"; the router applies this rule at `server/listingRouter.ts:162-172`). What does **not** exist is any consumer-facing owner surface, commercial owner resolution, publication path, or enquiry recipient for such drafts (see the [mapping](capability-and-lifecycle-mapping.md)). The wizard already isolates persisted draft state per authenticated owner and clears it on account change (`client/src/hooks/useListingWizard.ts:122-168, 822-837`).

Initial exclusions: Land, Commercial, auction, specialist shared-living, automatic owner-to-agent handoff, automated valuation, tenant screening, lease drafting, deposits/rent collection, property management, guaranteed leads/results and automated performance advice. Land and Commercial remain governed by their own contracts; the generic wizard must not widen into them.

**Current public entry remains unchanged (verified):** the preparation `/advertise` page states "Self-service private-owner listing is not yet available", links to `/contact?area=other&topic=listing-preparation` and `/agents`, and records that "Submitting a request does not publish a property" (`client/src/pages/AdvertiseWithUs.tsx:320-350`). The preparation page renders while `COMMERCIAL_ACTIVATION_STATE.enabled` is false (`AdvertiseWithUs.tsx:375-382`; state at `shared/commercialActivation.ts:46-52`). An assisted request does not publish a property. Future owner routes are design decisions, not enabled paths in this draft.

## 3. Listing authority and permissions

Reuse the authored canonical Listing and public Property projection. `Listing.ownerId` identifies account custody, not independently verified title (`listings.ts:33`). Preserve agent/agency custody rules for professional inventory (`listingContentCustody.ts:73-96`).

Private-owner context must be explicit and durable in the approved design, with server-derived relationships. Absence of an agent, a label in the client, a current role or generic metadata cannot mint owner publication authority — validated: publication resolves a commercial owner of exactly two kinds, `agency` and `independent_agent` (`server/services/listingPublicationEntitlementService.ts:69-71, 636-730`), and a consumer-owned listing fails with `commercial_owner_unresolved` (`listingPublicationEntitlementService.ts:726-729`). No new owner role is prescribed; determine the minimum representation/commercial-context model in the architecture decision before schema work.

### Proposed permission matrix

"Own" means the exact server-authorised listing/order/request relationship. These are requirements for future implementation, not claims about present permissions. The source-backed mapping of each row's present-day behaviour is in [capability-and-lifecycle-mapping.md](capability-and-lifecycle-mapping.md).

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
| Operational support / super-admin | Explicit justified, audited exception under existing authority (`listingContentCustody.ts:66`) | Protective action within approved scope | No entitlement/consent bypass | Authorised support/finance scope only (`server/services/billingFoundationService.ts:143, 224-226`) | Minimum incident/customer-support scope | Existing Services operational exception |

Implementation must enforce the matrix in APIs and data access, not merely routes. A client-supplied owner, agency, recipient, provider or order ID cannot expand scope — validated for enquiries: client-supplied agent IDs are ignored for property/listing targets and honoured only for explicit person-to-person profile enquiries (`publicLeadCaptureService.ts:789-922`), and enquiry targets refuse mixed authorities (`publicLeadCaptureService.ts:285-313, 786-787`). Account switching must clear/re-scope draft hydration and private caches — already the wizard's behaviour (`useListingWizard.ts:822-837`); the owner surface must preserve it. Document/media reservations and delivery destinations must belong to the authorised principal (media authority: `server/services/listingMediaAuthority.ts`; delivery shape assertion: `server/services/leadDeliveryService.ts:226-257`).

## 4. Lifecycle: four separate dimensions

Keep **authorship/review**, **commercial entitlement**, **public eligibility** and **marketing fulfilment** distinct. Display states below are conceptual; they do not instruct adding four competing schema lifecycles or new enum values. Map them to existing authorities in the approved design. The actual database enums today are: `listings.status` (`draft`, `pending_review`, `approved`, `published`, `rejected`, `archived`, `sold`, `rented` — `listings.ts:73-84`), `listings.approvalStatus` (`pending`, `approved`, `rejected` — `listings.ts:85`), `listing_approval_queue.status` (`pending`, `reviewing`, `approved`, `rejected` — `listings.ts:166-182`), `billing_payments.state` (`submitted`, `under_review`, `verified`, `rejected`, `reversed`, `refunded` — `drizzle/schema/billing.ts:242-251`), and `subscriptions.status` (`trial`, `pending_payment`, `payment_under_review`, `active`, `past_due`, `grace_period`, `suspended`, `cancelled`, `expired` — `billing.ts:135-147`). Do not add display states to these enums as part of owner work.

Recommended first payment sequence: draft → non-publishing suitability/right-to-advertise precheck → agreed order/invoice → verified payment → formal review → controlled publication. The precheck does not warrant approval. D03 must approve payment timing and rejection/cancellation remedies before money is accepted. Approval-before-payment is an alternative requiring an explicit owner-review design; current professional submission entitlement checks must remain intact (validated: every publication-capable transition asserts entitlement — `listingPublicationEntitlementService.ts:737-789`; submission of a paid plan with payment pending is rejected as `subscription_pending_payment` — `listingPublicationEntitlementService.ts:513-518`).

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
| Approved but not public | Reviewer acceptance exists, but paid/release/recipient/public eligibility may still block | No "live" claim until public readback succeeds |
| Published | Current reviewed revision, owner authority, term, release admission and actionable enquiry custody all pass | Existing Property projection/search/PDP becomes eligible; record start/end |
| Material edit | Create/review canonical revision (`listings.revisionOfListingId`, `listings.ts:106-107`); do not silently mutate approved public facts | Previous valid revision stays until replacement approval; remove if a protective issue requires it |
| Withdrawn / expired / sold / rented | Stop acquisition through canonical lifecycle/public eligibility; preserve history and existing enquiry custody | Exclude public search/PDP/enquiry acquisition; communicate accurately |
| Renewal / reactivation | Explicit renewed package and fresh eligibility where needed | No automatic renewal, hidden reset or free term extension |
| Refund / payment reversal / dispute | Finance and fulfilment records reconcile actual obligations and any entitlement effect | Apply approved access/publication policy; retain lawful history, never erase payment evidence |

**Validated finance facts supporting this table:** payment proof upload and finance review already exist as a professional flow with private documents (`billingPaymentDocuments` private-visibility with SHA-256 hashes — `billing.ts:278-310`; storage in `server/services/billingProofStorage.ts`); finance decisions are restricted to `super_admin` (`billingFoundationService.ts:143, 224-226`); duplicate/unmatched/partial outcomes are explicitly modelled review decisions (`BLOCKED_REVIEW_DECISIONS` = reject / request_correction / duplicate / unmatched — `billingFoundationService.ts:137-142`); payments are idempotent by key (`billing.ts:263, 269`). A durable provider-event ledger exists (`billingProviderEvents` — `billing.ts:70-96`).

**Proposed term rule:** standard listing visibility begins on the first successful governed publication, not invoice creation, proof upload or an unverified bank event. Manual work may begin earlier only with customer consent and disclosed cancellation treatment. D03 must decide maximum pre-publication delay and suspension/credit/refund treatment; no numeric duration is approved. For reference, the professional Launch Access term is a fixed, non-renewing 90 days enforced at plan configuration (`billingFoundationService.ts:1031-1065`) — the owner package must not inherit it silently.

Expiry is enforced by public eligibility at read/acquisition time, so a stopped scheduler cannot indefinitely preserve visibility. Existing enquiries remain accessible to their authorised parties according to retention rules; expiry does not reroute or release them to other principals. Withdrawal must invalidate future promotion tasks and remove/update controlled channel posts where possible, without promising deletion of third-party copies.

## 5. Packages and deliverable boundaries

Names below are internal proposals. Prices, listing term, service timing and refund rules remain open. Do not inherit professional Launch Access pricing or its 90-day duration.

| Package | Proposed deliverable specification | Availability condition |
| --- | --- | --- |
| Owner listing + marketing starter | One eligible property; defined visibility term; reviewed description/photo presentation; one approved share-asset pack; one defined organic social deliverable on an agreed channel; owner enquiry/status access | D01–D06 resolved, actual marketing operator/channel capacity, functioning owner journey and hosted proof |
| Enhanced marketing | Starter plus separately itemised content/video or campaign work; client ad budget distinguished from service fee | Real supplier/operator, scope/rights/approvals, campaign controls and delivery proof; not initial availability by default |
| Assisted package | Specified higher-touch preparation/coordination, with named deliverables and limits | Separate operating and regulatory approval; no implied mandate, negotiation or managed sale/letting |
| Optional service | A named supplier's scope, quotation/pricing method, responsibility, rights, cancellation/remedy process | A real contract/delivery process; Services V1 directory request alone is not a purchase |

The starter's exact content/asset/channel specification needs D02. If a promised marketing task cannot be staffed and evidenced, revise the package before selling it; do not quietly remove marketing from the proposition or substitute a footer social link (validated present behaviour: the public chrome carries ordinary social links, not sold marketing deliverables — `client/src/pages/AdvertiseWithUs.tsx` and footer).

### Manual marketing operating record

Minimum record: order/listing/revision reference, purchased deliverables, owner asset/copy approval, publication/media rights, assigned operator/supplier, agreed channel/budget, due/status information, delivery link or protected evidence, cost/time, update/withdrawal action, customer acceptance/complaint and remedy. A controlled operations register can support an attended pilot; it must have access control and traceable references and cannot grant runtime publication/payment permissions.

No fabricated property features, testimonial, valuation, reach or campaign result. Material image alteration, renders/virtual staging and paid relationships require appropriate disclosure. Existing Explore organic/editorial/sponsored separation remains binding. A quality-gated `featured` flag (`listings.ts:100`, `properties.featured`) does not establish purchased placement, campaign fulfilment or exposure guarantees.

## 6. Enquiries and optional professional support

Residential owner enquiries extend the canonical public-lead capture/custody/delivery authority. Do not dual-write into Services leads, agency CRM or a new owner enquiry store. Existing `lead_deliveries.recipientUserId` is reusable and already typed to `users.id` (`drizzle/schema/leads.ts:202`); today the `manual` recipient type is the only shape that carries a user recipient (`leadDeliveryService.ts:226-257`, `213-224`), and Shared Living already delivers to an owner-scoped inbox this way with a durable context row as the ownership boundary (`publicLeadCaptureService.ts:744-771`). Approved recipient/purpose/source semantics and worker permissions must still be established before claiming owner delivery.

Required behavior:

- Resolve owner recipient and verified destination from the current server-authorised listing context. Reject invalid or unpublishable target; do not accept client recipient overrides (validated: enquiry targets are server-resolved — `publicLeadCaptureService.ts:736-1259`).
- Record the enquiry and durable delivery obligation atomically where required. Replay of the same key/payload returns the same obligation; changed material payload cannot silently reuse it (validated: `leads.captureRequestId` unique — `leads.ts:151`; replay equivalence compares full material payload — `publicLeadCaptureService.ts:1288-1391`; `lead_deliveries.idempotencyKey` unique with duplicate-return — `leads.ts:244`, `leadDeliveryService.ts:581-583`).
- Separate "enquiry received" from "delivered" and "owner responded." Provider acceptance, mailbox receipt and the eventual viewing are distinct evidence (validated state machine: queued/claimed/accepted/completed/retryable_failed/exhausted/unknown/cancelled/superseded — `leads.ts:161-171`, `leadDeliveryService.ts:657-920`; email alerts are sent after durable in-app intent commits — `publicLeadCaptureService.ts:650-715`).
- Keep owner inbox access scoped; explicitly address wrong-owner reads, reassignment, revoked sessions, duplicate retry, worker restart and uncertain delivery outcomes. Never force-resend an unknown outcome without reconciliation (validated: expired claims become `unknown` and never auto re-invoke the provider — `leadDeliveryService.ts:817-861`; fenced completion requires the live lease token — `leadDeliveryService.ts:718-781`; session revocation invalidates the reader's token — `server/_core/auth.ts:224`).
- Let the owner record basic follow-up state only if that writer and its provenance are approved. A viewing request is not a confirmed viewing. Do not require a full calendar/transaction CRM before the pilot.
- Public contact exposure, especially WhatsApp and precise address, is a D04 privacy decision. Existing professional submission requirements must not silently force an owner's private details into public DTOs (validated: public identity DTOs carry agent/agency contact fields today — `server/services/publicPropertyEligibilityService.ts:356-369, 404-416`; no owner identity shape exists).

### Services V1 relationship

The merged Services V1 contract supports published-provider discovery and one selected provider request, using `service_leads` (`servicesEngine.ts:246-301`, unique `requestId` at `:296`, provider index at `:297`) and its events (`:57-72`). It does not implement booking, escrow, formal quotations, automatic matching, paid plans or guaranteed fulfilment. A status named `quoted` (`servicesEngine.ts:56`) is not a formal quote contract.

Owner services requests stay in that authority. Share only the chosen request details and authorised property context; never forward buyer enquiries, proof documents or the entire owner draft. Services' exact listed-coverage matching is not canonical location/radius proof. Do not retrofit its geography or widen a request in this owner workstream.

Actual agent introductions or representation need a separately approved, owner-authorised process covering scope, data sharing, fees and listing control. An assistance form or `/agents` link must not claim such a process has completed. Listing custody remains unchanged unless an explicit authorised transfer/delegation command is separately designed and approved.

## 7. Evidence, privacy, abuse and reporting

For the starter, show only sourced status, listing term, recorded enquiry/delivery counts and fulfilled marketing tasks, with date/window/definition and "unavailable" where data is absent. Public detail request counters are not unique visitors, bot-filtered reach or a valid conversion denominator. Authenticated recently-viewed facts are consumer history, not an owner exposure stream (`recently_viewed` — `leads.ts:344-358`). The generic Express analytics tracker currently does not persist its payload (validated: `server/routes/analytics.ts:34-60` logs to console only, with a commented-out persistence hook). The `listing_analytics` counter table exists (`listings.ts:143-164`) but is not owner-scoped reporting evidence; the listing-performance authority is agency seller-review records (`drizzle/schema/listingPerformance.ts:7-38`), not owner analytics.

Do not publish conversion rates, guaranteed leads, time-to-sale/let reductions or price recommendations from current counters. Later reporting needs event definitions, purpose/consent, identity/bot policy, aggregation, owner-scope checks and measured coverage. Time on market alone cannot trigger advice to reduce price, renovate or appoint an agent.

Specify retention separately for draft assets, right-to-advertise evidence, customer consent, buyer enquiries, service requests, finance documents and marketing receipts. Use approved private document storage and existing public media delivery; public assets must never embed proof documents, internal tokens or unauthorised private contact details. Keep raw personal information out of analytics/operational public evidence.

Pilot controls include rate/size limits (`server/services/publicLeadRateLimitService.ts`; input limits in `server/services/publicLeadInputContract.ts`), authorised upload manifests, duplicate listing/spam review, impersonation/property-right disputes, takedown, account/session revocation and a staffed escalation path. Define a documented pause/remedy for suspected fraud; do not infer ownership from successful payment or contact confirmation.

## 8. Architecture boundaries and smallest approved-design changes

| Concern | Reuse candidate (validated) | Missing contract / minimum design question |
| --- | --- | --- |
| Accounts | `users`, default consumer account (`core.ts:37-46`), email verification (`core.ts:36`), session revocation (`core.ts:74`, `server/_core/auth.ts:97-116, 224`) | Owner capability and property authority; multi-persona policy; no automatic new role |
| Authoring | Listing owner/media/geography, wizard hooks, revisions (`listings.ts:106-107`) and review queue (`listings.ts:166-182`); personal-draft custody already resolves for unattributed listings (`listingContentCustody.ts:69-72`); creation is role-agnostic (`listingRouter.ts:510-514`) | Explicit private-owner commercial context, owner-facing surface and scoped preparation/review access |
| Commercial | Canonical billable accounts/invoices/payment/document/finance services (`billing.ts:99-310`; `billingFoundationService.ts`) | Owner principal and per-property package entitlement. The `billable_accounts` CHECK/enum is professional-only (`billing.ts:101, 116-121`) and the typed principal allow-list rejects other owners (`billingFoundationService.ts:49-64, 983-986`); unique user account behavior needs deliberate multi-persona design |
| Publication | Existing entitlement service, review and Property projection (`listingPublicationEntitlementService.ts`; `publicPropertyEligibilityService.ts`) | Owner rule across every publish-capable path, term/read eligibility, manual owner review; no verified-agent fast-track inheritance |
| Public identity | Existing eligible supply DTO, search/card/PDP (`publicPropertyEligibilityService.ts:768-829`; `server/services/publicPropertyDto.ts`) | Explicit owner provenance/contact representation; no owner identity shape exists today (only `agent`/`agency`/`platform` — `publicPropertyEligibilityService.ts:282-290, 356-369, 404-416`) |
| Enquiry | Canonical public capture, custody, delivery and existing typed user reference (`publicLeadCaptureService.ts`; `publicLeadCustodyService.ts`; `leadDeliveryService.ts`; `leads.ts:202`) | Owner recipient/purpose/source semantics, scoped reads and verified delivery/worker consumers; `recipientType` has no owner value today (`leads.ts:160`) |
| Marketing | Existing descriptions/media/SEO; controlled manual register | Purchased task evidence; no revived retired boost model or hidden paid organic rank |
| Optional supplier request | Services V1 request authority (`servicesEngine.ts:246-301`) | Actual contractual fulfilment remains separate; no cross-domain lead dual write |

Review under [Database Authority](../../database-authority/00-database-authority-agent-entry.md), [policy](../database-authority-policy.md), [exception register](../database-compatibility-exceptions.md) and [change protocol](../../database-authority/database-change-protocol.md). Approve exact model/invariants before authoring canonical migration, inventory and consumers together. No legacy schema guessing, alternate runner, parallel owner database or metadata workaround for professional-only CHECKs.

Current evidence paths: `drizzle/schema/core.ts`, `drizzle/schema/listings.ts`, `drizzle/schema/billing.ts`, `drizzle/schema/leads.ts`; `server/services/listingContentCustody.ts`, `listingPublicationEntitlementService.ts`, `publicPropertyEligibilityService.ts`, `publicLeadCustodyService.ts`, `publicLeadCaptureService.ts`, `leadDeliveryService.ts`, `billingFoundationService.ts`, `billingProofStorage.ts`; `server/listingRouter.ts`, `server/routers.ts`, `server/routes/analytics.ts`; `shared/commercialActivation.ts`; `client/src/pages/AdvertiseWithUs.tsx`, `PropertyDetailPage.tsx` and `client/src/hooks/useListingWizard.ts`.

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

This validation pass re-verified the 0.1 draft's material technical claims against freshly fetched `origin/main` at `c475ed7249c3cc263a7554deb274e8d5bfd76dd0`. Findings, with one line reference per claim, are recorded in [capability-and-lifecycle-mapping.md](capability-and-lifecycle-mapping.md); ordered implementation steps with acceptance criteria are in [implementation-batches.md](implementation-batches.md). Material validations: consumer draft creation and personal-draft custody already exist; publication entitlement, public identity, enquiry recipient typing and billing principals are professional-only; the Express analytics tracker does not persist; the `/advertise` owner information panel matches the 0.1 description. No contradictions with the 0.1 draft's technical claims were found; its evidence paths were confirmed current. No separate owner contract exists on the recorded main baseline.

Database routing: contract/consumer assessment, inspect/plan only, disposable worktree target. `pnpm db:authority:status` completed in the task worktree; authority version 3, head `0111_properties_canonical_place_reference_fk.sql`, manifest digest `600ccfc5ae5ddc480fe0274edc8a5e3624c2bab32aa3da65f314acd3803cef3c`. Resolved target: disposable-worktree `listify_wt_private_owner_mvp_contract_val_f5600ddf4cc9`, sanitized fingerprint hash `ee8a25e024256773a2123e40ebb8e0c3841ba4f86469d87fa6621b645c70a3a4`; service unreachable, schema/ledger/reference/scenario readiness not evaluated. No service provisioning, migration, database writes or protected connection. No claims of new executable owner test coverage.

Review-only outcome: this revised contract, the revised decision record, and the two new companion documents in one task-owned branch/worktree. No application/configuration changes, commit-authorization, merge or deploy performed by this documentation task. Whitespace, local links and referenced source paths are checked; a full application suite is unnecessary for this documentation-only change (per repository authority, database-independent documentation work does not require database initialization). The prior assessment's mocked test results are historical evidence, not tests executed for this contract.
