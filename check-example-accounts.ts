import 'dotenv/config';
import * as db from './server/db';

async function checkExampleAccounts() {
  console.log('Checking @example.com accounts...\n');
  
  const emails = [
    'user@example.com',
    'developer@example.com', 
    'agent@example.com',
    'agency@example.com'
  ];
  
  for (const email of emails) {
    const user = await db.getUserByEmail(email);
    if (user) {
      console.log(`${email}:`);
      console.log(`  Has password: ${user.passwordHash ? '✅ YES' : '❌ NO'}`);
      console.log(`  Login method: ${user.loginMethod || 'not set'}`);
      console.log(`  Role: ${user.role}\n`);
    } else {
      console.log(`${email}: Not found\n`);
    }
  }
}

checkExampleAccounts().catch(console.error);
