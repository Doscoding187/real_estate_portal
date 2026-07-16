# Explore Product Doctrine

| Field | Value |
| --- | --- |
| Status | Canonical strategic product doctrine |
| Scope | Product identity, principles, boundaries, and future design authority for Explore |
| Authority | Governs future Explore product, design, architecture, and engineering decisions; does not claim current implementation has achieved the target state |
| Owner | Founder — Edward Banda |
| Version | 1.0 |
| Approved | July 2026 |
| Supersession | Governing authority over earlier Explore strategic documents where conflicts exist |

## 1. Purpose and authority of this document

This doctrine defines the enduring product intent for **Explore**, Property Listify's discovery layer. It establishes what Explore is, the system properties that make it valuable, and the boundaries that future work must preserve.

It is deliberately independent of the current codebase. Existing Explore code and the current-state audit are implementation evidence: they explain why consolidation, trust, attribution, and real domain linkage matter. They do not define, narrow, or overrule the product vision in this document.

This is the first document in the canonical Explore sequence. It must be read before proposing a screen, schema, API, ranking rule, publishing feature, commercial placement, or AI capability for Explore.

Where this doctrine conflicts with older Explore strategy, product, design, or implementation documents, this doctrine takes precedence unless Edward approves a later canonical replacement. Historical documents remain evidence and context, not governing authority.

## 2. One-sentence product definition

**Explore is Property Listify's video-first property media and discovery network, where verified property professionals and platform-approved property creators publish media connected to real property subjects, and every discovery can lead to a trusted, attributable action.**

## 3. Strategic thesis

Video becomes strategically valuable in property discovery when it is connected to verified property data, professional identity, location context, and a real action layer.

Explore therefore is not a feature that adds video to listings. It is a property media network in which video is the primary discovery medium, while the property-context graph, trust system, and action layer turn that medium into a defensible Discovery Engine.

> **Video is the front door. Property context is the intelligence. Trust is the filter. Action is the outcome.**

Existing companies have implemented portions of video-first property discovery. Property Listify's strategic differentiation is the proposed combination of verified cross-ecosystem publishing, canonical linkage to real property subjects, and attributable action across the Property Listify ecosystem.

## 4. Search demand versus discovery demand

Search serves deliberate demand: **"I know what I want."** It helps a user specify place, price, property type, and other known requirements.

Explore serves discovery demand: **"Show me useful opportunities, places, and ideas I may not have known to search for."** It helps users form and refine intent through useful media, then move into search, subject pages, or actions when their intent becomes deliberate.

Explore complements search. It must not replace precise search for users who already know their criteria, and search must not be forced to imitate a discovery feed.

## 5. The market category: Property Media Network

Explore belongs in the category of a **Property Media Network**. It combines:

- property-related media;
- verified or approved publishers;
- a canonical graph of subjects, places, organisations, and professional identity;
- discovery distribution; and
- trusted, attributable actions.

It can support audience-building by credible publishers, but it is not a general social network. Its core loop is:

**Watch -> understand -> trust -> investigate -> act.**

Comments, direct messaging, follower mechanics, and other social features are optional future tools only when they strengthen that loop. They are not defining product requirements.

## 6. What makes Explore defensible

Explore's defensibility comes from the connection between media and trusted property infrastructure, not from a vertical video interface alone.

1. **Canonical subject linkage.** Media is connected to real listings, developments, locations, services, projects, and property topics rather than floating as unstructured posts.
2. **Professional identity and accountability.** Viewers can understand who published an item, which organisation stands behind them, their relevant credentials, and their authority over the subject.
3. **Useful discovery distribution.** The Discovery Engine can match content to emerging intent while protecting relevance, diversity, and trust.
4. **Action and attribution.** A viewer can proceed from media to an appropriate action, and the system can eventually account for the chain from publication to outcome.
5. **Cross-ecosystem breadth.** The network can connect property inventory with places, education, professional services, and future property storytelling without treating every item as a listing advertisement.

## 7. What Explore is not

Explore is not:

- "TikTok for property" or a generic endless-video clone;
- a video attachment feature for listing pages;
- a replacement for search or canonical property records;
- an open posting network in which any consumer content is equivalent to professional guidance;
- a general-purpose social network optimised for arguments, follower accumulation, or engagement at any cost;
- a paid-placement system that permits money to silently override trust or organic relevance; or
- an AI product identity. AI may assist the system, but it is not the reason Explore exists.

## 8. The seven connected content worlds

Explore spans seven connected property worlds. They are one network, but each has different authority, freshness, disclosure, and action requirements.

1. **Property and listing media** — walkthroughs, tours, listing explanations, and property opportunities.
2. **Development media** — launches, unit showcases, construction updates, developer stories, and project progress.
3. **Location and neighbourhood media** — suburb, city, area, amenity, lifestyle, and location-intelligence content.
4. **Building, architecture, construction, and renovation** — house plans, design, construction diaries, architecture presentations, and renovation case studies.
5. **Finance, legal, and property-ownership education** — affordability, bond education, investment guidance, legal education, and ownership knowledge.
6. **Property services** — verified professional services, demonstrations, projects, and service guidance.
7. **Future property stories and documentary content** — buyer and seller journeys, heritage, urban transformation, housing, land, diaspora property, and development-impact stories.

The seventh world is a long-term opportunity, not an approved V1 requirement.

## 9. Video formats and duration philosophy

Video is Explore's primary discovery surface. It must support the form that best serves the subject and viewer rather than forcing every publisher into one arbitrary duration or orientation.

Short video can introduce an opportunity or idea. Medium-length video can explain a property, place, or service. Long-form video can support deeper education, storytelling, project updates, or tours. Vertical and other appropriate orientations may coexist where the experience and source material justify them.

The principle is video-first discovery, not short-video-only publishing.

## 10. Publisher eligibility and trust model

Publishing is restricted to verified property professionals and explicitly platform-approved property creators. Eligible roles may include verified agents, authorised agency representatives, registered developers, approved architects, bond specialists, conveyancers, contractors, verified service providers, Property Listify editorial contributors, and approved creators operating within defined content boundaries.

Approval does not make unverified consumer content equivalent to regulated, professional, legal, financial, or property guidance. The platform must distinguish publisher type, verification basis, organisation affiliation, subject authority, and the limits of any claim. Trust signals must be meaningful, legible, and resistant to pay-to-play dilution.

## 11. The property-context graph principle

Every published item must connect through a canonical property-context graph. At minimum, the platform must be able to answer:

- Who created this and which organisation, if any, stands behind them?
- What real-world subject is it about?
- Where is that subject located or geographically relevant?
- Which content world and topic does it concern?
- Is the publisher qualified or authorised to address the subject?
- What can the viewer truthfully do next?
- Is the item organic, editorial, or sponsored?

The graph is the infrastructure advantage. It makes media useful, governable, rankable, attributable, and commercially responsible.

## 12. Core concept distinctions

These concepts are related but must never be collapsed into one record merely for implementation convenience.

| Concept | Meaning |
| --- | --- |
| **Source object** | The canonical real-world subject: for example a listing, development, location, project, professional service, or property topic. It owns subject facts and lifecycle. |
| **Content asset** | The authored media and its publication metadata: video, transcript, thumbnail, caption, disclosures, creator, and moderation state. It does not replace source-object truth. |
| **Discovery item** | The distribution-ready representation that associates a content asset with relevant subject context, eligibility, and audience/ranking inputs. |
| **Placement** | A governed instance of a Discovery item appearing on a surface under an organic, editorial, or sponsored policy. A placement is not proof that the content itself is sponsored. |
| **Conversion** | A recorded viewer action with business meaning, such as opening a listing, making an enquiry, requesting a viewing, requesting a quote, or using a property tool. |

## 13. Consumer value proposition

For consumers, Explore makes the market more understandable and actionable before a precise search exists. It should help people:

- discover properties, developments, places, ideas, and professionals worth investigating;
- understand the context behind an opportunity rather than judging a clip in isolation;
- identify credible publishers and relevant disclosures;
- move directly into trusted subject pages, professionals, services, or tools; and
- save, follow, or revisit useful discoveries without losing their path to action.

Explore should reward usefulness and clarity, not merely time spent scrolling.

## 14. Publisher and stakeholder value proposition

For agents, agencies, developers, service providers, educators, and approved creators, Explore provides a governed distribution and audience-building channel connected to real property outcomes.

Publishers should be able to demonstrate expertise, communicate context that static inventory cannot convey, build qualified interest, and understand attributable performance. Organisations should be able to protect their brand, manage authorised representation, and see performance connected to their listings, developments, locations, services, and leads.

Creator income, sponsored distribution, and referral revenue are future commercial outcomes. They depend on reliable trust, attribution, policy, and measurement; they are not V1 foundations.

## 15. Trust, moderation, and professional accountability

Every public item requires an accountable publisher, a disclosed content context, and a moderation path proportionate to its risk. Publication policy must account for subject ownership, permissions, professional credentials, regulated claims, commercial disclosures, public safety, copyright, and takedown/reporting processes.

Trust and moderation are not a post-launch enhancement. They are preconditions for publishing credible property information. A visually polished feed cannot compensate for unclear ownership, misleading claims, unlabelled promotion, or an unauditable publisher.

## 16. Action and attribution model

Explore connects discovery to trusted actions appropriate to the subject, including opening a listing, exploring a development or suburb, contacting a professional, requesting a viewing, requesting a service quote, saving or following, or using an affordability or other property tool.

The target attribution chain is:

`publisher -> media -> subject -> viewer -> action -> lead -> outcome`

This chain is an architectural direction, not a claim that every outcome is currently observable. It must preserve consent, privacy, role permissions, source truth, and accurate commercial credit. Where the chain is incomplete, the product must not imply attribution it cannot substantiate.

## 17. Organic, editorial, and sponsored separation

Organic distribution, editorial curation, and sponsored distribution must remain structurally separate.

- **Organic** distribution is governed by relevance, usefulness, trust, freshness, diversity, and viewer intent.
- **Editorial** distribution is governed by a disclosed editorial judgement, collection, or programme.
- **Sponsored** distribution is a paid placement governed by eligibility, approval, disclosure, targeting, scheduling, reporting, and commercial policy.

Sponsored content must be clearly labelled and must not silently alter organic ranking. Payment cannot bypass publisher verification, moderation, subject accuracy, or user-protection rules. Reliable attribution is required before sponsored distribution, creator income, or referral economics become foundational offerings.

## 18. Role of AI

AI is an enabling capability, not Explore's product identity or primary differentiation. Subject to human accountability and appropriate policy, it may assist with recommendation, moderation support, metadata extraction and tagging, transcription, summarisation, accessibility, content assistance, quality review, lead scoring, and analysis.

AI must not obscure source truth, manufacture professional authority, replace regulated advice, or make undisclosed decisions that undermine trust. Human and policy accountability remain mandatory for public publishing, safety, commercial disclosure, and high-stakes property, legal, or financial claims.

## 19. V1 strategic boundaries

V1 must prove a narrow, trustworthy version of the network rather than imitate every social-media feature or commercial model.

V1 selection must follow validated publisher supply, moderation capacity, reliable connected domain engines, strongest consumer journeys, high-value conversions, and media-processing capability. It must not be selected merely because legacy Explore code happens to support a feature.

V1 should prioritise governed publishing, real subject linkage, clear publisher identity, useful discovery, truthful actions, and basic attributable measurement. General comments, open direct messaging, in-app music catalogues, broad creator monetisation, opaque AI experiences, and unbounded commercial targeting are outside the default V1 posture unless separately approved with policy and operational readiness.

Creators may upload completed media only where they hold the necessary rights to the included audio and other material. Property Listify should not introduce an in-app licensed music catalogue in V1.

## 20. Long-term platform opportunity

Over time, Explore can become a genuine property media institution: a trusted distribution network across inventory, locations, expertise, services, education, and property stories. It can make Property Listify more useful before, during, and after a transaction while giving credible publishers accountable reach.

That opportunity includes future sponsorships, partner attribution, qualified creator/referral revenue, agency and developer analytics, and editorial programming. None of these justify compromising trust, privacy, source accuracy, or the separation between editorial judgement and paid placement.

## 21. Non-negotiable principles for engineers and AI agents

Future implementation work must preserve the following:

1. Treat Explore as a Property Media Network, not a generic feed.
2. Keep video central as the primary discovery medium without reducing the system to a video player.
3. Preserve the distinction between source object, content asset, Discovery item, placement, and conversion.
4. Link every public media item to accountable publishers and canonical property-context subjects.
5. Do not equate platform approval with regulated or professional authority.
6. Do not invent property, location, market, price, availability, or professional data from media metadata, identifiers, or engagement counters.
7. Keep organic, editorial, and sponsored distribution separately modelled, labelled, and governed.
8. Do not use payment to bypass verification, moderation, trust, or relevance protections.
9. Make actions truthful, permissioned, persistent where promised, and attributable only to the extent the system can prove.
10. Treat AI as assistive infrastructure subject to accountability, never as a substitute for source truth or professional responsibility.
11. Prefer a coherent canonical contract and governed domain integration over parallel feature-specific feeds, stores, or routers.
12. Do not let current code define the long-term product boundary. The Discovery Engine may become the distribution core only after doctrine, taxonomy, context graph, and trust rules establish what it distributes.

## 22. Relationship to future canonical documents

This doctrine sets the strategic boundary. Subsequent documents will turn it into progressively more precise product and architecture decisions, without creating a premature implementation commitment:

1. `01-explore-content-taxonomy.md` — publishable classes, eligibility, subjects, disclosures, actions, freshness, and moderation rules.
2. `02-explore-property-context-graph.md` — canonical entities, relationships, ownership, authority, and subject-linkage rules.
3. `03-explore-user-and-publisher-journeys.md` — consumer, publisher, stakeholder, and conversion journeys.
4. `04-explore-south-african-supply-validation.md` — publisher-supply hypotheses, research, interview evidence, and operating implications.
5. `05-explore-v1-capability-boundary.md` — an evidence-based V1 scope, dependencies, exclusions, and definition of launch readiness.
6. `06-explore-current-state-and-remediation.md` — the current implementation, runtime evidence, canonicalisation path, and remediation plan.

No future document may reinterpret this doctrine to make Explore a general social network, an ungoverned creator feed, a disguised advertising channel, or a video layer detached from real property context and trusted action.
