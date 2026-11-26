import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as schema from '../../../../drizzle/schema';
import { normalizedDesiredSchema } from '../schemaCongruency';
import {
  RUNTIME_GRANT_0197_TABLES,
  runtimeGrant0197Plan,
} from '../runtimeGrant0197Plan';

describe('0197 runtime grant plan', () => {
  it('pins the complete 0197 inventory and emits only the 15 uncovered table grants', () => {
    const plan = runtimeGrant0197Plan();

    expect(plan).toMatchObject({
      expectedHead: '0197_drop_seller_prospects_province.sql',
      expectedMigrationCount: 198,
      manifestDigest: '4995e36715e60856bb87d925dd0eff03bcdccfcc50e1180648684c3bd2787e41',
      expectedTableCount: 225,
      expectedModelDigest: '869f441f3131b0f1bf4b56d416d049292bb48204918f8172d3699625c3208da7',
      applyAuthority: 'none',
    });
    expect(RUNTIME_GRANT_0197_TABLES).toHaveLength(15);
    expect(plan.grants).toHaveLength(15);
    expect(plan.revokes).toHaveLength(15);
    expect(plan.grants).toContain(
      "GRANT SELECT ON `propertylistify_database`.`development_inventory_items` TO 'propertylistify_app_runtime'@'%'",
    );
    expect(plan.grants).toContain(
      "GRANT SELECT, INSERT, UPDATE ON `propertylistify_database`.`development_place_assignments` TO 'propertylistify_app_runtime'@'%'",
    );
    expect(plan.grants).toContain(
      "GRANT SELECT, INSERT, DELETE ON `propertylistify_database`.`distribution_prospect_check_fit_matches` TO 'propertylistify_app_runtime'@'%'",
    );
    expect(plan.revokes).toContain(
      "REVOKE SELECT ON `propertylistify_database`.`development_inventory_items` FROM 'propertylistify_app_runtime'@'%'",
    );
    expect(plan.revokes.every(statement => !statement.includes('GRANT OPTION'))).toBe(true);
    expect(plan.broadGrantNote).toMatch(/Re-derive/);
    expect(plan.planDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it('keeps the approved 0197 planDigest bit-identical now that the tree head is 0200', () => {
    // Baseline computed from the module at commit 6938b9292 (tree head 0197).
    expect(runtimeGrant0197Plan().planDigest).toBe(
      '9cf929641b0f0c4a4b7441e1319656a520c4cc9a37913f85759ea0617e29e3ca',
    );
  });

  it('refuses when a granted table definition differs from its 0197 structure', () => {
    const live = normalizedDesiredSchema(schema).tables as Array<{
      name: string;
      columns: Array<{ name: string; type: string }>;
    }>;
    const granted = RUNTIME_GRANT_0197_TABLES[1].table;
    expect(() => runtimeGrant0197Plan(process.cwd(), { desiredTables: live })).not.toThrow();
    const tampered = live.map(table =>
      table.name === granted
        ? { ...table, columns: [...table.columns, { name: 'extra', type: 'int' }] }
        : table,
    );
    expect(() => runtimeGrant0197Plan(process.cwd(), { desiredTables: tampered })).toThrow(
      'migration lineage or table inventory changed',
    );
    // Unrelated tables (e.g. the 0198 column additions) do not matter.
    const unrelated = live.map(table =>
      table.name === 'service_provider_profiles'
        ? { ...table, columns: [...table.columns, { name: 'extra', type: 'int' }] }
        : table,
    );
    expect(() => runtimeGrant0197Plan(process.cwd(), { desiredTables: unrelated })).not.toThrow();
  });

  it('refuses when the 0197 table inventory is altered', () => {
    const root = mkdtempSync(join(tmpdir(), 'listify-0197-plan-'));
    try {
      cpSync(join(process.cwd(), 'server/migrations'), join(root, 'server/migrations'), {
        recursive: true,
      });
      mkdirSync(join(root, 'drizzle/schema'), { recursive: true });
      const inventory = JSON.parse(
        readFileSync(join(process.cwd(), 'drizzle/schema/canonical-model-inventory.json'), 'utf8'),
      );
      writeFileSync(
        join(root, 'drizzle/schema/canonical-model-inventory.json'),
        JSON.stringify({
          ...inventory,
          tables: inventory.tables.slice(1),
          tableCount: inventory.tables.length - 1,
        }),
      );
      expect(() => runtimeGrant0197Plan(root)).toThrow(
        'migration lineage or table inventory changed',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('documents an evidenced call site or an explicit no-call-site finding for every table', () => {
    expect(RUNTIME_GRANT_0197_TABLES.every(table => table.callSites.length > 0)).toBe(true);
    expect(RUNTIME_GRANT_0197_TABLES.find(t => t.table === 'development_inventory_items')?.callSites).toEqual(
      ['drizzle/schema/developments.ts:850 (table declaration; no runtime call site found)'],
    );
  });
});
