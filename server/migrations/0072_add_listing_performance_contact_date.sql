-- Existing environments may already have applied 0071 before contact date was persisted.
ALTER TABLE `agency_listing_performance_reviews` ADD COLUMN `contact_date` timestamp NULL AFTER `review_status`;
