import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verifyUser() {
  const email = 'test_dev_final@example.com';
  console.log(`Verifying email for user: ${email}`);

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

    const [result] = await connection.execute(
      'UPDATE users SET emailVerified = 1 WHERE email = ?',
      [email]
    );

    console.log('Update result:', result);
    console.log(`✅ User ${email} verified successfully!`);

  } catch (error) {
    console.error('❌ Failed to verify user:', error);
  } finally {
    if (connection) await connection.end();
  }
}

verifyUser();
