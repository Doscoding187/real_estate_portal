CREATE TABLE `sl_space_availability` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `space_id` INT NOT NULL,
  `available_from` DATE NULL,
  `minimum_stay_months` INT NULL,
  `rent_amount_minor` INT NOT NULL DEFAULT 0,
  `rent_unknown` TINYINT NOT NULL DEFAULT 0,
  `deposit_minor` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sl_space_availability_space` (`space_id`),
  CONSTRAINT `fk_sl_space_availability_space` FOREIGN KEY (`space_id`) REFERENCES `sl_spaces` (`id`) ON DELETE CASCADE
);
