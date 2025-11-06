/**
 * Generate bcrypt hash for super admin password
 * Usage: tsx generate-hash.ts "YourPassword123"
 */

import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error("❌ Please provide a password");
  console.error("Usage: tsx generate-hash.ts \"YourPassword123\"");
  process.exit(1);
}

async function generateHash() {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  
  console.log("\n✅ Bcrypt hash generated successfully!\n");
  console.log("Password:", password);
  console.log("\nHash to use in SQL:");
  console.log(hash);
  console.log("\nCopy this hash and paste it into seed-super-admin.sql");
  console.log("Replace: $2a$10$YourBcryptHashHere");
  console.log("With:    " + hash);
}

generateHash();
