CREATE TABLE `agencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`logo` text,
	`website` varchar(255),
	`email` varchar(320),
	`phone` varchar(50),
	`address` text,
	`city` varchar(100),
	`province` varchar(100),
	`subscriptionPlan` varchar(50) NOT NULL DEFAULT 'free',
	`subscriptionStatus` varchar(30) NOT NULL DEFAULT 'trial',
	`subscriptionExpiry` timestamp,
	`isVerified` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agencies_id` PRIMARY KEY(`id`),
	CONSTRAINT `agencies_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `agency_branding` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`primaryColor` varchar(7),
	`secondaryColor` varchar(7),
	`accentColor` varchar(7),
	`logoUrl` text,
	`faviconUrl` text,
	`customDomain` varchar(255),
	`subdomain` varchar(63),
	`companyName` varchar(255),
	`tagline` varchar(255),
	`customCss` text,
	`metaTitle` varchar(255),
	`metaDescription` text,
	`supportEmail` varchar(320),
	`supportPhone` varchar(50),
	`socialLinks` text,
	`isEnabled` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agency_branding_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agency_join_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`message` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	CONSTRAINT `agency_join_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agency_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`planId` int,
	`stripeSubscriptionId` varchar(100),
	`stripeCustomerId` varchar(100) NOT NULL,
	`stripePriceId` varchar(100),
	`status` enum('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid') NOT NULL DEFAULT 'incomplete',
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`trialEnd` timestamp,
	`cancelAtPeriodEnd` int NOT NULL DEFAULT 0,
	`canceledAt` timestamp,
	`endedAt` timestamp,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agency_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `agency_subscriptions_stripeSubscriptionId_unique` UNIQUE(`stripeSubscriptionId`)
);
--> statement-breakpoint
CREATE TABLE `agent_coverage_areas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`areaName` varchar(255) NOT NULL,
	`areaType` enum('province','city','suburb','custom_polygon') NOT NULL,
	`areaData` text NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_coverage_areas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`agencyId` int,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`displayName` varchar(200),
	`bio` text,
	`profileImage` text,
	`phone` varchar(50),
	`email` varchar(320),
	`whatsapp` varchar(50),
	`specialization` text,
	`role` enum('agent','principal_agent','broker') NOT NULL DEFAULT 'agent',
	`licenseNumber` varchar(100),
	`yearsExperience` int,
	`areasServed` text,
	`languages` text,
	`rating` int DEFAULT 0,
	`reviewCount` int DEFAULT 0,
	`totalSales` int DEFAULT 0,
	`isVerified` int NOT NULL DEFAULT 0,
	`isFeatured` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analytics_aggregations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`aggregationType` enum('daily','weekly','monthly') NOT NULL,
	`aggregationDate` varchar(10) NOT NULL,
	`suburbId` int,
	`cityId` int,
	`provinceId` int,
	`propertyType` varchar(50),
	`listingType` varchar(50),
	`totalProperties` int DEFAULT 0,
	`activeListings` int DEFAULT 0,
	`avgPrice` int,
	`medianPrice` int,
	`minPrice` int,
	`maxPrice` int,
	`pricePerSqmAvg` int,
	`totalViews` int DEFAULT 0,
	`totalSaves` int DEFAULT 0,
	`totalContacts` int DEFAULT 0,
	`uniqueVisitors` int DEFAULT 0,
	`newListings` int DEFAULT 0,
	`soldProperties` int DEFAULT 0,
	`rentedProperties` int DEFAULT 0,
	`avgDaysOnMarket` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_aggregations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`targetType` varchar(50),
	`targetId` int,
	`metadata` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provinceId` int NOT NULL,
	`name` varchar(150) NOT NULL,
	`latitude` varchar(20),
	`longitude` varchar(21),
	`isMetro` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `city_price_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cityId` int NOT NULL,
	`provinceId` int NOT NULL,
	`currentAvgPrice` int,
	`currentMedianPrice` int,
	`currentMinPrice` int,
	`currentMaxPrice` int,
	`currentPriceCount` int DEFAULT 0,
	`sixMonthGrowthPercent` int,
	`threeMonthGrowthPercent` int,
	`oneMonthGrowthPercent` int,
	`totalProperties` int DEFAULT 0,
	`activeListings` int DEFAULT 0,
	`averageDaysOnMarket` int DEFAULT 0,
	`luxurySegmentPercent` int DEFAULT 0,
	`midRangePercent` int DEFAULT 0,
	`affordablePercent` int DEFAULT 0,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `city_price_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`propertyId` int,
	`leadId` int,
	`amount` int NOT NULL,
	`percentage` int,
	`status` enum('pending','approved','paid','cancelled') NOT NULL DEFAULT 'pending',
	`transactionType` enum('sale','rent','referral','other') NOT NULL DEFAULT 'sale',
	`description` text,
	`payoutDate` timestamp,
	`paymentReference` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`stripeCouponId` varchar(100),
	`name` varchar(100),
	`description` text,
	`discountType` enum('amount','percent') NOT NULL DEFAULT 'percent',
	`discountAmount` int,
	`maxRedemptions` int,
	`redemptionsUsed` int NOT NULL DEFAULT 0,
	`validFrom` timestamp,
	`validUntil` timestamp,
	`isActive` int NOT NULL DEFAULT 1,
	`appliesToPlans` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`),
	CONSTRAINT `coupons_stripeCouponId_unique` UNIQUE(`stripeCouponId`)
);
--> statement-breakpoint
CREATE TABLE `developers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`logo` text,
	`website` varchar(255),
	`email` varchar(320),
	`phone` varchar(50),
	`address` text,
	`city` varchar(100),
	`province` varchar(100),
	`category` enum('residential','commercial','mixed_use','industrial') NOT NULL DEFAULT 'residential',
	`establishedYear` int,
	`totalProjects` int DEFAULT 0,
	`rating` int DEFAULT 0,
	`reviewCount` int DEFAULT 0,
	`isVerified` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `developers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `developments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`developerId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`developmentType` enum('residential','commercial','mixed_use','estate','complex') NOT NULL,
	`status` enum('planning','under_construction','completed','coming_soon') NOT NULL DEFAULT 'planning',
	`address` text,
	`city` varchar(100) NOT NULL,
	`province` varchar(100) NOT NULL,
	`latitude` varchar(50),
	`longitude` varchar(50),
	`totalUnits` int,
	`availableUnits` int,
	`priceFrom` int,
	`priceTo` int,
	`amenities` text,
	`images` text,
	`videos` text,
	`completionDate` timestamp,
	`isFeatured` int NOT NULL DEFAULT 0,
	`views` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `developments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateKey` varchar(100) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`htmlContent` text NOT NULL,
	`textContent` text,
	`agencyId` int,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_templates_templateKey_unique` UNIQUE(`templateKey`)
);
--> statement-breakpoint
CREATE TABLE `exploreVideos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int,
	`propertyId` int,
	`developmentId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`videoUrl` text NOT NULL,
	`thumbnailUrl` text,
	`duration` int,
	`views` int NOT NULL DEFAULT 0,
	`likes` int NOT NULL DEFAULT 0,
	`shares` int NOT NULL DEFAULT 0,
	`isPublished` int NOT NULL DEFAULT 1,
	`isFeatured` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exploreVideos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`propertyId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`invitedBy` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` varchar(50) NOT NULL DEFAULT 'agent',
	`token` varchar(255) NOT NULL,
	`status` enum('pending','accepted','expired','cancelled') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`acceptedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`email` varchar(255) NOT NULL,
	`token` varchar(255) NOT NULL,
	`role` varchar(30) DEFAULT 'agent',
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`used` int NOT NULL DEFAULT 0,
	`usedAt` timestamp,
	`usedBy` int,
	CONSTRAINT `invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`subscriptionId` int,
	`stripeInvoiceId` varchar(100),
	`stripeCustomerId` varchar(100),
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'ZAR',
	`status` enum('draft','open','paid','void','uncollectible') NOT NULL DEFAULT 'draft',
	`invoicePdf` text,
	`hostedInvoiceUrl` text,
	`invoiceNumber` varchar(50),
	`description` text,
	`billingReason` enum('subscription_cycle','subscription_create','subscription_update','subscription_finalize','manual') NOT NULL DEFAULT 'subscription_cycle',
	`periodStart` timestamp,
	`periodEnd` timestamp,
	`paidAt` timestamp,
	`dueDate` timestamp,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_stripeInvoiceId_unique` UNIQUE(`stripeInvoiceId`)
);
--> statement-breakpoint
CREATE TABLE `lead_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`agentId` int,
	`activityType` enum('call','email','meeting','note','status_change','viewing_scheduled','offer_sent') NOT NULL,
	`description` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int,
	`developmentId` int,
	`agencyId` int,
	`agentId` int,
	`name` varchar(200) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`message` text,
	`leadType` enum('inquiry','viewing_request','offer','callback') NOT NULL DEFAULT 'inquiry',
	`status` enum('new','contacted','qualified','converted','closed','viewing_scheduled','offer_sent','lost') NOT NULL DEFAULT 'new',
	`source` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`nextFollowUp` timestamp,
	`lastContactedAt` timestamp,
	`notes` text,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `location_search_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`searchQuery` varchar(255) NOT NULL,
	`searchType` enum('province','city','suburb','address','all') NOT NULL,
	`resultsJSON` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `location_search_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`type` enum('province','city','suburb','neighborhood') NOT NULL,
	`parentId` int,
	`description` text,
	`latitude` varchar(50),
	`longitude` varchar(50),
	`propertyCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `locations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `market_insights_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cacheKey` varchar(255) NOT NULL,
	`cacheData` text NOT NULL,
	`cacheType` enum('suburb_heatmap','city_trends','popular_areas','price_predictions','user_recommendations') NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `market_insights_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `market_insights_cache_cacheKey_unique` UNIQUE(`cacheKey`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('lead_assigned','offer_received','showing_scheduled','system_alert') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`data` text,
	`isRead` int NOT NULL DEFAULT 0,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `offers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`leadId` int,
	`agentId` int,
	`buyerName` varchar(200) NOT NULL,
	`buyerEmail` varchar(320),
	`buyerPhone` varchar(50),
	`offerAmount` int NOT NULL,
	`status` enum('pending','accepted','rejected','countered','withdrawn') NOT NULL DEFAULT 'pending',
	`conditions` text,
	`expiresAt` timestamp,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `offers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`stripePaymentMethodId` varchar(100),
	`type` enum('card','bank_account') NOT NULL DEFAULT 'card',
	`cardBrand` varchar(20),
	`cardLast4` varchar(4),
	`cardExpMonth` int,
	`cardExpYear` int,
	`bankName` varchar(100),
	`bankLast4` varchar(4),
	`isDefault` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_methods_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_methods_stripePaymentMethodId_unique` UNIQUE(`stripePaymentMethodId`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`displayName` varchar(100) NOT NULL,
	`description` text,
	`price` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'ZAR',
	`interval` enum('month','year') NOT NULL DEFAULT 'month',
	`stripePriceId` varchar(100),
	`features` text,
	`limits` text,
	`isActive` int NOT NULL DEFAULT 1,
	`isPopular` int NOT NULL DEFAULT 0,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `plans_name_unique` UNIQUE(`name`),
	CONSTRAINT `plans_stripePriceId_unique` UNIQUE(`stripePriceId`)
);
--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`category` enum('pricing','features','notifications','limits','other') NOT NULL DEFAULT 'other',
	`isPublic` int NOT NULL DEFAULT 0,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `price_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`locationId` int NOT NULL,
	`locationType` enum('suburb','city','province') NOT NULL,
	`currentAvgPrice` int,
	`currentMedianPrice` int,
	`currentMinPrice` int,
	`currentMaxPrice` int,
	`currentPriceCount` int DEFAULT 0,
	`oneMonthGrowthPercent` int,
	`threeMonthGrowthPercent` int,
	`sixMonthGrowthPercent` int,
	`oneYearGrowthPercent` int,
	`luxurySegmentPercent` int DEFAULT 0,
	`midRangePercent` int DEFAULT 0,
	`affordablePercent` int DEFAULT 0,
	`avgDaysOnMarket` int DEFAULT 0,
	`newListingsMonthly` int DEFAULT 0,
	`soldPropertiesMonthly` int DEFAULT 0,
	`trendingDirection` enum('up','down','stable') NOT NULL DEFAULT 'stable',
	`trendConfidence` int DEFAULT 0,
	`totalProperties` int DEFAULT 0,
	`activeListings` int DEFAULT 0,
	`userInteractions` int DEFAULT 0,
	`priceVolatility` int DEFAULT 0,
	`marketMomentum` int DEFAULT 0,
	`investmentScore` int DEFAULT 0,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `price_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`suburbId` int,
	`cityId` int,
	`provinceId` int,
	`price` int NOT NULL,
	`pricePerSqm` int,
	`propertyType` enum('apartment','house','villa','plot','commercial','townhouse','cluster_home','farm','shared_living') NOT NULL,
	`listingType` enum('sale','rent','rent_to_buy','auction','shared_living') NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`source` enum('new_listing','price_change','sold','rented','market_update') NOT NULL DEFAULT 'market_update',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int,
	`suburbId` int,
	`cityId` int,
	`provinceId` int,
	`predictedPrice` int NOT NULL,
	`predictedPriceRangeMin` int,
	`predictedPriceRangeMax` int,
	`confidenceScore` int DEFAULT 0,
	`modelVersion` varchar(50),
	`modelFeatures` text,
	`trainingDataSize` int,
	`actualPrice` int,
	`predictionError` int,
	`predictionAccuracy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`validatedAt` timestamp,
	CONSTRAINT `price_predictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`propertyType` enum('apartment','house','villa','plot','commercial','townhouse','cluster_home','farm','shared_living') NOT NULL,
	`listingType` enum('sale','rent','rent_to_buy','auction','shared_living') NOT NULL,
	`transactionType` enum('sale','rent','rent_to_buy','auction') NOT NULL DEFAULT 'sale',
	`price` int NOT NULL,
	`bedrooms` int,
	`bathrooms` int,
	`area` int NOT NULL,
	`address` text NOT NULL,
	`city` varchar(100) NOT NULL,
	`province` varchar(100) NOT NULL,
	`zipCode` varchar(20),
	`latitude` varchar(50),
	`longitude` varchar(50),
	`provinceId` int,
	`cityId` int,
	`suburbId` int,
	`locationText` text,
	`placeId` varchar(255),
	`amenities` text,
	`yearBuilt` int,
	`status` enum('available','sold','rented','pending','draft','published','archived') NOT NULL DEFAULT 'available',
	`featured` int NOT NULL DEFAULT 0,
	`views` int NOT NULL DEFAULT 0,
	`enquiries` int NOT NULL DEFAULT 0,
	`agentId` int,
	`developmentId` int,
	`ownerId` int NOT NULL,
	`propertySettings` text,
	`videoUrl` text,
	`virtualTourUrl` text,
	`levies` int,
	`ratesAndTaxes` int,
	`mainImage` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `propertyImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`isPrimary` int NOT NULL DEFAULT 0,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `propertyImages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `property_similarity_index` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId1` int NOT NULL,
	`propertyId2` int NOT NULL,
	`locationSimilarity` int DEFAULT 0,
	`priceSimilarity` int DEFAULT 0,
	`typeSimilarity` int DEFAULT 0,
	`featureSimilarity` int DEFAULT 0,
	`overallSimilarity` int DEFAULT 0,
	`similarityReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `property_similarity_index_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prospect_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prospectId` int NOT NULL,
	`propertyId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prospect_favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`income` int,
	`incomeRange` enum('under_15k','15k_25k','25k_50k','50k_100k','over_100k'),
	`employmentStatus` enum('employed','self_employed','business_owner','student','retired','unemployed'),
	`combinedIncome` int,
	`monthlyExpenses` int,
	`monthlyDebts` int,
	`dependents` int DEFAULT 0,
	`savingsDeposit` int,
	`creditScore` int,
	`hasCreditConsent` int DEFAULT 0,
	`buyabilityScore` enum('low','medium','high'),
	`affordabilityMin` int,
	`affordabilityMax` int,
	`monthlyPaymentCapacity` int,
	`profileProgress` int DEFAULT 0,
	`badges` text,
	`lastActivity` timestamp,
	`preferredPropertyType` enum('apartment','house','villa','plot','commercial','townhouse','cluster_home','farm','shared_living'),
	`preferredLocation` varchar(100),
	`maxCommuteTime` int,
	`ipAddress` varchar(45),
	`userAgent` text,
	`referrer` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prospects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `provinces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(10) NOT NULL,
	`latitude` varchar(20),
	`longitude` varchar(21),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `provinces_id` PRIMARY KEY(`id`),
	CONSTRAINT `provinces_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `recently_viewed` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prospectId` int NOT NULL,
	`propertyId` int NOT NULL,
	`viewedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recently_viewed_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reviewType` enum('agent','developer','property') NOT NULL,
	`targetId` int NOT NULL,
	`rating` int NOT NULL,
	`title` varchar(255),
	`comment` text,
	`isVerified` int NOT NULL DEFAULT 0,
	`isPublished` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_viewings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prospectId` int NOT NULL,
	`propertyId` int NOT NULL,
	`agentId` int,
	`scheduledAt` timestamp NOT NULL,
	`status` enum('scheduled','confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`prospectName` varchar(200),
	`prospectEmail` varchar(320),
	`prospectPhone` varchar(50),
	`notificationSent` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_viewings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('home_loan','insurance','interior_design','legal','moving','other') NOT NULL,
	`description` text,
	`logo` text,
	`website` varchar(255),
	`email` varchar(320),
	`phone` varchar(50),
	`commissionRate` int,
	`isActive` int NOT NULL DEFAULT 1,
	`isFeatured` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `showings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`leadId` int,
	`agentId` int,
	`scheduledAt` timestamp NOT NULL,
	`status` enum('requested','confirmed','completed','cancelled') NOT NULL DEFAULT 'requested',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `showings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suburb_price_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`suburbId` int NOT NULL,
	`cityId` int NOT NULL,
	`provinceId` int NOT NULL,
	`currentAvgPrice` int,
	`currentMedianPrice` int,
	`currentMinPrice` int,
	`currentMaxPrice` int,
	`currentPriceCount` int DEFAULT 0,
	`lastMonthAvgPrice` int,
	`lastMonthMedianPrice` int,
	`lastMonthPriceCount` int DEFAULT 0,
	`sixMonthGrowthPercent` int,
	`threeMonthGrowthPercent` int,
	`oneMonthGrowthPercent` int,
	`trendingDirection` enum('up','down','stable') NOT NULL DEFAULT 'stable',
	`trendConfidence` int DEFAULT 0,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suburb_price_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suburbs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cityId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`latitude` varchar(20),
	`longitude` varchar(21),
	`postalCode` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suburbs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_behavior_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionId` varchar(255) NOT NULL,
	`eventType` enum('property_view','search','save_property','contact_agent','map_interaction','price_filter','location_filter','property_type_filter') NOT NULL,
	`eventData` text,
	`propertyId` int,
	`suburbId` int,
	`cityId` int,
	`provinceId` int,
	`priceRangeMin` int,
	`priceRangeMax` int,
	`propertyType` varchar(50),
	`listingType` varchar(50),
	`pageUrl` varchar(500),
	`referrer` varchar(500),
	`userAgent` text,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_behavior_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`preferredPropertyTypes` text,
	`preferredPriceMin` int,
	`preferredPriceMax` int,
	`preferredBedrooms` int,
	`preferredBathrooms` int,
	`preferredPropertySize` text,
	`preferredLocations` text,
	`preferredDistance` int,
	`preferredProvices` text,
	`preferredCities` text,
	`preferredSuburbs` text,
	`requiredAmenities` text,
	`preferredAmenities` text,
	`propertyFeatures` text,
	`petFriendly` int DEFAULT 0,
	`furnished` enum('unfurnished','semi_furnished','fully_furnished'),
	`alertFrequency` enum('never','instant','daily','weekly') DEFAULT 'daily',
	`emailNotifications` int DEFAULT 1,
	`smsNotifications` int DEFAULT 0,
	`pushNotifications` int DEFAULT 1,
	`isActive` int DEFAULT 1,
	`locationWeight` int DEFAULT 30,
	`priceWeight` int DEFAULT 25,
	`featuresWeight` int DEFAULT 25,
	`sizeWeight` int DEFAULT 20,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastUsed` timestamp,
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`preferredSuburbs` text,
	`preferredCities` text,
	`preferredPriceRange` text,
	`preferredPropertyTypes` text,
	`preferredListingTypes` text,
	`recommendedSuburbs` text,
	`recommendedProperties` text,
	`recommendedSimilarUsers` text,
	`recommendationClickCount` int DEFAULT 0,
	`recommendationConversionCount` int DEFAULT 0,
	`lastRecommendationUpdate` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64),
	`email` varchar(320),
	`passwordHash` varchar(255),
	`name` text,
	`firstName` varchar(100),
	`lastName` varchar(100),
	`phone` varchar(30),
	`loginMethod` varchar(64),
	`emailVerified` int NOT NULL DEFAULT 0,
	`passwordResetToken` varchar(255),
	`passwordResetTokenExpiresAt` timestamp,
	`emailVerificationToken` varchar(255),
	`role` enum('visitor','agent','agency_admin','super_admin') NOT NULL DEFAULT 'visitor',
	`agencyId` int,
	`isSubaccount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `videoLikes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`videoId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `videoLikes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int,
	`propertyId` int,
	`developmentId` int,
	`videoUrl` text NOT NULL,
	`caption` text,
	`type` enum('listing','content') NOT NULL DEFAULT 'content',
	`duration` int DEFAULT 0,
	`views` int NOT NULL DEFAULT 0,
	`likes` int NOT NULL DEFAULT 0,
	`shares` int NOT NULL DEFAULT 0,
	`isPublished` int NOT NULL DEFAULT 1,
	`isFeatured` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `videos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agency_branding` ADD CONSTRAINT `agency_branding_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_join_requests` ADD CONSTRAINT `agency_join_requests_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_join_requests` ADD CONSTRAINT `agency_join_requests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_join_requests` ADD CONSTRAINT `agency_join_requests_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_subscriptions` ADD CONSTRAINT `agency_subscriptions_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_subscriptions` ADD CONSTRAINT `agency_subscriptions_planId_plans_id_fk` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent_coverage_areas` ADD CONSTRAINT `agent_coverage_areas_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agents` ADD CONSTRAINT `agents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agents` ADD CONSTRAINT `agents_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` ADD CONSTRAINT `analytics_aggregations_suburbId_suburbs_id_fk` FOREIGN KEY (`suburbId`) REFERENCES `suburbs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` ADD CONSTRAINT `analytics_aggregations_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` ADD CONSTRAINT `analytics_aggregations_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cities` ADD CONSTRAINT `cities_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `city_price_analytics` ADD CONSTRAINT `city_price_analytics_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `city_price_analytics` ADD CONSTRAINT `city_price_analytics_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developments` ADD CONSTRAINT `developments_developerId_developers_id_fk` FOREIGN KEY (`developerId`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_templates` ADD CONSTRAINT `email_templates_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exploreVideos` ADD CONSTRAINT `exploreVideos_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exploreVideos` ADD CONSTRAINT `exploreVideos_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exploreVideos` ADD CONSTRAINT `exploreVideos_developmentId_developments_id_fk` FOREIGN KEY (`developmentId`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_invitedBy_users_id_fk` FOREIGN KEY (`invitedBy`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_acceptedBy_users_id_fk` FOREIGN KEY (`acceptedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invites` ADD CONSTRAINT `invites_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invites` ADD CONSTRAINT `invites_usedBy_users_id_fk` FOREIGN KEY (`usedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_subscriptionId_agency_subscriptions_id_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `agency_subscriptions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lead_activities` ADD CONSTRAINT `lead_activities_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lead_activities` ADD CONSTRAINT `lead_activities_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_developmentId_developments_id_fk` FOREIGN KEY (`developmentId`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `offers` ADD CONSTRAINT `offers_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `offers` ADD CONSTRAINT `offers_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `offers` ADD CONSTRAINT `offers_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platform_settings` ADD CONSTRAINT `platform_settings_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_history` ADD CONSTRAINT `price_history_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_predictions` ADD CONSTRAINT `price_predictions_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_predictions` ADD CONSTRAINT `price_predictions_suburbId_suburbs_id_fk` FOREIGN KEY (`suburbId`) REFERENCES `suburbs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_predictions` ADD CONSTRAINT `price_predictions_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `price_predictions` ADD CONSTRAINT `price_predictions_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_suburbId_suburbs_id_fk` FOREIGN KEY (`suburbId`) REFERENCES `suburbs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_developmentId_developments_id_fk` FOREIGN KEY (`developmentId`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `propertyImages` ADD CONSTRAINT `propertyImages_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_similarity_index` ADD CONSTRAINT `property_similarity_index_propertyId1_properties_id_fk` FOREIGN KEY (`propertyId1`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_similarity_index` ADD CONSTRAINT `property_similarity_index_propertyId2_properties_id_fk` FOREIGN KEY (`propertyId2`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prospect_favorites` ADD CONSTRAINT `prospect_favorites_prospectId_prospects_id_fk` FOREIGN KEY (`prospectId`) REFERENCES `prospects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prospect_favorites` ADD CONSTRAINT `prospect_favorites_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recently_viewed` ADD CONSTRAINT `recently_viewed_prospectId_prospects_id_fk` FOREIGN KEY (`prospectId`) REFERENCES `prospects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recently_viewed` ADD CONSTRAINT `recently_viewed_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scheduled_viewings` ADD CONSTRAINT `scheduled_viewings_prospectId_prospects_id_fk` FOREIGN KEY (`prospectId`) REFERENCES `prospects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scheduled_viewings` ADD CONSTRAINT `scheduled_viewings_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scheduled_viewings` ADD CONSTRAINT `scheduled_viewings_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `showings` ADD CONSTRAINT `showings_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `showings` ADD CONSTRAINT `showings_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `showings` ADD CONSTRAINT `showings_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suburb_price_analytics` ADD CONSTRAINT `suburb_price_analytics_suburbId_suburbs_id_fk` FOREIGN KEY (`suburbId`) REFERENCES `suburbs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suburb_price_analytics` ADD CONSTRAINT `suburb_price_analytics_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suburb_price_analytics` ADD CONSTRAINT `suburb_price_analytics_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suburbs` ADD CONSTRAINT `suburbs_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_behavior_events` ADD CONSTRAINT `user_behavior_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_behavior_events` ADD CONSTRAINT `user_behavior_events_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_behavior_events` ADD CONSTRAINT `user_behavior_events_suburbId_suburbs_id_fk` FOREIGN KEY (`suburbId`) REFERENCES `suburbs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_behavior_events` ADD CONSTRAINT `user_behavior_events_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_behavior_events` ADD CONSTRAINT `user_behavior_events_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_recommendations` ADD CONSTRAINT `user_recommendations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videoLikes` ADD CONSTRAINT `videoLikes_videoId_videos_id_fk` FOREIGN KEY (`videoId`) REFERENCES `videos`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videoLikes` ADD CONSTRAINT `videoLikes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_developmentId_developments_id_fk` FOREIGN KEY (`developmentId`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;