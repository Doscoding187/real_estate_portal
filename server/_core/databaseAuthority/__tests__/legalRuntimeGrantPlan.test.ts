import { describe, expect, it } from 'vitest';
import { legalRuntimeGrantPlan } from '../legalRuntimeGrantPlan';
import { CANONICAL_PLACE_RUNTIME_GRANT_DIGEST } from '../authorization';

describe('Offline B15 runtime grant delta', () => {
  it('extends the reviewed prior footprint by exactly three restricted grants', () => {
    const plan = legalRuntimeGrantPlan();
    expect(plan.executionState).toBe('prepared_not_applied');
    expect(plan.previousGrantDigest).toBe(CANONICAL_PLACE_RUNTIME_GRANT_DIGEST);
    expect(plan.statements).toHaveLength(3);
    expect(plan.statements.every(s => !/UPDATE|DELETE|ALL|WITH GRANT/.test(s))).toBe(true);
    expect(plan.statements.filter(s => s.includes('INSERT'))).toHaveLength(1);
    expect(plan.statements.find(s => s.includes('INSERT'))).toContain('user_legal_acceptances');
    expect(plan).toEqual(legalRuntimeGrantPlan());
  });
});
