# Public Experience Composition Map

Status: strategic public-experience architecture layer
Scope: how public pages, directories, guides, showcases, and discovery surfaces compose domain-owned data

## Executive Position

Public experiences should rarely be treated as engines. Most public pages are composed read experiences over domain engines, read models, shared capabilities, and commercial products.

The key rule is source-of-truth separation:

- Public experiences present and convert.
- Domain engines own lifecycle rules and writes.
- Shared capabilities provide cross-cutting identity, media, analytics, attribution, search, and billing support.
- Commercial products may decorate or rank public experiences, but must not silently overwrite organic source-of-truth.

## Public Experience Registry

| Public experience | Architecture type | Maturity | Delivery priority | Composed owners | Must not own |
| --- | --- | --- | --- | --- | --- |
| Public search results | Public experience and query/read model | Established | Launch-critical | Single-Property Listing, Development Listing derived cards, Public Catalog/Search, Location filters, Analytics | Listing/development publication writes |
| Property detail | Public experience | Established | Launch-critical | Single-Property Listing/Public Catalog, lead intake, media, contact identity, analytics | Listing authoring/review lifecycle |
| Development detail | Public experience | Established | Launch-critical | Development Listing, developer brand profile, unit inventory, lead capture, media, analytics | Developer workspace logic, unit source-of-truth mutation |
| Development unit detail | Public experience | Established/emerging | Launch-critical | Development Listing, unit inventory, qualification, lead capture | Independent property write model |
| Developer Showcase | Public showcase/read model | Emerging | Launch-supporting | Developer Brand Profile, Development Listing, public search/projections, lead capture, media, verification, campaign attribution | Developer account membership or development publication rules |
| Developer Directory | Public directory/read model | Emerging | Launch-supporting | Developer Brand Profile, active developments, location coverage, verification, search/ranking | Developer account/source lifecycle |
| Agency Directory | Public directory/read model | Partial or fragmented | Launch-supporting | Agency profile/branding, agent membership, listings, verification, sponsored placement | Agency organization membership writes |
| Agency Profile | Public profile | Partial or fragmented | Launch-supporting | Agency stakeholder system, branding, agents, listings, lead capture | Agency workspace rules |
| Agent Directory | Public directory/read model | Established/partial | Launch-supporting | Agent profile, agency membership, coverage areas, listings, reviews when real, search/ranking, lead capture | Agent employment/membership lifecycle |
| Agent Profile | Public profile | Established/partial | Launch-supporting | Agent stakeholder system, listings, contact identity, coverage, lead capture | Agency membership source-of-truth |
| Service Provider Directory | Public directory/read model | Emerging-to-established | Launch-supporting | Service Provider Marketplace, services/locations, reviews, recommendations, sponsored placement | Service lead lifecycle outside Services Engine |
| Service Provider Profile | Public profile | Emerging-to-established | Launch-supporting | Service Provider Marketplace, provider profile, services, locations, reviews, lead/request capture | Cross-domain review engine before it exists |
| Explore Feed/Home/Shorts | Public experience over candidate engine | Emerging-to-established | Launch-supporting | Explore content, Discovery ranking, media, engagement, analytics, sponsored placement where applicable | Listing inventory source-of-truth |
| Province Page | Public location experience | Partial | Launch-supporting | Location hierarchy, public search projections, SEO, sponsored placement, analytics | Location engine writes unless formalized |
| City/Metro Page | Public location experience | Partial | Launch-supporting | Location hierarchy, search projections, price/market insight, agent/service/developer sections, SEO | Inventory ownership |
| Suburb Guide | Public location experience | Partial/planned | Launch-supporting | Location Intelligence, search projections, developments, Explore content, agents, services, guide sponsorship, analytics | Independent domain engine unless it owns refresh/publication lifecycle |
| Area Comparison | Public experience/tool | Planned | Post-launch refinement | Location Intelligence, price insights, search projections | Location data source-of-truth |
| Location Insight Article | Public content experience | Planned | Post-launch refinement | Location Intelligence, editorial/content management, SEO | Canonical location identity |
| Advertise pages | Public commercial acquisition experience | Partial | Launch-supporting for demand capture, post-launch for paid products | Commercial products, campaign concepts, lead capture, estimator, attribution | Billing or placement delivery lifecycle |
| Distribution Network public/apply pages | Public acquisition experience | Established/partial | Launch-supporting if distribution launches | Distribution/Referral Engine, partner identity, onboarding | Distribution deal lifecycle |

## Profile And Directory Boundary Map

| Concept | Meaning | Strategic owner | Notes |
| --- | --- | --- | --- |
| Account identity | Login/account root | Identity and access | `users` remains separate from public profiles |
| Legal organization | Contracting/legal entity | Stakeholder system or future organization capability | Developer, agency, service provider, partner legal entities should not be collapsed prematurely |
| Organization membership | Who belongs to an organization | Domain-local membership until generalized | Agency membership is stronger than developer/service membership today |
| Professional identity | Individual agent/provider/operator identity | Agent system, Service Provider Marketplace, or stakeholder profile | May point to account but should not be the account |
| Public commercial profile | Public-facing business/person profile | Specialized profile/read model | Developer brand, agency, agent, service provider public identity |
| Public showcase | Rich profile plus inventory/portfolio/trust/conversion | Public experience | Developer Showcase is the clearest example |
| Directory index | Searchable list of profiles | Public experience/read model | Ranking, filters, verification, sponsored placement compose here |
| Verification | Trust state and evidence | Verification capability plus domain policy | Verification may be operational, professional, commercial, or compliance based |
| Operating areas | Location coverage | Domain-specific profile attribute using Location Intelligence | Agents, agencies, service providers, developers can all use it differently |
| Specialties | Domain-specific service or market focus | Domain-specific profile attribute | Avoid one universal taxonomy until needed |
| Listings/developments portfolio | Public inventory association | Listing/development engines | Directories read this; they should not own it |
| Completed portfolio | Trust/history evidence | Developer/agency/agent profile or future reputation model | Needs source and verification rules |
| Reviews | Reputation evidence | Service-specific today; future shared capability later | Generic reviews are not established |
| Conversion actions | Call, enquiry, request quote, claim, save, follow | Lead intake plus domain adapters | Must preserve source and owner |
| Sponsored visibility | Paid ranking/placement | Sponsored Placement Engine | Must be labeled and auditable |

## Suburb Guide Composition Matrix

| Section | Source-of-truth owner | Shared capability | Commercial overlay | Maturity | Notes |
| --- | --- | --- | --- | --- | --- |
| Canonical suburb identity, slug, city/province relationship | Location Intelligence candidate / locations schema | SEO/internal linking | None | Partial | Public page should read canonical identity, not infer from URL strings alone |
| Hero/location summary | Location Intelligence plus editorial/content source if added | Media, SEO | Location Billboard or guide sponsor | Partial/planned | Do not make the hero ad the source of location identity |
| For-sale/rental inventory counts | Public Search read model over Single-Property and Development Listing | Search projections, analytics | Featured listings if labeled | Established/partial | Counts must preserve source metadata |
| Development projects in area | Development Listing | Media, attribution | Featured development placement | Established/partial | Development cards remain derived from development/unit data |
| Ordinary property listings | Single-Property Listing/Public Catalog | Media, saved search, analytics | Featured property placement if productized | Established | `properties` projection must not erase owner/source |
| Market prices and trends | Location Intelligence / price insights | Analytics transport | None | Partial | Strong candidate for launch-supporting location foundation |
| Amenities, schools, hospitals, shopping, transport, commute | Location Intelligence candidate | External data ingestion or editorial refresh if added | Sponsored nearby services only if labeled | Planned/partial | Requires source, freshness, and publication rules |
| Explore content about area | Explore Engine | Media, engagement analytics | Promoted Explore content | Emerging | Explore should own content lifecycle and engagement |
| Recommended agents | Agent system plus directory ranking | Verification, reviews when real, analytics | Featured agent placement | Partial | Directory should read agent coverage and verification |
| Service providers nearby | Service Provider Marketplace | Reviews/trust, recommendations | Featured provider placement | Emerging | Service provider visibility must respect provider trust rules |
| Guide sponsorship | Sponsored Placement Engine | Attribution, billing | Guide sponsorship product | Planned | Product should be one placement type, not a guide-owned ad engine |
| Enquiry/request CTAs | Lead intake with domain adapters | Contact identity, consent, attribution | Campaign/placement id if present | Established/partial | Capture source surface and location context |
| Related locations/internal links | Location Intelligence/SEO | Internal linking | None | Partial | Needed for growth and navigation |
| Location analytics | Analytics transport | Event envelope | Sponsor reporting if applicable | Partial | Must use stable location id and source surface |

## Agent Directory Composition Matrix

| Section | Source-of-truth owner | Shared capability | Commercial overlay | Maturity | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent identity and profile | Agent stakeholder system | Identity/contact identity | Premium profile product | Established/partial | Account, professional identity, and public profile remain separate |
| Agency membership | Agency stakeholder system | Organization/membership | None | Established | Directory reads membership; it should not mutate it |
| Operating areas | Agent system plus Location Intelligence | Location identity | Featured area placement if productized | Partial | Needs canonical area ids for ranking and filtering |
| Current listings | Single-Property Listing/Public Catalog | Search projections | Featured listing/product labels | Established | Listings remain listing-engine owned |
| Development or referral participation | Distribution/Referral Engine if applicable | Attribution | None | Partial | Do not mix distribution eligibility with ordinary agent directory ranking |
| Verification and profile completion | Agent system and verification capability | Trust | Premium verification only with policy | Partial | Paid products must not fake verification |
| Reviews/reputation | Future review capability or domain-specific reviews | Reviews/reputation | Premium display only if policy allows | Thin/planned | Generic review engine is not established |
| Ranking/search | Directory read model | Search/ranking analytics | Featured agent placement | Partial/planned | Sponsored results require disclosure and attribution |
| Lead capture/contact | Lead intake plus agent/listing adapter | Contact identity, consent, attribution | Placement/campaign attribution | Established/partial | Capture source surface, agent id, agency id, listing id when present |
| Analytics | Analytics transport | Event envelope | Sponsor/featured reporting | Partial | Profile and directory metrics need stable actor ids |

## Developer Showcase Composition Matrix

| Section | Source-of-truth owner | Shared capability | Commercial overlay | Maturity | Notes |
| --- | --- | --- | --- | --- | --- |
| Public developer brand identity | Developer Brand Profile | Contact identity, verification, media | Premium profile product | Emerging | Distinct from account and legal organization |
| Legal/developer account relationship | Developer stakeholder system | Identity/access, future organization model | None | Partial | Public page should not own membership or account permissions |
| Active developments | Development Listing Engine | Search projections, media | Featured development placement | Established | Development publication remains engine-owned |
| Unit availability/pricing | Development Listing Engine | Analytics, public detail links | Featured unit/product labels if created | Established | Avoid turning units into ordinary `properties` writes without decision |
| Completed portfolio | Developer Brand Profile or future reputation/portfolio capability | Verification/media | Premium showcase package | Partial/planned | Needs evidence source and moderation |
| Locations served | Development Listing plus Location Intelligence | SEO/internal linking | Featured location placement | Partial | Use canonical locations where possible |
| Reviews/trust badges | Future reviews/reputation or domain-specific trust | Verification | Premium verification only with policy | Thin/planned | Do not overclaim generic reviews |
| Lead capture/contact | Lead intake, brand lead service, developer funnel | Contact identity, consent, attribution | Campaign/placement attribution | Established/partial | Must preserve developer brand profile id and source surface |
| Campaign attribution | Attribution/shared analytics | Event envelope | Sponsored placement products | Partial | Needed before paid showcase products |
| Claim/update actions | Developer stakeholder system/admin verification | Identity/access, verification | None | Emerging | Claim flow should not bypass source-of-truth ownership |

## Location Intelligence And Area Experience Classification

| Capability or experience | Classification | Maturity | Delivery priority | Boundary |
| --- | --- | --- | --- | --- |
| Canonical province/city/suburb hierarchy | Candidate Location Intelligence domain foundation | Partial | Launch-supporting | Owns location identity and relationships if lifecycle is formalized |
| Slugs and related locations | Shared location/SEO capability | Partial | Launch-supporting | Supports public pages and search filters |
| Pricing and market insights | Candidate Location Intelligence subdomain | Partial | Launch-supporting/post-launch | Needs freshness and source policy |
| Amenities/POI/schools/hospitals/shopping/transport | Candidate Location Intelligence content/data subdomain | Planned/partial | Post-launch refinement | Needs ingestion/source/refresh ownership |
| Location editorial content | Public content workflow | Planned | Post-launch refinement | Could become content management, not necessarily Location Intelligence |
| Province pages | Public experience | Partial | Launch-supporting | Compose search, SEO, location hierarchy |
| City/metro pages | Public experience | Partial | Launch-supporting | Compose search, insights, agents/services/developments |
| Suburb guides | Public experience | Partial/planned | Launch-supporting | Compose many owners; do not own all content |
| Area comparison | Public experience/tool | Planned | Post-launch refinement | Reads Location Intelligence and price/search data |
| Location insight articles | Public content experience | Planned | Later strategic | Reads location data and editorial lifecycle |

## Explore Public Experience Classification

| Explore capability | Source-of-truth owner candidate | Maturity | Notes |
| --- | --- | --- | --- |
| Content records and types | Explore Engine | Emerging | `exploreContent`, `exploreShorts`, `exploreDiscoveryVideos` are real evidence |
| Media | Explore Engine plus shared media | Emerging | Must define attachment lifecycle and moderation |
| Publishing | Explore Engine | Partial | Upload/publish routes exist; production rules need ownership clarity |
| Feed generation | Discovery/Explore | Emerging-to-established | `exploreRouter.getFeed` and `discovery.getFeed` coexist |
| Ranking/recommendations | Discovery/Explore plus shared recommendations | Emerging | Discovery ranking uses engagement/performance style inputs |
| Engagement events | Explore/Discovery | Emerging | Views, saves, shares, skips, interactions exist in code surfaces |
| Watch time/completion | Explore Analytics | Emerging | Analytics router and UI evidence exist |
| Follows/collections | Explore/Consumer engagement | Partial or planned | Evidence is less complete than saves/shares/skips |
| Moderation | Explore and Service Provider content moderation | Partial | Service Explore videos have moderation fields; broader moderation needs boundary |
| Creator/publisher identity | Explore partners, service providers, developers/agents where applicable | Mixed | Needs explicit owner to avoid provider/content partner confusion |
| Conversion actions | Lead intake/attribution plus destination domain | Partial | Explore should not own downstream lead pipeline |
| Promoted content | Sponsored Placement over Explore content | Partial/planned | Requires sponsored disclosure and billing/reporting |

## Public Experience Non-Goals

- Do not declare every directory an engine.
- Do not let public pages own domain writes.
- Do not merge account identity, legal organization, public profile, and directory index into one model.
- Do not allow sponsored placement to change organic source-of-truth.
- Do not call reviews a shared public trust engine until target, moderation, and verification rules exist.
- Do not collapse Explore into ordinary search; it has content/feed/engagement concerns that can become a real engine.
