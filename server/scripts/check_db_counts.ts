import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

import { sql } from 'drizzle-orm';
import { getDb } from '../db';

function extractFirstRow(result: any) {
  const rows = result?.rows ?? (Array.isArray(result) ? result[0] : result);

  if (!rows) return null;
  if (Array.isArray(rows)) return rows[0] ?? null;
  if (typeof rows === 'object') return rows;
  return null;
}

function extractCount(row: any): number | null {
  if (!row || typeof row !== 'object') return null;

  const direct = row.c ?? row.count ?? row['COUNT(*)'] ?? row['count(*)'];
  if (direct !== undefined && direct !== null) {
    const n = Number(direct);
    return Number.isFinite(n) ? n : null;
  }

  const firstVal = Object.values(row)[0];
  if (firstVal === undefined || firstVal === null) return null;

  const n = Number(firstVal);
  return Number.isFinite(n) ? n : null;
}

async function safeCount(db: any, name: string, q: any) {
  try {
    const r = await db.execute(q);
    const row = extractFirstRow(r);
    const count = extractCount(row);
    console.log(`${name}:`, count);
  } catch (e: any) {
    console.log(`${name}: ERROR (${e?.message})`);
  }
}

async function main() {
  const db = await getDb();

  console.log('--- DB COUNTS ---');

  await safeCount(db, 'developments (total)', sql`SELECT COUNT(*) AS c FROM developments`);
  await safeCount(db, 'listings (total)', sql`SELECT COUNT(*) AS c FROM listings`);
  await safeCount(db, 'properties (total)', sql`SELECT COUNT(*) AS c FROM properties`);
  await safeCount(db, 'explore_content (total)', sql`SELECT COUNT(*) AS c FROM explore_content`);
  await safeCount(db, 'explore_shorts (total)', sql`SELECT COUNT(*) AS c FROM explore_shorts`);

  // Try all common publish/approval column variants to find which one your DB actually uses
  await safeCount(
    db,
    'developments (is_published=1)',
    sql`SELECT COUNT(*) AS c FROM developments WHERE is_published = 1`,
  );
  await safeCount(
    db,
    'developments (isPublished=1)',
    sql`SELECT COUNT(*) AS c FROM developments WHERE isPublished = 1`,
  );
  await safeCount(
    db,
    "developments (approval_status='approved')",
    sql`SELECT COUNT(*) AS c FROM developments WHERE approval_status = 'approved'`,
  );
  await safeCount(
    db,
    "developments (approvalStatus='approved')",
    sql`SELECT COUNT(*) AS c FROM developments WHERE approvalStatus = 'approved'`,
  );

  console.log('-----------------');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
