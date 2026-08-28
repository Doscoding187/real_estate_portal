import { describe, expect, it } from 'vitest';
import {
  getPropertyBuyerChecklist,
  getPropertyFeaturesContextGroups,
} from '@/lib/property/publicPropertyNormalizer';

const property = {
  id: 42,
  listingType: 'rent',
  propertyType: 'apartment',
  propertyDetails: {
    featuresContext: {
      version: 1,
      spaces: ['study_office', 'laundry_room'],
      context: { setting: 'complex', controlledAccess: 'controlled' },
      utilities: {
        backupPower: 'none',
        internetAccess: 'fibre',
      },
      security: { status: 'known', features: ['cctv'] },
      petPolicy: 'allowed_with_permission',
      highlights: ['natural_light'],
      customFeatures: ['Sunroom'],
      customHighlights: ['Quiet cul-de-sac'],
    },
  },
};

describe('public Features & Context normalization', () => {
  it('renders canonical values in separate consumer sections', () => {
    const groups = getPropertyFeaturesContextGroups(property);

    expect(groups.map(group => group.key)).toEqual([
      'spaces',
      'context',
      'utilities',
      'security',
      'highlights',
    ]);
    expect(groups.find(group => group.key === 'spaces')?.items.map(item => item.label)).toEqual([
      'Study / office',
      'Laundry room',
      'Sunroom',
    ]);
    expect(groups.find(group => group.key === 'highlights')?.items[0].source).toBe('highlight');
    expect(groups.find(group => group.key === 'highlights')?.items.map(item => item.label)).toEqual(
      ['Natural light', 'Quiet cul-de-sac'],
    );
    expect(groups.find(group => group.key === 'highlights')?.items[1].source).toBe('custom');
  });

  it('does not manufacture ownership, security-estate or pet defaults', () => {
    const checklist = getPropertyBuyerChecklist({
      id: 43,
      listingType: 'sale',
      propertyType: 'house',
      propertyDetails: {
        featuresContext: {
          version: 1,
          spaces: [],
          context: {},
          utilities: {},
          security: { status: 'unknown', features: [] },
          highlights: [],
          customFeatures: [],
          customHighlights: [],
        },
      },
    });

    expect(checklist.find(item => item.key === 'pet-policy')).toBeUndefined();
    expect(checklist.find(item => item.key === 'security')?.status).toBe('missing');
    expect(checklist.find(item => item.key === 'ownership-type')?.value).toBe('To confirm');
  });

  it('shows direct security-setting and sewerage answers without inferring either one', () => {
    const groups = getPropertyFeaturesContextGroups({
      id: 44,
      propertyDetails: {
        featuresContext: {
          version: 1,
          spaces: [],
          context: { securityProfile: 'security_estate' },
          utilities: { wastewaterSystem: 'septic_tank' },
          security: { status: 'unknown', features: [] },
          highlights: [],
          customFeatures: [],
          customHighlights: [],
        },
      },
    });

    expect(groups.find(group => group.key === 'context')?.items.map(item => item.label)).toEqual([
      'Security estate',
    ]);
    expect(groups.find(group => group.key === 'utilities')?.items).toContainEqual(
      expect.objectContaining({ label: 'Sewerage system', value: 'Septic tank' }),
    );
  });
});
