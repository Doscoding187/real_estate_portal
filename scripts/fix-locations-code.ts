
import { sql } from "drizzle-orm";
import { db } from "../server/db";

async function main() {
  console.log("Fixing locations table schema...");
  try {
    // Check if 'code' column exists first to avoid error if it doesn't?
    // Or just run the ALTER command. If column doesn't exist, it might fail or we might need ADD.
    // The error "Field 'code' doesn't have a default value" implies it exists.
    
    // User suggestion: ALTER TABLE locations MODIFY code VARCHAR(50) DEFAULT '';
    await db.execute(sql`ALTER TABLE locations MODIFY code VARCHAR(50) DEFAULT ''`);
    console.log("Successfully modified 'code' column in 'locations' table.");
  } catch (error: any) {
    console.error("Error modifying locations table:", error.message);
    if (error.message.includes("Unknown column")) {
        console.log("Column 'code' does not exist. Attempting to add it.");
        try {
             await db.execute(sql`ALTER TABLE locations ADD COLUMN code VARCHAR(50) DEFAULT ''`);
             console.log("Successfully added 'code' column.");
        } catch (addError) {
            console.error("Failed to add column:", addError);
        }
    }
  }
  process.exit(0);
}

main();
