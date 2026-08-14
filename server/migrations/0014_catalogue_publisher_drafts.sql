ALTER TABLE `development_drafts`
  ADD COLUMN `developer_organisation_id` int,
  ADD COLUMN `catalogue_publisher_id` int,
  ADD KEY `idx_dev_drafts_organisation` (`developer_organisation_id`),
  ADD CONSTRAINT `fk_dev_drafts_organisation` FOREIGN KEY (`developer_organisation_id`) REFERENCES `developer_organisations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_dev_drafts_catalogue_publisher` FOREIGN KEY (`catalogue_publisher_id`) REFERENCES `catalogue_publishers` (`id`) ON DELETE RESTRICT;
