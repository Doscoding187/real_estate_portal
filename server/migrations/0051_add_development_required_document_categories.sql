ALTER TABLE development_required_documents
  ADD COLUMN IF NOT EXISTS category ENUM('developer_document', 'client_required_document')
  NOT NULL DEFAULT 'client_required_document'
  AFTER document_label;

CREATE INDEX IF NOT EXISTS idx_development_required_documents_category
  ON development_required_documents (development_id, category);
