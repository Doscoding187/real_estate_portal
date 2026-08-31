import { describe, expect, it } from 'vitest';
import { toProspectSafeLeadStatus, toProspectSafeViewingStatus } from '../prospectJourneyRouter';
import {
  normalizeProspectSourceType,
  recordProspectLeadAction,
} from '../services/prospectJourneyService';

describe('Prospect Journey status contract', () => {
  it('translates agency lead states without returning the agency state', () => {
    expect(toProspectSafeLeadStatus('qualified')).toEqual({
      code: 'requirements_confirmed',
      label: 'Requirements confirmed',
      nextAction: 'Continue with the agency',
    });
    expect(toProspectSafeLeadStatus('lost')).toEqual({
      code: 'journey_closed',
      label: 'Journey closed',
      nextAction: null,
    });
  });

  it('does not promise a confirmed viewing until the showing is confirmed', () => {
    expect(toProspectSafeViewingStatus('requested').label).toBe('Viewing requested');
    expect(toProspectSafeViewingStatus('awaiting_confirmation').label).toBe('Viewing requested');
    expect(toProspectSafeViewingStatus('confirmed').label).toBe('Viewing confirmed');
    expect(toProspectSafeViewingStatus('no_show').label).toBe('Viewing no longer active');
  });

  it('fails unknown states closed to neutral prospect-safe language', () => {
    expect(toProspectSafeLeadStatus('internal_rejected')).toEqual({
      code: 'enquiry_sent',
      label: 'Enquiry received',
      nextAction: 'Wait for the agency to respond',
    });
  });

  it('accepts only public attribution surfaces', () => {
    expect(normalizeProspectSourceType('property-page')).toBe('property_detail');
    expect(normalizeProspectSourceType('sponsored_placement')).toBe('sponsored_placement');
    expect(normalizeProspectSourceType('agency_internal_campaign')).toBe('web');
  });

  it('keeps a capture-owned identity instead of issuing a later lead update', async () => {
    let leadUpdateAttempted = false;
    let attribution: Record<string, unknown> | null = null;
    const database = {
      update: () => {
        leadUpdateAttempted = true;
        throw new Error('capture-owned identity must not be updated again');
      },
      insert: () => ({
        values: async (value: Record<string, unknown>) => {
          attribution = value;
        },
      }),
    };

    await recordProspectLeadAction({
      db: database,
      leadId: 42,
      prospectIdentityId: 'prospect-identity-001',
      source: 'property_detail',
      propertyId: 99,
    });

    expect(leadUpdateAttempted).toBe(false);
    expect(attribution).toMatchObject({
      leadId: 42,
      sourceType: 'property_detail',
      sourceEntityId: 'property:99',
    });
  });
});
