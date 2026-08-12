import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import type { ResolvedDatabaseAuthority } from '../types';
import {
  COMMERCIAL_INVOICE_TERM_CAPABILITY,
  PLE_MANUAL_LOCATION_CAPABILITY,
  requireAcceptedMigrationHead,
} from './common';
import { loadAndValidateMigrationManifest } from '../../../migrations/migrationManifest';

const ROOT = process.cwd();
const profileRoots: string[] = [];

function authority(): ResolvedDatabaseAuthority {
  return {
    context: {
      targetFingerprintHash: 'a'.repeat(64),
      databaseName: 'listify_wt_common_guard_test',
      repository: {
        root: ROOT,
        gitCommonDirectoryFingerprint: 'b'.repeat(64),
        head: 'c'.repeat(40),
      },
      worktree: {
        path: ROOT,
        branch: 'test/common-migration-guard',
        upstream: null,
        registered: true,
        clean: true,
        ownershipKey: 'common-guard-test',
        expectedDatabase: 'listify_wt_common_guard_test',
        ownershipMatches: true,
        cleanMainOwnershipMatches: false,
      },
    },
    credential: { handleId: 'common-guard-test' },
  } as ResolvedDatabaseAuthority;
}

class ScriptedMigrationConnection implements AuthoritySqlConnection {
  constructor(private readonly applied: ReadonlyArray<{ fileName: string; checksum: string }>) {}

  async execute(statement: string): Promise<unknown> {
    if (statement.includes('information_schema.tables')) {
      return [[{ table_name: 'sql_migration_history' }, { table_name: 'sql_migration_attempts' }]];
    }
    if (statement.includes('sql_migration_history')) {
      return [this.applied.map(item => ({ filename: item.fileName, checksum: item.checksum }))];
    }
    if (statement.includes('sql_migration_attempts')) return [[]];
    throw new Error(`Unexpected migration-guard statement: ${statement}`);
  }

  async query(): Promise<unknown> {
    throw new Error('Migration guard test must not mutate through query().');
  }

  async end(): Promise<void> {}
}

function profileRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'listify-common-guard-'));
  profileRoots.push(root);
  return root;
}

afterEach(() => {
  while (profileRoots.length) rmSync(profileRoots.pop()!, { recursive: true, force: true });
});

describe('durable Database Authority migration guard', () => {
  it('derives currentness from the manifest and accepts explicit ancestor capabilities', async () => {
    const manifest = loadAndValidateMigrationManifest({
      migrationsDirectory: join(ROOT, 'server/migrations'),
    });
    const result = await requireAcceptedMigrationHead({
      authority: authority(),
      connection: new ScriptedMigrationConnection(
        manifest.orderedMigrations.map(item => ({
          fileName: item.filename,
          checksum: item.checksum,
        })),
      ),
      manifest,
      profileRoot: profileRoot(),
      requiredCapabilities: [PLE_MANUAL_LOCATION_CAPABILITY, COMMERCIAL_INVOICE_TERM_CAPABILITY],
    });

    expect(result.document.expectedHead).toBe('0007_paid_launch_access_invoice_term.sql');
    expect(result.orderedMigrations).toHaveLength(8);
  });

  it('rejects an otherwise valid prefix when the database is behind the manifest head', async () => {
    const manifest = loadAndValidateMigrationManifest({
      migrationsDirectory: join(ROOT, 'server/migrations'),
    });
    await expect(
      requireAcceptedMigrationHead({
        authority: authority(),
        connection: new ScriptedMigrationConnection(
          manifest.orderedMigrations.slice(0, 7).map(item => ({
            fileName: item.filename,
            checksum: item.checksum,
          })),
        ),
        manifest,
        profileRoot: profileRoot(),
        requiredCapabilities: [PLE_MANUAL_LOCATION_CAPABILITY],
      }),
    ).rejects.toThrow('current manifest head');
  });

  it('fails closed when a capability anchor checksum conflicts with the manifest', async () => {
    const manifest = loadAndValidateMigrationManifest({
      migrationsDirectory: join(ROOT, 'server/migrations'),
    });
    await expect(
      requireAcceptedMigrationHead({
        authority: authority(),
        connection: new ScriptedMigrationConnection(
          manifest.orderedMigrations.map(item => ({
            fileName: item.filename,
            checksum: item.checksum,
          })),
        ),
        manifest,
        profileRoot: profileRoot(),
        requiredCapabilities: [
          {
            filename: PLE_MANUAL_LOCATION_CAPABILITY.filename,
            checksum: '0'.repeat(64),
          },
        ],
      }),
    ).rejects.toThrow('canonical checksum mismatch');
  });
});
