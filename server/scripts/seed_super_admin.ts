import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import { sql } from 'drizzle-orm';
import { getDb } from '../db';
import bcrypt from 'bcryptjs';

const EMAIL = 'super@admin.local';
const PASSWORD = 'Admin123!'; // change if you want
const NAME = 'Super Admin';

async function main() {
  const db = await getDb();
  if (!db) throw new Error('DB not available');

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // 1) Check if user exists
  const existing: any = await db.execute(sql`SELECT id FROM users WHERE email = ${EMAIL} LIMIT 1`);

  const rows = existing?.rows ?? existing?.[0] ?? [];
  const id = Array.isArray(rows) && rows[0]?.id ? Number(rows[0].id) : null;

  if (id) {
    // 2a) Update existing user
    await db.execute(sql`
      UPDATE users
      SET
        name = ${NAME},
        passwordHash = ${passwordHash},
        role = 'super_admin',
        emailVerified = 1
      WHERE id = ${id}
    `);

    console.log('✅ Super admin updated:', { email: EMAIL, password: PASSWORD });
    return;
  }

  // 2b) Insert new user (only fields we need; others have defaults)
  await db.execute(sql`
    INSERT INTO users (email, name, passwordHash, role, emailVerified)
    VALUES (${EMAIL}, ${NAME}, ${passwordHash}, 'super_admin', 1)
  `);

  console.log('✅ Super admin created:', { email: EMAIL, password: PASSWORD });
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Seed failed:', err?.message ?? err);
    process.exit(1);
  });
