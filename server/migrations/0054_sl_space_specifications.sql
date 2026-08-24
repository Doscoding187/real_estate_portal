CREATE TABLE `sl_space_specifications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `space_id` INT NOT NULL,
  `specification_code` VARCHAR(64) NOT NULL,
  `value_state` ENUM('known','unknown') NOT NULL DEFAULT 'known',
  `text_value` VARCHAR(255) NULL,
  `boolean_value` TINYINT NULL,
  `numeric_value` DECIMAL(12,2) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sl_space_specifications_code` (`space_id`,`specification_code`),
  CONSTRAINT `fk_sl_space_specifications_space` FOREIGN KEY (`space_id`) REFERENCES `sl_spaces` (`id`) ON DELETE CASCADE
);
