# Evidence Ledger

This file records the main code evidence used for the architecture map. It is not exhaustive, but it covers every major classification and risk called out in the companion documents.

## Repository Facts

| Fact | Evidence |
| --- | --- |
| Audited worktree | `/home/edwardspc/Desktop/Dev/property-listify-main` |
| Audited commit | `0be8202680d96ff5f1ea748ac27f9b4a7e9de669` |
| Branch at canonical revalidation | `main` |
| Worktree state at canonical revalidation start | `HEAD` matched the trusted baseline; the original eight audit documents were already present as untracked files; no runtime changes were reported by `git status --short --branch --untracked-files=all`. |
| Canonical integration repo named in request | `/home/edwardspc/Desktop/Dev/property-listify-main` |
| Source documentation worktree | `/home/edwardspc/Desktop/Dev/listify-services-engine-clean/docs/architecture/stakeholder-domain-map/` |
| Wrong-worktree history | The audit was originally intended for `property-listify-main`, but the earlier Codex thread remained attached to `listify-services-engine-clean`. That source worktree was at the same trusted baseline and only architecture docs were created there. |
| Primary app stack | `package.json`, `client/src/App.tsx`, `server/routers.ts`, `drizzle/schema/index.ts` |

## Platform Composition

| Area | Evidence | Notes |
| --- | --- | --- |
| Main tRPC router | `server/routers.ts` | Composes system, analytics, monetization, partners, admin, agency, user, invitation, agent, aiAgent, video, billing, location, enhancedLocation, googleMaps, priceInsights, listing, upload, settings, savedSearch, guestMigration, dev, marketing, subscription, developer, explore, exploreVideoUpload, recommendationEngine, exploreApi, exploreAnalytics, similarProperties, cache, locationPages, brandProfile, brandEmulator, superAdminPublisher, favorites, reviews, leads, distribution, demand, servicesEngine, discovery, and propertyResults routers. |
| Frontend route surface | `client/src/App.tsx` | Contains public search and detail routes, developer workspace routes, listing and development creation routes, agency/agent pages, services pages, distribution pages, admin pages, Explore, and consumer dashboards. |
| Schema exports | `drizzle/schema/index.ts` | Exports core, agencies, locations, billing, listings, developments, media, explore, economicActors, marketplace, distribution, views, analytics, leads, servicesEngine, demand, and referrals. |
| Roles | `drizzle/schema/core.ts` | `users.role` includes `visitor`, `agent`, `agency_admin`, `property_developer`, `service_provider`, and `super_admin`. |

## Single-Property Listing Engine

| Claim | Evidence |
| --- | --- |
| Owns authoring lifecycle around single-property listings | `drizzle/schema/listings.ts` defines `listings`, `listingMedia`, `listingApprovalQueue`, `listingAnalytics`, `listingLeads`, `listingSettings`, and `listingViewings`. |
| Uses listing status and approval status | `listings.status` includes `draft`, `pending_review`, `approved`, `published`, `rejected`, `archived`, `sold`, and `rented`; `approvalStatus` is stored separately. |
| Has protected create/update/submit/approve/reject operations | `server/listingRouter.ts` exposes `create`, `update`, `submitForReview`, `approve`, `reject`, `getApprovalQueue`, and related operations. |
| Publishes into public catalog projection | `server/db.ts` `approveListing` maps `listings` into `properties` and syncs `propertyImages`; `syncPublishedListingMediaToPropertyMirror` keeps media in sync. |
| Public detail uses `properties.id`, not `listings.id` | `server/routers.ts` property detail comments and `properties.getById` behavior. |
| Contract and integration tests exist | `server/__tests__/contract.listing-lifecycle.test.ts`, `server/__tests__/contract.listing-lifecycle-db.test.ts`, `server/__tests__/contract.properties-search.test.ts`, `server/__tests__/integration.property-card-data-flow.test.ts`, `client/src/lib/workflows/listing/__tests__/listingPayload.test.ts`, `client/src/lib/workflows/listing/__tests__/listingSubmitReadiness.test.ts`. |

## Development Listing Engine

| Claim | Evidence |
| --- | --- |
| Has developer account/profile tables | `drizzle/schema/developments.ts` defines `developers` and `developerBrandProfiles`. |
| Has development aggregate and inventory | `drizzle/schema/developments.ts` defines `developments`, `developmentPhases`, `developmentUnits`, `unitTypes`, and `developmentDrafts`. |
| Supports draft and published lifecycle | `developmentDrafts`, `developments.isPublished`, `developments.publishedAt`, and `developments.approvalStatus`. |
| Supports canonical wizard state | `client/src/hooks/useDevelopmentWizard.ts`, `client/src/components/development-wizard/DevelopmentWizard.tsx`, and `client/src/components/wizard/WizardEngine.tsx`. |
| Builds canonical publish/update payload | `client/src/lib/developmentSubmitPayload.ts`, `shared/developmentPayloadOwnership.ts`, and `shared/developmentTransactionPayload.ts`. |
| Server service owns validation and publication | `server/services/developmentService.ts` has `createDevelopment`, `updateDevelopment`, `saveDraft`, `publishDevelopment`, `publishDevelopmentStrict`, `validateDevelopmentStrict`, `getPublicDevelopmentBySlug`, and `listPublicDevelopments`. |
| Developer router exposes private and public development operations | `server/developerRouter.ts` exposes draft, create, update, publish, unpublish, public brand, public development, lead, funnel, subscription, and dashboard endpoints. |
| Public search derives development unit cards | `server/services/developmentDerivedListingService.ts` maps approved/published developments plus active `unitTypes` into search cards. |
| Public detail and qualification pages exist | `client/src/pages/DevelopmentDetail.tsx`, `client/src/pages/DevelopmentQualificationPage.tsx`, `client/src/pages/DeveloperBrandProfilePage.tsx`. |
| Contract tests exist | `server/services/__tests__/developmentService.test.ts`, `server/services/__tests__/developmentService.auctionDates.test.ts`, `server/services/__tests__/developmentDerivedListingService.test.ts`, `server/__tests__/contract.properties-search-development-listings.test.ts`, `server/__tests__/integration.development-card-data-flow.test.ts`, `client/src/lib/developmentSubmitPayload.test.ts`, `client/src/lib/developmentTransactionPayload.test.ts`, `client/src/hooks/useDevelopmentWizard.test.ts`, `client/src/components/development-wizard/phases/FinalisationPhase.test.tsx`. |

## Public Search And Discovery

| Claim | Evidence |
| --- | --- |
| Public search blends single-property and development-derived results | `client/src/pages/SearchResults.tsx`, `server/routers.ts` `properties.search`, `server/services/propertySearchService.ts`, `server/services/developmentDerivedListingService.ts`, `client/src/lib/__tests__/searchBlend.test.ts`. |
| Property search reads public `properties` projection | `server/services/propertySearchService.ts` joins `properties`, `developments`, `developerBrandProfiles`, `agents`, and `agencies`. |
| Development search derives unit-type cards | `server/services/developmentDerivedListingService.ts`. |
| Discovery has a newer domain module | `server/domains/discovery/router.ts`, `server/domains/discovery/services/discoveryFeedService.ts`, `discoveryRankingService.ts`, `discoveryEngagementService.ts`, `shared/discovery/schemas.ts`. |
| Explore legacy/content stack exists in parallel | `drizzle/schema/explore.ts`, `server/exploreRouter.ts`, `server/exploreApiRouter.ts`, `server/services/exploreFeedService.ts`, `server/services/exploreVideoService.ts`, `server/services/exploreAnalyticsService.ts`. |
| Tests exist for discovery and explore | `server/domains/discovery/services/__tests__/*`, `client/src/domains/discovery/**/*test*`, `server/services/__tests__/exploreFeedService.test.ts`, `server/services/__tests__/exploreDiscoverySchema.test.ts`, `client/src/pages/__tests__/ExploreFeed.test.tsx`. |

## Leads, Funnel, And Engagement

| Claim | Evidence |
| --- | --- |
| Generic lead intake exists | `drizzle/schema/leads.ts` defines `leads`, `leadActivities`, `showings`, `scheduledViewings`, `offers`, `favorites`, and `savedSearches`; `server/leadsRouter.ts` exposes public `leads.create`. |
| Public lead capture resolves ownership | `server/services/publicLeadCaptureService.ts` resolves property/development/agent ownership, delegates brand leads when a developer brand profile is present, and increments property enquiries. |
| Developer brand leads have separate routing behavior | `server/services/brandLeadService.ts`, `server/brandProfileRouter.ts`. |
| Developer funnel overlays generic leads | `shared/developerFunnel.ts`, `server/services/developerFunnelService.ts`, `server/developerRouter.ts` lead endpoints. |
| Listing-specific lead table also exists | `drizzle/schema/listings.ts` `listingLeads`. |
| Service Provider Engine has separate service leads | `drizzle/schema/servicesEngine.ts` `serviceLeads` and `serviceLeadEvents`; `server/servicesEngineRouter.ts` `createLeadFromJourney`, `myProviderLeads`, and `updateMyLeadStatus`. |
| Demand has separate lead/match/assignment tables | `drizzle/schema/demand.ts` `demandLeads`, `demandLeadMatches`, `demandLeadAssignments`, and `demandUnmatchedLeads`; `server/demandRouter.ts`. |
| Distribution/referral uses deal/referral pipelines, not generic leads | `drizzle/schema/distribution.ts`, `drizzle/schema/referrals.ts`, `server/distributionRouter.ts`, `server/services/distributionReferralSubmissionService.ts`, `server/services/affordabilityAssessmentService.ts`. |

## Service Provider Engine

| Claim | Evidence |
| --- | --- |
| Owns provider profile and service directory data | `drizzle/schema/servicesEngine.ts` defines `serviceProviderProfiles`, `serviceProviderLocations`, `serviceProviderServices`, `serviceProviderSubscriptions`, `serviceLeads`, `serviceLeadEvents`, and `serviceProviderReviews`. |
| Uses Explore partner identity | `serviceProviderProfiles.partnerId` references `explorePartners`; `server/services/servicesEngineService.ts` creates/uses Explore partner identity. |
| Has directory, recommendation, onboarding, lead, review, dashboard, and moderation routes | `server/servicesEngineRouter.ts`. |
| Frontend pages and components exist | `client/src/pages/services/*`, `client/src/features/services/*`, `client/src/components/services/*`. |
| Tests exist | `client/src/features/services/__tests__/LeadRequestFlow.property.test.tsx`, `client/src/pages/services/__tests__/ServicesRequestPage.integration.test.tsx`, `client/src/pages/services/__tests__/ServicesResultsPage.property.test.tsx`, `client/src/features/services/onboarding/__tests__/ProviderOnboardingWizard.integration.test.tsx`, `client/src/components/services/__tests__/*`. |

## Distribution And Referral

| Claim | Evidence |
| --- | --- |
| Distribution owns a large, distinct workflow vocabulary | `drizzle/schema/distribution.ts` defines distribution programs, brand partnerships, development access, program workflows/steps, required documents, agent access, agent tiers, deals, deal documents, bank outcomes, deal events, viewings, viewing validations, commission entries/ledger/overrides, identities, applications, and team registrations. |
| Referral/affordability is adjacent but distinct | `drizzle/schema/referrals.ts` defines referrals, assessments, matches, and documents. |
| Router has admin, manager, agent/referrer, developer, and public onboarding surfaces | `server/distributionRouter.ts` exposes program setup, access, manager invites, applications, assignments, deal stage transitions, viewings, referrals, affordability assessments, partner terms, commissions, and dashboard endpoints. |
| Services are already decomposed beneath the large router | `server/services/distributionProgramService.ts`, `distributionAccessPolicy.ts`, `distributionReferralSubmissionService.ts`, `distributionDealDocumentsService.ts`, `distributionCommissionService.ts`, `distributionPartnerTermsService.ts`, `affordabilityAssessmentService.ts`, and related services. |
| Tests exist | `server/__tests__/distribution*.test.ts`, `server/services/__tests__/distributionSchemaReadiness.test.ts`, `server/services/__tests__/affordabilityAssessmentService.test.ts`, `client/src/pages/distribution/*.test.tsx`, `client/src/components/distribution/**/*test*`. |

## Agencies And Agents

| Claim | Evidence |
| --- | --- |
| Agency and agent profiles are mature but separate from generic actor profiles | `drizzle/schema/agencies.ts` defines agencies, branding, joins, subscriptions, agents, coverage areas, memberships, invites, commissions, tasks, and memory tables. |
| Agency onboarding and admin verification exist | `server/agencyRouter.ts`, `server/services/agentOnboardingService.ts`. |
| Agent public profile and dashboard CRM exist | `server/agentRouter.ts`, `client/src/pages/AgentProfile.tsx`, `client/src/pages/AgentDashboard.tsx`. |
| Entitlement logic exists | `server/services/agentEntitlementService.ts`. |

## Billing And Monetization

| Claim | Evidence |
| --- | --- |
| Shared billing exists, but it is not the sole entitlement owner | `drizzle/schema/billing.ts`, `server/billingRouter.ts`, `server/subscriptionRouter.ts`. |
| Developer subscriptions are separate | `drizzle/schema/developments.ts` `developerSubscriptions`, `developerSubscriptionLimits`, and `developerSubscriptionUsage`; `server/services/developerSubscriptionService.ts`. |
| Agency subscriptions are separate | `drizzle/schema/agencies.ts` `agencySubscriptions`. |
| Service provider subscriptions are separate | `drizzle/schema/servicesEngine.ts` `serviceProviderSubscriptions`. |
| Partner subscriptions are separate | `drizzle/schema/marketplace.ts` `partnerSubscriptions`; `server/services/partnerSubscriptionService.ts`. |
| User-level subscription fields also exist | `drizzle/schema/core.ts` `users.subscriptionTier`, `subscriptionStatus`, `trialEndsAt`, and related fields. |

## Thin Or Placeholder Areas

| Area | Evidence | Classification |
| --- | --- | --- |
| Reviews as shared capability | `server/reviewsRouter.ts` returns an empty array for `getByTarget`; service provider reviews exist separately in `drizzle/schema/servicesEngine.ts`. | Not yet a shared reviews engine. |
| Campaign/marketing | `server/marketingRouter.ts`, campaign-related UI names, `drizzle/schema/marketplace.ts` boost campaign tables, and demand campaign tables. | Feature workflow / emerging demand-marketing surface, not one mature campaign engine. |
| Economic actors | `drizzle/schema/economicActors.ts` defines `economicActors` and thin actor profile tables. | Candidate shared abstraction, not yet replacing current stakeholder profiles. |
| Demand | `drizzle/schema/demand.ts`, `server/demandRouter.ts`. | Emerging demand lead engine. |
