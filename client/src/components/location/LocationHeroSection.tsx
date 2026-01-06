import { useState } from 'react';
import { useLocation } from 'wouter';
import { Search, Home, Building2, Key, Users, LandPlot, Store, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { LocationAutosuggest } from '@/components/LocationAutosuggest';

interface HeroCampaign {
  imageUrl: string;
  landingPageUrl?: string | null;
  altText?: string | null;
}

interface LocationHeroSectionProps {
  locationName: string;
  locationSlug: string;
  locationType: 'province' | 'city' | 'suburb';
  locationId: number;
  backgroundImage: string;
  listingCount: number;
  campaign?: HeroCampaign | null;
  quickLinks?: { label: string; path?: string; slug?: string; }[];
  initialSearchQuery?: string;
}

// SA-specific property categories
const categories = [
  { id: 'buy', label: 'Buy', icon: Home, listingType: 'sale' },
  { id: 'rental', label: 'Rental', icon: Key, listingType: 'rent' },
  { id: 'developments', label: 'Developments', icon: Building2, listingType: 'development' },
  { id: 'shared_living', label: 'Shared Living', icon: Users, listingType: 'shared_living' },
  { id: 'plot_land', label: 'Plot & Land', icon: LandPlot, listingType: 'plot' },
  { id: 'commercial', label: 'Commercial', icon: Store, listingType: 'commercial' },
];

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
    propertyTypes: ['House', 'Apartment', 'Townhouse', 'Cluster', 'Room', 'Studio'],
    leaseTerms: ['Month-to-month', '6 months', '12 months', '24+ months'],
  },
  developments: {
    types: ['Full Title', 'Sectional Title', 'Security Estate', 'Retirement', 'Luxury', 'Affordable Housing'],
    statuses: ['Off-Plan', 'Under Construction', 'Completed', 'Launching Soon'],
  },
  plot_land: {
    types: ['Residential', 'Commercial', 'Agricultural', 'Industrial'],
  },
  commercial: {
    useTypes: ['Office', 'Retail', 'Industrial', 'Warehouse', 'Medical', 'Mixed-Use'],
  },
  shared_living: {
    roomTypes: ['Room in Apartment', 'Room in House', 'Co-Living', 'Student Accommodation'],
    genderOptions: ['Male Only', 'Female Only', 'Mixed'],
  },
};

export function LocationHeroSection({
  locationName,
  locationSlug,
  locationType,
  locationId,
  backgroundImage,
  listingCount,
  campaign,
  quickLinks = [],
  initialSearchQuery = '',
}: LocationHeroSectionProps) {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    propertyIntent: '',
    propertyTypes: [] as string[],
    priceMin: '',
    priceMax: '',
    furnished: false,
    leaseTerm: '',
    developmentType: '',
    developmentStatus: '',
    landType: '',
    commercialUseType: '',
    roomType: '',
    genderPreference: '',
  });

  const handleCategoryClick = (categoryId: string) => {
    setActiveTab(categoryId);
    setShowFilters(true);
    trackEvent('hero_category_click', { category: categoryId, location: locationSlug });
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getSearchPath = (categoryId: string | null, locSlug: string, locName: string) => {
    const effectiveCategoryId = categoryId || 'buy';
    const category = categories.find(c => c.id === effectiveCategoryId);
    if (!category) return '/';

    if (category.listingType === 'development') {
      return `/new-developments?location=${encodeURIComponent(locName)}`;
    }

    const baseRoute = category.listingType === 'rent' || category.id === 'shared_living'
      ? 'property-to-rent' 
      : 'property-for-sale';
    
    const params = new URLSearchParams();
    params.set('view', 'list');

    // Add filter params
    if (filters.propertyTypes.length > 0 && filters.propertyTypes[0] !== 'all') {
      params.set('propertyType', filters.propertyTypes[0].toLowerCase());
    }
    if (filters.priceMin) params.set('minPrice', filters.priceMin);
    if (filters.priceMax) params.set('maxPrice', filters.priceMax);
    if (category.id === 'commercial') params.set('type', 'commercial');
    if (category.id === 'plot_land') params.set('type', 'vacant-land');
    if (category.id === 'shared_living') params.set('type', 'flat-apartment');

    return `/${baseRoute}/${locSlug}?${params.toString()}`;
  };

  const handleSearch = () => {
    const path = getSearchPath(activeTab, locationSlug, locationName);
    setLocation(path);
  };

  const handleLocationSelect = (selectedLoc: any) => {
    if (selectedLoc?.slug) {
      const path = getSearchPath(activeTab, selectedLoc.slug, selectedLoc.name);
      setLocation(path);
    }
  };

  const handlePostProperty = () => {
    setLocation('/list-property');
  };

  return (
    <div className="relative w-full">
      {/* SEO Title - visually hidden */}
      <h1 className="sr-only">
        Property for Sale in {locationName} - Explore {listingCount.toLocaleString()} properties
      </h1>
      
      {/* Banner Image Section */}
      <div className="relative w-full h-[30vh] lg:h-[35vh] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${campaign?.imageUrl || backgroundImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />
        
        {campaign && (
          <a 
            href={campaign.landingPageUrl || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="absolute top-4 right-4 z-20"
            onClick={() => trackEvent('hero_campaign_click', { locationId, locationType })}
          >
            <span className="bg-white/90 text-[10px] font-bold px-3 py-1 rounded text-slate-700 uppercase tracking-wider shadow-sm">
              Sponsored
            </span>
          </a>
        )}
      </div>

      {/* Search Card Container */}
      <div className="relative z-10 -mt-16 px-4 pb-6 flex justify-center">
        <Card className="w-full max-w-6xl bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-6 md:p-8">
          
          {/* Category Tabs */}
          <div className="flex flex-wrap lg:flex-nowrap justify-center gap-2 mb-6">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeTab === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap',
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-102'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {category.label}
                </button>
              );
            })}
            
            {/* Post Property CTA */}
            <button
              onClick={handlePostProperty}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm bg-green-600 text-white hover:bg-green-700 transition-all duration-200 shadow-md whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Post Property
            </button>
          </div>

          {/* Dynamic Filter Panel */}
          {showFilters && activeTab && (
            <div className="mb-6 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* BUY FILTERS */}
                {activeTab === 'buy' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Property Category</Label>
                      <Select value={filters.propertyIntent} onValueChange={(val) => handleFilterChange('propertyIntent', val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="Any Category" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Category</SelectItem>
                          {filterConfig.buy.intents.map(intent => <SelectItem key={intent} value={intent}>{intent}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Property Type</Label>
                      <Select value={filters.propertyTypes[0] || ''} onValueChange={(val) => handleFilterChange('propertyTypes', [val])}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="Any Type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Type</SelectItem>
                          {(filters.propertyIntent && filterConfig.buy.propertyTypes[filters.propertyIntent as keyof typeof filterConfig.buy.propertyTypes]
                            ? filterConfig.buy.propertyTypes[filters.propertyIntent as keyof typeof filterConfig.buy.propertyTypes]
                            : Object.values(filterConfig.buy.propertyTypes).flat()
                          ).map((type: string) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Min Price</Label>
                      <Select value={filters.priceMin} onValueChange={(val) => handleFilterChange('priceMin', val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="No Min" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">R 0</SelectItem>
                          <SelectItem value="500000">R 500,000</SelectItem>
                          <SelectItem value="1000000">R 1,000,000</SelectItem>
                          <SelectItem value="2000000">R 2,000,000</SelectItem>
                          <SelectItem value="5000000">R 5,000,000</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Max Price</Label>
                      <Select value={filters.priceMax} onValueChange={(val) => handleFilterChange('priceMax', val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="No Max" /></SelectTrigger>
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
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Property Type</Label>
                      <Select value={filters.propertyTypes[0] || ''} onValueChange={(val) => handleFilterChange('propertyTypes', [val])}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="Any Type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Type</SelectItem>
                          {filterConfig.rental.propertyTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Lease Term</Label>
                      <Select value={filters.leaseTerm} onValueChange={(val) => handleFilterChange('leaseTerm', val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="Any Term" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Term</SelectItem>
                          {filterConfig.rental.leaseTerms.map(term => <SelectItem key={term} value={term}>{term}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Max Budget</Label>
                      <Select value={filters.priceMax} onValueChange={(val) => handleFilterChange('priceMax', val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="Any Budget" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5000">R 5,000</SelectItem>
                          <SelectItem value="10000">R 10,000</SelectItem>
                          <SelectItem value="20000">R 20,000</SelectItem>
                          <SelectItem value="50000">R 50,000+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2 h-10 mt-6">
                      <Checkbox id="furnished" checked={filters.furnished} onCheckedChange={(checked) => handleFilterChange('furnished', checked)} />
                      <Label htmlFor="furnished" className="font-normal cursor-pointer">Furnished Only</Label>
                    </div>
                  </>
                )}

                {/* DEVELOPMENTS FILTERS */}
                {activeTab === 'developments' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Development Type</Label>
                      <Select value={filters.developmentType} onValueChange={(val) => handleFilterChange('developmentType', val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="Any Type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Type</SelectItem>
                          {filterConfig.developments.types.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Status</Label>
                      <Select value={filters.developmentStatus} onValueChange={(val) => handleFilterChange('developmentStatus', val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="Any Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Status</SelectItem>
                          {filterConfig.developments.statuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Min Price</Label>
                      <Select value={filters.priceMin} onValueChange={(val) => handleFilterChange('priceMin', val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="No Min" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="500000">R 500,000</SelectItem>
                          <SelectItem value="1000000">R 1,000,000</SelectItem>
                          <SelectItem value="2000000">R 2,000,000</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Max Price</Label>
                      <Select value={filters.priceMax} onValueChange={(val) => handleFilterChange('priceMax', val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="No Max" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2000000">R 2,000,000</SelectItem>
                          <SelectItem value="5000000">R 5,000,000</SelectItem>
                          <SelectItem value="10000000">R 10,000,000+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* PLOT & LAND FILTERS */}
                {activeTab === 'plot_land' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Land Type</Label>
                      <Select value={filters.landType} onValueChange={(val) => handleFilterChange('landType', val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="Any Type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Type</SelectItem>
                          {filterConfig.plot_land.types.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Min Price</Label>
                      <Select value={filters.priceMin} onValueChange={(val) => handleFilterChange('priceMin', val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="No Min" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="100000">R 100,000</SelectItem>
                          <SelectItem value="500000">R 500,000</SelectItem>
                          <SelectItem value="1000000">R 1,000,000</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Max Price</Label>
                      <Select value={filters.priceMax} onValueChange={(val) => handleFilterChange('priceMax', val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="No Max" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1000000">R 1,000,000</SelectItem>
                          <SelectItem value="5000000">R 5,000,000</SelectItem>
                          <SelectItem value="10000000">R 10,000,000+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* COMMERCIAL FILTERS */}
                {activeTab === 'commercial' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Use Type</Label>
                      <Select value={filters.commercialUseType} onValueChange={(val) => handleFilterChange('commercialUseType', val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="Any Type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Type</SelectItem>
                          {filterConfig.commercial.useTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Min Price</Label>
                      <Select value={filters.priceMin} onValueChange={(val) => handleFilterChange('priceMin', val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="No Min" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="500000">R 500,000</SelectItem>
                          <SelectItem value="1000000">R 1,000,000</SelectItem>
                          <SelectItem value="5000000">R 5,000,000</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Max Price</Label>
                      <Select value={filters.priceMax} onValueChange={(val) => handleFilterChange('priceMax', val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="No Max" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5000000">R 5,000,000</SelectItem>
                          <SelectItem value="10000000">R 10,000,000</SelectItem>
                          <SelectItem value="50000000">R 50,000,000+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* SHARED LIVING FILTERS */}
                {activeTab === 'shared_living' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Room Type</Label>
                      <Select value={filters.roomType} onValueChange={(val) => handleFilterChange('roomType', val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="Any Type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any Type</SelectItem>
                          {filterConfig.shared_living.roomTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Gender Preference</Label>
                      <Select value={filters.genderPreference} onValueChange={(val) => handleFilterChange('genderPreference', val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="Any" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any</SelectItem>
                          {filterConfig.shared_living.genderOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Max Budget</Label>
                      <Select value={filters.priceMax} onValueChange={(val) => handleFilterChange('priceMax', val)}>
                        <SelectTrigger className="h-10 bg-gray-50/50"><SelectValue placeholder="Any Budget" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3000">R 3,000</SelectItem>
                          <SelectItem value="5000">R 5,000</SelectItem>
                          <SelectItem value="10000">R 10,000+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="relative flex items-center gap-3">
            <div className="relative flex-1">
              <LocationAutosuggest
                placeholder={`Search in ${locationName}...`}
                onSelect={handleLocationSelect}
                onChange={setSearchQuery}
                className="w-full h-12 text-base border-2 border-slate-200 rounded-lg focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 bg-white transition-all flex items-center"
                inputClassName="h-full w-full bg-transparent border-0 focus-visible:ring-0 placeholder:text-slate-500 text-slate-900"
              />
            </div>
            
            <Button 
              onClick={handleSearch}
              size="lg"
              className="px-8 h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 font-semibold"
            >
              <Search className="h-5 w-5 mr-2" />
              Search
            </Button>
          </div>

          {/* Quick Links / Popular Areas */}
          {quickLinks.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-start gap-3">
              <span className="text-sm text-slate-500 font-medium">Popular:</span>
              {quickLinks.map((link, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                      if (link.slug) {
                          const path = getSearchPath(activeTab, link.slug, link.label);
                          setLocation(path);
                      } else if (link.path) {
                          setLocation(link.path);
                      }
                  }}
                  className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
