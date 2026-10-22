CREATE TABLE `development_team_contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `development_id` int NOT NULL,
  `phase_id` int,
  `role_title` varchar(100) NOT NULL,
  `display_name` varchar(255) NOT NULL,
  `organization_name` varchar(255),
  `email` varchar(320),
  `phone` varchar(50),
  `responsibility` text,
  `visible_to_partners` tinyint NOT NULL DEFAULT 0,
  `display_order` int NOT NULL DEFAULT 0,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_development_team_contacts_development` (`development_id`, `is_active`, `display_order`),
  KEY `idx_development_team_contacts_phase` (`phase_id`, `is_active`),
  CONSTRAINT `development_team_contacts_development_id_developments_id_fk`
    FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT `development_team_contacts_phase_id_development_phases_id_fk`
    FOREIGN KEY (`phase_id`) REFERENCES `development_phases` (`id`) ON DELETE RESTRICT ON UPDATE NO ACTION
);
