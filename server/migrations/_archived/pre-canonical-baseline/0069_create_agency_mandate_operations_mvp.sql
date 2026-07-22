-- Private seller-mandate operations; deliberately not a signing, CMA, or public-listing system.
CREATE TABLE IF NOT EXISTS `seller_mandate_operations` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agency_id` int NOT NULL,
  `seller_prospect_id` int NOT NULL,
  `status` enum('not_started','pricing_discussion','preparing','awaiting_seller','recorded','onboarding','listing_ready','expired','withdrawn') NOT NULL DEFAULT 'not_started',
  `seller_requested_price` decimal(15,2) NULL,
  `recommended_price_min` decimal(15,2) NULL,
  `recommended_price_max` decimal(15,2) NULL,
  `agreed_listing_price` decimal(15,2) NULL,
  `pricing_rationale` text NULL,
  `pricing_discussed_at` timestamp NULL,
  `price_review_at` timestamp NULL,
  `seller_objections` text NULL,
  `mandate_start_at` timestamp NULL,
  `document_status` enum('pending','received','signed','expired','replaced','not_applicable') NOT NULL DEFAULT 'pending',
  `document_name` varchar(255) NULL,
  `private_storage_reference` varchar(500) NULL,
  `document_date` timestamp NULL,
  `requirements` json NULL,
  `next_action` varchar(255) NULL,
  `listing_ready_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `uq_seller_mandate_operations_prospect` (`seller_prospect_id`),
  KEY `idx_seller_mandate_operations_agency_status` (`agency_id`,`status`),
  CONSTRAINT `seller_mandate_operations_agency_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `seller_mandate_operations_prospect_fk` FOREIGN KEY (`seller_prospect_id`) REFERENCES `seller_prospects` (`id`) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS `seller_mandate_comparables` (
  `id` int AUTO_INCREMENT NOT NULL, `agency_id` int NOT NULL, `mandate_operation_id` int NOT NULL,
  `reference` varchar(500) NOT NULL, `property_type` varchar(100) NULL, `area` varchar(200) NULL,
  `price` decimal(15,2) NULL, `price_kind` enum('asking','selling','other') NOT NULL DEFAULT 'other', `notes` text NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`),
  KEY `idx_seller_mandate_comparables_operation` (`mandate_operation_id`),
  CONSTRAINT `seller_mandate_comparables_agency_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `seller_mandate_comparables_operation_fk` FOREIGN KEY (`mandate_operation_id`) REFERENCES `seller_mandate_operations` (`id`) ON DELETE CASCADE
);
