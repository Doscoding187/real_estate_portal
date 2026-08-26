CREATE TABLE `service_offerings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` int NOT NULL,
  `taxonomy_node_id` int NOT NULL,
  `display_name_override` varchar(140),
  `description` text,
  `price_min` int,
  `price_max` int,
  `currency` varchar(8) NOT NULL DEFAULT 'ZAR',
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_service_offerings_provider_node` UNIQUE (`provider_id`,`taxonomy_node_id`),
  KEY `idx_service_offerings_node` (`taxonomy_node_id`),
  CONSTRAINT `fk_service_offerings_provider` FOREIGN KEY (`provider_id`) REFERENCES `service_providers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_service_offerings_node` FOREIGN KEY (`taxonomy_node_id`) REFERENCES `service_taxonomy_nodes` (`id`)
);
