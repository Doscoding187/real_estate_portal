import { drizzle } from "drizzle-orm/mysql2";
import { properties, propertyImages, users } from "./drizzle/schema";

async function seedData() {
  const db = drizzle(process.env.DATABASE_URL!);

  console.log("Starting database seeding...");

  // Get the first user (owner) from the database
  const allUsers = await db.select().from(users).limit(1);
  const ownerId = allUsers[0]?.id || 1;

  console.log(`Using owner ID: ${ownerId}`);

  // Sample property data - South African locations
  const sampleProperties = [
    {
      title: "Luxury Waterfront Villa with Pool",
      description: "Stunning waterfront villa featuring modern architecture, infinity pool, and breathtaking ocean views. This exceptional property offers 5 spacious bedrooms, state-of-the-art amenities, and direct beach access. Perfect for those seeking luxury coastal living.",
      propertyType: "villa" as const,
      listingType: "sale" as const,
      price: 18500000,
      bedrooms: 5,
      bathrooms: 4,
      area: 450,
      address: "Beach Road, Camps Bay",
      city: "Cape Town",
      province: "Western Cape",
      zipCode: "8005",
      amenities: JSON.stringify(["Swimming Pool", "Beach Access", "Garden", "Security", "Parking", "Gym"]),
      yearBuilt: 2022,
      status: "available" as const,
      featured: 1,
      ownerId,
      imageFile: "khdLfaNTTtsd.jpg"
    },
    {
      title: "Modern 3-Bedroom Apartment in Prime Location",
      description: "Contemporary 3-bedroom apartment in a premium residential complex. Features include modern kitchen, spacious balconies, and 24/7 security. Located in the heart of Sandton with excellent connectivity to Gautrain and shopping centers.",
      propertyType: "apartment" as const,
      listingType: "sale" as const,
      price: 3200000,
      bedrooms: 3,
      bathrooms: 2,
      area: 145,
      address: "Sandton City, Nelson Mandela Square",
      city: "Johannesburg",
      province: "Gauteng",
      zipCode: "2196",
      amenities: JSON.stringify(["Parking", "Security", "Elevator", "Power Backup", "Clubhouse"]),
      yearBuilt: 2021,
      status: "available" as const,
      featured: 1,
      ownerId,
      imageFile: "35t5znQJ1v9V.jpg"
    },
    {
      title: "Elegant Urban Apartment Complex",
      description: "Premium apartment complex offering modern living spaces with excellent amenities. Features contemporary design, green spaces, and proximity to business districts. Ideal for professionals and families seeking urban convenience.",
      propertyType: "apartment" as const,
      listingType: "sale" as const,
      price: 2800000,
      bedrooms: 2,
      bathrooms: 2,
      area: 120,
      address: "Brooklyn, Pretoria East",
      city: "Pretoria",
      province: "Gauteng",
      zipCode: "0181",
      amenities: JSON.stringify(["Parking", "Security", "Garden", "Clubhouse", "Children's Play Area"]),
      yearBuilt: 2023,
      status: "available" as const,
      featured: 1,
      ownerId,
      imageFile: "ZcWGSahwTdDK.jpg"
    },
    {
      title: "Contemporary Residential Building",
      description: "Modern residential building with stylish balconies and green terraces. Offers sustainable living with rainwater harvesting and solar panels. Perfect blend of comfort and eco-friendly design.",
      propertyType: "apartment" as const,
      listingType: "sale" as const,
      price: 3500000,
      bedrooms: 3,
      bathrooms: 3,
      area: 165,
      address: "Rosebank, Oxford Road",
      city: "Johannesburg",
      province: "Gauteng",
      zipCode: "2196",
      amenities: JSON.stringify(["Solar Panels", "Rainwater Harvesting", "Parking", "Security", "Terrace Garden"]),
      yearBuilt: 2023,
      status: "available" as const,
      featured: 0,
      ownerId,
      imageFile: "40O7UI0lbxUn.jpg"
    },
    {
      title: "Beachfront Luxury Estate",
      description: "Magnificent beachfront estate with private pool and tropical landscaping. This exclusive property offers unparalleled luxury with panoramic ocean views, multiple entertainment areas, and world-class finishes throughout.",
      propertyType: "villa" as const,
      listingType: "sale" as const,
      price: 28500000,
      bedrooms: 6,
      bathrooms: 5,
      area: 600,
      address: "Marine Drive, Umhlanga Rocks",
      city: "Durban",
      province: "KwaZulu-Natal",
      zipCode: "4320",
      amenities: JSON.stringify(["Private Pool", "Beach Access", "Garden", "Security", "Parking", "Entertainment Room", "Wine Cellar"]),
      yearBuilt: 2022,
      status: "available" as const,
      featured: 1,
      ownerId,
      imageFile: "f0xp6VWeaZSN.jpg"
    },
    {
      title: "Spacious Family House with Garden",
      description: "Beautiful family home featuring spacious rooms, modern kitchen, and large garden. Perfect for families looking for comfortable suburban living with easy access to schools and parks.",
      propertyType: "house" as const,
      listingType: "sale" as const,
      price: 4200000,
      bedrooms: 4,
      bathrooms: 3,
      area: 280,
      address: "Waterkloof, Pretoria",
      city: "Pretoria",
      province: "Gauteng",
      zipCode: "0181",
      amenities: JSON.stringify(["Garden", "Parking", "Security", "Patio", "Store Room"]),
      yearBuilt: 2020,
      status: "available" as const,
      featured: 0,
      ownerId,
      imageFile: "XP05F7nbEz5Z.jpg"
    },
    {
      title: "Premium 2-Bedroom Apartment for Rent",
      description: "Well-maintained 2-bedroom apartment available for rent in a gated community. Fully furnished with modern amenities, perfect for working professionals or small families.",
      propertyType: "apartment" as const,
      listingType: "rent" as const,
      price: 18000,
      bedrooms: 2,
      bathrooms: 2,
      area: 110,
      address: "Centurion, Highveld",
      city: "Centurion",
      province: "Gauteng",
      zipCode: "0157",
      amenities: JSON.stringify(["Furnished", "Parking", "Security", "Power Backup", "Gym"]),
      yearBuilt: 2021,
      status: "available" as const,
      featured: 0,
      ownerId,
      imageFile: "35t5znQJ1v9V.jpg"
    },
    {
      title: "Luxury 4-Bedroom Penthouse",
      description: "Exclusive penthouse offering panoramic city views, private terrace, and premium finishes. Features include Italian marble flooring, designer kitchen, and smart home automation.",
      propertyType: "apartment" as const,
      listingType: "sale" as const,
      price: 12500000,
      bedrooms: 4,
      bathrooms: 4,
      area: 320,
      address: "Sea Point, Atlantic Seaboard",
      city: "Cape Town",
      province: "Western Cape",
      zipCode: "8005",
      amenities: JSON.stringify(["Private Terrace", "Smart Home", "Parking", "Security", "Gym", "Swimming Pool", "Concierge"]),
      yearBuilt: 2023,
      status: "available" as const,
      featured: 1,
      ownerId,
      imageFile: "40O7UI0lbxUn.jpg"
    },
    {
      title: "Cozy 1-Bedroom Apartment for Rent",
      description: "Compact and well-designed 1-bedroom apartment in a prime location. Ideal for singles or couples, with easy access to public transport and shopping areas.",
      propertyType: "apartment" as const,
      listingType: "rent" as const,
      price: 12000,
      bedrooms: 1,
      bathrooms: 1,
      area: 65,
      address: "Melville, Johannesburg",
      city: "Johannesburg",
      province: "Gauteng",
      zipCode: "2092",
      amenities: JSON.stringify(["Semi-Furnished", "Parking", "Security", "Power Backup"]),
      yearBuilt: 2020,
      status: "available" as const,
      featured: 0,
      ownerId,
      imageFile: "ZcWGSahwTdDK.jpg"
    },
    {
      title: "Independent Villa with Private Pool",
      description: "Stunning independent villa with contemporary design, private swimming pool, and landscaped gardens. Perfect for luxury living with ample space for entertainment and relaxation.",
      propertyType: "villa" as const,
      listingType: "sale" as const,
      price: 15800000,
      bedrooms: 4,
      bathrooms: 4,
      area: 380,
      address: "Ballito, North Coast",
      city: "Ballito",
      province: "KwaZulu-Natal",
      zipCode: "4420",
      amenities: JSON.stringify(["Private Pool", "Garden", "Parking", "Security", "Staff Quarters", "Home Theater"]),
      yearBuilt: 2022,
      status: "available" as const,
      featured: 1,
      ownerId,
      imageFile: "khdLfaNTTtsd.jpg"
    },
    {
      title: "Residential Plot in Gated Estate",
      description: "Premium residential plot in a well-planned gated estate. Ready for construction with all approvals in place. Excellent investment opportunity in a rapidly developing area.",
      propertyType: "plot" as const,
      listingType: "sale" as const,
      price: 1850000,
      bedrooms: null,
      bathrooms: null,
      area: 800,
      address: "Midrand, Blue Hills",
      city: "Midrand",
      province: "Gauteng",
      zipCode: "1685",
      amenities: JSON.stringify(["Gated Estate", "Security", "Underground Utilities", "Park"]),
      yearBuilt: null,
      status: "available" as const,
      featured: 0,
      ownerId,
      imageFile: "40O7UI0lbxUn.jpg"
    },
    {
      title: "Spacious 3-Bedroom near Business District",
      description: "Well-maintained 3-bedroom apartment available for rent near major business parks. Semi-furnished with modern amenities, perfect for working professionals.",
      propertyType: "apartment" as const,
      listingType: "rent" as const,
      price: 22000,
      bedrooms: 3,
      bathrooms: 2,
      area: 150,
      address: "Menlyn, Pretoria East",
      city: "Pretoria",
      province: "Gauteng",
      zipCode: "0181",
      amenities: JSON.stringify(["Semi-Furnished", "Parking", "Security", "Gym", "Clubhouse"]),
      yearBuilt: 2021,
      status: "available" as const,
      featured: 0,
      ownerId,
      imageFile: "35t5znQJ1v9V.jpg"
    }
  ];

  console.log(`Inserting ${sampleProperties.length} properties...`);

  for (const prop of sampleProperties) {
    const { imageFile, ...propertyData } = prop;
    
    const result = await db.insert(properties).values(propertyData);
    const propertyId = Number(result[0].insertId);

    // Add property image
    await db.insert(propertyImages).values({
      propertyId,
      imageUrl: `/properties/${imageFile}`,
      isPrimary: 1,
      displayOrder: 0,
    });

    console.log(`✓ Added: ${prop.title}`);
  }

  console.log("\n✅ Database seeding completed successfully!");
  console.log(`Total properties added: ${sampleProperties.length}`);
}

seedData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  });

