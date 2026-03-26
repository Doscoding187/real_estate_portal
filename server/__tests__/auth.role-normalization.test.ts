import { describe, expect, it } from 'vitest';
import { normalizeAuthRole } from '../_core/auth';

describe('normalizeAuthRole', () => {
  it('maps legacy roles to canonical roles', () => {
    expect(normalizeAuthRole('admin')).toBe('super_admin');
    expect(normalizeAuthRole('user')).toBe('visitor');
  });

  it('keeps canonical roles unchanged', () => {
    expect(normalizeAuthRole('super_admin')).toBe('super_admin');
    expect(normalizeAuthRole('agency_admin')).toBe('agency_admin');
    expect(normalizeAuthRole('agent')).toBe('agent');
    expect(normalizeAuthRole('property_developer')).toBe('property_developer');
    expect(normalizeAuthRole('visitor')).toBe('visitor');
  });
});
