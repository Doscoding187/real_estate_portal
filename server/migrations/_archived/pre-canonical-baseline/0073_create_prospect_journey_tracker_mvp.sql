CREATE TABLE `prospect_identities` (
  `id` varchar(36) NOT NULL,
  `user_id` int NULL,
  `contact_preferences` json NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prospect_identities_user` (`user_id`),
  CONSTRAINT `prospect_identity_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

ALTER TABLE `leads`
  ADD COLUMN `prospect_identity_id` varchar(36) NULL,
  ADD CONSTRAINT `lead_prospect_identity_fk` FOREIGN KEY (`prospect_identity_id`) REFERENCES `prospect_identities` (`id`) ON DELETE SET NULL;
CREATE INDEX `idx_leads_prospect_identity` ON `leads` (`prospect_identity_id`);

ALTER TABLE `showings`
  ADD COLUMN `prospect_identity_id` varchar(36) NULL,
  ADD CONSTRAINT `showing_prospect_identity_fk` FOREIGN KEY (`prospect_identity_id`) REFERENCES `prospect_identities` (`id`) ON DELETE SET NULL;
CREATE INDEX `idx_showings_prospect_identity` ON `showings` (`prospect_identity_id`);

CREATE TABLE `prospect_action_attributions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `lead_id` int NOT NULL,
  `source_type` varchar(80) NOT NULL,
  `source_entity_id` varchar(120) NULL,
  `campaign_context` json NULL,
  `utm_context` json NULL,
  `referrer_context` text NULL,
  `first_touch` json NULL,
  `last_touch` json NULL,
  `action_touch` json NOT NULL,
  `captured_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prospect_action_attribution_lead` (`lead_id`),
  CONSTRAINT `prospect_action_attribution_lead_fk` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE
);

CREATE TABLE `prospect_action_claim_tokens` (
  `id` int AUTO_INCREMENT NOT NULL,
  `lead_id` int NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `used_at` timestamp NULL,
  `claimed_by_user_id` int NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prospect_action_claim_token_hash` (`token_hash`),
  KEY `idx_prospect_action_claim_lead` (`lead_id`),
  CONSTRAINT `prospect_action_claim_lead_fk` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `prospect_action_claim_user_fk` FOREIGN KEY (`claimed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
