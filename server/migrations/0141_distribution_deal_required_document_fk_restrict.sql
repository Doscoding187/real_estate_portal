ALTER TABLE `distribution_deal_documents`
  DROP FOREIGN KEY `fk_distribution_deal_documents_development_required_d_75b0d588`,
  ADD CONSTRAINT `fk_distribution_deal_documents_required_document_restrict`
    FOREIGN KEY (`development_required_document_id`)
    REFERENCES `development_required_documents`(`id`)
    ON DELETE RESTRICT
    ON UPDATE NO ACTION;
