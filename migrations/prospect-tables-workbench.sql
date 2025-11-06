igrations/prospect-tables-workbench.sql</path>
<content lines="1-197">
-- =====================================================
-- PROSPECT TABLES FOR MYSQL WORKBENCH
-- Copy and paste this entire script into MySQL Workbench
-- =====================================================

USE real_estate_portal;

-- =====================================================
-- PROSPECTS TABLE
-- Stores anonymous user profiles with financial data for buyability calculations
-- =====================================================

CREATE TABLE IF NOT EXISTS prospects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sessionId VARCHAR(255) NOT NULL UNIQUE COMMENT 'Anonymous session identifier',

    -- Contact Information (optional for anonymous users)
    email VARCHAR(320),
    phone VARCHAR(50),

    -- Financial Information (stored in cents for precision)
    income INT COMMENT 'Monthly gross income in cents',
    incomeRange ENUM('under_15k', '15k_25k', '25k_50k', '50k_100k', 'over_100k'),
    employmentStatus ENUM('employed', 'self_employed', 'business_owner', 'student', 'retired', 'unemployed'),
    combinedIncome INT COMMENT 'Joint applications - additional income in cents',

    -- Expenses & Liabilities (stored in cents)
    monthlyExpenses INT COMMENT 'Rent, utilities, transport, etc. in cents',
    monthlyDebts INT COMMENT 'Loans, credit cards, etc. in cents',
    dependents INT DEFAULT 0 COMMENT 'Number of dependents',

    -- Assets & Savings (stored in cents)
    savingsDeposit INT COMMENT 'Available savings/deposit for down payment in cents',
    creditScore INT COMMENT 'Optional credit score',
    hasCreditConsent TINYINT(1) DEFAULT 0 COMMENT 'User consent for credit checking',

    -- Buyability Calculation Results
    buyabilityScore ENUM('low', 'medium', 'high'),
    affordabilityMin INT COMMENT 'Minimum property price they can afford',
    affordabilityMax INT COMMENT 'Maximum property price they can afford',
    monthlyPaymentCapacity INT COMMENT 'Maximum monthly payment capacity',

    -- Gamification & Progress
    profileProgress INT DEFAULT 0 COMMENT 'Profile completion percentage (0-100)',
    badges TEXT COMMENT 'JSON array of earned badges',
    lastActivity TIMESTAMP NULL COMMENT 'Last time user interacted with dashboard',

    -- Preferences
    preferredPropertyType ENUM('apartment', 'house', 'villa', 'plot', 'commercial', 'townhouse', 'cluster_home', 'farm', 'shared_living'),
    preferredLocation VARCHAR(100) COMMENT 'Preferred city or suburb',
    maxCommuteTime INT COMMENT 'Maximum commute time in minutes',

    -- Metadata
    ipAddress VARCHAR(45),
    userAgent TEXT,
    referrer TEXT,

    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_session_id (sessionId),
    INDEX idx_buyability_score (buyabilityScore),
    INDEX idx_affordability_range (affordabilityMin, affordabilityMax),
    INDEX idx_last_activity (lastActivity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PROSPECT FAVORITES TABLE
-- Stores properties favorited by prospects
-- =====================================================

CREATE TABLE IF NOT EXISTS prospect_favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prospectId INT NOT NULL COMMENT 'References prospects.id',
    propertyId INT NOT NULL COMMENT 'References properties.id',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (prospectId) REFERENCES prospects(id) ON DELETE CASCADE,
    FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE,
    UNIQUE KEY unique_prospect_property (prospectId, propertyId),
    INDEX idx_prospect_id (prospectId),
    INDEX idx_property_id (propertyId),
    INDEX idx_created_at (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SCHEDULED VIEWINGS TABLE
-- Stores property viewing appointments scheduled by prospects
-- =====================================================

CREATE TABLE IF NOT EXISTS scheduled_viewings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prospectId INT NOT NULL COMMENT 'References prospects.id',
    propertyId INT NOT NULL COMMENT 'References properties.id',
    agentId INT COMMENT 'References agents.id - assigned agent',
    scheduledAt TIMESTAMP NOT NULL COMMENT 'When the viewing is scheduled',
    status ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
    notes TEXT COMMENT 'Additional notes from prospect',
    prospectName VARCHAR(200) COMMENT 'Prospect name for agent reference',
    prospectEmail VARCHAR(320) COMMENT 'Prospect email for agent contact',
    prospectPhone VARCHAR(50) COMMENT 'Prospect phone for agent contact',
    notificationSent TINYINT(1) DEFAULT 0 COMMENT 'Whether agent was notified via email',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (prospectId) REFERENCES prospects(id) ON DELETE CASCADE,
    FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE SET NULL,
    INDEX idx_prospect_id (prospectId),
    INDEX idx_property_id (propertyId),
    INDEX idx_agent_id (agentId),
    INDEX idx_scheduled_at (scheduledAt),
    INDEX idx_status (status),
    INDEX idx_created_at (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- RECENTLY VIEWED TABLE
-- Tracks prospect browsing history for recommendations
-- =====================================================

CREATE TABLE IF NOT EXISTS recently_viewed (
    id INT AUTO_INCREMENT PRIMARY KEY,
    prospectId INT NOT NULL COMMENT 'References prospects.id',
    propertyId INT NOT NULL COMMENT 'References properties.id',
    viewedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When the property was viewed',

    FOREIGN KEY (prospectId) REFERENCES prospects(id) ON DELETE CASCADE,
    FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE,
    UNIQUE KEY unique_prospect_property_recent (prospectId, propertyId),
    INDEX idx_prospect_id (prospectId),
    INDEX idx_property_id (propertyId),
    INDEX idx_viewed_at (viewedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- DATA INTEGRITY TRIGGERS
-- =====================================================

-- Trigger to update recently_viewed when prospect views a property again
DELIMITER //

CREATE TRIGGER IF NOT EXISTS update_recently_viewed_timestamp
    BEFORE UPDATE ON recently_viewed
    FOR EACH ROW
BEGIN
    IF OLD.viewedAt != NEW.viewedAt THEN
        SET NEW.viewedAt = CURRENT_TIMESTAMP;
    END IF;
END //

-- Trigger to clean up old recently viewed records (keep only last 50 per prospect)
CREATE EVENT IF NOT EXISTS cleanup_old_recently_viewed
    ON SCHEDULE EVERY 1 DAY
    DO
BEGIN
    DELETE rv1 FROM recently_viewed rv1
    INNER JOIN (
        SELECT prospectId, propertyId
        FROM recently_viewed
        WHERE (prospectId, viewedAt) NOT IN (
            SELECT prospectId, viewedAt
            FROM (
                SELECT prospectId, viewedAt
                FROM recently_viewed
                ORDER BY viewedAt DESC
            ) AS temp
            GROUP BY prospectId
            HAVING viewedAt = MIN(viewedAt)
        )
    ) rv2 ON rv1.prospectId = rv2.prospectId AND rv1.propertyId = rv2.propertyId
    WHERE rv1.viewedAt < DATE_SUB(NOW(), INTERVAL 30 DAY);
END //

DELIMITER ;

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Insert some sample badges for gamification (you can modify these)
INSERT IGNORE INTO platform_settings (key, value, description, category, isPublic) VALUES
('prospect_badges', '["Home Seeker", "Budget Builder", "Target Buyer", "Property Explorer", "Viewing Booked", "Qualified Lead", "First Time Buyer", "Investment Ready", "Premium Buyer", "Dream Home Finder"]', 'Available gamification badges for prospects', 'features', 0);

-- =====================================================
-- PERFORMANCE OPTIMIZATIONS
-- =====================================================

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_prospects_affordability_search ON prospects(affordabilityMin, affordabilityMax, buyabilityScore);
CREATE INDEX IF NOT EXISTS idx_prospects_location_prefs ON prospects(preferredLocation, preferredPropertyType);
CREATE INDEX IF NOT EXISTS idx_scheduled_viewings_agent_schedule ON scheduled_viewings(agentId, scheduledAt, status);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '🎉 Prospect tables created successfully!' AS status;
SELECT '📊 Tables created: prospects, prospect_favorites, scheduled_viewings, recently_viewed' AS tables;
SELECT '🏆 Gamified prospect pre-qualification system is ready!' AS message;