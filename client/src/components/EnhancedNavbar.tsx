// @ts-nocheck
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  User,
  ChevronDown,
  MapPin,
  Home,
  Briefcase,
  MapPinned,
  TrendingUp,
  Calculator,
  Megaphone,
  Key,
  Building2,
  Lightbulb,
  ChevronRight,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { trpc } from '@/lib/trpc';
import { generatePropertyUrl } from '@/lib/urlUtils';
import { FALLBACK_CITY_LINKS, cityToNavLink } from '@/lib/locationDataAdapter';
import { LocationAutosuggest } from '@/components/LocationAutosuggest';
import { useEffect, useState } from 'react';

// Static fallback city links for the For Renters mega menu.
// Derived from the central fallback adapter — not a ranking algorithm.
// Real dynamic ranking belongs in the future Search Discovery Engine API.
const rentCityFallbackLinks = FALLBACK_CITY_LINKS
  .filter(l => l.type === 'city' && l.citySlug)
  .slice(0, 3)
  .map(l =>
    cityToNavLink(
      {
        name: l.label,
        citySlug: l.citySlug,
        provinceSlug: l.provinceSlug,
      },
      { transactionType: 'rent' },
    ),
  )
  .filter((link): link is NonNullable<typeof link> => Boolean(link))
  .map(link => ({
    label: `Rent in ${link.label}`,
    href: link.href,
  }));
import { LocationSelectionModal } from '@/components/LocationSelectionModal';

// City dropdown content component
function CityDropdownContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCity, setHoveredCity] = useState('Johannesburg');

  const topCities = [
    { name: 'Johannesburg', slug: 'johannesburg', provinceSlug: 'gauteng' },
    { name: 'Cape Town', slug: 'cape-town', provinceSlug: 'western-cape' },
    { name: 'Kimberley', slug: 'kimberley', provinceSlug: 'northern-cape' },
    { name: 'Durban', slug: 'durban', provinceSlug: 'kwazulu-natal' },
    { name: 'Gqeberha', slug: 'gqeberha', provinceSlug: 'eastern-cape' },
    { name: 'Bloemfontein', slug: 'bloemfontein', provinceSlug: 'free-state' },
    { name: 'Polokwane', slug: 'polokwane', provinceSlug: 'limpopo' },
    { name: 'Mbombela', slug: 'mbombela', provinceSlug: 'mpumalanga' },
    { name: 'Mahikeng', slug: 'mahikeng', provinceSlug: 'north-west' },
  ];

  // Suburbs for each city
  const citySuburbs: Record<string, string[]> = {
    Johannesburg: [
      'Sandton',
      'Rosebank',
      'Midrand',
      'Fourways',
      'Sunninghill',
      'Lonehill',
      'Parkmore',
      'Linden',
    ],
    'Cape Town': [
      'Sea Point',
      'Camps Bay',
      'Constantia',
      'Gardens',
      'Waterfront',
      'Claremont',
      'Newlands',
      'Rondebosch',
    ],
    Kimberley: [
      'Beaconsfield',
      'Hadison Park',
      'Kimberley CBD',
      'Monument Heights',
      'Albertynshof',
      'Royldene',
      'New Park',
      'De Beers',
    ],
    Durban: [
      'Umhlanga',
      'Ballito',
      'Morningside',
      'Berea',
      'Westville',
      'Glenwood',
      'Musgrave',
      'Durban North',
    ],
    Gqeberha: [
      'Summerstrand',
      'Walmer',
      'Newton Park',
      'Humewood',
      'Mill Park',
      'Lorraine',
      'Framesby',
      'Sunridge Park',
    ],
    Bloemfontein: [
      'Westdene',
      'Universitas',
      'Willows',
      'Bayswater',
      'Arboretum',
      'Fichardtpark',
      'Dan Pienaar',
      'Naval Hill',
    ],
    Polokwane: [
      'Bendor',
      'Nirvana',
      'Welgelegen',
      'Ivy Park',
      'Westenburg',
      'Flora Park',
      'Sterpark',
      'Fauna Park',
    ],
    Mbombela: [
      'Sonheuwel',
      'Nelspruit CBD',
      'West Acres',
      'Riverside Park',
      'Steiltes',
      'Loerie Park',
      'Kiaat',
      'Pienaar',
    ],
    Mahikeng: [
      'Mahikeng CBD',
      'Unit 1',
      'Unit 2',
      'Danville',
      'Montshioa',
      'Riviera Park',
      'Mmabatho',
      'Imperial Reserve',
    ],
  };

  const suburbs = citySuburbs[hoveredCity] || [];

  // Filter cities and suburbs based on search
  const filteredCities = topCities.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredSuburbs = suburbs.filter(suburb =>
    suburb.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="w-[680px] p-7">
      {/* Search Bar with Autosuggest */}
      <div className="mb-6">
        <LocationAutosuggest
          placeholder="Search location"
          onSelect={location => {
            // Save location to database
            trpc.location.saveGooglePlaceLocation
              .mutate({
                placeId: location.placeId,
                name: location.name,
                fullAddress: location.fullAddress,
                types: location.types,
              })
              .catch(err => console.error('Failed to save location:', err));

            const provinceSlug = location.provinceSlug;
            const citySlug = location.type === 'city' ? location.slug : location.citySlug;
            const suburbSlug = location.type === 'suburb' ? location.slug : undefined;

            if (provinceSlug && citySlug && suburbSlug) {
              window.location.href = `/property-for-sale/${provinceSlug}/${citySlug}/${suburbSlug}`;
            } else if (provinceSlug && citySlug) {
              window.location.href = `/property-for-sale/${provinceSlug}/${citySlug}`;
            } else if (provinceSlug) {
              window.location.href = `/property-for-sale/${provinceSlug}`;
            } else {
              window.location.href = `/property-for-sale?city=${encodeURIComponent(location.name)}`;
            }
          }}
          className="w-full"
        />
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-8">
        {/* Popular Cities */}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Popular Cities</h4>
          <div className="space-y-1">
            {filteredCities.map(city => (
              <Link
                key={city.slug}
                href={`/property-for-sale/${city.provinceSlug}/${city.slug}`}
                onMouseEnter={() => setHoveredCity(city.name)}
              >
                <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm hover:border-slate-200 border border-transparent cursor-pointer group">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 transition-colors group-hover:bg-blue-50">
                    <MapPin className="h-4 w-4 text-slate-500 transition-colors group-hover:text-blue-600" />
                  </div>
                  <span className="whitespace-nowrap">{city.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Popular Suburbs */}
        {filteredSuburbs.length > 0 && (
          <div className="w-[240px] shrink-0 pl-8 border-l border-slate-100">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
              Suburbs in {hoveredCity}
            </h4>
            <div className="space-y-1">
              {filteredSuburbs.map((suburb, index) => {
                const citySlug = hoveredCity.toLowerCase().replace(/\s+/g, '-');
                const provinceSlug =
                  topCities.find(c => c.name === hoveredCity)?.provinceSlug || 'gauteng';

                return (
                  <Link
                    key={index}
                    href={`/property-for-sale/${provinceSlug}/${citySlug}/${suburb.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <span className="block rounded-xl px-3.5 py-2 text-sm text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm hover:border-slate-200 border border-transparent cursor-pointer whitespace-nowrap">
                      {suburb}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const REFERRER_PRIORITY_EXCLUSIONS = new Set(['super_admin', 'property_developer', 'agency_admin']);

type NavbarUser = {
  email?: string;
  firstName?: string;
  hasManagerIdentity?: boolean;
  lastName?: string;
  name?: string;
  role?: string;
} | null;

function getDisplayName(user: NavbarUser) {
  if (!user) return 'Account';

  const composedName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (composedName) return composedName;
  if (user.name) return user.name;
  if (user.email) return String(user.email).split('@')[0];

  return 'Account';
}

function getInitials(user: NavbarUser) {
  const name = getDisplayName(user);
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) return 'A';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return parts
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

function getPrimaryAccountRoute(user: NavbarUser, hasReferrerAccess: boolean) {
  if (user?.hasManagerIdentity) return '/distribution/manager';
  if (hasReferrerAccess && !REFERRER_PRIORITY_EXCLUSIONS.has(user?.role)) {
    return '/distribution/partner/overview';
  }

  switch (user?.role) {
    case 'super_admin':
    case 'admin':
      return '/admin/overview';
    case 'property_developer':
      return '/developer/dashboard';
    case 'agency_admin':
      return '/agency/dashboard';
    case 'agent':
      return '/agent/dashboard';
    case 'service_provider':
      return '/service/dashboard';
    default:
      return '/user/dashboard';
  }
}

// Mega menu helper components
function MegaMenuShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-0 overflow-hidden flex rounded-2xl border border-slate-200/80 bg-white shadow-2xl ${className || 'w-[1100px]'}`}>
      {children}
    </div>
  );
}

function MegaMenuFeatureCard({ icon: Icon, title, description, ctaLabel, ctaHref }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; ctaLabel: string; ctaHref: string }) {
  return (
    <div className="w-[240px] bg-gradient-to-br from-slate-50 to-blue-50/40 p-7 border-r border-slate-100 flex flex-col justify-between shrink-0">
      <div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 shadow-md">
          <Icon className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1.5 leading-snug">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
      </div>
      <Link href={ctaHref}>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors mt-8 cursor-pointer group">
          {ctaLabel}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </div>
  );
}

function MegaMenuLinkCard({ href, label, onClick }: { href?: string; label: string; onClick?: (e: React.MouseEvent) => void }) {
  const classes = 'flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm hover:border-slate-200 border border-transparent cursor-pointer group';
  const content = (
    <>
      <span className="whitespace-nowrap">{label}</span>
      <ChevronRight className="h-4 w-4 text-slate-300 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
    </>
  );
  if (onClick) {
    return <span onClick={onClick} className={classes}>{content}</span>;
  }
  return <Link href={href!}><span className={classes}>{content}</span></Link>;
}

function MegaMenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function MegaMenuCtaPanel({ icon: Icon, title, description, ctaLabel, ctaHref }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; ctaLabel: string; ctaHref: string }) {
  return (
    <div className="w-[240px] bg-gradient-to-b from-slate-50/80 to-white p-7 border-l border-slate-100 flex flex-col justify-between shrink-0">
      <div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 shadow-md">
          <Icon className="h-6 w-6 text-white" />
        </div>
        <h5 className="text-base font-bold text-slate-900 mb-1.5 leading-snug">{title}</h5>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
      </div>
      <Link href={ctaHref}>
        <Button variant="outline" size="default" className="w-full text-sm h-10 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all mt-6">{ctaLabel}</Button>
      </Link>
    </div>
  );
}

export function EnhancedNavbar() {
  const { user, logout, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMarketingPage =
    location === '/advertise' ||
    location === '/book-strategy' ||
    location === '/subscription-plans' ||
    location.startsWith('/get-started');

  // Check if current route is advertise page
  const isAdvertisePage = location === '/advertise';
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{
    propertyType: string;
    listingType: 'sale' | 'rent';
  } | null>(null);
  const shouldCheckReferrerAccess = Boolean(user && !REFERRER_PRIORITY_EXCLUSIONS.has(user.role));
  const referrerStatusQuery = trpc.distribution.referrer.status.useQuery(undefined, {
    enabled: shouldCheckReferrerAccess,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const hasReferrerAccess = Boolean(referrerStatusQuery.data?.hasAccess);
  const displayName = getDisplayName(user);
  const accountInitials = getInitials(user);
  const primaryAccountRoute = getPrimaryAccountRoute(user, hasReferrerAccess);
  const primaryAccountLabel =
    primaryAccountRoute === '/distribution/partner/overview'
      ? 'Referral workspace'
      : user?.role === 'super_admin' || user?.role === 'admin'
        ? 'Admin overview'
        : 'Dashboard';
  const accountItems = user
    ? [
        {
          label: primaryAccountLabel,
          hint:
            primaryAccountRoute === '/distribution/partner/overview'
              ? 'Track referrals and deal flow'
              : 'Open your workspace',
          href: primaryAccountRoute,
          icon: LayoutDashboard,
        },
        ...(hasReferrerAccess && primaryAccountRoute !== '/distribution/partner/overview'
          ? [
              {
                label: 'Referral workspace',
                hint: 'Manage referrals and commissions',
                href: '/distribution/partner/overview',
                icon: Briefcase,
              },
            ]
          : []),
        {
          label: 'Saved homes',
          hint: 'Review your favorites',
          href: '/favorites',
          icon: Heart,
        },
        ...(user.role === 'agent'
          ? [
              {
                label: 'Account settings',
                hint: 'Manage your profile and preferences',
                href: '/agent/settings',
                icon: Settings,
              },
            ]
          : []),
      ]
    : [];

  // Check if user has a recent search location
  const getLastSearchLocation = () => {
    try {
      const saved = localStorage.getItem('lastSearchLocation');
      if (saved) {
        const { city, suburb, timestamp } = JSON.parse(saved);
        // Check if location is less than 24 hours old
        const isRecent = Date.now() - timestamp < 24 * 60 * 60 * 1000;
        if (isRecent) {
          return { city, suburb };
        }
      }
    } catch (e) {
      console.error('Error reading last search location:', e);
    }
    return null;
  };

  // Handle property link clicks
  const handlePropertyClick = (
    e: React.MouseEvent,
    propertyType: string,
    listingType: 'sale' | 'rent',
  ) => {
    e.preventDefault();
    const lastLocation = getLastSearchLocation();

    if (lastLocation) {
      // Navigate with saved location using new URL structure
      const url = generatePropertyUrl({
        listingType,
        propertyType,
        city: lastLocation.city,
        suburb: lastLocation.suburb,
      });
      setLocation(url);
    } else {
      // Show location selection modal
      setPendingNavigation({ propertyType, listingType });
      setShowLocationModal(true);
    }
  };

  // Handle location selection from modal
  const handleLocationSelected = (city: string, suburb?: string) => {
    if (pendingNavigation) {
      const url = generatePropertyUrl({
        listingType: pendingNavigation.listingType,
        propertyType: pendingNavigation.propertyType,
        city,
        suburb,
      });
      setLocation(url);
      setPendingNavigation(null);
    }
  };

  // ...

  const buyOptions = [
    { label: 'Buy Properties', href: '/property-for-sale' },
    { label: 'New Developments', href: '/new-developments' },
    {
      label: 'Luxury Homes',
      href: '/property-for-sale?propertyType=villa',
    },
    {
      label: 'Apartments',
      href: '/property-for-sale?propertyType=apartment',
    },
    {
      label: 'Houses',
      href: '/property-for-sale?propertyType=house',
    },
  ];

  const rentOptions = [
    { label: 'Rent Properties', href: '/property-to-rent' },
    {
      label: 'Apartments for Rent',
      href: '/property-to-rent?propertyType=apartment',
    },
    {
      label: 'Houses for Rent',
      href: '/property-to-rent?propertyType=house',
    },
    {
      label: 'Commercial Spaces',
      href: '/property-to-rent?propertyType=commercial',
    },
  ];

  const servicesOptions = [
    { label: 'Home Loans', href: '/services/home-loans' },
    { label: 'Property Valuation', href: '/services/property-valuation' },
    { label: 'Legal Services', href: '/services/legal-services' },
    { label: 'Home Insurance', href: '/services/home-insurance' },
    { label: 'Interior Design', href: '/services/interior-design' },
  ];

  const sellersOptions = [
    { label: 'Agents', href: '/agents' },
    { label: 'Developers', href: '/developers' },
    { label: 'Property Owner (For sale by owner)', href: '/advertise' },
  ];

  const insightsOptions = [
    { label: 'Market Trends', href: '/insights/market-trends' },
    { label: 'Property Insights', href: '/insights/property-insights' },
    { label: 'Buying Guide', href: '/guides/buying-property' },
    { label: 'Selling Guide', href: '/guides/selling-property' },
    { label: 'Blog', href: '/insights/blog' },
  ];

  const mobileMenuItems = [
    { label: 'Buy Property', href: '/property-for-sale', icon: Home },
    { label: 'Rent Property', href: '/property-to-rent', icon: Key },
    { label: 'New Developments', href: '/new-developments', icon: Building2 },
    { label: 'Find Agents', href: '/agents', icon: User },
    { label: 'Explore', href: '/explore/home', icon: TrendingUp },
    { label: 'Services', href: '/services', icon: Lightbulb },
    { label: 'Referrals', href: '/distribution-network', icon: Briefcase },
  ];

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.style.overflow = '';
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  const navigateTo = (href: string) => {
    setMobileMenuOpen(false);
    setLocation(href);
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    setLocation('/');
  };

  const handleMobileAccountClick = () => {
    if (user) {
      navigateTo(primaryAccountRoute);
      return;
    }

    window.location.href = getLoginUrl();
  };
  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200/60 bg-white shadow-sm">
      <div className="w-full px-3 sm:px-6 lg:px-20">
        <div className="flex h-13 items-center justify-between sm:h-14 lg:h-16">
          <div className="flex flex-1 items-center justify-between lg:hidden">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="rounded-xl p-2 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <Link href="/">
                <div className="flex items-center cursor-pointer group">
                  <span className="text-base font-bold tracking-tight text-blue-600 transition-colors group-hover:text-blue-700">
                    Property Listify
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/explore/home">
                <button className="rounded-lg px-2 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700">
                  Explore
                </button>
              </Link>
              <Link href="/distribution-network">
                <button className="rounded-lg px-2 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700">
                  Refer
                </button>
              </Link>
              <button
                onClick={handleMobileAccountClick}
                className="rounded-xl p-2 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                aria-label={user ? 'Open account' : 'Login'}
              >
                <User className="h-5 w-5" />
              </button>
            </div>
          </div>

          <Link href="/">
            <div className="hidden cursor-pointer items-center gap-2 group lg:flex">
              <span className="text-base font-bold tracking-tight text-blue-600 transition-colors group-hover:text-blue-700 sm:text-xl lg:text-2xl">
                Property Listify
              </span>
            </div>
          </Link>

          {/* Navigation Menu */}
          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList className="gap-1">
              {/* City Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-gray-700 hover:bg-blue-50 hover:text-blue-700 data-[state=open]:bg-blue-100 data-[state=open]:text-blue-700 font-semibold transition-all">
                  City
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <CityDropdownContent />
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* For Buyers Mega Menu */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-gray-700 hover:bg-blue-50 hover:text-blue-700 data-[state=open]:bg-blue-100 data-[state=open]:text-blue-700 font-semibold transition-all">
                  For Buyers
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                    <MegaMenuShell>
                      <MegaMenuFeatureCard icon={Home} title="Find Your Dream Home" description="Browse thousands of premium properties for sale across South Africa." ctaLabel="Browse all properties" ctaHref="/property-for-sale" />
                      <div className="flex-1 p-7 grid grid-cols-3 gap-6">
                        <div className="space-y-5">
                          <MegaMenuSection title="Residential">
                            <MegaMenuLinkCard label="Houses for Sale" onClick={e => handlePropertyClick(e, 'house', 'sale')} />
                            <MegaMenuLinkCard label="Apartments / Flats" onClick={e => handlePropertyClick(e, 'apartment', 'sale')} />
                            <MegaMenuLinkCard label="Townhouses" onClick={e => handlePropertyClick(e, 'townhouse', 'sale')} />
                            <MegaMenuLinkCard label="New Developments" href="/new-developments" />
                          </MegaMenuSection>
                        </div>
                        <div className="space-y-5">
                          <MegaMenuSection title="Commercial">
                            <MegaMenuLinkCard label="Office Spaces" onClick={e => handlePropertyClick(e, 'office', 'sale')} />
                            <MegaMenuLinkCard label="Retail Shops" onClick={e => handlePropertyClick(e, 'retail', 'sale')} />
                            <MegaMenuLinkCard label="Industrial / Warehouse" onClick={e => handlePropertyClick(e, 'industrial', 'sale')} />
                          </MegaMenuSection>
                        </div>
                        <div className="space-y-5">
                          <MegaMenuSection title="Land">
                            <MegaMenuLinkCard label="Residential Land" onClick={e => handlePropertyClick(e, 'land', 'sale')} />
                            <MegaMenuLinkCard label="Commercial Land" onClick={e => handlePropertyClick(e, 'commercial-land', 'sale')} />
                            <MegaMenuLinkCard label="Farms" onClick={e => handlePropertyClick(e, 'farm', 'sale')} />
                          </MegaMenuSection>
                        </div>
                      </div>
                      <MegaMenuCtaPanel icon={TrendingUp} title="Market Insights" description="Read our latest analysis on property trends in South Africa." ctaLabel="Read More" ctaHref="/insights/market-trends" />
                    </MegaMenuShell>
                  </NavigationMenuContent>
              </NavigationMenuItem>

              {/* For Renters Mega Menu */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-gray-700 hover:bg-blue-50 hover:text-blue-700 data-[state=open]:bg-blue-100 data-[state=open]:text-blue-700 font-semibold transition-all">
                  For Renters
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                    <MegaMenuShell>
                      <MegaMenuFeatureCard icon={Key} title="Move In With Confidence" description="Discover rental properties that match your lifestyle and budget." ctaLabel="Browse rentals" ctaHref="/property-to-rent" />
                      <div className="flex-1 p-7 grid grid-cols-3 gap-6">
                        <div className="space-y-5">
                          <MegaMenuSection title="Residential">
                            <MegaMenuLinkCard label="Apartments for Rent" onClick={e => handlePropertyClick(e, 'apartment', 'rent')} />
                            <MegaMenuLinkCard label="Houses for Rent" onClick={e => handlePropertyClick(e, 'house', 'rent')} />
                            <MegaMenuLinkCard label="Student Accommodation" onClick={e => handlePropertyClick(e, 'student', 'rent')} />
                            <MegaMenuLinkCard label="Rooms / Flatshares" onClick={e => handlePropertyClick(e, 'room', 'rent')} />
                          </MegaMenuSection>
                        </div>
                        <div className="space-y-5">
                          <MegaMenuSection title="Commercial">
                            <MegaMenuLinkCard label="Offices to Let" onClick={e => handlePropertyClick(e, 'office', 'rent')} />
                            <MegaMenuLinkCard label="Retail Space" onClick={e => handlePropertyClick(e, 'retail', 'rent')} />
                            <MegaMenuLinkCard label="Industrial Space" onClick={e => handlePropertyClick(e, 'industrial', 'rent')} />
                          </MegaMenuSection>
                        </div>
                        <div className="space-y-5">
                          <MegaMenuSection title="Popular Cities">
                            {rentCityFallbackLinks.map(link => (
                              <MegaMenuLinkCard key={link.href} label={link.label} href={link.href} />
                            ))}
                          </MegaMenuSection>
                        </div>
                      </div>
                      <MegaMenuCtaPanel icon={Calculator} title="Affordability Calc" description="Calculate how much rent you can afford based on your income." ctaLabel="Calculate Now" ctaHref="/services/home-loans" />
                    </MegaMenuShell>
                  </NavigationMenuContent>
              </NavigationMenuItem>

              {/* For Sellers Mega Menu */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-gray-700 hover:bg-blue-50 hover:text-blue-700 data-[state=open]:bg-blue-100 data-[state=open]:text-blue-700 font-semibold transition-all">
                  For Sellers
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                    <MegaMenuShell>
                      <MegaMenuFeatureCard icon={Megaphone} title="Sell With Confidence" description="Get expert guidance and reach the right buyers for your property." ctaLabel="Start selling" ctaHref="/advertise" />
                      <div className="flex-1 p-7 grid grid-cols-3 gap-6">
                        <div className="space-y-5">
                          <MegaMenuSection title="Find Professionals">
                            <MegaMenuLinkCard label="Find Estate Agents" href="/agents" />
                            <MegaMenuLinkCard label="Property Developers" href="/developers" />
                          </MegaMenuSection>
                        </div>
                        <div className="space-y-5">
                          <MegaMenuSection title="Sell Your Property">
                            <MegaMenuLinkCard label="Post For Sale by Owner" href="/advertise" />
                            <MegaMenuLinkCard label="List Privately" href="/advertise" />
                            <MegaMenuLinkCard label="My Dashboard" href="/dashboard" />
                          </MegaMenuSection>
                        </div>
                        <div className="space-y-5">
                          <MegaMenuSection title="Selling Tools">
                            <MegaMenuLinkCard label="Property Valuation" href="/tools/property-valuation" />
                            <MegaMenuLinkCard label="Sold House Prices" href="/tools/sold-house-prices" />
                            <MegaMenuLinkCard label="Seller Guide" href="/guides/selling-property" />
                            <MegaMenuLinkCard label="Market Trends" href="/insights/market-trends" />
                          </MegaMenuSection>
                        </div>
                      </div>
                      <MegaMenuCtaPanel icon={Building2} title="For Developers" description="List your development and reach thousands of buyers." ctaLabel="Developer Portal" ctaHref="/advertise/sell/developers" />
                    </MegaMenuShell>
                  </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Insights Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-gray-700 hover:bg-blue-50 hover:text-blue-700 data-[state=open]:bg-blue-100 data-[state=open]:text-blue-700 font-semibold transition-all">
                  Insights
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                    <MegaMenuShell className="w-[960px]">
                      <MegaMenuFeatureCard icon={Lightbulb} title="Smarter Property Decisions" description="Data-driven insights and expert guides to help you navigate the market." ctaLabel="Explore insights" ctaHref="/insights/property-insights" />
                      <div className="flex-1 p-7 grid grid-cols-2 gap-6">
                        <div className="space-y-5">
                          <MegaMenuSection title="Market Data">
                            <MegaMenuLinkCard label="Market Trends" href="/insights/market-trends" />
                            <MegaMenuLinkCard label="Property Insights" href="/insights/property-insights" />
                          </MegaMenuSection>
                        </div>
                        <div className="space-y-5">
                          <MegaMenuSection title="Resources">
                            <MegaMenuLinkCard label="Buying Guide" href="/guides/buying-property" />
                            <MegaMenuLinkCard label="Selling Guide" href="/guides/selling-property" />
                            <MegaMenuLinkCard label="Blog" href="/insights/blog" />
                          </MegaMenuSection>
                        </div>
                      </div>
                      <MegaMenuCtaPanel icon={Calculator} title="Property Intelligence" description="Data-driven insights to help you make smarter property decisions." ctaLabel="Explore Insights" ctaHref="/insights/property-insights" />
                    </MegaMenuShell>
                  </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Explore Mega Menu */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-gray-700 hover:bg-blue-50 hover:text-blue-700 data-[state=open]:bg-blue-100 data-[state=open]:text-blue-700 font-semibold transition-all">
                  Explore
                  <Badge className="ml-2 bg-blue-600 text-white text-[10px] px-1.5 py-0 h-4 border-0">
                    NEW
                  </Badge>
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                    <MegaMenuShell className="w-[960px]">
                      <MegaMenuFeatureCard icon={Home} title="Discover What's Next" description="Trending properties, hot spots, and expert guidance all in one place." ctaLabel="Start exploring" ctaHref="/explore/home" />
                      <div className="flex-1 p-7 grid grid-cols-2 gap-6">
                        <div className="space-y-5">
                          <MegaMenuSection title="Property Discovery">
                            <MegaMenuLinkCard label="Buy Property" href="/property-for-sale" />
                            <MegaMenuLinkCard label="Rent Property" href="/property-to-rent" />
                            <MegaMenuLinkCard label="New Developments" href="/new-developments" />
                          </MegaMenuSection>
                        </div>
                        <div className="space-y-5">
                          <MegaMenuSection title="Guides & People">
                            <MegaMenuLinkCard label="Explore Home" href="/explore/home" />
                            <MegaMenuLinkCard label="Find Agents" href="/agents" />
                          </MegaMenuSection>
                        </div>
                      </div>
                      <MegaMenuCtaPanel icon={TrendingUp} title="Discover & Explore" description="Find trending properties, new developments, and agents near you." ctaLabel="Explore Now" ctaHref="/explore/home" />
                    </MegaMenuShell>
                  </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-gray-700 hover:bg-blue-50 hover:text-blue-700 data-[state=open]:bg-blue-100 data-[state=open]:text-blue-700 font-semibold transition-all">
                  Services
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                    <MegaMenuShell className="w-[960px]">
                      <MegaMenuFeatureCard icon={Briefcase} title="Everything You Need" description="From home loans to interior design — we connect you with trusted providers." ctaLabel="View all services" ctaHref="/services" />
                      <div className="flex-1 p-7 grid grid-cols-2 gap-6">
                        <div className="space-y-5">
                          <MegaMenuSection title="Financial">
                            <MegaMenuLinkCard label="Home Loans" href="/services/home-loans" />
                            <MegaMenuLinkCard label="Property Valuation" href="/services/property-valuation" />
                            <MegaMenuLinkCard label="Home Insurance" href="/services/home-insurance" />
                          </MegaMenuSection>
                        </div>
                        <div className="space-y-5">
                          <MegaMenuSection title="Professional">
                            <MegaMenuLinkCard label="Legal Services" href="/services/legal-services" />
                            <MegaMenuLinkCard label="Interior Design" href="/services/interior-design" />
                          </MegaMenuSection>
                        </div>
                      </div>
                      <MegaMenuCtaPanel icon={Lightbulb} title="All Services" description="Explore all our property services in one place." ctaLabel="View All Services" ctaHref="/services" />
                    </MegaMenuShell>
                  </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="/distribution-network">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 font-semibold"
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    Referrals
                  </Button>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Right Side Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Advertise Button - Enhanced CTA */}
            <Link href="/advertise">
              <Button
                size="sm"
                variant="conversion"
                className={`
                  ${isAdvertisePage ? 'ring-2 ring-conversion/40 ring-offset-2' : ''}
                  hover:scale-105 transition-all duration-200 font-bold
                `}
                aria-current={isAdvertisePage ? 'page' : undefined}
              >
                <Megaphone className="h-4 w-4 mr-2" />
                Advertise with us
              </Button>
            </Link>

            {/* User Menu */}
            {loading && !isMarketingPage ? (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="border-slate-200 bg-white text-slate-400"
              >
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                Loading
              </Button>
            ) : user && !isMarketingPage ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 rounded-full px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Open account menu"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      {accountInitials}
                    </span>
                    <ChevronDown className="ml-1 h-4 w-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl"
                >
                  <div className="rounded-[1rem] px-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                        {accountInitials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {displayName}
                        </p>
                        <p className="truncate text-xs text-slate-500">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  <DropdownMenuSeparator />
                  <div className="p-1">
                    {accountItems.map(item => {
                      const Icon = item.icon;

                      return (
                        <DropdownMenuItem
                          key={item.href}
                          onClick={() => navigateTo(item.href)}
                          className="group flex items-center gap-3 rounded-xl px-3 py-2.5"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-focus:bg-slate-900 group-focus:text-white group-data-[highlighted]:bg-slate-900 group-data-[highlighted]:text-white">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-slate-900">
                              {item.label}
                            </span>
                          </span>
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="rounded-xl px-3 py-2.5 text-red-600 focus:text-red-700"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500">
                        <LogOut className="h-4 w-4" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold">Logout</span>
                      </span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : !user ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = getLoginUrl())}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all font-medium"
              >
                Login
              </Button>
            ) : null}
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="animate-in slide-in-from-top-2 border-t border-gray-100 bg-white/95 py-3 duration-200 lg:hidden">
            <div className="space-y-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <div className="grid grid-cols-2 gap-2 px-1">
                <Link href="/advertise">
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-conversion px-3 py-3 text-sm font-semibold text-conversion-foreground shadow-sm transition-colors hover:bg-conversion-hover"
                  >
                    <Megaphone className="h-4 w-4" />
                    Advertise
                  </button>
                </Link>
                <Link href="/explore/home">
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Explore
                  </button>
                </Link>
              </div>

              <div className="space-y-1">
                {mobileMenuItems.map(item => {
                  const Icon = item.icon;

                  return (
                    <Link key={item.label} href={item.href}>
                      <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-600"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1">{item.label}</span>
                        <ChevronDown className="h-4 w-4 -rotate-90 text-slate-400" />
                      </button>
                    </Link>
                  );
                })}
              </div>

              <div className="mx-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Quick access
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link href="/new-developments">
                    <span
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"
                    >
                      New Developments
                    </span>
                  </Link>
                  <Link href="/agents">
                    <span
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"
                    >
                      Agents
                    </span>
                  </Link>
                  <Link href="/services">
                    <span
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"
                    >
                      Services
                    </span>
                  </Link>
                </div>
              </div>

              <div className="mx-1 border-t border-slate-200 px-1 pt-3">
                {loading ? (
                  <div className="flex items-center gap-3 py-2">
                    <div className="h-10 w-10 rounded-full bg-slate-100" />
                    <div className="space-y-2">
                      <div className="h-4 w-28 rounded-full bg-slate-100" />
                      <div className="h-3 w-40 rounded-full bg-slate-100" />
                    </div>
                  </div>
                ) : user ? (
                  <>
                    <div className="flex items-center gap-3 px-3 py-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                        {accountInitials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {displayName}
                        </p>
                        <p className="truncate text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>

                    <div className="mt-2 space-y-1">
                      {accountItems.map(item => {
                        const Icon = item.icon;

                        return (
                          <button
                            key={item.href}
                            onClick={() => navigateTo(item.href)}
                            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-slate-100"
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-slate-900">
                                {item.label}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleLogout}
                      className="mt-2 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-red-600 transition-colors hover:bg-red-50"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500">
                        <LogOut className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold">Logout</span>
                    </button>
                  </>
                ) : (
                  <>
                    <p className="px-3 text-sm font-semibold text-slate-900">
                      Sign in to personalize your account
                    </p>
                    <p className="mt-1 px-3 text-sm text-slate-500">
                      Save homes, track activity, and pick up where you left off.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2 px-3">
                      <Button
                        onClick={() => (window.location.href = getLoginUrl())}
                        className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                      >
                        Login
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => navigateTo('/get-started')}
                        className="rounded-2xl border-slate-300"
                      >
                        Create account
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Location Selection Modal */}
      {pendingNavigation && (
        <LocationSelectionModal
          open={showLocationModal}
          onClose={() => {
            setShowLocationModal(false);
            setPendingNavigation(null);
          }}
          onLocationSelected={handleLocationSelected}
          propertyType={pendingNavigation.propertyType}
          listingType={pendingNavigation.listingType}
        />
      )}
    </nav>
  );
}
