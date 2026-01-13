import { getDb } from '../server/db-connection';

async function checkDevelopmentPhasesTable() {
  console.log('--- Checking development_phases table ---');
  
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to database');
    process.exit(1);
  }

  try {
    // Check if table exists
    const [tables] = await (db as any).execute(
      `SHOW TABLES LIKE 'development_phases'`
    );
    console.log('Table exists:', tables.length > 0);

    if (tables.length > 0) {
      // Check table structure
      const [columns] = await (db as any).execute(
        `DESCRIBE development_phases`
      );
      console.log('\nTable columns:');
      columns.forEach((col: any) => console.log(`  - ${col.Field}: ${col.Type}`));
    }

    // Check if there are any entries
    const [count] = await (db as any).execute(
      `SELECT COUNT(*) as count FROM development_phases`
    );
    console.log('\nRow count:', count[0]?.count || 0);

  } catch (error: any) {
    console.error('Error:', error.message);
  }

  process.exit(0);
}

checkDevelopmentPhasesTable();
