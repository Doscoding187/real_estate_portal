CREATE TABLE `activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`developerId` int NOT NULL,
	`activityType` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`metadata` json,
	`relatedEntityType` enum('development','unit','lead','campaign','team_member'),
	`relatedEntityId` int,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `developer_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`developerId` int NOT NULL,
	`userId` int,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`type` varchar(50) NOT NULL,
	`severity` enum('info','warning','error','success') NOT NULL DEFAULT 'info',
	`read` boolean NOT NULL DEFAULT false,
	`actionUrl` varchar(500),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `developer_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `developer_subscription_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriptionId` int NOT NULL,
	`maxDevelopments` int NOT NULL DEFAULT 1,
	`maxLeadsPerMonth` int NOT NULL DEFAULT 50,
	`maxTeamMembers` int NOT NULL DEFAULT 1,
	`analyticsRetentionDays` int NOT NULL DEFAULT 30,
	`crmIntegrationEnabled` int NOT NULL DEFAULT 0,
	`advancedAnalyticsEnabled` int NOT NULL DEFAULT 0,
	`bondIntegrationEnabled` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `developer_subscription_limits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `developer_subscription_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriptionId` int NOT NULL,
	`developmentsCount` int NOT NULL DEFAULT 0,
	`leadsThisMonth` int NOT NULL DEFAULT 0,
	`teamMembersCount` int NOT NULL DEFAULT 0,
	`lastResetAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `developer_subscription_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `developer_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`developerId` int NOT NULL,
	`planId` int,
	`tier` enum('free_trial','basic','premium') NOT NULL DEFAULT 'free_trial',
	`status` enum('active','cancelled','expired') NOT NULL DEFAULT 'active',
	`trialEndsAt` timestamp,
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`stripeSubscriptionId` varchar(100),
	`stripeCustomerId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `developer_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `development_phases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`developmentId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`phaseNumber` int NOT NULL,
	`description` text,
	`status` enum('planning','pre_launch','selling','sold_out','completed') NOT NULL DEFAULT 'planning',
	`totalUnits` int NOT NULL DEFAULT 0,
	`availableUnits` int NOT NULL DEFAULT 0,
	`priceFrom` int,
	`priceTo` int,
	`launchDate` timestamp,
	`completionDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `development_phases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `development_units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`developmentId` int NOT NULL,
	`phaseId` int,
	`unitNumber` varchar(100) NOT NULL,
	`unitType` enum('studio','1bed','2bed','3bed','4bed+','penthouse','townhouse','house') NOT NULL,
	`bedrooms` int,
	`bathrooms` decimal(3,1),
	`size` decimal(10,2),
	`price` decimal(12,2) NOT NULL,
	`floorPlan` text,
	`floor` int,
	`facing` varchar(50),
	`features` text,
	`status` enum('available','reserved','sold') NOT NULL DEFAULT 'available',
	`reservedAt` timestamp,
	`reservedBy` int,
	`soldAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `development_units_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `isFeatured` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `views` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `developments` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `developers` ADD `specializations` text;--> statement-breakpoint
ALTER TABLE `developers` ADD `completedProjects` int;--> statement-breakpoint
ALTER TABLE `developers` ADD `currentProjects` int;--> statement-breakpoint
ALTER TABLE `developers` ADD `upcomingProjects` int;--> statement-breakpoint
ALTER TABLE `developers` ADD `kpiCache` json;--> statement-breakpoint
ALTER TABLE `developers` ADD `lastKpiCalculation` timestamp;--> statement-breakpoint
ALTER TABLE `developments` ADD `slug` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `developments` ADD `floorPlans` text;--> statement-breakpoint
ALTER TABLE `developments` ADD `brochures` text;--> statement-breakpoint
ALTER TABLE `developments` ADD `isPublished` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `developments` ADD `publishedAt` timestamp;--> statement-breakpoint
ALTER TABLE `leads` ADD `affordability_data` json;--> statement-breakpoint
ALTER TABLE `leads` ADD `qualification_status` enum('qualified','partially_qualified','unqualified','pending') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `leads` ADD `qualification_score` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `leads` ADD `lead_source` varchar(100);--> statement-breakpoint
ALTER TABLE `leads` ADD `referrer_url` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `utm_source` varchar(100);--> statement-breakpoint
ALTER TABLE `leads` ADD `utm_medium` varchar(100);--> statement-breakpoint
ALTER TABLE `leads` ADD `utm_campaign` varchar(100);--> statement-breakpoint
ALTER TABLE `leads` ADD `funnel_stage` enum('interest','affordability','qualification','viewing','offer','bond','sale') DEFAULT 'interest';--> statement-breakpoint
ALTER TABLE `leads` ADD `assigned_to` int;--> statement-breakpoint
ALTER TABLE `leads` ADD `assigned_at` timestamp;--> statement-breakpoint
ALTER TABLE `leads` ADD `converted_at` timestamp;--> statement-breakpoint
ALTER TABLE `leads` ADD `lost_reason` text;--> statement-breakpoint
ALTER TABLE `developments` ADD CONSTRAINT `developments_slug_unique` UNIQUE(`slug`);--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_developerId_developers_id_fk` FOREIGN KEY (`developerId`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_notifications` ADD CONSTRAINT `developer_notifications_developerId_developers_id_fk` FOREIGN KEY (`developerId`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_notifications` ADD CONSTRAINT `developer_notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` ADD CONSTRAINT `developer_subscription_limits_subscriptionId_developer_subscriptions_id_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `developer_subscriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` ADD CONSTRAINT `developer_subscription_usage_subscriptionId_developer_subscriptions_id_fk` FOREIGN KEY (`subscriptionId`) REFERENCES `developer_subscriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD CONSTRAINT `developer_subscriptions_developerId_developers_id_fk` FOREIGN KEY (`developerId`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD CONSTRAINT `developer_subscriptions_planId_plans_id_fk` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_phases` ADD CONSTRAINT `development_phases_developmentId_developments_id_fk` FOREIGN KEY (`developmentId`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_units` ADD CONSTRAINT `development_units_developmentId_developments_id_fk` FOREIGN KEY (`developmentId`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_units` ADD CONSTRAINT `development_units_phaseId_development_phases_id_fk` FOREIGN KEY (`phaseId`) REFERENCES `development_phases`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_activities_developer_id` ON `activities` (`developerId`);--> statement-breakpoint
CREATE INDEX `idx_activities_type` ON `activities` (`activityType`);--> statement-breakpoint
CREATE INDEX `idx_activities_created_at` ON `activities` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_activities_related_entity` ON `activities` (`relatedEntityType`,`relatedEntityId`);--> statement-breakpoint
CREATE INDEX `idx_activities_feed` ON `activities` (`developerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_developer_notifications_developer_id` ON `developer_notifications` (`developerId`);--> statement-breakpoint
CREATE INDEX `idx_developer_notifications_user_id` ON `developer_notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_developer_notifications_read` ON `developer_notifications` (`read`);--> statement-breakpoint
CREATE INDEX `idx_developer_notifications_created_at` ON `developer_notifications` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_developer_notifications_type` ON `developer_notifications` (`type`);--> statement-breakpoint
CREATE INDEX `idx_developer_notifications_feed` ON `developer_notifications` (`developerId`,`read`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_developers_last_kpi_calculation` ON `developers` (`lastKpiCalculation`);--> statement-breakpoint
UPDATE developers SET specializations = JSON_ARRAY(category) WHERE specializations IS NULL;