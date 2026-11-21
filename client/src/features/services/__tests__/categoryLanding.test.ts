import { describe, expect, it } from 'vitest';
import { SERVICE_CATEGORIES } from '../catalog';
import {
  getServiceFocusLandingOverride,
  SERVICE_CATEGORY_LANDING_CONTENT,
} from '../categoryLanding';

describe('service category landing content', () => {
  it('gives every supported category a reusable destination configuration', () => {
    expect(Object.keys(SERVICE_CATEGORY_LANDING_CONTENT).sort()).toEqual(
      SERVICE_CATEGORIES.map(category => category.value).sort(),
    );

    for (const category of SERVICE_CATEGORIES) {
      const content = SERVICE_CATEGORY_LANDING_CONTENT[category.value];
      expect(content.title).toBeTruthy();
      expect(content.heroImage).toMatch(/^\/images\/services\//);
      expect(content.servicePathways.length).toBeGreaterThanOrEqual(4);
      expect(content.planningOptions.length).toBeGreaterThanOrEqual(3);
      expect(content.guides).toHaveLength(3);
      expect(content.requestDetails.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('uses the plumbing focus to replace broad home-improvement content without inventing availability', () => {
    const plumbing = getServiceFocusLandingOverride('plumbing');

    expect(plumbing?.title).toBe('Plumbing & maintenance');
    expect(plumbing?.servicePathways).toHaveLength(6);
    expect(plumbing?.description).toMatch(/published provider information/i);
    expect(plumbing?.description).not.toMatch(/emergency service available/i);
  });
});
