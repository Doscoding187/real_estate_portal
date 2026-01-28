ALTER TABLE `developer_brand_profiles` DROP FOREIGN KEY `developer_brand_profiles_linked_developer_account_id_developers_id_fk`;
--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` DROP FOREIGN KEY `developer_subscription_limits_subscription_id_developer_subscriptions_id_fk`;
--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` DROP FOREIGN KEY `developer_subscription_usage_subscription_id_developer_subscriptions_id_fk`;
--> statement-breakpoint
ALTER TABLE `development_drafts` DROP FOREIGN KEY `development_drafts_developer_brand_profile_id_developer_brand_profiles_id_fk`;
--> statement-breakpoint
ALTER TABLE `development_lead_routes` DROP FOREIGN KEY `development_lead_routes_source_brand_profile_id_developer_brand_profiles_id_fk`;
--> statement-breakpoint
ALTER TABLE `development_lead_routes` DROP FOREIGN KEY `development_lead_routes_receiver_brand_profile_id_developer_brand_profiles_id_fk`;
--> statement-breakpoint
ALTER TABLE `development_lead_routes` DROP FOREIGN KEY `development_lead_routes_fallback_brand_profile_id_developer_brand_profiles_id_fk`;
--> statement-breakpoint
ALTER TABLE `development_partners` DROP FOREIGN KEY `development_partners_brand_profile_id_developer_brand_profiles_id_fk`;
--> statement-breakpoint
ALTER TABLE `developments` DROP FOREIGN KEY `developments_developer_brand_profile_id_developer_brand_profiles_id_fk`;
--> statement-breakpoint
ALTER TABLE `developments` DROP FOREIGN KEY `developments_marketing_brand_profile_id_developer_brand_profiles_id_fk`;
--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` DROP FOREIGN KEY `explore_discovery_videos_explore_content_id_explore_content_id_fk`;
--> statement-breakpoint
ALTER TABLE `activities` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `agencies` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `agency_branding` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `agency_join_requests` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `agency_subscriptions` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `agent_coverage_areas` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `agents` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `amenities` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `analytics_aggregations` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `audit_logs` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `boost_credits` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `cities` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `city_price_analytics` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `commissions` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `coupons` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `developer_brand_profiles` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `developer_notifications` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `developers` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `development_approval_queue` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `development_drafts` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `development_phases` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `development_units` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `developments` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `email_templates` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_categories` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_content` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_creator_follows` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_engagements` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_highlight_tags` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_interactions` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_neighbourhood_follows` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_neighbourhood_stories` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_saved_properties` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_sponsorships` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_topics` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_user_preferences` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `exploreVideos` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `favorites` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `invitations` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `invites` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `invoices` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `lead_activities` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `leads` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `listing_analytics` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `listing_approval_queue` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `listing_leads` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `listing_media` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `listing_settings` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `listing_viewings` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `listings` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `location_analytics_events` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `location_search_cache` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `location_searches` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `location_targeting` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `locations` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `market_insights_cache` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `notifications` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `offers` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `partners` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `payment_methods` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `plans` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `platform_inquiries` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `platform_settings` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `price_analytics` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `price_history` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `price_predictions` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `properties` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `property_clicks` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `propertyImages` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `property_similarity_index` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `prospect_favorites` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `prospects` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `provinces` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `recent_searches` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `recently_viewed` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `reviews` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `saved_searches` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `scheduled_viewings` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `search_analytics` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `services` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `showings` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `subscription_events` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `subscription_plans` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `subscription_usage` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `suburb_price_analytics` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `suburb_reviews` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `suburbs` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `user_behavior_events` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `user_preferences` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `user_recommendations` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `user_subscriptions` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `users` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `videoLikes` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `videos` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `developer_brand_profiles` ADD CONSTRAINT `fk_brand_dev_acc` FOREIGN KEY (`linked_developer_account_id`) REFERENCES `developers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` ADD CONSTRAINT `fk_dev_sub_lim_sub` FOREIGN KEY (`subscription_id`) REFERENCES `developer_subscriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` ADD CONSTRAINT `fk_dev_sub_use_sub` FOREIGN KEY (`subscription_id`) REFERENCES `developer_subscriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_drafts` ADD CONSTRAINT `fk_dev_draft_brand` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `fk_lead_routes_source` FOREIGN KEY (`source_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `fk_lead_routes_recv` FOREIGN KEY (`receiver_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `fk_lead_routes_fall` FOREIGN KEY (`fallback_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_partners` ADD CONSTRAINT `fk_dev_partner_branded_prof` FOREIGN KEY (`brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developments` ADD CONSTRAINT `fk_dev_brand_prof` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developments` ADD CONSTRAINT `fk_dev_mkt_prof` FOREIGN KEY (`marketing_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` ADD CONSTRAINT `fk_exp_vid_content` FOREIGN KEY (`explore_content_id`) REFERENCES `explore_content`(`id`) ON DELETE cascade ON UPDATE no action;