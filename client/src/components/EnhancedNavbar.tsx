import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Heart, User, ChevronDown, MapPin, Home, Briefcase, MapPinned, TrendingUp, Calculator, Megaphone } from 'lucide-react';
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
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { LocationAutosuggest } from '@/components/LocationAutosuggest';
import { LocationSelectionModal } from '@/components/LocationSelectionModal';

// City dropdown content component
function CityDropdownContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCity, setHoveredCity] = useState('Johannesburg');

  const topCities = [
    { name: 'Johannesburg', slug: 'johannesburg' },
    { name: 'Capetown', slug: 'cape-town' },
    { name: 'Kimberley', slug: 'kimberley' },
    { name: 'Durban', slug: 'durban' },
    { name: 'Gqeberha', slug: 'gqeberha' },
    { name: 'Bloemfontein', slug: 'bloemfontein' },
    { name: 'Polokwane', slug: 'polokwane' },
    { name: 'Mbombela', slug: 'mbombela' },
    { name: 'Mahikeng', slug: 'mahikeng' },
  ];

  // Suburbs for each city
  const citySuburbs: Record<string, string[]> = {
    'Johannesburg': ['Sandton', 'Rosebank', 'Midrand', 'Fourways', 'Sunninghill', 'Lonehill', 'Parkmore', 'Linden'],
    'Capetown': ['Sea Point', 'Camps Bay', 'Constantia', 'Gardens', 'Waterfront', 'Claremont', 'Newlands', 'Rondebosch'],
    'Kimberley': ['Beaconsfield', 'Hadison Park', 'Kimberley CBD', 'Monument Heights', 'Albertynshof', 'Royldene', 'New Park', 'De Beers'],
    'Durban': ['Umhlanga', 'Ballito', 'Morningside', 'Berea', 'Westville', 'Glenwood', 'Musgrave', 'Durban North'],
    'Gqeberha': ['Summerstrand', 'Walmer', 'Newton Park', 'Humewood', 'Mill Park', 'Lorraine', 'Framesby', 'Sunridge Park'],
    'Bloemfontein': ['Westdene', 'Universitas', 'Willows', 'Bayswater', 'Arboretum', 'Fichardtpark', 'Dan Pienaar', 'Naval Hill'],
    'Polokwane': ['Bendor', 'Nirvana', 'Welgelegen', 'Ivy Park', 'Westenburg', 'Flora Park', 'Sterpark', 'Fauna Park'],
   'Mbombela': ['Sonheuwel', 'Nelspruit CBD', 'West Acres', 'Riverside Park', 'Steiltes', 'Loerie Park', 'Kiaat', 'Pienaar'],
    'Mahikeng': ['Mahikeng CBD', 'Unit 1', 'Unit 2', 'Danville', 'Montshioa', 'Riviera Park', 'Mmabatho', 'Imperial Reserve'],
  };

  const suburbs = citySuburbs[hoveredCity] || [];

  // Filter cities and suburbs based on search
  const filteredCities = topCities.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSuburbs = suburbs.filter(suburb =>
    suburb.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-[580px] p-6">
      {/* Search Bar with Autosuggest */}
      <div className="mb-6">
        <LocationAutosuggest
          placeholder="Search location"
          onSelect={(location) => {
            // Save location to database
            trpc.location.saveGooglePlaceLocation.mutate({
              placeId: location.placeId,
              name: location.name,
              fullAddress: location.fullAddress,
              types: location.types,
            }).catch(err => console.error('Failed to save location:', err));
            
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
              href={`/city/${city.slug}`}
              onMouseEnter={() => setHoveredCity(city.name)}
            >
              <div className="flex flex-col items-center gap-2 p-3 hover:bg-blue-50 rounded-lg transition-all group cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors border border-blue-100">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">{city.name}</span>
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
            {filteredSuburbs.map((suburb, index) => (
              <Link key={index} href={`/city/${hoveredCity.toLowerCase()}/suburb/${suburb.toLowerCase().replace(/\s+/g, '-')}`}>
                <span className="text-sm text-slate-600 hover:text-blue-600 cursor-pointer block py-1">
                  {suburb}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function EnhancedNavbar() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{
    propertyType: string;
    listingType: 'sale' | 'rent';
  } | null>(null);

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
  const handlePropertyClick = (e: React.MouseEvent, propertyType: string, listingType: 'sale' | 'rent') => {
    e.preventDefault();
    const lastLocation = getLastSearchLocation();
    
    if (lastLocation) {
      // Navigate with saved location
      const params = new URLSearchParams({
        type: propertyType,
        listingType,
        city: lastLocation.city.toLowerCase(),
      });
      if (lastLocation.suburb) {
        params.append('suburb', lastLocation.suburb.toLowerCase());
      }
      setLocation(`/properties?${params.toString()}`);
    } else {
      // Show location selection modal
      setPendingNavigation({ propertyType, listingType });
      setShowLocationModal(true);
    }
  };

  // Handle location selection from modal
  const handleLocationSelected = (city: string, suburb?: string) => {
    if (pendingNavigation) {
      const params = new URLSearchParams({
        type: pendingNavigation.propertyType,
        listingType: pendingNavigation.listingType,
        city: city.toLowerCase(),
      });
      if (suburb) {
        params.append('suburb', suburb.toLowerCase());
      }
      setLocation(`/properties?${params.toString()}`);
      setPendingNavigation(null);
    }
  };
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    logout();
  };

  const cities = [
    { name: 'Johannesburg', slug: 'johannesburg' },
    { name: 'Cape Town', slug: 'cape-town' },
    { name: 'Durban', slug: 'durban' },
    { name: 'Pretoria', slug: 'pretoria' },
    { name: 'Port Elizabeth', slug: 'port-elizabeth' },
    { name: 'Bloemfontein', slug: 'bloemfontein' },
  ];

  const buyOptions = [
    { label: 'Buy Properties', href: '/properties?listingType=sale' },
    { label: 'New Developments', href: '/developments' },
    {
      label: 'Luxury Homes',
      href: '/properties?listingType=sale&propertyType=villa',
    },
    {
      label: 'Apartments',
      href: '/properties?listingType=sale&propertyType=apartment',
    },
    {
      label: 'Houses',
      href: '/properties?listingType=sale&propertyType=house',
    },
  ];

  const rentOptions = [
    { label: 'Rent Properties', href: '/properties?listingType=rent' },
    {
      label: 'Apartments for Rent',
      href: '/properties?listingType=rent&propertyType=apartment',
    },
    {
      label: 'Houses for Rent',
      href: '/properties?listingType=rent&propertyType=house',
    },
    {
      label: 'Commercial Spaces',
      href: '/properties?listingType=rent&propertyType=commercial',
    },
  ];

  const servicesOptions = [
    { label: 'Home Loans', href: '#' },
    { label: 'Property Valuation', href: '#' },
    { label: 'Legal Services', href: '#' },
    { label: 'Home Insurance', href: '#' },
    { label: 'Interior Design', href: '#' },
  ];

  const resourcesOptions = [
    { label: 'Property Insights', href: '#' },
    { label: 'Market Trends', href: '#' },
    { label: 'Buying Guide', href: '#' },
    { label: 'Selling Guide', href: '#' },
    { label: 'Blog', href: '#' },
  ];

  return (
    <nav className="bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-200/50">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer group">
              <span className="text-2xl font-bold tracking-tight text-blue-600 group-hover:text-blue-700 transition-colors">
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

              {/* Buy Mega Menu */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-gray-700 hover:bg-blue-50 hover:text-blue-700 data-[state=open]:bg-blue-100 data-[state=open]:text-blue-700 font-semibold transition-all">
                  Buy
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
                          <li><span onClick={(e) => handlePropertyClick(e, 'house', 'sale')} className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Houses for Sale</span></li>
                          <li><span onClick={(e) => handlePropertyClick(e, 'apartment', 'sale')} className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Apartments / Flats</span></li>
                          <li><span onClick={(e) => handlePropertyClick(e, 'townhouse', 'sale')} className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Townhouses</span></li>
                          <li><Link href="/developments"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">New Developments</span></Link></li>
                        </ul>
                      </div>

                      {/* Commercial */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-blue-600" /> Commercial
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li><span onClick={(e) => handlePropertyClick(e, 'office', 'sale')} className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Office Spaces</span></li>
                          <li><span onClick={(e) => handlePropertyClick(e, 'retail', 'sale')} className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Retail Shops</span></li>
                          <li><span onClick={(e) => handlePropertyClick(e, 'industrial', 'sale')} className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Industrial / Warehouse</span></li>
                        </ul>
                      </div>

                      {/* Land & Plot */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <MapPinned className="h-4 w-4 text-blue-600" /> Land
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li><span onClick={(e) => handlePropertyClick(e, 'land', 'sale')} className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Residential Land</span></li>
                          <li><span onClick={(e) => handlePropertyClick(e, 'commercial-land', 'sale')} className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Commercial Land</span></li>
                          <li><span onClick={(e) => handlePropertyClick(e, 'farm', 'sale')} className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Farms</span></li>
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
                        <p className="text-xs text-slate-500 mb-3">Read our latest analysis on property trends in South Africa.</p>
                        <Button variant="outline" size="sm" className="w-full text-xs h-8 border-blue-200 text-blue-600 hover:bg-blue-50">
                          Read More
                        </Button>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Rent Mega Menu */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-gray-700 hover:bg-blue-50 hover:text-blue-700 data-[state=open]:bg-blue-100 data-[state=open]:text-blue-700 font-semibold transition-all">
                  Rent
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
                          <li><span onClick={(e) => handlePropertyClick(e, 'apartment', 'rent')} className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Apartments for Rent</span></li>
                          <li><span onClick={(e) => handlePropertyClick(e, 'house', 'rent')} className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Houses for Rent</span></li>
                          <li><span onClick={(e) => handlePropertyClick(e, 'student', 'rent')} className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Student Accommodation</span></li>
                          <li><span onClick={(e) => handlePropertyClick(e, 'room', 'rent')} className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Rooms / Flatshares</span></li>
                        </ul>
                      </div>

                      {/* Commercial */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-blue-600" /> Commercial
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li><span onClick={(e) => handlePropertyClick(e, 'office', 'rent')} className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Offices to Let</span></li>
                          <li><span onClick={(e) => handlePropertyClick(e, 'retail', 'rent')} className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Retail Space</span></li>
                          <li><span onClick={(e) => handlePropertyClick(e, 'industrial', 'rent')} className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Industrial Space</span></li>
                        </ul>
                      </div>

                      {/* Popular Cities */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-600" /> Popular Cities
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li><Link href="/city/johannesburg?listingType=rent"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Rent in Johannesburg</span></Link></li>
                          <li><Link href="/city/cape-town?listingType=rent"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Rent in Cape Town</span></Link></li>
                          <li><Link href="/city/durban?listingType=rent"><span className="text-slate-600 hover:text-blue-600 cursor-pointer block py-1">Rent in Durban</span></Link></li>
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
                        <p className="text-xs text-slate-500 mb-3">Calculate how much rent you can afford based on your income.</p>
                        <Button variant="outline" size="sm" className="w-full text-xs h-8 border-blue-200 text-blue-600 hover:bg-blue-50">
                          Calculate Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* New Developments Link */}
              <NavigationMenuItem>
                <Link href="/developments">
                  <NavigationMenuLink className="bg-transparent text-gray-700 hover:bg-blue-50 hover:text-blue-700 font-semibold transition-all px-4 py-2 rounded-md cursor-pointer">
                    New Developments
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>

              {/* Services Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-gray-700 hover:bg-blue-50 hover:text-blue-700 data-[state=open]:bg-blue-100 data-[state=open]:text-blue-700 font-semibold transition-all">
                  Services
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[250px] p-2">
                    {servicesOptions.map(option => (
                      <a key={option.href} href={option.href}>
                        <NavigationMenuLink className="block p-3 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
                          {option.label}
                        </NavigationMenuLink>
                      </a>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Resources Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-gray-700 hover:bg-blue-50 hover:text-blue-700 data-[state=open]:bg-blue-100 data-[state=open]:text-blue-700 font-semibold transition-all">
                  Resources
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[250px] p-2">
                    {resourcesOptions.map(option => (
                      <a key={option.href} href={option.href}>
                        <NavigationMenuLink className="block p-3 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors">
                          {option.label}
                        </NavigationMenuLink>
                      </a>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Explore Button - Enhanced */}
              <NavigationMenuItem>
                <Link href="/explore">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 font-semibold border-0"
                  >
                    Explore
                  </Button>
                </Link>
              </NavigationMenuItem>

              {/* Advertise Button - Enhanced CTA */}
              <NavigationMenuItem>
                <Link href="/advertise">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 hover:from-amber-600 hover:to-yellow-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 font-bold border border-amber-600/30"
                  >
                    <Megaphone className="h-4 w-4 mr-2" />
                    Advertise
                  </Button>
                </Link>
              </NavigationMenuItem>

              {/* Data Badge - Removed */}
              {/* <NavigationMenuItem>
                <Link href="/explore">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:text-white ml-2"
                  >
                    Data
                  </Button>
                </Link>
              </NavigationMenuItem> */}

              {/* Intelligence Link - Removed */}
              {/* <NavigationMenuItem>
                <Link href="/explore">
                  <NavigationMenuLink className="px-4 py-2 text-white hover:text-white/80 transition-colors">
                    Intelligence
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem> */}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* Sell or Rent Property Button */}
            <Link href="/advertise">
              <Button
                variant="outline"
                size="sm"
                className="hidden md:flex border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all font-medium"
              >
                List Property
              </Button>
            </Link>

            {/* Favorites */}
            {!!user && (
              <Link href="/favorites">
                <Button variant="ghost" size="icon" className="text-foreground hover:bg-blue-50 hover:text-blue-600">
                  <Heart className="h-5 w-5" />
                </Button>
              </Link>
            )}

            {/* User Menu */}
            {!!user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all font-medium"
                  >
                    <User className="h-4 w-4 mr-2" />
                    {user?.name || 'Account'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem disabled>
                    <div className="flex flex-col">
                      <span className="font-semibold">{user?.name}</span>
                      <span className="text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/favorites">
                      <a className="flex items-center gap-2 w-full">
                        <Heart className="h-4 w-4" />
                        My Favorites
                      </a>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => (window.location.href = getLoginUrl())}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all font-medium"
              >
                Login
              </Button>
            )}
          </div>
        </div>
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
