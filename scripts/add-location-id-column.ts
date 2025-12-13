import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function addLocationIdColumn() {
  console.log('Connecting to database...');
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, 
  });

  try {
    console.log('Adding location_id column to properties table...');
    
    // Check if column already exists
    const [columns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'properties' AND COLUMN_NAME = 'location_id'"
    );
    
    if ((columns as any[]).length > 0) {
      console.log('✅ location_id column already exists');
      return;
    }
    
    // Add the column
    await connection.query(`
      ALTER TABLE properties 
      ADD COLUMN location_id INT NULL
    `);
    
    console.log('✅ Successfully added location_id column');
    
    // Add the index separately
    await connection.query(`
      ALTER TABLE properties 
      ADD INDEX idx_properties_location_id (location_id)
    `);
    
    console.log('✅ Successfully added index');
    
    // Optionally add the foreign key constraint
    try {
      await connection.query(`
        ALTER TABLE properties 
        ADD CONSTRAINT fk_properties_location_id 
        FOREIGN KEY (location_id) REFERENCES locations(id) 
        ON DELETE SET NULL
      `);
      console.log('✅ Successfully added foreign key constraint');
    } catch (fkError: any) {
      console.warn('⚠️  Could not add foreign key (locations table might not exist):', fkError.message);
    }
    
  } catch (error: any) {
    console.error('❌ Error adding column:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

addLocationIdColumn();
