import { execSync } from 'child_process';
import { existsSync } from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

console.log('🔍 QUICK DATABASE CHECK');
console.log('========================');

// Check if DATABASE_URL is configured
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not configured');
  process.exit(1);
}

console.log('✅ DATABASE_URL found');
console.log(`📊 Database: ${process.env.DATABASE_URL.split('/')[3]?.split('?')[0] || 'unknown'}`);

// Test basic connectivity using mysql command
try {
  console.log('\n🔗 Testing database connection...');
  const dbUrl = new URL(process.env.DATABASE_URL);

  const testCmd = [
    'mysql',
    `-h${dbUrl.hostname}`,
    `-P${dbUrl.port || 3306}`,
    `-u${dbUrl.username}`,
    `-p${dbUrl.password}`,
    `-e "SELECT 1 as test;"`,
    dbUrl.pathname.slice(1),
  ].join(' ');

  const result = execSync(testCmd, { encoding: 'utf8' });
  console.log('✅ Database connection successful');
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  process.exit(1);
}

// Check if mysqldump is available
try {
  execSync('mysqldump --version', { stdio: 'pipe' });
  console.log('✅ mysqldump is available');
} catch (error) {
  console.error('❌ mysqldump is not available');
  process.exit(1);
}

// Check backup directory
if (!existsSync('./backups')) {
  execSync('mkdir backups', { stdio: 'pipe' });
  console.log('✅ Created backups directory');
} else {
  console.log('✅ Backups directory exists');
}

console.log('\n🎯 READY FOR CLEANUP');
console.log('==================');
console.log('To proceed with DRY RUN:');
console.log('  node --import tsx/esm cleanup-production-data.ts');
console.log('\nTo EXECUTE actual cleanup:');
console.log('  node --import tsx/esm cleanup-production-data.ts --execute');
console.log('\nTo VERIFY after cleanup:');
console.log('  node --import tsx/esm verify-cleanup.ts');
