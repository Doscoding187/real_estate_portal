ALTER TABLE `developments`
  ADD COLUMN `catalogue_publisher_id` int;

CREATE INDEX `idx_developments_catalogue_publisher`
  ON `developments` (`catalogue_publisher_id`);

ALTER TABLE `developments`
  ADD CONSTRAINT `fk_developments_catalogue_publisher`
  FOREIGN KEY (`catalogue_publisher_id`) REFERENCES `catalogue_publishers` (`id`) ON DELETE RESTRICT;
