import { describe, expect, it } from 'vitest';
import { computeProviderWebsiteReadiness } from '../providerWebsiteReadiness';

const completeProfile = {
  companyName: 'Example Plumbing',
  businessType: 'registered_company',
  contactEmail: 'hello@example.test',
  websiteTemplate: 'corporate_brand',
  canonicalCoverageCount: 1,
  services: [
    {
      displayName: 'Leak repairs',
      description: '',
      isActive: true,
    },
  ],
};

describe('computeProviderWebsiteReadiness', () => {
  it('reaches 100% from structured business facts without requiring marketing copy, portfolio, or credentials', () => {
    const result = computeProviderWebsiteReadiness(completeProfile);

    expect(result).toMatchObject({
      completionPercent: 100,
      readyForSubmission: true,
      blockers: [],
    });
    expect(result.optionalEnrichment).toContain('Add completed projects and project photographs.');
    expect(result.optionalEnrichment).toContain('Add verified registrations, qualifications or licences where relevant.');
    expect(result.optionalEnrichment).toContain('Add a business logo or brand image when you have one.');
  });

  it('does not require a logo or brand image for publication readiness', () => {
    const result = computeProviderWebsiteReadiness({ ...completeProfile, logoUrl: null });

    expect(result.readyForSubmission).toBe(true);
    expect(result.completionPercent).toBe(100);
    expect(result.items.map(item => item.id)).not.toContain('brand_image');
  });

  it('does not require marketing descriptions for active services', () => {
    const result = computeProviderWebsiteReadiness({
      ...completeProfile,
      services: [
        ...completeProfile.services,
        { displayName: 'Geyser replacement', description: '', isActive: true },
      ],
    });

    expect(result.readyForSubmission).toBe(true);
    expect(result.blockers).not.toContain('At least one active service');
  });

  it('does not count inactive or non-canonical coverage as a complete website', () => {
    const result = computeProviderWebsiteReadiness({
      ...completeProfile,
      services: completeProfile.services.map(service => ({ ...service, isActive: false })),
      canonicalCoverageCount: 0,
    });

    expect(result.completionPercent).toBeLessThan(100);
    expect(result.blockers).toContain('At least one active service');
    expect(result.blockers).toContain('At least one approved service area');
  });
});
