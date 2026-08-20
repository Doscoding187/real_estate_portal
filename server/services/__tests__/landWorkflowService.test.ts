import { describe, expect, it } from 'vitest';
import { calculateLandReadiness, isLandAuthorRole, isLandReviewerRole } from '../landWorkflowService';

const ready = (overrides: Partial<Parameters<typeof calculateLandReadiness>[0]> = {}) => calculateLandReadiness({
  listing: { askingPrice: '950000', city: 'Pretoria', province: 'Gauteng', title: 'Serviced residential stand', description: 'A well-located serviced residential stand ready for a buyer.' },
  asset: { classification: 'residential_stand' },
  parcels: [{ extentM2: '600', provinceId: 1, cityId: 2 }],
  authority: { actorType: 'agent', supportingEvidenceId: 9 },
  evidenceCount: 1,
  mediaCount: 1,
  caseState: 'approved',
  hasHighConflict: false,
  assertions: [],
  ...overrides,
});

describe('Land workflow readiness authority', () => {
  it('keeps draft, submission and publication thresholds distinct', () => {
    const result = ready({ caseState: 'pending' });
    expect(result.draftComplete).toBe(true);
    expect(result.submissionReady).toBe(true);
    expect(result.publicationEligible).toBe(false);
    expect(result.blockers.publication).toEqual(['land_review_approval']);
  });

  it('requires marketing evidence for a non-owner authority without calling it verified', () => {
    const result = ready({ authority: { actorType: 'agent', supportingEvidenceId: null }, evidenceCount: 0 });
    expect(result.submissionReady).toBe(false);
    expect(result.blockers.submission).toContain('marketing_authority_evidence');
  });

  it('blocks public eligibility for an unresolved local high-severity conflict', () => {
    const result = ready({ hasHighConflict: true });
    expect(result.publicationEligible).toBe(false);
    expect(result.blockers.publication).toContain('unresolved_high_severity_conflict');
  });

  it('keeps expired and contradicted critical assertions visible as attention, not a generic verified flag', () => {
    const result = ready({ assertions: [{ claimCode: 'zoning_land_use', status: 'contradicted', expiresAt: null, recheckDueAt: null }] });
    expect(result.publicationEligible).toBe(false);
    expect(result.blockers.publication).toContain('critical_verification_attention');
  });

  it('blocks publication when a persisted critical assertion timestamp is expired', () => {
    const result = ready({ assertions: [{ claimCode: 'zoning_land_use', status: 'verified', expiresAt: '2026-08-19 00:00:00', recheckDueAt: null }] });
    expect(result.publicationEligible).toBe(false);
    expect(result.blockers.publication).toContain('critical_verification_attention');
  });

  it('separates author and reviewer authority', () => {
    expect(isLandAuthorRole('agent')).toBe(true);
    expect(isLandAuthorRole('property_developer')).toBe(true);
    expect(isLandAuthorRole('developer')).toBe(false);
    expect(isLandAuthorRole('viewer')).toBe(false);
    expect(isLandReviewerRole('agent')).toBe(false);
    expect(isLandReviewerRole('super_admin')).toBe(true);
  });
});
