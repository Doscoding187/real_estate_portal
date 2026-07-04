# Risks, Decisions, And Roadmap

This file turns the map into an action posture: what is risky, what decisions are recommended now, what alternatives should be avoided, and which implementation slices are safest.

## Risk Register

| Risk | Severity | Evidence | Why it matters | Mitigation |
| --- | --- | --- | --- | --- |
| Public catalog source-of-truth ambiguity | High | `listings` publish into `properties`; development cards are derived from `developments` and `unitTypes` | Public search/detail can accidentally mix write models and expose stale or misattributed fields | Treat `properties` as public projection where applicable and require source metadata in result contracts. |
| Lead model fragmentation | High | Generic `leads`, `listingLeads`, brand leads, developer funnel, `serviceLeads`, demand leads, distribution deals/referrals | A user enquiry can be captured but routed, displayed, or reported incorrectly | Define shared capture/attribution contract and keep downstream pipelines domain-specific. |
| Developer account versus public brand ambiguity | High | `developers`, `developerBrandProfiles`, brand profile router, marketing agency identity fields | Incorrect ownership can affect public pages, leads, distribution, and billing | Make brand profile a first-class public commercial identity in contracts. |
| Billing and entitlement fragmentation | Medium-high | Billing tables plus developer, agency, service, partner subscriptions and user-level fields | Feature access can diverge from subscription truth | Build entitlement read adapters per stakeholder before data migration. |
| Distribution router concentration | Medium-high | `server/distributionRouter.ts` contains admin, manager, agent/referrer, developer, and public onboarding flows | Large file makes ownership and authorization harder to reason about | Document sub-boundaries first, then extract service/router modules behind unchanged contracts. |
| Reviews route overpromises shared trust capability | Medium | `server/reviewsRouter.ts` returns an empty list; service provider reviews exist separately | Product surfaces may assume reviews are available across targets | Keep reviews domain-local until a generic target/review/moderation contract exists. |
| Campaign/marketing naming exceeds current implementation | Medium | Marketing router/pages, demand schema, marketplace boost campaign tables | "Campaign" can mean demand lead campaign, content boost, developer marketing, or location campaign | Use explicit owner and objective names before building a shared campaign engine. |
| Super-admin publisher context can misattach content | Medium | Developer wizard supports publisher mode and brand context | Admin-created development content could be published under the wrong brand | Keep publisher brand context required in payloads/tests. |
| Wizard partial update drift | Medium | Canonical wizard state plus shared payload ownership rules | Overlapping step fields can erase inventory, media, or pricing | Keep `shared/developmentPayloadOwnership.ts` as ownership source and extend tests when fields move. |
| Explore and Discovery coexist without a single ownership map | Medium | `server/domains/discovery` and legacy Explore routers/services both exist | Feature work may land in the wrong stack | Create a short migration/ownership matrix before major discovery work. |
| Route ambiguity around developer routes | Medium | Public and private developer routes coexist in `client/src/App.tsx` | `/developer/*` workspace and `/developer/:slug` public brand URLs can be confused | Keep route order and route intent documented; prefer explicit public brand URLs if route conflicts grow. |
| Candidate actor abstraction could be adopted too early | Medium | `economicActors` exists but current flows still use domain-specific profiles | Premature generic model could duplicate or break mature agency/developer/service flows | Use it only after one vertical proves the adapter pattern. |

## Detailed Risk Timing Matrix

| Risk | Affected domains | Probability | Current impact | Mitigation timing |
| --- | --- | --- | --- | --- |
| Public catalog source-of-truth ambiguity | Single-Property Listing, Development Listing, Public Search | High | Search/detail regressions and stale or misattributed public fields | Immediate, starting with source metadata contract tests |
| Lead model fragmentation | Lead Intake, Developer Funnel, Services, Demand, Distribution, Agent/Agency | High | Misrouting, missing dashboard records, inconsistent lifecycle reporting | Immediate for attribution contract; near-term for adapters |
| Developer account versus public brand ambiguity | Developer account, Brand Profile, Development Listing, Lead Capture, Distribution | Medium-high | Wrong public owner/contact, wrong lead destination, publisher confusion | Immediate for development publish/lead contracts |
| Billing and entitlement fragmentation | Billing, Developer, Agency, Services, Partner/Distribution | Medium | Feature gates can disagree with plan state | Near-term entitlement read adapters |
| Distribution router concentration | Distribution/Referral | Medium | Authorization and ownership review is difficult | Near-term documentation and contract-preserving extraction |
| Reviews route overpromises shared trust | Reviews, Services, Public Profiles | Medium | Public surfaces may depend on empty generic reviews | Deferred until shared target model exists |
| Campaign/marketing naming exceeds implementation | Demand, Marketplace, Developer, Marketing | Medium-high | Product work may build against the wrong concept of campaign | Near-term terminology and attribution contract |
| Super-admin publisher context can misattach content | Development Listing, Brand Profile, Admin | Medium | Admin-published development can land under wrong brand | Immediate payload/test assertions |
| Wizard partial update drift | Development Listing | Medium | Draft/update can erase inventory/media/pricing | Immediate tests around ownership map when fields change |
| Explore and Discovery coexist | Discovery/Explore, Services, Analytics | Medium | Duplicate feed/analytics work and unclear ownership | Near-term ownership/migration map |
| Route ambiguity around developer routes | Developer Workspace, Developer Showcase | Medium | Public/private developer URLs can conflict or confuse | Deferred unless new route conflicts appear; document route intent now |
| Candidate actor abstraction adopted early | Identity/Profile/Trust, all stakeholder domains | Low-medium | Broken mature stakeholder-specific rules | Deferred until adapter proof exists |
| Domain logic inside UI components | Developer wizard, listing wizard, service flows | Medium | UI changes can alter domain rules without server contracts | Immediate for publish/source-of-truth contract tests |
| Routers bypassing domain services | Distribution, listing/db, developer routes | Medium | Business rules split across router/service/db helpers | Near-term service boundary review per engine |
| Analytics events without stable identifiers | Search, Discovery, Leads, Developer Funnel | Medium | Reports cannot reconcile public actions to domain objects | Near-term event envelope/source metadata |
| Legacy and current routes in parallel | Explore/Discovery, developer public/private routes | Medium | Dead or old paths mistaken for canonical architecture | Near-term route ownership notes and test coverage |

## Architecture Decisions

| Decision | Status | Rationale |
| --- | --- | --- |
| Keep Single-Property Listing and Development Listing as separate domain engines | Recommended now | They have different authoring workflows, inventory models, approval flows, and public projections. |
| Treat `properties` as a public catalog/read projection by default | Recommended now | Single-property listing approval writes to it, while development results are derived elsewhere. |
| Treat lead capture as shared, but pipelines as domain-specific | Recommended now | Generic lead intake, developer funnel, service leads, demand leads, and distribution deals have different state machines. |
| Treat `developerBrandProfiles` as public commercial identity | Recommended now | It participates in public pages, contact identity, claimability, marketing agency identity, lead routing, and distribution access. |
| Build entitlement read adapters before billing schema unification | Recommended now | The current system has multiple subscription stores that likely encode real domain differences. |
| Document distribution subdomains before extracting code | Recommended now | Behavior is deep and tested; extraction should be contract-preserving. |
| Keep service provider identity tied to Explore partner identity only if product intends it | Needs product decision | Current implementation uses `explorePartners`; growth may require a service-native identity root. |
| Do not call reviews a shared platform capability yet | Recommended now | The generic reviews router is a stub. |

## Rejected Alternatives

| Alternative | Why to reject it now |
| --- | --- |
| Build one universal "Property Engine" for listings and developments | It would erase real differences in authoring, inventory, public detail, and approval. |
| Move all leads into one universal CRM state machine | Service requests, developer sales, agent enquiries, demand assignment, and distribution deals have incompatible lifecycle semantics. |
| Replace all profile tables with `economicActors` immediately | Current stakeholder flows are already mature and domain-specific; the abstraction is not yet proven as a replacement. |
| Move development unit listings into `properties` as normal listings | It would blur derived inventory with single-property listing publication and create ownership confusion. |
| Refactor distribution by splitting the router first | The router is large, but behavior is complex and tested; extraction should follow documented contracts. |
| Generalize reviews from the stub route | There is not enough shared review implementation yet. |
| Generalize billing by merging subscription tables first | Entitlement behavior should be read and tested before data consolidation. |

## Roadmap

### Slice 0: Documentation And Shared Vocabulary

Status: this docs pack.

Outcomes:

- Stakeholder registry
- Domain engine classification
- Shared capability registry
- Context/data/state map
- Developer journey deep dive
- Risk/decision log

### Slice 1: Development Publication To Public Lead Contract

Goal: Protect the most important developer vertical path without broad refactoring.

Scope:

- Canonical development payload from wizard finalisation.
- Development service publication fields.
- Derived development search card source metadata.
- Public development detail owner/brand/inventory identity.
- Public development lead capture attribution.

Acceptance:

- Published development unit appears in public search with source `development`.
- Search card and detail agree on development id, unit type id, brand identity, transaction type, and href.
- Lead capture stores development id, developer brand profile id, source surface, lead source, and qualification/affordability context.
- Existing single-property listing/property search behavior remains unchanged.

Representative tests:

- `client/src/lib/developmentSubmitPayload.test.ts`
- `client/src/components/development-wizard/phases/FinalisationPhase.test.tsx`
- `server/services/__tests__/developmentService.test.ts`
- `server/services/__tests__/developmentDerivedListingService.test.ts`
- `server/__tests__/contract.properties-search-development-listings.test.ts`
- A focused lead-capture contract test around `publicLeadCaptureService` or `developer.createLead`

### Slice 2: Lead Capture And Attribution Contract

Goal: Make shared lead intake safer without forcing one pipeline.

Scope:

- Define required capture fields: source surface, source entity, owner actor, public brand/contact identity, consumer contact, consent/anti-spam metadata, and domain context.
- Add adapters for developer leads, listing/agent leads, service leads, and demand leads.
- Keep distribution deals separate, but allow linking from referral/lead contexts where appropriate.

Outcomes:

- Fewer hidden assumptions in `publicLeadCaptureService`.
- Clearer dashboards and routing.
- Better auditability for lead source and owner.

### Slice 3: Developer Brand And Organization Boundary

Goal: Clarify developer account, public brand, marketing agency identity, and team access.

Scope:

- Document who can own, publish for, claim, and receive leads for a `developerBrandProfile`.
- Define whether developer teams should reuse agency membership patterns or get a developer-specific membership table.
- Add permission helpers before adding new routes.

Outcomes:

- Lower risk for super-admin publisher and marketing agency flows.
- Better foundation for paid plans and team collaboration.

### Slice 4: Entitlement Read Adapters

Goal: Unify feature access reads without merging subscription tables.

Scope:

- Developer entitlement adapter.
- Agency/agent entitlement adapter.
- Service provider entitlement adapter.
- Partner/distribution entitlement adapter if required.

Outcomes:

- Feature gates can ask one stable interface.
- Billing migrations can happen later with lower risk.

### Slice 5: Distribution Boundary Extraction

Goal: Reduce distribution router risk while preserving behavior.

Scope:

- Admin program/access context.
- Manager operations context.
- Partner/referrer submission context.
- Developer distribution analytics context.
- Public onboarding/invite context.

Outcomes:

- Smaller router modules.
- Easier permission review.
- Existing distribution tests can protect extraction.

### Slice 6: Discovery/Explore Ownership Map

Goal: Decide how new Discovery and legacy Explore should coexist.

Scope:

- Identify canonical feed APIs.
- Map legacy Explore content, videos, interactions, analytics, and partner identity to new Discovery concepts.
- Decide whether service provider Explore videos remain in services or move to discovery/content.

Outcomes:

- Cleaner public discovery work.
- Less duplicate feed/ranking/analytics logic.

## Target Implementation Guidelines

- Prefer contract tests over broad refactors when stabilizing boundaries.
- Add source metadata to public result types before changing storage.
- Add owner/contact identity assertions before changing lead routing.
- Add permission helper tests before introducing new stakeholder roles.
- Keep public read models and private write models separate in code and naming.
- When a shared capability is thin, build an adapter around current domain behavior before centralizing storage.

## Open Questions

| Question | Why it matters |
| --- | --- |
| Is `developerBrandProfiles` intended to represent legal developer organization, public marketing brand, or both? | Determines permissions, billing, public contact, claimability, and lead routing. |
| Should marketing agencies be first-class organizations or a mode of developer brand profiles? | Affects publisher permissions and ownership fields. |
| Should development unit types ever create `properties` rows, or should they remain derived search cards? | Determines public catalog source-of-truth strategy. |
| Which lead surfaces must appear in the developer dashboard: generic leads, brand leads, distribution referrals, demand leads, or all linked records? | Determines dashboard queries and attribution. |
| Should service providers remain anchored to `explorePartners`? | Determines identity and billing architecture for the Service Provider Engine. |
| Is `economicActors` a future platform abstraction or a separate experiment? | Determines whether future stakeholder profiles should adapt to it. |
| What is the intended generic reviews target model? | Needed before reviews can become shared trust infrastructure. |
| Which campaign concept is primary: demand lead campaigns, content boosts, developer marketing campaigns, or location campaigns? | Needed before a campaign engine should be built. |
| Does developer team management need agency-grade membership, permissions, and invitations? | Needed before enabling collaborative developer workspaces. |

## Final Recommendation

The next implementation work should not start by unifying schemas. Start by protecting the Development Listing Engine public contract from private publish through search, detail, and lead capture. It is high-value, touches real stakeholder outcomes, and can be done with focused tests around existing code.

## Next Single Coherent Implementation Slice Specification

Name: Development publication to public lead contract hardening

Problem statement:

The Development Listing Engine has a strong private authoring and public discovery path, but the contract across wizard payload, persisted development/unit data, derived public search cards, public detail, and lead capture is spread across several files and entry points. Without a focused contract, future work can break public attribution or inventory display while still passing local form or service tests.

Stakeholder outcome:

A property developer can publish a development and trust that buyers see the correct public unit/development information, open the correct public detail page, and submit an enquiry that reaches the correct developer brand/funnel with source and qualification context intact.

Architectural reason:

This slice protects an established source-of-truth domain from private workspace through public conversion without introducing a universal lead engine, rewriting schemas, or moving development inventory into `properties`.

Current evidence:

- Wizard and state: `DevelopmentWizard.tsx`, `WizardEngine.tsx`, `useDevelopmentWizard.ts`
- Payload: `developmentSubmitPayload.ts`, `developmentTransactionPayload.ts`, `developmentPayloadOwnership.ts`
- Service: `developmentService.ts`
- Public search: `developmentDerivedListingService.ts`, `SearchResults.tsx`
- Public detail: `DevelopmentDetail.tsx`, `developer.getPublicDevelopmentBySlug`
- Lead capture: `DevelopmentLeadDialog`, `DevelopmentQualificationPage`, `publicLeadCaptureService`, `brandLeadService`, `developerFunnelService`
- Storage: `developments`, `unitTypes`, `developerBrandProfiles`, `leads`, `leadActivities`

Scope:

- Add or strengthen contract tests around canonical publish payload fields.
- Assert derived development search cards preserve source, development id, unit type id, brand/contact identity, transaction type, price/rent/auction fields, and href.
- Assert public development detail exposes the same identity/inventory context used by search.
- Assert development lead capture preserves development id, developer brand profile id, source surface, lead source, and qualification context.

Affected routes:

- `/developer/create-development`
- `/development-wizard`
- `/development/:slug`
- `/development/:slug/unit/:unitId`
- `/development/:slug/qualification`
- Public property search routes that call `properties.searchDevelopmentListings`

Affected routers and procedures:

- `developer.saveDraft`
- `developer.createDevelopment`
- `developer.updateDevelopment`
- `developer.publishDevelopment`
- `developer.getPublicDevelopmentBySlug`
- `developer.createLead`
- `properties.searchDevelopmentListings`
- `leads.create`
- `brandProfile.captureLead`

Affected contracts:

- Development wizard draft/publish payload
- Development public read contract
- Development-derived search card contract
- Public lead capture payload
- Developer funnel lead mapping contract

Affected services:

- `developmentService`
- `developmentDerivedListingService`
- `publicLeadCaptureService`
- `brandLeadService`
- `developerFunnelService`

Affected storage:

- `developments`
- `unitTypes`
- `developerBrandProfiles`
- `developmentDrafts` for draft source
- `leads`
- `leadActivities`

Affected public consumers:

- Search results
- Development detail
- Development qualification page
- Developer brand/showcase pages where active developments are listed

Tests required:

- Existing development payload tests extended for identity/inventory/transaction fields.
- Existing development-derived search tests extended for source metadata and detail href.
- Public detail contract test confirming detail and search identity match.
- Lead capture contract test confirming development and brand attribution.
- Regression assertion that single-property `properties` search/detail behavior is unchanged.

Tests already present:

- `client/src/lib/developmentSubmitPayload.test.ts`
- `client/src/lib/developmentTransactionPayload.test.ts`
- `client/src/components/development-wizard/phases/FinalisationPhase.test.tsx`
- `client/src/components/development/DevelopmentLeadDialog.test.tsx`
- `server/services/__tests__/developmentService.test.ts`
- `server/services/__tests__/developmentService.auctionDates.test.ts`
- `server/services/__tests__/developmentDerivedListingService.test.ts`
- `server/services/__tests__/developerFunnelService.contract.test.ts`
- `server/__tests__/contract.properties-search-development-listings.test.ts`
- `server/__tests__/integration.development-card-data-flow.test.ts`

Missing tests:

- A server-side public lead capture contract that asserts development id, developer brand profile id, source, lead source, UTM/campaign fields, and affordability/qualification context survive `developer.createLead`, `leads.create`, and brand-profile lead capture variants.
- A public detail/search consistency contract that compares a derived development search card with `developer.getPublicDevelopmentBySlug` for the same development/unit.
- A super-admin publisher ownership fixture that proves publisher brand context cannot silently attach a development to the wrong brand.

Risks:

- Tests may expose existing inconsistencies in search-card and detail field naming.
- Lead capture route variants may need explicit source normalization.
- Super-admin publisher context may require dedicated test fixtures.

Non-goals:

- No schema changes.
- No lead table unification.
- No generic CRM.
- No migration of development unit types into `properties`.
- No route redesign.
- No distribution or billing changes.
- No UI redesign beyond tests or minimal contract-preserving fixes in a future implementation task.

Definition of done:

- A published approved development unit can be verified from private publish payload to public search card to public detail to lead capture.
- Every checked public object preserves source, owner, brand, development, unit type, transaction, and lead attribution fields.
- Existing single-property listing/search tests remain green.
- Documentation can point to the tests as executable architecture evidence.
