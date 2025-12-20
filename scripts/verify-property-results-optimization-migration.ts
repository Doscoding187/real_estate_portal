import { getDb } from "../server/db";

/**
 * Verification script for Property Results Optimization migration
 * 
 * Checks that all required columns, tables, and indexes were created successfully
 */

async function verifyMigration() {
  console.log("🔍 Verifying Property Results Optimization migration...\n");

  let allChecksPass = true;

  try {
    // Initialize database connection
    const database = await getDb();
    if (!database) {
      throw new Error("Failed to initialize database connection");
    }
    console.log("✅ Database connection established\n");

    // Check properties table columns
    console.log("1️⃣ Checking properties table columns...");
    const propertiesColumns = await database.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'properties'
        AND COLUMN_NAME IN (
          'title_type', 'levy', 'rates_estimate', 'security_estate',
          'pet_friendly', 'fibre_ready', 'load_shedding_solutions',
          'erf_size', 'floor_size', 'suburb'
        )
      ORDER BY COLUMN_NAME
    `);

    const expectedColumns = [
      'title_type', 'levy', 'rates_estimate', 'security_estate',
      'pet_friendly', 'fibre_ready', 'load_shedding_solutions',
      'erf_size', 'floor_size', 'suburb'
    ];

    const foundColumns = (propertiesColumns as any[]).map((col: any) => col.COLUMN_NAME);
    
    for (const col of expectedColumns) {
      if (foundColumns.includes(col)) {
        console.log(`   ✅ Column '${col}' exists`);
      } else {
        console.log(`   ❌ Column '${col}' is missing`);
        allChecksPass = false;
      }
    }

    // Check indexes on properties table
    console.log("\n2️⃣ Checking properties table indexes...");
    const propertiesIndexes = await database.execute(`
      SELECT DISTINCT INDEX_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'properties'
        AND INDEX_NAME IN (
          'idx_properties_title_type',
          'idx_properties_security_estate',
          'idx_properties_pet_friendly',
          'idx_properties_fibre_ready',
          'idx_properties_suburb',
          'idx_properties_listed_date',
          'idx_properties_location_type',
          'idx_properties_price_beds'
        )
    `);

    const expectedIndexes = [
      'idx_properties_title_type',
      'idx_properties_security_estate',
      'idx_properties_pet_friendly',
      'idx_properties_fibre_ready',
      'idx_properties_suburb',
      'idx_properties_listed_date',
      'idx_properties_location_type',
      'idx_properties_price_beds'
    ];

    const foundIndexes = (propertiesIndexes as any[]).map((idx: any) => idx.INDEX_NAME);

    for (const idx of expectedIndexes) {
      if (foundIndexes.includes(idx)) {
        console.log(`   ✅ Index '${idx}' exists`);
      } else {
        console.log(`   ⚠️  Index '${idx}' is missing (may need manual creation)`);
      }
    }

    // Check saved_searches table
    console.log("\n3️⃣ Checking saved_searches table...");
    const savedSearchesTable = await database.execute(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'saved_searches'
    `);

    if ((savedSearchesTable as any[])[0].count > 0) {
      console.log("   ✅ Table 'saved_searches' exists");
      
      // Check columns
      const savedSearchesColumns = await database.execute(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'saved_searches'
        ORDER BY ORDINAL_POSITION
      `);
      
      const colNames = (savedSearchesColumns as any[]).map((col: any) => col.COLUMN_NAME);
      console.log(`   📋 Columns: ${colNames.join(", ")}`);
    } else {
      console.log("   ❌ Table 'saved_searches' is missing");
      allChecksPass = false;
    }

    // Check search_analytics table
    console.log("\n4️⃣ Checking search_analytics table...");
    const searchAnalyticsTable = await database.execute(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'search_analytics'
    `);

    if ((searchAnalyticsTable as any[])[0].count > 0) {
      console.log("   ✅ Table 'search_analytics' exists");
      
      const searchAnalyticsColumns = await database.execute(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'search_analytics'
        ORDER BY ORDINAL_POSITION
      `);
      
      const colNames = (searchAnalyticsColumns as any[]).map((col: any) => col.COLUMN_NAME);
      console.log(`   📋 Columns: ${colNames.join(", ")}`);
    } else {
      console.log("   ❌ Table 'search_analytics' is missing");
      allChecksPass = false;
    }

    // Check property_clicks table
    console.log("\n5️⃣ Checking property_clicks table...");
    const propertyClicksTable = await database.execute(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'property_clicks'
    `);

    if ((propertyClicksTable as any[])[0].count > 0) {
      console.log("   ✅ Table 'property_clicks' exists");
      
      const propertyClicksColumns = await database.execute(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'property_clicks'
        ORDER BY ORDINAL_POSITION
      `);
      
      const colNames = (propertyClicksColumns as any[]).map((col: any) => col.COLUMN_NAME);
      console.log(`   📋 Columns: ${colNames.join(", ")}`);
    } else {
      console.log("   ❌ Table 'property_clicks' is missing");
      allChecksPass = false;
    }

    // Final summary
    console.log("\n" + "=".repeat(60));
    if (allChecksPass) {
      console.log("✅ All migration checks passed!");
    } else {
      console.log("⚠️  Some checks failed. Please review the output above.");
    }
    console.log("=".repeat(60));

  } catch (error: any) {
    console.error("\n❌ Verification failed:", error.message);
    throw error;
  }
}

// Run verification
verifyMigration()
  .then(() => {
    console.log("\n🎉 Verification complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Verification failed with error:", error);
    process.exit(1);
  });
