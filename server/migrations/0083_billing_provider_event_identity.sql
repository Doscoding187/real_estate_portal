-- P5 billing authority: durable provider-event identity and processing state.
CREATE TABLE `billing_provider_events` (
  `id` bigint AUTO_INCREMENT NOT NULL,
  `provider` varchar(40) NOT NULL,
  `provider_event_id` varchar(255) NOT NULL,
  `event_type` varchar(120) NOT NULL,
  `status` enum('received','processing','applied','ignored','failed') NOT NULL DEFAULT 'received',
  `payload` json NOT NULL,
  `occurred_at` timestamp NULL,
  `processed_at` timestamp NULL,
  `failure_reason` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `billing_provider_events_id` PRIMARY KEY(`id`),
  CONSTRAINT `uq_billing_provider_events_identity` UNIQUE(`provider`, `provider_event_id`)
);
CREATE INDEX `idx_billing_provider_events_status` ON `billing_provider_events` (`status`, `created_at`);
