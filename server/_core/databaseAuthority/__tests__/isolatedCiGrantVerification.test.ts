import { describe, expect, it } from 'vitest';
import { assertIsolatedCiGrants } from '../isolatedCiGrantVerification';

const expected = ["GRANT SELECT, UPDATE ON `listify_test`.`users` TO 'listify_ci_app'@'%'"];
const actual = [
  'GRANT USAGE ON *.* TO `listify_ci_app`@`%`',
  'GRANT UPDATE, SELECT ON `listify_test`.`users` TO `listify_ci_app`@`%`',
];
describe('isolated CI semantic grant admission', () => {
  it('accepts equivalent ordering and account quoting with harmless USAGE', () => {
    expect(assertIsolatedCiGrants(actual, expected, 'listify_ci_app')).toMatch(/^[a-f0-9]{64}$/);
  });
  it.each([
    'GRANT DELETE ON `listify_test`.`users` TO `listify_ci_app`@`%`',
    'GRANT UPDATE ON `listify_test`.* TO `listify_ci_app`@`%`',
    'GRANT UPDATE ON `listify_test`.`sql_migration_history` TO `listify_ci_app`@`%`',
    'GRANT CREATE USER ON *.* TO `listify_ci_app`@`%`',
    'GRANT SELECT ON `listify_test`.`users` TO `listify_ci_app`@`%` WITH GRANT OPTION',
    'GRANT `administrator`@`%` TO `listify_ci_app`@`%`',
    'GRANT SELECT ON `listify_test`.`users` TO `wrong_user`@`%`',
    'GRANT SELECT (`id`) ON `listify_test`.`users` TO `listify_ci_app`@`%`',
  ])('rejects extra or unsupported authority: %s', extra => {
    expect(() => assertIsolatedCiGrants([...actual, extra], expected, 'listify_ci_app')).toThrow();
  });
  it('rejects missing required privileges', () => {
    expect(() => assertIsolatedCiGrants([actual[0]], expected, 'listify_ci_app')).toThrow();
  });
});
