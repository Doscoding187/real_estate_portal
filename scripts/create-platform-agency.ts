/**
 * Create Platform Agency: Property Listify Team
 * 
 * This creates a platform-owned agency that can be used
 * to seed real property listings for the platform.
 * 
 * Run: npx tsx scripts/create-platform-agency.ts
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

async function createPlatformAgency() {
  console.log('🏢 Creating Platform Agency: Property Listify Team\n');

  const dbUrl = process.env.DATABASE_URL!;
  const url = new URL(dbUrl);
  
  const config = {
    host: url.hostname,
    port: parseInt(url.port || '3306'),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: url.searchParams.get('ssl') === 'true' ? { rejectUnauthorized: true } : undefined,
  };

  const connection = await mysql.createConnection(config);

  try {
    // Check if agency already exists
    const [existing] = await connection.query<any[]>(`
      SELECT id, name FROM agencies WHERE name LIKE '%Property Listify%' LIMIT 1
    `);

    if (existing.length > 0) {
      console.log(`✅ Agency already exists: ${existing[0].name} (ID: ${existing[0].id})`);
      return existing[0];
    }

    // Create the agency
    console.log('📌 Creating new agency...\n');
    
    const [result] = await connection.query<any>(`
      INSERT INTO agencies (
        name, 
        slug, 
        email, 
        phone,
        description,
        logo,
        subscriptionPlan,
        subscriptionStatus,
        isVerified,
        createdAt,
        updatedAt
      ) VALUES (
        'Property Listify Team',
        'property-listify-team',
        'team@propertylistify.co.za',
        '0800 123 456',
        'Official Property Listify platform team. We showcase quality properties across South Africa.',
        NULL,
        'enterprise',
        'active',
        1,
        NOW(),
        NOW()
      )
    `);

    const agencyId = result.insertId;
    console.log(`✅ Agency created with ID: ${agencyId}`);

    // Now create a platform agent under this agency
    console.log('\n📌 Creating platform agent...\n');

    // First check if we have a super_admin user to link
    const [admins] = await connection.query<any[]>(`
      SELECT id, email, name FROM users WHERE role = 'super_admin' LIMIT 1
    `);

    if (admins.length > 0) {
      const adminUser = admins[0];
      console.log(`Found super_admin: ${adminUser.email}`);

      // Check if agent already exists for this user
      const [existingAgent] = await connection.query<any[]>(`
        SELECT id FROM agents WHERE user_id = ? LIMIT 1
      `, [adminUser.id]);

      if (existingAgent.length === 0) {
        // Create agent profile
        await connection.query(`
          INSERT INTO agents (
            user_id,
            agency_id,
            name,
            email,
            phone,
            bio,
            profile_image,
            is_approved,
            approval_status,
            created_at,
            updated_at
          ) VALUES (
            ?,
            ?,
            'Property Listify Team',
            'team@propertylistify.co.za',
            '0800 123 456',
            'Official Property Listify platform team member. Showcasing quality properties across South Africa.',
            NULL,
            1,
            'approved',
            NOW(),
            NOW()
          )
        `, [adminUser.id, agencyId]);

        console.log(`✅ Agent profile created for user: ${adminUser.email}`);
      } else {
        // Update existing agent to link to this agency
        await connection.query(`
          UPDATE agents SET agency_id = ? WHERE user_id = ?
        `, [agencyId, adminUser.id]);
        console.log(`✅ Linked existing agent to new agency`);
      }
    } else {
      console.log('⚠️ No super_admin user found. You can manually link an agent later.');
    }

    // Summary
    console.log('\n✅ Platform Agency Setup Complete!\n');
    console.log('Agency: Property Listify Team');
    console.log(`ID: ${agencyId}`);
    console.log('Status: Active');
    console.log('Tier: Enterprise');
    console.log('\nYou can now create listings under this agency!');

    return { id: agencyId, name: 'Property Listify Team' };

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

createPlatformAgency()
  .then((agency) => {
    console.log('\n🎉 Done! Agency ID:', agency.id);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
