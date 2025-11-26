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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

export function EnhancedHero() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('buy');
  const [selectedCity, setSelectedCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [budget, setBudget] = useState('');
  const [propertyType, setPropertyType] = useState('');

  const categories = [
    { id: 'buy', label: 'Buy', icon: Home },
    { id: 'rental', label: 'Rental', icon: Heart },
    { id: 'projects', label: 'Developments', icon: Building2 },
    { id: 'pg', label: 'Shared Living', icon: Users },
    { id: 'plot', label: 'Plot & Land', icon: MapPin },
    { id: 'commercial', label: 'Commercial', icon: Briefcase },
    { id: 'agents', label: 'Agents', icon: Users },
  ];

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedCity) params.set('city', selectedCity);
    if (activeTab === 'buy') params.set('listingType', 'sale');
    if (activeTab === 'rental') params.set('listingType', 'rent');
    if (propertyType) params.set('propertyType', propertyType);

    if (activeTab === 'projects') {
      setLocation(`/developments?${params.toString()}`);
    } else if (activeTab === 'agents') {
      setLocation('/agents');
    } else {
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
                  onClick={() => setActiveTab(category.id)}
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
              {/* City Selector */}
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-full md:w-[220px] h-14 text-base border-2 hover:border-primary/50 transition-colors [&>span]:flex [&>span]:items-center [&>span]:gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="johannesburg">Johannesburg</SelectItem>
                  <SelectItem value="cape-town">Cape Town</SelectItem>
                  <SelectItem value="durban">Durban</SelectItem>
                  <SelectItem value="pretoria">Pretoria</SelectItem>
                  <SelectItem value="port-elizabeth">Port Elizabeth</SelectItem>
                  <SelectItem value="bloemfontein">Bloemfontein</SelectItem>
                  <SelectItem value="east-london">East London</SelectItem>
                  <SelectItem value="polokwane">Polokwane</SelectItem>
                </SelectContent>
              </Select>

              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by suburb, area, or property name"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="pl-12 pr-24 h-14 text-base border-2 hover:border-primary/50 focus:border-primary transition-colors"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
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
