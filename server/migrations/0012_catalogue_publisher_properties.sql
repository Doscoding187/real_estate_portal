ALTER TABLE `properties`
  ADD COLUMN `catalogue_publisher_id` int;

CREATE INDEX `idx_properties_catalogue_publisher`
  ON `properties` (`catalogue_publisher_id`);

ALTER TABLE `properties`
  ADD CONSTRAINT `fk_properties_catalogue_publisher`
  FOREIGN KEY (`catalogue_publisher_id`) REFERENCES `catalogue_publishers` (`id`) ON DELETE SET NULL;
