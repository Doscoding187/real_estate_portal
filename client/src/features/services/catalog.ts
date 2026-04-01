export type ServiceCategory =
  | 'home_improvement'
  | 'finance_legal'
  | 'moving'
  | 'inspection_compliance'
  | 'insurance'
  | 'media_marketing';

export type IntentStage =
  | 'seller_valuation'
  | 'seller_listing_prep'
  | 'buyer_saved_property'
  | 'buyer_offer_intent'
  | 'buyer_move_ready'
  | 'developer_listing_wizard'
  | 'agent_dashboard'
  | 'general';

export type SourceSurface = 'directory' | 'explore' | 'journey_injection' | 'agent_dashboard';

export type ServiceCategoryMeta = {
  value: ServiceCategory;
  label: string;
  shortLabel: string;
  subtitle: string;
  icon: string;
};

export const SERVICE_CATEGORIES: ServiceCategoryMeta[] = [
  {
    value: 'home_improvement',
    label: 'Home Improvement',
    shortLabel: 'Handyman',
    subtitle: 'Renovation, painting, electrical, and plumbing support.',
    icon: 'Hammer',
  },
  {
    value: 'finance_legal',
    label: 'Finance & Legal',
    shortLabel: 'Finance',
    subtitle: 'Bond originators, conveyancers, and legal advisors.',
    icon: 'Scale',
  },
  {
    value: 'moving',
    label: 'Moving Services',
    shortLabel: 'Moving',
    subtitle: 'Pack, move, store, and relocate with vetted teams.',
    icon: 'Truck',
  },
  {
    value: 'inspection_compliance',
    label: 'Inspection & Compliance',
    shortLabel: 'Inspection',
    subtitle: 'Home inspections, compliance certs, and snag checks.',
    icon: 'ClipboardCheck',
  },
  {
    value: 'insurance',
    label: 'Insurance',
    shortLabel: 'Insurance',
    subtitle: 'Compare cover options for property and contents.',
    icon: 'ShieldCheck',
  },
  {
    value: 'media_marketing',
    label: 'Media & Marketing',
    shortLabel: 'Media',
    subtitle: 'Photography, staging, 3D tours, and listing media.',
    icon: 'Camera',
  },
];

export const CATEGORY_BY_VALUE: Record<ServiceCategory, ServiceCategoryMeta> =
  SERVICE_CATEGORIES.reduce(
    (acc, category) => {
      acc[category.value] = category;
      return acc;
    },
    {} as Record<ServiceCategory, ServiceCategoryMeta>,
  );

export const TRUST_STEPS = [
  {
    title: 'Share Project Details',
    description: 'Tell us what service you need, where, and your timeline.',
  },
  {
    title: 'Match With Local Pros',
    description: 'We rank providers by fit, trust score, and service area.',
  },
  {
    title: 'Compare Quotes',
    description: 'Choose the provider that matches your budget and scope.',
  },
];

export const POPULAR_PROJECTS = [
  {
    title: 'Interior repaint',
    typicalFrom: 'R4 500',
    category: 'home_improvement' as ServiceCategory,
  },
  {
    title: 'Electrical COC',
    typicalFrom: 'R1 900',
    category: 'inspection_compliance' as ServiceCategory,
  },
  {
    title: 'Conveyancing support',
    typicalFrom: 'R8 000',
    category: 'finance_legal' as ServiceCategory,
  },
  { title: 'Move a 2-bedroom home', typicalFrom: 'R3 200', category: 'moving' as ServiceCategory },
  {
    title: 'Home insurance quote',
    typicalFrom: 'Custom',
    category: 'insurance' as ServiceCategory,
  },
  {
    title: 'Listing photo package',
    typicalFrom: 'R2 500',
    category: 'media_marketing' as ServiceCategory,
  },
];

export const COST_GUIDES = [
  {
    title: 'How much does home staging cost in South Africa?',
    description: 'Budget ranges, what affects price, and where staging pays off.',
    href: '/explore/home',
  },
  {
    title: 'Conveyancing checklist before you sign',
    description: 'Documents, timelines, and legal milestones buyers should expect.',
    href: '/explore/home',
  },
  {
    title: 'Moving week playbook for families',
    description: 'A step-by-step relocation timeline from booking to handover.',
    href: '/explore/home',
  },
];

export function getCategoryMeta(value: ServiceCategory): ServiceCategoryMeta {
  return CATEGORY_BY_VALUE[value];
}

export function isServiceCategory(value: string): value is ServiceCategory {
  return SERVICE_CATEGORIES.some(category => category.value === value);
}

export function slugifyLocationSegment(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
}

export function toServiceCategorySlug(category: ServiceCategory) {
  return String(category).replace(/_/g, '-');
}

export function serviceCategoryFromSlug(slug: string): ServiceCategory | null {
  const normalized = slugifyLocationSegment(slug).replace(/-/g, '_');
  return isServiceCategory(normalized) ? (normalized as ServiceCategory) : null;
}

export function formatCategoryLabel(value: ServiceCategory) {
  return getCategoryMeta(value).label;
}

export function formatArea(city?: string | null, province?: string | null, suburb?: string | null) {
  const parts = [suburb, city, province].filter(Boolean);
  return parts.length ? parts.join(', ') : 'your area';
}

export function toProviderSlug(companyName: string, providerId: string) {
  const stem = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${stem || 'provider'}--${providerId}`;
}

export function providerIdFromSlug(slug: string) {
  const marker = '--';
  if (!slug.includes(marker)) return slug;
  const parts = slug.split(marker);
  return parts[parts.length - 1];
}
