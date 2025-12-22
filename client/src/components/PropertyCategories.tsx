import { useLocation } from 'wouter';
import { Building2, Home as HomeIcon, Building, Warehouse, MapPin, Tractor } from 'lucide-react';

import { useState } from 'react';
import { useLocation } from 'wouter';
import { Building2, Home as HomeIcon, Building, Warehouse, MapPin, Tractor, Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LocationAutosuggest } from '@/components/LocationAutosuggest';
import { Button } from '@/components/ui/button';

export function PropertyCategories() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<{ title: string; type: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const categories = [
    { Icon: Building2, title: 'Apartments', count: '2,500+', type: 'apartment', gradient: 'from-[#2774AE] to-[#2D68C4]' },
    { Icon: HomeIcon, title: 'Houses', count: '3,200+', type: 'house', gradient: 'from-[#2D68C4] to-[#0F52BA]' },
    { Icon: Building, title: 'Townhouses', count: '1,800+', type: 'townhouse', gradient: 'from-[#0F52BA] to-[#1560BD]' },
    { Icon: Warehouse, title: 'Commercial', count: '950+', type: 'commercial', gradient: 'from-[#1560BD] to-[#2774AE]' },
    { Icon: MapPin, title: 'Land & Plots', count: '1,200+', type: 'land', gradient: 'from-[#2774AE] to-[#2D68C4]' },
    { Icon: Tractor, title: 'Farms', count: '450+', type: 'farm', gradient: 'from-[#2D68C4] to-[#0F52BA]' },
  ];

  const handleCategoryClick = (category: typeof categories[0]) => {
    setSelectedCategory(category);
    setIsDialogOpen(true);
  };

  const handleLocationSelect = (loc: any) => {
    if (selectedCategory) {
      setIsDialogOpen(false);
      // Construct URL: /property-for-sale/slug?propertyType=type
      // If it has a slug, use it. If not, fallback to search.
      if (loc.slug && loc.provinceSlug) { // It's a city or suburb with full hierarchy
         setLocation(`/property-for-sale/${loc.provinceSlug}/${loc.slug}?propertyType=${selectedCategory.type}&view=list`);
      } else if (loc.slug) { // Province or high level
         setLocation(`/property-for-sale/${loc.slug}?propertyType=${selectedCategory.type}&view=list`);
      } else {
         setLocation(`/properties?type=${selectedCategory.type}&location=${encodeURIComponent(loc.name)}&view=list`);
      }
    }
  };

  const popularProvinces = [
    { name: 'Gauteng', slug: 'gauteng' },
    { name: 'Western Cape', slug: 'western-cape' },
    { name: 'KwaZulu-Natal', slug: 'kwazulu-natal' },
  ];

  return (
    <div className="py-16 md:py-20 bg-gradient-to-b from-white via-slate-50/30 to-white">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-slate-900 via-[#2774AE] to-slate-900 bg-clip-text text-transparent">
            Explore Property Categories
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto leading-relaxed">
            Find the perfect property type that suits your needs across South Africa
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {categories.map((category, idx) => (
            <button
              key={idx}
              onClick={() => handleCategoryClick(category)}
              className="group relative flex flex-col items-center text-center p-6 md:p-8 rounded-2xl bg-white hover:bg-gradient-to-br hover:from-white hover:to-blue-50/30 shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-200/60 hover:border-[#2774AE]/30 overflow-hidden hover:-translate-y-1 w-full"
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />
              
              {/* Icon with gradient background */}
              <div className={`relative mb-4 p-4 md:p-5 rounded-2xl bg-gradient-to-br ${category.gradient} shadow-lg group-hover:shadow-2xl group-hover:scale-110 transition-all duration-500`}>
                <category.Icon className="h-7 w-7 md:h-8 md:w-8 text-white" />
              </div>
              
              {/* Text content */}
              <h3 className="relative text-sm md:text-base font-bold text-slate-900 mb-1.5 group-hover:text-[#2774AE] transition-colors">
                {category.title}
              </h3>
              <p className="relative text-xs md:text-sm text-slate-600 font-semibold bg-slate-100 px-3 py-1 rounded-full">
                {category.count}
              </p>
            </button>
          ))}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center flex flex-col items-center gap-2">
                <span className="text-xl">Find {selectedCategory?.title} in...</span>
                <span className="text-sm font-normal text-muted-foreground">Select a location to narrow your search</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 ml-1">Search City or Suburb</label>
                <LocationAutosuggest 
                  onSelect={handleLocationSelect}
                  placeholder="e.g. Sandton, Cape Town..."
                  className="w-full"
                  inputClassName="h-12 text-base shadow-sm border-slate-200 focus:border-[#2774AE] focus:ring-[#2774AE]"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400">Or browse by province</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                 {popularProvinces.map(prov => (
                   <Button 
                      key={prov.slug} 
                      variant="outline" 
                      className="justify-between h-12 hover:border-[#2774AE] hover:text-[#2774AE] hover:bg-blue-50/50 group"
                      onClick={() => {
                        if (selectedCategory) {
                             setIsDialogOpen(false);
                             setLocation(`/property-for-sale/${prov.slug}?propertyType=${selectedCategory.type}&view=list`);
                        }
                      }}
                   >
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400 group-hover:text-[#2774AE]" />
                        {prov.name}
                      </span>
                      <Search className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                   </Button>
                 ))}
              </div>

              <div className="text-center pt-2">
                <button 
                  onClick={() => {
                     if (selectedCategory) {
                        setIsDialogOpen(false);
                        setLocation(`/properties?type=${selectedCategory.type}&view=list`);
                     }
                  }}
                  className="text-sm text-slate-500 hover:text-[#2774AE] underline decoration-slate-300 hover:decoration-[#2774AE]"
                >
                  Search entire South Africa instead
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
