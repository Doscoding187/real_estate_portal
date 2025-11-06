/**
 * Simple Database Initialization Script
 * Creates SQLite database and tables without Drizzle migration dependency
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'real_estate_portal.db');
console.log('Creating database at:', dbPath);

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
const createTables = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openId TEXT UNIQUE,
  email TEXT UNIQUE,
  passwordHash TEXT,
  name TEXT,
  firstName TEXT,
  lastName TEXT,
  phone TEXT,
  loginMethod TEXT,
  emailVerified INTEGER DEFAULT 0 NOT NULL,
  role TEXT DEFAULT 'visitor' NOT NULL,
  agencyId INTEGER,
  isSubaccount INTEGER DEFAULT 0 NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  lastSignedIn DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Agencies table
CREATE TABLE IF NOT EXISTS agencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  subscriptionPlan TEXT DEFAULT 'free' NOT NULL,
  subscriptionStatus TEXT DEFAULT 'trial' NOT NULL,
  subscriptionExpiry DATETIME,
  isVerified INTEGER DEFAULT 0 NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER,
  agencyId INTEGER,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  displayName TEXT,
  bio TEXT,
  profileImage TEXT,
  phone TEXT,
  email TEXT,
  whatsapp TEXT,
  specialization TEXT,
  role TEXT DEFAULT 'agent' NOT NULL,
  licenseNumber TEXT,
  yearsExperience INTEGER,
  areasServed TEXT,
  languages TEXT,
  rating INTEGER DEFAULT 0,
  reviewCount INTEGER DEFAULT 0,
  totalSales INTEGER DEFAULT 0,
  isVerified INTEGER DEFAULT 0 NOT NULL,
  isFeatured INTEGER DEFAULT 0 NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  propertyType TEXT NOT NULL,
  listingType TEXT NOT NULL,
  transactionType TEXT DEFAULT 'sale' NOT NULL,
  price INTEGER NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  area INTEGER NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  zipCode TEXT,
  latitude TEXT,
  longitude TEXT,
  amenities TEXT,
  yearBuilt INTEGER,
  status TEXT DEFAULT 'available' NOT NULL,
  featured INTEGER DEFAULT 0 NOT NULL,
  views INTEGER DEFAULT 0 NOT NULL,
  enquiries INTEGER DEFAULT 0 NOT NULL,
  agentId INTEGER,
  developmentId INTEGER,
  ownerId INTEGER NOT NULL,
  propertySettings TEXT,
  videoUrl TEXT,
  virtualTourUrl TEXT,
  levies INTEGER,
  ratesAndTaxes INTEGER,
  mainImage TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Property images table
CREATE TABLE IF NOT EXISTS propertyImages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  propertyId INTEGER NOT NULL,
  imageUrl TEXT NOT NULL,
  isPrimary INTEGER DEFAULT 0 NOT NULL,
  displayOrder INTEGER DEFAULT 0 NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Prospects table
CREATE TABLE IF NOT EXISTS prospects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sessionId TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  income INTEGER,
  incomeRange TEXT,
  employmentStatus TEXT,
  combinedIncome INTEGER,
  monthlyExpenses INTEGER,
  monthlyDebts INTEGER,
  dependents INTEGER DEFAULT 0,
  savingsDeposit INTEGER,
  creditScore INTEGER,
  hasCreditConsent INTEGER DEFAULT 0,
  buyabilityScore TEXT,
  affordabilityMin INTEGER,
  affordabilityMax INTEGER,
  monthlyPaymentCapacity INTEGER,
  profileProgress INTEGER DEFAULT 0,
  badges TEXT,
  lastActivity DATETIME,
  preferredPropertyType TEXT,
  preferredLocation TEXT,
  maxCommuteTime INTEGER,
  ipAddress TEXT,
  userAgent TEXT,
  referrer TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Prospect favorites table
CREATE TABLE IF NOT EXISTS prospect_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prospectId INTEGER NOT NULL,
  propertyId INTEGER NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Recently viewed table
CREATE TABLE IF NOT EXISTS recently_viewed (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prospectId INTEGER NOT NULL,
  propertyId INTEGER NOT NULL,
  viewedAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Scheduled viewings table
CREATE TABLE IF NOT EXISTS scheduled_viewings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prospectId INTEGER NOT NULL,
  propertyId INTEGER NOT NULL,
  agentId INTEGER,
  scheduledAt DATETIME NOT NULL,
  status TEXT DEFAULT 'scheduled' NOT NULL,
  notes TEXT,
  prospectName TEXT,
  prospectEmail TEXT,
  prospectPhone TEXT,
  notificationSent INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  propertyId INTEGER,
  developmentId INTEGER,
  agencyId INTEGER,
  agentId INTEGER,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  leadType TEXT DEFAULT 'inquiry' NOT NULL,
  status TEXT DEFAULT 'new' NOT NULL,
  source TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  nextFollowUp DATETIME,
  lastContactedAt DATETIME,
  notes TEXT
);

-- Favorites table (for authenticated users)
CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  propertyId INTEGER NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);
`;

// Execute the SQL statements
try {
  db.exec(createTables);
  console.log('✅ Database tables created successfully!');
  
  // Insert some sample data
  const insertSampleData = `
    -- Insert sample agencies
    INSERT OR IGNORE INTO agencies (id, name, slug, description, city, province) VALUES 
      (1, 'Premium Properties SA', 'premium-properties-sa', 'Leading real estate agency in South Africa', 'Johannesburg', 'Gauteng'),
      (2, 'Cape Town Realty', 'cape-town-realty', 'Premier property services in Cape Town', 'Cape Town', 'Western Cape');
    
    -- Insert sample properties
    INSERT OR IGNORE INTO properties (id, title, description, propertyType, listingType, price, bedrooms, bathrooms, area, address, city, province, ownerId, status, featured) VALUES
      (1, 'Modern Family Home', 'Beautiful 4-bedroom family home in secure estate', 'house', 'sale', 2500000, 4, 3, 280, '45 Oak Street, Sandown Estate', 'Johannesburg', 'Gauteng', 1, 'available', 1),
      (2, 'Luxury Apartment', 'Stunning apartment with city views', 'apartment', 'sale', 1800000, 3, 2, 180, '123 Marine Drive, Sea Point', 'Cape Town', 'Western Cape', 1, 'available', 1),
      (3, 'Townhouse for Rent', 'Cozy 2-bedroom townhouse', 'townhouse', 'rent', 25000, 2, 2, 120, '78 Garden Avenue, Rosebank', 'Johannesburg', 'Gauteng', 1, 'available', 0);
  `;
  
  db.exec(insertSampleData);
  console.log('✅ Sample data inserted successfully!');
  
} catch (error) {
  console.error('❌ Error creating database:', error);
  process.exit(1);
}

db.close();
console.log('🎉 Database initialization complete!');