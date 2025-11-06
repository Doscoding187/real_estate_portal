import { drizzle } from "drizzle-orm/mysql2";
import { locations } from "./drizzle/schema";

async function seedLocations() {
  const db = drizzle(process.env.DATABASE_URL!);

  console.log("Starting South African locations seeding...");

  // South African provinces and major cities
  const saLocations = [
    // Provinces
    { name: "Gauteng", slug: "gauteng", type: "province" as const, parentId: null },
    { name: "Western Cape", slug: "western-cape", type: "province" as const, parentId: null },
    { name: "KwaZulu-Natal", slug: "kwazulu-natal", type: "province" as const, parentId: null },
    { name: "Eastern Cape", slug: "eastern-cape", type: "province" as const, parentId: null },
    { name: "Mpumalanga", slug: "mpumalanga", type: "province" as const, parentId: null },
    { name: "Limpopo", slug: "limpopo", type: "province" as const, parentId: null },
    { name: "North West", slug: "north-west", type: "province" as const, parentId: null },
    { name: "Free State", slug: "free-state", type: "province" as const, parentId: null },
    { name: "Northern Cape", slug: "northern-cape", type: "province" as const, parentId: null },
  ];

  console.log("Inserting provinces...");
  for (const location of saLocations) {
    await db.insert(locations).values(location);
    console.log(`✓ Added province: ${location.name}`);
  }

  // Get province IDs for city relationships
  const [gauteng] = await db.select().from(locations).where((t: any) => t.slug === "gauteng");
  const [westernCape] = await db.select().from(locations).where((t: any) => t.slug === "western-cape");
  const [kwazuluNatal] = await db.select().from(locations).where((t: any) => t.slug === "kwazulu-natal");
  const [easternCape] = await db.select().from(locations).where((t: any) => t.slug === "eastern-cape");

  // Major cities
  const cities = [
    // Gauteng cities
    { name: "Johannesburg", slug: "johannesburg", type: "city" as const, parentId: gauteng?.id },
    { name: "Pretoria", slug: "pretoria", type: "city" as const, parentId: gauteng?.id },
    { name: "Sandton", slug: "sandton", type: "city" as const, parentId: gauteng?.id },
    { name: "Midrand", slug: "midrand", type: "city" as const, parentId: gauteng?.id },
    { name: "Centurion", slug: "centurion", type: "city" as const, parentId: gauteng?.id },
    { name: "Roodepoort", slug: "roodepoort", type: "city" as const, parentId: gauteng?.id },
    { name: "Soweto", slug: "soweto", type: "city" as const, parentId: gauteng?.id },
    
    // Western Cape cities
    { name: "Cape Town", slug: "cape-town", type: "city" as const, parentId: westernCape?.id },
    { name: "Stellenbosch", slug: "stellenbosch", type: "city" as const, parentId: westernCape?.id },
    { name: "Paarl", slug: "paarl", type: "city" as const, parentId: westernCape?.id },
    { name: "George", slug: "george", type: "city" as const, parentId: westernCape?.id },
    { name: "Somerset West", slug: "somerset-west", type: "city" as const, parentId: westernCape?.id },
    
    // KwaZulu-Natal cities
    { name: "Durban", slug: "durban", type: "city" as const, parentId: kwazuluNatal?.id },
    { name: "Pietermaritzburg", slug: "pietermaritzburg", type: "city" as const, parentId: kwazuluNatal?.id },
    { name: "Ballito", slug: "ballito", type: "city" as const, parentId: kwazuluNatal?.id },
    { name: "Umhlanga", slug: "umhlanga", type: "city" as const, parentId: kwazuluNatal?.id },
    
    // Eastern Cape cities
    { name: "Port Elizabeth", slug: "port-elizabeth", type: "city" as const, parentId: easternCape?.id },
    { name: "East London", slug: "east-london", type: "city" as const, parentId: easternCape?.id },
  ];

  console.log("\nInserting cities...");
  for (const city of cities) {
    await db.insert(locations).values(city);
    console.log(`✓ Added city: ${city.name}`);
  }

  console.log("\n✅ South African locations seeding completed!");
  console.log(`Total locations added: ${saLocations.length + cities.length}`);
}

seedLocations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error seeding locations:", error);
    process.exit(1);
  });

