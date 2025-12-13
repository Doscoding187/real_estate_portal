console.log("Script starting...");
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { provinces, cities } from "../drizzle/schema";
import * as dotenv from "dotenv";

dotenv.config();

console.log("Environment loaded.");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing!");
  throw new Error("DATABASE_URL is not defined");
}
console.log("DATABASE_URL is set (" + process.env.DATABASE_URL.substring(0, 10) + "...).");

async function checkLocations() {
  console.log("Connecting to database...");
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, 
  });
  console.log("Connected.");
  const db = drizzle(connection);

  console.log("Checking database content...");

  try {
    const allProvinces = await db.select().from(provinces);
    console.log(`Found ${allProvinces.length} provinces.`);
    allProvinces.forEach(p => console.log(` - ${p.name} (Slug: ${p.slug})`));

    const allCities = await db.select().from(cities).limit(20);
    console.log(`Found ${allCities.length} cities (showing first 20).`);
    allCities.forEach(c => console.log(` - ${c.name} (Slug: ${c.slug}, ProvId: ${c.provinceId})`));

  } catch (error) {
    console.error("Available tables check failed:", error);
  } finally {
    await connection.end();
  }
}

checkLocations();
