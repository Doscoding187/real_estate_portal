import 'dotenv/config';
import { getDb } from '../server/db-connection';
import { developments } from '../drizzle/schema';
import { getTableColumns } from 'drizzle-orm';

/**
 * Schema Sync Validator
 * 
 * Validates that drizzle/schema.ts matches the actual production database.
 * Run this before every deployment to catch schema drift early.
 * 
 * Usage: npx tsx scripts/validate-schema-sync.ts
 */

async function validateSchemaSync() {
  console.log('\n🔍 Validating Schema Sync...\n');
  
  const db = await getDb();
  if (!db) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }

  // Get columns defined in schema.ts
  const schemaColumns = getTableColumns(developments);
  const schemaColumnNames = Object.keys(schemaColumns);

  console.log(`✅ Schema.ts defines ${schemaColumnNames.length} columns`);

  // Get columns in actual database
  const [dbColumns] = await db.execute(`
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'developments'
    ORDER BY ORDINAL_POSITION
  `) as any;

  console.log(`✅ Database has ${dbColumns.length} columns\n`);

  // Check for drift
  let hasDrift = false;
  const missingInDb: string[] = [];
  const missingInSchema: string[] = [];

  // Check schema columns exist in DB
  for (const colName of schemaColumnNames) {
    const dbColName = colName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    const existsInDb = dbColumns.some((col: any) => 
      col.COLUMN_NAME.toLowerCase() === dbColName.toLowerCase()
    );
    
    if (!existsInDb) {
      missingInDb.push(colName);
      hasDrift = true;
    }
  }

  // Check DB columns exist in schema
  const dbColumnNames = dbColumns.map((col: any) => col.COLUMN_NAME);
  for (const dbCol of dbColumnNames) {
    // Convert snake_case to camelCase for comparison
    const camelCase = dbCol.replace(/_([a-z])/g, (g: string) => g[1].toUpperCase());
    const existsInSchema = schemaColumnNames.some(schemaCol => 
      schemaCol.toLowerCase() === camelCase.toLowerCase()
    );
    
    if (!existsInSchema) {
      missingInSchema.push(dbCol);
      // Note: Extra DB columns are OK (legacy), only warn
    }
  }

  // Report findings
  if (missingInDb.length > 0) {
    console.error('❌ Schema Drift Detected!\n');
    console.error('The following columns are defined in schema.ts but MISSING in database:');
    missingInDb.forEach(col => console.error(`   - ${col}`));
    console.error('\n⚠️  You must run a migration to add these columns!\n');
  }

  if (missingInSchema.length > 0) {
    console.warn('\n⚠️  Warning: Extra columns in database (not in schema.ts):');
    missingInSchema.forEach(col => console.warn(`   - ${col}`));
    console.warn('\nThese might be legacy columns. Consider documenting them.\n');
  }

  if (!hasDrift) {
    console.log('✅ Schema and database are in sync!\n');
    process.exit(0);
  } else {
    console.error('❌ Validation FAILED - schema drift detected');
    console.error('Fix: Run migration or update schema.ts\n');
    process.exit(1);
  }
}

validateSchemaSync().catch((error) => {
  console.error('\n❌ Validation error:', error);
  process.exit(1);
});
