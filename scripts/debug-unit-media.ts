
import { getDb } from "../server/db";
import { unitTypes } from "../drizzle/schema";
import { desc } from "drizzle-orm";
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const db = await getDb();
  if (!db) throw new Error("Could not connect to database");
  
  console.log("Fetching latest unit type...");
  const units = await db.select().from(unitTypes).orderBy(desc(unitTypes.id)).limit(1);

  if (units.length === 0) {
    console.log("No unit types found.");
    return;
  }

  const u = units[0];
  console.log("Unit ID:", u.id);
  console.log("Name:", u.name);
  console.log("Base Media Type:", typeof u.baseMedia);
  console.log("Base Media Value:", u.baseMedia);
  
  if (typeof u.baseMedia === 'string') {
      console.log("IS STRING! attempting parse...");
      try {
          const parsed = JSON.parse(u.baseMedia);
          console.log("Parsed:", parsed);
          console.log("Parsed Type:", typeof parsed);
      } catch (e) {
          console.log("Parse failed:", e);
      }
  } else {
      console.log("Is Object/Other");
  }
  
  process.exit(0);
}

main().catch(console.error);
