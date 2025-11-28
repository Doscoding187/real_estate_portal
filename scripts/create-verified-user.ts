import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

async function setupUsers() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not defined');
    process.exit(1);
  }

  let connection;
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    const sslParam = dbUrl.searchParams.get('ssl');
    dbUrl.searchParams.delete('ssl');
    
    connection = await createConnection({
        uri: dbUrl.toString(),
        ssl: sslParam === 'true' || sslParam === '{"rejectUnauthorized":true}' 
          ? { rejectUnauthorized: true } 
          : { rejectUnauthorized: false }
    });

    // 1. Verify bluespacepools@gmail.com
    console.log('Verifying bluespacepools@gmail.com...');
    await connection.execute(
      "UPDATE users SET emailVerified = 1 WHERE email = 'bluespacepools@gmail.com'"
    );
    console.log('✅ Verified bluespacepools@gmail.com');

    // 2. Create test user
    const testEmail = 'test_verified_dev@example.com';
    const testPassword = 'Password123!';
    const hashedPassword = await bcrypt.hash(testPassword, 10);

    console.log(`Creating/Updating test user ${testEmail}...`);
    
    // Check if exists
    const [existing]: any = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [testEmail]
    );

    if (existing.length > 0) {
      console.log('Test user exists, updating password and verification...');
      await connection.execute(
        'UPDATE users SET passwordHash = ?, emailVerified = 1, role = "property_developer" WHERE email = ?',
        [hashedPassword, testEmail]
      );
    } else {
      console.log('Creating new test user...');
      await connection.execute(
        'INSERT INTO users (name, email, passwordHash, role, emailVerified, isSubaccount) VALUES (?, ?, ?, ?, 1, 0)',
        ['Test Verified Dev', testEmail, hashedPassword, 'property_developer']
      );
    }
    console.log('✅ Test user ready.');

  } catch (error) {
    console.error('❌ Failed to setup users:', error);
  } finally {
    if (connection) await connection.end();
  }
}

setupUsers();
