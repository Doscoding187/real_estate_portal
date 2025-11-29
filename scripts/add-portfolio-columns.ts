import 'dotenv/config';
import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function addPortfolioColumns() {
  const db = await getDb();
  
  try {
    console.log('Adding portfolio metric columns to developers table...');
    
    // Check if columns already exist
    const checkColumns = await db.execute(sql`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'developers' 
      AND COLUMN_NAME IN ('completedProjects', 'currentProjects', 'upcomingProjects', 'specializations', 'kpiCache', 'lastKpiCalculation')
    `);
    
    const existingColumns = (checkColumns as any[]).map((row: any) => row.COLUMN_NAME);
    console.log('Existing columns:', existingColumns);
    
    // Add completedProjects if it doesn't exist
    if (!existingColumns.includes('completedProjects')) {
      console.log('Adding completedProjects column...');
      await db.execute(sql`
        ALTER TABLE developers 
        ADD COLUMN completedProjects INT DEFAULT 0
      `);
      console.log('✅ completedProjects column added');
    } else {
      console.log('⏭️  completedProjects column already exists');
    }
    
    // Add currentProjects if it doesn't exist
    if (!existingColumns.includes('currentProjects')) {
      console.log('Adding currentProjects column...');
      await db.execute(sql`
        ALTER TABLE developers 
        ADD COLUMN currentProjects INT DEFAULT 0
      `);
      console.log('✅ currentProjects column added');
    } else {
      console.log('⏭️  currentProjects column already exists');
    }
    
    // Add upcomingProjects if it doesn't exist
    if (!existingColumns.includes('upcomingProjects')) {
      console.log('Adding upcomingProjects column...');
      await db.execute(sql`
        ALTER TABLE developers 
        ADD COLUMN upcomingProjects INT DEFAULT 0
      `);
      console.log('✅ upcomingProjects column added');
    } else {
      console.log('⏭️  upcomingProjects column already exists');
    }
    
    // Add specializations if it doesn't exist
    if (!existingColumns.includes('specializations')) {
      console.log('Adding specializations column...');
      await db.execute(sql`
        ALTER TABLE developers 
        ADD COLUMN specializations TEXT
      `);
      console.log('✅ specializations column added');
    } else {
      console.log('⏭️  specializations column already exists');
    }
    
    // Add kpiCache if it doesn't exist
    if (!existingColumns.includes('kpiCache')) {
      console.log('Adding kpiCache column...');
      await db.execute(sql`
        ALTER TABLE developers 
        ADD COLUMN kpiCache JSON
      `);
      console.log('✅ kpiCache column added');
    } else {
      console.log('⏭️  kpiCache column already exists');
    }
    
    // Add lastKpiCalculation if it doesn't exist
    if (!existingColumns.includes('lastKpiCalculation')) {
      console.log('Adding lastKpiCalculation column...');
      await db.execute(sql`
        ALTER TABLE developers 
        ADD COLUMN lastKpiCalculation TIMESTAMP NULL
      `);
      console.log('✅ lastKpiCalculation column added');
    } else {
      console.log('⏭️  lastKpiCalculation column already exists');
    }
    
    console.log('\n✅ All portfolio columns added successfully!');
    console.log('\nYou can now test the developer registration wizard.');
    
  } catch (error) {
    console.error('❌ Error adding columns:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

addPortfolioColumns();
