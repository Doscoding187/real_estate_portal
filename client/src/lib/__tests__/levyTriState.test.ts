import { beforeEach, describe, expect, it } from 'vitest';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { buildDevelopmentSubmitPayload } from '../developmentSubmitPayload';
import { levyChoiceOf, levyPatch } from '../wizardLocationCostsAmenities';

const store = () => useDevelopmentWizard.getState();

const base = {
  name: 'Estate',
  description: 'A description that is long enough to be a real description of the estate.',
  developmentType: 'residential',
  transactionType: 'for_sale',
  ownershipTypes: ['full-title'],
  unitTypes: [],
};

const payloadFor = (governance: Record<string, unknown>) =>
  buildDevelopmentSubmitPayload({
    wizardData: { ...base, ...governance } as any,
    amenities: [],
    residentialConfig: { residentialType: 'freehold', communityTypes: [] } as any,
    fallbackOwnershipType: 'full-title',
  }) as any;

describe('the levy answer is tri-state end to end', () => {
  beforeEach(() => store().reset());

  it('an existing development with no levy answer opens as unanswered, never "No levy"', () => {
    store().hydrateDevelopment({ id: 9, name: 'Existing', estateSpecs: JSON.stringify({ setting: 'estate' }) });
    const governance = store().stepData.governance_finances as any;
    expect(governance.hasGoverningBody).toBeUndefined();
    expect(levyChoiceOf(governance)).toBeNull();
  });

  it('an older record whose hasHOA defaulted to false (no stored choice) also opens as unanswered', () => {
    store().hydrateDevelopment({ id: 9, name: 'Existing', estateSpecs: JSON.stringify({ hasHOA: false }) });
    expect(levyChoiceOf(store().stepData.governance_finances as any)).toBeNull();
  });

  it('an explicit levy choice survives save and reopen', () => {
    for (const choice of ['hoa', 'body_corporate', 'none'] as const) {
      const patch = levyPatch(choice, choice === 'none' ? 0 : 1500);
      const payload = payloadFor(patch);
      expect(payload.estateSpecs.levyChoice).toBe(choice);
      store().reset();
      store().hydrateDevelopment({ id: 9, name: 'Existing', estateSpecs: JSON.stringify(payload.estateSpecs) });
      expect(levyChoiceOf(store().stepData.governance_finances as any)).toBe(choice);
    }
  });

  it('nothing is sent about the levy when it was not answered', () => {
    const payload = payloadFor({});
    expect(payload.estateSpecs?.hasHOA).toBeUndefined();
    expect(payload.estateSpecs?.levyChoice).toBeUndefined();
  });
});
