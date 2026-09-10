import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadAndValidateMigrationManifest, parseSqlStatements } from '../migrationManifest';

const migrationRoot = resolve('server/migrations');
const retirement = [
  {
    sequence: 72,
    filename: '0072_retire_legacy_prospect_favorites.sql',
    table: 'prospect_favorites',
    parent: '0071_recently_viewed_user_recency_index.sql',
    parentChecksum: '39102d96623ac8290038d5e3887fe3bcbc8960607b6e56b35065a0684023e19c',
    checksum: '43c302a00bd00051ecf770d3b1bd04501b2c6c3ce6ef90a31fe093b2da23f3bc',
  },
  {
    sequence: 73,
    filename: '0073_retire_legacy_scheduled_viewings.sql',
    table: 'scheduled_viewings',
    parent: '0072_retire_legacy_prospect_favorites.sql',
    parentChecksum: '43c302a00bd00051ecf770d3b1bd04501b2c6c3ce6ef90a31fe093b2da23f3bc',
    checksum: 'e0e29c8c21c45564434833f0e84debbd4b0b8a3bedb6d15398ba91cc1ea537fc',
  },
  {
    sequence: 74,
    filename: '0074_retire_legacy_prospects.sql',
    table: 'prospects',
    parent: '0073_retire_legacy_scheduled_viewings.sql',
    parentChecksum: 'e0e29c8c21c45564434833f0e84debbd4b0b8a3bedb6d15398ba91cc1ea537fc',
    checksum: 'b0d6cbab8f0ac521d478a371dab62e0e23a7c0e35f8d304a42394eb43cefed14',
  },
] as const;

describe('pre-launch legacy consumer-profile retirement', () => {
  it('registers a contiguous child-before-parent exceptional contraction', () => {
    const manifest = loadAndValidateMigrationManifest({ migrationsDirectory: migrationRoot });
    const entries = retirement.map(item =>
      manifest.orderedMigrations.find(entry => entry.filename === item.filename),
    );

    expect(entries).toHaveLength(retirement.length);
    entries.forEach((entry, index) => {
      const expected = retirement[index];
      expect(entry).toMatchObject({
        sequence: expected.sequence,
        parent: expected.parent,
        parentChecksum: expected.parentChecksum,
        checksum: expected.checksum,
        kind: 'exceptional',
        statementPolicy: 'approved-exception',
        approvalReference: 'DBX-PRELAUNCH-LEGACY-CONSUMER-PROFILE-RETIREMENT-2026-09-09-Edward',
      });
    });
    expect(manifest.expectedHead.filename).toBe('0076_lead_delivery_relational_authority.sql');
    expect(manifest.expectedHead.parent).toBe('0075_recently_viewed_microsecond_recency.sql');
  });

  it('drops exactly one explicitly named legacy table per migration', () => {
    retirement.forEach(item => {
      const sql = readFileSync(resolve(migrationRoot, item.filename), 'utf8');
      expect(parseSqlStatements(sql)).toEqual([
        'DROP TABLE ' + String.fromCharCode(96) + item.table + String.fromCharCode(96),
      ]);
    });
  });

  it('leaves one canonical model for each replacement workflow', () => {
    const leadsSchema = readFileSync(resolve('drizzle/schema/leads.ts'), 'utf8');
    const databaseModule = readFileSync(resolve('server/db.ts'), 'utf8');

    expect(leadsSchema).toContain('export const prospectIdentities');
    expect(leadsSchema).toContain('export const recentlyViewed');
    expect(leadsSchema).toContain('export const showings');
    expect(leadsSchema).not.toMatch(/export const prospects\s*=/);
    expect(leadsSchema).not.toMatch(/export const prospectFavorites\s*=/);
    expect(leadsSchema).not.toMatch(/export const scheduledViewings\s*=/);

    expect(databaseModule).toContain('recordUserListingViewFact');
    expect(databaseModule).toContain('setUserFavoriteFact');
    expect(databaseModule).not.toMatch(/export async function (createProspect|updateProspect|getProspect|addProspectFavorite|removeProspectFavorite|getProspectFavorites|scheduleViewing|getScheduledViewings|updateViewingStatus|updateProspectProgress|earnBadge|getRecommendedProperties)\b/);
    expect(existsSync(resolve('drizzle/relations.ts'))).toBe(false);
  });
});
