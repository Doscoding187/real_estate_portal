import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function pushSchemaWithFKDisabled() {
  try {
    console.log('Disabling foreign key checks...');
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
    
    console.log('Running drizzle-kit push...');
    const { stdout, stderr } = await execAsync('npx drizzle-kit push --force');
    console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('Re-enabling foreign key checks...');
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
    
    console.log('✅ Schema push completed successfully!');
  } catch (error) {
    console.error('❌ Error during schema push:', error);
    
    // Try to re-enable foreign keys even if push failed
    try {
      await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
    } catch (fkError) {
      console.error('Failed to re-enable foreign keys:', fkError);
    }
    
    process.exit(1);
  }
}

pushSchemaWithFKDisabled();
