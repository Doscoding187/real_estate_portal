/**
 * Test Login
 * Run with: pnpm tsx test-login.ts
 */

import axios from 'axios';

async function testLogin() {
  console.log('🔍 Testing login...\n');
  
  try {
    const response = await axios.post('http://localhost:8080/trpc/auth.login', {
      email: 'user@example.com', // Using our new test user
      password: 'password123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error: any) {
    console.error('❌ Login failed:', error.response?.data || error.message);
  }
}

testLogin().catch(console.error);