import { useState } from 'react';
import { useLocation } from 'wouter';
import { Building2, Home as HomeIcon, Building, Warehouse, MapPin, Tractor, Search, Filter, BedDouble, Wallet, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LocationAutosuggest } from '@/components/LocationAutosuggest';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';

export interface PropertyCategoriesProps {
  preselectedLocation?: {
    name: string;
    slug: string;
    provinceSlug: string; // Required for canonical URLs
    type: 'city' | 'suburb' | 'province';
  };
}

export function PropertyCategories({ preselectedLocation }: PropertyCategoriesProps) {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<{ title: string; type: string } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  // Filter State
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [bedrooms, setBedrooms] = useState<string>('');
  const [features, setFeatures] = useState<string[]>([]);
  
  // Fetch real property counts based on location
  const { data: filterCounts } = trpc.properties.getFilterCounts.useQuery(
    {
      filters: preselectedLocation ? (() => {
        // Build filter based on location type
        let builtFilters: any = {};
        if (preselectedLocation.type === 'province') {
          builtFilters = {
            province: preselectedLocation.slug,
            listingType: 'sale',
          };
        } else if (preselectedLocation.type === 'city') {
          builtFilters = {
            province: preselectedLocation.provinceSlug,
            city: preselectedLocation.slug,
            listingType: 'sale',
          };
        } else if (preselectedLocation.type === 'suburb') {
          builtFilters = {
            province: preselectedLocation.provinceSlug,
            suburb: [preselectedLocation.slug],
            listingType: 'sale',
          };
        }
        return builtFilters;
      })() : {}
    },
    {
      enabled: true,
      staleTime: 1000 * 60 * 5,
    }
  );

  const categories = [
    { Icon: Building2, title: 'Apartments', count: filterCounts?.byPropertyType?.apartment || 0, type: 'apartment', gradient: 'from-[#2774AE] to-[#2D68C4]' },
    { Icon: HomeIcon, title: 'Houses', count: filterCounts?.byPropertyType?.house || 0, type: 'house', gradient: 'from-[#2D68C4] to-[#0F52BA]' },
    { Icon: Building, title: 'Townhouses', count: filterCounts?.byPropertyType?.townhouse || 0, type: 'townhouse', gradient: 'from-[#0F52BA] to-[#1560BD]' },
    { Icon: Warehouse, title: 'Commercial', count: filterCounts?.byPropertyType?.commercial || 0, type: 'commercial', gradient: 'from-[#1560BD] to-[#2774AE]' },
    { Icon: MapPin, title: 'Land & Plots', count: filterCounts?.byPropertyType?.land || 0, type: 'land', gradient: 'from-[#2774AE] to-[#2D68C4]' },
    { Icon: Tractor, title: 'Farms', count: filterCounts?.byPropertyType?.farm || 0, type: 'farm', gradient: 'from-[#2D68C4] to-[#0F52BA]' },
  ];

  const handleCategoryClick = (category: typeof categories[0]) => {
    setSelectedCategory(category);
    setFeatures([]);
    setMinPrice('');
    setMaxPrice('');
    setBedrooms('');
    
    // If we have a preselected location, pre-fill it and skip to step 2 (filters)
    if (preselectedLocation) {
      setSelectedLocation({
        name: preselectedLocation.name,
        slug: preselectedLocation.slug,
        provinceSlug: preselectedLocation.provinceSlug,
      });
      setStep(2); // Go directly to filters
    } else {
      // No preselected location - start at step 1 (location picker)
      setSelectedLocation(null);
      setStep(1);
    }
    
    setIsDialogOpen(true);
  };

  const handleLocationSelect = (loc: any) => {
    setSelectedLocation(loc);
    setStep(2);
  };

  const toggleFeature = (feature: string) => {
    setFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature) 
        : [...prev, feature]
    );
  };

  const handleSearch = () => {
    if (!selectedCategory || !selectedLocation) return;
    
    setIsDialogOpen(false);

    let url = '';
    
    // Base Route
    if (selectedLocation.slug && selectedLocation.provinceSlug) {
       url = `/property-for-sale/${selectedLocation.provinceSlug}/${selectedLocation.slug}`;
    } else if (selectedLocation.slug) {
       url = `/property-for-sale/${selectedLocation.slug}`;
    } else {
       url = `/properties`; // Fallback
    }

    const params = new URLSearchParams();
    
    // Core Params
    params.set('propertyType', selectedCategory.type);
    params.set('view', 'list');
    
    // Filters
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (bedrooms) params.set('minBedrooms', bedrooms);
    
    // Location Name fallback if no slug
    if (!selectedLocation.slug) params.set('location', selectedLocation.name);

    // Features / Amenities
    if (features.length > 0) {
      params.set('amenities', features.join(','));
      // Special handling for "Luxury" if we want to enforce price
      if (features.includes('luxury') && !minPrice) {
          params.set('minPrice', '5000000');
      }
    }

    setLocation(`${url}?${params.toString()}`);
  };

  const priceOptions = [
    { value: '500000', label: 'R 500k' },
    { value: '1000000', label: 'R 1m' },
    { value: '2000000', label: 'R 2m' },
    { value: '3000000', label: 'R 3m' },
    { value: '5000000', label: 'R 5m' },
    { value: '10000000', label: 'R 10m' },
  ];

  return (
    <div className="py-fluid-xl bg-gradient-to-b from-white via-slate-50/30 to-white">
      <div className="container">
        <div className="mb-12">
          <h2 className="font-bold mb-4 bg-gradient-to-r from-slate-900 via-[#2774AE] to-slate-900 bg-clip-text text-transparent">
            Explore Property Categories
          </h2>
          <p className="text-slate-600 max-w-2xl leading-relaxed">
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
              <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />
              
              <div className={`relative mb-4 p-4 md:p-5 rounded-2xl bg-gradient-to-br ${category.gradient} shadow-lg group-hover:shadow-2xl group-hover:scale-110 transition-all duration-500`}>
                <category.Icon className="h-7 w-7 md:h-8 md:w-8 text-white" />
              </div>
              
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
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-center">
                 {step === 1 ? (
                    <span className="flex flex-col gap-2">
                       <span className="text-xl">Find {selectedCategory?.title}</span>
                       <span className="text-sm font-normal text-muted-foreground">Select a city or suburb</span>
                    </span>
                 ) : (
                    <span className="flex flex-col gap-2">
                       <span className="text-xl">Refine your Search</span>
                       <span className="text-sm font-normal text-muted-foreground">
                         Looking for {selectedCategory?.title} in <span className="text-[#2774AE] font-medium">{selectedLocation?.name}</span>
                       </span>
                    </span>
                 )}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
               {step === 1 ? (
                  <div className="space-y-4">
                     <LocationAutosuggest 
                        onSelect={handleLocationSelect}
                        placeholder="e.g. Sandton, Cape Town..."
                        className="w-full"
                        inputClassName="h-12 text-base shadow-sm border-slate-200 focus:border-[#2774AE] focus:ring-[#2774AE]"
                     />
                     <div className="text-center text-xs text-muted-foreground pt-4">
                        Please select a specific location to continue.
                     </div>
                  </div>
               ) : (
                  <div className="space-y-6">
                     
                     {/* Bedrooms */}
                     <div className="space-y-3">
                        <Label>Bedrooms</Label>
                        <div className="flex gap-2">
                           {['Any', '1+', '2+', '3+', '4+'].map((opt) => (
                              <button
                                 key={opt}
                                 onClick={() => setBedrooms(opt === 'Any' ? '' : opt.replace('+', ''))}
                                 className={cn(
                                    "flex-1 py-2 text-sm rounded-md border transition-all",
                                    (opt === 'Any' && !bedrooms) || (bedrooms === opt.replace('+', '')) 
                                       ? "bg-[#2774AE] text-white border-[#2774AE]" 
                                       : "bg-white text-slate-600 border-slate-200 hover:border-[#2774AE]"
                                 )}
                              >
                                 {opt}
                              </button>
                           ))}
                        </div>
                     </div>

                     {/* Price Range */}
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <Label>Min Price</Label>
                           <Select value={minPrice} onValueChange={setMinPrice}>
                              <SelectTrigger>
                                 <SelectValue placeholder="No Min" />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="0">No Min</SelectItem>
                                 {priceOptions.map(opt => (
                                    <SelectItem key={`min-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>
                                 ))}
                              </SelectContent>
                           </Select>
                        </div>
                        <div className="space-y-2">
                           <Label>Max Price</Label>
                           <Select value={maxPrice} onValueChange={setMaxPrice}>
                              <SelectTrigger>
                                 <SelectValue placeholder="No Max" />
                              </SelectTrigger>
                              <SelectContent>
                                 {priceOptions.map(opt => (
                                    <SelectItem key={`max-${opt.value}`} value={opt.value}>{opt.label}</SelectItem>
                                 ))}
                                 <SelectItem value="20000000">R 20m+</SelectItem>
                              </SelectContent>
                           </Select>
                        </div>
                     </div>

                     {/* Features */}
                     <div className="space-y-3">
                        <Label>Lifestyle & Features</Label>
                        <div className="grid grid-cols-2 gap-2">
                           {[
                              { id: 'pool', label: 'Pool', icon: '🏊' },
                              { id: 'garden', label: 'Garden', icon: '🌳' },
                              { id: 'pet_friendly', label: 'Pet Friendly', icon: '🐾' },
                              { id: 'luxury', label: 'Luxury Collection', icon: '💎' },
                           ].map((feat) => (
                              <button
                                 key={feat.id}
                                 onClick={() => toggleFeature(feat.id)}
                                 className={cn(
                                    "flex items-center gap-2 px-3 py-2 text-sm rounded-md border transition-all text-left",
                                    features.includes(feat.id)
                                       ? "bg-blue-50 border-[#2774AE] text-[#2774AE] ring-1 ring-[#2774AE]" 
                                       : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                 )}
                              >
                                 <span>{feat.icon}</span>
                                 {feat.label}
                              </button>
                           ))}
                        </div>
                     </div>

                     <Button onClick={handleSearch} className="w-full h-12 text-base font-semibold bg-[#2774AE] hover:bg-[#206498] mt-4">
                        View Properties
                     </Button>
                     
                     <div className="text-center">
                        <button onClick={() => setStep(1)} className="text-sm text-slate-400 hover:text-slate-600">
                           Back to Location
                        </button>
                     </div>
                  </div>
               )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
