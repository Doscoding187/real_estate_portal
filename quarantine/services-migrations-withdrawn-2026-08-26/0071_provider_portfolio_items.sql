CREATE TABLE `provider_portfolio_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` int NOT NULL,
  `media_url` varchar(500) NOT NULL,
  `caption` varchar(300),
  `content_type` varchar(40) NOT NULL DEFAULT 'image',
  `linked_explore_content_id` int,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_published` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_provider_portfolio_provider` (`provider_id`),
  CONSTRAINT `fk_provider_portfolio_provider` FOREIGN KEY (`provider_id`) REFERENCES `service_providers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_provider_portfolio_explore_content` FOREIGN KEY (`linked_explore_content_id`) REFERENCES `explore_content` (`id`) ON DELETE SET NULL
);
