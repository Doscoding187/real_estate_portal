import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

/**
 * Verification script for Phase 7 Explore Feed
 * Checks database setup, tables, and sample data
 */

async function verifyExploreFeed() {
  console.log('\n🔍 Phase 7 Explore Feed - System Verification\n');
  console.log('='.repeat(50));

  const db = drizzle(
    mysql.createPool({
      uri: process.env.DATABASE_URL,
    })
  );

  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
  });

  try {
    // 1. Check if tables exist
    console.log('\n📊 Checking Database Tables...\n');

    const tables = [
      'videos',
      'videoLikes',
      'provinces',
      'cities',
      'suburbs',
      'notifications',
      'email_templates',
      'location_search_cache',
      'agent_coverage_areas',
    ];

    for (const table of tables) {
      const [rows]: any = await connection.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = '${table}'
      `);

      if (rows[0].count > 0) {
        const [countRows]: any = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ✅ ${table.padEnd(25)} - ${countRows[0].count} records`);
      } else {
        console.log(`  ❌ ${table.padEnd(25)} - Table not found!`);
      }
    }

    // 2. Check for sample data
    console.log('\n📹 Checking Sample Videos...\n');

    const [videos]: any = await connection.query(`
      SELECT 
        v.id,
        v.type,
        v.caption,
        v.views,
        v.likes,
        a.name as agentName,
        p.title as propertyTitle
      FROM videos v
      JOIN agents a ON v.agentId = a.id
      LEFT JOIN properties p ON v.propertyId = p.id
      ORDER BY v.createdAt DESC
      LIMIT 5
    `);

    if (videos.length > 0) {
      console.log(`  Found ${videos.length} sample videos:\n`);
      videos.forEach((video: any, index: number) => {
        console.log(`  ${index + 1}. ${video.type.toUpperCase()} Video`);
        console.log(`     Caption: ${video.caption?.substring(0, 50)}...`);
        console.log(`     Agent: ${video.agentName}`);
        if (video.propertyTitle) {
          console.log(`     Property: ${video.propertyTitle}`);
        }
        console.log(`     Stats: ${video.views} views, ${video.likes} likes\n`);
      });
    } else {
      console.log('  ⚠️  No sample videos found. Run seed-explore-feed-data.sql\n');
    }

    // 3. Check for provinces and cities
    console.log('🌍 Checking Location Data...\n');

    const [provinces]: any = await connection.query(`SELECT COUNT(*) as count FROM provinces`);
    const [cities]: any = await connection.query(`SELECT COUNT(*) as count FROM cities`);
    const [suburbs]: any = await connection.query(`SELECT COUNT(*) as count FROM suburbs`);

    console.log(`  Provinces: ${provinces[0].count} (Expected: 9)`);
    console.log(`  Cities: ${cities[0].count} (Expected: 6+)`);
    console.log(`  Suburbs: ${suburbs[0].count} (Expected: 6+)\n`);

    // 4. Check for agents (required for video upload)
    console.log('👤 Checking Agent Accounts...\n');

    const [agents]: any = await connection.query(`
      SELECT a.id, a.name, a.email, u.email as userEmail
      FROM agents a
      JOIN users u ON a.userId = u.id
      LIMIT 3
    `);

    if (agents.length > 0) {
      console.log(`  Found ${agents.length} agent(s):\n`);
      agents.forEach((agent: any, index: number) => {
        console.log(`  ${index + 1}. ${agent.name}`);
        console.log(`     Email: ${agent.userEmail}\n`);
      });
    } else {
      console.log('  ⚠️  No agents found. Create an agent account to upload videos.\n');
    }

    // 5. System Status Summary
    console.log('='.repeat(50));
    console.log('\n📋 System Status Summary\n');

    const hasVideos = videos.length > 0;
    const hasLocations = provinces[0].count >= 9 && cities[0].count >= 6;
    const hasAgents = agents.length > 0;

    console.log(`  Videos Table:      ${hasVideos ? '✅ Ready' : '⚠️  No sample data'}`);
    console.log(`  Location Data:     ${hasLocations ? '✅ Ready' : '⚠️  Incomplete'}`);
    console.log(`  Agent Accounts:    ${hasAgents ? '✅ Ready' : '⚠️  None found'}\n`);

    if (hasVideos && hasLocations && hasAgents) {
      console.log('🎉 All systems ready! You can start testing the Explore Feed.\n');
      console.log('Next steps:');
      console.log('  1. Run: pnpm dev');
      console.log('  2. Navigate to: http://localhost:3000/explore');
      console.log('  3. Scroll through videos and test interactions\n');
    } else {
      console.log('⚠️  Setup incomplete. Please review the following:\n');
      if (!hasVideos) {
        console.log('  - Run: migrations/seed-explore-feed-data.sql');
      }
      if (!hasLocations) {
        console.log('  - Run: migrations/create-explore-feed-tables.sql');
        console.log('  - Run: migrations/seed-explore-feed-data.sql');
      }
      if (!hasAgents) {
        console.log('  - Create an agent account or run existing seed scripts');
      }
      console.log('');
    }

    console.log('='.repeat(50));
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    console.log('\nPlease check:');
    console.log('  1. DATABASE_URL is set correctly in .env');
    console.log('  2. MySQL server is running');
    console.log('  3. Database "real_estate_portal" exists\n');
  } finally {
    await connection.end();
  }
}

// Run verification
verifyExploreFeed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
