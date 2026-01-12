import { getDb } from '../server/db-connection';

async function createDevelopmentPhasesTable() {
  console.log('--- Creating development_phases table if not exists ---');
  
  const db = await getDb();
  if (!db) {
    console.error('Failed to connect to database');
    process.exit(1);
  }

  try {
    // Check if table exists first
    const [tables] = await (db as any).execute(
      `SHOW TABLES LIKE 'development_phases'`
    );
    
    if (tables.length > 0) {
      console.log('✅ Table development_phases already exists');
      process.exit(0);
    }

    console.log('Creating development_phases table...');
    
    await (db as any).execute(`
      CREATE TABLE development_phases (
        id INT AUTO_INCREMENT NOT NULL,
        development_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        phase_number INT NOT NULL,
        description TEXT,
        status ENUM('planning','pre_launch','selling','sold_out','completed') DEFAULT 'planning' NOT NULL,
        total_units INT DEFAULT 0 NOT NULL,
        available_units INT DEFAULT 0 NOT NULL,
        price_from INT,
        price_to INT,
        launch_date TIMESTAMP NULL,
        completion_date TIMESTAMP NULL,
        spec_type ENUM('affordable','gap','luxury','custom') DEFAULT 'affordable',
        custom_spec_type VARCHAR(100),
        finishing_differences JSON,
        phase_highlights JSON,
        latitude VARCHAR(50),
        longitude VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY (id),
        CONSTRAINT development_phases_development_id_fk FOREIGN KEY (development_id) REFERENCES developments(id) ON DELETE CASCADE
      )
    `);
    
    console.log('Creating indexes...');
    
    await (db as any).execute(`
      CREATE INDEX idx_development_phases_development_id ON development_phases (development_id)
    `);
    
    await (db as any).execute(`
      CREATE INDEX idx_development_phases_status ON development_phases (status)
    `);
    
    await (db as any).execute(`
      CREATE INDEX idx_development_phases_spec_type ON development_phases (spec_type)
    `);

    console.log('✅ Table development_phases created successfully!');
    
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('✅ Table already exists');
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  process.exit(0);
}

createDevelopmentPhasesTable();
