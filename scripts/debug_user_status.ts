
import * as dotenv from 'dotenv';
dotenv.config();
import { getDb } from '../server/db';
import { users, developers } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function checkUser() {
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to DB');
    return;
  }

  const email = 'developer@test.local';
  console.log(`Checking status for ${email}...`);

  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) {
    console.log('User not found!');
  } else {
    console.log('User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      passwordHash: user.passwordHash ? 'present' : 'missing',
    });

    if (!user.passwordHash) {
        console.log('Password hash missing. Setting password to "password123"...');
        const hash = await bcrypt.hash('password123', 10);
        await db.update(users).set({ passwordHash: hash }).where(eq(users.id, user.id));
        console.log('Password set.');
    }

    if (user.role === 'property_developer') {
      const [devProfile] = await db.select().from(developers).where(eq(developers.userId, user.id));
      if (devProfile) {
        console.log('Developer profile found:', {
          id: devProfile.id,
          status: devProfile.status,
          name: devProfile.name
        });
        
        if (devProfile.status !== 'approved') {
             console.log('Approving developer profile...');
             await db.update(developers).set({ status: 'approved' }).where(eq(developers.id, devProfile.id));
             console.log('Developer approved.');
        } else {
            console.log('Developer already approved.');
        }
      } else {
        console.log('No developer profile found for this user.');
      }
    }
  }
}

checkUser().catch(console.error).finally(() => process.exit());
