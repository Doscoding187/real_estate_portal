# Strategic Decisions And Open Questions

Status: strategic decision log
Scope: architecture decisions, alternatives, unresolved evidence gaps, product questions, and validation gates before implementation

## Executive Decision Summary

The strategic architecture should be treated as an extension of the current-state evidence audit, not a rewrite of it. The system is already a multi-stakeholder marketplace. The missing layer was not evidence; it was explicit strategic homes for capabilities that are emerging, partial, planned, or conceptual.

The current strategic posture is:

- Keep Development Listing and Single-Property Listing as separate engines.
- Treat Public Search as a query/read-model and public experience, not a write owner for all inventory.
- Treat Explore as a candidate first-class content/discovery engine, separate from ordinary listing search.
- Treat Distribution and Referral as an established commercial domain engine, not advertising or CRM.
- Prefer Sponsored Placement Engine as the home for internal paid visibility products, with Location Billboard as one product.
- Keep external marketing/social campaigns separate until delivery lifecycle evidence exists.
- Treat Location Intelligence as a candidate domain engine, while province/city/suburb pages remain public experiences.
- Treat directories and showcases as public experiences/read models over stakeholder profiles and domain-owned inventory.
- Keep shared capabilities as adapters and contracts first; avoid universal lead/profile/campaign/review/organization models until evidence proves them.

## Decisions

| Decision | Status | Rationale | Evidence and dependency |
| --- | --- | --- | --- |
| Preserve the Current-State Evidence Architecture | Accepted | The existing audit documents what the repository proves today; strategic planning should not rewrite planned capabilities as implemented | Existing evidence-led docs in this directory |
| Add Strategic Capability Architecture as separate docs | Accepted | Planned and partial capabilities need architectural homes without distorting current evidence | New strategic registry, revenue, public experience, launch, and decision docs |
| Add Launch and Implementation Architecture as separate docs | Accepted | Architectural importance and delivery priority are different dimensions | `launch-dependency-map.md` |
| Keep Development Listing and Single-Property Listing separate | Accepted | Different authoring, inventory, publication, approval, and public read rules | Current audit and first slice |
| Treat `properties` as a public projection/read model by default | Accepted | Single-property flows write to it, while development cards are derived elsewhere | Public search/source metadata risk |
| Treat Public Search and Discovery as composition | Accepted | Public search blends multiple inventory sources and adjacent discovery/content systems | Search, discovery, and Explore evidence |
| Treat Explore as candidate first-class engine | Accepted as candidate | Explore owns content/feed/engagement concerns that are not ordinary listing search | Explore schema, routers, discovery services, analytics |
| Treat Distribution and Referral as commercial domain engine | Accepted | Program, access, referral, deal, viewing, document, commission, and reporting lifecycles are deep | Distribution/referral schema and router evidence |
| Prefer Sponsored Placement Engine over standalone Billboard Engine | Recommended hypothesis | Shared creative, placement, targeting, scheduling, approval, attribution, billing, reporting should not be duplicated | Commercial architecture Option B |
| Do not create a broad universal Campaign Engine yet | Accepted | Internal placements, external social distribution, demand campaigns, and referral distribution differ materially | Marketing/router fragments, demand schema, distribution engine |
| Treat Location Intelligence as candidate engine | Accepted as candidate | Canonical locations, insights, amenities, SEO, refresh, and analytics can own a lifecycle, but current pages mostly compose data | Location hierarchy and analytics evidence |
| Treat province/city/suburb pages as public experiences | Accepted | Pages compose location, search, SEO, sponsored placement, and content rather than owning all lifecycles | Public route and component evidence |
| Treat directories as public read experiences by default | Accepted | Agent/agency/developer/service directories compose profiles, listings, trust, search, and placements | Profile/directory composition map |
| Keep Developer Brand Profile distinct from developer account and legal organization | Accepted | Public brand/contact/showcase behavior differs from login/account and legal ownership | Current audit and developer showcase composition |
| Keep lead capture shared but pipelines domain-specific | Accepted | Developer, property, service, demand, and distribution lifecycles differ | Lead attribution and launch maps |
| Build entitlement read adapters before billing schema unification | Accepted | Subscription state is stakeholder-specific and fragmented | Billing/entitlement evidence |
| Keep generic Reviews/Reputation deferred | Accepted | Service reviews exist; generic reviews route is thin | Current audit and public experience map |
| Keep `economicActors` as candidate abstraction only | Accepted | Mature stakeholder-specific profiles already exist | Profile/trust audit |
| Reconfirm first implementation slice as Development publication to public lead contract hardening | Accepted | Highest leverage launch risk reduction with strong evidence | `launch-dependency-map.md` |

## Alternatives Considered

| Alternative | Rejected or deferred because |
| --- | --- |
| One universal Property Engine | Erases real differences between single-property listings and developments/unit inventory |
| One universal Lead/CRM Engine | Capturing a lead is shared; downstream developer, listing, service, demand, and distribution pipelines are different |
| One universal Profile or Actor model now | Existing stakeholder systems are mature and domain-specific; `economicActors` is not proven as a replacement |
| One universal Campaign Engine now | Internal placements, external social campaigns, demand campaigns, and distribution/referral have different lifecycles |
| Independent Location Billboard Engine now | Likely duplicates sponsored placement lifecycle components |
| Move development units into `properties` as ordinary listings | Blurs derived development inventory with single-property publication |
| Start with Sponsored Placement implementation | Paid placement depends on stable public source metadata, attribution, billing, inventory, and disclosure |
| Start with Location Intelligence implementation | Important, but less urgent than protecting the development publish-to-lead contract |
| Start with Distribution router extraction | Valuable, but should follow documented sub-boundaries and contract coverage |
| Generalize reviews now | Generic target, moderation, verification, and display policy are not established |

## Final Classification Highlights

| Capability | Final classification | Maturity | Delivery priority |
| --- | --- | --- | --- |
| Development Listing | Domain engine | Established | Launch-critical |
| Single-Property Listing | Domain engine | Established | Launch-critical |
| Public Search | Public experience and query/read-model capability | Established with source-of-truth risk | Launch-critical |
| Explore | Candidate content/discovery domain engine and public experience | Emerging-to-established, duplicated legacy/newer stacks | Launch-supporting, phased |
| Distribution/Referral | Commercial domain engine | Established but boundary-risky | Launch-supporting or post-launch depending launch offer |
| Service Provider Marketplace | Domain engine | Emerging-to-established | Launch-supporting |
| Location Intelligence | Candidate domain engine | Partial or fragmented | Launch-supporting foundation, richer engine later |
| Suburb Guide | Public experience | Partial/planned | Launch-supporting |
| Agent Directory | Public directory/read model | Partial to established depending surface | Launch-supporting |
| Developer Showcase | Public showcase/read model | Emerging | Launch-supporting |
| Sponsored Placement | Commercial domain engine candidate | Planned with partial fragments | Post-launch refinement or limited MVP |
| Location Billboard | Commercial product | Partial or fragmented | Post-launch refinement or limited MVP |
| External marketing/social campaigns | Commercial workflow or future engine | Planned | Later strategic |
| Valuation | Workflow or future domain candidate | Partial or fragmented | Later strategic |
| Seller acquisition | Workflow or future domain candidate | Partial or fragmented | Later strategic |
| Auction participation | Workflow or future domain candidate | Concept/partial | Later strategic |
| Reviews/Reputation | Shared capability candidate | Thin | Post-launch refinement |
| Billing/Entitlements | Shared platform capability | Fragmented | Launch-supporting |
| Attribution | Shared platform capability | Partial or fragmented | Launch-critical for leads, post-launch for paid ads |

## Omitted Or Under-Evidenced Capabilities Now Captured

| Capability | Where now captured | Current posture |
| --- | --- | --- |
| Explore Engine | Strategic registry and public experience map | Candidate first-class engine |
| Distribution/Referral commercial engine | Strategic registry, revenue architecture, launch map | Established but boundary-risky |
| Location Billboard | Revenue architecture and launch map | Commercial product under Sponsored Placement hypothesis |
| Sponsored Placement/Campaign boundary | Revenue architecture and decisions log | Option B preferred, Option C deferred |
| Location Intelligence | Strategic registry and public experience map | Candidate engine, launch-supporting foundation |
| Province/city/suburb pages and guides | Public experience composition map | Public experiences |
| Agent/Agency/Developer/Service directories | Public experience composition map | Directories/read models, not engines by default |
| Developer Showcase | Public experience composition map | Public showcase/read model |
| Guide sponsorship | Revenue architecture and public experience map | Planned sponsored placement product |
| Featured placements | Revenue architecture | Planned sponsored placement products |
| Explore promoted content | Revenue architecture and Explore composition | Paid placement candidate after Explore contract |
| External social distribution campaigns | Revenue architecture | Later strategic, separate from internal placements |
| Valuation and seller acquisition | Strategic registry and launch map | Later strategic workflows or future engines |
| Auction participation | Strategic registry and launch map | Later strategic; only fields are evident today |
| Recruitment/candidate-agent workflows | Strategic registry and launch map | Deferred pending validation |

## Evidence Gaps

| Gap | Why it matters | Validation needed |
| --- | --- | --- |
| Explore canonical owner | Feed, discovery, legacy Explore, service videos, and analytics can drift | Ownership matrix for content, feed, engagement, moderation, publisher identity, conversion |
| Explore promoted content lifecycle | Paid content needs disclosure, targeting, budget, analytics, and moderation | Sponsored placement contract over Explore content |
| Location Intelligence lifecycle | Location pages exist, but domain ownership of insights, POI, editorial, refresh, and analytics is not complete | Decide location data source, refresh cadence, publication and SEO ownership |
| Sponsored placement source model | Marketplace, boost, monetization, marketing, hero campaign, and advertise surfaces are fragmented | Define advertiser, placement, creative, inventory, schedule, approval, delivery, billing, reporting |
| External campaign delivery | Campaign UI/router fragments do not prove external channel execution | Product decision and delivery integrations for social/email/partner channels |
| Developer legal organization versus public brand | Lead routing, billing, claimability, permissions, and public trust depend on this | Developer organization/public brand decision and tests |
| Developer team membership | Agency membership exists, but developer teams are less mature | Decide reuse/adapter/new developer membership model |
| Cross-domain lead attribution | Leads can come from many surfaces and owners | Source/owner/contact/consent/event contract |
| Reviews/reputation target model | Service reviews exist, generic reviews are thin | Target, moderation, verification, display policy |
| Billing entitlement truth | Subscriptions are fragmented | Read adapters per stakeholder and product |
| Paid placement disclosure and ranking policy | Sponsored products must not erode trust | Product policy plus UI/reporting contract |
| Seller, landlord, valuation, and auction lifecycle | These are product-important but not engine-proven | Define lifecycle before modelling as engines |

## Open Product And Architecture Questions

| Question | Decision needed before |
| --- | --- |
| What is the authoritative relationship between developer account, legal developer organization, developer brand profile, and marketing agency operator? | Developer team permissions, billing, public showcase, distribution access, paid developer products |
| Should developer teams reuse agency-style membership, use a developer-specific model, or adapt a future organization capability? | Collaborative developer workspace expansion |
| Are development unit types always derived public cards, or can they become first-class public property records? | Public catalog storage changes |
| Which public source metadata fields are mandatory on every search card and public detail page? | Lead attribution, analytics, sponsored reporting |
| Which lead capture fields are mandatory across developer, property, service, demand, and campaign surfaces? | Shared attribution contract |
| Does Explore have its own publisher identity, or does it reuse agents, developers, providers, partners, and admins through adapters? | Explore engine hardening and promoted content |
| Are service providers intentionally rooted in Explore partner identity, or should provider identity be service-native? | Service marketplace billing, reviews, promoted provider products |
| Is Location Intelligence a real domain with editorial/data refresh ownership, or a shared read capability feeding public pages? | Suburb guide and location insight implementation |
| Which paid placement product should prove Sponsored Placement first: Location Billboard, featured development, featured agent/agency, featured provider, guide sponsorship, or Explore boost? | Sponsored Placement MVP |
| What are the sponsored disclosure and ranking rules? | Any paid placement launch |
| Should external social campaign products be managed services, self-serve campaigns, or partner integrations? | External campaign engine/workflow |
| What is the pricing basis for service provider marketplace revenue: subscription, lead fee, commission, promoted placement, or mixed? | Service provider commercial product |
| Which distribution/referral states create commission liability and settlement reporting? | Distribution revenue reports |
| Which public experiences are launch must-haves versus SEO/growth follow-ups? | Launch scope lock |
| What makes valuation a product: estimate tool, lead capture, professional report, provider marketplace request, or seller acquisition funnel? | Valuation engine design |
| What makes auction participation a product: auction listing fields, buyer registration, bidding, compliance, finance, settlement, or all of them? | Auction engine design |

## Validation Gates Before Runtime Work

| Runtime area | Gate |
| --- | --- |
| Development Listing first slice | Contract tests prove publish payload -> persistence -> derived search -> public detail -> lead capture attribution |
| Lead attribution | Shared fields are documented and adapters preserve domain-specific pipelines |
| Location Intelligence | Canonical location identity and page composition are decided before POI/editorial/sponsor work |
| Explore | One owner per content/feed/engagement/moderation/publisher concept before promoted content or recommendation expansion |
| Sponsored Placement | Advertiser, placement, creative, inventory, target, schedule, approval, disclosure, delivery, attribution, billing, and reporting contract exists |
| Billing/Entitlements | Read adapters return consistent feature access per stakeholder before schema consolidation |
| Reviews/Reputation | Target model, moderation, verification, display policy, and domain ownership are specified |
| Universal abstractions | At least one domain proves adapter pattern before replacing mature domain-specific tables |

## Strategic Non-Goals

- No runtime implementation in this architecture pass.
- No schema, migration, route, folder, service, or microservice changes.
- No commit or push.
- No broad refactor to make terminology look tidy.
- No universal profile, lead, campaign, review, organization, or property engine until evidence proves it.
- No implementation of paid placement before attribution, disclosure, billing, and public inventory contracts are clear.
- No claim that conceptual capabilities are implemented.
