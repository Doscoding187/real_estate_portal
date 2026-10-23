ALTER TABLE `service_provider_reviews`
  ADD COLUMN `moderation_status` enum('pending','published','rejected') NOT NULL DEFAULT 'published',
  ADD COLUMN `moderation_note` text,
  ADD COLUMN `moderated_at` timestamp NULL;
