import { describe, expect, it } from 'vitest';
import {
  ACTIVE_MANUAL_PROPERTY_TYPES,
  BUY_PUBLIC_PROPERTY_TYPES,
  RENT_PUBLIC_PROPERTY_TYPES,
  getAuthorablePropertyTypes,
  getListingAuthoringValidationMessage,
  PROPERTY_TYPE_DEFINITIONS,
  PROPERTY_TYPE_TEMPLATES,
  toPublicPropertyType,
} from '../../shared/property-taxonomy';

describe('canonical manual property taxonomy', () => {
  it('keeps active authoring types unique and intent-compatible', () => {
    expect(new Set(ACTIVE_MANUAL_PROPERTY_TYPES).size).toBe(ACTIVE_MANUAL_PROPERTY_TYPES.length);
    expect(getAuthorablePropertyTypes('sale')).toEqual([...ACTIVE_MANUAL_PROPERTY_TYPES]);
    expect(getAuthorablePropertyTypes('rent')).toEqual([...ACTIVE_MANUAL_PROPERTY_TYPES]);
    expect(getAuthorablePropertyTypes('sale')).not.toContain('shared_living');
    expect(getAuthorablePropertyTypes('sale')).not.toContain('plot');
    expect(getAuthorablePropertyTypes('rent')).not.toContain('commercial');
  });

  it('uses explicit public values and preserves legacy aliases', () => {
    expect(PROPERTY_TYPE_DEFINITIONS.land.publicType).toBe('plot');
    expect(PROPERTY_TYPE_DEFINITIONS.shared_living.authoringState).toBe('legacy');
    expect(PROPERTY_TYPE_DEFINITIONS.townhouse.publicType).toBe('townhouse');
    expect(PROPERTY_TYPE_DEFINITIONS.cluster_home.publicType).toBe('cluster_home');
    expect(BUY_PUBLIC_PROPERTY_TYPES).toEqual([
      'apartment',
      'house',
      'villa',
      'townhouse',
      'cluster_home',
      'farm',
    ]);
    expect(RENT_PUBLIC_PROPERTY_TYPES).toEqual([
      'apartment',
      'house',
      'townhouse',
      'cluster_home',
      'farm',
    ]);
    expect(
      Object.values(PROPERTY_TYPE_TEMPLATES).every(template => !('requiredFields' in template)),
    ).toBe(true);
  });

  it('rejects deferred/legacy values for new sale or rent authoring', () => {
    expect(getListingAuthoringValidationMessage('sell', 'townhouse')).toBeUndefined();
    expect(getListingAuthoringValidationMessage('rent', 'cluster_home')).toBeUndefined();
    expect(getListingAuthoringValidationMessage('sell', 'land')).toMatch(/not available/i);
    expect(getListingAuthoringValidationMessage('rent', 'shared_living')).toMatch(/not available/i);
    expect(getListingAuthoringValidationMessage('sell', 'unknown')).toMatch(/supported/i);
  });

  it('maps source values to public values without direct enum copying', () => {
    expect(toPublicPropertyType('land')).toBe('plot');
    expect(toPublicPropertyType('townhouse')).toBe('townhouse');
    expect(toPublicPropertyType('cluster_home')).toBe('cluster_home');
    expect(() => toPublicPropertyType('unknown')).toThrow(/unsupported listing property type/i);
  });
});
