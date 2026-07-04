# Commercial Revenue Architecture

Status: strategic commercial architecture layer
Scope: revenue surfaces, sponsored placement boundaries, attribution, billing dependencies, and commercial maturity

## Executive Position

Property Listify should treat revenue architecture as a set of commercial products sitting on top of domain engines and public experiences. The strongest current commercial engine is Distribution and Referral. Subscriptions and entitlements exist, but are fragmented by stakeholder. Sponsored placement and campaign capability is strategically important, but current evidence is split across marketplace tables, monetization labels, advertising pages, marketing router fragments, boost campaign code, location billboard components, and demand campaigns.

The recommended strategic boundary is Option B: Sponsored Placement Engine with Location Billboard as one commercial product. This avoids duplicating advertiser, creative, targeting, scheduling, approval, delivery, attribution, billing, and reporting logic across billboards, guides, directories, Explore, and featured placements.

That recommendation remains a product hypothesis to prove. It should not be implemented as a universal Campaign Engine until the lifecycle evidence supports it.

## Sponsored Placement Boundary Options

| Option | Boundary | Strengths | Risks | Recommendation |
| --- | --- | --- | --- | --- |
| Option A: Independent Location Billboard Engine | A dedicated engine for province, city, and suburb billboards | Simple if billboard is the only paid visibility product with a unique sales/ops lifecycle | Duplicates creative, targeting, scheduling, approval, delivery, pricing, attribution, billing, and reporting when directories, guides, Explore, and featured placements arrive | Do not choose unless billboard has a truly distinct lifecycle and team ownership |
| Option B: Sponsored Placement Engine with Billboard as one product | One internal paid visibility engine, multiple placement products | Fits internal Property Listify inventory: billboards, guide sponsors, featured listings, featured profiles, promoted Explore content | Needs careful placement inventory and eligibility modelling | Preferred strategic boundary |
| Option C: Broad Commercial Campaign Engine | One engine for internal placements and external distribution campaigns | Could provide one advertiser workspace and cross-channel reporting | Risks collapsing different lifecycles: internal inventory delivery versus Facebook, Instagram, TikTok, email, partner distribution, and referral campaigns | Defer until internal placement lifecycle is proven and external channels have real delivery evidence |

## Internal Versus External Campaign Distinction

| Group | Examples | Strategic owner | Why separate |
| --- | --- | --- | --- |
| Internal Property Listify placements | Province/city/suburb billboards, guide sponsorship, featured developments, featured agents/agencies, featured service providers, promoted Explore content, directory placements | Sponsored Placement Engine | Delivery happens inside Property Listify surfaces and can share placement inventory, eligibility, creative approval, billing, and attribution |
| External distribution campaigns | Facebook, Instagram, TikTok, email, partner distribution, other external channels | External Marketing/Distribution Campaign workflow or future engine | Delivery, spend controls, reporting APIs, compliance, and attribution are materially different from internal placements |
| Distribution/referral programs | Partner access, referrals, deal progression, commission settlement | Distribution and Referral Engine | Commercial lifecycle is opportunity/deal/commission based, not ad inventory based |
| Demand campaigns | Demand lead campaign, matching, assignment, unmatched leads | Demand Lead Engine | This is lead supply/demand allocation, not paid media placement by default |

## Commercial Revenue Capability Registry

| Revenue capability | Buyer | Beneficiary | Billable event | Commercial lifecycle | Required domain/capability | Analytics needed | Billing dependency | Maturity | Launch timing | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Developer subscription | Developer or developer brand owner | Developer | Plan period, seat, or development quota | Subscribe, entitle, use features, renew/cancel | Development Listing, Billing/Entitlements | Usage, limits, plan access, lead volume | Developer entitlement adapter | Partial or fragmented | Launch-supporting | Plan state can diverge from feature gates |
| Agency subscription | Agency admin | Agency and agents | Plan period, seats, features | Subscribe, manage team, renew/cancel | Agency stakeholder system, Billing/Entitlements | Seat count, listings, leads, team usage | Agency entitlement adapter | Partial or fragmented | Launch-supporting | Agency/agent access rules can drift |
| Agent package | Agent or agency | Agent | Plan period or profile/listing package | Select package, entitle features, renew/cancel | Agent stakeholder system, Billing/Entitlements | Profile visibility, lead volume, listing usage | Agent entitlement adapter | Partial or fragmented | Launch-supporting | Agent can also be agency member or distribution partner |
| Service provider subscription | Service provider | Provider | Plan period, leads, directory tier | Subscribe, list services, receive leads, renew/cancel | Service Provider Marketplace, Billing/Entitlements | Directory visibility, service leads, reviews | Service provider entitlement adapter | Emerging | Launch-supporting | Provider identity currently intersects Explore partner identity |
| Partner/distribution commercial terms | Distribution partner, developer, or platform | Partner/referrer and platform | Commission, program fee, deal completion | Apply, access programs, submit referral/deal, progress, settle commission | Distribution and Referral Engine | Deal stage, readiness, viewings, commission ledger | Distribution commission/settlement reporting | Established but boundary-risky | Launch-supporting or post-launch | Large router and program terms need explicit boundaries |
| Sponsored placement | Advertiser/sponsor | Advertiser and platform | Impression, click, lead, fixed sponsorship, period | Create placement, approve creative, schedule, deliver, report, expire | Sponsored Placement Engine, public surfaces | Impressions, clicks, enquiries, conversions, spend, pacing | Placement billing adapter | Planned with partial fragments | Post-launch refinement or limited MVP | Current campaign evidence is fragmented |
| Location Billboard | Advertiser/sponsor | Advertiser and public location page | Period, impression, click, lead, fixed sponsorship | Reserve location inventory, approve creative, target hierarchy, deliver, expire | Sponsored Placement plus Location Intelligence/public pages | Location impressions, clicks, enquiries, fallback delivery | Sponsored placement billing | Partial or fragmented | Post-launch refinement or limited MVP | Could be over-modelled as independent engine |
| Guide sponsorship | Advertiser/sponsor | Sponsor and public guide | Fixed sponsorship or period | Sponsor guide section, approve creative, display, report | Sponsored Placement, Location Intelligence, guide pages | Guide views, clicks, leads, share of voice | Sponsored placement billing | Planned | Post-launch refinement | Guide pages must have stable composition first |
| Featured development placement | Developer/brand owner | Developer | Period, impression, click, lead, package | Select development, verify eligibility, feature, report | Development Listing, Sponsored Placement, public search/location pages | Featured impressions, clicks, leads, conversion | Developer billing/placement billing | Partial or planned | Post-launch refinement | Must not mutate canonical search ranking without labels |
| Featured agent/agency placement | Agent or agency | Agent/agency | Period, click, lead, package | Verify profile, feature in directory/location, report | Agent/Agency systems, Sponsored Placement | Directory impressions, clicks, leads | Agent/agency billing/placement billing | Planned or partial | Post-launch refinement | Verification and ranking disclosure needed |
| Featured service provider placement | Service provider | Provider | Period, click, lead, package | Verify provider, feature in service/category/location results, report | Service Provider Marketplace, Sponsored Placement | Directory impressions, service leads, clicks | Service provider billing/placement billing | Planned or partial | Post-launch refinement | Provider reviews/trust must not be bypassed |
| Explore promoted content | Content partner, service provider, developer, advertiser | Sponsor and creator/publisher | Impression, click, conversion, budget spend | Select content, target topic/audience, approve, deliver in feed, report | Explore Engine, Sponsored Placement | Views, unique views, watch time, completion, saves, shares, skips, clicks, conversions | Sponsored placement billing | Partial or fragmented | Post-launch refinement | Explore ownership and moderation must be explicit first |
| External marketing campaign revenue | Developer, agency, agent, sponsor | Advertiser | Managed service fee, ad spend, lead fee | Campaign setup, external channel delivery, attribution, report | Future External Marketing workflow | Channel spend, clicks, leads, conversions, cost per lead | Separate ad-spend and service-fee billing | Planned | Later strategic | External channel delivery differs from internal placements |
| Premium verification/profile product | Agent, agency, developer, provider | Public profile owner | Review fee, period, profile tier | Verify identity, enhance profile, display trust signals, renew | Profiles/Trust, Verification, Billing | Profile views, conversion, verification status | Stakeholder entitlement adapters | Planned or partial | Post-launch refinement | Trust cannot become pay-to-play without policy |
| Service provider marketplace revenue | Consumer, provider, or platform depending model | Provider and platform | Subscription, lead fee, commission, promoted placement | Directory/listing, request, match, lead, review, invoice | Service Provider Marketplace | Requests, matches, leads, fulfilment, reviews | Provider billing plus possible lead-fee billing | Emerging | Launch-supporting or post-launch | Need pricing model decision |
| Developer/agency products | Developer or agency | Developer/agency | Plan, add-on, lead package, placement, distribution access | Purchase, entitle, consume, report | Developer, Agency, Billing, Sponsored Placement, Distribution | Leads, listings, development views, conversion | Stakeholder entitlement adapter | Partial | Launch-supporting foundations, paid products post-launch | Product bundle boundaries unclear |

## Revenue Surface Matrix

| Surface | Architecture type | Maturity | Delivery priority | Public/product surfaces | Source-of-truth dependencies |
| --- | --- | --- | --- | --- | --- |
| Subscriptions | Shared platform capability | Partial or fragmented | Launch-supporting | Developer, agency, agent, service provider plans | Billing tables, stakeholder subscription tables, entitlement adapters |
| Entitlements | Shared platform capability | Fragmented | Launch-supporting | Feature gates, package limits, dashboard access | Domain subscription stores, user roles, plan configs |
| Sponsored placements | Commercial domain engine candidate | Planned with partial fragments | Post-launch refinement | Search cards, directories, guides, Explore, location pages | Placement inventory, creative approval, attribution, billing |
| Guide sponsorship | Commercial product | Planned | Post-launch refinement | Suburb/city/province guides | Location pages, Sponsored Placement, sponsor profile |
| Promoted content | Commercial product | Partial or fragmented | Post-launch refinement | Explore feed, topic feeds, service/developer content | Explore content, Sponsored Placement, analytics |
| Billboard inventory | Commercial product | Partial or fragmented | Post-launch refinement or limited MVP | Province/city/suburb hero sections | Location hierarchy, Sponsored Placement, creative and schedule |
| Referral/distribution commission | Commercial domain engine revenue | Established but boundary-risky | Launch-supporting or post-launch | Distribution partner/deal workflows | Distribution programs, deals, commission ledgers, reporting |
| Marketing campaign revenue | Workflow or future engine | Planned/fragmented | Later strategic | Advertise pages, campaign wizard, external channels | External delivery integrations, campaign schema, billing |
| Premium verification/profile products | Commercial product | Planned or partial | Post-launch refinement | Agent, agency, developer, service provider profiles | Verification policy, profile/public directory, entitlements |
| Service-provider marketplace revenue | Domain revenue model | Emerging | Launch-supporting or post-launch | Service directory, provider pages, service leads | Service provider profiles, leads, reviews, subscriptions |
| Developer/agency product bundles | Commercial products | Partial | Launch-supporting foundations | Developer workspace, agency workspace, public showcase | Development Listing, Agency/Agent systems, billing/entitlements |

## Sponsored Placement Concept Model

| Concept | Required meaning | Notes |
| --- | --- | --- |
| Advertiser or sponsor | The paying party or brand receiving visibility | May be developer, agency, agent, service provider, distribution partner, or external sponsor |
| Campaign | A commercial container only if there are multiple placements, budgets, dates, and reporting | Do not use as a synonym for every paid product |
| Creative | Image/video/text/CTA/landing payload reviewed before delivery | Must preserve sponsored disclosure |
| Placement product | Productized inventory such as location billboard, guide sponsor, featured profile, promoted Explore content | Should have explicit eligibility and pricing |
| Placement inventory | The available slots by surface, geography, topic, stakeholder type, and time | Must prevent conflicting bookings and unlabeled sponsored results |
| Geographic targeting | Province/city/suburb hierarchy and fallback rules | Depends on Location Intelligence |
| Stakeholder eligibility | Which advertiser types can buy which product | Prevents an ineligible actor from promoting unsupported surfaces |
| Scheduling | Start, end, pacing, pause, expiry | Needed before billing/reporting is trustworthy |
| Approval | Creative and sponsor review | Required for public trust and policy compliance |
| Delivery | Impression/click/render rules inside Property Listify | Separate from external channel delivery |
| Attribution | Source surface/entity/campaign/placement captured on clicks and leads | Launch-critical for any lead-generating placement |
| Pricing | Fixed fee, period, CPM, CPC, CPL, package, entitlement | Must be explicit per product |
| Billing | Invoice, charge, subscription add-on, spend drawdown | Should read from placement lifecycle, not UI labels |
| Reporting | Impressions, clicks, enquiries, conversions, spend, status | Requires stable event envelope and source identifiers |

## Distribution And Referral Revenue Boundary

Distribution and Referral should remain separate from sponsored advertising.

| Concept | Distribution/Referral meaning | Why not sponsored placement |
| --- | --- | --- |
| Partner | Entity allowed to submit or progress opportunities under program rules | Relationship and eligibility matter more than ad inventory |
| Opportunity/referral | Qualified person or deal candidate | It is a transactional opportunity, not an impression |
| Readiness/qualification | Affordability and eligibility for development access | Domain-specific due diligence |
| Allocation/acceptance | Assignment to partner/manager/development process | Operational pipeline, not media delivery |
| Deal progression | Stage, documents, viewings, bank outcomes | Sales fulfilment lifecycle |
| Commission/settlement | Revenue event after accepted/qualified/successful outcome | Commission ledger, not ad spend |
| Reporting | Pipeline, conversion, commission, program performance | Deal reporting rather than campaign delivery metrics |

## Commercial Analytics Requirements

| Analytics layer | Launch need | Later need |
| --- | --- | --- |
| Lead attribution | Source surface, source entity, owner, brand/profile, campaign or placement id when applicable | Multi-touch attribution and revenue attribution |
| Public inventory analytics | Search/detail views, location page views, development/property impressions | Ranking insights and paid placement baselines |
| Explore analytics | Views, unique views, watch time, completion, saves, shares, skips, clicks | Creator dashboards, boosted content optimization |
| Sponsored placement analytics | Impressions, clicks, leads, conversions, spend, pacing, expiry | Optimization, pricing, campaign-level reporting |
| Distribution analytics | Referral submissions, readiness, stages, viewings, documents, commission | Partner performance, settlement and forecasting |
| Subscription analytics | Plan state, limits, usage, upgrades, churn | Revenue forecasting and packaging |

## Commercial Non-Goals

- Do not create a universal Campaign Engine only because internal placements and external marketing both use campaign language.
- Do not make Location Billboard an independent engine unless product lifecycle evidence proves it owns unique rules.
- Do not merge referral commissions, sponsored ad spend, and subscription billing into one lifecycle.
- Do not allow paid placement to mutate organic source-of-truth records.
- Do not expose sponsored results without explicit disclosure, eligibility, and attribution.
- Do not generalize billing tables before entitlement read adapters exist.

## Recommended Commercial Sequence

| Sequence | Commercial work | Why |
| --- | --- | --- |
| 1 | Lead/source attribution contract across public search, detail, and lead capture | Required before commercial reports or paid placements can be trusted |
| 2 | Entitlement read adapters for developer, agency/agent, service provider, and partner contexts | Enables plans without schema unification |
| 3 | Sponsored Placement MVP decision record and data contract | Defines advertiser, placement, creative, target, schedule, disclosure, billing event, and reporting |
| 4 | Limited internal placement product, likely Location Billboard or featured profile/development | Proves Option B with one controlled product |
| 5 | External marketing campaign workflow only after internal placement lifecycle is proven | Avoids premature universal campaign architecture |
