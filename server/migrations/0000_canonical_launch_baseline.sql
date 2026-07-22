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
	CONSTRAINT `email_templates_id` PRIMARY KEY(`id`)
);

CREATE TABLE `managerial_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actor_user_id` int NOT NULL,
	`action` varchar(120) NOT NULL,
	`target_type` varchar(80) NOT NULL,
	`target_id` int NOT NULL,
	`before_data` json,
	`after_data` json,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `managerial_audit_logs_id` PRIMARY KEY(`id`)
);

CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('lead_assigned','offer_received','showing_scheduled','system_alert') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`data` text,
	`isRead` int NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);

CREATE TABLE `platform_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`setting_key` varchar(100) NOT NULL,
	`setting_value` text NOT NULL,
	`description` text,
	`category` enum('pricing','features','notifications','limits','other') NOT NULL DEFAULT 'other',
	`isPublic` int NOT NULL,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_settings_id` PRIMARY KEY(`id`)
);

CREATE TABLE `user_onboarding_state` (
	`user_id` int NOT NULL,
	`is_first_session` tinyint DEFAULT 1,
	`welcome_overlay_shown` tinyint DEFAULT 0,
	`welcome_overlay_dismissed` tinyint DEFAULT 0,
	`suggested_topics` json,
	`tooltips_shown` json,
	`content_view_count` int DEFAULT 0,
	`save_count` int DEFAULT 0,
	`partner_engagement_count` int DEFAULT 0,
	`features_unlocked` json,
	`consumer_dashboard_preferences` json,
	`seller_planning_inputs` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);

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
	`role` enum('visitor','agent','agency_admin','property_developer','service_provider','super_admin') NOT NULL DEFAULT 'visitor',
	`plan` enum('trial','paid') NOT NULL DEFAULT 'trial',
	`trialStatus` enum('active','expired') NOT NULL DEFAULT 'active',
	`trialStartedAt` timestamp,
	`trialEndsAt` timestamp,
	`onboarding_complete` tinyint NOT NULL DEFAULT 0,
	`onboarding_step` int NOT NULL DEFAULT 0,
	`subscription_tier` enum('free','starter','professional','elite') NOT NULL DEFAULT 'free',
	`subscription_status` enum('trial','active','expired','cancelled') NOT NULL DEFAULT 'trial',
	`agencyId` int,
	`isSubaccount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	`passwordResetToken` varchar(255),
	`passwordResetTokenExpiresAt` timestamp,
	`emailVerificationToken` varchar(255),
	CONSTRAINT `users_id` PRIMARY KEY(`id`)
);

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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agencies_id` PRIMARY KEY(`id`)
);

CREATE TABLE `agency_agent_memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`agent_id` int NOT NULL,
	`status` enum('invited','active','suspended','left') NOT NULL DEFAULT 'invited',
	`governance_mode` enum('affiliated','managed') NOT NULL DEFAULT 'affiliated',
	`role` enum('agent','team_lead','manager') NOT NULL DEFAULT 'agent',
	`permissions_overrides` json,
	`effective_from` timestamp,
	`effective_to` timestamp,
	`created_by` int,
	`updated_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agency_agent_memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_agency_agent_memberships_pair` UNIQUE(`agency_id`,`agent_id`)
);

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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agency_branding_id` PRIMARY KEY(`id`)
);

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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agency_subscriptions_id` PRIMARY KEY(`id`)
);

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

CREATE TABLE `agent_knowledge` (
	`id` int AUTO_INCREMENT NOT NULL,
	`topic` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(100),
	`tags` json,
	`metadata` json,
	`is_active` int NOT NULL DEFAULT 1,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_knowledge_id` PRIMARY KEY(`id`)
);

CREATE TABLE `agent_memory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` varchar(100) NOT NULL,
	`conversation_id` varchar(100),
	`user_id` int,
	`user_input` text NOT NULL,
	`agent_response` text NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_memory_id` PRIMARY KEY(`id`)
);

CREATE TABLE `agent_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_id` varchar(100) NOT NULL,
	`session_id` varchar(100),
	`user_id` int,
	`task_type` varchar(50) NOT NULL,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`owner_type` enum('agent','agency') NOT NULL DEFAULT 'agent',
	`owner_id` int,
	`assigned_agent_id` int,
	`visibility_scope` enum('private','team','agency') NOT NULL DEFAULT 'private',
	`priority` int NOT NULL DEFAULT 0,
	`input_data` json,
	`output_data` json,
	`error_message` text,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_tasks_id` PRIMARY KEY(`id`)
);

CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`agencyId` int,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`displayName` varchar(200),
	`slug` varchar(200),
	`bio` text,
	`profileImage` text,
	`phone` varchar(50),
	`email` varchar(320),
	`whatsapp` varchar(50),
	`specialization` text,
	`focus` enum('sales','rentals','both'),
	`propertyTypes` text,
	`socialLinks` text,
	`role` enum('agent','principal_agent','broker') NOT NULL DEFAULT 'agent',
	`licenseNumber` varchar(100),
	`yearsExperience` int,
	`areasServed` text,
	`languages` text,
	`profileCompletionScore` int NOT NULL DEFAULT 0,
	`profileCompletionFlags` text,
	`rating` int,
	`reviewCount` int,
	`totalSales` int,
	`isVerified` int NOT NULL,
	`isFeatured` int NOT NULL,
	`status` enum('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
	`rejectionReason` text,
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_agents_slug` UNIQUE(`slug`)
);

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
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`)
);

CREATE TABLE `invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`email` varchar(255) NOT NULL,
	`token` varchar(255) NOT NULL,
	`role` varchar(30) DEFAULT 'agent',
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`used` int NOT NULL,
	`usedAt` timestamp,
	`usedBy` int,
	CONSTRAINT `invites_id` PRIMARY KEY(`id`)
);

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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `amenities_id` PRIMARY KEY(`id`)
);

CREATE TABLE `cities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provinceId` int NOT NULL,
	`name` varchar(150) NOT NULL,
	`latitude` varchar(20),
	`longitude` varchar(21),
	`isMetro` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`slug` varchar(100),
	`place_id` varchar(255),
	`seo_title` varchar(255),
	`seo_description` text,
	CONSTRAINT `cities_id` PRIMARY KEY(`id`)
);

CREATE TABLE `location_search_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`searchQuery` varchar(255) NOT NULL,
	`searchType` enum('province','city','suburb','address','all') NOT NULL,
	`resultsJSON` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `location_search_cache_id` PRIMARY KEY(`id`)
);

CREATE TABLE `locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`type` enum('province','city','suburb','neighborhood') NOT NULL,
	`parentId` int,
	`description` text,
	`latitude` varchar(50),
	`longitude` varchar(50),
	`propertyCount` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`place_id` varchar(255),
	`viewport_ne_lat` decimal(10,8),
	`viewport_ne_lng` decimal(11,8),
	`viewport_sw_lat` decimal(10,8),
	`viewport_sw_lng` decimal(11,8),
	`seo_title` varchar(255),
	`seo_description` text,
	`hero_image` varchar(500),
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);

CREATE TABLE `provinces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(10) NOT NULL,
	`latitude` varchar(20),
	`longitude` varchar(21),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`slug` varchar(100),
	`place_id` varchar(255),
	`seo_title` varchar(255),
	`seo_description` text,
	CONSTRAINT `provinces_id` PRIMARY KEY(`id`)
);

CREATE TABLE `suburbs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cityId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`latitude` varchar(20),
	`longitude` varchar(21),
	`postalCode` varchar(10),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`slug` varchar(100),
	CONSTRAINT `suburbs_id` PRIMARY KEY(`id`)
);

CREATE TABLE `google_places_api_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alert_type` enum('usage_threshold','error_rate','cost_threshold','response_time') NOT NULL,
	`threshold_value` decimal(10,2) NOT NULL,
	`current_value` decimal(10,2) NOT NULL,
	`triggered_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`resolved_at` timestamp,
	`severity` enum('info','warning','critical') NOT NULL DEFAULT 'warning',
	`message` text NOT NULL,
	`notified` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `google_places_api_alerts_id` PRIMARY KEY(`id`)
);

CREATE TABLE `google_places_api_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_key` varchar(100) NOT NULL,
	`config_value` text NOT NULL,
	`description` text,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `google_places_api_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `google_places_api_config_key_uq` UNIQUE(`config_key`)
);

CREATE TABLE `google_places_api_daily_summary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`total_requests` int NOT NULL DEFAULT 0,
	`successful_requests` int NOT NULL DEFAULT 0,
	`failed_requests` int NOT NULL DEFAULT 0,
	`autocomplete_requests` int NOT NULL DEFAULT 0,
	`place_details_requests` int NOT NULL DEFAULT 0,
	`geocode_requests` int NOT NULL DEFAULT 0,
	`reverse_geocode_requests` int NOT NULL DEFAULT 0,
	`average_response_time_ms` decimal(10,2),
	`total_cost_usd` decimal(10,4),
	CONSTRAINT `google_places_api_daily_summary_id` PRIMARY KEY(`id`),
	CONSTRAINT `google_places_api_daily_summary_date_uq` UNIQUE(`date`)
);

CREATE TABLE `google_places_api_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`request_type` enum('autocomplete','place_details','geocode','reverse_geocode') NOT NULL,
	`session_token` varchar(255),
	`success` tinyint NOT NULL DEFAULT 1,
	`response_time_ms` int NOT NULL,
	`error_message` text,
	`user_id` int,
	`ip_address` varchar(45),
	CONSTRAINT `google_places_api_logs_id` PRIMARY KEY(`id`)
);

CREATE TABLE `billing_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_type` varchar(40) NOT NULL,
	`owner_id` int NOT NULL,
	`subscription_id` int,
	`invoice_id` int,
	`payment_id` int,
	`actor_user_id` int,
	`event_type` varchar(120) NOT NULL,
	`message` text,
	`before_data` json,
	`after_data` json,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `billing_audit_events_id` PRIMARY KEY(`id`)
);

CREATE TABLE `billing_invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_type` varchar(40) NOT NULL,
	`owner_id` int NOT NULL,
	`subscription_id` int,
	`plan_id` int,
	`invoice_number` varchar(64) NOT NULL,
	`payment_reference` varchar(64) NOT NULL,
	`status` enum('draft','issued','submitted','paid','partially_paid','overdue','void') NOT NULL DEFAULT 'issued',
	`billing_cycle` enum('monthly','annual') NOT NULL DEFAULT 'monthly',
	`amount_due` int NOT NULL,
	`amount_paid` int NOT NULL DEFAULT 0,
	`discount_amount` int NOT NULL DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT 'ZAR',
	`issued_at` timestamp NOT NULL DEFAULT (now()),
	`due_at` timestamp,
	`period_start` timestamp,
	`period_end` timestamp,
	`paid_at` timestamp,
	`voided_at` timestamp,
	`line_items` json,
	`metadata` json,
	`created_by` int,
	`updated_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `billing_invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_billing_invoices_invoice_number` UNIQUE(`invoice_number`),
	CONSTRAINT `uq_billing_invoices_payment_reference` UNIQUE(`payment_reference`)
);

CREATE TABLE `billing_payment_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payment_id` int NOT NULL,
	`invoice_id` int NOT NULL,
	`owner_type` varchar(40) NOT NULL,
	`owner_id` int NOT NULL,
	`storage_key` varchar(512) NOT NULL,
	`original_file_name` varchar(255) NOT NULL,
	`mime_type` varchar(120) NOT NULL,
	`file_size_bytes` int NOT NULL,
	`sha256_hash` varchar(64) NOT NULL,
	`visibility` enum('private') NOT NULL DEFAULT 'private',
	`status` enum('active','deleted') NOT NULL DEFAULT 'active',
	`uploaded_by` int,
	`uploaded_at` timestamp NOT NULL DEFAULT (now()),
	`metadata` json,
	CONSTRAINT `billing_payment_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_billing_payment_documents_storage_key` UNIQUE(`storage_key`)
);

CREATE TABLE `billing_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoice_id` int NOT NULL,
	`subscription_id` int,
	`owner_type` varchar(40) NOT NULL,
	`owner_id` int NOT NULL,
	`payment_method` enum('manual_eft','manual_adjustment','other') NOT NULL DEFAULT 'manual_eft',
	`state` enum('submitted','under_review','verified','rejected','reversed','refunded') NOT NULL DEFAULT 'submitted',
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'ZAR',
	`payment_reference` varchar(64) NOT NULL,
	`bank_reference` varchar(120),
	`payer_name` varchar(160),
	`payment_date` timestamp,
	`submitted_by` int,
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`rejection_reason` text,
	`review_note` text,
	`idempotency_key` varchar(120) NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `billing_payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_billing_payments_idempotency` UNIQUE(`idempotency_key`)
);

CREATE TABLE `billing_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`subscription_id` int,
	`transaction_type` enum('subscription_create','subscription_renew','upgrade','downgrade','addon_purchase','refund','failed_payment','trial_conversion') NOT NULL,
	`amount_zar` int NOT NULL,
	`currency` varchar(3) DEFAULT 'ZAR',
	`status` enum('pending','completed','failed','refunded') DEFAULT 'pending',
	`payment_gateway` enum('stripe','paystack','manual') NOT NULL,
	`gateway_transaction_id` varchar(255),
	`gateway_invoice_id` varchar(255),
	`description` text,
	`metadata` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `billing_transactions_id` PRIMARY KEY(`id`)
);

CREATE TABLE `boost_credits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`total_credits` int DEFAULT 0,
	`used_credits` int DEFAULT 0,
	`reset_at` timestamp,
	`expires_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `boost_credits_id` PRIMARY KEY(`id`)
);

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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`)
);

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
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);

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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_methods_id` PRIMARY KEY(`id`)
);

CREATE TABLE `plan_entitlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plan_id` int NOT NULL,
	`feature_key` varchar(120) NOT NULL,
	`value_json` json NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plan_entitlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_plan_entitlements_plan_feature` UNIQUE(`plan_id`,`feature_key`)
);

CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`displayName` varchar(100) NOT NULL,
	`description` text,
	`segment` enum('agent','agency','enterprise','developer') NOT NULL DEFAULT 'agent',
	`price` int NOT NULL,
	`price_monthly` int NOT NULL DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT 'ZAR',
	`interval` enum('month','year') NOT NULL DEFAULT 'month',
	`trial_days` int NOT NULL DEFAULT 14,
	`metadata` json,
	`stripePriceId` varchar(100),
	`features` text,
	`limits` text,
	`isActive` int NOT NULL DEFAULT 1,
	`isPopular` int NOT NULL,
	`sortOrder` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`)
);

CREATE TABLE `subscription_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`subscription_id` int,
	`event_type` enum('trial_started','trial_expiring_soon','trial_expired','subscription_created','subscription_renewed','subscription_upgraded','subscription_downgraded','subscription_cancelled','payment_succeeded','payment_failed','feature_locked','limit_reached') NOT NULL,
	`event_data` json,
	`metadata` json,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `subscription_events_id` PRIMARY KEY(`id`)
);

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
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`)
);

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
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_usage_id` PRIMARY KEY(`id`)
);

CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_type` enum('agent','agency','developer') NOT NULL,
	`owner_id` int NOT NULL,
	`plan_id` int,
	`status` enum('trial','pending_payment','payment_under_review','active','past_due','grace_period','suspended','cancelled','expired') NOT NULL DEFAULT 'trial',
	`trial_ends_at` timestamp,
	`current_period_start` timestamp,
	`current_period_end` timestamp,
	`grace_ends_at` timestamp,
	`cancel_at_period_end` tinyint NOT NULL DEFAULT 0,
	`cancelled_at` timestamp,
	`billing_cycle_anchor` timestamp,
	`metadata` json,
	`created_by` int,
	`updated_by` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_subscriptions_owner` UNIQUE(`owner_type`,`owner_id`)
);

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
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_subscriptions_id` PRIMARY KEY(`id`)
);

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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `listing_analytics_id` PRIMARY KEY(`id`)
);

CREATE TABLE `listing_approval_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`submittedBy` int NOT NULL,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`status` enum('pending','reviewing','approved','rejected') NOT NULL DEFAULT 'pending',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`reviewNotes` text,
	`rejectionReason` text,
	`complianceChecks` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `listing_approval_queue_id` PRIMARY KEY(`id`)
);

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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `listing_leads_id` PRIMARY KEY(`id`)
);

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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `listing_media_id` PRIMARY KEY(`id`)
);

CREATE TABLE `listing_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`autoPublishForVerifiedAccounts` int NOT NULL DEFAULT 0,
	`maxImagesPerListing` int NOT NULL DEFAULT 30,
	`maxVideosPerListing` int NOT NULL DEFAULT 5,
	`maxFloorplansPerListing` int NOT NULL DEFAULT 5,
	`maxPdfsPerListing` int NOT NULL DEFAULT 3,
	`maxImageSizeMB` int NOT NULL DEFAULT 5,
	`maxVideoSizeMB` int NOT NULL DEFAULT 50,
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `listing_viewings_id` PRIMARY KEY(`id`)
);

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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`publishedAt` timestamp,
	`archivedAt` timestamp,
	`location_id` int,
	`revision_of_listing_id` int,
	CONSTRAINT `listings_id` PRIMARY KEY(`id`)
);

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
	`featured` int NOT NULL,
	`views` int NOT NULL,
	`enquiries` int NOT NULL,
	`agentId` int,
	`developmentId` int,
	`ownerId` int NOT NULL,
	`sourceListingId` int,
	`propertySettings` text,
	`videoUrl` text,
	`virtualTourUrl` text,
	`levies` int,
	`ratesAndTaxes` int,
	`mainImage` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`location_id` int,
	`developer_brand_profile_id` int,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);

CREATE TABLE `propertyImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`isPrimary` int NOT NULL,
	`displayOrder` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `propertyImages_id` PRIMARY KEY(`id`)
);

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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `property_similarity_index_id` PRIMARY KEY(`id`)
);

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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`identity_type` enum('developer','marketing_agency','hybrid') NOT NULL DEFAULT 'developer',
	`seed_batch_id` varchar(36),
	CONSTRAINT `developer_brand_profiles_id` PRIMARY KEY(`id`)
);

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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `developer_notifications_id` PRIMARY KEY(`id`)
);

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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `developer_subscription_limits_id` PRIMARY KEY(`id`)
);

CREATE TABLE `developer_subscription_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscription_id` int NOT NULL,
	`developments_count` int NOT NULL DEFAULT 0,
	`leads_this_month` int NOT NULL DEFAULT 0,
	`team_members_count` int NOT NULL DEFAULT 0,
	`last_reset_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `developer_subscription_usage_id` PRIMARY KEY(`id`)
);

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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `developer_subscriptions_id` PRIMARY KEY(`id`)
);

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
	`trackRecord` text,
	`pastProjects` int DEFAULT 0,
	`totalProjects` int,
	`rating` decimal(3,2) DEFAULT '0.00',
	`reviewCount` int DEFAULT 0,
	`isVerified` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`userId` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`rejectionReason` text,
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectedBy` int,
	`rejectedAt` timestamp,
	`completedProjects` int DEFAULT 0,
	`currentProjects` int DEFAULT 0,
	`upcomingProjects` int DEFAULT 0,
	`specializations` json,
	`kpiCache` json,
	`lastKpiCalculation` timestamp,
	`slug` varchar(255),
	`is_trusted` tinyint NOT NULL DEFAULT 0,
	CONSTRAINT `developers_id` PRIMARY KEY(`id`)
);

CREATE TABLE `development_approval_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`development_id` int NOT NULL,
	`submitted_by` int NOT NULL,
	`status` enum('pending','reviewing','approved','rejected','changes_requested') NOT NULL DEFAULT 'pending',
	`submission_type` enum('initial','update') NOT NULL DEFAULT 'initial',
	`review_notes` text,
	`rejection_reason` text,
	`compliance_checks` json,
	`submitted_at` timestamp NOT NULL DEFAULT (now()),
	`reviewed_at` timestamp,
	`reviewed_by` int,
	CONSTRAINT `development_approval_queue_id` PRIMARY KEY(`id`)
);

CREATE TABLE `development_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`developerId` int,
	`draftName` varchar(255),
	`draftData` json NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`currentStep` int NOT NULL DEFAULT 0,
	`lastModified` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`developer_brand_profile_id` int,
	CONSTRAINT `development_drafts_id` PRIMARY KEY(`id`)
);

CREATE TABLE `development_lead_routes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`development_id` int NOT NULL,
	`source_type` enum('developer_profile','agency_profile','development_page','campaign') NOT NULL,
	`source_brand_profile_id` int,
	`receiver_brand_profile_id` int NOT NULL,
	`fallback_brand_profile_id` int,
	`priority` int NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `development_lead_routes_id` PRIMARY KEY(`id`)
);

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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`spec_type` enum('affordable','gap','luxury','custom') DEFAULT 'affordable',
	`custom_spec_type` varchar(100),
	`finishing_differences` json,
	`phase_highlights` json,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	CONSTRAINT `development_phases_id` PRIMARY KEY(`id`)
);

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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `development_units_id` PRIMARY KEY(`id`)
);

CREATE TABLE `developments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`developer_id` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`developmentType` enum('residential','commercial','mixed_use','land') NOT NULL,
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
	`slug` varchar(255),
	`isPublished` tinyint NOT NULL DEFAULT 0,
	`publishedAt` timestamp,
	`showHouseAddress` tinyint NOT NULL DEFAULT 1,
	`floorPlans` text,
	`brochures` text,
	`rating` decimal(3,2),
	`suburb` varchar(100),
	`location_id` int,
	`postal_code` varchar(20),
	`gps_accuracy` enum('accurate','approximate') DEFAULT 'approximate',
	`highlights` json,
	`features` json,
	`inquiries_count` int DEFAULT 0,
	`demand_score` int DEFAULT 0,
	`is_hot_selling` int DEFAULT 0,
	`is_high_demand` int DEFAULT 0,
	`approval_status` enum('draft','pending','approved','rejected') DEFAULT 'draft',
	`readiness_score` int NOT NULL DEFAULT 0,
	`rejection_reasons` json,
	`rejection_note` text,
	`developer_brand_profile_id` int,
	`dev_owner_type` enum('platform','developer') DEFAULT 'developer',
	`is_showcase` tinyint DEFAULT 0,
	`marketing_brand_profile_id` int,
	`marketing_role` enum('exclusive','joint','open'),
	`tagline` varchar(255),
	`marketing_name` varchar(255),
	`monthly_levy_to` decimal(10,2),
	`rates_to` decimal(10,2),
	`monthly_levy_from` decimal(10,2),
	`rates_from` decimal(10,2),
	`transfer_costs_included` tinyint DEFAULT 0,
	`estateSpecs` json,
	`custom_classification` varchar(255),
	`nature` enum('new','phase','extension','redevelopment') NOT NULL DEFAULT 'new',
	`total_development_area` int,
	`property_types` json,
	`status` enum('launching-soon','selling','sold-out') NOT NULL DEFAULT 'launching-soon',
	`legacy_status` enum('planning','under_construction','completed','coming_soon','now-selling','launching-soon','ready-to-move','sold-out','phase-completed','new-phase-launching','pre_launch','ready'),
	`construction_phase` enum('planning','under_construction','completed','phase_completed'),
	`subtitle` varchar(255),
	`meta_title` varchar(255),
	`meta_description` text,
	`ownership_type` varchar(255),
	`structural_type` varchar(255),
	`floors` int,
	`transaction_type` enum('for_sale','for_rent','auction') NOT NULL DEFAULT 'for_sale',
	`monthly_rent_from` decimal(15,2),
	`monthly_rent_to` decimal(15,2),
	`auction_start_date` datetime,
	`auction_end_date` datetime,
	`starting_bid_from` decimal(15,2),
	`reserve_price_from` decimal(15,2),
	CONSTRAINT `developments_id` PRIMARY KEY(`id`)
);

CREATE TABLE `unit_types` (
	`id` varchar(36) NOT NULL,
	`development_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`bedrooms` int NOT NULL,
	`bathrooms` decimal(3,1) NOT NULL,
	`unit_size` int,
	`yard_size` int,
	`base_price_from` decimal(15,2) NOT NULL,
	`base_price_to` decimal(15,2),
	`base_features` json,
	`base_finishes` json,
	`base_media` json,
	`display_order` int DEFAULT 0,
	`is_active` tinyint DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`total_units` int NOT NULL DEFAULT 0,
	`available_units` int NOT NULL DEFAULT 0,
	`reserved_units` int DEFAULT 0,
	`transfer_costs_included` tinyint DEFAULT 0,
	`monthly_levy` int,
	`monthly_levy_to` int,
	`rates_and_taxes_to` int,
	`monthly_levy_from` int,
	`rates_and_taxes_from` int,
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
	`parking_bays` int DEFAULT 0,
	`internal_notes` text,
	`monthly_rent_from` decimal(15,2),
	`monthly_rent_to` decimal(15,2),
	`lease_term` varchar(100),
	`is_furnished` tinyint DEFAULT 0,
	`starting_bid` decimal(15,2),
	`reserve_price` decimal(15,2),
	`auction_start_date` datetime,
	`auction_end_date` datetime,
	`auction_status` enum('scheduled','active','sold','passed_in','withdrawn') DEFAULT 'scheduled',
	CONSTRAINT `unit_types_id` PRIMARY KEY(`id`)
);

CREATE TABLE `video_likes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`video_id` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `video_likes_id` PRIMARY KEY(`id`)
);

CREATE TABLE `videos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`listingId` int,
	`developmentId` int,
	`agencyId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`url` text NOT NULL,
	`thumbnailUrl` text,
	`duration` int,
	`views` int NOT NULL DEFAULT 0,
	`likes` int NOT NULL DEFAULT 0,
	`shares` int NOT NULL DEFAULT 0,
	`status` enum('processing','ready','failed') NOT NULL DEFAULT 'processing',
	`muxPlaybackId` varchar(100),
	`muxAssetId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`category` enum('property_tour','neighborhood_guide','market_update','agent_intro','lifestyle','development_showcase'),
	`tags` json,
	`is_featured` tinyint DEFAULT 0,
	`transcription` text,
	`ai_summary` text,
	`location_label` varchar(255),
	`quality_score` int,
	CONSTRAINT `videos_id` PRIMARY KEY(`id`)
);

CREATE TABLE `content_topics` (
	`content_id` varchar(36) NOT NULL,
	`topic_id` varchar(36) NOT NULL,
	`relevance_score` decimal(5,2) DEFAULT '1.00',
	`created_at` timestamp DEFAULT (now())
);

CREATE TABLE `explore_content` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content_type` varchar(50) NOT NULL,
	`reference_id` int NOT NULL,
	`creator_id` int,
	`creator_type` enum('user','agent','developer','agency') NOT NULL DEFAULT 'user',
	`agency_id` int,
	`partner_id` varchar(36),
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
	`engagement_score` decimal(5,2) DEFAULT '0.00',
	`is_active` tinyint DEFAULT 1,
	`is_featured` tinyint DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `explore_content_id` PRIMARY KEY(`id`)
);

CREATE TABLE `explore_discovery_videos` (
	`id` varchar(36) NOT NULL,
	`explore_content_id` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()),
	CONSTRAINT `explore_discovery_videos_id` PRIMARY KEY(`id`)
);

CREATE TABLE `explore_engagements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content_id` int NOT NULL,
	`user_id` int,
	`session_id` varchar(128),
	`interaction_type` enum('impression','view','skip','save','share','like','comment','complete','contact','whatsapp','book_viewing','click_cta') NOT NULL,
	`metadata` json,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `explore_engagements_id` PRIMARY KEY(`id`)
);

CREATE TABLE `explore_feed_sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `explore_feed_sessions_id` PRIMARY KEY(`id`)
);

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
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `explore_partners_id` PRIMARY KEY(`id`)
);

CREATE TABLE `explore_shorts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listing_id` int,
	`development_id` int,
	`agent_id` int,
	`developer_id` int,
	`agency_id` int,
	`content_type` varchar(50) DEFAULT 'property',
	`topic_id` int,
	`category_id` int,
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
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`published_at` timestamp,
	CONSTRAINT `explore_shorts_id` PRIMARY KEY(`id`)
);

CREATE TABLE `topics` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`is_active` int DEFAULT 1,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `topics_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_topics_slug` UNIQUE(`slug`)
);

CREATE TABLE `boost_campaigns` (
	`id` varchar(36) NOT NULL,
	`partner_id` varchar(36) NOT NULL,
	`content_id` varchar(36) NOT NULL,
	`topic_id` varchar(36) NOT NULL,
	`budget` decimal(10,2) NOT NULL,
	`spent` decimal(10,2) DEFAULT '0.00',
	`status` enum('draft','active','paused','completed','depleted') DEFAULT 'draft',
	`start_date` date NOT NULL,
	`end_date` date,
	`impressions` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`cost_per_impression` decimal(6,4) DEFAULT '0.1000',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `boost_campaigns_id` PRIMARY KEY(`id`)
);

CREATE TABLE `bundle_partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bundleId` int NOT NULL,
	`partnerId` int NOT NULL,
	`category` varchar(50) NOT NULL,
	`displayOrder` int NOT NULL DEFAULT 0,
	`inclusionFeeZar` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bundle_partners_id` PRIMARY KEY(`id`)
);

CREATE TABLE `content_approval_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content_id` int NOT NULL,
	`submitted_by` int NOT NULL,
	`status` enum('pending','reviewing','approved','rejected','changes_requested') NOT NULL DEFAULT 'pending',
	`priority` enum('low','medium','high','urgent') DEFAULT 'medium',
	`assigned_to` int,
	`review_notes` text,
	`rejection_reason` text,
	`auto_check_results` json,
	`submitted_at` timestamp NOT NULL DEFAULT (now()),
	`reviewed_at` timestamp,
	CONSTRAINT `content_approval_queue_id` PRIMARY KEY(`id`)
);

CREATE TABLE `content_quality_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content_id` int NOT NULL,
	`overall_score` int NOT NULL,
	`metadata_score` int,
	`engagement_score` int,
	`production_score` int,
	`relevance_score` int,
	`policy_score` int,
	`details` json,
	`last_calculated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_quality_scores_id` PRIMARY KEY(`id`)
);

CREATE TABLE `founding_partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partner_id` int NOT NULL,
	`tier` enum('gold','platinum','diamond') NOT NULL DEFAULT 'gold',
	`join_date` timestamp DEFAULT (now()),
	`benefits` json,
	`contribution_value` int,
	`is_public` tinyint DEFAULT 1,
	CONSTRAINT `founding_partners_id` PRIMARY KEY(`id`)
);

CREATE TABLE `hero_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`target_slug` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`subtitle` varchar(255),
	`background_image_url` varchar(500) NOT NULL,
	`cta_text` varchar(50) NOT NULL,
	`cta_link` varchar(500) NOT NULL,
	`campaign_type` enum('new_development','featured_agency','market_report','brand_promo') NOT NULL,
	`linked_entity_id` int,
	`start_date` timestamp NOT NULL,
	`end_date` timestamp NOT NULL,
	`is_active` tinyint DEFAULT 1,
	`priority` int DEFAULT 0,
	`impressions` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `hero_campaigns_id` PRIMARY KEY(`id`)
);

CREATE TABLE `launch_content_quotas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phase_id` varchar(50) NOT NULL,
	`category` varchar(50) NOT NULL,
	`target_count` int NOT NULL,
	`current_count` int DEFAULT 0,
	`min_quality_score` int DEFAULT 70,
	`deadline` timestamp,
	`assigned_editor_id` int,
	`status` enum('not_started','in_progress','met','at_risk') DEFAULT 'not_started',
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `launch_content_quotas_id` PRIMARY KEY(`id`)
);

CREATE TABLE `launch_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`metric_name` varchar(100) NOT NULL,
	`metric_value` decimal(15,2) NOT NULL,
	`metric_type` enum('counter','gauge','percentage','currency') NOT NULL,
	`dimension` varchar(100),
	`recorded_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `launch_metrics_id` PRIMARY KEY(`id`)
);

CREATE TABLE `launch_phases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phase_name` varchar(100) NOT NULL,
	`code_name` varchar(50) NOT NULL,
	`description` text,
	`start_date` timestamp NOT NULL,
	`target_end_date` timestamp,
	`status` enum('planned','active','completed','paused') DEFAULT 'planned',
	`completion_criteria` json,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `launch_phases_id` PRIMARY KEY(`id`),
	CONSTRAINT `launch_phases_code_name_unique` UNIQUE(`code_name`)
);

CREATE TABLE `marketplace_bundles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`priceZar` int NOT NULL,
	`durationDays` int NOT NULL,
	`features` json,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_bundles_id` PRIMARY KEY(`id`)
);

CREATE TABLE `partner_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partner_id` int NOT NULL,
	`user_id` int,
	`customer_name` varchar(255) NOT NULL,
	`customer_email` varchar(320) NOT NULL,
	`customer_phone` varchar(50),
	`service_requested` varchar(100),
	`message` text,
	`status` enum('new','contacted','quoted','converted','closed') DEFAULT 'new',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partner_leads_id` PRIMARY KEY(`id`)
);

CREATE TABLE `partner_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partner_id` int NOT NULL,
	`plan_id` int,
	`status` enum('active','cancelled','past_due','trial') DEFAULT 'active',
	`billing_interval` enum('monthly','yearly') DEFAULT 'monthly',
	`current_period_start` timestamp,
	`current_period_end` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partner_subscriptions_id` PRIMARY KEY(`id`)
);

CREATE TABLE `partner_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`priceZar` int NOT NULL,
	`maxListings` int DEFAULT 0,
	`features` json,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partner_tiers_id` PRIMARY KEY(`id`)
);

CREATE TABLE `partners` (
   `id` int AUTO_INCREMENT NOT NULL,
   `user_id` int NOT NULL,
   `company_name` varchar(255) NOT NULL,
   `description` text,
   `verification_status` enum('pending','verified','rejected') DEFAULT 'pending',
   `trust_score` decimal(5,2) DEFAULT '50.00',
   `approved_content_count` int DEFAULT 0,
   `rating` decimal(3,2) DEFAULT '0.00',
   `review_count` int DEFAULT 0,
   `logo_url` varchar(500),
   `website_url` varchar(500),
   `contact_email` varchar(320),
   `contact_phone` varchar(50),
   `is_active` tinyint DEFAULT 1,
   `created_at` timestamp DEFAULT (now()),
   `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
   CONSTRAINT `partners_id` PRIMARY KEY(`id`),
   CONSTRAINT `ux_partners_user` UNIQUE(`user_id`)
);

CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`targetType` enum('agent','agency','property','developer','service') NOT NULL,
	`targetId` int NOT NULL,
	`rating` int NOT NULL,
	`title` varchar(200),
	`content` text,
	`isVerified` int NOT NULL DEFAULT 0,
	`isPublished` int NOT NULL DEFAULT 1,
	`moderationStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);

CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`categoryId` int NOT NULL,
	`averageCost` int,
	`durationMinutes` int,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);

CREATE TABLE `affordability_assessments` (
	`id` varchar(36) NOT NULL,
	`actor_user_id` int NOT NULL,
	`subject_name` varchar(200),
	`subject_phone` varchar(50),
	`gross_income_monthly` int NOT NULL,
	`deductions_monthly` int NOT NULL DEFAULT 0,
	`deposit_amount` int NOT NULL DEFAULT 0,
	`assumptions_json` json NOT NULL,
	`outputs_json` json NOT NULL,
	`location_filter_json` json,
	`credit_check_consent_given` tinyint NOT NULL DEFAULT 0,
	`credit_check_requested_at` timestamp,
	`locked_at` timestamp,
	`locked_by_deal_id` int,
	`locked_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affordability_assessments_id` PRIMARY KEY(`id`)
);

CREATE TABLE `affordability_match_snapshots` (
	`id` varchar(36) NOT NULL,
	`assessment_id` varchar(36) NOT NULL,
	`matches_json` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `affordability_match_snapshots_id` PRIMARY KEY(`id`)
);

CREATE TABLE `application_requirements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`development_id` int NOT NULL,
	`label` varchar(255) NOT NULL,
	`description` text,
	`required` tinyint NOT NULL DEFAULT 1,
	`provider` enum('buyer','referrer','manager','developer') NOT NULL DEFAULT 'buyer',
	`document_code` varchar(80),
	`accepted_file_types_json` json,
	`linked_development_document_id` int,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_by` int,
	`updated_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `application_requirements_id` PRIMARY KEY(`id`)
);

CREATE TABLE `deal_requirement_statuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deal_id` int NOT NULL,
	`requirement_id` int NOT NULL,
	`uploaded_file_storage_key` varchar(512),
	`uploaded_file_url` varchar(2048),
	`uploaded_file_name` varchar(255),
	`linked_development_document_id` int,
	`status` enum('missing','uploaded','pending_review','verified','rejected','waived') NOT NULL DEFAULT 'missing',
	`submitted_by` int,
	`submitted_at` timestamp,
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`rejection_reason` text,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deal_requirement_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_deal_requirement_statuses_deal_requirement` UNIQUE(`deal_id`,`requirement_id`)
);

CREATE TABLE `development_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`development_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`document_type` enum('price_list','house_plan','brochure','site_map','spec_sheet','availability_sheet','other') NOT NULL DEFAULT 'other',
	`category` enum('sales_asset','technical_asset','legal_asset','application_template','other') NOT NULL DEFAULT 'other',
	`storage_key` varchar(512),
	`file_url` varchar(2048),
	`mime_type` varchar(255),
	`file_size_bytes` int,
	`visibility` enum('internal','manager','referrer','public') NOT NULL DEFAULT 'internal',
	`downloadable` tinyint NOT NULL DEFAULT 1,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`version` int NOT NULL DEFAULT 1,
	`replaced_by_document_id` int,
	`uploaded_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `development_documents_id` PRIMARY KEY(`id`)
);

CREATE TABLE `development_manager_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`development_id` int NOT NULL,
	`manager_user_id` int NOT NULL,
	`is_primary` tinyint NOT NULL DEFAULT 0,
	`workload_capacity` int NOT NULL DEFAULT 0,
	`timezone` varchar(64),
	`is_active` tinyint NOT NULL DEFAULT 1,
	`assigned_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `development_manager_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_development_manager_assignment_development_manager` UNIQUE(`development_id`,`manager_user_id`)
);

CREATE TABLE `development_required_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`development_id` int NOT NULL,
	`document_code` enum('id_document','proof_of_address','proof_of_income','bank_statement','pre_approval','signed_offer_to_purchase','sale_agreement','attorney_instruction_letter','transfer_documents','custom') NOT NULL,
	`document_label` varchar(160) NOT NULL,
	`category` enum('developer_document','client_required_document') NOT NULL DEFAULT 'client_required_document',
	`template_file_url` varchar(2048),
	`template_file_name` varchar(255),
	`template_uploaded_at` timestamp,
	`template_uploaded_by` int,
	`is_required` tinyint NOT NULL DEFAULT 1,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `development_required_documents_id` PRIMARY KEY(`id`)
);

CREATE TABLE `distribution_agent_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`program_id` int NOT NULL,
	`development_id` int NOT NULL,
	`agent_id` int NOT NULL,
	`min_tier_required` enum('tier_1','tier_2','tier_3','tier_4') NOT NULL DEFAULT 'tier_1',
	`access_status` enum('active','paused','revoked') NOT NULL DEFAULT 'active',
	`granted_by` int,
	`granted_at` timestamp NOT NULL DEFAULT (now()),
	`revoked_at` timestamp,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distribution_agent_access_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_distribution_agent_access_program_agent` UNIQUE(`program_id`,`agent_id`)
);

CREATE TABLE `distribution_agent_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agent_id` int NOT NULL,
	`tier` enum('tier_1','tier_2','tier_3','tier_4') NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`window_days` int NOT NULL DEFAULT 90,
	`reason` text,
	`effective_from` timestamp NOT NULL DEFAULT (now()),
	`effective_to` timestamp,
	`assigned_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distribution_agent_tiers_id` PRIMARY KEY(`id`)
);

CREATE TABLE `distribution_brand_partnerships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brand_profile_id` int NOT NULL,
	`status` enum('pending','active','paused','ended') NOT NULL DEFAULT 'pending',
	`partnered_at` timestamp,
	`ended_at` timestamp,
	`reason_code` varchar(80),
	`notes` text,
	`onboarding_defaults_json` json,
	`created_by` int,
	`updated_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distribution_brand_partnerships_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_distribution_brand_partnerships_brand` UNIQUE(`brand_profile_id`)
);

CREATE TABLE `distribution_commission_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deal_id` int NOT NULL,
	`program_id` int NOT NULL,
	`development_id` int NOT NULL,
	`agent_id` int NOT NULL,
	`calculation_base_amount` int NOT NULL DEFAULT 0,
	`commission_percent` decimal(5,2),
	`commission_amount` int NOT NULL DEFAULT 0,
	`currency` varchar(10) NOT NULL DEFAULT 'ZAR',
	`trigger_stage` enum('contract_signed','bond_approved') NOT NULL,
	`entry_status` enum('pending','approved','paid','cancelled') NOT NULL DEFAULT 'pending',
	`approved_at` timestamp,
	`approved_by` int,
	`paid_at` timestamp,
	`paid_by` int,
	`payment_reference` varchar(100),
	`notes` text,
	`created_by` int,
	`updated_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distribution_commission_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_distribution_commission_entry_deal_trigger` UNIQUE(`deal_id`,`trigger_stage`)
);

CREATE TABLE `distribution_commission_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`distribution_deal_id` int NOT NULL,
	`recipient_id` int NOT NULL,
	`role` enum('referrer','manager','platform','override') NOT NULL,
	`percentage` decimal(7,4),
	`calculated_amount` int NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'ZAR',
	`calculation_hash` varchar(64) NOT NULL,
	`calculation_input` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `distribution_commission_ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_distribution_commission_ledger_hash` UNIQUE(`calculation_hash`)
);

CREATE TABLE `distribution_commission_overrides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deal_id` int NOT NULL,
	`actor_user_id` int NOT NULL,
	`reason` text NOT NULL,
	`previous_snapshot` json NOT NULL,
	`next_snapshot` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `distribution_commission_overrides_id` PRIMARY KEY(`id`)
);

CREATE TABLE `distribution_deal_bank_outcomes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deal_id` int NOT NULL,
	`bank_code` varchar(32) NOT NULL,
	`bank_name` varchar(120) NOT NULL,
	`status` enum('pending','approved','declined','withdrawn') NOT NULL DEFAULT 'pending',
	`submitted_at` timestamp NOT NULL DEFAULT (now()),
	`outcome_at` timestamp,
	`selected_for_client` tinyint NOT NULL DEFAULT 0,
	`selection_rank` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distribution_deal_bank_outcomes_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_distribution_deal_bank_outcomes_bank` UNIQUE(`deal_id`,`bank_code`)
);

CREATE TABLE `distribution_deal_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deal_id` int NOT NULL,
	`development_required_document_id` int NOT NULL,
	`status` enum('pending','received','verified','rejected') NOT NULL DEFAULT 'pending',
	`received_at` timestamp,
	`verified_at` timestamp,
	`received_by` int,
	`verified_by` int,
	`submitted_file_url` varchar(2048),
	`submitted_file_name` varchar(255),
	`submitted_at` timestamp,
	`submitted_by` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distribution_deal_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_distribution_deal_documents_required_document` UNIQUE(`deal_id`,`development_required_document_id`)
);

CREATE TABLE `distribution_deal_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deal_id` int NOT NULL,
	`event_type` enum('stage_transition','override','validation','note','system') NOT NULL DEFAULT 'note',
	`from_stage` enum('viewing_scheduled','viewing_completed','application_submitted','contract_signed','bond_approved','commission_pending','commission_paid','cancelled'),
	`to_stage` enum('viewing_scheduled','viewing_completed','application_submitted','contract_signed','bond_approved','commission_pending','commission_paid','cancelled'),
	`actor_user_id` int,
	`owner_type` enum('agent','agency') NOT NULL DEFAULT 'agent',
	`owner_id` int,
	`assigned_agent_id` int,
	`visibility_scope` enum('private','team','agency') NOT NULL DEFAULT 'private',
	`metadata` json,
	`notes` text,
	`event_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `distribution_deal_events_id` PRIMARY KEY(`id`)
);

CREATE TABLE `distribution_deals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`program_id` int NOT NULL,
	`development_id` int NOT NULL,
	`agent_id` int NOT NULL,
	`owner_type` enum('agent','agency') NOT NULL DEFAULT 'agent',
	`owner_id` int,
	`assigned_agent_id` int,
	`visibility_scope` enum('private','team','agency') NOT NULL DEFAULT 'private',
	`manager_user_id` int,
	`affordability_assessment_id` varchar(36),
	`affordability_match_snapshot_id` varchar(36),
	`affordability_purchase_price` int,
	`affordability_assumptions_json` json,
	`external_ref` varchar(100),
	`buyer_name` varchar(200) NOT NULL,
	`buyer_email` varchar(320),
	`buyer_phone` varchar(50),
	`deal_amount` int NOT NULL DEFAULT 0,
	`platform_amount` int NOT NULL DEFAULT 0,
	`commission_base_amount` int,
	`referrer_commission_type` enum('flat','percentage'),
	`referrer_commission_value` decimal(12,2),
	`referrer_commission_basis` enum('sale_price','base_price'),
	`referrer_commission_amount` int,
	`platform_commission_type` enum('flat','percentage'),
	`platform_commission_value` decimal(12,2),
	`platform_commission_basis` enum('sale_price','base_price'),
	`platform_commission_amount` int,
	`snapshot_version` int,
	`snapshot_source` enum('submission_gate','backfill','override'),
	`current_stage` enum('viewing_scheduled','viewing_completed','application_submitted','contract_signed','bond_approved','commission_pending','commission_paid','cancelled') NOT NULL DEFAULT 'viewing_scheduled',
	`commission_trigger_stage` enum('contract_signed','bond_approved') NOT NULL DEFAULT 'contract_signed',
	`commission_status` enum('not_ready','pending','approved','paid','cancelled') NOT NULL DEFAULT 'not_ready',
	`attribution_locked_at` timestamp,
	`attribution_locked_by` int,
	`submitted_at` timestamp NOT NULL DEFAULT (now()),
	`closed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distribution_deals_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_distribution_deal_external_ref` UNIQUE(`external_ref`)
);

CREATE TABLE `distribution_development_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`development_id` int NOT NULL,
	`brand_partnership_id` int NOT NULL,
	`brand_profile_id` int NOT NULL,
	`status` enum('listed','included','excluded','paused') NOT NULL DEFAULT 'listed',
	`submission_allowed` tinyint NOT NULL DEFAULT 0,
	`excluded_by_mandate` tinyint NOT NULL DEFAULT 0,
	`excluded_by_exclusivity` tinyint NOT NULL DEFAULT 0,
	`reason_code` varchar(80),
	`notes` text,
	`brochure_config_json` json,
	`included_at` timestamp,
	`excluded_at` timestamp,
	`paused_at` timestamp,
	`created_by` int,
	`updated_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distribution_development_access_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_distribution_development_access_development` UNIQUE(`development_id`)
);

CREATE TABLE `distribution_identities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`identity_type` enum('referrer','manager') NOT NULL,
	`active` tinyint NOT NULL DEFAULT 1,
	`display_name` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distribution_identities_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_distribution_identity_user_type` UNIQUE(`user_id`,`identity_type`)
);

CREATE TABLE `distribution_program_workflow_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflow_id` int NOT NULL,
	`step_key` varchar(80) NOT NULL,
	`step_label` varchar(160) NOT NULL,
	`step_type` enum('internal','document','bank','decision','closure') NOT NULL DEFAULT 'internal',
	`step_order` int NOT NULL,
	`is_blocking` tinyint NOT NULL DEFAULT 0,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distribution_program_workflow_steps_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_distribution_program_workflow_steps_key` UNIQUE(`workflow_id`,`step_key`),
	CONSTRAINT `ux_distribution_program_workflow_steps_order` UNIQUE(`workflow_id`,`step_order`)
);

CREATE TABLE `distribution_program_workflows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`program_id` int NOT NULL,
	`workflow_key` varchar(120) NOT NULL,
	`workflow_name` varchar(180) NOT NULL,
	`bank_strategy` enum('single','multi_simultaneous','sequential') NOT NULL DEFAULT 'single',
	`turnaround_hours` int NOT NULL DEFAULT 48,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`config_json` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distribution_program_workflows_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_distribution_program_workflows_program` UNIQUE(`program_id`)
);

CREATE TABLE `distribution_programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`development_id` int NOT NULL,
	`is_referral_enabled` tinyint NOT NULL DEFAULT 0,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`commission_model` enum('flat_percentage','tiered_percentage','fixed_amount','hybrid') NOT NULL DEFAULT 'flat_percentage',
	`default_commission_percent` decimal(5,2),
	`default_commission_amount` int,
	`referrer_commission_type` enum('flat','percentage'),
	`referrer_commission_value` decimal(12,2),
	`referrer_commission_basis` enum('sale_price','base_price'),
	`platform_commission_type` enum('flat','percentage'),
	`platform_commission_value` decimal(12,2),
	`platform_commission_basis` enum('sale_price','base_price'),
	`tier_access_policy` enum('open','restricted','invite_only') NOT NULL DEFAULT 'restricted',
	`payout_milestone` enum('attorney_instruction','attorney_signing','bond_approval','transfer_registration','occupation','custom') NOT NULL DEFAULT 'attorney_signing',
	`payout_milestone_notes` text,
	`currency_code` varchar(3) NOT NULL DEFAULT 'ZAR',
	`created_by` int,
	`updated_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distribution_programs_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_distribution_program_development` UNIQUE(`development_id`)
);

CREATE TABLE `distribution_referrer_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requested_identity` enum('referrer','manager') NOT NULL DEFAULT 'referrer',
	`full_name` varchar(200) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`notes` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`user_id` int,
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`review_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distribution_referrer_applications_id` PRIMARY KEY(`id`)
);

CREATE TABLE `distribution_viewing_validations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deal_id` int NOT NULL,
	`development_id` int NOT NULL,
	`manager_user_id` int NOT NULL,
	`agent_id` int NOT NULL,
	`validation_status` enum('pending','completed_proceeding','completed_not_proceeding','no_show','cancelled') NOT NULL DEFAULT 'pending',
	`attribution_lock_applied` tinyint NOT NULL DEFAULT 0,
	`attribution_lock_at` timestamp,
	`validated_at` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distribution_viewing_validations_id` PRIMARY KEY(`id`)
);

CREATE TABLE `distribution_viewings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deal_id` int NOT NULL,
	`program_id` int NOT NULL,
	`development_id` int NOT NULL,
	`agent_id` int NOT NULL,
	`manager_user_id` int NOT NULL,
	`scheduled_start_at` timestamp NOT NULL,
	`scheduled_end_at` timestamp,
	`timezone` varchar(64) NOT NULL DEFAULT 'Africa/Johannesburg',
	`location_name` varchar(255),
	`status` enum('scheduled','completed','no_show','cancelled') NOT NULL DEFAULT 'scheduled',
	`reschedule_count` int NOT NULL DEFAULT 0,
	`scheduled_by_user_id` int,
	`last_rescheduled_by` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distribution_viewings_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_distribution_viewings_deal` UNIQUE(`deal_id`)
);

CREATE TABLE `platform_team_registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`full_name` varchar(200) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`company` varchar(200),
	`current_role` varchar(150),
	`requested_area` enum('distribution_manager','agent','agency_operations','developer_operations','other') NOT NULL DEFAULT 'distribution_manager',
	`notes` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`user_id` int,
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`review_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_team_registrations_id` PRIMARY KEY(`id`)
);

CREATE TABLE `qualification_pack_exports` (
	`id` varchar(36) NOT NULL,
	`assessment_id` varchar(36) NOT NULL,
	`match_snapshot_id` varchar(36) NOT NULL,
	`pdf_storage_key` varchar(500),
	`pdf_bytes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `qualification_pack_exports_id` PRIMARY KEY(`id`)
);

CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`type` varchar(50) NOT NULL,
	`entity_type` varchar(50) NOT NULL,
	`entity_id` int NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);

CREATE TABLE `analytics_aggregations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`aggregation_type` enum('listing_views','agency_views','search_terms','user_activity') NOT NULL,
	`date` date NOT NULL,
	`location_id` int,
	`data` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `analytics_aggregations_id` PRIMARY KEY(`id`)
);

CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`session_id` varchar(100) NOT NULL,
	`event_type` varchar(50) NOT NULL,
	`event_data` json,
	`url` text,
	`referrer` text,
	`user_agent` text,
	`ip_address` varchar(45),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);

CREATE TABLE `city_price_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`city_id` int NOT NULL,
	`average_price` int NOT NULL,
	`growth_percentage` decimal(5,2),
	`market_trend` enum('up','down','stable') NOT NULL DEFAULT 'stable',
	`property_count` int NOT NULL DEFAULT 0,
	`property_type` varchar(50) NOT NULL DEFAULT 'all',
	`period` varchar(20) NOT NULL DEFAULT 'monthly',
	`recording_date` date NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `city_price_analytics_id` PRIMARY KEY(`id`)
);

CREATE TABLE `location_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`location_id` int NOT NULL,
	`user_id` int,
	`searched_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `location_searches_id` PRIMARY KEY(`id`)
);

CREATE TABLE `market_insights_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`location_type` enum('province','city','suburb') NOT NULL,
	`location_id` int NOT NULL,
	`insight_key` varchar(100) NOT NULL,
	`data` json NOT NULL,
	`valid_until` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `market_insights_cache_id` PRIMARY KEY(`id`)
);

CREATE TABLE `price_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`location_id` int NOT NULL,
	`average_price` decimal(12,2) NOT NULL,
	`median_price` decimal(12,2),
	`price_per_sqm` decimal(10,2),
	`property_type` varchar(50),
	`period_start` date NOT NULL,
	`period_end` date NOT NULL,
	`sample_size` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `price_analytics_id` PRIMARY KEY(`id`)
);

CREATE TABLE `price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`property_id` int NOT NULL,
	`price` int NOT NULL,
	`date` date NOT NULL,
	`source` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `price_history_id` PRIMARY KEY(`id`)
);

CREATE TABLE `price_predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`location_id` int NOT NULL,
	`property_type` varchar(50) NOT NULL,
	`predicted_growth` decimal(5,2),
	`confidence_score` int,
	`prediction_date` date NOT NULL,
	`horizon_months` int NOT NULL,
	`model_version` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `price_predictions_id` PRIMARY KEY(`id`)
);

CREATE TABLE `recent_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`location_id` int NOT NULL,
	`searched_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `recent_searches_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_user_location` UNIQUE(`user_id`,`location_id`)
);

CREATE TABLE `suburb_price_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`suburb_id` int NOT NULL,
	`average_price` int NOT NULL,
	`growth_percentage` decimal(5,2),
	`market_trend_suburb` enum('up','down','stable') NOT NULL DEFAULT 'stable',
	`property_count` int NOT NULL DEFAULT 0,
	`property_type` varchar(50) NOT NULL DEFAULT 'all',
	`period` varchar(20) NOT NULL DEFAULT 'monthly',
	`recording_date` date NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `suburb_price_analytics_id` PRIMARY KEY(`id`)
);

CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`property_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);

CREATE TABLE `lead_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`userId` int,
	`type` enum('note','call','email','meeting','status_change','contact_attempt') NOT NULL,
	`description` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_activities_id` PRIMARY KEY(`id`)
);

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
	`unit_id` varchar(36),
	`unit_name` varchar(255),
	`unit_price_from` decimal(15,2),
	`unit_bedrooms` int,
	`unit_bathrooms` decimal(3,1),
	`leadType` enum('inquiry','viewing_request','offer','callback') NOT NULL DEFAULT 'inquiry',
	`status` enum('new','contacted','qualified','converted','closed','viewing_scheduled','offer_sent','lost') NOT NULL DEFAULT 'new',
	`source` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`nextFollowUp` timestamp,
	`nextAction` varchar(255),
	`firstRespondedAt` timestamp,
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
	`developer_brand_profile_id` int,
	`brand_lead_status` enum('captured','delivered_unsubscribed','delivered_subscriber','claimed') DEFAULT 'captured',
	`lead_delivery_method` enum('email','crm_export','manual','none') DEFAULT 'email',
	`prospect_identity_id` varchar(36),
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);

CREATE TABLE `offers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int NOT NULL,
	`buyerId` int NOT NULL,
	`amount` int NOT NULL,
	`status` enum('pending','accepted','rejected','countered','withdrawn') NOT NULL DEFAULT 'pending',
	`expiryDate` timestamp,
	`conditions` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `offers_id` PRIMARY KEY(`id`)
);

CREATE TABLE `prospect_action_attributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lead_id` int NOT NULL,
	`source_type` varchar(80) NOT NULL,
	`source_entity_id` varchar(120),
	`campaign_context` json,
	`utm_context` json,
	`referrer_context` text,
	`first_touch` json,
	`last_touch` json,
	`action_touch` json NOT NULL,
	`captured_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prospect_action_attributions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_prospect_action_attribution_lead` UNIQUE(`lead_id`)
);

CREATE TABLE `prospect_action_claim_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lead_id` int NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`claimed_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prospect_action_claim_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_prospect_action_claim_token_hash` UNIQUE(`token_hash`)
);

CREATE TABLE `prospect_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prospectId` int NOT NULL,
	`listingId` int,
	`developmentId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prospect_favorites_id` PRIMARY KEY(`id`)
);

CREATE TABLE `prospect_identities` (
	`id` varchar(36) NOT NULL,
	`user_id` int,
	`contact_preferences` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prospect_identities_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_prospect_identities_user` UNIQUE(`user_id`)
);

CREATE TABLE `prospects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('active','inactive','banned') NOT NULL DEFAULT 'active',
	`preferences` json,
	`lastActiveAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prospects_id` PRIMARY KEY(`id`)
);

CREATE TABLE `recently_viewed` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`listingId` int,
	`viewedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recently_viewed_id` PRIMARY KEY(`id`)
);

CREATE TABLE `saved_search_delivery_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saved_search_id` int,
	`user_id` int NOT NULL,
	`search_name` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`saved_search_listing_source` enum('manual','development','all') NOT NULL DEFAULT 'all',
	`saved_search_delivery_frequency` enum('instant','daily','weekly','never') NOT NULL DEFAULT 'daily',
	`total_matches` int NOT NULL DEFAULT 0,
	`new_match_count` int NOT NULL DEFAULT 0,
	`in_app_requested` tinyint NOT NULL DEFAULT 0,
	`email_requested` tinyint NOT NULL DEFAULT 0,
	`in_app_delivered` tinyint NOT NULL DEFAULT 0,
	`email_delivered` tinyint NOT NULL DEFAULT 0,
	`saved_search_delivery_status` enum('delivered','partial','skipped','failed') NOT NULL DEFAULT 'delivered',
	`saved_search_delivery_retry_state` enum('not_needed','pending','retrying','succeeded','abandoned') NOT NULL DEFAULT 'not_needed',
	`retry_count` int NOT NULL DEFAULT 0,
	`max_retry_count` int NOT NULL DEFAULT 3,
	`next_retry_at` timestamp,
	`last_retry_at` timestamp,
	`action_url` varchar(500),
	`preview_matches` json,
	`error` text,
	`processed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_search_delivery_history_id` PRIMARY KEY(`id`)
);

CREATE TABLE `saved_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`criteria` json NOT NULL,
	`notification_frequency` enum('instant','daily','weekly','never') NOT NULL DEFAULT 'daily',
	`last_notified_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_searches_id` PRIMARY KEY(`id`)
);

CREATE TABLE `scheduled_viewings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`property_id` int NOT NULL,
	`user_id` int NOT NULL,
	`scheduled_date` datetime NOT NULL,
	`status` enum('pending','confirmed','cancelled','completed','declined') NOT NULL DEFAULT 'pending',
	`notes` text,
	`agent_notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_viewings_id` PRIMARY KEY(`id`)
);

CREATE TABLE `showings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int,
	`propertyId` int,
	`leadId` int,
   `agentId` int,
	`scheduledAt` timestamp NOT NULL,
	`status` enum('requested','awaiting_confirmation','confirmed','completed','cancelled','no_show','rescheduled') NOT NULL DEFAULT 'requested',
	`visitorId` int,
	`prospect_identity_id` varchar(36),
	`createdByUserId` int,
	`visitorName` varchar(150),
	`durationMinutes` int NOT NULL DEFAULT 30,
	`notes` text,
	`feedback` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `showings_id` PRIMARY KEY(`id`)
);

CREATE TABLE `agency_commission_settlement_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`settlement_id` int NOT NULL,
	`amount_received` decimal(15,2) NOT NULL,
	`received_at` timestamp NOT NULL,
	`reference` varchar(160),
	`note` text,
	`recorded_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agency_commission_settlement_payments_id` PRIMARY KEY(`id`)
);

CREATE TABLE `agency_commission_settlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`transaction_id` int NOT NULL,
	`responsible_agent_id` int,
	`expected_commission` decimal(15,2) NOT NULL,
	`agent_share` decimal(15,2) NOT NULL,
	`agency_share` decimal(15,2) NOT NULL,
	`expected_payment_date` timestamp,
	`status` enum('forecast','awaiting_completion','awaiting_payment','partially_received','received','reconciliation_required','disputed','cancelled') NOT NULL DEFAULT 'forecast',
	`variance_reason` text,
	`approved_by_user_id` int,
	`approved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agency_commission_settlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_agency_commission_settlement_transaction` UNIQUE(`transaction_id`)
);

CREATE TABLE `agency_deal_offer_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`deal_id` int NOT NULL,
	`parent_offer_version_id` int,
	`version_number` int NOT NULL,
	`actor` enum('buyer','seller','landlord','tenant','agency') NOT NULL DEFAULT 'buyer',
	`event_type` enum('initial_offer','seller_counter','buyer_counter','landlord_counter','tenant_counter','acceptance_note') NOT NULL DEFAULT 'initial_offer',
	`status` enum('draft','submitted','under_review','countered','accepted','rejected','withdrawn','expired','superseded') NOT NULL DEFAULT 'draft',
	`amount` decimal(15,2) NOT NULL,
	`deposit_amount` decimal(15,2),
	`finance_required` tinyint NOT NULL DEFAULT 0,
	`bond_amount` decimal(15,2),
	`cash_portion` decimal(15,2),
	`occupation_date` date,
	`occupational_rent` decimal(15,2),
	`monthly_rental` decimal(15,2),
	`lease_duration_months` int,
	`rental_deposit` decimal(15,2),
	`offer_expiry` timestamp,
	`conditions_summary` text,
	`fixtures_summary` text,
	`special_conditions` text,
	`terms_snapshot` json,
	`submitted_at` timestamp,
	`decided_at` timestamp,
	`created_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agency_deal_offer_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_agency_deal_offer_version` UNIQUE(`deal_id`,`version_number`)
);

CREATE TABLE `agency_deals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`lead_id` int,
	`listing_id` int,
	`property_id` int,
	`source_viewing_id` int,
	`responsible_agent_id` int,
	`transaction_type` enum('sale','rental') NOT NULL DEFAULT 'sale',
	`stage` enum('interest','draft_offer','submitted','under_review','negotiation','accepted','transaction_open','transaction_progression','completed','cancelled') NOT NULL DEFAULT 'interest',
	`interest_status` enum('interested','maybe_nurture','not_interested','wants_offer','wants_another_viewing','needs_finance','needs_to_sell') NOT NULL DEFAULT 'interested',
	`risk_status` enum('on_track','watch','at_risk','blocked','complete','cancelled') NOT NULL DEFAULT 'on_track',
	`accepted_offer_version_id` int,
	`accepted_amount` decimal(15,2),
	`accepted_at` timestamp,
	`next_action` varchar(255),
	`next_deadline` timestamp,
	`created_by_user_id` int,
	`updated_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agency_deals_id` PRIMARY KEY(`id`)
);

CREATE TABLE `agency_transaction_activity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`transaction_id` int NOT NULL,
	`actor_user_id` int,
	`event_type` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agency_transaction_activity_id` PRIMARY KEY(`id`)
);

CREATE TABLE `agency_transaction_conditions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`transaction_id` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text,
	`responsible_party` enum('agency','buyer','seller','tenant','landlord','conveyancer','bond_originator','attorney','service_provider','other') NOT NULL DEFAULT 'agency',
	`due_at` timestamp,
	`status` enum('pending','in_progress','completed','waived','cancelled','blocked') NOT NULL DEFAULT 'pending',
	`evidence_document_id` int,
	`completed_at` timestamp,
	`waived_or_cancelled_reason` text,
	`notes` text,
	`created_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agency_transaction_conditions_id` PRIMARY KEY(`id`)
);

CREATE TABLE `agency_transaction_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`transaction_id` int NOT NULL,
	`condition_id` int,
	`document_type` enum('signed_offer','id_document','proof_of_address','proof_of_funds','prequalification','bond_approval','fica','mandate','compliance_certificate','lease','inspection','other') NOT NULL,
	`status` enum('requested','uploaded','verified','rejected','waived') NOT NULL DEFAULT 'uploaded',
	`file_name` varchar(255) NOT NULL,
	`storage_key` varchar(500) NOT NULL,
	`content_type` varchar(120),
	`file_size` int,
	`visibility_scope` enum('agency_private') NOT NULL DEFAULT 'agency_private',
	`uploaded_by_user_id` int,
	`uploaded_at` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agency_transaction_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_agency_tx_doc_storage` UNIQUE(`storage_key`)
);

CREATE TABLE `agency_transaction_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`transaction_id` int NOT NULL,
	`sequence` int NOT NULL,
	`milestone_key` varchar(80) NOT NULL,
	`title` varchar(180) NOT NULL,
	`responsible_party` enum('agency','buyer','seller','tenant','landlord','conveyancer','bond_originator','attorney','service_provider','other') NOT NULL DEFAULT 'agency',
	`due_at` timestamp,
	`status` enum('pending','in_progress','completed','waived','cancelled','blocked') NOT NULL DEFAULT 'pending',
	`completed_at` timestamp,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agency_transaction_milestones_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_agency_tx_milestone_key` UNIQUE(`transaction_id`,`milestone_key`)
);

CREATE TABLE `agency_transaction_parties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`transaction_id` int NOT NULL,
	`role` enum('buyer','tenant','seller','landlord','listing_agent','buyer_agent','agency_manager','bond_originator','conveyancer','bond_attorney','cancellation_attorney','inspector','managing_agent','service_provider','other') NOT NULL,
	`name` varchar(200) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`organization` varchar(200),
	`user_id` int,
	`agent_id` int,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agency_transaction_parties_id` PRIMARY KEY(`id`)
);

CREATE TABLE `agency_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`deal_id` int NOT NULL,
	`lead_id` int,
	`listing_id` int,
	`property_id` int,
	`responsible_agent_id` int,
	`accepted_offer_version_id` int NOT NULL,
	`transaction_type` enum('sale','rental') NOT NULL DEFAULT 'sale',
	`status` enum('open','in_progress','completed','cancelled') NOT NULL DEFAULT 'open',
	`stage` varchar(80) NOT NULL,
	`risk_status` enum('on_track','watch','at_risk','blocked','complete','cancelled') NOT NULL DEFAULT 'watch',
	`accepted_amount` decimal(15,2) NOT NULL,
	`accepted_terms_snapshot` json,
	`opened_at` timestamp NOT NULL DEFAULT (now()),
	`target_completion_date` timestamp,
	`completed_at` timestamp,
	`cancelled_at` timestamp,
	`next_action` varchar(255),
	`next_deadline` timestamp,
	`transfer_duty_vat_treatment` enum('unknown','transfer_duty','vat','exempt','not_applicable') NOT NULL DEFAULT 'unknown',
	`commission_basis` enum('percentage','fixed') NOT NULL DEFAULT 'percentage',
	`commission_percentage` decimal(5,2) NOT NULL DEFAULT '5.00',
	`commission_fixed_amount` decimal(15,2),
	`commission_vat_treatment` enum('inclusive','exclusive','not_applicable') NOT NULL DEFAULT 'exclusive',
	`gross_commission` decimal(15,2) NOT NULL,
	`agency_share` decimal(15,2) NOT NULL,
	`agent_share` decimal(15,2) NOT NULL,
	`referral_split` decimal(15,2) NOT NULL DEFAULT '0.00',
	`other_deductions` decimal(15,2) NOT NULL DEFAULT '0.00',
	`expected_commission` decimal(15,2) NOT NULL,
	`commission_status` enum('estimated','payable','paid','cancelled') NOT NULL DEFAULT 'estimated',
	`expected_payment_date` timestamp,
	`paid_date` timestamp,
	`created_by_user_id` int,
	`updated_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agency_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_agency_transactions_deal` UNIQUE(`deal_id`)
);

CREATE TABLE `service_explore_videos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider_id` int NOT NULL,
	`explore_content_id` int,
	`vertical` enum('walkthroughs','home_improvement','finance_legal','moving_lifestyle','developer_story') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`moderation_status` enum('pending','reviewing','approved','rejected','changes_requested') NOT NULL DEFAULT 'pending',
	`submitted_by_user_id` int,
	`reviewed_by_user_id` int,
	`moderation_notes` text,
	`submitted_at` timestamp NOT NULL DEFAULT (now()),
	`reviewed_at` timestamp,
	`published_at` timestamp,
	CONSTRAINT `service_explore_videos_id` PRIMARY KEY(`id`)
);

CREATE TABLE `service_lead_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lead_id` int NOT NULL,
	`event_type` enum('created','assigned','accepted','quoted','won','lost','status_changed','billing_marked','note','recommendations_shown','provider_card_clicked','quote_requested','results_empty_shown','nearby_market_clicked') NOT NULL,
	`actor_user_id` int,
	`payload` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `service_lead_events_id` PRIMARY KEY(`id`)
);

CREATE TABLE `service_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requester_user_id` int,
	`provider_id` int,
	`service_category` enum('home_improvement','finance_legal','moving','inspection_compliance','insurance','media_marketing') NOT NULL,
	`source_surface` enum('directory','explore','journey_injection','agent_dashboard') NOT NULL,
	`intent_stage` enum('seller_valuation','seller_listing_prep','buyer_saved_property','buyer_offer_intent','buyer_move_ready','developer_listing_wizard','agent_dashboard','general') NOT NULL DEFAULT 'general',
	`property_id` int,
	`listing_id` int,
	`development_id` int,
	`geo_province` varchar(120),
	`geo_city` varchar(120),
	`geo_suburb` varchar(120),
	`notes` text,
	`context_json` json,
	`status` enum('new','accepted','quoted','won','lost','expired') NOT NULL DEFAULT 'new',
	`billing_eligible` tinyint NOT NULL DEFAULT 0,
	`billing_tier_snapshot` enum('directory','directory_explore','ecosystem_pro'),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_leads_id` PRIMARY KEY(`id`)
);

CREATE TABLE `service_provider_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider_id` int NOT NULL,
	`country_code` varchar(2) NOT NULL DEFAULT 'ZA',
	`province` varchar(120),
	`city` varchar(120),
	`suburb` varchar(120),
	`postal_code` varchar(20),
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`radius_km` int NOT NULL DEFAULT 25,
	`is_primary` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `service_provider_locations_id` PRIMARY KEY(`id`)
);

CREATE TABLE `service_provider_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider_id` int NOT NULL,
	`headline` varchar(180),
	`bio` text,
	`website_url` varchar(500),
	`contact_email` varchar(320),
	`contact_phone` varchar(50),
	`moderation_tier` enum('basic','verified','pro') NOT NULL DEFAULT 'basic',
	`directory_active` tinyint NOT NULL DEFAULT 1,
	`explore_creator_active` tinyint NOT NULL DEFAULT 1,
	`dashboard_active` tinyint NOT NULL DEFAULT 1,
	`average_rating` decimal(3,2) NOT NULL DEFAULT '0.00',
	`review_count` int NOT NULL DEFAULT 0,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_provider_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_service_provider_profiles_provider` UNIQUE(`provider_id`)
);

CREATE TABLE `service_provider_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider_id` int NOT NULL,
	`reviewer_user_id` int,
	`rating` int NOT NULL,
	`title` varchar(200),
	`content` text,
	`is_verified` tinyint NOT NULL DEFAULT 0,
	`is_published` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `service_provider_reviews_id` PRIMARY KEY(`id`)
);

CREATE TABLE `service_provider_services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider_id` int NOT NULL,
	`service_category` enum('home_improvement','finance_legal','moving','inspection_compliance','insurance','media_marketing') NOT NULL,
	`service_code` varchar(80) NOT NULL,
	`display_name` varchar(140) NOT NULL,
	`description` text,
	`min_price` int,
	`max_price` int,
	`currency` varchar(8) NOT NULL DEFAULT 'ZAR',
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_provider_services_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_service_provider_services_unique` UNIQUE(`provider_id`,`service_code`)
);

CREATE TABLE `service_provider_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider_id` int NOT NULL,
	`tier` enum('directory','directory_explore','ecosystem_pro') NOT NULL DEFAULT 'directory',
	`status` enum('trial','active','past_due','cancelled') NOT NULL DEFAULT 'trial',
	`starts_at` timestamp,
	`ends_at` timestamp,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_provider_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_service_provider_subscriptions_provider` UNIQUE(`provider_id`)
);

CREATE TABLE `demand_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`owner_type` enum('agent','agency','developer','private') NOT NULL DEFAULT 'agent',
	`owner_id` int NOT NULL,
	`created_by` int,
	`name` varchar(255) NOT NULL,
	`status` enum('draft','active','paused','archived') NOT NULL DEFAULT 'draft',
	`source_channel` enum('google','meta','tiktok','internal','manual') NOT NULL DEFAULT 'manual',
	`distribution_mode` enum('shared','exclusive','mixed') NOT NULL DEFAULT 'shared',
	`shared_recipient_count` int NOT NULL DEFAULT 3,
	`city` varchar(100),
	`suburb` varchar(100),
	`province` varchar(100),
	`property_type` enum('apartment','house','villa','plot','commercial','townhouse','cluster_home','farm','shared_living'),
	`min_bedrooms` int,
	`max_price` int,
	`min_price` int,
	`criteria` json,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `demand_campaigns_id` PRIMARY KEY(`id`)
);

CREATE TABLE `demand_lead_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`demand_lead_id` int,
	`campaign_id` int,
	`lead_id` int NOT NULL,
	`assignment_group_id` varchar(64) NOT NULL,
	`assignment_type` enum('shared','exclusive') NOT NULL DEFAULT 'shared',
	`assigned_agent_id` int,
	`owner_type` enum('agent','agency','developer','private') NOT NULL DEFAULT 'agent',
	`owner_id` int NOT NULL,
	`rank_position` int NOT NULL DEFAULT 1,
	`delivery_channels` json,
	`status` enum('assigned','delivered','accepted','declined','expired') NOT NULL DEFAULT 'assigned',
	`reason` text,
	`assigned_at` timestamp NOT NULL DEFAULT (now()),
	`delivered_at` timestamp,
	`responded_at` timestamp,
	CONSTRAINT `demand_lead_assignments_id` PRIMARY KEY(`id`)
);

CREATE TABLE `demand_lead_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`demand_lead_id` int,
	`campaign_id` int,
	`lead_id` int NOT NULL,
	`property_id` int,
	`agent_id` int,
	`owner_type` enum('agent','agency','developer','private') NOT NULL DEFAULT 'agent',
	`owner_id` int NOT NULL,
	`match_score` decimal(10,4) NOT NULL DEFAULT '0.0000',
	`confidence` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`tier_weight` decimal(8,4) NOT NULL DEFAULT '1.0000',
	`performance_multiplier` decimal(8,4) NOT NULL DEFAULT '1.0000',
	`listing_quality_multiplier` decimal(8,4) NOT NULL DEFAULT '1.0000',
	`fairness_multiplier` decimal(8,4) NOT NULL DEFAULT '1.0000',
	`scoring_inputs` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `demand_lead_matches_id` PRIMARY KEY(`id`)
);

CREATE TABLE `demand_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaign_id` int,
	`source_channel` varchar(100) NOT NULL,
	`status` enum('captured','assigned','unmatched') NOT NULL DEFAULT 'captured',
	`buyer_name` varchar(200) NOT NULL,
	`buyer_email` varchar(320) NOT NULL,
	`buyer_phone` varchar(50),
	`message` text,
	`criteria` json,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `demand_leads_id` PRIMARY KEY(`id`)
);

CREATE TABLE `demand_unmatched_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaign_id` int,
	`source_channel` varchar(100),
	`buyer_name` varchar(200) NOT NULL,
	`buyer_email` varchar(320) NOT NULL,
	`buyer_phone` varchar(50),
	`criteria` json,
	`payload` json,
	`status` enum('open','resolved') NOT NULL DEFAULT 'open',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`resolved_at` timestamp,
	CONSTRAINT `demand_unmatched_leads_id` PRIMARY KEY(`id`)
);

CREATE TABLE `referral_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referral_id` int NOT NULL,
	`version` int NOT NULL,
	`mode` enum('quick_qual','verified_qual') NOT NULL DEFAULT 'quick_qual',
	`input_snapshot` json NOT NULL,
	`affordability_min` int NOT NULL,
	`affordability_max` int NOT NULL,
	`monthly_payment_estimate` int NOT NULL,
	`confidence_score` int NOT NULL DEFAULT 0,
	`confidence_level` enum('low','medium','high','verified') NOT NULL DEFAULT 'low',
	`confidence_factors` json,
	`readiness_status` enum('quick_estimate','awaiting_documents','under_review','verified_estimate','matched_to_development','submitted_to_partner') NOT NULL DEFAULT 'quick_estimate',
	`flags` json,
	`assumptions` json,
	`improve_accuracy` json,
	`disclaimer` text,
	`pdf_html` text,
	`upload_link_token` varchar(96),
	`upload_link_expires_at` timestamp,
	`document_count` int NOT NULL DEFAULT 0,
	`matched_development_count` int NOT NULL DEFAULT 0,
	`created_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_assessments_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_referral_assessments_referral_version` UNIQUE(`referral_id`,`version`)
);

CREATE TABLE `referral_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referral_id` int NOT NULL,
	`assessment_id` int,
	`document_type` enum('payslip','bank_statement','credit_report','id_document','proof_of_address','other') NOT NULL,
	`document_status` enum('requested','received','verified','rejected') NOT NULL DEFAULT 'requested',
	`uploaded_by` enum('agent','client','system') NOT NULL DEFAULT 'system',
	`file_name` varchar(255),
	`file_url` text,
	`secure_token` varchar(96),
	`consent_confirmed` tinyint NOT NULL DEFAULT 0,
	`consent_text` varchar(255),
	`consent_template_id` varchar(80),
	`consent_template_version` varchar(32),
	`consent_captured_at` timestamp,
	`metadata` json,
	`reviewed_by_user_id` int,
	`reviewed_at` timestamp,
	`uploaded_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referral_documents_id` PRIMARY KEY(`id`)
);

CREATE TABLE `referral_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referral_id` int NOT NULL,
	`assessment_id` int NOT NULL,
	`development_id` int,
	`development_name` varchar(255) NOT NULL,
	`area_label` varchar(150),
	`rank_score` int NOT NULL DEFAULT 0,
	`rank_position` int NOT NULL,
	`match_bucket` enum('preferred_area','nearby_area','other_area','fallback_area') NOT NULL DEFAULT 'other_area',
	`match_reasons` json,
	`qualifying_unit_types` json,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_matches_id` PRIMARY KEY(`id`)
);

CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference_code` varchar(64) NOT NULL,
	`agent_id` int NOT NULL,
	`client_name` varchar(200) NOT NULL,
	`client_email` varchar(320),
	`client_phone` varchar(50),
	`preferred_areas` json,
	`status` enum('quick','awaiting_documents','under_review','verified','submitted','viewing_booked') NOT NULL DEFAULT 'quick',
	`latest_assessment_id` int,
	`latest_assessment_version` int NOT NULL DEFAULT 0,
	`latest_mode` enum('quick_qual','verified_qual') NOT NULL DEFAULT 'quick_qual',
	`latest_confidence_score` int NOT NULL DEFAULT 0,
	`latest_affordability_min` int,
	`latest_affordability_max` int,
	`latest_monthly_payment_estimate` int,
	`last_submitted_program_id` int,
	`last_submitted_deal_id` int,
	`submitted_at` timestamp,
	`created_by_user_id` int,
	`updated_by_user_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`),
	CONSTRAINT `ux_referrals_reference_code` UNIQUE(`reference_code`)
);

CREATE TABLE `seller_mandate_comparables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`mandate_operation_id` int NOT NULL,
	`reference` varchar(500) NOT NULL,
	`property_type` varchar(100),
	`area` varchar(200),
	`price` decimal(15,2),
	`price_kind` enum('asking','selling','other') NOT NULL DEFAULT 'other',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seller_mandate_comparables_id` PRIMARY KEY(`id`)
);

CREATE TABLE `seller_mandate_operations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`seller_prospect_id` int NOT NULL,
	`status` enum('not_started','pricing_discussion','preparing','awaiting_seller','recorded','onboarding','listing_ready','expired','withdrawn') NOT NULL DEFAULT 'not_started',
	`seller_requested_price` decimal(15,2),
	`recommended_price_min` decimal(15,2),
	`recommended_price_max` decimal(15,2),
	`agreed_listing_price` decimal(15,2),
	`pricing_rationale` text,
	`pricing_discussed_at` timestamp,
	`price_review_at` timestamp,
	`seller_objections` text,
	`mandate_start_at` timestamp,
	`document_status` enum('pending','received','signed','expired','replaced','not_applicable') NOT NULL DEFAULT 'pending',
	`document_name` varchar(255),
	`private_storage_reference` varchar(500),
	`document_date` timestamp,
	`requirements` json,
	`next_action` varchar(255),
	`listing_ready_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seller_mandate_operations_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_seller_mandate_operations_prospect` UNIQUE(`seller_prospect_id`)
);

CREATE TABLE `seller_prospect_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`seller_prospect_id` int NOT NULL,
	`actor_user_id` int,
	`activity_type` enum('created','note','call','email','meeting','status_change','assignment','follow_up_scheduled','follow_up_completed','conversion','contact_attempt','mandate_updated') NOT NULL,
	`description` text NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seller_prospect_activities_id` PRIMARY KEY(`id`)
);

CREATE TABLE `seller_prospects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`assigned_agent_id` int,
	`created_by_user_id` int,
	`owner_name` varchar(200),
	`email` varchar(320),
	`phone` varchar(50),
	`property_address` varchar(500),
	`suburb` varchar(120),
	`city` varchar(120),
	`province` varchar(120),
	`property_type` enum('apartment','house','farm','land','commercial','shared_living'),
	`source` varchar(100),
	`canvassing_method` enum('door_knocking','phone','referral','sphere','signboard','open_house','digital','walk_in','other') NOT NULL DEFAULT 'other',
	`stage` enum('new','contact_attempted','contacted','follow_up_required','appointment_scheduled','qualified','mandate_won','converted_to_listing','not_interested','lost','archived') NOT NULL DEFAULT 'new',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`next_follow_up` timestamp,
	`next_action` varchar(255),
	`first_contacted_at` timestamp,
	`last_contacted_at` timestamp,
	`outcome` text,
	`mandate_type` enum('sole','open','dual','auction','other'),
	`mandate_signed_at` timestamp,
	`mandate_expires_at` timestamp,
	`agreed_asking_price` decimal(15,2),
	`mandate_checklist` json,
	`converted_listing_id` int,
	`converted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seller_prospects_id` PRIMARY KEY(`id`)
);

CREATE TABLE `agency_listing_performance_activity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`review_id` int NOT NULL,
	`user_id` int,
	`event_type` varchar(80) NOT NULL,
	`description` text NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agency_listing_performance_activity_id` PRIMARY KEY(`id`)
);

CREATE TABLE `agency_listing_performance_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agency_id` int NOT NULL,
	`listing_id` int NOT NULL,
	`responsible_agent_id` int,
	`created_by_user_id` int,
	`review_status` enum('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`contact_date` timestamp,
	`contact_channel` enum('call','whatsapp','email','meeting','other'),
	`review_period_start` timestamp,
	`review_period_end` timestamp,
	`metrics_snapshot` json NOT NULL,
	`health_flags_snapshot` json NOT NULL,
	`agent_assessment` text,
	`buyer_feedback_themes` text,
	`recommendation` enum('keep_unchanged','improve_media','improve_description','correct_information','change_price','adjust_viewing_availability','increase_marketing','pause_listing','withdraw_listing','review_later') NOT NULL DEFAULT 'review_later',
	`recommendation_reason` text,
	`seller_feedback` text,
	`seller_decision` enum('pending','accepted','partially_accepted','rejected','deferred','unable_to_contact','unavailable') NOT NULL DEFAULT 'pending',
	`proposed_price` decimal(15,2),
	`effective_date` timestamp,
	`next_review_at` timestamp,
	`revision_requested_at` timestamp,
	`canonical_revision_listing_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agency_listing_performance_reviews_id` PRIMARY KEY(`id`)
);

ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `email_templates` ADD CONSTRAINT `email_templates_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `managerial_audit_logs` ADD CONSTRAINT `managerial_audit_logs_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `platform_settings` ADD CONSTRAINT `platform_settings_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `user_onboarding_state` ADD CONSTRAINT `user_onboarding_state_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `users` ADD CONSTRAINT `users_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_agent_memberships` ADD CONSTRAINT `agency_agent_memberships_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_agent_memberships` ADD CONSTRAINT `agency_agent_memberships_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_agent_memberships` ADD CONSTRAINT `agency_agent_memberships_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_agent_memberships` ADD CONSTRAINT `agency_agent_memberships_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_branding` ADD CONSTRAINT `agency_branding_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_join_requests` ADD CONSTRAINT `agency_join_requests_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_join_requests` ADD CONSTRAINT `agency_join_requests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_join_requests` ADD CONSTRAINT `agency_join_requests_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_subscriptions` ADD CONSTRAINT `agency_subscriptions_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_subscriptions` ADD CONSTRAINT `agency_subscriptions_planId_plans_id_fk` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agent_coverage_areas` ADD CONSTRAINT `agent_coverage_areas_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agent_knowledge` ADD CONSTRAINT `agent_knowledge_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `agent_memory` ADD CONSTRAINT `agent_memory_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `agent_tasks` ADD CONSTRAINT `agent_tasks_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `agent_tasks` ADD CONSTRAINT `agent_tasks_assigned_agent_id_agents_id_fk` FOREIGN KEY (`assigned_agent_id`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agents` ADD CONSTRAINT `agents_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agents` ADD CONSTRAINT `agents_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agents` ADD CONSTRAINT `agents_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_invitedBy_users_id_fk` FOREIGN KEY (`invitedBy`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_acceptedBy_users_id_fk` FOREIGN KEY (`acceptedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `invites` ADD CONSTRAINT `invites_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `invites` ADD CONSTRAINT `invites_usedBy_users_id_fk` FOREIGN KEY (`usedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `amenities` ADD CONSTRAINT `amenities_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `cities` ADD CONSTRAINT `cities_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `suburbs` ADD CONSTRAINT `suburbs_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `billing_audit_events` ADD CONSTRAINT `billing_audit_events_subscription_id_subscriptions_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `billing_audit_events` ADD CONSTRAINT `billing_audit_events_invoice_id_billing_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `billing_invoices`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `billing_audit_events` ADD CONSTRAINT `billing_audit_events_payment_id_billing_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `billing_payments`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `billing_audit_events` ADD CONSTRAINT `billing_audit_events_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `billing_invoices` ADD CONSTRAINT `billing_invoices_subscription_id_subscriptions_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `billing_invoices` ADD CONSTRAINT `billing_invoices_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `billing_invoices` ADD CONSTRAINT `billing_invoices_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `billing_invoices` ADD CONSTRAINT `billing_invoices_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `billing_payment_documents` ADD CONSTRAINT `billing_payment_documents_payment_id_billing_payments_id_fk` FOREIGN KEY (`payment_id`) REFERENCES `billing_payments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `billing_payment_documents` ADD CONSTRAINT `billing_payment_documents_invoice_id_billing_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `billing_invoices`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `billing_payment_documents` ADD CONSTRAINT `billing_payment_documents_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `billing_payments` ADD CONSTRAINT `billing_payments_invoice_id_billing_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `billing_invoices`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `billing_payments` ADD CONSTRAINT `billing_payments_subscription_id_subscriptions_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `billing_payments` ADD CONSTRAINT `billing_payments_submitted_by_users_id_fk` FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `billing_payments` ADD CONSTRAINT `billing_payments_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `billing_transactions` ADD CONSTRAINT `billing_transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `boost_credits` ADD CONSTRAINT `boost_credits_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_subscriptionId_agency_subscriptions_id_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `agency_subscriptions`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `plan_entitlements` ADD CONSTRAINT `plan_entitlements_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `subscription_events` ADD CONSTRAINT `subscription_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `subscription_usage` ADD CONSTRAINT `subscription_usage_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `user_subscriptions` ADD CONSTRAINT `user_subscriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `listing_analytics` ADD CONSTRAINT `listing_analytics_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `listing_approval_queue` ADD CONSTRAINT `listing_approval_queue_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `listing_leads` ADD CONSTRAINT `listing_leads_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `listing_media` ADD CONSTRAINT `listing_media_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `listing_viewings` ADD CONSTRAINT `listing_viewings_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `properties` ADD CONSTRAINT `properties_provinceId_provinces_id_fk` FOREIGN KEY (`provinceId`) REFERENCES `provinces`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `properties` ADD CONSTRAINT `properties_cityId_cities_id_fk` FOREIGN KEY (`cityId`) REFERENCES `cities`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `properties` ADD CONSTRAINT `properties_suburbId_suburbs_id_fk` FOREIGN KEY (`suburbId`) REFERENCES `suburbs`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `properties` ADD CONSTRAINT `properties_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `properties` ADD CONSTRAINT `properties_developmentId_developments_id_fk` FOREIGN KEY (`developmentId`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `properties` ADD CONSTRAINT `properties_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `properties` ADD CONSTRAINT `properties_sourceListingId_listings_id_fk` FOREIGN KEY (`sourceListingId`) REFERENCES `listings`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `properties` ADD CONSTRAINT `properties_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `properties` ADD CONSTRAINT `fk_properties_developer_brand_profil_0b8c6646` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `propertyImages` ADD CONSTRAINT `propertyImages_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `property_similarity_index` ADD CONSTRAINT `property_similarity_index_propertyId1_properties_id_fk` FOREIGN KEY (`propertyId1`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `property_similarity_index` ADD CONSTRAINT `property_similarity_index_propertyId2_properties_id_fk` FOREIGN KEY (`propertyId2`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `developer_brand_profiles` ADD CONSTRAINT `fk_developer_brand_profiles_linked_developer_accou_8f39b14b` FOREIGN KEY (`linked_developer_account_id`) REFERENCES `developers`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `developer_brand_profiles` ADD CONSTRAINT `developer_brand_profiles_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `developer_notifications` ADD CONSTRAINT `developer_notifications_developer_id_developers_id_fk` FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `developer_notifications` ADD CONSTRAINT `developer_notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `developer_subscription_limits` ADD CONSTRAINT `fk_developer_subscription_limit_subscription_id_928e808f` FOREIGN KEY (`subscription_id`) REFERENCES `developer_subscriptions`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `developer_subscription_usage` ADD CONSTRAINT `fk_developer_subscription_usage_subscription_id_2c406521` FOREIGN KEY (`subscription_id`) REFERENCES `developer_subscriptions`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `developer_subscriptions` ADD CONSTRAINT `developer_subscriptions_developer_id_developers_id_fk` FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `developer_subscriptions` ADD CONSTRAINT `developer_subscriptions_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `developers` ADD CONSTRAINT `developers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `developers` ADD CONSTRAINT `developers_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `developers` ADD CONSTRAINT `developers_rejectedBy_users_id_fk` FOREIGN KEY (`rejectedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `development_approval_queue` ADD CONSTRAINT `development_approval_queue_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `development_approval_queue` ADD CONSTRAINT `development_approval_queue_submitted_by_users_id_fk` FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;
ALTER TABLE `development_approval_queue` ADD CONSTRAINT `development_approval_queue_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `development_drafts` ADD CONSTRAINT `development_drafts_developerId_developers_id_fk` FOREIGN KEY (`developerId`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `development_drafts` ADD CONSTRAINT `fk_development_drafts_developer_brand_profil_2886eaf2` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `development_lead_routes_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `fk_development_lead_routes_source_brand_profile_i_890a65e6` FOREIGN KEY (`source_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `fk_development_lead_routes_receiver_brand_profile_11ef7688` FOREIGN KEY (`receiver_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `fk_development_lead_routes_fallback_brand_profile_99181c98` FOREIGN KEY (`fallback_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `development_phases` ADD CONSTRAINT `development_phases_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `development_units` ADD CONSTRAINT `development_units_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `development_units` ADD CONSTRAINT `development_units_phase_id_development_phases_id_fk` FOREIGN KEY (`phase_id`) REFERENCES `development_phases`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `developments` ADD CONSTRAINT `developments_developer_id_developers_id_fk` FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `developments` ADD CONSTRAINT `fk_developments_developer_brand_profil_839549f6` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `developments` ADD CONSTRAINT `fk_developments_marketing_brand_profil_7a4bb46f` FOREIGN KEY (`marketing_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `unit_types` ADD CONSTRAINT `unit_types_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `video_likes` ADD CONSTRAINT `video_likes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `video_likes` ADD CONSTRAINT `video_likes_video_id_videos_id_fk` FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `videos` ADD CONSTRAINT `videos_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `videos` ADD CONSTRAINT `videos_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `videos` ADD CONSTRAINT `videos_developmentId_developments_id_fk` FOREIGN KEY (`developmentId`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `videos` ADD CONSTRAINT `videos_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `content_topics` ADD CONSTRAINT `content_topics_topic_id_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `explore_engagements` ADD CONSTRAINT `explore_engagements_content_id_explore_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `explore_content`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `bundle_partners` ADD CONSTRAINT `bundle_partners_bundleId_marketplace_bundles_id_fk` FOREIGN KEY (`bundleId`) REFERENCES `marketplace_bundles`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `bundle_partners` ADD CONSTRAINT `bundle_partners_partnerId_partners_id_fk` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `content_approval_queue` ADD CONSTRAINT `content_approval_queue_content_id_explore_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `explore_content`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `content_approval_queue` ADD CONSTRAINT `content_approval_queue_submitted_by_users_id_fk` FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `content_approval_queue` ADD CONSTRAINT `content_approval_queue_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `content_quality_scores` ADD CONSTRAINT `content_quality_scores_content_id_explore_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `explore_content`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `founding_partners` ADD CONSTRAINT `founding_partners_partner_id_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `launch_content_quotas` ADD CONSTRAINT `launch_content_quotas_assigned_editor_id_users_id_fk` FOREIGN KEY (`assigned_editor_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `partner_leads` ADD CONSTRAINT `partner_leads_partner_id_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `partner_leads` ADD CONSTRAINT `partner_leads_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `partner_subscriptions` ADD CONSTRAINT `partner_subscriptions_partner_id_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `partner_subscriptions` ADD CONSTRAINT `partner_subscriptions_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `partners` ADD CONSTRAINT `partners_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `affordability_assessments` ADD CONSTRAINT `affordability_assessments_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `affordability_assessments` ADD CONSTRAINT `affordability_assessments_locked_by_user_id_users_id_fk` FOREIGN KEY (`locked_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `affordability_match_snapshots` ADD CONSTRAINT `fk_affordability_match_snapshot_assessment_id_ba891afd` FOREIGN KEY (`assessment_id`) REFERENCES `affordability_assessments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `application_requirements` ADD CONSTRAINT `application_requirements_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `application_requirements` ADD CONSTRAINT `fk_application_requirements_linked_development_doc_c79c98fd` FOREIGN KEY (`linked_development_document_id`) REFERENCES `development_documents`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `application_requirements` ADD CONSTRAINT `application_requirements_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `application_requirements` ADD CONSTRAINT `application_requirements_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `deal_requirement_statuses` ADD CONSTRAINT `deal_requirement_statuses_deal_id_distribution_deals_id_fk` FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `deal_requirement_statuses` ADD CONSTRAINT `fk_deal_requirement_statuses_requirement_id_84e4f27a` FOREIGN KEY (`requirement_id`) REFERENCES `application_requirements`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `deal_requirement_statuses` ADD CONSTRAINT `fk_deal_requirement_statuses_linked_development_doc_56e5a750` FOREIGN KEY (`linked_development_document_id`) REFERENCES `development_documents`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `deal_requirement_statuses` ADD CONSTRAINT `deal_requirement_statuses_submitted_by_users_id_fk` FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `deal_requirement_statuses` ADD CONSTRAINT `deal_requirement_statuses_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `development_documents` ADD CONSTRAINT `development_documents_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `development_documents` ADD CONSTRAINT `development_documents_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `development_manager_assignments` ADD CONSTRAINT `fk_development_manager_assignme_development_id_137f907a` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `development_manager_assignments` ADD CONSTRAINT `development_manager_assignments_manager_user_id_users_id_fk` FOREIGN KEY (`manager_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `development_required_documents` ADD CONSTRAINT `development_required_documents_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `development_required_documents` ADD CONSTRAINT `development_required_documents_template_uploaded_by_users_id_fk` FOREIGN KEY (`template_uploaded_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_agent_access` ADD CONSTRAINT `distribution_agent_access_program_id_distribution_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `distribution_programs`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_agent_access` ADD CONSTRAINT `distribution_agent_access_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_agent_access` ADD CONSTRAINT `distribution_agent_access_agent_id_users_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_agent_access` ADD CONSTRAINT `distribution_agent_access_granted_by_users_id_fk` FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_agent_tiers` ADD CONSTRAINT `distribution_agent_tiers_agent_id_users_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_agent_tiers` ADD CONSTRAINT `distribution_agent_tiers_assigned_by_users_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_brand_partnerships` ADD CONSTRAINT `fk_distribution_brand_partnersh_brand_profile_id_1d9e15c7` FOREIGN KEY (`brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_brand_partnerships` ADD CONSTRAINT `distribution_brand_partnerships_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_brand_partnerships` ADD CONSTRAINT `distribution_brand_partnerships_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_commission_entries` ADD CONSTRAINT `distribution_commission_entries_deal_id_distribution_deals_id_fk` FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_commission_entries` ADD CONSTRAINT `fk_distribution_commission_entr_program_id_69ffe4d9` FOREIGN KEY (`program_id`) REFERENCES `distribution_programs`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_commission_entries` ADD CONSTRAINT `fk_distribution_commission_entr_development_id_e5534e3e` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_commission_entries` ADD CONSTRAINT `distribution_commission_entries_agent_id_users_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_commission_entries` ADD CONSTRAINT `distribution_commission_entries_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_commission_entries` ADD CONSTRAINT `distribution_commission_entries_paid_by_users_id_fk` FOREIGN KEY (`paid_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_commission_entries` ADD CONSTRAINT `distribution_commission_entries_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_commission_entries` ADD CONSTRAINT `distribution_commission_entries_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_commission_ledger` ADD CONSTRAINT `fk_distribution_commission_ledg_distribution_deal_id_5e2ed153` FOREIGN KEY (`distribution_deal_id`) REFERENCES `distribution_deals`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_commission_ledger` ADD CONSTRAINT `distribution_commission_ledger_recipient_id_users_id_fk` FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_commission_overrides` ADD CONSTRAINT `fk_distribution_commission_over_deal_id_c9057fb8` FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_commission_overrides` ADD CONSTRAINT `distribution_commission_overrides_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_deal_bank_outcomes` ADD CONSTRAINT `distribution_deal_bank_outcomes_deal_id_distribution_deals_id_fk` FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_deal_documents` ADD CONSTRAINT `distribution_deal_documents_deal_id_distribution_deals_id_fk` FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_deal_documents` ADD CONSTRAINT `fk_distribution_deal_documents_development_required_d_75b0d588` FOREIGN KEY (`development_required_document_id`) REFERENCES `development_required_documents`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_deal_documents` ADD CONSTRAINT `distribution_deal_documents_received_by_users_id_fk` FOREIGN KEY (`received_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_deal_documents` ADD CONSTRAINT `distribution_deal_documents_verified_by_users_id_fk` FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_deal_documents` ADD CONSTRAINT `distribution_deal_documents_submitted_by_users_id_fk` FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_deal_events` ADD CONSTRAINT `distribution_deal_events_deal_id_distribution_deals_id_fk` FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_deal_events` ADD CONSTRAINT `distribution_deal_events_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_deal_events` ADD CONSTRAINT `distribution_deal_events_assigned_agent_id_users_id_fk` FOREIGN KEY (`assigned_agent_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_deals` ADD CONSTRAINT `distribution_deals_program_id_distribution_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `distribution_programs`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_deals` ADD CONSTRAINT `distribution_deals_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_deals` ADD CONSTRAINT `distribution_deals_agent_id_users_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_deals` ADD CONSTRAINT `distribution_deals_assigned_agent_id_users_id_fk` FOREIGN KEY (`assigned_agent_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_deals` ADD CONSTRAINT `distribution_deals_manager_user_id_users_id_fk` FOREIGN KEY (`manager_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_deals` ADD CONSTRAINT `fk_distribution_deals_affordability_assessme_6eb42c69` FOREIGN KEY (`affordability_assessment_id`) REFERENCES `affordability_assessments`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_deals` ADD CONSTRAINT `fk_distribution_deals_affordability_match_sn_6bad0f7f` FOREIGN KEY (`affordability_match_snapshot_id`) REFERENCES `affordability_match_snapshots`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_deals` ADD CONSTRAINT `distribution_deals_attribution_locked_by_users_id_fk` FOREIGN KEY (`attribution_locked_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_development_access` ADD CONSTRAINT `fk_distribution_development_acc_development_id_1e626436` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_development_access` ADD CONSTRAINT `fk_distribution_development_acc_brand_partnership_id_9b65ceac` FOREIGN KEY (`brand_partnership_id`) REFERENCES `distribution_brand_partnerships`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_development_access` ADD CONSTRAINT `fk_distribution_development_acc_brand_profile_id_74a45bed` FOREIGN KEY (`brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_development_access` ADD CONSTRAINT `distribution_development_access_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_development_access` ADD CONSTRAINT `distribution_development_access_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_identities` ADD CONSTRAINT `distribution_identities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_program_workflow_steps` ADD CONSTRAINT `fk_distribution_program_workflo_workflow_id_984f9d65` FOREIGN KEY (`workflow_id`) REFERENCES `distribution_program_workflows`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_program_workflows` ADD CONSTRAINT `fk_distribution_program_workflo_program_id_71a613cb` FOREIGN KEY (`program_id`) REFERENCES `distribution_programs`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_programs` ADD CONSTRAINT `distribution_programs_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_programs` ADD CONSTRAINT `distribution_programs_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_programs` ADD CONSTRAINT `distribution_programs_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_referrer_applications` ADD CONSTRAINT `distribution_referrer_applications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_referrer_applications` ADD CONSTRAINT `distribution_referrer_applications_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_viewing_validations` ADD CONSTRAINT `fk_distribution_viewing_validat_deal_id_ed047d9d` FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_viewing_validations` ADD CONSTRAINT `fk_distribution_viewing_validat_development_id_c91c1019` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_viewing_validations` ADD CONSTRAINT `distribution_viewing_validations_manager_user_id_users_id_fk` FOREIGN KEY (`manager_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_viewing_validations` ADD CONSTRAINT `distribution_viewing_validations_agent_id_users_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_viewings` ADD CONSTRAINT `distribution_viewings_deal_id_distribution_deals_id_fk` FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_viewings` ADD CONSTRAINT `distribution_viewings_program_id_distribution_programs_id_fk` FOREIGN KEY (`program_id`) REFERENCES `distribution_programs`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_viewings` ADD CONSTRAINT `distribution_viewings_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_viewings` ADD CONSTRAINT `distribution_viewings_agent_id_users_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_viewings` ADD CONSTRAINT `distribution_viewings_manager_user_id_users_id_fk` FOREIGN KEY (`manager_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `distribution_viewings` ADD CONSTRAINT `distribution_viewings_scheduled_by_user_id_users_id_fk` FOREIGN KEY (`scheduled_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `distribution_viewings` ADD CONSTRAINT `distribution_viewings_last_rescheduled_by_users_id_fk` FOREIGN KEY (`last_rescheduled_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `platform_team_registrations` ADD CONSTRAINT `platform_team_registrations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `platform_team_registrations` ADD CONSTRAINT `platform_team_registrations_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `qualification_pack_exports` ADD CONSTRAINT `fk_qualification_pack_exports_assessment_id_79f6b402` FOREIGN KEY (`assessment_id`) REFERENCES `affordability_assessments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `qualification_pack_exports` ADD CONSTRAINT `fk_qualification_pack_exports_match_snapshot_id_7f2ef575` FOREIGN KEY (`match_snapshot_id`) REFERENCES `affordability_match_snapshots`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `activities` ADD CONSTRAINT `activities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `city_price_analytics` ADD CONSTRAINT `city_price_analytics_city_id_cities_id_fk` FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `location_searches` ADD CONSTRAINT `location_searches_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `location_searches` ADD CONSTRAINT `location_searches_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `price_analytics` ADD CONSTRAINT `price_analytics_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `price_history` ADD CONSTRAINT `price_history_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `price_predictions` ADD CONSTRAINT `price_predictions_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `recent_searches` ADD CONSTRAINT `recent_searches_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `recent_searches` ADD CONSTRAINT `recent_searches_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `suburb_price_analytics` ADD CONSTRAINT `suburb_price_analytics_suburb_id_suburbs_id_fk` FOREIGN KEY (`suburb_id`) REFERENCES `suburbs`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `lead_activities` ADD CONSTRAINT `lead_activities_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `lead_activities` ADD CONSTRAINT `lead_activities_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `leads` ADD CONSTRAINT `leads_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `leads` ADD CONSTRAINT `leads_developmentId_developments_id_fk` FOREIGN KEY (`developmentId`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `leads` ADD CONSTRAINT `leads_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `leads` ADD CONSTRAINT `leads_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `leads` ADD CONSTRAINT `leads_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `leads` ADD CONSTRAINT `leads_developer_brand_profile_id_developer_brand_profiles_id_fk` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `leads` ADD CONSTRAINT `leads_prospect_identity_id_prospect_identities_id_fk` FOREIGN KEY (`prospect_identity_id`) REFERENCES `prospect_identities`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `offers` ADD CONSTRAINT `offers_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `offers` ADD CONSTRAINT `offers_buyerId_users_id_fk` FOREIGN KEY (`buyerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `prospect_action_attributions` ADD CONSTRAINT `prospect_action_attributions_lead_id_leads_id_fk` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `prospect_action_claim_tokens` ADD CONSTRAINT `prospect_action_claim_tokens_lead_id_leads_id_fk` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `prospect_action_claim_tokens` ADD CONSTRAINT `prospect_action_claim_tokens_claimed_by_user_id_users_id_fk` FOREIGN KEY (`claimed_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `prospect_favorites` ADD CONSTRAINT `prospect_favorites_prospectId_prospects_id_fk` FOREIGN KEY (`prospectId`) REFERENCES `prospects`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `prospect_favorites` ADD CONSTRAINT `prospect_favorites_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `prospect_favorites` ADD CONSTRAINT `prospect_favorites_developmentId_developments_id_fk` FOREIGN KEY (`developmentId`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `prospect_identities` ADD CONSTRAINT `prospect_identities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `prospects` ADD CONSTRAINT `prospects_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `recently_viewed` ADD CONSTRAINT `recently_viewed_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `recently_viewed` ADD CONSTRAINT `recently_viewed_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `saved_search_delivery_history` ADD CONSTRAINT `fk_saved_search_delivery_histor_saved_search_id_750ab676` FOREIGN KEY (`saved_search_id`) REFERENCES `saved_searches`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `saved_search_delivery_history` ADD CONSTRAINT `saved_search_delivery_history_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `saved_searches` ADD CONSTRAINT `saved_searches_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `scheduled_viewings` ADD CONSTRAINT `scheduled_viewings_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `scheduled_viewings` ADD CONSTRAINT `scheduled_viewings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `showings` ADD CONSTRAINT `showings_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `showings` ADD CONSTRAINT `showings_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `showings` ADD CONSTRAINT `showings_leadId_leads_id_fk` FOREIGN KEY (`leadId`) REFERENCES `leads`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `showings` ADD CONSTRAINT `showings_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `showings` ADD CONSTRAINT `showings_visitorId_users_id_fk` FOREIGN KEY (`visitorId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `showings` ADD CONSTRAINT `showings_prospect_identity_id_prospect_identities_id_fk` FOREIGN KEY (`prospect_identity_id`) REFERENCES `prospect_identities`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `showings` ADD CONSTRAINT `showings_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_commission_settlement_payments` ADD CONSTRAINT `agency_commission_settlement_payments_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_commission_settlement_payments` ADD CONSTRAINT `fk_agency_commission_settlement_settlement_id_3e9ca9b4` FOREIGN KEY (`settlement_id`) REFERENCES `agency_commission_settlements`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_commission_settlement_payments` ADD CONSTRAINT `fk_agency_commission_settlement_recorded_by_user_id_4cd39756` FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_commission_settlements` ADD CONSTRAINT `agency_commission_settlements_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_commission_settlements` ADD CONSTRAINT `fk_agency_commission_settlement_transaction_id_08bc1341` FOREIGN KEY (`transaction_id`) REFERENCES `agency_transactions`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_commission_settlements` ADD CONSTRAINT `agency_commission_settlements_responsible_agent_id_agents_id_fk` FOREIGN KEY (`responsible_agent_id`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_commission_settlements` ADD CONSTRAINT `agency_commission_settlements_approved_by_user_id_users_id_fk` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_deal_offer_versions` ADD CONSTRAINT `agency_deal_offer_versions_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_deal_offer_versions` ADD CONSTRAINT `agency_deal_offer_versions_deal_id_agency_deals_id_fk` FOREIGN KEY (`deal_id`) REFERENCES `agency_deals`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_deal_offer_versions` ADD CONSTRAINT `agency_deal_offer_versions_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_deals` ADD CONSTRAINT `agency_deals_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_deals` ADD CONSTRAINT `agency_deals_lead_id_leads_id_fk` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_deals` ADD CONSTRAINT `agency_deals_listing_id_listings_id_fk` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_deals` ADD CONSTRAINT `agency_deals_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_deals` ADD CONSTRAINT `agency_deals_source_viewing_id_showings_id_fk` FOREIGN KEY (`source_viewing_id`) REFERENCES `showings`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_deals` ADD CONSTRAINT `agency_deals_responsible_agent_id_agents_id_fk` FOREIGN KEY (`responsible_agent_id`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_deals` ADD CONSTRAINT `agency_deals_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_deals` ADD CONSTRAINT `agency_deals_updated_by_user_id_users_id_fk` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_transaction_activity` ADD CONSTRAINT `agency_transaction_activity_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_transaction_activity` ADD CONSTRAINT `fk_agency_transaction_activity_transaction_id_c42d1c6a` FOREIGN KEY (`transaction_id`) REFERENCES `agency_transactions`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_transaction_activity` ADD CONSTRAINT `agency_transaction_activity_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_transaction_conditions` ADD CONSTRAINT `agency_transaction_conditions_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_transaction_conditions` ADD CONSTRAINT `fk_agency_transaction_condition_transaction_id_be03f9cc` FOREIGN KEY (`transaction_id`) REFERENCES `agency_transactions`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_transaction_conditions` ADD CONSTRAINT `agency_transaction_conditions_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_transaction_documents` ADD CONSTRAINT `agency_transaction_documents_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_transaction_documents` ADD CONSTRAINT `fk_agency_transaction_documents_transaction_id_6b2854d3` FOREIGN KEY (`transaction_id`) REFERENCES `agency_transactions`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_transaction_documents` ADD CONSTRAINT `fk_agency_transaction_documents_condition_id_17532c23` FOREIGN KEY (`condition_id`) REFERENCES `agency_transaction_conditions`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_transaction_documents` ADD CONSTRAINT `agency_transaction_documents_uploaded_by_user_id_users_id_fk` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_transaction_milestones` ADD CONSTRAINT `agency_transaction_milestones_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_transaction_milestones` ADD CONSTRAINT `fk_agency_transaction_milestone_transaction_id_822ec22f` FOREIGN KEY (`transaction_id`) REFERENCES `agency_transactions`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_transaction_parties` ADD CONSTRAINT `agency_transaction_parties_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_transaction_parties` ADD CONSTRAINT `fk_agency_transaction_parties_transaction_id_b4f86695` FOREIGN KEY (`transaction_id`) REFERENCES `agency_transactions`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_transaction_parties` ADD CONSTRAINT `agency_transaction_parties_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_transaction_parties` ADD CONSTRAINT `agency_transaction_parties_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_transactions` ADD CONSTRAINT `agency_transactions_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_transactions` ADD CONSTRAINT `agency_transactions_deal_id_agency_deals_id_fk` FOREIGN KEY (`deal_id`) REFERENCES `agency_deals`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_transactions` ADD CONSTRAINT `agency_transactions_lead_id_leads_id_fk` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_transactions` ADD CONSTRAINT `agency_transactions_listing_id_listings_id_fk` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_transactions` ADD CONSTRAINT `agency_transactions_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_transactions` ADD CONSTRAINT `agency_transactions_responsible_agent_id_agents_id_fk` FOREIGN KEY (`responsible_agent_id`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_transactions` ADD CONSTRAINT `fk_agency_transactions_accepted_offer_version_4b689685` FOREIGN KEY (`accepted_offer_version_id`) REFERENCES `agency_deal_offer_versions`(`id`) ON DELETE restrict ON UPDATE no action;
ALTER TABLE `agency_transactions` ADD CONSTRAINT `agency_transactions_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_transactions` ADD CONSTRAINT `agency_transactions_updated_by_user_id_users_id_fk` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `service_explore_videos` ADD CONSTRAINT `service_explore_videos_provider_id_partners_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `partners`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `service_explore_videos` ADD CONSTRAINT `service_explore_videos_explore_content_id_explore_content_id_fk` FOREIGN KEY (`explore_content_id`) REFERENCES `explore_content`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `service_explore_videos` ADD CONSTRAINT `service_explore_videos_submitted_by_user_id_users_id_fk` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `service_explore_videos` ADD CONSTRAINT `service_explore_videos_reviewed_by_user_id_users_id_fk` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `service_lead_events` ADD CONSTRAINT `service_lead_events_lead_id_service_leads_id_fk` FOREIGN KEY (`lead_id`) REFERENCES `service_leads`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `service_lead_events` ADD CONSTRAINT `service_lead_events_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `service_leads` ADD CONSTRAINT `service_leads_requester_user_id_users_id_fk` FOREIGN KEY (`requester_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `service_leads` ADD CONSTRAINT `service_leads_provider_id_partners_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `partners`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `service_leads` ADD CONSTRAINT `service_leads_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `service_leads` ADD CONSTRAINT `service_leads_listing_id_listings_id_fk` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `service_leads` ADD CONSTRAINT `service_leads_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `service_provider_locations` ADD CONSTRAINT `service_provider_locations_provider_id_partners_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `partners`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `service_provider_profiles` ADD CONSTRAINT `service_provider_profiles_provider_id_partners_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `partners`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `service_provider_reviews` ADD CONSTRAINT `service_provider_reviews_provider_id_partners_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `partners`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `service_provider_reviews` ADD CONSTRAINT `service_provider_reviews_reviewer_user_id_users_id_fk` FOREIGN KEY (`reviewer_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `service_provider_services` ADD CONSTRAINT `service_provider_services_provider_id_partners_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `partners`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `service_provider_subscriptions` ADD CONSTRAINT `service_provider_subscriptions_provider_id_partners_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `partners`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `demand_campaigns` ADD CONSTRAINT `demand_campaigns_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `demand_lead_assignments` ADD CONSTRAINT `demand_lead_assignments_demand_lead_id_demand_leads_id_fk` FOREIGN KEY (`demand_lead_id`) REFERENCES `demand_leads`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `demand_lead_assignments` ADD CONSTRAINT `demand_lead_assignments_campaign_id_demand_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `demand_campaigns`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `demand_lead_assignments` ADD CONSTRAINT `demand_lead_assignments_lead_id_leads_id_fk` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `demand_lead_assignments` ADD CONSTRAINT `demand_lead_assignments_assigned_agent_id_agents_id_fk` FOREIGN KEY (`assigned_agent_id`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `demand_lead_matches` ADD CONSTRAINT `demand_lead_matches_demand_lead_id_demand_leads_id_fk` FOREIGN KEY (`demand_lead_id`) REFERENCES `demand_leads`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `demand_lead_matches` ADD CONSTRAINT `demand_lead_matches_campaign_id_demand_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `demand_campaigns`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `demand_lead_matches` ADD CONSTRAINT `demand_lead_matches_lead_id_leads_id_fk` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `demand_lead_matches` ADD CONSTRAINT `demand_lead_matches_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `demand_lead_matches` ADD CONSTRAINT `demand_lead_matches_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `demand_leads` ADD CONSTRAINT `demand_leads_campaign_id_demand_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `demand_campaigns`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `demand_unmatched_leads` ADD CONSTRAINT `demand_unmatched_leads_campaign_id_demand_campaigns_id_fk` FOREIGN KEY (`campaign_id`) REFERENCES `demand_campaigns`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `referral_assessments` ADD CONSTRAINT `referral_assessments_referral_id_referrals_id_fk` FOREIGN KEY (`referral_id`) REFERENCES `referrals`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `referral_assessments` ADD CONSTRAINT `referral_assessments_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `referral_documents` ADD CONSTRAINT `referral_documents_referral_id_referrals_id_fk` FOREIGN KEY (`referral_id`) REFERENCES `referrals`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `referral_documents` ADD CONSTRAINT `referral_documents_assessment_id_referral_assessments_id_fk` FOREIGN KEY (`assessment_id`) REFERENCES `referral_assessments`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `referral_documents` ADD CONSTRAINT `referral_documents_reviewed_by_user_id_users_id_fk` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `referral_matches` ADD CONSTRAINT `referral_matches_referral_id_referrals_id_fk` FOREIGN KEY (`referral_id`) REFERENCES `referrals`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `referral_matches` ADD CONSTRAINT `referral_matches_assessment_id_referral_assessments_id_fk` FOREIGN KEY (`assessment_id`) REFERENCES `referral_assessments`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `referral_matches` ADD CONSTRAINT `referral_matches_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_agent_id_users_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_last_submitted_program_id_distribution_programs_id_fk` FOREIGN KEY (`last_submitted_program_id`) REFERENCES `distribution_programs`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_last_submitted_deal_id_distribution_deals_id_fk` FOREIGN KEY (`last_submitted_deal_id`) REFERENCES `distribution_deals`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_updated_by_user_id_users_id_fk` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `seller_mandate_comparables` ADD CONSTRAINT `seller_mandate_comparables_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `seller_mandate_comparables` ADD CONSTRAINT `fk_seller_mandate_comparables_mandate_operation_id_81651204` FOREIGN KEY (`mandate_operation_id`) REFERENCES `seller_mandate_operations`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `seller_mandate_operations` ADD CONSTRAINT `seller_mandate_operations_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `seller_mandate_operations` ADD CONSTRAINT `fk_seller_mandate_operations_seller_prospect_id_c10b9224` FOREIGN KEY (`seller_prospect_id`) REFERENCES `seller_prospects`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `seller_prospect_activities` ADD CONSTRAINT `seller_prospect_activities_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `seller_prospect_activities` ADD CONSTRAINT `fk_seller_prospect_activities_seller_prospect_id_8873ca07` FOREIGN KEY (`seller_prospect_id`) REFERENCES `seller_prospects`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `seller_prospect_activities` ADD CONSTRAINT `seller_prospect_activities_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `seller_prospects` ADD CONSTRAINT `seller_prospects_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `seller_prospects` ADD CONSTRAINT `seller_prospects_assigned_agent_id_agents_id_fk` FOREIGN KEY (`assigned_agent_id`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `seller_prospects` ADD CONSTRAINT `seller_prospects_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `seller_prospects` ADD CONSTRAINT `seller_prospects_converted_listing_id_listings_id_fk` FOREIGN KEY (`converted_listing_id`) REFERENCES `listings`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_listing_performance_activity` ADD CONSTRAINT `agency_listing_performance_activity_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_listing_performance_activity` ADD CONSTRAINT `fk_agency_listing_performance_a_review_id_cb0b9674` FOREIGN KEY (`review_id`) REFERENCES `agency_listing_performance_reviews`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_listing_performance_activity` ADD CONSTRAINT `agency_listing_performance_activity_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_listing_performance_reviews` ADD CONSTRAINT `agency_listing_performance_reviews_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_listing_performance_reviews` ADD CONSTRAINT `agency_listing_performance_reviews_listing_id_listings_id_fk` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `agency_listing_performance_reviews` ADD CONSTRAINT `fk_agency_listing_performance_r_responsible_agent_id_fa9bc0ef` FOREIGN KEY (`responsible_agent_id`) REFERENCES `agents`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_listing_performance_reviews` ADD CONSTRAINT `fk_agency_listing_performance_r_created_by_user_id_f714cf74` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `agency_listing_performance_reviews` ADD CONSTRAINT `fk_agency_listing_performance_r_canonical_revision_lis_91fbae43` FOREIGN KEY (`canonical_revision_listing_id`) REFERENCES `listings`(`id`) ON DELETE set null ON UPDATE no action;
CREATE INDEX `idx_managerial_audit_actor` ON `managerial_audit_logs` (`actor_user_id`);
CREATE INDEX `idx_managerial_audit_target` ON `managerial_audit_logs` (`target_type`,`target_id`);
CREATE INDEX `idx_managerial_audit_created` ON `managerial_audit_logs` (`created_at`);
CREATE INDEX `email_idx` ON `users` (`email`);
CREATE INDEX `role_idx` ON `users` (`role`);
CREATE INDEX `idx_agency_agent_memberships_agency` ON `agency_agent_memberships` (`agency_id`,`status`);
CREATE INDEX `idx_agency_agent_memberships_agent` ON `agency_agent_memberships` (`agent_id`,`status`);
CREATE INDEX `idx_agent_knowledge_topic` ON `agent_knowledge` (`topic`);
CREATE INDEX `idx_agent_knowledge_category` ON `agent_knowledge` (`category`);
CREATE INDEX `idx_agent_knowledge_active` ON `agent_knowledge` (`is_active`);
CREATE INDEX `idx_agent_knowledge_created` ON `agent_knowledge` (`created_at`);
CREATE INDEX `idx_agent_memory_session` ON `agent_memory` (`session_id`);
CREATE INDEX `idx_agent_memory_conversation` ON `agent_memory` (`conversation_id`);
CREATE INDEX `idx_agent_memory_user` ON `agent_memory` (`user_id`);
CREATE INDEX `idx_agent_memory_created` ON `agent_memory` (`created_at`);
CREATE INDEX `idx_agent_tasks_status` ON `agent_tasks` (`status`);
CREATE INDEX `idx_agent_tasks_type` ON `agent_tasks` (`task_type`);
CREATE INDEX `idx_agent_tasks_user` ON `agent_tasks` (`user_id`);
CREATE INDEX `idx_agent_tasks_session` ON `agent_tasks` (`session_id`);
CREATE INDEX `idx_agent_tasks_created` ON `agent_tasks` (`created_at`);
CREATE INDEX `idx_agent_tasks_owner` ON `agent_tasks` (`owner_type`,`owner_id`);
CREATE INDEX `idx_agent_tasks_assigned_agent` ON `agent_tasks` (`assigned_agent_id`);
CREATE INDEX `task_id` ON `agent_tasks` (`task_id`);
CREATE INDEX `idx_agents_slug` ON `agents` (`slug`);
CREATE INDEX `idx_amenities_location_id` ON `amenities` (`location_id`);
CREATE INDEX `idx_amenities_type` ON `amenities` (`type`);
CREATE INDEX `idx_city_slug` ON `cities` (`slug`);
CREATE INDEX `idx_locations_place_id` ON `locations` (`place_id`);
CREATE INDEX `idx_province_slug` ON `provinces` (`slug`);
CREATE INDEX `idx_suburb_slug` ON `suburbs` (`slug`);
CREATE INDEX `idx_gpaa_triggered` ON `google_places_api_alerts` (`triggered_at`);
CREATE INDEX `idx_gpaa_type` ON `google_places_api_alerts` (`alert_type`);
CREATE INDEX `idx_gpaa_severity` ON `google_places_api_alerts` (`severity`);
CREATE INDEX `idx_gpaa_resolved` ON `google_places_api_alerts` (`resolved_at`);
CREATE INDEX `idx_gpac_key` ON `google_places_api_config` (`config_key`);
CREATE INDEX `idx_gpads_date` ON `google_places_api_daily_summary` (`date`);
CREATE INDEX `idx_gpal_timestamp` ON `google_places_api_logs` (`timestamp`);
CREATE INDEX `idx_gpal_request_type` ON `google_places_api_logs` (`request_type`);
CREATE INDEX `idx_gpal_success` ON `google_places_api_logs` (`success`);
CREATE INDEX `idx_gpal_session_token` ON `google_places_api_logs` (`session_token`);
CREATE INDEX `idx_gpal_user_id` ON `google_places_api_logs` (`user_id`);
CREATE INDEX `idx_billing_audit_owner` ON `billing_audit_events` (`owner_type`,`owner_id`);
CREATE INDEX `idx_billing_audit_subscription` ON `billing_audit_events` (`subscription_id`);
CREATE INDEX `idx_billing_audit_invoice` ON `billing_audit_events` (`invoice_id`);
CREATE INDEX `idx_billing_audit_payment` ON `billing_audit_events` (`payment_id`);
CREATE INDEX `idx_billing_audit_event` ON `billing_audit_events` (`event_type`);
CREATE INDEX `idx_billing_invoices_owner` ON `billing_invoices` (`owner_type`,`owner_id`);
CREATE INDEX `idx_billing_invoices_subscription` ON `billing_invoices` (`subscription_id`);
CREATE INDEX `idx_billing_invoices_status` ON `billing_invoices` (`status`);
CREATE INDEX `idx_billing_payment_documents_payment` ON `billing_payment_documents` (`payment_id`);
CREATE INDEX `idx_billing_payment_documents_invoice` ON `billing_payment_documents` (`invoice_id`);
CREATE INDEX `idx_billing_payment_documents_owner` ON `billing_payment_documents` (`owner_type`,`owner_id`);
CREATE INDEX `idx_billing_payments_invoice` ON `billing_payments` (`invoice_id`);
CREATE INDEX `idx_billing_payments_subscription` ON `billing_payments` (`subscription_id`);
CREATE INDEX `idx_billing_payments_owner` ON `billing_payments` (`owner_type`,`owner_id`);
CREATE INDEX `idx_billing_payments_state` ON `billing_payments` (`state`);
CREATE INDEX `idx_billing_payments_reference` ON `billing_payments` (`payment_reference`);
CREATE INDEX `idx_user` ON `billing_transactions` (`user_id`);
CREATE INDEX `idx_status` ON `billing_transactions` (`status`);
CREATE INDEX `idx_user` ON `boost_credits` (`user_id`);
CREATE INDEX `unique_user_credits` ON `boost_credits` (`user_id`);
CREATE INDEX `idx_plan_entitlements_plan` ON `plan_entitlements` (`plan_id`);
CREATE INDEX `idx_user` ON `subscription_events` (`user_id`);
CREATE INDEX `idx_event_type` ON `subscription_events` (`event_type`);
CREATE INDEX `idx_category` ON `subscription_plans` (`category`);
CREATE INDEX `idx_active` ON `subscription_plans` (`is_active`);
CREATE INDEX `plan_id` ON `subscription_plans` (`plan_id`);
CREATE INDEX `idx_user_period` ON `subscription_usage` (`user_id`,`period_start`,`period_end`);
CREATE INDEX `idx_subscriptions_owner` ON `subscriptions` (`owner_type`,`owner_id`);
CREATE INDEX `idx_subscriptions_status` ON `subscriptions` (`status`);
CREATE INDEX `idx_user` ON `user_subscriptions` (`user_id`);
CREATE INDEX `idx_status` ON `user_subscriptions` (`status`);
CREATE INDEX `unique_user_subscription` ON `user_subscriptions` (`user_id`);
CREATE INDEX `idx_listings_place_id` ON `listings` (`placeId`);
CREATE INDEX `idx_listings_location_id` ON `listings` (`location_id`);
CREATE INDEX `idx_listings_revision_of` ON `listings` (`revision_of_listing_id`);
CREATE INDEX `price_idx` ON `properties` (`price`);
CREATE INDEX `status_idx` ON `properties` (`status`);
CREATE INDEX `city_idx` ON `properties` (`city`);
CREATE INDEX `province_idx` ON `properties` (`province`);
CREATE INDEX `property_type_idx` ON `properties` (`propertyType`);
CREATE INDEX `listing_type_idx` ON `properties` (`listingType`);
CREATE INDEX `bedrooms_idx` ON `properties` (`bedrooms`);
CREATE INDEX `bathrooms_idx` ON `properties` (`bathrooms`);
CREATE INDEX `idx_properties_cityId` ON `properties` (`cityId`);
CREATE INDEX `idx_properties_suburbId` ON `properties` (`suburbId`);
CREATE INDEX `idx_properties_cityId_status` ON `properties` (`cityId`,`status`);
CREATE INDEX `idx_properties_cityId_area` ON `properties` (`cityId`,`area`);
CREATE INDEX `idx_properties_location_id` ON `properties` (`location_id`);
CREATE INDEX `idx_properties_sourceListingId` ON `properties` (`sourceListingId`);
CREATE INDEX `idx_brand_profiles_slug` ON `developer_brand_profiles` (`slug`);
CREATE INDEX `idx_brand_profiles_tier` ON `developer_brand_profiles` (`brand_tier`);
CREATE INDEX `idx_brand_profiles_visible` ON `developer_brand_profiles` (`is_visible`);
CREATE INDEX `idx_brand_profiles_subscriber` ON `developer_brand_profiles` (`is_subscriber`);
CREATE INDEX `idx_brand_profiles_owner` ON `developer_brand_profiles` (`owner_type`);
CREATE INDEX `idx_developer_notifications_developer_id` ON `developer_notifications` (`developer_id`);
CREATE INDEX `idx_developer_notifications_user_id` ON `developer_notifications` (`user_id`);
CREATE INDEX `idx_developer_notifications_read` ON `developer_notifications` (`read`);
CREATE INDEX `idx_developer_notifications_created_at` ON `developer_notifications` (`created_at`);
CREATE INDEX `idx_developer_notifications_type` ON `developer_notifications` (`type`);
CREATE INDEX `idx_developer_notifications_feed` ON `developer_notifications` (`developer_id`,`read`,`created_at`);
CREATE INDEX `idx_developer_subscription_limits_subscription_id` ON `developer_subscription_limits` (`subscription_id`);
CREATE INDEX `idx_developer_subscription_usage_subscription_id` ON `developer_subscription_usage` (`subscription_id`);
CREATE INDEX `idx_developer_subscriptions_developer_id` ON `developer_subscriptions` (`developer_id`);
CREATE INDEX `idx_developer_subscriptions_status` ON `developer_subscriptions` (`status`);
CREATE INDEX `idx_developer_subscriptions_tier` ON `developer_subscriptions` (`tier`);
CREATE INDEX `idx_developers_userId` ON `developers` (`userId`);
CREATE INDEX `idx_developers_status` ON `developers` (`status`);
CREATE INDEX `idx_developers_last_kpi_calculation` ON `developers` (`lastKpiCalculation`);
CREATE INDEX `idx_dev_approval_status` ON `development_approval_queue` (`status`);
CREATE INDEX `idx_dev_approval_dev_id` ON `development_approval_queue` (`development_id`);
CREATE INDEX `idx_dev_drafts_developer_id` ON `development_drafts` (`developerId`);
CREATE INDEX `idx_dev_drafts_last_modified` ON `development_drafts` (`lastModified`);
CREATE INDEX `idx_lead_routes_development_id` ON `development_lead_routes` (`development_id`);
CREATE INDEX `idx_lead_routes_source_type` ON `development_lead_routes` (`source_type`);
CREATE INDEX `idx_lead_routes_lookup` ON `development_lead_routes` (`development_id`,`source_type`,`source_brand_profile_id`);
CREATE INDEX `idx_development_phases_development_id` ON `development_phases` (`development_id`);
CREATE INDEX `idx_development_phases_status` ON `development_phases` (`status`);
CREATE INDEX `idx_development_phases_spec_type` ON `development_phases` (`spec_type`);
CREATE INDEX `unique_unit_per_development` ON `development_units` (`development_id`,`unit_number`);
CREATE INDEX `idx_units_development_id` ON `development_units` (`development_id`);
CREATE INDEX `idx_units_phase_id` ON `development_units` (`phase_id`);
CREATE INDEX `idx_units_status` ON `development_units` (`status`);
CREATE INDEX `idx_units_unit_type` ON `development_units` (`unit_type`);
CREATE INDEX `idx_units_price` ON `development_units` (`price`);
CREATE INDEX `idx_developments_slug` ON `developments` (`slug`);
CREATE INDEX `idx_developments_location` ON `developments` (`latitude`,`longitude`);
CREATE INDEX `idx_developments_auction_dates` ON `developments` (`auction_start_date`,`auction_end_date`);
CREATE INDEX `idx_unit_types_development_id` ON `unit_types` (`development_id`);
CREATE INDEX `idx_unit_types_price_range` ON `unit_types` (`base_price_from`,`base_price_to`);
CREATE INDEX `idx_unit_types_bedrooms_bathrooms` ON `unit_types` (`bedrooms`,`bathrooms`);
CREATE INDEX `idx_unit_types_display_order` ON `unit_types` (`display_order`);
CREATE INDEX `idx_unit_types_auction_status` ON `unit_types` (`auction_status`);
CREATE INDEX `unique_user_video_like` ON `video_likes` (`user_id`,`video_id`);
CREATE INDEX `idx_videos_user` ON `videos` (`userId`);
CREATE INDEX `idx_videos_listing` ON `videos` (`listingId`);
CREATE INDEX `idx_videos_development` ON `videos` (`developmentId`);
CREATE INDEX `idx_videos_category` ON `videos` (`category`);
CREATE INDEX `idx_videos_featured` ON `videos` (`is_featured`);
CREATE INDEX `idx_content_topic` ON `content_topics` (`topic_id`);
CREATE INDEX `idx_edv_content` ON `explore_discovery_videos` (`explore_content_id`);
CREATE INDEX `idx_efs_user` ON `explore_feed_sessions` (`user_id`);
CREATE INDEX `idx_explore_partners_user_id` ON `explore_partners` (`user_id`);
CREATE INDEX `idx_explore_partners_tier_id` ON `explore_partners` (`tier_id`);
CREATE INDEX `idx_boost_campaigns_topic` ON `boost_campaigns` (`topic_id`);
CREATE INDEX `idx_boost_campaigns_content` ON `boost_campaigns` (`content_id`);
CREATE INDEX `idx_boost_campaigns_partner` ON `boost_campaigns` (`partner_id`);
CREATE INDEX `idx_approval_queue_status` ON `content_approval_queue` (`status`);
CREATE INDEX `idx_approval_queue_priority` ON `content_approval_queue` (`priority`);
CREATE INDEX `idx_approval_queue_assignee` ON `content_approval_queue` (`assigned_to`);
CREATE INDEX `idx_quality_scores_content` ON `content_quality_scores` (`content_id`);
CREATE INDEX `idx_quality_scores_overall` ON `content_quality_scores` (`overall_score`);
CREATE INDEX `idx_founding_partners_tier` ON `founding_partners` (`tier`);
CREATE INDEX `unique_founding_partner` ON `founding_partners` (`partner_id`);
CREATE INDEX `idx_hero_campaigns_slug` ON `hero_campaigns` (`target_slug`);
CREATE INDEX `idx_hero_campaigns_active` ON `hero_campaigns` (`start_date`,`end_date`,`is_active`);
CREATE INDEX `idx_hero_campaigns_priority` ON `hero_campaigns` (`priority`);
CREATE INDEX `idx_launch_quotas_phase` ON `launch_content_quotas` (`phase_id`,`category`);
CREATE INDEX `idx_partner_leads_partner` ON `partner_leads` (`partner_id`);
CREATE INDEX `idx_partner_leads_status` ON `partner_leads` (`status`);
CREATE INDEX `idx_partner_subscriptions_status` ON `partner_subscriptions` (`status`);
CREATE INDEX `idx_partners_verification` ON `partners` (`verification_status`);
CREATE INDEX `idx_partners_trust_score` ON `partners` (`trust_score`);
CREATE INDEX `idx_affordability_assessments_actor` ON `affordability_assessments` (`actor_user_id`);
CREATE INDEX `idx_affordability_assessments_created_at` ON `affordability_assessments` (`created_at`);
CREATE INDEX `idx_affordability_assessments_credit_check` ON `affordability_assessments` (`credit_check_consent_given`);
CREATE INDEX `idx_affordability_assessments_locked_at` ON `affordability_assessments` (`locked_at`);
CREATE INDEX `idx_affordability_match_snapshots_assessment` ON `affordability_match_snapshots` (`assessment_id`);
CREATE INDEX `idx_affordability_match_snapshots_created_at` ON `affordability_match_snapshots` (`created_at`);
CREATE INDEX `idx_application_requirements_development` ON `application_requirements` (`development_id`);
CREATE INDEX `idx_application_requirements_active` ON `application_requirements` (`is_active`);
CREATE INDEX `idx_application_requirements_required` ON `application_requirements` (`required`);
CREATE INDEX `idx_application_requirements_provider` ON `application_requirements` (`provider`);
CREATE INDEX `idx_application_requirements_order` ON `application_requirements` (`development_id`,`sort_order`);
CREATE INDEX `idx_deal_requirement_statuses_deal` ON `deal_requirement_statuses` (`deal_id`);
CREATE INDEX `idx_deal_requirement_statuses_status` ON `deal_requirement_statuses` (`status`);
CREATE INDEX `idx_deal_requirement_statuses_requirement` ON `deal_requirement_statuses` (`requirement_id`);
CREATE INDEX `idx_development_documents_development` ON `development_documents` (`development_id`);
CREATE INDEX `idx_development_documents_active` ON `development_documents` (`is_active`);
CREATE INDEX `idx_development_documents_visibility` ON `development_documents` (`visibility`);
CREATE INDEX `idx_development_documents_type` ON `development_documents` (`document_type`);
CREATE INDEX `idx_development_manager_assignments_manager` ON `development_manager_assignments` (`manager_user_id`);
CREATE INDEX `idx_development_manager_assignments_development` ON `development_manager_assignments` (`development_id`);
CREATE INDEX `idx_development_manager_assignments_active` ON `development_manager_assignments` (`is_active`);
CREATE INDEX `idx_development_required_documents_development` ON `development_required_documents` (`development_id`);
CREATE INDEX `idx_development_required_documents_code` ON `development_required_documents` (`development_id`,`document_code`);
CREATE INDEX `idx_development_required_documents_category` ON `development_required_documents` (`development_id`,`category`);
CREATE INDEX `idx_development_required_documents_required` ON `development_required_documents` (`is_required`);
CREATE INDEX `idx_development_required_documents_active` ON `development_required_documents` (`is_active`);
CREATE INDEX `idx_development_required_documents_order` ON `development_required_documents` (`development_id`,`sort_order`);
CREATE INDEX `idx_distribution_agent_access_agent` ON `distribution_agent_access` (`agent_id`);
CREATE INDEX `idx_distribution_agent_access_development` ON `distribution_agent_access` (`development_id`);
CREATE INDEX `idx_distribution_agent_access_status` ON `distribution_agent_access` (`access_status`);
CREATE INDEX `idx_distribution_agent_access_updated_at` ON `distribution_agent_access` (`updated_at`);
CREATE INDEX `idx_distribution_agent_tiers_agent` ON `distribution_agent_tiers` (`agent_id`);
CREATE INDEX `idx_distribution_agent_tiers_effective_to` ON `distribution_agent_tiers` (`effective_to`);
CREATE INDEX `idx_distribution_agent_tiers_tier` ON `distribution_agent_tiers` (`tier`);
CREATE INDEX `idx_distribution_brand_partnerships_status` ON `distribution_brand_partnerships` (`status`);
CREATE INDEX `idx_distribution_brand_partnerships_updated_at` ON `distribution_brand_partnerships` (`updated_at`);
CREATE INDEX `idx_distribution_commission_entries_program` ON `distribution_commission_entries` (`program_id`);
CREATE INDEX `idx_distribution_commission_entries_development` ON `distribution_commission_entries` (`development_id`);
CREATE INDEX `idx_distribution_commission_entries_agent` ON `distribution_commission_entries` (`agent_id`);
CREATE INDEX `idx_distribution_commission_entries_status` ON `distribution_commission_entries` (`entry_status`);
CREATE INDEX `idx_distribution_commission_entries_updated_at` ON `distribution_commission_entries` (`updated_at`);
CREATE INDEX `idx_distribution_commission_ledger_deal` ON `distribution_commission_ledger` (`distribution_deal_id`);
CREATE INDEX `idx_distribution_commission_ledger_recipient` ON `distribution_commission_ledger` (`recipient_id`);
CREATE INDEX `idx_distribution_commission_ledger_role` ON `distribution_commission_ledger` (`role`);
CREATE INDEX `idx_distribution_commission_ledger_created_at` ON `distribution_commission_ledger` (`created_at`);
CREATE INDEX `idx_distribution_commission_overrides_deal` ON `distribution_commission_overrides` (`deal_id`);
CREATE INDEX `idx_distribution_commission_overrides_actor` ON `distribution_commission_overrides` (`actor_user_id`);
CREATE INDEX `idx_distribution_commission_overrides_created_at` ON `distribution_commission_overrides` (`created_at`);
CREATE INDEX `idx_distribution_deal_bank_outcomes_deal` ON `distribution_deal_bank_outcomes` (`deal_id`);
CREATE INDEX `idx_distribution_deal_bank_outcomes_status` ON `distribution_deal_bank_outcomes` (`status`);
CREATE INDEX `idx_distribution_deal_bank_outcomes_selected` ON `distribution_deal_bank_outcomes` (`selected_for_client`);
CREATE INDEX `idx_distribution_deal_bank_outcomes_updated_at` ON `distribution_deal_bank_outcomes` (`updated_at`);
CREATE INDEX `idx_distribution_deal_documents_deal` ON `distribution_deal_documents` (`deal_id`);
CREATE INDEX `idx_distribution_deal_documents_required_document` ON `distribution_deal_documents` (`development_required_document_id`);
CREATE INDEX `idx_distribution_deal_documents_status` ON `distribution_deal_documents` (`status`);
CREATE INDEX `idx_distribution_deal_documents_updated_at` ON `distribution_deal_documents` (`updated_at`);
CREATE INDEX `idx_distribution_deal_events_deal` ON `distribution_deal_events` (`deal_id`);
CREATE INDEX `idx_distribution_deal_events_event_at` ON `distribution_deal_events` (`event_at`);
CREATE INDEX `idx_distribution_deal_events_event_type` ON `distribution_deal_events` (`event_type`);
CREATE INDEX `idx_distribution_deals_program` ON `distribution_deals` (`program_id`);
CREATE INDEX `idx_distribution_deals_development` ON `distribution_deals` (`development_id`);
CREATE INDEX `idx_distribution_deals_agent` ON `distribution_deals` (`agent_id`);
CREATE INDEX `idx_distribution_deals_manager` ON `distribution_deals` (`manager_user_id`);
CREATE INDEX `idx_distribution_deals_current_stage` ON `distribution_deals` (`current_stage`);
CREATE INDEX `idx_distribution_deals_commission_status` ON `distribution_deals` (`commission_status`);
CREATE INDEX `idx_distribution_deals_submitted_at` ON `distribution_deals` (`submitted_at`);
CREATE INDEX `idx_distribution_deals_owner` ON `distribution_deals` (`owner_type`,`owner_id`);
CREATE INDEX `idx_distribution_deals_assigned_agent` ON `distribution_deals` (`assigned_agent_id`);
CREATE INDEX `idx_distribution_deals_affordability_assessment` ON `distribution_deals` (`affordability_assessment_id`);
CREATE INDEX `idx_distribution_deals_affordability_snapshot` ON `distribution_deals` (`affordability_match_snapshot_id`);
CREATE INDEX `idx_distribution_deals_deal_amount` ON `distribution_deals` (`deal_amount`);
CREATE INDEX `idx_distribution_deals_platform_amount` ON `distribution_deals` (`platform_amount`);
CREATE INDEX `idx_distribution_development_access_partnership` ON `distribution_development_access` (`brand_partnership_id`);
CREATE INDEX `idx_distribution_development_access_brand` ON `distribution_development_access` (`brand_profile_id`);
CREATE INDEX `idx_distribution_development_access_status` ON `distribution_development_access` (`status`);
CREATE INDEX `idx_distribution_development_access_submit` ON `distribution_development_access` (`submission_allowed`);
CREATE INDEX `idx_distribution_identities_type_active` ON `distribution_identities` (`identity_type`,`active`);
CREATE INDEX `idx_distribution_program_workflow_steps_workflow` ON `distribution_program_workflow_steps` (`workflow_id`);
CREATE INDEX `idx_distribution_program_workflow_steps_type` ON `distribution_program_workflow_steps` (`step_type`);
CREATE INDEX `idx_distribution_program_workflows_strategy` ON `distribution_program_workflows` (`bank_strategy`);
CREATE INDEX `idx_distribution_program_workflows_active` ON `distribution_program_workflows` (`is_active`);
CREATE INDEX `idx_distribution_program_workflows_updated_at` ON `distribution_program_workflows` (`updated_at`);
CREATE INDEX `idx_distribution_programs_is_active` ON `distribution_programs` (`is_active`);
CREATE INDEX `idx_distribution_programs_referral_enabled` ON `distribution_programs` (`is_referral_enabled`);
CREATE INDEX `idx_distribution_programs_updated_at` ON `distribution_programs` (`updated_at`);
CREATE INDEX `idx_distribution_referrer_applications_email` ON `distribution_referrer_applications` (`email`);
CREATE INDEX `idx_distribution_referrer_applications_status` ON `distribution_referrer_applications` (`status`);
CREATE INDEX `idx_distribution_referrer_applications_created` ON `distribution_referrer_applications` (`created_at`);
CREATE INDEX `idx_distribution_viewing_validations_deal` ON `distribution_viewing_validations` (`deal_id`);
CREATE INDEX `idx_distribution_viewing_validations_status` ON `distribution_viewing_validations` (`validation_status`);
CREATE INDEX `idx_distribution_viewing_validations_validated_at` ON `distribution_viewing_validations` (`validated_at`);
CREATE INDEX `idx_distribution_viewings_program` ON `distribution_viewings` (`program_id`);
CREATE INDEX `idx_distribution_viewings_development` ON `distribution_viewings` (`development_id`);
CREATE INDEX `idx_distribution_viewings_agent` ON `distribution_viewings` (`agent_id`);
CREATE INDEX `idx_distribution_viewings_manager` ON `distribution_viewings` (`manager_user_id`);
CREATE INDEX `idx_distribution_viewings_start` ON `distribution_viewings` (`scheduled_start_at`);
CREATE INDEX `idx_distribution_viewings_status` ON `distribution_viewings` (`status`);
CREATE INDEX `idx_platform_team_registrations_email` ON `platform_team_registrations` (`email`);
CREATE INDEX `idx_platform_team_registrations_status` ON `platform_team_registrations` (`status`);
CREATE INDEX `idx_platform_team_registrations_area` ON `platform_team_registrations` (`requested_area`);
CREATE INDEX `idx_platform_team_registrations_user` ON `platform_team_registrations` (`user_id`);
CREATE INDEX `idx_platform_team_registrations_created` ON `platform_team_registrations` (`created_at`);
CREATE INDEX `idx_qualification_pack_exports_assessment` ON `qualification_pack_exports` (`assessment_id`);
CREATE INDEX `idx_qualification_pack_exports_snapshot` ON `qualification_pack_exports` (`match_snapshot_id`);
CREATE INDEX `idx_qualification_pack_exports_created_at` ON `qualification_pack_exports` (`created_at`);
CREATE INDEX `idx_activities_user` ON `activities` (`user_id`);
CREATE INDEX `idx_activities_type` ON `activities` (`type`);
CREATE INDEX `idx_activities_created` ON `activities` (`created_at`);
CREATE INDEX `idx_analytics_events_user` ON `analytics_events` (`user_id`);
CREATE INDEX `idx_analytics_events_type` ON `analytics_events` (`event_type`);
CREATE INDEX `idx_analytics_events_created` ON `analytics_events` (`created_at`);
CREATE INDEX `idx_city_price_city` ON `city_price_analytics` (`city_id`);
CREATE INDEX `idx_city_price_recording_date` ON `city_price_analytics` (`recording_date`);
CREATE INDEX `idx_location_searched` ON `location_searches` (`location_id`,`searched_at`);
CREATE INDEX `idx_location_searches_user` ON `location_searches` (`user_id`);
CREATE INDEX `idx_market_insights_key` ON `market_insights_cache` (`location_type`,`location_id`,`insight_key`);
CREATE INDEX `idx_market_insights_valid_until` ON `market_insights_cache` (`valid_until`);
CREATE INDEX `idx_price_analytics_location` ON `price_analytics` (`location_id`);
CREATE INDEX `idx_price_history_property` ON `price_history` (`property_id`);
CREATE INDEX `idx_price_history_date` ON `price_history` (`date`);
CREATE INDEX `idx_price_predictions_location` ON `price_predictions` (`location_id`);
CREATE INDEX `idx_price_predictions_date` ON `price_predictions` (`prediction_date`);
CREATE INDEX `idx_user_recent` ON `recent_searches` (`user_id`,`searched_at`);
CREATE INDEX `idx_suburb_price_suburb` ON `suburb_price_analytics` (`suburb_id`);
CREATE INDEX `idx_suburb_price_recording_date` ON `suburb_price_analytics` (`recording_date`);
CREATE INDEX `idx_favorites_user` ON `favorites` (`user_id`);
CREATE INDEX `idx_favorites_property` ON `favorites` (`property_id`);
CREATE INDEX `idx_prospect_action_claim_lead` ON `prospect_action_claim_tokens` (`lead_id`);
CREATE INDEX `idx_saved_search_delivery_history_saved_search` ON `saved_search_delivery_history` (`saved_search_id`);
CREATE INDEX `idx_saved_search_delivery_history_user` ON `saved_search_delivery_history` (`user_id`);
CREATE INDEX `idx_saved_search_delivery_history_status` ON `saved_search_delivery_history` (`saved_search_delivery_status`);
CREATE INDEX `idx_saved_search_delivery_history_retry_state` ON `saved_search_delivery_history` (`saved_search_delivery_retry_state`);
CREATE INDEX `idx_saved_search_delivery_history_next_retry` ON `saved_search_delivery_history` (`next_retry_at`);
CREATE INDEX `idx_saved_search_delivery_history_processed` ON `saved_search_delivery_history` (`processed_at`);
CREATE INDEX `idx_saved_searches_user` ON `saved_searches` (`user_id`);
CREATE INDEX `idx_saved_searches_frequency` ON `saved_searches` (`notification_frequency`);
CREATE INDEX `idx_viewings_property` ON `scheduled_viewings` (`property_id`);
CREATE INDEX `idx_viewings_user` ON `scheduled_viewings` (`user_id`);
CREATE INDEX `idx_viewings_date` ON `scheduled_viewings` (`scheduled_date`);
CREATE INDEX `idx_showings_agent_scheduled_at` ON `showings` (`agentId`,`scheduledAt`);
CREATE INDEX `idx_showings_listing` ON `showings` (`listingId`);
CREATE INDEX `idx_showings_property` ON `showings` (`propertyId`);
CREATE INDEX `idx_showings_creator` ON `showings` (`createdByUserId`);
CREATE INDEX `idx_agency_commission_payment_settlement` ON `agency_commission_settlement_payments` (`agency_id`,`settlement_id`);
CREATE INDEX `idx_agency_commission_payment_received_at` ON `agency_commission_settlement_payments` (`agency_id`,`received_at`);
CREATE INDEX `idx_agency_commission_settlement_status` ON `agency_commission_settlements` (`agency_id`,`status`);
CREATE INDEX `idx_agency_commission_settlement_agent` ON `agency_commission_settlements` (`agency_id`,`responsible_agent_id`);
CREATE INDEX `idx_agency_commission_settlement_expected_date` ON `agency_commission_settlements` (`agency_id`,`expected_payment_date`);
CREATE INDEX `idx_agency_offer_agency_status` ON `agency_deal_offer_versions` (`agency_id`,`status`);
CREATE INDEX `idx_agency_offer_deal` ON `agency_deal_offer_versions` (`deal_id`);
CREATE INDEX `idx_agency_offer_expiry` ON `agency_deal_offer_versions` (`agency_id`,`offer_expiry`);
CREATE INDEX `idx_agency_deals_agency_stage` ON `agency_deals` (`agency_id`,`stage`);
CREATE INDEX `idx_agency_deals_lead` ON `agency_deals` (`lead_id`);
CREATE INDEX `idx_agency_deals_listing` ON `agency_deals` (`listing_id`);
CREATE INDEX `idx_agency_deals_viewing` ON `agency_deals` (`source_viewing_id`);
CREATE INDEX `idx_agency_deals_deadline` ON `agency_deals` (`agency_id`,`next_deadline`);
CREATE INDEX `idx_agency_tx_activity_tx` ON `agency_transaction_activity` (`transaction_id`);
CREATE INDEX `idx_agency_tx_activity_created` ON `agency_transaction_activity` (`agency_id`,`created_at`);
CREATE INDEX `idx_agency_tx_conditions_due` ON `agency_transaction_conditions` (`agency_id`,`due_at`);
CREATE INDEX `idx_agency_tx_conditions_status` ON `agency_transaction_conditions` (`agency_id`,`status`);
CREATE INDEX `idx_agency_tx_conditions_tx` ON `agency_transaction_conditions` (`transaction_id`);
CREATE INDEX `idx_agency_tx_docs_tx` ON `agency_transaction_documents` (`transaction_id`);
CREATE INDEX `idx_agency_tx_docs_type` ON `agency_transaction_documents` (`agency_id`,`document_type`);
CREATE INDEX `idx_agency_tx_milestone_due` ON `agency_transaction_milestones` (`agency_id`,`due_at`);
CREATE INDEX `idx_agency_tx_milestone_status` ON `agency_transaction_milestones` (`agency_id`,`status`);
CREATE INDEX `idx_agency_tx_parties_tx` ON `agency_transaction_parties` (`transaction_id`);
CREATE INDEX `idx_agency_tx_parties_role` ON `agency_transaction_parties` (`agency_id`,`role`);
CREATE INDEX `idx_agency_transactions_agency_status` ON `agency_transactions` (`agency_id`,`status`);
CREATE INDEX `idx_agency_transactions_deadline` ON `agency_transactions` (`agency_id`,`next_deadline`);
CREATE INDEX `idx_agency_transactions_commission` ON `agency_transactions` (`agency_id`,`commission_status`);
CREATE INDEX `idx_service_explore_videos_provider` ON `service_explore_videos` (`provider_id`);
CREATE INDEX `idx_service_explore_videos_status` ON `service_explore_videos` (`moderation_status`);
CREATE INDEX `idx_service_explore_videos_vertical` ON `service_explore_videos` (`vertical`);
CREATE INDEX `idx_service_lead_events_lead` ON `service_lead_events` (`lead_id`);
CREATE INDEX `idx_service_lead_events_type` ON `service_lead_events` (`event_type`);
CREATE INDEX `idx_service_lead_events_created` ON `service_lead_events` (`created_at`);
CREATE INDEX `idx_service_leads_provider` ON `service_leads` (`provider_id`);
CREATE INDEX `idx_service_leads_status` ON `service_leads` (`status`);
CREATE INDEX `idx_service_leads_source` ON `service_leads` (`source_surface`);
CREATE INDEX `idx_service_leads_stage` ON `service_leads` (`intent_stage`);
CREATE INDEX `idx_service_leads_created` ON `service_leads` (`created_at`);
CREATE INDEX `idx_service_provider_locations_provider` ON `service_provider_locations` (`provider_id`);
CREATE INDEX `idx_service_provider_locations_geo` ON `service_provider_locations` (`province`,`city`,`suburb`);
CREATE INDEX `idx_service_provider_profiles_tier` ON `service_provider_profiles` (`moderation_tier`);
CREATE INDEX `idx_service_provider_reviews_provider` ON `service_provider_reviews` (`provider_id`);
CREATE INDEX `idx_service_provider_reviews_rating` ON `service_provider_reviews` (`rating`);
CREATE INDEX `idx_service_provider_reviews_created` ON `service_provider_reviews` (`created_at`);
CREATE INDEX `idx_service_provider_services_provider` ON `service_provider_services` (`provider_id`);
CREATE INDEX `idx_service_provider_services_category` ON `service_provider_services` (`service_category`);
CREATE INDEX `idx_service_provider_subscriptions_tier` ON `service_provider_subscriptions` (`tier`);
CREATE INDEX `idx_service_provider_subscriptions_status` ON `service_provider_subscriptions` (`status`);
CREATE INDEX `idx_demand_campaigns_owner` ON `demand_campaigns` (`owner_type`,`owner_id`);
CREATE INDEX `idx_demand_campaigns_status` ON `demand_campaigns` (`status`);
CREATE INDEX `idx_demand_campaigns_source` ON `demand_campaigns` (`source_channel`);
CREATE INDEX `idx_demand_lead_assignments_demand_lead` ON `demand_lead_assignments` (`demand_lead_id`);
CREATE INDEX `idx_demand_lead_assignments_lead` ON `demand_lead_assignments` (`lead_id`);
CREATE INDEX `idx_demand_lead_assignments_campaign` ON `demand_lead_assignments` (`campaign_id`);
CREATE INDEX `idx_demand_lead_assignments_agent` ON `demand_lead_assignments` (`assigned_agent_id`);
CREATE INDEX `idx_demand_lead_assignments_group` ON `demand_lead_assignments` (`assignment_group_id`);
CREATE INDEX `idx_demand_lead_assignments_status` ON `demand_lead_assignments` (`status`);
CREATE INDEX `idx_demand_lead_matches_demand_lead` ON `demand_lead_matches` (`demand_lead_id`);
CREATE INDEX `idx_demand_lead_matches_lead` ON `demand_lead_matches` (`lead_id`);
CREATE INDEX `idx_demand_lead_matches_campaign` ON `demand_lead_matches` (`campaign_id`);
CREATE INDEX `idx_demand_lead_matches_agent` ON `demand_lead_matches` (`agent_id`);
CREATE INDEX `idx_demand_lead_matches_score` ON `demand_lead_matches` (`match_score`);
CREATE INDEX `idx_demand_leads_campaign` ON `demand_leads` (`campaign_id`);
CREATE INDEX `idx_demand_leads_status` ON `demand_leads` (`status`);
CREATE INDEX `idx_demand_leads_source` ON `demand_leads` (`source_channel`);
CREATE INDEX `idx_demand_unmatched_campaign` ON `demand_unmatched_leads` (`campaign_id`);
CREATE INDEX `idx_demand_unmatched_status` ON `demand_unmatched_leads` (`status`);
CREATE INDEX `idx_demand_unmatched_created` ON `demand_unmatched_leads` (`created_at`);
CREATE INDEX `idx_referral_assessments_referral` ON `referral_assessments` (`referral_id`);
CREATE INDEX `idx_referral_assessments_readiness` ON `referral_assessments` (`readiness_status`);
CREATE INDEX `idx_referral_assessments_mode` ON `referral_assessments` (`mode`);
CREATE INDEX `idx_referral_assessments_created_at` ON `referral_assessments` (`created_at`);
CREATE INDEX `idx_referral_assessments_upload_token` ON `referral_assessments` (`upload_link_token`);
CREATE INDEX `idx_referral_documents_referral` ON `referral_documents` (`referral_id`);
CREATE INDEX `idx_referral_documents_assessment` ON `referral_documents` (`assessment_id`);
CREATE INDEX `idx_referral_documents_status` ON `referral_documents` (`document_status`);
CREATE INDEX `idx_referral_documents_type` ON `referral_documents` (`document_type`);
CREATE INDEX `idx_referral_documents_token` ON `referral_documents` (`secure_token`);
CREATE INDEX `idx_referral_matches_referral` ON `referral_matches` (`referral_id`);
CREATE INDEX `idx_referral_matches_assessment` ON `referral_matches` (`assessment_id`);
CREATE INDEX `idx_referral_matches_development` ON `referral_matches` (`development_id`);
CREATE INDEX `idx_referral_matches_bucket_score` ON `referral_matches` (`match_bucket`,`rank_score`);
CREATE INDEX `idx_referrals_agent` ON `referrals` (`agent_id`);
CREATE INDEX `idx_referrals_status` ON `referrals` (`status`);
CREATE INDEX `idx_referrals_updated_at` ON `referrals` (`updated_at`);
CREATE INDEX `idx_referrals_last_submitted_deal` ON `referrals` (`last_submitted_deal_id`);
CREATE INDEX `idx_seller_mandate_comparables_operation` ON `seller_mandate_comparables` (`mandate_operation_id`);
CREATE INDEX `idx_seller_mandate_operations_agency_status` ON `seller_mandate_operations` (`agency_id`,`status`);
CREATE INDEX `idx_seller_mandate_operations_agency_price_review` ON `seller_mandate_operations` (`agency_id`,`price_review_at`);
CREATE INDEX `idx_seller_prospect_activities_prospect` ON `seller_prospect_activities` (`seller_prospect_id`,`created_at`);
CREATE INDEX `idx_seller_prospect_activities_agency_created` ON `seller_prospect_activities` (`agency_id`,`created_at`);
CREATE INDEX `idx_seller_prospects_agency_stage` ON `seller_prospects` (`agency_id`,`stage`);
CREATE INDEX `idx_seller_prospects_agency_follow_up` ON `seller_prospects` (`agency_id`,`next_follow_up`);
CREATE INDEX `idx_seller_prospects_agent_follow_up` ON `seller_prospects` (`assigned_agent_id`,`next_follow_up`);
CREATE INDEX `idx_seller_prospects_agency_area` ON `seller_prospects` (`agency_id`,`city`,`suburb`);
CREATE INDEX `idx_seller_prospects_converted_listing` ON `seller_prospects` (`converted_listing_id`);
CREATE INDEX `idx_listing_performance_activity_review` ON `agency_listing_performance_activity` (`agency_id`,`review_id`,`created_at`);
CREATE INDEX `idx_listing_performance_review_agency_listing` ON `agency_listing_performance_reviews` (`agency_id`,`listing_id`);
CREATE INDEX `idx_listing_performance_review_due` ON `agency_listing_performance_reviews` (`agency_id`,`next_review_at`);
CREATE INDEX `idx_listing_performance_review_agent` ON `agency_listing_performance_reviews` (`agency_id`,`responsible_agent_id`);