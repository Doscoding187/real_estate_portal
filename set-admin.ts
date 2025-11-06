/**
 * Script to set a user as admin
 * Usage: tsx set-admin.ts <email> [role]
 * Roles: super_admin, agency_admin, agent, visitor
 * Default role: super_admin
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { users } from "./drizzle/schema";

async function setAdmin(email: string) {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  try {
    // Find user by email
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userList.length === 0) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    const user = userList[0];

    // Update user role to admin
    const newRole = process.argv[3] || "super_admin"; // Default to super_admin
    const validRoles = ["visitor", "agent", "agency_admin", "super_admin"];
    
    if (!validRoles.includes(newRole)) {
      console.error(`❌ Invalid role "${newRole}". Valid roles: ${validRoles.join(", ")}`);
      process.exit(1);
    }

    await db
      .update(users)
      .set({ role: newRole as any })
      .where(eq(users.id, user.id));

    console.log(`✅ Successfully set user "${email}" (ID: ${user.id}) role to ${newRole}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${newRole}`);
  } catch (error) {
    console.error("❌ Error setting admin:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Get email and optional role from command line arguments
const email = process.argv[2];
const role = process.argv[3];

if (!email) {
  console.error("Usage: tsx set-admin.ts <email> [role]");
  console.error("Roles: super_admin (default), agency_admin, agent, visitor");
  console.error("Example: tsx set-admin.ts admin@example.com super_admin");
  process.exit(1);
}

setAdmin(email);
