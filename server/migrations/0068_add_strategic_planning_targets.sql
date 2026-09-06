CREATE TABLE `strategic_planning_targets` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `objective_id` INT NOT NULL,
  `metric_key` ENUM('active_agents','active_agencies','active_developers','active_listings') NOT NULL,
  `label` VARCHAR(200) NOT NULL,
  `target_value` INT NOT NULL,
  `comparison_direction` ENUM('at_least','at_most') NOT NULL DEFAULT 'at_least',
  `evaluation_date` DATE NOT NULL,
  `created_by_user_id` INT NOT NULL,
  `updated_by_user_id` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_spp_tgt_objective_eval` (`objective_id`,`evaluation_date`),
  CONSTRAINT `fk_spp_tgt_objective` FOREIGN KEY (`objective_id`) REFERENCES `strategic_planning_objectives` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_spp_tgt_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_spp_tgt_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `spp_target_value_non_negative` CHECK (`target_value` >= 0)
);
