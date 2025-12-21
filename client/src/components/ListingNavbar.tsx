import { Button } from './ui/button';
import { Search, Mic, Menu, User, ChevronDown, X } from 'lucide-react';
import { LocationAutosuggest } from './LocationAutosuggest';
import { Badge } from './ui/badge';
import { useLocation } from 'wouter';
import { useState } from 'react';
import { generatePropertyUrl } from '@/lib/urlUtils';

interface ListingNavbarProps {
  defaultLocations?: {
    name: string;
    slug: string;
    type: 'province' | 'city' | 'suburb';
    provinceSlug?: string;
    citySlug?: string;
    fullAddress: string;
  }[];
}

export function ListingNavbar({ defaultLocations = [] }: ListingNavbarProps) {
  const [, setLocation] = useLocation();
  const [listingType, setListingType] = useState<'sale' | 'rent'>('sale');
  
  // Multi-location state
  const [selectedLocations, setSelectedLocations] = useState<{
    name: string;
    slug: string;
    type: 'province' | 'city' | 'suburb';
    provinceSlug?: string;
    citySlug?: string;
    fullAddress: string;
  }[]>(defaultLocations);

  // Buy/Rent Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Hierarchy order for sorting
  const typeOrder: Record<string, number> = { province: 1, city: 2, suburb: 3 };

  const handleSearch = () => {
    // Strict Mode: allow search if we have locations OR if it's a blank "Browse All"
    // But usually blank browse all is fine.
    
    // Generate URL using shared utility (handles 0, 1, or N locations)
    const url = generatePropertyUrl({
        listingType,
        locations: selectedLocations
    });
    setLocation(url);
  };

  const handleLocationSelect = (loc: any) => {
     // 1. Avoid duplicates
     if (selectedLocations.some(l => l.slug === loc.slug)) return;

     let newLocations = [...selectedLocations];

     // 2. Normalization: "Parent + Child -> Child"
     // If adding a specific location (Child), remove its broader containers (Parent)
     // because specificity overrides breadth in this UX model.
     if (loc.type === 'suburb') {
         newLocations = newLocations.filter(l => 
             !(l.type === 'city' && l.slug === loc.citySlug) &&
             !(l.type === 'province' && l.slug === loc.provinceSlug)
         );
     } else if (loc.type === 'city') {
         newLocations = newLocations.filter(l => 
             !(l.type === 'province' && l.slug === loc.provinceSlug)
         );
     }

     newLocations.push(loc);
     
     // 3. Sort by Hierarchy (Province -> City -> Suburb)
     newLocations.sort((a, b) => (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99));

     setSelectedLocations(newLocations);
  };

  const removeLocation = (slug: string) => {
      setSelectedLocations(prev => prev.filter(l => l.slug !== slug));
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-[#005ca8] h-16 flex items-center px-4 md:px-8 shadow-md">
      {/* Logo Section */}
      <div 
        className="flex items-center gap-2 cursor-pointer mr-8" 
        onClick={() => setLocation('/')}
      >
        <h1 className="text-2xl font-bold text-white tracking-tight">Property Listify</h1>
      </div>

      {/* Central Search Bar */}
      <div className="hidden md:flex flex-1 max-w-3xl mx-auto">
        <div className="flex w-full bg-white rounded-md h-10 items-center relative">
          {/* Buy/Rent Dropdown */}
          <div 
             className="relative flex items-center px-3 border-r border-gray-200 cursor-pointer hover:bg-gray-50 h-full min-w-[80px]"
             onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span className="text-sm text-gray-700 font-medium capitalize">{listingType === 'sale' ? 'Buy' : 'Rent'}</span>
            <ChevronDown className="h-4 w-4 ml-1 text-gray-500" />
            
            {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-32 bg-white rounded-md shadow-lg py-1 border border-gray-100 z-50">
                    <div 
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setListingType('sale'); setIsDropdownOpen(false); }}
                    >
                        Buy
                    </div>
                    <div 
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setListingType('rent'); setIsDropdownOpen(false); }}
                    >
                        Rent
                    </div>
                </div>
            )}
          </div>

          {/* Chips & Input Container */}
          <div className="flex-1 flex items-center px-2 min-w-0 overflow-x-auto no-scrollbar gap-2">
              {selectedLocations.map(loc => (
                <div key={loc.slug} className="flex-shrink-0 flex items-center bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-100 whitespace-nowrap">
                    <span>{loc.name}</span>
                    <X 
                        className="h-3 w-3 ml-1 cursor-pointer hover:text-blue-900" 
                        onClick={() => removeLocation(loc.slug)}
                    />
                </div>
              ))}
              
              <div className="flex-1 min-w-[120px]">
                 <LocationAutosuggest 
                    placeholder={selectedLocations.length > 0 ? "Add more..." : "City, Suburb, or Area"}
                    inputClassName="w-full py-2 text-sm outline-none text-gray-700 placeholder:text-gray-400 bg-transparent border-none h-full focus-visible:ring-0 shadow-none px-1"
                    className="w-full h-full"
                    showIcon={false}
                    clearOnSelect={true}
                    onSelect={handleLocationSelect}
                 />
              </div>
          </div>

          {/* Icons */}
          <div className="flex items-center px-2 gap-2 flex-shrink-0">
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <Search 
                className="h-5 w-5 text-gray-600 cursor-pointer hover:text-gray-800" 
                onClick={handleSearch}
            />
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4 ml-auto">
        <Button 
          variant="secondary" 
          className="hidden md:flex bg-white hover:bg-gray-100 text-gray-900 font-medium text-sm h-9 px-4 gap-2"
          onClick={() => setLocation('/listings/create')}
        >
          Post property
          <Badge className="bg-green-600 hover:bg-green-700 text-[10px] px-1 py-0 h-4 rounded text-white border-0">
            FREE
          </Badge>
        </Button>

        <div 
          className="relative cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setLocation('/login')}
          title="Sign In"
        >
          <User className="h-6 w-6 text-white" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-[#005ca8]"></span>
        </div>

        <div
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setLocation('/dashboard')}
          title="Menu"
        >
          <Menu className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}
