import { getDb } from '../server/db';

async function checkBlueSpaceProfile() {
  try {
    const dbInstance = await getDb();
    if (!dbInstance) {
      console.error('Database not available');
      return;
    }

    // Get user by email
    const [user] = await dbInstance
      .select()
      .from(require('../drizzle/schema').users)
      .where(require('drizzle-orm').eq(require('../drizzle/schema').users.email, 'bluespacepools@gmail.com'))
      .limit(1);

    if (!user) {
      console.log('❌ User not found with email: bluespacepools@gmail.com');
      return;
    }

    console.log('\n✅ User Found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Role:', user.role);

    // Get developer profile
    const [developer] = await dbInstance
      .select()
      .from(require('../drizzle/schema').developers)
      .where(require('drizzle-orm').eq(require('../drizzle/schema').developers.userId, user.id))
      .limit(1);

    if (!developer) {
      console.log('\n❌ No developer profile found for this user');
      console.log('   This is why you\'re seeing "Complete Profile Setup"');
      return;
    }

    console.log('\n✅ Developer Profile Found:');
    console.log('  ID:', developer.id);
    console.log('  Name:', developer.name);
    console.log('  Status:', developer.status);
    console.log('  isVerified:', developer.isVerified);
    console.log('  Email:', developer.email);
    console.log('  City:', developer.city);
    console.log('  Province:', developer.province);
    console.log('  Created:', developer.createdAt);
    console.log('  Updated:', developer.updatedAt);

    if (developer.status === 'pending') {
      console.log('\n⚠️  Profile is PENDING approval');
      console.log('   You should see "Profile Under Review" message');
    } else if (developer.status === 'approved') {
      console.log('\n✅ Profile is APPROVED');
      console.log('   You should see the full dashboard');
    } else if (developer.status === 'rejected') {
      console.log('\n❌ Profile is REJECTED');
      console.log('   Reason:', developer.rejectionReason || 'No reason provided');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkBlueSpaceProfile();
