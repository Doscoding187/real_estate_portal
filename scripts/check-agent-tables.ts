#!/usr/bin/env tsx
import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  try {
    console.log('\n📊 Agent Tables Structure:\n');

    const [memCols] = await connection.query('SHOW COLUMNS FROM agent_memory');
    console.log('agent_memory columns:');
    console.log(memCols);
    console.log('');

    const [taskCols] = await connection.query('SHOW COLUMNS FROM agent_tasks');
    console.log('agent_tasks columns:');
    console.log(taskCols);
    console.log('');

    const [migrations] = await connection.query(
      'SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 5',
    );
    console.log('Recent migrations:');
    console.log(migrations);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
