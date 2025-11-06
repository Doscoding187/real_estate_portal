-- Agent Dashboard Tables Migration
-- Tables: commissions, lead_activities, offers

-- Step 1: Create commissions table
CREATE TABLE IF NOT EXISTS commissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agentId INT NOT NULL,
  propertyId INT,
  leadId INT,
  amount INT NOT NULL COMMENT 'Commission amount in cents',
  percentage INT COMMENT 'Commission percentage * 100 (e.g., 250 = 2.5%)',
  status ENUM('pending', 'approved', 'paid', 'cancelled') DEFAULT 'pending' NOT NULL,
  transactionType ENUM('sale', 'rent', 'referral', 'other') DEFAULT 'sale' NOT NULL,
  description TEXT,
  payoutDate TIMESTAMP NULL,
  paymentReference VARCHAR(100),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE SET NULL,
  FOREIGN KEY (leadId) REFERENCES leads(id) ON DELETE SET NULL,
  INDEX idx_agent (agentId),
  INDEX idx_status (status),
  INDEX idx_payout_date (payoutDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Create lead_activities table
CREATE TABLE IF NOT EXISTS lead_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  leadId INT NOT NULL,
  agentId INT,
  activityType ENUM('call', 'email', 'meeting', 'note', 'status_change', 'viewing_scheduled', 'offer_sent') NOT NULL,
  description TEXT,
  metadata TEXT COMMENT 'JSON data for additional info',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (leadId) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE SET NULL,
  INDEX idx_lead (leadId),
  INDEX idx_agent (agentId),
  INDEX idx_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 3: Create offers table
CREATE TABLE IF NOT EXISTS offers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  propertyId INT NOT NULL,
  leadId INT,
  agentId INT,
  buyerName VARCHAR(200) NOT NULL,
  buyerEmail VARCHAR(320),
  buyerPhone VARCHAR(50),
  offerAmount INT NOT NULL COMMENT 'Offer amount in cents',
  status ENUM('pending', 'accepted', 'rejected', 'countered', 'withdrawn') DEFAULT 'pending' NOT NULL,
  conditions TEXT COMMENT 'Offer conditions or terms',
  expiresAt TIMESTAMP NULL,
  respondedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (leadId) REFERENCES leads(id) ON DELETE SET NULL,
  FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE SET NULL,
  INDEX idx_property (propertyId),
  INDEX idx_agent (agentId),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 4: Update leads table - add next_follow_up column
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS nextFollowUp TIMESTAMP NULL AFTER updatedAt,
  ADD INDEX IF NOT EXISTS idx_next_follow_up (nextFollowUp);

-- Step 5: Add indexes to showings table for better performance
ALTER TABLE showings
  ADD INDEX IF NOT EXISTS idx_agent_scheduled (agentId, scheduledAt);
