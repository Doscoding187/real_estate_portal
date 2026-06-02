import { describe, expect, it } from 'vitest';
import {
  getCanonicalDevelopmentEditTargetId,
  toCanonicalPositiveInteger,
} from '../../shared/developmentCanonicalSelectors';

describe('development canonical selectors', () => {
  it('normalizes positive integer ids without accepting invalid edit targets', () => {
    expect(toCanonicalPositiveInteger('42')).toBe(42);
    expect(toCanonicalPositiveInteger(42.9)).toBe(42);
    expect(toCanonicalPositiveInteger(0)).toBeUndefined();
    expect(toCanonicalPositiveInteger(-1)).toBeUndefined();
    expect(toCanonicalPositiveInteger('not-an-id')).toBeUndefined();
  });

  it('resolves edit target aliases with canonical fields first', () => {
    expect(
      getCanonicalDevelopmentEditTargetId({
        editingId: '101',
        developmentId: 202,
        existingDevelopmentId: 303,
        id: 404,
      }),
    ).toBe(101);
    expect(getCanonicalDevelopmentEditTargetId({ developmentId: '202', id: 404 })).toBe(202);
    expect(getCanonicalDevelopmentEditTargetId({ existingDevelopmentId: '303', id: 404 })).toBe(
      303,
    );
    expect(getCanonicalDevelopmentEditTargetId({ id: '404' })).toBe(404);
    expect(getCanonicalDevelopmentEditTargetId({ editingId: 0, developmentId: null })).toBe(
      undefined,
    );
  });
});
