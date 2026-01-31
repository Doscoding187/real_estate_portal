-- Migration: Create audit_logs table
-- Task 5.4: Minimal audit trail for emulator actions
-- Date: 2026-01-30

CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  -- Actor (super admin performing the action)
  actor_user_id INT NOT NULL,
  
  -- Brand context (nullable for non-emulator actions)
  brand_profile_id INT NULL,
  
  -- Action details
  action ENUM('create', 'update', 'delete', 'publish', 'unpublish', 'approve', 'reject') NOT NULL,
  entity ENUM('development', 'listing', 'brand', 'lead', 'unit_type', 'media', 'other') NOT NULL,
  entity_id INT NULL COMMENT 'ID of the affected entity (nullable if not applicable)',
  
  -- Additional context
  metadata JSON NULL COMMENT 'Action-specific metadata (changes, reasons, etc.)',
  
  -- Foreign keys
  CONSTRAINT fk_audit_actor
    FOREIGN KEY (actor_user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT,  -- CRITICAL: Preserve audit history, prevent user deletion
    
  CONSTRAINT fk_audit_brand
    FOREIGN KEY (brand_profile_id)
    REFERENCES developer_brand_profiles(id)
    ON DELETE CASCADE,  -- OK to delete audit logs when brand is deleted
  
  -- Indexes for common queries
  INDEX idx_audit_actor (actor_user_id),
  INDEX idx_audit_brand (brand_profile_id),
  INDEX idx_audit_entity (entity, entity_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_created (created_at),
  INDEX idx_audit_brand_date (brand_profile_id, created_at)  -- Composite for brand history queries
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Audit trail for emulator and admin actions';
