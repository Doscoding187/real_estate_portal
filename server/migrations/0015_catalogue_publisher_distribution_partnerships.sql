ALTER TABLE `distribution_brand_partnerships`
  ADD COLUMN `catalogue_publisher_id` int,
  ADD KEY `idx_distribution_brand_partnerships_catalogue_publisher` (`catalogue_publisher_id`),
  ADD CONSTRAINT `fk_distribution_brand_partnerships_catalogue_publisher` FOREIGN KEY (`catalogue_publisher_id`) REFERENCES `catalogue_publishers` (`id`) ON DELETE RESTRICT;
