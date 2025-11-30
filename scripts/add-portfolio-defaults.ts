import 'dotenv/config';
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function addPortfolioDefaults() {
  console.log("🔧 Adding default values to portfolio columns...\n");

  try {
    const db = await getDb();
    
    // Add default values to portfolio columns
    await db.execute(sql`
      ALTER TABLE developers 
      MODIFY COLUMN completedProjects INT DEFAULT 0,
      MODIFY COLUMN currentProjects INT DEFAULT 0,
      MODIFY COLUMN upcomingProjects INT DEFAULT 0
    `);

    console.log("✅ Successfully added default values to portfolio columns");
    
    // Verify the changes
    console.log("\n🔍 Verifying column definitions...");
    const result = await db.execute(sql`
      SHOW COLUMNS FROM developers 
      WHERE Field IN ('completedProjects', 'currentProjects', 'upcomingProjects')
    `);
    
    console.log("\n📋 Updated column definitions:");
    console.log(result);
    
  } catch (error) {
    console.error("❌ Error adding default values:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

addPortfolioDefaults();
