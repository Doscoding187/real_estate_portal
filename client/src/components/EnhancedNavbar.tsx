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
import { useEffect, useState } from 'react';
import { LocationAutosuggest } from '@/components/LocationAutosuggest';
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
    Capetown: [
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
    <div className="w-[580px] p-6">
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

            // Navigate to location page
            window.location.href = `/search?location=${encodeURIComponent(location.name)}`;
          }}
          className="w-full"
        />
      </div>

      {/* Top Cities */}
      <div className="mb-6">
        <h4 className="font-bold text-lg text-slate-900 mb-4">Top cities</h4>
        <div className="grid grid-cols-3 gap-4">
          {filteredCities.map(city => (
            <Link
              key={city.slug}
              href={`/property-for-sale/${city.provinceSlug}/${city.slug}`}
              onMouseEnter={() => setHoveredCity(city.name)}
            >
              <div className="flex flex-col items-center gap-2 p-3 hover:bg-blue-50 rounded-lg transition-all group cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors border border-blue-100">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">
                  {city.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Popular Suburbs */}
      {filteredSuburbs.length > 0 && (
        <div className="pt-4 border-t border-slate-200">
          <h4 className="font-bold text-sm text-slate-900 mb-3">Popular Suburbs</h4>
          <div className="grid grid-cols-4 gap-2">
            {filteredSuburbs.map((suburb, index) => {
              const citySlug = hoveredCity.toLowerCase().replace(/\s+/g, '-');
              // Helper to find province of hovered city
              const provinceSlug =
                topCities.find(c => c.name === hoveredCity)?.provinceSlug || 'gauteng';

              return (
                <Link
                  key={index}
                  href={`/property-for-sale/${provinceSlug}/${citySlug}/${suburb.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <span className="text-sm text-slate-600 hover:text-blue-600 cursor-pointer block py-1">
                    {suburb}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
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
    return '/referrer/dashboard';
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
    default:
      return '/user/dashboard';
  }
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
    primaryAccountRoute === '/referrer/dashboard'
      ? 'Referral workspace'
      : user?.role === 'super_admin' || user?.role === 'admin'
        ? 'Admin overview'
        : 'Dashboard';
  const accountItems = user
    ? [
        {
          label: primaryAccountLabel,
          hint:
            primaryAccountRoute === '/referrer/dashboard'
              ? 'Track referrals and deal flow'
              : 'Open your workspace',
          href: primaryAccountRoute,
          icon: LayoutDashboard,
        },
        ...(hasReferrerAccess && primaryAccountRoute !== '/referrer/dashboard'
          ? [
              {
                label: 'Referral workspace',
                hint: 'Manage referrals and commissions',
                href: '/referrer/dashboard',
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
    { label: 'Home Loans', href: '#' },
    { label: 'Property Valuation', href: '#' },
    { label: 'Legal Services', href: '#' },
    { label: 'Home Insurance', href: '#' },
    { label: 'Interior Design', href: '#' },
  ];

  const sellersOptions = [
    { label: 'Agents', href: '/agents' },
    { label: 'Agencies', href: '/agencies' },
    { label: 'Developers', href: '/developer' },
    { label: 'Property Owner (For sale by owner)', href: '/advertise' },
  ];

  const insightsOptions = [
    { label: 'Market Trends', href: '#' },
    { label: 'Property Insights', href: '#' },
    { label: 'Buying Guide', href: '#' },
    { label: 'Selling Guide', href: '#' },
    { label: 'Blog', href: '#' },
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
  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/92 shadow-sm backdrop-blur-md">
      <div className="w-full px-3 sm:px-6 lg:px-20">
        <div className="flex h-13 items-center justify-between sm:h-14 lg:h-16">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl p-2 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600 lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer group">
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
                  <div className="w-[800px] p-0 overflow-hidden flex">
                    {/* Main Content */}
                    <div className="flex-1 p-6 grid grid-cols-3 gap-8 bg-white">
                      {/* Residential */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <Home className="h-4 w-4 text-blue-600" /> Residential
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li>
                            <span
                              onClick={e => handlePropertyClick(e, 'house', 'sale')}
                              className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1"
                            >
                              Houses for Sale
                            </span>
                          </li>
                          <li>
                            <span
                              onClick={e => handlePropertyClick(e, 'apartment', 'sale')}
                              className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1"
                            >
                              Apartments / Flats
                            </span>
                          </li>
                          <li>
                            <span
                              onClick={e => handlePropertyClick(e, 'townhouse', 'sale')}
                              className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1"
                            >
                              Townhouses
                            </span>
                          </li>
                          <li>
                            <Link href="/new-developments">
                              <span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">
                                New Developments
                              </span>
                            </Link>
                          </li>
                        </ul>
                      </div>

                      {/* Commercial */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-blue-600" /> Commercial
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li>
                            <span
                              onClick={e => handlePropertyClick(e, 'office', 'sale')}
                              className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1"
                            >
                              Office Spaces
                            </span>
                          </li>
                          <li>
                            <span
                              onClick={e => handlePropertyClick(e, 'retail', 'sale')}
                              className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1"
                            >
                              Retail Shops
                            </span>
                          </li>
                          <li>
                            <span
                              onClick={e => handlePropertyClick(e, 'industrial', 'sale')}
                              className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1"
                            >
                              Industrial / Warehouse
                            </span>
                          </li>
                        </ul>
                      </div>

                      {/* Land & Plot */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <MapPinned className="h-4 w-4 text-blue-600" /> Land
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li>
                            <span
                              onClick={e => handlePropertyClick(e, 'land', 'sale')}
                              className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1"
                            >
                              Residential Land
                            </span>
                          </li>
                          <li>
                            <span
                              onClick={e => handlePropertyClick(e, 'commercial-land', 'sale')}
                              className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1"
                            >
                              Commercial Land
                            </span>
                          </li>
                          <li>
                            <span
                              onClick={e => handlePropertyClick(e, 'farm', 'sale')}
                              className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1"
                            >
                              Farms
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Featured / Insights Sidebar */}
                    <div className="w-64 bg-slate-50 p-6 border-l border-slate-100 flex flex-col justify-center">
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        <h5 className="font-bold text-slate-800 mb-1">Market Insights</h5>
                        <p className="text-xs text-slate-500 mb-3">
                          Read our latest analysis on property trends in South Africa.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-8 border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          Read More
                        </Button>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* For Renters Mega Menu */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-gray-700 hover:bg-blue-50 hover:text-blue-700 data-[state=open]:bg-blue-100 data-[state=open]:text-blue-700 font-semibold transition-all">
                  For Renters
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[800px] p-0 overflow-hidden flex">
                    {/* Main Content */}
                    <div className="flex-1 p-6 grid grid-cols-3 gap-8 bg-white">
                      {/* Residential */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <Home className="h-4 w-4 text-blue-600" /> Residential
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li>
                            <span
                              onClick={e => handlePropertyClick(e, 'apartment', 'rent')}
                              className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1"
                            >
                              Apartments for Rent
                            </span>
                          </li>
                          <li>
                            <span
                              onClick={e => handlePropertyClick(e, 'house', 'rent')}
                              className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1"
                            >
                              Houses for Rent
                            </span>
                          </li>
                          <li>
                            <span
                              onClick={e => handlePropertyClick(e, 'student', 'rent')}
                              className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1"
                            >
                              Student Accommodation
                            </span>
                          </li>
                          <li>
                            <span
                              onClick={e => handlePropertyClick(e, 'room', 'rent')}
                              className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1"
                            >
                              Rooms / Flatshares
                            </span>
                          </li>
                        </ul>
                      </div>

                      {/* Commercial */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-blue-600" /> Commercial
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li>
                            <span
                              onClick={e => handlePropertyClick(e, 'office', 'rent')}
                              className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1"
                            >
                              Offices to Let
                            </span>
                          </li>
                          <li>
                            <span
                              onClick={e => handlePropertyClick(e, 'retail', 'rent')}
                              className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1"
                            >
                              Retail Space
                            </span>
                          </li>
                          <li>
                            <span
                              onClick={e => handlePropertyClick(e, 'industrial', 'rent')}
                              className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1"
                            >
                              Industrial Space
                            </span>
                          </li>
                        </ul>
                      </div>

                      {/* Popular Cities */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-600" /> Popular Cities
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li>
                            <Link href="/property-to-rent/gauteng/johannesburg">
                              <span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">
                                Rent in Johannesburg
                              </span>
                            </Link>
                          </li>
                          <li>
                            <Link href="/property-to-rent/western-cape/cape-town">
                              <span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">
                                Rent in Cape Town
                              </span>
                            </Link>
                          </li>
                          <li>
                            <Link href="/property-to-rent/kwazulu-natal/durban">
                              <span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">
                                Rent in Durban
                              </span>
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Featured / Tools Sidebar */}
                    <div className="w-64 bg-slate-50 p-6 border-l border-slate-100 flex flex-col justify-center">
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                          <Calculator className="h-5 w-5 text-blue-600" />
                        </div>
                        <h5 className="font-bold text-slate-800 mb-1">Affordability Calc</h5>
                        <p className="text-xs text-slate-500 mb-3">
                          Calculate how much rent you can afford based on your income.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs h-8 border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          Calculate Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* For Sellers Mega Menu */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-gray-700 hover:bg-blue-50 hover:text-blue-700 data-[state=open]:bg-blue-100 data-[state=open]:text-blue-700 font-semibold transition-all">
                  For Sellers
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[850px] p-0 overflow-hidden flex">
                    {/* Main Content */}
                    <div className="flex-1 p-8 grid grid-cols-3 gap-12 bg-white">
                      {/* Find Professionals */}
                      <div className="space-y-5">
                        <h4 className="font-bold text-slate-800 text-base flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          Find Professionals
                        </h4>
                        <ul className="space-y-3 text-sm pl-1">
                          <li>
                            <Link href="/agents">
                              <span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1.5">
                                Find Estate Agents
                              </span>
                            </Link>
                          </li>
                          <li>
                            <Link href="/agencies">
                              <span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1.5">
                                Find Agencies
                              </span>
                            </Link>
                          </li>
                          <li>
                            <Link href="/developments">
                              <span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1.5">
                                Property Developers
                              </span>
                            </Link>
                          </li>
                        </ul>
                      </div>

                      {/* Sell Your Property */}
                      <div className="space-y-5">
                        <h4 className="font-bold text-slate-800 text-base flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Key className="h-4 w-4 text-blue-600" />
                          </div>
                          Sell Your Property
                        </h4>
                        <ul className="space-y-3 text-sm pl-1">
                          <li>
                            <Link href="/advertise">
                              <span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1.5">
                                Post For Sale by Owner
                              </span>
                            </Link>
                          </li>
                          <li>
                            <Link href="/advertise">
                              <span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1.5">
                                List Privately
                              </span>
                            </Link>
                          </li>
                          <li>
                            <Link href="/dashboard">
                              <span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1.5">
                                My Dashboard
                              </span>
                            </Link>
                          </li>
                        </ul>
                      </div>

                      {/* Selling Tools */}
                      <div className="space-y-5">
                        <h4 className="font-bold text-slate-800 text-base flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Lightbulb className="h-4 w-4 text-blue-600" />
                          </div>
                          Selling Tools
                        </h4>
                        <ul className="space-y-3 text-sm pl-1">
                          <li>
                            <Link href="#">
                              <span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1.5">
                                Property Valuation
                              </span>
                            </Link>
                          </li>
                          <li>
                            <Link href="#">
                              <span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1.5">
                                Sold House Prices
                              </span>
                            </Link>
                          </li>
                          <li>
                            <Link href="#">
                              <span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1.5">
                                Seller Guide
                              </span>
                            </Link>
                          </li>
                          <li>
                            <Link href="#">
                              <span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1.5">
                                Market Trends
                              </span>
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Featured Sidebar */}
                    <div className="w-64 bg-slate-50 p-6 border-l border-slate-100 flex flex-col justify-center">
                      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                          <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <h5 className="font-bold text-slate-800 mb-2">For Developers</h5>
                        <p className="text-sm text-slate-500 mb-4">
                          List your development and reach thousands of buyers.
                        </p>
                        <Link href="/developer">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-sm h-9 border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            Developer Portal
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Insights Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-gray-700 hover:bg-blue-50 hover:text-blue-700 data-[state=open]:bg-blue-100 data-[state=open]:text-blue-700 font-semibold transition-all">
                  Insights
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[250px] p-2">
                    {insightsOptions.map(option => (
                      <NavigationMenuLink key={option.label} asChild>
                        <a
                          href={option.href}
                          className="block p-3 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors"
                        >
                          {option.label}
                        </a>
                      </NavigationMenuLink>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Explore Button - Enhanced */}
              <NavigationMenuItem>
                <Link href="/explore/home">
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative border-blue-600 text-blue-600 hover:bg-blue-50 hover:border-blue-700 transition-all duration-200 font-semibold"
                  >
                    Explore
                    <Badge className="ml-2 bg-blue-600 text-white text-[10px] px-1.5 py-0 h-4 border-0">
                      NEW
                    </Badge>
                  </Button>
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="/services">
                  <span className="inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-blue-50 hover:text-blue-700">
                    Services
                  </span>
                </Link>
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
                className={`
                  ${
                    isAdvertisePage
                      ? 'bg-gradient-to-r from-blue-800 to-blue-900 ring-2 ring-blue-400 ring-offset-2'
                      : 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900'
                  }
                  text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 font-bold border border-blue-600
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

          <div className="w-9 lg:hidden" />
          <div className="w-9 lg:hidden" />
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="animate-in slide-in-from-top-2 border-t border-gray-100 bg-white/95 py-3 duration-200 lg:hidden">
            <div className="space-y-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <div className="grid grid-cols-2 gap-2 px-1">
                <Link href="/advertise">
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                  >
                    <Megaphone className="h-4 w-4" />
                    Advertise
                  </button>
                </Link>
                <Link href="/explore/home">
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
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
                        <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
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
