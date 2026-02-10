/**
 * server/scripts/sanity_test_seed_cleanup.ts
 *
 * Seed Cleanup Sanity Test (MySQL direct)
 * - Creates a platform-owned seeded brand profile
 * - Creates 1 development + 1 unit type + 1 lead linked to that brand
 * - Prints next steps (register developer profile with exact brand name)
 *
 * Safe + Idempotent:
 * - If a prior run exists (same slug), deletes children first then brand.
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

  // Use new stamp each time if you want: but keeping deterministic makes cleanup easier
  const BRAND_NAME = 'Seed Test Brand 2026-02-04';
  const SLUG = 'seed-test-brand-2026-02-04';
  const SEED_BATCH_ID = 'seed_sanity_2026_02_04';

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
  });

  try {
    console.log('Connected:', { host, port, database });

    // -----------------------------
    // A) Clean previous run (by slug)
    // -----------------------------
    const [existingRows] = await conn.execute<any[]>(
      `SELECT id FROM developer_brand_profiles WHERE slug = ? LIMIT 1`,
      [SLUG],
    );

    if (existingRows.length) {
      const brandProfileId = Number(existingRows[0].id);
      console.log('Existing seed brand found. Cleaning previous run:', { brandProfileId });

      // Collect development ids
      const [devs] = await conn.execute<any[]>(
        `SELECT id FROM developments WHERE developer_brand_profile_id = ?`,
        [brandProfileId],
      );
      const devIds = devs.map(d => Number(d.id)).filter(Boolean);

      // Delete unit types for those developments
      if (devIds.length) {
        await conn.execute(
          `DELETE FROM unit_types WHERE development_id IN (${placeholders(devIds.length)})`,
          devIds,
        );

        // Optional tables (ignore if missing)
        try {
          await conn.execute(
            `DELETE FROM development_phases WHERE development_id IN (${placeholders(
              devIds.length,
            )})`,
            devIds,
          );
        } catch (e) {
          console.warn(
            'Skipping delete from development_phases (table may not exist):',
            (e as Error).message,
          );
        }

        try {
          await conn.execute(
            `DELETE FROM development_drafts WHERE development_id IN (${placeholders(
              devIds.length,
            )})`,
            devIds,
          );
        } catch (e) {
          console.warn(
            'Skipping delete from development_drafts (table may not exist):',
            (e as Error).message,
          );
        }

        // Delete developments
        await conn.execute(`DELETE FROM developments WHERE developer_brand_profile_id = ?`, [
          brandProfileId,
        ]);
      }

      // Delete leads linked to brand profile
      await conn.execute(`DELETE FROM leads WHERE developer_brand_profile_id = ?`, [
        brandProfileId,
      ]);

      // Delete brand profile
      await conn.execute(`DELETE FROM developer_brand_profiles WHERE id = ?`, [brandProfileId]);

      console.log('Previous run cleaned.');
    }

    // -----------------------------
    // B) Create seed brand
    // -----------------------------
    const [brandInsert] = await conn.execute<any>(
      `
      INSERT INTO developer_brand_profiles
        (brand_name, slug, owner_type, seed_batch_id, is_visible, is_claimable)
      VALUES
        (?, ?, 'platform', ?, 1, 1)
      `,
      [BRAND_NAME, SLUG, SEED_BATCH_ID],
    );

    const brandProfileId = Number(brandInsert.insertId);
    console.log('Created seed brand:', { brandProfileId, BRAND_NAME, SLUG, SEED_BATCH_ID });

    // -----------------------------
    // C) Create development (matches your DESCRIBE developments)
    // - requires city, province, developmentType
    // - uses createdAt / updatedAt (camelCase)
    // -----------------------------
    const [devInsert] = await conn.execute<any>(
      `
      INSERT INTO developments
        (name, developer_brand_profile_id, city, province, developmentType, createdAt, updatedAt)
      VALUES
        (?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [`Seed Dev for ${BRAND_NAME}`, brandProfileId, 'Johannesburg', 'Gauteng', 'residential'],
    );

    const developmentId = Number(devInsert.insertId);
    console.log('Created development:', { developmentId });

    // -----------------------------
    // D) Create unit type (matches your DESCRIBE unit_types)
    // - id is varchar(36) NOT NULL, so we supply UUID()
    // - uses created_at / updated_at (snake_case)
    // -----------------------------
    await conn.execute(
      `
      INSERT INTO unit_types
        (id, development_id, name, bedrooms, bathrooms, base_price_from, parking_type, parking_bays, created_at, updated_at)
      VALUES
        (UUID(), ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [developmentId, 'Test Unit Type', 2, 1.0, 1000000, 'open', 1],
    );

    const [unitRow] = await conn.query<any[]>(
      `SELECT id FROM unit_types WHERE development_id = ? ORDER BY created_at DESC LIMIT 1`,
      [developmentId],
    );
    const unitTypeId = unitRow?.[0]?.id ?? null;
    console.log('Created unit type:', { unitTypeId });

    // -----------------------------
    // E) Create lead (matches your DESCRIBE leads)
    // - developmentId is camelCase
    // - leadType/status enums
    // - createdAt/updatedAt camelCase
    // - developer_brand_profile_id snake_case
    // -----------------------------
    const [leadInsert] = await conn.execute<any>(
      `
      INSERT INTO leads
        (developmentId, name, email, leadType, status, developer_brand_profile_id, createdAt, updatedAt)
      VALUES
        (?, ?, ?, 'inquiry', 'new', ?, NOW(), NOW())
      `,
      [developmentId, 'Seed Lead', 'seed.lead@test.local', brandProfileId],
    );

    const leadId = Number(leadInsert.insertId);
    console.log('Created lead:', { leadId });

    console.log('\n✅ SEED SETUP COMPLETE');
    console.log('Now do this in the app:');
    console.log(`1) Register / create developer profile with name EXACTLY: "${BRAND_NAME}"`);
    console.log('2) That should trigger handleSeedDeletionOnRegistration()');
    console.log('\nThen verify deletion by running:');
    console.log('pnpm tsx server/scripts/verify_seed_cleanup.ts');
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

