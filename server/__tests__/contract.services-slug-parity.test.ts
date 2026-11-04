import { describe, expect, it } from 'vitest';

import { SERVICE_CATEGORY_VALUES } from '../../drizzle/schema';
import {
  slugifyLocationSegment,
  toProviderServiceSlug,
  toProviderSlug,
  toServiceCategorySlug,
} from '../../shared/serviceDirectorySlugs';

describe('service slug parity authority', () => {
  it('maps every canonical service category value to the client-canonical slug', () => {
    expect(SERVICE_CATEGORY_VALUES.map(category => toServiceCategorySlug(category))).toEqual([
      'home-improvement',
      'finance-legal',
      'moving',
      'inspection-compliance',
      'insurance',
      'media-marketing',
    ]);
  });

  it('builds provider profile slugs with the client directory rules', () => {
    expect(toProviderSlug('Cape Handyman & Services!', 7)).toBe('cape-handyman-services--7');
    expect(toProviderSlug('home_insurance tenants', 12)).toBe('home-insurance-tenants--12');
    expect(toProviderSlug('   ---   ', 3)).toBe('provider--3');
  });

  it('slugifies geography segments with the client localized route rules', () => {
    expect(slugifyLocationSegment(' Gauteng ')).toBe('gauteng');
    expect(slugifyLocationSegment('Western_Cape -- coast')).toBe('western-cape-coast');
    expect(slugifyLocationSegment('Cape Town')).toBe('cape-town');
    expect(slugifyLocationSegment('!)).')).toBe('');
  });

  it('builds per-provider service page slugs from display name with a code fallback', () => {
    expect(toProviderServiceSlug('Home moving service', 'home_move')).toBe('home-moving-service');
    expect(toProviderServiceSlug('  ', '电气 wires')).toBe('wires');
    expect(toProviderServiceSlug('', 'Insurance / Feasibility')).toBe('insurance-feasibility');
    expect(toProviderServiceSlug('!!!', '   ')).toBe('service');
  });
});
