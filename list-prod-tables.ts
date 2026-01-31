import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL required');
  process.exit(1);
}

async function listTables() {
  const dbUrl = new URL(DATABASE_URL!);
  const connection = await mysql.createConnection({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 3306,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1),
    ssl: { rejectUnauthorized: true },
  });

  const [tables] = await connection.execute('SHOW TABLES');
  console.log('📋 Tables in production database:\n');
  (tables as any[]).forEach((row, i) => {
    const tableName = Object.values(row)[0];
    console.log(`${i + 1}. ${tableName}`);
  });

  await connection.end();
}

listTables().catch(console.error);
