ALTER TABLE `distribution_brand_partnerships`
  ADD COLUMN `catalogue_publisher_id` int;

CREATE INDEX `idx_distribution_brand_partnerships_catalogue_publisher`
  ON `distribution_brand_partnerships` (`catalogue_publisher_id`);

ALTER TABLE `distribution_brand_partnerships`
  ADD CONSTRAINT `fk_distribution_brand_partnerships_catalogue_publisher`
  FOREIGN KEY (`catalogue_publisher_id`) REFERENCES `catalogue_publishers` (`id`) ON DELETE RESTRICT;
