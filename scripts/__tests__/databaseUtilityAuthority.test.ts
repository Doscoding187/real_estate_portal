import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  assertDatabaseUtilityAuthority,
  classifyUtilitySource,
  packageScriptEntrypoints,
  type ResidualUtilityAuthority,
} from '../databaseUtilityAuthorityCheck';

const ROOT = process.cwd();
const INVENTORY = JSON.parse(
  readFileSync('docs/database-authority/residual-utility-authority.json', 'utf8'),
) as ResidualUtilityAuthority;

describe('database utility authority guard', () => {
  it('accepts the current explicit authority inventory', () => {
    expect(() => assertDatabaseUtilityAuthority(ROOT)).not.toThrow();
  });

  it('keeps canonical migrations outside the manually executable utility surface', () => {
    expect(
      classifyUtilitySource(
        'server/migrations/0000_canonical_launch_baseline.sql',
        'CREATE TABLE properties (id INT PRIMARY KEY)',
        INVENTORY,
      ),
    ).toBeNull();
  });

  it.each([
    [
      'supported diagnostic',
      'scripts/schema-sanity-check.mjs',
      "const query = 'SELECT table_name FROM information_schema.tables'; await connection.query(query)",
    ],
    [
      'guarded local/test lifecycle',
      'server/scripts/localDemoSeed.ts',
      "import { drizzle } from 'drizzle-orm/mysql2'; await db.insert(users).values({ email: 'local@example.test' })",
    ],
    [
      'disposable E2E fixture',
      'scripts/verify-prospect-journey-cross-agency.ts',
      "await connection.query('INSERT INTO agencies ...')",
    ],
    [
      'read-only evidence',
      'scripts/check-agent-tables.ts',
      "await connection.query('SELECT * FROM agents')",
    ],
  ])('accepts %s only when its path-level authority is explicit', (_name, path, source) => {
    expect(classifyUtilitySource(path, source, INVENTORY)?.status).toBe('approved');
  });

  it.each([
    [
      'imported application service',
      'server/services/propertyService.ts',
      "import { getDb } from '../db'; import { eq } from 'drizzle-orm'; export async function updateTitle(input) { const db = await getDb(); return db.update(properties).set({ title: input.title }).where(eq(properties.id, input.id)); }",
    ],
    [
      'repository data access module',
      'server/repositories/listingRepository.ts',
      "import { getDb } from '../db'; export async function updateListing(input) { const db = await getDb(); return db.update(listings).set({ title: input.title }); }",
    ],
    [
      'authorized request-path mutation',
      'server/routes/listings.ts',
      "import { db } from '../db'; export async function createListing(input) { return db.insert(listings).values(input); }",
    ],
    [
      'database connection support',
      'server/db-connection.ts',
      "import mysql from 'mysql2/promise'; const connection = await mysql.createConnection(process.env.DATABASE_URL); export { connection };",
    ],
  ])('accepts ordinary %s application code', (_name, path, source) => {
    expect(classifyUtilitySource(path, source, INVENTORY)).toBeNull();
  });

  it.each([
    [
      'canonical getDb repair utility',
      'scripts/repair.ts',
      "import { getDb } from '../server/db'; async function main() { const db = await getDb(); await db.delete(users); } main();",
    ],
    [
      'canonical db-handle neutral utility',
      'tools/dataTask.ts',
      "import { db } from '../server/db'; async function main() { await db.update(users).set({ role: 'admin' }); } main();",
    ],
    [
      'canonical admin bootstrap utility',
      'scripts/admin-bootstrap.ts',
      "import { getDb } from '../server/db'; async function main() { const db = await getDb(); await db.insert(users).values({ role: 'admin' }); } main();",
    ],
    [
      'insert utility',
      'scripts/new-insert.ts',
      "import mysql from 'mysql2/promise'; await mysql.createConnection(url).then(connection => connection.query('INSERT INTO users ...'))",
    ],
    [
      'update utility',
      'scripts/new-update.ts',
      "import mysql from 'mysql2/promise'; await mysql.createConnection(url).then(connection => connection.query('UPDATE users SET name = name'))",
    ],
    [
      'delete utility',
      'scripts/new-delete.ts',
      "import mysql from 'mysql2/promise'; await mysql.createConnection(url).then(connection => connection.query('DELETE FROM users'))",
    ],
    ['cleanup utility', 'tools/cleanup-records.ts', "await connection.query('DELETE FROM users')"],
    ['production seed utility', 'tools/production-seed.ts', "await connection.query('INSERT INTO users ...')"],
    ['admin bootstrap utility', 'tools/admin-bootstrap.ts', "await connection.query('UPDATE users SET role = admin')"],
    ['backfill utility', 'tools/moved-repair.ts', "await connection.query('UPDATE listings SET location_id = 1')"],
  ])('rejects an unclassified %s', (_name, path, source) => {
    expect(classifyUtilitySource(path, source, INVENTORY)).toMatchObject({
      path,
      status: 'unclassified',
    });
  });

  it('rejects a package-exposed neutral canonical-helper utility', () => {
    const packageEntrypoints = new Set(
      packageScriptEntrypoints({ scripts: { 'db:unsafe': 'tsx tools/dataTask.ts' } }),
    );

    expect(
      classifyUtilitySource(
        'tools/dataTask.ts',
        "import { getDb } from '../server/db'; async function run() { const db = await getDb(); await db.delete(users); }",
        INVENTORY,
        packageEntrypoints,
      ),
    ).toMatchObject({ path: 'tools/dataTask.ts', status: 'unclassified' });
  });

  it.each([
    [
      'neutral standalone direct-client utility',
      'tools/dataTask.ts',
      "import mysql from 'mysql2/promise'; async function main() { const connection = await mysql.createConnection(process.env.DATABASE_URL); await connection.query('DELETE FROM users'); } main();",
    ],
    [
      'neutral nested standalone utility',
      'maintenance/jobs/task.ts',
      "import mysql from 'mysql2/promise'; async function main() { const connection = await mysql.createConnection(process.env.DATABASE_URL); await connection.query('DELETE FROM users'); } main();",
    ],
    [
      'neutral standalone canonical-helper utility',
      'misc/task.ts',
      "import { getDb } from '../server/db'; async function main() { const db = await getDb(); await db.update(users).set({ status: 'inactive' }); } main();",
    ],
    [
      'runtime cleanup utility',
      'server/services/cleanup.ts',
      "import mysql from 'mysql2/promise'; await mysql.createConnection(process.env.DATABASE_URL).then(connection => connection.query('DELETE FROM users'))",
    ],
    [
      'runtime seed utility',
      'server/services/demoSeed.ts',
      "import mysql from 'mysql2/promise'; await mysql.createConnection(process.env.DATABASE_URL).then(connection => connection.query('INSERT INTO listings ...'))",
    ],
    [
      'runtime account bootstrap utility',
      'server/routes/admin-bootstrap.ts',
      "import mysql from 'mysql2/promise'; await mysql.createConnection(process.env.DATABASE_URL).then(connection => connection.query('UPDATE users SET role = admin'))",
    ],
    [
      'runtime backfill utility',
      'server/services/location-backfill.ts',
      "import mysql from 'mysql2/promise'; await mysql.createConnection(process.env.DATABASE_URL).then(connection => connection.query('UPDATE listings SET location_id = 1'))",
    ],
    [
      'neutral-named ambient runtime utility',
      'server/services/dataTask.ts',
      "import mysql from 'mysql2/promise'; export async function run() { const connection = await mysql.createConnection(process.env.DATABASE_URL); return connection.query('DELETE FROM users'); }",
    ],
    [
      'relocated runtime repair utility',
      'server/jobs/repair-listings.ts',
      "import mysql from 'mysql2/promise'; await mysql.createConnection(url).then(connection => connection.query('UPDATE listings SET status = status'))",
    ],
  ])('rejects an unclassified %s', (_name, path, source) => {
    expect(classifyUtilitySource(path, source, INVENTORY)).toMatchObject({
      path,
      status: 'unclassified',
    });
  });

  it('rejects a runtime-subtree utility exposed by a package script', () => {
    const packageEntrypoints = new Set(
      packageScriptEntrypoints({ scripts: { 'db:unsafe': 'tsx server/services/data-task.ts' } }),
    );

    expect(
      classifyUtilitySource(
        'server/services/data-task.ts',
        "import mysql from 'mysql2/promise'; await mysql.createConnection(process.env.DATABASE_URL).then(connection => connection.query('DELETE FROM users'))",
        INVENTORY,
        packageEntrypoints,
      ),
    ).toMatchObject({ path: 'server/services/data-task.ts', status: 'unclassified' });
  });

  it('rejects an ambient direct-client utility exposed by a package script', () => {
    const packageEntrypoints = new Set(
      packageScriptEntrypoints({ scripts: { 'db:unsafe': 'tsx tools/ambient.ts' } }),
    );

    expect(
      classifyUtilitySource(
        'tools/ambient.ts',
        "import mysql from 'mysql2/promise'; await mysql.createConnection(process.env.DATABASE_URL).then(connection => connection.query('DELETE FROM users'))",
        INVENTORY,
        packageEntrypoints,
      ),
    ).toMatchObject({ path: 'tools/ambient.ts', status: 'unclassified' });
  });

  it('keeps read-only evidence accepted when it is not package-wired', () => {
    expect(
      classifyUtilitySource(
        'scripts/check-agent-tables.ts',
        "await connection.query('SELECT * FROM agents')",
        INVENTORY,
      ),
    ).toMatchObject({ path: 'scripts/check-agent-tables.ts', status: 'approved' });
  });

  it('rejects read-only evidence when package-wired', () => {
    const packageEntrypoints = new Set(
      packageScriptEntrypoints({ scripts: { 'db:evidence': 'tsx scripts/check-agent-tables.ts' } }),
    );

    expect(
      classifyUtilitySource(
        'scripts/check-agent-tables.ts',
        "await connection.query('SELECT * FROM agents')",
        INVENTORY,
        packageEntrypoints,
      ),
    ).toMatchObject({ path: 'scripts/check-agent-tables.ts', status: 'unclassified' });
  });

  it('keeps a supported diagnostic permitted through its canonical package command', () => {
    const packageEntrypoints = new Set(
      packageScriptEntrypoints({ schema: 'node scripts/schema-sanity-check.mjs' }),
    );

    expect(
      classifyUtilitySource(
        'scripts/schema-sanity-check.mjs',
        "const query = 'SELECT table_name FROM information_schema.tables'; await connection.query(query)",
        INVENTORY,
        packageEntrypoints,
      ),
    ).toMatchObject({ path: 'scripts/schema-sanity-check.mjs', status: 'approved' });
  });

  it('keeps the guarded local/test lifecycle permitted through its canonical package command', () => {
    const packageEntrypoints = new Set(
      packageScriptEntrypoints({ seed: 'tsx server/scripts/localDemoSeed.ts' }),
    );

    expect(
      classifyUtilitySource(
        'server/scripts/localDemoSeed.ts',
        "import { drizzle } from 'drizzle-orm/mysql2'; await db.insert(users).values({ email: 'local@example.test' })",
        INVENTORY,
        packageEntrypoints,
      ),
    ).toMatchObject({ path: 'server/scripts/localDemoSeed.ts', status: 'approved' });
  });

  it('extracts local package-script entrypoints so relocation cannot bypass the guard', () => {
    expect(
      packageScriptEntrypoints({
        scripts: {
          'db:unsafe': 'tsx ./tools/moved-repair.ts',
          'db:other': 'node scripts/known.ts && bash scripts/known.sh',
        },
      }),
    ).toEqual(['scripts/known.sh', 'scripts/known.ts', 'tools/moved-repair.ts']);
  });

  it('keeps a returned retired utility prohibited', () => {
    const retiredPath = INVENTORY.retiredUtilities[0];
    const result = classifyUtilitySource(
      retiredPath,
      "import mysql from 'mysql2/promise'; await mysql.createConnection(url).then(connection => connection.query('DELETE FROM users'))",
      INVENTORY,
    );

    expect(result?.status).toBe('retired');
  });
});
