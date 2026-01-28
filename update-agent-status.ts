import { config } from 'dotenv';
import mysql from 'mysql2/promise';

// Load environment variables
config();

async function updateAgentStatus() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Parse DATABASE_URL  and configure SSL properly for TiDB Cloud
  const dbUrl = new URL(process.env.DATABASE_URL.replace('mysql://', 'http://'));
  const connection = await mysql.createConnection({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 4000,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.substring(1),
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
  });

  console.log('🔧 Updating agent status...\n');

  try {
    // Update agent status to approved
    const [result] = await connection.execute('UPDATE agents SET status = ? WHERE email = ?', [
      'approved',
      'agent@test.com',
    ]);

    console.log(`✅ Updated ${(result as any).affectedRows} agent profile(s)\n`);

    // Verify the update
    const [rows] = await connection.execute(
      'SELECT id, email, displayName, status, isVerified FROM agents WHERE email = ?',
      ['agent@test.com'],
    );

    console.log('📋 Agent Profile:');
    console.log(rows[0]);
    console.log('\n✅ Agent status is now approved - login should work!\n');
  } catch (error) {
    console.error('❌ Error updating agent status:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

updateAgentStatus()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
