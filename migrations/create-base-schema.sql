-- Base Schema Creation for Real Estate Portal
-- Execute this FIRST before any other migrations

-- Step 1: Create users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) UNIQUE,
  email VARCHAR(320) UNIQUE,
  passwordHash VARCHAR(255),
  name TEXT,
  firstName VARCHAR(100),
  lastName VARCHAR(100),
  phone VARCHAR(30),
  loginMethod VARCHAR(64),
  emailVerified INT DEFAULT 0 NOT NULL,
  role ENUM('visitor', 'agent', 'agency_admin', 'super_admin') DEFAULT 'visitor' NOT NULL,
  agencyId INT,
  isSubaccount TINYINT(1) DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Create agencies table (if not exists)
CREATE TABLE IF NOT EXISTS agencies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  logo TEXT,
  website VARCHAR(255),
  email VARCHAR(320),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  subscriptionPlan VARCHAR(50) DEFAULT 'free' NOT NULL,
  subscriptionStatus VARCHAR(30) DEFAULT 'trial' NOT NULL,
  subscriptionExpiry TIMESTAMP NULL,
  isVerified INT DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_slug (slug),
  INDEX idx_verified (isVerified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 3: Add foreign key for users.agencyId (if not exists)
SET @constraint_check = (
  SELECT COUNT(*) 
  FROM information_schema.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'users' 
  AND CONSTRAINT_NAME = 'fk_users_agency'
);

SET @sql = IF(@constraint_check = 0,
  'ALTER TABLE users ADD CONSTRAINT fk_users_agency FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE SET NULL',
  'SELECT "Foreign key fk_users_agency already exists" AS status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Create agents table (needed before properties)
CREATE TABLE IF NOT EXISTS agents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT,
  agencyId INT,
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,
  displayName VARCHAR(200),
  bio TEXT,
  profileImage TEXT,
  phone VARCHAR(50),
  email VARCHAR(320),
  whatsapp VARCHAR(50),
  specialization TEXT COMMENT 'JSON array',
  role ENUM('agent', 'principal_agent', 'broker') DEFAULT 'agent' NOT NULL,
  licenseNumber VARCHAR(100),
  yearsExperience INT,
  areasServed TEXT COMMENT 'JSON array of cities/areas',
  languages TEXT COMMENT 'JSON array',
  rating INT DEFAULT 0,
  reviewCount INT DEFAULT 0,
  totalSales INT DEFAULT 0,
  isVerified TINYINT(1) DEFAULT 0 NOT NULL,
  isFeatured TINYINT(1) DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE SET NULL,
  INDEX idx_user (userId),
  INDEX idx_agency (agencyId),
  INDEX idx_verified (isVerified),
  INDEX idx_featured (isFeatured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 5: Create developers table
CREATE TABLE IF NOT EXISTS developers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logo TEXT,
  website VARCHAR(255),
  email VARCHAR(320),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  category ENUM('residential', 'commercial', 'mixed_use', 'industrial') DEFAULT 'residential' NOT NULL,
  establishedYear INT,
  totalProjects INT DEFAULT 0,
  rating INT DEFAULT 0,
  reviewCount INT DEFAULT 0,
  isVerified TINYINT(1) DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_verified (isVerified),
  INDEX idx_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 6: Create developments table
CREATE TABLE IF NOT EXISTS developments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  developerId INT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  developmentType ENUM('residential', 'commercial', 'mixed_use', 'estate', 'complex') NOT NULL,
  status ENUM('planning', 'under_construction', 'completed', 'coming_soon') DEFAULT 'planning' NOT NULL,
  address TEXT,
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  latitude VARCHAR(50),
  longitude VARCHAR(50),
  totalUnits INT,
  availableUnits INT,
  priceFrom INT,
  priceTo INT,
  amenities TEXT COMMENT 'JSON array',
  images TEXT COMMENT 'JSON array of image URLs',
  videos TEXT COMMENT 'JSON array of video URLs',
  completionDate TIMESTAMP NULL,
  isFeatured TINYINT(1) DEFAULT 0 NOT NULL,
  views INT DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (developerId) REFERENCES developers(id) ON DELETE CASCADE,
  INDEX idx_developer (developerId),
  INDEX idx_status (status),
  INDEX idx_featured (isFeatured),
  INDEX idx_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 7: Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  propertyType ENUM('apartment', 'house', 'villa', 'plot', 'commercial', 'townhouse', 'cluster_home', 'farm', 'shared_living') NOT NULL,
  listingType ENUM('sale', 'rent', 'rent_to_buy', 'auction', 'shared_living') NOT NULL,
  transactionType ENUM('sale', 'rent', 'rent_to_buy', 'auction') DEFAULT 'sale' NOT NULL,
  price INT NOT NULL,
  bedrooms INT,
  bathrooms INT,
  area INT NOT NULL COMMENT 'in square feet',
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  zipCode VARCHAR(20),
  latitude VARCHAR(50),
  longitude VARCHAR(50),
  amenities TEXT COMMENT 'JSON array',
  yearBuilt INT,
  status ENUM('available', 'sold', 'rented', 'pending') DEFAULT 'available' NOT NULL,
  featured INT DEFAULT 0 NOT NULL,
  views INT DEFAULT 0 NOT NULL,
  agentId INT,
  developmentId INT,
  ownerId INT NOT NULL,
  propertySettings TEXT COMMENT 'JSON: estate_living, security_estate, etc.',
  videoUrl TEXT,
  virtualTourUrl TEXT,
  levies INT,
  ratesAndTaxes INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE SET NULL,
  FOREIGN KEY (developmentId) REFERENCES developments(id) ON DELETE SET NULL,
  FOREIGN KEY (ownerId) REFERENCES users(id),
  INDEX idx_status (status),
  INDEX idx_featured (featured),
  INDEX idx_city (city),
  INDEX idx_agent (agentId),
  INDEX idx_owner (ownerId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 8: Create propertyImages table
CREATE TABLE IF NOT EXISTS propertyImages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  propertyId INT NOT NULL,
  imageUrl TEXT NOT NULL,
  isPrimary INT DEFAULT 0 NOT NULL,
  displayOrder INT DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_property (propertyId),
  INDEX idx_primary (isPrimary)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 9: Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  propertyId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_property (userId, propertyId),
  INDEX idx_user (userId),
  INDEX idx_property (propertyId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 10: Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  propertyId INT,
  developmentId INT,
  agencyId INT,
  agentId INT,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(320) NOT NULL,
  phone VARCHAR(50),
  message TEXT,
  leadType ENUM('inquiry', 'viewing_request', 'offer', 'callback') DEFAULT 'inquiry' NOT NULL,
  status ENUM('new', 'contacted', 'qualified', 'converted', 'closed') DEFAULT 'new' NOT NULL,
  source VARCHAR(100),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  nextFollowUp TIMESTAMP NULL,
  FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE SET NULL,
  FOREIGN KEY (developmentId) REFERENCES developments(id) ON DELETE SET NULL,
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE SET NULL,
  FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_agency (agencyId),
  INDEX idx_agent (agentId),
  INDEX idx_property (propertyId),
  INDEX idx_next_follow_up (nextFollowUp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 11: Create showings table
CREATE TABLE IF NOT EXISTS showings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  propertyId INT NOT NULL,
  leadId INT,
  agentId INT,
  scheduledAt TIMESTAMP NOT NULL,
  status ENUM('requested', 'confirmed', 'completed', 'cancelled') DEFAULT 'requested' NOT NULL,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (leadId) REFERENCES leads(id) ON DELETE SET NULL,
  FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_property (propertyId),
  INDEX idx_agent (agentId),
  INDEX idx_agent_scheduled (agentId, scheduledAt),
  INDEX idx_scheduled (scheduledAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Base schema created successfully! Properties, leads, and showings tables ready.' AS status;
