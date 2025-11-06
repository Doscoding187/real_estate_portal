import mysql from 'mysql2/promise';

async function testConnection() {
  try {
    console.log('Testing MySQL connection with app_user...');
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'app_user',
      password: 'AppPassword123',
      database: 'propertifi_sa_database',
      port: 3307,
    });
    
    console.log('✅ Connected successfully!');
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query test passed:', rows);
    
    await connection.end();
    console.log('✅ Connection closed');
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

testConnection();
