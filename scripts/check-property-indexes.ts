import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { safeErrorSummary } from '../server/_core/safeError';

dotenv.config();

async function checkIndexes() {
  let connection;
  
  try {
    console.log('🔍 Checking properties table indexes...\n');
    
    // Create connection
    connection = await mysql.createConnection({
      uri: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });
    
    console.log('✅ Connected to database\n');
    
    // Check indexes
    const [indexes] = await connection.execute(`
      SHOW INDEX FROM properties;
    `);
    
    console.log('📊 Current indexes on properties table:');
    const indexList = (indexes as any[]).map(idx => ({
      Key_name: idx.Key_name,
      Column_name: idx.Column_name,
      Seq_in_index: idx.Seq_in_index,
      Non_unique: idx.Non_unique
    }));
    console.table(indexList);
    
    // Check for specific indexes we need
    const indexNames = (indexes as any[]).map(idx => idx.Key_name);
    const requiredIndexes = [
      'idx_properties_cityId',
      'idx_properties_suburbId',
      'idx_properties_cityId_status',
      'idx_properties_cityId_area'
    ];
    
    console.log('\n✅ Index Status:');
    requiredIndexes.forEach(idx => {
      const exists = indexNames.includes(idx);
      console.log(`  ${exists ? '✓' : '✗'} ${idx}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', safeErrorSummary(error));
    if (connection) await connection.end();
    process.exit(1);
  }
}

checkIndexes();
