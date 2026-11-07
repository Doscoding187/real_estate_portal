import { describe, expect, it } from 'vitest';
import { LEGAL_RUNTIME_GRANT_DIGEST } from '../authorization';
import { legalRuntimeGrantPlan } from '../legalRuntimeGrantPlan';

const GRANTS = [
  "GRANT SELECT ON `propertylistify_database`.`legal_releases` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT ON `propertylistify_database`.`legal_active_release` TO 'propertylistify_app_runtime'@'%'",
  "GRANT SELECT, INSERT ON `propertylistify_database`.`user_legal_acceptances` TO 'propertylistify_app_runtime'@'%'",
];

describe('offline legal runtime grant delta', () => {
  it('emits exactly three GRANT and three mirrored REVOKE statements with no predecessor list', () => {
    const plan = legalRuntimeGrantPlan();
    expect(plan.statements).toEqual(GRANTS);
    expect(plan.rollbackStatements).toEqual(
      GRANTS.map(statement => statement.replace(/^GRANT /, 'REVOKE ').replace(' TO ', ' FROM ')),
    );
    expect(plan.plannedPrivileges).toEqual([
      '`propertylistify_database`.`legal_active_release`:SELECT',
      '`propertylistify_database`.`legal_releases`:SELECT',
      '`propertylistify_database`.`user_legal_acceptances`:INSERT',
      '`propertylistify_database`.`user_legal_acceptances`:SELECT',
    ]);
    expect(Object.keys(plan)).not.toContain('before');
    expect(Object.keys(plan)).not.toContain('after');
    for (const statement of [...plan.statements, ...plan.rollbackStatements]) {
      expect(statement).not.toMatch(/GRANT OPTION|\*|ALL PRIVILEGES|@'(?!%')/);
    }
  });

  it('pins the reviewed plan digest', () => {
    expect(legalRuntimeGrantPlan().planDigest).toBe(LEGAL_RUNTIME_GRANT_DIGEST);
  });
});
