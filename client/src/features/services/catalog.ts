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
export type ServiceRequestSourceSurface = Exclude<SourceSurface, 'explore'>;

export type ServiceJourneyContext = {
  category?: string | null;
  providerId?: string | number | null;
  serviceCode?: string | null;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
  propertyId?: string | number | null;
  listingId?: string | number | null;
  developmentId?: string | number | null;
  propertyLinked?: string | boolean | null;
  intentStage?: string | null;
  sourceSurface?: string | null;
  sourceDetail?: string | null;
  reasonKey?: string | null;
};

const SERVICE_JOURNEY_INTENT_STAGES = new Set([
  'seller_valuation',
  'seller_listing_prep',
  'buyer_saved_property',
  'buyer_offer_intent',
  'buyer_move_ready',
  'developer_listing_wizard',
  'agent_dashboard',
  'general',
]);
const SERVICE_JOURNEY_SOURCE_SURFACES = new Set([
  'directory',
  'journey_injection',
  'agent_dashboard',
]);

const SERVICE_JOURNEY_QUERY_KEYS = [
  'category',
  'providerId',
  'serviceCode',
  'suburb',
  'city',
  'province',
  'propertyId',
  'listingId',
  'developmentId',
  'propertyLinked',
  'intentStage',
  'sourceSurface',
  'sourceDetail',
  'reasonKey',
] as const;

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
    subtitle: 'Pack, move, store, and relocate with a provider that lists your area.',
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
    title: 'Choose a service',
    description: 'Start with the property task you need help with.',
  },
  {
    title: 'Check listed coverage',
    description: 'See the service and coverage each provider has published.',
  },
  {
    title: 'Send one clear request',
    description: 'Share your project details with the provider you choose.',
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

function setServiceJourneyContext(params: URLSearchParams, context: ServiceJourneyContext) {
  for (const key of SERVICE_JOURNEY_QUERY_KEYS) {
    const value = context[key];
    if (value === undefined || value === null || !String(value).trim()) continue;
    if (
      key === 'propertyLinked' &&
      value !== true &&
      value !== false &&
      value !== 'true' &&
      value !== 'false'
    )
      continue;
    if (key === 'intentStage' && !SERVICE_JOURNEY_INTENT_STAGES.has(String(value))) continue;
    if (key === 'sourceSurface' && !SERVICE_JOURNEY_SOURCE_SURFACES.has(String(value))) continue;
    params.set(key, String(value));
  }
}

export function serviceJourneyContextFromSearch(search: string): ServiceJourneyContext {
  const params = new URLSearchParams(search);
  const context: ServiceJourneyContext = {};
  for (const key of SERVICE_JOURNEY_QUERY_KEYS) {
    const value = params.get(key);
    if (value === null) continue;
    if (key === 'propertyLinked' && value !== 'true' && value !== 'false') continue;
    if (key === 'intentStage' && !SERVICE_JOURNEY_INTENT_STAGES.has(value)) continue;
    if (key === 'sourceSurface' && !SERVICE_JOURNEY_SOURCE_SURFACES.has(value)) continue;
    context[key] = value;
  }
  return context;
}

export function buildServiceRequestPath(
  category: ServiceCategory,
  providerId: number,
  serviceCode: string,
  context: ServiceJourneyContext = {},
) {
  const params = new URLSearchParams();
  setServiceJourneyContext(params, {
    ...context,
    category,
    providerId,
    serviceCode,
  });
  return `/services/request/${toServiceCategorySlug(category)}?${params.toString()}`;
}

export function buildServiceCategoryPath(
  category: ServiceCategory,
  context: ServiceJourneyContext = {},
) {
  const params = new URLSearchParams();
  setServiceJourneyContext(params, { ...context, category });
  const query = params.toString();
  return `/services/${toServiceCategorySlug(category)}${query ? `?${query}` : ''}`;
}

export function buildServiceLocationPath(
  category: ServiceCategory,
  location: { suburb?: string | null; city?: string | null; province?: string | null },
  context: ServiceJourneyContext = {},
) {
  const params = new URLSearchParams();
  const combined = { ...context, ...location, category };
  setServiceJourneyContext(params, combined);
  const city = slugifyLocationSegment(location.city || '');
  const province = slugifyLocationSegment(location.province || '');
  const query = params.toString();
  if (city && province) {
    return `/services/${toServiceCategorySlug(category)}/${city}/${province}${query ? `?${query}` : ''}`;
  }
  return `/services/${toServiceCategorySlug(category)}${query ? `?${query}` : ''}`;
}

export function buildProviderProfilePath(
  slug: string,
  search = '',
  context: ServiceJourneyContext = {},
) {
  const params = new URLSearchParams(search);
  for (const key of SERVICE_JOURNEY_QUERY_KEYS) {
    params.delete(key);
  }
  setServiceJourneyContext(params, {
    ...serviceJourneyContextFromSearch(search),
    ...context,
  });
  const query = params.toString();
  return `/services/provider/${encodeURIComponent(slug)}${query ? `?${query}` : ''}`;
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

export function toProviderSlug(companyName: string, providerId: number) {
  const stem = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${stem || 'provider'}--${providerId}`;
}

export function providerIdFromSlug(slug: string): number | null {
  const marker = '--';
  const parts = slug.split(marker);
  const rawProviderId = String(parts[parts.length - 1] || '').trim();

  if (!/^\d+$/.test(rawProviderId)) {
    return null;
  }

  const providerId = Number.parseInt(rawProviderId, 10);

  return Number.isSafeInteger(providerId) && providerId > 0 ? providerId : null;
}

export const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
] as const;

export type SAProvince = (typeof SA_PROVINCES)[number];

function canonicalProvince(value: string) {
  return SA_PROVINCES.find(province => province.toLowerCase() === value.toLowerCase()) || value;
}

export function parseServiceLocationInput(value: string) {
  const parts = value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length >= 3) {
    return { suburb: parts[0], city: parts[1], province: canonicalProvince(parts[2]) };
  }
  if (parts.length === 2) {
    if (SA_PROVINCES.some(province => province.toLowerCase() === parts[1].toLowerCase())) {
      return { suburb: '', city: parts[0], province: canonicalProvince(parts[1]) };
    }
    return { suburb: parts[0], city: parts[1], province: '' };
  }
  if (parts.length === 1) {
    if (SA_PROVINCES.some(province => province.toLowerCase() === parts[0].toLowerCase())) {
      return { suburb: '', city: '', province: canonicalProvince(parts[0]) };
    }
    return { suburb: '', city: parts[0], province: '' };
  }
  return { suburb: '', city: '', province: '' };
}

/**
 * Formats a ZAR price range as "R{min} – R{max}" with whole-number formatting.
 * Requirements: 6.4, 9.8, 10.2
 */
export function formatPriceRange(min: number, max: number): string {
  return `R${Math.round(min)} \u2013 R${Math.round(max)}`;
}
