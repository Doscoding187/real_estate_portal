import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  const connection = await createConnection({
    host: 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '292qWmvn2YGy2jW.root',
    password: 'TOdjCJY1bepCcJg1',
    database: 'listify_property_sa',
    ssl: { rejectUnauthorized: false }
  });

  console.log('✅ Connected to TiDB');

  const migrations = [
    '1_agent_memory.sql',
    '2_agent_tasks.sql',
    '3_agent_knowledge.sql'
  ];

  for (const migration of migrations) {
    const filePath = join(__dirname, 'drizzle', 'migrations', migration);
    const sql = readFileSync(filePath, 'utf-8');
    
    console.log(`\n📝 Running ${migration}...`);
    await connection.query(sql);
    console.log(`✅ ${migration} completed`);
  }

  // Verify
  console.log('\n🔍 Verifying tables...');
  const [rows] = await connection.query("SHOW TABLES LIKE 'agent_%'");
  console.log('✅ Tables created:', rows);

  await connection.end();
  console.log('\n✅ All migrations completed successfully!');
}

runMigrations().catch(console.error);
