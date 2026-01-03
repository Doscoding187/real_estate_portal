import { getDb } from "../server/db";
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const db = await getDb();
  if (!db) throw new Error("Could not connect to database");
  
  console.log("Adding total_units and available_units columns to unit_types table...");
  
  try {
    // Add total_units column
    await db.execute(`
      ALTER TABLE unit_types 
      ADD COLUMN IF NOT EXISTS total_units INT NOT NULL DEFAULT 0
    `);
    console.log("✓ Added total_units column");
  } catch (e: any) {
    if (e.message?.includes('Duplicate column')) {
      console.log("- total_units column already exists");
    } else {
      console.error("Error adding total_units:", e.message);
    }
  }
  
  try {
    // Add available_units column
    await db.execute(`
      ALTER TABLE unit_types 
      ADD COLUMN IF NOT EXISTS available_units INT NOT NULL DEFAULT 0
    `);
    console.log("✓ Added available_units column");
  } catch (e: any) {
    if (e.message?.includes('Duplicate column')) {
      console.log("- available_units column already exists");
    } else {
      console.error("Error adding available_units:", e.message);
    }
  }
  
  console.log("\nMigration complete!");
  process.exit(0);
}

main().catch(console.error);
