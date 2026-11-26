import { describe, expect, it } from 'vitest';
import {
  buildDevelopmentPartialUpdatePayload,
  buildDevelopmentSubmitPayload,
} from '../developmentSubmitPayload';
import { buildPreviewModel } from '@/components/wizard/previewModel';

const unit = {
  id: 'unit-1',
  name: '91 m² 4-bedroom house',
  bedrooms: 4,
  bathrooms: 2,
  totalUnits: 10,
  availableUnits: 8,
  reservedUnits: 0,
  priceFrom: 1930000,
  isActive: true,
};

function wizardInput(over: Record<string, unknown> = {}) {
  return {
    amenities: [],
    wizardData: {
      developmentType: 'residential',
      transactionType: 'for_sale',
      name: 'Baltimore Lifestyle Estate',
      subtitle: 'Freestanding family homes',
      tagline: 'Freestanding family homes',
      description: 'A secure estate of modern freestanding homes in North Riding, Johannesburg.',
      highlights: ['Clubhouse', 'Pool', 'Backup power'],
      status: 'selling',
      salesStage: 'off_plan',
      nature: 'phase',
      phaseLabel: 'Phase 2',
      handoverDuringConstruction: true,
      expectedFirstHandoverDate: '2027-03-01',
      completionDate: '2029-12-01',
      ownershipTypes: ['varies'],
      setting: 'estate',
      estateType: 'golf',
      location: { address: '499 Boundary Road', latitude: '-26.05', longitude: '28.0' },
      media: {},
      unitTypes: [unit],
      ...over,
    },
  } as any;
}

describe('Basics and About: submit payload mapping', () => {
  it('saves setting, estate type, stage, phase and the handover timeline in estateSpecs', () => {
    const payload = buildDevelopmentSubmitPayload(wizardInput());
    expect(payload.estateSpecs).toEqual({
      setting: 'estate',
      estateType: 'golf',
      salesStage: 'off_plan',
      phaseLabel: 'Phase 2',
      handoverInPhases: true,
      firstHandoverDate: '2027-03-01',
    });
  });

  it('sends dates through the existing columns, status as the database enum, and nature = phase', () => {
    const payload = buildDevelopmentSubmitPayload(wizardInput());
    expect(payload.status).toBe('selling');
    expect(payload.completionDate).toBe('2029-12-01');
    expect(payload.nature).toBe('phase');
    expect(payload.tagline).toBe('Freestanding family homes');
    expect(payload.highlights).toEqual(['Clubhouse', 'Pool', 'Backup power']);
  });

  it('keeps "varies" and "share-block" as the one ownership value', () => {
    expect(buildDevelopmentSubmitPayload(wizardInput()).ownershipType).toBe('varies');
    expect(
      buildDevelopmentSubmitPayload(wizardInput({ ownershipTypes: ['share-block'] })).ownershipType,
    ).toBe('share-block');
  });

  it('adds cfg tags for the setting and maps the older community type from it', () => {
    const features = buildDevelopmentSubmitPayload(wizardInput()).features;
    expect(features).toEqual(
      expect.arrayContaining([
        'cfg:setting:estate',
        'cfg:estate_type:golf',
        'cfg:comm_type:golf_estate',
      ]),
    );
    const standalone = buildDevelopmentSubmitPayload(
      wizardInput({ setting: 'standalone', estateType: undefined }),
    ).features;
    expect(standalone).toEqual(
      expect.arrayContaining(['cfg:setting:standalone', 'cfg:comm_type:non_estate']),
    );
    expect(standalone.some((tag: string) => tag.startsWith('cfg:estate_type:'))).toBe(false);
  });

  it('prefers the community types the wizard stored over the derived ones', () => {
    const payload = buildDevelopmentSubmitPayload({
      ...wizardInput(),
      residentialConfig: { communityTypes: ['golf_estate'] },
    });
    expect(
      payload.features.filter((tag: string) => tag.startsWith('cfg:comm_type:')),
    ).toEqual(['cfg:comm_type:golf_estate']);
  });

  it('omits stage and handover facts that do not apply (ready to move in, no phases)', () => {
    const ready = buildDevelopmentSubmitPayload(
      wizardInput({ salesStage: 'ready', handoverDuringConstruction: true }),
    );
    expect(ready.estateSpecs.salesStage).toBe('ready');
    expect(ready.estateSpecs).not.toHaveProperty('handoverInPhases');
    expect(ready.estateSpecs).not.toHaveProperty('firstHandoverDate');

    const soldOut = buildDevelopmentSubmitPayload(
      wizardInput({ status: 'sold-out', salesStage: null, phaseLabel: '', nature: 'new' }),
    );
    expect(soldOut.estateSpecs).not.toHaveProperty('salesStage');
    expect(soldOut.estateSpecs).not.toHaveProperty('phaseLabel');
    expect(soldOut.nature).toBe('new');
  });

  it('keeps the governance fields in estateSpecs when both are present', () => {
    const payload = buildDevelopmentSubmitPayload(
      wizardInput({ hasGoverningBody: true, governanceType: 'hoa' }),
    );
    expect(payload.estateSpecs).toMatchObject({
      hasHOA: true,
      governanceType: 'hoa',
      setting: 'estate',
    });
  });

  it('adds no estateSpecs for a development that has none of these answers', () => {
    const payload = buildDevelopmentSubmitPayload(
      wizardInput({
        setting: undefined,
        estateType: undefined,
        salesStage: undefined,
        phaseLabel: undefined,
        status: 'launching-soon',
        handoverDuringConstruction: false,
      }),
    );
    expect(payload.estateSpecs).toBeUndefined();
  });

  it('works from a saved snapshot too (setting in the configuration step, stage in the About step)', () => {
    const payload = buildDevelopmentSubmitPayload({
      amenities: [],
      wizardData: {},
      canonicalSnapshot: {
        workflowId: 'residential_sale',
        currentStepId: 'review_publish',
        completedSteps: [],
        developmentData: { developmentType: 'residential', transactionType: 'for_sale' },
        stepData: {
          configuration: { setting: 'estate', estateType: 'coastal' },
          identity_market: {
            name: 'Seaside',
            status: 'selling',
            salesStage: 'ready',
            phaseLabel: 'Phase 1',
            ownershipTypes: ['share-block'],
          },
          marketing_summary: { tagline: 'On the beach', description: 'x'.repeat(60) },
          unit_types: { unitTypes: [unit] },
        },
      },
    } as any);
    expect(payload.estateSpecs).toEqual({
      setting: 'estate',
      estateType: 'coastal',
      salesStage: 'ready',
      phaseLabel: 'Phase 1',
    });
    expect(payload.ownershipType).toBe('share-block');
    expect(payload.features).toEqual(
      expect.arrayContaining(['cfg:estate_type:coastal', 'cfg:comm_type:coastal_security_estate']),
    );
  });
});

describe('About owns the marketing fields in edit-mode partial saves', () => {
  it('a partial save from About carries tagline, description and highlights and both step slices', () => {
    const payload = buildDevelopmentPartialUpdatePayload({
      amenities: [],
      canonicalSnapshot: {
        workflowId: 'residential_sale',
        currentStepId: 'identity_market',
        completedSteps: ['configuration'],
        developmentData: { developmentType: 'residential', transactionType: 'for_sale' },
        stepData: {
          configuration: { setting: 'gated' },
          identity_market: { name: 'Seaside', status: 'launching-soon', ownershipTypes: ['full-title'] },
          marketing_summary: {
            tagline: 'On the beach',
            description: 'A description that is long enough to pass the fifty character minimum.',
            keySellingPoints: ['Beach', 'Pool', 'Gate'],
          },
        },
      },
    } as any);
    expect(payload).toMatchObject({
      name: 'Seaside',
      tagline: 'On the beach',
      highlights: ['Beach', 'Pool', 'Gate'],
    });
    expect(Object.keys(payload.stepData).sort()).toEqual(['identity_market', 'marketing_summary']);
    expect(payload).not.toHaveProperty('unitTypes');
  });
});

describe('live preview follows the new fields', () => {
  it('shows status badge, setting tag, ownership tag, tagline and the timeline line', () => {
    const model = buildPreviewModel({
      name: 'Baltimore',
      subtitle: 'Freestanding family homes',
      status: 'selling',
      salesStage: 'off_plan',
      setting: 'estate',
      estateType: 'lifestyle',
      ownershipTypes: ['varies'],
      handoverDuringConstruction: true,
      expectedFirstHandoverDate: '2027-03-01',
      completionDate: '2029-12-01',
      phaseLabel: 'Phase 2',
    });
    expect(model.statusBadge).toBe('Selling off-plan');
    expect(model.tagline).toBe('Freestanding family homes');
    expect(model.tags).toEqual(['Lifestyle estate', 'Varies by house type']);
    expect(model.timelineLine).toBe(
      'First homes handed over from Mar 2027 · final completion Dec 2029',
    );
    expect(model.phaseLabel).toBe('Phase 2');
  });

  it('shows Ready to move in with no timeline, and Launching with the month', () => {
    expect(buildPreviewModel({ status: 'selling', salesStage: 'ready' })).toMatchObject({
      statusBadge: 'Ready to move in',
      timelineLine: null,
    });
    expect(
      buildPreviewModel({ status: 'launching-soon', launchDate: '2027-02-01' }),
    ).toMatchObject({ statusBadge: 'Launching soon', timelineLine: 'Launching Feb 2027' });
    expect(buildPreviewModel({ setting: 'estate', estateType: 'standard' }).tags).toEqual([
      'Security estate',
    ]);
    expect(buildPreviewModel({ setting: 'gated' }).tags).toEqual(['Gated community']);
  });
});
