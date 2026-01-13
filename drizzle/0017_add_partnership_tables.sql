-- ============================================
-- Migration: Development Partnership & Lead Routing System
-- Created: 2026-01-13
-- ============================================

-- Development Partners (Junction Table)
-- Allows developments to be shared across multiple brand profiles
CREATE TABLE IF NOT EXISTS development_partners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  development_id INT NOT NULL,
  brand_profile_id INT NOT NULL,
  partner_type ENUM('co_developer', 'joint_venture', 'investor', 'builder', 'marketing_agency', 'selling_agency') DEFAULT 'co_developer' NOT NULL,
  permissions JSON COMMENT 'Versioned permission object (v1)',
  visibility_scope ENUM('profile_public', 'internal_only', 'marketing_only') DEFAULT 'profile_public' NOT NULL,
  display_order INT DEFAULT 0 NOT NULL,
  is_primary TINYINT DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (development_id) REFERENCES developments(id) ON DELETE CASCADE,
  FOREIGN KEY (brand_profile_id) REFERENCES developer_brand_profiles(id) ON DELETE CASCADE,
  UNIQUE INDEX idx_dev_partner_unique (development_id, brand_profile_id),
  INDEX idx_dev_partners_development_id (development_id),
  INDEX idx_dev_partners_brand_profile_id (brand_profile_id),
  INDEX idx_dev_partners_partner_type (partner_type)
);

-- Development Lead Routes (Source-based lead routing)
-- Determines which brand profile receives leads based on entry point
CREATE TABLE IF NOT EXISTS development_lead_routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  development_id INT NOT NULL,
  source_type ENUM('developer_profile', 'agency_profile', 'development_page', 'campaign') NOT NULL,
  source_brand_profile_id INT,
  receiver_brand_profile_id INT NOT NULL,
  fallback_brand_profile_id INT,
  priority INT DEFAULT 0 NOT NULL,
  is_active TINYINT DEFAULT 1 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (development_id) REFERENCES developments(id) ON DELETE CASCADE,
  FOREIGN KEY (source_brand_profile_id) REFERENCES developer_brand_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_brand_profile_id) REFERENCES developer_brand_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (fallback_brand_profile_id) REFERENCES developer_brand_profiles(id) ON DELETE SET NULL,
  INDEX idx_lead_routes_development_id (development_id),
  INDEX idx_lead_routes_source_type (source_type),
  INDEX idx_lead_routes_lookup (development_id, source_type, source_brand_profile_id)
);
