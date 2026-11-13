# Services Current-State and Commercial Decision Audit

- **Assessment date:** 2026-11-12
- **Repository baseline:** `origin/main` `93723fdb2` (#761)
- **Purpose:** establish what is built, what V1/V2/V3 actually decide, what the live product currently offers, and what needs a product decision before provider monetization.
- **Scope:** source/docs audit and public-page observation. No product code, production data, platform configuration, or database was changed.

## Executive recommendation

1. **Let service providers apply and sign up. Keep publication behind manual review.** The current product separates provider account/onboarding from public publication; it should not block all applications just because the public directory is a curated cohort. A submitted profile stays private until an authorized reviewer approves publication.
2. **Do not copy Agent Launch Access pricing into Services.** Agent access sells a time-bounded ability to use a different professional workspace. Services does not yet sell an entitlement, a lead, a booking, or a completed transaction. The unit of value and cost/risk are different.
3. **Launch the approved free, controlled Services cohort while researching monetization.** “Free pilot” is the current approved launch posture, not a final commercial model or a promise that the product will remain free forever. Set pilot scope and a review date; do not charge until the commercial decision, terms, billing authority, and customer protections are ready.
4. **Use V3 as the provider-growth roadmap, V1 as shipped-behavior authority, and V2 as the current business-model decision.** They are layered documents, not competing product plans. Several shipped-state claims and queue statuses in V3/the register are stale and need reconciliation before selecting new engineering work.

## 1. The registration and approval distinction

There are three separate gates:

| Gate | What happens | Current state |
| --- | --- | --- |
| **Account application** | A provider creates an account and verifies their email. | Held on the public site. `service_provider` is not an allowed registration role in `server/_core/authRoutes.ts`; the client marks the role unavailable in `client/src/pages/Login.tsx`. |
| **Profile onboarding** | An authenticated provider enters business information, services, ZAR service-price ranges, and canonical Place coverage. | The wizard exists in `client/src/features/services/onboarding/ProviderOnboardingWizard.tsx`. Completion copy says the profile is ready for manual review and is not public. |
| **Directory publication** | A reviewer checks readiness and explicitly publishes, rejects, or leaves the profile unpublished. | The super-admin review workspace and server transition exist. The server rechecks readiness and writes the audited publication state. |

**Recommended behavior:** open the first gate to applications, leave the second available to applicants, and keep the third as a human decision. Registration must never publish a profile automatically. If the selected cohort is full, applications can remain pending or be declined with clear communication; applicants should not be forced to assume that signup guarantees approval or leads.

The current provider acquisition page uses a non-link “Not open yet” call to action and says, “We are launching with agents first.” The registration page also says service-provider accounts are not open. These currently prevent the expected application → profile → review flow from starting publicly, even though onboarding and review code exist.

The change to admit applications requires a coordinated client and server decision. Do not merely enable the UI role card: the server intentionally rejects held professional roles. In the pilot, the application must keep new partner identities pending, profiles private, and publication admin-only. Rehearse the entire flow in an isolated environment before enabling it publicly.

## 2. What is currently built

### Consumer and provider product

- Public Services home, six category routes, provider profiles, provider service detail pages, five topic pages, sitemap and structured-data support.
- Directory selection and published-provider filtering use the current publication/eligibility rules; service and coverage data are required.
- Provider profiles can show provider-entered services, ZAR price ranges, listed coverage, platform verification, and eligible moderated reviews. Measured response performance is shown only when there is enough event data.
- A consumer selects one provider and submits an authenticated, idempotent service request. Existing source/context such as property or listing context is carried by the established lead record.
- The provider workspace supports assigned-request visibility, status updates and notes, and dashboard summaries.
- Super-admin workflows cover provider publication review, review moderation, and report triage.

### What the engine is not

- It does not book appointments, manage provider calendars, take consumer payment, or record completed/fulfilled service orders.
- `quoted` is a lead status, not a formal quote workflow.
- There is no Services lead-fee billing path: new service leads set `billingEligible` to `0` and `billingTierSnapshot` to `null`.
- Providers do not receive the Services lead alerts/reminders described as future DELTA-8 work. A pilot therefore needs an explicit manual inbox-check and response process.
- Review report triage and provider publication are manual operations.

### Price fields are not platform monetization

The onboarding service editor accepts provider-authored minimum/maximum service prices in ZAR. These are the provider's prices for the work, presented to consumers; they are not a Services subscription price or a charge from Property Listify.

The schema retains a provider subscription vocabulary (`directory`, `directory_explore`, `ecosystem_pro`; statuses including `trial` and `active`) for future entitlement design. New provider subscriptions default to `directory` + `trial`. V2 explicitly says no tier is sold and publication does not grant a paid entitlement. This is scaffolding, not an implemented pricing plan or evidence that providers are being charged.

## 3. What V1, V2, and V3 mean together

| Document | Authority and decision | What to carry forward |
| --- | --- | --- |
| **V1 — Professional Services product contract** | Authority for already-shipped public behavior; describes the directory, private provider onboarding, one-to-one enquiry, reviewed publication, and lead custody. | Preserve privacy, eligibility, publication review, request identity, provider custody, and canonical geography rules. Its geography paragraph predates the current canonical Place implementation and must be refreshed. |
| **V2 — Services product contract** | Approved product direction; specifies the consumer/provider journeys and explicitly approves a **free, controlled provider pilot while the business model is validated**. | No provider plans, paid placement, lead fees, territory exclusivity, or tier merchandising until research and Edward's approval. Provider subscriptions remain reserved schema vocabulary only. V2 also allows honest, request-backed reviews and honest provider-supplied price/availability information. |
| **V3 — Services growth-journey contract** | Approved framework for what happens across discovery, brand presence, conversion, working requests, and retention/handover. It carries V2's business-model rule forward; it does not approve a price or replace V2's commercial posture. | Use V3 to prioritize provider growth capability. Campaign capture, media/case-study schema, alerts/reminders, and export/handover have their own sequence and evidence gates. DELTA-8 alerts/reminders precede DELTA-9 handover under the current V3 decision. |

### V3 source/status reconciliation against #761

The V3 contract and standing register have status drift. Current `origin/main` contains:

| Delta | Current evidence in main | Correct reading |
| --- | --- | --- |
| **DELTA-1 — provider web presence** | PR #704 is merged; per-service pages exist. | Shipped. The V3 “not yet on main” line is stale. |
| **DELTA-3 — response measurement** | PR #701 is merged; response-event performance logic is present. | Shipped. The V3 text saying PR #701 is open is stale. |
| **DELTA-4 — SEO** | PR #700 is merged; service sitemap/structured data and category canonicalization exist. | Shipped. |
| **DELTA-7 — workspace** | PR #702 is merged; workspace filters, status/request mix, response measurement surfaces, and hygiene work landed. | Shipped. The register's “in flight” label is stale. |
| **Canonical Place coverage** | `service_provider_locations` references canonical Place identity; onboarding and request contexts use canonical Place. | The foundational typed-Place migration is present. Old V1/V3 statements that imply only display-text coverage or say canonical coverage is not yet on main need reconciliation. Future geography expansion can remain separately scoped. |
| **DELTA-2 — campaign capture** | No merged implementation found in the audited state. | Still future work; not required for the controlled directory pilot. |
| **DELTA-5/6 — provider media library and content schema** | Still governed as schema/evidence-gated capabilities. | Defer until real provider behavior justifies a Database Authority workstream. |
| **DELTA-8/9 — alerts then export/handover** | Remain future design/build work. | Manual monitoring can support an intentionally staffed pilot; automated delivery is required if the team cannot reliably cover that manual process. |
| **DELTA-11 — commercial model** | Remains a founder decision behind research. | No existing approval to introduce fees. |

This stale documentation is a real work-management risk: engineers could otherwise rebuild shipped V3 work or treat future capabilities as launch prerequisites. Reconcile the register and V3 claims as a documentation slice before authorizing new Services feature work.

## 4. Monetization audit and recommendation

### Current decision: research, do not price yet

The repository's approved Services commercial posture is free pilot access, with paid access explicitly deferred until the proposition and customer-acquisition economics are researched and approved. V3 restates that same rule as “no paid placement, no lead fees, no tier merchandising.” The user is right that a Services monetization plan has not been put into effect; this is an open commercial decision, not a missing toggle to switch on.

**Do not use the Agent Launch Access price as the Services price.** Agent Launch Access is an entitlement to a real-estate professional publishing/workspace journey. Services would charge for a provider profile, demand opportunity, lead access, or eventually a completed service transaction. The latter's volume, quality risk, operating costs, and provider return are unknown. Matching the number would be arbitrary. Any cross-product discount should be considered later as an intentional bundle with its own value and terms, not as the default price.

### Competitor patterns worth studying (not prices to copy)

These official sources describe US-facing products and are useful as mechanics, not South African price benchmarks:

| Reference | Publicly described mechanic | Design lesson and caution |
| --- | --- | --- |
| [Thumbtack for Pros](https://www.thumbtack.com/pro) | Says there is no subscription, annual, or membership fee; pros control pricing and lead budget; customers choose pros directly. | A flexible lead-acquisition model can preserve provider choice and budget control. It still requires clear lead value, billing controls, and dispute rules. |
| [HomeAdvisor/Angi Leads](https://www.homeadvisor.com/spa/how-it-works) and [professional terms](https://www.homeadvisor.com/rfs/terms/serviceProfessionalTerms.jsp) | Lead costs vary by task and region; terms describe charges for leads whether or not the provider wins the job, and a spend target is not necessarily a hard cap. | Per-lead economics are possible, but charging for unconverted enquiries transfers quality risk to providers. That is a poor first move before Listify has demand and reliable qualification/dispute evidence. |
| [Angi homeowner FAQ](https://www.angi.com/landing/faq) | Describes revenue from provider advertising, homeowner memberships, and separately booked Angi Services. | A mature company combines different business lines. Those lines depend on different product obligations; a directory must not pretend to provide managed booking/fulfilment. |

Angi and HomeAdvisor are related under Angi; they are not two independent pricing benchmarks. The referenced pages are US-market materials, so dollar prices, lead economics, customer expectations, and operating assumptions should not be transplanted into South Africa.

### Recommended commercial sequence

1. **Provider application and curated approval:** allow providers to apply and build profiles. Charge nothing to apply or be considered. State clearly that approval and publication are reviewed and limited by service/area coverage.
2. **Founding pilot:** offer the selected cohort free access for an explicitly defined pilot period or pilot phase, with no paid rank, no per-lead bill, and no commitment that free access is permanent. Agree the period and terms before inviting providers.
3. **Measure value before testing money:** by category and Place, track eligible directory views, profile/service clicks, requests created, duplicate/invalid requests, provider response and outcomes, request-to-contact rate where measurable, consumer complaints, and provider support effort. Ask providers about value and willingness-to-pay only after they have experienced actual demand.
4. **Research models against observed value:** compare (a) a subscription for profile/workspace tools, (b) a provider-controlled budget for clearly defined exclusive requests, and (c) a limited hybrid. Keep paid placement out unless separately approved and clearly labeled. Treat charging on completed work as a later model requiring actual booking/outcome, dispute, refund, payment, and consumer-protection capabilities that do not exist now.
5. **Set price from South African evidence:** interview providers across Services categories and business sizes; quantify lead conversion/value and Listify support/acquisition costs; test price sensitivity with non-binding offers or pilot proposals; model VAT, invoicing, payment collection, refunds/credits, and terms with the right legal/finance review. Record the decision and assumptions in DELTA-11 before implementing any charge.

**Before the commercial decision, define** exactly what the provider pays for, when the obligation arises, whether one request can ever be sent to more than one provider, what makes a request billable/qualified, duplicate and invalid-lead credit rules, spend caps, pause/cancel behavior, invoice/tax treatment, and the relationship between payment and ranking/publication. Current V1 privacy and one-provider request rules remain in force unless explicitly amended.

## 5. Recommended next work, in order

1. **Documentation truth pass:** reconcile the Services state register, V1 geography note, and V3 shipped-state/queue statuses to #761.
2. **Application gate:** open provider signup/application and connect it to the existing private onboarding → review queue → publish journey. Keep all public publication behind reviewer approval. Confirm pending/rejected/held applicant messaging and abuse/rate controls.
3. **Pilot operating plan:** choose the initial categories and canonical Places; recruit providers; set the supply bar, provider monitoring expectation, publication/review owner, support path, and pilot review date.
4. **End-to-end rehearsal:** prove account creation, onboarding, review, publication, discovery, request, workspace response, review eligibility/moderation, and manual alert coverage in an isolated environment.
5. **Production release audit:** verify exact web/API/worker artifacts and governed database readiness. No production provider writes or deployment are authorized by this audit.
6. **Commercial discovery (parallel, not a launch blocker):** recover historical founder intent, speak with prospective and pilot providers, collect pilot outcomes, then complete DELTA-11 as a separate explicit decision.
7. **Refine V3 after learning:** implement only the capabilities that improve pilot outcomes. Keep DELTA-2 campaigns, DELTA-5/6 schema, DELTA-8 notifications, DELTA-9 handover, and paid model separately gated rather than bundling them all into “launch ready.”

## 6. Context-recovery prompt

This is prepared so it can be pasted into a ChatGPT conversation that may contain earlier Services decisions:

> We are preparing to launch Property Listify Services in South Africa. Please recall from our prior discussions and identify any decisions Edward made about the Services business model, early-access/founding-provider offer, charging providers, charging per lead vs subscriptions, provider signup and manual approval, and the product examples Angi/HomeAdvisor/Thumbtack. Separate items you can actually recall from this conversation history from recommendations you are generating now; do not invent remembered decisions. Compare that history with the attached current-state audit: V1 governs shipped behavior, V2 currently approves a free controlled pilot while the commercial model is researched, and V3 is the provider-growth roadmap, not a pricing approval. The current public registration role is held, but onboarding and manual publication review exist; the intended flow is provider applies/registers → completes private profile → reviewer approves/rejects publication. The live directory has no published providers. Agent Launch Access is a different product and its price should not be copied without an explicit bundle rationale. What prior decisions should be restored, what remains undecided, and what founder decisions must we make before pricing? Cite the specific earlier statements you rely on and label uncertainty.

## 7. Evidence and limitations

- Repository source and contracts inspected at `origin/main` #761: `services-v1-product-contract.md`, `services-v2-product-contract.md`, `services-v3-product-contract.md`, `services-engine-state-register.md`, `services-v3-growth-journey-gap-assessment-2026-10-28.md`, provider onboarding, registration, review, publication, lead, billing, and commercial-activation code.
- Live domain checks in this conversation: `.co.za` Services home, inspection category, provider acquisition and registration URLs returned HTTP 200. The prior live browser inspection in this conversation saw zero published providers, registration only for buyer/agent, and “Not open yet” provider-access copy. The `.com` domain was found parked.
- Official competitor sources are linked above. Their product statements are not South African price research.
- Exact production release SHA and database readiness remain unverified. `pnpm db:authority:status` could not run in the fresh worktree because dependencies are not installed (`tsx` missing); no install or remote database connection was attempted.
- No implementation tests were run for this documentation-only audit.
