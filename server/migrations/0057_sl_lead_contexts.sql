CREATE TABLE `sl_lead_contexts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `lead_id` INT NOT NULL,
  `place_id` INT NOT NULL,
  `space_id` INT NULL,
  `space_label_snapshot` VARCHAR(120) NULL,
  `space_type_snapshot` VARCHAR(64) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sl_lead_contexts_lead` (`lead_id`),
  KEY `idx_sl_lead_contexts_place` (`place_id`),
  CONSTRAINT `fk_sl_lead_contexts_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sl_lead_contexts_place` FOREIGN KEY (`place_id`) REFERENCES `sl_places` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_sl_lead_contexts_space` FOREIGN KEY (`space_id`) REFERENCES `sl_spaces` (`id`) ON DELETE SET NULL
);
