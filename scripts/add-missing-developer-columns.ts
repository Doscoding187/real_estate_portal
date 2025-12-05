import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function addMissingColumns() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL!,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    console.log('✅ Connected to database\n');
    console.log('Adding missing columns to developers table...\n');

    // Check if columns exist first
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'listify_property_sa' 
      AND TABLE_NAME = 'developers'
      AND COLUMN_NAME IN ('kpiCache', 'lastKpiCalculation')
    `);

    const existingColumns = (columns as any[]).map(c => c.COLUMN_NAME);
    
    if (existingColumns.includes('kpiCache')) {
      console.log('✓ kpiCache column already exists');
    } else {
      console.log('Adding kpiCache column...');
      await connection.execute(`
        ALTER TABLE developers 
        ADD COLUMN kpiCache JSON NULL COMMENT 'Cached KPI data'
      `);
      console.log('✅ Added kpiCache column');
    }

    if (existingColumns.includes('lastKpiCalculation')) {
      console.log('✓ lastKpiCalculation column already exists');
    } else {
      console.log('Adding lastKpiCalculation column...');
      await connection.execute(`
        ALTER TABLE developers 
        ADD COLUMN lastKpiCalculation TIMESTAMP NULL COMMENT 'Last time KPIs were calculated'
      `);
      console.log('✅ Added lastKpiCalculation column');
    }

    // Add index for performance
    console.log('\nAdding index for lastKpiCalculation...');
    try {
      await connection.execute(`
        CREATE INDEX idx_developers_last_kpi_calculation 
        ON developers(lastKpiCalculation)
      `);
      console.log('✅ Added index');
    } catch (error: any) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('✓ Index already exists');
      } else {
        throw error;
      }
    }

    console.log('\n✅ Migration complete!');
    console.log('\nNow try logging in again - the issue should be fixed.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

addMissingColumns();
