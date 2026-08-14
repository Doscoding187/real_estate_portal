ALTER TABLE `developments`
  ADD COLUMN `catalogue_publisher_id` int,
  ADD KEY `idx_developments_catalogue_publisher` (`catalogue_publisher_id`),
  ADD CONSTRAINT `fk_developments_catalogue_publisher` FOREIGN KEY (`catalogue_publisher_id`) REFERENCES `catalogue_publishers` (`id`) ON DELETE RESTRICT;
