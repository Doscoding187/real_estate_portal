import { useState, useMemo } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Home,
  Heart,
  Building2,
  Hotel,
  MapPin,
  Briefcase,
  Users,
  Search,
  Mic,
  MapPinned,
  ChevronDown,
  Loader2,
  Key,
  Building,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { generatePropertyUrl } from '@/lib/urlUtils';
import { LocationAutosuggest } from './LocationAutosuggest';
import { trpc } from '@/lib/trpc';



export interface EnhancedHeroProps {
  variant?: 'home' | 'location';
  title?: React.ReactNode;
  subtitle?: string;
  backgroundImage?: string;
  heroMode?: 'standard' | 'province' | 'city';
  navigationItems?: { label: string; path: string; active?: boolean; }[];
  customShortcuts?: {
    label: string;
    icon?: any;
    path?: string;
    filters?: any;
  }[];
  initialSearchQuery?: string;
}

export function EnhancedHero({
  variant = 'home',
  title,
  subtitle,
  backgroundImage,
  heroMode = 'standard',
  navigationItems = [],
  customShortcuts,
  initialSearchQuery = ''
}: EnhancedHeroProps) {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  const [budget, setBudget] = useState('');
  
  // Filter panel state
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter values
  const [filters, setFilters] = useState({
    // Buy filters
    propertyIntent: '',
    propertyTypes: [] as string[],
    priceMin: '',
    priceMax: '',
    
    // Rental filters
    furnished: false,
    leaseTerm: '',
    budgetMin: '',
    budgetMax: '',
    
    // Development filters
    developmentType: '',
    developmentStatus: '',
    
    // Plot & Land filters
    landType: '',
    sizeMin: '',
    sizeMax: '',
    
    // Commercial filters
    commercialUseType: '',
    saleOrRent: 'sale',
    lotSizeMin: '',
    lotSizeMax: '',
    zoning: '',
    parkingSpaces: '',
    
    // Shared Living filters
    roomType: '',
    billsIncluded: false,
    genderPreference: '',
    
    // Agent filters
    agentName: '',
    agency: '',
  });

  // Filter configuration
  const filterConfig = {
    buy: {
      intents: ['Residential', 'Commercial', 'Land & Plots', 'Farms & Smallholdings'],
      propertyTypes: {
        Residential: ['House', 'Apartment', 'Townhouse', 'Cluster', 'Penthouse', 'Duplex', 'Villa'],
        Commercial: ['Office', 'Retail', 'Industrial', 'Warehouse', 'Mixed-Use'],
        'Land & Plots': ['Residential Stand', 'Commercial Stand', 'Agricultural Land'],
        'Farms & Smallholdings': ['Farm', 'Smallholding', 'Game Farm', 'Lifestyle Farm'],
      },
    },
    rental: {
      intents: ['Residential', 'Commercial', 'Shared Living'],
      propertyTypes: {
        Residential: ['House', 'Apartment', 'Townhouse', 'Cluster', 'Room', 'Studio'],
        Commercial: ['Office', 'Retail', 'Industrial', 'Warehouse'],
        'Shared Living': ['Room in Apartment', 'Room in House', 'Co-Living Space', 'Student Accommodation'],
      },
      leaseTerms: ['Month-to-month', '6 months', '12 months', '24+ months'],
    },
    projects: {
      types: ['Full Title', 'Sectional Title', 'Security Estate', 'Retirement', 'Co-Living', 'Luxury', 'Affordable Housing'],
      statuses: ['Off-Plan', 'Under Construction', 'Completed', 'Launching Soon'],
    },
    plot: {
      types: ['Residential', 'Commercial', 'Agricultural', 'Industrial'],
    },
    commercial: {
      useTypes: ['Office', 'Retail', 'Industrial', 'Warehouse', 'Medical', 'Mixed-Use'],
    },
    pg: {
      roomTypes: ['Room in Apartment', 'Room in House', 'Co-Living', 'Student Accommodation'],
      genderOptions: ['Male Only', 'Female Only', 'Mixed'],
    },
  };

  // Comprehensive South African location data with context

  const categories = [
    { id: 'buy', label: 'Buy', icon: Home },
    { id: 'rental', label: 'Rental', icon: Heart },
    { id: 'projects', label: 'Developments', icon: Building2 },
    { id: 'pg', label: 'Shared Living', icon: Users },
    { id: 'plot', label: 'Plot & Land', icon: MapPin },
    { id: 'commercial', label: 'Commercial', icon: Briefcase },
    { id: 'agents', label: 'Agents', icon: Users },
  ];


  const handleCategoryClick = (categoryId: string) => {
    setActiveTab(categoryId);
    // Show filters for all categories except agents (which navigates directly)
    if (categoryId === 'agents') {
      setLocation('/agents');
      setShowFilters(false);
    } else {
      setShowFilters(true);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };


  // --- LIVE COUNT LOGIC ---
  const countQueryFilters = useMemo(() => {
    // Construct filters based on current selection to get live count
    const activeFilters: any = {};
    
    // Location
    if (selectedLocation) {
        if (selectedLocation.type === 'city') activeFilters.city = selectedLocation.name;
        if (selectedLocation.type === 'suburb') activeFilters.suburb = [selectedLocation.name];
        if (selectedLocation.provinceSlug) activeFilters.province = selectedLocation.provinceSlug; // Heuristic
    }

    // Active Tab Filters
    if (activeTab === 'buy') {
        activeFilters.listingType = 'sale';
        if (filters.propertyTypes.length > 0) activeFilters.propertyType = filters.propertyTypes.map(t => t.toLowerCase());
        if (filters.priceMin) activeFilters.minPrice = parseInt(filters.priceMin);
        if (filters.priceMax) activeFilters.maxPrice = parseInt(filters.priceMax);
    } else if (activeTab === 'rental') {
        activeFilters.listingType = 'rent';
        if (filters.propertyTypes.length > 0) activeFilters.propertyType = filters.propertyTypes.map(t => t.toLowerCase());
        if (filters.budgetMin) activeFilters.minPrice = parseInt(filters.budgetMin);
        if (filters.budgetMax) activeFilters.maxPrice = parseInt(filters.budgetMax);
    }
    
    return activeFilters;
  }, [activeTab, filters, selectedLocation]);

  // Fetch count
  const { data: countData, isLoading: isCountLoading } = trpc.properties.getFilterCounts.useQuery(
    { filters: countQueryFilters },
    { 
        enabled: !!selectedLocation || !!filters.propertyIntent || !!filters.priceMax, // Only fetch if user has interacted
        staleTime: 30000 
    }
  );

  const resultCount = countData?.data?.total || 0;


  const handleSearch = () => {
    // Intelligent Routing Logic
    // We utilize the structured location data from LocationAutosuggest directly.
    
    if (activeTab === 'buy' || activeTab === 'rental') {
        const listingType = activeTab === 'rental' ? 'rent' : 'sale';
        
        // 1. Single Location Selection logic (Matches ListingNavbar)
        if (selectedLocation) {
             const isProvince = selectedLocation.type === 'province' || selectedLocation.type === 'administrative_area_level_1';
             
             if (!isProvince) {
                 // Force interactive results for single city/suburb
                 const root = listingType === 'rent' ? '/property-to-rent' : '/property-for-sale';
                 const params = new URLSearchParams();
                 
                 // Resolve province context using normalized lookup
                 const { getProvinceForCity, normalizeLocationKey } = require('@/lib/locationUtils');
                 const locationSlug = normalizeLocationKey(selectedLocation.name);
                 const resolvedProvince = selectedLocation.provinceSlug || getProvinceForCity(selectedLocation.name);
                 
                 if (selectedLocation.type === 'suburb') {
                    params.set('suburb', locationSlug);
                    // Include city context if available
                    if (selectedLocation.citySlug) {
                       params.set('city', normalizeLocationKey(selectedLocation.citySlug));
                    }
                 } else {
                    // Default to city for 'city' or fallback
                    params.set('city', locationSlug);
                 }
                 
                 // Always include province for geographic accuracy
                 if (resolvedProvince) {
                    params.set('province', resolvedProvince);
                 }
                 
                 // Add price filters if present
                 if (activeTab === 'buy') {
                    if (filters.priceMin) params.set('minPrice', filters.priceMin);
                    if (filters.priceMax) params.set('maxPrice', filters.priceMax);
                 } else {
                    if (filters.budgetMin) params.set('minPrice', filters.budgetMin);
                    if (filters.budgetMax) params.set('maxPrice', filters.budgetMax); 
                 }

                 if (filters.propertyTypes.length > 0) {
                    params.set('propertyType', filters.propertyTypes[0].toLowerCase());
                 }

                 setLocation(`${root}?${params.toString()}`);
                 return;
             }
        }

        // 2. Default / Fallback Logic (Provinces or Text Search)
        const searchFilters: any = {
            listingType,
            propertyType: filters.propertyTypes.length > 0 ? filters.propertyTypes[0].toLowerCase() : undefined,
            // Common price fields (default to buy)
            minPrice: filters.priceMin ? parseInt(filters.priceMin) : undefined,
            maxPrice: filters.priceMax ? parseInt(filters.priceMax) : undefined,
        };

        // Override for rental specific fields
        if (activeTab === 'rental') {
             if (filters.budgetMin) searchFilters.minPrice = parseInt(filters.budgetMin);
             if (filters.budgetMax) searchFilters.maxPrice = parseInt(filters.budgetMax);
             if (filters.furnished) searchFilters.furnished = true;
        }

        if (selectedLocation) {
             // It is a province (passed the check above)
             searchFilters.province = selectedLocation.slug;
        } else if (searchQuery) {
             // Text search fallback
             searchFilters.city = searchQuery;
        }

        const url = generatePropertyUrl(searchFilters);
        setLocation(url);
        return;
    }

    // Fallback Routing for Empty Searches or Special Categories
    switch (activeTab) {
      case 'buy': {
        const url = generatePropertyUrl({
          listingType: 'sale',
          propertyType: filters.propertyTypes[0]?.toLowerCase(),
          minPrice: filters.priceMin ? parseInt(filters.priceMin) : undefined,
          maxPrice: filters.priceMax ? parseInt(filters.priceMax) : undefined,
        });
        setLocation(url);
        break;
      }

      case 'rental': {
        const url = generatePropertyUrl({
          listingType: 'rent',
          propertyType: filters.propertyTypes[0]?.toLowerCase(),
          minPrice: filters.budgetMin ? parseInt(filters.budgetMin) : undefined,
          maxPrice: filters.budgetMax ? parseInt(filters.budgetMax) : undefined,
          furnished: filters.furnished,
        });
        setLocation(url);
        break;
      }

      case 'projects': {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (filters.developmentType) params.set('type', filters.developmentType);
        if (filters.developmentStatus) params.set('status', filters.developmentStatus);
        if (filters.priceMin) params.set('minPrice', filters.priceMin);
        if (filters.priceMax) params.set('maxPrice', filters.priceMax);
        setLocation(`/developments?${params.toString()}`);
        break;
      }

      case 'plot': {
        const url = generatePropertyUrl({
          listingType: 'sale',
          propertyType: 'land',
          city: searchQuery || undefined,
          minPrice: filters.priceMin ? parseInt(filters.priceMin) : undefined,
          maxPrice: filters.priceMax ? parseInt(filters.priceMax) : undefined,
        });
        setLocation(url);
        break;
      }

      case 'commercial': {
        const url = generatePropertyUrl({
          listingType: filters.saleOrRent as 'sale' | 'rent',
          propertyType: 'commercial',
          city: searchQuery || undefined,
        });
        setLocation(url);
        break;
      }

      case 'pg': {
        const url = generatePropertyUrl({
          listingType: 'rent',
          propertyType: 'shared_living',
          city: searchQuery || undefined,
          minPrice: filters.budgetMin ? parseInt(filters.budgetMin) : undefined,
          maxPrice: filters.budgetMax ? parseInt(filters.budgetMax) : undefined,
        });
        setLocation(url);
        break;
      }

      case 'agents':
        setLocation('/agents');
        break;

      default: {
        const url = generatePropertyUrl({
          city: searchQuery || undefined,
        });
        setLocation(url);
      }
    }
  };

  // --- SMART SHORTCUTS ---
  const defaultShortcuts = [
    { label: '3 Bed Houses', icon: Home, filters: { listingType: 'sale', propertyType: ['house'], minBedrooms: 3 } },
    { label: 'Apartments < R1.5M', icon: Building, filters: { listingType: 'sale', propertyType: ['apartment'], maxPrice: 1500000 } },
    { label: 'New Developments', icon: Building2, path: '/new-developments' },
    { label: 'Cheap Rentals', icon: Key, filters: { listingType: 'rent', maxPrice: 6000 } },
  ];

  const shortcuts = customShortcuts || defaultShortcuts;

  const handleShortcutClick = (shortcut: any) => {
      if (shortcut.path) {
          setLocation(shortcut.path);
          return;
      }
      // If it's a filter shortcut
      // Resolving Intent isn't available here directly, but we can use generatePropertyUrl
      // assuming standard paths.
      // Or just map to URL:
      const url = generatePropertyUrl(shortcut.filters);
      setLocation(url);
  };

  const isNavigationMode = heroMode === 'province' || heroMode === 'city';

  return (
    <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white overflow-hidden">
      {/* Background Image / Overlay */}
      {backgroundImage ? (
          <>
             <div className="absolute inset-0 z-0">
                <img src={backgroundImage} alt="Hero Background" className="w-full h-full object-cover opacity-30" />
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/80 to-indigo-900/90 mix-blend-multiply" />
             </div>
          </>
      ) : (
          /* Default Animated Background Shapes */
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl"></div>
          </div>
      )}

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40 mix-blend-overlay"></div>

      <div className="container relative py-fluid-xl z-10">
        {/* Hero Title */}
        <div className="text-center mb-6 max-w-4xl mx-auto">
          {title ? (
              // Location / Context Title
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                  {title}
              </h1>
          ) : (
              // Default Homepage Title
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight">
                South Africa's{' '}
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                  Fastest Growing
                </span>
                <br />
                Real Estate Platform
              </h1>
          )}
          
          <p className="text-base md:text-lg text-white/90 animate-fade-in max-w-2xl mx-auto">
            {subtitle || (
              <>
                From browsing properties to closing deals - your complete
                <br />
                real estate journey starts here
              </>
            )}
          </p>
        </div>

        {/* Category Tabs (Always Visible) */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white/10 backdrop-blur-md rounded-xl p-1.5 gap-1 flex-wrap shadow-lg border border-white/20">
            {categories.map(category => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`
                    flex items-center gap-2 px-5 py-3 rounded-lg transition-all font-medium text-sm
                    ${
                      activeTab === category.id
                        ? 'bg-white text-blue-900 shadow-lg scale-105'
                        : 'text-white hover:bg-white/15 hover:scale-102'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {category.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Card */}
        <div className="max-w-4xl mx-auto">
            <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm rounded-2xl">
            <CardContent className="p-4 md:p-6">
                {/* Main Search Row */}
                <div className="flex flex-col md:flex-row gap-4">
                {/* Unified Search Input */}
                <div className="flex-1 relative group">
                    {/* Search Icon */}
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10 pointer-events-none" />
                    
                    <LocationAutosuggest
                    placeholder="Search by city, suburb, or area..."
                    className="w-full"
                    inputClassName="pl-12 pr-24 h-14 text-base border-2 hover:border-primary/50 focus:border-primary transition-colors w-full bg-transparent rounded-xl"
                    showIcon={false}
                    onSelect={(loc) => {
                        setSearchQuery(loc.name);
                        setSelectedLocation(loc);
                    }}
                    defaultValue={searchQuery}
                    />
                    
                    {/* Action Buttons (Voice/Location) */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2 z-10">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 hover:bg-primary/10 rounded-lg"
                        title="Use current location"
                    >
                        <MapPinned className="h-5 w-5" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 hover:bg-primary/10 rounded-lg"
                        title="Voice search"
                    >
                        <Mic className="h-5 w-5" />
                    </Button>
                    </div>
                </div>

                {/* Search Button */}
                <Button
                    onClick={handleSearch}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-14 px-8 shadow-lg hover:shadow-xl transition-all font-semibold text-base min-w-[140px] rounded-xl"
                    size="lg"
                >
                    {isCountLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <div className="flex flex-col items-center leading-none">
                            <span className="flex items-center gap-2"><Search className="h-4 w-4" /> Search</span>
                        </div>
                    )}
                </Button>
                </div>
                
                {/* FOOTER: Navigation Pills OR Shortcuts */}
                <div className="mt-6 flex flex-wrap gap-3 items-center justify-center border-t border-slate-100 pt-4">
                    
                    {/* 1. If Navigation Mode (Province/City): Show Pills */}
                    {isNavigationMode ? (
                        <>
                             <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mr-1">
                                {heroMode === 'province' ? 'Popular Locations:' : 'Popular Areas:'}
                             </span>
                             {navigationItems.map((item, idx) => (
                                <Button
                                    key={idx}
                                    variant="outline"
                                    onClick={() => setLocation(item.path)}
                                    className={`
                                        h-9 px-4 rounded-full text-sm font-medium border-blue-100 bg-blue-50/50 text-blue-700 
                                        hover:bg-blue-100 hover:border-blue-200 hover:text-blue-800 transition-all
                                        ${item.active ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                                    `}
                                >
                                    {item.label}
                                </Button>
                             ))}
                        </>
                    ) : (
                        /* 2. If Standard Mode: Show Shortcuts */
                        <>
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mr-1">Quick Search:</span>
                            {shortcuts.map((shortcut, idx) => { 
                                const Icon = shortcut.icon;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleShortcutClick(shortcut)}
                                        className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 rounded-full text-sm font-medium transition-colors border border-slate-200 hover:border-slate-300 shadow-sm"
                                    >
                                        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
                                        {shortcut.label}
                                    </button>
                                );
                            })}
                        </>
                    )}
                </div>

            {/* Dynamic Filter Panel */}
            {showFilters && activeTab !== 'agents' && (
              <div className="mt-6 pt-6 border-t animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                  {/* BUY FILTERS */}
                  {activeTab === 'buy' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property Category</Label>
                        <Select 
                          value={filters.propertyIntent} 
                          onValueChange={(val) => handleFilterChange('propertyIntent', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Category</SelectItem>
                            {filterConfig.buy.intents.map(intent => (
                              <SelectItem key={intent} value={intent}>{intent}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">Choose the main type of property you’re looking for</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property Type</Label>
                        <Select 
                          value={filters.propertyTypes[0] || ''} 
                          onValueChange={(val) => handleFilterChange('propertyTypes', [val])}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Type</SelectItem>
                            {(filters.propertyIntent && filterConfig.buy.propertyTypes[filters.propertyIntent as keyof typeof filterConfig.buy.propertyTypes] 
                              ? filterConfig.buy.propertyTypes[filters.propertyIntent as keyof typeof filterConfig.buy.propertyTypes]
                              : Object.values(filterConfig.buy.propertyTypes).flat()
                            ).map((type: string) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Min Price</Label>
                        <Select 
                          value={filters.priceMin} 
                          onValueChange={(val) => handleFilterChange('priceMin', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="No Min" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">R 0</SelectItem>
                            <SelectItem value="500000">R 500,000</SelectItem>
                            <SelectItem value="1000000">R 1,000,000</SelectItem>
                            <SelectItem value="2000000">R 2,000,000</SelectItem>
                            <SelectItem value="5000000">R 5,000,000</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Price</Label>
                        <Select 
                          value={filters.priceMax} 
                          onValueChange={(val) => handleFilterChange('priceMax', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="No Max" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1000000">R 1,000,000</SelectItem>
                            <SelectItem value="2000000">R 2,000,000</SelectItem>
                            <SelectItem value="5000000">R 5,000,000</SelectItem>
                            <SelectItem value="10000000">R 10,000,000</SelectItem>
                            <SelectItem value="50000000">R 50,000,000+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* RENTAL FILTERS */}
                  {activeTab === 'rental' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property Type</Label>
                        <Select 
                          value={filters.propertyTypes[0] || ''} 
                          onValueChange={(val) => handleFilterChange('propertyTypes', [val])}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Type</SelectItem>
                            {Object.values(filterConfig.rental.propertyTypes).flat().map((type: string) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lease Term</Label>
                        <Select 
                          value={filters.leaseTerm} 
                          onValueChange={(val) => handleFilterChange('leaseTerm', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Term" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Term</SelectItem>
                            {filterConfig.rental.leaseTerms.map(term => (
                              <SelectItem key={term} value={term}>{term}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Budget</Label>
                        <Select 
                          value={filters.budgetMax} 
                          onValueChange={(val) => handleFilterChange('budgetMax', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Budget" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5000">R 5,000</SelectItem>
                            <SelectItem value="10000">R 10,000</SelectItem>
                            <SelectItem value="20000">R 20,000</SelectItem>
                            <SelectItem value="50000">R 50,000+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2 h-10 mt-6">
                        <Checkbox 
                          id="furnished" 
                          checked={filters.furnished}
                          onCheckedChange={(checked) => handleFilterChange('furnished', checked)}
                        />
                        <Label htmlFor="furnished" className="font-normal cursor-pointer">Furnished Only</Label>
                      </div>
                    </>
                  )}

                  {/* DEVELOPMENTS FILTERS */}
                  {activeTab === 'projects' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Development Type</Label>
                        <Select 
                          value={filters.developmentType} 
                          onValueChange={(val) => handleFilterChange('developmentType', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Type</SelectItem>
                            {filterConfig.projects.types.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</Label>
                        <Select 
                          value={filters.developmentStatus} 
                          onValueChange={(val) => handleFilterChange('developmentStatus', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Status</SelectItem>
                            {filterConfig.projects.statuses.map(status => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Min Price</Label>
                        <Input 
                          type="number" 
                          placeholder="R Min" 
                          className="h-10 bg-gray-50/50 border-gray-200"
                          value={filters.priceMin}
                          onChange={(e) => handleFilterChange('priceMin', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Price</Label>
                        <Input 
                          type="number" 
                          placeholder="R Max" 
                          className="h-10 bg-gray-50/50 border-gray-200"
                          value={filters.priceMax}
                          onChange={(e) => handleFilterChange('priceMax', e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {/* PLOT & LAND FILTERS */}
                  {activeTab === 'plot' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Land Type</Label>
                        <Select 
                          value={filters.landType} 
                          onValueChange={(val) => handleFilterChange('landType', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Type</SelectItem>
                            {filterConfig.plot.types.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Min Size (m²)</Label>
                        <Input 
                          type="number" 
                          placeholder="Min m²" 
                          className="h-10 bg-gray-50/50 border-gray-200"
                          value={filters.sizeMin}
                          onChange={(e) => handleFilterChange('sizeMin', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Price</Label>
                        <Select 
                          value={filters.priceMax} 
                          onValueChange={(val) => handleFilterChange('priceMax', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Price" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="500000">R 500k</SelectItem>
                            <SelectItem value="1000000">R 1M</SelectItem>
                            <SelectItem value="5000000">R 5M</SelectItem>
                            <SelectItem value="10000000">R 10M+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* COMMERCIAL FILTERS */}
                  {activeTab === 'commercial' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">I want to</Label>
                        <div className="flex p-1 bg-gray-100 rounded-lg h-10">
                          <button
                            onClick={() => handleFilterChange('saleOrRent', 'sale')}
                            className={`flex-1 rounded-md text-sm font-medium transition-all ${filters.saleOrRent === 'sale' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                          >
                            Buy
                          </button>
                          <button
                            onClick={() => handleFilterChange('saleOrRent', 'rent')}
                            className={`flex-1 rounded-md text-sm font-medium transition-all ${filters.saleOrRent === 'rent' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                          >
                            Rent
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Use Type</Label>
                        <Select 
                          value={filters.commercialUseType} 
                          onValueChange={(val) => handleFilterChange('commercialUseType', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Use" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Use</SelectItem>
                            {filterConfig.commercial.useTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Min Size (m²)</Label>
                        <Input 
                          type="number" 
                          placeholder="Min m²" 
                          className="h-10 bg-gray-50/50 border-gray-200"
                          value={filters.lotSizeMin}
                          onChange={(e) => handleFilterChange('lotSizeMin', e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {/* SHARED LIVING FILTERS */}
                  {activeTab === 'pg' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Room Type</Label>
                        <Select 
                          value={filters.roomType} 
                          onValueChange={(val) => handleFilterChange('roomType', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Room" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any Room</SelectItem>
                            {filterConfig.pg.roomTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gender Preference</Label>
                        <Select 
                          value={filters.genderPreference} 
                          onValueChange={(val) => handleFilterChange('genderPreference', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any</SelectItem>
                            {filterConfig.pg.genderOptions.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Budget</Label>
                        <Select 
                          value={filters.budgetMax} 
                          onValueChange={(val) => handleFilterChange('budgetMax', val)}
                        >
                          <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                            <SelectValue placeholder="Any Budget" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3000">R 3,000</SelectItem>
                            <SelectItem value="5000">R 5,000</SelectItem>
                            <SelectItem value="8000">R 8,000</SelectItem>
                            <SelectItem value="10000">R 10,000+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      </div>
    </div>
  );
}


