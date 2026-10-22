# Property Listify Services V2 Product Contract

**Status:** Active product direction for the Services vertical
**Owner:** Edward (product decisions) / product engineering (delivery)
**Relationship to V1:** `services-v1-product-contract.md` remains the
authority for the published Services surface. **This document does not amend,
weaken, or supersede it.** Where the two disagree, V1 governs behaviour that
is already shipped, and this contract records the approved direction for what
comes next.

**Disposition:** `SERVICES V2 — APPROVED MVP IN DELIVERY`

## 1. Why V2 exists

The Services V1 contract delivered a working, contract-governed directory and
enquiry handoff: provider identity, reviewed publication, six service
categories, listed coverage, an attributable one-to-one request, a lead
lifecycle, and a super-admin review queue. The engine is sound.

What V1 did not deliver is a *product*. A consumer landing on `/services` met
a functional form and a list of rows. The V2 direction is that Services
becomes a first-class destination inside Property Listify with its own visual
identity, that a consumer can find a provider in three taps without
understanding the wider ecosystem, and that Services eventually participates
in the property journey rather than sitting beside it.

Reference points, as approved:

- **Angi** — the provider experience: a business with a public presence, clear
  services, coverage, and a prominent enquiry action.
- **Thumbtack** — the discovery and lead-generation mechanic: category plus
  location, a short path to a real request.
- **Property Listify's own design language** — the final product should feel
  like the platform, not a bolt-on.

## 2. The three connected journeys

Services is one product expressed through three journeys. They must feel
connected without requiring the consumer to understand the whole ecosystem.

1. **Discover a service.** A consumer chooses a service, optionally an area,
   compares credible providers, and contacts the right business.
2. **Present a professional business.** Every provider has a polished public
   presence: services, listed coverage, verification, business details, and a
   prominent enquiry action.
3. **Connect Services to property journeys.** A consumer viewing a property,
   an agent preparing a listing, or an owner improving a home can reach
   relevant providers where that context genuinely helps.

**Journey 1 must work excellently on its own.** It is not permitted to depend
on journeys 2 or 3 being understood first.

## 3. Decision register

These are the approved product decisions. They are recorded here so the
implementation does not return for them.

### 3.1 Business model

**Decision: launch with a free, controlled pilot cohort while the commercial
model is validated.**

No paid placement, no lead fees, no provider subscriptions, and no territory
exclusivity until the proposition and the customer-acquisition economics have
been researched and approved by Edward.

**Architecture constraint:** the platform must not prevent a suitable
commercial model from being introduced later. This means the service provider
schema must continue to carry an explicit entitlement surface — the existing
`service_provider_subscriptions` status and tier columns, and the
`SERVICE_PROVIDER_SUBSCRIPTION_TIER_VALUES` vocabulary — even while no tier
is sold and no entitlement is granted by the publication transition.

**What this forbids in the delivered product:** presenting a plan, price, tier
badge, sponsored placement, or "featured" ordering to a consumer or a
provider. A curated cohort is selected by the platform, not by payment.

### 3.2 Provider website experience

**Decision: platform-hosted provider mini-sites are the preferred initial
direction.** Each provider has one professional public-facing mini-site under
Property Listify, carrying its own identity, services, coverage, business
information, and enquiry actions.

`client/src/pages/AgentMicrosite.tsx` is the approved architectural and
design reference. It is a reference, not a template to copy blindly: the
Services mini-site must obey the Services contract, not the agent contract.

**Multi-branch and multi-site management is deferred.** Multi-site is a schema
change and must not be introduced before the actual requirements are
established from real provider behaviour. One provider, one site, first.

### 3.3 Ratings, reviews and trust

**Decision: the V2 contract explicitly considers ratings and customer
reviews.** They are no longer treated as permanently prohibited. The
constraint is not whether ratings are permitted; it is what may honestly be
claimed.

Any future public review surface must satisfy all of the following before it
ships:

1. **Authorship.** A review must be attributable to a real consumer account
   that made a real, recorded request to that provider. The evidence of a
   request is the existing `service_leads` row and its `service_lead_events`
   history, not a client assertion.
2. **Completion standard.** A review may only be presented as a review of
   *service received* when the lead reached a terminal state that represents
   fulfilment — `won` or `lost` with a provider response. The platform must
   not imply a customer completed a transaction when it only recorded an
   enquiry.
3. **Moderation and reporting.** A review requires moderation, reporting, and
   an abuse path before it is publicly visible.
4. **Aggregation.** Any aggregate rating or review count must be recomputed
   from the published, moderated review set and must never be stored as an
   independently editable value.
5. **Transparency.** A published review count must equal the number of
   published reviews.

**MVP implementation (2026-10-22).** The evidence standard is now implemented
against the existing review and lead tables, without a schema change:

- Authorship is the authenticated `reviewerUserId`.
- Completion is a `service_leads` row for the same provider and reviewer in a
  terminal `won` or `lost` state.
- Aggregation is recomputed inside the submission transaction from published
  reviews and written back to `service_provider_profiles.averageRating` and
  `reviewCount`; the values are never accepted from the client.
- Transparency is preserved because only published reviews are counted.
- A reviewer may submit one review per provider.

**Remaining gaps before broad launch:** moderation, reporting, and an abuse
path are not yet implemented. Reviews publish immediately after the terminal
request check. Until those controls exist, the surface must continue to say
that reviews are limited to customers with a completed or closed request, and
must not imply that the platform has independently moderated the wording.

**Until the remaining standard is implemented, the platform must not display
invented ratings, fabricated review counts, or star averages anywhere in the
Services surface.** The canonical platform badge remains **Platform verified**,
backed by partner verification state.

### 3.4 Explore integration

Explore integration is **approved as a subsequent discovery channel** and is
**not** in the current delivery slice. When it proceeds, the Services server
exposes only a published provider projection — provider identity, business
name, service category, service description, listed coverage, public profile
URL, verification state. Explore must never read provider contact fields,
service leads, request notes, or provider response events.

### 3.5 Property journey connection

The `agent_dashboard` source surface and intent stage are already implemented
and role-gated on the server. The V2 direction is to expose that capability
on an agent surface **where it genuinely improves the relevant property
journey**, and to leave the property detail page alone until the prospect
journey contract is deliberately amended.

## 4. Scope of this contract

### 4.1 Existing, verified functionality

This is real, shipped, and contract-governed. It is preserved.

| Capability | Authority |
| --- | --- |
| Provider identity linked 1:1 to `partners` and `users` | `partners`, `service_provider_profiles` |
| Provider public profile (headline, biography, website, contact) | `service_provider_profiles` |
| Service catalogue with per-provider service codes and ZAR price ranges | `service_provider_services` |
| Listed coverage (province, city, suburb) | `service_provider_locations` |
| Subscription status vocabulary (trial, active, past due, cancelled) | `service_provider_subscriptions` |
| Reviewed, fail-closed, audited publication transition | `reviewProviderPublication` |
| Public directory search and deterministic ordering by provider name | `directorySearch` |
| Public provider profile and published-feedback read models | `getProviderPublicProfile`, `getProviderReviews` |
| One-to-one attributable request with idempotent request identity | `createLeadFromJourney`, `service_leads.request_id` |
| Request lifecycle and provider response events | `service_lead_events` |
| Super-admin publication review worklist | `listProviderPublicationQueue` |

### 4.2 Approved MVP requirements

In scope for the current delivery slice.

| # | Requirement | Notes |
| --- | --- | --- |
| MVP-1 | A premium Services landing page with category-led search, in the approved Services visual language | Consumer journey 1 |
| MVP-2 | A provider results experience with the filters the backend actually supports | No invented filters |
| MVP-3 | A provider detail page presenting services, listed coverage, business details, and one prominent enquiry action | Consumer journey 2 |
| MVP-4 | A mobile-first treatment across every Services consumer surface | |
| MVP-5 | Enquiry conversion: a clear, low-friction path from a provider to a request | |
| MVP-6 | The agent referral handoff exposed on an agent surface where it genuinely helps, available with or without Launch Access | Server capability already exists |
| MVP-7 | A documented provider mini-site content and capability specification | Specification, not build |
| MVP-8 | Verified-request ratings and reviews with recomputed aggregates | Existing review and lead tables; moderation follow-up |
| MVP-9 | Price-range and accepting-requests filters plus relevance, rating and name sorts | `service_provider_services`, profile metadata, `directorySearch` |
| MVP-10 | Provider photos and galleries supplied from provider metadata | Existing `partners.logoUrl` and profile metadata |

### 4.3 Proposed features requiring implementation

Approved as *direction*. **Not** in the current slice. Each needs its own
requirement, contract, and — where it touches the database — its own Database
Authority workstream.

| # | Proposal | Dependency |
| --- | --- | --- |
| PROP-1 | Platform-hosted provider mini-site as a distinct surface | Provider content model; imagery; own SEO; own navigation |
| PROP-2 | Public customer reviews and a rating signal | **MVP shipped** with terminal-request verification and transactionally recomputed aggregates; moderation, reporting and abuse controls remain |
| PROP-3 | Price-range and availability filtering in the results rail | **MVP shipped** server-side; availability is a provider-declared `accepting`/`waitlist` metadata value, not a calculated capacity |
| PROP-4 | Provider galleries and project imagery | **MVP shipped** as provider-supplied gallery URLs in profile metadata and `partners.logoUrl`; a moderated media library remains the durable model |
| PROP-5 | Explore feed entry for published providers | Section 3.4 boundary; Explore ranking is explicitly out of scope |
| PROP-6 | Multi-branch providers with a site per branch | Schema change; deferred until requirements are evidenced |
| PROP-7 | Commercial model — any paid tier, placement, or lead fee | Section 3.1; requires research and Edward's approval |

### 4.4 Decisions open pending research

| # | Open question | Owner |
| --- | --- | --- |
| OPEN-1 | What makes a provider maintain a profile, and what would make participation worth paying for | Product + research |
| OPEN-2 | Which revenue model works in South Africa without undermining consumer trust | Product + research |
| OPEN-3 | The evidence standard for public reviews, including moderation, reporting, and abuse prevention | Product + trust review |
| OPEN-4 | Whether the provider mini-site is the acquisition surface or a conversion surface | Product |
| OPEN-5 | How Services complements agent, agency, and developer commercial models | Product |

## 5. Boundaries this workstream must not cross

- No schema change, no migration, and no Drizzle model change in this slice.
  Anything requiring one is a separate Database Authority workstream.
- No weakening of the reviewed publication transition, its fail-closed
  readiness gate, or its audit record.
- No change to the public directory's eligibility conjunction. A provider
  appears because it is verified, active, published, subscribed, and has a
  service and coverage — not because it paid.
- No unlabelled ordering. The directory exposes explicitly named sorts:
  `relevance`, `rating`, `newest`, and `name`. `relevance` is deterministic and
  documented: service-count coverage, declared procurement intent, and profile
  completeness. The surface must never imply a paid or opaque ranking.
- No invented ratings, review counts, availability, response times, insurance
  status, qualifications, or years in business. A provider's public surface
  may state only what the provider has actually published and what the
  platform has actually verified. Availability is provider-declared metadata,
  not a booking capacity calculation.
- No paid placement, plan, or tier in any consumer or provider surface.
- No change to the V1 contract by implication. If the delivered UI requires a
  V1 behaviour change, that change is raised as an explicit V1 amendment.
- No agent, agency, or developer commercial lifecycle semantics change.
- No Explore ranking, engagement, or publishing mutation.

## 6. Provider mini-site specification

**Status:** approved specification. **Not** an approved build. Building it
requires the schema work in section 6.3.

The mini-site is the approved direction (section 3.2). This section records what
a provider mini-site must contain and what backend capability each element
needs, so the build can be scoped later without re-deciding the product.

### 6.1 Shape

A provider mini-site is a distinct public surface under Property Listify with
its own identity, navigation, and SEO, structurally parallel to
`client/src/pages/AgentMicrosite.tsx`. It is not a second copy of the provider
profile page, and it does not become a second authority for trust, contact, or
service data.

| Region | Content | Source of truth today | New capability needed |
| --- | --- | --- | --- |
| Identity | Business name, headline, logo, verification state | `partners`, `service_provider_profiles` | None |
| Navigation | Home, Services, About, Contact | — | Mini-site route and section state |
| Hero | Business summary, primary service, one enquiry action | `service_provider_profiles`, `service_provider_services` | None |
| Service set | Each published service with description and price range | `service_provider_services` | None |
| Coverage | Listed coverage areas | `service_provider_locations` | None |
| Credentials | Published biography, business details, external website | `service_provider_profiles` | None |
| Imagery | Provider logo, cover imagery, project imagery | `partners.logoUrl` only | **Provider media library** — new table, new upload path, new ownership and moderation rules |
| Case studies | Completed project narratives with images | None | **New content model** — a project entity, its media, and its publication state |
| Enquiry | One request action, routed to the existing request authority | `createLeadFromJourney` | None |
| SEO | Own title, description, canonical path, social card | — | Mini-site route, per-provider canonical path, own `applySeo` call |

### 6.2 What it must not become

- It must not display ratings or review counts unless they are produced by the
  section 3.3 verified-request review implementation, and must not add any
  trust signal beyond **Platform verified** and those computed aggregates.
- It must not display a plan, price, tier badge, or placement advantage. A
  provider site is a presence, not an advert.
- It must not expose private provider contact fields to a visitor. The enquiry
  action is the only route to contact, exactly as in the directory.
- It must not create a second request authority. A mini-site enquiry is the
  same `service_leads` row with the same idempotent request identity.
- It must not become a general "profile engine" that owns listings,
  developments, service requests, or trust decisions.

### 6.3 Capability delta

| # | Capability | Type | Notes |
| --- | --- | --- | --- |
| MINI-1 | Provider media library | Schema | Images belong to the provider, with ownership, moderation status, ordering, and a primary cover |
| MINI-2 | Provider case study content model | Schema | Narrative plus media, publication state, and display order |
| MINI-3 | Mini-site route and navigation | Code | Own route family, own section state, own SEO and canonical path |
| MINI-4 | Mini-site enquiry wiring | Code | Reuse the existing request authority; carry the mini-site surface as the attribution source |
| MINI-5 | Multi-branch sites | Schema | **Deferred.** Requires evidenced requirements from real provider behaviour first |

MINI-1, MINI-2, and MINI-5 are schema work and therefore each require their own
Database Authority workstream. MINI-3 and MINI-4 are code work against the
existing model.

### 6.4 Sequencing

1. Build MINI-3 and MINI-4 against the data that exists today. This gives a
   provider a real, ownable page immediately, with no schema change, and lets
   real provider behaviour inform whether imagery and case studies are worth
   the schema cost.
2. Only then scope MINI-1 and MINI-2, informed by what providers actually try
   to publish.
3. Only then consider MINI-5.

This sequence keeps the schema decision evidence-led and avoids a migration
built on an assumption.

## 7. Definition of done for the current slice

1. The six consumer Services surfaces present the approved visual language and
   remain fully functional against the existing backend.
2. Every filter offered on the consumer surface is one the backend actually
   supports. Unimplemented filters are absent, not simulated.
3. Every trust signal shown is backed by canonical state. Ratings and review
   counts come only from the verified-request review implementation; there
   are no fabricated counts.
4. The agent referral handoff is reachable from an agent surface and is
   recorded with the correct source surface and intent stage.
5. The provider mini-site specification is recorded, including what backend
   capability each element would require.
6. The agent referral handoff is reachable from an agent surface, carries the
   listing context, and is recorded with the `agent_dashboard` source surface
   and intent stage. The server refuses that attribution for a non-agent
   account.
7. Typecheck, lint, and the Services client and server test suites pass with
   no new failures.
8. The V1 contract is unchanged.
9. The MVP records its own limits: review moderation and abuse reporting are
   not yet implemented, availability is provider-declared, and galleries are
   provider-supplied URLs rather than a moderated media library.
