import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { provinces, cities, suburbs } from "./drizzle/schema";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

async function seedLocations() {
  const isProduction = process.env.NODE_ENV === 'production';
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: isProduction,
    },
  });
  const db = drizzle(connection);

  console.log("Starting South African locations seeding...");

  try {
    // Clear existing data (order matters due to foreign keys)
    console.log("Clearing existing data...");
    await db.delete(suburbs);
    await db.delete(cities);
    await db.delete(provinces);

    // 1. Seed Provinces
    console.log("Inserting provinces...");
    const provinceData = [
      { name: "Gauteng", code: "GP", latitude: "-26.2708", longitude: "28.1123" },
      { name: "Western Cape", code: "WC", latitude: "-33.9249", longitude: "18.4241" },
      { name: "KwaZulu-Natal", code: "KZN", latitude: "-29.8587", longitude: "31.0218" },
      { name: "Eastern Cape", code: "EC", latitude: "-32.2968", longitude: "26.4194" },
      { name: "Mpumalanga", code: "MP", latitude: "-25.5656", longitude: "30.5279" },
      { name: "Limpopo", code: "LP", latitude: "-23.8962", longitude: "29.4486" },
      { name: "North West", code: "NW", latitude: "-26.6639", longitude: "25.2838" },
      { name: "Free State", code: "FS", latitude: "-28.4541", longitude: "26.7968" },
      { name: "Northern Cape", code: "NC", latitude: "-29.0467", longitude: "21.8569" },
    ];

    await db.insert(provinces).values(provinceData);
    
    // Fetch inserted provinces to get IDs
    const dbProvinces = await db.select().from(provinces);
    const getProvId = (code: string) => dbProvinces.find(p => p.code === code)?.id;

    // 2. Seed Cities
    console.log("Inserting cities...");
    const cityData = [
      // Gauteng
      { name: "Johannesburg", provinceId: getProvId("GP")!, isMetro: 1, latitude: "-26.2041", longitude: "28.0473" },
      { name: "Pretoria", provinceId: getProvId("GP")!, isMetro: 1, latitude: "-25.7479", longitude: "28.2293" },
      { name: "Sandton", provinceId: getProvId("GP")!, isMetro: 1, latitude: "-26.1076", longitude: "28.0567" },
      { name: "Midrand", provinceId: getProvId("GP")!, isMetro: 0, latitude: "-26.0122", longitude: "28.1278" },
      { name: "Centurion", provinceId: getProvId("GP")!, isMetro: 0, latitude: "-25.8640", longitude: "28.1925" },
      { name: "Roodepoort", provinceId: getProvId("GP")!, isMetro: 0, latitude: "-26.1625", longitude: "27.8725" },
      
      // Western Cape
      { name: "Cape Town", provinceId: getProvId("WC")!, isMetro: 1, latitude: "-33.9249", longitude: "18.4241" },
      { name: "Stellenbosch", provinceId: getProvId("WC")!, isMetro: 0, latitude: "-33.9321", longitude: "18.8602" },
      { name: "Paarl", provinceId: getProvId("WC")!, isMetro: 0, latitude: "-33.7252", longitude: "18.9636" },
      { name: "Somerset West", provinceId: getProvId("WC")!, isMetro: 0, latitude: "-34.0745", longitude: "18.8432" },

      // KZN
      { name: "Durban", provinceId: getProvId("KZN")!, isMetro: 1, latitude: "-29.8587", longitude: "31.0218" },
      { name: "Umhlanga", provinceId: getProvId("KZN")!, isMetro: 0, latitude: "-29.7282", longitude: "31.0847" },
      { name: "Ballito", provinceId: getProvId("KZN")!, isMetro: 0, latitude: "-29.5390", longitude: "31.2117" },
    ];

    await db.insert(cities).values(cityData);

    // Fetch inserted cities to get IDs
    const dbCities = await db.select().from(cities);
    const getCityId = (name: string) => dbCities.find(c => c.name === name)?.id;

    // 3. Seed Suburbs (Sample data for Johannesburg & Cape Town)
    console.log("Inserting suburbs...");
    const suburbData = [
      // Johannesburg Suburbs
      { name: "Rosebank", cityId: getCityId("Johannesburg")!, postalCode: "2196", latitude: "-26.1456", longitude: "28.0405" },
      { name: "Maboneng", cityId: getCityId("Johannesburg")!, postalCode: "2094", latitude: "-26.2041", longitude: "28.0583" },
      { name: "Melville", cityId: getCityId("Johannesburg")!, postalCode: "2092", latitude: "-26.1755", longitude: "28.0076" },
      { name: "Linden", cityId: getCityId("Johannesburg")!, postalCode: "2195", latitude: "-26.1311", longitude: "27.9904" },
      { name: "Norwood", cityId: getCityId("Johannesburg")!, postalCode: "2192", latitude: "-26.1556", longitude: "28.0734" },
      
      // Sandton Suburbs
      { name: "Bryanston", cityId: getCityId("Sandton")!, postalCode: "2021", latitude: "-26.0560", longitude: "28.0263" },
      { name: "Morningside", cityId: getCityId("Sandton")!, postalCode: "2057", latitude: "-26.0827", longitude: "28.0601" },
      
      // Cape Town Suburbs
      { name: "Sea Point", cityId: getCityId("Cape Town")!, postalCode: "8005", latitude: "-33.9149", longitude: "18.3900" },
      { name: "Camps Bay", cityId: getCityId("Cape Town")!, postalCode: "8005", latitude: "-33.9511", longitude: "18.3783" },
      { name: "Claremont", cityId: getCityId("Cape Town")!, postalCode: "7708", latitude: "-33.9806", longitude: "18.4651" },
    ];

    // Filter out any suburbs where cityId might be undefined (safety check)
    const validSuburbs = suburbData.filter(s => s.cityId !== undefined);
    
    if (validSuburbs.length > 0) {
      await db.insert(suburbs).values(validSuburbs);
    }

    console.log(`✅ Seeding completed! Added:
    - ${provinceData.length} Provinces
    - ${cityData.length} Cities
    - ${validSuburbs.length} Suburbs`);

  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedLocations();

