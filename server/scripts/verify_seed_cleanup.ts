/**
 * server/scripts/verify_seed_cleanup.ts
 *
 * Verifies whether the seed brand cleanup worked:
 * - If brand profile is hard-deleted → PASS
 * - If brand profile still exists but children are gone → PASS (soft-delete is acceptable)
 * - If any children remain → FAIL (exitCode=1)
 */

import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

// Load env for scripts explicitly (tsx does NOT auto-load .env.local reliably)
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env if present

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function parseDbUrl(dbUrl: string) {
  const u = new URL(dbUrl);
  if (u.protocol !== 'mysql:') throw new Error(`Expected mysql:// URL, got ${u.protocol}`);

  const database = u.pathname.replace(/^\//, '');
  if (!database) throw new Error(`DATABASE_URL missing database name in path: ${dbUrl}`);

  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database,
  };
}

function placeholders(n: number) {
  return Array.from({ length: n }, () => '?').join(',');
}

async function main() {
  const dbUrl = mustEnv('DATABASE_URL');
  const { host, port, user, password, database } = parseDbUrl(dbUrl);

  const SLUG = 'seed-test-brand-2026-02-04';

  const conn = await mysql.createConnection({ host, port, user, password, database });

  try {
    const [brandRows] = await conn.execute<any[]>(
      `
      SELECT id, brand_name, slug, owner_type, seed_batch_id, is_visible
      FROM developer_brand_profiles
      WHERE slug = ?
      LIMIT 1
      `,
      [SLUG],
    );

    if (!brandRows.length) {
      console.log('✅ Brand profile not found (hard delete). Good.');
      return;
    }

    const brand = brandRows[0];
    const brandProfileId = Number(brand.id);

    const [[devCountRow]] = await conn.execute<any[]>(
      `SELECT COUNT(*) AS c FROM developments WHERE developer_brand_profile_id = ?`,
      [brandProfileId],
    );
    const devCount = Number(devCountRow.c ?? 0);

    const [devIdRows] = await conn.execute<any[]>(
      `SELECT id FROM developments WHERE developer_brand_profile_id = ?`,
      [brandProfileId],
    );
    const devIds = devIdRows.map(r => Number(r.id)).filter(Boolean);

    let unitCount = 0;
    if (devIds.length) {
      const [[unitCountRow]] = await conn.execute<any[]>(
        `SELECT COUNT(*) AS c FROM unit_types WHERE development_id IN (${placeholders(devIds.length)})`,
        devIds,
      );
      unitCount = Number(unitCountRow.c ?? 0);
    }

    const [[leadCountRow]] = await conn.execute<any[]>(
      `SELECT COUNT(*) AS c FROM leads WHERE developer_brand_profile_id = ?`,
      [brandProfileId],
    );
    const leadCount = Number(leadCountRow.c ?? 0);

    console.log('Brand profile still exists (soft delete is OK if children are gone):');
    console.log(brand);
    console.log('Counts:', { developments: devCount, units: unitCount, leads: leadCount });

    if (devCount === 0 && unitCount === 0 && leadCount === 0) {
      console.log(
        '✅ Children deleted. If brand is soft-deleted (is_visible=0 + renamed brand_name/slug), that is OK.',
      );
      return;
    }

    console.log('❌ Cleanup incomplete. Something did not delete as expected.');
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
