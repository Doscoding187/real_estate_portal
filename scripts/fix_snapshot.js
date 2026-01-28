import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const snapshotPath = path.join(__dirname, '../drizzle/meta/0013_snapshot.json');

try {
  const data = fs.readFileSync(snapshotPath, 'utf8');
  const snapshot = JSON.parse(data);

  const tablesToRemove = [
    'explore_categories',
    'explore_topics',
    'explore_neighbourhood_stories',
    'explore_sponsorships',
    'explore_shorts',
  ];

  let removedCount = 0;
  tablesToRemove.forEach(tableName => {
    if (snapshot.tables && snapshot.tables[tableName]) {
      delete snapshot.tables[tableName];
      console.log(`Removed table: ${tableName}`);
      removedCount++;
    } else {
      console.log(`Table not found (already removed?): ${tableName}`);
    }
  });

  if (removedCount > 0) {
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
    console.log(`Successfully updated snapshot. Removed ${removedCount} tables.`);
  } else {
    console.log('No changes made to snapshot.');
  }
} catch (err) {
  console.error('Error processing snapshot:', err);
  process.exit(1);
}
