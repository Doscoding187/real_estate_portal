/**
 * Test Local Login
 * Run with: pnpm tsx test-login-local.ts
 */

import axios from 'axios';

async function testLogin() {
  console.log('🔍 Testing local login...\n');
  
  try {
    const response = await axios.post('http://localhost:5000/trpc/auth.login', {
      email: 'enetechsa@gmail.com',
      password: 'Edmaritinados187#'
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