-- B10: append-only provider attempts and fenced claim identity.
CREATE TABLE `transactional_email_attempts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `delivery_id` int NOT NULL,
  `attempt_number` int NOT NULL,
  `claim_token` varchar(64) NOT NULL,
  `state` enum('claimed','accepted','retryable_failed','permanent_failed','unknown') NOT NULL,
  `provider_reference` varchar(255),
  `error_code` varchar(80),
  `claimed_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `finished_at` timestamp(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_transactional_email_attempt_number` (`delivery_id`,`attempt_number`),
  UNIQUE KEY `uq_transactional_email_attempt_token` (`claim_token`),
  CONSTRAINT `transactional_email_attempts_delivery_id_fk` FOREIGN KEY (`delivery_id`) REFERENCES `transactional_email_deliveries` (`id`) ON DELETE RESTRICT
);
