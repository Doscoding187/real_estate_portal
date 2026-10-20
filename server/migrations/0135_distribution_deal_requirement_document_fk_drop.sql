-- Remove the Distribution-to-Developer document relationship before dropping its column.
ALTER TABLE `deal_requirement_statuses`
  DROP FOREIGN KEY `fk_deal_requirement_statuses_linked_development_doc_56e5a750`;
