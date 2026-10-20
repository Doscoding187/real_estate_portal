-- Distribution requirements no longer point into Developer-owned collateral.
ALTER TABLE `application_requirements`
  DROP COLUMN `linked_development_document_id`;
