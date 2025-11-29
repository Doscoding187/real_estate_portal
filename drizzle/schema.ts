import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, text, timestamp, foreignKey, mysqlEnum, index, decimal, json, boolean } from "drizzle-orm/mysql-core"
import { sql, type InferSelectModel, type InferInsertModel } from "drizzle-orm"

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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const agencyJoinRequests = mysqlTable("agency_join_requests", {
	id: int().autoincrement().notNull(),
	agencyId: int().notNull().references(() => agencies.id, { onDelete: "cascade" } ),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	status: mysqlEnum(['pending','approved','rejected']).default('pending').notNull(),
	message: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const agentCoverageAreas = mysqlTable("agent_coverage_areas", {
	id: int().autoincrement().notNull(),
	agentId: int().notNull().references(() => agents.id, { onDelete: "cascade" } ),
	areaName: varchar({ length: 255 }).notNull(),
	areaType: mysqlEnum(['province','city','suburb','custom_polygon']).notNull(),
	areaData: text().notNull(),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	status: mysqlEnum(['pending', 'approved', 'rejected', 'suspended']).default('pending').notNull(),
	rejectionReason: text(),
	approvedBy: int().references(() => users.id, { onDelete: "set null" } ),
	approvedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const cities = mysqlTable("cities", {
	id: int().autoincrement().notNull(),
	provinceId: int().notNull().references(() => provinces.id, { onDelete: "cascade" } ),
	name: varchar({ length: 150 }).notNull(),
	latitude: varchar({ length: 20 }),
	longitude: varchar({ length: 21 }),
	isMetro: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

// Listing Wizard Tables
export const listings = mysqlTable('listings', {
  id: int().autoincrement().notNull().primaryKey(),

  // User & Ownership
  ownerId: int().notNull(), // references users.id
  agentId: int(), // references agents.id (optional)
  agencyId: int(), // references agencies.id (optional)

  // Step 1: Action Type
  action: mysqlEnum(['sell', 'rent', 'auction']).notNull(),

  // Step 2: Property Type
  propertyType: mysqlEnum([
    'apartment',
    'house',
    'farm',
    'land',
    'commercial',
    'shared_living',
  ]).notNull(),

  // Basic Info
  title: varchar({ length: 255 }).notNull(),
  description: text().notNull(),

  // Step 3: Pricing Fields (dynamic based on action)
  // For SELL
  askingPrice: decimal({ precision: 12, scale: 2 }),
  negotiable: int().default(0),
  transferCostEstimate: decimal({ precision: 12, scale: 2 }),

  // For RENT
  monthlyRent: decimal({ precision: 12, scale: 2 }),
  deposit: decimal({ precision: 12, scale: 2 }),
  leaseTerms: varchar({ length: 100 }),
  availableFrom: timestamp({ mode: 'string' }),
  utilitiesIncluded: int().default(0),

  // For AUCTION
  startingBid: decimal({ precision: 12, scale: 2 }),
  reservePrice: decimal({ precision: 12, scale: 2 }),
  auctionDateTime: timestamp({ mode: 'string' }),
  auctionTermsDocumentUrl: text(),

  // Property-Specific Fields (JSON for flexibility)
  propertyDetails: json(),

  // Step 4: Location
  address: text().notNull(),
  latitude: decimal({ precision: 10, scale: 7 }).notNull(),
  longitude: decimal({ precision: 10, scale: 7 }).notNull(),
  city: varchar({ length: 100 }).notNull(),
  suburb: varchar({ length: 100 }),
  province: varchar({ length: 100 }).notNull(),
  postalCode: varchar({ length: 20 }),
  placeId: varchar({ length: 255 }), // Google Maps Place ID

  // Step 5: Media
  mainMediaId: int(), // references listing_media.id
  mainMediaType: mysqlEnum(['image', 'video']),

  // Step 7: Status & Approval
  status: mysqlEnum([
    'draft',
    'pending_review',
    'approved',
    'published',
    'rejected',
    'archived',
    'sold',
    'rented',
  ])
    .default('draft')
    .notNull(),

  approvalStatus: mysqlEnum(['pending', 'approved', 'rejected']).default('pending'),
  reviewedBy: int(), // references users.id (super admin)
  reviewedAt: timestamp({ mode: 'string' }),
  rejectionReason: text(),

  // Auto-publish settings
  autoPublished: int().default(0),

  // SEO & Metadata
  slug: varchar({ length: 255 }).notNull(),
  metaTitle: varchar({ length: 255 }),
  metaDescription: text(),
  canonicalUrl: text(),

  // Search & Discovery
  searchTags: text(), // comma-separated for full-text search
  featured: int().default(0).notNull(),

  // Timestamps
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  publishedAt: timestamp({ mode: 'string' }),
  archivedAt: timestamp({ mode: 'string' }),
});

export const listingMedia = mysqlTable('listing_media', {
  id: int().autoincrement().notNull().primaryKey(),
  listingId: int().notNull(), // references listings.id

  mediaType: mysqlEnum(['image', 'video', 'floorplan', 'pdf']).notNull(),

  // Original Upload
  originalUrl: text().notNull(),
  originalFileName: varchar({ length: 255 }),
  originalFileSize: int(), // bytes

  // Processed URLs
  processedUrl: text(), // compressed/optimized version
  thumbnailUrl: text(),
  previewUrl: text(), // 3s preview for videos

  // Media Metadata
  width: int(),
  height: int(),
  duration: int(), // seconds (for videos)
  mimeType: varchar({ length: 100 }),

  // Video-specific
  orientation: mysqlEnum(['vertical', 'horizontal', 'square']),
  isVertical: int().default(0), // 1 = vertical (9:16)

  // Order & Display
  displayOrder: int().default(0).notNull(),
  isPrimary: int().default(0).notNull(),

  // Processing Status
  processingStatus: mysqlEnum(['pending', 'processing', 'completed', 'failed']).default('pending'),
  processingError: text(),

  // Timestamps
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  uploadedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  processedAt: timestamp({ mode: 'string' }),
});

export const listingAnalytics = mysqlTable('listing_analytics', {
  id: int().autoincrement().notNull().primaryKey(),
  listingId: int().notNull(), // references listings.id

  // View Metrics
  totalViews: int().default(0).notNull(),
  uniqueVisitors: int().default(0).notNull(),
  viewsByDay: json(), // {"2025-11-17": 45}

  // Lead Metrics
  totalLeads: int().default(0).notNull(),
  contactFormLeads: int().default(0).notNull(),
  whatsappClicks: int().default(0).notNull(),
  phoneReveals: int().default(0).notNull(),
  bookingViewingRequests: int().default(0).notNull(),

  // Engagement Metrics
  totalFavorites: int().default(0).notNull(),
  totalShares: int().default(0).notNull(),
  averageTimeOnPage: int(), // seconds

  // Traffic Sources
  trafficSources: json(),

  // Conversion Metrics
  conversionRate: decimal({ precision: 5, scale: 2 }), // percentage
  leadConversionRate: decimal({ precision: 5, scale: 2 }),

  // Last Updated
  lastUpdated: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const listingLeads = mysqlTable('listing_leads', {
  id: int().autoincrement().notNull().primaryKey(),
  listingId: int().notNull(), // references listings.id

  // Lead Info
  name: varchar({ length: 200 }).notNull(),
  email: varchar({ length: 320 }),
  phone: varchar({ length: 50 }),
  message: text(),

  // Lead Type
  leadType: mysqlEnum([
    'contact_form',
    'whatsapp_click',
    'phone_reveal',
    'book_viewing',
    'make_offer',
    'request_info',
  ]).notNull(),

  // Source Tracking
  source: varchar({ length: 100 }), // organic, social, referral, etc.
  referrer: text(),
  utmSource: varchar({ length: 100 }),
  utmMedium: varchar({ length: 100 }),
  utmCampaign: varchar({ length: 100 }),

  // Assignment
  assignedTo: int(), // references agents.id
  assignedAt: timestamp({ mode: 'string' }),

  // Status
  status: mysqlEnum([
    'new',
    'contacted',
    'qualified',
    'viewing_scheduled',
    'offer_made',
    'converted',
    'lost',
  ])
    .default('new')
    .notNull(),

  // CRM Sync
  crmSynced: int().default(0),
  crmSyncedAt: timestamp({ mode: 'string' }),
  crmId: varchar({ length: 255 }), // External CRM ID (EspoCRM, etc.)

  // Timestamps
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const listingViewings = mysqlTable('listing_viewings', {
  id: int().autoincrement().notNull().primaryKey(),
  listingId: int().notNull(), // references listings.id
  leadId: int(), // references listing_leads.id

  // Viewing Details
  scheduledDate: timestamp({ mode: 'string' }).notNull(),
  duration: int().default(30), // minutes

  // Contact Info
  visitorName: varchar({ length: 200 }).notNull(),
  visitorEmail: varchar({ length: 320 }),
  visitorPhone: varchar({ length: 50 }),

  // Status
  status: mysqlEnum(['requested', 'confirmed', 'completed', 'cancelled', 'no_show'])
    .default('requested')
    .notNull(),

  // Agent Assignment
  agentId: int(), // references agents.id
  agentNotes: text(),

  // Feedback
  visitorFeedback: text(),
  visitorRating: int(), // 1-5

  // Notifications
  reminderSent: int().default(0),
  confirmationSent: int().default(0),

  // Timestamps
  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const listingApprovalQueue = mysqlTable('listing_approval_queue', {
  id: int().autoincrement().notNull().primaryKey(),
  listingId: int().notNull(), // references listings.id

  submittedBy: int().notNull(), // references users.id
  submittedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),

  status: mysqlEnum(['pending', 'reviewing', 'approved', 'rejected']).default('pending').notNull(),
  priority: mysqlEnum(['low', 'normal', 'high', 'urgent']).default('normal').notNull(),

  reviewedBy: int(), // references users.id (super admin)
  reviewedAt: timestamp({ mode: 'string' }),

  // Review Notes
  reviewNotes: text(),
  rejectionReason: text(),

  // Compliance Flags (for future use)
  complianceChecks: json(),

  createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const listingSettings = mysqlTable('listing_settings', {
  id: int().autoincrement().notNull().primaryKey(),

  // Auto-publish settings
  autoPublishForVerifiedAccounts: int().default(0).notNull(),

  // Media limits
  maxImagesPerListing: int().default(30).notNull(),
  maxVideosPerListing: int().default(5).notNull(),
  maxFloorplansPerListing: int().default(5).notNull(),
  maxPdfsPerListing: int().default(3).notNull(),

  maxImageSizeMB: int().default(5).notNull(),
  maxVideoSizeMB: int().default(50).notNull(),
  maxVideoDurationSeconds: int().default(180).notNull(), // 3 minutes

  // Video processing
  videoCompressionEnabled: int().default(1).notNull(),
  videoThumbnailEnabled: int().default(1).notNull(),
  videoPreviewClipSeconds: int().default(3).notNull(),

  // CRM Integration
  crmWebhookUrl: text(),
  crmEnabled: int().default(0).notNull(),

  // Notifications
  newListingNotificationsEnabled: int().default(1).notNull(),
  leadNotificationsEnabled: int().default(1).notNull(),

  // Last updated
  updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
  updatedBy: int(), // references users.id
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const developers = mysqlTable("developers", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	logo: text(),
	website: varchar({ length: 255 }),
	email: varchar({ length: 320 }),
	phone: varchar({ length: 50 }),
	address: text(),
	city: varchar({ length: 100 }),
	province: varchar({ length: 100 }),
	category: mysqlEnum(['residential','commercial','mixed_use','industrial']).default('residential').notNull(),
	specializations: text(), // JSON array of specializations
	establishedYear: int(),
	totalProjects: int(),
	rating: int(),
	reviewCount: int(),
	isVerified: int().notNull(),
	// Developer approval workflow
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" }),
	status: mysqlEnum(['pending','approved','rejected']).default('pending').notNull(),
	rejectionReason: text(),
	// Audit trail
	approvedBy: int().references(() => users.id, { onDelete: "set null" }),
	approvedAt: timestamp({ mode: 'string' }),
	rejectedBy: int().references(() => users.id, { onDelete: "set null" }),
	rejectedAt: timestamp({ mode: 'string' }),
	// KPI caching for mission control dashboard
	kpiCache: json(),
	lastKpiCalculation: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => ({
	lastKpiCalculationIdx: index("idx_developers_last_kpi_calculation").on(table.lastKpiCalculation),
}));

export const developerSubscriptions = mysqlTable("developer_subscriptions", {
	id: int().autoincrement().notNull().primaryKey(),
	developerId: int().notNull().references(() => developers.id, { onDelete: "cascade" }),
	planId: int().references(() => plans.id, { onDelete: "set null" }),
	tier: mysqlEnum(['free_trial', 'basic', 'premium']).default('free_trial').notNull(),
	status: mysqlEnum(['active', 'cancelled', 'expired']).default('active').notNull(),
	trialEndsAt: timestamp({ mode: 'string' }),
	currentPeriodStart: timestamp({ mode: 'string' }),
	currentPeriodEnd: timestamp({ mode: 'string' }),
	stripeSubscriptionId: varchar({ length: 100 }),
	stripeCustomerId: varchar({ length: 100 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const developerSubscriptionLimits = mysqlTable("developer_subscription_limits", {
	id: int().autoincrement().notNull().primaryKey(),
	subscriptionId: int().notNull().references(() => developerSubscriptions.id, { onDelete: "cascade" }),
	maxDevelopments: int().default(1).notNull(),
	maxLeadsPerMonth: int().default(50).notNull(),
	maxTeamMembers: int().default(1).notNull(),
	analyticsRetentionDays: int().default(30).notNull(),
	crmIntegrationEnabled: int().default(0).notNull(),
	advancedAnalyticsEnabled: int().default(0).notNull(),
	bondIntegrationEnabled: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const developerSubscriptionUsage = mysqlTable("developer_subscription_usage", {
	id: int().autoincrement().notNull().primaryKey(),
	subscriptionId: int().notNull().references(() => developerSubscriptions.id, { onDelete: "cascade" }),
	developmentsCount: int().default(0).notNull(),
	leadsThisMonth: int().default(0).notNull(),
	teamMembersCount: int().default(0).notNull(),
	lastResetAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const developments = mysqlTable("developments", {
	id: int().autoincrement().notNull().primaryKey(),
	developerId: int().references(() => developers.id, { onDelete: "cascade" } ),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull().unique(),
	description: text(),
	developmentType: mysqlEnum(['residential','commercial','mixed_use','estate','complex']).notNull(),
	status: mysqlEnum(['planning','under_construction','completed','coming_soon']).default('planning').notNull(),
	address: text(),
	city: varchar({ length: 100 }).notNull(),
	province: varchar({ length: 100 }).notNull(),
	latitude: varchar({ length: 50 }),
	longitude: varchar({ length: 50 }),
	totalUnits: int(),
	availableUnits: int(),
	priceFrom: int(),
	priceTo: int(),
	amenities: text(), // JSON array
	images: text(), // JSON array of S3 URLs
	videos: text(), // JSON array of S3 URLs
	floorPlans: text(), // JSON array of S3 URLs
	brochures: text(), // JSON array of S3 URLs
	completionDate: timestamp({ mode: 'string' }),
	isFeatured: int().default(0).notNull(),
	isPublished: int().default(0).notNull(),
	views: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	publishedAt: timestamp({ mode: 'string' }),
});

export const developmentPhases = mysqlTable("development_phases", {
	id: int().autoincrement().notNull().primaryKey(),
	developmentId: int().notNull().references(() => developments.id, { onDelete: "cascade" }),
	name: varchar({ length: 255 }).notNull(),
	phaseNumber: int().notNull(),
	description: text(),
	status: mysqlEnum(['planning', 'pre_launch', 'selling', 'sold_out', 'completed']).default('planning').notNull(),
	totalUnits: int().default(0).notNull(),
	availableUnits: int().default(0).notNull(),
	priceFrom: int(),
	priceTo: int(),
	launchDate: timestamp({ mode: 'string' }),
	completionDate: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const developmentUnits = mysqlTable("development_units", {
	id: int().autoincrement().notNull().primaryKey(),
	developmentId: int().notNull().references(() => developments.id, { onDelete: "cascade" }),
	phaseId: int().references(() => developmentPhases.id, { onDelete: "set null" }),
	unitNumber: varchar({ length: 100 }).notNull(),
	unitType: mysqlEnum(['studio', '1bed', '2bed', '3bed', '4bed+', 'penthouse', 'townhouse', 'house']).notNull(),
	bedrooms: int(),
	bathrooms: decimal({ precision: 3, scale: 1 }),
	size: decimal({ precision: 10, scale: 2 }), // square meters
	price: decimal({ precision: 12, scale: 2 }).notNull(),
	floorPlan: text(), // S3 URL
	floor: int(),
	facing: varchar({ length: 50 }),
	features: text(), // JSON array
	status: mysqlEnum(['available', 'reserved', 'sold']).default('available').notNull(),
	reservedAt: timestamp({ mode: 'string' }),
	reservedBy: int(), // leadId
	soldAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const emailTemplates = mysqlTable("email_templates", {
	id: int().autoincrement().notNull(),
	templateKey: varchar({ length: 100 }).notNull(),
	subject: varchar({ length: 255 }).notNull(),
	htmlContent: text().notNull(),
	textContent: text(),
	agencyId: int().references(() => agencies.id, { onDelete: "cascade" } ),
	isActive: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const favorites = mysqlTable("favorites", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	propertyId: int().notNull().references(() => properties.id, { onDelete: "cascade" } ),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const invites = mysqlTable("invites", {
	id: int().autoincrement().notNull(),
	agencyId: int().notNull().references(() => agencies.id, { onDelete: "cascade" } ),
	email: varchar({ length: 255 }).notNull(),
	token: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 30 }).default('agent'),
	expiresAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const subscriptionTransactions = mysqlTable("subscription_transactions", {
	id: int().autoincrement().notNull(),
	subscriptionId: int().references(() => agencySubscriptions.id, { onDelete: "set null" }),
	agencyId: int().references(() => agencies.id, { onDelete: "cascade" }),
	userId: int().references(() => users.id, { onDelete: "set null" }),
	amount: int().notNull(), // in cents
	currency: varchar({ length: 3 }).default('ZAR').notNull(),
	status: mysqlEnum(['pending','completed','failed','refunded']).default('pending').notNull(),
	revenueCategory: mysqlEnum(['developer','agency','agent','vendor']).notNull(),
	billingPeriodStart: timestamp({ mode: 'string' }),
	billingPeriodEnd: timestamp({ mode: 'string' }),
	stripePaymentIntentId: varchar({ length: 100 }),
	paymentMethod: varchar({ length: 50 }),
	description: text(),
	metadata: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	paidAt: timestamp({ mode: 'string' }),
});

export const advertisingCampaigns = mysqlTable("advertising_campaigns", {
	id: int().autoincrement().notNull(),
	campaignType: mysqlEnum(['banner_ad','boosted_development','sponsored_listing']).notNull(),
	advertiserId: int().notNull(), // userId or agencyId
	advertiserType: mysqlEnum(['developer','agency','agent','vendor']).notNull(),
	amount: int().notNull(), // in cents
	currency: varchar({ length: 3 }).default('ZAR').notNull(),
	status: mysqlEnum(['draft','active','paused','completed','cancelled']).default('draft').notNull(),
	impressions: int().default(0).notNull(),
	clicks: int().default(0).notNull(),
	ctr: decimal({ precision: 5, scale: 2 }), // click-through rate percentage
	cpm: decimal({ precision: 10, scale: 2 }), // cost per thousand impressions
	cpc: decimal({ precision: 10, scale: 2 }), // cost per click
	placement: mysqlEnum(['homepage','listing_page','media_hub','dashboard','search_results']),
	targetAudience: text(), // JSON with targeting criteria
	developmentId: int().references(() => developments.id, { onDelete: "set null" }),
	listingId: int().references(() => listings.id, { onDelete: "set null" }),
	startDate: timestamp({ mode: 'string' }).notNull(),
	endDate: timestamp({ mode: 'string' }),
	budget: int(), // total budget in cents
	spentAmount: int().default(0).notNull(), // amount spent so far
	metadata: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const revenueForecasts = mysqlTable("revenue_forecasts", {
	id: int().autoincrement().notNull(),
	forecastPeriod: mysqlEnum(['30_days','90_days','quarter','year']).notNull(),
	revenueCategory: mysqlEnum(['subscriptions','advertising','total','developer','agency','agent','vendor']).notNull(),
	predictedAmount: int().notNull(), // in cents
	currency: varchar({ length: 3 }).default('ZAR').notNull(),
	confidence: decimal({ precision: 5, scale: 2 }), // confidence percentage (0-100)
	forecastMethod: varchar({ length: 50 }), // e.g., 'linear_regression', 'seasonal_arima'
	historicalDataPoints: int(), // number of data points used
	actualAmount: int(), // filled in after the period ends
	accuracy: decimal({ precision: 5, scale: 2 }), // calculated accuracy percentage
	metadata: text(), // JSON with additional forecast details
	generatedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	periodStartDate: timestamp({ mode: 'string' }).notNull(),
	periodEndDate: timestamp({ mode: 'string' }).notNull(),
});

export const failedPayments = mysqlTable("failed_payments", {
	id: int().autoincrement().notNull(),
	subscriptionId: int().references(() => agencySubscriptions.id, { onDelete: "set null" }),
	invoiceId: int().references(() => invoices.id, { onDelete: "set null" }),
	agencyId: int().references(() => agencies.id, { onDelete: "cascade" }),
	userId: int().references(() => users.id, { onDelete: "set null" }),
	amount: int().notNull(), // in cents
	currency: varchar({ length: 3 }).default('ZAR').notNull(),
	failureReason: text(),
	failureCode: varchar({ length: 100 }),
	retryCount: int().default(0).notNull(),
	maxRetries: int().default(3).notNull(),
	status: mysqlEnum(['pending_retry','retrying','resolved','abandoned','customer_action_required']).default('pending_retry').notNull(),
	nextRetryAt: timestamp({ mode: 'string' }),
	lastRetryAt: timestamp({ mode: 'string' }),
	resolvedAt: timestamp({ mode: 'string' }),
	churnRisk: mysqlEnum(['low','medium','high','critical']),
	notificationsSent: int().default(0).notNull(),
	lastNotificationAt: timestamp({ mode: 'string' }),
	stripePaymentIntentId: varchar({ length: 100 }),
	metadata: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});


export const leadActivities = mysqlTable("lead_activities", {
	id: int().autoincrement().notNull(),
	leadId: int().notNull().references(() => leads.id, { onDelete: "cascade" } ),
	agentId: int().references(() => agents.id, { onDelete: "set null" } ),
	activityType: mysqlEnum(['call','email','meeting','note','status_change','viewing_scheduled','offer_sent']).notNull(),
	description: text(),
	metadata: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const paymentProofs = mysqlTable("payment_proofs", {
	id: int().autoincrement().notNull(),
	invoiceId: int().references(() => invoices.id, { onDelete: "set null" }),
	subscriptionId: int().references(() => agencySubscriptions.id, { onDelete: "set null" }),
	agencyId: int().notNull().references(() => agencies.id, { onDelete: "cascade" }),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" }),
	amount: int().notNull(), // in cents
	currency: varchar({ length: 3 }).default('ZAR').notNull(),
	paymentMethod: mysqlEnum(['eft','bank_transfer','cash_deposit','other']).default('eft').notNull(),
	referenceNumber: varchar({ length: 100 }), // Bank reference or transaction ID
	proofOfPaymentUrl: text(), // URL to uploaded proof image/PDF
	bankName: varchar({ length: 100 }),
	accountHolderName: varchar({ length: 200 }),
	paymentDate: timestamp({ mode: 'string' }).notNull(),
	status: mysqlEnum(['pending','verified','rejected','expired']).default('pending').notNull(),
	verifiedBy: int().references(() => users.id, { onDelete: "set null" }),
	verifiedAt: timestamp({ mode: 'string' }),
	rejectionReason: text(),
	notes: text(),
	metadata: text(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const leads = mysqlTable("leads", {
	id: int().autoincrement().notNull(),
	propertyId: int().references(() => properties.id, { onDelete: "set null" } ),
	developmentId: int().references(() => developments.id, { onDelete: "set null" } ),
	agencyId: int().references(() => agencies.id, { onDelete: "set null" } ),
	agentId: int().references(() => agents.id, { onDelete: "set null" } ),
	name: varchar({ length: 200 }).notNull(),
	email: varchar({ length: 320 }).notNull(),
	phone: varchar({ length: 50 }),
	message: text(),
	leadType: mysqlEnum(['inquiry','viewing_request','offer','callback']).default('inquiry').notNull(),
	status: mysqlEnum(['new','contacted','qualified','converted','closed','viewing_scheduled','offer_sent','lost']).default('new').notNull(),
	source: varchar({ length: 100 }),
	// Affordability and qualification fields (Requirements 4.3, 5.3)
	affordabilityData: json('affordability_data'),
	qualificationStatus: mysqlEnum('qualification_status', ['qualified', 'partially_qualified', 'unqualified', 'pending']).default('pending'),
	qualificationScore: int('qualification_score').default(0),
	leadSource: varchar('lead_source', { length: 100 }),
	referrerUrl: text('referrer_url'),
	utmSource: varchar('utm_source', { length: 100 }),
	utmMedium: varchar('utm_medium', { length: 100 }),
	utmCampaign: varchar('utm_campaign', { length: 100 }),
	funnelStage: mysqlEnum('funnel_stage', ['interest', 'affordability', 'qualification', 'viewing', 'offer', 'bond', 'sale']).default('interest'),
	assignedTo: int('assigned_to'),
	assignedAt: timestamp('assigned_at', { mode: 'string' }),
	convertedAt: timestamp('converted_at', { mode: 'string' }),
	lostReason: text('lost_reason'),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	nextFollowUp: timestamp({ mode: 'string' }),
	lastContactedAt: timestamp({ mode: 'string' }),
	notes: text(),
});

export const locationSearchCache = mysqlTable("location_search_cache", {
	id: int().autoincrement().notNull(),
	searchQuery: varchar({ length: 255 }).notNull(),
	searchType: mysqlEnum(['province','city','suburb','address','all']).notNull(),
	resultsJson: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
});



export const marketInsightsCache = mysqlTable("market_insights_cache", {
	id: int().autoincrement().notNull(),
	cacheKey: varchar({ length: 255 }).notNull(),
	cacheData: text().notNull(),
	cacheType: mysqlEnum(['suburb_heatmap','city_trends','popular_areas','price_predictions','user_recommendations']).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	recordedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	source: mysqlEnum(['new_listing','price_change','sold','rented','market_update']).default('market_update').notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	ownerId: int().notNull().references(() => users.id),
	propertySettings: text(),
	videoUrl: text(),
	virtualTourUrl: text(),
	levies: int(),
	ratesAndTaxes: int(),
	mainImage: varchar({ length: 1024 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
}, (table) => {
	return {
		priceIdx: index("price_idx").on(table.price),
		statusIdx: index("status_idx").on(table.status),
		cityIdx: index("city_idx").on(table.city),
		provinceIdx: index("province_idx").on(table.province),
		propertyTypeIdx: index("property_type_idx").on(table.propertyType),
		listingTypeIdx: index("listing_type_idx").on(table.listingType),
		bedroomsIdx: index("bedrooms_idx").on(table.bedrooms),
		bathroomsIdx: index("bathrooms_idx").on(table.bathrooms),
	}
});

export const propertyImages = mysqlTable("propertyImages", {
	id: int().autoincrement().notNull(),
	propertyId: int().notNull().references(() => properties.id, { onDelete: "cascade" } ),
	imageUrl: text().notNull(),
	isPrimary: int().notNull(),
	displayOrder: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

export const prospectFavorites = mysqlTable("prospect_favorites", {
	id: int().autoincrement().notNull(),
	prospectId: int().notNull().references(() => prospects.id, { onDelete: "cascade" } ),
	propertyId: int().notNull().references(() => properties.id, { onDelete: "cascade" } ),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const provinces = mysqlTable("provinces", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	code: varchar({ length: 10 }).notNull(),
	latitude: varchar({ length: 20 }),
	longitude: varchar({ length: 21 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const recentlyViewed = mysqlTable("recently_viewed", {
	id: int().autoincrement().notNull(),
	prospectId: int().notNull().references(() => prospects.id, { onDelete: "cascade" } ),
	propertyId: int().notNull().references(() => properties.id, { onDelete: "cascade" } ),
	viewedAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

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
	latitude: varchar({ length: 20 }),
	longitude: varchar({ length: 21 }),
	postalCode: varchar({ length: 10 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

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
	isSubaccount: int().default(0).notNull(),
	passwordResetToken: varchar({ length: 255 }),
	passwordResetTokenExpiresAt: timestamp({ mode: 'string' }),
	emailVerificationToken: varchar({ length: 255 }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => {
	return {
		emailIdx: index("email_idx").on(table.email),
		roleIdx: index("role_idx").on(table.role),
	}
});

export const videoLikes = mysqlTable("videoLikes", {
	id: int().autoincrement().notNull(),
	videoId: int().notNull().references(() => videos.id, { onDelete: "cascade" } ),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
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
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export type User = InferSelectModel<typeof users>;
export type InsertUser = InferInsertModel<typeof users>;

export type Property = InferSelectModel<typeof properties>;
export type InsertProperty = InferInsertModel<typeof properties>;

export type PropertyImage = InferSelectModel<typeof propertyImages>;
export type InsertPropertyImage = InferInsertModel<typeof propertyImages>;

export type Agency = InferSelectModel<typeof agencies>;
export type InsertAgency = InferInsertModel<typeof agencies>;

export type Prospect = InferSelectModel<typeof prospects>;
export type InsertProspect = InferInsertModel<typeof prospects>;

export type Listing = InferSelectModel<typeof listings>;
export type InsertListing = InferInsertModel<typeof listings>;

export type ListingMedia = InferSelectModel<typeof listingMedia>;
export type InsertListingMedia = InferInsertModel<typeof listingMedia>;

export type ListingAnalytics = InferSelectModel<typeof listingAnalytics>;
export type InsertListingAnalytics = InferInsertModel<typeof listingAnalytics>;

export const savedSearches = mysqlTable("saved_searches", {
	id: int().autoincrement().notNull(),
	userId: int().notNull().references(() => users.id, { onDelete: "cascade" } ),
	name: varchar({ length: 255 }).notNull(),
	criteria: json().notNull(),
	notificationFrequency: mysqlEnum(['never', 'daily', 'weekly']).default('never'),
	lastNotifiedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export type SavedSearch = InferSelectModel<typeof savedSearches>;
export type InsertSavedSearch = InferInsertModel<typeof savedSearches>;

export const locations = mysqlTable("locations", {
	id: int().autoincrement().notNull().primaryKey(),
	placeId: varchar("place_id", { length: 255 }).notNull().unique(),
	name: varchar("name", { length: 255 }).notNull(),
	fullAddress: text("full_address").notNull(),
	locationType: varchar("location_type", { length: 50 }).notNull(),
	province: varchar("province", { length: 100 }),
	country: varchar("country", { length: 100 }).default('South Africa'),
	latitude: decimal("latitude", { precision: 10, scale: 8 }),
	longitude: decimal("longitude", { precision: 11, scale: 8 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
}, (table) => {
	return {
	}
});

// Marketing Campaigns Module

export const marketingCampaigns = mysqlTable("marketing_campaigns", {
	id: int().autoincrement().notNull().primaryKey(),
	ownerType: mysqlEnum(['agent', 'developer', 'agency']).notNull(),
	ownerId: int().notNull(), // Can reference agents.id, users.id (for developers), or agencies.id
	campaignName: varchar({ length: 255 }).notNull(),
	campaignType: mysqlEnum(['listing_boost', 'lead_generation', 'brand_awareness', 'development_launch', 'agent_promotion']).notNull(),
	description: text(),
	status: mysqlEnum(['draft', 'active', 'paused', 'completed', 'scheduled']).default('draft').notNull(),
	targetType: mysqlEnum(['listing', 'development', 'agent_profile', 'agency_page']).notNull(),
	targetId: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const campaignTargeting = mysqlTable("campaign_targeting", {
	id: int().autoincrement().notNull().primaryKey(),
	campaignId: int().notNull().references(() => marketingCampaigns.id, { onDelete: "cascade" }),
	locationTargeting: json(), // Array of strings
	buyerProfile: json(), // Array of enums
	priceRange: json(), // { min: number, max: number }
	propertyType: json(), // Array of enums
	customTags: json(), // Array of strings
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const campaignBudgets = mysqlTable("campaign_budgets", {
	id: int().autoincrement().notNull().primaryKey(),
	campaignId: int().notNull().references(() => marketingCampaigns.id, { onDelete: "cascade" }),
	budgetType: mysqlEnum(['daily', 'lifetime', 'subscription']).notNull(),
	budgetAmount: decimal({ precision: 10, scale: 2 }).notNull(),
	billingMethod: mysqlEnum(['ppc', 'ppv', 'per_lead', 'per_boost', 'flat_fee']).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const campaignSchedules = mysqlTable("campaign_schedules", {
	id: int().autoincrement().notNull().primaryKey(),
	campaignId: int().notNull().references(() => marketingCampaigns.id, { onDelete: "cascade" }),
	startDate: timestamp({ mode: 'string' }).notNull(),
	endDate: timestamp({ mode: 'string' }),
	autoPace: boolean().default(true),
	frequency: mysqlEnum(['one_time', 'weekly', 'monthly']).default('one_time'),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const campaignChannels = mysqlTable("campaign_channels", {
	id: int().autoincrement().notNull().primaryKey(),
	campaignId: int().notNull().references(() => marketingCampaigns.id, { onDelete: "cascade" }),
	type: mysqlEnum(['feed', 'search', 'carousel', 'email', 'push', 'showcase', 'retargeting']).notNull(),
	enabled: boolean().default(false).notNull(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const campaignCreatives = mysqlTable("campaign_creatives", {
	id: int().autoincrement().notNull().primaryKey(),
	campaignId: int().notNull().references(() => marketingCampaigns.id, { onDelete: "cascade" }),
	images: json(), // Array of file IDs/URLs
	videos: json(), // Array of file IDs/URLs
	headlines: json(), // Array of strings
	descriptions: json(), // Array of strings
	cta: mysqlEnum(['view_listing', 'book_viewing', 'contact_agent', 'download_brochure', 'pre_qualify']).default('view_listing'),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().onUpdateNow().notNull(),
});

export const campaignPerformance = mysqlTable("campaign_performance", {
	id: int().autoincrement().notNull().primaryKey(),
	campaignId: int().notNull().references(() => marketingCampaigns.id, { onDelete: "cascade" }),
	impressions: int().default(0).notNull(),
	clicks: int().default(0).notNull(),
	profileViews: int().default(0).notNull(),
	leadSubmissions: int().default(0).notNull(),
	whatsappClicks: int().default(0).notNull(),
	viewingsBooked: int().default(0).notNull(),
	spend: decimal({ precision: 10, scale: 2 }).default('0.00').notNull(),
	date: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(), // Daily stats
});

export const campaignLeads = mysqlTable("campaign_leads", {
	id: int().autoincrement().notNull().primaryKey(),
	campaignId: int().notNull().references(() => marketingCampaigns.id, { onDelete: "cascade" }),
	listingId: int(),
	developmentId: int(),
	channel: mysqlEnum(['feed', 'search', 'carousel', 'email', 'push', 'showcase', 'retargeting']),
	leadId: int(), // Reference to a leads table if it exists, or just store data here
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
});

// Export types
export type MarketingCampaign = InferSelectModel<typeof marketingCampaigns>;
export type InsertMarketingCampaign = InferInsertModel<typeof marketingCampaigns>;

export type CampaignTargeting = InferSelectModel<typeof campaignTargeting>;
export type InsertCampaignTargeting = InferInsertModel<typeof campaignTargeting>;

export type CampaignBudget = InferSelectModel<typeof campaignBudgets>;
export type InsertCampaignBudget = InferInsertModel<typeof campaignBudgets>;

export type CampaignSchedule = InferSelectModel<typeof campaignSchedules>;
export type InsertCampaignSchedule = InferInsertModel<typeof campaignSchedules>;

export type CampaignChannel = InferSelectModel<typeof campaignChannels>;
export type InsertCampaignChannel = InferInsertModel<typeof campaignChannels>;

export type CampaignCreative = InferSelectModel<typeof campaignCreatives>;
export type InsertCampaignCreative = InferInsertModel<typeof campaignCreatives>;

export type CampaignPerformance = InferSelectModel<typeof campaignPerformance>;
export type InsertCampaignPerformance = InferInsertModel<typeof campaignPerformance>;

export type CampaignLead = InferSelectModel<typeof campaignLeads>;
export type InsertCampaignLead = InferInsertModel<typeof campaignLeads>;

// Activities table for tracking developer actions
export const activities = mysqlTable("activities", {
	id: int().autoincrement().notNull().primaryKey(),
	developerId: int().notNull().references(() => developers.id, { onDelete: "cascade" }),
	activityType: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	metadata: json(),
	relatedEntityType: mysqlEnum(['development', 'unit', 'lead', 'campaign', 'team_member']),
	relatedEntityId: int(),
	userId: int().references(() => users.id, { onDelete: "set null" }),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => ({
	developerIdIdx: index("idx_activities_developer_id").on(table.developerId),
	activityTypeIdx: index("idx_activities_type").on(table.activityType),
	createdAtIdx: index("idx_activities_created_at").on(table.createdAt),
	relatedEntityIdx: index("idx_activities_related_entity").on(table.relatedEntityType, table.relatedEntityId),
	feedIdx: index("idx_activities_feed").on(table.developerId, table.createdAt),
}));

export type Activity = InferSelectModel<typeof activities>;
export type InsertActivity = InferInsertModel<typeof activities>;

// Developer notifications table for mission control notifications
export const developerNotifications = mysqlTable("developer_notifications", {
	id: int().autoincrement().notNull().primaryKey(),
	developerId: int().notNull().references(() => developers.id, { onDelete: "cascade" }),
	userId: int().references(() => users.id, { onDelete: "set null" }),
	title: varchar({ length: 255 }).notNull(),
	body: text().notNull(),
	type: varchar({ length: 50 }).notNull(),
	severity: mysqlEnum(['info', 'warning', 'error', 'success']).notNull().default('info'),
	read: boolean().notNull().default(false),
	actionUrl: varchar({ length: 500 }),
	metadata: json(),
	createdAt: timestamp({ mode: 'string' }).default('CURRENT_TIMESTAMP').notNull(),
}, (table) => ({
	developerIdIdx: index("idx_developer_notifications_developer_id").on(table.developerId),
	userIdIdx: index("idx_developer_notifications_user_id").on(table.userId),
	readIdx: index("idx_developer_notifications_read").on(table.read),
	createdAtIdx: index("idx_developer_notifications_created_at").on(table.createdAt),
	typeIdx: index("idx_developer_notifications_type").on(table.type),
	feedIdx: index("idx_developer_notifications_feed").on(table.developerId, table.read, table.createdAt),
}));

export type DeveloperNotification = InferSelectModel<typeof developerNotifications>;
export type InsertDeveloperNotification = InferInsertModel<typeof developerNotifications>;
