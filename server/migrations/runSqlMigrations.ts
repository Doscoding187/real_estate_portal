import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { connect } from '@tidbcloud/serverless';

/**
 * Run SQL migrations in order
 * Executes all .sql files in server/migrations/ directory
 */
async function runSqlMigrations() {
  const migrationsDir = join(__dirname);
  const connection = connect({
    url: process.env.DATABASE_URL!,
  });

  try {
    console.log('🔧 Running SQL migrations...');

    // Get all .sql files and sort them
    const sqlFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (sqlFiles.length === 0) {
      console.log('   ℹ️  No SQL migration files found');
      return;
    }

    console.log(`   Found ${sqlFiles.length} migration file(s)`);

    for (const file of sqlFiles) {
      const filePath = join(migrationsDir, file);
      const sql = readFileSync(filePath, 'utf-8');

      console.log(`   ▸ Applying: ${file}`);

      try {
        // Split by semicolon and execute each statement
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
          if (statement) {
            await connection.execute(statement);
          }
        }

        console.log(`   ✅ Applied: ${file}`);
      } catch (error: any) {
        // Ignore "Duplicate column" errors (migration already applied)
        if (error.message?.includes('Duplicate column')) {
          console.log(`   ⏭️  Skipped: ${file} (already applied)`);
        } else {
          console.error(`   ❌ Failed: ${file}`);
          throw error;
        }
      }
    }

    console.log('✅ SQL migrations completed\n');
  } catch (error) {
    console.error('❌ SQL migration failed:', error);
    throw error;
  }
}

runSqlMigrations()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
