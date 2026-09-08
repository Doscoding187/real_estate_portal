ALTER TABLE `leads`
  ADD COLUMN `capture_request_id` varchar(128) NULL,
  ADD COLUMN `consent_captured_at` timestamp NULL,
  ADD COLUMN `consent_version` varchar(64) NULL,
  ADD COLUMN `consent_source` varchar(100) NULL,
  ADD COLUMN `delivery_status` enum('pending','delivered','failed','attention_required') NOT NULL DEFAULT 'pending',
  ADD COLUMN `delivery_attempts` json NULL,
  ADD COLUMN `delivery_last_attempt_at` timestamp NULL,
  ADD COLUMN `delivery_next_attempt_at` timestamp NULL,
  ADD COLUMN `delivery_last_error` text NULL,
  ADD COLUMN `delivery_provider_reference` varchar(255) NULL;

CREATE UNIQUE INDEX `uq_leads_capture_request` ON `leads` (`capture_request_id`);
