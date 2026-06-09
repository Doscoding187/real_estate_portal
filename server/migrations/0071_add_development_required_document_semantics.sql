ALTER TABLE development_required_documents
  ADD COLUMN IF NOT EXISTS transaction_type ENUM('all', 'sale', 'rent', 'auction')
    NOT NULL DEFAULT 'all' AFTER category;

ALTER TABLE development_required_documents
  ADD COLUMN IF NOT EXISTS participant_type ENUM('buyer', 'renter', 'bidder', 'developer', 'manager', 'supporting')
    NOT NULL DEFAULT 'supporting' AFTER transaction_type;

ALTER TABLE development_required_documents
  ADD COLUMN IF NOT EXISTS readiness_role ENUM(
    'submission',
    'qualification',
    'lease',
    'auction_registration',
    'auction_terms',
    'payout',
    'supporting'
  ) NOT NULL DEFAULT 'supporting' AFTER participant_type;

ALTER TABLE development_required_documents
  ADD COLUMN IF NOT EXISTS required_for_stage VARCHAR(64) NULL AFTER readiness_role;

ALTER TABLE development_required_documents
  ADD COLUMN IF NOT EXISTS blocks_payout TINYINT NOT NULL DEFAULT 0 AFTER required_for_stage;

ALTER TABLE development_required_documents
  ADD COLUMN IF NOT EXISTS review_owner ENUM('manager', 'admin', 'developer', 'system')
    NOT NULL DEFAULT 'manager' AFTER blocks_payout;

ALTER TABLE development_required_documents
  ADD COLUMN IF NOT EXISTS publicly_shareable TINYINT NOT NULL DEFAULT 0 AFTER review_owner;

ALTER TABLE development_required_documents
  ADD COLUMN IF NOT EXISTS programme_specific TINYINT NOT NULL DEFAULT 1 AFTER publicly_shareable;

CREATE INDEX IF NOT EXISTS idx_development_required_documents_transaction
  ON development_required_documents (development_id, transaction_type);

CREATE INDEX IF NOT EXISTS idx_development_required_documents_role
  ON development_required_documents (development_id, readiness_role);
