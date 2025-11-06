import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

async function migrate() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  
  console.log("Starting schema migration...");

  try {
    // Rename state to province (if exists)
    console.log("1. Checking if 'state' column exists...");
    try {
      await connection.execute("ALTER TABLE properties CHANGE COLUMN state province varchar(100) NOT NULL");
      console.log("   - Renamed 'state' to 'province'");
    } catch (e: any) {
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        console.log("   - Column 'state' doesn't exist, likely already renamed or using 'province'");
      } else {
        throw e;
      }
    }

    // Add new columns to properties
    console.log("2. Adding new columns to properties table...");
    await connection.execute(`
      ALTER TABLE properties 
        ADD COLUMN IF NOT EXISTS transactionType ENUM('sale', 'rent', 'rent_to_buy', 'auction') DEFAULT 'sale' NOT NULL AFTER listingType
    `);
    
    await connection.execute("ALTER TABLE properties ADD COLUMN IF NOT EXISTS agentId INT AFTER views");
    await connection.execute("ALTER TABLE properties ADD COLUMN IF NOT EXISTS developmentId INT AFTER agentId");
    await connection.execute("ALTER TABLE properties ADD COLUMN IF NOT EXISTS propertySettings TEXT AFTER ownerId");
    await connection.execute("ALTER TABLE properties ADD COLUMN IF NOT EXISTS videoUrl TEXT AFTER propertySettings");
    await connection.execute("ALTER TABLE properties ADD COLUMN IF NOT EXISTS virtualTourUrl TEXT AFTER videoUrl");
    await connection.execute("ALTER TABLE properties ADD COLUMN IF NOT EXISTS levies INT AFTER virtualTourUrl");
    await connection.execute("ALTER TABLE properties ADD COLUMN IF NOT EXISTS ratesAndTaxes INT AFTER levies");

    // Update enums
    console.log("3. Updating property type and listing type enums...");
    await connection.execute(`
      ALTER TABLE properties 
        MODIFY COLUMN propertyType ENUM('apartment', 'house', 'villa', 'plot', 'commercial', 'townhouse', 'cluster_home', 'farm', 'shared_living') NOT NULL
    `);
    
    await connection.execute(`
      ALTER TABLE properties 
        MODIFY COLUMN listingType ENUM('sale', 'rent', 'rent_to_buy', 'auction', 'shared_living') NOT NULL
    `);

    // Create new tables
    console.log("4. Creating agencies table...");
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS agencies (
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
        subscriptionTier ENUM('free', 'basic', 'premium', 'enterprise') DEFAULT 'free' NOT NULL,
        subscriptionExpiry TIMESTAMP NULL,
        isVerified INT DEFAULT 0 NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      )
    `);

    console.log("5. Creating agents table...");
    await connection.execute(`
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
        specialization TEXT,
        role ENUM('agent', 'principal_agent', 'broker') DEFAULT 'agent' NOT NULL,
        licenseNumber VARCHAR(100),
        yearsExperience INT,
        areasServed TEXT,
        languages TEXT,
        rating INT DEFAULT 0,
        reviewCount INT DEFAULT 0,
        totalSales INT DEFAULT 0,
        isVerified INT DEFAULT 0 NOT NULL,
        isFeatured INT DEFAULT 0 NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE SET NULL
      )
    `);

    console.log("6. Creating developers table...");
    await connection.execute(`
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
        isVerified INT DEFAULT 0 NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      )
    `);

    console.log("7. Creating developments table...");
    await connection.execute(`
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
        amenities TEXT,
        images TEXT,
        videos TEXT,
        completionDate TIMESTAMP NULL,
        isFeatured INT DEFAULT 0 NOT NULL,
        views INT DEFAULT 0 NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (developerId) REFERENCES developers(id) ON DELETE CASCADE
      )
    `);

    console.log("8. Creating services table...");
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category ENUM('home_loan', 'insurance', 'interior_design', 'legal', 'moving', 'other') NOT NULL,
        description TEXT,
        logo TEXT,
        website VARCHAR(255),
        email VARCHAR(320),
        phone VARCHAR(50),
        commissionRate INT,
        isActive INT DEFAULT 1 NOT NULL,
        isFeatured INT DEFAULT 0 NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      )
    `);

    console.log("9. Creating reviews table...");
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        reviewType ENUM('agent', 'developer', 'property') NOT NULL,
        targetId INT NOT NULL,
        rating INT NOT NULL,
        title VARCHAR(255),
        comment TEXT,
        isVerified INT DEFAULT 0 NOT NULL,
        isPublished INT DEFAULT 1 NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log("10. Creating leads table...");
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        propertyId INT,
        developmentId INT,
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
        FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE SET NULL,
        FOREIGN KEY (developmentId) REFERENCES developments(id) ON DELETE SET NULL,
        FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE SET NULL
      )
    `);

    console.log("11. Creating locations table...");
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(200) NOT NULL UNIQUE,
        type ENUM('province', 'city', 'suburb', 'neighborhood') NOT NULL,
        parentId INT,
        description TEXT,
        latitude VARCHAR(50),
        longitude VARCHAR(50),
        propertyCount INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
      )
    `);

    console.log("12. Creating exploreVideos table...");
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS exploreVideos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        agentId INT,
        propertyId INT,
        developmentId INT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        videoUrl TEXT NOT NULL,
        thumbnailUrl TEXT,
        duration INT,
        views INT DEFAULT 0 NOT NULL,
        likes INT DEFAULT 0 NOT NULL,
        shares INT DEFAULT 0 NOT NULL,
        isPublished INT DEFAULT 1 NOT NULL,
        isFeatured INT DEFAULT 0 NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE SET NULL,
        FOREIGN KEY (developmentId) REFERENCES developments(id) ON DELETE SET NULL
      )
    `);

    console.log("13. Adding foreign keys to properties table...");
    try {
      await connection.execute(`
        ALTER TABLE properties 
          ADD CONSTRAINT fk_properties_agent FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE SET NULL
      `);
    } catch (e: any) {
      if (!e.message.includes("Duplicate")) throw e;
      console.log("   - Foreign key fk_properties_agent already exists, skipping");
    }

    try {
      await connection.execute(`
        ALTER TABLE properties 
          ADD CONSTRAINT fk_properties_development FOREIGN KEY (developmentId) REFERENCES developments(id) ON DELETE SET NULL
      `);
    } catch (e: any) {
      if (!e.message.includes("Duplicate")) throw e;
      console.log("   - Foreign key fk_properties_development already exists, skipping");
    }

    console.log("\n✅ Schema migration completed successfully!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

