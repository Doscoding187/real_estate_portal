import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function addDeveloperColumns() {
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

    console.log('✅ Connected to database');

    // List of columns to add
    const columns = [
      { name: 'userId', type: 'int NOT NULL' },
      { name: 'status', type: "enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL" },
      { name: 'rejectionReason', type: 'text NULL' },
      { name: 'approvedBy', type: 'int NULL' },
      { name: 'approvedAt', type: 'timestamp NULL' },
      { name: 'rejectedBy', type: 'int NULL' },
      { name: 'rejectedAt', type: 'timestamp NULL' }
    ];

    for (const col of columns) {
      try {
        console.log(`\nAdding column: ${col.name}...`);
        await connection.execute(`ALTER TABLE developers ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✅ Added ${col.name}`);
      } catch (err: any) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️  Column ${col.name} already exists (skipping)`);
        } else {
          console.error(`❌ Error adding ${col.name}:`, err.message);
        }
      }
    }

    // Add indexes
    console.log('\nAdding indexes...');
    try {
      await connection.execute('CREATE INDEX idx_developers_userId ON developers(userId)');
      console.log('✅ Added idx_developers_userId');
    } catch (err: any) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  Index idx_developers_userId already exists');
      } else {
        console.error('❌ Error adding index:', err.message);
      }
    }

    try {
      await connection.execute('CREATE INDEX idx_developers_status ON developers(status)');
      console.log('✅ Added idx_developers_status');
    } catch (err: any) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  Index idx_developers_status already exists');
      } else {
        console.error('❌ Error adding index:', err.message);
      }
    }

    console.log('\n✅ Developer approval workflow migration completed!');

  } catch (error) {
    console.error('❌ Failed:', error);
  } finally {
    if (connection) await connection.end();
  }
}

addDeveloperColumns();
