-- Retire the legacy cross-engine link that let Developer files satisfy Distribution requirements.
DELETE FROM `development_required_documents`
WHERE `category` = 'developer_document';

ALTER TABLE `development_required_documents`
  MODIFY COLUMN `category` ENUM('client_required_document') NOT NULL DEFAULT 'client_required_document';

ALTER TABLE `application_requirements`
  DROP FOREIGN KEY `fk_application_requirements_linked_development_doc_c79c98fd`,
  DROP COLUMN `linked_development_document_id`;

ALTER TABLE `deal_requirement_statuses`
  DROP FOREIGN KEY `fk_deal_requirement_statuses_linked_development_doc_56e5a750`,
  DROP COLUMN `linked_development_document_id`;
