ALTER TABLE `leads`
  ADD COLUMN `listing_id` int NULL;

CREATE INDEX `idx_leads_listing_id` ON `leads` (`listing_id`);

ALTER TABLE `leads`
  ADD CONSTRAINT `fk_leads_listing`
  FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE RESTRICT;
