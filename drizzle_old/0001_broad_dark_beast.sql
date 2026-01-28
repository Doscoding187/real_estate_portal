ALTER TABLE `agencies` DROP INDEX `agencies_slug_unique`;--> statement-breakpoint
ALTER TABLE `agency_subscriptions` DROP INDEX `agency_subscriptions_stripeSubscriptionId_unique`;--> statement-breakpoint
ALTER TABLE `coupons` DROP INDEX `coupons_code_unique`;--> statement-breakpoint
ALTER TABLE `coupons` DROP INDEX `coupons_stripeCouponId_unique`;--> statement-breakpoint
ALTER TABLE `email_templates` DROP INDEX `email_templates_templateKey_unique`;--> statement-breakpoint
ALTER TABLE `invitations` DROP INDEX `invitations_token_unique`;--> statement-breakpoint
ALTER TABLE `invites` DROP INDEX `invites_token_unique`;--> statement-breakpoint
ALTER TABLE `invoices` DROP INDEX `invoices_stripeInvoiceId_unique`;--> statement-breakpoint
ALTER TABLE `locations` DROP INDEX `locations_slug_unique`;--> statement-breakpoint
ALTER TABLE `market_insights_cache` DROP INDEX `market_insights_cache_cacheKey_unique`;--> statement-breakpoint
ALTER TABLE `payment_methods` DROP INDEX `payment_methods_stripePaymentMethodId_unique`;--> statement-breakpoint
ALTER TABLE `plans` DROP INDEX `plans_name_unique`;--> statement-breakpoint
ALTER TABLE `plans` DROP INDEX `plans_stripePriceId_unique`;--> statement-breakpoint
ALTER TABLE `platform_settings` DROP INDEX `platform_settings_key_unique`;--> statement-breakpoint
ALTER TABLE `provinces` DROP INDEX `provinces_code_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_openId_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_email_unique`;--> statement-breakpoint
ALTER TABLE `agencies` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `agency_branding` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `agency_join_requests` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `agency_subscriptions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `agent_coverage_areas` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `agents` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `audit_logs` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `cities` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `city_price_analytics` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `commissions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `coupons` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `developers` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `developments` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `email_templates` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `exploreVideos` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `favorites` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `invitations` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `invites` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `invoices` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `lead_activities` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `leads` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `location_search_cache` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `locations` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `market_insights_cache` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `notifications` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `offers` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `payment_methods` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `plans` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `platform_settings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `price_analytics` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `price_history` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `price_predictions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `properties` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `propertyImages` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `property_similarity_index` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `prospect_favorites` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `prospects` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `provinces` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `recently_viewed` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `reviews` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `scheduled_viewings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `services` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `showings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `suburb_price_analytics` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `suburbs` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `user_behavior_events` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `user_preferences` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `user_recommendations` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `users` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `videoLikes` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `videos` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `agencies` MODIFY COLUMN `isVerified` int NOT NULL;--> statement-breakpoint
ALTER TABLE `agencies` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `agency_branding` MODIFY COLUMN `isEnabled` int NOT NULL;--> statement-breakpoint
ALTER TABLE `agency_branding` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `agency_join_requests` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `agency_subscriptions` MODIFY COLUMN `cancelAtPeriodEnd` int NOT NULL;--> statement-breakpoint
ALTER TABLE `agency_subscriptions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `agent_coverage_areas` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `agents` MODIFY COLUMN `rating` int;--> statement-breakpoint
ALTER TABLE `agents` MODIFY COLUMN `reviewCount` int;--> statement-breakpoint
ALTER TABLE `agents` MODIFY COLUMN `totalSales` int;--> statement-breakpoint
ALTER TABLE `agents` MODIFY COLUMN `isVerified` int NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` MODIFY COLUMN `isFeatured` int NOT NULL;--> statement-breakpoint
ALTER TABLE `agents` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `analytics_aggregations` MODIFY COLUMN `totalProperties` int;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` MODIFY COLUMN `activeListings` int;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` MODIFY COLUMN `totalViews` int;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` MODIFY COLUMN `totalSaves` int;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` MODIFY COLUMN `totalContacts` int;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` MODIFY COLUMN `uniqueVisitors` int;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` MODIFY COLUMN `newListings` int;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` MODIFY COLUMN `soldProperties` int;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` MODIFY COLUMN `rentedProperties` int;--> statement-breakpoint
ALTER TABLE `analytics_aggregations` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `audit_logs` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `cities` MODIFY COLUMN `isMetro` int NOT NULL;--> statement-breakpoint
ALTER TABLE `cities` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `city_price_analytics` MODIFY COLUMN `currentPriceCount` int;--> statement-breakpoint
ALTER TABLE `city_price_analytics` MODIFY COLUMN `totalProperties` int;--> statement-breakpoint
ALTER TABLE `city_price_analytics` MODIFY COLUMN `activeListings` int;--> statement-breakpoint
ALTER TABLE `city_price_analytics` MODIFY COLUMN `averageDaysOnMarket` int;--> statement-breakpoint
ALTER TABLE `city_price_analytics` MODIFY COLUMN `luxurySegmentPercent` int;--> statement-breakpoint
ALTER TABLE `city_price_analytics` MODIFY COLUMN `midRangePercent` int;--> statement-breakpoint
ALTER TABLE `city_price_analytics` MODIFY COLUMN `affordablePercent` int;--> statement-breakpoint
ALTER TABLE `commissions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `coupons` MODIFY COLUMN `redemptionsUsed` int NOT NULL;--> statement-breakpoint
ALTER TABLE `coupons` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `developers` MODIFY COLUMN `totalProjects` int;--> statement-breakpoint
ALTER TABLE `developers` MODIFY COLUMN `rating` int;--> statement-breakpoint
ALTER TABLE `developers` MODIFY COLUMN `reviewCount` int;--> statement-breakpoint
ALTER TABLE `developers` MODIFY COLUMN `isVerified` int NOT NULL;--> statement-breakpoint
ALTER TABLE `developers` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `isFeatured` int NOT NULL;--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `views` int NOT NULL;--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `email_templates` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `exploreVideos` MODIFY COLUMN `views` int NOT NULL;--> statement-breakpoint
ALTER TABLE `exploreVideos` MODIFY COLUMN `likes` int NOT NULL;--> statement-breakpoint
ALTER TABLE `exploreVideos` MODIFY COLUMN `shares` int NOT NULL;--> statement-breakpoint
ALTER TABLE `exploreVideos` MODIFY COLUMN `isFeatured` int NOT NULL;--> statement-breakpoint
ALTER TABLE `exploreVideos` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `favorites` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `invitations` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `invites` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `invites` MODIFY COLUMN `used` int NOT NULL;--> statement-breakpoint
ALTER TABLE `invoices` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `lead_activities` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `location_search_cache` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `locations` MODIFY COLUMN `propertyCount` int;--> statement-breakpoint
ALTER TABLE `locations` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `market_insights_cache` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `isRead` int NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `offers` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `payment_methods` MODIFY COLUMN `isDefault` int NOT NULL;--> statement-breakpoint
ALTER TABLE `payment_methods` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `plans` MODIFY COLUMN `isPopular` int NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` MODIFY COLUMN `sortOrder` int NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `platform_settings` MODIFY COLUMN `isPublic` int NOT NULL;--> statement-breakpoint
ALTER TABLE `platform_settings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `price_analytics` MODIFY COLUMN `currentPriceCount` int;--> statement-breakpoint
ALTER TABLE `price_analytics` MODIFY COLUMN `luxurySegmentPercent` int;--> statement-breakpoint
ALTER TABLE `price_analytics` MODIFY COLUMN `midRangePercent` int;--> statement-breakpoint
ALTER TABLE `price_analytics` MODIFY COLUMN `affordablePercent` int;--> statement-breakpoint
ALTER TABLE `price_analytics` MODIFY COLUMN `avgDaysOnMarket` int;--> statement-breakpoint
ALTER TABLE `price_analytics` MODIFY COLUMN `newListingsMonthly` int;--> statement-breakpoint
ALTER TABLE `price_analytics` MODIFY COLUMN `soldPropertiesMonthly` int;--> statement-breakpoint
ALTER TABLE `price_analytics` MODIFY COLUMN `trendConfidence` int;--> statement-breakpoint
ALTER TABLE `price_analytics` MODIFY COLUMN `totalProperties` int;--> statement-breakpoint
ALTER TABLE `price_analytics` MODIFY COLUMN `activeListings` int;--> statement-breakpoint
ALTER TABLE `price_analytics` MODIFY COLUMN `userInteractions` int;--> statement-breakpoint
ALTER TABLE `price_analytics` MODIFY COLUMN `priceVolatility` int;--> statement-breakpoint
ALTER TABLE `price_analytics` MODIFY COLUMN `marketMomentum` int;--> statement-breakpoint
ALTER TABLE `price_analytics` MODIFY COLUMN `investmentScore` int;--> statement-breakpoint
ALTER TABLE `price_history` MODIFY COLUMN `recordedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `price_history` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `price_predictions` MODIFY COLUMN `confidenceScore` int;--> statement-breakpoint
ALTER TABLE `price_predictions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `properties` MODIFY COLUMN `featured` int NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` MODIFY COLUMN `views` int NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` MODIFY COLUMN `enquiries` int NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `propertyImages` MODIFY COLUMN `isPrimary` int NOT NULL;--> statement-breakpoint
ALTER TABLE `propertyImages` MODIFY COLUMN `displayOrder` int NOT NULL;--> statement-breakpoint
ALTER TABLE `propertyImages` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `property_similarity_index` MODIFY COLUMN `locationSimilarity` int;--> statement-breakpoint
ALTER TABLE `property_similarity_index` MODIFY COLUMN `priceSimilarity` int;--> statement-breakpoint
ALTER TABLE `property_similarity_index` MODIFY COLUMN `typeSimilarity` int;--> statement-breakpoint
ALTER TABLE `property_similarity_index` MODIFY COLUMN `featureSimilarity` int;--> statement-breakpoint
ALTER TABLE `property_similarity_index` MODIFY COLUMN `overallSimilarity` int;--> statement-breakpoint
ALTER TABLE `property_similarity_index` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `prospect_favorites` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `prospects` MODIFY COLUMN `dependents` int;--> statement-breakpoint
ALTER TABLE `prospects` MODIFY COLUMN `hasCreditConsent` int;--> statement-breakpoint
ALTER TABLE `prospects` MODIFY COLUMN `profileProgress` int;--> statement-breakpoint
ALTER TABLE `prospects` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `provinces` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `recently_viewed` MODIFY COLUMN `viewedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `reviews` MODIFY COLUMN `isVerified` int NOT NULL;--> statement-breakpoint
ALTER TABLE `reviews` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `scheduled_viewings` MODIFY COLUMN `notificationSent` int;--> statement-breakpoint
ALTER TABLE `scheduled_viewings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `services` MODIFY COLUMN `isFeatured` int NOT NULL;--> statement-breakpoint
ALTER TABLE `services` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `showings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `suburb_price_analytics` MODIFY COLUMN `currentPriceCount` int;--> statement-breakpoint
ALTER TABLE `suburb_price_analytics` MODIFY COLUMN `lastMonthPriceCount` int;--> statement-breakpoint
ALTER TABLE `suburb_price_analytics` MODIFY COLUMN `trendConfidence` int;--> statement-breakpoint
ALTER TABLE `suburbs` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `user_behavior_events` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `user_preferences` MODIFY COLUMN `petFriendly` int;--> statement-breakpoint
ALTER TABLE `user_preferences` MODIFY COLUMN `smsNotifications` int;--> statement-breakpoint
ALTER TABLE `user_preferences` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `user_recommendations` MODIFY COLUMN `recommendationClickCount` int;--> statement-breakpoint
ALTER TABLE `user_recommendations` MODIFY COLUMN `recommendationConversionCount` int;--> statement-breakpoint
ALTER TABLE `user_recommendations` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `emailVerified` int NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `isSubaccount` int NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `videoLikes` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `videos` MODIFY COLUMN `duration` int;--> statement-breakpoint
ALTER TABLE `videos` MODIFY COLUMN `views` int NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` MODIFY COLUMN `likes` int NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` MODIFY COLUMN `shares` int NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` MODIFY COLUMN `isFeatured` int NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `location_search_cache` ADD `resultsJson` text NOT NULL;--> statement-breakpoint
ALTER TABLE `location_search_cache` DROP COLUMN `resultsJSON`;