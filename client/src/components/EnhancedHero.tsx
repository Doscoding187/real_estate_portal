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
    { id: 'projects', label: 'Projects', icon: Building2 },
    { id: 'pg', label: 'PG / Hostels', icon: Hotel },
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
    <div className="relative bg-gradient-to-br from-[#001f3f] via-[#0a2540] to-[#0f4c75] text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>

      <div className="container relative py-12 md:py-20">
        {/* Hero Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
            South Africa's Largest Real Estate Platform
          </h1>
          <p className="text-lg md:text-xl text-white/90">
            We've got you covered! From finding the perfect property to{' '}
            <span className="text-emerald-400 font-semibold">Site Visits</span>
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-white/10 backdrop-blur-sm rounded-lg p-1 gap-1 flex-wrap">
            {categories.map(category => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(category.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-md transition-all font-medium text-sm
                    ${
                      activeTab === category.id
                        ? 'bg-white text-black shadow-md'
                        : 'text-white hover:bg-white/10'
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
        <Card className="max-w-5xl mx-auto shadow-2xl">
          <CardContent className="p-6">
            {/* City Selector and Search Input */}
            <div className="flex gap-3 mb-4">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="johannesburg">Johannesburg</SelectItem>
                  <SelectItem value="cape-town">Cape Town</SelectItem>
                  <SelectItem value="durban">Durban</SelectItem>
                  <SelectItem value="pretoria">Pretoria</SelectItem>
                  <SelectItem value="port-elizabeth">Port Elizabeth</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by Project, Locality, or Builder"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="pl-10 pr-20 h-12"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MapPinned className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 items-center">
              <Select value={budget} onValueChange={setBudget}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Budget" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-500000">Under R 500k</SelectItem>
                  <SelectItem value="500000-1000000">R 500k - R 1M</SelectItem>
                  <SelectItem value="1000000-2000000">R 1M - R 2M</SelectItem>
                  <SelectItem value="2000000-5000000">R 2M - R 5M</SelectItem>
                  <SelectItem value="5000000+">Above R 5M</SelectItem>
                </SelectContent>
              </Select>

              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Property Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="plot">Plot</SelectItem>
                </SelectContent>
              </Select>

              <Select>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Possession Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ready">Ready to Move</SelectItem>
                  <SelectItem value="construction">Under Construction</SelectItem>
                  <SelectItem value="new">New Launch</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleSearch}
                className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-11"
                size="lg"
              >
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto mt-6">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Home className="h-6 w-6 text-white" />
              </div>
              <div className="text-white">
                <h3 className="font-semibold">Instant Vastu Calculator</h3>
                <p className="text-sm text-white/70">
                  Verify Your Home's Vastu Compliance Instantly
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div className="text-white">
                <h3 className="font-semibold">Online Rent Agreement</h3>
                <p className="text-sm text-white/70">
                  Best online agreement services in South Africa
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="text-white">
                <h3 className="font-semibold">Post Property for Sale/Rent</h3>
                <p className="text-sm text-white/70">
                  100% Free Listings. South Africa's #1 Real Estate Hub
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
