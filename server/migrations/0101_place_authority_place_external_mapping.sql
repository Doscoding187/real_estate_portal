-- P9 Place Authority (Slice 1): `place_external_mapping` provider observations.
--
-- Provider data is evidence and enrichment only. A provider place ID or label can
-- never become public identity (D3), so this table records observations against
-- an existing Place and holds no eligibility or authority columns of its own.
CREATE TABLE `place_external_mapping` (
  `id` int AUTO_INCREMENT NOT NULL,
  `place_id` varchar(40) NOT NULL,
  `provider` varchar(64) NOT NULL,
  `provider_record_id` varchar(255) NOT NULL,
  `provider_label` varchar(255),
  `normalized_alias` varchar(255),
  `observed_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `place_external_mapping_id` PRIMARY KEY(`id`),
  CONSTRAINT `place_external_mapping_provider_record_uq` UNIQUE(`provider`,`provider_record_id`),
  CONSTRAINT `place_external_mapping_place_fk`
    FOREIGN KEY (`place_id`) REFERENCES `place`(`place_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  INDEX `idx_place_external_mapping_place` (`place_id`),
  INDEX `idx_place_external_mapping_alias` (`provider`,`normalized_alias`)
);
