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
--> statement-breakpoint
CREATE TABLE `saved_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`criteria` json NOT NULL,
	`notificationFrequency` enum('never','daily','weekly') DEFAULT 'never',
	`lastNotifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `listing_analytics` DROP FOREIGN KEY `listing_analytics_listingId_listings_id_fk`;
--> statement-breakpoint
ALTER TABLE `listing_approval_queue` DROP FOREIGN KEY `listing_approval_queue_listingId_listings_id_fk`;
--> statement-breakpoint
ALTER TABLE `listing_approval_queue` DROP FOREIGN KEY `listing_approval_queue_submittedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `listing_approval_queue` DROP FOREIGN KEY `listing_approval_queue_reviewedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `listing_leads` DROP FOREIGN KEY `listing_leads_listingId_listings_id_fk`;
--> statement-breakpoint
ALTER TABLE `listing_media` DROP FOREIGN KEY `listing_media_listingId_listings_id_fk`;
--> statement-breakpoint
ALTER TABLE `listing_viewings` DROP FOREIGN KEY `listing_viewings_listingId_listings_id_fk`;
--> statement-breakpoint
ALTER TABLE `listing_viewings` DROP FOREIGN KEY `listing_viewings_prospectId_prospects_id_fk`;
--> statement-breakpoint
ALTER TABLE `listing_viewings` DROP FOREIGN KEY `listing_viewings_agentId_agents_id_fk`;
--> statement-breakpoint
ALTER TABLE `listings` DROP FOREIGN KEY `listings_userId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `listing_analytics` MODIFY COLUMN `conversionRate` decimal(5,2);--> statement-breakpoint
ALTER TABLE `listing_analytics` MODIFY COLUMN `viewsByDay` json;--> statement-breakpoint
ALTER TABLE `listing_analytics` MODIFY COLUMN `trafficSources` json;--> statement-breakpoint
ALTER TABLE `listing_approval_queue` MODIFY COLUMN `submittedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `listing_leads` MODIFY COLUMN `name` varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE `listing_leads` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `listing_media` MODIFY COLUMN `displayOrder` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `listing_media` MODIFY COLUMN `processingStatus` enum('pending','processing','completed','failed') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `listing_media` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `listing_viewings` MODIFY COLUMN `status` enum('requested','confirmed','completed','cancelled','no_show') NOT NULL DEFAULT 'requested';--> statement-breakpoint
ALTER TABLE `listing_viewings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `listings` MODIFY COLUMN `propertyDetails` json;--> statement-breakpoint
ALTER TABLE `listings` MODIFY COLUMN `latitude` decimal(10,7) NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` MODIFY COLUMN `longitude` decimal(10,7) NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` MODIFY COLUMN `postalCode` varchar(20);--> statement-breakpoint
ALTER TABLE `listings` MODIFY COLUMN `status` enum('draft','pending_review','approved','published','rejected','archived','sold','rented') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `listings` MODIFY COLUMN `approvalStatus` enum('pending','approved','rejected') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `listings` MODIFY COLUMN `canonicalUrl` text;--> statement-breakpoint
ALTER TABLE `listings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `locations` MODIFY COLUMN `name` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `locations` MODIFY COLUMN `latitude` decimal(10,8);--> statement-breakpoint
ALTER TABLE `locations` MODIFY COLUMN `longitude` decimal(11,8);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `isSubaccount` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `listing_analytics` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `listing_approval_queue` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `listing_leads` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `listing_media` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `listing_viewings` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `listings` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `locations` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `listing_analytics` ADD `averageTimeOnPage` int;--> statement-breakpoint
ALTER TABLE `listing_analytics` ADD `leadConversionRate` decimal(5,2);--> statement-breakpoint
ALTER TABLE `listing_analytics` ADD `createdAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `listing_approval_queue` ADD `complianceChecks` json;--> statement-breakpoint
ALTER TABLE `listing_approval_queue` ADD `createdAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `listing_approval_queue` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `listing_leads` ADD `referrer` text;--> statement-breakpoint
ALTER TABLE `listing_leads` ADD `utmSource` varchar(100);--> statement-breakpoint
ALTER TABLE `listing_leads` ADD `utmMedium` varchar(100);--> statement-breakpoint
ALTER TABLE `listing_leads` ADD `utmCampaign` varchar(100);--> statement-breakpoint
ALTER TABLE `listing_leads` ADD `assignedTo` int;--> statement-breakpoint
ALTER TABLE `listing_leads` ADD `assignedAt` timestamp;--> statement-breakpoint
ALTER TABLE `listing_leads` ADD `crmSynced` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `listing_leads` ADD `crmSyncedAt` timestamp;--> statement-breakpoint
ALTER TABLE `listing_leads` ADD `crmId` varchar(255);--> statement-breakpoint
ALTER TABLE `listing_media` ADD `mediaType` enum('image','video','floorplan','pdf') NOT NULL;--> statement-breakpoint
ALTER TABLE `listing_media` ADD `originalUrl` text NOT NULL;--> statement-breakpoint
ALTER TABLE `listing_media` ADD `originalFileName` varchar(255);--> statement-breakpoint
ALTER TABLE `listing_media` ADD `originalFileSize` int;--> statement-breakpoint
ALTER TABLE `listing_media` ADD `processedUrl` text;--> statement-breakpoint
ALTER TABLE `listing_media` ADD `previewUrl` text;--> statement-breakpoint
ALTER TABLE `listing_media` ADD `mimeType` varchar(100);--> statement-breakpoint
ALTER TABLE `listing_media` ADD `isVertical` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `listing_media` ADD `processingError` text;--> statement-breakpoint
ALTER TABLE `listing_media` ADD `uploadedAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `listing_media` ADD `processedAt` timestamp;--> statement-breakpoint
ALTER TABLE `listing_viewings` ADD `leadId` int;--> statement-breakpoint
ALTER TABLE `listing_viewings` ADD `scheduledDate` timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE `listing_viewings` ADD `duration` int DEFAULT 30;--> statement-breakpoint
ALTER TABLE `listing_viewings` ADD `visitorName` varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE `listing_viewings` ADD `visitorEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `listing_viewings` ADD `visitorPhone` varchar(50);--> statement-breakpoint
ALTER TABLE `listing_viewings` ADD `agentNotes` text;--> statement-breakpoint
ALTER TABLE `listing_viewings` ADD `visitorFeedback` text;--> statement-breakpoint
ALTER TABLE `listing_viewings` ADD `visitorRating` int;--> statement-breakpoint
ALTER TABLE `listing_viewings` ADD `reminderSent` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `listing_viewings` ADD `confirmationSent` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `listings` ADD `ownerId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `agentId` int;--> statement-breakpoint
ALTER TABLE `listings` ADD `agencyId` int;--> statement-breakpoint
ALTER TABLE `listings` ADD `askingPrice` decimal(12,2);--> statement-breakpoint
ALTER TABLE `listings` ADD `negotiable` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `listings` ADD `transferCostEstimate` decimal(12,2);--> statement-breakpoint
ALTER TABLE `listings` ADD `monthlyRent` decimal(12,2);--> statement-breakpoint
ALTER TABLE `listings` ADD `deposit` decimal(12,2);--> statement-breakpoint
ALTER TABLE `listings` ADD `leaseTerms` varchar(100);--> statement-breakpoint
ALTER TABLE `listings` ADD `availableFrom` timestamp;--> statement-breakpoint
ALTER TABLE `listings` ADD `utilitiesIncluded` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `listings` ADD `startingBid` decimal(12,2);--> statement-breakpoint
ALTER TABLE `listings` ADD `reservePrice` decimal(12,2);--> statement-breakpoint
ALTER TABLE `listings` ADD `auctionDateTime` timestamp;--> statement-breakpoint
ALTER TABLE `listings` ADD `auctionTermsDocumentUrl` text;--> statement-breakpoint
ALTER TABLE `listings` ADD `mainMediaId` int;--> statement-breakpoint
ALTER TABLE `listings` ADD `mainMediaType` enum('image','video');--> statement-breakpoint
ALTER TABLE `listings` ADD `reviewedBy` int;--> statement-breakpoint
ALTER TABLE `listings` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `listings` ADD `autoPublished` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `listings` ADD `metaTitle` varchar(255);--> statement-breakpoint
ALTER TABLE `listings` ADD `metaDescription` text;--> statement-breakpoint
ALTER TABLE `listings` ADD `searchTags` text;--> statement-breakpoint
ALTER TABLE `listings` ADD `featured` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `locations` ADD `place_id` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `locations` ADD `full_address` text NOT NULL;--> statement-breakpoint
ALTER TABLE `locations` ADD `location_type` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `locations` ADD `province` varchar(100);--> statement-breakpoint
ALTER TABLE `locations` ADD `country` varchar(100) DEFAULT 'South Africa';--> statement-breakpoint
ALTER TABLE `locations` ADD `created_at` timestamp DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `locations` ADD `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `locations` ADD CONSTRAINT `locations_place_id_unique` UNIQUE(`place_id`);--> statement-breakpoint
ALTER TABLE `saved_searches` ADD CONSTRAINT `saved_searches_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_locations_place_id` ON `locations` (`place_id`);--> statement-breakpoint
CREATE INDEX `idx_locations_name` ON `locations` (`name`);--> statement-breakpoint
CREATE INDEX `idx_locations_type` ON `locations` (`location_type`);--> statement-breakpoint
ALTER TABLE `listing_media` DROP COLUMN `url`;--> statement-breakpoint
ALTER TABLE `listing_media` DROP COLUMN `type`;--> statement-breakpoint
ALTER TABLE `listing_media` DROP COLUMN `fileName`;--> statement-breakpoint
ALTER TABLE `listing_media` DROP COLUMN `fileSize`;--> statement-breakpoint
ALTER TABLE `listing_media` DROP COLUMN `updatedAt`;--> statement-breakpoint
ALTER TABLE `listing_viewings` DROP COLUMN `prospectId`;--> statement-breakpoint
ALTER TABLE `listing_viewings` DROP COLUMN `scheduledAt`;--> statement-breakpoint
ALTER TABLE `listing_viewings` DROP COLUMN `durationMinutes`;--> statement-breakpoint
ALTER TABLE `listing_viewings` DROP COLUMN `notes`;--> statement-breakpoint
ALTER TABLE `listings` DROP COLUMN `userId`;--> statement-breakpoint
ALTER TABLE `listings` DROP COLUMN `pricing`;--> statement-breakpoint
ALTER TABLE `listings` DROP COLUMN `approvalNotes`;--> statement-breakpoint
ALTER TABLE `locations` DROP COLUMN `slug`;--> statement-breakpoint
ALTER TABLE `locations` DROP COLUMN `type`;--> statement-breakpoint
ALTER TABLE `locations` DROP COLUMN `parentId`;--> statement-breakpoint
ALTER TABLE `locations` DROP COLUMN `description`;--> statement-breakpoint
ALTER TABLE `locations` DROP COLUMN `propertyCount`;--> statement-breakpoint
ALTER TABLE `locations` DROP COLUMN `createdAt`;--> statement-breakpoint
ALTER TABLE `locations` DROP COLUMN `updatedAt`;