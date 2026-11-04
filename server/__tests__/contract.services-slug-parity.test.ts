import { describe, expect, it } from 'vitest';

import { SERVICE_CATEGORY_VALUES } from '../../drizzle/schema';
import { toProviderSlug, toServiceCategorySlug } from '../../shared/serviceDirectorySlugs';

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
});
