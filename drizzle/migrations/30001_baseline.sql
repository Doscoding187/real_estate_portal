-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `activities` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`developer_id` int(11) NOT NULL,
	`activity_type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`metadata` json,
	`related_entity_type` enum('development','unit','lead','campaign','team_member'),
	`related_entity_id` int(11),
	`user_id` int(11),
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `agencies` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
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
	`isVerified` int(11) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `agency_branding` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`agencyId` int(11) NOT NULL,
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
	`isEnabled` int(11) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `agency_join_requests` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`agencyId` int(11) NOT NULL,
	`userId` int(11) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`message` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`reviewedBy` int(11),
	`reviewedAt` timestamp
);
--> statement-breakpoint
CREATE TABLE `agency_subscriptions` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`agencyId` int(11) NOT NULL,
	`planId` int(11),
	`stripeSubscriptionId` varchar(100),
	`stripeCustomerId` varchar(100) NOT NULL,
	`stripePriceId` varchar(100),
	`status` enum('incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid') NOT NULL DEFAULT 'incomplete',
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`trialEnd` timestamp,
	`cancelAtPeriodEnd` int(11) NOT NULL,
	`canceledAt` timestamp,
	`endedAt` timestamp,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `agent_coverage_areas` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`agentId` int(11) NOT NULL,
	`areaName` varchar(255) NOT NULL,
	`areaType` enum('province','city','suburb','custom_polygon') NOT NULL,
	`areaData` text NOT NULL,
	`isActive` int(11) NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `agent_knowledge` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`topic` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(100),
	`tags` json,
	`metadata` json,
	`is_active` int(11) NOT NULL DEFAULT 1,
	`created_by` int(11),
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `agent_memory` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`session_id` varchar(100) NOT NULL,
	`conversation_id` varchar(100),
	`user_id` int(11),
	`user_input` text NOT NULL,
	`agent_response` text NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `agent_tasks` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`task_id` varchar(100) NOT NULL,
	`session_id` varchar(100),
	`user_id` int(11),
	`task_type` varchar(50) NOT NULL,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`priority` int(11) NOT NULL DEFAULT 0,
	`input_data` json,
	`output_data` json,
	`error_message` text,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`userId` int(11),
	`agencyId` int(11),
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
	`yearsExperience` int(11),
	`areasServed` text,
	`languages` text,
	`rating` int(11),
	`reviewCount` int(11),
	`totalSales` int(11),
	`isVerified` int(11) NOT NULL,
	`isFeatured` int(11) NOT NULL,
	`status` enum('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
	`rejectionReason` text,
	`approvedBy` int(11),
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `amenities` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`location_id` int(11) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(100) NOT NULL,
	`rating` decimal(3,1),
	`latitude` varchar(50),
	`longitude` varchar(50),
	`distance` decimal(10,2),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `analytics_aggregations` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`aggregationType` enum('daily','weekly','monthly') NOT NULL,
	`aggregationDate` varchar(10) NOT NULL,
	`suburbId` int(11),
	`cityId` int(11),
	`provinceId` int(11),
	`propertyType` varchar(50),
	`listingType` varchar(50),
	`totalProperties` int(11),
	`activeListings` int(11),
	`avgPrice` int(11),
	`medianPrice` int(11),
	`minPrice` int(11),
	`maxPrice` int(11),
	`pricePerSqmAvg` int(11),
	`totalViews` int(11),
	`totalSaves` int(11),
	`totalContacts` int(11),
	`uniqueVisitors` int(11),
	`newListings` int(11),
	`soldProperties` int(11),
	`rentedProperties` int(11),
	`avgDaysOnMarket` int(11),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`userId` int(11) NOT NULL,
	`action` varchar(100) NOT NULL,
	`targetType` varchar(50),
	`targetId` int(11),
	`metadata` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `billing_transactions` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`user_id` int(11) NOT NULL,
	`subscription_id` int(11),
	`transaction_type` enum('subscription_create','subscription_renew','upgrade','downgrade','addon_purchase','refund','failed_payment','trial_conversion') NOT NULL,
	`amount_zar` int(11) NOT NULL,
	`currency` varchar(3) DEFAULT 'ZAR',
	`status` enum('pending','completed','failed','refunded') DEFAULT 'pending',
	`payment_gateway` enum('stripe','paystack','manual') NOT NULL,
	`gateway_transaction_id` varchar(255),
	`gateway_invoice_id` varchar(255),
	`description` text,
	`metadata` json,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
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
	`start_date` date NOT NULL,
	`end_date` date,
	`impressions` int(11) DEFAULT 0,
	`clicks` int(11) DEFAULT 0,
	`cost_per_impression` decimal(6,4) DEFAULT '0.10',
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `boost_credits` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`user_id` int(11) NOT NULL,
	`total_credits` int(11) DEFAULT 0,
	`used_credits` int(11) DEFAULT 0,
	`reset_at` timestamp,
	`expires_at` timestamp,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `bundle_partners` (
	`bundle_id` varchar(36) NOT NULL,
	`partner_id` varchar(36) NOT NULL,
	`category` varchar(100) NOT NULL,
	`display_order` int(11) DEFAULT 0,
	`inclusion_fee` decimal(10,2),
	`performance_score` decimal(5,2) DEFAULT '50.00'
);
--> statement-breakpoint
CREATE TABLE `cities` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`provinceId` int(11) NOT NULL,
	`name` varchar(150) NOT NULL,
	`latitude` varchar(20),
	`longitude` varchar(21),
	`isMetro` int(11) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`slug` varchar(100),
	`place_id` varchar(255),
	`seo_title` varchar(255),
	`seo_description` text
);
--> statement-breakpoint
CREATE TABLE `city_price_analytics` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`cityId` int(11) NOT NULL,
	`provinceId` int(11) NOT NULL,
	`currentAvgPrice` int(11),
	`currentMedianPrice` int(11),
	`currentMinPrice` int(11),
	`currentMaxPrice` int(11),
	`currentPriceCount` int(11),
	`sixMonthGrowthPercent` int(11),
	`threeMonthGrowthPercent` int(11),
	`oneMonthGrowthPercent` int(11),
	`totalProperties` int(11),
	`activeListings` int(11),
	`averageDaysOnMarket` int(11),
	`luxurySegmentPercent` int(11),
	`midRangePercent` int(11),
	`affordablePercent` int(11),
	`lastUpdated` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `commissions` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`agentId` int(11) NOT NULL,
	`propertyId` int(11),
	`leadId` int(11),
	`amount` int(11) NOT NULL,
	`percentage` int(11),
	`status` enum('pending','approved','paid','cancelled') NOT NULL DEFAULT 'pending',
	`transactionType` enum('sale','rent','referral','other') NOT NULL DEFAULT 'sale',
	`description` text,
	`payoutDate` timestamp,
	`paymentReference` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `content_approval_queue` (
	`id` varchar(36) NOT NULL,
	`content_id` varchar(36) NOT NULL,
	`partner_id` varchar(36) NOT NULL,
	`status` enum('pending','approved','rejected','revision_requested') DEFAULT 'pending',
	`submitted_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`reviewed_at` timestamp,
	`reviewer_id` varchar(36),
	`feedback` text,
	`auto_approval_eligible` tinyint(1) DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `content_quality_scores` (
	`content_id` varchar(36) NOT NULL,
	`overall_score` decimal(5,2) DEFAULT '50.00',
	`metadata_score` decimal(5,2) DEFAULT '0',
	`engagement_score` decimal(5,2) DEFAULT '0',
	`production_score` decimal(5,2) DEFAULT '0',
	`negative_signals` int(11) DEFAULT 0,
	`last_calculated_at` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `content_topics` (
	`content_id` varchar(36) NOT NULL,
	`topic_id` varchar(36) NOT NULL,
	`relevance_score` decimal(5,2) DEFAULT '1.00',
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`stripeCouponId` varchar(100),
	`name` varchar(100),
	`description` text,
	`discountType` enum('amount','percent') NOT NULL DEFAULT 'percent',
	`discountAmount` int(11),
	`maxRedemptions` int(11),
	`redemptionsUsed` int(11) NOT NULL,
	`validFrom` timestamp,
	`validUntil` timestamp,
	`isActive` int(11) NOT NULL DEFAULT 1,
	`appliesToPlans` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `developer_brand_profiles` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`brand_name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`logo_url` text,
	`about` text,
	`founded_year` int(11),
	`head_office_location` varchar(255),
	`operating_provinces` json,
	`property_focus` json,
	`website_url` varchar(500),
	`public_contact_email` varchar(320),
	`brand_tier` enum('national','regional','boutique') DEFAULT 'regional',
	`source_attribution` varchar(255),
	`profile_type` enum('industry_reference','verified_partner') DEFAULT 'industry_reference',
	`is_subscriber` tinyint(4) NOT NULL DEFAULT 0,
	`is_claimable` tinyint(4) NOT NULL DEFAULT 1,
	`is_visible` tinyint(4) NOT NULL DEFAULT 1,
	`is_contact_verified` tinyint(4) NOT NULL DEFAULT 0,
	`linked_developer_account_id` int(11),
	`owner_type` enum('platform','developer') NOT NULL DEFAULT 'platform',
	`claim_requested_at` timestamp,
	`total_leads_received` int(11) NOT NULL DEFAULT 0,
	`last_lead_date` timestamp,
	`unclaimed_lead_count` int(11) NOT NULL DEFAULT 0,
	`created_by` int(11),
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`identity_type` enum('developer','marketing_agency','hybrid') NOT NULL DEFAULT 'developer',
	`seed_batch_id` varchar(36)
);
--> statement-breakpoint
CREATE TABLE `developer_notifications` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`developer_id` int(11) NOT NULL,
	`user_id` int(11),
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`type` varchar(50) NOT NULL,
	`severity` enum('info','warning','error','success') NOT NULL DEFAULT 'info',
	`read` tinyint(1) NOT NULL DEFAULT 0,
	`action_url` varchar(500),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `developer_subscription_limits` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`subscription_id` int(11) NOT NULL,
	`max_developments` int(11) NOT NULL DEFAULT 1,
	`max_leads_per_month` int(11) NOT NULL DEFAULT 50,
	`max_team_members` int(11) NOT NULL DEFAULT 1,
	`analytics_retention_days` int(11) NOT NULL DEFAULT 30,
	`crm_integration_enabled` tinyint(4) NOT NULL DEFAULT 0,
	`advanced_analytics_enabled` tinyint(4) NOT NULL DEFAULT 0,
	`bond_integration_enabled` tinyint(4) NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `developer_subscription_usage` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`subscription_id` int(11) NOT NULL,
	`developments_count` int(11) NOT NULL DEFAULT 0,
	`leads_this_month` int(11) NOT NULL DEFAULT 0,
	`team_members_count` int(11) NOT NULL DEFAULT 0,
	`last_reset_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `developer_subscriptions` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`developer_id` int(11) NOT NULL,
	`plan_id` int(11),
	`tier` enum('free_trial','basic','premium') NOT NULL DEFAULT 'free_trial',
	`status` enum('active','cancelled','expired') NOT NULL DEFAULT 'active',
	`trial_ends_at` timestamp,
	`current_period_start` timestamp,
	`current_period_end` timestamp,
	`stripe_subscription_id` varchar(100),
	`stripe_customer_id` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `developers` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
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
	`establishedYear` int(11),
	`trackRecord` text,
	`pastProjects` int(11) DEFAULT 0,
	`totalProjects` int(11),
	`rating` decimal(3,2) DEFAULT '0.00',
	`reviewCount` int(11) DEFAULT 0,
	`isVerified` int(11) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`userId` int(11) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`rejectionReason` text,
	`approvedBy` int(11),
	`approvedAt` timestamp,
	`rejectedBy` int(11),
	`rejectedAt` timestamp,
	`completedProjects` int(11) DEFAULT 0,
	`currentProjects` int(11) DEFAULT 0,
	`upcomingProjects` int(11) DEFAULT 0,
	`specializations` json,
	`kpiCache` json,
	`lastKpiCalculation` timestamp,
	`slug` varchar(255),
	`is_trusted` tinyint(1) NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `development_approval_queue` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`development_id` int(11) NOT NULL,
	`submitted_by` int(11) NOT NULL,
	`status` enum('pending','reviewing','approved','rejected') NOT NULL DEFAULT 'pending',
	`submission_type` enum('initial','update') NOT NULL DEFAULT 'initial',
	`review_notes` text,
	`rejection_reason` text,
	`compliance_checks` json,
	`submitted_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`reviewed_at` timestamp,
	`reviewed_by` int(11)
);
--> statement-breakpoint
CREATE TABLE `development_drafts` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`developerId` int(11),
	`draftName` varchar(255),
	`draftData` json NOT NULL,
	`progress` int(11) NOT NULL DEFAULT 0,
	`currentStep` int(11) NOT NULL DEFAULT 0,
	`lastModified` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`developer_brand_profile_id` int(11)
);
--> statement-breakpoint
CREATE TABLE `development_lead_routes` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`development_id` int(11) NOT NULL,
	`source_type` enum('developer_profile','agency_profile','development_page','campaign') NOT NULL,
	`source_brand_profile_id` int(11),
	`receiver_brand_profile_id` int(11) NOT NULL,
	`fallback_brand_profile_id` int(11),
	`priority` int(11) NOT NULL DEFAULT 0,
	`is_active` tinyint(4) NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `development_phases` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`development_id` int(11) NOT NULL,
	`name` varchar(255) NOT NULL,
	`phase_number` int(11) NOT NULL,
	`description` text,
	`status` enum('planning','pre_launch','selling','sold_out','completed') NOT NULL DEFAULT 'planning',
	`total_units` int(11) NOT NULL DEFAULT 0,
	`available_units` int(11) NOT NULL DEFAULT 0,
	`price_from` int(11),
	`price_to` int(11),
	`launch_date` timestamp,
	`completion_date` timestamp,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`spec_type` enum('affordable','gap','luxury','custom') DEFAULT 'affordable',
	`custom_spec_type` varchar(100),
	`finishing_differences` json,
	`phase_highlights` json,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7)
);
--> statement-breakpoint
CREATE TABLE `development_units` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`development_id` int(11) NOT NULL,
	`phase_id` int(11),
	`unit_number` varchar(100) NOT NULL,
	`unit_type` enum('studio','1bed','2bed','3bed','4bed+','penthouse','townhouse','house') NOT NULL,
	`bedrooms` int(11),
	`bathrooms` decimal(3,1),
	`size` decimal(10,2),
	`price` decimal(12,2) NOT NULL,
	`floor_plan` text,
	`floor` int(11),
	`facing` varchar(50),
	`features` text,
	`status` enum('available','reserved','sold') NOT NULL DEFAULT 'available',
	`reserved_at` timestamp,
	`reserved_by` int(11),
	`sold_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `developments` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`developerId` int(11),
	`name` varchar(255) NOT NULL,
	`description` text,
	`developmentType` enum('residential','commercial','mixed_use','land') NOT NULL,
	`address` text,
	`city` varchar(100) NOT NULL,
	`province` varchar(100) NOT NULL,
	`latitude` varchar(50),
	`longitude` varchar(50),
	`totalUnits` int(11),
	`availableUnits` int(11),
	`priceFrom` int(11),
	`priceTo` int(11),
	`amenities` text,
	`images` text,
	`videos` text,
	`completionDate` timestamp,
	`isFeatured` int(11) NOT NULL DEFAULT 0,
	`views` int(11) NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`slug` varchar(255),
	`isPublished` tinyint(4) NOT NULL DEFAULT 0,
	`publishedAt` timestamp,
	`showHouseAddress` tinyint(4) NOT NULL DEFAULT 1,
	`floorPlans` text,
	`brochures` text,
	`rating` decimal(3,2),
	`suburb` varchar(100),
	`location_id` int(11),
	`postal_code` varchar(20),
	`gps_accuracy` enum('accurate','approximate') DEFAULT 'approximate',
	`highlights` json,
	`features` json,
	`inquiries_count` int(11) DEFAULT 0,
	`demand_score` int(11) DEFAULT 0,
	`is_hot_selling` int(11) DEFAULT 0,
	`is_high_demand` int(11) DEFAULT 0,
	`approval_status` enum('draft','pending','approved','rejected') DEFAULT 'draft',
	`developer_id` int(11),
	`readiness_score` int(11) NOT NULL DEFAULT 0,
	`rejection_reasons` json,
	`rejection_note` text,
	`developer_brand_profile_id` int(11),
	`dev_owner_type` enum('platform','developer') DEFAULT 'developer',
	`is_showcase` tinyint(4) DEFAULT 0,
	`marketing_brand_profile_id` int(11),
	`marketing_role` enum('exclusive','joint','open'),
	`tagline` varchar(255),
	`marketing_name` varchar(255),
	`monthly_levy_to` decimal(10,2),
	`rates_to` decimal(10,2),
	`monthly_levy_from` decimal(10,2),
	`rates_from` decimal(10,2),
	`transfer_costs_included` tinyint(4) DEFAULT 0,
	`estateSpecs` json,
	`custom_classification` varchar(255),
	`nature` enum('new','phase','extension','redevelopment') NOT NULL DEFAULT 'new',
	`total_development_area` int(11),
	`property_types` json,
	`status` enum('launching-soon','selling','sold-out') NOT NULL DEFAULT 'launching-soon',
	`legacy_status` enum('planning','under_construction','completed','coming_soon','now-selling','launching-soon','ready-to-move','sold-out','phase-completed','new-phase-launching','pre_launch','ready'),
	`construction_phase` enum('planning','under_construction','completed','phase_completed'),
	`subtitle` varchar(255),
	`meta_title` varchar(255),
	`meta_description` text,
	`ownership_type` varchar(255),
	`structural_type` varchar(255),
	`floors` int(11),
	`transaction_type` enum('for_sale','for_rent','auction') NOT NULL DEFAULT 'for_sale',
	`monthly_rent_from` decimal(15,2),
	`monthly_rent_to` decimal(15,2),
	`auction_start_date` datetime,
	`auction_end_date` datetime,
	`starting_bid_from` decimal(15,2),
	`reserve_price_from` decimal(15,2)
);
--> statement-breakpoint
CREATE TABLE `email_templates` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`templateKey` varchar(100) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`htmlContent` text NOT NULL,
	`textContent` text,
	`agencyId` int(11),
	`isActive` int(11) NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `exploreComments` (
	`id` varchar(191) NOT NULL,
	`videoId` varchar(191) NOT NULL,
	`userId` int(11) NOT NULL,
	`comment` text NOT NULL,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `exploreFollows` (
	`id` varchar(191) NOT NULL,
	`followerId` int(11) NOT NULL,
	`followingId` int(11) NOT NULL,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `exploreLikes` (
	`id` varchar(191) NOT NULL,
	`videoId` varchar(191) NOT NULL,
	`userId` int(11) NOT NULL,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `exploreVideoViews` (
	`id` varchar(191) NOT NULL,
	`videoId` varchar(191) NOT NULL,
	`userId` int(11) NOT NULL,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `exploreVideos` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`agentId` int(11),
	`propertyId` int(11),
	`developmentId` int(11),
	`title` varchar(255) NOT NULL,
	`description` text,
	`videoUrl` text NOT NULL,
	`thumbnailUrl` text,
	`duration` int(11),
	`views` int(11) NOT NULL,
	`likes` int(11) NOT NULL,
	`shares` int(11) NOT NULL,
	`isPublished` int(11) NOT NULL DEFAULT 1,
	`isFeatured` int(11) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `explore_content` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`content_type` varchar(50) NOT NULL,
	`reference_id` int(11) NOT NULL,
	`creator_id` int(11),
	`creator_type` enum('user','agent','developer','agency') NOT NULL DEFAULT 'user',
	`agency_id` int(11),
	`title` varchar(255),
	`description` text,
	`thumbnail_url` varchar(500),
	`video_url` varchar(500),
	`metadata` json,
	`tags` json,
	`lifestyle_categories` json,
	`location_lat` decimal(10,8),
	`location_lng` decimal(11,8),
	`price_min` int(11),
	`price_max` int(11),
	`view_count` int(11) DEFAULT 0,
	`engagement_score` decimal(5,2) DEFAULT '0',
	`is_active` tinyint(1) DEFAULT 1,
	`is_featured` tinyint(1) DEFAULT 0,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `explore_highlight_tags` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`tag_key` varchar(50) NOT NULL,
	`label` varchar(100) NOT NULL,
	`icon` varchar(50),
	`color` varchar(7),
	`category` varchar(50),
	`display_order` int(11) NOT NULL DEFAULT 0,
	`is_active` tinyint(4) NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `explore_interactions` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`short_id` int(11) NOT NULL,
	`user_id` int(11),
	`session_id` varchar(255) NOT NULL,
	`interaction_type` enum('impression','view','skip','save','share','contact','whatsapp','book_viewing') NOT NULL,
	`duration` int(11),
	`timestamp` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`feed_type` enum('recommended','area','category','agent','developer') NOT NULL,
	`feed_context` json,
	`device_type` enum('mobile','tablet','desktop') NOT NULL,
	`user_agent` text,
	`ip_address` varchar(45),
	`metadata` json
);
--> statement-breakpoint
CREATE TABLE `explore_partners` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`tier_id` int(11) NOT NULL,
	`company_name` varchar(255) NOT NULL,
	`description` text,
	`logo_url` varchar(500),
	`verification_status` enum('pending','verified','rejected') DEFAULT 'pending',
	`trust_score` decimal(5,2) DEFAULT '50.00',
	`service_locations` json,
	`approved_content_count` int(11) DEFAULT 0,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `explore_shorts` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`listing_id` int(11),
	`development_id` int(11),
	`agent_id` int(11),
	`developer_id` int(11),
	`agency_id` int(11),
	`content_type` varchar(50) DEFAULT 'property',
	`topic_id` int(11),
	`category_id` int(11),
	`title` varchar(255) NOT NULL,
	`caption` text,
	`primary_media_id` int(11) NOT NULL,
	`media_ids` json NOT NULL,
	`highlights` json,
	`performance_score` decimal(5,2) NOT NULL DEFAULT '0',
	`boost_priority` int(11) NOT NULL DEFAULT 0,
	`view_count` int(11) NOT NULL DEFAULT 0,
	`unique_view_count` int(11) NOT NULL DEFAULT 0,
	`save_count` int(11) NOT NULL DEFAULT 0,
	`share_count` int(11) NOT NULL DEFAULT 0,
	`skip_count` int(11) NOT NULL DEFAULT 0,
	`average_watch_time` int(11) NOT NULL DEFAULT 0,
	`view_through_rate` decimal(5,2) NOT NULL DEFAULT '0',
	`save_rate` decimal(5,2) NOT NULL DEFAULT '0',
	`share_rate` decimal(5,2) NOT NULL DEFAULT '0',
	`skip_rate` decimal(5,2) NOT NULL DEFAULT '0',
	`is_published` tinyint(4) NOT NULL DEFAULT 1,
	`is_featured` tinyint(4) NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`published_at` timestamp
);
--> statement-breakpoint
CREATE TABLE `explore_user_preferences` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`user_id` int(11) NOT NULL,
	`preferred_locations` json,
	`budget_min` int(11),
	`budget_max` int(11),
	`property_types` json,
	`interaction_history` json,
	`saved_properties` json,
	`inferred_preferences` json,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`userId` int(11) NOT NULL,
	`propertyId` int(11) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `founding_partners` (
	`partner_id` varchar(36) NOT NULL,
	`enrollment_date` date NOT NULL,
	`benefits_end_date` date NOT NULL,
	`pre_launch_content_delivered` int(11) DEFAULT 0,
	`weekly_content_delivered` json,
	`warning_count` int(11) DEFAULT 0,
	`status` enum('active','warning','revoked') DEFAULT 'active',
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `hero_campaigns` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`location_type` enum('province','city','suburb') NOT NULL,
	`target_slug` varchar(255) NOT NULL,
	`image_url` varchar(1024) NOT NULL,
	`landing_page_url` varchar(1024),
	`alt_text` varchar(255),
	`start_date` timestamp,
	`end_date` timestamp,
	`is_active` tinyint(4) NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`agencyId` int(11) NOT NULL,
	`invitedBy` int(11) NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` varchar(50) NOT NULL DEFAULT 'agent',
	`token` varchar(255) NOT NULL,
	`status` enum('pending','accepted','expired','cancelled') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`acceptedBy` int(11),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`agencyId` int(11) NOT NULL,
	`email` varchar(255) NOT NULL,
	`token` varchar(255) NOT NULL,
	`role` varchar(30) DEFAULT 'agent',
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`used` int(11) NOT NULL,
	`usedAt` timestamp,
	`usedBy` int(11)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`agencyId` int(11) NOT NULL,
	`subscriptionId` int(11),
	`stripeInvoiceId` varchar(100),
	`stripeCustomerId` varchar(100),
	`amount` int(11) NOT NULL,
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
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `launch_content_quotas` (
	`id` varchar(36) NOT NULL,
	`content_type` varchar(50) NOT NULL,
	`required_count` int(11) NOT NULL,
	`current_count` int(11) DEFAULT 0,
	`last_updated` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `launch_metrics` (
	`id` varchar(36) NOT NULL,
	`metric_date` date NOT NULL,
	`topic_engagement_rate` decimal(5,2),
	`partner_content_watch_rate` decimal(5,2),
	`save_share_rate` decimal(5,2),
	`weekly_visits_per_user` decimal(5,2),
	`algorithm_confidence_score` decimal(5,2),
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `launch_phases` (
	`id` varchar(36) NOT NULL,
	`phase` enum('pre_launch','launch_period','ramp_up','ecosystem_maturity') NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date,
	`primary_content_ratio` decimal(3,2) DEFAULT '0.70',
	`algorithm_weight` decimal(3,2) DEFAULT '0.00',
	`editorial_weight` decimal(3,2) DEFAULT '1.00',
	`is_active` tinyint(1) DEFAULT 0,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `lead_activities` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`leadId` int(11) NOT NULL,
	`agentId` int(11),
	`activityType` enum('call','email','meeting','note','status_change','viewing_scheduled','offer_sent') NOT NULL,
	`description` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`propertyId` int(11),
	`developmentId` int(11),
	`agencyId` int(11),
	`agentId` int(11),
	`name` varchar(200) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`message` text,
	`leadType` enum('inquiry','viewing_request','offer','callback') NOT NULL DEFAULT 'inquiry',
	`status` enum('new','contacted','qualified','converted','closed','viewing_scheduled','offer_sent','lost') NOT NULL DEFAULT 'new',
	`source` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`nextFollowUp` timestamp,
	`lastContactedAt` timestamp,
	`notes` text,
	`affordability_data` json,
	`qualification_status` enum('qualified','partially_qualified','unqualified','pending') DEFAULT 'pending',
	`qualification_score` int(11) DEFAULT 0,
	`lead_source` varchar(100),
	`referrer_url` text,
	`utm_source` varchar(100),
	`utm_medium` varchar(100),
	`utm_campaign` varchar(100),
	`funnel_stage` enum('interest','affordability','qualification','viewing','offer','bond','sale') DEFAULT 'interest',
	`assigned_to` int(11),
	`assigned_at` timestamp,
	`converted_at` timestamp,
	`lost_reason` text,
	`developer_brand_profile_id` int(11),
	`brand_lead_status` enum('captured','delivered_unsubscribed','delivered_subscriber','claimed') DEFAULT 'captured',
	`lead_delivery_method` enum('email','crm_export','manual','none') DEFAULT 'email'
);
--> statement-breakpoint
CREATE TABLE `listing_analytics` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`listingId` int(11) NOT NULL,
	`totalViews` int(11) NOT NULL DEFAULT 0,
	`uniqueVisitors` int(11) NOT NULL DEFAULT 0,
	`viewsByDay` json,
	`totalLeads` int(11) NOT NULL DEFAULT 0,
	`contactFormLeads` int(11) NOT NULL DEFAULT 0,
	`whatsappClicks` int(11) NOT NULL DEFAULT 0,
	`phoneReveals` int(11) NOT NULL DEFAULT 0,
	`bookingViewingRequests` int(11) NOT NULL DEFAULT 0,
	`totalFavorites` int(11) NOT NULL DEFAULT 0,
	`totalShares` int(11) NOT NULL DEFAULT 0,
	`averageTimeOnPage` int(11),
	`trafficSources` json,
	`conversionRate` decimal(5,2),
	`leadConversionRate` decimal(5,2),
	`lastUpdated` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `listing_approval_queue` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`listingId` int(11) NOT NULL,
	`submittedBy` int(11) NOT NULL,
	`submittedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`status` enum('pending','reviewing','approved','rejected') NOT NULL DEFAULT 'pending',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`reviewedBy` int(11),
	`reviewedAt` timestamp,
	`reviewNotes` text,
	`rejectionReason` text,
	`complianceChecks` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `listing_leads` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`listingId` int(11) NOT NULL,
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
	`assignedTo` int(11),
	`assignedAt` timestamp,
	`status` enum('new','contacted','qualified','viewing_scheduled','offer_made','converted','lost') NOT NULL DEFAULT 'new',
	`crmSynced` int(11) DEFAULT 0,
	`crmSyncedAt` timestamp,
	`crmId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `listing_media` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`listingId` int(11) NOT NULL,
	`mediaType` enum('image','video','floorplan','pdf') NOT NULL,
	`originalUrl` text NOT NULL,
	`originalFileName` varchar(255),
	`originalFileSize` int(11),
	`processedUrl` text,
	`thumbnailUrl` text,
	`previewUrl` text,
	`width` int(11),
	`height` int(11),
	`duration` int(11),
	`mimeType` varchar(100),
	`orientation` enum('vertical','horizontal','square'),
	`isVertical` int(11) DEFAULT 0,
	`displayOrder` int(11) NOT NULL DEFAULT 0,
	`isPrimary` int(11) NOT NULL DEFAULT 0,
	`processingStatus` enum('pending','processing','completed','failed') DEFAULT 'pending',
	`processingError` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`uploadedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`processedAt` timestamp
);
--> statement-breakpoint
CREATE TABLE `listing_settings` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`autoPublishForVerifiedAccounts` int(11) NOT NULL DEFAULT 0,
	`maxImagesPerListing` int(11) NOT NULL DEFAULT 30,
	`maxVideosPerListing` int(11) NOT NULL DEFAULT 5,
	`maxFloorplansPerListing` int(11) NOT NULL DEFAULT 5,
	`maxPdfsPerListing` int(11) NOT NULL DEFAULT 3,
	`maxImageSizeMB` int(11) NOT NULL DEFAULT 5,
	`maxVideoSizeMB` int(11) NOT NULL DEFAULT 50,
	`maxVideoDurationSeconds` int(11) NOT NULL DEFAULT 180,
	`videoCompressionEnabled` int(11) NOT NULL DEFAULT 1,
	`videoThumbnailEnabled` int(11) NOT NULL DEFAULT 1,
	`videoPreviewClipSeconds` int(11) NOT NULL DEFAULT 3,
	`crmWebhookUrl` text,
	`crmEnabled` int(11) NOT NULL DEFAULT 0,
	`newListingNotificationsEnabled` int(11) NOT NULL DEFAULT 1,
	`leadNotificationsEnabled` int(11) NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` int(11)
);
--> statement-breakpoint
CREATE TABLE `listing_viewings` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`listingId` int(11) NOT NULL,
	`leadId` int(11),
	`scheduledDate` timestamp NOT NULL,
	`duration` int(11) DEFAULT 30,
	`visitorName` varchar(200) NOT NULL,
	`visitorEmail` varchar(320),
	`visitorPhone` varchar(50),
	`status` enum('requested','confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'requested',
	`agentId` int(11),
	`agentNotes` text,
	`visitorFeedback` text,
	`visitorRating` int(11),
	`reminderSent` int(11) DEFAULT 0,
	`confirmationSent` int(11) DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`ownerId` int(11) NOT NULL,
	`agentId` int(11),
	`agencyId` int(11),
	`action` enum('sell','rent','auction') NOT NULL,
	`propertyType` enum('apartment','house','farm','land','commercial','shared_living') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`askingPrice` decimal(12,2),
	`negotiable` int(11) DEFAULT 0,
	`transferCostEstimate` decimal(12,2),
	`monthlyRent` decimal(12,2),
	`deposit` decimal(12,2),
	`leaseTerms` varchar(100),
	`availableFrom` timestamp,
	`utilitiesIncluded` int(11) DEFAULT 0,
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
	`mainMediaId` int(11),
	`mainMediaType` enum('image','video'),
	`status` enum('draft','pending_review','approved','published','rejected','archived','sold','rented') NOT NULL DEFAULT 'draft',
	`approvalStatus` enum('pending','approved','rejected') DEFAULT 'pending',
	`reviewedBy` int(11),
	`reviewedAt` timestamp,
	`rejectionReason` text,
	`autoPublished` int(11) DEFAULT 0,
	`slug` varchar(255) NOT NULL,
	`readiness_score` int(11) NOT NULL DEFAULT 0,
	`quality_score` int(11) NOT NULL DEFAULT 0,
	`quality_breakdown` json,
	`rejection_reasons` json,
	`rejection_note` text,
	`metaTitle` varchar(255),
	`metaDescription` text,
	`canonicalUrl` text,
	`searchTags` text,
	`featured` int(11) NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`publishedAt` timestamp,
	`archivedAt` timestamp,
	`location_id` int(11)
);
--> statement-breakpoint
CREATE TABLE `location_search_cache` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`searchQuery` varchar(255) NOT NULL,
	`searchType` enum('province','city','suburb','address','all') NOT NULL,
	`resultsJSON` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`expiresAt` timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`type` enum('province','city','suburb','neighborhood') NOT NULL,
	`parentId` int(11),
	`description` text,
	`latitude` varchar(50),
	`longitude` varchar(50),
	`propertyCount` int(11),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`place_id` varchar(255),
	`viewport_ne_lat` decimal(10,8),
	`viewport_ne_lng` decimal(11,8),
	`viewport_sw_lat` decimal(10,8),
	`viewport_sw_lng` decimal(11,8),
	`seo_title` varchar(255),
	`seo_description` text,
	`hero_image` varchar(500)
);
--> statement-breakpoint
CREATE TABLE `market_insights_cache` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`cacheKey` varchar(255) NOT NULL,
	`cacheData` text NOT NULL,
	`cacheType` enum('suburb_heatmap','city_trends','popular_areas','price_predictions','user_recommendations') NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `marketplace_bundles` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`target_audience` varchar(100),
	`is_active` tinyint(1) DEFAULT 1,
	`display_order` int(11) DEFAULT 0,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`userId` int(11) NOT NULL,
	`type` enum('lead_assigned','offer_received','showing_scheduled','system_alert') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`data` text,
	`isRead` int(11) NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `offers` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`propertyId` int(11) NOT NULL,
	`leadId` int(11),
	`agentId` int(11),
	`buyerName` varchar(200) NOT NULL,
	`buyerEmail` varchar(320),
	`buyerPhone` varchar(50),
	`offerAmount` int(11) NOT NULL,
	`status` enum('pending','accepted','rejected','countered','withdrawn') NOT NULL DEFAULT 'pending',
	`conditions` text,
	`expiresAt` timestamp,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
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
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `partner_subscriptions` (
	`id` varchar(36) NOT NULL,
	`partner_id` varchar(36) NOT NULL,
	`tier` enum('free','basic','premium','featured') NOT NULL,
	`price_monthly` decimal(10,2) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date,
	`status` enum('active','cancelled','expired') DEFAULT 'active',
	`features` json NOT NULL,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `partner_tiers` (
	`id` int(11) NOT NULL,
	`name` varchar(100) NOT NULL,
	`allowed_content_types` json NOT NULL,
	`allowed_ctas` json NOT NULL,
	`requires_credentials` tinyint(1) DEFAULT 0,
	`max_monthly_content` int(11) DEFAULT 10,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`agencyId` int(11) NOT NULL,
	`stripePaymentMethodId` varchar(100),
	`type` enum('card','bank_account') NOT NULL DEFAULT 'card',
	`cardBrand` varchar(20),
	`cardLast4` varchar(4),
	`cardExpMonth` int(11),
	`cardExpYear` int(11),
	`bankName` varchar(100),
	`bankLast4` varchar(4),
	`isDefault` int(11) NOT NULL,
	`isActive` int(11) NOT NULL DEFAULT 1,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`displayName` varchar(100) NOT NULL,
	`description` text,
	`price` int(11) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'ZAR',
	`interval` enum('month','year') NOT NULL DEFAULT 'month',
	`stripePriceId` varchar(100),
	`features` text,
	`limits` text,
	`isActive` int(11) NOT NULL DEFAULT 1,
	`isPopular` int(11) NOT NULL,
	`sortOrder` int(11) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`category` enum('pricing','features','notifications','limits','other') NOT NULL DEFAULT 'other',
	`isPublic` int(11) NOT NULL,
	`updatedBy` int(11),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `price_analytics` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`locationId` int(11) NOT NULL,
	`locationType` enum('suburb','city','province') NOT NULL,
	`currentAvgPrice` int(11),
	`currentMedianPrice` int(11),
	`currentMinPrice` int(11),
	`currentMaxPrice` int(11),
	`currentPriceCount` int(11),
	`oneMonthGrowthPercent` int(11),
	`threeMonthGrowthPercent` int(11),
	`sixMonthGrowthPercent` int(11),
	`oneYearGrowthPercent` int(11),
	`luxurySegmentPercent` int(11),
	`midRangePercent` int(11),
	`affordablePercent` int(11),
	`avgDaysOnMarket` int(11),
	`newListingsMonthly` int(11),
	`soldPropertiesMonthly` int(11),
	`trendingDirection` enum('up','down','stable') NOT NULL DEFAULT 'stable',
	`trendConfidence` int(11),
	`totalProperties` int(11),
	`activeListings` int(11),
	`userInteractions` int(11),
	`priceVolatility` int(11),
	`marketMomentum` int(11),
	`investmentScore` int(11),
	`lastUpdated` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`propertyId` int(11) NOT NULL,
	`suburbId` int(11),
	`cityId` int(11),
	`provinceId` int(11),
	`price` int(11) NOT NULL,
	`pricePerSqm` int(11),
	`propertyType` enum('apartment','house','villa','plot','commercial','townhouse','cluster_home','farm','shared_living') NOT NULL,
	`listingType` enum('sale','rent','rent_to_buy','auction','shared_living') NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`source` enum('new_listing','price_change','sold','rented','market_update') NOT NULL DEFAULT 'market_update',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `price_predictions` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`propertyId` int(11),
	`suburbId` int(11),
	`cityId` int(11),
	`provinceId` int(11),
	`predictedPrice` int(11) NOT NULL,
	`predictedPriceRangeMin` int(11),
	`predictedPriceRangeMax` int(11),
	`confidenceScore` int(11),
	`modelVersion` varchar(50),
	`modelFeatures` text,
	`trainingDataSize` int(11),
	`actualPrice` int(11),
	`predictionError` int(11),
	`predictionAccuracy` int(11),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`validatedAt` timestamp
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`propertyType` enum('apartment','house','villa','plot','commercial','townhouse','cluster_home','farm','shared_living') NOT NULL,
	`listingType` enum('sale','rent','rent_to_buy','auction','shared_living') NOT NULL,
	`transactionType` enum('sale','rent','rent_to_buy','auction') NOT NULL DEFAULT 'sale',
	`price` int(11) NOT NULL,
	`bedrooms` int(11),
	`bathrooms` int(11),
	`area` int(11) NOT NULL,
	`address` text NOT NULL,
	`city` varchar(100) NOT NULL,
	`province` varchar(100) NOT NULL,
	`zipCode` varchar(20),
	`latitude` varchar(50),
	`longitude` varchar(50),
	`provinceId` int(11),
	`cityId` int(11),
	`suburbId` int(11),
	`locationText` text,
	`placeId` varchar(255),
	`amenities` text,
	`yearBuilt` int(11),
	`status` enum('available','sold','rented','pending','draft','published','archived') NOT NULL DEFAULT 'available',
	`featured` int(11) NOT NULL,
	`views` int(11) NOT NULL,
	`enquiries` int(11) NOT NULL,
	`agentId` int(11),
	`developmentId` int(11),
	`ownerId` int(11) NOT NULL,
	`propertySettings` text,
	`videoUrl` text,
	`virtualTourUrl` text,
	`levies` int(11),
	`ratesAndTaxes` int(11),
	`mainImage` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`location_id` int(11),
	`developer_brand_profile_id` int(11)
);
--> statement-breakpoint
CREATE TABLE `propertyImages` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`propertyId` int(11) NOT NULL,
	`imageUrl` text NOT NULL,
	`isPrimary` int(11) NOT NULL,
	`displayOrder` int(11) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `property_similarity_index` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`propertyId1` int(11) NOT NULL,
	`propertyId2` int(11) NOT NULL,
	`locationSimilarity` int(11),
	`priceSimilarity` int(11),
	`typeSimilarity` int(11),
	`featureSimilarity` int(11),
	`overallSimilarity` int(11),
	`similarityReason` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `prospect_favorites` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`prospectId` int(11) NOT NULL,
	`propertyId` int(11) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`income` int(11),
	`incomeRange` enum('under_15k','15k_25k','25k_50k','50k_100k','over_100k'),
	`employmentStatus` enum('employed','self_employed','business_owner','student','retired','unemployed'),
	`combinedIncome` int(11),
	`monthlyExpenses` int(11),
	`monthlyDebts` int(11),
	`dependents` int(11),
	`savingsDeposit` int(11),
	`creditScore` int(11),
	`hasCreditConsent` int(11),
	`buyabilityScore` enum('low','medium','high'),
	`affordabilityMin` int(11),
	`affordabilityMax` int(11),
	`monthlyPaymentCapacity` int(11),
	`profileProgress` int(11),
	`badges` text,
	`lastActivity` timestamp,
	`preferredPropertyType` enum('apartment','house','villa','plot','commercial','townhouse','cluster_home','farm','shared_living'),
	`preferredLocation` varchar(100),
	`maxCommuteTime` int(11),
	`ipAddress` varchar(45),
	`userAgent` text,
	`referrer` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `provinces` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(10) NOT NULL,
	`latitude` varchar(20),
	`longitude` varchar(21),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`slug` varchar(100),
	`place_id` varchar(255),
	`seo_title` varchar(255),
	`seo_description` text
);
--> statement-breakpoint
CREATE TABLE `recently_viewed` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`prospectId` int(11) NOT NULL,
	`propertyId` int(11) NOT NULL,
	`viewedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`userId` int(11) NOT NULL,
	`reviewType` enum('agent','developer','property') NOT NULL,
	`targetId` int(11) NOT NULL,
	`rating` int(11) NOT NULL,
	`title` varchar(255),
	`comment` text,
	`isVerified` int(11) NOT NULL,
	`isPublished` int(11) NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `saved_searches` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`userId` int(11) NOT NULL,
	`name` varchar(255) NOT NULL,
	`criteria` json NOT NULL,
	`notificationFrequency` enum('never','daily','weekly') DEFAULT 'never',
	`lastNotifiedAt` timestamp,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `scheduled_viewings` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`prospectId` int(11) NOT NULL,
	`propertyId` int(11) NOT NULL,
	`agentId` int(11),
	`scheduledAt` timestamp NOT NULL,
	`status` enum('scheduled','confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`prospectName` varchar(200),
	`prospectEmail` varchar(320),
	`prospectPhone` varchar(50),
	`notificationSent` int(11),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('home_loan','insurance','interior_design','legal','moving','other') NOT NULL,
	`description` text,
	`logo` text,
	`website` varchar(255),
	`email` varchar(320),
	`phone` varchar(50),
	`commissionRate` int(11),
	`isActive` int(11) NOT NULL DEFAULT 1,
	`isFeatured` int(11) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `showings` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`propertyId` int(11) NOT NULL,
	`leadId` int(11),
	`agentId` int(11),
	`scheduledAt` timestamp NOT NULL,
	`status` enum('requested','confirmed','completed','cancelled') NOT NULL DEFAULT 'requested',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `subscription_events` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`user_id` int(11) NOT NULL,
	`subscription_id` int(11),
	`event_type` enum('trial_started','trial_expiring_soon','trial_expired','subscription_created','subscription_renewed','subscription_upgraded','subscription_downgraded','subscription_cancelled','payment_succeeded','payment_failed','feature_locked','limit_reached') NOT NULL,
	`event_data` json,
	`metadata` json,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`plan_id` varchar(100) NOT NULL,
	`category` enum('agent','agency','developer') NOT NULL,
	`name` varchar(100) NOT NULL,
	`display_name` varchar(150) NOT NULL,
	`description` text,
	`price_zar` int(11) NOT NULL,
	`billing_interval` enum('monthly','yearly') NOT NULL DEFAULT 'monthly',
	`trial_days` int(11) DEFAULT 14,
	`is_trial_plan` tinyint(1) DEFAULT 0,
	`is_free_plan` tinyint(1) DEFAULT 0,
	`priority_level` int(11) DEFAULT 0,
	`sort_order` int(11) DEFAULT 0,
	`is_active` tinyint(1) DEFAULT 1,
	`features` json,
	`limits` json,
	`permissions` json,
	`upgrade_to_plan_id` varchar(100),
	`downgrade_to_plan_id` varchar(100),
	`stripe_price_id` varchar(255),
	`paystack_plan_code` varchar(255),
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `subscription_usage` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`user_id` int(11) NOT NULL,
	`subscription_id` int(11) NOT NULL,
	`period_start` timestamp NOT NULL,
	`period_end` timestamp NOT NULL,
	`listings_created` int(11) DEFAULT 0,
	`projects_created` int(11) DEFAULT 0,
	`agents_added` int(11) DEFAULT 0,
	`boosts_used` int(11) DEFAULT 0,
	`api_calls` int(11) DEFAULT 0,
	`storage_mb` int(11) DEFAULT 0,
	`crm_contacts` int(11) DEFAULT 0,
	`emails_sent` int(11) DEFAULT 0,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `suburb_price_analytics` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`suburbId` int(11) NOT NULL,
	`cityId` int(11) NOT NULL,
	`provinceId` int(11) NOT NULL,
	`currentAvgPrice` int(11),
	`currentMedianPrice` int(11),
	`currentMinPrice` int(11),
	`currentMaxPrice` int(11),
	`currentPriceCount` int(11),
	`lastMonthAvgPrice` int(11),
	`lastMonthMedianPrice` int(11),
	`lastMonthPriceCount` int(11),
	`sixMonthGrowthPercent` int(11),
	`threeMonthGrowthPercent` int(11),
	`oneMonthGrowthPercent` int(11),
	`trendingDirection` enum('up','down','stable') NOT NULL DEFAULT 'stable',
	`trendConfidence` int(11),
	`lastUpdated` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `suburbs` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`cityId` int(11) NOT NULL,
	`name` varchar(200) NOT NULL,
	`latitude` varchar(20),
	`longitude` varchar(21),
	`postalCode` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`slug` varchar(100)
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`icon` varchar(50),
	`display_order` int(11) DEFAULT 0,
	`is_active` tinyint(1) DEFAULT 1,
	`content_tags` json,
	`property_features` json,
	`partner_categories` json,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `unit_types` (
	`id` varchar(36) NOT NULL,
	`development_id` int(11) NOT NULL,
	`name` varchar(255) NOT NULL,
	`bedrooms` int(11) NOT NULL,
	`bathrooms` decimal(3,1) NOT NULL,
	`unit_size` int(11),
	`yard_size` int(11),
	`base_price_from` decimal(15,2) NOT NULL,
	`base_price_to` decimal(15,2),
	`base_features` json,
	`base_finishes` json,
	`base_media` json,
	`display_order` int(11) DEFAULT 0,
	`is_active` tinyint(4) DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`total_units` int(11) NOT NULL DEFAULT 0,
	`available_units` int(11) NOT NULL DEFAULT 0,
	`reserved_units` int(11) DEFAULT 0,
	`transfer_costs_included` tinyint(4) DEFAULT 0,
	`monthly_levy` int(11),
	`monthly_levy_to` int(11),
	`rates_and_taxes_to` int(11),
	`monthly_levy_from` int(11),
	`rates_and_taxes_from` int(11),
	`extras` json,
	`label` varchar(255),
	`ownership_type` enum('full-title','sectional-title','leasehold','life-rights') DEFAULT 'sectional-title',
	`structural_type` enum('apartment','freestanding-house','simplex','duplex','penthouse','plot-and-plan','townhouse','studio') DEFAULT 'apartment',
	`floors` enum('single-storey','double-storey','triplex'),
	`price_from` decimal(15,2),
	`price_to` decimal(15,2),
	`deposit_required` decimal(15,2),
	`completion_date` date,
	`config_description` text,
	`description` text,
	`virtual_tour_link` varchar(500),
	`spec_overrides` json,
	`specifications` json,
	`amenities` json,
	`features` json,
	`parking_type` varchar(50),
	`parking_bays` int(11) DEFAULT 0,
	`internal_notes` text,
	`monthly_rent_from` decimal(15,2),
	`monthly_rent_to` decimal(15,2),
	`lease_term` varchar(100),
	`is_furnished` tinyint(4) DEFAULT 0,
	`starting_bid` decimal(15,2),
	`reserve_price` decimal(15,2),
	`auction_start_date` datetime,
	`auction_end_date` datetime,
	`auction_status` enum('scheduled','active','sold','passed_in','withdrawn') DEFAULT 'scheduled'
);
--> statement-breakpoint
CREATE TABLE `user_behavior_events` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`userId` int(11),
	`sessionId` varchar(255) NOT NULL,
	`eventType` enum('property_view','search','save_property','contact_agent','map_interaction','price_filter','location_filter','property_type_filter') NOT NULL,
	`eventData` text,
	`propertyId` int(11),
	`suburbId` int(11),
	`cityId` int(11),
	`provinceId` int(11),
	`priceRangeMin` int(11),
	`priceRangeMax` int(11),
	`propertyType` varchar(50),
	`listingType` varchar(50),
	`pageUrl` varchar(500),
	`referrer` varchar(500),
	`userAgent` text,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `user_onboarding_state` (
	`user_id` int(11) NOT NULL,
	`is_first_session` tinyint(1) DEFAULT 1,
	`welcome_overlay_shown` tinyint(1) DEFAULT 0,
	`welcome_overlay_dismissed` tinyint(1) DEFAULT 0,
	`suggested_topics` json,
	`tooltips_shown` json,
	`content_view_count` int(11) DEFAULT 0,
	`save_count` int(11) DEFAULT 0,
	`partner_engagement_count` int(11) DEFAULT 0,
	`features_unlocked` json,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`userId` int(11) NOT NULL,
	`preferredPropertyTypes` text,
	`preferredPriceMin` int(11),
	`preferredPriceMax` int(11),
	`preferredBedrooms` int(11),
	`preferredBathrooms` int(11),
	`preferredPropertySize` text,
	`preferredLocations` text,
	`preferredDistance` int(11),
	`preferredProvices` text,
	`preferredCities` text,
	`preferredSuburbs` text,
	`requiredAmenities` text,
	`preferredAmenities` text,
	`propertyFeatures` text,
	`petFriendly` tinyint(1),
	`furnished` enum('unfurnished','semi_furnished','fully_furnished'),
	`alertFrequency` enum('never','instant','daily','weekly') DEFAULT 'daily',
	`emailNotifications` int(11) DEFAULT 1,
	`smsNotifications` int(11),
	`pushNotifications` int(11) DEFAULT 1,
	`isActive` int(11) DEFAULT 1,
	`locationWeight` int(11) DEFAULT 30,
	`priceWeight` int(11) DEFAULT 25,
	`featuresWeight` int(11) DEFAULT 25,
	`sizeWeight` int(11) DEFAULT 20,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`lastUsed` timestamp
);
--> statement-breakpoint
CREATE TABLE `user_recommendations` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`userId` int(11) NOT NULL,
	`preferredSuburbs` text,
	`preferredCities` text,
	`preferredPriceRange` text,
	`preferredPropertyTypes` text,
	`preferredListingTypes` text,
	`recommendedSuburbs` text,
	`recommendedProperties` text,
	`recommendedSimilarUsers` text,
	`recommendationClickCount` int(11),
	`recommendationConversionCount` int(11),
	`lastRecommendationUpdate` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `user_subscriptions` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`user_id` int(11) NOT NULL,
	`plan_id` varchar(100) NOT NULL,
	`status` enum('trial_active','trial_expired','active_paid','past_due','cancelled','downgraded','grace_period') NOT NULL DEFAULT 'trial_active',
	`trial_started_at` timestamp,
	`trial_ends_at` timestamp,
	`trial_used` tinyint(1) DEFAULT 0,
	`current_period_start` timestamp,
	`current_period_end` timestamp,
	`cancelled_at` timestamp,
	`ends_at` timestamp,
	`stripe_subscription_id` varchar(255),
	`stripe_customer_id` varchar(255),
	`paystack_subscription_code` varchar(255),
	`paystack_customer_code` varchar(255),
	`amount_zar` int(11),
	`billing_interval` enum('monthly','yearly'),
	`next_billing_date` timestamp,
	`payment_method_last4` varchar(4),
	`payment_method_type` varchar(50),
	`previous_plan_id` varchar(100),
	`downgrade_scheduled` tinyint(1) DEFAULT 0,
	`downgrade_to_plan_id` varchar(100),
	`downgrade_effective_date` timestamp,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`openId` varchar(64),
	`email` varchar(320),
	`passwordHash` varchar(255),
	`name` text,
	`firstName` varchar(100),
	`lastName` varchar(100),
	`phone` varchar(30),
	`loginMethod` varchar(64),
	`emailVerified` int(11) NOT NULL DEFAULT 0,
	`role` enum('visitor','agent','agency_admin','property_developer','super_admin') NOT NULL DEFAULT 'visitor',
	`agencyId` int(11),
	`isSubaccount` int(11) NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`passwordResetToken` varchar(255),
	`passwordResetTokenExpiresAt` timestamp,
	`emailVerificationToken` varchar(255)
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` int(11) AUTO_INCREMENT NOT NULL,
	`agentId` int(11),
	`propertyId` int(11),
	`developmentId` int(11),
	`videoUrl` text NOT NULL,
	`caption` text,
	`type` enum('listing','content') NOT NULL DEFAULT 'content',
	`duration` int(11),
	`views` int(11) NOT NULL DEFAULT 0,
	`likes` int(11) NOT NULL DEFAULT 0,
	`shares` int(11) NOT NULL DEFAULT 0,
	`isPublished` tinyint(1) NOT NULL DEFAULT 1,
	`isFeatured` int(11) NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `fk_1` FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `fk_2` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_branding` ADD CONSTRAINT `agency_branding_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_join_requests` ADD CONSTRAINT `agency_join_requests_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_join_requests` ADD CONSTRAINT `agency_join_requests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_join_requests` ADD CONSTRAINT `agency_join_requests_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_subscriptions` ADD CONSTRAINT `agency_subscriptions_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_subscriptions` ADD CONSTRAINT `agency_subscriptions_planId_plans_id_fk` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent_coverage_areas` ADD CONSTRAINT `agent_coverage_areas_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent_knowledge` ADD CONSTRAINT `fk_1` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent_memory` ADD CONSTRAINT `fk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent_tasks` ADD CONSTRAINT `fk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agents` ADD CONSTRAINT `agents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agents` ADD CONSTRAINT `agents_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agents` ADD CONSTRAINT `fk_agents_approvedBy` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `amenities` ADD CONSTRAINT `amenities_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` ADD CONSTRAINT `analytics_aggregations_suburbId_suburbs_id_fk` FOREIGN KEY (`suburbId`) REFERENCES `suburbs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` ADD CONSTRAINT `analytics_aggregations_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` ADD CONSTRAINT `analytics_aggregations_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `billing_transactions` ADD CONSTRAINT `fk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boost_campaigns` ADD CONSTRAINT `fk_1` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boost_campaigns` ADD CONSTRAINT `fk_2` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boost_credits` ADD CONSTRAINT `fk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bundle_partners` ADD CONSTRAINT `fk_1` FOREIGN KEY (`bundle_id`) REFERENCES `marketplace_bundles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bundle_partners` ADD CONSTRAINT `fk_2` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cities` ADD CONSTRAINT `cities_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `city_price_analytics` ADD CONSTRAINT `city_price_analytics_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `city_price_analytics` ADD CONSTRAINT `city_price_analytics_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_approval_queue` ADD CONSTRAINT `fk_1` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_topics` ADD CONSTRAINT `fk_1` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_brand_profiles` ADD CONSTRAINT `brand_profiles_linked_dev_fk` FOREIGN KEY (`linked_developer_account_id`) REFERENCES `developers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_brand_profiles` ADD CONSTRAINT `brand_profiles_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_notifications` ADD CONSTRAINT `fk_notifications_developer_id` FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_notifications` ADD CONSTRAINT `fk_notifications_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` ADD CONSTRAINT `fk_1` FOREIGN KEY (`subscription_id`) REFERENCES `developer_subscriptions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` ADD CONSTRAINT `fk_1` FOREIGN KEY (`subscription_id`) REFERENCES `developer_subscriptions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD CONSTRAINT `fk_1` FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD CONSTRAINT `fk_2` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developers` ADD CONSTRAINT `fk_developers_userId` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developers` ADD CONSTRAINT `fk_developers_approvedBy` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developers` ADD CONSTRAINT `fk_developers_rejectedBy` FOREIGN KEY (`rejectedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_approval_queue` ADD CONSTRAINT `fk_1` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_approval_queue` ADD CONSTRAINT `fk_2` FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_approval_queue` ADD CONSTRAINT `fk_3` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_drafts` ADD CONSTRAINT `fk_2` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_drafts` ADD CONSTRAINT `fk_dev_drafts_developer` FOREIGN KEY (`developerId`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `fk_1` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `fk_2` FOREIGN KEY (`source_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `fk_3` FOREIGN KEY (`receiver_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `fk_4` FOREIGN KEY (`fallback_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_phases` ADD CONSTRAINT `fk_1` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_units` ADD CONSTRAINT `fk_1` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_units` ADD CONSTRAINT `fk_2` FOREIGN KEY (`phase_id`) REFERENCES `development_phases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developments` ADD CONSTRAINT `developments_developerId_developers_id_fk` FOREIGN KEY (`developerId`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developments` ADD CONSTRAINT `devs_brand_profile_fk` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developments` ADD CONSTRAINT `developments_developer_brand_profile_id_fk` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developments` ADD CONSTRAINT `developments_marketing_brand_profile_id_fk` FOREIGN KEY (`marketing_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_templates` ADD CONSTRAINT `email_templates_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exploreVideos` ADD CONSTRAINT `exploreVideos_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exploreVideos` ADD CONSTRAINT `exploreVideos_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exploreVideos` ADD CONSTRAINT `exploreVideos_developmentId_developments_id_fk` FOREIGN KEY (`developmentId`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_content` ADD CONSTRAINT `fk_1` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_content` ADD CONSTRAINT `fk_explore_content_agency` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_partners` ADD CONSTRAINT `fk_1` FOREIGN KEY (`tier_id`) REFERENCES `partner_tiers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD CONSTRAINT `fk_explore_shorts_agency` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `founding_partners` ADD CONSTRAINT `fk_1` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE `leads` ADD CONSTRAINT `leads_brand_profile_fk` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_analytics` ADD CONSTRAINT `fk_1` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_approval_queue` ADD CONSTRAINT `fk_1` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_leads` ADD CONSTRAINT `fk_1` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_media` ADD CONSTRAINT `fk_1` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_viewings` ADD CONSTRAINT `fk_1` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `offers` ADD CONSTRAINT `offers_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `offers` ADD CONSTRAINT `offers_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `offers` ADD CONSTRAINT `offers_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `partner_leads` ADD CONSTRAINT `fk_1` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `partner_subscriptions` ADD CONSTRAINT `fk_1` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE `properties` ADD CONSTRAINT `fk_properties_location_id` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `props_brand_profile_fk` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `propertyImages` ADD CONSTRAINT `propertyImages_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_similarity_index` ADD CONSTRAINT `property_similarity_index_propertyId1_properties_id_fk` FOREIGN KEY (`propertyId1`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_similarity_index` ADD CONSTRAINT `property_similarity_index_propertyId2_properties_id_fk` FOREIGN KEY (`propertyId2`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prospect_favorites` ADD CONSTRAINT `prospect_favorites_prospectId_prospects_id_fk` FOREIGN KEY (`prospectId`) REFERENCES `prospects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prospect_favorites` ADD CONSTRAINT `prospect_favorites_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recently_viewed` ADD CONSTRAINT `recently_viewed_prospectId_prospects_id_fk` FOREIGN KEY (`prospectId`) REFERENCES `prospects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recently_viewed` ADD CONSTRAINT `recently_viewed_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_searches` ADD CONSTRAINT `fk_1` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scheduled_viewings` ADD CONSTRAINT `scheduled_viewings_prospectId_prospects_id_fk` FOREIGN KEY (`prospectId`) REFERENCES `prospects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scheduled_viewings` ADD CONSTRAINT `scheduled_viewings_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scheduled_viewings` ADD CONSTRAINT `scheduled_viewings_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `showings` ADD CONSTRAINT `showings_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `showings` ADD CONSTRAINT `showings_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `showings` ADD CONSTRAINT `showings_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_events` ADD CONSTRAINT `fk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_usage` ADD CONSTRAINT `fk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suburb_price_analytics` ADD CONSTRAINT `suburb_price_analytics_suburbId_suburbs_id_fk` FOREIGN KEY (`suburbId`) REFERENCES `suburbs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suburb_price_analytics` ADD CONSTRAINT `suburb_price_analytics_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suburb_price_analytics` ADD CONSTRAINT `suburb_price_analytics_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suburbs` ADD CONSTRAINT `suburbs_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `unit_types` ADD CONSTRAINT `unit_types_development_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_behavior_events` ADD CONSTRAINT `user_behavior_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_behavior_events` ADD CONSTRAINT `user_behavior_events_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_behavior_events` ADD CONSTRAINT `user_behavior_events_suburbId_suburbs_id_fk` FOREIGN KEY (`suburbId`) REFERENCES `suburbs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_behavior_events` ADD CONSTRAINT `user_behavior_events_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_behavior_events` ADD CONSTRAINT `user_behavior_events_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_onboarding_state` ADD CONSTRAINT `fk_user_onboarding_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_recommendations` ADD CONSTRAINT `user_recommendations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_subscriptions` ADD CONSTRAINT `fk_1` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_developmentId_developments_id_fk` FOREIGN KEY (`developmentId`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_activities_developer_id` ON `activities` (`developer_id`);--> statement-breakpoint
CREATE INDEX `idx_activities_activity_type` ON `activities` (`activity_type`);--> statement-breakpoint
CREATE INDEX `idx_activities_created_at` ON `activities` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_activities_related_entity` ON `activities` (`related_entity_type`,`related_entity_id`);--> statement-breakpoint
CREATE INDEX `idx_agent_knowledge_topic` ON `agent_knowledge` (`topic`);--> statement-breakpoint
CREATE INDEX `idx_agent_knowledge_category` ON `agent_knowledge` (`category`);--> statement-breakpoint
CREATE INDEX `idx_agent_knowledge_active` ON `agent_knowledge` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_agent_knowledge_created` ON `agent_knowledge` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_agent_memory_session` ON `agent_memory` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_agent_memory_conversation` ON `agent_memory` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_agent_memory_user` ON `agent_memory` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_agent_memory_created` ON `agent_memory` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_agent_tasks_status` ON `agent_tasks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_agent_tasks_type` ON `agent_tasks` (`task_type`);--> statement-breakpoint
CREATE INDEX `idx_agent_tasks_user` ON `agent_tasks` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_agent_tasks_session` ON `agent_tasks` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_agent_tasks_created` ON `agent_tasks` (`created_at`);--> statement-breakpoint
CREATE INDEX `task_id` ON `agent_tasks` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_amenities_location_id` ON `amenities` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_amenities_type` ON `amenities` (`type`);--> statement-breakpoint
CREATE INDEX `idx_user` ON `billing_transactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `billing_transactions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_boost_status` ON `boost_campaigns` (`status`);--> statement-breakpoint
CREATE INDEX `idx_boost_topic` ON `boost_campaigns` (`topic_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_boost_partner` ON `boost_campaigns` (`partner_id`);--> statement-breakpoint
CREATE INDEX `idx_user` ON `boost_credits` (`user_id`);--> statement-breakpoint
CREATE INDEX `unique_user_credits` ON `boost_credits` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_bundle_category` ON `bundle_partners` (`bundle_id`,`category`);--> statement-breakpoint
CREATE INDEX `idx_city_slug` ON `cities` (`slug`);--> statement-breakpoint
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
CREATE INDEX `idx_dev_drafts_developer_id` ON `development_drafts` (`developerId`);--> statement-breakpoint
CREATE INDEX `idx_dev_drafts_last_modified` ON `development_drafts` (`lastModified`);--> statement-breakpoint
CREATE INDEX `idx_lead_routes_development_id` ON `development_lead_routes` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_lead_routes_source_type` ON `development_lead_routes` (`source_type`);--> statement-breakpoint
CREATE INDEX `idx_lead_routes_lookup` ON `development_lead_routes` (`development_id`,`source_type`,`source_brand_profile_id`);--> statement-breakpoint
CREATE INDEX `idx_development_phases_development_id` ON `development_phases` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_development_phases_status` ON `development_phases` (`status`);--> statement-breakpoint
CREATE INDEX `idx_development_phases_spec_type` ON `development_phases` (`spec_type`);--> statement-breakpoint
CREATE INDEX `unique_unit_per_development` ON `development_units` (`development_id`,`unit_number`);--> statement-breakpoint
CREATE INDEX `idx_units_development_id` ON `development_units` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_units_phase_id` ON `development_units` (`phase_id`);--> statement-breakpoint
CREATE INDEX `idx_units_status` ON `development_units` (`status`);--> statement-breakpoint
CREATE INDEX `idx_units_unit_type` ON `development_units` (`unit_type`);--> statement-breakpoint
CREATE INDEX `idx_units_price` ON `development_units` (`price`);--> statement-breakpoint
CREATE INDEX `idx_developments_slug` ON `developments` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_developments_location` ON `developments` (`latitude`,`longitude`);--> statement-breakpoint
CREATE INDEX `idx_developments_auction_dates` ON `developments` (`auction_start_date`,`auction_end_date`);--> statement-breakpoint
CREATE INDEX `unique_follow` ON `exploreFollows` (`followerId`,`followingId`);--> statement-breakpoint
CREATE INDEX `unique_like` ON `exploreLikes` (`videoId`,`userId`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_type` ON `explore_content` (`content_type`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_creator` ON `explore_content` (`creator_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_location` ON `explore_content` (`location_lat`,`location_lng`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_engagement` ON `explore_content` (`engagement_score`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_active` ON `explore_content` (`is_active`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_creator_type` ON `explore_content` (`creator_type`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_agency_id` ON `explore_content` (`agency_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_agency_active` ON `explore_content` (`agency_id`,`is_active`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_explore_highlight_tags_category` ON `explore_highlight_tags` (`category`);--> statement-breakpoint
CREATE INDEX `idx_explore_highlight_tags_display_order` ON `explore_highlight_tags` (`display_order`);--> statement-breakpoint
CREATE INDEX `tag_key` ON `explore_highlight_tags` (`tag_key`);--> statement-breakpoint
CREATE INDEX `idx_explore_interactions_short_id` ON `explore_interactions` (`short_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_interactions_user_id` ON `explore_interactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_interactions_session_id` ON `explore_interactions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_interactions_type` ON `explore_interactions` (`interaction_type`);--> statement-breakpoint
CREATE INDEX `idx_explore_interactions_timestamp` ON `explore_interactions` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_partner_tier` ON `explore_partners` (`tier_id`);--> statement-breakpoint
CREATE INDEX `idx_partner_verification` ON `explore_partners` (`verification_status`);--> statement-breakpoint
CREATE INDEX `idx_partner_trust` ON `explore_partners` (`trust_score`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_listing_id` ON `explore_shorts` (`listing_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_development_id` ON `explore_shorts` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_agent_id` ON `explore_shorts` (`agent_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_performance_score` ON `explore_shorts` (`performance_score`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_boost_priority` ON `explore_shorts` (`boost_priority`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_published` ON `explore_shorts` (`is_published`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_content_type` ON `explore_shorts` (`content_type`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_topic_id` ON `explore_shorts` (`topic_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_category_id` ON `explore_shorts` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_agency_id` ON `explore_shorts` (`agency_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_agency_published` ON `explore_shorts` (`agency_id`,`is_published`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_agency_performance` ON `explore_shorts` (`agency_id`,`performance_score`,`view_count`);--> statement-breakpoint
CREATE INDEX `user_id` ON `explore_user_preferences` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_hero_campaigns_slug` ON `hero_campaigns` (`target_slug`);--> statement-breakpoint
CREATE INDEX `idx_hero_campaigns_active` ON `hero_campaigns` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_hero_campaigns_dates` ON `hero_campaigns` (`start_date`,`end_date`);--> statement-breakpoint
CREATE INDEX `idx_quota_type` ON `launch_content_quotas` (`content_type`);--> statement-breakpoint
CREATE INDEX `idx_metrics_date` ON `launch_metrics` (`metric_date`);--> statement-breakpoint
CREATE INDEX `idx_leads_qualification_status` ON `leads` (`qualification_status`);--> statement-breakpoint
CREATE INDEX `idx_leads_funnel_stage` ON `leads` (`funnel_stage`);--> statement-breakpoint
CREATE INDEX `idx_leads_assigned_to` ON `leads` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `idx_leads_lead_source` ON `leads` (`lead_source`);--> statement-breakpoint
CREATE INDEX `idx_listings_place_id` ON `listings` (`placeId`);--> statement-breakpoint
CREATE INDEX `idx_listings_location_id` ON `listings` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_locations_place_id` ON `locations` (`place_id`);--> statement-breakpoint
CREATE INDEX `slug` ON `marketplace_bundles` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_lead_partner` ON `partner_leads` (`partner_id`);--> statement-breakpoint
CREATE INDEX `idx_lead_status` ON `partner_leads` (`status`);--> statement-breakpoint
CREATE INDEX `idx_lead_type` ON `partner_leads` (`type`);--> statement-breakpoint
CREATE INDEX `idx_subscription_partner` ON `partner_subscriptions` (`partner_id`);--> statement-breakpoint
CREATE INDEX `idx_subscription_status` ON `partner_subscriptions` (`status`);--> statement-breakpoint
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
CREATE INDEX `idx_properties_cityId_status` ON `properties` (`cityId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_properties_cityId_area` ON `properties` (`cityId`,`area`);--> statement-breakpoint
CREATE INDEX `idx_properties_location_id` ON `properties` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_province_slug` ON `provinces` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_user` ON `subscription_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_event_type` ON `subscription_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_category` ON `subscription_plans` (`category`);--> statement-breakpoint
CREATE INDEX `idx_active` ON `subscription_plans` (`is_active`);--> statement-breakpoint
CREATE INDEX `plan_id` ON `subscription_plans` (`plan_id`);--> statement-breakpoint
CREATE INDEX `idx_user_period` ON `subscription_usage` (`user_id`,`period_start`,`period_end`);--> statement-breakpoint
CREATE INDEX `idx_suburb_slug` ON `suburbs` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_topic_slug` ON `topics` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_topic_active` ON `topics` (`is_active`,`display_order`);--> statement-breakpoint
CREATE INDEX `slug` ON `topics` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_unit_types_development_id` ON `unit_types` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_unit_types_price_range` ON `unit_types` (`base_price_from`,`base_price_to`);--> statement-breakpoint
CREATE INDEX `idx_unit_types_bedrooms_bathrooms` ON `unit_types` (`bedrooms`,`bathrooms`);--> statement-breakpoint
CREATE INDEX `idx_unit_types_display_order` ON `unit_types` (`display_order`);--> statement-breakpoint
CREATE INDEX `idx_unit_types_auction_status` ON `unit_types` (`auction_status`);--> statement-breakpoint
CREATE INDEX `idx_user` ON `user_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `user_subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `unique_user_subscription` ON `user_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE ALGORITHM = undefined
SQL SECURITY definer
VIEW `price_facts` AS (SELECT 1 AS `sourceType`,1 AS `sourceId`,1 AS `developmentId`,1 AS `province`,1 AS `created_at`,1 AS `locationId`,1 AS `cityLocationId`,1 AS `suburbLocationId`,1 AS `priceAmount`,1 AS `areaM2`,1 AS `offerKind`,1 AS `isActive`)
WITH cascaded CHECK OPTION;
*/