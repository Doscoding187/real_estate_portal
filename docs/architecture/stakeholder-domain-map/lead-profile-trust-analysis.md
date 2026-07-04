# Lead, Engagement, Profile, And Trust Analysis

This file separates lead-like workflows, request-like workflows, public engagement, profiles, organizations, and trust signals. The current code strongly supports shared primitives, but it does not justify one universal Lead Engine or one universal Profile record.

## Lead And Engagement Concepts

| Concept | Initiating actor | Target | Source and attribution | Qualification/contact data | Assignment model | Lifecycle owner | Current storage/API | Current consumers | Analytics needs | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Property enquiry | Buyer/tenant/searcher | Public `properties` row, linked listing/agent/agency when present | Property detail/search forms, `leads.create`, public lead capture | Contact, message, property id, source, campaign/UTM where present | Agent/agency/listing owner; exact pipeline is mixed | Shared lead intake plus listing/agent workflow | `leads`, `publicLeadCaptureService`, `leadsRouter` | Agent/agency dashboards, property enquiries | Source surface, property id, owner id, response/conversion | Keep shared capture; define listing/agent pipeline adapter. |
| Development enquiry | Buyer/searcher | Development and developer brand profile | Development detail, qualification page, developer/lead routes | Contact, development id, brand id, unit/affordability context | Developer funnel, possible brand routing | Development Sales Opportunities overlay | `leads`, `brandLeadService`, `developerFunnelService`, `developer.createLead` | Developer workspace, brand lead views | Development id, brand id, qualification stage, source | Protect with next contract slice. |
| Viewing request | Buyer/tenant/agent/referrer | Property, development, or distribution deal | Property/development forms or distribution scheduling | Contact, requested time, target asset, notes | Agent/manager/developer depending source | Domain-specific | Generic `showings`/`scheduledViewings`; distribution `distributionViewings` | Agent dashboard, distribution manager/partner pages | Scheduled/completed/no-show, attribution lock | Do not force all viewing states into one enum. |
| Seller lead | Seller/landlord/private owner | Agent/agency/listing acquisition | Demand/lead/contact surfaces | Contact, property criteria/address, intent | Agent/agency assignment | Future seller acquisition workflow | Generic leads/demand evidence only | Agents/agencies | Acquisition source, response, listing conversion | Product label until full lifecycle is implemented. |
| Landlord lead | Landlord/property owner | Rental listing/agent/agency | Similar to seller lead | Contact, rental property info | Agent/agency assignment | Future workflow | Not fully verified | Agents/agencies | Rental acquisition metrics | Keep separate from buyer enquiries until evidence supports merge. |
| Valuation request | Seller/owner | Valuation/price insight workflow | Price insights or future valuation forms | Address/property info, contact, valuation inputs | Agent/platform depending product | Future valuation workflow | Price insight evidence, no complete engine confirmed | Sellers/agents/future reports | Valuation source, estimate version, conversion | Do not classify as established engine. |
| Service request | Consumer/searcher | Service provider or matched providers | Services request/results flow | Contact, category, location, notes, property/development context | Service provider matching/recommendation | Service Provider Engine | `serviceLeads`, `serviceLeadEvents`, `servicesEngine.createLeadFromJourney` | Provider dashboard, service request results | Category, intent stage, source surface, match quality | Keep service-specific lifecycle. |
| Referral opportunity | Agent/referrer | Distribution-enabled development/program | Distribution partner referral/deal flows | Buyer contact, affordability/qualification, program/development id, documents | Distribution manager/referrer/developer | Distribution/Referral Engine | `referrals`, `referralAssessments`, `distributionDeals`, `distributionReferralSubmissionService` | Referrer, manager, developer distribution dashboards | Program id, deal stage, commission state, validation | Keep separate from generic lead status. |
| Recruitment lead | Prospective partner/team member | Platform/admin/distribution manager or referrer application | Distribution public applications and team registrations | Applicant contact, requested area, application info | Admin review | Distribution onboarding/admin workflow | `distributionReferrerApplications`, `platformTeamRegistrations`, public distribution routes | Admin distribution pages | Application source/status | Do not place in buyer lead pipeline. |
| General contact enquiry | Visitor/user | Platform, brand, provider, agency, agent | Public contact actions | Contact, message, source | Depends on target | Shared capture only if target contract exists | Mixed; generic lead can store source/target | Admin/domain dashboards | Source and target identity | Require target type/id before centralizing. |
| Auction registration | Buyer/bidder | Auction listing/development/unit | Future auction forms | Contact, eligibility, deposit/verification | Auction domain if implemented | Not established | Auction fields exist in listing/development/unit schemas, but no full participation engine confirmed | Future auction pages | Registration, eligibility, bid participation | Keep auction attributes domain-local until bidding lifecycle exists. |
| Auction bidding/participation | Registered bidder | Auction asset | Future auction event/room | Bidder identity, bid, time, reserve/deposit state | Auction engine if built | Not established | No complete current bidding engine confirmed | Future public/admin auction surfaces | Bid audit, winner, settlement | Do not model as generic leads. |
| Campaign response | Visitor/prospect | Campaign owner and target asset/service | Demand campaigns, boost campaigns, marketing surfaces | Contact or engagement, campaign id, source channel | Campaign/demand assignment | Emerging demand/campaign workflow | `demandCampaigns`, `demandLeads`, marketplace `boostCampaigns` | Campaign owner dashboards/future analytics | Campaign id, source channel, conversion | Standardize attribution primitive before campaign engine. |
| Public engagement event | Visitor/user/session | Content, listing, location, search, Explore item | Analytics/discovery/explore interactions | User/session, event type, target id, metadata | Analytics/discovery services | Shared event transport plus domain event definitions | `analyticsEvents`, `locationAnalyticsEvents`, `exploreEngagements`, discovery engagement service | Reports, ranking, dashboards | Stable target ids and source metadata | Standardize event envelope, not all reports. |

## Shared Lead Primitives

These concepts are genuinely reusable if kept primitive and domain-neutral:

| Primitive | Why shared | Current evidence |
| --- | --- | --- |
| Contact identity snapshot | Most captures need name/email/phone/message | `leads`, `serviceLeads`, `partnerLeads`, `demandLeads`, distribution/referral buyer fields |
| Target reference | Every capture needs a target asset, brand, provider, organization, or programme | `propertyId`, `developmentId`, `developerBrandProfileId`, provider ids, program/development ids |
| Source surface and attribution | Public routes, campaigns, UTM/referrer, and source channel appear across domains | `leads.source`, `leadSource`, demand `sourceChannel`, analytics/explore events |
| Consent and anti-spam metadata | Public capture needs guardrails | `leadsRouter` honeypot/rate limit; lead metadata fields |
| Assignment metadata | Many domains assign a lead/opportunity to a user/team/provider | `leads.assignedTo`, demand assignments, distribution manager assignments |
| Activity timestamps and notes | Follow-up requires timeline-like data | `leadActivities`, distribution deal events, service lead events |
| Campaign id/source id | Campaign response should be preserved without owning lifecycle | Demand and marketplace campaign tables, lead source fields |

## Domain-Specific Lifecycles

These lifecycles should not be unified into one status enum:

- Development sales qualification and funnel follow-up.
- Property enquiry and viewing workflow for agents/agencies.
- Service provider request, acceptance, quote, win/loss lifecycle.
- Distribution referral, viewing, document, commission, and deal lifecycle.
- Demand lead matching and assignment lifecycle.
- Auction registration and bidding, if implemented later.
- Recruitment/referrer application review lifecycle.

## Unified CRM Recommendation

A unified CRM should not be a single source-of-truth domain today.

Recommended shape:

- Shared capture and attribution capability for contact, source, target, consent, and assignment primitives.
- Domain-owned pipelines for developer sales, property/agent enquiries, service requests, distribution deals, demand assignment, and future auction workflows.
- A read model or dashboard aggregation layer that can show cross-domain opportunities without owning their lifecycle.
- Optional shared activity/timeline primitive only after domain event/actor identities are stable.

## Profile, Organisation, And Trust Analysis

| Concept | Current implementation | Shared primitive? | Domain-specific owner | Current ambiguity | Target posture |
| --- | --- | --- | --- | --- | --- |
| Account identity | `users`, auth service/router, global roles | Yes | Identity platform | Role alone is not enough for domain capability | Keep as login root with domain identity adapters. |
| Individual identity | `users`, `agents`, lead contact snapshots | Partly | Agent/lead/domain profiles | Contact snapshots duplicate public profile fields | Define contact projection separate from profile write models. |
| Organisation identity | `agencies`, `developers`, `developerBrandProfiles`, `partners`, `explorePartners`, service provider profile | Partly | Domain-specific | Developer account, public brand, service provider, partner all differ | Keep specialized records; document owner and public projection. |
| Organisation membership | Agency membership/invites strongest; developer/service teams weaker | Shared pattern, not shared table yet | Agency/Agent Ops; future developer/provider membership | Developer team management is not proven mature | Reuse pattern only after developer membership requirements are known. |
| Developer profile | `developers` | No | Development Listing/Developer account | Can be confused with public brand | Keep for account/approval state. |
| Developer public brand | `developerBrandProfiles` | Public identity primitive candidate | Brand Profile / Development Listing integration | Claimable/subscriber/marketing agency/legal org meanings overlap | Treat as public commercial identity with explicit owner/publisher fields. |
| Agency profile | `agencies`, `agencyBranding` | No | Agency Ops | Public profile and internal org may overlap | Keep agency-owned. |
| Agent profile | `agents`, coverage/credentials/profile fields | No | Agent Ops | User account and agent profile are distinct | Keep agent-owned. |
| Service provider profile | `serviceProviderProfiles`, `explorePartners` | No | Service Provider Engine | Provider identity anchored to Explore partner | Decide whether Explore partner remains source or is bootstrap only. |
| Public slugs and SEO metadata | Developer brands, developers/developments, agents/agencies, location pages | Yes as public projection pattern | Domain owners provide canonical slugs | Route conflicts and duplicate public identities possible | Each domain owns slug uniqueness inside its public namespace. |
| Verification and trust | `developers.status/isTrusted`, brand contact verification, agency verification, partner/provider verification, `economicActors` trust fields | Shared vocabulary, domain-specific rules | Each stakeholder domain | Trust score fields are not universally meaningful | Share display primitives, keep verification rules domain-local. |
| Professional credentials | Agent/provider/developer-specific fields | No | Stakeholder domain | Generic profile could lose validation specificity | Keep specialized. |
| Operating areas | Agents, agencies, developers, service providers, locations | Shared location primitives, domain-specific coverage rules | Domain owners | Different meanings: sales area, service area, operating province | Share location reference primitives only. |
| Portfolio/listings/developments | Agent listings, agency inventory, developer developments, completed projects | No | Listing and Development Listing engines | Public profile pages compose inventory from engines | Public pages should read inventory; not own it. |
| Reviews | Service provider reviews plus stub generic reviews | Not yet | Service Provider Engine currently | Generic reviews are not implemented | Define target review contract before sharing. |
| Conversion actions | Enquire, contact, request service, submit referral, book viewing | Shared UI pattern, domain-specific capture | Lead intake/domain engines | Same button label can produce different lifecycle | Keep target/source/action explicit. |

Developer identity should be read in layers. The legal or operating developer organisation is not fully modelled by `users`; `users` is the login/account root. `developers` is the developer account/profile and approval record. `developerBrandProfiles` is the public commercial brand/contact identity used by development listings, brand pages, lead routing, and distribution access. The public Developer Showcase is a composed public experience over the brand profile and development inventory, not the source of truth for organisation membership or development writes.

## Public Profile Versus Engine

Public profile/showcase pages are public experiences. They compose source data from underlying engines:

- Developer Showcase reads public brand identity, developments, contact identity, lead capture, media, SEO, and analytics.
- Agency Profile reads agency identity, branding, agents/listings, contact actions, SEO, and analytics.
- Agent Profile reads agent identity, credentials, listings, contact actions, SEO, and analytics.
- Service Provider Profile reads provider identity, services, locations, reviews, request actions, SEO, and analytics.

None of these pages should become an independent "profile engine" that owns listings, developments, service requests, or trust decisions.

## Trust And Verification Target

Recommended target:

- Shared trust display primitives: verification badge type, verified-at timestamp, reviewer/moderator identity, reason, public/private visibility, and trust signal source.
- Domain-owned verification rules: developer approval, agency verification, agent credentials, provider moderation, distribution partner access, brand contact verification.
- Public profile pages should render trust signals from domain owners and record conversion events with stable target ids.

Do not create a universal trust score until the business meaning of each stakeholder's trust signals aligns.
