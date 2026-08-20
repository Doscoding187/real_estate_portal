import { describe, expect, it } from 'vitest';

import {
  LAND_CLASSIFICATIONS,
  deriveLandTrustState,
  toPublicLandPassportAssertions,
} from '../land-domain';

describe('Land domain foundation', () => {
  it('keeps Land classification out of the generic property-type vocabulary', () => {
    expect(LAND_CLASSIFICATIONS).toEqual([
      'residential_stand', 'development_land', 'commercial_industrial_land',
      'agricultural_vacant_land', 'smallholding', 'farm', 'other_land',
    ]);
  });

  it('derives Passport trust from authority, assertions, freshness and conflicts', () => {
    const verified = {
      claimCode: 'water' as const, status: 'verified' as const, publicConclusion: 'Water connection evidenced.',
      limitations: 'Connection capacity was not assessed.', sourceProvider: 'Municipality',
      verifierType: 'authoritative_source', verifierName: null, checkedAt: new Date('2026-08-01'),
      recheckDueAt: new Date('2027-08-01'), expiresAt: null,
    };
    expect(deriveLandTrustState({ marketingAuthorityActive: true, hasHighSeverityOpenConflict: false, assertions: [verified], now: new Date('2026-08-20') })).toBe('passport_checked');
    expect(deriveLandTrustState({ marketingAuthorityActive: true, hasHighSeverityOpenConflict: false, assertions: [{ ...verified, status: 'asserted' }], now: new Date('2026-08-20') })).toBe('listed_with_disclosures');
    expect(deriveLandTrustState({ marketingAuthorityActive: true, hasHighSeverityOpenConflict: false, assertions: [{ ...verified, recheckDueAt: new Date('2026-08-19') }], now: new Date('2026-08-20') })).toBe('passport_attention_required');
    expect(deriveLandTrustState({ marketingAuthorityActive: true, hasHighSeverityOpenConflict: true, assertions: [verified] })).toBeNull();
  });

  it('treats persisted string timestamps as expired verification evidence', () => {
    const assertion = {
      claimCode: 'zoning_land_use' as const, status: 'verified' as const,
      publicConclusion: null, limitations: null, sourceProvider: null,
      verifierType: 'property_listify_review', verifierName: null, checkedAt: null,
      recheckDueAt: null, expiresAt: '2026-08-19 00:00:00',
    };
    expect(deriveLandTrustState({
      marketingAuthorityActive: true,
      hasHighSeverityOpenConflict: false,
      assertions: [assertion],
      now: new Date('2026-08-20T00:00:00Z'),
    })).toBe('passport_attention_required');
  });

  it('publishes claim conclusions without a path to private evidence custody', () => {
    const publicAssertions = toPublicLandPassportAssertions([{
      claimCode: 'zoning_land_use', status: 'contradicted', publicConclusion: 'The supplied zoning claim could not be confirmed.',
      limitations: 'Seek independent planning advice.', sourceProvider: 'Planning record', verifierType: 'planner',
      verifierName: 'Named planner', checkedAt: new Date('2026-08-01'), recheckDueAt: null, expiresAt: null,
    }]);
    const serialized = JSON.stringify(publicAssertions);
    expect(serialized).not.toContain('privateStorageKey');
    expect(serialized).not.toContain('evidenceDocumentId');
    expect(serialized).not.toContain('title_registry');
  });
});
