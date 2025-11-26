-- Revenue Center Phase 1 - Database Migration
-- Creates tables for subscription transactions, advertising campaigns, revenue forecasts, and failed payments

-- Subscription Transactions Table
CREATE TABLE IF NOT EXISTS subscription_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subscriptionId INT,
  agencyId INT NOT NULL,
  userId INT,
  amount INT NOT NULL COMMENT 'Amount in cents',
  currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',
  status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  revenueCategory ENUM('developer', 'agency', 'agent', 'vendor') NOT NULL,
  billingPeriodStart TIMESTAMP NULL,
  billingPeriodEnd TIMESTAMP NULL,
  stripePaymentIntentId VARCHAR(100),
  paymentMethod VARCHAR(50),
  description TEXT,
  metadata TEXT COMMENT 'JSON metadata',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paidAt TIMESTAMP NULL,
  
  FOREIGN KEY (subscriptionId) REFERENCES agency_subscriptions(id) ON DELETE SET NULL,
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_subscription_id (subscriptionId),
  INDEX idx_agency_id (agencyId),
  INDEX idx_revenue_category (revenueCategory),
  INDEX idx_status (status),
  INDEX idx_created_at (createdAt),
  INDEX idx_paid_at (paidAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Advertising Campaigns Table
CREATE TABLE IF NOT EXISTS advertising_campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaignType ENUM('banner_ad', 'boosted_development', 'sponsored_listing') NOT NULL,
  advertiserId INT NOT NULL COMMENT 'userId or agencyId',
  advertiserType ENUM('developer', 'agency', 'agent', 'vendor') NOT NULL,
  amount INT NOT NULL COMMENT 'Campaign cost in cents',
  currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',
  status ENUM('draft', 'active', 'paused', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  ctr DECIMAL(5, 2) COMMENT 'Click-through rate percentage',
  cpm DECIMAL(10, 2) COMMENT 'Cost per thousand impressions',
  cpc DECIMAL(10, 2) COMMENT 'Cost per click',
  placement ENUM('homepage', 'listing_page', 'media_hub', 'dashboard', 'search_results'),
  targetAudience TEXT COMMENT 'JSON with targeting criteria',
  developmentId INT,
  listingId INT,
  startDate TIMESTAMP NOT NULL,
  endDate TIMESTAMP NULL,
  budget INT COMMENT 'Total budget in cents',
  spentAmount INT NOT NULL DEFAULT 0 COMMENT 'Amount spent so far',
  metadata TEXT COMMENT 'JSON metadata',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (developmentId) REFERENCES developments(id) ON DELETE SET NULL,
  FOREIGN KEY (listingId) REFERENCES listings(id) ON DELETE SET NULL,
  
  INDEX idx_campaign_type (campaignType),
  INDEX idx_advertiser (advertiserId, advertiserType),
  INDEX idx_status (status),
  INDEX idx_start_date (startDate),
  INDEX idx_end_date (endDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Revenue Forecasts Table
CREATE TABLE IF NOT EXISTS revenue_forecasts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  forecastPeriod ENUM('30_days', '90_days', 'quarter', 'year') NOT NULL,
  revenueCategory ENUM('subscriptions', 'advertising', 'total', 'developer', 'agency', 'agent', 'vendor') NOT NULL,
  predictedAmount INT NOT NULL COMMENT 'Predicted amount in cents',
  currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',
  confidence DECIMAL(5, 2) COMMENT 'Confidence percentage (0-100)',
  forecastMethod VARCHAR(50) COMMENT 'e.g., linear_regression, seasonal_arima',
  historicalDataPoints INT COMMENT 'Number of data points used',
  actualAmount INT COMMENT 'Filled in after the period ends',
  accuracy DECIMAL(5, 2) COMMENT 'Calculated accuracy percentage',
  metadata TEXT COMMENT 'JSON with additional forecast details',
  generatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  periodStartDate TIMESTAMP NOT NULL,
  periodEndDate TIMESTAMP NOT NULL,
  
  INDEX idx_forecast_period (forecastPeriod),
  INDEX idx_revenue_category (revenueCategory),
  INDEX idx_period_dates (periodStartDate, periodEndDate),
  INDEX idx_generated_at (generatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Failed Payments Table
CREATE TABLE IF NOT EXISTS failed_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subscriptionId INT,
  invoiceId INT,
  agencyId INT NOT NULL,
  userId INT,
  amount INT NOT NULL COMMENT 'Amount in cents',
  currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',
  failureReason TEXT,
  failureCode VARCHAR(100),
  retryCount INT NOT NULL DEFAULT 0,
  maxRetries INT NOT NULL DEFAULT 3,
  status ENUM('pending_retry', 'retrying', 'resolved', 'abandoned', 'customer_action_required') NOT NULL DEFAULT 'pending_retry',
  nextRetryAt TIMESTAMP NULL,
  lastRetryAt TIMESTAMP NULL,
  resolvedAt TIMESTAMP NULL,
  churnRisk ENUM('low', 'medium', 'high', 'critical'),
  notificationsSent INT NOT NULL DEFAULT 0,
  lastNotificationAt TIMESTAMP NULL,
  stripePaymentIntentId VARCHAR(100),
  metadata TEXT COMMENT 'JSON metadata',
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (subscriptionId) REFERENCES agency_subscriptions(id) ON DELETE SET NULL,
  FOREIGN KEY (invoiceId) REFERENCES invoices(id) ON DELETE SET NULL,
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_subscription_id (subscriptionId),
  INDEX idx_invoice_id (invoiceId),
  INDEX idx_agency_id (agencyId),
  INDEX idx_status (status),
  INDEX idx_churn_risk (churnRisk),
  INDEX idx_next_retry (nextRetryAt),
  INDEX idx_created_at (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments for documentation
ALTER TABLE subscription_transactions COMMENT = 'Tracks all subscription revenue transactions for analytics';
ALTER TABLE advertising_campaigns COMMENT = 'Tracks advertising campaigns and their performance metrics';
ALTER TABLE revenue_forecasts COMMENT = 'Stores AI-generated revenue predictions and their accuracy';
ALTER TABLE failed_payments COMMENT = 'Monitors failed payments and churn risk for proactive intervention';
