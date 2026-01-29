import dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

// Load .env.production explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });

async function seedProdSuperAdmin() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL missing from .env.production');
    process.exit(1);
  }

  // Safety check: Ensure we are NOT on localhost roughly (though TiDB is remote)
  if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
    console.warn('⚠️  Warning: DATABASE_URL looks like localhost. Verifying intent...');
    // Proceeding anyway as user might tunnel, but good to log.
  }

  console.log('🌱 Seeding PRODUCTION database user...');
  console.log('Target DB Host:', new URL(dbUrl).hostname);

  // Connection parsing for TiDB/MySQL
  // Drizzle/MySQL2 usually handles connection string, but let's parse carefuly if needed.
  // mysql2/promise createConnection accepts connection string directly usually.

  let connection;
  try {
    connection = await mysql.createConnection(dbUrl);
  } catch (err) {
    console.error('Failed to connect using connection string. Trying manual parsing.');
    const url = new URL(dbUrl);
    connection = await mysql.createConnection({
      host: url.hostname,
      port: parseInt(url.port) || 4000,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // remove leading /
      ssl: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
      },
    });
  }

  const superAdminPasswordHash = await bcrypt.hash('Edmaritinados187#', 10);

  try {
    // 1. Super Admin
    console.log('Upserting Super Admin (enetechsa@gmail.com)...');

    // We use ON DUPLICATE KEY UPDATE to ensure we don't duplicate if exists, but update password/role.
    await connection.execute(
      `
      INSERT INTO users (email, passwordHash, name, firstName, lastName, role, emailVerified, isSubaccount, lastSignedIn, createdAt)
      VALUES (?, ?, ?, ?, ?, 'super_admin', 1, 0, NOW(), NOW())
      ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash), role = 'super_admin', emailVerified = 1
    `,
      ['enetechsa@gmail.com', superAdminPasswordHash, 'Super Admin', 'Super', 'Admin'],
    );

    console.log('✅ Production Super Admin (enetechsa@gmail.com) synced successfully!');
  } catch (error) {
    console.error('❌ Error Seeding Prod DB:', error);
  } finally {
    if (connection) await connection.end();
  }
}

seedProdSuperAdmin();
