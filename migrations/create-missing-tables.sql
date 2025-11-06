-- =====================================================
-- Create Missing Tables - Critical Fix
-- Run this to add tables defined in schema but missing from database
-- =====================================================

USE real_estate_portal;

-- 1. Agency Branding Table (CRITICAL - causing current errors)
CREATE TABLE IF NOT EXISTS agency_branding (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agencyId INT NOT NULL,
  primaryColor VARCHAR(7) COMMENT 'hex color',
  secondaryColor VARCHAR(7),
  accentColor VARCHAR(7),
  logoUrl TEXT,
  faviconUrl TEXT,
  customDomain VARCHAR(255),
  subdomain VARCHAR(63) COMMENT 'max 63 chars for subdomain',
  companyName VARCHAR(255),
  tagline VARCHAR(255),
  customCss TEXT,
  metaTitle VARCHAR(255),
  metaDescription TEXT,
  supportEmail VARCHAR(320),
  supportPhone VARCHAR(50),
  socialLinks TEXT COMMENT 'JSON object',
  isEnabled INT DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE CASCADE,
  INDEX idx_agency (agencyId),
  INDEX idx_custom_domain (customDomain),
  INDEX idx_subdomain (subdomain),
  INDEX idx_enabled (isEnabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Subscription Plans Table
CREATE TABLE IF NOT EXISTS plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  displayName VARCHAR(100) NOT NULL,
  description TEXT,
  price INT NOT NULL COMMENT 'price in cents (e.g., 4999 = R49.99)',
  currency VARCHAR(3) DEFAULT 'ZAR' NOT NULL,
  `interval` ENUM('month', 'year') DEFAULT 'month' NOT NULL,
  stripePriceId VARCHAR(100) UNIQUE,
  features TEXT COMMENT 'JSON array of feature strings',
  `limits` TEXT COMMENT 'JSON object with limits (properties, agents, etc.)',
  isActive INT DEFAULT 1 NOT NULL,
  isPopular INT DEFAULT 0 NOT NULL,
  sortOrder INT DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_active (isActive),
  INDEX idx_popular (isPopular)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Agency Subscriptions Table
CREATE TABLE IF NOT EXISTS agency_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agencyId INT NOT NULL,
  planId INT,
  stripeSubscriptionId VARCHAR(100) UNIQUE,
  stripeCustomerId VARCHAR(100) NOT NULL,
  stripePriceId VARCHAR(100),
  status ENUM('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid') DEFAULT 'incomplete' NOT NULL,
  currentPeriodStart TIMESTAMP NULL,
  currentPeriodEnd TIMESTAMP NULL,
  trialEnd TIMESTAMP NULL,
  cancelAtPeriodEnd INT DEFAULT 0 NOT NULL,
  canceledAt TIMESTAMP NULL,
  endedAt TIMESTAMP NULL,
  metadata TEXT COMMENT 'JSON',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE CASCADE,
  FOREIGN KEY (planId) REFERENCES plans(id) ON DELETE SET NULL,
  INDEX idx_agency (agencyId),
  INDEX idx_status (status),
  INDEX idx_stripe_subscription (stripeSubscriptionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agencyId INT NOT NULL,
  subscriptionId INT,
  stripeInvoiceId VARCHAR(100) UNIQUE,
  amount INT NOT NULL COMMENT 'amount in cents',
  currency VARCHAR(3) DEFAULT 'ZAR' NOT NULL,
  status ENUM('draft', 'open', 'paid', 'void', 'uncollectible') DEFAULT 'draft' NOT NULL,
  dueDate TIMESTAMP NULL,
  paidAt TIMESTAMP NULL,
  hostedInvoiceUrl TEXT,
  invoicePdf TEXT,
  metadata TEXT COMMENT 'JSON',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE CASCADE,
  FOREIGN KEY (subscriptionId) REFERENCES agency_subscriptions(id) ON DELETE SET NULL,
  INDEX idx_agency (agencyId),
  INDEX idx_status (status),
  INDEX idx_stripe_invoice (stripeInvoiceId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Payment Methods Table
CREATE TABLE IF NOT EXISTS payment_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agencyId INT NOT NULL,
  stripePaymentMethodId VARCHAR(100) UNIQUE,
  type ENUM('card', 'bank_account') DEFAULT 'card' NOT NULL,
  cardBrand VARCHAR(20),
  cardLast4 VARCHAR(4),
  cardExpMonth INT,
  cardExpYear INT,
  bankName VARCHAR(100),
  bankLast4 VARCHAR(4),
  isDefault INT DEFAULT 0 NOT NULL,
  isActive INT DEFAULT 1 NOT NULL,
  metadata TEXT COMMENT 'JSON',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE CASCADE,
  INDEX idx_agency (agencyId),
  INDEX idx_default (isDefault),
  INDEX idx_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  stripeCouponId VARCHAR(100) UNIQUE,
  name VARCHAR(255),
  description TEXT,
  discountType ENUM('amount', 'percent') DEFAULT 'percent' NOT NULL,
  discountAmount INT NOT NULL COMMENT 'amount in cents or percentage * 100',
  maxRedemptions INT,
  redemptionsUsed INT DEFAULT 0 NOT NULL,
  validFrom TIMESTAMP NULL,
  validUntil TIMESTAMP NULL,
  isActive INT DEFAULT 1 NOT NULL,
  appliesToPlans TEXT COMMENT 'JSON array of plan IDs',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_code (code),
  INDEX idx_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  targetType VARCHAR(50),
  targetId INT,
  metadata TEXT COMMENT 'JSON',
  ipAddress VARCHAR(45),
  userAgent TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (userId),
  INDEX idx_action (action),
  INDEX idx_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Agency Join Requests Table
CREATE TABLE IF NOT EXISTS agency_join_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agencyId INT NOT NULL,
  userId INT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' NOT NULL,
  message TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  reviewedBy INT,
  reviewedAt TIMESTAMP NULL,
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewedBy) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_agency (agencyId),
  INDEX idx_user (userId),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Platform Settings Table
CREATE TABLE IF NOT EXISTS platform_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  isPublic INT DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_key (`key`),
  INDEX idx_public (isPublic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify all tables were created
SELECT 'All missing tables created successfully!' AS status;

SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'real_estate_portal'
ORDER BY TABLE_NAME;
