
import 'dotenv/config';
import { getDb, getUserByEmail } from '../server/db';
import { sql } from 'drizzle-orm';

async function verify() {
  console.log('--- Verifying DB Connection ---');
  try {
    const db = await getDb();
    console.log('✅ getDb() returned connection object');

    // Test raw connection
    console.log('Testing raw connection...');
    const [result] = await db.execute(sql`SELECT 1 as val`);
    console.log('✅ Connection successful:', result);

    // Test specific user query
    const email = 'admin@test.local';
    console.log(`Testing getUserByEmail('${email}')...`);
    
    try {
        const user = await getUserByEmail(email);
        if (user) {
            console.log('✅ User found:', user.email, 'ID:', user.id, 'Role:', user.role);
            console.log('Password hash present:', !!user.passwordHash);
        } else {
            console.error('❌ User NOT found:', email);
        }
    } catch (queryError: any) {
        console.error('❌ Query failed:', queryError.message);
        console.error('Stack:', queryError.stack);
    }

  } catch (error: any) {
    console.error('❌ Critical DB Error:', error.message);
    console.error(error);
  }
  process.exit(0);
}

verify();
