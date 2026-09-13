import { describe, expect, it } from 'vitest';
import { check, foreignKey, int, mysqlTable } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import * as canonical from '../../../../drizzle/schema';
import { normalizedDesiredSchema } from '../schemaCongruency';
import {
  auditTidbStructuralAdmission,
  assertTidbStructuralAdmission,
} from '../tidbStructuralAdmission';

describe('TiDB CHECK/FK structural admission', () => {
  const parent = mysqlTable('parent', { id: int('id').primaryKey() });
  it('detects the real canonical cascade conflict and every CHECK without mutating schema', () => {
    const desired = normalizedDesiredSchema(canonical);
    const before = JSON.stringify(desired);
    const report = auditTidbStructuralAdmission(desired);
    expect(report.checks).toHaveLength(23);
    expect(report.foreignKeyImpacts).toHaveLength(15);
    expect(
      report.foreignKeyImpacts.filter(key => key.review === 'domain-lifecycle-decision-required'),
    ).toHaveLength(5);
    expect(report.foreignKeyImpacts.some(key => key.columns.includes('verified_by_actor_id'))).toBe(
      false,
    );
    expect(
      report.foreignKeyImpacts.find(
        key =>
          key.tableName === 'development_supersessions' &&
          key.columns.includes('activated_by_actor_id'),
      )?.requiredByChecks,
    ).toEqual([
      'chk_development_supersessions_activation_triplet',
      'chk_development_supersessions_active_shape',
      'chk_development_supersessions_verified_shape',
    ]);
    expect(report.admitted).toBe(false);
    expect(report.checks.find(check => check.tableName === 'land_claims')?.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          onDelete: 'cascade',
          review: 'domain-lifecycle-decision-required',
        }),
      ]),
    );
    expect(() => assertTidbStructuralAdmission(desired)).toThrow(
      'TiDB structural admission refused',
    );
    expect(JSON.stringify(desired)).toBe(before);
  });
  it('requires provenance even for NO ACTION and RESTRICT metadata', () => {
    const child = mysqlTable('child', { id: int('id'), parentId: int('parent_id') }, table => [
      foreignKey({ columns: [table.parentId], foreignColumns: [parent.id] }),
      check('valid_parent', sql`${table.parentId} > 0`),
    ]);
    const report = auditTidbStructuralAdmission(normalizedDesiredSchema({ parent, child }));
    expect(report.checks[0].dependencies[0].review).toBe('ddl-action-provenance-required');
    expect(report.admitted).toBe(false);
  });
  it('does not mistake a string literal for a CHECK dependency', () => {
    const child = mysqlTable('child', { id: int('id'), parentId: int('parent_id') }, table => [
      foreignKey({ columns: [table.parentId], foreignColumns: [parent.id] }).onDelete('cascade'),
      check('valid_id', sql`${table.id} > 0 AND 'parent_id' <> 'a'`),
    ]);
    expect(auditTidbStructuralAdmission(normalizedDesiredSchema({ parent, child })).admitted).toBe(
      true,
    );
  });
});
