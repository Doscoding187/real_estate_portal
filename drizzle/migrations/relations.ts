import { relations } from "drizzle-orm/relations";
import { developers, activities, users, agencies, agencyBranding, agencyJoinRequests, agencySubscriptions, plans, agents, agentCoverageAreas, agentKnowledge, agentMemory, agentTasks, locations, amenities, suburbs, analyticsAggregations, cities, provinces, auditLogs, billingTransactions, explorePartners, boostCampaigns, topics, boostCredits, marketplaceBundles, bundlePartners, cityPriceAnalytics, commissions, properties, leads, contentApprovalQueue, contentTopics, developerBrandProfiles, developerNotifications, developerSubscriptions, developerSubscriptionLimits, developerSubscriptionUsage, developments, developmentApprovalQueue, developmentDrafts, developmentLeadRoutes, developmentPhases, developmentUnits, emailTemplates, exploreVideos, exploreContent, partnerTiers, exploreShorts, favorites, foundingPartners, invitations, invites, invoices, leadActivities, listings, listingAnalytics, listingApprovalQueue, listingLeads, listingMedia, listingViewings, notifications, offers, partnerLeads, partnerSubscriptions, paymentMethods, platformSettings, priceHistory, pricePredictions, propertyImages, propertySimilarityIndex, prospects, prospectFavorites, recentlyViewed, reviews, savedSearches, scheduledViewings, showings, subscriptionEvents, subscriptionUsage, suburbPriceAnalytics, unitTypes, userBehaviorEvents, userOnboardingState, userPreferences, userRecommendations, userSubscriptions, videos } from "./schema";

export const activitiesRelations = relations(activities, ({one}) => ({
	developer: one(developers, {
		fields: [activities.developerId],
		references: [developers.id]
	}),
	user: one(users, {
		fields: [activities.userId],
		references: [users.id]
	}),
}));

export const developersRelations = relations(developers, ({one, many}) => ({
	activities: many(activities),
	developerBrandProfiles: many(developerBrandProfiles),
	developerNotifications: many(developerNotifications),
	developerSubscriptions: many(developerSubscriptions),
	user_userId: one(users, {
		fields: [developers.userId],
		references: [users.id],
		relationName: "developers_userId_users_id"
	}),
	user_approvedBy: one(users, {
		fields: [developers.approvedBy],
		references: [users.id],
		relationName: "developers_approvedBy_users_id"
	}),
	user_rejectedBy: one(users, {
		fields: [developers.rejectedBy],
		references: [users.id],
		relationName: "developers_rejectedBy_users_id"
	}),
	developmentDrafts: many(developmentDrafts),
	developments: many(developments),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	activities: many(activities),
	agencyJoinRequests_userId: many(agencyJoinRequests, {
		relationName: "agencyJoinRequests_userId_users_id"
	}),
	agencyJoinRequests_reviewedBy: many(agencyJoinRequests, {
		relationName: "agencyJoinRequests_reviewedBy_users_id"
	}),
	agentKnowledges: many(agentKnowledge),
	agentMemories: many(agentMemory),
	agentTasks: many(agentTasks),
	agents_userId: many(agents, {
		relationName: "agents_userId_users_id"
	}),
	agents_approvedBy: many(agents, {
		relationName: "agents_approvedBy_users_id"
	}),
	auditLogs: many(auditLogs),
	billingTransactions: many(billingTransactions),
	boostCredits: many(boostCredits),
	developerBrandProfiles: many(developerBrandProfiles),
	developerNotifications: many(developerNotifications),
	developers_userId: many(developers, {
		relationName: "developers_userId_users_id"
	}),
	developers_approvedBy: many(developers, {
		relationName: "developers_approvedBy_users_id"
	}),
	developers_rejectedBy: many(developers, {
		relationName: "developers_rejectedBy_users_id"
	}),
	developmentApprovalQueues_submittedBy: many(developmentApprovalQueue, {
		relationName: "developmentApprovalQueue_submittedBy_users_id"
	}),
	developmentApprovalQueues_reviewedBy: many(developmentApprovalQueue, {
		relationName: "developmentApprovalQueue_reviewedBy_users_id"
	}),
	exploreContents: many(exploreContent),
	favorites: many(favorites),
	invitations_invitedBy: many(invitations, {
		relationName: "invitations_invitedBy_users_id"
	}),
	invitations_acceptedBy: many(invitations, {
		relationName: "invitations_acceptedBy_users_id"
	}),
	invites: many(invites),
	notifications: many(notifications),
	platformSettings: many(platformSettings),
	properties: many(properties),
	reviews: many(reviews),
	savedSearches: many(savedSearches),
	subscriptionEvents: many(subscriptionEvents),
	subscriptionUsages: many(subscriptionUsage),
	userBehaviorEvents: many(userBehaviorEvents),
	userOnboardingStates: many(userOnboardingState),
	userPreferences: many(userPreferences),
	userRecommendations: many(userRecommendations),
	userSubscriptions: many(userSubscriptions),
	agency: one(agencies, {
		fields: [users.agencyId],
		references: [agencies.id]
	}),
}));

export const agencyBrandingRelations = relations(agencyBranding, ({one}) => ({
	agency: one(agencies, {
		fields: [agencyBranding.agencyId],
		references: [agencies.id]
	}),
}));

export const agenciesRelations = relations(agencies, ({many}) => ({
	agencyBrandings: many(agencyBranding),
	agencyJoinRequests: many(agencyJoinRequests),
	agencySubscriptions: many(agencySubscriptions),
	agents: many(agents),
	emailTemplates: many(emailTemplates),
	exploreContents: many(exploreContent),
	exploreShorts: many(exploreShorts),
	invitations: many(invitations),
	invites: many(invites),
	invoices: many(invoices),
	leads: many(leads),
	paymentMethods: many(paymentMethods),
	users: many(users),
}));

export const agencyJoinRequestsRelations = relations(agencyJoinRequests, ({one}) => ({
	agency: one(agencies, {
		fields: [agencyJoinRequests.agencyId],
		references: [agencies.id]
	}),
	user_userId: one(users, {
		fields: [agencyJoinRequests.userId],
		references: [users.id],
		relationName: "agencyJoinRequests_userId_users_id"
	}),
	user_reviewedBy: one(users, {
		fields: [agencyJoinRequests.reviewedBy],
		references: [users.id],
		relationName: "agencyJoinRequests_reviewedBy_users_id"
	}),
}));

export const agencySubscriptionsRelations = relations(agencySubscriptions, ({one, many}) => ({
	agency: one(agencies, {
		fields: [agencySubscriptions.agencyId],
		references: [agencies.id]
	}),
	plan: one(plans, {
		fields: [agencySubscriptions.planId],
		references: [plans.id]
	}),
	invoices: many(invoices),
}));

export const plansRelations = relations(plans, ({many}) => ({
	agencySubscriptions: many(agencySubscriptions),
	developerSubscriptions: many(developerSubscriptions),
}));

export const agentCoverageAreasRelations = relations(agentCoverageAreas, ({one}) => ({
	agent: one(agents, {
		fields: [agentCoverageAreas.agentId],
		references: [agents.id]
	}),
}));

export const agentsRelations = relations(agents, ({one, many}) => ({
	agentCoverageAreas: many(agentCoverageAreas),
	user_userId: one(users, {
		fields: [agents.userId],
		references: [users.id],
		relationName: "agents_userId_users_id"
	}),
	agency: one(agencies, {
		fields: [agents.agencyId],
		references: [agencies.id]
	}),
	user_approvedBy: one(users, {
		fields: [agents.approvedBy],
		references: [users.id],
		relationName: "agents_approvedBy_users_id"
	}),
	commissions: many(commissions),
	exploreVideos: many(exploreVideos),
	leadActivities: many(leadActivities),
	leads: many(leads),
	offers: many(offers),
	properties: many(properties),
	scheduledViewings: many(scheduledViewings),
	showings: many(showings),
	videos: many(videos),
}));

export const agentKnowledgeRelations = relations(agentKnowledge, ({one}) => ({
	user: one(users, {
		fields: [agentKnowledge.createdBy],
		references: [users.id]
	}),
}));

export const agentMemoryRelations = relations(agentMemory, ({one}) => ({
	user: one(users, {
		fields: [agentMemory.userId],
		references: [users.id]
	}),
}));

export const agentTasksRelations = relations(agentTasks, ({one}) => ({
	user: one(users, {
		fields: [agentTasks.userId],
		references: [users.id]
	}),
}));

export const amenitiesRelations = relations(amenities, ({one}) => ({
	location: one(locations, {
		fields: [amenities.locationId],
		references: [locations.id]
	}),
}));

export const locationsRelations = relations(locations, ({many}) => ({
	amenities: many(amenities),
	properties: many(properties),
}));

export const analyticsAggregationsRelations = relations(analyticsAggregations, ({one}) => ({
	suburb: one(suburbs, {
		fields: [analyticsAggregations.suburbId],
		references: [suburbs.id]
	}),
	city: one(cities, {
		fields: [analyticsAggregations.cityId],
		references: [cities.id]
	}),
	province: one(provinces, {
		fields: [analyticsAggregations.provinceId],
		references: [provinces.id]
	}),
}));

export const suburbsRelations = relations(suburbs, ({one, many}) => ({
	analyticsAggregations: many(analyticsAggregations),
	pricePredictions: many(pricePredictions),
	properties: many(properties),
	suburbPriceAnalytics: many(suburbPriceAnalytics),
	city: one(cities, {
		fields: [suburbs.cityId],
		references: [cities.id]
	}),
	userBehaviorEvents: many(userBehaviorEvents),
}));

export const citiesRelations = relations(cities, ({one, many}) => ({
	analyticsAggregations: many(analyticsAggregations),
	province: one(provinces, {
		fields: [cities.provinceId],
		references: [provinces.id]
	}),
	cityPriceAnalytics: many(cityPriceAnalytics),
	pricePredictions: many(pricePredictions),
	properties: many(properties),
	suburbPriceAnalytics: many(suburbPriceAnalytics),
	suburbs: many(suburbs),
	userBehaviorEvents: many(userBehaviorEvents),
}));

export const provincesRelations = relations(provinces, ({many}) => ({
	analyticsAggregations: many(analyticsAggregations),
	cities: many(cities),
	cityPriceAnalytics: many(cityPriceAnalytics),
	pricePredictions: many(pricePredictions),
	properties: many(properties),
	suburbPriceAnalytics: many(suburbPriceAnalytics),
	userBehaviorEvents: many(userBehaviorEvents),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id]
	}),
}));

export const billingTransactionsRelations = relations(billingTransactions, ({one}) => ({
	user: one(users, {
		fields: [billingTransactions.userId],
		references: [users.id]
	}),
}));

export const boostCampaignsRelations = relations(boostCampaigns, ({one}) => ({
	explorePartner: one(explorePartners, {
		fields: [boostCampaigns.partnerId],
		references: [explorePartners.id]
	}),
	topic: one(topics, {
		fields: [boostCampaigns.topicId],
		references: [topics.id]
	}),
}));

export const explorePartnersRelations = relations(explorePartners, ({one, many}) => ({
	boostCampaigns: many(boostCampaigns),
	bundlePartners: many(bundlePartners),
	contentApprovalQueues: many(contentApprovalQueue),
	partnerTier: one(partnerTiers, {
		fields: [explorePartners.tierId],
		references: [partnerTiers.id]
	}),
	foundingPartners: many(foundingPartners),
	partnerLeads: many(partnerLeads),
	partnerSubscriptions: many(partnerSubscriptions),
}));

export const topicsRelations = relations(topics, ({many}) => ({
	boostCampaigns: many(boostCampaigns),
	contentTopics: many(contentTopics),
}));

export const boostCreditsRelations = relations(boostCredits, ({one}) => ({
	user: one(users, {
		fields: [boostCredits.userId],
		references: [users.id]
	}),
}));

export const bundlePartnersRelations = relations(bundlePartners, ({one}) => ({
	marketplaceBundle: one(marketplaceBundles, {
		fields: [bundlePartners.bundleId],
		references: [marketplaceBundles.id]
	}),
	explorePartner: one(explorePartners, {
		fields: [bundlePartners.partnerId],
		references: [explorePartners.id]
	}),
}));

export const marketplaceBundlesRelations = relations(marketplaceBundles, ({many}) => ({
	bundlePartners: many(bundlePartners),
}));

export const cityPriceAnalyticsRelations = relations(cityPriceAnalytics, ({one}) => ({
	city: one(cities, {
		fields: [cityPriceAnalytics.cityId],
		references: [cities.id]
	}),
	province: one(provinces, {
		fields: [cityPriceAnalytics.provinceId],
		references: [provinces.id]
	}),
}));

export const commissionsRelations = relations(commissions, ({one}) => ({
	agent: one(agents, {
		fields: [commissions.agentId],
		references: [agents.id]
	}),
	property: one(properties, {
		fields: [commissions.propertyId],
		references: [properties.id]
	}),
	lead: one(leads, {
		fields: [commissions.leadId],
		references: [leads.id]
	}),
}));

export const propertiesRelations = relations(properties, ({one, many}) => ({
	commissions: many(commissions),
	exploreVideos: many(exploreVideos),
	favorites: many(favorites),
	leads: many(leads),
	offers: many(offers),
	priceHistories: many(priceHistory),
	pricePredictions: many(pricePredictions),
	province: one(provinces, {
		fields: [properties.provinceId],
		references: [provinces.id]
	}),
	city: one(cities, {
		fields: [properties.cityId],
		references: [cities.id]
	}),
	suburb: one(suburbs, {
		fields: [properties.suburbId],
		references: [suburbs.id]
	}),
	agent: one(agents, {
		fields: [properties.agentId],
		references: [agents.id]
	}),
	development: one(developments, {
		fields: [properties.developmentId],
		references: [developments.id]
	}),
	user: one(users, {
		fields: [properties.ownerId],
		references: [users.id]
	}),
	location: one(locations, {
		fields: [properties.locationId],
		references: [locations.id]
	}),
	developerBrandProfile: one(developerBrandProfiles, {
		fields: [properties.developerBrandProfileId],
		references: [developerBrandProfiles.id]
	}),
	propertyImages: many(propertyImages),
	propertySimilarityIndices_propertyId1: many(propertySimilarityIndex, {
		relationName: "propertySimilarityIndex_propertyId1_properties_id"
	}),
	propertySimilarityIndices_propertyId2: many(propertySimilarityIndex, {
		relationName: "propertySimilarityIndex_propertyId2_properties_id"
	}),
	prospectFavorites: many(prospectFavorites),
	recentlyVieweds: many(recentlyViewed),
	scheduledViewings: many(scheduledViewings),
	showings: many(showings),
	userBehaviorEvents: many(userBehaviorEvents),
	videos: many(videos),
}));

export const leadsRelations = relations(leads, ({one, many}) => ({
	commissions: many(commissions),
	leadActivities: many(leadActivities),
	property: one(properties, {
		fields: [leads.propertyId],
		references: [properties.id]
	}),
	development: one(developments, {
		fields: [leads.developmentId],
		references: [developments.id]
	}),
	agency: one(agencies, {
		fields: [leads.agencyId],
		references: [agencies.id]
	}),
	agent: one(agents, {
		fields: [leads.agentId],
		references: [agents.id]
	}),
	developerBrandProfile: one(developerBrandProfiles, {
		fields: [leads.developerBrandProfileId],
		references: [developerBrandProfiles.id]
	}),
	offers: many(offers),
	showings: many(showings),
}));

export const contentApprovalQueueRelations = relations(contentApprovalQueue, ({one}) => ({
	explorePartner: one(explorePartners, {
		fields: [contentApprovalQueue.partnerId],
		references: [explorePartners.id]
	}),
}));

export const contentTopicsRelations = relations(contentTopics, ({one}) => ({
	topic: one(topics, {
		fields: [contentTopics.topicId],
		references: [topics.id]
	}),
}));

export const developerBrandProfilesRelations = relations(developerBrandProfiles, ({one, many}) => ({
	developer: one(developers, {
		fields: [developerBrandProfiles.linkedDeveloperAccountId],
		references: [developers.id]
	}),
	user: one(users, {
		fields: [developerBrandProfiles.createdBy],
		references: [users.id]
	}),
	developmentDrafts: many(developmentDrafts),
	developmentLeadRoutes_sourceBrandProfileId: many(developmentLeadRoutes, {
		relationName: "developmentLeadRoutes_sourceBrandProfileId_developerBrandProfiles_id"
	}),
	developmentLeadRoutes_receiverBrandProfileId: many(developmentLeadRoutes, {
		relationName: "developmentLeadRoutes_receiverBrandProfileId_developerBrandProfiles_id"
	}),
	developmentLeadRoutes_fallbackBrandProfileId: many(developmentLeadRoutes, {
		relationName: "developmentLeadRoutes_fallbackBrandProfileId_developerBrandProfiles_id"
	}),
	developments_developerBrandProfileId: many(developments, {
		relationName: "developments_developerBrandProfileId_developerBrandProfiles_id"
	}),
	developments_developerBrandProfileId: many(developments, {
		relationName: "developments_developerBrandProfileId_developerBrandProfiles_id"
	}),
	developments_marketingBrandProfileId: many(developments, {
		relationName: "developments_marketingBrandProfileId_developerBrandProfiles_id"
	}),
	leads: many(leads),
	properties: many(properties),
}));

export const developerNotificationsRelations = relations(developerNotifications, ({one}) => ({
	developer: one(developers, {
		fields: [developerNotifications.developerId],
		references: [developers.id]
	}),
	user: one(users, {
		fields: [developerNotifications.userId],
		references: [users.id]
	}),
}));

export const developerSubscriptionLimitsRelations = relations(developerSubscriptionLimits, ({one}) => ({
	developerSubscription: one(developerSubscriptions, {
		fields: [developerSubscriptionLimits.subscriptionId],
		references: [developerSubscriptions.id]
	}),
}));

export const developerSubscriptionsRelations = relations(developerSubscriptions, ({one, many}) => ({
	developerSubscriptionLimits: many(developerSubscriptionLimits),
	developerSubscriptionUsages: many(developerSubscriptionUsage),
	developer: one(developers, {
		fields: [developerSubscriptions.developerId],
		references: [developers.id]
	}),
	plan: one(plans, {
		fields: [developerSubscriptions.planId],
		references: [plans.id]
	}),
}));

export const developerSubscriptionUsageRelations = relations(developerSubscriptionUsage, ({one}) => ({
	developerSubscription: one(developerSubscriptions, {
		fields: [developerSubscriptionUsage.subscriptionId],
		references: [developerSubscriptions.id]
	}),
}));

export const developmentApprovalQueueRelations = relations(developmentApprovalQueue, ({one}) => ({
	development: one(developments, {
		fields: [developmentApprovalQueue.developmentId],
		references: [developments.id]
	}),
	user_submittedBy: one(users, {
		fields: [developmentApprovalQueue.submittedBy],
		references: [users.id],
		relationName: "developmentApprovalQueue_submittedBy_users_id"
	}),
	user_reviewedBy: one(users, {
		fields: [developmentApprovalQueue.reviewedBy],
		references: [users.id],
		relationName: "developmentApprovalQueue_reviewedBy_users_id"
	}),
}));

export const developmentsRelations = relations(developments, ({one, many}) => ({
	developmentApprovalQueues: many(developmentApprovalQueue),
	developmentLeadRoutes: many(developmentLeadRoutes),
	developmentPhases: many(developmentPhases),
	developmentUnits: many(developmentUnits),
	developer: one(developers, {
		fields: [developments.developerId],
		references: [developers.id]
	}),
	developerBrandProfile_developerBrandProfileId: one(developerBrandProfiles, {
		fields: [developments.developerBrandProfileId],
		references: [developerBrandProfiles.id],
		relationName: "developments_developerBrandProfileId_developerBrandProfiles_id"
	}),
	developerBrandProfile_developerBrandProfileId: one(developerBrandProfiles, {
		fields: [developments.developerBrandProfileId],
		references: [developerBrandProfiles.id],
		relationName: "developments_developerBrandProfileId_developerBrandProfiles_id"
	}),
	developerBrandProfile_marketingBrandProfileId: one(developerBrandProfiles, {
		fields: [developments.marketingBrandProfileId],
		references: [developerBrandProfiles.id],
		relationName: "developments_marketingBrandProfileId_developerBrandProfiles_id"
	}),
	exploreVideos: many(exploreVideos),
	leads: many(leads),
	properties: many(properties),
	unitTypes: many(unitTypes),
	videos: many(videos),
}));

export const developmentDraftsRelations = relations(developmentDrafts, ({one}) => ({
	developerBrandProfile: one(developerBrandProfiles, {
		fields: [developmentDrafts.developerBrandProfileId],
		references: [developerBrandProfiles.id]
	}),
	developer: one(developers, {
		fields: [developmentDrafts.developerId],
		references: [developers.id]
	}),
}));

export const developmentLeadRoutesRelations = relations(developmentLeadRoutes, ({one}) => ({
	development: one(developments, {
		fields: [developmentLeadRoutes.developmentId],
		references: [developments.id]
	}),
	developerBrandProfile_sourceBrandProfileId: one(developerBrandProfiles, {
		fields: [developmentLeadRoutes.sourceBrandProfileId],
		references: [developerBrandProfiles.id],
		relationName: "developmentLeadRoutes_sourceBrandProfileId_developerBrandProfiles_id"
	}),
	developerBrandProfile_receiverBrandProfileId: one(developerBrandProfiles, {
		fields: [developmentLeadRoutes.receiverBrandProfileId],
		references: [developerBrandProfiles.id],
		relationName: "developmentLeadRoutes_receiverBrandProfileId_developerBrandProfiles_id"
	}),
	developerBrandProfile_fallbackBrandProfileId: one(developerBrandProfiles, {
		fields: [developmentLeadRoutes.fallbackBrandProfileId],
		references: [developerBrandProfiles.id],
		relationName: "developmentLeadRoutes_fallbackBrandProfileId_developerBrandProfiles_id"
	}),
}));

export const developmentPhasesRelations = relations(developmentPhases, ({one, many}) => ({
	development: one(developments, {
		fields: [developmentPhases.developmentId],
		references: [developments.id]
	}),
	developmentUnits: many(developmentUnits),
}));

export const developmentUnitsRelations = relations(developmentUnits, ({one}) => ({
	development: one(developments, {
		fields: [developmentUnits.developmentId],
		references: [developments.id]
	}),
	developmentPhase: one(developmentPhases, {
		fields: [developmentUnits.phaseId],
		references: [developmentPhases.id]
	}),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({one}) => ({
	agency: one(agencies, {
		fields: [emailTemplates.agencyId],
		references: [agencies.id]
	}),
}));

export const exploreVideosRelations = relations(exploreVideos, ({one}) => ({
	agent: one(agents, {
		fields: [exploreVideos.agentId],
		references: [agents.id]
	}),
	property: one(properties, {
		fields: [exploreVideos.propertyId],
		references: [properties.id]
	}),
	development: one(developments, {
		fields: [exploreVideos.developmentId],
		references: [developments.id]
	}),
}));

export const exploreContentRelations = relations(exploreContent, ({one}) => ({
	user: one(users, {
		fields: [exploreContent.creatorId],
		references: [users.id]
	}),
	agency: one(agencies, {
		fields: [exploreContent.agencyId],
		references: [agencies.id]
	}),
}));

export const partnerTiersRelations = relations(partnerTiers, ({many}) => ({
	explorePartners: many(explorePartners),
}));

export const exploreShortsRelations = relations(exploreShorts, ({one}) => ({
	agency: one(agencies, {
		fields: [exploreShorts.agencyId],
		references: [agencies.id]
	}),
}));

export const favoritesRelations = relations(favorites, ({one}) => ({
	user: one(users, {
		fields: [favorites.userId],
		references: [users.id]
	}),
	property: one(properties, {
		fields: [favorites.propertyId],
		references: [properties.id]
	}),
}));

export const foundingPartnersRelations = relations(foundingPartners, ({one}) => ({
	explorePartner: one(explorePartners, {
		fields: [foundingPartners.partnerId],
		references: [explorePartners.id]
	}),
}));

export const invitationsRelations = relations(invitations, ({one}) => ({
	agency: one(agencies, {
		fields: [invitations.agencyId],
		references: [agencies.id]
	}),
	user_invitedBy: one(users, {
		fields: [invitations.invitedBy],
		references: [users.id],
		relationName: "invitations_invitedBy_users_id"
	}),
	user_acceptedBy: one(users, {
		fields: [invitations.acceptedBy],
		references: [users.id],
		relationName: "invitations_acceptedBy_users_id"
	}),
}));

export const invitesRelations = relations(invites, ({one}) => ({
	agency: one(agencies, {
		fields: [invites.agencyId],
		references: [agencies.id]
	}),
	user: one(users, {
		fields: [invites.usedBy],
		references: [users.id]
	}),
}));

export const invoicesRelations = relations(invoices, ({one}) => ({
	agency: one(agencies, {
		fields: [invoices.agencyId],
		references: [agencies.id]
	}),
	agencySubscription: one(agencySubscriptions, {
		fields: [invoices.subscriptionId],
		references: [agencySubscriptions.id]
	}),
}));

export const leadActivitiesRelations = relations(leadActivities, ({one}) => ({
	lead: one(leads, {
		fields: [leadActivities.leadId],
		references: [leads.id]
	}),
	agent: one(agents, {
		fields: [leadActivities.agentId],
		references: [agents.id]
	}),
}));

export const listingAnalyticsRelations = relations(listingAnalytics, ({one}) => ({
	listing: one(listings, {
		fields: [listingAnalytics.listingId],
		references: [listings.id]
	}),
}));

export const listingsRelations = relations(listings, ({many}) => ({
	listingAnalytics: many(listingAnalytics),
	listingApprovalQueues: many(listingApprovalQueue),
	listingLeads: many(listingLeads),
	listingMedias: many(listingMedia),
	listingViewings: many(listingViewings),
}));

export const listingApprovalQueueRelations = relations(listingApprovalQueue, ({one}) => ({
	listing: one(listings, {
		fields: [listingApprovalQueue.listingId],
		references: [listings.id]
	}),
}));

export const listingLeadsRelations = relations(listingLeads, ({one}) => ({
	listing: one(listings, {
		fields: [listingLeads.listingId],
		references: [listings.id]
	}),
}));

export const listingMediaRelations = relations(listingMedia, ({one}) => ({
	listing: one(listings, {
		fields: [listingMedia.listingId],
		references: [listings.id]
	}),
}));

export const listingViewingsRelations = relations(listingViewings, ({one}) => ({
	listing: one(listings, {
		fields: [listingViewings.listingId],
		references: [listings.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const offersRelations = relations(offers, ({one}) => ({
	property: one(properties, {
		fields: [offers.propertyId],
		references: [properties.id]
	}),
	lead: one(leads, {
		fields: [offers.leadId],
		references: [leads.id]
	}),
	agent: one(agents, {
		fields: [offers.agentId],
		references: [agents.id]
	}),
}));

export const partnerLeadsRelations = relations(partnerLeads, ({one}) => ({
	explorePartner: one(explorePartners, {
		fields: [partnerLeads.partnerId],
		references: [explorePartners.id]
	}),
}));

export const partnerSubscriptionsRelations = relations(partnerSubscriptions, ({one}) => ({
	explorePartner: one(explorePartners, {
		fields: [partnerSubscriptions.partnerId],
		references: [explorePartners.id]
	}),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({one}) => ({
	agency: one(agencies, {
		fields: [paymentMethods.agencyId],
		references: [agencies.id]
	}),
}));

export const platformSettingsRelations = relations(platformSettings, ({one}) => ({
	user: one(users, {
		fields: [platformSettings.updatedBy],
		references: [users.id]
	}),
}));

export const priceHistoryRelations = relations(priceHistory, ({one}) => ({
	property: one(properties, {
		fields: [priceHistory.propertyId],
		references: [properties.id]
	}),
}));

export const pricePredictionsRelations = relations(pricePredictions, ({one}) => ({
	property: one(properties, {
		fields: [pricePredictions.propertyId],
		references: [properties.id]
	}),
	suburb: one(suburbs, {
		fields: [pricePredictions.suburbId],
		references: [suburbs.id]
	}),
	city: one(cities, {
		fields: [pricePredictions.cityId],
		references: [cities.id]
	}),
	province: one(provinces, {
		fields: [pricePredictions.provinceId],
		references: [provinces.id]
	}),
}));

export const propertyImagesRelations = relations(propertyImages, ({one}) => ({
	property: one(properties, {
		fields: [propertyImages.propertyId],
		references: [properties.id]
	}),
}));

export const propertySimilarityIndexRelations = relations(propertySimilarityIndex, ({one}) => ({
	property_propertyId1: one(properties, {
		fields: [propertySimilarityIndex.propertyId1],
		references: [properties.id],
		relationName: "propertySimilarityIndex_propertyId1_properties_id"
	}),
	property_propertyId2: one(properties, {
		fields: [propertySimilarityIndex.propertyId2],
		references: [properties.id],
		relationName: "propertySimilarityIndex_propertyId2_properties_id"
	}),
}));

export const prospectFavoritesRelations = relations(prospectFavorites, ({one}) => ({
	prospect: one(prospects, {
		fields: [prospectFavorites.prospectId],
		references: [prospects.id]
	}),
	property: one(properties, {
		fields: [prospectFavorites.propertyId],
		references: [properties.id]
	}),
}));

export const prospectsRelations = relations(prospects, ({many}) => ({
	prospectFavorites: many(prospectFavorites),
	recentlyVieweds: many(recentlyViewed),
	scheduledViewings: many(scheduledViewings),
}));

export const recentlyViewedRelations = relations(recentlyViewed, ({one}) => ({
	prospect: one(prospects, {
		fields: [recentlyViewed.prospectId],
		references: [prospects.id]
	}),
	property: one(properties, {
		fields: [recentlyViewed.propertyId],
		references: [properties.id]
	}),
}));

export const reviewsRelations = relations(reviews, ({one}) => ({
	user: one(users, {
		fields: [reviews.userId],
		references: [users.id]
	}),
}));

export const savedSearchesRelations = relations(savedSearches, ({one}) => ({
	user: one(users, {
		fields: [savedSearches.userId],
		references: [users.id]
	}),
}));

export const scheduledViewingsRelations = relations(scheduledViewings, ({one}) => ({
	prospect: one(prospects, {
		fields: [scheduledViewings.prospectId],
		references: [prospects.id]
	}),
	property: one(properties, {
		fields: [scheduledViewings.propertyId],
		references: [properties.id]
	}),
	agent: one(agents, {
		fields: [scheduledViewings.agentId],
		references: [agents.id]
	}),
}));

export const showingsRelations = relations(showings, ({one}) => ({
	property: one(properties, {
		fields: [showings.propertyId],
		references: [properties.id]
	}),
	lead: one(leads, {
		fields: [showings.leadId],
		references: [leads.id]
	}),
	agent: one(agents, {
		fields: [showings.agentId],
		references: [agents.id]
	}),
}));

export const subscriptionEventsRelations = relations(subscriptionEvents, ({one}) => ({
	user: one(users, {
		fields: [subscriptionEvents.userId],
		references: [users.id]
	}),
}));

export const subscriptionUsageRelations = relations(subscriptionUsage, ({one}) => ({
	user: one(users, {
		fields: [subscriptionUsage.userId],
		references: [users.id]
	}),
}));

export const suburbPriceAnalyticsRelations = relations(suburbPriceAnalytics, ({one}) => ({
	suburb: one(suburbs, {
		fields: [suburbPriceAnalytics.suburbId],
		references: [suburbs.id]
	}),
	city: one(cities, {
		fields: [suburbPriceAnalytics.cityId],
		references: [cities.id]
	}),
	province: one(provinces, {
		fields: [suburbPriceAnalytics.provinceId],
		references: [provinces.id]
	}),
}));

export const unitTypesRelations = relations(unitTypes, ({one}) => ({
	development: one(developments, {
		fields: [unitTypes.developmentId],
		references: [developments.id]
	}),
}));

export const userBehaviorEventsRelations = relations(userBehaviorEvents, ({one}) => ({
	user: one(users, {
		fields: [userBehaviorEvents.userId],
		references: [users.id]
	}),
	property: one(properties, {
		fields: [userBehaviorEvents.propertyId],
		references: [properties.id]
	}),
	suburb: one(suburbs, {
		fields: [userBehaviorEvents.suburbId],
		references: [suburbs.id]
	}),
	city: one(cities, {
		fields: [userBehaviorEvents.cityId],
		references: [cities.id]
	}),
	province: one(provinces, {
		fields: [userBehaviorEvents.provinceId],
		references: [provinces.id]
	}),
}));

export const userOnboardingStateRelations = relations(userOnboardingState, ({one}) => ({
	user: one(users, {
		fields: [userOnboardingState.userId],
		references: [users.id]
	}),
}));

export const userPreferencesRelations = relations(userPreferences, ({one}) => ({
	user: one(users, {
		fields: [userPreferences.userId],
		references: [users.id]
	}),
}));

export const userRecommendationsRelations = relations(userRecommendations, ({one}) => ({
	user: one(users, {
		fields: [userRecommendations.userId],
		references: [users.id]
	}),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({one}) => ({
	user: one(users, {
		fields: [userSubscriptions.userId],
		references: [users.id]
	}),
}));

export const videosRelations = relations(videos, ({one}) => ({
	agent: one(agents, {
		fields: [videos.agentId],
		references: [agents.id]
	}),
	property: one(properties, {
		fields: [videos.propertyId],
		references: [properties.id]
	}),
	development: one(developments, {
		fields: [videos.developmentId],
		references: [developments.id]
	}),
}));