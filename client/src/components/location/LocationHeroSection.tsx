import { useState } from 'react';
import { useLocation } from 'wouter';
import { Search, MapPin, Home, Building2, Key, Users, LandPlot, Store, Plus, Mic } from 'lucide-react';
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

  const handleSearch = () => {
    const category = categories.find(c => c.id === activeTab);
    const listingType = category?.listingType || 'sale';
    const searchPath = `/property-for-${listingType}/${locationSlug}?view=list`;
    setLocation(searchPath);
  };

  const handleLocationSelect = (location: any) => {
    if (location?.path) {
      setLocation(location.path);
    }
  };

  const handlePostProperty = () => {
    setLocation('/list-property');
  };

  return (
    <div className="relative w-full min-h-[60vh] lg:min-h-[70vh] overflow-hidden">
      {/* Background Image Layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${campaign?.imageUrl || backgroundImage})` }}
      />
      
      {/* Dark Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
      
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

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] lg:min-h-[70vh] px-4 py-12">
        
        {/* Main Heading */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-4 drop-shadow-lg">
          Property for Sale in{' '}
          <span className="text-blue-300">{locationName}</span>
        </h1>
        
        {/* Subheading */}
        <p className="text-lg md:text-xl text-white/90 text-center mb-8 max-w-2xl">
          Explore {listingCount.toLocaleString()} properties and new developments across {locationName}
        </p>

        {/* Floating Search Card */}
        <Card className="w-full max-w-4xl bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl p-6 md:p-8">
          
          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeTab === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200',
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
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-green-600 text-white hover:bg-green-700 transition-all duration-200 shadow-md"
            >
              <Plus className="h-4 w-4" />
              Post Property
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex items-center gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <LocationAutosuggest
                placeholder={`Search in ${locationName}...`}
                onLocationSelect={handleLocationSelect}
                className="w-full pl-12 pr-12 py-4 text-lg border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              />
              <button className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                <Mic className="h-5 w-5" />
              </button>
            </div>
            
            <Button 
              onClick={handleSearch}
              size="lg"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
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
