# Explore Property Media Content Taxonomy

| Field | Value |
| --- | --- |
| Status | Canonical product and policy taxonomy |
| Governing authority | `00-explore-product-doctrine.md` |
| Scope | Publishable Explore content, publisher authority, subject linkage, trust, actions, and distribution eligibility |
| Boundary | Product and policy taxonomy; not a database, API, moderation-workflow, or legal-compliance specification |

## 1. Purpose and authority

This taxonomy defines the property media that Explore may distribute and the conditions under which it may do so. It establishes the meaning of a publishable content class before a future schema, API, ranking model, or publishing workflow is designed.

The taxonomy is binding on future Explore product, design, architecture, and engineering work. It does not assert that every class, source object, publisher type, action, or moderation capability exists today. A class may not be implemented merely because it appears here.

## 2. Relationship to the product doctrine

This document applies the [Explore Product Doctrine](00-explore-product-doctrine.md). The doctrine takes precedence if an older Explore strategy, implementation, design, or audit document conflicts with this taxonomy. This taxonomy must in turn guide the future Property Context Graph; it must not be reverse-engineered from the current video tables or feed routes.

Explore remains a video-first Property Media Network. It is not a generic social network, an open public creator platform, a listing-video attachment feature, a TikTok clone, or a database-design exercise.

## 3. Taxonomy principles

1. A **content world** is a broad strategic domain; a **content class** is a governed publishable category within it.
2. A class determines required authority, subject linkage, claims policy, action eligibility, freshness, and moderation. Video format does not.
3. A content asset must link to a canonical source object whenever a real subject exists. Topic-only education is permitted only where a listing, development, or project is not the subject.
4. Platform approval permits publication only within the approved boundary. It does not confer professional, regulated, legal, financial, or ownership authority.
5. Every promised action requires a real connected source object and an accountable recipient or tool.
6. Organic, editorial, and sponsored placement are separate decisions. Payment never overrides verification, moderation, source accuracy, or disclosure.
7. “V1 candidate” is a preliminary assessment, not a launch decision. Final scope belongs in `05-explore-v1-capability-boundary.md`.

## 4. Concept definitions

| Concept | Meaning | Must not be confused with |
| --- | --- | --- |
| Content world | Broad domain, such as Development media or Property services | A filter, topic, or individual post |
| Content class | Stable governed category, such as `listing_walkthrough` | A format or free-form tag |
| Topic | Descriptive subject tag, such as affordability, security, sustainable construction, or family living | The source object or the class |
| Format | Presentation form: quick hit, standard, extended, long-form, or live | Content meaning, authority, or risk |
| Source object | Canonical real-world or governed subject that owns facts and lifecycle: listing, development, development phase, unit type, event occurrence, location, market report, professional profile, organisation, service category/offering, verified project, property topic, or property tool. An editorial container is not a source object. | The uploaded video |
| Publisher type | The accountable person or organisation permitted to publish a class | A viewer, sponsor, or placement |
| Placement | A governed distribution instance: organic, editorial, or sponsored | A content asset or its moderation state |
| Content asset | Authored media and its caption, transcript, media rights, creator, disclosures, and moderation state | The source object |
| Discovery item | Distribution-ready representation of a content asset plus its context and eligibility | A raw media upload |

## 5. Publisher types

The following codes are used in the catalogue. Each publisher remains accountable for the content it publishes, including where an organisation is also credited.

| Code | Publisher type | Minimum authority boundary |
| --- | --- | --- |
| PUB_EDITORIAL | Property Listify editorial | Approved editorial container and accountable editor |
| PUB_AGENT | Verified individual agent | Verified agent identity and active professional profile |
| PUB_AGENCY_REP | Authorised agency representative | Verified person plus recorded agency authority |
| PUB_DEVELOPER | Registered property developer | Verified developer identity or authorised developer representative |
| PUB_ARCHITECT | Approved architect | Verified professional/portfolio basis; qualification claims require qualified review |
| PUB_CONSTRUCTION_PRO | Approved contractor or construction professional | Verified business/professional and relevant project authority |
| PUB_FINANCE_PRO | Approved bond or finance professional | Verified professional/organisation basis; financial claims require qualified review |
| PUB_LEGAL_PRO | Approved conveyancer or legal professional | Verified professional/organisation basis; legal claims require qualified review |
| PUB_SERVICE_PROVIDER | Approved property service provider | Verified service profile and service/category authority |
| PUB_APPROVED_CREATOR | Platform-approved property creator | Explicit platform approval, defined topic boundary, and no implied professional authority |
| PUB_TAX_PRO | Future approved tax professional | Future specialist authority; not automatically a V1 publisher |
| PUB_COST_PRO | Future approved quantity surveyor or qualified built-environment cost professional | Future specialist authority; not automatically a V1 publisher |
| PUB_VALUER | Future approved property valuer | Future specialist authority; not automatically a V1 publisher |
| PUB_CONSUMER | Ordinary consumer or homeowner | Not eligible for direct public publishing; may participate only through an approved editorial or verified professional process |

### 5.1 Publisher identity is not one identity

For every public item, Explore must distinguish the **accountable publisher entity** that takes responsibility for publication, the **publishing organisation** that may own or govern the channel, the **human operator** who uploaded or approved the item, any **represented professional** whose authority or advice is relied upon, and the **credited creator** who appears in or authored the media.

These identities may be one person in a simple case, but they must not be collapsed by assumption. For example, an agency can be the accountable publisher, an authorised employee the human operator, and a verified agent the represented professional/presenter. The Property Context Graph will define the formal relationships.

## 6. Source-object types

| Code | Canonical source object | Notes |
| --- | --- | --- |
| SRC_LISTING | Listing | A published, actionable listing record |
| SRC_DEVELOPMENT | Development | A published development record |
| SRC_DEVELOPMENT_PHASE | Development phase | A governed phase within a development, with its own lifecycle |
| SRC_UNIT_TYPE | Unit type | A governed unit type that may occur in one or more development phases |
| SRC_EVENT_OCCURRENCE | Event occurrence | A governed open home, launch, viewing, or other dated event with organiser, access, cancellation, and expiry state |
| SRC_LOCATION | Location | Canonical suburb, city, precinct, or other governed location record |
| SRC_MARKET_REPORT | Market insight or report | Governed report carrying dataset provenance, observation period, methodology, publication date, and revision history |
| SRC_PROFESSIONAL_PROFILE | Professional profile | Verified accountable professional profile |
| SRC_ORGANISATION | Organisation | Agency, developer, approved business, or other governed organisation |
| SRC_SERVICE_CATEGORY | Service category | Canonical category for a service domain |
| SRC_SERVICE_OFFERING | Service offering | Candidate graph distinction from service category; final relationship is a Context Graph decision |
| SRC_VERIFIED_PROJECT | Verified project or portfolio item | Project evidence verified by the relevant accountable professional or organisation |
| SRC_PROPERTY_TOPIC | Property topic | Governed educational topic; does not itself prove a commercial claim |
| SRC_PROPERTY_TOOL | Property tool | A governed affordability, bond, valuation, yield, development-comparison, or other property tool that may be an explanatory subject and/or action destination |

An **editorial container**—for example a programme, collection, series or commission—is a governance and distribution relationship, not a canonical source object. Documentary content must still concern one or more real subjects from this list.

### 6.1 Authority and linkage codes

| Code | Required linkage and authority |
| --- | --- |
| AUTH_OWNER | Publisher or represented organisation owns the subject record or has recorded ownership authority |
| AUTH_REPRESENTATIVE | Publisher has recorded representation, employment, or delegated publication authority |
| AUTH_PROFESSIONAL | Publisher has authority to speak professionally on the topic; this is not authority over a listing/development |
| AUTH_EVIDENCE | Verified portfolio/project evidence supports the claim; ownership or client permission may still be required |
| AUTH_TOPIC | Topic-linked; no inventory subject is required because the media is general education |
| AUTH_EDITORIAL | Editorial container governs commissioning, source checking, and public interest |
| AUTH_MULTIPLE | Multiple linked subjects are required or permitted; each must satisfy its own authority rule |

## 7. Content-class catalogue by world

Each row defines all required taxonomy fields through the codes and policy bundles below. Each catalogue row is authoritative for that class’s permitted atomic actions; Section 12 defines the universal truth, permission, measurement, and attribution conditions. The formal code namespaces are `PUB_*`, `SRC_*`, `AUTH_*`, `GEO_*`, `FORMAT_*`, `META_*`, `DISC_*`, `CLAIM_*`, `ACT_*`, `FRESH_*`, `RISK_*`, and `PLACE_*`. Compact aliases appear only inside their explicitly namespaced catalogue column; future contracts, schemas, APIs, and cross-document references must use the formal namespaced code. “Source/authority” states the required source object and linkage basis; “Geo/format” states geographic relevance and permitted presentation; “M/D/C” states metadata, disclosures, and enhanced-claims review; “Fresh/risk” states freshness/expiry and moderation tier; “Place/phase” states organic, editorial, sponsored eligibility and preliminary phase.

### 7.1 Policy bundles used by the catalogue

| Field | Codes and meaning |
| --- | --- |
| Geographic relevance | `GEO_EXACT` (G1) exact subject location; `GEO_LOCATION` (G2) canonical area/location; `GEO_SERVICE_AREA` (G3) publisher service area plus optional project/location; `GEO_TOPIC` (G4) national/topic relevance with optional location; `GEO_MULTI_LOCATION` (G5) multi-location comparison with every location named |
| Format/duration | `FORMAT_QUICK` (Q) 15–60 seconds; `FORMAT_STANDARD` (S) 1–3 minutes; `FORMAT_EXTENDED` (X) 3–10 minutes; `FORMAT_LONG` (L) 10–30 minutes; `FORMAT_LIVE` (LV) separately approved and monitored. A class may use more than one stated range. |
| Metadata | `META_CORE` (M1) publisher, source identifier, title/caption, location, topics, publication date, rights attestation; `META_INVENTORY` (M2) M1 plus price/availability timestamp and currency; `META_DEVELOPMENT` (M3) M1 plus development/phase/unit status; `META_PROJECT` (M4) M1 plus evidence/portfolio reference; `META_EDUCATION` (M5) M1 plus educational sources, general-information context, and review date; `META_DOCUMENTARY` (M6) M1 plus editorial container, contributors, consent basis, and source notes. |
| Disclosures | `DISC_STANDARD` ordinary publisher/context; `DISC_REPRESENTATION` representation/ownership relationship; `DISC_TIME_BASIS` price, availability, or commercial terms time basis; `DISC_COMMERCIAL` sponsored/commercial influence; `DISC_SCOPE` general-information and professional-scope disclaimer; `DISC_PROJECT_EVIDENCE` before/after, portfolio, and client-permission basis; `DISC_ESTIMATE_BASIS` estimate methodology, exclusions, date, geography, and uncertainty; `DISC_SYNTHETIC_MEDIA` AI-generated media, AI voice/likeness, artist impressions, model units, virtual staging, renders, simulations, and materially altered footage; `DISC_SENSITIVE` consent, privacy, sensitive-story, or editorial disclosure. Multiple codes may apply. |
| Enhanced claims review | `CLAIM_STANDARD` normal accuracy; `CLAIM_INVENTORY` price/availability/representation; `CLAIM_DEVELOPMENT` progress, completion, inventory, or launch; `CLAIM_TECHNICAL` cost, technical, compliance, or project outcome; `CLAIM_FINANCIAL` financial, investment, yield, insurance, or affordability; `CLAIM_VALUATION` value estimate or valuation methodology and always requires `QUAL_VALUATION`; `CLAIM_LEGAL` legal, tax, ownership, or regulated guidance; `CLAIM_PUBLIC_INTEREST` privacy, documentary, public-interest, or vulnerable-person concern. These are policy triggers, not legal classifications. |
| Required qualified contribution | `QUAL_NONE` where no specialist claim is made; `QUAL_FINANCE`, `QUAL_LEGAL`, `QUAL_TAX`, `QUAL_COST`, `QUAL_VALUATION`, or `QUAL_TECHNICAL` where the associated claim needs a qualified contributor, reviewer, or co-publisher; `QUAL_MULTI` where more than one applies. The claim matrix in Section 11 determines the minimum requirement. |
| Calls to action | Actions are atomic: `ACT_OPEN_LISTING`, `ACT_OPEN_DEVELOPMENT`, `ACT_COMPARE_UNIT_TYPES`, `ACT_OPEN_LOCATION`, `ACT_OPEN_PROFESSIONAL_PROFILE`, `ACT_OPEN_ORGANISATION_PROFILE`, `ACT_CONTACT_PROFESSIONAL`, `ACT_WHATSAPP_PROFESSIONAL`, `ACT_REQUEST_VIEWING`, `ACT_REQUEST_DEVELOPMENT_INFORMATION`, `ACT_REQUEST_SERVICE_QUOTE`, `ACT_USE_PROPERTY_TOOL`, `ACT_FOLLOW_PUBLISHER`, `ACT_SAVE_CONTENT`, `ACT_SAVE_SOURCE_OBJECT`, `ACT_SHARE`, and `ACT_CONTINUE_RELATED_CONTENT`. Each catalogue row is authoritative for its permitted atomic actions. Section 12 defines the universal truth, permission, measurement and attribution conditions governing those actions. |
| Freshness | `FRESH_INVENTORY` (F1) current inventory: expire or suppress when listing state, price, or availability changes; `FRESH_PROJECT` (F2) review on stated milestone and suppress when stale; `FRESH_LOCATION_MARKET` (F3) review at stated interval and source-date; `FRESH_EDUCATION` (F4) scheduled review; `FRESH_PORTFOLIO_STORY` (F5) durable but review claims, permissions, and links; `FRESH_EVENT` (F6) expire immediately after event/window. |
| Moderation risk | `RISK_STANDARD` ; `RISK_REPRESENTATION` ; `RISK_TECHNICAL` ; `RISK_FINANCIAL` ; `RISK_LEGAL` ; `RISK_SENSITIVE` . |
| Placement/phase | `PLACE_ORGANIC` / `PLACE_EDITORIAL` / `PLACE_SPONSORED` (`O/E/S` only as compact aliases in this column) means eligible only after the stated policy is met; `-` means not eligible. Phase is `V1 candidate`, `Later`, or `Future research`. Sponsored eligibility does not mean V1 availability. |

### 7.2 Property and listing media

| Stable class | Plain-language definition and viewer value | Eligible publishers [PUB] / verification | Source [SRC] / authority [AUTH] | Geo [GEO] / format [FORMAT] | Metadata [META] / disclosure [DISC] / claims [CLAIM] | Permitted atomic actions | Fresh [FRESH] / risk [RISK] | Placement [PLACE] / phase | Notes and unresolved decisions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `listing_walkthrough` | Guided tour that helps a viewer understand a specific listing | PUB_AGENT, PUB_AGENCY_REP; verified agent and active authority | SRC_LISTING; AUTH_OWNER or AUTH_REPRESENTATIVE | G1; Q/S/X | M2; DISC_REPRESENTATION/DISC_TIME_BASIS; CLAIM_INVENTORY | ACT_OPEN_LISTING; ACT_CONTACT_PROFESSIONAL/ACT_WHATSAPP_PROFESSIONAL/ACT_REQUEST_VIEWING/ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_INVENTORY/RISK_REPRESENTATION | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; V1 candidate | Confirm tenancy/occupant privacy policy. |
| `listing_highlight_teaser` | Concise introduction to a listing and its strongest relevant features | PUB_AGENT, PUB_AGENCY_REP; verified authority | SRC_LISTING; AUTH_OWNER or AUTH_REPRESENTATIVE | G1; Q/S | M2; DISC_REPRESENTATION/DISC_TIME_BASIS; CLAIM_INVENTORY | ACT_OPEN_LISTING; ACT_CONTACT_PROFESSIONAL/ACT_WHATSAPP_PROFESSIONAL/ACT_REQUEST_VIEWING/ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_INVENTORY/RISK_REPRESENTATION | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; V1 candidate | Must not omit material conditions while implying a complete presentation. |
| `open_home_preview` | Time-bounded invitation and practical preview for an open home | PUB_AGENT, PUB_AGENCY_REP; verified authority | SRC_LISTING plus SRC_EVENT_OCCURRENCE; AUTH_OWNER or AUTH_REPRESENTATIVE | G1; Q/S | M2; DISC_REPRESENTATION/DISC_TIME_BASIS; CLAIM_INVENTORY | ACT_OPEN_LISTING; ACT_CONTACT_PROFESSIONAL/ACT_WHATSAPP_PROFESSIONAL/ACT_REQUEST_VIEWING/ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_EVENT/RISK_REPRESENTATION | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | Requires truthful event time, access, cancellation, and safety rules. |
| `rental_tour` | Tour of a rental opportunity and rental-relevant context | PUB_AGENT, PUB_AGENCY_REP; verified authority | SRC_LISTING; AUTH_OWNER or AUTH_REPRESENTATIVE | G1; Q/S/X | M2; DISC_REPRESENTATION/DISC_TIME_BASIS; CLAIM_INVENTORY | ACT_OPEN_LISTING; ACT_CONTACT_PROFESSIONAL/ACT_WHATSAPP_PROFESSIONAL/ACT_REQUEST_VIEWING/ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_INVENTORY/RISK_REPRESENTATION | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; V1 candidate | Rental terms and availability need qualified local-policy review. |
| `commercial_property_presentation` | Presentation of a commercial property, use context, and enquiry path | PUB_AGENT, PUB_AGENCY_REP; verified commercial authority | SRC_LISTING; AUTH_OWNER or AUTH_REPRESENTATIVE | G1; S/X/L | M2; DISC_REPRESENTATION/DISC_TIME_BASIS; CLAIM_INVENTORY | ACT_OPEN_LISTING; ACT_CONTACT_PROFESSIONAL/ACT_WHATSAPP_PROFESSIONAL/ACT_REQUEST_VIEWING/ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_INVENTORY/RISK_REPRESENTATION | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | Permitted-use, yield, and occupancy claims need enhanced review. |
| `plot_land_presentation` | Presentation of land or a plot without implying unverified development rights | PUB_AGENT, PUB_AGENCY_REP, PUB_DEVELOPER; verified authority | SRC_LISTING; AUTH_OWNER or AUTH_REPRESENTATIVE | G1; S/X | M2; DISC_REPRESENTATION/DISC_TIME_BASIS; CLAIM_INVENTORY/CLAIM_LEGAL | ACT_OPEN_LISTING; ACT_CONTACT_PROFESSIONAL/ACT_WHATSAPP_PROFESSIONAL/ACT_REQUEST_VIEWING/ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_INVENTORY/RISK_REPRESENTATION | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | Zoning, services, boundaries, and rights require qualified review. |
| `price_availability_update` | Factual update to price, availability, or status for a connected subject | PUB_AGENT, PUB_AGENCY_REP, PUB_DEVELOPER; verified authority | SRC_LISTING or SRC_DEVELOPMENT/SRC_UNIT_TYPE; AUTH_OWNER or AUTH_REPRESENTATIVE | G1; Q/S | M2/M3; DISC_REPRESENTATION/DISC_TIME_BASIS; CLAIM_INVENTORY/CLAIM_DEVELOPMENT | ACT_OPEN_LISTING or ACT_OPEN_DEVELOPMENT/ACT_REQUEST_DEVELOPMENT_INFORMATION; ACT_CONTACT_PROFESSIONAL/ACT_WHATSAPP_PROFESSIONAL/ACT_REQUEST_VIEWING/ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_INVENTORY/RISK_REPRESENTATION | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; V1 candidate | Must bind claim to a timestamp and canonical source state. |
| `property_comparison` | Structured comparison that helps a viewer assess named alternatives | PUB_AGENT, PUB_AGENCY_REP, PUB_EDITORIAL; authority over each named subject or editorial basis | SRC_LISTING; AUTH_MULTIPLE with AUTH_OWNER/AUTH_REPRESENTATIVE/AUTH_EDITORIAL | G5; S/X | M2; DISC_REPRESENTATION/DISC_TIME_BASIS; CLAIM_INVENTORY | ACT_OPEN_LISTING; ACT_CONTACT_PROFESSIONAL/ACT_WHATSAPP_PROFESSIONAL/ACT_REQUEST_VIEWING/ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_INVENTORY/RISK_REPRESENTATION | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | Comparison methodology and fair representation need policy. |

### 7.3 Development media

| Stable class | Plain-language definition and viewer value | Eligible publishers [PUB] / verification | Source [SRC] / authority [AUTH] | Geo [GEO] / format [FORMAT] | Metadata [META] / disclosure [DISC] / claims [CLAIM] | Permitted atomic actions | Fresh [FRESH] / risk [RISK] | Placement [PLACE] / phase | Notes and unresolved decisions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `development_overview` | Introduction to a development, its proposition, and connected inventory | PUB_DEVELOPER, authorised PUB_AGENCY_REP, PUB_EDITORIAL; verified organisation authority | SRC_DEVELOPMENT; AUTH_OWNER/AUTH_REPRESENTATIVE/AUTH_EDITORIAL | G1; S/X/L | M3; DISC_REPRESENTATION/DISC_TIME_BASIS; CLAIM_DEVELOPMENT | ACT_OPEN_DEVELOPMENT/ACT_REQUEST_DEVELOPMENT_INFORMATION; ACT_COMPARE_UNIT_TYPES/ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_PROJECT/RISK_REPRESENTATION | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; V1 candidate | Must distinguish approved facts from aspirational plans. |
| `unit_type_walkthrough` | Tour of a defined unit type | PUB_DEVELOPER, authorised PUB_AGENCY_REP; verified development authority | SRC_UNIT_TYPE attached to SRC_DEVELOPMENT; optionally SRC_DEVELOPMENT_PHASE; AUTH_OWNER/AUTH_REPRESENTATIVE | G1; S/X | M3; DISC_REPRESENTATION/DISC_TIME_BASIS; CLAIM_DEVELOPMENT | ACT_COMPARE_UNIT_TYPES; ACT_OPEN_DEVELOPMENT/ACT_REQUEST_DEVELOPMENT_INFORMATION/ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_PROJECT/RISK_REPRESENTATION | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; V1 candidate | Model-unit disclosure required where applicable. |
| `construction_progress_update` | Dated update on construction progress | PUB_DEVELOPER, PUB_CONSTRUCTION_PRO, PUB_EDITORIAL; project authority or editorial evidence | SRC_DEVELOPMENT or SRC_VERIFIED_PROJECT; AUTH_OWNER/AUTH_REPRESENTATIVE/AUTH_EVIDENCE/AUTH_EDITORIAL | G1; Q/S/X | M3/M4; DISC_REPRESENTATION/DISC_PROJECT_EVIDENCE; CLAIM_DEVELOPMENT/CLAIM_TECHNICAL | ACT_OPEN_DEVELOPMENT/ACT_REQUEST_DEVELOPMENT_INFORMATION; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_PROJECT/RISK_TECHNICAL | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | Progress evidence, worker privacy, and safety imagery require policy. |
| `development_launch` | Announcement of a new development or formal release | PUB_DEVELOPER, authorised PUB_AGENCY_REP, PUB_EDITORIAL; verified authority | SRC_DEVELOPMENT; add SRC_EVENT_OCCURRENCE for a dated launch event; AUTH_OWNER/AUTH_REPRESENTATIVE/AUTH_EDITORIAL | G1; Q/S/X | M3; DISC_REPRESENTATION/DISC_TIME_BASIS; CLAIM_DEVELOPMENT | ACT_OPEN_DEVELOPMENT/ACT_REQUEST_DEVELOPMENT_INFORMATION; ACT_COMPARE_UNIT_TYPES/ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_EVENT/RISK_REPRESENTATION | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | Release, pre-launch, and waitlist terms need disclosure policy. |
| `amenity_showcase` | Explains an amenity genuinely connected to a development | PUB_DEVELOPER, authorised PUB_AGENCY_REP, PUB_EDITORIAL; verified authority | SRC_DEVELOPMENT or SRC_UNIT_TYPE; AUTH_OWNER/AUTH_REPRESENTATIVE/AUTH_EDITORIAL | G1; Q/S/X | M3; DISC_REPRESENTATION/DISC_TIME_BASIS; CLAIM_DEVELOPMENT | ACT_OPEN_DEVELOPMENT/ACT_REQUEST_DEVELOPMENT_INFORMATION; ACT_COMPARE_UNIT_TYPES/ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_PROJECT/RISK_REPRESENTATION | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | Distinguish existing, planned, third-party, and off-site amenities. |
| `developer_interview` | Accountable developer perspective on a named project | PUB_DEVELOPER, PUB_EDITORIAL; verified developer or editorial basis | SRC_DEVELOPMENT plus SRC_PROFESSIONAL_PROFILE/SRC_ORGANISATION; AUTH_OWNER/AUTH_EDITORIAL | G1; S/X/L | M3; DISC_REPRESENTATION/DISC_TIME_BASIS; CLAIM_DEVELOPMENT | ACT_OPEN_DEVELOPMENT/ACT_REQUEST_DEVELOPMENT_INFORMATION; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_PROJECT/RISK_REPRESENTATION | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | Interview is not independent validation of claims. |
| `handover_completion_story` | Dated completion or handover account with verified scope | PUB_DEVELOPER, PUB_CONSTRUCTION_PRO, PUB_EDITORIAL; authority/evidence required | SRC_DEVELOPMENT or SRC_VERIFIED_PROJECT; AUTH_OWNER/AUTH_REPRESENTATIVE/AUTH_EVIDENCE/AUTH_EDITORIAL | G1; S/X/L | M3/M4; DISC_REPRESENTATION/DISC_PROJECT_EVIDENCE; CLAIM_DEVELOPMENT/CLAIM_TECHNICAL | ACT_OPEN_DEVELOPMENT/ACT_REQUEST_DEVELOPMENT_INFORMATION; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_PROJECT/RISK_TECHNICAL | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | Buyer consent and defect/quality claims require careful review. |
| `phase_inventory_release` | Update on a specific phase or unit release | PUB_DEVELOPER, authorised PUB_AGENCY_REP; verified authority | SRC_DEVELOPMENT plus SRC_DEVELOPMENT_PHASE; add SRC_UNIT_TYPE where the release concerns unit types; AUTH_OWNER/AUTH_REPRESENTATIVE | G1; Q/S | M3; DISC_REPRESENTATION/DISC_TIME_BASIS; CLAIM_DEVELOPMENT | ACT_COMPARE_UNIT_TYPES; ACT_OPEN_DEVELOPMENT/ACT_REQUEST_DEVELOPMENT_INFORMATION/ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_INVENTORY/RISK_REPRESENTATION | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | Inventory must derive from authoritative availability. |

### 7.4 Location and neighbourhood media

| Stable class | Plain-language definition and viewer value | Eligible publishers [PUB] / verification | Source [SRC] / authority [AUTH] | Geo [GEO] / format [FORMAT] | Metadata [META] / disclosure [DISC] / claims [CLAIM] | Permitted atomic actions | Fresh [FRESH] / risk [RISK] | Placement [PLACE] / phase | Notes and unresolved decisions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `suburb_overview` | Balanced introduction to a suburb’s property and place context | PUB_EDITORIAL, PUB_AGENT, PUB_AGENCY_REP, PUB_APPROVED_CREATOR; verified/approved local boundary | SRC_LOCATION; AUTH_PROFESSIONAL/AUTH_EDITORIAL | G2; S/X/L | M1/M5; DISC_SCOPE; CLAIM_STANDARD | ACT_OPEN_LOCATION; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_LOCATION_MARKET/RISK_STANDARD | PLACE_ORGANIC/PLACE_EDITORIAL/-; V1 candidate | Inventory, price, or market claims require SRC_MARKET_REPORT, canonical inventory, or equivalent governed structured source. |
| `neighbourhood_lifestyle_guide` | Guide to lived experience, amenities, and practical context | PUB_EDITORIAL, PUB_AGENT, PUB_AGENCY_REP, PUB_APPROVED_CREATOR; approved local context | SRC_LOCATION; AUTH_PROFESSIONAL/AUTH_EDITORIAL | G2; S/X/L | M1/M5; DISC_SCOPE; CLAIM_STANDARD | ACT_OPEN_LOCATION; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_LOCATION_MARKET/RISK_STANDARD | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | Do not make safety, school, or demographic claims without policy. |
| `amenity_infrastructure_guide` | Guide to named amenities or infrastructure relevant to a location | PUB_EDITORIAL, PUB_AGENT, PUB_AGENCY_REP, PUB_APPROVED_CREATOR; evidence-based local context | SRC_LOCATION; AUTH_PROFESSIONAL/AUTH_EDITORIAL | G2; S/X | M1/M5; DISC_SCOPE; CLAIM_STANDARD | ACT_OPEN_LOCATION; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_LOCATION_MARKET/RISK_STANDARD | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | Access, operating status, and third-party facts require source dates; price, inventory, or market claims require an additional governed market/inventory source and the relevant claim trigger. |
| `commute_transport_guide` | Practical travel and transport context, not a guarantee of travel time | PUB_EDITORIAL, PUB_AGENT, PUB_AGENCY_REP, PUB_APPROVED_CREATOR; evidence-based local context | SRC_LOCATION; AUTH_PROFESSIONAL/AUTH_EDITORIAL | G2; S/X | M1/M5; DISC_SCOPE; CLAIM_STANDARD | ACT_OPEN_LOCATION; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_LOCATION_MARKET/RISK_STANDARD | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | Live traffic, safety, and public-service claims need separate validation. |
| `local_property_market_update` | Dated explanation of local market conditions | PUB_EDITORIAL, PUB_AGENT, PUB_AGENCY_REP; relevant professional/editorial basis | SRC_LOCATION plus SRC_MARKET_REPORT; AUTH_PROFESSIONAL/AUTH_EDITORIAL | G2; S/X | M5; DISC_SCOPE; CLAIM_INVENTORY/CLAIM_FINANCIAL | ACT_OPEN_LOCATION; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_LOCATION_MARKET/RISK_REPRESENTATION | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | Data source, period, methodology, and uncertainty are mandatory. |
| `budget_in_area` | Explains what a stated budget may access in a named area | PUB_EDITORIAL, PUB_AGENT, PUB_AGENCY_REP; professional/editorial basis | SRC_LOCATION plus SRC_LISTING or SRC_PROPERTY_TOPIC; AUTH_PROFESSIONAL/AUTH_EDITORIAL/AUTH_MULTIPLE | G2; S/X | M2/M5; DISC_TIME_BASIS/DISC_SCOPE; CLAIM_INVENTORY/CLAIM_FINANCIAL | ACT_OPEN_LOCATION; ACT_OPEN_LISTING/ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_LOCATION_MARKET/RISK_REPRESENTATION | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | Must not imply a guaranteed result or fabricate average prices. |
| `area_agent_expertise` | Agent’s accountable local perspective connected to service area | PUB_AGENT, PUB_AGENCY_REP; verified agent and area association | SRC_PROFESSIONAL_PROFILE plus SRC_LOCATION; AUTH_PROFESSIONAL/AUTH_REPRESENTATIVE | G2; Q/S/X | M1; DISC_REPRESENTATION/DISC_SCOPE; CLAIM_STANDARD | ACT_OPEN_PROFESSIONAL_PROFILE/ACT_CONTACT_PROFESSIONAL/ACT_WHATSAPP_PROFESSIONAL; ACT_OPEN_LOCATION/ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_LOCATION_MARKET/RISK_REPRESENTATION | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; V1 candidate | Inventory, price, or market claims require a governed structured source; viewing requires an additional current actionable listing/development and workflow. |
| `city_precinct_story` | Editorial or accountable story about a city or precinct | PUB_EDITORIAL, PUB_AGENT, PUB_AGENCY_REP, PUB_APPROVED_CREATOR; appropriate editorial/approved boundary | SRC_LOCATION; AUTH_EDITORIAL/AUTH_PROFESSIONAL | G2; S/X/L | M1/M5; DISC_SCOPE/DISC_SENSITIVE; CLAIM_STANDARD/CLAIM_PUBLIC_INTEREST | ACT_OPEN_LOCATION; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_LOCATION_MARKET/RISK_STANDARD | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | PC requires enhanced editorial review where civic claims are made. |

### 7.5 Building, architecture, construction, and renovation

| Stable class | Plain-language definition and viewer value | Eligible publishers [PUB] / verification | Source [SRC] / authority [AUTH] | Geo [GEO] / format [FORMAT] | Metadata [META] / disclosure [DISC] / claims [CLAIM] | Permitted atomic actions | Fresh [FRESH] / risk [RISK] | Placement [PLACE] / phase | Notes and unresolved decisions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `house_plan_presentation` | Explains a plan, spatial idea, or approved design context | PUB_ARCHITECT, PUB_DEVELOPER, PUB_EDITORIAL; verified author/authority | SRC_VERIFIED_PROJECT, SRC_DEVELOPMENT, or SRC_PROPERTY_TOPIC; AUTH_EVIDENCE/AUTH_OWNER/AUTH_EDITORIAL | G3/G4; S/X/L | M4/M5; DISC_SCOPE/DISC_PROJECT_EVIDENCE; CLAIM_TECHNICAL/CLAIM_LEGAL | ACT_REQUEST_SERVICE_QUOTE; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_PORTFOLIO_STORY/RISK_TECHNICAL | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | Must distinguish concept, approved plan, and buildable instruction. |
| `architectural_concept_explanation` | Explains an architectural approach or design decision | PUB_ARCHITECT, PUB_EDITORIAL, PUB_APPROVED_CREATOR; approved professional/editorial/creator boundary | SRC_VERIFIED_PROJECT or SRC_PROPERTY_TOPIC; AUTH_PROFESSIONAL/AUTH_EVIDENCE/AUTH_EDITORIAL/AUTH_TOPIC | G3/G4; S/X/L | M4/M5; DISC_SCOPE/DISC_PROJECT_EVIDENCE; CLAIM_TECHNICAL | ACT_REQUEST_SERVICE_QUOTE; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_EDUCATION/FRESH_PORTFOLIO_STORY/RISK_TECHNICAL | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | PC cannot imply architecture credentials. |
| `construction_diary` | Dated account of construction stages for a verified project | PUB_DEVELOPER, PUB_CONSTRUCTION_PRO, PUB_ARCHITECT, PUB_EDITORIAL; project authority/evidence | SRC_DEVELOPMENT or SRC_VERIFIED_PROJECT; AUTH_OWNER/AUTH_REPRESENTATIVE/AUTH_EVIDENCE/AUTH_EDITORIAL | G1/G3; Q/S/X/L | M3/M4; DISC_REPRESENTATION/DISC_PROJECT_EVIDENCE; CLAIM_DEVELOPMENT/CLAIM_TECHNICAL | ACT_OPEN_DEVELOPMENT/ACT_REQUEST_DEVELOPMENT_INFORMATION or ACT_REQUEST_SERVICE_QUOTE; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_PROJECT/RISK_TECHNICAL | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | Site access, worker consent, and safety rules required. |
| `building_cost_explanation` | General explanation of cost drivers or a disclosed estimate basis | PUB_ARCHITECT, PUB_CONSTRUCTION_PRO, PUB_DEVELOPER, PUB_EDITORIAL; `QUAL_COST` contributor/reviewer required for general cost claims | SRC_VERIFIED_PROJECT or SRC_PROPERTY_TOPIC; AUTH_PROFESSIONAL/AUTH_EVIDENCE/AUTH_EDITORIAL/AUTH_TOPIC | G3/G4; S/X | M4/M5; DISC_SCOPE/DISC_ESTIMATE_BASIS; CLAIM_TECHNICAL | ACT_REQUEST_SERVICE_QUOTE; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_EDUCATION/RISK_TECHNICAL | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | Add DISC_PROJECT_EVIDENCE only for a specific verified project; developers may not present project budgets as universal cost guidance. |
| `renovation_case_study` | Evidence-based account of a completed renovation | PUB_ARCHITECT, PUB_CONSTRUCTION_PRO, PUB_SERVICE_PROVIDER, PUB_EDITORIAL; verified project/client permission | SRC_VERIFIED_PROJECT; AUTH_EVIDENCE/AUTH_OWNER/AUTH_EDITORIAL | G3; S/X/L | M4; DISC_PROJECT_EVIDENCE; CLAIM_TECHNICAL | ACT_REQUEST_SERVICE_QUOTE; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_PORTFOLIO_STORY/RISK_TECHNICAL | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | Before/after evidence and client permission are mandatory. |
| `materials_comparison` | Compares materials for a defined use without hidden promotion | PUB_ARCHITECT, PUB_CONSTRUCTION_PRO, PUB_SERVICE_PROVIDER, PUB_EDITORIAL; relevant professional basis | SRC_PROPERTY_TOPIC, SRC_VERIFIED_PROJECT, or SRC_SERVICE_CATEGORY; AUTH_PROFESSIONAL/AUTH_EVIDENCE/AUTH_EDITORIAL | G4; S/X | M4/M5; DISC_COMMERCIAL/DISC_SCOPE/DISC_PROJECT_EVIDENCE; CLAIM_TECHNICAL | ACT_REQUEST_SERVICE_QUOTE; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_EDUCATION/RISK_TECHNICAL | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | Sponsored supplier influence must be disclosed. |
| `interior_design_showcase` | Shows a design outcome and connected professional/service context | PUB_ARCHITECT, PUB_SERVICE_PROVIDER, PUB_EDITORIAL, PUB_APPROVED_CREATOR; portfolio/permission basis | SRC_VERIFIED_PROJECT or SRC_PROFESSIONAL_PROFILE/SRC_SERVICE_CATEGORY; AUTH_EVIDENCE/AUTH_PROFESSIONAL/AUTH_EDITORIAL | G3; Q/S/X | M4; DISC_PROJECT_EVIDENCE; CLAIM_TECHNICAL | ACT_REQUEST_SERVICE_QUOTE; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_PORTFOLIO_STORY/RISK_TECHNICAL | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | PC requires permission and may not imply service credentials. |
| `compliance_approval_education` | General education about approvals or compliance, not case-specific advice | PUB_ARCHITECT, PUB_CONSTRUCTION_PRO, PUB_LEGAL_PRO, PUB_EDITORIAL; qualified scope | SRC_PROPERTY_TOPIC; AUTH_PROFESSIONAL/AUTH_EDITORIAL/AUTH_TOPIC | G4; S/X | M5; DISC_SCOPE; CLAIM_LEGAL | ACT_REQUEST_SERVICE_QUOTE or ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_EDUCATION/RISK_LEGAL | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | Requires qualified South African regulatory review before launch. |

### 7.6 Finance, legal, and property-ownership education

| Stable class | Plain-language definition and viewer value | Eligible publishers [PUB] / verification | Source [SRC] / authority [AUTH] | Geo [GEO] / format [FORMAT] | Metadata [META] / disclosure [DISC] / claims [CLAIM] | Permitted atomic actions | Fresh [FRESH] / risk [RISK] | Placement [PLACE] / phase | Notes and unresolved decisions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bond_affordability_education` | General explanation of affordability or bond concepts | PUB_FINANCE_PRO, PUB_EDITORIAL; `QUAL_FINANCE` contributor/reviewer required | SRC_PROPERTY_TOPIC, optionally SRC_LISTING/SRC_DEVELOPMENT; AUTH_PROFESSIONAL/AUTH_EDITORIAL/AUTH_TOPIC | G4; S/X | M5; DISC_SCOPE; CLAIM_FINANCIAL | ACT_USE_PROPERTY_TOOL; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_EDUCATION/RISK_FINANCIAL | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | Qualified financial and advertising review required. |
| `deposit_preparation` | General education on deposit planning and readiness | PUB_FINANCE_PRO, PUB_EDITORIAL; `QUAL_FINANCE` contributor/reviewer required | SRC_PROPERTY_TOPIC; AUTH_PROFESSIONAL/AUTH_EDITORIAL/AUTH_TOPIC | G4; Q/S/X | M5; DISC_SCOPE; CLAIM_FINANCIAL | ACT_USE_PROPERTY_TOOL; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_EDUCATION/RISK_FINANCIAL | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | No personal suitability promise or undisclosed product promotion. |
| `transfer_cost_education` | General explanation of transfer-cost components | PUB_LEGAL_PRO, PUB_FINANCE_PRO, PUB_EDITORIAL; `QUAL_LEGAL` and `QUAL_FINANCE` contributor/reviewer required as claims dictate | SRC_PROPERTY_TOPIC; AUTH_PROFESSIONAL/AUTH_EDITORIAL/AUTH_TOPIC | G4; S/X | M5; DISC_SCOPE; CLAIM_FINANCIAL/CLAIM_LEGAL | ACT_USE_PROPERTY_TOOL or ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_EDUCATION/RISK_LEGAL | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | Qualified South African legal/financial review required. |
| `conveyancing_education` | General explanation of conveyancing process | PUB_LEGAL_PRO, PUB_EDITORIAL; verified legal/editorial basis | SRC_PROPERTY_TOPIC; AUTH_PROFESSIONAL/AUTH_EDITORIAL/AUTH_TOPIC | G4; S/X | M5; DISC_SCOPE; CLAIM_LEGAL | ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT; ACT_OPEN_PROFESSIONAL_PROFILE/ACT_CONTACT_PROFESSIONAL | FRESH_EDUCATION/RISK_LEGAL | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | No individual legal advice; qualified review required. |
| `property_investment_education` | General discussion of investment concepts and risks | PUB_FINANCE_PRO, PUB_EDITORIAL; `QUAL_FINANCE` contributor/reviewer required | SRC_PROPERTY_TOPIC, optionally SRC_LOCATION/SRC_DEVELOPMENT; AUTH_PROFESSIONAL/AUTH_EDITORIAL/AUTH_TOPIC | G4; S/X/L | M5; DISC_SCOPE; CLAIM_FINANCIAL | ACT_USE_PROPERTY_TOOL or ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_EDUCATION/RISK_FINANCIAL | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | Investment claims, forecasts, and testimonials require qualified review. |
| `rental_yield_explanation` | Explains rental-yield methodology and limitations | PUB_FINANCE_PRO, PUB_EDITORIAL; PUB_AGENT/PUB_AGENCY_REP may contribute local property context only with `QUAL_FINANCE` contributor/reviewer | SRC_PROPERTY_TOPIC, optionally SRC_LISTING/SRC_LOCATION; AUTH_PROFESSIONAL/AUTH_EDITORIAL/AUTH_MULTIPLE | G4/G5; S/X | M5; DISC_TIME_BASIS/DISC_SCOPE; CLAIM_FINANCIAL | ACT_USE_PROPERTY_TOOL or ACT_OPEN_LISTING; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_LOCATION_MARKET/FRESH_EDUCATION/RISK_FINANCIAL | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | Must show assumptions and avoid expected-return promises. |
| `insurance_education` | General education about property-insurance considerations | PUB_FINANCE_PRO, PUB_EDITORIAL; verified basis | SRC_PROPERTY_TOPIC; AUTH_PROFESSIONAL/AUTH_EDITORIAL/AUTH_TOPIC | G4; S/X | M5; DISC_SCOPE; CLAIM_FINANCIAL | ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT; ACT_OPEN_PROFESSIONAL_PROFILE/ACT_CONTACT_PROFESSIONAL | FRESH_EDUCATION/RISK_FINANCIAL | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | Insurance licensing and advertising review required. |
| `first_time_buyer_guidance` | General, stepwise buyer education | PUB_FINANCE_PRO, PUB_LEGAL_PRO, PUB_EDITORIAL; PUB_AGENT/PUB_AGENCY_REP may contribute property-market context only with the relevant `QUAL_FINANCE` or `QUAL_LEGAL` contributor | SRC_PROPERTY_TOPIC, optionally SRC_LOCATION; AUTH_PROFESSIONAL/AUTH_EDITORIAL/AUTH_TOPIC | G4; S/X/L | M5; DISC_SCOPE; CLAIM_FINANCIAL/CLAIM_LEGAL | ACT_USE_PROPERTY_TOOL; ACT_OPEN_LOCATION/ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_EDUCATION/RISK_FINANCIAL | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | Multi-professional content needs clear scope per speaker. |
| `property_tax_ownership_guidance` | General guidance on ownership, tax, or related responsibilities | PUB_LEGAL_PRO, PUB_TAX_PRO, PUB_EDITORIAL; `QUAL_TAX` and/or `QUAL_LEGAL` contributor/reviewer required | SRC_PROPERTY_TOPIC; AUTH_PROFESSIONAL/AUTH_EDITORIAL/AUTH_TOPIC | G4; S/X | M5; DISC_SCOPE; CLAIM_LEGAL | ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT; ACT_OPEN_PROFESSIONAL_PROFILE/ACT_CONTACT_PROFESSIONAL | FRESH_EDUCATION/RISK_LEGAL | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | Tax authority is not assigned to a finance professional by default; requires qualified South African legal/tax review. |

### 7.7 Property services

| Stable class | Plain-language definition and viewer value | Eligible publishers [PUB] / verification | Source [SRC] / authority [AUTH] | Geo [GEO] / format [FORMAT] | Metadata [META] / disclosure [DISC] / claims [CLAIM] | Permitted atomic actions | Fresh [FRESH] / risk [RISK] | Placement [PLACE] / phase | Notes and unresolved decisions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `professional_introduction` | Introduces a verified professional, scope, and service area | PUB_SERVICE_PROVIDER, PUB_ARCHITECT, PUB_CONSTRUCTION_PRO, PUB_FINANCE_PRO, PUB_LEGAL_PRO, PUB_AGENT, PUB_AGENCY_REP, PUB_DEVELOPER; verified profile | SRC_PROFESSIONAL_PROFILE plus SRC_ORGANISATION/SRC_SERVICE_CATEGORY; AUTH_PROFESSIONAL/AUTH_REPRESENTATIVE | G3; Q/S | M1; DISC_REPRESENTATION/DISC_SCOPE; CLAIM_STANDARD | ACT_OPEN_PROFESSIONAL_PROFILE/ACT_CONTACT_PROFESSIONAL/ACT_WHATSAPP_PROFESSIONAL/ACT_REQUEST_SERVICE_QUOTE/ACT_USE_PROPERTY_TOOL; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_LOCATION_MARKET/RISK_REPRESENTATION | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; V1 candidate | Viewing requires an additional current actionable listing/development and workflow; regulated roles must not use approval as credential proof. |
| `service_demonstration` | Demonstrates a defined service and expected process | PUB_SERVICE_PROVIDER, PUB_CONSTRUCTION_PRO, PUB_ARCHITECT; verified provider and service authority | SRC_PROFESSIONAL_PROFILE plus SRC_SERVICE_CATEGORY, optionally SRC_VERIFIED_PROJECT; AUTH_PROFESSIONAL/AUTH_EVIDENCE | G3; Q/S/X | M1/M4; DISC_REPRESENTATION/DISC_PROJECT_EVIDENCE; CLAIM_TECHNICAL | ACT_REQUEST_SERVICE_QUOTE; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_LOCATION_MARKET/FRESH_PORTFOLIO_STORY/RISK_TECHNICAL | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | Safety, access, and service-result claims need policy. |
| `completed_project_case_study` | Shows a verified completed service project | PUB_SERVICE_PROVIDER, PUB_CONSTRUCTION_PRO, PUB_ARCHITECT, PUB_EDITORIAL; portfolio/client permission | SRC_VERIFIED_PROJECT plus SRC_PROFESSIONAL_PROFILE/SRC_SERVICE_CATEGORY; AUTH_EVIDENCE/AUTH_PROFESSIONAL/AUTH_EDITORIAL | G3; S/X/L | M4; DISC_PROJECT_EVIDENCE; CLAIM_TECHNICAL | ACT_REQUEST_SERVICE_QUOTE; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_PORTFOLIO_STORY/RISK_TECHNICAL | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | Before/after, testimonial, and client privacy controls required. |
| `quote_cost_explanation` | General explanation of quote drivers, scope, and exclusions | PUB_SERVICE_PROVIDER, PUB_CONSTRUCTION_PRO, PUB_ARCHITECT; `QUAL_COST` contributor/reviewer required | SRC_SERVICE_CATEGORY or SRC_PROPERTY_TOPIC, optionally SRC_VERIFIED_PROJECT; AUTH_PROFESSIONAL/AUTH_EVIDENCE/AUTH_TOPIC | G3/G4; S/X | M4/M5; DISC_SCOPE/DISC_ESTIMATE_BASIS; CLAIM_TECHNICAL | ACT_REQUEST_SERVICE_QUOTE; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_EDUCATION/RISK_TECHNICAL | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | Add DISC_PROJECT_EVIDENCE only for a specific verified project; must not present a universal quote or conceal exclusions. |
| `inspection_walkthrough` | Explains inspection scope and observable issues in a governed context | PUB_SERVICE_PROVIDER, PUB_CONSTRUCTION_PRO, PUB_EDITORIAL; qualified provider/editorial basis | SRC_SERVICE_CATEGORY, SRC_VERIFIED_PROJECT, or SRC_PROPERTY_TOPIC; AUTH_PROFESSIONAL/AUTH_EVIDENCE/AUTH_EDITORIAL | G3/G4; S/X | M4/M5; DISC_SCOPE/DISC_PROJECT_EVIDENCE; CLAIM_TECHNICAL/CLAIM_LEGAL | ACT_REQUEST_SERVICE_QUOTE; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_EDUCATION/FRESH_PORTFOLIO_STORY/RISK_TECHNICAL | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | Do not represent the content as a formal report or diagnosis. |
| `moving_relocation_guidance` | Practical guidance for moving or relocating | PUB_SERVICE_PROVIDER, PUB_EDITORIAL, PUB_APPROVED_CREATOR; approved service/editorial/creator boundary | SRC_SERVICE_CATEGORY, SRC_LOCATION, or SRC_PROPERTY_TOPIC; AUTH_PROFESSIONAL/AUTH_EDITORIAL/AUTH_TOPIC | G2/G3/G4; Q/S/X | M1/M5; DISC_COMMERCIAL/DISC_SCOPE; CLAIM_STANDARD | ACT_REQUEST_SERVICE_QUOTE or ACT_OPEN_LOCATION; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_LOCATION_MARKET/FRESH_EDUCATION/RISK_STANDARD | PLACE_ORGANIC/PLACE_EDITORIAL/PLACE_SPONSORED; Later | PC may provide experience, not unverified service claims. |
| `security_maintenance_guidance` | General property security or maintenance guidance | PUB_SERVICE_PROVIDER, PUB_CONSTRUCTION_PRO, PUB_EDITORIAL; verified basis | SRC_SERVICE_CATEGORY or SRC_PROPERTY_TOPIC; AUTH_PROFESSIONAL/AUTH_EDITORIAL/AUTH_TOPIC | G3/G4; S/X | M5; DISC_SCOPE; CLAIM_TECHNICAL | ACT_REQUEST_SERVICE_QUOTE; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_EDUCATION/RISK_TECHNICAL | PLACE_ORGANIC/PLACE_EDITORIAL/-; Later | Safety claims and product sponsorship require enhanced review. |

There is no `professional_educational_content` fallback class. Professional educational media must be classified under the substantive class matching what it teaches and the claims it makes—for example `bond_affordability_education`, `compliance_approval_education`, `inspection_walkthrough`, `security_maintenance_guidance`, or `architectural_concept_explanation`. A broad professional identity must never bypass the more specific authority, source, and claims rules.

### 7.8 Future property stories and documentary content

| Stable class | Plain-language definition and viewer value | Eligible publishers [PUB] / verification | Source [SRC] / authority [AUTH] | Geo [GEO] / format [FORMAT] | Metadata [META] / disclosure [DISC] / claims [CLAIM] | Permitted atomic actions | Fresh [FRESH] / risk [RISK] | Placement [PLACE] / phase | Notes and unresolved decisions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `buyer_seller_journey` | Consent-based account of a buyer or seller experience | PUB_EDITORIAL, PUB_AGENT, PUB_AGENCY_REP, PUB_APPROVED_CREATOR; editorial or approved consent basis | SRC_LISTING and/or SRC_LOCATION; AUTH_EDITORIAL/AUTH_MULTIPLE | G1/G2; X/L | M6; DISC_REPRESENTATION/DISC_SENSITIVE; CLAIM_PUBLIC_INTEREST | ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_PORTFOLIO_STORY/RISK_SENSITIVE | PLACE_ORGANIC/PLACE_EDITORIAL/-; Future research | Editorial container is governance only; consent, privacy, outcome claims, and participant vulnerability need policy. |
| `ground_up_construction_story` | Documentary account of a project from early stages through outcome | PUB_EDITORIAL, PUB_DEVELOPER, PUB_CONSTRUCTION_PRO, PUB_ARCHITECT; project authority/editorial evidence | SRC_DEVELOPMENT or SRC_VERIFIED_PROJECT; AUTH_OWNER/AUTH_EVIDENCE/AUTH_EDITORIAL | G1/G3; X/L | M4/M6; DISC_PROJECT_EVIDENCE/DISC_SENSITIVE; CLAIM_DEVELOPMENT/CLAIM_TECHNICAL/CLAIM_PUBLIC_INTEREST | ACT_OPEN_DEVELOPMENT/ACT_REQUEST_DEVELOPMENT_INFORMATION or ACT_REQUEST_SERVICE_QUOTE; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_PROJECT/FRESH_PORTFOLIO_STORY/RISK_SENSITIVE | PLACE_ORGANIC/PLACE_EDITORIAL/-; Future research | Multi-party permissions and safety controls required. |
| `heritage_property_story` | Story about heritage value, place, or stewardship | PUB_EDITORIAL, PUB_APPROVED_CREATOR, PUB_ARCHITECT; editorial/approved expertise | SRC_LOCATION or SRC_VERIFIED_PROJECT; AUTH_EDITORIAL/AUTH_EVIDENCE | G2/G3; X/L | M4/M6; DISC_SCOPE/DISC_SENSITIVE; CLAIM_PUBLIC_INTEREST | ACT_OPEN_LOCATION; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_PORTFOLIO_STORY/RISK_SENSITIVE | PLACE_ORGANIC/PLACE_EDITORIAL/-; Future research | Heritage claims and access rights need specialist validation. |
| `urban_transformation_story` | Documentary about change in a city or precinct | PUB_EDITORIAL, PUB_APPROVED_CREATOR, PUB_ARCHITECT; editorial/approved boundary | SRC_LOCATION; AUTH_EDITORIAL | G2; X/L | M5/M6; DISC_SCOPE/DISC_SENSITIVE; CLAIM_PUBLIC_INTEREST | ACT_OPEN_LOCATION; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_LOCATION_MARKET/FRESH_PORTFOLIO_STORY/RISK_SENSITIVE | PLACE_ORGANIC/PLACE_EDITORIAL/-; Future research | Must avoid speculative, stigmatising, or displacement narratives. |
| `affordable_housing_story` | Documentary on housing affordability or provision | PUB_EDITORIAL, PUB_APPROVED_CREATOR, PUB_DEVELOPER; editorial/evidence basis | SRC_LOCATION, SRC_DEVELOPMENT, or SRC_PROPERTY_TOPIC; AUTH_EDITORIAL/AUTH_MULTIPLE | G2/G4; X/L | M5/M6; DISC_SCOPE/DISC_SENSITIVE; CLAIM_FINANCIAL/CLAIM_PUBLIC_INTEREST | ACT_OPEN_LOCATION; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_LOCATION_MARKET/FRESH_PORTFOLIO_STORY/RISK_SENSITIVE | PLACE_ORGANIC/PLACE_EDITORIAL/-; Future research | Requires fairness, public-interest, and privacy policy. |
| `land_ownership_story` | Documentary on land, ownership, or tenure context | PUB_EDITORIAL, PUB_APPROVED_CREATOR, PUB_LEGAL_PRO; editorial/qualified basis | SRC_LOCATION or SRC_PROPERTY_TOPIC; AUTH_EDITORIAL/AUTH_PROFESSIONAL | G2/G4; X/L | M5/M6; DISC_SCOPE/DISC_SENSITIVE; CLAIM_LEGAL/CLAIM_PUBLIC_INTEREST | ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_EDUCATION/FRESH_PORTFOLIO_STORY/RISK_SENSITIVE | PLACE_ORGANIC/PLACE_EDITORIAL/-; Future research | Requires qualified legal and public-interest review. |
| `diaspora_property_journey` | Story for or about diaspora property decision-making | PUB_EDITORIAL, PUB_APPROVED_CREATOR, PUB_FINANCE_PRO, PUB_LEGAL_PRO; bounded editorial/professional scope | SRC_PROPERTY_TOPIC, optionally SRC_LOCATION; AUTH_EDITORIAL/AUTH_PROFESSIONAL/AUTH_TOPIC | G2/G4; X/L | M5/M6; DISC_SCOPE/DISC_SENSITIVE; CLAIM_FINANCIAL/CLAIM_LEGAL/CLAIM_PUBLIC_INTEREST | ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT; ACT_OPEN_PROFESSIONAL_PROFILE/ACT_CONTACT_PROFESSIONAL | FRESH_EDUCATION/FRESH_PORTFOLIO_STORY/RISK_SENSITIVE | PLACE_ORGANIC/PLACE_EDITORIAL/-; Future research | Cross-border finance, legal, and marketing issues need qualified review. |
| `development_impact_documentary` | Evidence-led story about a development’s community or place impact | PUB_EDITORIAL, PUB_DEVELOPER, PUB_APPROVED_CREATOR; editorial/evidence basis | SRC_DEVELOPMENT plus SRC_LOCATION; AUTH_OWNER/AUTH_EDITORIAL/AUTH_MULTIPLE | G1/G2; X/L | M3/M6; DISC_REPRESENTATION/DISC_PROJECT_EVIDENCE/DISC_SENSITIVE; CLAIM_DEVELOPMENT/CLAIM_PUBLIC_INTEREST | ACT_OPEN_DEVELOPMENT/ACT_REQUEST_DEVELOPMENT_INFORMATION or ACT_OPEN_LOCATION; ACT_FOLLOW_PUBLISHER/ACT_SAVE_CONTENT/ACT_SAVE_SOURCE_OBJECT/ACT_SHARE/ACT_CONTINUE_RELATED_CONTENT | FRESH_PROJECT/FRESH_PORTFOLIO_STORY/RISK_SENSITIVE | PLACE_ORGANIC/PLACE_EDITORIAL/-; Future research | Developer participation cannot substitute for independent evidence. |

## 8. Publisher authority matrix

| Publisher type | Permitted worlds | Restricted content | Organisation affiliation | Source-object authority | Professional or regulated claims | Enhanced moderation |
| --- | --- | --- | --- | --- | --- |
| Property Listify editorial | All seven, subject to editorial container and evidence | Cannot represent advertising as independent editorial; cannot give regulated advice without qualified contributor | Editorial container required | AUTH_EDITORIAL; evidence basis for every linked subject | Only through properly qualified, disclosed contributors | Yes for CLAIM_INVENTORY through CLAIM_PUBLIC_INTEREST and sensitive stories |
| Verified individual agent | 1, 3, limited 5/7 only with qualified co-publisher | Legal/financial advice; developer claims without authority; unverified local statistics | Agent profile; agency affiliation where applicable | AUTH_OWNER/AUTH_REPRESENTATIVE for listings; AUTH_PROFESSIONAL for local expertise | Property representation only within verified scope; no regulated claims | Yes for inventory, price, yield, and local-market claims |
| Authorised agency representative | 1, 3, limited 5/7 with qualified co-publisher | Same as agent; agency branding cannot imply source authority | Recorded agency authorisation | AUTH_OWNER/AUTH_REPRESENTATIVE and AUTH_PROFESSIONAL as applicable | Same as agent | Yes |
| Registered property developer | 1, 2, limited 4/7 | Third-party property claims, regulated advice, independent impact claims without evidence | Verified developer/organisation | AUTH_OWNER/AUTH_REPRESENTATIVE for development and units; AUTH_EVIDENCE for portfolio | Development claims only; no legal/financial authority by default | Yes for launch, progress, inventory, and impact claims |
| Approved architect | 4, 6, limited 3/7 | Financial/legal advice; client project without permission | Verified profile/organisation where relevant | AUTH_PROFESSIONAL/AUTH_EVIDENCE; AUTH_OWNER/AUTH_REPRESENTATIVE for owned/authorised work | Architectural scope only; qualification claims require review | Yes for technical, compliance, and cost claims |
| Approved contractor or construction professional | 2, 4, 6, limited 7 | Financial/legal advice; unverified project or safety guarantees | Verified business/professional | AUTH_PROFESSIONAL/AUTH_EVIDENCE/AUTH_OWNER/AUTH_REPRESENTATIVE as applicable | Construction/service scope only | Yes for safety, cost, progress, and compliance |
| Approved bond or finance professional | 5, limited 3/7 | Legal advice, unapproved products, guaranteed outcomes | Verified organisation/professional basis | AUTH_PROFESSIONAL/AUTH_TOPIC; no listing authority implied | Only within verified financial scope and qualified review | Always for financial, investment, affordability, and insurance claims |
| Approved conveyancer or legal professional | 5, limited 7 | Personal legal advice, tax certainty, representation without engagement | Verified organisation/professional basis | AUTH_PROFESSIONAL/AUTH_TOPIC; no listing authority implied | Only within verified legal scope and qualified review | Always for legal, tax, ownership, and compliance claims |
| Approved property service provider | 4, 6, limited 3/7 | Professional claims outside service scope; unverified portfolio | Verified provider profile | AUTH_PROFESSIONAL/AUTH_EVIDENCE; AUTH_OWNER/AUTH_REPRESENTATIVE for authorised projects | Service claims only; not regulated advice by default | Yes for cost, safety, before/after, and outcome claims |
| Platform-approved property creator | 3, selected 4/6/7, limited 1/2 when co-published or authorised | Professional/regulatory guidance, unsourced property claims, independent listing/development promotion without authority | Optional approved affiliation; not a substitute for credentials | AUTH_TOPIC/AUTH_EDITORIAL/AUTH_PROFESSIONAL only, unless AUTH_OWNER/AUTH_REPRESENTATIVE/AUTH_EVIDENCE independently proven | No, unless separately verified in the relevant profession | Default enhanced review for commercial, factual, and sensitive material |
| PUB_TAX_PRO (future) | Limited world 5, within verified tax scope | Not an automatic V1 publisher; no legal/financial claims outside verified scope | Verified specialist affiliation required | AUTH_PROFESSIONAL/AUTH_TOPIC only | Tax claims require QUAL_TAX and qualified review | Always |
| PUB_COST_PRO (future) | Limited worlds 2/4, within verified cost scope | Not an automatic V1 publisher; no universal cost guarantee | Verified specialist affiliation required | AUTH_PROFESSIONAL/AUTH_EVIDENCE | Cost claims require QUAL_COST | Always |
| PUB_VALUER (future) | Limited valuation education within verified scope | Not an automatic V1 publisher; no unsupported value estimate | Verified specialist affiliation required | AUTH_PROFESSIONAL/AUTH_TOPIC | Valuation claims require QUAL_VALUATION | Always |
| Ordinary consumer or homeowner | None for direct public publication | All direct public Explore publishing | Not applicable | Not applicable | No | May contribute only through PUB_EDITORIAL or a verified/approved publisher with documented consent and responsibility |

## 9. Source-object linkage rules

1. Listing and rental classes require one actionable **SRC_LISTING** source object. A comparison may reference multiple listings, each with its own authority and freshness state.
2. Development classes require **SRC_DEVELOPMENT**; unit, phase, and inventory classes additionally require **SRC_UNIT_TYPE** and/or **SRC_DEVELOPMENT_PHASE**. A project may not be represented as available merely because media exists.
3. Open-home previews and launch events should reference **SRC_EVENT_OCCURRENCE** as well as their listing or development. Event truth must not live only in media metadata.
4. Location classes require **SRC_LOCATION**. They may additionally link a listing, development, market report, or property topic, but a location story must not derive market facts from engagement counters or video metadata. A local market update requires **SRC_MARKET_REPORT**.
5. Architecture, construction, renovation, and service classes require a verified project, professional profile, service category, service offering where the Context Graph proves it distinct, or property topic. A portfolio claim requires AUTH_EVIDENCE and the relevant permission; a topic-only explanation requires the correct professional scope.
6. Finance, legal, and ownership education may be **SRC_PROPERTY_TOPIC**-linked without listing or development when it is genuinely general education. Property-tool education may additionally concern **SRC_PROPERTY_TOOL**. The content must not then promise a listing-specific or personalised action.
7. Documentary classes require one or more real subject objects and an editorial container relationship where applicable; an editorial container is never the sole subject. Sensitive stories require documented consent and evidence context.
8. Every contact, WhatsApp, viewing, quote, development-information, or tool CTA requires an accountable recipient or functional tool connected to the source object. Otherwise only non-conversion actions such as `ACT_SAVE_CONTENT`, `ACT_FOLLOW_PUBLISHER`, `ACT_SHARE`, or `ACT_CONTINUE_RELATED_CONTENT` are allowed.

## 10. Metadata and disclosure requirements

The M/D/C bundles in Section 7 are minimum policy requirements. Future implementation must preserve them as distinct concerns rather than flattening them into an untyped caption field.

At minimum, every content asset needs an accountable publisher entity, publishing organisation where applicable, human operator, represented professional where applicable, credited creator, source-object references, content class, content world, topics, geographic relevance, media-rights attestation, disclosure state, publication/review date, and moderation state. Claim-bearing classes additionally need the timestamp, evidence/source basis, qualified-contributor requirement, and where relevant, estimate methodology or scope limitations.

Sponsored or commercially influenced media requires DISC_COMMERCIAL even when it is also accurate, useful, or organically eligible. A sponsor, advertiser, partner, or product relationship must not be hidden in metadata inaccessible to viewers.

Synthetic, rendered, simulated, virtually staged, or materially altered media requires a viewer-facing `DISC_SYNTHETIC_MEDIA` disclosure. Viewers must be able to distinguish real current footage, model units, artist impressions, illustrative plans, virtual staging, simulated future-state development media, AI-generated scenes, and AI voice or likeness. `DISC_PROJECT_EVIDENCE` remains limited to portfolio, before-and-after, project evidence, and client-permission concerns. None may be presented as the current physical condition of a property or development when it is not.

## 11. Claims and trust classification

| Claim category | Minimum policy requirement | Qualified review requirement |
| --- | --- | --- |
| Price and availability | Canonical subject state, timestamp, currency/term basis, and accountable authority | Property/advertising policy validation required |
| Ownership or representation | Recorded AUTH_OWNER or AUTH_REPRESENTATIVE authority and disclosed relationship | Escalate disputed or unclear authority |
| Development progress | Dated evidence, development/phase linkage, and stated scope | Construction/development policy validation required |
| Building-cost estimates | Basis, exclusions, date, geography, and uncertainty | Qualified construction/cost and legal review required |
| Investment return or rental yield | Methodology, assumptions, risk, date, and no guaranteed outcome | Qualified financial and advertising review required |
| Valuation or value estimate | Governed valuation methodology; effective or observation date; property and data basis; limitations and uncertainty; `CLAIM_VALUATION` | Mandatory `QUAL_VALUATION` and qualified South African valuation, advertising, and consumer-protection review required |
| Legal information | General-information boundary and qualified speaker | Qualified South African legal review required |
| Financial guidance | General-information boundary, verified scope, and no personal recommendation unless separately authorised | Qualified South African financial/regulatory review required |
| Professional credentials | Verifiable basis, role, and organisation where applicable | Credential/verification policy validation required |
| Sponsored or commercially influenced content | Clear viewer-facing disclosure and sponsor/relationship record | Advertising and consumer-protection review required |
| Before-and-after or portfolio claims | Project evidence, client/owner permission, and scope of work | Privacy, advertising, and evidence review required |
| Copyright and media rights | Rights attestation for video, music, images, likenesses, and third-party material | Rights/takedown policy validation required |
| Synthetic, rendered, staged, or altered media | Viewer-facing distinction between real footage, model unit, artist impression, virtual staging, simulation, and AI-generated/altered material | Advertising, consumer-protection, privacy, and rights review required |
| Community and location claims | Evidence, source date, balanced scope, and no discriminatory, exclusionary, stigmatising, or unsupported safety/school/demographic claim | Qualified housing, equality, privacy, advertising, and consumer-protection review required |

Explore must not rank, publish, or commercially target housing content in ways that promote unlawful discrimination, exclusion, or unsupported claims about communities. These requirements do not purport to state South African law. They identify where qualified legal, financial, professional, advertising, privacy, equality, consumer-protection, property-regulatory, or operational review is required before launch.

| Claim family | Required qualified contributor, reviewer, or co-publisher |
| --- | --- |
| Financial, investment, affordability, bond, insurance, or yield | `QUAL_FINANCE`; an agent or developer may provide only clearly bounded property context |
| Legal, conveyancing, ownership, compliance, or regulatory interpretation | `QUAL_LEGAL`; use `QUAL_TAX` as well where tax guidance is material |
| Tax | `QUAL_TAX`; a legal contributor may also be required where ownership/legal interpretation is material |
| Construction-cost or broad cost estimate | `QUAL_COST`; project-specific developer/contractor figures must not be framed as universal guidance |
| Valuation or value estimate | `QUAL_VALUATION`; this is a future specialist authority, not an agent/developer shortcut |
| Technical, architectural, building, safety, or inspection claim | `QUAL_TECHNICAL` with the relevant qualified scope; `QUAL_MULTI` where multiple families apply |

## 12. Calls-to-action matrix

Each catalogue row is authoritative for that class's permitted atomic actions. Section 12 defines the universal truth, permission, measurement, and attribution conditions for those actions.

| Atomic action | Truthful only when | Eligible class groups |
| --- | --- | --- |
| `ACT_OPEN_LISTING` | A current SRC_LISTING is publicly actionable | Listing walkthrough, teaser, rental, commercial, land, comparison, price update, budget-in-area |
| `ACT_OPEN_DEVELOPMENT` | A current SRC_DEVELOPMENT exists | Development overview, construction update, launch, amenity, interview, handover, impact documentary |
| `ACT_COMPARE_UNIT_TYPES` | Current SRC_DEVELOPMENT and SRC_UNIT_TYPE sources exist | Unit walkthrough, phase/inventory release, development overview |
| `ACT_OPEN_LOCATION` | A canonical SRC_LOCATION exists | All location classes; relevant documentary and education content |
| `ACT_OPEN_PROFESSIONAL_PROFILE` | A verified, accountable professional profile is connected | Area-agent expertise, professional introduction, listing and service classes where relevant |
| `ACT_OPEN_ORGANISATION_PROFILE` | A verified accountable organisation is connected | Agency/developer/service-provider published content where relevant |
| `ACT_CONTACT_PROFESSIONAL` | A permissioned accountable recipient and contact workflow exist | Listing, area-agent, professional introduction, service classes |
| `ACT_WHATSAPP_PROFESSIONAL` | A permissioned accountable recipient has opted into the channel | Same as contact; never implied merely by public publishing |
| `ACT_REQUEST_VIEWING` | Listing/development source, availability, and viewing recipient/workflow are current | Listing, rental, commercial, land, selected development classes |
| `ACT_REQUEST_DEVELOPMENT_INFORMATION` | A current development recipient exists | Development overview, launch, unit walkthrough, inventory release |
| `ACT_REQUEST_SERVICE_QUOTE` | Verified provider, service offering/category, and quote workflow exist | Service demonstration, case study, cost explanation, inspection, architecture content |
| `ACT_USE_PROPERTY_TOOL` | A real SRC_PROPERTY_TOOL exists and content has the necessary qualified scope | Bond, deposit, first-time-buyer, investment, yield, valuation/tool education |
| `ACT_FOLLOW_PUBLISHER` | Publisher and relationship policy permit it | Any approved public class |
| `ACT_SAVE_CONTENT` | The content asset is publicly saveable | Any approved public class |
| `ACT_SAVE_SOURCE_OBJECT` | A saveable source object exists | Listing, development, location, provider, organisation, and tool-linked classes |
| `ACT_SHARE` | Privacy, rights, and sharing policy permit it | Any approved public class |
| `ACT_CONTINUE_RELATED_CONTENT` | Related items satisfy relevance and trust policy | Any approved public class |

## 13. Format and duration guidance

Formats Q, S, X, L, and LV describe presentation only. A short clip does not lower a class’s claims, disclosure, authority, or moderation requirements. A long-form video does not automatically justify a broader claim.

LV is excluded from the preliminary V1 candidate set until live moderation, identity confirmation, replay retention, event safety, rights, and escalation policy are proven. Video orientation is a presentation choice; it must not create a separate content class.

## 14. Freshness and expiry

Freshness follows the source-object and claim lifecycle, not upload time alone. Inventory or event media must be suppressed when price, availability, event, or authority changes. Development updates must be reviewed against milestones. Market and location items require a stated observation period and review date. Evergreen education needs periodic review. Portfolio and documentary content remains available only while permissions, links, and claims remain valid.

Moderation approval is not permanent. Re-review is required after a material change to media, transcript or voiceover, caption, source object, price, availability, publisher affiliation, credentials, disclosures, sponsor, CTA, claim methodology, construction/development status, or any fact that changes the item’s truthfulness, authority, or audience understanding.

## 15. Moderation risk tiers

| Tier | Meaning | Examples |
| --- | --- | --- |
| RISK_STANDARD | Standard factual, rights, and community-quality review | Suburb overview, moving guidance |
| RISK_REPRESENTATION | Representation, commercial, inventory, or market-context review | Listing walkthrough, developer overview, area-agent content |
| RISK_TECHNICAL | Technical, construction, service, safety, or portfolio review | Construction diary, inspection walkthrough, renovation case study, building-cost explanation |
| RISK_FINANCIAL | Financial, affordability, investment, insurance, or estimate review | Bond education, rental-yield explanation |
| RISK_LEGAL | Legal, tax, ownership, or compliance review | Conveyancing education, tax guidance, compliance education |
| RISK_SENSITIVE | Privacy, sensitive-story, public-interest, or vulnerable-person review | Buyer journey, land ownership story, affordable-housing documentary |

Risk tiers define review intensity and escalation needs, not an automated moderation implementation or a substitute for qualified advice.

## 16. Organic, editorial, and sponsored eligibility

The placement codes in the catalogue are eligibility ceilings, not delivery promises.

- **Organic** requires current source linkage, authority, quality, and relevance.
- **Editorial** requires an accountable editorial container and disclosed editorial judgement.
- **Sponsored** requires all organic trust requirements plus sponsor eligibility, viewer-facing disclosure, commercial approval, and reliable reporting. It may not silently alter organic ranking.

The preliminary V1 candidate set does not include sponsored placement as a foundational capability. Sponsored distribution, creator income, and referral economics depend on attribution and operational readiness not assumed here.

Sponsored location content remains a founder and commercial-policy question. The preliminary recommendation is that canonical neutral location overviews remain organic/editorial by default; promotional local-agent content belongs in `area_agent_expertise`; and sponsor-funded editorial containers require clear disclosure and genuine editorial independence. Paid boosting of supposedly neutral location facts should be treated cautiously.

## 17. Preliminary V1 candidate assessment

This is a prioritisation hypothesis, not the final V1 boundary. Candidates are classes with a comparatively direct path to canonical source objects, accountable publishers, useful actions, and manageable freshness. Every candidate remains conditional on the current-state remediation work making the connected source, action, moderation, and attribution truthful.

| Preliminary group | Candidate classes | Why it may be suitable | Dependencies and cautions |
| --- | --- | --- | --- |
| Core proof candidates | Listing walkthrough; development overview; unit-type walkthrough; suburb overview; area-agent expertise | Together demonstrate the property-media graph: publisher, real subject, place, trust, and action | Requires reliable listing, development/unit, location, profile, contact, and moderation foundations |
| Conditional candidates | Listing highlight teaser; rental tour; price/availability update; professional introduction | Valuable but more dependent on inventory freshness, provider infrastructure, or operational supply | Requires authoritative source state, truthful action paths, and role/affiliation verification |
| Deferred classes | All remaining classes, including finance/legal education, construction, cost, compliance, broad services, live, and documentary stories | Valuable but higher claim, moderation, rights, or operating complexity | Require qualified review, supply validation, and reliable tools/recipients before selection |

This grouping does not establish final V1 scope. Final selection belongs in `05-explore-v1-capability-boundary.md`.

## 18. Rejected or deferred content patterns

The following are not approved classes in this taxonomy:

- undifferentiated “user video” or generic lifestyle uploads;
- anonymous reviews, unverified rumours, gossip, or conflict-driven commentary;
- a standalone “viral challenge,” dance, or trend class unrelated to a governed property subject;
- price, market, safety, legal, or financial claims derived from engagement counters, media metadata, or AI inference alone;
- imported or cross-posted media without rights, accountable publisher, source linkage, and disclosures;
- unlabelled paid promotion, pay-to-rank content, or content that promises a nonexistent recipient/action; and
- an in-app licensed music catalogue for V1. Creators remain responsible for rights in completed uploads.

## 19. Open questions requiring validation

| Area | Question | Validation owner/type |
| --- | --- | --- |
| Founder/product | Which preliminary candidates best express the launch promise without diluting trust? | Founder decision after supply and journey evidence |
| Market/supply | Which South African agents, agencies, developers, architects, and providers can reliably supply each candidate class? | `04-explore-south-african-supply-validation.md` |
| Operations | What review turnaround, evidence collection, takedown, and escalation capacity exists for RISK_STANDARD through RISK_SENSITIVE? | Moderation and operations design |
| Legal/regulatory | What exact South African rules apply to property advertising, financial promotions, legal information, professional credentials, privacy, copyright, and consumer disclosures? | Qualified legal/regulatory review |
| Identity | What evidence proves agent, developer, architect, contractor, finance, legal, and service-provider authority and affiliation? | Trust and identity policy |
| Source truth | Which listing, development, location, profile, service, project, and tool records are canonical and publicly actionable? | Property Context Graph and current-state remediation |
| Commercial | Which sponsored relationships, labelling, targeting, reporting, and billing rules are acceptable? | Commercial policy after attribution readiness |
| UX | Which action labels accurately describe the recipient, expected response, and privacy consequences? | Journey and consent design |
| Media | What processing, accessibility, rights, retention, live-safety, and storage capability is available? | Media and operational validation |

## 20. Non-negotiable rules for future schema and API work

1. Do not model Explore as an undifferentiated collection of videos.
2. Persist or reliably derive content class, content world, accountable publisher, authority basis, source-object references, disclosure state, claim/review requirements, freshness state, and placement policy separately.
3. Enforce publisher authority per class; do not let a broad user role publish every class.
4. Require canonical source linkage wherever a real subject exists. Topic-only content must be explicitly classified as such.
5. Do not equate platform-approved creators with professionals or regulated advisers.
6. Do not expose a conversion CTA without a real source object, permissioned recipient or tool, and attributable event contract.
7. Keep format and duration independent from content meaning and trust policy.
8. Keep organic, editorial, and sponsored placement structurally separate. Commercial payment never bypasses trust requirements.
9. Preserve enough source, claim, and review context to support expiry, correction, reporting, takedown, and attribution.
10. Use this taxonomy before choosing tables, enums, routers, ranking features, or migration plans.

## 21. Relationship to the Property Context Graph document

`02-explore-property-context-graph.md` must formalise the entities and relationships required by this taxonomy: publisher and organisation identity; professional verification and approval; source objects; content assets; Discovery items; placements; engagement; actions; leads; outcomes; disclosures; and authority/evidence relationships.

The graph document must not erase the distinctions in Sections 4, 6, 7, and 9 for storage convenience. It must show how one content asset can concern multiple subjects, how one source object can support many assets, and how a placement or conversion does not redefine the underlying asset or source truth.

## 22. Non-negotiable outcomes

Future Explore work must preserve these outcomes:

- publisher authority differs by content class;
- source-object linkage is mandatory where a canonical subject exists;
- professional and regulated claims require the correct authority and qualified review;
- platform-approved creators are not automatically professionals;
- calls to action depend on real connected subjects and accountable recipients;
- commercial placement does not override trust requirements;
- video format does not determine content meaning; and
- this taxonomy precedes schema design.
