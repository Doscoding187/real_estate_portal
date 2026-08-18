import { normalizeRole } from '@/_core/roles';
import {
  SERVICE_CATEGORIES,
  toServiceCategorySlug,
  type ServiceCategory,
} from '@/features/services/catalog';
import { PROVINCE_SLUGS } from '@/lib/locationUtils';

export type PublicNavigationCapabilityStatus =
  | 'LAUNCH_READY'
  | 'AUTH_GATED'
  | 'LIMITED_BUT_VALID'
  | 'DEFERRED'
  | 'PLACEHOLDER'
  | 'BROKEN'
  | 'OBSOLETE';

export type PublicNavigationUser =
  | {
      email?: string | null;
      firstName?: string | null;
      hasManagerIdentity?: boolean;
      hasReferrerIdentity?: boolean;
      lastName?: string | null;
      name?: string | null;
      role?: string | null;
    }
  | null
  | undefined;

export type PublicNavigationDestination = {
  id: string;
  label: string;
  footerLabel?: string;
  href: string;
  owner: string;
  capability: PublicNavigationCapabilityStatus;
  authRequired?: boolean;
  desktopVisible?: boolean;
  mobileVisible?: boolean;
  activeHref?: string;
  journey?: PublicHeroJourneyKey;
};

export type PublicNavigationGroup = {
  label: string;
  items: PublicNavigationDestination[];
};

export type PublicNavigationMenu = {
  id:
    | 'buyers'
    | 'renters'
    | 'sellers'
    | 'professionals'
    | 'insights'
    | 'explore'
    | 'services'
    | 'advertise';
  label: string;
  feature: PublicNavigationDestination;
  groups: PublicNavigationGroup[];
  navbarPresentation?: 'mega-menu' | 'direct-link';
  actionItemIds?: string[];
};

export type PublicNavigationActiveOwner = 'locations' | 'referrals' | PublicNavigationMenu['id'];

const destination = (
  item: Omit<PublicNavigationDestination, 'desktopVisible' | 'mobileVisible'> & {
    desktopVisible?: boolean;
    mobileVisible?: boolean;
  },
): PublicNavigationDestination => ({
  desktopVisible: true,
  mobileVisible: true,
  ...item,
});

export type PublicHeroJourneyKey =
  | 'buy'
  | 'rent'
  | 'developments'
  | 'shared_living'
  | 'plot_land'
  | 'commercial'
  | 'find_agent';

export type PublicHeroJourneyKind = 'property-search' | 'direct-navigation';

export interface PublicHeroJourneyDefinition {
  key: PublicHeroJourneyKey;
  label: string;
  mobileLabel: string;
  kind: PublicHeroJourneyKind;
  destination: string;
  homepageVisible: boolean;
  homepageEnabled: boolean;
  supportedFields: readonly string[];
}

/**
 * Canonical public journey authority shared by the hero and public navigation.
 * Menu copy can remain audience-specific, but route meaning and stable intent
 * keys must come from this registry.
 */
export const PUBLIC_HERO_JOURNEYS: readonly PublicHeroJourneyDefinition[] = [
  {
    key: 'buy',
    label: 'Buy',
    mobileLabel: 'Buy',
    kind: 'property-search',
    destination: '/property-for-sale',
    homepageVisible: true,
    homepageEnabled: true,
    supportedFields: [
      'location',
      'propertyType',
      'minPrice',
      'maxPrice',
      'minBedrooms',
      'minBathrooms',
    ],
  },
  {
    key: 'rent',
    label: 'Rent',
    mobileLabel: 'Rent',
    kind: 'property-search',
    destination: '/property-to-rent',
    homepageVisible: true,
    homepageEnabled: true,
    supportedFields: ['location', 'propertyType', 'minPrice', 'maxPrice'],
  },
  {
    key: 'developments',
    label: 'Developments',
    mobileLabel: 'Developments',
    kind: 'property-search',
    destination: '/new-developments',
    homepageVisible: false,
    homepageEnabled: false,
    supportedFields: ['location', 'developmentType', 'developmentStatus', 'minPrice', 'maxPrice'],
  },
  {
    key: 'shared_living',
    label: 'Shared Living',
    mobileLabel: 'Shared Living',
    kind: 'property-search',
    // Shared Living has an independent journey identity, but its executable
    // search contract is not part of the public Buy/Rent runtime yet.
    // Keep the definition neutral until that journey has its own authority.
    destination: '/',
    homepageVisible: false,
    homepageEnabled: false,
    supportedFields: ['location', 'roomType', 'minPrice', 'maxPrice'],
  },
  {
    key: 'plot_land',
    label: 'Plots & Land',
    mobileLabel: 'Plots & Land',
    kind: 'property-search',
    destination: '/property-for-sale',
    homepageVisible: false,
    homepageEnabled: false,
    supportedFields: ['location', 'landType', 'sizeMin', 'sizeMax', 'minPrice', 'maxPrice'],
  },
  {
    key: 'commercial',
    label: 'Commercial',
    mobileLabel: 'Commercial',
    kind: 'property-search',
    destination: '/property-for-sale',
    homepageVisible: false,
    homepageEnabled: false,
    supportedFields: ['location', 'saleOrRent', 'commercialUseType'],
  },
  {
    key: 'find_agent',
    label: 'Find an Agent',
    mobileLabel: 'Find an Agent',
    kind: 'direct-navigation',
    destination: '/agents',
    homepageVisible: true,
    homepageEnabled: false,
    supportedFields: [],
  },
];

export const DEFAULT_PUBLIC_HERO_JOURNEY: Exclude<PublicHeroJourneyKey, 'find_agent'> = 'buy';

const PUBLIC_HERO_JOURNEY_BY_KEY = new Map(
  PUBLIC_HERO_JOURNEYS.map(journey => [journey.key, journey]),
);

const PUBLIC_HERO_JOURNEY_ALIASES: Record<string, PublicHeroJourneyKey> = {
  buy: 'buy',
  rent: 'rent',
  rental: 'rent',
  developments: 'developments',
  projects: 'developments',
  shared: 'shared_living',
  'shared-living': 'shared_living',
  shared_living: 'shared_living',
  pg: 'shared_living',
  plot: 'plot_land',
  plots: 'plot_land',
  'plots-land': 'plot_land',
  plot_land: 'plot_land',
  commercial: 'commercial',
  agents: 'find_agent',
  find_agent: 'find_agent',
  'find-an-agent': 'find_agent',
};

export function getPublicHeroJourney(key: PublicHeroJourneyKey) {
  return (
    PUBLIC_HERO_JOURNEY_BY_KEY.get(key) ||
    PUBLIC_HERO_JOURNEY_BY_KEY.get(DEFAULT_PUBLIC_HERO_JOURNEY)!
  );
}

export function getHomepageHeroJourneys(): readonly PublicHeroJourneyDefinition[] {
  return PUBLIC_HERO_JOURNEYS.filter(journey => journey.homepageVisible);
}

export function isHomepageHeroJourneyEnabled(key: PublicHeroJourneyKey): boolean {
  return getPublicHeroJourney(key).homepageEnabled;
}

export function normalizePublicHeroJourney(
  raw: string | null | undefined,
): PublicHeroJourneyKey | null {
  const normalized = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  return PUBLIC_HERO_JOURNEY_ALIASES[normalized] || null;
}

export function parseHomepageJourney(search: string): PublicHeroJourneyKey | null {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  return normalizePublicHeroJourney(params.get('intent'));
}

export function buildHomepageJourneyUrl(key: PublicHeroJourneyKey): string {
  const journey = getPublicHeroJourney(key);
  if (journey.kind === 'direct-navigation') return journey.destination;
  return `/?intent=${encodeURIComponent(journey.key)}`;
}

/**
 * Services category navigation is derived from the marketplace catalog so that
 * desktop and mobile public navigation cannot drift from the routes consumed
 * by the Services engine.
 */
export const SERVICE_CATEGORY_DESTINATIONS = SERVICE_CATEGORIES.map(category =>
  destination({
    id: `services-${category.value}`,
    label: category.label,
    href: `/services/${toServiceCategorySlug(category.value)}`,
    owner: 'services-engine',
    capability: 'LAUNCH_READY',
    activeHref: '/services',
  }),
);

const serviceCategoryDestinationByValue = SERVICE_CATEGORY_DESTINATIONS.reduce(
  (destinations, item) => {
    const category = item.id.replace('services-', '') as ServiceCategory;
    destinations[category] = item;
    return destinations;
  },
  {} as Record<ServiceCategory, PublicNavigationDestination>,
);

function serviceCategoryDestinations(...categories: ServiceCategory[]) {
  return categories.map(category => serviceCategoryDestinationByValue[category]);
}

const ADVERTISE_HUB_HREF = '/advertise';

const advertiseHubDestination = destination({
  id: 'advertise-home',
  label: 'Explore all opportunities',
  footerLabel: 'Explore all advertising and partnership opportunities',
  href: ADVERTISE_HUB_HREF,
  owner: 'advertising-engine',
  capability: 'LAUNCH_READY',
  activeHref: ADVERTISE_HUB_HREF,
});

const advertiseActionDestination = destination({
  id: 'advertise-partner',
  label: 'Advertise & Partner',
  href: ADVERTISE_HUB_HREF,
  owner: 'advertising-engine',
  capability: 'LAUNCH_READY',
  activeHref: ADVERTISE_HUB_HREF,
});

export const PUBLIC_NAVIGATION_MENUS: PublicNavigationMenu[] = [
  {
    id: 'buyers',
    label: 'For Buyers',
    feature: destination({
      id: 'buyers-all',
      label: 'Browse properties for sale',
      href: getPublicHeroJourney('buy').destination,
      owner: 'property-search',
      capability: 'LAUNCH_READY',
      activeHref: '/property-for-sale',
    }),
    actionItemIds: ['buyers-developments'],
    groups: [
      {
        label: 'Know your buying power',
        items: [
          destination({
            id: 'buyers-affordability',
            label: 'Check my buying power',
            href: '/tools/affordability-calculator',
            owner: 'content-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/tools',
          }),
          destination({
            id: 'buyers-guidance',
            label: 'Read the buying guide',
            href: '/guides/buying-property',
            owner: 'content-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/guides',
          }),
        ],
      },
      {
        label: 'Find a property',
        items: [
          destination({
            id: 'buyers-houses',
            label: 'Houses for sale',
            href: '/property-for-sale?propertyType=house',
            owner: 'property-search',
            capability: 'LAUNCH_READY',
            activeHref: '/property-for-sale',
          }),
          destination({
            id: 'buyers-apartments',
            label: 'Apartments and flats',
            href: '/property-for-sale?propertyType=apartment',
            owner: 'property-search',
            capability: 'LAUNCH_READY',
            activeHref: '/property-for-sale',
          }),
          destination({
            id: 'buyers-townhouses',
            label: 'Townhouses',
            href: '/property-for-sale?propertyType=townhouse',
            owner: 'property-search',
            capability: 'LAUNCH_READY',
            activeHref: '/property-for-sale',
          }),
          destination({
            id: 'buyers-developments',
            label: 'New developments',
            href: getPublicHeroJourney('developments').destination,
            owner: 'development-engine',
            capability: 'LAUNCH_READY',
            activeHref: '/new-developments',
            journey: 'developments',
          }),
          destination({
            id: 'buyers-plots',
            label: 'Plots and land',
            href: `${getPublicHeroJourney('plot_land').destination}?propertyType=plot`,
            owner: 'property-search',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/property-for-sale',
          }),
          destination({
            id: 'buyers-commercial',
            label: 'Commercial property',
            href: `${getPublicHeroJourney('commercial').destination}?propertyType=commercial`,
            owner: 'property-search',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/property-for-sale',
          }),
        ],
      },
      {
        label: 'Shortlist and connect',
        items: [
          destination({
            id: 'buyers-saved',
            label: 'Saved properties',
            href: '/favorites',
            owner: 'property-search',
            capability: 'AUTH_GATED',
            authRequired: true,
            activeHref: '/favorites',
          }),
          destination({
            id: 'buyers-compare',
            label: 'Compare properties',
            href: '/compare',
            owner: 'property-search',
            capability: 'LAUNCH_READY',
            activeHref: '/compare',
          }),
          destination({
            id: 'buyers-agents',
            label: 'Find an estate agent',
            href: getPublicHeroJourney('find_agent').destination,
            owner: 'agent-directory',
            capability: 'LAUNCH_READY',
            activeHref: '/agents',
          }),
        ],
      },
    ],
  },
  {
    id: 'renters',
    label: 'For Renters',
    feature: destination({
      id: 'renters-all',
      label: 'Browse all rentals',
      href: getPublicHeroJourney('rent').destination,
      owner: 'rental-search',
      capability: 'LAUNCH_READY',
      activeHref: '/property-to-rent',
      journey: 'rent',
    }),
    groups: [
      {
        label: 'Know your rental options',
        items: [
          destination({
            id: 'renters-budget-search',
            label: 'Find rentals in my budget',
            href: '/property-to-rent',
            owner: 'rental-search',
            capability: 'LAUNCH_READY',
            activeHref: '/property-to-rent',
            journey: 'rent',
          }),
          destination({
            id: 'renters-guidance',
            label: 'Read the renting guide',
            href: '/guides/renting-property',
            owner: 'content-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/guides',
          }),
        ],
      },
      {
        label: 'Find a rental',
        items: [
          destination({
            id: 'renters-apartments',
            label: 'Apartments for rent',
            href: '/property-to-rent?propertyType=apartment',
            owner: 'rental-search',
            capability: 'LAUNCH_READY',
            activeHref: '/property-to-rent',
            journey: 'rent',
          }),
          destination({
            id: 'renters-houses',
            label: 'Houses for rent',
            href: '/property-to-rent?propertyType=house',
            owner: 'rental-search',
            capability: 'LAUNCH_READY',
            activeHref: '/property-to-rent',
            journey: 'rent',
          }),
          destination({
            id: 'renters-townhouses',
            label: 'Townhouses',
            href: '/property-to-rent?propertyType=townhouse',
            owner: 'rental-search',
            capability: 'LAUNCH_READY',
            activeHref: '/property-to-rent',
            journey: 'rent',
          }),
          destination({
            id: 'renters-shared-living',
            label: 'Rooms and shared living',
            footerLabel: 'Explore shared living',
            href: getPublicHeroJourney('shared_living').destination,
            owner: 'shared-living-search',
            capability: 'DEFERRED',
          }),
          destination({
            id: 'renters-commercial',
            label: 'Commercial property to rent',
            href: '/property-to-rent?propertyType=commercial',
            owner: 'rental-search',
            capability: 'DEFERRED',
            activeHref: '/property-to-rent',
            journey: 'rent',
          }),
        ],
      },
      {
        label: 'Manage and connect',
        items: [
          destination({
            id: 'renters-saved',
            label: 'Saved rentals',
            href: '/favorites',
            owner: 'property-search',
            capability: 'AUTH_GATED',
            authRequired: true,
            activeHref: '/favorites',
          }),
          destination({
            id: 'renters-compare',
            label: 'Compare rentals',
            href: '/compare',
            owner: 'property-search',
            capability: 'DEFERRED',
            activeHref: '/compare',
          }),
          destination({
            id: 'renters-agents',
            label: 'Find a letting agent',
            href: '/agents',
            owner: 'agent-directory',
            capability: 'LAUNCH_READY',
            activeHref: '/agents',
          }),
        ],
      },
    ],
  },
  {
    id: 'sellers',
    label: 'For Sellers',
    feature: destination({
      id: 'sellers-start',
      label: 'Start selling your property',
      href: '/advertise',
      owner: 'advertising-engine',
      capability: 'LAUNCH_READY',
      activeHref: '/advertise',
    }),
    groups: [
      {
        label: 'Find professionals',
        items: [
          destination({
            id: 'sellers-agents',
            label: 'Find estate agents',
            href: '/agents',
            owner: 'agent-directory',
            capability: 'LAUNCH_READY',
            activeHref: '/agents',
          }),
          destination({
            id: 'sellers-developers',
            label: 'Property developers',
            href: '/developers',
            owner: 'developer-directory',
            capability: 'LAUNCH_READY',
            activeHref: '/developers',
          }),
        ],
      },
      {
        label: 'List your property',
        items: [
          destination({
            id: 'sellers-advertise',
            label: 'Advertise a property',
            href: '/advertise',
            owner: 'advertising-engine',
            capability: 'LAUNCH_READY',
            activeHref: '/advertise',
          }),
          destination({
            id: 'sellers-private-owner',
            label: 'List privately',
            href: '/advertise',
            owner: 'advertising-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/advertise',
          }),
        ],
      },
      {
        label: 'Seller guidance',
        items: [
          destination({
            id: 'sellers-valuation',
            label: 'Property valuation guidance',
            href: '/tools/property-valuation',
            owner: 'content-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/tools',
          }),
          destination({
            id: 'sellers-guidance',
            label: 'Selling guidance',
            href: '/guides/selling-property',
            owner: 'content-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/guides',
          }),
        ],
      },
    ],
  },
  {
    id: 'professionals',
    label: 'Professionals',
    feature: destination({
      id: 'professionals-start',
      label: 'Grow your property business',
      href: '/advertise',
      owner: 'advertising-engine',
      capability: 'LAUNCH_READY',
      activeHref: '/advertise',
    }),
    groups: [
      {
        label: 'Property professionals',
        items: [
          destination({
            id: 'professionals-agents',
            label: 'Agents',
            href: '/agents',
            owner: 'agent-directory',
            capability: 'LAUNCH_READY',
            activeHref: '/agents',
          }),
          destination({
            id: 'professionals-developers',
            label: 'Developers',
            href: '/developers',
            owner: 'developer-directory',
            capability: 'LAUNCH_READY',
            activeHref: '/developers',
          }),
          destination({
            id: 'professionals-services',
            label: 'Service providers',
            href: '/services',
            owner: 'services-engine',
            capability: 'LAUNCH_READY',
            activeHref: '/services',
          }),
        ],
      },
      {
        label: 'Partner with Property Listify',
        items: [
          destination({
            id: 'professionals-referrals',
            label: 'Referrals and distribution',
            href: '/distribution-network',
            owner: 'distribution-engine',
            capability: 'LAUNCH_READY',
            activeHref: '/distribution-network',
          }),
          destination({
            id: 'professionals-agents-acquisition',
            label: 'Agent onboarding',
            href: '/advertise/sell/agents',
            owner: 'advertising-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/advertise',
          }),
          destination({
            id: 'professionals-developer-acquisition',
            label: 'Developer onboarding',
            href: '/advertise/sell/developers',
            owner: 'advertising-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/advertise',
          }),
          destination({
            id: 'professionals-service-acquisition',
            label: 'Service provider onboarding',
            href: '/advertise/services',
            owner: 'advertising-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/advertise',
          }),
        ],
      },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    feature: destination({
      id: 'insights-home',
      label: 'Explore property insights',
      href: '/insights/property-insights',
      owner: 'content-engine',
      capability: 'LIMITED_BUT_VALID',
      activeHref: '/insights',
    }),
    groups: [
      {
        label: 'Market data',
        items: [
          destination({
            id: 'insights-market-trends',
            label: 'Market trends',
            href: '/insights/market-trends',
            owner: 'content-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/insights',
          }),
          destination({
            id: 'insights-property',
            label: 'Property insights',
            href: '/insights/property-insights',
            owner: 'content-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/insights',
          }),
        ],
      },
      {
        label: 'Guides',
        items: [
          destination({
            id: 'insights-buying-guide',
            label: 'Buying guide',
            href: '/guides/buying-property',
            owner: 'content-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/guides',
          }),
          destination({
            id: 'insights-selling-guide',
            label: 'Selling guide',
            href: '/guides/selling-property',
            owner: 'content-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/guides',
          }),
          destination({
            id: 'insights-blog',
            label: 'Property Listify blog',
            href: '/insights/blog',
            owner: 'content-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/insights',
          }),
        ],
      },
    ],
  },
  {
    id: 'explore',
    label: 'Explore',
    navbarPresentation: 'direct-link',
    feature: destination({
      id: 'explore-home',
      label: 'Explore',
      href: '/explore',
      owner: 'explore-engine',
      capability: 'LAUNCH_READY',
      activeHref: '/explore',
    }),
    groups: [
      {
        label: 'Discover',
        items: [
          destination({
            id: 'explore-feed',
            label: 'Feed',
            href: '/explore/feed',
            owner: 'explore-engine',
            capability: 'LAUNCH_READY',
            activeHref: '/explore',
          }),
          destination({
            id: 'explore-map',
            label: 'Map',
            href: '/explore/map',
            owner: 'explore-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/explore',
          }),
          destination({
            id: 'explore-shorts',
            label: 'Short videos',
            href: '/explore/shorts',
            owner: 'explore-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/explore',
          }),
        ],
      },
    ],
  },
  {
    id: 'services',
    label: 'Services',
    feature: destination({
      id: 'services-home',
      label: 'Browse all property services',
      href: '/services',
      owner: 'services-engine',
      capability: 'LAUNCH_READY',
      activeHref: '/services',
    }),
    groups: [
      {
        label: 'Home and move',
        items: serviceCategoryDestinations('home_improvement', 'moving', 'inspection_compliance'),
      },
      {
        label: 'Transaction and property support',
        items: serviceCategoryDestinations('finance_legal', 'insurance', 'media_marketing'),
      },
    ],
  },
  {
    id: 'advertise',
    label: 'Advertise & Partner',
    feature: advertiseHubDestination,
    groups: [
      {
        label: 'Grow property supply',
        items: [
          destination({
            id: 'advertise-agents',
            label: 'Agents',
            href: '/advertise/sell/agents',
            owner: 'advertising-engine',
            capability: 'LAUNCH_READY',
            activeHref: ADVERTISE_HUB_HREF,
          }),
          destination({
            id: 'advertise-agencies',
            label: 'Agencies',
            href: '/advertise/sell/agencies',
            owner: 'advertising-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: ADVERTISE_HUB_HREF,
          }),
          destination({
            id: 'advertise-developers',
            label: 'Property developers',
            href: '/advertise/sell/developers',
            owner: 'advertising-engine',
            capability: 'LAUNCH_READY',
            activeHref: ADVERTISE_HUB_HREF,
          }),
        ],
      },
      {
        label: 'Finance and services partnerships',
        items: [
          destination({
            id: 'advertise-banks',
            label: 'Banks',
            href: '/advertise/finance/banks',
            owner: 'advertising-engine',
            capability: 'LAUNCH_READY',
            activeHref: ADVERTISE_HUB_HREF,
          }),
          destination({
            id: 'advertise-originators',
            label: 'Bond originators',
            href: '/advertise/finance/originators',
            owner: 'advertising-engine',
            capability: 'LAUNCH_READY',
            activeHref: ADVERTISE_HUB_HREF,
          }),
          destination({
            id: 'advertise-services',
            label: 'Service businesses',
            href: '/advertise/services',
            owner: 'advertising-engine',
            capability: 'LAUNCH_READY',
            activeHref: ADVERTISE_HUB_HREF,
          }),
        ],
      },
    ],
  },
];

export const PUBLIC_CITY_ENTRY: PublicNavigationDestination = destination({
  id: 'city-entry',
  label: 'Locations',
  href: '/',
  owner: 'location-engine',
  capability: 'LAUNCH_READY',
  activeHref: '/',
});

export const PUBLIC_NAVIGATION_ACTIONS = {
  referrals: destination({
    id: 'referrals',
    label: 'Referrals',
    href: '/distribution-network',
    owner: 'distribution-engine',
    capability: 'LAUNCH_READY',
    activeHref: '/distribution-network',
  }),
  advertise: advertiseActionDestination,
} as const;

/**
 * Top-level ownership is deliberately independent from child-link membership.
 * The order resolves intentional overlaps: location pages belong to Locations,
 * public distribution routes belong to Referrals, and professional acquisition
 * routes belong to Professionals. Authenticated distribution routes are not
 * included here and remain owned by their engine-local navigation.
 */
export const PUBLIC_NAVIGATION_ACTIVE_ROUTES: Record<PublicNavigationActiveOwner, string[]> = {
  locations: PROVINCE_SLUGS.map(slug => `/${slug}`),
  referrals: ['/distribution-network'],
  advertise: ['/advertise'],
  professionals: ['/agents', '/developers'],
  services: ['/services'],
  buyers: ['/property-for-sale', '/new-developments'],
  renters: ['/property-to-rent'],
  sellers: ['/tools/property-valuation'],
  insights: ['/insights', '/guides'],
  explore: ['/explore'],
};

const PUBLIC_NAVIGATION_ACTIVE_OWNER_ORDER: PublicNavigationActiveOwner[] = [
  'locations',
  'referrals',
  'advertise',
  'professionals',
  'services',
  'buyers',
  'renters',
  'sellers',
  'insights',
  'explore',
];

const VISIBLE_CAPABILITIES = new Set<PublicNavigationCapabilityStatus>([
  'LAUNCH_READY',
  'AUTH_GATED',
  'LIMITED_BUT_VALID',
]);

export function isPublicNavigationVisible(
  item: PublicNavigationDestination,
  surface: 'desktop' | 'mobile' = 'desktop',
) {
  return (
    VISIBLE_CAPABILITIES.has(item.capability) &&
    (!item.journey || isHomepageHeroJourneyEnabled(item.journey)) &&
    (surface === 'desktop' ? item.desktopVisible !== false : item.mobileVisible !== false)
  );
}

export function getVisiblePublicNavigationMenus(
  surface: 'desktop' | 'mobile' = 'desktop',
): PublicNavigationMenu[] {
  return PUBLIC_NAVIGATION_MENUS.filter(menu => isPublicNavigationVisible(menu.feature, surface));
}

export function getVisiblePublicNavigationGroups(
  menu: PublicNavigationMenu,
  surface: 'desktop' | 'mobile' = 'desktop',
) {
  return menu.groups
    .map(group => ({
      ...group,
      items: group.items.filter(item => isPublicNavigationVisible(item, surface)),
    }))
    .filter(group => group.items.length > 0);
}

export function getVisiblePublicNavigationActionItems(
  menu: PublicNavigationMenu,
  surface: 'desktop' | 'mobile' = 'desktop',
) {
  const destinations = [menu.feature, ...menu.groups.flatMap(group => group.items)];
  return (menu.actionItemIds || [])
    .map(id => destinations.find(item => item.id === id))
    .filter((item): item is PublicNavigationDestination => {
      if (!item) return false;
      return isPublicNavigationVisible(item, surface);
    });
}

function matchesActiveRoute(pathname: string, routePrefix: string) {
  if (routePrefix.endsWith('/')) return pathname.startsWith(routePrefix);
  return pathname === routePrefix || pathname.startsWith(`${routePrefix}/`);
}

export function getPublicNavigationActiveOwner(
  pathname: string,
): PublicNavigationActiveOwner | null {
  const currentPath = pathname.split('?')[0] || '/';

  for (const owner of PUBLIC_NAVIGATION_ACTIVE_OWNER_ORDER) {
    if (
      PUBLIC_NAVIGATION_ACTIVE_ROUTES[owner].some(route => matchesActiveRoute(currentPath, route))
    ) {
      return owner;
    }
  }

  return null;
}

export function getSafeNextPath(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }

  if (
    value.includes('\\') ||
    Array.from(value).some(character => {
      const code = character.charCodeAt(0);
      return code < 0x20 || code === 0x7f;
    })
  ) {
    return null;
  }

  try {
    const parsed = new URL(value, 'http://property-listify.local');
    return parsed.origin === 'http://property-listify.local' ? value : null;
  } catch {
    return null;
  }
}

export function getAccountAuthHref(mode: 'signin' | 'register', nextPath: unknown): string {
  const params = new URLSearchParams({ mode });
  const safeNextPath = getSafeNextPath(nextPath);

  // Never send an auth page back to itself, and never accept an external next path.
  if (safeNextPath && safeNextPath !== '/login' && !safeNextPath.startsWith('/login?')) {
    params.set('next', safeNextPath);
  }

  return `/login?${params.toString()}`;
}

export function getCanonicalAccountDestination(user: PublicNavigationUser): string | null {
  if (!user) return null;
  const role = normalizeRole(user.role);

  if (user.hasManagerIdentity) return '/distribution/manager';
  if (role === 'super_admin') return '/admin/overview';
  if (role === 'property_developer') return '/developer/dashboard';
  if (role === 'agency_admin') return '/agency/overview';
  if (role === 'agent') return '/agent/dashboard';
  if (role === 'service_provider') return '/service/dashboard';
  if (user.hasReferrerIdentity || role === 'referrer') {
    return '/distribution/partner/overview';
  }
  return '/user/dashboard';
}

export function getLoginRedirectPath(user: PublicNavigationUser, nextPath: unknown): string {
  return getSafeNextPath(nextPath) ?? getCanonicalAccountDestination(user) ?? '/user/dashboard';
}

export function getAccountDisplayName(user: PublicNavigationUser) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return name || user?.name || user?.email?.split('@')[0] || 'Account';
}

export function getAccountInitials(user: PublicNavigationUser) {
  if (!user) return null;

  const name =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.name ||
    user.email?.split('@')[0] ||
    '';
  if (!name) return null;

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
  return initials || null;
}

export function getAccountRoleLabel(user: PublicNavigationUser) {
  if (!user) return 'Account';
  if (user.hasManagerIdentity) return 'Distribution manager';

  switch (normalizeRole(user.role)) {
    case 'super_admin':
      return 'Administrator';
    case 'property_developer':
      return 'Property developer';
    case 'agency_admin':
      return 'Agency administrator';
    case 'agent':
      return 'Property agent';
    case 'service_provider':
      return 'Service provider';
    case 'referrer':
      return 'Referral partner';
    default:
      return 'Property Listify member';
  }
}

export function getAccountWorkspaceLabel(user: PublicNavigationUser) {
  if (!user) return 'Open member dashboard';
  if (user.hasManagerIdentity) return 'Open distribution manager workspace';

  switch (normalizeRole(user.role)) {
    case 'super_admin':
      return 'Open administrator workspace';
    case 'property_developer':
      return 'Open developer workspace';
    case 'agency_admin':
      return 'Open agency workspace';
    case 'agent':
      return 'Open agent workspace';
    case 'service_provider':
      return 'Open service provider workspace';
    case 'referrer':
      return 'Open referral partner workspace';
    default:
      return 'Open member dashboard';
  }
}

export function getPublicNavigationDestinationIds() {
  return PUBLIC_NAVIGATION_MENUS.flatMap(menu => [
    menu.feature.id,
    ...menu.groups.flatMap(group => group.items.map(item => item.id)),
  ]);
}
