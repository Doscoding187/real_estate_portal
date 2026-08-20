import { describe, expect, it } from 'vitest';
import { buildLandPassport } from '../landDomainService';
import { LAND_CLASSIFICATIONS, deriveLandTrustState } from '../../../shared/land-domain';
import {
  landAssertionEvidence,
  landAssets,
  landClaims,
  landEvidenceDocuments,
  landListingLinks,
  landMarketingAuthorities,
  landParcels,
  landVerificationAssertions,
  landVerificationEvents,
} from '../../../drizzle/schema';

describe('buildLandPassport', () => {
  it('does not issue a Passport when marketing authority is absent', () => {
    expect(buildLandPassport({
      marketingAuthorityActive: false,
      hasHighSeverityOpenConflict: false,
      assertions: [],
    })).toBeNull();
  });

  it('keeps durable parcel, asset, listing, claim and evidence authorities distinct', () => {
    expect(landParcels[Symbol.for('drizzle:Name')]).toBe('land_parcels');
    expect(landAssets[Symbol.for('drizzle:Name')]).toBe('land_assets');
    expect(landListingLinks[Symbol.for('drizzle:Name')]).toBe('land_listing_links');
    expect(landClaims[Symbol.for('drizzle:Name')]).toBe('land_claims');
    expect(landEvidenceDocuments[Symbol.for('drizzle:Name')]).toBe('land_evidence_documents');
    expect(landMarketingAuthorities[Symbol.for('drizzle:Name')]).toBe('land_marketing_authorities');
    expect(landVerificationAssertions[Symbol.for('drizzle:Name')]).toBe('land_verification_assertions');
    expect(landAssertionEvidence[Symbol.for('drizzle:Name')]).toBe('land_assertion_evidence');
    expect(landVerificationEvents[Symbol.for('drizzle:Name')]).toBe('land_verification_events');
    expect(LAND_CLASSIFICATIONS).not.toContain('plot');
    expect(LAND_CLASSIFICATIONS).not.toContain('land');
  });

  it('keeps seller claims and verification conclusions separate and handles expiry', () => {
    const assertion = {
      claimCode: 'water' as const, status: 'verified' as const,
      publicConclusion: 'Connection evidence reviewed.', limitations: 'Capacity is not assessed.',
      sourceProvider: 'Municipality', verifierType: 'authoritative_source', verifierName: null,
      checkedAt: new Date('2026-08-01'), recheckDueAt: null, expiresAt: new Date('2026-08-19'),
    };
    expect(deriveLandTrustState({
      marketingAuthorityActive: true, hasHighSeverityOpenConflict: false,
      assertions: [assertion], now: new Date('2026-08-20'),
    })).toBe('passport_attention_required');
    expect(JSON.stringify(buildLandPassport({
      marketingAuthorityActive: true, hasHighSeverityOpenConflict: false, assertions: [assertion],
    }))).not.toContain('privateStorageKey');
  });
});
