import { mysqlTable, index, foreignKey, int, varchar, text, json, mysqlEnum, timestamp, decimal, tinyint, boolean, unique, date } from "drizzle-orm/mysql-core"
import { sql, relations } from "drizzle-orm"

export const activities = mysqlTable("activities", {
	id: int().autoincrement().notNull(),
	developerId: int("developer_id").notNull().references(() => developers.id, { onDelete: "cascade" } ),
	activityType: varchar("activity_type", { length: 50 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	metadata: json(),
	relatedEntityType: mysqlEnum("related_entity_type", ['development','unit','lead','campaign','team_member']),
	relatedEntityId: int("related_entity_id"),
	userId: int("user_id").references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
},
(table) => [
	index("idx_activities_developer_id").on(table.developerId),
	index("idx_activities_activity_type").on(table.activityType),
	index("idx_activities_created_at").on(table.createdAt),
	index("idx_activities_related_entity").on(table.relatedEntityType, table.relatedEntityId),
]);


export const amenities = mysqlTable("amenities", {
	id: int().autoincrement().notNull(),
	locationId: int("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	name: varchar({ length: 255 }).notNull(),
	type: varchar({ length: 100 }).notNull(),
	rating: decimal({ precision: 3, scale: 1 }),
	latitude: varchar({ length: 50 }),
	longitude: varchar({ length: 50 }),
	distance: decimal({ precision: 10, scale: 2 }),
	metadata: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_amenities_location_id").on(table.locationId),
	index("idx_amenities_type").on(table.type),
]);

export const agencies = mysqlTable("agencies", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	description: text(),
	logo: text(),
	website: varchar({ length: 255 }),
	email: varchar({ length: 320 }),
	phone: varchar({ length: 50 }),
	address: text(),
	city: varchar({ length: 100 }),
	province: varchar({ length: 100 }),
	subscriptionPlan: varchar({ length: 50 }).default('free').notNull(),
	subscriptionStatus: varchar({ length: 30 }).default('trial').notNull(),
	subscriptionExpiry: timestamp({ mode: 'string' }),
	isVerified: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const agencyBranding = mysqlTable("agency_branding", {
	id: int().autoincrement().notNull(),
	agencyId: int().notNull().references(() => agencies.id, { onDelete: "cascade" } ),
	primaryColor: varchar({ length: 7 }),
	secondaryColor: varchar({ length: 7 }),
	accentColor: varchar({ length: 7 }),
	logoUrl: text(),
	faviconUrl: text(),
	customDomain: varchar({ length: 255 }),
	subdomain: varchar({ length: 63 }),
	companyName: varchar({ length: 255 }),
	tagline: varchar({ length: 255 }),
	customCss: text(),
	metaTitle: varchar({ length: 255 }),
	metaDescription: text(),
	supportEmail: varchar({ length: 320 }),
	supportPhone: varchar({ length: 50 }),
	socialLinks: text(),
	isEnabled: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const agencyJoinRequests = mysqlTable("agency_join_requests", {
	id: int().autoincrement().notNull(),
	agencyId: int().notNull().references(() => agencies.id, { onDelete: "cascade" } ),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	status: mysqlEnum(['pending','approved','rejected']).default('pending').notNull(),
	message: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	reviewedBy: int().references(() => users.id, { onDelete: "set null" } ),
	reviewedAt: timestamp({ mode: 'string' }),
});

export const agencySubscriptions = mysqlTable("agency_subscriptions", {
	id: int().autoincrement().notNull(),
	agencyId: int().notNull().references(() => agencies.id, { onDelete: "cascade" } ),
	planId: int().references(() => plans.id, { onDelete: "set null" } ),
	stripeSubscriptionId: varchar({ length: 100 }),
	stripeCustomerId: varchar({ length: 100 }).notNull(),
	stripePriceId: varchar({ length: 100 }),
	status: mysqlEnum(['incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid']).default('incomplete').notNull(),
	currentPeriodStart: timestamp({ mode: 'string' }),
	currentPeriodEnd: timestamp({ mode: 'string' }),
	trialEnd: timestamp({ mode: 'string' }),
	cancelAtPeriodEnd: int().notNull(),
	canceledAt: timestamp({ mode: 'string' }),
	endedAt: timestamp({ mode: 'string' }),
	metadata: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const agentCoverageAreas = mysqlTable("agent_coverage_areas", {
	id: int().autoincrement().notNull(),
	agentId: int().notNull().references(() => agents.id, { onDelete: "cascade" } ),
	areaName: varchar({ length: 255 }).notNull(),
	areaType: mysqlEnum(['province','city','suburb','custom_polygon']).notNull(),
	areaData: text().notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const agents = mysqlTable("agents", {
	id: int().autoincrement().notNull(),
	userId: int().references(() => users.id, { onDelete: "cascade" } ),
	agencyId: int().references(() => agencies.id, { onDelete: "set null" } ),
	firstName: varchar({ length: 100 }).notNull(),
	lastName: varchar({ length: 100 }).notNull(),
	displayName: varchar({ length: 200 }),
	bio: text(),
	profileImage: text(),
	phone: varchar({ length: 50 }),
	email: varchar({ length: 320 }),
	whatsapp: varchar({ length: 50 }),
	specialization: text(),
	role: mysqlEnum(['agent','principal_agent','broker']).default('agent').notNull(),
	licenseNumber: varchar({ length: 100 }),
	yearsExperience: int(),
	areasServed: text(),
	languages: text(),
	rating: int(),
	reviewCount: int(),
	totalSales: int(),
	isVerified: int().notNull(),
	isFeatured: int().notNull(),
	status: mysqlEnum(['pending','approved','rejected','suspended']).default('pending').notNull(),
	rejectionReason: text(),
	approvedBy: int().references(() => users.id, { onDelete: "set null" } ),
	approvedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const analyticsAggregations = mysqlTable("analytics_aggregations", {
	id: int().autoincrement().notNull(),
	aggregationType: mysqlEnum(['daily','weekly','monthly']).notNull(),
	aggregationDate: varchar({ length: 10 }).notNull(),
	suburbId: int().references(() => suburbs.id, { onDelete: "cascade" } ),
	cityId: int().references(() => cities.id, { onDelete: "cascade" } ),
	provinceId: int().references(() => provinces.id, { onDelete: "cascade" } ),
	propertyType: varchar({ length: 50 }),
	listingType: varchar({ length: 50 }),
	totalProperties: int(),
	activeListings: int(),
	avgPrice: int(),
	medianPrice: int(),
	minPrice: int(),
	maxPrice: int(),
	pricePerSqmAvg: int(),
	totalViews: int(),
	totalSaves: int(),
	totalContacts: int(),
	uniqueVisitors: int(),
	newListings: int(),
	soldProperties: int(),
	rentedProperties: int(),
	avgDaysOnMarket: int(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	action: varchar({ length: 100 }).notNull(),
	targetType: varchar({ length: 50 }),
	targetId: int(),
	metadata: text(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// export const billing_transactions = mysqlTable("billing_transactions", {
// 	id: int().autoincrement().notNull(),
// 	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
// 	subscriptionId: int("subscription_id"),
// 	transactionType: mysqlEnum("transaction_type", ['subscription_create','subscription_renew','upgrade','downgrade','addon_purchase','refund','failed_payment','trial_conversion']).notNull(),
// 	amountZar: int("amount_zar").notNull(),
// 	currency: varchar({ length: 3 }).default('ZAR'),
// 	status: mysqlEnum(['pending','completed','failed','refunded']).default('pending'),
// 	paymentGateway: mysqlEnum("payment_gateway", ['stripe','paystack','manual']).notNull(),
// 	gatewayTransactionId: varchar("gateway_transaction_id", { length: 255 }),
// 	gatewayInvoiceId: varchar("gateway_invoice_id", { length: 255 }),
// 	description: text(),
// 	metadata: json(),
// 	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
// 	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
// },
// (table) => [
// 	index("idx_user").on(table.userId),
// 	index("idx_status").on(table.status),
// ]);

export const boostCredits = mysqlTable("boost_credits", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	totalCredits: int("total_credits").default(0),
	usedCredits: int("used_credits").default(0),
	resetAt: timestamp("reset_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_user").on(table.userId),
	index("unique_user_credits").on(table.userId),
]);

export const cities = mysqlTable("cities", {
	id: int().autoincrement().notNull(),
	provinceId: int().notNull().references(() => provinces.id, { onDelete: "cascade" } ),
	name: varchar({ length: 150 }).notNull(),
	slug: varchar({ length: 200 }),
	placeId: varchar("place_id", { length: 255 }),
	seoTitle: varchar("seo_title", { length: 255 }),
	seoDescription: text("seo_description"),
	latitude: varchar({ length: 20 }),
	longitude: varchar({ length: 21 }),
	isMetro: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_cities_slug").on(table.slug),
	index("idx_cities_place_id").on(table.placeId),
	index("idx_cities_slug_province").on(table.slug, table.provinceId),
]);

export const cityPriceAnalytics = mysqlTable("city_price_analytics", {
	id: int().autoincrement().notNull(),
	cityId: int().notNull().references(() => cities.id, { onDelete: "cascade" } ),
	provinceId: int().notNull().references(() => provinces.id, { onDelete: "cascade" } ),
	currentAvgPrice: int(),
	currentMedianPrice: int(),
	currentMinPrice: int(),
	currentMaxPrice: int(),
	currentPriceCount: int(),
	sixMonthGrowthPercent: int(),
	threeMonthGrowthPercent: int(),
	oneMonthGrowthPercent: int(),
	totalProperties: int(),
	activeListings: int(),
	averageDaysOnMarket: int(),
	luxurySegmentPercent: int(),
	midRangePercent: int(),
	affordablePercent: int(),
	lastUpdated: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const commissions = mysqlTable("commissions", {
	id: int().autoincrement().notNull(),
	agentId: int().notNull().references(() => agents.id, { onDelete: "cascade" } ),
	propertyId: int().references(() => properties.id, { onDelete: "set null" } ),
	leadId: int().references(() => leads.id, { onDelete: "set null" } ),
	amount: int().notNull(),
	percentage: int(),
	status: mysqlEnum(['pending','approved','paid','cancelled']).default('pending').notNull(),
	transactionType: mysqlEnum(['sale','rent','referral','other']).default('sale').notNull(),
	description: text(),
	payoutDate: timestamp({ mode: 'string' }),
	paymentReference: varchar({ length: 100 }),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const coupons = mysqlTable("coupons", {
	id: int().autoincrement().notNull(),
	code: varchar({ length: 50 }).notNull(),
	stripeCouponId: varchar({ length: 100 }),
	name: varchar({ length: 100 }),
	description: text(),
	discountType: mysqlEnum(['amount','percent']).default('percent').notNull(),
	discountAmount: int(),
	maxRedemptions: int(),
	redemptionsUsed: int().notNull(),
	validFrom: timestamp({ mode: 'string' }),
	validUntil: timestamp({ mode: 'string' }),
	isActive: int().default(1).notNull(),
	appliesToPlans: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const developerNotifications = mysqlTable("developer_notifications", {
	id: int().autoincrement().notNull(),
	developerId: int("developer_id").notNull().references(() => developers.id, { onDelete: "cascade" } ),
	userId: int("user_id").references(() => users.id, { onDelete: "set null" } ),
	title: varchar({ length: 255 }).notNull(),
	body: text().notNull(),
	type: varchar({ length: 50 }).notNull(),
	severity: mysqlEnum(['info','warning','error','success']).default('info').notNull(),
	read: tinyint().default(0).notNull(),
	actionUrl: varchar("action_url", { length: 500 }),
	metadata: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	index("idx_developer_notifications_developer_id").on(table.developerId),
	index("idx_developer_notifications_user_id").on(table.userId),
	index("idx_developer_notifications_read").on(table.read),
	index("idx_developer_notifications_created_at").on(table.createdAt),
	index("idx_developer_notifications_type").on(table.type),
	index("idx_developer_notifications_feed").on(table.developerId, table.read, table.createdAt),
]);

export const developerSubscriptionLimits = mysqlTable("developer_subscription_limits", {
	id: int().autoincrement().notNull(),
	subscriptionId: int("subscription_id").notNull().references(() => developerSubscriptions.id, { onDelete: "cascade" } ),
	maxDevelopments: int("max_developments").default(1).notNull(),
	maxLeadsPerMonth: int("max_leads_per_month").default(50).notNull(),
	maxTeamMembers: int("max_team_members").default(1).notNull(),
	analyticsRetentionDays: int("analytics_retention_days").default(30).notNull(),
	crmIntegrationEnabled: tinyint("crm_integration_enabled").default(0).notNull(),
	advancedAnalyticsEnabled: tinyint("advanced_analytics_enabled").default(0).notNull(),
	bondIntegrationEnabled: tinyint("bond_integration_enabled").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_developer_subscription_limits_subscription_id").on(table.subscriptionId),
]);

export const developerSubscriptionUsage = mysqlTable("developer_subscription_usage", {
	id: int().autoincrement().notNull(),
	subscriptionId: int("subscription_id").notNull().references(() => developerSubscriptions.id, { onDelete: "cascade" } ),
	developmentsCount: int("developments_count").default(0).notNull(),
	leadsThisMonth: int("leads_this_month").default(0).notNull(),
	teamMembersCount: int("team_members_count").default(0).notNull(),
	lastResetAt: timestamp("last_reset_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_developer_subscription_usage_subscription_id").on(table.subscriptionId),
]);

export const developerSubscriptions = mysqlTable("developer_subscriptions", {
	id: int().autoincrement().notNull(),
	developerId: int("developer_id").notNull().references(() => developers.id, { onDelete: "cascade" } ),
	planId: int("plan_id").references(() => plans.id, { onDelete: "set null" } ),
	tier: mysqlEnum(['free_trial','basic','premium']).default('free_trial').notNull(),
	status: mysqlEnum(['active','cancelled','expired']).default('active').notNull(),
	trialEndsAt: timestamp("trial_ends_at", { mode: 'string' }),
	currentPeriodStart: timestamp("current_period_start", { mode: 'string' }),
	currentPeriodEnd: timestamp("current_period_end", { mode: 'string' }),
	stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }),
	stripeCustomerId: varchar("stripe_customer_id", { length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_developer_subscriptions_developer_id").on(table.developerId),
	index("idx_developer_subscriptions_status").on(table.status),
	index("idx_developer_subscriptions_tier").on(table.tier),
]);

export const developers = mysqlTable("developers", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }),
	description: text(),
	logo: text(),
	website: varchar({ length: 255 }),
	email: varchar({ length: 320 }),
	phone: varchar({ length: 50 }),
	address: text(),
	city: varchar({ length: 100 }),
	province: varchar({ length: 100 }),
	category: mysqlEnum(['residential','commercial','mixed_use','industrial']).default('residential').notNull(),
	establishedYear: int(),
	totalProjects: int(),
	rating: int(),
	reviewCount: int(),
	isVerified: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	status: mysqlEnum(['pending','approved','rejected']).default('pending').notNull(),
	rejectionReason: text(),
	approvedBy: int().references(() => users.id, { onDelete: "set null" } ),
	approvedAt: timestamp({ mode: 'string' }),
	rejectedBy: int().references(() => users.id, { onDelete: "set null" } ),
	rejectedAt: timestamp({ mode: 'string' }),
	kpiCache: json(),
	lastKpiCalculation: timestamp({ mode: 'string' }),
	completedProjects: int().default(0),
	currentProjects: int().default(0),
	upcomingProjects: int().default(0),
	trackRecord: text(),
	pastProjects: int(),
	specializations: json(),
	isTrusted: boolean("is_trusted").default(false).notNull(),
},
(table) => [
	index("idx_developers_userId").on(table.userId),
	index("idx_developers_status").on(table.status),
	index("idx_developers_last_kpi_calculation").on(table.lastKpiCalculation),
]);

// ============================================================================
// DEVELOPER BRAND PROFILES (Platform-Owned Brand Data)
// ============================================================================
// IMPORTANT: This table is SEPARATE from `developers` (subscriber accounts).
// - developerBrandProfiles = real-world brands, platform-owned until claimed
// - developers = authenticated, billing-linked subscriber accounts
// Ownership Semantics:
// - ownerType='platform' = seeded or unmanaged listing
// - ownerType='developer' = subscriber-managed with dashboard access
// ============================================================================

export const developerBrandProfiles = mysqlTable("developer_brand_profiles", {
	id: int().autoincrement().notNull(),
	
	// Brand Identity
	brandName: varchar("brand_name", { length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	logoUrl: text("logo_url"),
	about: text(),
	foundedYear: int("founded_year"),
	headOfficeLocation: varchar("head_office_location", { length: 255 }),
	operatingProvinces: json("operating_provinces").$type<string[]>(),
	propertyFocus: json("property_focus").$type<string[]>(), // estates, apartments, mixed-use
	websiteUrl: varchar("website_url", { length: 500 }),
	publicContactEmail: varchar("public_contact_email", { length: 320 }),
	
	// Brand Classification
	brandTier: mysqlEnum("brand_tier", ['national', 'regional', 'boutique']).default('regional'),
	sourceAttribution: varchar("source_attribution", { length: 255 }), // where data came from
	
	// Governance & State
	profileType: mysqlEnum("profile_type", ['industry_reference', 'verified_partner']).default('industry_reference'),
	identityType: mysqlEnum("identity_type", ['developer', 'marketing_agency', 'hybrid']).default('developer').notNull(), // NEW: Distinguish roles
	isSubscriber: tinyint("is_subscriber").default(0).notNull(),
	isClaimable: tinyint("is_claimable").default(1).notNull(),
	isVisible: tinyint("is_visible").default(1).notNull(),
	isContactVerified: tinyint("is_contact_verified").default(0).notNull(), // Refinement #2: track email verification
	linkedDeveloperAccountId: int("linked_developer_account_id").references(() => developers.id, { onDelete: "set null" }),
	ownerType: mysqlEnum("owner_type", ['platform', 'developer']).default('platform').notNull(),
	claimRequestedAt: timestamp("claim_requested_at", { mode: 'string' }), // Refinement #5: sales SLA tracking
	
	// Lead Tracking (Monetisation Layer)
	totalLeadsReceived: int("total_leads_received").default(0).notNull(),
	lastLeadDate: timestamp("last_lead_date", { mode: 'string' }),
	unclaimedLeadCount: int("unclaimed_lead_count").default(0).notNull(),
	
	// Audit
	createdBy: int("created_by").references(() => users.id, { onDelete: "set null" }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
	index("idx_brand_profiles_slug").on(table.slug),
	index("idx_brand_profiles_tier").on(table.brandTier),
	index("idx_brand_profiles_visible").on(table.isVisible),
	index("idx_brand_profiles_subscriber").on(table.isSubscriber),
	index("idx_brand_profiles_owner").on(table.ownerType),
]);

export const developmentPhases = mysqlTable("development_phases", {
	id: int().autoincrement().notNull(),
	developmentId: int("development_id").notNull().references(() => developments.id, { onDelete: "cascade" } ),
	name: varchar({ length: 255 }).notNull(),
	phaseNumber: int("phase_number").notNull(),
	description: text(),
	status: mysqlEnum(['planning','pre_launch','selling','sold_out','completed']).default('planning').notNull(),
	totalUnits: int("total_units").default(0).notNull(),
	availableUnits: int("available_units").default(0).notNull(),
	priceFrom: int("price_from"),
	priceTo: int("price_to"),
	launchDate: timestamp("launch_date", { mode: 'string' }),
	completionDate: timestamp("completion_date", { mode: 'string' }),
	// Phase optimization fields
	specType: mysqlEnum("spec_type", ['affordable','gap','luxury','custom']).default('affordable'),
	customSpecType: varchar("custom_spec_type", { length: 100 }),
	finishingDifferences: json("finishing_differences"),
	phaseHighlights: json("phase_highlights"),
	latitude: varchar({ length: 50 }),
	longitude: varchar({ length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_development_phases_development_id").on(table.developmentId),
	index("idx_development_phases_status").on(table.status),
	index("idx_development_phases_spec_type").on(table.specType),
]);

export const developmentUnits = mysqlTable("development_units", {
	id: int().autoincrement().notNull(),
	developmentId: int("development_id").notNull().references(() => developments.id, { onDelete: "cascade" } ),
	phaseId: int("phase_id").references(() => developmentPhases.id, { onDelete: "set null" } ),
	unitNumber: varchar("unit_number", { length: 100 }).notNull(),
	unitType: mysqlEnum("unit_type", ['studio','1bed','2bed','3bed','4bed+','penthouse','townhouse','house']).notNull(),
	bedrooms: int(),
	bathrooms: decimal({ precision: 3, scale: 1 }),
	size: decimal({ precision: 10, scale: 2 }),
	price: decimal({ precision: 12, scale: 2 }).notNull(),
	floorPlan: text("floor_plan"),
	floor: int(),
	facing: varchar({ length: 50 }),
	features: text(),
	status: mysqlEnum(['available','reserved','sold']).default('available').notNull(),
	reservedAt: timestamp("reserved_at", { mode: 'string' }),
	reservedBy: int("reserved_by"),
	soldAt: timestamp("sold_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("unique_unit_per_development").on(table.developmentId, table.unitNumber),
	index("idx_units_development_id").on(table.developmentId),
	index("idx_units_phase_id").on(table.phaseId),
	index("idx_units_status").on(table.status),
	index("idx_units_unit_type").on(table.unitType),
	index("idx_units_price").on(table.price),
]);

export const developments = mysqlTable("developments", {
	id: int().autoincrement().notNull(),
	developerId: int("developer_id").references(() => developers.id, { onDelete: "cascade" } ),
	developerBrandProfileId: int("developer_brand_profile_id").references(() => developerBrandProfiles.id, { onDelete: "set null" }),
	marketingBrandProfileId: int("marketing_brand_profile_id").references(() => developerBrandProfiles.id, { onDelete: "set null" }), // NEW: Marketing Agency
	marketingRole: mysqlEnum("marketing_role", ['exclusive', 'joint', 'open']).default('exclusive'), // NEW: Mandate type
	name: varchar({ length: 255 }).notNull(),
	tagline: varchar({ length: 255 }), // NEW: Marketing tagline for hero section
	marketingName: varchar("marketing_name", { length: 255 }), // NEW: Optional branding name
	slug: varchar({ length: 255 }),
	description: text(),
	rating: decimal({ precision: 3, scale: 2 }), // Auto-calculated rating
	developmentType: mysqlEnum(['residential','commercial','mixed_use','estate','complex']).notNull(),
	status: mysqlEnum([
		'now-selling',
		'launching-soon',
		'under-construction',
		'ready-to-move',
		'sold-out',
		'phase-completed',
		'new-phase-launching',
		'planning',
		'completed',
		'coming_soon'
	]).default('planning').notNull(),
	address: text(),
	city: varchar({ length: 100 }).notNull(),
	province: varchar({ length: 100 }).notNull(),
	suburb: varchar({ length: 100 }),
	locationId: int("location_id").references(() => locations.id, { onDelete: "set null" } ),
	postalCode: varchar("postal_code", { length: 20 }),
	latitude: varchar({ length: 50 }),
	longitude: varchar({ length: 50 }),
	gpsAccuracy: mysqlEnum("gps_accuracy", ['accurate', 'approximate']).default('approximate'),
	totalUnits: int(),
	availableUnits: int(),
	priceFrom: int(),
	priceTo: int(),
	amenities: json().$type<string[]>(), // Development amenities (Swimming Pool, Clubhouse, etc.)
	highlights: json().$type<string[]>(), // Up to 5 development highlights
	features: json().$type<string[]>(), // Estate-level features (Perimeter Wall, Fibre Ready, etc.)
	estateSpecs: json().$type<any>(), // Structured specifications (Ownership, Power, Security, etc.)
	images: text(),
	videos: text(),
	floorPlans: text(),
	brochures: text(),
	completionDate: timestamp({ mode: 'string' }),
	isFeatured: int().notNull(),
	isPublished: int().default(0).notNull(),
	publishedAt: timestamp({ mode: 'string' }),
	
	// Approval Workflow
	approvalStatus: mysqlEnum("approval_status", ['draft', 'pending', 'approved', 'rejected']).default('draft'),
	readinessScore: int("readiness_score").default(0).notNull(),
	rejectionReasons: json("rejection_reasons"),
	rejectionNote: text("rejection_note"),
	
	showHouseAddress: int().default(1).notNull(),
	views: int().notNull(),
	inquiriesCount: int("inquiries_count").default(0),
	demandScore: int("demand_score").default(0),
	isHotSelling: int("is_hot_selling").default(0),

	// Global Financials
	monthlyLevyFrom: decimal("monthly_levy_from", { precision: 10, scale: 2 }),
	monthlyLevyTo: decimal("monthly_levy_to", { precision: 10, scale: 2 }),
	ratesFrom: decimal("rates_from", { precision: 10, scale: 2 }),
	ratesTo: decimal("rates_to", { precision: 10, scale: 2 }),
	transferCostsIncluded: tinyint("transfer_costs_included").default(0),
	isHighDemand: int("is_high_demand").default(0),
	// Brand Profile Ownership
	devOwnerType: mysqlEnum("dev_owner_type", ['platform', 'developer']).default('developer'), // platform = seeded/unmanaged, developer = subscriber-managed
	isShowcase: tinyint("is_showcase").default(0), // showcase listings for brand profiles
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_developments_developer_id").on(table.developerId),
	index("idx_developments_status").on(table.status),
	index("idx_developments_gps_accuracy").on(table.gpsAccuracy),
	index("idx_developments_suburb").on(table.suburb),
	index("idx_developments_location_id").on(table.locationId),
	unique("unique_slug").on(table.slug),
	index("idx_developments_rating").on(table.rating),
	index("idx_developments_published").on(table.isPublished, table.publishedAt),
]);

// Development Approval Queue
export const developmentApprovalQueue = mysqlTable("development_approval_queue", {
	id: int().autoincrement().notNull(),
	developmentId: int("development_id").notNull().references(() => developments.id, { onDelete: "cascade" }),
	submittedBy: int("submitted_by").notNull().references(() => users.id, { onDelete: "restrict" }),
	
	status: mysqlEnum(['pending', 'reviewing', 'approved', 'rejected']).default('pending').notNull(),
	submissionType: mysqlEnum("submission_type", ['initial', 'update']).default('initial').notNull(),
	
	reviewNotes: text("review_notes"),
	rejectionReason: text("rejection_reason"),
	complianceChecks: json("compliance_checks"),
	
	submittedAt: timestamp("submitted_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	reviewedBy: int("reviewed_by").references(() => users.id, { onDelete: "set null" }),
}, 
(table) => [
	index("idx_dev_approval_status").on(table.status),
	index("idx_dev_approval_dev_id").on(table.developmentId),
]);

export const developmentDrafts = mysqlTable("development_drafts", {
	id: int().autoincrement().notNull(),
	developerId: int().references(() => developers.id, { onDelete: "cascade" }),
	developerBrandProfileId: int("developer_brand_profile_id").references(() => developerBrandProfiles.id, { onDelete: "cascade" }),
	draftName: varchar({ length: 255 }),
	draftData: json().notNull(),
	progress: int().default(0).notNull(),
	currentStep: int().default(0).notNull(),
	lastModified: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	index("idx_dev_drafts_developer_id").on(table.developerId),
	index("idx_dev_drafts_brand_profile_id").on(table.developerBrandProfileId),
	index("idx_dev_drafts_last_modified").on(table.lastModified),
]);

// Hero Campaigns Table (Location-based advertising)
export const heroCampaigns = mysqlTable("hero_campaigns", {
	id:int().autoincrement().primaryKey(),
	locationType: mysqlEnum("location_type", ["province", "city", "suburb"]).notNull(),
	targetSlug: varchar("target_slug", { length: 255 }).notNull(),
	imageUrl: varchar("image_url", { length: 1024 }).notNull(),
	landingPageUrl: varchar("landing_page_url", { length: 1024 }),
	altText: varchar("alt_text", { length: 255 }),
	startDate: timestamp("start_date", { mode: "string" }),
	endDate: timestamp("end_date", { mode: "string" }),
	isActive: tinyint("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
},
(table) => [
	index("idx_hero_campaigns_slug").on(table.targetSlug),
	index("idx_hero_campaigns_active").on(table.isActive),
	index("idx_hero_campaigns_dates").on(table.startDate, table.endDate),
]);



// Unit Types Table (Base Configuration)
export const unitTypes = mysqlTable("unit_types", {
	id: varchar({ length: 36 }).primaryKey(),
	developmentId: int("development_id").notNull().references(() => developments.id, { onDelete: "cascade" }),
	
	// Basic Configuration - NEW columns added to match production
	label: varchar({ length: 255 }),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	ownershipType: mysqlEnum("ownership_type", ['full-title', 'sectional-title', 'leasehold', 'life-rights']).default('sectional-title'),
	structuralType: mysqlEnum("structural_type", ['apartment', 'freestanding-house', 'simplex', 'duplex', 'penthouse', 'plot-and-plan', 'townhouse', 'studio']).default('apartment'),
	floors: mysqlEnum(['single-storey', 'double-storey', 'triplex']),
	
	// Room Configuration
	bedrooms: int().notNull(),
	bathrooms: decimal({ precision: 3, scale: 1 }).notNull(),
	
	// Parking
	parking: mysqlEnum(['none', '1', '2', 'carport', 'garage']).default('none'),
	parkingType: varchar("parking_type", { length: 50 }),
	parkingBays: int("parking_bays").default(0),
	
	// Sizes
	unitSize: int("unit_size"),
	yardSize: int("yard_size"),
	sizeFrom: int("size_from"),
	sizeTo: int("size_to"),
	
	// Pricing - NEW price_from/price_to columns
	priceFrom: decimal("price_from", { precision: 15, scale: 2 }),
	priceTo: decimal("price_to", { precision: 15, scale: 2 }),
	basePriceFrom: decimal("base_price_from", { precision: 15, scale: 2 }).notNull(),
	basePriceTo: decimal("base_price_to", { precision: 15, scale: 2 }),
	depositRequired: decimal("deposit_required", { precision: 15, scale: 2 }),
	
	// Stock Tracking
	totalUnits: int("total_units").default(0).notNull(),
	availableUnits: int("available_units").default(0).notNull(),
	reservedUnits: int("reserved_units").default(0),
	completionDate: date("completion_date"),
	
	// Pricing Details
	transferCostsIncluded: tinyint("transfer_costs_included").default(0),
	monthlyLevy: int("monthly_levy"),
	monthlyLevyFrom: int("monthly_levy_from"),
	monthlyLevyTo: int("monthly_levy_to"),
	ratesAndTaxesFrom: int("rates_and_taxes_from"),
	ratesAndTaxesTo: int("rates_and_taxes_to"),
	
	// Pricing Extras
	extras: json("extras").$type<{ label: string; price: number }[]>(),
	
	// Base Features (Defaults for all specs)
	baseFeatures: json("base_features").$type<{
		builtInWardrobes: boolean;
		tiledFlooring: boolean;
		graniteCounters: boolean;
		prepaidElectricity: boolean;
		balcony: boolean;
		petFriendly: boolean;
	}>(),
	
	// Base Finishes
	baseFinishes: json("base_finishes").$type<{
		paintAndWalls?: string;
		flooringTypes?: string;
		kitchenFeatures?: string;
		bathroomFeatures?: string;
	}>(),
	
	// Base Media (Inherited by all specs)
	baseMedia: json("base_media").$type<{
		gallery: Array<{ id: string; url: string; isPrimary: boolean }>;
		floorPlans: Array<{ id: string; url: string; type: 'image' | 'pdf' }>;
		renders: Array<{ id: string; url: string; type: 'image' | 'video' }>;
	}>(),
	
	// NEW: Structured JSON columns
	specOverrides: json("spec_overrides"),
	specifications: json("specifications"),
	amenities: json("amenities"),
	features: json("features"),
	
	// NEW: Description/Notes columns
	configDescription: text("config_description"),
	virtualTourLink: varchar("virtual_tour_link", { length: 500 }),
	internalNotes: text("internal_notes"),
	
	// Metadata
	displayOrder: int("display_order").default(0),
	isActive: tinyint("is_active").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_unit_types_development_id").on(table.developmentId),
	index("idx_unit_types_price_range").on(table.basePriceFrom, table.basePriceTo),
	index("idx_unit_types_bedrooms_bathrooms").on(table.bedrooms, table.bathrooms),
	index("idx_unit_types_display_order").on(table.displayOrder),
]);

// Spec Variations Table (Specs & Variations)
export const specVariations = mysqlTable("spec_variations", {
	id: varchar({ length: 36 }).primaryKey(),
	unitTypeId: varchar("unit_type_id", { length: 36 }).notNull().references(() => unitTypes.id, { onDelete: "cascade" }),
	
	// Basic Info
	name: varchar({ length: 255 }).notNull(),
	price: decimal({ precision: 15, scale: 2 }).notNull(),
	description: text(),
	
	// Overrides (optional - only store if different from base)
	overrides: json().$type<{
		bedroomsOverride?: number;
		bathroomsOverride?: number;
		sizeOverride?: number;
	}>(),
	
	// Feature Overrides
	featureOverrides: json("feature_overrides").$type<{
		add?: string[];
		remove?: string[];
		replace?: Record<string, string>;
	}>(),
	
	// Spec-Specific Media (overrides base media)
	media: json().$type<{
		photos: Array<{ id: string; url: string; isPrimary: boolean }>;
		floorPlans: Array<{ id: string; url: string; type: 'image' | 'pdf' }>;
		videos: Array<{ id: string; url: string }>;
		pdfs: Array<{ id: string; url: string; name: string }>;
	}>(),
	
	// Metadata
	displayOrder: int("display_order").default(0),
	isActive: tinyint("is_active").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_spec_variations_unit_type_id").on(table.unitTypeId),
	index("idx_spec_variations_price").on(table.price),
	index("idx_spec_variations_display_order").on(table.displayOrder),
]);

// Development Documents Table
export const developmentDocuments = mysqlTable("development_documents", {
	id: varchar({ length: 36 }).primaryKey(),
	developmentId: int("development_id").notNull().references(() => developments.id, { onDelete: "cascade" }),
	unitTypeId: varchar("unit_type_id", { length: 36 }).references(() => unitTypes.id, { onDelete: "cascade" }),
	
	name: varchar({ length: 255 }).notNull(),
	type: mysqlEnum(['brochure', 'site-plan', 'pricing-sheet', 'estate-rules', 'engineering-pack', 'other']).notNull(),
	url: varchar({ length: 500 }).notNull(),
	fileSize: int("file_size"),
	mimeType: varchar("mime_type", { length: 100 }),
	
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	index("idx_dev_docs_development_id").on(table.developmentId),
	index("idx_dev_docs_unit_type_id").on(table.unitTypeId),
	index("idx_dev_docs_type").on(table.type),
]);

export const exploreCategories = mysqlTable("explore_categories", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	slug: varchar({ length: 100 }).notNull(),
	icon: varchar({ length: 50 }),
	image: text(),
	type: mysqlEnum(['lifestyle', 'property', 'investment', 'demographic']).default('lifestyle').notNull(),
	displayOrder: int().default(0),
	isActive: int().default(1),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const exploreTopics = mysqlTable("explore_topics", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	slug: varchar({ length: 100 }).notNull(),
	description: text(),
	coverImage: text(),
	type: mysqlEnum(['curated', 'algorithmic', 'seasonal', 'sponsored']).default('curated').notNull(),
	isActive: int().default(1),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const exploreNeighbourhoodStories = mysqlTable("explore_neighbourhood_stories", {
	id: int().autoincrement().notNull(),
	suburbId: int("suburb_id").references(() => suburbs.id, { onDelete: "cascade" }),
	title: varchar({ length: 255 }).notNull(),
	coverImage: text("cover_image"),
	videoUrl: text("video_url"),
	storyData: json("story_data"),
	category: varchar({ length: 100 }),
	isPublished: int("is_published").default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	index("idx_ens_suburb_id").on(table.suburbId),
]);

export const exploreSponsorships = mysqlTable("explore_sponsorships", {
	id: int().autoincrement().notNull(),
	targetType: mysqlEnum("target_type", ['listing', 'development', 'agent', 'video', 'neighbourhood']).notNull(),
	targetId: int("target_id").notNull(),
	tier: mysqlEnum(['basic', 'premium', 'exclusive']).default('basic').notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	impressionsTarget: int("impressions_target"),
	impressionsDelivered: int("impressions_delivered").default(0),
	clicksDelivered: int("clicks_delivered").default(0),
	status: mysqlEnum(['active', 'scheduled', 'completed', 'paused']).default('scheduled').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	index("idx_es_target").on(table.targetType, table.targetId),
	index("idx_es_status").on(table.status),
]);

export const emailTemplates = mysqlTable("email_templates", {
	id: int().autoincrement().notNull(),
	templateKey: varchar({ length: 100 }).notNull(),
	subject: varchar({ length: 255 }).notNull(),
	htmlContent: text().notNull(),
	textContent: text(),
	agencyId: int().references(() => agencies.id, { onDelete: "cascade" } ),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const exploreComments = mysqlTable("exploreComments", {
	id: varchar({ length: 191 }).notNull(),
	videoId: varchar({ length: 191 }).notNull(),
	userId: int().notNull(),
	comment: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const exploreFollows = mysqlTable("exploreFollows", {
	id: varchar({ length: 191 }).notNull(),
	followerId: int().notNull(),
	followingId: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
},
(table) => [
	index("unique_follow").on(table.followerId, table.followingId),
]);

export const exploreLikes = mysqlTable("exploreLikes", {
	id: varchar({ length: 191 }).notNull(),
	videoId: varchar({ length: 191 }).notNull(),
	userId: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
},
(table) => [
	index("unique_like").on(table.videoId, table.userId),
]);

export const exploreVideoViews = mysqlTable("exploreVideoViews", {
	id: varchar({ length: 191 }).notNull(),
	videoId: varchar({ length: 191 }).notNull(),
	userId: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const exploreVideos = mysqlTable("exploreVideos", {
	id: int().autoincrement().notNull(),
	agentId: int().references(() => agents.id, { onDelete: "cascade" } ),
	propertyId: int().references(() => properties.id, { onDelete: "set null" } ),
	developmentId: int().references(() => developments.id, { onDelete: "set null" } ),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	videoUrl: text().notNull(),
	thumbnailUrl: text(),
	duration: int(),
	views: int().notNull(),
	likes: int().notNull(),
	shares: int().notNull(),
	isPublished: int().default(1).notNull(),
	isFeatured: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const exploreHighlightTags = mysqlTable("explore_highlight_tags", {
	id: int().autoincrement().notNull(),
	tagKey: varchar("tag_key", { length: 50 }).notNull(),
	label: varchar({ length: 100 }).notNull(),
	icon: varchar({ length: 50 }),
	color: varchar({ length: 7 }),
	category: varchar({ length: 50 }),
	displayOrder: int("display_order").default(0).notNull(),
	isActive: tinyint("is_active").default(1).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	index("idx_explore_highlight_tags_category").on(table.category),
	index("idx_explore_highlight_tags_display_order").on(table.displayOrder),
	index("tag_key").on(table.tagKey),
]);

export const exploreInteractions = mysqlTable("explore_interactions", {
	id: int().autoincrement().notNull(),
	shortId: int("short_id").notNull(),
	userId: int("user_id"),
	sessionId: varchar("session_id", { length: 255 }).notNull(),
	interactionType: mysqlEnum("interaction_type", ['impression','view','skip','save','share','contact','whatsapp','book_viewing']).notNull(),
	duration: int(),
	timestamp: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	feedType: mysqlEnum("feed_type", ['recommended','area','category','agent','developer']).notNull(),
	feedContext: json("feed_context"),
	deviceType: mysqlEnum("device_type", ['mobile','tablet','desktop']).notNull(),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address", { length: 45 }),
	metadata: json(),
},
(table) => [
	index("idx_explore_interactions_short_id").on(table.shortId),
	index("idx_explore_interactions_user_id").on(table.userId),
	index("idx_explore_interactions_session_id").on(table.sessionId),
	index("idx_explore_interactions_type").on(table.interactionType),
	index("idx_explore_interactions_timestamp").on(table.timestamp),
]);

export const exploreShorts = mysqlTable("explore_shorts", {
	id: int().autoincrement().notNull(),
	listingId: int("listing_id"),
	developmentId: int("development_id"),
	agentId: int("agent_id"),
	developerId: int("developer_id"),
	agencyId: int("agency_id"),
	partnerId: varchar("partner_id", { length: 36 }),
	contentType: mysqlEnum("content_type", ['property_tour', 'development_promo', 'agent_intro', 'neighbourhood_tour', 'market_insight', 'lifestyle', 'education']).default('property_tour').notNull(),
	topicId: int("topic_id").references(() => exploreTopics.id, { onDelete: 'set null' }),
	categoryId: int("category_id").references(() => exploreCategories.id, { onDelete: 'set null' }),
	contentCategory: mysqlEnum("content_category", ['primary', 'secondary', 'tertiary']).default('primary'),
	badgeType: varchar("badge_type", { length: 50 }),
	isLaunchContent: boolean("is_launch_content").default(false),
	title: varchar({ length: 255 }).notNull(),
	caption: text(),
	primaryMediaId: int("primary_media_id").notNull(),
	mediaIds: json("media_ids").notNull(),
	highlights: json(),
	performanceScore: decimal("performance_score", { precision: 5, scale: 2 }).default('0').notNull(),
	boostPriority: int("boost_priority").default(0).notNull(),
	viewCount: int("view_count").default(0).notNull(),
	uniqueViewCount: int("unique_view_count").default(0).notNull(),
	saveCount: int("save_count").default(0).notNull(),
	shareCount: int("share_count").default(0).notNull(),
	skipCount: int("skip_count").default(0).notNull(),
	averageWatchTime: int("average_watch_time").default(0).notNull(),
	viewThroughRate: decimal("view_through_rate", { precision: 5, scale: 2 }).default('0').notNull(),
	saveRate: decimal("save_rate", { precision: 5, scale: 2 }).default('0').notNull(),
	shareRate: decimal("share_rate", { precision: 5, scale: 2 }).default('0').notNull(),
	skipRate: decimal("skip_rate", { precision: 5, scale: 2 }).default('0').notNull(),
	isPublished: tinyint("is_published").default(1).notNull(),
	isFeatured: tinyint("is_featured").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	publishedAt: timestamp("published_at", { mode: 'string' }),
},
(table) => [
	index("idx_explore_shorts_listing_id").on(table.listingId),
	index("idx_explore_shorts_development_id").on(table.developmentId),
	index("idx_explore_shorts_agent_id").on(table.agentId),
	index("idx_explore_shorts_agency_id").on(table.agencyId),
	index("idx_shorts_partner").on(table.partnerId),
	index("idx_shorts_category").on(table.contentCategory),
	index("idx_explore_shorts_performance_score").on(table.performanceScore),
	index("idx_explore_shorts_boost_priority").on(table.boostPriority),
	index("idx_explore_shorts_published").on(table.isPublished, table.publishedAt),
	index("idx_explore_shorts_agency_published").on(table.agencyId, table.isPublished, table.publishedAt),
	index("idx_explore_shorts_agency_performance").on(table.agencyId, table.performanceScore, table.viewCount),
]);

export const exploreUserPreferences = mysqlTable("explore_user_preferences", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	preferredLocations: json("preferred_locations"),
	budgetMin: int("budget_min"),
	budgetMax: int("budget_max"),
	propertyTypes: json("property_types"),
	interactionHistory: json("interaction_history"),
	savedProperties: json("saved_properties"),
	inferredPreferences: json("inferred_preferences"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("user_id").on(table.userId),
]);

export const favorites = mysqlTable("favorites", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	propertyId: int().notNull().references(() => properties.id, { onDelete: "cascade" } ),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const invitations = mysqlTable("invitations", {
	id: int().autoincrement().notNull(),
	agencyId: int().notNull().references(() => agencies.id, { onDelete: "cascade" } ),
	invitedBy: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	email: varchar({ length: 320 }).notNull(),
	role: varchar({ length: 50 }).default('agent').notNull(),
	token: varchar({ length: 255 }).notNull(),
	status: mysqlEnum(['pending','accepted','expired','cancelled']).default('pending').notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	acceptedAt: timestamp({ mode: 'string' }),
	acceptedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const invites = mysqlTable("invites", {
	id: int().autoincrement().notNull(),
	agencyId: int().notNull().references(() => agencies.id, { onDelete: "cascade" } ),
	email: varchar({ length: 255 }).notNull(),
	token: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 30 }).default('agent'),
	expiresAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	used: int().notNull(),
	usedAt: timestamp({ mode: 'string' }),
	usedBy: int().references(() => users.id, { onDelete: "set null" } ),
});

export const invoices = mysqlTable("invoices", {
	id: int().autoincrement().notNull(),
	agencyId: int().notNull().references(() => agencies.id, { onDelete: "cascade" } ),
	subscriptionId: int().references(() => agencySubscriptions.id, { onDelete: "set null" } ),
	stripeInvoiceId: varchar({ length: 100 }),
	stripeCustomerId: varchar({ length: 100 }),
	amount: int().notNull(),
	currency: varchar({ length: 3 }).default('ZAR').notNull(),
	status: mysqlEnum(['draft','open','paid','void','uncollectible']).default('draft').notNull(),
	invoicePdf: text(),
	hostedInvoiceUrl: text(),
	invoiceNumber: varchar({ length: 50 }),
	description: text(),
	billingReason: mysqlEnum(['subscription_cycle','subscription_create','subscription_update','subscription_finalize','manual']).default('subscription_cycle').notNull(),
	periodStart: timestamp({ mode: 'string' }),
	periodEnd: timestamp({ mode: 'string' }),
	paidAt: timestamp({ mode: 'string' }),
	dueDate: timestamp({ mode: 'string' }),
	metadata: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const partners = mysqlTable("partners", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	category: mysqlEnum(['mortgage_broker','lawyer','photographer','inspector','mover','other']).default('other').notNull(),
	description: text(),
	contactPerson: varchar("contact_person", { length: 255 }),
	email: varchar({ length: 320 }),
	phone: varchar({ length: 50 }),
	website: varchar({ length: 255 }),
	logo: text(),
	status: mysqlEnum(['active','inactive','pending']).default('active').notNull(),
	rating: int(),
	isVerified: int("is_verified").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => [
	index("idx_partners_status").on(table.status),
	index("idx_partners_category").on(table.category),
]);

export const leadActivities = mysqlTable("lead_activities", {
	id: int().autoincrement().notNull(),
	leadId: int().notNull().references(() => leads.id, { onDelete: "cascade" } ),
	agentId: int().references(() => agents.id, { onDelete: "set null" } ),
	activityType: mysqlEnum(['call','email','meeting','note','status_change','viewing_scheduled','offer_sent']).notNull(),
	description: text(),
	metadata: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const leads = mysqlTable("leads", {
	id: int().autoincrement().notNull(),
	propertyId: int().references(() => properties.id, { onDelete: "set null" } ),
	developmentId: int().references(() => developments.id, { onDelete: "set null" } ),
	developerBrandProfileId: int("developer_brand_profile_id").references(() => developerBrandProfiles.id, { onDelete: "set null" }),
	agencyId: int().references(() => agencies.id, { onDelete: "set null" } ),
	agentId: int().references(() => agents.id, { onDelete: "set null" } ),
	name: varchar({ length: 200 }).notNull(),
	email: varchar({ length: 320 }).notNull(),
	phone: varchar({ length: 50 }),
	message: text(),
	leadType: mysqlEnum(['inquiry','viewing_request','offer','callback']).default('inquiry').notNull(),
	status: mysqlEnum(['new','contacted','qualified','converted','closed','viewing_scheduled','offer_sent','lost']).default('new').notNull(),
	source: varchar({ length: 100 }),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	nextFollowUp: timestamp({ mode: 'string' }),
	lastContactedAt: timestamp({ mode: 'string' }),
	notes: text(),
	affordabilityData: json("affordability_data"),
	qualificationStatus: mysqlEnum("qualification_status", ['qualified','partially_qualified','unqualified','pending']).default('pending'),
	qualificationScore: int("qualification_score").default(0),
	leadSource: varchar("lead_source", { length: 100 }),
	referrerUrl: text("referrer_url"),
	utmSource: varchar("utm_source", { length: 100 }),
	utmMedium: varchar("utm_medium", { length: 100 }),
	utmCampaign: varchar("utm_campaign", { length: 100 }),
	funnelStage: mysqlEnum("funnel_stage", ['interest','affordability','qualification','viewing','offer','bond','sale']).default('interest'),
	assignedTo: int("assigned_to"),
	assignedAt: timestamp("assigned_at", { mode: 'string' }),
	convertedAt: timestamp("converted_at", { mode: 'string' }),
	lostReason: text("lost_reason"),
	// Brand Lead Tracking
	brandLeadStatus: mysqlEnum("brand_lead_status", ['captured', 'delivered_unsubscribed', 'delivered_subscriber', 'claimed']).default('captured'),
	leadDeliveryMethod: mysqlEnum("lead_delivery_method", ['email', 'crm_export', 'manual', 'none']).default('email'),
},
(table) => [
	index("idx_leads_qualification_status").on(table.qualificationStatus),
	index("idx_leads_funnel_stage").on(table.funnelStage),
	index("idx_leads_assigned_to").on(table.assignedTo),
	index("idx_leads_lead_source").on(table.leadSource),
]);

export const listingAnalytics = mysqlTable("listing_analytics", {
	id: int().autoincrement().notNull(),
	listingId: int().notNull().references(() => listings.id, { onDelete: "cascade" } ),
	totalViews: int().default(0).notNull(),
	uniqueVisitors: int().default(0).notNull(),
	viewsByDay: json(),
	totalLeads: int().default(0).notNull(),
	contactFormLeads: int().default(0).notNull(),
	whatsappClicks: int().default(0).notNull(),
	phoneReveals: int().default(0).notNull(),
	bookingViewingRequests: int().default(0).notNull(),
	totalFavorites: int().default(0).notNull(),
	totalShares: int().default(0).notNull(),
	averageTimeOnPage: int(),
	trafficSources: json(),
	conversionRate: decimal({ precision: 5, scale: 2 }),
	leadConversionRate: decimal({ precision: 5, scale: 2 }),
	lastUpdated: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const listingApprovalQueue = mysqlTable("listing_approval_queue", {
	id: int().autoincrement().notNull(),
	listingId: int().notNull().references(() => listings.id, { onDelete: "cascade" } ),
	submittedBy: int().notNull(),
	submittedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	status: mysqlEnum(['pending','reviewing','approved','rejected']).default('pending').notNull(),
	priority: mysqlEnum(['low','normal','high','urgent']).default('normal').notNull(),
	reviewedBy: int(),
	reviewedAt: timestamp({ mode: 'string' }),
	reviewNotes: text(),
	rejectionReason: text(),
	complianceChecks: json(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const listingLeads = mysqlTable("listing_leads", {
	id: int().autoincrement().notNull(),
	listingId: int().notNull().references(() => listings.id, { onDelete: "cascade" } ),
	name: varchar({ length: 200 }).notNull(),
	email: varchar({ length: 320 }),
	phone: varchar({ length: 50 }),
	message: text(),
	leadType: mysqlEnum(['contact_form','whatsapp_click','phone_reveal','book_viewing','make_offer','request_info']).notNull(),
	source: varchar({ length: 100 }),
	referrer: text(),
	utmSource: varchar({ length: 100 }),
	utmMedium: varchar({ length: 100 }),
	utmCampaign: varchar({ length: 100 }),
	assignedTo: int(),
	assignedAt: timestamp({ mode: 'string' }),
	status: mysqlEnum(['new','contacted','qualified','viewing_scheduled','offer_made','converted','lost']).default('new').notNull(),
	crmSynced: int().default(0),
	crmSyncedAt: timestamp({ mode: 'string' }),
	crmId: varchar({ length: 255 }),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const listingMedia = mysqlTable("listing_media", {
	id: int().autoincrement().notNull(),
	listingId: int().notNull().references(() => listings.id, { onDelete: "cascade" } ),
	mediaType: mysqlEnum(['image','video','floorplan','pdf']).notNull(),
	originalUrl: text().notNull(),
	originalFileName: varchar({ length: 255 }),
	originalFileSize: int(),
	processedUrl: text(),
	thumbnailUrl: text(),
	previewUrl: text(),
	width: int(),
	height: int(),
	duration: int(),
	mimeType: varchar({ length: 100 }),
	orientation: mysqlEnum(['vertical','horizontal','square']),
	isVertical: int().default(0),
	displayOrder: int().default(0).notNull(),
	isPrimary: int().default(0).notNull(),
	processingStatus: mysqlEnum(['pending','processing','completed','failed']).default('pending'),
	processingError: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	uploadedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	processedAt: timestamp({ mode: 'string' }),
});

export const listingSettings = mysqlTable("listing_settings", {
	id: int().autoincrement().notNull(),
	autoPublishForVerifiedAccounts: int().default(0).notNull(),
	maxImagesPerListing: int().default(30).notNull(),
	maxVideosPerListing: int().default(5).notNull(),
	maxFloorplansPerListing: int().default(5).notNull(),
	maxPdfsPerListing: int().default(3).notNull(),
	maxImageSizeMb: int().default(5).notNull(),
	maxVideoSizeMb: int().default(50).notNull(),
	maxVideoDurationSeconds: int().default(180).notNull(),
	videoCompressionEnabled: int().default(1).notNull(),
	videoThumbnailEnabled: int().default(1).notNull(),
	videoPreviewClipSeconds: int().default(3).notNull(),
	crmWebhookUrl: text(),
	crmEnabled: int().default(0).notNull(),
	newListingNotificationsEnabled: int().default(1).notNull(),
	leadNotificationsEnabled: int().default(1).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	updatedBy: int(),
});

export const listingViewings = mysqlTable("listing_viewings", {
	id: int().autoincrement().notNull(),
	listingId: int().notNull().references(() => listings.id, { onDelete: "cascade" } ),
	leadId: int(),
	scheduledDate: timestamp({ mode: 'string' }).notNull(),
	duration: int().default(30),
	visitorName: varchar({ length: 200 }).notNull(),
	visitorEmail: varchar({ length: 320 }),
	visitorPhone: varchar({ length: 50 }),
	status: mysqlEnum(['requested','confirmed','completed','cancelled','no_show']).default('requested').notNull(),
	agentId: int(),
	agentNotes: text(),
	visitorFeedback: text(),
	visitorRating: int(),
	reminderSent: int().default(0),
	confirmationSent: int().default(0),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const listings = mysqlTable("listings", {
	id: int().autoincrement().notNull(),
	ownerId: int().notNull(),
	agentId: int(),
	agencyId: int(),
	action: mysqlEnum(['sell','rent','auction']).notNull(),
	propertyType: mysqlEnum(['apartment','house','farm','land','commercial','shared_living']).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text().notNull(),
	askingPrice: decimal({ precision: 12, scale: 2 }),
	negotiable: int().default(0),
	transferCostEstimate: decimal({ precision: 12, scale: 2 }),
	monthlyRent: decimal({ precision: 12, scale: 2 }),
	deposit: decimal({ precision: 12, scale: 2 }),
	leaseTerms: varchar({ length: 100 }),
	availableFrom: timestamp({ mode: 'string' }),
	utilitiesIncluded: int().default(0),
	startingBid: decimal({ precision: 12, scale: 2 }),
	reservePrice: decimal({ precision: 12, scale: 2 }),
	auctionDateTime: timestamp({ mode: 'string' }),
	auctionTermsDocumentUrl: text(),
	propertyDetails: json(),
	address: text().notNull(),
	latitude: decimal({ precision: 10, scale: 7 }).notNull(),
	longitude: decimal({ precision: 10, scale: 7 }).notNull(),
	city: varchar({ length: 100 }).notNull(),
	suburb: varchar({ length: 100 }),
	province: varchar({ length: 100 }).notNull(),
	postalCode: varchar({ length: 20 }),
	placeId: varchar({ length: 255 }),
	mainMediaId: int(),
	mainMediaType: mysqlEnum(['image','video']),
	status: mysqlEnum(['draft','pending_review','approved','published','rejected','archived','sold','rented']).default('draft').notNull(),
	approvalStatus: mysqlEnum(['pending','approved','rejected']).default('pending'),
	reviewedBy: int(),
	reviewedAt: timestamp({ mode: 'string' }),
	rejectionReason: text(),
	autoPublished: int().default(0),
	slug: varchar({ length: 255 }).notNull(),
	readinessScore: int("readiness_score").default(0).notNull(),
	qualityScore: int("quality_score").default(0).notNull(),
	qualityBreakdown: json("quality_breakdown"),
	rejectionReasons: json("rejection_reasons"),
	rejectionNote: text("rejection_note"),
	metaTitle: varchar({ length: 255 }),
	metaDescription: text(),
	canonicalUrl: text(),
	searchTags: text(),
	featured: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	publishedAt: timestamp({ mode: 'string' }),
	archivedAt: timestamp({ mode: 'string' }),
});

export const locationSearchCache = mysqlTable("location_search_cache", {
	id: int().autoincrement().notNull(),
	searchQuery: varchar({ length: 255 }).notNull(),
	searchType: mysqlEnum(['province','city','suburb','address','all']).notNull(),
	resultsJson: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
});

export const locations = mysqlTable("locations", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 200 }).notNull(),
	slug: varchar({ length: 200 }).notNull(),
	type: mysqlEnum(['province','city','suburb','neighborhood']).notNull(),
	parentId: int(),
	placeId: varchar("place_id", { length: 255 }),
	description: text(),
	latitude: varchar({ length: 50 }),
	longitude: varchar({ length: 50 }),
	viewportNeLat: decimal("viewport_ne_lat", { precision: 10, scale: 8 }),
	viewportNeLng: decimal("viewport_ne_lng", { precision: 11, scale: 8 }),
	viewportSwLat: decimal("viewport_sw_lat", { precision: 10, scale: 8 }),
	viewportSwLng: decimal("viewport_sw_lng", { precision: 11, scale: 8 }),
	seoTitle: varchar("seo_title", { length: 255 }),
	seoDescription: text("seo_description"),
	heroImage: varchar("hero_image", { length: 500 }),
	propertyCount: int(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_locations_place_id").on(table.placeId),
	index("idx_locations_slug").on(table.slug),
	index("idx_locations_parent_id").on(table.parentId),
]);

export const locationAnalyticsEvents = mysqlTable("location_analytics_events", {
	id: int().autoincrement().notNull(),
	eventType: varchar("event_type", { length: 50 }).notNull(),
	locationId: int("location_id"),
	developmentId: int("development_id"),
	listingId: int("listing_id"),
	targetId: int("target_id"),
	metadata: json(),
	sessionId: varchar("session_id", { length: 100 }),
	userId: int("user_id").references(() => users.id, { onDelete: "set null" }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("idx_loc_analytics_event").on(table.eventType),
	index("idx_loc_analytics_created").on(table.createdAt),
	index("idx_loc_analytics_location").on(table.locationId),
	index("idx_loc_analytics_development").on(table.developmentId),
]);

export const locationTargeting = mysqlTable("location_targeting", {
	id: int().autoincrement().notNull(),
	targetType: mysqlEnum("target_type", ['hero_ad', 'featured_developer', 'recommended_agent']).notNull(),
	targetId: int("target_id").notNull(),
	locationType: mysqlEnum("location_type", ['province', 'city', 'suburb']).notNull(),
	locationId: int("location_id").notNull(),
	ranking: int().default(0),
	startDate: timestamp("start_date", { mode: 'string' }),
	endDate: timestamp("end_date", { mode: 'string' }),
	status: mysqlEnum(['active', 'scheduled', 'expired', 'paused']).default('scheduled').notNull(),
	metadata: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	index("idx_location_targeting").on(table.locationType, table.locationId, table.status),
]);

export const locationSearches = mysqlTable("location_searches", {
	id: int().autoincrement().notNull(),
	locationId: int("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	userId: int("user_id").references(() => users.id, { onDelete: "set null" }),
	searchedAt: timestamp("searched_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	index("idx_location_searched").on(table.locationId, table.searchedAt),
	index("idx_user_id").on(table.userId),
]);

export const recentSearches = mysqlTable("recent_searches", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	locationId: int("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	searchedAt: timestamp("searched_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	index("idx_user_recent").on(table.userId, table.searchedAt),
	index("unique_user_location").on(table.userId, table.locationId),
]);

export const marketInsightsCache = mysqlTable("market_insights_cache", {
	id: int().autoincrement().notNull(),
	cacheKey: varchar({ length: 255 }).notNull(),
	cacheData: text().notNull(),
	cacheType: mysqlEnum(['suburb_heatmap','city_trends','popular_areas','price_predictions','user_recommendations']).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	type: mysqlEnum(['lead_assigned','offer_received','showing_scheduled','system_alert']).notNull(),
	title: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	data: text(),
	isRead: int().notNull(),
	readAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const offers = mysqlTable("offers", {
	id: int().autoincrement().notNull(),
	propertyId: int().notNull().references(() => properties.id, { onDelete: "cascade" } ),
	leadId: int().references(() => leads.id, { onDelete: "set null" } ),
	agentId: int().references(() => agents.id, { onDelete: "set null" } ),
	buyerName: varchar({ length: 200 }).notNull(),
	buyerEmail: varchar({ length: 320 }),
	buyerPhone: varchar({ length: 50 }),
	offerAmount: int().notNull(),
	status: mysqlEnum(['pending','accepted','rejected','countered','withdrawn']).default('pending').notNull(),
	conditions: text(),
	expiresAt: timestamp({ mode: 'string' }),
	respondedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const paymentMethods = mysqlTable("payment_methods", {
	id: int().autoincrement().notNull(),
	agencyId: int().notNull().references(() => agencies.id, { onDelete: "cascade" } ),
	stripePaymentMethodId: varchar({ length: 100 }),
	type: mysqlEnum(['card','bank_account']).default('card').notNull(),
	cardBrand: varchar({ length: 20 }),
	cardLast4: varchar({ length: 4 }),
	cardExpMonth: int(),
	cardExpYear: int(),
	bankName: varchar({ length: 100 }),
	bankLast4: varchar({ length: 4 }),
	isDefault: int().notNull(),
	isActive: int().default(1).notNull(),
	metadata: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const plans = mysqlTable("plans", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	displayName: varchar({ length: 100 }).notNull(),
	description: text(),
	price: int().notNull(),
	currency: varchar({ length: 3 }).default('ZAR').notNull(),
	interval: mysqlEnum(['month','year']).default('month').notNull(),
	stripePriceId: varchar({ length: 100 }),
	features: text(),
	limits: text(),
	isActive: int().default(1).notNull(),
	isPopular: int().notNull(),
	sortOrder: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const platformSettings = mysqlTable("platform_settings", {
	id: int().autoincrement().notNull(),
	key: varchar({ length: 100 }).notNull(),
	value: text().notNull(),
	description: text(),
	category: mysqlEnum(['pricing','features','notifications','limits','other']).default('other').notNull(),
	isPublic: int().notNull(),
	updatedBy: int().references(() => users.id, { onDelete: "set null" } ),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const priceAnalytics = mysqlTable("price_analytics", {
	id: int().autoincrement().notNull(),
	locationId: int().notNull(),
	locationType: mysqlEnum(['suburb','city','province']).notNull(),
	currentAvgPrice: int(),
	currentMedianPrice: int(),
	currentMinPrice: int(),
	currentMaxPrice: int(),
	currentPriceCount: int(),
	oneMonthGrowthPercent: int(),
	threeMonthGrowthPercent: int(),
	sixMonthGrowthPercent: int(),
	oneYearGrowthPercent: int(),
	luxurySegmentPercent: int(),
	midRangePercent: int(),
	affordablePercent: int(),
	avgDaysOnMarket: int(),
	newListingsMonthly: int(),
	soldPropertiesMonthly: int(),
	trendingDirection: mysqlEnum(['up','down','stable']).default('stable').notNull(),
	trendConfidence: int(),
	totalProperties: int(),
	activeListings: int(),
	userInteractions: int(),
	priceVolatility: int(),
	marketMomentum: int(),
	investmentScore: int(),
	lastUpdated: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const priceHistory = mysqlTable("price_history", {
	id: int().autoincrement().notNull(),
	propertyId: int().notNull().references(() => properties.id, { onDelete: "cascade" } ),
	suburbId: int(),
	cityId: int(),
	provinceId: int(),
	price: int().notNull(),
	pricePerSqm: int(),
	propertyType: mysqlEnum(['apartment','house','villa','plot','commercial','townhouse','cluster_home','farm','shared_living']).notNull(),
	listingType: mysqlEnum(['sale','rent','rent_to_buy','auction','shared_living']).notNull(),
	recordedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	source: mysqlEnum(['new_listing','price_change','sold','rented','market_update']).default('market_update').notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const pricePredictions = mysqlTable("price_predictions", {
	id: int().autoincrement().notNull(),
	propertyId: int().references(() => properties.id, { onDelete: "cascade" } ),
	suburbId: int().references(() => suburbs.id, { onDelete: "cascade" } ),
	cityId: int().references(() => cities.id, { onDelete: "cascade" } ),
	provinceId: int().references(() => provinces.id, { onDelete: "cascade" } ),
	predictedPrice: int().notNull(),
	predictedPriceRangeMin: int(),
	predictedPriceRangeMax: int(),
	confidenceScore: int(),
	modelVersion: varchar({ length: 50 }),
	modelFeatures: text(),
	trainingDataSize: int(),
	actualPrice: int(),
	predictionError: int(),
	predictionAccuracy: int(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	validatedAt: timestamp({ mode: 'string' }),
});

export const properties = mysqlTable("properties", {
	id: int().autoincrement().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text().notNull(),
	propertyType: mysqlEnum(['apartment','house','villa','plot','commercial','townhouse','cluster_home','farm','shared_living']).notNull(),
	listingType: mysqlEnum(['sale','rent','rent_to_buy','auction','shared_living']).notNull(),
	transactionType: mysqlEnum(['sale','rent','rent_to_buy','auction']).default('sale').notNull(),
	price: int().notNull(),
	bedrooms: int(),
	bathrooms: int(),
	area: int().notNull(),
	address: text().notNull(),
	city: varchar({ length: 100 }).notNull(),
	province: varchar({ length: 100 }).notNull(),
	zipCode: varchar({ length: 20 }),
	latitude: varchar({ length: 50 }),
	longitude: varchar({ length: 50 }),
	provinceId: int().references(() => provinces.id, { onDelete: "set null" } ),
	cityId: int().references(() => cities.id, { onDelete: "set null" } ),
	suburbId: int().references(() => suburbs.id, { onDelete: "set null" } ),
	locationId: int("location_id").references(() => locations.id, { onDelete: "set null" } ),
	locationText: text(),
	placeId: varchar({ length: 255 }),
	amenities: text(),
	yearBuilt: int(),
	status: mysqlEnum(['available','sold','rented','pending','draft','published','archived']).default('available').notNull(),
	featured: int().notNull(),
	views: int().notNull(),
	enquiries: int().notNull(),
	agentId: int().references(() => agents.id, { onDelete: "set null" } ),
	developmentId: int().references(() => developments.id, { onDelete: "set null" } ),
	developerBrandProfileId: int("developer_brand_profile_id").references(() => developerBrandProfiles.id, { onDelete: "set null" }),
	ownerId: int().notNull().references(() => users.id),
	propertySettings: text(),
	videoUrl: text(),
	virtualTourUrl: text(),
	levies: int(),
	ratesAndTaxes: int(),
	mainImage: varchar({ length: 1024 }),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("price_idx").on(table.price),
	index("status_idx").on(table.status),
	index("city_idx").on(table.city),
	index("province_idx").on(table.province),
	index("property_type_idx").on(table.propertyType),
	index("listing_type_idx").on(table.listingType),
	index("bedrooms_idx").on(table.bedrooms),
	index("bathrooms_idx").on(table.bathrooms),
	index("idx_properties_cityId").on(table.cityId),
	index("idx_properties_suburbId").on(table.suburbId),
	index("idx_properties_location_id").on(table.locationId),
	index("idx_properties_cityId_status").on(table.cityId, table.status),
	index("idx_properties_cityId_area").on(table.cityId, table.area),
]);

export const propertyImages = mysqlTable("propertyImages", {
	id: int().autoincrement().notNull(),
	propertyId: int().notNull().references(() => properties.id, { onDelete: "cascade" } ),
	imageUrl: text().notNull(),
	isPrimary: int().notNull(),
	displayOrder: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const propertySimilarityIndex = mysqlTable("property_similarity_index", {
	id: int().autoincrement().notNull(),
	propertyId1: int().notNull().references(() => properties.id, { onDelete: "cascade" } ),
	propertyId2: int().notNull().references(() => properties.id, { onDelete: "cascade" } ),
	locationSimilarity: int(),
	priceSimilarity: int(),
	typeSimilarity: int(),
	featureSimilarity: int(),
	overallSimilarity: int(),
	similarityReason: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const prospectFavorites = mysqlTable("prospect_favorites", {
	id: int().autoincrement().notNull(),
	prospectId: int().notNull().references(() => prospects.id, { onDelete: "cascade" } ),
	propertyId: int().notNull().references(() => properties.id, { onDelete: "cascade" } ),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const prospects = mysqlTable("prospects", {
	id: int().autoincrement().notNull(),
	sessionId: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 320 }),
	phone: varchar({ length: 50 }),
	income: int(),
	incomeRange: mysqlEnum(['under_15k','15k_25k','25k_50k','50k_100k','over_100k']),
	employmentStatus: mysqlEnum(['employed','self_employed','business_owner','student','retired','unemployed']),
	combinedIncome: int(),
	monthlyExpenses: int(),
	monthlyDebts: int(),
	dependents: int(),
	savingsDeposit: int(),
	creditScore: int(),
	hasCreditConsent: int(),
	buyabilityScore: mysqlEnum(['low','medium','high']),
	affordabilityMin: int(),
	affordabilityMax: int(),
	monthlyPaymentCapacity: int(),
	profileProgress: int(),
	badges: text(),
	lastActivity: timestamp({ mode: 'string' }),
	preferredPropertyType: mysqlEnum(['apartment','house','villa','plot','commercial','townhouse','cluster_home','farm','shared_living']),
	preferredLocation: varchar({ length: 100 }),
	maxCommuteTime: int(),
	ipAddress: varchar({ length: 45 }),
	userAgent: text(),
	referrer: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const provinces = mysqlTable("provinces", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	slug: varchar({ length: 200 }),
	placeId: varchar("place_id", { length: 255 }),
	seoTitle: varchar("seo_title", { length: 255 }),
	seoDescription: text("seo_description"),
	code: varchar({ length: 10 }).notNull(),
	latitude: varchar({ length: 20 }),
	longitude: varchar({ length: 21 }),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_provinces_slug").on(table.slug),
	index("idx_provinces_place_id").on(table.placeId),
]);

export const recentlyViewed = mysqlTable("recently_viewed", {
	id: int().autoincrement().notNull(),
	prospectId: int().notNull().references(() => prospects.id, { onDelete: "cascade" } ),
	propertyId: int().notNull().references(() => properties.id, { onDelete: "cascade" } ),
	viewedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const reviews = mysqlTable("reviews", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	reviewType: mysqlEnum(['agent','developer','property']).notNull(),
	targetId: int().notNull(),
	rating: int().notNull(),
	title: varchar({ length: 255 }),
	comment: text(),
	isVerified: int().notNull(),
	isPublished: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const savedSearches = mysqlTable("saved_searches", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	name: varchar({ length: 255 }).notNull(),
	criteria: json().notNull(),
	filters: json(),
	notificationMethod: varchar({ length: 20 }).default('email'),
	notificationFrequency: mysqlEnum(['never','daily','weekly','instant']).default('never'),
	lastNotifiedAt: timestamp({ mode: 'string' }),
	lastNotified: timestamp({ mode: 'string' }),
	isActive: tinyint().default(1),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow(),
});

export const searchAnalytics = mysqlTable("search_analytics", {
	id: int().autoincrement().notNull(),
	userId: int().references(() => users.id, { onDelete: "set null" } ),
	sessionId: varchar({ length: 255 }),
	filters: json().notNull(),
	resultCount: int(),
	sortOrder: varchar({ length: 50 }),
	viewMode: varchar({ length: 20 }),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
},
(table) => [
	index("idx_search_analytics_created").on(table.createdAt),
	index("idx_search_analytics_user").on(table.userId),
	index("idx_search_analytics_session").on(table.sessionId),
]);

export const propertyClicks = mysqlTable("property_clicks", {
	id: int().autoincrement().notNull(),
	propertyId: int().notNull().references(() => properties.id, { onDelete: "cascade" } ),
	userId: int().references(() => users.id, { onDelete: "set null" } ),
	sessionId: varchar({ length: 255 }),
	position: int(),
	searchFilters: json(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
},
(table) => [
	index("idx_property_clicks_property").on(table.propertyId),
	index("idx_property_clicks_created").on(table.createdAt),
	index("idx_property_clicks_session").on(table.sessionId),
]);

export const scheduledViewings = mysqlTable("scheduled_viewings", {
	id: int().autoincrement().notNull(),
	prospectId: int().notNull().references(() => prospects.id, { onDelete: "cascade" } ),
	propertyId: int().notNull().references(() => properties.id, { onDelete: "cascade" } ),
	agentId: int().references(() => agents.id, { onDelete: "set null" } ),
	scheduledAt: timestamp({ mode: 'string' }).notNull(),
	status: mysqlEnum(['scheduled','confirmed','completed','cancelled','no_show']).default('scheduled').notNull(),
	notes: text(),
	prospectName: varchar({ length: 200 }),
	prospectEmail: varchar({ length: 320 }),
	prospectPhone: varchar({ length: 50 }),
	notificationSent: int(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const services = mysqlTable("services", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	category: mysqlEnum(['home_loan','insurance','interior_design','legal','moving','other']).notNull(),
	description: text(),
	logo: text(),
	website: varchar({ length: 255 }),
	email: varchar({ length: 320 }),
	phone: varchar({ length: 50 }),
	commissionRate: int(),
	isActive: int().default(1).notNull(),
	isFeatured: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const showings = mysqlTable("showings", {
	id: int().autoincrement().notNull(),
	propertyId: int().notNull().references(() => properties.id, { onDelete: "cascade" } ),
	leadId: int().references(() => leads.id, { onDelete: "set null" } ),
	agentId: int().references(() => agents.id, { onDelete: "set null" } ),
	scheduledAt: timestamp({ mode: 'string' }).notNull(),
	status: mysqlEnum(['requested','confirmed','completed','cancelled']).default('requested').notNull(),
	notes: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const subscriptionEvents = mysqlTable("subscription_events", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	subscriptionId: int("subscription_id"),
	eventType: mysqlEnum("event_type", ['trial_started','trial_expiring_soon','trial_expired','subscription_created','subscription_renewed','subscription_upgraded','subscription_downgraded','subscription_cancelled','payment_succeeded','payment_failed','feature_locked','limit_reached']).notNull(),
	eventData: json("event_data"),
	metadata: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
},
(table) => [
	index("idx_user").on(table.userId),
	index("idx_event_type").on(table.eventType),
]);

export const subscriptionPlans = mysqlTable("subscription_plans", {
	id: int().autoincrement().notNull(),
	planId: varchar("plan_id", { length: 100 }).notNull(),
	category: mysqlEnum(['agent','agency','developer']).notNull(),
	name: varchar({ length: 100 }).notNull(),
	displayName: varchar("display_name", { length: 150 }).notNull(),
	description: text(),
	priceZar: int("price_zar").notNull(),
	billingInterval: mysqlEnum("billing_interval", ['monthly','yearly']).default('monthly').notNull(),
	trialDays: int("trial_days").default(14),
	isTrialPlan: tinyint("is_trial_plan").default(0),
	isFreePlan: tinyint("is_free_plan").default(0),
	priorityLevel: int("priority_level").default(0),
	sortOrder: int("sort_order").default(0),
	isActive: tinyint("is_active").default(1),
	features: json(),
	limits: json(),
	permissions: json(),
	upgradeToPlanId: varchar("upgrade_to_plan_id", { length: 100 }),
	downgradeToPlanId: varchar("downgrade_to_plan_id", { length: 100 }),
	stripePriceId: varchar("stripe_price_id", { length: 255 }),
	paystackPlanCode: varchar("paystack_plan_code", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_category").on(table.category),
	index("idx_active").on(table.isActive),
	index("plan_id").on(table.planId),
]);

export const subscriptionUsage = mysqlTable("subscription_usage", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	subscriptionId: int("subscription_id").notNull(),
	periodStart: timestamp("period_start", { mode: 'string' }).notNull(),
	periodEnd: timestamp("period_end", { mode: 'string' }).notNull(),
	listingsCreated: int("listings_created").default(0),
	projectsCreated: int("projects_created").default(0),
	agentsAdded: int("agents_added").default(0),
	boostsUsed: int("boosts_used").default(0),
	apiCalls: int("api_calls").default(0),
	storageMb: int("storage_mb").default(0),
	crmContacts: int("crm_contacts").default(0),
	emailsSent: int("emails_sent").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_user_period").on(table.userId, table.periodStart, table.periodEnd),
]);

export const suburbPriceAnalytics = mysqlTable("suburb_price_analytics", {
	id: int().autoincrement().notNull(),
	suburbId: int().notNull().references(() => suburbs.id, { onDelete: "cascade" } ),
	cityId: int().notNull().references(() => cities.id, { onDelete: "cascade" } ),
	provinceId: int().notNull().references(() => provinces.id, { onDelete: "cascade" } ),
	currentAvgPrice: int(),
	currentMedianPrice: int(),
	currentMinPrice: int(),
	currentMaxPrice: int(),
	currentPriceCount: int(),
	lastMonthAvgPrice: int(),
	lastMonthMedianPrice: int(),
	lastMonthPriceCount: int(),
	sixMonthGrowthPercent: int(),
	threeMonthGrowthPercent: int(),
	oneMonthGrowthPercent: int(),
	trendingDirection: mysqlEnum(['up','down','stable']).default('stable').notNull(),
	trendConfidence: int(),
	lastUpdated: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const suburbs = mysqlTable("suburbs", {
	id: int().autoincrement().notNull(),
	cityId: int().notNull().references(() => cities.id, { onDelete: "cascade" } ),
	name: varchar({ length: 200 }).notNull(),
	slug: varchar({ length: 200 }),
	placeId: varchar("place_id", { length: 255 }),
	seoTitle: varchar("seo_title", { length: 255 }),
	seoDescription: text("seo_description"),
	latitude: varchar({ length: 20 }),
	longitude: varchar({ length: 21 }),
	postalCode: varchar({ length: 10 }),
	// AI Insights
	pros: json("pros"),
	cons: json("cons"),
	aiGenerationDate: timestamp("ai_generation_date", { mode: 'string' }),
	
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_suburbs_slug").on(table.slug),
	index("idx_suburbs_place_id").on(table.placeId),
	index("idx_suburbs_slug_city").on(table.slug, table.cityId),
]);

export const suburbReviews = mysqlTable("suburb_reviews", {
	id: int().autoincrement().notNull(),
	suburbId: int("suburb_id").notNull().references(() => suburbs.id, { onDelete: "cascade" }),
	userId: int("user_id").references(() => users.id, { onDelete: "set null" }),
	
	rating: int().notNull(), // 1-5
	userType: mysqlEnum("user_type", ['resident', 'tenant', 'landlord', 'visitor']).default('resident').notNull(),
	
	pros: text(),
	cons: text(),
	comment: text(),
	
	isVerified: tinyint("is_verified").default(0),
	isPublished: tinyint("is_published").default(0), // Default to unpublished for moderation, or 1 for auto-approve
	
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_suburb_reviews_suburb").on(table.suburbId),
	index("idx_suburb_reviews_user").on(table.userId),
	index("idx_suburb_reviews_rating").on(table.rating),
	index("idx_suburb_reviews_published").on(table.isPublished),
]);

export const suburbsRelations = relations(suburbs, ({ one, many }) => ({
	city: one(cities, {
		fields: [suburbs.cityId],
		references: [cities.id],
	}),
	reviews: many(suburbReviews),
}));

export const suburbReviewsRelations = relations(suburbReviews, ({ one }) => ({
	suburb: one(suburbs, {
		fields: [suburbReviews.suburbId],
		references: [suburbs.id],
	}),
	user: one(users, {
		fields: [suburbReviews.userId],
		references: [users.id],
	}),
}));

export const userBehaviorEvents = mysqlTable("user_behavior_events", {
	id: int().autoincrement().notNull(),
	userId: int().references(() => users.id, { onDelete: "set null" } ),
	sessionId: varchar({ length: 255 }).notNull(),
	eventType: mysqlEnum(['property_view','search','save_property','contact_agent','map_interaction','price_filter','location_filter','property_type_filter']).notNull(),
	eventData: text(),
	propertyId: int().references(() => properties.id, { onDelete: "set null" } ),
	suburbId: int().references(() => suburbs.id, { onDelete: "set null" } ),
	cityId: int().references(() => cities.id, { onDelete: "set null" } ),
	provinceId: int().references(() => provinces.id, { onDelete: "set null" } ),
	priceRangeMin: int(),
	priceRangeMax: int(),
	propertyType: varchar({ length: 50 }),
	listingType: varchar({ length: 50 }),
	pageUrl: varchar({ length: 500 }),
	referrer: varchar({ length: 500 }),
	userAgent: text(),
	ipAddress: varchar({ length: 45 }),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const userPreferences = mysqlTable("user_preferences", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	preferredPropertyTypes: text(),
	preferredPriceMin: int(),
	preferredPriceMax: int(),
	preferredBedrooms: int(),
	preferredBathrooms: int(),
	preferredPropertySize: text(),
	preferredLocations: text(),
	preferredDistance: int(),
	preferredProvices: text(),
	preferredCities: text(),
	preferredSuburbs: text(),
	requiredAmenities: text(),
	preferredAmenities: text(),
	propertyFeatures: text(),
	petFriendly: int(),
	furnished: mysqlEnum(['unfurnished','semi_furnished','fully_furnished']),
	alertFrequency: mysqlEnum(['never','instant','daily','weekly']).default('daily'),
	emailNotifications: int().default(1),
	smsNotifications: int(),
	pushNotifications: int().default(1),
	isActive: int().default(1),
	locationWeight: int().default(30),
	priceWeight: int().default(25),
	featuresWeight: int().default(25),
	sizeWeight: int().default(20),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastUsed: timestamp({ mode: 'string' }),
});

export const userRecommendations = mysqlTable("user_recommendations", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	preferredSuburbs: text(),
	preferredCities: text(),
	preferredPriceRange: text(),
	preferredPropertyTypes: text(),
	preferredListingTypes: text(),
	recommendedSuburbs: text(),
	recommendedProperties: text(),
	recommendedSimilarUsers: text(),
	recommendationClickCount: int(),
	recommendationConversionCount: int(),
	lastRecommendationUpdate: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const userSubscriptions = mysqlTable("user_subscriptions", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	planId: varchar("plan_id", { length: 100 }).notNull(),
	status: mysqlEnum(['trial_active','trial_expired','active_paid','past_due','cancelled','downgraded','grace_period']).default('trial_active').notNull(),
	trialStartedAt: timestamp("trial_started_at", { mode: 'string' }),
	trialEndsAt: timestamp("trial_ends_at", { mode: 'string' }),
	trialUsed: tinyint("trial_used").default(0),
	currentPeriodStart: timestamp("current_period_start", { mode: 'string' }),
	currentPeriodEnd: timestamp("current_period_end", { mode: 'string' }),
	cancelledAt: timestamp("cancelled_at", { mode: 'string' }),
	endsAt: timestamp("ends_at", { mode: 'string' }),
	stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
	stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
	paystackSubscriptionCode: varchar("paystack_subscription_code", { length: 255 }),
	paystackCustomerCode: varchar("paystack_customer_code", { length: 255 }),
	amountZar: int("amount_zar"),
	billingInterval: mysqlEnum("billing_interval", ['monthly','yearly']),
	nextBillingDate: timestamp("next_billing_date", { mode: 'string' }),
	paymentMethodLast4: varchar("payment_method_last4", { length: 4 }),
	paymentMethodType: varchar("payment_method_type", { length: 50 }),
	previousPlanId: varchar("previous_plan_id", { length: 100 }),
	downgradeScheduled: tinyint("downgrade_scheduled").default(0),
	downgradeToPlanId: varchar("downgrade_to_plan_id", { length: 100 }),
	downgradeEffectiveDate: timestamp("downgrade_effective_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_user").on(table.userId),
	index("idx_status").on(table.status),
	index("unique_user_subscription").on(table.userId),
]);

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }),
	email: varchar({ length: 320 }),
	passwordHash: varchar({ length: 255 }),
	name: text(),
	firstName: varchar({ length: 100 }),
	lastName: varchar({ length: 100 }),
	phone: varchar({ length: 30 }),
	loginMethod: varchar({ length: 64 }),
	emailVerified: int().notNull(),
	role: mysqlEnum(['visitor','agent','agency_admin','property_developer','super_admin']).default('visitor').notNull(),
	agencyId: int().references(() => agencies.id, { onDelete: "set null" } ),
	isSubaccount: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	passwordResetToken: varchar({ length: 255 }),
	passwordResetTokenExpiresAt: timestamp({ mode: 'string' }),
	emailVerificationToken: varchar({ length: 255 }),
},
(table) => [
	index("email_idx").on(table.email),
	index("role_idx").on(table.role),
]);

export const videoLikes = mysqlTable("videoLikes", {
	id: int().autoincrement().notNull(),
	videoId: int().notNull().references(() => videos.id, { onDelete: "cascade" } ),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const videos = mysqlTable("videos", {
	id: int().autoincrement().notNull(),
	agentId: int().references(() => agents.id, { onDelete: "cascade" } ),
	propertyId: int().references(() => properties.id, { onDelete: "set null" } ),
	developmentId: int().references(() => developments.id, { onDelete: "set null" } ),
	videoUrl: text().notNull(),
	caption: text(),
	type: mysqlEnum(['listing','content']).default('content').notNull(),
	duration: int(),
	views: int().notNull(),
	likes: int().notNull(),
	shares: int().notNull(),
	isPublished: int().default(1).notNull(),
	isFeatured: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// ============================================================================
// EXPLORE DISCOVERY ENGINE TABLES
// ============================================================================

export const exploreContent = mysqlTable("explore_content", {
	id: int().autoincrement().notNull(),
	contentType: varchar("content_type", { length: 50 }).notNull(),
	referenceId: int("reference_id").notNull(),
	creatorId: int("creator_id"),
	creatorType: mysqlEnum("creator_type", ['user', 'agent', 'developer', 'agency']).default('user').notNull(),
	agencyId: int("agency_id"),
	partnerId: varchar("partner_id", { length: 36 }),
	contentCategory: mysqlEnum("content_category", ['primary', 'secondary', 'tertiary']).default('primary'),
	badgeType: varchar("badge_type", { length: 50 }),
	isLaunchContent: boolean("is_launch_content").default(false),
	title: varchar({ length: 255 }),
	description: text(),
	thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
	videoUrl: varchar("video_url", { length: 500 }),
	metadata: json(),
	tags: json(),
	lifestyleCategories: json("lifestyle_categories"),
	locationLat: decimal("location_lat", { precision: 10, scale: 8 }),
	locationLng: decimal("location_lng", { precision: 11, scale: 8 }),
	priceMin: int("price_min"),
	priceMax: int("price_max"),
	viewCount: int("view_count").default(0),
	engagementScore: decimal("engagement_score", { precision: 5, scale: 2 }).default('0'),
	isActive: tinyint("is_active").default(1),
	isFeatured: tinyint("is_featured").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_explore_content_type").on(table.contentType),
	index("idx_explore_content_creator").on(table.creatorId),
	index("idx_explore_content_creator_type").on(table.creatorType),
	index("idx_explore_content_agency_id").on(table.agencyId),
	index("idx_content_partner").on(table.partnerId),
	index("idx_content_category").on(table.contentCategory),
	index("idx_explore_content_location").on(table.locationLat, table.locationLng),
	index("idx_explore_content_engagement").on(table.engagementScore),
	index("idx_explore_content_active").on(table.isActive, table.createdAt),
	index("idx_explore_content_agency_active").on(table.agencyId, table.isActive, table.createdAt),
]);

export const exploreDiscoveryVideos = mysqlTable("explore_discovery_videos", {
	id: int().autoincrement().notNull(),
	exploreContentId: int("explore_content_id").notNull().references(() => exploreContent.id, { onDelete: "cascade" }),
	propertyId: int("property_id").references(() => properties.id, { onDelete: "set null" }),
	developmentId: int("development_id").references(() => developments.id, { onDelete: "set null" }),
	videoUrl: varchar("video_url", { length: 500 }).notNull(),
	thumbnailUrl: varchar("thumbnail_url", { length: 500 }).notNull(),
	duration: int().notNull(),
	transcodedUrls: json("transcoded_urls"),
	musicTrack: varchar("music_track", { length: 255 }),
	hasSubtitles: tinyint("has_subtitles").default(0),
	subtitleUrl: varchar("subtitle_url", { length: 500 }),
	totalViews: int("total_views").default(0),
	totalWatchTime: int("total_watch_time").default(0),
	completionRate: decimal("completion_rate", { precision: 5, scale: 2 }).default('0'),
	saveCount: int("save_count").default(0),
	shareCount: int("share_count").default(0),
	clickThroughCount: int("click_through_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	index("idx_explore_discovery_videos_content").on(table.exploreContentId),
	index("idx_explore_discovery_videos_property").on(table.propertyId),
	index("idx_explore_discovery_videos_development").on(table.developmentId),
	index("idx_explore_discovery_videos_performance").on(table.completionRate, table.totalViews),
]);

export const exploreNeighbourhoods = mysqlTable("explore_neighbourhoods", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	city: varchar({ length: 100 }),
	province: varchar({ length: 100 }),
	heroBannerUrl: varchar("hero_banner_url", { length: 500 }),
	description: text(),
	locationLat: decimal("location_lat", { precision: 10, scale: 8 }),
	locationLng: decimal("location_lng", { precision: 11, scale: 8 }),
	boundaryPolygon: json("boundary_polygon"),
	amenities: json(),
	safetyRating: decimal("safety_rating", { precision: 3, scale: 2 }),
	walkabilityScore: int("walkability_score"),
	avgPropertyPrice: int("avg_property_price"),
	priceTrend: json("price_trend"),
	highlights: json(),
	followerCount: int("follower_count").default(0),
	propertyCount: int("property_count").default(0),
	videoCount: int("video_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_explore_neighbourhoods_location").on(table.locationLat, table.locationLng),
	index("idx_explore_neighbourhoods_slug").on(table.slug),
	index("idx_explore_neighbourhoods_city").on(table.city, table.province),
]);

export const exploreUserPreferencesNew = mysqlTable("explore_user_preferences_new", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	priceRangeMin: int("price_range_min"),
	priceRangeMax: int("price_range_max"),
	preferredLocations: json("preferred_locations"),
	preferredPropertyTypes: json("preferred_property_types"),
	preferredLifestyleCategories: json("preferred_lifestyle_categories"),
	followedNeighbourhoods: json("followed_neighbourhoods"),
	followedCreators: json("followed_creators"),
	engagementHistory: json("engagement_history"),
	lastActive: timestamp("last_active", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_explore_user_pref_user").on(table.userId),
	index("idx_explore_user_pref_active").on(table.lastActive),
]);

export const exploreFeedSessions = mysqlTable("explore_feed_sessions", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").references(() => users.id, { onDelete: "set null" }),
	sessionStart: timestamp("session_start", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	sessionEnd: timestamp("session_end", { mode: 'string' }),
	totalDuration: int("total_duration"),
	videosViewed: int("videos_viewed").default(0),
	videosCompleted: int("videos_completed").default(0),
	propertiesSaved: int("properties_saved").default(0),
	clickThroughs: int("click_throughs").default(0),
	deviceType: varchar("device_type", { length: 50 }),
	sessionData: json("session_data"),
},
(table) => [
	index("idx_explore_sessions_user").on(table.userId),
	index("idx_explore_sessions_start").on(table.sessionStart),
]);

export const exploreEngagements = mysqlTable("explore_engagements", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").references(() => users.id, { onDelete: "set null" }),
	contentId: int("content_id").notNull().references(() => exploreContent.id, { onDelete: "cascade" }),
	engagementType: varchar("engagement_type", { length: 50 }).notNull(),
	watchTime: int("watch_time"),
	completed: tinyint().default(0),
	sessionId: int("session_id").references(() => exploreFeedSessions.id, { onDelete: "set null" }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	index("idx_explore_engagement_user").on(table.userId),
	index("idx_explore_engagement_content").on(table.contentId),
	index("idx_explore_engagement_type").on(table.engagementType),
	index("idx_explore_engagement_created").on(table.createdAt),
]);

export const exploreBoostCampaigns = mysqlTable("explore_boost_campaigns", {
	id: int().autoincrement().notNull(),
	creatorId: int("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	contentId: int("content_id").notNull().references(() => exploreContent.id, { onDelete: "cascade" }),
	campaignName: varchar("campaign_name", { length: 255 }),
	budget: decimal({ precision: 10, scale: 2 }),
	spent: decimal({ precision: 10, scale: 2 }).default('0'),
	durationDays: int("duration_days"),
	startDate: timestamp("start_date", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	endDate: timestamp("end_date", { mode: 'string' }),
	targetAudience: json("target_audience"),
	status: varchar({ length: 50 }).default('active'),
	impressions: int().default(0),
	clicks: int().default(0),
	conversions: int().default(0),
	costPerClick: decimal("cost_per_click", { precision: 10, scale: 2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow().notNull(),
},
(table) => [
	index("idx_boost_campaigns_creator").on(table.creatorId),
	index("idx_boost_campaigns_status").on(table.status),
	index("idx_boost_campaigns_dates").on(table.startDate, table.endDate),
	index("idx_boost_campaigns_active").on(table.status, table.endDate),
]);

export const exploreSavedProperties = mysqlTable("explore_saved_properties", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	contentId: int("content_id").notNull().references(() => exploreContent.id, { onDelete: "cascade" }),
	collectionName: varchar("collection_name", { length: 255 }).default('Default'),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	index("unique_user_content").on(table.userId, table.contentId),
	index("idx_explore_saved_user").on(table.userId, table.createdAt),
	index("idx_explore_saved_collection").on(table.userId, table.collectionName),
]);

export const exploreNeighbourhoodFollows = mysqlTable("explore_neighbourhood_follows", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	neighbourhoodId: int("neighbourhood_id").notNull().references(() => exploreNeighbourhoods.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	index("unique_user_neighbourhood").on(table.userId, table.neighbourhoodId),
	index("idx_explore_neighbourhood_follows_user").on(table.userId),
]);

export const exploreCreatorFollows = mysqlTable("explore_creator_follows", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	creatorId: int("creator_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	index("unique_user_creator").on(table.userId, table.creatorId),
	index("idx_explore_creator_follows_user").on(table.userId),
	index("idx_explore_creator_follows_creator").on(table.creatorId),
]);
// Developer Subscription Relations
export const developerSubscriptionsRelations = relations(developerSubscriptions, ({ one }) => ({
	limits: one(developerSubscriptionLimits, {
		fields: [developerSubscriptions.id],
		references: [developerSubscriptionLimits.subscriptionId],
	}),
	usage: one(developerSubscriptionUsage, {
		fields: [developerSubscriptions.id],
		references: [developerSubscriptionUsage.subscriptionId],
	}),
}));

export const developerSubscriptionLimitsRelations = relations(developerSubscriptionLimits, ({ one }) => ({
	subscription: one(developerSubscriptions, {
		fields: [developerSubscriptionLimits.subscriptionId],
		references: [developerSubscriptions.id],
	}),
}));

export const developerSubscriptionUsageRelations = relations(developerSubscriptionUsage, ({ one }) => ({
	subscription: one(developerSubscriptions, {
		fields: [developerSubscriptionUsage.subscriptionId],
		references: [developerSubscriptions.id],
	}),
}));

// ============================================================================
// CORE ENTITY RELATIONS (Users, Developers, Developments)
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
	developerProfiles: many(developers),
    auditLogs: many(auditLogs),
}));

export const developersRelations = relations(developers, ({ one, many }) => ({
	user: one(users, {
		fields: [developers.userId],
		references: [users.id],
	}),
	developments: many(developments),
    subscriptions: many(developerSubscriptions),
    activities: many(activities),
    drafts: many(developmentDrafts),
}));

export const developmentsRelations = relations(developments, ({ one, many }) => ({
	developer: one(developers, {
		fields: [developments.developerId],
		references: [developers.id],
	}),
	phases: many(developmentPhases),
	units: many(developmentUnits),
    approvalRecords: many(developmentApprovalQueue),
    documents: many(developmentDocuments),
}));

export const developmentPhasesRelations = relations(developmentPhases, ({ one, many }) => ({
	development: one(developments, {
		fields: [developmentPhases.developmentId],
		references: [developments.id],
	}),
	units: many(developmentUnits),
}));

export const developmentUnitsRelations = relations(developmentUnits, ({ one }) => ({
	development: one(developments, {
		fields: [developmentUnits.developmentId],
		references: [developments.id],
	}),
	phase: one(developmentPhases, {
		fields: [developmentUnits.phaseId],
		references: [developmentPhases.id],
	}),
}));

export const developmentApprovalQueueRelations = relations(developmentApprovalQueue, ({ one }) => ({
	development: one(developments, {
		fields: [developmentApprovalQueue.developmentId],
		references: [developments.id],
	}),
    reviewedByUser: one(users, {
        fields: [developmentApprovalQueue.reviewedBy],
        references: [users.id],
    })
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    user: one(users, {
        fields: [auditLogs.userId],
        references: [users.id],
    }),
}));

// ============================================================================
// Partner Marketplace Schema
// ============================================================================

export const partnerTiers = mysqlTable("partner_tiers", {
	id: int().notNull(),
	name: varchar({ length: 100 }).notNull(),
	allowedContentTypes: json("allowed_content_types").notNull(),
	allowedCtas: json("allowed_ctas").notNull(),
	requiresCredentials: boolean("requires_credentials").default(false),
	maxMonthlyContent: int("max_monthly_content").default(10),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const explorePartners = mysqlTable("explore_partners", {
	id: varchar({ length: 36 }).primaryKey(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	tierId: int("tier_id").notNull().references(() => partnerTiers.id),
	companyName: varchar("company_name", { length: 255 }).notNull(),
	description: text(),
	logoUrl: varchar("logo_url", { length: 500 }),
	verificationStatus: mysqlEnum("verification_status", ['pending', 'verified', 'rejected']).default('pending'),
	trustScore: decimal("trust_score", { precision: 5, scale: 2 }).default('50.00'),
	serviceLocations: json("service_locations"),
	approvedContentCount: int("approved_content_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
	index("idx_partner_tier").on(table.tierId),
	index("idx_partner_verification").on(table.verificationStatus),
	index("idx_partner_trust").on(table.trustScore),
]);

export const topics = mysqlTable("topics", {
	id: varchar({ length: 36 }).primaryKey(),
	slug: varchar({ length: 100 }).notNull().unique(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	icon: varchar({ length: 50 }),
	displayOrder: int("display_order").default(0),
	isActive: boolean("is_active").default(true),
	contentTags: json("content_tags"),
	propertyFeatures: json("property_features"),
	partnerCategories: json("partner_categories"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_topic_slug").on(table.slug),
	index("idx_topic_active").on(table.isActive, table.displayOrder),
]);

export const contentTopics = mysqlTable("content_topics", {
	contentId: varchar("content_id", { length: 36 }).notNull(),
	topicId: varchar("topic_id", { length: 36 }).notNull().references(() => topics.id, { onDelete: 'cascade' }),
	relevanceScore: decimal("relevance_score", { precision: 5, scale: 2 }).default('1.00'),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_content_topic").on(table.topicId),
]);

export const contentApprovalQueue = mysqlTable("content_approval_queue", {
	id: varchar({ length: 36 }).primaryKey(),
	contentId: varchar("content_id", { length: 36 }).notNull(),
	partnerId: varchar("partner_id", { length: 36 }).notNull().references(() => explorePartners.id, { onDelete: 'cascade' }),
	status: mysqlEnum(['pending', 'approved', 'rejected', 'revision_requested']).default('pending'),
	submittedAt: timestamp("submitted_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	reviewerId: varchar("reviewer_id", { length: 36 }),
	feedback: text(),
	autoApprovalEligible: boolean("auto_approval_eligible").default(false),
}, (table) => [
	index("idx_approval_status").on(table.status),
	index("idx_approval_partner").on(table.partnerId),
]);

export const partnerSubscriptions = mysqlTable("partner_subscriptions", {
	id: varchar({ length: 36 }).primaryKey(),
	partnerId: varchar("partner_id", { length: 36 }).notNull().references(() => explorePartners.id, { onDelete: 'cascade' }),
	tier: mysqlEnum(['free', 'basic', 'premium', 'featured']).notNull(),
	priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }).notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }),
	status: mysqlEnum(['active', 'cancelled', 'expired']).default('active'),
	features: json().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_subscription_partner").on(table.partnerId),
	index("idx_subscription_status").on(table.status),
]);

export const contentQualityScores = mysqlTable("content_quality_scores", {
	contentId: varchar("content_id", { length: 36 }).primaryKey(),
	overallScore: decimal("overall_score", { precision: 5, scale: 2 }).default('50.00'),
	metadataScore: decimal("metadata_score", { precision: 5, scale: 2 }).default('0'),
	engagementScore: decimal("engagement_score", { precision: 5, scale: 2 }).default('0'),
	productionScore: decimal("production_score", { precision: 5, scale: 2 }).default('0'),
	negativeSignals: int("negative_signals").default(0),
	lastCalculatedAt: timestamp("last_calculated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_quality_score").on(table.overallScore),
]);

export const boostCampaigns = mysqlTable("boost_campaigns", {
	id: varchar({ length: 36 }).primaryKey(),
	partnerId: varchar("partner_id", { length: 36 }).notNull().references(() => explorePartners.id, { onDelete: 'cascade' }),
	contentId: varchar("content_id", { length: 36 }).notNull(),
	topicId: varchar("topic_id", { length: 36 }).notNull().references(() => topics.id, { onDelete: 'cascade' }),
	budget: decimal({ precision: 10, scale: 2 }).notNull(),
	spent: decimal({ precision: 10, scale: 2 }).default('0'),
	status: mysqlEnum(['draft', 'active', 'paused', 'completed', 'depleted']).default('draft'),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }),
	impressions: int().default(0),
	clicks: int().default(0),
	costPerImpression: decimal("cost_per_impression", { precision: 6, scale: 4 }).default('0.10'),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_boost_status").on(table.status),
	index("idx_boost_topic").on(table.topicId, table.status),
	index("idx_boost_partner").on(table.partnerId),
]);

export const partnerLeads = mysqlTable("partner_leads", {
	id: varchar({ length: 36 }).primaryKey(),
	partnerId: varchar("partner_id", { length: 36 }).notNull().references(() => explorePartners.id, { onDelete: 'cascade' }),
	userId: varchar("user_id", { length: 36 }).notNull(),
	contentId: varchar("content_id", { length: 36 }),
	type: mysqlEnum(['quote_request', 'consultation', 'eligibility_check']).notNull(),
	status: mysqlEnum(['new', 'contacted', 'converted', 'disputed', 'refunded']).default('new'),
	price: decimal({ precision: 10, scale: 2 }).notNull(),
	contactInfo: json("contact_info").notNull(),
	intentDetails: text("intent_details"),
	disputeReason: text("dispute_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
	index("idx_lead_partner").on(table.partnerId),
	index("idx_lead_status").on(table.status),
	index("idx_lead_type").on(table.type),
]);

export const marketplaceBundles = mysqlTable("marketplace_bundles", {
	id: varchar({ length: 36 }).primaryKey(),
	slug: varchar({ length: 100 }).notNull().unique(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	targetAudience: varchar("target_audience", { length: 100 }),
	isActive: boolean("is_active").default(true),
	displayOrder: int("display_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const bundlePartners = mysqlTable("bundle_partners", {
	bundleId: varchar("bundle_id", { length: 36 }).notNull().references(() => marketplaceBundles.id, { onDelete: 'cascade' }),
	partnerId: varchar("partner_id", { length: 36 }).notNull().references(() => explorePartners.id, { onDelete: 'cascade' }),
	category: varchar({ length: 100 }).notNull(),
	displayOrder: int("display_order").default(0),
	inclusionFee: decimal("inclusion_fee", { precision: 10, scale: 2 }),
	performanceScore: decimal("performance_score", { precision: 5, scale: 2 }).default('50.00'),
}, (table) => [
	index("idx_bundle_category").on(table.bundleId, table.category),
]);

export const launchPhases = mysqlTable("launch_phases", {
	id: varchar({ length: 36 }).primaryKey(),
	phase: mysqlEnum(['pre_launch', 'launch_period', 'ramp_up', 'ecosystem_maturity']).notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }),
	primaryContentRatio: decimal("primary_content_ratio", { precision: 3, scale: 2 }).default('0.70'),
	algorithmWeight: decimal("algorithm_weight", { precision: 3, scale: 2 }).default('0.00'),
	editorialWeight: decimal("editorial_weight", { precision: 3, scale: 2 }).default('1.00'),
	isActive: boolean("is_active").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const launchContentQuotas = mysqlTable("launch_content_quotas", {
	id: varchar({ length: 36 }).primaryKey(),
	contentType: varchar("content_type", { length: 50 }).notNull().unique(),
	requiredCount: int("required_count").notNull(),
	currentCount: int("current_count").default(0),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const launchMetrics = mysqlTable("launch_metrics", {
	id: varchar({ length: 36 }).primaryKey(),
	metricDate: timestamp("metric_date", { mode: 'string' }).notNull(),
	topicEngagementRate: decimal("topic_engagement_rate", { precision: 5, scale: 2 }),
	partnerContentWatchRate: decimal("partner_content_watch_rate", { precision: 5, scale: 2 }),
	saveShareRate: decimal("save_share_rate", { precision: 5, scale: 2 }),
	weeklyVisitsPerUser: decimal("weekly_visits_per_user", { precision: 5, scale: 2 }),
	algorithmConfidenceScore: decimal("algorithm_confidence_score", { precision: 5, scale: 2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_metrics_date").on(table.metricDate),
]);

export const userOnboardingState = mysqlTable("user_onboarding_state", {
	userId: varchar("user_id", { length: 36 }).primaryKey(),
	isFirstSession: boolean("is_first_session").default(true),
	welcomeOverlayShown: boolean("welcome_overlay_shown").default(false),
	welcomeOverlayDismissed: boolean("welcome_overlay_dismissed").default(false),
	suggestedTopics: json("suggested_topics"),
	tooltipsShown: json("tooltips_shown").default('[]'),
	contentViewCount: int("content_view_count").default(0),
	saveCount: int("save_count").default(0),
	partnerEngagementCount: int("partner_engagement_count").default(0),
	featuresUnlocked: json("features_unlocked").default('[]'),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
});

export const foundingPartners = mysqlTable("founding_partners", {
	partnerId: varchar("partner_id", { length: 36 }).primaryKey().references(() => explorePartners.id, { onDelete: 'cascade' }),
	enrollmentDate: timestamp("enrollment_date", { mode: 'string' }).notNull(),
	benefitsEndDate: timestamp("benefits_end_date", { mode: 'string' }).notNull(),
	preLaunchContentDelivered: int("pre_launch_content_delivered").default(0),
	weeklyContentDelivered: json("weekly_content_delivered").default('[]'),
	warningCount: int("warning_count").default(0),
	status: mysqlEnum(['active', 'warning', 'revoked']).default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

// ============================================================================
// Explore Partner Marketplace Relations
// ============================================================================

export const explorePartnersRelations = relations(explorePartners, ({ one, many }) => ({
	tier: one(partnerTiers, {
		fields: [explorePartners.tierId],
		references: [partnerTiers.id],
	}),
	subscriptions: many(partnerSubscriptions),
	boostCampaigns: many(boostCampaigns),
	leads: many(partnerLeads),
	content: many(exploreContent),
	shorts: many(exploreShorts),
}));

export const partnerTiersRelations = relations(partnerTiers, ({ many }) => ({
	partners: many(explorePartners),
}));

export const topicsRelations = relations(topics, ({ many }) => ({
	contentTopics: many(contentTopics),
	boostCampaigns: many(boostCampaigns),
}));

export const contentTopicsRelations = relations(contentTopics, ({ one }) => ({
	topic: one(topics, {
		fields: [contentTopics.topicId],
		references: [topics.id],
	}),
}));

export const partnerSubscriptionsRelations = relations(partnerSubscriptions, ({ one }) => ({
	partner: one(explorePartners, {
		fields: [partnerSubscriptions.partnerId],
		references: [explorePartners.id],
	}),
}));

export const boostCampaignsRelations = relations(boostCampaigns, ({ one }) => ({
	partner: one(explorePartners, {
		fields: [boostCampaigns.partnerId],
		references: [explorePartners.id],
	}),
	topic: one(topics, {
		fields: [boostCampaigns.topicId],
		references: [topics.id],
	}),
}));

export const partnerLeadsRelations = relations(partnerLeads, ({ one }) => ({
	partner: one(explorePartners, {
		fields: [partnerLeads.partnerId],
		references: [explorePartners.id],
	}),
}));

export const contentApprovalQueueRelations = relations(contentApprovalQueue, ({ one }) => ({
	partner: one(explorePartners, {
		fields: [contentApprovalQueue.partnerId],
		references: [explorePartners.id],
	}),
}));

export const foundingPartnersRelations = relations(foundingPartners, ({ one }) => ({
	partner: one(explorePartners, {
		fields: [foundingPartners.partnerId],
		references: [explorePartners.id],
	}),
}));
