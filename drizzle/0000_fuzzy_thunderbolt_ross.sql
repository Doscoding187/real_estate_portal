CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`developer_id` int NOT NULL,
	`activity_type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`metadata` json,
	`related_entity_type` enum('development','unit','lead','campaign','team_member'),
	`related_entity_id` int,
	`user_id` int,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
	`isVerified` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agencies_id` PRIMARY KEY(`id`)
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
	`isEnabled` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
	`cancelAtPeriodEnd` int NOT NULL,
	`canceledAt` timestamp,
	`endedAt` timestamp,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agency_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_coverage_areas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`areaName` varchar(255) NOT NULL,
	`areaType` enum('province','city','suburb','custom_polygon') NOT NULL,
	`areaData` text NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
	`rating` int,
	`reviewCount` int,
	`totalSales` int,
	`isVerified` int NOT NULL,
	`isFeatured` int NOT NULL,
	`status` enum('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
	`rejectionReason` text,
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `amenities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`location_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(100) NOT NULL,
	`rating` decimal(3,1),
	`latitude` varchar(50),
	`longitude` varchar(50),
	`distance` decimal(10,2),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `amenities_id` PRIMARY KEY(`id`)
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
	`totalProperties` int,
	`activeListings` int,
	`avgPrice` int,
	`medianPrice` int,
	`minPrice` int,
	`maxPrice` int,
	`pricePerSqmAvg` int,
	`totalViews` int,
	`totalSaves` int,
	`totalContacts` int,
	`uniqueVisitors` int,
	`newListings` int,
	`soldProperties` int,
	`rentedProperties` int,
	`avgDaysOnMarket` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `boost_campaigns` (
	`id` varchar(36) NOT NULL,
	`partner_id` varchar(36) NOT NULL,
	`content_id` varchar(36) NOT NULL,
	`topic_id` varchar(36) NOT NULL,
	`budget` decimal(10,2) NOT NULL,
	`spent` decimal(10,2) DEFAULT '0',
	`status` enum('draft','active','paused','completed','depleted') DEFAULT 'draft',
	`start_date` timestamp NOT NULL,
	`end_date` timestamp,
	`impressions` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`cost_per_impression` decimal(6,4) DEFAULT '0.10',
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `boost_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `boost_credits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`total_credits` int DEFAULT 0,
	`used_credits` int DEFAULT 0,
	`reset_at` timestamp,
	`expires_at` timestamp,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `boost_credits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bundle_partners` (
	`bundle_id` varchar(36) NOT NULL,
	`partner_id` varchar(36) NOT NULL,
	`category` varchar(100) NOT NULL,
	`display_order` int DEFAULT 0,
	`inclusion_fee` decimal(10,2),
	`performance_score` decimal(5,2) DEFAULT '50.00'
);
--> statement-breakpoint
CREATE TABLE `cities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provinceId` int NOT NULL,
	`name` varchar(150) NOT NULL,
	`slug` varchar(200),
	`place_id` varchar(255),
	`seo_title` varchar(255),
	`seo_description` text,
	`latitude` varchar(20),
	`longitude` varchar(21),
	`isMetro` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
	`currentPriceCount` int,
	`sixMonthGrowthPercent` int,
	`threeMonthGrowthPercent` int,
	`oneMonthGrowthPercent` int,
	`totalProperties` int,
	`activeListings` int,
	`averageDaysOnMarket` int,
	`luxurySegmentPercent` int,
	`midRangePercent` int,
	`affordablePercent` int,
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_approval_queue` (
	`id` varchar(36) NOT NULL,
	`content_id` varchar(36) NOT NULL,
	`partner_id` varchar(36) NOT NULL,
	`status` enum('pending','approved','rejected','revision_requested') DEFAULT 'pending',
	`submitted_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`reviewed_at` timestamp,
	`reviewer_id` varchar(36),
	`feedback` text,
	`auto_approval_eligible` boolean DEFAULT false,
	CONSTRAINT `content_approval_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_quality_scores` (
	`content_id` varchar(36) NOT NULL,
	`overall_score` decimal(5,2) DEFAULT '50.00',
	`metadata_score` decimal(5,2) DEFAULT '0',
	`engagement_score` decimal(5,2) DEFAULT '0',
	`production_score` decimal(5,2) DEFAULT '0',
	`negative_signals` int DEFAULT 0,
	`last_calculated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `content_quality_scores_content_id` PRIMARY KEY(`content_id`)
);
--> statement-breakpoint
CREATE TABLE `content_topics` (
	`content_id` varchar(36) NOT NULL,
	`topic_id` varchar(36) NOT NULL,
	`relevance_score` decimal(5,2) DEFAULT '1.00',
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP
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
	`redemptionsUsed` int NOT NULL,
	`validFrom` timestamp,
	`validUntil` timestamp,
	`isActive` int NOT NULL DEFAULT 1,
	`appliesToPlans` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `developer_brand_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brand_name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`logo_url` text,
	`about` text,
	`founded_year` int,
	`head_office_location` varchar(255),
	`operating_provinces` json,
	`property_focus` json,
	`website_url` varchar(500),
	`public_contact_email` varchar(320),
	`brand_tier` enum('national','regional','boutique') DEFAULT 'regional',
	`source_attribution` varchar(255),
	`profile_type` enum('industry_reference','verified_partner') DEFAULT 'industry_reference',
	`identity_type` enum('developer','marketing_agency','hybrid') NOT NULL DEFAULT 'developer',
	`is_subscriber` tinyint NOT NULL DEFAULT 0,
	`is_claimable` tinyint NOT NULL DEFAULT 1,
	`is_visible` tinyint NOT NULL DEFAULT 1,
	`is_contact_verified` tinyint NOT NULL DEFAULT 0,
	`linked_developer_account_id` int,
	`owner_type` enum('platform','developer') NOT NULL DEFAULT 'platform',
	`claim_requested_at` timestamp,
	`total_leads_received` int NOT NULL DEFAULT 0,
	`last_lead_date` timestamp,
	`unclaimed_lead_count` int NOT NULL DEFAULT 0,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `developer_brand_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `developer_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`developer_id` int NOT NULL,
	`user_id` int,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`type` varchar(50) NOT NULL,
	`severity` enum('info','warning','error','success') NOT NULL DEFAULT 'info',
	`read` tinyint NOT NULL DEFAULT 0,
	`action_url` varchar(500),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `developer_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `developer_subscription_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscription_id` int NOT NULL,
	`max_developments` int NOT NULL DEFAULT 1,
	`max_leads_per_month` int NOT NULL DEFAULT 50,
	`max_team_members` int NOT NULL DEFAULT 1,
	`analytics_retention_days` int NOT NULL DEFAULT 30,
	`crm_integration_enabled` tinyint NOT NULL DEFAULT 0,
	`advanced_analytics_enabled` tinyint NOT NULL DEFAULT 0,
	`bond_integration_enabled` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `developer_subscription_limits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `developer_subscription_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscription_id` int NOT NULL,
	`developments_count` int NOT NULL DEFAULT 0,
	`leads_this_month` int NOT NULL DEFAULT 0,
	`team_members_count` int NOT NULL DEFAULT 0,
	`last_reset_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `developer_subscription_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `developer_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`developer_id` int NOT NULL,
	`plan_id` int,
	`tier` enum('free_trial','basic','premium') NOT NULL DEFAULT 'free_trial',
	`status` enum('active','cancelled','expired') NOT NULL DEFAULT 'active',
	`trial_ends_at` timestamp,
	`current_period_start` timestamp,
	`current_period_end` timestamp,
	`stripe_subscription_id` varchar(100),
	`stripe_customer_id` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `developer_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `developers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255),
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
	`totalProjects` int,
	`rating` int,
	`reviewCount` int,
	`isVerified` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`userId` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`rejectionReason` text,
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectedBy` int,
	`rejectedAt` timestamp,
	`kpiCache` json,
	`lastKpiCalculation` timestamp,
	`completedProjects` int DEFAULT 0,
	`currentProjects` int DEFAULT 0,
	`upcomingProjects` int DEFAULT 0,
	`trackRecord` text,
	`pastProjects` int,
	`specializations` json,
	`is_trusted` boolean NOT NULL DEFAULT false,
	CONSTRAINT `developers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `development_approval_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`development_id` int NOT NULL,
	`submitted_by` int NOT NULL,
	`status` enum('pending','reviewing','approved','rejected') NOT NULL DEFAULT 'pending',
	`submission_type` enum('initial','update') NOT NULL DEFAULT 'initial',
	`review_notes` text,
	`rejection_reason` text,
	`compliance_checks` json,
	`submitted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`reviewed_at` timestamp,
	`reviewed_by` int,
	CONSTRAINT `development_approval_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `development_documents` (
	`id` varchar(36) NOT NULL,
	`development_id` int NOT NULL,
	`unit_type_id` varchar(36),
	`name` varchar(255) NOT NULL,
	`type` enum('brochure','site-plan','pricing-sheet','estate-rules','engineering-pack','other') NOT NULL,
	`url` varchar(500) NOT NULL,
	`file_size` int,
	`mime_type` varchar(100),
	`uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `development_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `development_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`developerId` int,
	`developer_brand_profile_id` int,
	`draftName` varchar(255),
	`draftData` json NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`currentStep` int NOT NULL DEFAULT 0,
	`lastModified` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `development_drafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `development_lead_routes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`development_id` int NOT NULL,
	`source_type` enum('developer_profile','agency_profile','development_page','campaign') NOT NULL,
	`source_brand_profile_id` int,
	`receiver_brand_profile_id` int NOT NULL,
	`fallback_brand_profile_id` int,
	`priority` int NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `development_lead_routes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `development_partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`development_id` int NOT NULL,
	`brand_profile_id` int NOT NULL,
	`partner_type` enum('co_developer','joint_venture','investor','builder','marketing_agency','selling_agency') NOT NULL DEFAULT 'co_developer',
	`permissions` json,
	`visibility_scope` enum('profile_public','internal_only','marketing_only') NOT NULL DEFAULT 'profile_public',
	`display_order` int NOT NULL DEFAULT 0,
	`is_primary` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `development_partners_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_dev_partner_unique` UNIQUE(`development_id`,`brand_profile_id`)
);
--> statement-breakpoint
CREATE TABLE `development_phases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`development_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`phase_number` int NOT NULL,
	`description` text,
	`status` enum('planning','pre_launch','selling','sold_out','completed') NOT NULL DEFAULT 'planning',
	`total_units` int NOT NULL DEFAULT 0,
	`available_units` int NOT NULL DEFAULT 0,
	`price_from` int,
	`price_to` int,
	`launch_date` timestamp,
	`completion_date` timestamp,
	`spec_type` enum('affordable','gap','luxury','custom') DEFAULT 'affordable',
	`custom_spec_type` varchar(100),
	`finishing_differences` json,
	`phase_highlights` json,
	`latitude` varchar(50),
	`longitude` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `development_phases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `development_units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`development_id` int NOT NULL,
	`phase_id` int,
	`unit_number` varchar(100) NOT NULL,
	`unit_type` enum('studio','1bed','2bed','3bed','4bed+','penthouse','townhouse','house') NOT NULL,
	`bedrooms` int,
	`bathrooms` decimal(3,1),
	`size` decimal(10,2),
	`price` decimal(12,2) NOT NULL,
	`floor_plan` text,
	`floor` int,
	`facing` varchar(50),
	`features` text,
	`status` enum('available','reserved','sold') NOT NULL DEFAULT 'available',
	`reserved_at` timestamp,
	`reserved_by` int,
	`sold_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `development_units_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `developments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`developer_id` int,
	`developer_brand_profile_id` int,
	`marketing_brand_profile_id` int,
	`marketing_role` enum('exclusive','joint','open') DEFAULT 'exclusive',
	`name` varchar(255) NOT NULL,
	`tagline` varchar(255),
	`subtitle` varchar(255),
	`marketing_name` varchar(255),
	`meta_title` varchar(255),
	`meta_description` text,
	`slug` varchar(255),
	`description` text,
	`rating` decimal(3,2),
	`developmentType` enum('residential','commercial','mixed_use','estate','complex') NOT NULL,
	`status` enum('launching-soon','selling','sold-out') NOT NULL DEFAULT 'launching-soon',
	`legacy_status` enum('now-selling','launching-soon','under-construction','ready-to-move','sold-out','phase-completed','new-phase-launching','planning','completed','coming_soon','pre_launch','ready'),
	`construction_phase` enum('planning','under_construction','completed','phase_completed'),
	`address` text,
	`city` varchar(100) NOT NULL,
	`province` varchar(100) NOT NULL,
	`suburb` varchar(100),
	`location_id` int,
	`postal_code` varchar(20),
	`latitude` varchar(50),
	`longitude` varchar(50),
	`gps_accuracy` enum('accurate','approximate') DEFAULT 'approximate',
	`totalUnits` int,
	`availableUnits` int,
	`priceFrom` int,
	`priceTo` int,
	`amenities` json,
	`highlights` json,
	`features` json,
	`estateSpecs` json,
	`images` text,
	`videos` text,
	`floorPlans` text,
	`brochures` text,
	`completionDate` timestamp,
	`isFeatured` int NOT NULL,
	`isPublished` int NOT NULL DEFAULT 0,
	`publishedAt` timestamp,
	`approval_status` enum('draft','pending','approved','rejected') DEFAULT 'draft',
	`readiness_score` int NOT NULL DEFAULT 0,
	`rejection_reasons` json,
	`rejection_note` text,
	`showHouseAddress` int NOT NULL DEFAULT 1,
	`views` int NOT NULL,
	`inquiries_count` int DEFAULT 0,
	`demand_score` int DEFAULT 0,
	`is_hot_selling` int DEFAULT 0,
	`nature` enum('new','phase','extension','redevelopment') DEFAULT 'new',
	`total_development_area` int,
	`property_types` json,
	`custom_classification` varchar(255),
	`monthly_levy_from` decimal(10,2),
	`monthly_levy_to` decimal(10,2),
	`rates_from` decimal(10,2),
	`rates_to` decimal(10,2),
	`transfer_costs_included` tinyint DEFAULT 0,
	`is_high_demand` int DEFAULT 0,
	`dev_owner_type` enum('platform','developer') DEFAULT 'developer',
	`is_showcase` tinyint DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `developments_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_slug` UNIQUE(`slug`)
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_boost_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creator_id` int NOT NULL,
	`content_id` int NOT NULL,
	`campaign_name` varchar(255),
	`budget` decimal(10,2),
	`spent` decimal(10,2) DEFAULT '0',
	`duration_days` int,
	`start_date` timestamp DEFAULT CURRENT_TIMESTAMP,
	`end_date` timestamp,
	`target_audience` json,
	`status` varchar(50) DEFAULT 'active',
	`impressions` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`conversions` int DEFAULT 0,
	`cost_per_click` decimal(10,2),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `explore_boost_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`icon` varchar(50),
	`image` text,
	`type` enum('lifestyle','property','investment','demographic') NOT NULL DEFAULT 'lifestyle',
	`displayOrder` int DEFAULT 0,
	`isActive` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `explore_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exploreComments` (
	`id` varchar(191) NOT NULL,
	`videoId` varchar(191) NOT NULL,
	`userId` int NOT NULL,
	`comment` text NOT NULL,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `explore_content` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content_type` varchar(50) NOT NULL,
	`reference_id` int NOT NULL,
	`creator_id` int,
	`creator_type` enum('user','agent','developer','agency') NOT NULL DEFAULT 'user',
	`agency_id` int,
	`partner_id` varchar(36),
	`content_category` enum('primary','secondary','tertiary') DEFAULT 'primary',
	`badge_type` varchar(50),
	`is_launch_content` boolean DEFAULT false,
	`title` varchar(255),
	`description` text,
	`thumbnail_url` varchar(500),
	`video_url` varchar(500),
	`metadata` json,
	`tags` json,
	`lifestyle_categories` json,
	`location_lat` decimal(10,8),
	`location_lng` decimal(11,8),
	`price_min` int,
	`price_max` int,
	`view_count` int DEFAULT 0,
	`engagement_score` decimal(5,2) DEFAULT '0',
	`is_active` tinyint DEFAULT 1,
	`is_featured` tinyint DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `explore_content_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_creator_follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`creator_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `explore_creator_follows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_discovery_videos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`explore_content_id` int NOT NULL,
	`property_id` int,
	`development_id` int,
	`video_url` varchar(500) NOT NULL,
	`thumbnail_url` varchar(500) NOT NULL,
	`duration` int NOT NULL,
	`transcoded_urls` json,
	`music_track` varchar(255),
	`has_subtitles` tinyint DEFAULT 0,
	`subtitle_url` varchar(500),
	`total_views` int DEFAULT 0,
	`total_watch_time` int DEFAULT 0,
	`completion_rate` decimal(5,2) DEFAULT '0',
	`save_count` int DEFAULT 0,
	`share_count` int DEFAULT 0,
	`click_through_count` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `explore_discovery_videos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_engagements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`content_id` int NOT NULL,
	`engagement_type` varchar(50) NOT NULL,
	`watch_time` int,
	`completed` tinyint DEFAULT 0,
	`session_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `explore_engagements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_feed_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`session_start` timestamp DEFAULT CURRENT_TIMESTAMP,
	`session_end` timestamp,
	`total_duration` int,
	`videos_viewed` int DEFAULT 0,
	`videos_completed` int DEFAULT 0,
	`properties_saved` int DEFAULT 0,
	`click_throughs` int DEFAULT 0,
	`device_type` varchar(50),
	`session_data` json,
	CONSTRAINT `explore_feed_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exploreFollows` (
	`id` varchar(191) NOT NULL,
	`followerId` int NOT NULL,
	`followingId` int NOT NULL,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `explore_highlight_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tag_key` varchar(50) NOT NULL,
	`label` varchar(100) NOT NULL,
	`icon` varchar(50),
	`color` varchar(7),
	`category` varchar(50),
	`display_order` int NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `explore_highlight_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_interactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`short_id` int NOT NULL,
	`user_id` int,
	`session_id` varchar(255) NOT NULL,
	`interaction_type` enum('impression','view','skip','save','share','contact','whatsapp','book_viewing') NOT NULL,
	`duration` int,
	`timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`feed_type` enum('recommended','area','category','agent','developer') NOT NULL,
	`feed_context` json,
	`device_type` enum('mobile','tablet','desktop') NOT NULL,
	`user_agent` text,
	`ip_address` varchar(45),
	`metadata` json,
	CONSTRAINT `explore_interactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exploreLikes` (
	`id` varchar(191) NOT NULL,
	`videoId` varchar(191) NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `explore_neighbourhood_follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`neighbourhood_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `explore_neighbourhood_follows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_neighbourhood_stories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`suburb_id` int,
	`title` varchar(255) NOT NULL,
	`cover_image` text,
	`video_url` text,
	`story_data` json,
	`category` varchar(100),
	`is_published` int DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `explore_neighbourhood_stories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_neighbourhoods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`city` varchar(100),
	`province` varchar(100),
	`hero_banner_url` varchar(500),
	`description` text,
	`location_lat` decimal(10,8),
	`location_lng` decimal(11,8),
	`boundary_polygon` json,
	`amenities` json,
	`safety_rating` decimal(3,2),
	`walkability_score` int,
	`avg_property_price` int,
	`price_trend` json,
	`highlights` json,
	`follower_count` int DEFAULT 0,
	`property_count` int DEFAULT 0,
	`video_count` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `explore_neighbourhoods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_partners` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`tier_id` int NOT NULL,
	`company_name` varchar(255) NOT NULL,
	`description` text,
	`logo_url` varchar(500),
	`verification_status` enum('pending','verified','rejected') DEFAULT 'pending',
	`trust_score` decimal(5,2) DEFAULT '50.00',
	`service_locations` json,
	`approved_content_count` int DEFAULT 0,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `explore_partners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_saved_properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`content_id` int NOT NULL,
	`collection_name` varchar(255) DEFAULT 'Default',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `explore_saved_properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_shorts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listing_id` int,
	`development_id` int,
	`agent_id` int,
	`developer_id` int,
	`agency_id` int,
	`partner_id` varchar(36),
	`content_type` enum('property_tour','development_promo','agent_intro','neighbourhood_tour','market_insight','lifestyle','education') NOT NULL DEFAULT 'property_tour',
	`topic_id` int,
	`category_id` int,
	`content_category` enum('primary','secondary','tertiary') DEFAULT 'primary',
	`badge_type` varchar(50),
	`is_launch_content` boolean DEFAULT false,
	`title` varchar(255) NOT NULL,
	`caption` text,
	`primary_media_id` int NOT NULL,
	`media_ids` json NOT NULL,
	`highlights` json,
	`performance_score` decimal(5,2) NOT NULL DEFAULT '0',
	`boost_priority` int NOT NULL DEFAULT 0,
	`view_count` int NOT NULL DEFAULT 0,
	`unique_view_count` int NOT NULL DEFAULT 0,
	`save_count` int NOT NULL DEFAULT 0,
	`share_count` int NOT NULL DEFAULT 0,
	`skip_count` int NOT NULL DEFAULT 0,
	`average_watch_time` int NOT NULL DEFAULT 0,
	`view_through_rate` decimal(5,2) NOT NULL DEFAULT '0',
	`save_rate` decimal(5,2) NOT NULL DEFAULT '0',
	`share_rate` decimal(5,2) NOT NULL DEFAULT '0',
	`skip_rate` decimal(5,2) NOT NULL DEFAULT '0',
	`is_published` tinyint NOT NULL DEFAULT 1,
	`is_featured` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`published_at` timestamp,
	CONSTRAINT `explore_shorts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_sponsorships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`target_type` enum('listing','development','agent','video','neighbourhood') NOT NULL,
	`target_id` int NOT NULL,
	`tier` enum('basic','premium','exclusive') NOT NULL DEFAULT 'basic',
	`start_date` timestamp NOT NULL,
	`end_date` timestamp NOT NULL,
	`impressions_target` int,
	`impressions_delivered` int DEFAULT 0,
	`clicks_delivered` int DEFAULT 0,
	`status` enum('active','scheduled','completed','paused') NOT NULL DEFAULT 'scheduled',
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `explore_sponsorships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`coverImage` text,
	`type` enum('curated','algorithmic','seasonal','sponsored') NOT NULL DEFAULT 'curated',
	`isActive` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `explore_topics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`preferred_locations` json,
	`budget_min` int,
	`budget_max` int,
	`property_types` json,
	`interaction_history` json,
	`saved_properties` json,
	`inferred_preferences` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `explore_user_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_user_preferences_new` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`price_range_min` int,
	`price_range_max` int,
	`preferred_locations` json,
	`preferred_property_types` json,
	`preferred_lifestyle_categories` json,
	`followed_neighbourhoods` json,
	`followed_creators` json,
	`engagement_history` json,
	`last_active` timestamp DEFAULT CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `explore_user_preferences_new_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exploreVideoViews` (
	`id` varchar(191) NOT NULL,
	`videoId` varchar(191) NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP
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
	`views` int NOT NULL,
	`likes` int NOT NULL,
	`shares` int NOT NULL,
	`isPublished` int NOT NULL DEFAULT 1,
	`isFeatured` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exploreVideos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`propertyId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `founding_partners` (
	`partner_id` varchar(36) NOT NULL,
	`enrollment_date` timestamp NOT NULL,
	`benefits_end_date` timestamp NOT NULL,
	`pre_launch_content_delivered` int DEFAULT 0,
	`weekly_content_delivered` json DEFAULT ('[]'),
	`warning_count` int DEFAULT 0,
	`status` enum('active','warning','revoked') DEFAULT 'active',
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `founding_partners_partner_id` PRIMARY KEY(`partner_id`)
);
--> statement-breakpoint
CREATE TABLE `hero_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`location_type` enum('province','city','suburb') NOT NULL,
	`target_slug` varchar(255) NOT NULL,
	`image_url` varchar(1024) NOT NULL,
	`landing_page_url` varchar(1024),
	`alt_text` varchar(255),
	`start_date` timestamp,
	`end_date` timestamp,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hero_campaigns_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`email` varchar(255) NOT NULL,
	`token` varchar(255) NOT NULL,
	`role` varchar(30) DEFAULT 'agent',
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`used` int NOT NULL,
	`usedAt` timestamp,
	`usedBy` int,
	CONSTRAINT `invites_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `launch_content_quotas` (
	`id` varchar(36) NOT NULL,
	`content_type` varchar(50) NOT NULL,
	`required_count` int NOT NULL,
	`current_count` int DEFAULT 0,
	`last_updated` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `launch_content_quotas_id` PRIMARY KEY(`id`),
	CONSTRAINT `launch_content_quotas_content_type_unique` UNIQUE(`content_type`)
);
--> statement-breakpoint
CREATE TABLE `launch_metrics` (
	`id` varchar(36) NOT NULL,
	`metric_date` timestamp NOT NULL,
	`topic_engagement_rate` decimal(5,2),
	`partner_content_watch_rate` decimal(5,2),
	`save_share_rate` decimal(5,2),
	`weekly_visits_per_user` decimal(5,2),
	`algorithm_confidence_score` decimal(5,2),
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `launch_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `launch_phases` (
	`id` varchar(36) NOT NULL,
	`phase` enum('pre_launch','launch_period','ramp_up','ecosystem_maturity') NOT NULL,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp,
	`primary_content_ratio` decimal(3,2) DEFAULT '0.70',
	`algorithm_weight` decimal(3,2) DEFAULT '0.00',
	`editorial_weight` decimal(3,2) DEFAULT '1.00',
	`is_active` boolean DEFAULT false,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `launch_phases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lead_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`agentId` int,
	`activityType` enum('call','email','meeting','note','status_change','viewing_scheduled','offer_sent') NOT NULL,
	`description` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `lead_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int,
	`developmentId` int,
	`developer_brand_profile_id` int,
	`agencyId` int,
	`agentId` int,
	`name` varchar(200) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`message` text,
	`leadType` enum('inquiry','viewing_request','offer','callback') NOT NULL DEFAULT 'inquiry',
	`status` enum('new','contacted','qualified','converted','closed','viewing_scheduled','offer_sent','lost') NOT NULL DEFAULT 'new',
	`source` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`nextFollowUp` timestamp,
	`lastContactedAt` timestamp,
	`notes` text,
	`affordability_data` json,
	`qualification_status` enum('qualified','partially_qualified','unqualified','pending') DEFAULT 'pending',
	`qualification_score` int DEFAULT 0,
	`lead_source` varchar(100),
	`referrer_url` text,
	`utm_source` varchar(100),
	`utm_medium` varchar(100),
	`utm_campaign` varchar(100),
	`funnel_stage` enum('interest','affordability','qualification','viewing','offer','bond','sale') DEFAULT 'interest',
	`assigned_to` int,
	`assigned_at` timestamp,
	`converted_at` timestamp,
	`lost_reason` text,
	`brand_lead_status` enum('captured','delivered_unsubscribed','delivered_subscriber','claimed') DEFAULT 'captured',
	`lead_delivery_method` enum('email','crm_export','manual','none') DEFAULT 'email',
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listing_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`totalViews` int NOT NULL DEFAULT 0,
	`uniqueVisitors` int NOT NULL DEFAULT 0,
	`viewsByDay` json,
	`totalLeads` int NOT NULL DEFAULT 0,
	`contactFormLeads` int NOT NULL DEFAULT 0,
	`whatsappClicks` int NOT NULL DEFAULT 0,
	`phoneReveals` int NOT NULL DEFAULT 0,
	`bookingViewingRequests` int NOT NULL DEFAULT 0,
	`totalFavorites` int NOT NULL DEFAULT 0,
	`totalShares` int NOT NULL DEFAULT 0,
	`averageTimeOnPage` int,
	`trafficSources` json,
	`conversionRate` decimal(5,2),
	`leadConversionRate` decimal(5,2),
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `listing_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listing_approval_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`submittedBy` int NOT NULL,
	`submittedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`status` enum('pending','reviewing','approved','rejected') NOT NULL DEFAULT 'pending',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`reviewNotes` text,
	`rejectionReason` text,
	`complianceChecks` json,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `listing_approval_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listing_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`message` text,
	`leadType` enum('contact_form','whatsapp_click','phone_reveal','book_viewing','make_offer','request_info') NOT NULL,
	`source` varchar(100),
	`referrer` text,
	`utmSource` varchar(100),
	`utmMedium` varchar(100),
	`utmCampaign` varchar(100),
	`assignedTo` int,
	`assignedAt` timestamp,
	`status` enum('new','contacted','qualified','viewing_scheduled','offer_made','converted','lost') NOT NULL DEFAULT 'new',
	`crmSynced` int DEFAULT 0,
	`crmSyncedAt` timestamp,
	`crmId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `listing_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listing_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`mediaType` enum('image','video','floorplan','pdf') NOT NULL,
	`originalUrl` text NOT NULL,
	`originalFileName` varchar(255),
	`originalFileSize` int,
	`processedUrl` text,
	`thumbnailUrl` text,
	`previewUrl` text,
	`width` int,
	`height` int,
	`duration` int,
	`mimeType` varchar(100),
	`orientation` enum('vertical','horizontal','square'),
	`isVertical` int DEFAULT 0,
	`displayOrder` int NOT NULL DEFAULT 0,
	`isPrimary` int NOT NULL DEFAULT 0,
	`processingStatus` enum('pending','processing','completed','failed') DEFAULT 'pending',
	`processingError` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`uploadedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`processedAt` timestamp,
	CONSTRAINT `listing_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listing_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`autoPublishForVerifiedAccounts` int NOT NULL DEFAULT 0,
	`maxImagesPerListing` int NOT NULL DEFAULT 30,
	`maxVideosPerListing` int NOT NULL DEFAULT 5,
	`maxFloorplansPerListing` int NOT NULL DEFAULT 5,
	`maxPdfsPerListing` int NOT NULL DEFAULT 3,
	`maxImageSizeMb` int NOT NULL DEFAULT 5,
	`maxVideoSizeMb` int NOT NULL DEFAULT 50,
	`maxVideoDurationSeconds` int NOT NULL DEFAULT 180,
	`videoCompressionEnabled` int NOT NULL DEFAULT 1,
	`videoThumbnailEnabled` int NOT NULL DEFAULT 1,
	`videoPreviewClipSeconds` int NOT NULL DEFAULT 3,
	`crmWebhookUrl` text,
	`crmEnabled` int NOT NULL DEFAULT 0,
	`newListingNotificationsEnabled` int NOT NULL DEFAULT 1,
	`leadNotificationsEnabled` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int,
	CONSTRAINT `listing_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listing_viewings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`leadId` int,
	`scheduledDate` timestamp NOT NULL,
	`duration` int DEFAULT 30,
	`visitorName` varchar(200) NOT NULL,
	`visitorEmail` varchar(320),
	`visitorPhone` varchar(50),
	`status` enum('requested','confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'requested',
	`agentId` int,
	`agentNotes` text,
	`visitorFeedback` text,
	`visitorRating` int,
	`reminderSent` int DEFAULT 0,
	`confirmationSent` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `listing_viewings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`agentId` int,
	`agencyId` int,
	`action` enum('sell','rent','auction') NOT NULL,
	`propertyType` enum('apartment','house','farm','land','commercial','shared_living') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`askingPrice` decimal(12,2),
	`negotiable` int DEFAULT 0,
	`transferCostEstimate` decimal(12,2),
	`monthlyRent` decimal(12,2),
	`deposit` decimal(12,2),
	`leaseTerms` varchar(100),
	`availableFrom` timestamp,
	`utilitiesIncluded` int DEFAULT 0,
	`startingBid` decimal(12,2),
	`reservePrice` decimal(12,2),
	`auctionDateTime` timestamp,
	`auctionTermsDocumentUrl` text,
	`propertyDetails` json,
	`address` text NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`city` varchar(100) NOT NULL,
	`suburb` varchar(100),
	`province` varchar(100) NOT NULL,
	`postalCode` varchar(20),
	`placeId` varchar(255),
	`mainMediaId` int,
	`mainMediaType` enum('image','video'),
	`status` enum('draft','pending_review','approved','published','rejected','archived','sold','rented') NOT NULL DEFAULT 'draft',
	`approvalStatus` enum('pending','approved','rejected') DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`rejectionReason` text,
	`autoPublished` int DEFAULT 0,
	`slug` varchar(255) NOT NULL,
	`readiness_score` int NOT NULL DEFAULT 0,
	`quality_score` int NOT NULL DEFAULT 0,
	`quality_breakdown` json,
	`rejection_reasons` json,
	`rejection_note` text,
	`metaTitle` varchar(255),
	`metaDescription` text,
	`canonicalUrl` text,
	`searchTags` text,
	`featured` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`publishedAt` timestamp,
	`archivedAt` timestamp,
	CONSTRAINT `listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `location_analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_type` varchar(50) NOT NULL,
	`location_id` int,
	`development_id` int,
	`listing_id` int,
	`target_id` int,
	`metadata` json,
	`session_id` varchar(100),
	`user_id` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `location_analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `location_search_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`searchQuery` varchar(255) NOT NULL,
	`searchType` enum('province','city','suburb','address','all') NOT NULL,
	`resultsJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `location_search_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `location_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`location_id` int NOT NULL,
	`user_id` int,
	`searched_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `location_searches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `location_targeting` (
	`id` int AUTO_INCREMENT NOT NULL,
	`target_type` enum('hero_ad','featured_developer','recommended_agent') NOT NULL,
	`target_id` int NOT NULL,
	`location_type` enum('province','city','suburb') NOT NULL,
	`location_id` int NOT NULL,
	`ranking` int DEFAULT 0,
	`start_date` timestamp,
	`end_date` timestamp,
	`status` enum('active','scheduled','expired','paused') NOT NULL DEFAULT 'scheduled',
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `location_targeting_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`type` enum('province','city','suburb','neighborhood') NOT NULL,
	`parentId` int,
	`place_id` varchar(255),
	`description` text,
	`latitude` varchar(50),
	`longitude` varchar(50),
	`viewport_ne_lat` decimal(10,8),
	`viewport_ne_lng` decimal(11,8),
	`viewport_sw_lat` decimal(10,8),
	`viewport_sw_lng` decimal(11,8),
	`seo_title` varchar(255),
	`seo_description` text,
	`hero_image` varchar(500),
	`propertyCount` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `market_insights_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cacheKey` varchar(255) NOT NULL,
	`cacheData` text NOT NULL,
	`cacheType` enum('suburb_heatmap','city_trends','popular_areas','price_predictions','user_recommendations') NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `market_insights_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_bundles` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`target_audience` varchar(100),
	`is_active` boolean DEFAULT true,
	`display_order` int DEFAULT 0,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_bundles_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketplace_bundles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('lead_assigned','offer_received','showing_scheduled','system_alert') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`data` text,
	`isRead` int NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `offers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_leads` (
	`id` varchar(36) NOT NULL,
	`partner_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`content_id` varchar(36),
	`type` enum('quote_request','consultation','eligibility_check') NOT NULL,
	`status` enum('new','contacted','converted','disputed','refunded') DEFAULT 'new',
	`price` decimal(10,2) NOT NULL,
	`contact_info` json NOT NULL,
	`intent_details` text,
	`dispute_reason` text,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partner_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_subscriptions` (
	`id` varchar(36) NOT NULL,
	`partner_id` varchar(36) NOT NULL,
	`tier` enum('free','basic','premium','featured') NOT NULL,
	`price_monthly` decimal(10,2) NOT NULL,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp,
	`status` enum('active','cancelled','expired') DEFAULT 'active',
	`features` json NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `partner_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_tiers` (
	`id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`allowed_content_types` json NOT NULL,
	`allowed_ctas` json NOT NULL,
	`requires_credentials` boolean DEFAULT false,
	`max_monthly_content` int DEFAULT 10,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('mortgage_broker','lawyer','photographer','inspector','mover','other') NOT NULL DEFAULT 'other',
	`description` text,
	`contact_person` varchar(255),
	`email` varchar(320),
	`phone` varchar(50),
	`website` varchar(255),
	`logo` text,
	`status` enum('active','inactive','pending') NOT NULL DEFAULT 'active',
	`rating` int,
	`is_verified` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partners_id` PRIMARY KEY(`id`)
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
	`isDefault` int NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_methods_id` PRIMARY KEY(`id`)
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
	`isPopular` int NOT NULL,
	`sortOrder` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_inquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`userType` enum('agent','developer','seller','partner','other') NOT NULL,
	`intent` enum('advertise','software','partnership','support') NOT NULL DEFAULT 'advertise',
	`message` text,
	`status` enum('new','contacted','converted','closed') NOT NULL DEFAULT 'new',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `platform_inquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`category` enum('pricing','features','notifications','limits','other') NOT NULL DEFAULT 'other',
	`isPublic` int NOT NULL,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_settings_id` PRIMARY KEY(`id`)
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
	`currentPriceCount` int,
	`oneMonthGrowthPercent` int,
	`threeMonthGrowthPercent` int,
	`sixMonthGrowthPercent` int,
	`oneYearGrowthPercent` int,
	`luxurySegmentPercent` int,
	`midRangePercent` int,
	`affordablePercent` int,
	`avgDaysOnMarket` int,
	`newListingsMonthly` int,
	`soldPropertiesMonthly` int,
	`trendingDirection` enum('up','down','stable') NOT NULL DEFAULT 'stable',
	`trendConfidence` int,
	`totalProperties` int,
	`activeListings` int,
	`userInteractions` int,
	`priceVolatility` int,
	`marketMomentum` int,
	`investmentScore` int,
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
	`recordedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`source` enum('new_listing','price_change','sold','rented','market_update') NOT NULL DEFAULT 'market_update',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
	`confidenceScore` int,
	`modelVersion` varchar(50),
	`modelFeatures` text,
	`trainingDataSize` int,
	`actualPrice` int,
	`predictionError` int,
	`predictionAccuracy` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
	`location_id` int,
	`locationText` text,
	`placeId` varchar(255),
	`amenities` text,
	`yearBuilt` int,
	`status` enum('available','sold','rented','pending','draft','published','archived') NOT NULL DEFAULT 'available',
	`featured` int NOT NULL,
	`views` int NOT NULL,
	`enquiries` int NOT NULL,
	`agentId` int,
	`developmentId` int,
	`developer_brand_profile_id` int,
	`ownerId` int NOT NULL,
	`propertySettings` text,
	`videoUrl` text,
	`virtualTourUrl` text,
	`levies` int,
	`ratesAndTaxes` int,
	`mainImage` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `property_clicks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`userId` int,
	`sessionId` varchar(255),
	`position` int,
	`searchFilters` json,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `property_clicks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `propertyImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`isPrimary` int NOT NULL,
	`displayOrder` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `propertyImages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `property_similarity_index` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId1` int NOT NULL,
	`propertyId2` int NOT NULL,
	`locationSimilarity` int,
	`priceSimilarity` int,
	`typeSimilarity` int,
	`featureSimilarity` int,
	`overallSimilarity` int,
	`similarityReason` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `property_similarity_index_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prospect_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prospectId` int NOT NULL,
	`propertyId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
	`dependents` int,
	`savingsDeposit` int,
	`creditScore` int,
	`hasCreditConsent` int,
	`buyabilityScore` enum('low','medium','high'),
	`affordabilityMin` int,
	`affordabilityMax` int,
	`monthlyPaymentCapacity` int,
	`profileProgress` int,
	`badges` text,
	`lastActivity` timestamp,
	`preferredPropertyType` enum('apartment','house','villa','plot','commercial','townhouse','cluster_home','farm','shared_living'),
	`preferredLocation` varchar(100),
	`maxCommuteTime` int,
	`ipAddress` varchar(45),
	`userAgent` text,
	`referrer` text,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prospects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `provinces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(200),
	`place_id` varchar(255),
	`seo_title` varchar(255),
	`seo_description` text,
	`code` varchar(10) NOT NULL,
	`latitude` varchar(20),
	`longitude` varchar(21),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `provinces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recent_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`location_id` int NOT NULL,
	`searched_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `recent_searches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recently_viewed` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prospectId` int NOT NULL,
	`propertyId` int NOT NULL,
	`viewedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
	`isVerified` int NOT NULL,
	`isPublished` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`criteria` json NOT NULL,
	`filters` json,
	`notificationMethod` varchar(20) DEFAULT 'email',
	`notificationFrequency` enum('never','daily','weekly','instant') DEFAULT 'never',
	`lastNotifiedAt` timestamp,
	`lastNotified` timestamp,
	`isActive` tinyint DEFAULT 1,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_searches_id` PRIMARY KEY(`id`)
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
	`notificationSent` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_viewings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `search_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionId` varchar(255),
	`filters` json NOT NULL,
	`resultCount` int,
	`sortOrder` varchar(50),
	`viewMode` varchar(20),
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `search_analytics_id` PRIMARY KEY(`id`)
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
	`isFeatured` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `showings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spec_variations` (
	`id` varchar(36) NOT NULL,
	`unit_type_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`price` decimal(15,2) NOT NULL,
	`description` text,
	`overrides` json,
	`feature_overrides` json,
	`media` json,
	`display_order` int DEFAULT 0,
	`is_active` tinyint DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spec_variations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`subscription_id` int,
	`event_type` enum('trial_started','trial_expiring_soon','trial_expired','subscription_created','subscription_renewed','subscription_upgraded','subscription_downgraded','subscription_cancelled','payment_succeeded','payment_failed','feature_locked','limit_reached') NOT NULL,
	`event_data` json,
	`metadata` json,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plan_id` varchar(100) NOT NULL,
	`category` enum('agent','agency','developer') NOT NULL,
	`name` varchar(100) NOT NULL,
	`display_name` varchar(150) NOT NULL,
	`description` text,
	`price_zar` int NOT NULL,
	`billing_interval` enum('monthly','yearly') NOT NULL DEFAULT 'monthly',
	`trial_days` int DEFAULT 14,
	`is_trial_plan` tinyint DEFAULT 0,
	`is_free_plan` tinyint DEFAULT 0,
	`priority_level` int DEFAULT 0,
	`sort_order` int DEFAULT 0,
	`is_active` tinyint DEFAULT 1,
	`features` json,
	`limits` json,
	`permissions` json,
	`upgrade_to_plan_id` varchar(100),
	`downgrade_to_plan_id` varchar(100),
	`stripe_price_id` varchar(255),
	`paystack_plan_code` varchar(255),
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`subscription_id` int NOT NULL,
	`period_start` timestamp NOT NULL,
	`period_end` timestamp NOT NULL,
	`listings_created` int DEFAULT 0,
	`projects_created` int DEFAULT 0,
	`agents_added` int DEFAULT 0,
	`boosts_used` int DEFAULT 0,
	`api_calls` int DEFAULT 0,
	`storage_mb` int DEFAULT 0,
	`crm_contacts` int DEFAULT 0,
	`emails_sent` int DEFAULT 0,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_usage_id` PRIMARY KEY(`id`)
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
	`currentPriceCount` int,
	`lastMonthAvgPrice` int,
	`lastMonthMedianPrice` int,
	`lastMonthPriceCount` int,
	`sixMonthGrowthPercent` int,
	`threeMonthGrowthPercent` int,
	`oneMonthGrowthPercent` int,
	`trendingDirection` enum('up','down','stable') NOT NULL DEFAULT 'stable',
	`trendConfidence` int,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suburb_price_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suburb_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`suburb_id` int NOT NULL,
	`user_id` int,
	`rating` int NOT NULL,
	`user_type` enum('resident','tenant','landlord','visitor') NOT NULL DEFAULT 'resident',
	`pros` text,
	`cons` text,
	`comment` text,
	`is_verified` tinyint DEFAULT 0,
	`is_published` tinyint DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suburb_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suburbs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cityId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`slug` varchar(200),
	`place_id` varchar(255),
	`seo_title` varchar(255),
	`seo_description` text,
	`latitude` varchar(20),
	`longitude` varchar(21),
	`postalCode` varchar(10),
	`pros` json,
	`cons` json,
	`ai_generation_date` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suburbs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`icon` varchar(50),
	`display_order` int DEFAULT 0,
	`is_active` boolean DEFAULT true,
	`content_tags` json,
	`property_features` json,
	`partner_categories` json,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `topics_id` PRIMARY KEY(`id`),
	CONSTRAINT `topics_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `unit_types` (
	`id` varchar(36) NOT NULL,
	`development_id` int NOT NULL,
	`label` varchar(255),
	`name` varchar(255) NOT NULL,
	`description` text,
	`ownership_type` enum('full-title','sectional-title','leasehold','life-rights') DEFAULT 'sectional-title',
	`structural_type` enum('apartment','freestanding-house','simplex','duplex','penthouse','plot-and-plan','townhouse','studio') DEFAULT 'apartment',
	`floors` enum('single-storey','double-storey','triplex'),
	`bedrooms` int NOT NULL,
	`bathrooms` decimal(3,1) NOT NULL,
	`parking` enum('none','1','2','carport','garage') DEFAULT 'none',
	`parking_type` varchar(50),
	`parking_bays` int DEFAULT 0,
	`unit_size` int,
	`yard_size` int,
	`size_from` int,
	`size_to` int,
	`price_from` decimal(15,2),
	`price_to` decimal(15,2),
	`base_price_from` decimal(15,2) NOT NULL,
	`base_price_to` decimal(15,2),
	`deposit_required` decimal(15,2),
	`total_units` int NOT NULL DEFAULT 0,
	`available_units` int NOT NULL DEFAULT 0,
	`reserved_units` int DEFAULT 0,
	`completion_date` date,
	`transfer_costs_included` tinyint DEFAULT 0,
	`monthly_levy` int,
	`monthly_levy_from` int,
	`monthly_levy_to` int,
	`rates_and_taxes_from` int,
	`rates_and_taxes_to` int,
	`extras` json,
	`base_features` json,
	`base_finishes` json,
	`base_media` json,
	`spec_overrides` json,
	`specifications` json,
	`amenities` json,
	`features` json,
	`config_description` text,
	`virtual_tour_link` varchar(500),
	`internal_notes` text,
	`display_order` int DEFAULT 0,
	`is_active` tinyint DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `unit_types_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `user_behavior_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_onboarding_state` (
	`user_id` varchar(36) NOT NULL,
	`is_first_session` boolean DEFAULT true,
	`welcome_overlay_shown` boolean DEFAULT false,
	`welcome_overlay_dismissed` boolean DEFAULT false,
	`suggested_topics` json,
	`tooltips_shown` json DEFAULT ('[]'),
	`content_view_count` int DEFAULT 0,
	`save_count` int DEFAULT 0,
	`partner_engagement_count` int DEFAULT 0,
	`features_unlocked` json DEFAULT ('[]'),
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_onboarding_state_user_id` PRIMARY KEY(`user_id`)
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
	`petFriendly` int,
	`furnished` enum('unfurnished','semi_furnished','fully_furnished'),
	`alertFrequency` enum('never','instant','daily','weekly') DEFAULT 'daily',
	`emailNotifications` int DEFAULT 1,
	`smsNotifications` int,
	`pushNotifications` int DEFAULT 1,
	`isActive` int DEFAULT 1,
	`locationWeight` int DEFAULT 30,
	`priceWeight` int DEFAULT 25,
	`featuresWeight` int DEFAULT 25,
	`sizeWeight` int DEFAULT 20,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
	`recommendationClickCount` int,
	`recommendationConversionCount` int,
	`lastRecommendationUpdate` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `user_recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`plan_id` varchar(100) NOT NULL,
	`status` enum('trial_active','trial_expired','active_paid','past_due','cancelled','downgraded','grace_period') NOT NULL DEFAULT 'trial_active',
	`trial_started_at` timestamp,
	`trial_ends_at` timestamp,
	`trial_used` tinyint DEFAULT 0,
	`current_period_start` timestamp,
	`current_period_end` timestamp,
	`cancelled_at` timestamp,
	`ends_at` timestamp,
	`stripe_subscription_id` varchar(255),
	`stripe_customer_id` varchar(255),
	`paystack_subscription_code` varchar(255),
	`paystack_customer_code` varchar(255),
	`amount_zar` int,
	`billing_interval` enum('monthly','yearly'),
	`next_billing_date` timestamp,
	`payment_method_last4` varchar(4),
	`payment_method_type` varchar(50),
	`previous_plan_id` varchar(100),
	`downgrade_scheduled` tinyint DEFAULT 0,
	`downgrade_to_plan_id` varchar(100),
	`downgrade_effective_date` timestamp,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_subscriptions_id` PRIMARY KEY(`id`)
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
	`emailVerified` int NOT NULL,
	`role` enum('visitor','agent','agency_admin','property_developer','super_admin') NOT NULL DEFAULT 'visitor',
	`agencyId` int,
	`isSubaccount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`passwordResetToken` varchar(255),
	`passwordResetTokenExpiresAt` timestamp,
	`emailVerificationToken` varchar(255),
	CONSTRAINT `users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `videoLikes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`videoId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
	`duration` int,
	`views` int NOT NULL,
	`likes` int NOT NULL,
	`shares` int NOT NULL,
	`isPublished` int NOT NULL DEFAULT 1,
	`isFeatured` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `videos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_developer_id_developers_id_fk` FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_branding` ADD CONSTRAINT `agency_branding_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_join_requests` ADD CONSTRAINT `agency_join_requests_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_join_requests` ADD CONSTRAINT `agency_join_requests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_join_requests` ADD CONSTRAINT `agency_join_requests_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_subscriptions` ADD CONSTRAINT `agency_subscriptions_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_subscriptions` ADD CONSTRAINT `agency_subscriptions_planId_plans_id_fk` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent_coverage_areas` ADD CONSTRAINT `agent_coverage_areas_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agents` ADD CONSTRAINT `agents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agents` ADD CONSTRAINT `agents_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agents` ADD CONSTRAINT `agents_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `amenities` ADD CONSTRAINT `amenities_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` ADD CONSTRAINT `analytics_aggregations_suburbId_suburbs_id_fk` FOREIGN KEY (`suburbId`) REFERENCES `suburbs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` ADD CONSTRAINT `analytics_aggregations_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` ADD CONSTRAINT `analytics_aggregations_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boost_campaigns` ADD CONSTRAINT `boost_campaigns_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boost_campaigns` ADD CONSTRAINT `boost_campaigns_topic_id_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boost_credits` ADD CONSTRAINT `boost_credits_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bundle_partners` ADD CONSTRAINT `bundle_partners_bundle_id_marketplace_bundles_id_fk` FOREIGN KEY (`bundle_id`) REFERENCES `marketplace_bundles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bundle_partners` ADD CONSTRAINT `bundle_partners_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cities` ADD CONSTRAINT `cities_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `city_price_analytics` ADD CONSTRAINT `city_price_analytics_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `city_price_analytics` ADD CONSTRAINT `city_price_analytics_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_approval_queue` ADD CONSTRAINT `content_approval_queue_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_topics` ADD CONSTRAINT `content_topics_topic_id_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_brand_profiles` ADD CONSTRAINT `developer_brand_profiles_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_brand_profiles` ADD CONSTRAINT `fk_brand_dev_acc` FOREIGN KEY (`linked_developer_account_id`) REFERENCES `developers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_notifications` ADD CONSTRAINT `developer_notifications_developer_id_developers_id_fk` FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_notifications` ADD CONSTRAINT `developer_notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` ADD CONSTRAINT `fk_dev_sub_lim_sub` FOREIGN KEY (`subscription_id`) REFERENCES `developer_subscriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` ADD CONSTRAINT `fk_dev_sub_use_sub` FOREIGN KEY (`subscription_id`) REFERENCES `developer_subscriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD CONSTRAINT `developer_subscriptions_developer_id_developers_id_fk` FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD CONSTRAINT `developer_subscriptions_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developers` ADD CONSTRAINT `developers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developers` ADD CONSTRAINT `developers_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developers` ADD CONSTRAINT `developers_rejectedBy_users_id_fk` FOREIGN KEY (`rejectedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_approval_queue` ADD CONSTRAINT `development_approval_queue_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_approval_queue` ADD CONSTRAINT `development_approval_queue_submitted_by_users_id_fk` FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_approval_queue` ADD CONSTRAINT `development_approval_queue_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_documents` ADD CONSTRAINT `development_documents_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_documents` ADD CONSTRAINT `development_documents_unit_type_id_unit_types_id_fk` FOREIGN KEY (`unit_type_id`) REFERENCES `unit_types`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_drafts` ADD CONSTRAINT `development_drafts_developerId_developers_id_fk` FOREIGN KEY (`developerId`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_drafts` ADD CONSTRAINT `fk_dev_draft_brand` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `development_lead_routes_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `fk_lead_routes_source` FOREIGN KEY (`source_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `fk_lead_routes_recv` FOREIGN KEY (`receiver_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `fk_lead_routes_fall` FOREIGN KEY (`fallback_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_partners` ADD CONSTRAINT `development_partners_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_partners` ADD CONSTRAINT `fk_dev_partner_branded_prof` FOREIGN KEY (`brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_phases` ADD CONSTRAINT `development_phases_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_units` ADD CONSTRAINT `development_units_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_units` ADD CONSTRAINT `development_units_phase_id_development_phases_id_fk` FOREIGN KEY (`phase_id`) REFERENCES `development_phases`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developments` ADD CONSTRAINT `developments_developer_id_developers_id_fk` FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developments` ADD CONSTRAINT `developments_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developments` ADD CONSTRAINT `fk_dev_brand_prof` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developments` ADD CONSTRAINT `fk_dev_mkt_prof` FOREIGN KEY (`marketing_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_templates` ADD CONSTRAINT `email_templates_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD CONSTRAINT `explore_boost_campaigns_creator_id_users_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD CONSTRAINT `explore_boost_campaigns_content_id_explore_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `explore_content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_creator_follows` ADD CONSTRAINT `explore_creator_follows_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_creator_follows` ADD CONSTRAINT `explore_creator_follows_creator_id_users_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` ADD CONSTRAINT `explore_discovery_videos_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` ADD CONSTRAINT `explore_discovery_videos_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` ADD CONSTRAINT `fk_exp_vid_content` FOREIGN KEY (`explore_content_id`) REFERENCES `explore_content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_engagements` ADD CONSTRAINT `explore_engagements_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_engagements` ADD CONSTRAINT `explore_engagements_content_id_explore_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `explore_content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_engagements` ADD CONSTRAINT `explore_engagements_session_id_explore_feed_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `explore_feed_sessions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` ADD CONSTRAINT `explore_feed_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_neighbourhood_follows` ADD CONSTRAINT `explore_neighbourhood_follows_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_neighbourhood_follows` ADD CONSTRAINT `fk_exp_neigh_follow_neigh` FOREIGN KEY (`neighbourhood_id`) REFERENCES `explore_neighbourhoods`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_neighbourhood_stories` ADD CONSTRAINT `explore_neighbourhood_stories_suburb_id_suburbs_id_fk` FOREIGN KEY (`suburb_id`) REFERENCES `suburbs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_partners` ADD CONSTRAINT `explore_partners_tier_id_partner_tiers_id_fk` FOREIGN KEY (`tier_id`) REFERENCES `partner_tiers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_saved_properties` ADD CONSTRAINT `explore_saved_properties_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_saved_properties` ADD CONSTRAINT `explore_saved_properties_content_id_explore_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `explore_content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD CONSTRAINT `explore_shorts_topic_id_explore_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `explore_topics`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD CONSTRAINT `explore_shorts_category_id_explore_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `explore_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` ADD CONSTRAINT `explore_user_preferences_new_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exploreVideos` ADD CONSTRAINT `exploreVideos_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exploreVideos` ADD CONSTRAINT `exploreVideos_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exploreVideos` ADD CONSTRAINT `exploreVideos_developmentId_developments_id_fk` FOREIGN KEY (`developmentId`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `founding_partners` ADD CONSTRAINT `founding_partners_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE `leads` ADD CONSTRAINT `leads_developer_brand_profile_id_developer_brand_profiles_id_fk` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_analytics` ADD CONSTRAINT `listing_analytics_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_approval_queue` ADD CONSTRAINT `listing_approval_queue_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_leads` ADD CONSTRAINT `listing_leads_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_media` ADD CONSTRAINT `listing_media_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_viewings` ADD CONSTRAINT `listing_viewings_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `location_analytics_events` ADD CONSTRAINT `location_analytics_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `location_searches` ADD CONSTRAINT `location_searches_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `location_searches` ADD CONSTRAINT `location_searches_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `offers` ADD CONSTRAINT `offers_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `offers` ADD CONSTRAINT `offers_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `offers` ADD CONSTRAINT `offers_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `partner_leads` ADD CONSTRAINT `partner_leads_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `partner_subscriptions` ADD CONSTRAINT `partner_subscriptions_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE `properties` ADD CONSTRAINT `properties_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_developmentId_developments_id_fk` FOREIGN KEY (`developmentId`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_developer_brand_profile_id_developer_brand_profiles_id_fk` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_clicks` ADD CONSTRAINT `property_clicks_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_clicks` ADD CONSTRAINT `property_clicks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `propertyImages` ADD CONSTRAINT `propertyImages_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_similarity_index` ADD CONSTRAINT `property_similarity_index_propertyId1_properties_id_fk` FOREIGN KEY (`propertyId1`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_similarity_index` ADD CONSTRAINT `property_similarity_index_propertyId2_properties_id_fk` FOREIGN KEY (`propertyId2`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prospect_favorites` ADD CONSTRAINT `prospect_favorites_prospectId_prospects_id_fk` FOREIGN KEY (`prospectId`) REFERENCES `prospects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prospect_favorites` ADD CONSTRAINT `prospect_favorites_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recent_searches` ADD CONSTRAINT `recent_searches_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recent_searches` ADD CONSTRAINT `recent_searches_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recently_viewed` ADD CONSTRAINT `recently_viewed_prospectId_prospects_id_fk` FOREIGN KEY (`prospectId`) REFERENCES `prospects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recently_viewed` ADD CONSTRAINT `recently_viewed_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_searches` ADD CONSTRAINT `saved_searches_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scheduled_viewings` ADD CONSTRAINT `scheduled_viewings_prospectId_prospects_id_fk` FOREIGN KEY (`prospectId`) REFERENCES `prospects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scheduled_viewings` ADD CONSTRAINT `scheduled_viewings_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scheduled_viewings` ADD CONSTRAINT `scheduled_viewings_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `search_analytics` ADD CONSTRAINT `search_analytics_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `showings` ADD CONSTRAINT `showings_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `showings` ADD CONSTRAINT `showings_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `showings` ADD CONSTRAINT `showings_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spec_variations` ADD CONSTRAINT `spec_variations_unit_type_id_unit_types_id_fk` FOREIGN KEY (`unit_type_id`) REFERENCES `unit_types`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_events` ADD CONSTRAINT `subscription_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_usage` ADD CONSTRAINT `subscription_usage_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suburb_price_analytics` ADD CONSTRAINT `suburb_price_analytics_suburbId_suburbs_id_fk` FOREIGN KEY (`suburbId`) REFERENCES `suburbs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suburb_price_analytics` ADD CONSTRAINT `suburb_price_analytics_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suburb_price_analytics` ADD CONSTRAINT `suburb_price_analytics_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suburb_reviews` ADD CONSTRAINT `suburb_reviews_suburb_id_suburbs_id_fk` FOREIGN KEY (`suburb_id`) REFERENCES `suburbs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suburb_reviews` ADD CONSTRAINT `suburb_reviews_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suburbs` ADD CONSTRAINT `suburbs_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `unit_types` ADD CONSTRAINT `unit_types_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_behavior_events` ADD CONSTRAINT `user_behavior_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_behavior_events` ADD CONSTRAINT `user_behavior_events_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_behavior_events` ADD CONSTRAINT `user_behavior_events_suburbId_suburbs_id_fk` FOREIGN KEY (`suburbId`) REFERENCES `suburbs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_behavior_events` ADD CONSTRAINT `user_behavior_events_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_behavior_events` ADD CONSTRAINT `user_behavior_events_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_recommendations` ADD CONSTRAINT `user_recommendations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_subscriptions` ADD CONSTRAINT `user_subscriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videoLikes` ADD CONSTRAINT `videoLikes_videoId_videos_id_fk` FOREIGN KEY (`videoId`) REFERENCES `videos`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videoLikes` ADD CONSTRAINT `videoLikes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_developmentId_developments_id_fk` FOREIGN KEY (`developmentId`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_activities_developer_id` ON `activities` (`developer_id`);--> statement-breakpoint
CREATE INDEX `idx_activities_activity_type` ON `activities` (`activity_type`);--> statement-breakpoint
CREATE INDEX `idx_activities_created_at` ON `activities` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_activities_related_entity` ON `activities` (`related_entity_type`,`related_entity_id`);--> statement-breakpoint
CREATE INDEX `idx_amenities_location_id` ON `amenities` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_amenities_type` ON `amenities` (`type`);--> statement-breakpoint
CREATE INDEX `idx_boost_status` ON `boost_campaigns` (`status`);--> statement-breakpoint
CREATE INDEX `idx_boost_topic` ON `boost_campaigns` (`topic_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_boost_partner` ON `boost_campaigns` (`partner_id`);--> statement-breakpoint
CREATE INDEX `idx_user` ON `boost_credits` (`user_id`);--> statement-breakpoint
CREATE INDEX `unique_user_credits` ON `boost_credits` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_bundle_category` ON `bundle_partners` (`bundle_id`,`category`);--> statement-breakpoint
CREATE INDEX `idx_cities_slug` ON `cities` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_cities_place_id` ON `cities` (`place_id`);--> statement-breakpoint
CREATE INDEX `idx_cities_slug_province` ON `cities` (`slug`,`provinceId`);--> statement-breakpoint
CREATE INDEX `idx_approval_status` ON `content_approval_queue` (`status`);--> statement-breakpoint
CREATE INDEX `idx_approval_partner` ON `content_approval_queue` (`partner_id`);--> statement-breakpoint
CREATE INDEX `idx_quality_score` ON `content_quality_scores` (`overall_score`);--> statement-breakpoint
CREATE INDEX `idx_content_topic` ON `content_topics` (`topic_id`);--> statement-breakpoint
CREATE INDEX `idx_brand_profiles_slug` ON `developer_brand_profiles` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_brand_profiles_tier` ON `developer_brand_profiles` (`brand_tier`);--> statement-breakpoint
CREATE INDEX `idx_brand_profiles_visible` ON `developer_brand_profiles` (`is_visible`);--> statement-breakpoint
CREATE INDEX `idx_brand_profiles_subscriber` ON `developer_brand_profiles` (`is_subscriber`);--> statement-breakpoint
CREATE INDEX `idx_brand_profiles_owner` ON `developer_brand_profiles` (`owner_type`);--> statement-breakpoint
CREATE INDEX `idx_developer_notifications_developer_id` ON `developer_notifications` (`developer_id`);--> statement-breakpoint
CREATE INDEX `idx_developer_notifications_user_id` ON `developer_notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_developer_notifications_read` ON `developer_notifications` (`read`);--> statement-breakpoint
CREATE INDEX `idx_developer_notifications_created_at` ON `developer_notifications` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_developer_notifications_type` ON `developer_notifications` (`type`);--> statement-breakpoint
CREATE INDEX `idx_developer_notifications_feed` ON `developer_notifications` (`developer_id`,`read`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_developer_subscription_limits_subscription_id` ON `developer_subscription_limits` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `idx_developer_subscription_usage_subscription_id` ON `developer_subscription_usage` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `idx_developer_subscriptions_developer_id` ON `developer_subscriptions` (`developer_id`);--> statement-breakpoint
CREATE INDEX `idx_developer_subscriptions_status` ON `developer_subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_developer_subscriptions_tier` ON `developer_subscriptions` (`tier`);--> statement-breakpoint
CREATE INDEX `idx_developers_userId` ON `developers` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_developers_status` ON `developers` (`status`);--> statement-breakpoint
CREATE INDEX `idx_developers_last_kpi_calculation` ON `developers` (`lastKpiCalculation`);--> statement-breakpoint
CREATE INDEX `idx_dev_approval_status` ON `development_approval_queue` (`status`);--> statement-breakpoint
CREATE INDEX `idx_dev_approval_dev_id` ON `development_approval_queue` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_dev_docs_development_id` ON `development_documents` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_dev_docs_unit_type_id` ON `development_documents` (`unit_type_id`);--> statement-breakpoint
CREATE INDEX `idx_dev_docs_type` ON `development_documents` (`type`);--> statement-breakpoint
CREATE INDEX `idx_dev_drafts_developer_id` ON `development_drafts` (`developerId`);--> statement-breakpoint
CREATE INDEX `idx_dev_drafts_brand_profile_id` ON `development_drafts` (`developer_brand_profile_id`);--> statement-breakpoint
CREATE INDEX `idx_dev_drafts_last_modified` ON `development_drafts` (`lastModified`);--> statement-breakpoint
CREATE INDEX `idx_lead_routes_development_id` ON `development_lead_routes` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_lead_routes_source_type` ON `development_lead_routes` (`source_type`);--> statement-breakpoint
CREATE INDEX `idx_lead_routes_lookup` ON `development_lead_routes` (`development_id`,`source_type`,`source_brand_profile_id`);--> statement-breakpoint
CREATE INDEX `idx_dev_partners_development_id` ON `development_partners` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_dev_partners_brand_profile_id` ON `development_partners` (`brand_profile_id`);--> statement-breakpoint
CREATE INDEX `idx_dev_partners_partner_type` ON `development_partners` (`partner_type`);--> statement-breakpoint
CREATE INDEX `idx_development_phases_development_id` ON `development_phases` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_development_phases_status` ON `development_phases` (`status`);--> statement-breakpoint
CREATE INDEX `idx_development_phases_spec_type` ON `development_phases` (`spec_type`);--> statement-breakpoint
CREATE INDEX `unique_unit_per_development` ON `development_units` (`development_id`,`unit_number`);--> statement-breakpoint
CREATE INDEX `idx_units_development_id` ON `development_units` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_units_phase_id` ON `development_units` (`phase_id`);--> statement-breakpoint
CREATE INDEX `idx_units_status` ON `development_units` (`status`);--> statement-breakpoint
CREATE INDEX `idx_units_unit_type` ON `development_units` (`unit_type`);--> statement-breakpoint
CREATE INDEX `idx_units_price` ON `development_units` (`price`);--> statement-breakpoint
CREATE INDEX `idx_developments_developer_id` ON `developments` (`developer_id`);--> statement-breakpoint
CREATE INDEX `idx_developments_status` ON `developments` (`status`);--> statement-breakpoint
CREATE INDEX `idx_developments_gps_accuracy` ON `developments` (`gps_accuracy`);--> statement-breakpoint
CREATE INDEX `idx_developments_suburb` ON `developments` (`suburb`);--> statement-breakpoint
CREATE INDEX `idx_developments_location_id` ON `developments` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_developments_rating` ON `developments` (`rating`);--> statement-breakpoint
CREATE INDEX `idx_developments_published` ON `developments` (`isPublished`,`publishedAt`);--> statement-breakpoint
CREATE INDEX `idx_boost_campaigns_creator` ON `explore_boost_campaigns` (`creator_id`);--> statement-breakpoint
CREATE INDEX `idx_boost_campaigns_status` ON `explore_boost_campaigns` (`status`);--> statement-breakpoint
CREATE INDEX `idx_boost_campaigns_dates` ON `explore_boost_campaigns` (`start_date`,`end_date`);--> statement-breakpoint
CREATE INDEX `idx_boost_campaigns_active` ON `explore_boost_campaigns` (`status`,`end_date`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_type` ON `explore_content` (`content_type`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_creator` ON `explore_content` (`creator_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_creator_type` ON `explore_content` (`creator_type`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_agency_id` ON `explore_content` (`agency_id`);--> statement-breakpoint
CREATE INDEX `idx_content_partner` ON `explore_content` (`partner_id`);--> statement-breakpoint
CREATE INDEX `idx_content_category` ON `explore_content` (`content_category`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_location` ON `explore_content` (`location_lat`,`location_lng`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_engagement` ON `explore_content` (`engagement_score`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_active` ON `explore_content` (`is_active`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_agency_active` ON `explore_content` (`agency_id`,`is_active`,`created_at`);--> statement-breakpoint
CREATE INDEX `unique_user_creator` ON `explore_creator_follows` (`user_id`,`creator_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_creator_follows_user` ON `explore_creator_follows` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_creator_follows_creator` ON `explore_creator_follows` (`creator_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_discovery_videos_content` ON `explore_discovery_videos` (`explore_content_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_discovery_videos_property` ON `explore_discovery_videos` (`property_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_discovery_videos_development` ON `explore_discovery_videos` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_discovery_videos_performance` ON `explore_discovery_videos` (`completion_rate`,`total_views`);--> statement-breakpoint
CREATE INDEX `idx_explore_engagement_user` ON `explore_engagements` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_engagement_content` ON `explore_engagements` (`content_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_engagement_type` ON `explore_engagements` (`engagement_type`);--> statement-breakpoint
CREATE INDEX `idx_explore_engagement_created` ON `explore_engagements` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_explore_sessions_user` ON `explore_feed_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_sessions_start` ON `explore_feed_sessions` (`session_start`);--> statement-breakpoint
CREATE INDEX `unique_follow` ON `exploreFollows` (`followerId`,`followingId`);--> statement-breakpoint
CREATE INDEX `idx_explore_highlight_tags_category` ON `explore_highlight_tags` (`category`);--> statement-breakpoint
CREATE INDEX `idx_explore_highlight_tags_display_order` ON `explore_highlight_tags` (`display_order`);--> statement-breakpoint
CREATE INDEX `tag_key` ON `explore_highlight_tags` (`tag_key`);--> statement-breakpoint
CREATE INDEX `idx_explore_interactions_short_id` ON `explore_interactions` (`short_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_interactions_user_id` ON `explore_interactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_interactions_session_id` ON `explore_interactions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_interactions_type` ON `explore_interactions` (`interaction_type`);--> statement-breakpoint
CREATE INDEX `idx_explore_interactions_timestamp` ON `explore_interactions` (`timestamp`);--> statement-breakpoint
CREATE INDEX `unique_like` ON `exploreLikes` (`videoId`,`userId`);--> statement-breakpoint
CREATE INDEX `unique_user_neighbourhood` ON `explore_neighbourhood_follows` (`user_id`,`neighbourhood_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_neighbourhood_follows_user` ON `explore_neighbourhood_follows` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_ens_suburb_id` ON `explore_neighbourhood_stories` (`suburb_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_neighbourhoods_location` ON `explore_neighbourhoods` (`location_lat`,`location_lng`);--> statement-breakpoint
CREATE INDEX `idx_explore_neighbourhoods_slug` ON `explore_neighbourhoods` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_explore_neighbourhoods_city` ON `explore_neighbourhoods` (`city`,`province`);--> statement-breakpoint
CREATE INDEX `idx_partner_tier` ON `explore_partners` (`tier_id`);--> statement-breakpoint
CREATE INDEX `idx_partner_verification` ON `explore_partners` (`verification_status`);--> statement-breakpoint
CREATE INDEX `idx_partner_trust` ON `explore_partners` (`trust_score`);--> statement-breakpoint
CREATE INDEX `unique_user_content` ON `explore_saved_properties` (`user_id`,`content_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_saved_user` ON `explore_saved_properties` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_explore_saved_collection` ON `explore_saved_properties` (`user_id`,`collection_name`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_listing_id` ON `explore_shorts` (`listing_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_development_id` ON `explore_shorts` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_agent_id` ON `explore_shorts` (`agent_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_agency_id` ON `explore_shorts` (`agency_id`);--> statement-breakpoint
CREATE INDEX `idx_shorts_partner` ON `explore_shorts` (`partner_id`);--> statement-breakpoint
CREATE INDEX `idx_shorts_category` ON `explore_shorts` (`content_category`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_performance_score` ON `explore_shorts` (`performance_score`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_boost_priority` ON `explore_shorts` (`boost_priority`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_published` ON `explore_shorts` (`is_published`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_agency_published` ON `explore_shorts` (`agency_id`,`is_published`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_agency_performance` ON `explore_shorts` (`agency_id`,`performance_score`,`view_count`);--> statement-breakpoint
CREATE INDEX `idx_es_target` ON `explore_sponsorships` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `idx_es_status` ON `explore_sponsorships` (`status`);--> statement-breakpoint
CREATE INDEX `user_id` ON `explore_user_preferences` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_user_pref_user` ON `explore_user_preferences_new` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_user_pref_active` ON `explore_user_preferences_new` (`last_active`);--> statement-breakpoint
CREATE INDEX `idx_hero_campaigns_slug` ON `hero_campaigns` (`target_slug`);--> statement-breakpoint
CREATE INDEX `idx_hero_campaigns_active` ON `hero_campaigns` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_hero_campaigns_dates` ON `hero_campaigns` (`start_date`,`end_date`);--> statement-breakpoint
CREATE INDEX `idx_metrics_date` ON `launch_metrics` (`metric_date`);--> statement-breakpoint
CREATE INDEX `idx_leads_qualification_status` ON `leads` (`qualification_status`);--> statement-breakpoint
CREATE INDEX `idx_leads_funnel_stage` ON `leads` (`funnel_stage`);--> statement-breakpoint
CREATE INDEX `idx_leads_assigned_to` ON `leads` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `idx_leads_lead_source` ON `leads` (`lead_source`);--> statement-breakpoint
CREATE INDEX `idx_loc_analytics_event` ON `location_analytics_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_loc_analytics_created` ON `location_analytics_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_loc_analytics_location` ON `location_analytics_events` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_loc_analytics_development` ON `location_analytics_events` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_location_searched` ON `location_searches` (`location_id`,`searched_at`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `location_searches` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_location_targeting` ON `location_targeting` (`location_type`,`location_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_locations_place_id` ON `locations` (`place_id`);--> statement-breakpoint
CREATE INDEX `idx_locations_slug` ON `locations` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_locations_parent_id` ON `locations` (`parentId`);--> statement-breakpoint
CREATE INDEX `idx_lead_partner` ON `partner_leads` (`partner_id`);--> statement-breakpoint
CREATE INDEX `idx_lead_status` ON `partner_leads` (`status`);--> statement-breakpoint
CREATE INDEX `idx_lead_type` ON `partner_leads` (`type`);--> statement-breakpoint
CREATE INDEX `idx_subscription_partner` ON `partner_subscriptions` (`partner_id`);--> statement-breakpoint
CREATE INDEX `idx_subscription_status` ON `partner_subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_partners_status` ON `partners` (`status`);--> statement-breakpoint
CREATE INDEX `idx_partners_category` ON `partners` (`category`);--> statement-breakpoint
CREATE INDEX `price_idx` ON `properties` (`price`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `properties` (`status`);--> statement-breakpoint
CREATE INDEX `city_idx` ON `properties` (`city`);--> statement-breakpoint
CREATE INDEX `province_idx` ON `properties` (`province`);--> statement-breakpoint
CREATE INDEX `property_type_idx` ON `properties` (`propertyType`);--> statement-breakpoint
CREATE INDEX `listing_type_idx` ON `properties` (`listingType`);--> statement-breakpoint
CREATE INDEX `bedrooms_idx` ON `properties` (`bedrooms`);--> statement-breakpoint
CREATE INDEX `bathrooms_idx` ON `properties` (`bathrooms`);--> statement-breakpoint
CREATE INDEX `idx_properties_cityId` ON `properties` (`cityId`);--> statement-breakpoint
CREATE INDEX `idx_properties_suburbId` ON `properties` (`suburbId`);--> statement-breakpoint
CREATE INDEX `idx_properties_location_id` ON `properties` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_properties_cityId_status` ON `properties` (`cityId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_properties_cityId_area` ON `properties` (`cityId`,`area`);--> statement-breakpoint
CREATE INDEX `idx_property_clicks_property` ON `property_clicks` (`propertyId`);--> statement-breakpoint
CREATE INDEX `idx_property_clicks_created` ON `property_clicks` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_property_clicks_session` ON `property_clicks` (`sessionId`);--> statement-breakpoint
CREATE INDEX `idx_provinces_slug` ON `provinces` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_provinces_place_id` ON `provinces` (`place_id`);--> statement-breakpoint
CREATE INDEX `idx_user_recent` ON `recent_searches` (`user_id`,`searched_at`);--> statement-breakpoint
CREATE INDEX `unique_user_location` ON `recent_searches` (`user_id`,`location_id`);--> statement-breakpoint
CREATE INDEX `idx_search_analytics_created` ON `search_analytics` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_search_analytics_user` ON `search_analytics` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_search_analytics_session` ON `search_analytics` (`sessionId`);--> statement-breakpoint
CREATE INDEX `idx_spec_variations_unit_type_id` ON `spec_variations` (`unit_type_id`);--> statement-breakpoint
CREATE INDEX `idx_spec_variations_price` ON `spec_variations` (`price`);--> statement-breakpoint
CREATE INDEX `idx_spec_variations_display_order` ON `spec_variations` (`display_order`);--> statement-breakpoint
CREATE INDEX `idx_user` ON `subscription_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_event_type` ON `subscription_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_category` ON `subscription_plans` (`category`);--> statement-breakpoint
CREATE INDEX `idx_active` ON `subscription_plans` (`is_active`);--> statement-breakpoint
CREATE INDEX `plan_id` ON `subscription_plans` (`plan_id`);--> statement-breakpoint
CREATE INDEX `idx_user_period` ON `subscription_usage` (`user_id`,`period_start`,`period_end`);--> statement-breakpoint
CREATE INDEX `idx_suburb_reviews_suburb` ON `suburb_reviews` (`suburb_id`);--> statement-breakpoint
CREATE INDEX `idx_suburb_reviews_user` ON `suburb_reviews` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_suburb_reviews_rating` ON `suburb_reviews` (`rating`);--> statement-breakpoint
CREATE INDEX `idx_suburb_reviews_published` ON `suburb_reviews` (`is_published`);--> statement-breakpoint
CREATE INDEX `idx_suburbs_slug` ON `suburbs` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_suburbs_place_id` ON `suburbs` (`place_id`);--> statement-breakpoint
CREATE INDEX `idx_suburbs_slug_city` ON `suburbs` (`slug`,`cityId`);--> statement-breakpoint
CREATE INDEX `idx_topic_slug` ON `topics` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_topic_active` ON `topics` (`is_active`,`display_order`);--> statement-breakpoint
CREATE INDEX `idx_unit_types_development_id` ON `unit_types` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_unit_types_price_range` ON `unit_types` (`base_price_from`,`base_price_to`);--> statement-breakpoint
CREATE INDEX `idx_unit_types_bedrooms_bathrooms` ON `unit_types` (`bedrooms`,`bathrooms`);--> statement-breakpoint
CREATE INDEX `idx_unit_types_display_order` ON `unit_types` (`display_order`);--> statement-breakpoint
CREATE INDEX `idx_user` ON `user_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `user_subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `unique_user_subscription` ON `user_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `role_idx` ON `users` (`role`);