import { describe, expect, it } from 'vitest';
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
    expect(RUNTIME_GRANT_0197_TABLES).toHaveLength(14);
    expect(plan.grants).toHaveLength(14);
    expect(plan.revokes).toHaveLength(14);
    expect(plan.deliberatelyUngranted).toEqual([
      {
        table: 'development_inventory_items',
        reason: 'no runtime call site (schema + migrations only)',
      },
    ]);
    expect(plan.grants.some(statement => statement.includes('development_inventory_items'))).toBe(
      false,
    );
    expect(plan.grants).toContain(
      "GRANT SELECT, INSERT, UPDATE ON `propertylistify_database`.`development_place_assignments` TO 'propertylistify_app_runtime'@'%'",
    );
    expect(plan.grants).toContain(
      "GRANT SELECT, INSERT, DELETE ON `propertylistify_database`.`distribution_prospect_check_fit_matches` TO 'propertylistify_app_runtime'@'%'",
    );
    expect(plan.revokes.every(statement => !statement.includes('GRANT OPTION'))).toBe(true);
    expect(plan.broadGrantNote).toMatch(/Re-derive/);
    expect(plan.planDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it('documents an evidenced call site or an explicit no-call-site finding for every table', () => {
    expect(RUNTIME_GRANT_0197_TABLES.every(table => table.callSites.length > 0)).toBe(true);
    expect(RUNTIME_GRANT_0197_TABLES.some(t => t.table === 'development_inventory_items')).toBe(false);
  });
});
