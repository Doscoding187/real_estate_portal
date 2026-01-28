import 'dotenv/config';
import { getDb } from '../db.ts';
import { sql } from 'drizzle-orm';

async function applySchema() {
  console.log('Applying Manual Schema Changes...');
  const db = await getDb();
  if (!db) process.exit(1);

  try {
    // 1. Add approvalStatus to developments
    console.log('Checking developments table...');
    try {
      await db.execute(sql`
            ALTER TABLE developments 
            ADD COLUMN approval_status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'draft';
        `);
      console.log('Added approval_status column.');
    } catch (e: any) {
      if (e.message.includes('Duplicate column name')) {
        console.log('approval_status column already exists.');
      } else {
        console.error('Error adding column:', e);
      }
    }

    // 2. Create development_approval_queue
    console.log('Checking development_approval_queue table...');
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS development_approval_queue (
            id INT AUTO_INCREMENT PRIMARY KEY,
            development_id INT NOT NULL,
            submitted_by INT NOT NULL,
            status ENUM('pending', 'reviewing', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
            submission_type ENUM('initial', 'update') NOT NULL DEFAULT 'initial',
            review_notes TEXT,
            rejection_reason TEXT,
            compliance_checks JSON,
            submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP,
            reviewed_by INT,
            FOREIGN KEY (development_id) REFERENCES developments(id) ON DELETE CASCADE,
            FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE RESTRICT,
            FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
            INDEX idx_dev_approval_status (status),
            INDEX idx_dev_approval_dev_id (development_id)
        );
    `);
    console.log('development_approval_queue table ensured.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }

  console.log('Done.');
  process.exit(0);
}

applySchema();
