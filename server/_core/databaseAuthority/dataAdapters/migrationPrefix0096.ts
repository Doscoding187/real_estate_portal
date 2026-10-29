import { resolve } from 'node:path';
import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import type { ResolvedDatabaseAuthority } from '../types';
import {
  assertOperation,
  queryRows,
  requireExactAdapterTarget,
  rowValue,
  stableDigest,
  withTransaction,
  type AdapterEvidence,
} from './common';
import { loadAndValidateMigrationManifest } from '../../../migrations/migrationManifest';
import { buildMigrationPlan, type AppliedMigration, type MigrationAttempt } from '../../../migrations/runSqlMigrations';

export const MIGRATION_PREFIX_0096_VERSION = 'migration-prefix-0096-v1' as const;
export const MIGRATION_PREFIX_0096_HEAD = '0096_user_founder_authority_unique.sql' as const;

const FIXTURE = Object.freeze({
  version: MIGRATION_PREFIX_0096_VERSION,
  head: MIGRATION_PREFIX_0096_HEAD,
  rows: Object.freeze({
    user: Object.freeze({
      id: 19960961,
      openId: 'migration-rehearsal-0096-user',
      email: 'migration-rehearsal-0096@example.invalid',
      name: 'Migration Rehearsal User',
      role: 'visitor',
    }),
    listing: Object.freeze({
      id: 19960962,
      ownerId: 19960961,
      action: 'sell',
      propertyType: 'house',
      title: 'Migration Rehearsal Listing',
      description: 'Synthetic disposable migration rehearsal row.',
      address: '1 Rehearsal Road',
      latitude: -26.2041,
      longitude: 28.0473,
      city: 'Johannesburg',
      suburb: 'Braamfontein',
      province: 'Gauteng',
      slug: 'migration-rehearsal-listing-0096',
    }),
    development: Object.freeze({
      id: 19960963,
      name: 'Migration Rehearsal Development',
      developmentType: 'residential',
      city: 'Johannesburg',
      province: 'Gauteng',
      suburb: 'Braamfontein',
      slug: 'migration-rehearsal-development-0096',
    }),
    lead: Object.freeze({
      id: 19960964,
      developmentId: 19960963,
      listing_id: 19960962,
      name: 'Migration Rehearsal Lead',
      email: 'migration-rehearsal-lead-0096@example.invalid',
      message: 'Synthetic lead created only for the disposable migration rehearsal.',
      source: 'migration-rehearsal-0096',
    }),
  }),
});

export const MIGRATION_PREFIX_0096_DIGEST = stableDigest(FIXTURE);

type Input = {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
};

export type MigrationPrefix0096Evidence = AdapterEvidence & {
  fixture: typeof MIGRATION_PREFIX_0096_VERSION;
  migrationHead: string;
  rows: {
    user: Record<string, unknown>;
    listing: Record<string, unknown>;
    development: Record<string, unknown>;
    lead: Record<string, unknown>;
  };
  expectedMigrationEffects: {
    developmentLocation: readonly ['city', 'province', 'suburb', 'location_id'];
  };
};

function requireFixtureTarget(input: Input, operation: string): AdapterEvidence {
  assertOperation(input.decision, [operation]);
  const evidence = requireExactAdapterTarget(input.authority);
  if (
    input.authority.context.targetClass !== 'disposable-worktree' ||
    !input.authority.context.local ||
    input.authority.context.provider !== 'mysql' ||
    input.authority.context.dialect !== 'mysql' ||
    !input.authority.context.worktree.registered ||
    !input.authority.context.worktree.ownershipMatches
  ) {
    throw new Error('Migration prefix fixture refused: target is not the exact owned local MySQL worktree.');
  }
  return {
    ...evidence,
    adapter: 'migration-prefix-0096',
    version: MIGRATION_PREFIX_0096_VERSION,
    digest: MIGRATION_PREFIX_0096_DIGEST,
  };
}

async function requireMigrationHead(
  input: Input,
  expectedHead: string,
  ancestor: boolean,
): Promise<void> {
  const manifest = loadAndValidateMigrationManifest({
    migrationsDirectory: resolve(input.authority.context.repository.root, 'server/migrations'),
  });
  const applied: AppliedMigration[] = (await queryRows(
    input.connection,
    `SELECT filename, checksum FROM \`${manifest.document.historyTable}\` ORDER BY numeric_version, filename`,
  )).map(row => ({
    fileName: String(rowValue(row, 'filename') ?? ''),
    checksum: String(rowValue(row, 'checksum') ?? ''),
  }));
  const incompleteAttempts: MigrationAttempt[] = (await queryRows(
    input.connection,
    `SELECT attempt_id, migration_filename, state FROM \`${manifest.document.attemptTable}\` WHERE state IN ('running', 'failed', 'blocked') ORDER BY started_at, attempt_id`,
  )).map(row => ({
    attemptId: String(rowValue(row, 'attempt_id') ?? ''),
    fileName: String(rowValue(row, 'migration_filename') ?? ''),
    state: String(rowValue(row, 'state') ?? 'blocked') as MigrationAttempt['state'],
  }));
  const plan = buildMigrationPlan({
    manifest,
    targetFingerprintHash: input.authority.context.targetFingerprintHash,
    applied,
    incompleteAttempts,
    applicationTableCount: 0,
    ...(ancestor ? { ancestorHead: expectedHead } : { expectedNewHead: expectedHead }),
  });
  if (plan.pending.length || plan.acceptedOldHead !== expectedHead || plan.expectedNewHead !== expectedHead) {
    throw new Error(`Migration prefix fixture refused: target is not at exact required head ${expectedHead}.`);
  }
}

function assertFields(row: Record<string, unknown> | undefined, expected: Record<string, unknown>, label: string): void {
  if (!row) throw new Error(`Migration prefix fixture expected exactly one ${label} row.`);
  for (const [field, value] of Object.entries(expected)) {
    const actual = rowValue(row, field);
    const jsonValue =
      typeof value === 'string' && /^[\[{]/.test(value.trim())
        ? JSON.stringify(JSON.parse(typeof actual === 'string' ? actual : JSON.stringify(actual)))
        : undefined;
    const matches = typeof value === 'number'
      ? Number(actual) === value
      : jsonValue !== undefined
        ? jsonValue === JSON.stringify(JSON.parse(String(value)))
        : String(actual ?? '') === String(value ?? '');
    if (!matches) {
      throw new Error(`Migration prefix fixture detected ${label} identity/data drift at ${field}.`);
    }
  }
}

async function snapshot0096(input: Input): Promise<MigrationPrefix0096Evidence['rows']> {
  const { user, listing, development, lead } = FIXTURE.rows;
  const [users, listings, developments, leads] = await Promise.all([
    queryRows(input.connection, 'SELECT id, openId, email, name, role FROM users WHERE id = ?', [user.id]),
    queryRows(input.connection, 'SELECT id, ownerId, action, propertyType, title, description, address, latitude, longitude, city, suburb, province, slug FROM listings WHERE id = ?', [listing.id]),
    queryRows(input.connection, 'SELECT id, name, developmentType, city, province, suburb, slug FROM developments WHERE id = ?', [development.id]),
    queryRows(input.connection, 'SELECT id, developmentId, listing_id, name, email, message, source FROM leads WHERE id = ?', [lead.id]),
  ]);
  assertFields(users[0], user, 'user');
  assertFields(listings[0], listing, 'listing');
  assertFields(developments[0], development, 'development');
  assertFields(leads[0], lead, 'lead');
  if ([users, listings, developments, leads].some(rows => rows.length !== 1)) {
    throw new Error('Migration prefix fixture identity rows are not unique.');
  }
  return { user: users[0], listing: listings[0], development: developments[0], lead: leads[0] };
}

export async function prepareMigrationPrefix0096(input: Input): Promise<MigrationPrefix0096Evidence> {
  const evidence = requireFixtureTarget(input, 'test-fixture');
  await requireMigrationHead(input, MIGRATION_PREFIX_0096_HEAD, true);

  const { user, listing, development, lead } = FIXTURE.rows;
  const conflicts = [
    await queryRows(input.connection, 'SELECT id FROM users WHERE id = ? OR openId = ? OR email = ?', [user.id, user.openId, user.email]),
    await queryRows(input.connection, 'SELECT id FROM listings WHERE id = ? OR slug = ?', [listing.id, listing.slug]),
    await queryRows(input.connection, 'SELECT id FROM developments WHERE id = ? OR slug = ?', [development.id, development.slug]),
    await queryRows(input.connection, 'SELECT id FROM leads WHERE id = ?', [lead.id]),
  ];
  if (conflicts.some(rows => rows.length > 0)) {
    throw new Error('Migration prefix fixture refused: a reserved synthetic identity already exists.');
  }

  await withTransaction(input.connection, async () => {
    await input.connection.execute(
      'INSERT INTO users (id, openId, email, name, role, loginMethod, emailVerified) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [user.id, user.openId, user.email, user.name, user.role, 'migration-rehearsal'],
    );
    await input.connection.execute(
      'INSERT INTO listings (id, ownerId, action, propertyType, title, description, address, latitude, longitude, city, suburb, province, slug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [listing.id, listing.ownerId, listing.action, listing.propertyType, listing.title, listing.description, listing.address, listing.latitude, listing.longitude, listing.city, listing.suburb, listing.province, listing.slug],
    );
    await input.connection.execute(
      'INSERT INTO developments (id, name, developmentType, city, province, suburb, slug) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [development.id, development.name, development.developmentType, development.city, development.province, development.suburb, development.slug],
    );
    await input.connection.execute(
      'INSERT INTO leads (id, developmentId, listing_id, name, email, message, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [lead.id, lead.developmentId, lead.listing_id, lead.name, lead.email, lead.message, lead.source],
    );
  });

  return {
    ...evidence,
    fixture: MIGRATION_PREFIX_0096_VERSION,
    migrationHead: MIGRATION_PREFIX_0096_HEAD,
    rows: await snapshot0096(input),
    expectedMigrationEffects: {
      developmentLocation: ['city', 'province', 'suburb', 'location_id'],
    },
  };
}

export async function verifyMigrationPrefix0096(input: Input): Promise<MigrationPrefix0096Evidence> {
  const evidence = requireFixtureTarget(input, 'verification');
  const manifest = loadAndValidateMigrationManifest({
    migrationsDirectory: resolve(input.authority.context.repository.root, 'server/migrations'),
  });
  await requireMigrationHead(input, manifest.document.expectedHead, false);

  const { user, listing, development, lead } = FIXTURE.rows;
  const [users, listings, developments, leads, retiredColumns, developmentAssignments, leadDeliveries] = await Promise.all([
    queryRows(input.connection, 'SELECT id, openId, email, name, role FROM users WHERE id = ?', [user.id]),
    queryRows(input.connection, 'SELECT id, ownerId, title, slug, city, suburb, province FROM listings WHERE id = ?', [listing.id]),
    queryRows(input.connection, 'SELECT id, name, slug FROM developments WHERE id = ?', [development.id]),
    queryRows(input.connection, 'SELECT id, developmentId, listing_id, name, email, source FROM leads WHERE id = ?', [lead.id]),
    queryRows(input.connection, "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'developments' AND column_name IN ('city','province','suburb','location_id')"),
    queryRows(input.connection, 'SELECT id FROM development_place_assignments WHERE development_id = ?', [development.id]),
    queryRows(input.connection, 'SELECT id FROM lead_deliveries WHERE lead_id = ?', [lead.id]),
  ]);

  assertFields(users[0], user, 'user');
  assertFields(listings[0], {
    id: listing.id,
    ownerId: listing.ownerId,
    title: listing.title,
    slug: listing.slug,
    city: listing.city,
    suburb: listing.suburb,
    province: listing.province,
  }, 'listing');
  assertFields(developments[0], { id: development.id, name: development.name, slug: development.slug }, 'development');
  assertFields(leads[0], {
    id: lead.id,
    developmentId: lead.developmentId,
    listing_id: lead.listing_id,
    name: lead.name,
    email: lead.email,
    source: lead.source,
  }, 'lead');
  if ([users, listings, developments, leads].some(rows => rows.length !== 1)) {
    throw new Error('Migration prefix fixture identity rows are not unique after upgrade.');
  }
  if (retiredColumns.length !== 0) {
    throw new Error('Migration prefix fixture expected retired development geography columns to be absent.');
  }
  if (developmentAssignments.length !== 0 || leadDeliveries.length !== 0) {
    throw new Error('Migration prefix fixture found an unexpected replacement geography/delivery row.');
  }

  return {
    ...evidence,
    fixture: MIGRATION_PREFIX_0096_VERSION,
    migrationHead: manifest.document.expectedHead,
    rows: { user: users[0], listing: listings[0], development: developments[0], lead: leads[0] },
    expectedMigrationEffects: {
      developmentLocation: ['city', 'province', 'suburb', 'location_id'],
    },
  };
}
