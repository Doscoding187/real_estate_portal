import { relations } from "drizzle-orm/relations";
import { agencies, agencyBranding, agencyJoinRequests, users, agencySubscriptions, plans, agents, agentCoverageAreas, suburbs, analyticsAggregations, cities, provinces, auditLogs, cityPriceAnalytics, commissions, properties, leads, developers, developments, emailTemplates, exploreVideos, favorites, invitations, invites, invoices, leadActivities, notifications, offers, paymentMethods, platformSettings, priceHistory, pricePredictions, propertyImages, propertySimilarityIndex, prospects, prospectFavorites, recentlyViewed, reviews, scheduledViewings, showings, suburbPriceAnalytics, userBehaviorEvents, userPreferences, userRecommendations, videos, videoLikes } from "./schema";

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

export const usersRelations = relations(users, ({one, many}) => ({
	agencyJoinRequests_userId: many(agencyJoinRequests, {
		relationName: "agencyJoinRequests_userId_users_id"
	}),
	agencyJoinRequests_reviewedBy: many(agencyJoinRequests, {
		relationName: "agencyJoinRequests_reviewedBy_users_id"
	}),
	agents: many(agents),
	auditLogs: many(auditLogs),
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
	userBehaviorEvents: many(userBehaviorEvents),
	userPreferences: many(userPreferences),
	userRecommendations: many(userRecommendations),
	agency: one(agencies, {
		fields: [users.agencyId],
		references: [agencies.id]
	}),
	videoLikes: many(videoLikes),
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
}));

export const agentCoverageAreasRelations = relations(agentCoverageAreas, ({one}) => ({
	agent: one(agents, {
		fields: [agentCoverageAreas.agentId],
		references: [agents.id]
	}),
}));

export const agentsRelations = relations(agents, ({one, many}) => ({
	agentCoverageAreas: many(agentCoverageAreas),
	user: one(users, {
		fields: [agents.userId],
		references: [users.id]
	}),
	agency: one(agencies, {
		fields: [agents.agencyId],
		references: [agencies.id]
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
	offers: many(offers),
	showings: many(showings),
}));

export const developmentsRelations = relations(developments, ({one, many}) => ({
	developer: one(developers, {
		fields: [developments.developerId],
		references: [developers.id]
	}),
	exploreVideos: many(exploreVideos),
	leads: many(leads),
	properties: many(properties),
	videos: many(videos),
}));

export const developersRelations = relations(developers, ({many}) => ({
	developments: many(developments),
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

export const videoLikesRelations = relations(videoLikes, ({one}) => ({
	video: one(videos, {
		fields: [videoLikes.videoId],
		references: [videos.id]
	}),
	user: one(users, {
		fields: [videoLikes.userId],
		references: [users.id]
	}),
}));

export const videosRelations = relations(videos, ({one, many}) => ({
	videoLikes: many(videoLikes),
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