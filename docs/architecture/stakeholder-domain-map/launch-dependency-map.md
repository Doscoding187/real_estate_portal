# Launch Dependency Map

Status: launch and implementation architecture layer
Scope: launch-critical needs, sequencing, dependency leverage, first implementation slice, acceptance criteria, and deferred capabilities

## Executive Verdict

The strategic census does not supersede the current implementation recommendation. The first implementation slice should still be:

Development publication to public lead contract hardening.

This slice has the best mix of launch value, evidence strength, risk reduction, and commercial leverage. It protects the cleanest end-to-end developer path from private authoring through public discovery and lead capture without forcing premature unification of leads, campaigns, profiles, billing, or public search storage.

## Delivery Priority Definitions

| Priority | Meaning | Implementation stance |
| --- | --- | --- |
| Launch-critical | Must be correct for the platform to launch safely | Protect with contract tests and source-of-truth rules before broad feature work |
| Launch-supporting | Increases launch value or growth, but can be phased | Define interfaces and ship smaller vertical slices |
| Post-launch refinement | Valuable after early usage data exists | Avoid heavy architecture until product behavior is observed |
| Later strategic | Important long-term but not needed for launch | Keep decision records; do not model prematurely |
| Deferred pending validation | The concept needs product or evidence validation first | Do not build as an engine yet |

## Launch-Critical Capability Set

| Capability | Why launch-critical | Required dependencies | Main risk to protect |
| --- | --- | --- | --- |
| Development Listing publication | Developer supply and showcase inventory depend on it | Developer workspace, wizard payload, development service, unit inventory, brand identity | Public data can drift from private publish source |
| Single-Property Listing publication | Core property inventory depends on it | Listing wizard/router, approval, media, public `properties` projection | Projection can be treated as universal source-of-truth |
| Public search and detail | Buyers/tenants need to inspect and enquire | Search service, property/development public detail, source metadata | Mixed sources can lose attribution or show stale fields |
| Lead capture and attribution | Commercial conversion depends on trustworthy routing | Lead intake, contact identity, brand/agent/provider owners, source surface metadata | Leads can be captured but routed or reported incorrectly |
| Identity and access | Every private workspace depends on account/role safety | Users, auth, tRPC guards, stakeholder profiles | Account, organization, and public profile can be confused |
| Contact identity | Public conversion requires owner/contact clarity | Agents, agencies, developer brand profiles, service providers, leads | Public contact snapshots can diverge from owner identity |
| Media for listings/developments | Public inspection depends on images/video/documents | Upload/media utilities, listing media, development media | Media ownership can be lost across projections |
| Admin approval/verification basics | Public trust and publication safety require review paths | Super-admin, developer profile review, listing approval, service moderation | Admin action can attach content to wrong owner |

## Launch-Supporting Capability Set

| Capability | Why it supports launch | Dependency leverage | Timing |
| --- | --- | --- | --- |
| Developer Showcase | Helps developer credibility and conversion | Development Listing, Developer Brand Profile, lead capture | After publication-to-lead contract is protected |
| Service Provider Marketplace | Adds consumer utility and provider revenue path | Service provider profiles, service leads, reviews, billing | Parallel or after lead attribution foundation |
| Agency/Agent public profiles and directories | Supports trust, SEO, and lead routing | Agent/agency profiles, location coverage, lead capture | After core profile/contact boundaries are clear |
| Location pages and Suburb Guides | Supports SEO, search, and local discovery | Location hierarchy, search projections, market insights, sponsored placement later | After source metadata and location identity are stable |
| Distribution/Referral | Provides commercial growth and partner network | Distribution programs, deals, qualification, commissions | Launch-supporting if part of launch offer; otherwise post-launch |
| Saved searches/favorites | Improves buyer/tenant retention | Consumer system, search, notifications | Can phase after search/detail reliability |
| Basic analytics and attribution | Enables launch learning and commercial proof | Event envelope, source ids, lead source metadata | Start with lead/source attribution, expand later |
| Billing/entitlement read adapters | Enables paid packaging | Stakeholder subscription stores | Build adapters before paid feature complexity |

## Post-Launch Refinement Capabilities

| Capability | Why not first | Trigger to prioritize |
| --- | --- | --- |
| Sponsored Placement Engine | Requires stable public surfaces, attribution, and billing | Launch surfaces prove inventory and demand; first paid placement product selected |
| Location Billboard | Better as one Sponsored Placement product unless proven independent | Location guides have traffic and sponsor demand |
| Guide sponsorship | Needs stable guide composition and reporting | Location guide pages are live and measurable |
| Featured profile/development/service placements | Needs directory/profile trust and sponsored disclosure policy | Directories/showcases have organic baseline traffic |
| Explore promoted content | Requires Explore lifecycle, moderation, and analytics clarity | Explore content engine is mature enough for paid delivery |
| Recommendations/personalization | Needs behavior data and stable candidate contracts | Enough search, save, Explore, and lead events exist |
| Reviews/reputation infrastructure | Generic model is not established | One or more domains need cross-target review reuse |
| External marketing/social campaign products | Delivery differs from internal placement | Paid internal placement lifecycle is proven |

## Later Strategic Or Deferred Capabilities

| Capability | Current posture | Deferral reason |
| --- | --- | --- |
| Valuation Engine | Later strategic | Price insights and valuation service labels exist, but no complete request/report/fulfilment lifecycle was confirmed |
| Seller Acquisition Engine | Later strategic | Product workflow crosses listing, valuation, agent matching, demand, and marketing without one source-of-truth lifecycle |
| Auction Participation Engine | Later strategic | Auction fields exist, but bidder registration, bidding, timers, settlement, and compliance are not present as an engine |
| Recruitment/candidate-agent workflows | Deferred pending validation | Evidence is not enough to model an engine |
| Universal Campaign Engine | Deferred pending validation | Internal placements, external campaigns, demand campaigns, and referral distribution have different lifecycles |
| Universal Profile/Actor model | Deferred pending validation | `economicActors` is candidate evidence, but mature stakeholder-specific profiles already exist |
| Universal Lead/CRM Engine | Deferred pending validation | Lead capture can be shared, but downstream pipelines are domain-specific |

## Capability Dependency Map

| Capability | Depends on | Enables |
| --- | --- | --- |
| Development publication contract | Developer identity, developer brand profile, development payload, unit inventory, media | Public development detail, derived search cards, development leads, developer analytics, featured development products |
| Single-property publication contract | Listing owner identity, listing approval, media, `properties` projection | Public property detail, property search, property enquiries, featured listing products |
| Public source metadata | Listing/development source ids, projection builders, search contracts | Lead attribution, analytics, sponsored placement reporting, safe mixed search |
| Lead attribution contract | Contact identity, public source metadata, consent, owner profile ids | Developer funnel, agent/agency leads, service leads, campaign attribution, revenue reporting |
| Developer Brand Profile | Developer account/org context, public brand/contact identity | Developer Showcase, development lead routing, distribution access, paid developer products |
| Location identity | Province/city/suburb hierarchy, canonical slugs | Location pages, Suburb Guides, sponsored targeting, location analytics |
| Analytics event envelope | Stable entity ids and source surfaces | Launch learning, attribution, paid placement reporting, recommendation inputs |
| Billing/entitlement adapters | Stakeholder subscription stores, plan config, identity | Paid plans, placement eligibility, profile tiers, quota/feature gates |
| Sponsored Placement contract | Public surfaces, attribution, billing, creative approval, location/profile inventory | Billboards, guide sponsorship, featured profiles, promoted Explore content |
| Explore ownership map | Explore content records, feed/discovery APIs, analytics, moderation, publisher identity | Promoted content, creator analytics, richer discovery, recommendation inputs |
| Service Provider identity contract | Service provider profile, Explore partner relationship, billing, reviews | Service directory, service leads, featured provider placement, service marketplace revenue |
| Distribution boundary map | Programs, access, referrals, deals, commissions, manager ops | Partner products, commission reporting, distribution dashboards |

## Reassessed First Slice

Name: Development publication to public lead contract hardening

Architectural reason:

This protects an established domain engine and its public conversion path. It is narrower and safer than beginning with Location Intelligence, Explore, Sponsored Placement, or a universal profile/lead/campaign model. It also creates the source metadata and lead attribution habits that later revenue products need.

Stakeholder outcome:

A developer can publish a development and trust that a buyer sees correct public development/unit information in search and detail, then submits an enquiry that reaches the correct brand/funnel with source and qualification context intact.

Scope:

- Canonical development publish payload fields.
- Development service persistence and publication state.
- Derived development search card source metadata.
- Public development detail owner, brand, inventory, transaction, and href identity.
- Development lead capture attribution.
- Regression guard that single-property search/detail behavior remains unchanged.

Affected routes:

- `/developer/create-development`
- `/development-wizard`
- `/development/:slug`
- `/development/:slug/unit/:unitId`
- `/development/:slug/qualification`
- Public search routes that call `properties.searchDevelopmentListings`

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

Affected services and contracts:

- `developmentService`
- `developmentDerivedListingService`
- `publicLeadCaptureService`
- `brandLeadService`
- `developerFunnelService`
- Development wizard draft/publish payload
- Development public read contract
- Development-derived search card contract
- Public lead capture payload
- Developer funnel lead mapping contract

Acceptance criteria:

- Published approved development units appear in public search with source `development`.
- Search card and public detail agree on development id, unit type id, developer brand profile id, brand/contact identity, transaction type, price/rent/auction fields, and href.
- Public lead capture preserves development id, unit type id when applicable, developer brand profile id, source surface, lead source, UTM/campaign fields where present, and qualification/affordability context.
- Developer funnel mapping receives the captured lead with the correct domain context.
- Existing single-property listing/property search behavior remains unchanged.
- Tests fail if a future change drops source metadata or attaches a development to the wrong brand.

Tests to add or strengthen:

- Existing development payload tests extended for identity, inventory, transaction, and publisher/brand context.
- Existing development-derived search tests extended for source metadata and detail href.
- Public detail/search consistency contract comparing a derived search card with `developer.getPublicDevelopmentBySlug`.
- Server-side public lead capture contract for `developer.createLead`, `leads.create`, and `brandProfile.captureLead` variants.
- Super-admin publisher ownership fixture proving publisher context cannot silently attach content to the wrong brand.

Non-goals:

- No schema changes unless a test reveals a truly missing field that cannot be represented today.
- No lead table unification.
- No generic CRM.
- No migration of development unit types into `properties`.
- No route redesign.
- No distribution, billing, sponsored placement, or Explore implementation.
- No UI redesign beyond minimal contract-preserving fixes in a future implementation task.

## Next Three Tentative Slices

These are tentative. They should be confirmed after Slice 1 exposes the real contract gaps.

| Sequence | Slice | Goal | Acceptance criteria | Non-goals |
| --- | --- | --- | --- | --- |
| 2 | Shared lead attribution and contact identity adapters | Make public lead capture safe across developer, property, service, and demand surfaces without forcing one CRM | Lead payload includes source surface, source entity, owner actor/profile, contact snapshot, consent, UTM/campaign fields, and domain context; developer, property, service, and demand adapters preserve their own pipeline rules | No universal lead state machine; no distribution deal merge; no billing work |
| 3 | Location identity and public guide foundation | Stabilize location hierarchy, slugs, source ids, and public guide composition for SEO/search growth | Province/city/suburb pages read canonical ids/slugs; search cards and location analytics carry location ids; Suburb Guide composition points to source owners for inventory, insights, agents, services, Explore, and sponsorship slots | No full Location Intelligence engine; no POI ingestion; no paid guide sponsorship delivery yet |
| 4 | Explore ownership and engagement contract | Decide the boundary between Explore, Discovery, service videos, content partners, and promoted content before paid feed products | Content/feed APIs have one documented owner per record/action; engagement events cover views, unique views, watch time/completion where supported, saves, shares, skips, clicks; publisher identity and moderation ownership are explicit | No promoted content billing; no universal recommendation engine; no external social campaign engine |

## Alternative Slice Considerations

| Candidate first slice | Why not first |
| --- | --- |
| Sponsored Placement MVP | Revenue-relevant, but depends on public source metadata, lead attribution, billing, and stable public inventory |
| Location Intelligence Engine | Strategically important, but current launch risk is lower than development publish/lead attribution risk |
| Explore Engine hardening | Important, but it is not the main source-of-truth for property/development inventory |
| Distribution extraction | Valuable, but distribution is already deeper and should be extracted after boundary documentation and tests |
| Billing/entitlement consolidation | Needed, but read adapters are safer than schema consolidation and should follow clearer launch products |
| Universal profile or actor model | Too likely to break mature stakeholder-specific flows |

## Launch Non-Goals

- Do not start runtime implementation as part of this documentation pass.
- Do not generalize all leads, profiles, campaigns, reviews, or organizations.
- Do not create microservices or folder reorganization plans before contract tests exist.
- Do not move development units into `properties` as ordinary listings.
- Do not treat public search as write owner for listing/development data.
- Do not commit or push this documentation pack as part of the architecture pass.
