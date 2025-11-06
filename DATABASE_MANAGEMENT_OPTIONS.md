# Database Management Options - Multiple Solutions

## 🎯 **Since Docker isn't working properly, here are 3 alternative approaches**

---

## **Option 1: SQL Workbench + Local MySQL** (Recommended for you)

### **Step 1: Install MySQL Locally**
1. **Download MySQL Community Server:**
   - Go to: https://dev.mysql.com/downloads/mysql/
   - Download MySQL Community Server (8.0 or 5.7)
   - Install with MySQL Workbench included

2. **During Installation:**
   - Choose "Server only" or "Full Installation"
   - Set root password: `admin123` (or your preferred password)
   - Add to PATH for easy command line access

### **Step 2: Create Database**
1. **Open MySQL Command Line or Workbench**
2. **Execute these commands:**
```sql
-- Connect as root
mysql -u root -p

-- Create database
CREATE DATABASE real_estate_portal;

-- Create user for the application
CREATE USER 'realestate_user'@'localhost' IDENTIFIED BY 'realestate_pass';
GRANT ALL PRIVILEGES ON real_estate_portal.* TO 'realestate_user'@'localhost';
FLUSH PRIVILEGES;

-- Switch to database
USE real_estate_portal;
```

### **Step 3: Create User Preferences Table**
1. **Open SQL Workbench**
2. **Connect to MySQL:**
   - Host: localhost
   - Port: 3306
   - Username: root (or realestate_user)
   - Password: admin123 (or your password)
   - Default Schema: real_estate_portal

3. **Execute Migration:**
   - Copy the content from `migrations/create-user-preferences-table.sql`
   - Paste into SQL Workbench SQL editor
   - Execute to create the table

### **Step 4: Verify Creation**
```sql
-- Check tables were created
SHOW TABLES;

-- Describe the user_preferences table
DESCRIBE user_preferences;

-- View sample data
SELECT * FROM user_preferences;
```

---

## **Option 2: Use Existing Database (Easiest)**

### **If you already have MySQL/MariaDB running:**
1. **Use your existing connection details**
2. **Run the migration in SQL Workbench:**
   ```sql
   -- Execute this SQL to create user_preferences table
   -- Copy from migrations/create-user-preferences-table.sql
   ```

### **Update Drizzle Connection:**
1. **Find your database configuration** (likely in `server/db.ts` or environment variables)
2. **Update to point to your database:**
   ```typescript
   // Example connection update
   export const db = drizzle(mysql(process.env.DATABASE_URL!));
   ```

---

## **Option 3: Use SQLite for Development (Quick Start)**

### **Convert the migration to SQLite:**
1. **Create SQLite version of user_preferences table:**
```sql
-- SQLite-compatible user_preferences table
CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  preferredPropertyTypes TEXT,
  preferredPriceMin INTEGER,
  preferredPriceMax INTEGER,
  preferredBedrooms INTEGER,
  preferredBathrooms INTEGER,
  requiredAmenities TEXT,
  preferredAmenities TEXT,
  alertFrequency TEXT DEFAULT 'daily',
  emailNotifications INTEGER DEFAULT 1,
  smsNotifications INTEGER DEFAULT 0,
  pushNotifications INTEGER DEFAULT 1,
  isActive INTEGER DEFAULT 1,
  locationWeight INTEGER DEFAULT 30,
  priceWeight INTEGER DEFAULT 25,
  featuresWeight INTEGER DEFAULT 25,
  sizeWeight INTEGER DEFAULT 20,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  lastUsed TEXT
);

-- Create indexes
CREATE INDEX idx_user_preferences_userId ON user_preferences (userId);
CREATE INDEX idx_user_preferences_active ON user_preferences (isActive);

-- Insert sample data
INSERT INTO user_preferences (
  userId, preferredPropertyTypes, preferredPriceMin, preferredPriceMax,
  requiredAmenities, preferredAmenities, alertFrequency, emailNotifications,
  locationWeight, priceWeight, featuresWeight, sizeWeight
) VALUES (
  1, '["house", "townhouse"]', 800000, 2000000,
  '["garage", "garden"]', '["pool", "security", "backup_power"]',
  'daily', 1, 35, 30, 20, 15
);
```

---

## **Quick SQL Workbench Workflow**

### **For All Options:**
1. **Open SQL Workbench**
2. **Connect to your database**
3. **Create the user_preferences table**
4. **Test the setup**

### **Sample Queries to Test:**
```sql
-- Insert a test preference
INSERT INTO user_preferences (
  userId, preferredPropertyTypes, preferredPriceMin, preferredPriceMax
) VALUES (
  1, '["house", "apartment"]', 500000, 1500000
);

-- Query preferences
SELECT * FROM user_preferences WHERE userId = 1;

-- Update preferences
UPDATE user_preferences 
SET preferredPriceMax = 2000000, preferredAmenities = '["garden", "garage"]'
WHERE userId = 1;

-- Check weighted scoring
SELECT 
  userId,
  locationWeight,
  priceWeight,
  (locationWeight + priceWeight) as totalWeight
FROM user_preferences;
```

---

## **Database Connection Examples**
### **For MySQL/MariaDB:**
```
Connection Name: Real Estate Portal
Connection Type: MySQL
Host: localhost
Port: 3307
Database: real_estate_portal
Username: root
Password: admin123
```

### **For SQLite:**
```
Connection Name: Real Estate Portal SQLite
Connection Type: SQLite
Database file: ./real_estate_portal.db
```

### **For Remote MySQL:**
```
Connection Name: Real Estate Portal Remote
Connection Type: MySQL
Host: your-server.com
Port: 3307
Database: real_estate_portal
Username: realestate_user
Password: your-secure-password
```


---

## **Migration File for SQL Workbench**

**Copy and paste this into SQL Workbench:**

```sql
-- Migration: Create user_preferences table
-- Purpose: Store personalized property search preferences for recommendation scoring

-- Create user_preferences table (MySQL version)
CREATE TABLE IF NOT EXISTS user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  preferredPropertyTypes TEXT COMMENT 'JSON array: ["house", "apartment"]',
  preferredPriceMin INT COMMENT 'Minimum price in ZAR',
  preferredPriceMax INT COMMENT 'Maximum price in ZAR',
  preferredBedrooms INT COMMENT 'Number of bedrooms',
  preferredBathrooms INT COMMENT 'Number of bathrooms',
  preferredPropertySize TEXT COMMENT 'JSON object: {"min": 50, "max": 200}',
  preferredLocations TEXT COMMENT 'JSON array of suburb/city names',
  preferredDistance INT COMMENT 'Max distance in km from center',
  preferredProvices TEXT COMMENT 'JSON array of province names',
  preferredCities TEXT COMMENT 'JSON array of city names',
  preferredSuburbs TEXT COMMENT 'JSON array of suburb names',
  requiredAmenities TEXT COMMENT 'JSON array: ["pool", "garden", "garage"]',
  preferredAmenities TEXT COMMENT 'JSON array',
  propertyFeatures TEXT COMMENT 'JSON object with feature preferences',
  petFriendly TINYINT(1) DEFAULT 0 COMMENT '0=No preference, 1=Required, 2=Not wanted',
  furnished ENUM('unfurnished', 'semi_furnished', 'fully_furnished'),
  alertFrequency ENUM('never', 'instant', 'daily', 'weekly') DEFAULT 'daily',
  emailNotifications TINYINT(1) DEFAULT 1,
  smsNotifications TINYINT(1) DEFAULT 0,
  pushNotifications TINYINT(1) DEFAULT 1,
  isActive TINYINT(1) DEFAULT 1,
  locationWeight INT DEFAULT 30 COMMENT 'How important location is (0-100)',
  priceWeight INT DEFAULT 25 COMMENT 'How important price match is (0-100)',
  featuresWeight INT DEFAULT 25 COMMENT 'How important features match is (0-100)',
  sizeWeight INT DEFAULT 20 COMMENT 'How important size match is (0-100)',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  lastUsed TIMESTAMP NULL
);

-- Create indexes for performance
CREATE INDEX idx_user_preferences_userId ON user_preferences (userId);
CREATE INDEX idx_user_preferences_active ON user_preferences (isActive);
CREATE INDEX idx_user_preferences_updated ON user_preferences (updatedAt);

-- Insert sample test data
INSERT INTO user_preferences (
  userId, preferredPropertyTypes, preferredPriceMin, preferredPriceMax,
  preferredBedrooms, preferredBathrooms, requiredAmenities, preferredAmenities,
  alertFrequency, emailNotifications, locationWeight, priceWeight, featuresWeight, sizeWeight
) VALUES (
  1, '["house", "townhouse"]', 800000, 2000000, 3, 2,
  '["garage", "garden"]', '["pool", "security", "backup_power"]',
  'daily', 1, 35, 30, 20, 15
);

-- Verify creation
SELECT COUNT(*) as tableCreated FROM user_preferences;
```

---

## **Next Steps After Database Setup**

1. **✅ Choose your option above**
2. **✅ Create the user_preferences table**
3. **✅ Test with sample queries**
4. **🔄 Update your application** to use the new table
5. **🔄 Implement preference CRUD endpoints**
6. **🔄 Add weighted scoring algorithm**

---

## **Troubleshooting**

### **MySQL Connection Issues:**
- Check MySQL service is running: `sudo systemctl status mysql` (Linux) or check Services (Windows)
- Verify port 3306 is available
- Check firewall settings
- Try connecting with different username (root vs realestate_user)

### **SQL Workbench Issues:**
- Update to latest version of SQL Workbench
- Try different drivers (MySQL JDBC vs MariaDB JDBC)
- Check connection timeout settings

### **Permission Issues:**
- Ensure database user has CREATE, SELECT, INSERT, UPDATE, DELETE privileges
- For root user, ensure skip-grant-tables isn't enabled in production

### **Migration Issues:**
- Check MySQL version compatibility (8.0 vs 5.7)
- Verify character set is UTF-8
- Check if table already exists (DROP TABLE IF EXISTS)

**Choose Option 1 or 2 based on your current setup and proceed with confidence!**