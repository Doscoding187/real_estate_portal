-- Migration: Add developer approval workflow fields
-- Created: 2025-11-28

ALTER TABLE developers
  ADD COLUMN userId INT NOT NULL,
  ADD COLUMN status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  ADD COLUMN rejectionReason TEXT NULL,
  ADD COLUMN approvedBy INT NULL,
  ADD COLUMN approvedAt DATETIME NULL,
  ADD COLUMN rejectedBy INT NULL,
  ADD COLUMN rejectedAt DATETIME NULL,
  ADD CONSTRAINT fk_developers_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_developers_approved_by FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_developers_rejected_by FOREIGN KEY (rejectedBy) REFERENCES users(id) ON DELETE SET NULL;
