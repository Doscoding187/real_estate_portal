# Private Owner Growth Service — architecture and launch assessment

Date: 12 October 2026. Status: assessment and recommendations; no owner product, price, schema change, activation or release approved by this document.

## Recommendation

**Extend the existing platform incrementally, with a bounded architectural change before the paid private-owner MVP. Continue the professional launch independently.**

The authored Listing, private media, revision/review lifecycle, public Property projection and durable enquiry-delivery machinery are useful foundations. They do not yet constitute an owner product. Personal draft custody already works without a professional role; publication, public supply identity, enquiry recipients and billing recognise different, professional authorities. Opening the listing wizard alone would leave those gaps unresolved.

Treat an owner as the customer controlling a property listing; an agent as a professional who may receive specifically authorised participation; and a service provider as the supplier of a separately defined deliverable. A person can occupy more than one of these relationships. A user role is neither proof of property ownership nor a paid publication right.

Use the existing consumer account where suitable, with explicit listing context and server-enforced capabilities. Do not create an owner role, duplicate listing store or full owner CRM by default. Extend the commercial and public-custody contracts deliberately; do not represent owners as agents or platform-curated inventory to make existing checks pass.

## A. Verified baseline, authorities and evidence limits

Fresh fetch and final readback: `origin/main` and assessment HEAD are `46d4d05da014c2837741fb0317b1d5c8318afd03`, containing PR #601. The original control worktree's local `main` remains stale; it is not the integration baseline. Fetch updates `origin/main`; it does not move local `main` or other worktrees. Parallel feature branches should start from freshly fetched integration main and reconcile main before review. Their being behind later reflects new integration commits, not missing merges by itself.

Task branch: `docs/private-owner-growth-assessment-20261012`. Task-owned worktree: `/home/edwardspc/Desktop/Dev/worktrees/property-listify-private-owner-growth-assessment-20261012`. Worktree inventory and dirty relevant branches were inspected; 114 registered worktrees at final inspection. Other workstreams and their uncommitted material were preserved. This work adds this assessment only, with an ignored link to existing installed dependencies for testing. No source/configuration changes, commits, pushes, merges or deployments.

Authorities inspected include root `AGENTS.md`, the registered database-authority skill and entry/playbook/manifest, database policy and compatibility exceptions, commercial activation, the [audience proposition matrix](../commercial-value-proposition-acquisition-engine/21-aae-s1b-audience-proposition-matrix.md), Explore contracts and the [current shared hosted closure packet](../launch-readiness-and-product-convergence/30-shared-hosted-closure-packet-2026-10-12.md). This strategic brief advances owner direction; it does not resolve pricing, permissions or publication authority. Specialized Land and Commercial contracts remain separate.

Database assessment routing: consumer/authority investigation, inspect phase, disposable worktree target, no protected operation. `pnpm db:authority:status` succeeded as a diagnostic. Authority digest: `600ccfc5ae5ddc480fe0274edc8a5e3624c2bab32aa3da65f314acd3803cef3c`; expected head: `0111_properties_canonical_place_reference_fk.sql`. Canonical models are under `drizzle/schema/`; active migrations and manifest are under `server/migrations/`, including the canonical launch baseline. The resolved disposable target was unreachable: schema, ledger, reference data and scenario readiness were **not evaluated**. No database was provisioned, migrated, seeded or modified. Historical hosted evidence is attributed to its packet; it was not re-executed here.

### Current capabilities and required changes

Paths below refer to the recorded main SHA. Line numbers are starting points for review.

| Capability and evidence | Exists | Missing / smallest safe extension | Data, overlap and pre-launch risk |
| --- | --- | --- | --- |
| Accounts: `drizzle/schema/core.ts:24`; `server/_core/trpc.ts:45` | Default `visitor`; email verification fields; distinct professional/provider roles. Protected procedures authenticate. | Owner eligibility and property authority checks. Authentication alone does not check email verification or establish ownership. Reuse consumer account plus an explicit owner capability/context. | Avoid broad role changes. Define multi-persona behavior before widening access. Medium security risk. |
| Listing and custody: `drizzle/schema/listings.ts:29`; `server/services/listingContentCustody.ts:67`; `server/listingRouter.ts:510`; `server/db.ts:2081` | Listing has `ownerId`, nullable agent/agency; personal drafts accessible to their author. Creation derives author and professional attribution server-side. Media authorization and canonical location validation exist. | Owner UI and a server-approved private-owner creation context. Current creation automatically attaches an existing agent/current agency; this cannot silently capture someone's private property into agency custody. | Reuse Listing. Explicit context may require an approved durable discriminator; do not infer private status from missing agent alone. `server/db.ts` also overlaps #581. Medium/high permission risk. |
| Draft UX: `client/src/App.tsx:395`; `client/src/hooks/useListingWizard.ts`; owner-isolation test | Wizard, draft persistence, media restoration and user-scoped hydration foundations. `/listings/create` admits Agent/Agency admin. Recent private-draft corrections are merged in #599/#600. | Small owner-facing list/detail/edit/status surface, using existing hooks and queries where safe. Server capability enforcement must accompany any route admission. | New pages need not mean a new workspace model. App/auth routing overlaps launch work and #581. Medium risk. |
| Review/publication: `server/listingRouter.ts:1646`; `server/services/listingPublicationEntitlementService.ts:639,736`; `server/db.ts:2672`; `shared/commercialActivation.ts:45` | Readiness checks, review, revisions and publication entitlement guards. Commercial owner resolution supports Agency and independent Agent; Developers have their own workflow. Normal paid activation is closed. | Owner-specific eligibility, approved package entitlement and publication admission across submit/approve/revision/publish paths. Initial owners require manual review; do not inherit verified-agent fast-track. Submission currently also requires a WhatsApp-ready number: owner contact/privacy policy needs a decision. | Bounded policy and commercial data extension; preserve existing guards and preparation state. High risk if inserted into the professional release. |
| Public discovery: `drizzle/schema/listings.ts:298`; `server/services/publicPropertyEligibilityService.ts:255`; `shared/types.ts:983`; `client/src/pages/PropertyDetailPage.tsx:466` | Public Property projects a source Listing; canonical geography, approved supply identities, PDP/media and enquiry UI exist. | Explicit owner supply provenance and actionable custody. Public eligibility currently rejects unsupported/unactionable custody; the canonical PDP identity has no owner variant. Extend eligibility, DTOs, cards/PDP and contact labels together. | Reuse public projection/search, not a parallel inventory. A legacy `private` card type is not owner authorization. High risk if eligibility is weakened. |
| Public mutation safety: `server/routers.ts:849,911,965` | Direct Property creation is retired; listing-backed public updates must use the source Listing; removal archives the canonical Listing. | Owner edits, withdrawal and renewal should follow this lifecycle. Verify revision approval preserves old public content until replacement is accepted. | Do not restore direct-to-public CRUD. No new lifecycle store justified. Medium risk. |
| Enquiry custody/delivery: `server/services/publicLeadCustodyService.ts:286`; `server/services/publicLeadCaptureService.ts`; `server/services/leadDeliveryService.ts`; `drizzle/schema/leads.ts:191` | Server-resolved custody, durable delivery obligations, idempotency/retry and typed recipient references, including `recipientUserId`. | Residential owner recipient authority, scoped inbox/query access, verified private delivery destination, worker support and truthful stored-versus-delivered status. Current custody does not route ordinary residential enquiries to `ownerId`. | Existing user recipient FK is promising; recipient/purpose/source enums and invariants require review and possibly migration. Shared-living manual custody is not a residential workaround. High risk. |
| Billing: `drizzle/schema/billing.ts:99,127`; professional finance workflow | Canonical billable account, invoice/payment/document/reconciliation foundations. Account-kind CHECK and subscription owner enum allow Agent/Agency/Developer. | Owner billing principal and a clearly defined per-listing order/entitlement. Decide whether existing subscription machinery fits fixed listing packages. Unique account `userId` needs explicit handling if a person is also an agent. | Paid owner service cannot honestly use current professional account semantics unchanged. An approved canonical extension is needed; exact schema follows product decisions. High release risk. |
| Marketing/promotion: `server/listingRouter.ts:1903`; Explore architecture | Property presentation/media/SEO code; a quality-gated feature flag mutation. Explore separates organic/editorial/sponsored authority. | Defined content/delivery operation; reliable indexing and channel proof; distinct paid placement entitlement, window, disclosure and reporting if sold. | A feature flag is not a purchased campaign. Retired boost-campaign models are not a new authority. Manual content/social delivery is the smallest useful stage. Medium operational risk; automated sponsorship later. |
| Performance: `server/routers.ts:742,1030`; `server/db.ts:1095,1458`; `server/routes/analytics.ts:30`; `server/services/agencyPerformanceService.ts:58` | Public detail requests increment Property views, including guests. Separate authenticated recently-viewed facts support consumer history. Durable lead/delivery records exist. | Owner-scoped status and enquiry summaries; metric definitions, freshness and coverage. Public request counters include repeat/refetch/bot risk; recently-viewed facts are not an exposure event stream. Express `/track` logs and returns success without persistence. | Do not repeat the earlier claim that guest property views are entirely unrecorded. Also do not call the counter unique reach or a valid conversion denominator. Agency scorecards are agency-scoped. Basic truthful status first; reporting expansion later. |
| Optional services | Provider role and services discovery/onboarding code; candidate Services V1 directory/enquiry handoff in #581. | Actual participating provider, customer contract, delivery responsibility, price/quote and complaint/refund process. Directory enquiry is not booking, fulfilment or completed matching. | #581 is open/conflicted, not integrated capability. Start with selected contracted suppliers only if operationally ready. Medium/high promise risk. |

### Active workstream reconciliation

- [PR #602](https://github.com/Doscoding187/real_estate_portal/pull/602): OPEN, head `32f80aac76b3129b254c557ea7ff95a656349936`; GitHub build/type/lint/test/database/location checks passed, Vercel status failed, merge state `UNSTABLE`. Scope: Footer, LocationHeroSection, Favorites, ErrorBoundary and its test. Preserved. It improves public links; it does not enable owner listing. Preview failure needs disposition in its existing workflow before calling the batch ready.
- [PR #581](https://github.com/Doscoding187/real_estate_portal/pull/581): OPEN, head `b844baec5a6c38edd5e33cffadea5953e5d4aec7`, merge state `DIRTY`. Changes include `App.tsx`, public navigation, provider onboarding, services journeys, `server/db.ts`, services engine/router and product registry. Preserve the work; coordinate its integration before overlapping owner route/provider edits. Owner MVP need not depend on a full services marketplace.
- Private-draft corrections are on main. Existing launch packet #601 addresses worker database propagation but explicitly leaves hosted acceptance pending. Do not restart accepted private-draft/storage/geography work merely because this is a new product assessment.

### Executed checks

| Existing focused suite | Passed |
| --- | ---: |
| `server/services/__tests__/listingContentCustody.test.ts` | 8 |
| `server/services/__tests__/listingPublicationEntitlementService.test.ts` | 25 |
| `server/services/__tests__/publicLeadCaptureService.contract.test.ts` | 56 |
| `server/services/__tests__/publicLeadCustodyService.contract.test.ts` | 23 |
| `server/services/__tests__/publicPropertyEligibilityService.test.ts` | 15 |
| `server/services/__tests__/publicPropertyEligibilityBatch.test.ts` | 1 |
| `client/src/hooks/__tests__/useListingWizard.ownerIsolation.test.ts` | 3 |
| `client/src/components/advertise/__tests__/AdvertiseGateway.commercialTruth.test.tsx` | 2 |
| **Total: eight files** | **133** |

Commands used `DATABASE_URL='' SKIP_DB_INIT=1 pnpm exec vitest run --project server|client <focused files> --minWorkers=1 --maxWorkers=1`. Server/provider/database doubles and client DOM mocks establish current contract behavior, not a live owner journey, physical schema readiness or actual mailbox receipt. No new owner acceptance tests have been implemented. Full build/client suite was not repeated for a documentation-only assessment.

## B. Recommended product architecture and selected MVP

Recommended first product: **owner-controlled residential listing with defined marketing support**, sold per property for an approved visibility term. Support sale and rental action semantics; select the first pilot cohort separately. Initially restrict to an agreed residential type allow-list, without Land, Commercial, auction, specialist shared-living or property-management scope.

1. **Account and listing authority.** Reuse an authenticated consumer account; require appropriate verification and evidence of the right to advertise. Capture owner/authorised representative declaration, disclosures, contact choice and consent. Documentary checks must be defined operationally, with private storage/access/retention. Email verification does not warrant a “verified property owner” badge. Use explicit listing context; preserve professional custody. Either support multi-persona users correctly or explicitly exclude those accounts from the first pilot—never silently move their property into an agency.
2. **Authoring and lifecycle.** Reuse canonical Listing/media/location and revisions. Provide drafts, edit, submit, status/rejection reasons, withdrawal and term expiry. A draft save, review submission, accepted payment and publication are separate states. Payment does not guarantee approval. Reviewed changes cannot bypass publication guardrails. Listing withdrawal preserves history and stops future enquiries/distribution as defined.
3. **Commercial entitlement.** Separate owner package eligibility from professional Launch Access. Reuse canonical invoices, finance evidence and reconciliation where suitable; manual EFT is an operating choice, not permission to activate through SQL. Define one property's entitlement, visibility commencement, expiry, renewal, revision and refund effects. Approval for an owner product must not enable all existing paid products or override held release controls.
4. **Public projection and contact.** Publish through the existing Property projection, with explicit owner supply identity and valid custody. Derive recipient identity server-side from the listing relationship. Supply an owner-only enquiry view and actual verified delivery; preserve durable deduplication, worker isolation, unknown-outcome handling and monitoring. Do not expose proof documents, internal email, private exact location or buyer details to unauthorised parties. WhatsApp/public contact exposure needs an explicit opt-in policy.
5. **Marketing service.** Include a specified, deliverable marketing operation in the core proposition: presentation review, approved description/photo selection and an agreed channel/asset deliverable. Record approval, operator, delivery date and proof. The record may begin as an access-controlled operations register; listing IDs and customer authorisation must remain traceable. Do not defer all marketing until an automation project.
6. **Professional assistance and suppliers.** Keep assistance as an optional distinct engagement. An owner's enquiry or provider purchase does not transfer listing control or authorise an estate-agent mandate. The first MVP may offer directory browsing or a honestly labelled assistance request. Actual introductions need consenting participants, scoped information sharing and an operator/partner workflow. Supplier delivery and agent representation are different relationships.

The minimal owner surface is “My properties” with draft/status/enquiries and defined support actions. Reuse existing components and services. A duplicate professional dashboard, general CRM, full property ownership graph and performance recommendation engine have no demonstrated MVP need.

### Marketing availability and staged delivery

| Proposed value | What can be reused / delivered first | What cannot be promised yet |
| --- | --- | --- |
| Property exposure and SEO | Existing approved inventory, detail/media and location SEO foundations; verify rendered canonicals/routes, sitemap coverage and public eligibility on the actual release. | Indexing, rankings, traffic or exposure volumes. Code presence is not hosted/search-engine acceptance. |
| Description and imagery | Operator-reviewed copy, lawful owner-supplied media and optionally a contracted photographer with defined rights/deliverables. | Imagined property features; unrestricted AI photo enhancement or undisclosed material staging. |
| Social/video | Owner-approved share assets, manual posting by an assigned operator, authorized account access, removal/update process and delivery receipts. Video production is a separate priced deliverable where a real supplier exists. | Automated syndication, every channel, guaranteed reach or working distribution merely because footer social links exist. |
| Paid ads / featured placement | Later controlled campaign with separately specified media budget, management fee, customer approval and platform-native delivery evidence. | Current featured flag as a complete paid product; hidden alteration of organic Explore ranking. Sponsored placement needs its own eligibility/disclosure/window authority. |
| Performance support | Listing/publication status, recorded enquiry counts/delivery status and fulfilled marketing tasks, with period/definition and unknown states. | Reliable end-to-end conversion, unique audience, attributed sales/tenants or automated advice from current counters. |

Rentals start as advertising, enquiries and owner-managed viewings. Screening, lease drafting, placement, deposits, rent collection and ongoing management require separate service, privacy and regulatory decisions. They are not interchangeable with sale marketing.

## C. Delivery priorities and independent launch gates

P0 below means an unsafe approach to reject, not a feature to implement first. P1 is necessary for the selected **paid owner MVP**, not automatically for the professional launch.

| Priority / stage | Work | Completion evidence |
| --- | --- | --- |
| **P0 — reject** | Grant owner professional rights; fake agent/platform attribution; bypass paid/review/custody guards; direct public Property writes; revive retired billing/boost authorities; transfer owner control without consent; expose sensitive proof/contact data; sell unsupported services or activate production from this assessment. | Explicit negative requirements in the approved owner contract and regression cases in later implementation. |
| **P1 — Stage 0 continuity** | Continue current professional launch closure. Separately ship truthful owner information panel in preparation `/advertise`. | Preserve three professional cards/commercial branch; exact destinations and no implied publication. This panel does not depend on owner billing/schema. |
| **P1 — Stage 1 decisions** | Select pilot, scope, property authority/moderation, package/term, marketing deliverables, finance/refunds, enquiry destination and operator capacity; focused legal assessment. | Founder-approved scope and operating contract; architecture decision and schema plan reviewed under canonical authority. |
| **P1 — Stage 2 owner core** | Owner context/capabilities; personal draft and edits; authority/disclosure review; owner billing/entitlement; controlled publication/public identity; enquiry custody/inbox/delivery; expiry/withdrawal; basic truthful status; privacy/rate-limit/abuse controls. | Disposable canonical DB integration tests and negative permissions, then separately authorised hosted customer/payment/publication/mailbox proof. Both sale/rent cases if both are offered. |
| **P1 — Stage 2 marketing operation** | Assigned operator and deliverable/checklist, permissions, approval/proof, support and cancellation procedures. | Controlled pilot demonstrates what was purchased was delivered, reconciles money/support time and preserves owner choice. |
| **P2** | Enhanced package, paid campaign operations, selected photography/video suppliers, reliable guest/bot-aware analytics and attribution, more efficient status reporting. | Demand, suppliers/capacity and measured margin; explicit reporting coverage. If promoted/sold in initial package, its actual deliverables become P1. |
| **P3 — Stage 3** | Automated social distribution, advanced reporting/recommendations, assisted professional introductions, broader services/rental operations, multi-property efficiency and renewals optimization. | Separate authority and customer demand; no automatic price/renovation/mandate recommendation based solely on time on market. |

**Professional-launch blockers remain the existing accepted register's obligations.** The current main closure packet records B08/B11/B16 open: exact database/worker/network admission, private-document application access/durability proof, and integrated release/source/copy acceptance. Its ordered hosted exercise additionally covers real invitations, mailbox delivery, finance, publication, enquiries, retry/recovery and staffed operations; recovery/operating/copy decisions are assigned there. This source assessment does not close those gates or verify current provider state. Owner-specific entitlement, public identity and recipient work must not become prerequisites for professional launch.

## D. Commercial, operational and compliance decisions

### Package economics: hypothesis worksheet

No owner prices, CAC, demand, supplier rates or conversion/renewal rates are validated by this assessment. Professional R499/R999/R1499 Launch Access prices and 90-day terms are **not** owner package authority. Obtain customer interviews/willingness-to-pay evidence, supplier quotations and a timed pilot before adopting prices.

Use net service revenue excluding VAT, separate client media budget and other pass-through amounts. Gross profit = net service revenue minus direct fulfilment, support/coordination, payment fees and expected refund/dispute costs. Contribution additionally deducts acquisition cost. State internal labour treatment consistently; unpaid founder time still has a cost.

The following is an **illustrative cost model, not quoted prices or measured economics**. Assume loaded labour R350/hour, payment fee 2.5% of net service price `P` (replace with actual EFT/provider cost), and refund/dispute reserve 5% of `P`. Assume contribution target 30%. At these assumptions, price floor is `(fixed delivery cost + CAC) / 0.625`.

| Package hypothesis | Illustrative delivery assumptions | CAC assumption | Illustrative price floor for 30% contribution; not recommended price |
| --- | --- | ---: | ---: |
| Base owner listing + defined presentation/share deliverable | 0.75h labour + R100 fulfilment = R362.50 | R200 | R900 |
| Enhanced marketing, excluding separately approved ad spend | 1.5h labour + R700 content/vendor work = R1,225 | R300 | R2,440 |
| Premium assistance, excluding regulated transaction work | 4h labour + R1,500 vendor work = R2,900 | R400 | R5,280 |
| Optional contracted photography/video service | 0.5h coordination + R1,500 supplier = R1,675 | R0 incremental / R200 standalone | R2,680 / R3,000 |

At any selected `P`, indicative gross margin is `1 - fixedDelivery/P - 0.075`; contribution margin subtracts `CAC/P` as well. These floors merely reveal sensitivity to labour and supplier cost. Validate whether VAT, pass-through accounting, refund liability and fees change this model. Assisted work has particularly uncertain effort/dispute costs. Vendor cancellation/travel/reshoot terms and advertising budget exhaustion must be priced explicitly.

Do not assume renewals or use unmeasured visitor-to-enquiry conversion to fund a low initial price. Build conservative low/base/high scenarios for acquisition, staff time, refunds and repeat purchase; log each pilot order's acquisition source, price, deliverables, time, support, refund and continuation choice. At an illustrative six operator-hours/week, 0.75h/customer permits at most eight starts/week before other work; higher-touch support lowers capacity. Founder must approve cohort size and actual coverage.

### Decisions requiring Edward and named operators

1. First cohort: sales, rentals or both; residential types/geography; ordinary consumer accounts only initially versus multi-persona support; maximum inventory per package.
2. Right-to-advertise evidence, disputes/co-owners/representatives, mandatory disclosures and manual moderation owner; no promise of ownership verification without its process.
3. Package deliverables/term, marketing channels, prices/VAT treatment, acquisition budget and minimum acceptable contribution. Paid ads budget separate from management fee; no spend without approval.
4. Finance operator, permitted payment process, cancellation/refunds, rejection after payment, expiry/renewal and outstanding obligations. No guaranteed responses or automatic renewal assumption.
5. Named marketing/support staff, capacity, approved working hours, updates/removal and absence/incident coverage; actual provider agreements and quality/remedy responsibility.
6. Recipient verification, buyer/owner consent, contact disclosure, lead access/retention and complaints. Assistance requests need an attended queue and accurate acknowledgement, not a matching claim.
7. Legal scope and professional participation: who supplies which service, authorisation/mandates, permitted referral remuneration and whether the platform itself requires regulatory registration.

### Focused South African assessment before selling the owner offer

**Paid property marketing itself needs classification.** The PPRA's licensing FAQ includes property advertising platforms and describes marketing another person's property for remuneration within its practitioner definition. Therefore “owner retains control” or “we only sell marketing” is not evidence of exemption. Obtain a focused opinion on the actual model, applicable registration/FFC, disclosures, remuneration, trust-money and FICA duties before owner commercial opening. Broader viewing/negotiation/placement adds further questions. This is a regulatory dependency to resolve, not a concluded legal classification. [PPRA licensing FAQ](https://theppra.org.za/faqs/faq-licensing/), [PPRA mandate](https://theppra.org.za/about-us/our-mandate/).

**Professional referral fees need specific review.** Do not treat referral revenue as assured. The joint PPRA/LPC notice specifically addresses financial inducements for recommending conveyancers; it does not establish that every contemplated supplier fee is either lawful or prohibited. Assess the exact arrangement and section 58/code obligations, preserve customer choice and disclose commercial relationships. [PPRA/LPC notice, 2 June 2025](https://theppra.org.za/download.php?data_id=145372).

**Privacy and marketing permission are separate from an enquiry.** Specify listing contact publication, enquiry sharing, documentary evidence, marketing consent/objections and retention. The Information Regulator's direct-marketing guidance covers POPIA requirements, including electronic marketing consent and the bounded existing-customer exception. An owner asking for help or a buyer enquiring must not be assumed to consent to unrelated provider marketing. Tenant screening and sensitive/credit data need a separate assessment before being offered. [Information Regulator guidance](https://inforegulator.org.za/wp-content/uploads/2020/07/GUIDANCE-NOTE-ON-DIRECT-MARKETING-IN-TERMS-OF-THE-PROTECTION-OF-PERSONAL-INFORMATION-ACT-4-OF-2013-POPIA.pdf).

**Customer terms must fit the sold service.** Review truthful claims, supplier identity, complete costs, delivery timing, complaints, cancellation/refund treatment and applicable electronic-service cooling-off rules/exceptions. Existing placeholder legal pages do not establish approved owner terms. Obtain advice on the particular package and fulfilment timing rather than assuming “non-refundable” or a universal cancellation period. [Consumer Protection Act](https://www.gov.za/documents/consumer-protection-act), [Electronic Communications and Transactions Act](https://www.gov.za/documents/electronic-communications-and-transactions-act).

## E. Effort and trade-offs

Engineering planning estimate, **not a delivery commitment**: approximately **6–10 person-weeks** for a bounded paid owner pilot after the decisions above and access to a working disposable test environment. Allow roughly 1.5–2 weeks for context/capabilities and draft UX, 1.5–2 for commercial/lifecycle extension, 1.5–2 for public identity/enquiry delivery, and 1.5–4 for integration, security and pilot proof. Calendar time depends on staffing, integration conflicts, legal/finance decisions and hosted authorisation; those are not included as predictable engineering durations. Re-estimate after the owner contract/schema design.

The preparation information panel is approximately 0.5–1 engineering day including focused validation. A private-draft-only pilot would be smaller, but cannot be sold as the specified public listing/marketing product. A manual assistance request is useful Stage 0; it is not a substitute for owners managing their own listings.

Incremental extension preserves the proven listing/media/publication foundations and avoids duplicating a second inventory system. The bounded change costs more than adding a card/register role, but supplies the missing commercial/customer authority. A larger redesign becomes justified only if the approved billing/multi-persona requirements cannot be modeled coherently within the canonical account/custody contracts. That has not been demonstrated.

## F. Immediate next bounded workstreams

### Independently deliver the authorised preparation information panel

Freshly fetch and record main; use a dedicated branch/worktree. Keep #602/#581 unchanged and recheck their scopes. Prefer only `client/src/pages/AdvertiseWithUs.tsx` and a focused page test; do not change `SegmentationLayer` into a four-audience commercial gateway.

Acceptance:

- In preparation `/advertise`, a separate “Private property owners” information panel states: **“Self-service private-owner listing is not yet available. Ask about listing options or browse estate agents. Submitting a request does not publish a property.”**
- **“Ask about listing options”** links exactly to `/contact?area=other&topic=listing-preparation`; **“Browse estate agents”** to `/agents`. Current `AssistedOnboardingRequestPage.tsx:43` consumes this area/topic context.
- The three Agent/Agency/Developer preparation cards, three-audience commercial gateway and activation restrictions remain intact. No owner signup, pricing, publication, matching or guaranteed assistance claim.
- Tests cover the actual preparation page, exact links and unchanged professional cards; existing gateway commercial-truth tests continue to pass. Complete repository-required changed-file checks and desktop/mobile review. Deliver a small PR with baseline, scope and evidence; no merge/deploy under this assessment.

### Prepare the owner MVP authority and operating contract before implementation

Next substantial workstream: one product/architecture contract covering the selected cohort, listing context/permissions, right-to-advertise review, package unit/term, state transitions, finance/refunds, public identity, enquiry recipient and manual marketing operation. No implementation or schema mutation in that workstream unless separately authorised.

Acceptance:

- Founder decisions 1–7 above have named owners and resolved inputs for the selected offer, with open/deferred items explicitly unavailable to customers.
- Permission matrix covers anonymous, owner A/B, professional same-user context, unrelated agent/agency, moderator, finance and worker. Nobody gets rights through client-supplied owner/recipient IDs.
- Lifecycle matrix covers draft, submitted, rejected, paid/unmatched/duplicate payment, approved/published, revision, expired, withdrawn and refund; defines what becomes public and when paid visibility starts.
- Canonical design identifies exact reusable tables/services and minimum new/changed invariants, including multi-persona billable-account uniqueness and owner lead recipient/source typing. Review under database authority; no alternate schema, SQL fallback or resurrected retired model.
- Package worksheet uses supplier quotes and recorded operator time; legal classification and consent/terms review have a responsible reviewer. Marketing checklist and delivery proof are concrete.
- Implementation plan maps changes to active workstreams, specifies disposable integration/negative tests and a separately authorised hosted value-loop proof. Professional launch gate ownership remains independent.

Declare the owner MVP complete only after a consenting owner can manage a correctly owned draft, pay through the approved process, receive reviewed publication and the purchased marketing deliverables, see a buyer/tenant enquiry delivered into their own authorised custody, and withdraw/expire without leaking data or retaining unsupported promises. Source tests alone cannot establish that outcome.
