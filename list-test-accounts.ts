import 'dotenv/config';
import * as db from './server/db';
import bcrypt from 'bcryptjs';

async function listTestAccounts() {
  console.log('📋 Test Accounts Information\n');
  
  // The passwords we used when creating the test accounts
  const testAccounts = [
    {
      email: 'user@example.com',
      password: 'password123',
      name: 'Regular User',
      role: 'visitor'
    },
    {
      email: 'developer@example.com',
      password: 'password123',
      name: 'Property Developer',
      role: 'agency_admin'
    },
    {
      email: 'agent@example.com',
      password: 'password123',
      name: 'Real Estate Agent',
      role: 'agent'
    },
    {
      email: 'agency@example.com',
      password: 'password123',
      name: 'Agency Admin',
      role: 'agency_admin'
    },
    {
      email: 'enetechsa@gmail.com',
      password: 'Edmaritinados187#',
      name: 'Super Admin',
      role: 'super_admin'
    }
  ];

  console.log('🔑 Test Account Credentials:\n');
  
  for (const account of testAccounts) {
    console.log(`${account.name}:`);
    console.log(`  Email: ${account.email}`);
    console.log(`  Password: ${account.password}`);
    console.log(`  Role: ${account.role}`);
    console.log('---');
  }
  
  console.log('\n⚠️  Note: These are test accounts for development purposes only.');
  console.log('⚠️  Do not use these credentials in production environments.');
}

listTestAccounts().catch(console.error);