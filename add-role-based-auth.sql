-- Sprint 1: Role-based auth + super_admin + agency management
-- Execute this in MySQL Workbench on propertifi_sa_database

USE propertifi_sa_database;

-- Step 1: Update users table for role-based auth
-- Add new columns for agency relationship and subaccount tracking
ALTER TABLE users
  ADD COLUMN firstName VARCHAR(100) AFTER name,
  ADD COLUMN lastName VARCHAR(100) AFTER firstName,
  ADD COLUMN phone VARCHAR(30) AFTER lastName,
  ADD COLUMN agencyId INT AFTER role,
  ADD COLUMN isSubaccount TINYINT(1) DEFAULT 0 AFTER agencyId;

-- Update role enum to include new roles
ALTER TABLE users
  MODIFY COLUMN role ENUM('visitor', 'agent', 'agency_admin', 'super_admin') DEFAULT 'visitor' NOT NULL;

-- Step 2: Update agencies table for subscription management
ALTER TABLE agencies
  ADD COLUMN slug VARCHAR(255) UNIQUE AFTER name,
  ADD COLUMN subscriptionPlan VARCHAR(50) DEFAULT 'free' AFTER province,
  ADD COLUMN subscriptionStatus VARCHAR(30) DEFAULT 'trial' AFTER subscriptionPlan;

-- Rename subscriptionTier to match new schema
ALTER TABLE agencies
  CHANGE COLUMN subscriptionTier subscription_tier VARCHAR(50) DEFAULT 'free';

-- Step 3: Create invites table for agency invite flow
CREATE TABLE IF NOT EXISTS invites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agencyId INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(30) DEFAULT 'agent',
  expiresAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used TINYINT(1) DEFAULT 0,
  usedAt TIMESTAMP NULL,
  usedBy INT NULL,
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE CASCADE,
  FOREIGN KEY (usedBy) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_token (token),
  INDEX idx_email (email),
  INDEX idx_agency (agencyId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 4: Create agency_join_requests table for agent requests
CREATE TABLE IF NOT EXISTS agency_join_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agencyId INT NOT NULL,
  userId INT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  message TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  reviewedBy INT NULL,
  reviewedAt TIMESTAMP NULL,
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewedBy) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_user_agency (userId, agencyId),
  INDEX idx_status (status),
  INDEX idx_agency (agencyId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 5: Create audit_logs table for super_admin actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  targetType VARCHAR(50),
  targetId INT,
  metadata JSON,
  ipAddress VARCHAR(45),
  userAgent TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (userId),
  INDEX idx_action (action),
  INDEX idx_target (targetType, targetId),
  INDEX idx_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 6: Create leads table for CRM
CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  propertyId INT,
  agencyId INT,
  agentId INT,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(320),
  phone VARCHAR(50),
  message TEXT,
  status ENUM('new', 'contacted', 'qualified', 'converted', 'lost') DEFAULT 'new',
  source VARCHAR(100),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE SET NULL,
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE SET NULL,
  FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_agency (agencyId),
  INDEX idx_agent (agentId),
  INDEX idx_property (propertyId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 7: Create showings table
CREATE TABLE IF NOT EXISTS showings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  propertyId INT NOT NULL,
  leadId INT,
  agentId INT,
  scheduledAt TIMESTAMP NOT NULL,
  status ENUM('requested', 'confirmed', 'completed', 'cancelled') DEFAULT 'requested',
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (leadId) REFERENCES leads(id) ON DELETE SET NULL,
  FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_property (propertyId),
  INDEX idx_agent (agentId),
  INDEX idx_scheduled (scheduledAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 8: Add foreign key constraint for users.agencyId
ALTER TABLE users
  ADD CONSTRAINT fk_users_agency 
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE SET NULL;

-- Step 9: Create indexes for performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_agency ON users(agencyId);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_agencies_slug ON agencies(slug);

SELECT 'Migration completed successfully! Now seed super_admin user.' AS status;
