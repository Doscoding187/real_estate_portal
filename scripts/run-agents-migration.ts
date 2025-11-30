import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('🔧 Starting agents table migration...\n');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ Failed to connect to database');
    process.exit(1);
  }

  console.log('✅ Connected to database\n');

  try {
    // Define SQL statements inline
    const statements = [
      `ALTER TABLE agents ADD COLUMN status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending' NOT NULL AFTER isFeatured`,
      `ALTER TABLE agents ADD COLUMN rejectionReason TEXT AFTER status`,
      `ALTER TABLE agents ADD COLUMN approvedBy INT AFTER rejectionReason`,
      `ALTER TABLE agents ADD COLUMN approvedAt TIMESTAMP NULL AFTER approvedBy`,
      `ALTER TABLE agents ADD CONSTRAINT fk_agents_approvedBy FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL`,
    ];

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        await db.execute(sql.raw(statement));
        console.log(`✅ Statement ${i + 1} completed successfully\n`);
      } catch (error: any) {
        // Check if error is because column already exists
        if (error.message?.includes('Duplicate column name') || error.message?.includes('duplicate key')) {
          console.log(`⚠️  Column/constraint already exists, skipping...\n`);
        } else {
          console.error(`Error: ${error.message}`);
          throw error;
        }
      }
    }

    console.log('✅ Migration completed successfully!\n');
    
    // Verify the changes
    console.log('🔍 Verifying agents table schema...\n');
    const [columns] = await db.execute(sql`SHOW COLUMNS FROM agents`);
    
    const requiredColumns = ['userId', 'status', 'rejectionReason', 'approvedBy', 'approvedAt'];
    const existingColumns = (columns as any[]).map((col: any) => col.Field);
    
    console.log('Required columns:');
    requiredColumns.forEach(col => {
      const exists = existingColumns.includes(col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}`);
    });
    
    console.log('\n✨ Migration verification complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigration();
