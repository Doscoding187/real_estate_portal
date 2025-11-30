import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

type LocationSuggestion = {
  name: string;
  type: 'City' | 'Suburb' | 'Province' | 'Area';
  parent?: string;
};

export function EnhancedHero() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('buy');
  const [searchQuery, setSearchQuery] = useState('');
  const [budget, setBudget] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<LocationSuggestion[]>([]);

  // Comprehensive South African location data with context
  const locationSuggestions = [
    // Major Cities
    { name: 'Johannesburg', type: 'City' as const },
    { name: 'Cape Town', type: 'City' as const },
    { name: 'Durban', type: 'City' as const },
    { name: 'Pretoria', type: 'City' as const },
    { name: 'Port Elizabeth', type: 'City' as const },
    { name: 'Bloemfontein', type: 'City' as const },
    { name: 'East London', type: 'City' as const },
    { name: 'Polokwane', type: 'City' as const },
    { name: 'Nelspruit', type: 'City' as const },
    { name: 'Kimberley', type: 'City' as const },
    { name: 'Pietermaritzburg', type: 'City' as const },
    { name: 'George', type: 'City' as const },
    { name: 'Rustenburg', type: 'City' as const },
    
    // Gauteng Suburbs
    { name: 'Sandton', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Rosebank', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Fourways', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Randburg', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Roodepoort', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Centurion', type: 'Suburb' as const, parent: 'Pretoria' },
    { name: 'Midrand', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Bedfordview', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Bryanston', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Morningside', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Rivonia', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Sunninghill', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Waterfall Estate', type: 'Area' as const, parent: 'Johannesburg' },
    { name: 'Dainfern', type: 'Area' as const, parent: 'Johannesburg' },
    { name: 'Kyalami', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Benoni', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Boksburg', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Kempton Park', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Edenvale', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Germiston', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Alberton', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Krugersdorp', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Soweto', type: 'Area' as const, parent: 'Johannesburg' },
    { name: 'Alexandra', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Melville', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Parkhurst', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Greenside', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Norwood', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Houghton', type: 'Suburb' as const, parent: 'Johannesburg' },
    { name: 'Hyde Park', type: 'Suburb' as const, parent: 'Johannesburg' },
    
    // Cape Town Suburbs
    { name: 'Sea Point', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Green Point', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Camps Bay', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Clifton', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Bantry Bay', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Fresnaye', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Constantia', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Newlands', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Claremont', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Rondebosch', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Observatory', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Woodstock', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Salt River', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Pinelands', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Bellville', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Stellenbosch', type: 'City' as const, parent: 'Western Cape' },
    { name: 'Paarl', type: 'City' as const, parent: 'Western Cape' },
    { name: 'Somerset West', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Strand', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Gordon\'s Bay', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Hermanus', type: 'City' as const, parent: 'Western Cape' },
    { name: 'Franschhoek', type: 'City' as const, parent: 'Western Cape' },
    { name: 'Hout Bay', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Noordhoek', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Fish Hoek', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Muizenberg', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Kalk Bay', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Simon\'s Town', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Blouberg', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Milnerton', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Century City', type: 'Area' as const, parent: 'Cape Town' },
    { name: 'Table View', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Parklands', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Durbanville', type: 'Suburb' as const, parent: 'Cape Town' },
    { name: 'Brackenfell', type: 'Suburb' as const, parent: 'Cape Town' },
    
    // KZN Suburbs
    { name: 'Umhlanga', type: 'Suburb' as const, parent: 'Durban' },
    { name: 'Ballito', type: 'Suburb' as const, parent: 'Durban' },
    { name: 'La Lucia', type: 'Suburb' as const, parent: 'Durban' },
    { name: 'Durban North', type: 'Suburb' as const, parent: 'Durban' },
    { name: 'Berea', type: 'Suburb' as const, parent: 'Durban' },
    { name: 'Glenwood', type: 'Suburb' as const, parent: 'Durban' },
    { name: 'Westville', type: 'Suburb' as const, parent: 'Durban' },
    { name: 'Kloof', type: 'Suburb' as const, parent: 'Durban' },
    { name: 'Hillcrest', type: 'Suburb' as const, parent: 'Durban' },
    { name: 'Pinetown', type: 'Suburb' as const, parent: 'Durban' },
    { name: 'Amanzimtoti', type: 'Suburb' as const, parent: 'Durban' },
    { name: 'Umdloti', type: 'Suburb' as const, parent: 'Durban' },
    { name: 'Salt Rock', type: 'Suburb' as const, parent: 'Durban' },
    { name: 'Sheffield Beach', type: 'Suburb' as const, parent: 'Durban' },
    { name: 'Zimbali', type: 'Area' as const, parent: 'Durban' },
    
    // Provinces
    { name: 'Gauteng', type: 'Province' as const },
    { name: 'Western Cape', type: 'Province' as const },
    { name: 'KwaZulu-Natal', type: 'Province' as const },
    { name: 'Eastern Cape', type: 'Province' as const },
    { name: 'Free State', type: 'Province' as const },
    { name: 'Limpopo', type: 'Province' as const },
    { name: 'Mpumalanga', type: 'Province' as const },
    { name: 'North West', type: 'Province' as const },
    { name: 'Northern Cape', type: 'Province' as const },
  ];

  const categories = [
    { id: 'buy', label: 'Buy', icon: Home },
    { id: 'rental', label: 'Rental', icon: Heart },
    { id: 'projects', label: 'Developments', icon: Building2 },
    { id: 'pg', label: 'Shared Living', icon: Users },
    { id: 'plot', label: 'Plot & Land', icon: MapPin },
    { id: 'commercial', label: 'Commercial', icon: Briefcase },
    { id: 'agents', label: 'Agents', icon: Users },
  ];

  // Handle search input changes with autocomplete
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (value.trim().length > 0) {
      const filtered = locationSuggestions
        .filter(location => 
          location.name.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 8); // Limit to 8 suggestions
      
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
      setFilteredSuggestions([]);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
    setFilteredSuggestions([]);
  };

  const handleCategoryClick = (categoryId: string) => {
    setActiveTab(categoryId);
    
    // Build search params based on category
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    
    // Navigate based on category
    switch (categoryId) {
      case 'buy':
        params.set('listingType', 'sale');
        setLocation(`/properties?${params.toString()}`);
        break;
      case 'rental':
        params.set('listingType', 'rent');
        setLocation(`/properties?${params.toString()}`);
        break;
      case 'projects':
        setLocation(`/developments?${params.toString()}`);
        break;
      case 'agents':
        setLocation('/agents');
        break;
      case 'pg':
        params.set('listingType', 'rent');
        params.set('propertyType', 'shared_living');
        setLocation(`/properties?${params.toString()}`);
        break;
      case 'plot':
        params.set('propertyType', 'plot_land');
        setLocation(`/properties?${params.toString()}`);
        break;
      case 'commercial':
        params.set('propertyType', 'commercial');
        setLocation(`/properties?${params.toString()}`);
        break;
      default:
        setLocation('/properties');
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (activeTab === 'buy') params.set('listingType', 'sale');
    if (activeTab === 'rental') params.set('listingType', 'rent');
    if (propertyType) params.set('propertyType', propertyType);

    // Handle category-specific navigation
    switch (activeTab) {
      case 'projects':
        setLocation(`/developments?${params.toString()}`);
        break;
      case 'agents':
        setLocation('/agents');
        break;
      case 'pg':
        params.set('listingType', 'rent');
        params.set('propertyType', 'shared_living');
        setLocation(`/properties?${params.toString()}`);
        break;
      case 'plot':
        params.set('propertyType', 'plot_land');
        setLocation(`/properties?${params.toString()}`);
        break;
      case 'commercial':
        params.set('propertyType', 'commercial');
        setLocation(`/properties?${params.toString()}`);
        break;
      default:
        setLocation(`/properties?${params.toString()}`);
    }
  };

  return (
    <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white overflow-hidden">
      {/* Animated Background Shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>

      <div className="container relative py-16 md:py-24">
        {/* Hero Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
            South Africa's{' '}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
              Fastest Growing
            </span>{' '}
            Real Estate Platform
          </h1>
          <p className="text-lg md:text-xl text-white/90 animate-fade-in">
            From browsing properties to closing deals - your complete real estate journey starts here
          </p>
        </div>

        {/* Category Tabs */}
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
        <Card className="max-w-5xl mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-6 md:p-8">
            {/* Main Search Row */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Unified Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                <Input
                  placeholder="Search by city, suburb, area, or property name..."
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  onFocus={() => {
                    if (searchQuery.trim().length > 0 && filteredSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay to allow click on suggestion
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  className="pl-12 pr-24 h-14 text-base border-2 hover:border-primary/50 focus:border-primary transition-colors"
                />
                
                {/* Autocomplete Suggestions Dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-primary/20 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                    {filteredSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between gap-3 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900">
                              {suggestion.name}
                              {suggestion.parent && (
                                <span className="text-gray-500">, {suggestion.parent}</span>
                              )}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 font-medium flex-shrink-0">
                          {suggestion.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2 z-10">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 hover:bg-primary/10"
                    title="Use current location"
                  >
                    <MapPinned className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 hover:bg-primary/10"
                    title="Voice search"
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Search Button */}
              <Button
                onClick={handleSearch}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-14 px-8 shadow-lg hover:shadow-xl transition-all font-semibold text-base"
                size="lg"
              >
                <Search className="h-5 w-5 mr-2" />
                Search
              </Button>
            </div>

            {/* Popular Provinces */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-foreground font-medium">Popular Searches:</span>
                {[
                  'Gauteng',
                  'Western Cape',
                  'KwaZulu-Natal',
                  'Eastern Cape',
                  'Free State',
                  'Limpopo',
                ].map((province) => (
                  <button
                    key={province}
                    onClick={() => {
                      setSearchQuery(province);
                      handleSearch();
                    }}
                    className="px-4 py-1.5 rounded-full bg-blue-100 hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 text-blue-900 hover:text-white font-medium transition-all border border-blue-200 hover:border-transparent shadow-sm hover:shadow-md"
                  >
                    {province}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
