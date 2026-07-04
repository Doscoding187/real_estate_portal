# Strategic Capability Registry

Status: strategic architecture layer
Repository evidence baseline: current-state audit in this directory
Scope: complete platform capability census across established, emerging, partial, planned, and conceptual capabilities

## Layer Boundary

The existing audit remains the Current-State Evidence Architecture. This file adds the Strategic Capability Architecture: where each Property Listify capability belongs when the platform is viewed as a complete marketplace.

This file does not claim that planned capability is implemented. Each row separates:

- Architectural classification: what kind of thing the capability is.
- Maturity: how much evidence or product definition exists today.
- Delivery priority: whether it should ship for launch, support launch, follow launch, or wait.

## Classification Model

| Dimension | Allowed values |
| --- | --- |
| Architectural classification | stakeholder system, stakeholder workspace, domain engine, shared platform capability, public experience, commercial product, workflow or feature, mixed or unclear ownership |
| Maturity | established, emerging, partial or fragmented, planned, concept only, unclear |
| Delivery priority | launch-critical, launch-supporting, post-launch refinement, later strategic, deferred pending validation |

## Stakeholder System Registry

| Stakeholder | Private workspace | Public presence | Domain activities | Opportunities, leads, or requests | Trust and verification | Commercial relationship | Launch-critical needs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Property Developers | Developer workspace and development wizard | Developer showcase, development detail pages, active developments | Development listing, development inventory, publication, funnel, analytics, distribution participation | Development enquiries, qualification, brand leads, distribution referrals | Developer profile review, public brand profile, completed portfolio evidence | Developer plans, featured placement, distribution access, campaign products | Publish accurate developments, expose units publicly, receive attributed leads |
| Agencies | Agency onboarding, dashboard, team and listing management | Agency profile or directory placement | Agency organization, membership, agent oversight, listing operations | Property enquiries, agent leads, seller acquisition, distribution/referral where enabled | Agency branding, membership, verification, subscription state | Agency subscriptions, featured agency placement, campaign products | Agency identity, team access, listing and lead management |
| Agents | Agent dashboard, listings, leads, referrals, analytics | Agent profile, agent directory, property detail contact card | Agent profile, listings, showings, leads, distribution/referral participation | Buyer/seller enquiries, scheduled viewings, referrals, candidate-agent workflows | Profile completion, coverage areas, agency membership, verification | Agent packages, featured agent placement, referral commissions | Public profile/contact accuracy, lead routing, listing attribution |
| Buyers | Consumer account, saved searches, favorites | Search behavior and enquiries, not a public profile by default | Search, property/development inspection, saved items, qualification | Property/development leads, service requests, distribution referrals where eligible | Account identity, consent, affordability/qualification context | Usually indirect monetization through leads, referrals, services | Reliable search, detail pages, enquiry capture, saved search/favorites |
| Tenants | Consumer account and search preferences | Search behavior and enquiries, not a public profile by default | Rental search, rental listing enquiries, service requests | Rental enquiries, saved searches, service requests | Account identity and contact consent | Indirect monetization through leads and services | Reliable rental inventory and enquiry capture |
| Sellers | Listing wizard or seller acquisition journey | Property listing detail if self-listed | Single-property listing, seller valuation or acquisition workflow | Listing leads, valuation requests, agent matching | Ownership/contact verification is not fully established | Listing products, agent referral, campaign products | Safe listing creation, enquiry routing, optional agent/service conversion |
| Landlords | Listing wizard or rental owner workflow | Rental listing detail if self-listed | Rental listing, tenant enquiry handling, service needs | Rental enquiries, tenant leads, service requests | Ownership/contact verification is not fully established | Listing products, property management referrals, services | Rental listing creation and enquiry routing |
| Service Providers | Provider profile/dashboard and lead management | Service directory and provider profile | Service provider marketplace, service coverage, service leads, reviews, service Explore videos | Service requests, recommendations, reviews | Provider moderation tier, service-specific reviews, directory visibility | Provider subscriptions, featured provider placement, service marketplace revenue | Provider directory, service lead routing, public trust signals |
| Distribution and Referral Partners | Partner/referrer workspace and deal/referral screens | Distribution network public/apply pages | Distribution programs, access, referrals, deals, viewings, commissions | Referrals, deals, documents, qualification packs, commissions | Partner identity, program terms, readiness, access eligibility | Referral commissions and distribution commercial terms | Submit and track qualified opportunities with commission reporting |
| Advertisers and Sponsors | Campaign or placement management workspace | Sponsored labels, billboards, guide sponsorship, directory placement | Sponsored placement, campaign setup, creative approval, attribution | Clicks, enquiries, conversions, sponsored leads | Advertiser eligibility, creative approval, sponsored disclosure | Paid placements, campaign spend, sponsorships | Clear product boundary, billing event, attribution |
| Internal Administrators | Admin workspace, moderation, distribution manager/admin surfaces | Operational actions reflected in public data | Approval, verification, moderation, billing operations, distribution configuration | Routing, escalations, validation queues | Cross-domain verification and audit | Internal operations over all commercial products | Controlled approvals and source-of-truth visibility |

## Strategic Capability Registry

| Capability | Architecture | Maturity | Delivery priority | Evidence position | Strategic home |
| --- | --- | --- | --- | --- | --- |
| Development Listing Engine | Domain engine | Established | Launch-critical | Wizard, service, schema, public detail, derived search, tests | Owns development authoring, unit inventory, publication, and public development read contract |
| Single-Property Listing Engine | Domain engine | Established | Launch-critical | Listing schema/router, approval, media, public projection | Owns ordinary listing authoring, review, publication, and property projection writes |
| Development inventory and unit availability | Domain subdomain | Established | Launch-critical | `unitTypes`, development payload ownership, derived listings | Belongs inside Development Listing Engine |
| Listing publication | Workflow inside listing engines | Established | Launch-critical | Listing approval and development publish flows | Keep publication rules inside owning listing engine |
| Public listing projections | Shared read-model capability | Established but source-sensitive | Launch-critical | `properties`, derived development cards, public search | Public catalog/search projection, not source-of-truth for all writes |
| Public Search and Discovery | Public experience plus query/read-model capability | Established for search, emerging for discovery | Launch-critical for search, launch-supporting for richer discovery | Search routes/services, `server/domains/discovery`, Explore stack | Public marketplace composition over domain-owned sources |
| Explore Engine | Candidate domain engine and public experience | Emerging-to-established, with duplicated legacy/newer stacks | Launch-supporting, phased | `exploreContent`, engagements, topics, partners, feed routes, discovery router, analytics | Owns content/feed engagement only if lifecycle, moderation, publisher identity, and conversion contract are completed |
| Location Intelligence | Candidate domain engine plus public experience source | Partial or fragmented | Launch-supporting | Location hierarchy, price analytics, location analytics, location pages | Owns canonical location identity, insights, refresh/publication if lifecycle is formalized |
| Province, city, suburb pages | Public experiences | Partial or fragmented | Launch-supporting | Public routes and location components | Compose Location Intelligence, search projections, SEO, sponsored placement, and content |
| Recommendations and personalization | Shared engagement capability | Partial or fragmented | Post-launch refinement | Discovery ranking, saved search, services recommendations, personalization hooks | Shared recommendation adapters over domain-specific candidates |
| Collections and saved inspiration | Consumer engagement workflow | Partial or fragmented | Post-launch refinement | Favorites, saved searches, Explore saves/shares/skips | Consumer engagement capability, not a full engine yet |
| SEO and internal linking | Shared platform capability | Emerging | Launch-supporting | Sitemap, route structure, public pages | Shared public growth capability consumed by search, locations, profiles, services |
| Distribution and Referral Engine | Commercial domain engine | Established but boundary-risky | Launch-supporting if product needs it at launch, otherwise post-launch refinement | Deep distribution/referral schema, router, pages, commission records | Owns partner/referrer opportunities, qualification, deals, fulfilment, commissions, reporting |
| Demand Lead Engine | Domain engine or workflow | Emerging | Post-launch refinement | Demand campaigns/leads/matching/assignments | Keep separate from sponsored ads until product intent confirms |
| Sponsored Placement Engine | Commercial domain engine candidate | Planned with partial fragments | Post-launch refinement or limited MVP | Marketplace boost/hero campaign tables, monetization router, advertising pages, campaign UI fragments | Best strategic home for internal paid visibility products |
| Location Billboard | Commercial product | Partial or fragmented | Post-launch refinement or limited MVP | Hero billboard/location campaign components and `heroCampaigns` | Product inside Sponsored Placement Engine unless lifecycle proves independent engine |
| Guide sponsorship | Commercial product | Planned | Post-launch refinement | Product concept, location guide surfaces | Sponsored Placement product tied to public location experiences |
| Featured development placement | Commercial product | Partial or fragmented | Post-launch refinement | Brand/profile/showcase and campaign/boost fragments | Sponsored Placement product over Development Listing read model |
| Featured agent and agency placement | Commercial product | Planned or partial | Post-launch refinement | Agent/agency directories and monetization target labels | Sponsored Placement product over Agent/Agency public profiles |
| Featured service-provider placement | Commercial product | Planned or partial | Post-launch refinement | Service directory, provider subscriptions, marketplace/ads fragments | Sponsored Placement product over Service Provider Marketplace |
| Explore promoted content | Commercial product | Partial or fragmented | Post-launch refinement | Boost campaigns and Explore engagement/analytics | Sponsored Placement product that uses Explore content/feed inventory |
| Internal campaign creation | Workflow or feature | Partial or fragmented | Deferred pending validation | Marketing router uses placeholder schema objects; campaign UI fragments exist | Should not become universal engine until budget, creative, delivery, attribution, and billing are real |
| External marketing and social distribution | Commercial product or workflow | Planned | Later strategic | Advertise pages and campaign concepts, little executable delivery evidence | Separate from internal sponsored placement unless shared lifecycle is proven |
| Attribution and campaign analytics | Shared commercial analytics capability | Partial or fragmented | Launch-supporting for lead attribution, post-launch for paid ads | Lead sources, analytics tables, Explore analytics, campaign fragments | Shared event/source metadata and revenue reporting adapters |
| Service Provider Marketplace Engine | Domain engine | Emerging-to-established | Launch-supporting | Services schema/router/pages/leads/reviews/tests | Owns provider profiles, coverage, services, service leads, provider reviews |
| Developer stakeholder system | Stakeholder system plus workspace | Established but profile/org boundary needs hardening | Launch-critical | Developer workspace, `developers`, brand profiles, wizard, leads | Developer account/workspace plus Development Listing integration |
| Agency stakeholder system | Stakeholder system | Established | Launch-supporting | Agency schema/router/dashboard/membership | Owns agency organization, membership, branding, agency subscription |
| Agent stakeholder system | Stakeholder system | Established | Launch-supporting | Agent schema/router/dashboard/profile | Owns agent profile, coverage, agent lead/showing operations |
| Seller and Landlord system | Stakeholder system | Partial or fragmented | Launch-supporting for listing creation, later strategic for richer owner tools | Listing wizard, seller-oriented advertise/services/valuation surfaces | Extend Single-Property Listing and seller acquisition workflows without premature engine split |
| Consumer system | Stakeholder system | Partial or fragmented | Launch-supporting | Favorites, saved searches, consumer state, enquiries | Owns saved engagement, preferences, consent, and consumer history |
| Valuation | Workflow or future domain candidate | Partial or fragmented | Later strategic | Price insights, valuation service links, seller valuation service category | Do not call an engine until request, report, provider, and fulfilment lifecycle exists |
| Seller acquisition | Workflow or future domain candidate | Partial or fragmented | Later strategic | Advertise seller pages, demand/leads/listing flow fragments | Product workflow across listing, agent matching, valuation, and marketing |
| Auction participation | Workflow or future domain candidate | Concept only to partial | Later strategic | Auction fields on listing/development/unit data | Keep as listing/development feature fields until bidder registration, bidding, timers, settlement exist |
| Recruitment and candidate-agent workflows | Workflow or future domain candidate | Concept only to partial | Deferred pending validation | Agent onboarding, agency invitations, candidate language only incidental | Do not model as domain engine until lifecycle is defined |
| Identity and access | Shared platform capability | Established | Launch-critical | `users`, auth, role guards, tRPC procedures | Login/account root with typed stakeholder adapters |
| Organizations and membership | Shared platform capability, domain-local implementations | Partial or fragmented | Launch-supporting | Agencies strong; developers/services lighter; economic actors candidate | Do not universalize until developer/team contract is proven |
| Profiles and trust | Shared platform capability plus specialized profiles | Partial or fragmented | Launch-supporting | Developer brand, agents, agencies, service provider profiles, reviews | Keep public profile read models explicit; do not merge all profiles |
| Verification | Shared platform capability | Partial or fragmented | Launch-supporting | Developer review, partner verification, provider moderation, agent completion | Shared verification vocabulary with domain-specific evidence |
| Media | Shared platform capability | Partial shared, domain-owned lifecycle | Launch-critical | Listing media, development media JSON, Explore/service videos | Shared upload/storage; domain-owned attachment rules |
| Messaging and notifications | Shared platform capability | Partial | Launch-supporting | Notification/email surfaces | Event/recipient contracts before broad centralization |
| Reviews and reputation infrastructure | Shared platform capability candidate | Thin | Post-launch refinement | Service reviews real; generic review route stub | Keep service-specific until target model exists |
| Contact identity | Shared platform capability | Fragmented | Launch-critical for leads | User/agent/agency/brand/provider contact data copied into leads | Define references and snapshots in lead/attribution contracts |
| Analytics transport | Shared platform capability | Fragmented but useful | Launch-supporting | Analytics events, location events, Explore analytics, dashboard metrics | Standard event envelope before report unification |
| Attribution | Shared platform capability | Partial or fragmented | Launch-critical for lead source, post-launch for paid ads | Lead source fields, UTM/campaign fragments, Explore/campaign analytics | Start with source metadata on public objects and leads |
| Billing, payments and entitlements | Shared platform capability | Fragmented | Launch-supporting | Billing router/schema plus developer/agency/service/partner subscriptions | Build entitlement read adapters before schema unification |

## Full Domain Engine Registry

| Engine | Current classification | Target strategic classification | Launch posture | Boundary rule |
| --- | --- | --- | --- | --- |
| Development Listing Engine | Established | Established domain engine | Launch-critical | Owns development and unit publication; public search consumes projections |
| Single-Property Listing Engine | Established | Established domain engine | Launch-critical | Owns ordinary listing authoring/review and property projection writes |
| Distribution and Referral Engine | Established but boundary-risky | Established commercial domain engine | Launch-supporting or post-launch depending launch plan | Separate from property enquiries, sponsored ads, and ordinary CRM |
| Service Provider Marketplace Engine | Emerging-to-established | Domain engine | Launch-supporting | Owns service profiles, service coverage, service requests, provider reviews |
| Explore Engine | Emerging-to-established | Candidate first-class content/discovery domain engine | Launch-supporting, phased | Owns content/feed lifecycle only after publisher, moderation, engagement, conversion boundaries are explicit |
| Location Intelligence Engine | Partial | Candidate domain engine | Launch-supporting foundation, richer engine later | Owns canonical location identity and insights if refresh/publication lifecycle is formalized |
| Sponsored Placement Engine | Planned with partial fragments | Commercial domain engine candidate | Post-launch refinement or limited MVP | Owns internal paid visibility products; external social campaigns stay separate unless lifecycle proves shared |
| Demand Lead Engine | Emerging | Domain engine or campaign-attribution subdomain | Post-launch refinement | Owns demand campaigns/leads/matching, not all marketing |
| Valuation Engine | Partial/product label | Future domain candidate | Later strategic | Requires valuation request/report/provider/fulfilment lifecycle |
| Auction Engine | Concept/partial fields | Future domain candidate | Later strategic | Requires bidder registration, bidding, timers, settlement, compliance |
| Reviews/Reputation Engine | Thin | Future shared capability or domain engine | Post-launch refinement | Requires target model, moderation, verification, display policy |

## Shared Platform Capability Registry

| Shared capability | Maturity | Delivery priority | Consumers | Strategic rule |
| --- | --- | --- | --- | --- |
| Identity and access | Established | Launch-critical | All stakeholder systems | Keep account identity separate from stakeholder profile identity |
| Organizations and membership | Partial or fragmented | Launch-supporting | Agencies, developers, service providers, distribution partners | Use adapters before universal organization schema |
| Permissions | Partial or fragmented | Launch-supporting | Admin, developer, agency, agent, distribution, services | Add domain permission helpers before broad RBAC refactor |
| Contact identity | Fragmented | Launch-critical | Leads, public profiles, directories, campaigns | Store source references plus snapshots where leads require historical accuracy |
| Media | Partial shared | Launch-critical | Listings, developments, Explore, services, profiles | Shared storage, domain-local lifecycle |
| Notifications and messaging | Partial | Launch-supporting | Leads, saved searches, service requests, distribution, campaigns | Define event names, recipients, preferences, and retries |
| Analytics transport | Fragmented | Launch-supporting | Search, Explore, locations, leads, campaigns, billing | Standardize event envelope before dashboard consolidation |
| Attribution | Partial | Launch-critical for lead capture | Leads, campaigns, distribution, Explore | Protect source surface/entity/owner/campaign fields |
| Billing and entitlements | Fragmented | Launch-supporting | Developers, agencies, agents, service providers, partners, advertisers | Read adapters before table consolidation |
| Reviews and reputation | Thin | Post-launch refinement | Services, agents, agencies, developers, listings | Do not reuse the generic reviews label until target model exists |
| Search indexing and projections | Established but source-sensitive | Launch-critical | Search, location pages, public profiles, campaigns | Projections must preserve source metadata |

## Stakeholder-To-Capability Matrix

| Stakeholder | Launch-critical capabilities | Launch-supporting capabilities | Later strategic capabilities |
| --- | --- | --- | --- |
| Property Developers | Development Listing, publication, public detail, lead attribution, brand identity | Developer showcase, analytics, distribution participation, entitlements | Featured placements, external campaigns, team/membership expansion |
| Agencies | Agency identity, membership, listings, leads | Agency directory/profile, subscriptions, featured placement | Recruitment, advanced campaign tooling, reputation engine |
| Agents | Agent profile/contact, leads, listings | Agent directory, saved areas, referrals/distribution, analytics | Candidate-agent workflows, advanced reviews, paid profile boosts |
| Buyers and Tenants | Search, public detail, enquiry capture, saved search/favorites | Location guides, recommendations, Explore discovery, service requests | Personalization, collections/inspiration, advanced affordability journeys |
| Sellers and Landlords | Listing creation/publication, enquiry routing | Valuation request, seller acquisition journey, service referrals | Auction participation, marketing campaign automation |
| Service Providers | Provider profile, service directory, service leads | Provider subscriptions, service reviews, recommendations | Featured provider placements, Explore promoted content, richer provider analytics |
| Distribution/Referral Partners | Partner identity, program access, referral/deal submission, commissions | Qualification packs, manager workflows, reporting | Broader settlement automation and partner growth tooling |
| Advertisers/Sponsors | None unless paid placements launch | Sponsored placement MVP, attribution, billing | External social campaigns, campaign optimization, cross-channel reporting |
| Internal Admins | Verification, moderation, source-of-truth visibility, publication/admin safety | Distribution ops, billing support, campaign approval | Advanced audit, automated risk scoring, policy engines |

## Current, Emerging, Planned Capability Map

| Bucket | Capabilities |
| --- | --- |
| Established current capabilities | Development Listing, Single-Property Listing, public search read model, agency/agent operations, distribution/referral, identity/access |
| Emerging current capabilities | Service Provider Marketplace, Explore/Discovery, Demand Lead Engine, Developer Brand Profile, billing/entitlements, location pages/insights |
| Partial or fragmented capabilities | Sponsored placement, campaigns, Location Billboard, attribution analytics, recommendations, saved inspiration, profiles/trust, organizations/membership, reviews |
| Planned or concept capabilities | Guide sponsorship, external marketing/social campaigns, valuation engine, auction participation engine, recruitment/candidate-agent workflow, universal review/reputation engine |
| Deferred pending validation | Universal campaign engine, universal profile/actor model, universal lead/CRM engine, cross-domain review engine, independent Location Billboard Engine |
