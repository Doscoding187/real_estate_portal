import { normalizeRole } from '@/_core/roles';

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
  href: string;
  owner: string;
  capability: PublicNavigationCapabilityStatus;
  authRequired?: boolean;
  desktopVisible?: boolean;
  mobileVisible?: boolean;
  activeHref?: string;
};

export type PublicNavigationGroup = {
  label: string;
  items: PublicNavigationDestination[];
};

export type PublicNavigationMenu = {
  id: 'buyers' | 'renters' | 'sellers' | 'professionals' | 'insights' | 'explore' | 'services';
  label: string;
  feature: PublicNavigationDestination;
  groups: PublicNavigationGroup[];
};

export type PublicNavigationActiveOwner = 'city' | PublicNavigationMenu['id'];

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

export const PUBLIC_NAVIGATION_MENUS: PublicNavigationMenu[] = [
  {
    id: 'buyers',
    label: 'For Buyers',
    feature: destination({
      id: 'buyers-all',
      label: 'Browse properties for sale',
      href: '/property-for-sale',
      owner: 'property-search',
      capability: 'LAUNCH_READY',
      activeHref: '/property-for-sale',
    }),
    groups: [
      {
        label: 'Residential',
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
            label: 'Apartments / flats',
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
            href: '/new-developments',
            owner: 'development-engine',
            capability: 'LAUNCH_READY',
            activeHref: '/new-developments',
          }),
        ],
      },
      {
        label: 'Commercial and land',
        items: [
          destination({
            id: 'buyers-commercial',
            label: 'Commercial property',
            href: '/property-for-sale?propertyType=commercial',
            owner: 'property-search',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/property-for-sale',
          }),
          destination({
            id: 'buyers-plots',
            label: 'Plots and land',
            href: '/property-for-sale?propertyType=plot',
            owner: 'property-search',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/property-for-sale',
          }),
        ],
      },
      {
        label: 'Professionals',
        items: [
          destination({
            id: 'buyers-agents',
            label: 'Find an estate agent',
            href: '/agents',
            owner: 'agent-directory',
            capability: 'LAUNCH_READY',
            activeHref: '/agents',
          }),
          destination({
            id: 'buyers-guidance',
            label: 'Buying guidance',
            href: '/guides/buying-property',
            owner: 'content-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/guides',
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
      label: 'Browse rental properties',
      href: '/property-to-rent',
      owner: 'rental-search',
      capability: 'LAUNCH_READY',
      activeHref: '/property-to-rent',
    }),
    groups: [
      {
        label: 'Residential',
        items: [
          destination({
            id: 'renters-apartments',
            label: 'Apartments for rent',
            href: '/property-to-rent?propertyType=apartment',
            owner: 'rental-search',
            capability: 'LAUNCH_READY',
            activeHref: '/property-to-rent',
          }),
          destination({
            id: 'renters-houses',
            label: 'Houses for rent',
            href: '/property-to-rent?propertyType=house',
            owner: 'rental-search',
            capability: 'LAUNCH_READY',
            activeHref: '/property-to-rent',
          }),
          destination({
            id: 'renters-shared-living',
            label: 'Shared living',
            href: '/property-to-rent?propertyType=shared_living',
            owner: 'rental-search',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/property-to-rent',
          }),
        ],
      },
      {
        label: 'Broader search',
        items: [
          destination({
            id: 'renters-commercial',
            label: 'Commercial rentals',
            href: '/property-to-rent?propertyType=commercial',
            owner: 'rental-search',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/property-to-rent',
          }),
          destination({
            id: 'renters-saved-searches',
            label: 'Saved searches',
            href: '/saved-search/manage',
            owner: 'prospect-engine',
            capability: 'AUTH_GATED',
            authRequired: true,
            activeHref: '/saved-search/manage',
          }),
        ],
      },
      {
        label: 'Rental guidance',
        items: [
          destination({
            id: 'renters-guidance',
            label: 'Rental guidance',
            href: '/guides/renting-property',
            owner: 'content-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/guides',
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
    feature: destination({
      id: 'explore-home',
      label: 'Explore Property Listify',
      href: '/explore/home',
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
      {
        label: 'Create',
        items: [
          destination({
            id: 'explore-upload',
            label: 'Upload content',
            href: '/explore/upload',
            owner: 'explore-engine',
            capability: 'AUTH_GATED',
            authRequired: true,
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
      label: 'Browse property services',
      href: '/services',
      owner: 'services-engine',
      capability: 'LAUNCH_READY',
      activeHref: '/services',
    }),
    groups: [
      {
        label: 'Property finance',
        items: [
          destination({
            id: 'services-home-loans',
            label: 'Home loan guidance',
            href: '/services/home-loans',
            owner: 'services-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/services',
          }),
          destination({
            id: 'services-valuation',
            label: 'Property valuation guidance',
            href: '/services/property-valuation',
            owner: 'services-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/services',
          }),
          destination({
            id: 'services-insurance',
            label: 'Home insurance guidance',
            href: '/services/home-insurance',
            owner: 'services-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/services',
          }),
        ],
      },
      {
        label: 'Professional support',
        items: [
          destination({
            id: 'services-legal',
            label: 'Legal services guidance',
            href: '/services/legal-services',
            owner: 'services-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/services',
          }),
          destination({
            id: 'services-interior',
            label: 'Interior design guidance',
            href: '/services/interior-design',
            owner: 'services-engine',
            capability: 'LIMITED_BUT_VALID',
            activeHref: '/services',
          }),
        ],
      },
    ],
  },
];

export const PUBLIC_CITY_ENTRY: PublicNavigationDestination = destination({
  id: 'city-entry',
  label: 'City',
  href: '/property-for-sale',
  owner: 'location-engine',
  capability: 'LAUNCH_READY',
  activeHref: '/property-for-sale',
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
  advertise: destination({
    id: 'advertise-partner',
    label: 'Advertise & Partner',
    href: '/advertise',
    owner: 'advertising-engine',
    capability: 'LAUNCH_READY',
    activeHref: '/advertise',
  }),
} as const;

/**
 * Top-level ownership is deliberately independent from child-link membership.
 * The order resolves the two intentional overlaps: location pages belong to
 * City, and professional acquisition routes belong to Professionals.
 */
export const PUBLIC_NAVIGATION_ACTIVE_ROUTES: Record<PublicNavigationActiveOwner, string[]> = {
  city: ['/property-for-sale/'],
  professionals: [
    '/agents',
    '/developers',
    '/distribution-network',
    '/advertise/sell/',
    '/advertise/services',
  ],
  services: ['/services'],
  buyers: ['/property-for-sale', '/new-developments'],
  renters: ['/property-to-rent'],
  sellers: ['/advertise', '/tools/property-valuation'],
  insights: ['/insights', '/guides'],
  explore: ['/explore'],
};

const PUBLIC_NAVIGATION_ACTIVE_OWNER_ORDER: PublicNavigationActiveOwner[] = [
  'city',
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
    (surface === 'desktop' ? item.desktopVisible !== false : item.mobileVisible !== false)
  );
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
  const name = getAccountDisplayName(user);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
  return initials || 'PL';
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

export function getPublicNavigationDestinationIds() {
  return PUBLIC_NAVIGATION_MENUS.flatMap(menu => [
    menu.feature.id,
    ...menu.groups.flatMap(group => group.items.map(item => item.id)),
  ]);
}
