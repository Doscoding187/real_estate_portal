import { useState } from 'react';
import { useLocation } from 'wouter';
import { Search, MapPin, Home, Building2, Key, Users, LandPlot, Store, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
  quickLinks?: { label: string; path: string }[];
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
  const [activeTab, setActiveTab] = useState('buy');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);

  const handleCategoryClick = (categoryId: string) => {
    setActiveTab(categoryId);
    trackEvent('hero_category_click', { category: categoryId, location: locationSlug });
  };

  const getSearchPath = (categoryId: string, locSlug: string, locName: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return '/';

    if (category.listingType === 'development') {
      return `/new-developments?location=${encodeURIComponent(locName)}`;
    }

    const baseRoute = category.listingType === 'rent' || category.id === 'shared_living'
      ? 'property-to-rent' 
      : 'property-for-sale';
    
    const params = new URLSearchParams();
    params.set('view', 'list');

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
      {/* SEO Title/Subtitle - visually hidden but accessible for search engines */}
      <h1 className="sr-only">
        Property for Sale in {locationName} - Explore {listingCount.toLocaleString()} properties and new developments
      </h1>
      
      {/* Banner Image Section - Reduced Height */}
      <div className="relative w-full h-[30vh] lg:h-[35vh] overflow-hidden">
        {/* Background Image Layer */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${campaign?.imageUrl || backgroundImage})` }}
        />
        
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />
        
        {/* Campaign Sponsored Badge */}
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

      {/* Search Card Container - Positioned below banner */}
      <div className="relative z-10 -mt-16 px-4 pb-6 flex justify-center">

        {/* Floating Search Card */}
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

          {/* Search Input */}
          <div className="relative flex items-center gap-3">
            <div className="relative flex-1">
              <LocationAutosuggest
                placeholder={`Search in ${locationName}...`}
                onSelect={handleLocationSelect}
                onChange={setSearchQuery}
                className="w-full h-12 text-base border-2 border-slate-200 rounded-lg focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 bg-white transition-all flex items-center"
                inputClassName="h-full w-full bg-transparent border-0 focus-visible:ring-0 px-0 placeholder:text-slate-500 text-slate-900"
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
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm text-slate-500 font-medium">Popular:</span>
              {quickLinks.slice(0, 5).map((link, idx) => (
                <button
                  key={idx}
                  onClick={() => setLocation(link.path)}
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
