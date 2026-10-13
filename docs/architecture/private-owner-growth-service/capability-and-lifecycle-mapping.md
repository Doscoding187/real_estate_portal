# Private-owner MVP — capability, permission and lifecycle mapping

**Version:** 0.1 — validated against `origin/main` at `c475ed7249c3cc263a7554deb274e8d5bfd76dd0`, 13 October 2026. Companion: [validated contract](mvp-product-architecture-contract.md), [decision record](founder-decision-record.md), [implementation batches](implementation-batches.md).

**Purpose:** source-backed mapping of each proposed owner action and lifecycle condition to what the current platform actually does, what is missing, who must be rejected, and the existing or future test evidence. Read-only verification; no application change is authorised by this document.

**Terminology discipline:** proposed *customer conditions* (e.g. "order awaiting payment", "approved but not public") are display concepts from the contract. *Actual database enums* today are: `users.role` (`drizzle/schema/core.ts:37-46`); `listings.status` / `listings.approvalStatus` (`drizzle/schema/listings.ts:73-85`); `listing_approval_queue.status` (`listings.ts:166-182`); `subscriptions.status` (`drizzle/schema/billing.ts:135-147`); `billing_payments.state` (`billing.ts:242-251`); `lead_deliveries.state` / `leadDeliveries` enum groups (`drizzle/schema/leads.ts:154-181, 225-227`); `service_leads.status` (`drizzle/schema/servicesEngine.ts:56`). This mapping does **not** prescribe new tables, columns or roles to make display wording match storage; representation is a separate approved design (contract §3, decision record "Separate engineering design approval").

## 1. Capability verification summary

| Investigation area | Verified present (source) | Verified absent / professional-only |
| --- | --- | --- |
| Consumer accounts and professional role boundaries | Default consumer account is role `visitor`; email verification; durable session revocation via `sessionVersion` (`core.ts:37-46, 36, 74`; `server/_core/auth.ts:97-116, 224`; `server/db.ts:709-726`) | No owner role or owner capability flag on `users`; nothing in `users` records property authority |
| Personal listing ownership and automatic agent/agency attribution | `listings.ownerId` is server-side custody; creation passes the authenticated user in (`server/listingRouter.ts:510-514, 581-582`); personal drafts keep author custody without agency attribution (`server/services/listingContentCustody.ts:69-72`; applied at `listingRouter.ts:162-172`) | No automatic agent/agency attribution for consumer-created drafts (attribution requires an agency/agent context); no ownership-verification fact anywhere in the listing model |
| Draft creation, editing, media access and account switching | Role-agnostic `protectedProcedure` creation (`listingRouter.ts:510-514`); media authority tokens (`server/services/listingMediaAuthority.ts`, wired at `listingRouter.ts:53-57`); wizard draft persistence is owner-scoped and cleared on account change (`client/src/hooks/useListingWizard.ts:122-168, 822-837`) | No consumer-facing owner surface/route to reach the wizard; no right-to-advertise evidence flow |
| Review, revisions, publication and withdrawal | Review queue `listing_approval_queue` (`listings.ts:166-182`); canonical revision drafts `revisionOfListingId` (`listings.ts:106-107`); publication entitlement asserted on every publish-capable transition (`server/services/listingPublicationEntitlementService.ts:737-789`); withdrawal via `archived`/`sold`/`rented` statuses (`listings.ts:73-84`) | Publication entitlement resolves only `agency` / `independent_agent` commercial owners (`listingPublicationEntitlementService.ts:69-71, 636-730`); a consumer-owned listing fails `commercial_owner_unresolved` (`:726-729`) |
| Billing principals, payment verification and entitlements | Professional manual-EFT loop: typed billable accounts with CHECK (`billing.ts:99-123`); invoices/payments/documents hang off `billableAccountId` (`billing.ts:168-310`); payment state machine with finance review (`billing.ts:242-251`; `server/services/billingFoundationService.ts:102-108`); private SHA-256 proof documents (`billing.ts:278-310`); finance role `super_admin` (`billingFoundationService.ts:143, 224-226`); duplicate/unmatched/partial are modelled decisions (`billingFoundationService.ts:137-142`); verified payment activates entitlement via subscription (`billingFoundationService.ts:423-470, 749-813`; `server/services/planAccessService.ts`) | `billable_accounts.accountKind` is `agent`/`agency`/`developer` only with an exactly-one-owner CHECK (`billing.ts:101, 116-121`); the application allow-list rejects other owner types (`billingFoundationService.ts:49-64`); non-professional roles cannot resolve a billing owner (`billingFoundationService.ts:913-987`) — an owner principal does not exist |
| Public listing identity and eligibility | Public eligibility requires actionable verified custody, coherent projections and a truthful public identity; evaluated at read time (`server/services/publicPropertyEligibilityService.ts:185-424, 768-829`) | Public identity roles are only `agent`, `agency`, `platform` (`publicPropertyEligibilityService.ts:282-290, 356-369, 404-416`); owner relationship checks require professional roles (`:332-335, 381-383`) — no owner provenance/contact shape |
| Enquiry recipient resolution, inbox access and delivery | Server-side recipient resolution with mixed-authority rejection (`server/services/publicLeadCaptureService.ts:269-313, 736-1259`); durable obligation + attempts with leases/retries/exhaustion (`server/services/leadDeliveryService.ts:550-920`); owner-typed recipient precedent: Shared Living delivers to `recipientUserId` with `manual` type plus a durable context boundary (`publicLeadCaptureService.ts:744-771`; `leadDeliveryService.ts:226-257`); duplicate/replay idempotency (`leads.ts:151`; `publicLeadCaptureService.ts:1288-1391`; `leadDeliveryService.ts:581-583`) | `lead_deliveries.recipientType` has no owner value (`leads.ts:160`); `resolvePublicPropertyCustody` returns only agent/agency/platform outcomes (`server/services/publicLeadCustodyService.ts:1-10, 286-418`) — a consumer-owned listing is `attention_required`, not deliverable to its owner |
| Services V1 provider requests and permissions | Published-provider discovery and one selected request per `service_leads` with unique `requestId` and event history (`servicesEngine.ts:246-301, 56-72`); provider profiles reference vetted `partners` (`servicesEngine.ts:88-119`) | No booking, escrow, quotation contract, paid plans or fulfilment guarantee; a `quoted` status is not a formal quote (`servicesEngine.ts:56`); no cross-domain lead dual-write exists — by design it must stay that way |
| Marketing and performance data actually available | Recorded enquiry/delivery outcomes per lead (`leads.ts:132-143`; `leadDeliveryService.ts:527-548`); consent capture on public enquiries (`publicLeadCaptureService.ts:328-345`); rate/input limits (`server/services/publicLeadRateLimitService.ts`; `server/services/publicLeadInputContract.ts`) | The generic Express analytics tracker does not persist (`server/routes/analytics.ts:34-60`); `listing_analytics` counters are not owner-scoped reporting evidence (`listings.ts:143-164`); the listing-performance authority is agency seller reviews only (`drizzle/schema/listingPerformance.ts:7-38`); no purchased-marketing-task evidence model exists |

## 2. Owner-action permission mapping

Each table uses the required six-field format. "Existing implementation" cites present-day procedures/services/models; "Missing capability" is what an owner journey must add (design outputs, not prescriptions); "Negative case" is who must be rejected today or under the approved design.

### 2.1 Create/edit own draft (versus another owner's draft)

| Required detail | Established fact / requirement |
| --- | --- |
| Actor | Any authenticated account, including default `visitor` consumers. |
| Authority | Materialized `listings.ownerId === actor.userId` with `listings.agencyId IS NULL` ("personal drafts remain the author's private preparation" — `listingContentCustody.ts:69-72`; the router takes a personal-owner shortcut on exactly this rule, `listingRouter.ts:162-172`). |
| Existing implementation | `listingRouter.create` (`protectedProcedure`, no role gate, passes authenticated user into creation — `listingRouter.ts:510-514, 581-582`); `canManageListingContent` (`listingContentCustody.ts:58-96`); media reservations via `listingMediaAuthority.ts` (`listingRouter.ts:53-57`); owner-scoped wizard persistence with account-change clearing (`useListingWizard.ts:122-168, 822-837`). |
| Missing capability | Consumer-facing owner surface/routes to reach authoring; explicit owner commercial context so later gates can resolve; right-to-advertise declaration/evidence flow (D04). |
| Negative case | Owner B (unrelated account) reading or editing Owner A's draft: `canManageListingContent` returns false (no agency, not owner — `listingContentCustody.ts:68-96`); an assigned agent cannot retain access after assignment/membership drift (`listingRouter.ts:137-142`); only `super_admin` overrides (`listingContentCustody.ts:66`). |
| Evidence | Existing unit coverage of custody: `server/services/listingContentCustody` guards exercised through listing-router procedures; future acceptance: owner A/B isolation, account-switch draft clearing, media reservation under the wrong owner. |

### 2.2 Professional account attempting the private-owner journey

| Required detail | Established fact / requirement |
| --- | --- |
| Actor | An `agent` / `agency_admin` (or `property_developer`) account that also owns personal residential property. |
| Authority | Same personal-draft custody rule (role-agnostic): if the listing has no agency attribution and they are the author, they can manage it (`listingContentCustody.ts:69-72`). |
| Existing implementation | Role-agnostic creation (`listingRouter.ts:510-514`); role-specific surfaces elsewhere (agent/agency/developer workspaces). |
| Missing capability | D01 multi-persona eligibility: whether professionals may buy the owner package for personal property in the pilot, and an explicit context model so a professional's personal listing is not silently treated as agency inventory (an agency member's listing must keep agency attribution — enforced already at publication, `listingPublicationEntitlementService.ts:667-717`). |
| Negative case | A current agency member publishing personal inventory without agency attribution is rejected (`listing_ownership_inconsistent` — `listingPublicationEntitlementService.ts:705-710`); developer-owned generic listings are rejected for publication (`unsupported_listing_owner_type` — `:719-724`); if the pilot excludes professionals, the exclusion must be visible policy, not a silent review rejection (D01d). |
| Evidence | Future acceptance: professional same-user context test — personal draft under an `agent` account remains private, cannot publish as independent while a current membership exists, and does not mutate agency inventory. |

### 2.3 Submission versus approval versus publication

| Required detail | Established fact / requirement |
| --- | --- |
| Actor | Owner (submit/withdraw); approved reviewer (review disposition); publication only through the governed command path. |
| Authority | Submission: entitlement assertion covers every publish-capable transition (`assertListingPublicationEntitled` — `listingPublicationEntitlementService.ts:737-789`). Review: `listing_approval_queue` with `submittedBy`, reviewer fields and notes (`listings.ts:166-182`). Publication: eligibility of the public projection (`publicPropertyEligibilityService.ts:185-424`). |
| Existing implementation | Full professional loop: queue insert/transition in listing-router procedures; `approvalStatus` distinct from `status` (`listings.ts:73-85`); public eligibility evaluated at read time with `PUBLIC_ELIGIBILITY_DEBUG` observability (`publicPropertyEligibilityService.ts:768-814`). |
| Missing capability | Owner commercial-owner resolution in `resolveListingCommercialOwner` (today only `agency`/`independent_agent` — `listingPublicationEntitlementService.ts:69-71, 636-730`); an owner product key in the commercial activation allow-list (today only the three professional keys — `shared/commercialActivation.ts:1-6`); manual owner review workflow (no verified-agent fast-track inheritance). |
| Negative case | Consumer-owned listing submission for publication fails today: `commercial_owner_unresolved` (`listingPublicationEntitlementService.ts:726-729`); global preparation-only state blocks every publication mutation regardless of data (`listingPublicationEntitlementService.ts:162-163, 322-323, 752-755`). Submission is never publication; approval alone is not public eligibility (unactionable custody is ineligible — `publicPropertyEligibilityService.ts:293-299`). |
| Evidence | Existing entitlement failure-code coverage (`listingPublicationEntitlementService.ts:38-57`); future acceptance: consumer-owner submission rejected before any owner entitlement exists; rejected/unpaid/approved-not-public paths stay private; public readback only after all guards pass. |

### 2.4 Payment proof versus verified payment (and paid-but-rejected inventory)

| Required detail | Established fact / requirement |
| --- | --- |
| Actor | Owner submits proof; finance (`super_admin`) reviews; entitlement activates only on the verified finance event. |
| Authority | Payments carry `submitted → under_review → verified / rejected / reversed / refunded` (`billing.ts:242-251`; `billingFoundationService.ts:102-108`); invoice/payment/document rows must belong to a `billableAccountId` (`billing.ts:174, 236, 290`); review decisions model duplicate/unmatched/partial (`billingFoundationService.ts:137-142`); payment idempotency by key (`billing.ts:263, 269`). |
| Existing implementation | Professional manual-EFT loop: invoice issuance gated by commercial activation and sales-open (`billingFoundationService.ts:1072-1092`); private proof documents with SHA-256 (`billing.ts:278-310`; `server/services/billingProofStorage.ts`); verified payment is the only activation boundary (`billingFoundationService.ts:1067-1071` comment; activation through `planAccessService.ts`); audit events on the billing trail (`billing.ts:312-341`). |
| Missing capability | An owner billable principal. Today `accountKind` is professional-only with an exactly-one-owner CHECK (`billing.ts:101, 116-121`) and unregistered owner types fail closed (`billingFoundationService.ts:49-64`); non-professional roles cannot resolve a launch billing owner (`:983-986`). The approved design must extend the principal model (a design output under Database Authority — not prescribed here). |
| Negative case | A consumer account attempting invoice/proof today: no resolvable billing owner → `FORBIDDEN` (`billingFoundationService.ts:983-986`); proof upload alone never activates (only finance verification does); partial/duplicate/unmatched payments are recorded dispositions, not entitlements; paid-but-rejected inventory: verification establishes commercial right, but review/publication gates still block public visibility (contract §4) — money is not approval, and approval is not publication. |
| Evidence | Future acceptance: owner proof → under_review → verified transitions with wrong-owner proof rejection, duplicate payment idempotency, partial/unmatched dispositions, and paid-but-rejected listing remaining private with D03 remedy applied. |

### 2.5 Revision, withdrawal, expiry and renewal

| Required detail | Established fact / requirement |
| --- | --- |
| Actor | Owner requests material edits; reviewer approves replacement; owner withdraws; term expiry is evaluated at read. |
| Authority | Canonical revision drafts via `listings.revisionOfListingId` ("a private canonical draft which revises a published listing" — `listings.ts:106-107`); withdrawal via lifecycle statuses `archived` / `sold` / `rented` (`listings.ts:73-84`); public eligibility re-evaluated on every public read (`publicPropertyEligibilityService.ts:768-829`), so expiry/withdrawal enforcement cannot be bypassed by a stopped scheduler. |
| Existing implementation | Revision flow in listing-router procedures; projection coherence checks (`stale_owner_projection` / `stale_agent_projection` — `publicPropertyEligibilityService.ts:203-215`). |
| Missing capability | Owner visibility term: professional term enforcement reads the subscription period (`listingPublicationEntitlementService.ts:272-295, 484-509`) — an owner package term (per-property, once-off) has no model yet; renewal requires an explicit new purchase (no auto-renewal — the professional precedent enforces non-renewing terms at plan config, `billingFoundationService.ts:1031-1065`). |
| Negative case | Silent mutation of approved public facts is not permitted (revision required); an expired professional term blocks submission/publication (`subscription_period_ended`, `subscription_expired` — `listingPublicationEntitlementService.ts:496-530`); equivalent owner term rules must reject re-use of a lapsed entitlement; no automatic renewal, hidden reset or free term extension. |
| Evidence | Existing failure codes cover term end; future acceptance: expired owner listing drops from search/PDP/enquiry acquisition at read time with history and enquiry custody preserved; renewal only through a new explicit order. |

### 2.6 Correct owner enquiry delivery and duplicate retries

| Required detail | Established fact / requirement |
| --- | --- |
| Actor | Anonymous/authenticated buyer submits; the listing's owner is the resolved recipient; owner reads their inbox; delivery worker transports. |
| Authority | Recipient resolution is server-side from the target's custody — client recipient overrides are ignored for property/listing targets (`publicLeadCaptureService.ts:789-922`, comment at `:789-792`); mixed enquiry authorities are rejected (`:285-313`). |
| Existing implementation | Capture with consent + capture-request ID (`assertPublicCaptureInput` — `publicLeadCaptureService.ts:315-421`); replay equivalence over the full material payload (`isEquivalentReplay` — `publicLeadCaptureService.ts:1288-1391`); durable `lead_deliveries` obligation with idempotency key, leased attempts, bounded retries, exhaustion, fenced completion (`leadDeliveryService.ts:550-920`); expired claims become `unknown` and never auto re-invoke the provider (`:817-861`); in-app notification persisted in the capture transaction, email alert after commit (`publicLeadCaptureService.ts:650-715`). |
| Missing capability | Owner recipient semantics: `recipientType` has no owner value (`leads.ts:160`) and `resolvePublicPropertyCustody` has no owner outcome (`publicLeadCustodyService.ts:286-418`). Reusable precedent: Shared Living already delivers to an owner-scoped inbox via `recipientUserId` + `manual` type + a durable context boundary (`publicLeadCaptureService.ts:744-771`; `leadDeliveryService.ts:226-257`) — the approved design must define owner recipient/purpose/source typing and inbox-scoped reads, not a new lead store. |
| Negative case | Wrong-owner inbox read must be rejected (inbox access is recipient-scoped — owner-scoped reads must follow the same boundary); invalid/unpublishable targets throw `NOT_FOUND` (`publicLeadCaptureService.ts:1049-1057`); today a consumer-owned listing yields `attention_required` custody — undeliverable, which is the correct fail-closed behaviour until owner recipients exist; changed material payload on the same capture-request ID must not silently reuse the delivery. |
| Evidence | Existing: duplicate/replay and delivery worker coverage through the capture/delivery services. Future acceptance: owner enquiry stored, delivered to the exact owner's inbox, duplicate retry returns the same obligation, worker restart/lease-expiry produces `unknown` + reconciliation (never auto resend), revoked session loses inbox access. |

### 2.7 Service-provider requests without listing or buyer-enquiry access

| Required detail | Established fact / requirement |
| --- | --- |
| Actor | Owner selecting one published provider; provider working their assigned request. |
| Authority | Services V1 request custody: one `service_leads` row per unique `requestId` tied to a provider (`servicesEngine.ts:246-301`, unique at `:296`, provider index at `:297`) with an append-only event history (`:57-72`). |
| Existing implementation | Provider discovery and request capture in the Services V1 journey (`server/services/servicesEngineService.ts`); provider profiles reference vetted `partners` (`servicesEngine.ts:88-119`). |
| Missing capability | Optionally, an owner-originated request context (share only the chosen request details and authorised property context). The directory request alone is not a purchase; contractual fulfilment is outside the platform (contract §6). |
| Negative case | A selected provider must not gain listing edit/publication rights or property buyer-enquiry access (permission matrix §3); no cross-domain dual-write of buyer enquiries into `service_leads`; a `quoted` status is not a formal quote contract (`servicesEngine.ts:56`). |
| Evidence | Existing: Services V1 request/permission coverage. Future acceptance: owner request recorded under Services V1 custody with no listing/lead authority granted to the provider; buyer enquiries never appear in provider context. |

## 3. Lifecycle mapping (display condition → actual authority)

| Customer condition (display concept) | Actual authority today | What must be added | Negative requirement |
| --- | --- | --- | --- |
| Draft saved | `listings.status='draft'`, personal custody (`listings.ts:73-84`; `listingContentCustody.ts:69-72`) | Owner surface + context | No public projection/enquiry acquisition |
| Preparation/precheck | none (professional equivalents are profile/readiness gates — `listingPublicationEntitlementService.ts:137-451`) | Non-publishing right-to-advertise precheck (D04) | Precheck is not approval |
| Order awaiting payment | `subscriptions.status='pending_payment'` + issued invoice (`billing.ts:135-147, 168-222`; `billingFoundationService.ts:1072-1321`) | Owner principal + owner product | Invoice is not entitlement |
| Proof uploaded / payment pending | `billing_payments.state='submitted'/'under_review'` (`billing.ts:242-251`) | Owner proof flow (reuse private documents) | Proof alone cannot activate |
| Partial / unmatched / duplicate / uncertain | Modelled review decisions (`billingFoundationService.ts:137-142`); payment idempotency (`billing.ts:263, 269`) | Owner-scope equivalents | No entitlement or publication |
| Payment accepted | `state='verified'` → activation boundary (`billingFoundationService.ts:102-108`; `planAccessService.ts`) | Owner entitlement effect | Still private until review + public guards |
| Submitted / pending review | `status='pending_review'` + queue row (`listings.ts:73-84, 166-182`) | Owner review path | Submission is not publication |
| Rejected | `status='rejected'`, `approvalStatus='rejected'`, reasons recorded (`listings.ts:78, 85, 88, 94-95, 177-178`) | Owner-visible actionable reasons + D03 remedy | Private; no entitlement erasure without approved policy |
| Approved but not public | `approvalStatus='approved'` while public eligibility can still fail (`publicPropertyEligibilityService.ts:91-115`) | Term/read-eligibility for owner package | No "live" claim until public readback |
| Published | `status='published'` + eligible projection (`listings.ts:73-84`; `publicPropertyEligibilityService.ts:768-829`) | Owner provenance in public identity | Only after all guards pass; record start/end |
| Material edit | Revision draft (`revisionOfListingId`, `listings.ts:106-107`) | Owner revision request flow | No silent mutation of approved public facts |
| Withdrawn / expired / sold / rented | `archived` / `sold` / `rented` statuses + read-time eligibility (`listings.ts:73-84`; `publicPropertyEligibilityService.ts:768-829`) | Owner term expiry at read; promotion invalidation | Preserve history + enquiry custody |
| Renewal / reactivation | New explicit purchase (professional precedent: non-renewing term enforced at config — `billingFoundationService.ts:1031-1065`) | Owner renewal order | No automatic renewal or hidden reset |
| Refund / reversal / dispute | `state='reversed'/'refunded'` (`billing.ts:242-251`); audit trail preserved (`billing.ts:312-341`) | Owner remedy policy (D03) | Never erase payment evidence |

## 4. Correspondence: display states versus database enums

| Contract display term | Maps to (actual) | Deliberately not created |
| --- | --- | --- |
| "Private preparation" | `listings.status='draft'` + personal custody rule | No new `preparing` enum value |
| "Order awaiting payment" | `subscriptions.status='pending_payment'` + `billing_invoices.status='issued'/'submitted'` | No owner-order table implied by this document |
| "Payment pending review" | `billing_payments.state='submitted'/'under_review'` | No parallel owner payment model |
| "Paid (entitled)" | `billing_payments.state='verified'` + activated entitlement | — |
| "In review" | `listings.status='pending_review'` + `listing_approval_queue.status='pending'/'reviewing'` | — |
| "Approved, not yet public" | `approvalStatus='approved'` while eligibility unresolved | — |
| "Live" | `status='published'` + eligible public projection | — |
| "Withdrawn / expired / sold / rented" | `archived` / term lapsed / `sold` / `rented` | No new terminal enum |
| "Delivered to owner" | `lead_deliveries.state='completed'` (owner recipient — pending design) | No second enquiry store |
| "Attention required (delivery)" | `lead_deliveries` unknown/exhausted → `attention_required` | — |

Any change to an enum or principal model is an approved Database Authority workstream with its own migration, inventory and consumers authored together (contract §8); this mapping explicitly does not authorise schema work.
