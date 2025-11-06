import { drizzle } from "drizzle-orm/mysql2";
import { properties } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function updatePropertiesSA() {
  const db = drizzle(process.env.DATABASE_URL!);

  console.log("Updating properties to South African market...");

  // Mapping of Indian cities to SA cities with updated prices (INR to ZAR conversion ~1:5)
  const cityMapping = [
    { oldCity: "Mumbai", newCity: "Cape Town", province: "Western Cape", priceMultiplier: 5 },
    { oldCity: "Bangalore", newCity: "Johannesburg", province: "Gauteng", priceMultiplier: 5 },
    { oldCity: "Pune", newCity: "Pretoria", province: "Gauteng", priceMultiplier: 5 },
    { oldCity: "Goa", newCity: "Durban", province: "KwaZulu-Natal", priceMultiplier: 5 },
    { oldCity: "Delhi", newCity: "Sandton", province: "Gauteng", priceMultiplier: 5 },
    { oldCity: "Noida", newCity: "Centurion", province: "Gauteng", priceMultiplier: 5 },
    { oldCity: "Hyderabad", newCity: "Umhlanga", province: "KwaZulu-Natal", priceMultiplier: 5 },
  ];

  for (const mapping of cityMapping) {
    const allProperties = await db.select().from(properties).where(eq(properties.city, mapping.oldCity));
    
    for (const property of allProperties) {
      const newPrice = Math.round(property.price * mapping.priceMultiplier);
      
      await db.update(properties)
        .set({
          city: mapping.newCity,
          province: mapping.province,
          price: newPrice,
        })
        .where(eq(properties.id, property.id));
      
      console.log(`✓ Updated: ${property.title} - ${mapping.oldCity} → ${mapping.newCity}, R${newPrice.toLocaleString()}`);
    }
  }

  console.log("\n✅ Properties updated to South African market!");
}

updatePropertiesSA()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error updating properties:", error);
    process.exit(1);
  });

