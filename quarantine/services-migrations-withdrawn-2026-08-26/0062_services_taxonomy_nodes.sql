CREATE TABLE `service_taxonomy_nodes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parent_id` int,
  `slug` varchar(120) NOT NULL,
  `level` enum('family','category','service','capability') NOT NULL,
  `name` varchar(140) NOT NULL,
  `description` text,
  `icon_key` varchar(60),
  `is_active` tinyint NOT NULL DEFAULT 1,
  `sort_order` int NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_service_taxonomy_nodes_slug` UNIQUE (`slug`),
  KEY `idx_service_taxonomy_nodes_parent` (`parent_id`),
  KEY `idx_service_taxonomy_nodes_level` (`level`)
);
