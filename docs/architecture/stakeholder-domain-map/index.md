# Property Listify Stakeholder And Domain Architecture Map

Status: documentation-only architecture audit
Audited worktree: `/home/edwardspc/Desktop/Dev/property-listify-main`
Audited commit: `0be8202680d96ff5f1ea748ac27f9b4a7e9de669`
Canonical integration repository named in the request: `/home/edwardspc/Desktop/Dev/property-listify-main`
Worktree note: the audit was intended for `property-listify-main`, but an earlier Codex thread remained attached to `/home/edwardspc/Desktop/Dev/listify-services-engine-clean`. The audit documentation was mistakenly authored there while that worktree was at the trusted baseline. No runtime behavior was changed there; only architecture documentation was created. Matching documentation was already present in `property-listify-main` at canonical preflight and was revalidated there.
Provenance note: the original eight documents were already present in `property-listify-main` when canonical preflight began. Source files existed in `listify-services-engine-clean`, matching destination files were already present in `property-listify-main`, source and destination checksums matched before correction, and the canonical copies were then revalidated and edited. The source copies remained unchanged.

## Purpose

This map documents the current Property Listify architecture by stakeholder, domain engine, data ownership, state machine, and public/private journey. It is intentionally grounded in code evidence rather than desired product labels.

The pack now has three connected architecture layers:

- Current-State Evidence Architecture: what the repository demonstrably contains today.
- Strategic Capability Architecture: where established, emerging, fragmented, planned, and conceptual capabilities belong.
- Launch and Implementation Architecture: what should be protected first, what supports launch, what follows feedback, and what should be deferred.

The main conclusion is that Property Listify is already a multi-stakeholder property marketplace with two mature listing engines, several emerging domain engines, and a set of shared capabilities that are partly duplicated across verticals.

## How To Read This Pack

- [Evidence Ledger](./evidence-ledger.md) records the source files, tests, and repository facts used for this audit.
- [Stakeholder And Domain Registries](./stakeholder-domain-registries.md) classifies stakeholders, domain engines, feature workflows, workspaces, and shared capabilities.
- [Lead, Engagement, Profile, And Trust Analysis](./lead-profile-trust-analysis.md) separates lead-like workflows, shared primitives, domain-specific lifecycles, profiles, organizations, and trust signals.
- [Context, Data, And State Map](./context-data-state-map.md) maps current and target contexts, table ownership, state machines, route-to-router flows, and test coverage.
- [Developer Journey Architecture](./developer-journey-architecture.md) deep-dives the developer flow from account setup through public listing, lead capture, funnel management, analytics, billing, and distribution.
- [Risks, Decisions, And Roadmap](./risks-decisions-roadmap.md) lists the main risks, architectural decisions, rejected alternatives, target slices, and open questions.
- [Strategic Capability Registry](./strategic-capability-registry.md) adds the complete platform capability census across stakeholder systems, engines, shared capabilities, commercial products, public experiences, and planned/conceptual areas.
- [Commercial Revenue Architecture](./commercial-revenue-architecture.md) maps revenue surfaces, sponsored placement/campaign/billboard boundaries, commercial analytics, and billing dependencies.
- [Public Experience Composition Map](./public-experience-composition-map.md) classifies guides, directories, showcases, profiles, and public pages as composed read experiences unless they own independent lifecycles.
- [Launch Dependency Map](./launch-dependency-map.md) separates launch-critical, launch-supporting, post-launch, later strategic, and deferred work, and confirms the first implementation slice.
- [Strategic Decisions And Open Questions](./strategic-decisions-and-open-questions.md) records architecture decisions, alternatives, evidence gaps, validation gates, and product questions.

## Classification Rules

This audit uses these labels consistently:

- Established domain engine: has a clear stakeholder, owned aggregate/table set, server router/service layer, lifecycle/state rules, user-facing surfaces, and tests or contract coverage.
- Emerging domain engine: has meaningful schema/service/router/UI evidence, but the boundary is still mixed with another domain, feature-flagged, or missing complete lifecycle/test coverage.
- Feature workflow: supports a product workflow but does not yet own a full domain lifecycle.
- Shared capability: reusable platform concern such as identity, media, billing, analytics, notifications, reviews, or lead intake.
- Projection/read model: data optimized for public or cross-domain reading, not the owner of all writes.

## Executive Verdict

Property Listify currently has these strongest domain engines:

- Single-Property Listing Engine: mature lifecycle around `listings`, review/approval, media, and the public `properties` mirror.
- Development Listing Engine: mature developer workspace, wizard/draft/publish flow, `developments`, `unitTypes`, public development detail, derived search listings, and developer lead/funnel support.
- Distribution/Referral Engine: deep schema and workflow implementation, but operationally gated and concentrated in a very large router, so it should be treated as established internally but still boundary-risky.

Public Search and Discovery is a composition rather than a single source-of-truth engine. Public Search is an established read-model/query capability and public experience that blends single-property `properties` projection rows with derived development unit cards. The newer Discovery domain and legacy Explore stack are adjacent public discovery/content capabilities, not the write owner for listing inventory.

The most important architectural friction is not missing code. It is ownership ambiguity:

- Public property inventory is split between `listings`, `properties`, `developments`, and derived development unit listings.
- Leads exist as generic `leads`, listing-specific lead tables, brand lead routing, developer funnel overlays, service leads, demand leads, and distribution/referral deals.
- Profiles and organizations are split across `users`, `developers`, `developerBrandProfiles`, `agents`, `agencies`, `serviceProviderProfiles`, `explorePartners`, `partners`, and `economicActors`.
- Billing/subscription concepts are split across platform subscriptions, developer subscriptions, agency subscriptions, service provider subscriptions, partner subscriptions, and user-level subscription fields.

The recommended next implementation slice is not a broad refactor. It is a contract-hardening slice for the Development Listing Engine: preserve the canonical development publish payload through public search, development detail, and development lead capture ownership.

## Current Architecture Doctrine

Use these rules before changing code:

- Keep Single-Property Listing and Development Listing separate engines. They share public discovery surfaces, but they do not share the same authoring lifecycle or inventory model.
- Treat `properties` as a public catalog/read projection unless a specific flow proves it is the authoritative source for that write.
- Treat `leads` as shared intake storage plus domain overlays, not as one universal CRM engine.
- Treat `developerBrandProfiles` as public brand/contact identity, not simply a duplicate developer account table.
- Avoid migrating all stakeholders into a single "profile" or "actor" model until ownership rules are documented and contract-tested.
- Prefer small contract slices over large architecture rewrites.

## High-Signal Findings

1. `server/routers.ts` composes a broad platform router; the app is already a marketplace of domains, not a single listing product.
2. `client/src/App.tsx` exposes public search/detail routes, developer workspaces, listing creation, distribution partner pages, service pages, admin pages, agency/agent pages, and consumer dashboards.
3. `drizzle/schema/index.ts` exports modular schema surfaces for core, agencies, listings, developments, leads, services engine, distribution, referrals, demand, analytics, billing, marketplace, and discovery-related tables.
4. Development publishing is canonical enough to protect with contracts: wizard state, payload builder, `developmentService`, unit types, public detail, derived search listings, and developer lead capture all exist.
5. Single-property listing approval writes or updates a public `properties` mirror, which is useful but creates source-of-truth risk.
6. Distribution/referral is deeper than a campaign feature: it has programs, access, manager assignments, deals, viewings, document checklists, commission entries, referrals, affordability assessments, and partner terms.
7. Service Provider Engine is real but identity ownership is mixed with Explore partner identity.
8. Reviews are currently a stub route, while service provider reviews have dedicated schema. Do not call reviews a shared trust engine yet.
9. Campaign/marketing surfaces exist, but current evidence points to workflow/support status rather than a full campaign engine.
10. The developer journey is the clearest path for the next implementation slice because it touches private authoring, public discovery, and monetizable lead/funnel outcomes.

## Validation Position

This audit changes documentation only under `docs/architecture/stakeholder-domain-map/`. It does not run migrations, start servers, alter runtime code, edit schemas, change routes, commit, push, or switch worktrees.
