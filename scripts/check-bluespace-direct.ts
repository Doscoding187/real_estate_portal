import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkBlueSpaceProfile() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL!,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    console.log('✅ Connected to database\n');

    // Get user by email
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      ['bluespacepools@gmail.com']
    );

    const userRows = users as any[];
    
    if (userRows.length === 0) {
      console.log('❌ User not found with email: bluespacepools@gmail.com');
      return;
    }

    const user = userRows[0];
    console.log('✅ User Found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Role:', user.role);

    // Get developer profile
    const [developers] = await connection.execute(
      'SELECT * FROM developers WHERE userId = ?',
      [user.id]
    );

    const devRows = developers as any[];

    if (devRows.length === 0) {
      console.log('\n❌ No developer profile found for this user');
      console.log('   This is why you\'re seeing "Complete Profile Setup"');
      console.log('\n💡 Solution: You need to complete the developer registration wizard at /developer/setup');
      return;
    }

    const developer = devRows[0];
    console.log('\n✅ Developer Profile Found:');
    console.log('  ID:', developer.id);
    console.log('  Name:', developer.name);
    console.log('  Status:', developer.status);
    console.log('  isVerified:', developer.isVerified);
    console.log('  Email:', developer.email);
    console.log('  City:', developer.city);
    console.log('  Province:', developer.province);
    console.log('  Specializations:', developer.specializations);
    console.log('  Created:', developer.createdAt);
    console.log('  Updated:', developer.updatedAt);

    if (developer.status === 'pending') {
      console.log('\n⚠️  Profile is PENDING approval');
      console.log('   You should see "Profile Under Review" message');
      console.log('   Wait for admin approval or contact support');
    } else if (developer.status === 'approved') {
      console.log('\n✅ Profile is APPROVED');
      console.log('   You should see the full dashboard');
      console.log('   If you\'re still seeing "Complete Profile Setup", clear your browser cache');
    } else if (developer.status === 'rejected') {
      console.log('\n❌ Profile is REJECTED');
      console.log('   Reason:', developer.rejectionReason || 'No reason provided');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

checkBlueSpaceProfile();
