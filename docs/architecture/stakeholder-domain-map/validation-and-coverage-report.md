# Validation And Coverage Report

This file records documentation coverage, command usage, repository status, and verification limitations for the stakeholder/domain architecture audit.

## Required Content Coverage

| Required content | Covered in |
| --- | --- |
| 1. Executive Architecture Verdict | `index.md` |
| 2. Architectural Doctrine | `index.md` |
| 3. Stakeholder Map | `stakeholder-domain-registries.md` |
| 4. Domain Engine Registry | `stakeholder-domain-registries.md` |
| 5. Shared Capability Registry | `stakeholder-domain-registries.md` |
| 6. Workspace and Public Experience Registry | `stakeholder-domain-registries.md` |
| 7. Context Map | `context-data-state-map.md` |
| 8. Workspace Composition Matrix | `stakeholder-domain-registries.md` |
| 9. Data Ownership Matrix | `context-data-state-map.md` |
| 10. State-Machine Inventory | `context-data-state-map.md` |
| 11. Route, Router and Service Map | `context-data-state-map.md` |
| 12. Current-Code Mapping | `evidence-ledger.md`, `context-data-state-map.md` |
| 13. Lead and Engagement Analysis | `lead-profile-trust-analysis.md` |
| 14. Profile, Organisation and Trust Analysis | `lead-profile-trust-analysis.md` |
| 15. Developer Journey Map | `developer-journey-architecture.md` |
| 16. Developer Current-State Architecture | `developer-journey-architecture.md` |
| 17. Developer Target Composition | `developer-journey-architecture.md` |
| 18. Cross-Domain Risk Register | `risks-decisions-roadmap.md` |
| 19. Architecture Decisions and Rejected Alternatives | `risks-decisions-roadmap.md` |
| 20. Phased Roadmap | `risks-decisions-roadmap.md` |
| 21. Recommended Next Implementation Slice | `risks-decisions-roadmap.md`, `developer-journey-architecture.md` |
| 22. Open Questions and Evidence Gaps | `risks-decisions-roadmap.md`, this file |
| 23. Strategic Capability Registry | `strategic-capability-registry.md` |
| 24. Capability Maturity Matrix | `strategic-capability-registry.md` |
| 25. Full Domain Engine Registry | `strategic-capability-registry.md` |
| 26. Shared Platform Capability Registry | `strategic-capability-registry.md` |
| 27. Commercial/Revenue Capability Registry | `commercial-revenue-architecture.md` |
| 28. Stakeholder Workspace/System Registry | `strategic-capability-registry.md` |
| 29. Public Experience Registry | `public-experience-composition-map.md` |
| 30. Stakeholder-to-Capability Matrix | `strategic-capability-registry.md` |
| 31. Capability Dependency Map | `launch-dependency-map.md` |
| 32. Public Experience Composition Matrix | `public-experience-composition-map.md` |
| 33. Revenue Surface Matrix | `commercial-revenue-architecture.md` |
| 34. Current/Emerging/Planned Capability Map | `strategic-capability-registry.md` |
| 35. Launch Dependency Map | `launch-dependency-map.md` |
| 36. Deferred Capability Register | `launch-dependency-map.md` |
| 37. Strategic Architecture Decisions/Alternatives | `strategic-decisions-and-open-questions.md` |
| 38. Strategic Open Product/Architecture Questions | `strategic-decisions-and-open-questions.md` |

## Repository Status Recorded

| Item | Recorded value |
| --- | --- |
| Repository path | `/home/edwardspc/Desktop/Dev/property-listify-main` |
| Branch | `main` |
| HEAD | `0be8202680d96ff5f1ea748ac27f9b4a7e9de669` |
| Trusted baseline | `0be8202680d96ff5f1ea748ac27f9b4a7e9de669` |
| Canonical integration repo named in request | `/home/edwardspc/Desktop/Dev/property-listify-main` |
| Source documentation worktree | `/home/edwardspc/Desktop/Dev/listify-services-engine-clean/docs/architecture/stakeholder-domain-map/` |
| Historical discrepancy corrected | The audit documentation was mistakenly authored in `listify-services-engine-clean` because the earlier Codex thread remained attached there. That worktree was at the trusted baseline and no runtime behavior was changed; only architecture docs were created. The original eight documents were already present in `property-listify-main` at canonical preflight; source and destination checksums matched before correction; the canonical copies were then revalidated and edited; source copies remained unchanged. |
| Working tree before canonical corrections | `HEAD` matched the trusted baseline; the eight documentation files were present as untracked files under `docs/architecture/stakeholder-domain-map/`. |
| Working tree after docs | Only documentation under `docs/architecture/stakeholder-domain-map/` expected to be changed or created; strategic pass adds five new documentation files in the same directory. |

## Validation Notes

- The repository changes are documentation-only.
- No runtime source, schema, configuration, test, migration, route, or package file was intentionally changed.
- `git diff --check` was run for tracked diffs. Because the documentation files are untracked, plain `git diff --check` and `git diff --stat` do not fully represent their contents until files are tracked or staged.
- The untracked documentation was therefore validated through direct file scans for trailing whitespace, non-ASCII characters, Markdown fences, internal links, Mermaid fences, and terminology consistency.
- Major classifications are either marked `Verified in canonical worktree`, `Updated after canonical revalidation`, `Strong inference`, `Partial evidence`, or `Unclear` in the registries/revalidation matrix, or described as thin/product-label/future workflow where executable evidence was insufficient.
- Current-state and target-state diagrams are separated in `context-data-state-map.md`.
- The recommended next implementation slice is exactly one end-to-end slice: Development publication to public lead contract hardening.
- Strategic capability and launch sequencing now distinguish architectural classification, maturity, and delivery priority.

## Canonical Revalidation Matrix

| Material conclusion | Canonical classification | Canonical evidence summary | Change after canonical revalidation |
| --- | --- | --- | --- |
| Workspace and history | Updated after canonical revalidation | `pwd`, `git rev-parse --show-toplevel`, branch, `HEAD`, status, worktree list, source/destination checksums | Corrected from wrong-worktree audit wording to canonical already-present, checksum-matched, revalidated wording. |
| Single-Property Listing Engine | Verified in canonical worktree | `listingRouter`, `listings`, `listingMedia`, `listingApprovalQueue`, `properties` mirror writes, listing lifecycle/search tests | No material conclusion change. |
| Development Listing Engine | Verified in canonical worktree | `DevelopmentWizard`, `useDevelopmentWizard`, payload builders, `developmentService`, `developerRouter`, `developments`, `unitTypes`, development tests | No material conclusion change. |
| Public Search and Discovery | Updated after canonical revalidation | `SearchResults`, `properties.search`, `properties.searchDevelopmentListings`, `propertySearchService`, `developmentDerivedListingService`, `server/domains/discovery`, legacy Explore routers/services | Clarified as a composition: public search is a read-model/query capability and public experience; Discovery/Explore is adjacent discovery/content capability, not listing source-of-truth ownership. |
| Agency and Agent Operations | Updated after canonical revalidation | `agencyRouter`, `agentRouter`, `agencies`, `agencyBranding`, `agencyAgentMemberships`, `agents`, agent entitlement and dashboard code | Clarified as an established mixed stakeholder operations capability, not one monolithic backend engine. |
| Developer Brand Profile | Updated after canonical revalidation | `developerBrandProfiles`, `brandProfileRouter`, `DeveloperBrandProfilePage`, `brandLeadService`, development brand references | Clarified as public commercial identity/specialised stakeholder profile with mixed ownership, distinct from `users` and `developers`. |
| Developer Funnel | Verified in canonical worktree | `shared/developerFunnel.ts`, `developerFunnelService`, developer lead procedures, `leads`, `leadActivities`, funnel contract tests | Clarified as rules overlay over generic lead storage, not an independent lead table. |
| Leads and engagement | Verified in canonical worktree | `leadsRouter`, `publicLeadCaptureService`, `brandLeadService`, `serviceLeads`, `demandLeads`, distribution deals/referrals, lead routing tests | No forced universal lead engine; shared primitives only. |
| Service Provider Engine | Verified in canonical worktree | `servicesEngineRouter`, `servicesEngineService`, `serviceProviderProfiles`, `serviceLeads`, service pages/tests | Identity ownership remains a strong inference because `serviceProviderProfiles` depends on `explorePartners`. |
| Distribution and Referral | Verified in canonical worktree | `distributionRouter`, distribution schema, referrals schema, distribution services/tests, distribution pages | No material conclusion change; boundary remains risky due router concentration. |
| Demand/Campaign | Partial evidence | `demandRouter`, demand schema, marketing router, marketplace boost campaign tables, campaign-named UI/tests | Kept as emerging workflow/capability, not one mature campaign engine. |
| Reviews/Trust | Verified in canonical worktree | `reviewsRouter` returns an empty array; `serviceProviderReviews` is implemented in Services Engine | Kept as thin shared capability and service-specific review source. |
| Auction | Partial evidence | Listing/development/unit auction fields and development auction-date tests | Kept as feature fields, not a full auction registration/bidding engine. |
| Billing/Entitlements | Verified in canonical worktree | Billing schema/router plus developer, agency, service provider, partner, and user subscription fields | Kept as fragmented shared capability; read adapters recommended before schema unification. |
| Developer source-of-truth route | Verified in canonical worktree | Registration/role gates, `developers`, brand profiles, wizard state, payload builders, developer tRPC procedures, development service, public search/detail, lead capture/funnel, analytics fields | No better next slice superseded the publication-to-lead contract hardening slice. |
| Explore Engine | Updated in strategic pass | `exploreContent`, `exploreEngagements`, topics, partners, shorts/discovery videos, Explore routes, Discovery router/services, Explore analytics | Classified as candidate first-class content/discovery domain engine, separate from ordinary listing search. |
| Sponsored Placement and Billboard | Updated in strategic pass | Marketplace boost/hero campaign tables, monetization target labels, location billboard components, marketing router fragments, advertise pages | Preferred boundary is Sponsored Placement Engine with Location Billboard as one product; broader Campaign Engine deferred. |
| Location Intelligence and area pages | Updated in strategic pass | Location hierarchy tables, price/location analytics, location routes/components | Location Intelligence classified as candidate engine; province/city/suburb pages classified as public experiences. |
| Directories and showcases | Updated in strategic pass | Developer brand/profile pages, agent/agency routes, service provider directory/profile pages | Classified as public experiences/read models unless independent lifecycle evidence exists. |
| Revenue surfaces | Updated in strategic pass | Subscriptions, service provider subscriptions, partner subscriptions, distribution commissions, campaign/boost fragments, advertise surfaces | Revenue architecture mapped without promoting fragmented campaign evidence to a universal engine. |

## Representative Commands Used

Repository and baseline:

```bash
pwd
git rev-parse --show-toplevel
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git status --short --branch --untracked-files=all
git worktree list
```

Provenance and checksum evidence:

```bash
find /home/edwardspc/Desktop/Dev/listify-services-engine-clean/docs/architecture/stakeholder-domain-map -maxdepth 1 -type f -printf '%f\n'
find /home/edwardspc/Desktop/Dev/property-listify-main/docs/architecture/stakeholder-domain-map -maxdepth 1 -type f -printf '%f\n'
sha256sum /home/edwardspc/Desktop/Dev/listify-services-engine-clean/docs/architecture/stakeholder-domain-map/index.md ...
sha256sum docs/architecture/stakeholder-domain-map/index.md ...
diff -qr /home/edwardspc/Desktop/Dev/listify-services-engine-clean/docs/architecture/stakeholder-domain-map docs/architecture/stakeholder-domain-map
```

Prompt and code evidence:

```bash
sed -n '1,220p' /home/edwardspc/.codex/attachments/871aad92-09f9-4c48-8f0b-029ef51dfdd4/pasted-text.txt
sed -n '221,445p' /home/edwardspc/.codex/attachments/871aad92-09f9-4c48-8f0b-029ef51dfdd4/pasted-text.txt
sed -n '1,240p' drizzle/schema/distribution.ts
sed -n '1,260p' server/distributionRouter.ts
sed -n '1,240p' server/domains/discovery/router.ts
sed -n '1,220p' drizzle/schema/explore.ts
sed -n '1,220p' server/reviewsRouter.ts
sed -n '1,260p' drizzle/schema/demand.ts
sed -n '1,260p' drizzle/schema/economicActors.ts
sed -n '1,260p' drizzle/schema/marketplace.ts
rg -n "export const (distribution|developmentRequired|platformTeam|referral)" drizzle/schema/distribution.ts drizzle/schema/referrals.ts
rg -n "^  [a-zA-Z][A-Za-z0-9_]*: (superAdminProcedure|publicProcedure|protectedProcedure)" server/distributionRouter.ts
rg -n "^  [a-zA-Z][A-Za-z0-9_]*: (publicProcedure|protectedProcedure|superAdminProcedure)" server/servicesEngineRouter.ts server/developerRouter.ts server/listingRouter.ts server/agencyRouter.ts server/agentRouter.ts server/leadsRouter.ts server/routers.ts
rg --files -g '*test*' server client/src shared
```

Documentation validation:

```bash
rg -n "[^\\x00-\\x7F]" docs/architecture/stakeholder-domain-map
rg -n "[[:blank:]]$" docs/architecture/stakeholder-domain-map
rg -n "listify-services-engine-clean|approved as the final|worktree|property-listify-main|trusted baseline|baseline|canonical" docs/architecture/stakeholder-domain-map
git status --short --branch --untracked-files=all
git diff --stat -- docs/architecture/stakeholder-domain-map
git diff --check
```

## Evidence Limitations

- Revalidation was static/code-evidence based; no application server or automated test suite was run as part of this documentation/provenance pass.
- Developer registration was traced to role/profile/onboarding surfaces, but not every login/signup screen was deeply audited.
- Valuation, seller acquisition, recruitment, auction participation, and generic reviews were not verified as complete engines.
- Campaign terminology spans demand campaigns, marketplace boost campaigns, marketing surfaces, and location campaign tests; a single campaign engine was not verified.
- Developer team membership was not verified as a mature organization/membership model.
- Some large routers, especially distribution, were classified from schema, exported procedures, service imports, and tests rather than every internal branch.
