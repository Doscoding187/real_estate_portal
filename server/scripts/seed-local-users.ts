import dotenv from 'dotenv';
import path from 'path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

// Load .env.local explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function seedLocalUsers() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.includes('localhost')) {
    console.error('❌ SAFETY CHECK FAILED: DATABASE_URL is not localhost.');
    process.exit(1);
  }

  console.log('🌱 Seeding local database users...');

  const url = new URL(dbUrl);
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: 'listify_local_dev',
  });

  const passwordHash = await bcrypt.hash('password123', 10);
  const superAdminPasswordHash = await bcrypt.hash('Edmaritinados187#', 10);

  try {
    // 1. Super Admin
    console.log('Creating Super Admin (enetechda@gmail.com)...');
    await connection.execute(
      `
      INSERT INTO users (email, passwordHash, name, firstName, lastName, role, emailVerified, isSubaccount, lastSignedIn, createdAt)
      VALUES (?, ?, ?, ?, ?, 'super_admin', 1, 0, NOW(), NOW())
      ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash), role = 'super_admin'
    `,
      ['enetechda@gmail.com', superAdminPasswordHash, 'Super Admin', 'Super', 'Admin'],
    );

    // 2. Agency & Agency Admin
    console.log('Creating Test Agency and Admin...');
    const [agencyResult] = await connection.execute(
      'INSERT INTO agencies (name, slug, isVerified, createdAt) VALUES (?, ?, 1, NOW())',
      ['Test Agency', 'test-agency'],
    );
    const agencyId = (agencyResult as any).insertId;

    await connection.execute(
      `
      INSERT INTO users (email, passwordHash, name, firstName, lastName, role, agencyId, emailVerified, isSubaccount, lastSignedIn, createdAt)
      VALUES (?, ?, ?, ?, ?, 'agency_admin', ?, 1, 0, NOW(), NOW())
      ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash), agencyId = VALUES(agencyId)
    `,
      ['agency@test.local', passwordHash, 'Agency Admin', 'Agency', 'Admin', agencyId],
    );

    // 3. Agent
    console.log('Creating Agent...');
    // Create User first
    await connection.execute(
      `
      INSERT INTO users (email, passwordHash, name, firstName, lastName, role, agencyId, emailVerified, isSubaccount, lastSignedIn, createdAt)
      VALUES (?, ?, ?, ?, ?, 'agent', ?, 1, 0, NOW(), NOW())
      ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash), agencyId = VALUES(agencyId)
    `,
      ['agent@test.local', passwordHash, 'Test Agent', 'Test', 'Agent', agencyId],
    );

    // Get User ID
    const [agentUserRows] = await connection.execute('SELECT id FROM users WHERE email = ?', [
      'agent@test.local',
    ]);
    const agentUserId = (agentUserRows as any)[0].id;

    // Create Agent Profile
    await connection.execute(
      `
      INSERT INTO agents (userId, agencyId, firstName, lastName, displayName, role, isVerified, isFeatured, status, createdAt)
      VALUES (?, ?, ?, ?, ?, 'agent', 1, 0, 'approved', NOW())
    `,
      [agentUserId, agencyId, 'Test', 'Agent', 'Test Agent'],
    );

    // 4. Developer
    console.log('Creating Developer...');
    await connection.execute(
      `
      INSERT INTO users (email, passwordHash, name, firstName, lastName, role, emailVerified, isSubaccount, lastSignedIn, createdAt)
      VALUES (?, ?, ?, ?, ?, 'property_developer', 1, 0, NOW(), NOW())
      ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash), role = 'property_developer'
    `,
      ['developer@test.local', passwordHash, 'Test Developer', 'Test', 'Developer'],
    );

    const [devUserRows] = await connection.execute('SELECT id FROM users WHERE email = ?', [
      'developer@test.local',
    ]);
    const devUserId = (devUserRows as any)[0].id;

    // Create Developer Profile
    await connection.execute(
      `
      INSERT INTO developers (userId, name, slug, status, isVerified, createdAt)
      VALUES (?, ?, ?, 'approved', 1, NOW())
    `,
      [devUserId, 'Test Developments Ltd', 'test-developments-ltd'],
    );

    // 5. Standard User
    console.log('Creating Standard User...');
    await connection.execute(
      `
      INSERT INTO users (email, passwordHash, name, firstName, lastName, role, emailVerified, isSubaccount, lastSignedIn, createdAt)
      VALUES (?, ?, ?, ?, ?, 'visitor', 1, 0, NOW(), NOW())
      ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash)
    `,
      ['user@test.local', passwordHash, 'Standard User', 'Standard', 'User'],
    );

    console.log('✅ Seed completed successfully!');
    console.log('Default Password: password123');
  } catch (error) {
    console.error('❌ Error Seeding DB:', error);
  } finally {
    await connection.end();
  }
}

seedLocalUsers();
