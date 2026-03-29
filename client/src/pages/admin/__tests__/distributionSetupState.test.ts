import { describe, expect, it } from 'vitest';

import {
  getPartnerDevelopmentSetupDescription,
  getPartnerDevelopmentSetupLabel,
  getPartnerDevelopmentSetupState,
  isDevelopmentBrandLinked,
} from '../distributionSetupState';

describe('distribution setup state helpers', () => {
  it('marks unlinked developments as needing a brand link', () => {
    const state = getPartnerDevelopmentSetupState(
      {
        developmentId: 11,
        brandProfileId: null,
        marketingBrandProfileId: null,
      },
      new Map(),
    );

    expect(state).toBe('needs_brand_link');
    expect(isDevelopmentBrandLinked({ brandProfileId: null, marketingBrandProfileId: null })).toBe(
      false,
    );
    expect(getPartnerDevelopmentSetupLabel(state)).toBe('Needs Brand Link');
  });

  it('marks linked developments without a program as ready to add', () => {
    const state = getPartnerDevelopmentSetupState(
      {
        developmentId: 12,
        brandProfileId: 8,
        marketingBrandProfileId: null,
      },
      new Map(),
    );

    expect(state).toBe('ready_to_add');
    expect(getPartnerDevelopmentSetupDescription(state)).toContain('can now be added');
  });

  it('marks developments with an existing program as already added', () => {
    const programMap = new Map<number, unknown>([[13, { id: 99 }]]);
    const state = getPartnerDevelopmentSetupState(
      {
        developmentId: 13,
        brandProfileId: 8,
      },
      programMap,
    );

    expect(state).toBe('already_in_partner_developments');
    expect(getPartnerDevelopmentSetupLabel(state)).toBe('Already in Partner Developments');
  });
});
