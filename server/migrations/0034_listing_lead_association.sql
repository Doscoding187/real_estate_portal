ALTER TABLE `leads`
  ADD COLUMN `listing_id` int NULL,
  ADD KEY `idx_leads_listing_id` (`listing_id`),
  ADD CONSTRAINT `fk_leads_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE RESTRICT;
