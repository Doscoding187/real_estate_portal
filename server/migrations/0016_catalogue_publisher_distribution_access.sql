ALTER TABLE `distribution_development_access`
  ADD COLUMN `catalogue_publisher_id` int,
  ADD KEY `idx_distribution_development_access_catalogue_publisher` (`catalogue_publisher_id`),
  ADD CONSTRAINT `fk_distribution_development_access_catalogue_publisher` FOREIGN KEY (`catalogue_publisher_id`) REFERENCES `catalogue_publishers` (`id`) ON DELETE RESTRICT;
