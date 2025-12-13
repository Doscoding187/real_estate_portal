import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

async function fixSchema() {
  console.log("Connecting to database...");
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, 
  });
  console.log("Connected.");
  
  try {
    console.log("Adding place_id to provinces...");
    await connection.query("ALTER TABLE provinces ADD COLUMN place_id VARCHAR(255);");
    console.log("Success: Added place_id.");
  } catch (error: any) {
    if (error.code !== 'ER_DUP_FIELDNAME') console.error("Error adding place_id:", error);
  }

  try {
    console.log("Adding seo_title to provinces...");
    await connection.query("ALTER TABLE provinces ADD COLUMN seo_title VARCHAR(255);");
    console.log("Success: Added seo_title.");
  } catch (error: any) {
    if (error.code !== 'ER_DUP_FIELDNAME') console.error("Error adding seo_title:", error);
  }

  try {
    console.log("Adding seo_description to provinces...");
    await connection.query("ALTER TABLE provinces ADD COLUMN seo_description TEXT;");
    console.log("Success: Added seo_description.");
  } catch (error: any) {
    if (error.code !== 'ER_DUP_FIELDNAME') console.error("Error adding seo_description:", error);
  }

  // Same for cities
  try {
    console.log("Adding place_id to cities...");
    await connection.query("ALTER TABLE cities ADD COLUMN place_id VARCHAR(255);");
    console.log("Success: Added place_id to cities.");
  } catch (error: any) {
    if (error.code !== 'ER_DUP_FIELDNAME') console.error("Error adding place_id:", error);
  }

  try {
    console.log("Adding seo_title to cities...");
    await connection.query("ALTER TABLE cities ADD COLUMN seo_title VARCHAR(255);");
    console.log("Success: Added seo_title to cities.");
  } catch (error: any) {
    if (error.code !== 'ER_DUP_FIELDNAME') console.error("Error adding seo_title:", error);
  }

  try {
    console.log("Adding seo_description to cities...");
    await connection.query("ALTER TABLE cities ADD COLUMN seo_description TEXT;");
    console.log("Success: Added seo_description to cities.");
  } catch (error: any) {
    if (error.code !== 'ER_DUP_FIELDNAME') console.error("Error adding seo_description:", error);
  }

  await connection.end();
}

fixSchema();
