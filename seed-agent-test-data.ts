import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { 
  users, 
  agencies, 
  agents, 
  properties, 
  propertyImages,
  leads,
  showings,
  commissions,
  leadActivities
} from "./drizzle/schema";
import { authService } from "./server/_core/auth";

// Load environment variables
config();

async function seedAgentTestData() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log("🚀 Starting agent test data seeding...\n");

  try {
    // 1. Create Agency
    console.log("📋 Creating test agency...");
    const agencyResult = await db.insert(agencies).values({
      name: "Prime Properties SA",
      slug: "prime-properties-sa",
      description: "Leading real estate agency in South Africa specializing in luxury properties",
      email: "info@primeproperties.co.za",
      phone: "+27 11 123 4567",
      city: "Johannesburg",
      province: "Gauteng",
      subscriptionPlan: "professional",
      subscriptionStatus: "active",
      isVerified: 1,
    });
    const agencyId = Number(agencyResult[0].insertId);
    console.log(`✅ Agency created: Prime Properties SA (ID: ${agencyId})\n`);

    // 2. Create Agent User
    console.log("👤 Creating test agent user...");
    const passwordHash = await authService.hashPassword("agent123");
    const userResult = await db.insert(users).values({
      email: "agent@test.com",
      passwordHash: passwordHash,
      name: "John Smith",
      firstName: "John",
      lastName: "Smith",
      phone: "+27 82 555 1234",
      role: "agent",
      agencyId: agencyId,
      emailVerified: 1,
      loginMethod: "email",
    });
    const userId = Number(userResult[0].insertId);
    console.log(`✅ User created: agent@test.com (ID: ${userId})`);
    console.log(`   Password: agent123\n`);

    // 3. Create Agent Profile
    console.log("🏢 Creating agent profile...");
    const agentResult = await db.insert(agents).values({
      userId: userId,
      agencyId: agencyId,
      firstName: "John",
      lastName: "Smith",
      displayName: "John Smith",
      bio: "Experienced real estate agent with 5+ years in luxury property sales. Specialist in Sandton and Johannesburg North areas.",
      phone: "+27 82 555 1234",
      email: "agent@test.com",
      specialization: JSON.stringify(["Luxury Homes", "Apartments", "Investment Properties"]),
      role: "agent",
      yearsExperience: 5,
      areasServed: JSON.stringify(["Sandton", "Rosebank", "Johannesburg", "Pretoria"]),
      languages: JSON.stringify(["English", "Afrikaans"]),
      isVerified: 1,
      isFeatured: 1,
    });
    const agentId = Number(agentResult[0].insertId);
    console.log(`✅ Agent profile created (ID: ${agentId})\n`);

    // 4. Create Test Properties
    console.log("🏠 Creating test properties...");
    const testProperties = [
      {
        title: "Luxury Penthouse in Sandton",
        description: "Stunning 3-bedroom penthouse with panoramic city views, private pool, and premium finishes.",
        propertyType: "apartment",
        listingType: "sale",
        transactionType: "sale",
        price: 8500000,
        bedrooms: 3,
        bathrooms: 3,
        area: 250,
        address: "123 West Street, Sandton",
        city: "Sandton",
        province: "Gauteng",
        status: "published",
        views: 245,
        agentId: agentId,
        ownerId: userId,
        mainImage: "https://images.unsplash.com/photo-1567684014761-b65e2e59b9eb?w=800",
      },
      {
        title: "Modern Family Home in Rosebank",
        description: "Beautiful 4-bedroom house with garden, pool, and double garage in secure estate.",
        propertyType: "house",
        listingType: "sale",
        transactionType: "sale",
        price: 5200000,
        bedrooms: 4,
        bathrooms: 2,
        area: 320,
        address: "45 Oxford Road, Rosebank",
        city: "Rosebank",
        province: "Gauteng",
        status: "published",
        views: 189,
        agentId: agentId,
        ownerId: userId,
        mainImage: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800",
      },
      {
        title: "Stylish 2-Bed Apartment - Melrose",
        description: "Contemporary 2-bedroom apartment in prime location, perfect for young professionals.",
        propertyType: "apartment",
        listingType: "rent",
        transactionType: "rent",
        price: 18500,
        bedrooms: 2,
        bathrooms: 2,
        area: 95,
        address: "78 Corlett Drive, Melrose",
        city: "Johannesburg",
        province: "Gauteng",
        status: "published",
        views: 156,
        agentId: agentId,
        ownerId: userId,
        mainImage: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
      },
      {
        title: "New Development - Hyde Park",
        description: "Brand new luxury townhouse in exclusive Hyde Park development.",
        propertyType: "townhouse",
        listingType: "sale",
        transactionType: "sale",
        price: 6800000,
        bedrooms: 3,
        bathrooms: 2,
        area: 180,
        address: "Jan Smuts Avenue, Hyde Park",
        city: "Johannesburg",
        province: "Gauteng",
        status: "draft",
        views: 23,
        agentId: agentId,
        ownerId: userId,
        mainImage: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
      },
      {
        title: "Investment Opportunity - Pretoria East",
        description: "Well-maintained apartment block with 8 units, excellent rental yield.",
        propertyType: "commercial",
        listingType: "sale",
        transactionType: "sale",
        price: 12500000,
        bedrooms: null,
        bathrooms: null,
        area: 650,
        address: "Main Street, Pretoria East",
        city: "Pretoria",
        province: "Gauteng",
        status: "published",
        views: 67,
        agentId: agentId,
        ownerId: userId,
        mainImage: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800",
      },
      {
        title: "Sold - Waterfall Estate Villa",
        description: "Magnificent 5-bedroom villa with private pool - SOLD",
        propertyType: "villa",
        listingType: "sale",
        transactionType: "sale",
        price: 15000000,
        bedrooms: 5,
        bathrooms: 4,
        area: 450,
        address: "Waterfall Estate",
        city: "Midrand",
        province: "Gauteng",
        status: "sold",
        views: 423,
        agentId: agentId,
        ownerId: userId,
        mainImage: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
      },
    ];

    const propertyIds: number[] = [];
    for (const prop of testProperties) {
      const result = await db.insert(properties).values(prop as any);
      const propertyId = Number(result[0].insertId);
      propertyIds.push(propertyId);
      
      // Add property image
      if (prop.mainImage) {
        await db.insert(propertyImages).values({
          propertyId,
          imageUrl: prop.mainImage,
          isPrimary: 1,
          displayOrder: 0,
        });
      }
      
      console.log(`   ✓ ${prop.title} (${prop.status})`);
    }
    console.log(`✅ Created ${testProperties.length} properties\n`);

    // 5. Create Test Leads
    console.log("📞 Creating test leads...");
    const testLeads = [
      {
        propertyId: propertyIds[0],
        agentId: agentId,
        name: "Sarah Johnson",
        email: "sarah.j@email.com",
        phone: "+27 83 444 5555",
        message: "Very interested in the penthouse. Can we schedule a viewing?",
        leadType: "viewing_request",
        status: "new",
        source: "website",
      },
      {
        propertyId: propertyIds[1],
        agentId: agentId,
        name: "Michael Brown",
        email: "m.brown@email.com",
        phone: "+27 82 333 4444",
        message: "Looking for a family home in Rosebank. Is this still available?",
        leadType: "inquiry",
        status: "contacted",
        source: "website",
      },
      {
        propertyId: propertyIds[2],
        agentId: agentId,
        name: "Emma Wilson",
        email: "emma.w@email.com",
        phone: "+27 84 222 3333",
        message: "Interested in renting. When can I move in?",
        leadType: "inquiry",
        status: "qualified",
        source: "website",
      },
      {
        propertyId: propertyIds[0],
        agentId: agentId,
        name: "David Lee",
        email: "david.lee@email.com",
        phone: "+27 81 111 2222",
        message: "Ready to make an offer on the penthouse.",
        leadType: "offer",
        status: "offer_sent",
        source: "agent_profile",
      },
      {
        propertyId: propertyIds[5],
        agentId: agentId,
        name: "Lisa Anderson",
        email: "lisa.a@email.com",
        phone: "+27 82 999 8888",
        message: "Congratulations on the sale!",
        leadType: "inquiry",
        status: "converted",
        source: "website",
      },
    ];

    const leadIds: number[] = [];
    for (const lead of testLeads) {
      const result = await db.insert(leads).values(lead as any);
      const leadId = Number(result[0].insertId);
      leadIds.push(leadId);
      console.log(`   ✓ ${lead.name} - ${lead.status}`);
    }
    console.log(`✅ Created ${testLeads.length} leads\n`);

    // 6. Create Test Showings
    console.log("📅 Creating test showings...");
    const now = new Date();
    const testShowings = [
      {
        propertyId: propertyIds[0],
        leadId: leadIds[0],
        agentId: agentId,
        scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        status: "confirmed",
        notes: "Client prefers afternoon viewing",
      },
      {
        propertyId: propertyIds[1],
        leadId: leadIds[1],
        agentId: agentId,
        scheduledAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        status: "requested",
        notes: "Family viewing on weekend",
      },
      {
        propertyId: propertyIds[2],
        leadId: leadIds[2],
        agentId: agentId,
        scheduledAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: "completed",
        notes: "Client loved the property",
      },
    ];

    for (const showing of testShowings) {
      await db.insert(showings).values(showing as any);
      console.log(`   ✓ ${showing.status} - ${showing.scheduledAt.toLocaleDateString()}`);
    }
    console.log(`✅ Created ${testShowings.length} showings\n`);

    // 7. Create Test Commissions
    console.log("💰 Creating test commissions...");
    const testCommissions = [
      {
        agentId: agentId,
        propertyId: propertyIds[5], // Sold property
        leadId: leadIds[4],
        amount: 45000000, // R450,000 (3% of R15M)
        percentage: 300, // 3%
        status: "approved",
        transactionType: "sale",
        description: "Commission on Waterfall Estate Villa sale",
      },
      {
        agentId: agentId,
        propertyId: propertyIds[0],
        amount: 25500000, // R255,000 (pending)
        percentage: 300,
        status: "pending",
        transactionType: "sale",
        description: "Pending commission on Sandton Penthouse",
      },
    ];

    for (const commission of testCommissions) {
      await db.insert(commissions).values(commission as any);
      console.log(`   ✓ ${commission.transactionType} - R${(commission.amount / 100).toLocaleString()} (${commission.status})`);
    }
    console.log(`✅ Created ${testCommissions.length} commissions\n`);

    // 8. Add some lead activities
    console.log("📝 Creating lead activities...");
    const activities = [
      {
        leadId: leadIds[1],
        agentId: agentId,
        activityType: "call",
        description: "Initial call - discussed property requirements",
      },
      {
        leadId: leadIds[2],
        agentId: agentId,
        activityType: "email",
        description: "Sent property details and rental agreement",
      },
      {
        leadId: leadIds[3],
        agentId: agentId,
        activityType: "offer_sent",
        description: "Client submitted offer of R8.2M",
      },
    ];

    for (const activity of activities) {
      await db.insert(leadActivities).values(activity as any);
      console.log(`   ✓ ${activity.activityType}`);
    }
    console.log(`✅ Created ${activities.length} activities\n`);

    console.log("=" .repeat(60));
    console.log("✅ AGENT TEST DATA SEEDING COMPLETE!");
    console.log("=" .repeat(60));
    console.log("\n📋 LOGIN CREDENTIALS:");
    console.log("   Email:    agent@test.com");
    console.log("   Password: agent123");
    console.log("\n📊 CREATED DATA:");
    console.log(`   • 1 Agency (Prime Properties SA)`);
    console.log(`   • 1 Agent User (John Smith)`);
    console.log(`   • ${testProperties.length} Properties (various statuses)`);
    console.log(`   • ${testLeads.length} Leads (various stages)`);
    console.log(`   • ${testShowings.length} Showings (past & upcoming)`);
    console.log(`   • ${testCommissions.length} Commissions`);
    console.log(`   • ${activities.length} Lead Activities`);
    console.log("\n🚀 You can now login and test the Agent Dashboard!");
    console.log("=" .repeat(60) + "\n");

  } catch (error) {
    console.error("❌ Error seeding data:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedAgentTestData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
