CREATE TABLE `advertising_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignType` enum('banner_ad','boosted_development','sponsored_listing') NOT NULL,
	`advertiserId` int NOT NULL,
	`advertiserType` enum('developer','agency','agent','vendor') NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'ZAR',
	`status` enum('draft','active','paused','completed','cancelled') NOT NULL DEFAULT 'draft',
	`impressions` int NOT NULL DEFAULT 0,
	`clicks` int NOT NULL DEFAULT 0,
	`ctr` decimal(5,2),
	`cpm` decimal(10,2),
	`cpc` decimal(10,2),
	`placement` enum('homepage','listing_page','media_hub','dashboard','search_results'),
	`targetAudience` text,
	`developmentId` int,
	`listingId` int,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`budget` int,
	`spentAmount` int NOT NULL DEFAULT 0,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `campaign_budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`budgetType` enum('daily','lifetime','subscription') NOT NULL,
	`budgetAmount` decimal(10,2) NOT NULL,
	`billingMethod` enum('ppc','ppv','per_lead','per_boost','flat_fee') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_channels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`type` enum('feed','search','carousel','email','push','showcase','retargeting') NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_channels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_creatives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`images` json,
	`videos` json,
	`headlines` json,
	`descriptions` json,
	`cta` enum('view_listing','book_viewing','contact_agent','download_brochure','pre_qualify') DEFAULT 'view_listing',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_creatives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`listingId` int,
	`developmentId` int,
	`channel` enum('feed','search','carousel','email','push','showcase','retargeting'),
	`leadId` int,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `campaign_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_performance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`impressions` int NOT NULL DEFAULT 0,
	`clicks` int NOT NULL DEFAULT 0,
	`profileViews` int NOT NULL DEFAULT 0,
	`leadSubmissions` int NOT NULL DEFAULT 0,
	`whatsappClicks` int NOT NULL DEFAULT 0,
	`viewingsBooked` int NOT NULL DEFAULT 0,
	`spend` decimal(10,2) NOT NULL DEFAULT '0.00',
	`date` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `campaign_performance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`autoPace` boolean DEFAULT true,
	`frequency` enum('one_time','weekly','monthly') DEFAULT 'one_time',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_targeting` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`locationTargeting` json,
	`buyerProfile` json,
	`priceRange` json,
	`propertyType` json,
	`customTags` json,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_targeting_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `failed_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriptionId` int,
	`invoiceId` int,
	`agencyId` int,
	`userId` int,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'ZAR',
	`failureReason` text,
	`failureCode` varchar(100),
	`retryCount` int NOT NULL DEFAULT 0,
	`maxRetries` int NOT NULL DEFAULT 3,
	`status` enum('pending_retry','retrying','resolved','abandoned','customer_action_required') NOT NULL DEFAULT 'pending_retry',
	`nextRetryAt` timestamp,
	`lastRetryAt` timestamp,
	`resolvedAt` timestamp,
	`churnRisk` enum('low','medium','high','critical'),
	`notificationsSent` int NOT NULL DEFAULT 0,
	`lastNotificationAt` timestamp,
	`stripePaymentIntentId` varchar(100),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `marketing_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerType` enum('agent','developer','agency') NOT NULL,
	`ownerId` int NOT NULL,
	`campaignName` varchar(255) NOT NULL,
	`campaignType` enum('listing_boost','lead_generation','brand_awareness','development_launch','agent_promotion') NOT NULL,
	`description` text,
	`status` enum('draft','active','paused','completed','scheduled') NOT NULL DEFAULT 'draft',
	`targetType` enum('listing','development','agent_profile','agency_page') NOT NULL,
	`targetId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketing_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_proofs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int,
	`subscriptionId` int,
	`agencyId` int NOT NULL,
	`userId` int NOT NULL,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'ZAR',
	`paymentMethod` enum('eft','bank_transfer','cash_deposit','other') NOT NULL DEFAULT 'eft',
	`referenceNumber` varchar(100),
	`proofOfPaymentUrl` text,
	`bankName` varchar(100),
	`accountHolderName` varchar(200),
	`paymentDate` timestamp NOT NULL,
	`status` enum('pending','verified','rejected','expired') NOT NULL DEFAULT 'pending',
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`rejectionReason` text,
	`notes` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `revenue_forecasts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`forecastPeriod` enum('30_days','90_days','quarter','year') NOT NULL,
	`revenueCategory` enum('subscriptions','advertising','total','developer','agency','agent','vendor') NOT NULL,
	`predictedAmount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'ZAR',
	`confidence` decimal(5,2),
	`forecastMethod` varchar(50),
	`historicalDataPoints` int,
	`actualAmount` int,
	`accuracy` decimal(5,2),
	`metadata` text,
	`generatedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`periodStartDate` timestamp NOT NULL,
	`periodEndDate` timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscription_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriptionId` int,
	`agencyId` int,
	`userId` int,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'ZAR',
	`status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`revenueCategory` enum('developer','agency','agent','vendor') NOT NULL,
	`billingPeriodStart` timestamp,
	`billingPeriodEnd` timestamp,
	`stripePaymentIntentId` varchar(100),
	`paymentMethod` varchar(50),
	`description` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`paidAt` timestamp
);
--> statement-breakpoint
DROP INDEX `idx_locations_place_id` ON `locations`;--> statement-breakpoint
DROP INDEX `idx_locations_name` ON `locations`;--> statement-breakpoint
DROP INDEX `idx_locations_type` ON `locations`;--> statement-breakpoint
ALTER TABLE `advertising_campaigns` ADD CONSTRAINT `advertising_campaigns_developmentId_developments_id_fk` FOREIGN KEY (`developmentId`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `advertising_campaigns` ADD CONSTRAINT `advertising_campaigns_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_budgets` ADD CONSTRAINT `campaign_budgets_campaignId_marketing_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `marketing_campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_channels` ADD CONSTRAINT `campaign_channels_campaignId_marketing_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `marketing_campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_creatives` ADD CONSTRAINT `campaign_creatives_campaignId_marketing_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `marketing_campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_leads` ADD CONSTRAINT `campaign_leads_campaignId_marketing_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `marketing_campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_performance` ADD CONSTRAINT `campaign_performance_campaignId_marketing_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `marketing_campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_schedules` ADD CONSTRAINT `campaign_schedules_campaignId_marketing_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `marketing_campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `campaign_targeting` ADD CONSTRAINT `campaign_targeting_campaignId_marketing_campaigns_id_fk` FOREIGN KEY (`campaignId`) REFERENCES `marketing_campaigns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `failed_payments` ADD CONSTRAINT `failed_payments_subscriptionId_agency_subscriptions_id_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `agency_subscriptions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `failed_payments` ADD CONSTRAINT `failed_payments_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `failed_payments` ADD CONSTRAINT `failed_payments_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `failed_payments` ADD CONSTRAINT `failed_payments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_proofs` ADD CONSTRAINT `payment_proofs_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_proofs` ADD CONSTRAINT `payment_proofs_subscriptionId_agency_subscriptions_id_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `agency_subscriptions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_proofs` ADD CONSTRAINT `payment_proofs_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_proofs` ADD CONSTRAINT `payment_proofs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_proofs` ADD CONSTRAINT `payment_proofs_verifiedBy_users_id_fk` FOREIGN KEY (`verifiedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_transactions` ADD CONSTRAINT `subscription_transactions_subscriptionId_agency_subscriptions_id_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `agency_subscriptions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_transactions` ADD CONSTRAINT `subscription_transactions_agencyId_agencies_id_fk` FOREIGN KEY (`agencyId`) REFERENCES `agencies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_transactions` ADD CONSTRAINT `subscription_transactions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;