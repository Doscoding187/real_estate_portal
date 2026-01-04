
import { developmentService } from '../server/services/developmentService';
import { getDb } from '../server/db-connection';

// Mock the environment variable for the script using the credentials tested earlier
// Note: In a real scenario, we'd load .env, but here we want to match the specific PROD URL 
// that the user provided and we verified with the raw SQL script.
process.env.DATABASE_URL = "mysql://292qWmvn2YGy2jW.root:TOdjCJY1bepCcJg1@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/listify_property_sa?ssl={\"rejectUnauthorized\":false}";
process.env.NODE_ENV = "production";

console.log("Setting up test environment...");
console.log("DATABASE_URL set.");

async function testService() {
  try {
    console.log("Connecting to DB via service...");
    const db = await getDb();
    console.log("DB instance retrieved:", !!db);

    const slug = 'sky-city-housing-development-ext-50';
    console.log(`Testing getPublicDevelopmentBySlug with '${slug}'...`);

    const result = await developmentService.getPublicDevelopmentBySlug(slug);
    console.log("---------------------------------------------------");
    if (result) {
        console.log("SUCCESS! Development found:");
        console.log("ID:", result.id);
        console.log("Name:", result.name);
        console.log("IsPublished:", result.isPublished);
    } else {
        console.log("FAILURE! Development returned NULL.");
        console.log("Possible causes: Query filters (isPublished?), Schema mismatch, Connectivity.");
    }
    console.log("---------------------------------------------------");
    
    process.exit(0);
  } catch (error) {
    console.error("CRASHED:", error);
    process.exit(1);
  }
}

testService();
