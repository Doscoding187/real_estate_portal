import { authService } from './server/_core/auth';

async function testLogin() {
  console.log('Testing login endpoint...');
  
  try {
    // Test the auth service directly
    console.log('Testing auth service...');
    
    // First, let's register a test user
    console.log('Registering test user...');
    const { user: regUser, sessionToken: regToken } = await authService.register(
      'test@example.com',
      'password123',
      'Test User'
    );
    
    console.log('✅ Registration successful:', regUser.email);
    
    // Now try to login
    console.log('Logging in...');
    const { user, sessionToken } = await authService.login('test@example.com', 'password123');
    
    console.log('✅ Login successful!');
    console.log('User:', user.email, 'Role:', user.role);
    console.log('Session token created:', sessionToken ? 'Yes' : 'No');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testLogin();