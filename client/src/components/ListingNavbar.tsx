import { Button } from './ui/button';
import { Search, Mic, Menu, User, ChevronDown, X } from 'lucide-react';
import { LocationAutosuggest } from './LocationAutosuggest';
import { Badge } from './ui/badge';
import { useLocation } from 'wouter';
import { useState } from 'react';

export function ListingNavbar() {
  const [, setLocation] = useLocation();
  const [listingType, setListingType] = useState<'sale' | 'rent'>('sale');
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    slug: string;
    provinceSlug: string;
  } | null>(null);

  // Buy/Rent Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSearch = () => {
    if (selectedLocation) {
        // Navigate to canonical location page
        const root = listingType === 'rent' ? '/property-to-rent' : '/property-for-sale';
        // Construct URL: /property-for-sale/[province]/[city] or /[province]/[city]/[suburb] via helper if possible
        // Ideally we use generatePropertyUrl, but explicit path construction is safer with the known slugs
        const url = `${root}/${selectedLocation.provinceSlug}/${selectedLocation.slug}`;
        setLocation(url);
    } else {
        // Generic search
        // If no location, maybe just go to root? or search page?
        // For now, go to root listing page
        const root = listingType === 'rent' ? '/property-to-rent' : '/property-for-sale';
        setLocation(root);
    }
  };

  const handleLocationSelect = (loc: any) => {
     console.log("Selected:", loc);
     // We need to map Google Place to our URL structure (slugs)
     // For now, we'll try to use the raw name slugified, 
     // BUT in a real app we'd resolve this via backend. 
     // Since this is a UI task, let's assume simple slugification or redirection.
     
     // HACK: Simulating slug generation for immediate navigation testing
     const slug = loc.name.toLowerCase().replace(/\s+/g, '-');
     // Defaulting province to 'gauteng' if unknown, or extracting from address
     const addressParts = loc.fullAddress.split(',').map((p: string) => p.trim());
     // Very rough heuristic for province - mostly for demo
     let province = 'gauteng'; 
     if (loc.fullAddress.toLowerCase().includes('cape town')) province = 'western-cape';
     if (loc.fullAddress.toLowerCase().includes('durban')) province = 'kwazulu-natal';
     
     setSelectedLocation({
         name: loc.name,
         slug: slug,
         provinceSlug: province
     });
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
        <div className="flex w-full bg-white rounded-md overflow-hidden h-10 items-center">
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

          {/* Selected Location Chip */}
          {selectedLocation && (
            <div className="flex items-center pl-2">
                <div className="flex items-center bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-100">
                <span>{selectedLocation.name}</span>
                <X 
                    className="h-3 w-3 ml-1 cursor-pointer hover:text-blue-900" 
                    onClick={() => setSelectedLocation(null)}
                />
                </div>
            </div>
          )}

          {/* Input (Autosuggest) */}
          <div className="flex-1 min-w-0">
             {!selectedLocation && (
                 <LocationAutosuggest 
                    placeholder="City, Suburb, or Area"
                    inputClassName="w-full px-3 py-2 text-sm outline-none text-gray-700 placeholder:text-gray-400 bg-transparent border-none h-full focus-visible:ring-0 shadow-none"
                    className="w-full h-full"
                    showIcon={false}
                    onSelect={handleLocationSelect}
                 />
             )}
             {selectedLocation && (
                 <div className="w-full px-3 py-2 text-sm text-gray-400 italic cursor-not-allowed">
                     Location selected
                 </div>
             )}
          </div>

          {/* Icons */}
          <div className="flex items-center px-2 gap-2">
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

        <div className="relative cursor-pointer">
          <User className="h-6 w-6 text-white" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-[#005ca8]"></span>
        </div>

        <Menu className="h-6 w-6 text-white cursor-pointer" />
      </div>
    </div>
  );
}
