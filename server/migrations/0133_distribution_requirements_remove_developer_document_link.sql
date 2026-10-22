ALTER TABLE `application_requirements`
  DROP FOREIGN KEY `fk_application_requirements_linked_development_doc_c79c98fd`,
  DROP COLUMN `linked_development_document_id`;
