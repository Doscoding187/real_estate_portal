-- Add payment_proofs table for manual EFT payment tracking

CREATE TABLE IF NOT EXISTS payment_proofs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoiceId INT,
  subscriptionId INT,
  agencyId INT NOT NULL,
  userId INT NOT NULL,
  amount INT NOT NULL COMMENT 'Amount in cents',
  currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',
  paymentMethod ENUM('eft', 'bank_transfer', 'cash_deposit', 'other') NOT NULL DEFAULT 'eft',
  referenceNumber VARCHAR(100) COMMENT 'Bank reference or transaction ID',
  proofOfPaymentUrl TEXT COMMENT 'URL to uploaded proof image/PDF',
  bankName VARCHAR(100),
  accountHolderName VARCHAR(200),
  paymentDate TIMESTAMP NOT NULL,
  status ENUM('pending', 'verified', 'rejected', 'expired') NOT NULL DEFAULT 'pending',
  verifiedBy INT COMMENT 'Admin user who verified',
  verifiedAt TIMESTAMP NULL,
  rejectionReason TEXT,
  notes TEXT,
  metadata TEXT COMMENT 'JSON metadata',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE SET NULL,
  FOREIGN KEY (subscriptionId) REFERENCES agency_subscriptions(id) ON DELETE SET NULL,
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (verifiedBy) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_invoice_id (invoiceId),
  INDEX idx_subscription_id (subscriptionId),
  INDEX idx_agency_id (agencyId),
  INDEX idx_status (status),
  INDEX idx_payment_date (paymentDate),
  INDEX idx_created_at (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE payment_proofs COMMENT = 'Tracks manual EFT payments with proof of payment for verification';
