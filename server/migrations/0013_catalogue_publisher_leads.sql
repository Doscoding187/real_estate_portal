ALTER TABLE `leads`
  ADD COLUMN `catalogue_publisher_id` int;

CREATE INDEX `idx_leads_catalogue_publisher`
  ON `leads` (`catalogue_publisher_id`);

ALTER TABLE `leads`
  ADD CONSTRAINT `fk_leads_catalogue_publisher`
  FOREIGN KEY (`catalogue_publisher_id`) REFERENCES `catalogue_publishers` (`id`) ON DELETE SET NULL;
