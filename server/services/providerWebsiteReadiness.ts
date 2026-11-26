export type ProviderWebsiteReadinessItem = {
  id: string;
  label: string;
  complete: boolean;
};

export type ProviderWebsiteReadinessInput = {
  companyName?: string | null;
  businessType?: string | null;
  headline?: string | null;
  bio?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  websiteTemplate?: string | null;
  services?: Array<{
    displayName?: string | null;
    description?: string | null;
    isActive?: boolean;
  }>;
  canonicalCoverageCount?: number;
};

const BUSINESS_TYPES = new Set([
  'independent_professional',
  'registered_company',
  'partnership',
  'other',
]);
const WEBSITE_TEMPLATES = new Set(['personal_brand', 'corporate_brand', 'project_showcase']);

export function computeProviderWebsiteReadiness(input: ProviderWebsiteReadinessInput) {
  const activeServices = (input.services || []).filter(service => service.isActive !== false);
  const items: ProviderWebsiteReadinessItem[] = [
    {
      id: 'business_identity',
      label: 'Business name and business type',
      complete:
        String(input.companyName || '').trim().length >= 2 &&
        BUSINESS_TYPES.has(String(input.businessType || '')),
    },
    {
      id: 'services',
      label: 'At least one active service',
      complete: activeServices.some(service => String(service.displayName || '').trim().length >= 2),
    },
    {
      id: 'coverage',
      label: 'At least one approved service area',
      complete: Number(input.canonicalCoverageCount || 0) > 0,
    },
    {
      id: 'contact',
      label: 'At least one customer contact channel',
      complete: Boolean(
        String(input.contactEmail || '').trim() || String(input.contactPhone || '').trim(),
      ),
    },
    {
      id: 'website_template',
      label: 'Business website design selected',
      complete: WEBSITE_TEMPLATES.has(String(input.websiteTemplate || '')),
    },
  ];

  const completedCount = items.filter(item => item.complete).length;
  const completionPercent = Math.round((completedCount / items.length) * 100);
  const blockers = items.filter(item => !item.complete).map(item => item.label);

  return {
    completionPercent,
    readyForSubmission: blockers.length === 0,
    blockers,
    items,
    optionalEnrichment: [
      'Add a business logo or brand image when you have one.',
      'Add completed projects and project photographs.',
      'Add verified registrations, qualifications or licences where relevant.',
      'Add a public website and social channels.',
      'Add more service areas and details over time.',
    ],
  };
}
