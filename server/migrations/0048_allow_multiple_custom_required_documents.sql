ALTER TABLE `development_required_documents`
  DROP INDEX `ux_development_required_documents_code`;

ALTER TABLE `development_required_documents`
  ADD INDEX `idx_development_required_documents_code` (`development_id`, `document_code`);
