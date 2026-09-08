ALTER TABLE `distribution_development_access`
  ADD COLUMN `catalogue_publisher_id` int;

CREATE INDEX `idx_distribution_development_access_catalogue_publisher`
  ON `distribution_development_access` (`catalogue_publisher_id`);

ALTER TABLE `distribution_development_access`
  ADD CONSTRAINT `fk_distribution_development_access_catalogue_publisher`
  FOREIGN KEY (`catalogue_publisher_id`) REFERENCES `catalogue_publishers` (`id`) ON DELETE RESTRICT;
