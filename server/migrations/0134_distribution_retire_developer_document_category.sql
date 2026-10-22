ALTER TABLE development_required_documents
  MODIFY COLUMN category ENUM('client_required_document') NOT NULL DEFAULT 'client_required_document';
