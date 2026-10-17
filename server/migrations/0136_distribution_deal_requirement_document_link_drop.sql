-- Deal requirement status no longer points into Developer-owned collateral.
ALTER TABLE `deal_requirement_statuses`
  DROP COLUMN `linked_development_document_id`;
