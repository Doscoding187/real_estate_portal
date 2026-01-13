import 'dotenv/config';
import { getDb } from '../server/db-connection';

async function checkUnitTypesColumns() {
  console.log('\n--- Checking unit_types columns ---');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ Database connection failed');
    return;
  }

  const [result] = await db.execute(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'unit_types'
    ORDER BY ORDINAL_POSITION
  `) as any;

  console.log('\nColumns in database:', result.map((r: any) => r.COLUMN_NAME));
  
  const schemaColumns = [
    'id', 'development_id', 'name', 'bedrooms', 'bathrooms', 'parking',
    'unit_size', 'yard_size', 'base_price_from', 'base_price_to',
    'total_units', 'available_units', 'reserved_units',
    'transfer_costs_included', 'monthly_levy',
    'monthly_levy_from', 'monthly_levy_to', // MISSING?
    'rates_and_taxes_from', 'rates_and_taxes_to', // MISSING?
    'extras', // MISSING?
    'base_features', 'base_finishes', 'base_media',
    'display_order', 'is_active', 'created_at', 'updated_at'
  ];
  
  const dbColumns = result.map((r: any) => r.COLUMN_NAME);
  const missing = schemaColumns.filter(col => !dbColumns.includes(col));
  
  if (missing.length > 0) {
    console.log('\n⚠️  Missing columns in database:', missing);
  } else {
    console.log('\n✅ All schema columns exist in database');
  }

  process.exit(0);
}

checkUnitTypesColumns().catch(console.error);
