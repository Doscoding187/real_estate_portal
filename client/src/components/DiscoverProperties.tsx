import { useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { CITY_PROVINCE_MAP } from "../lib/locationUtils";
import { Button } from '@/components/ui/button';

interface PropertyType {
  type: string;
  image: string;
  listingType: 'sale' | 'rent' | 'developments';
}

const propertyTypes: PropertyType[] = [
  // Sale Properties
  {
    type: 'Houses',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
    listingType: 'sale',
  },
  {
    type: 'Apartments',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
    listingType: 'sale',
  },
  {
    type: 'Townhouses',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
    listingType: 'sale',
  },
  {
    type: 'Office Spaces',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
    listingType: 'sale',
  },
  {
    type: 'Shops',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop',
    listingType: 'sale',
  },
  {
    type: 'Penthouses',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop',
    listingType: 'sale',
  },
  // Rent Properties
  {
    type: 'Apartments',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
    listingType: 'rent',
  },
  {
    type: 'Houses',
    image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop',
    listingType: 'rent',
  },
  {
    type: 'Townhouses',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
    listingType: 'rent',
  },
  {
    type: 'Studios',
    image: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&h=600&fit=crop',
    listingType: 'rent',
  },
  // New Developments
  {
    type: 'Ready to Move',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop',
    listingType: 'developments',
  },
  {
    type: 'New Launch',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop',
    listingType: 'developments',
  },
  {
    type: 'Affordable Housing',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop',
    listingType: 'developments',
  },
  {
    type: 'Luxury Projects',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
    listingType: 'developments',
  },
];

const cities = [
  'Johannesburg',
  'Cape Town',
  'Pretoria',
  'Durban',
  'Port Elizabeth',
  'Bloemfontein',
];

interface DiscoverPropertiesProps {
  initialCity?: string;
  availableCities?: string[];
  title?: string;
  subtitle?: string;
  locationName?: string;
}

export function DiscoverProperties({ 
  initialCity, 
  availableCities,
  title,
  subtitle,
  locationName = "South Africa"
}: DiscoverPropertiesProps = {}) {
  const defaultTitle = `Discover Properties in ${locationName}`;
  const defaultSubtitle = `Explore property sales, rentals, and new developments across ${locationName}${locationName.endsWith('s') ? "'" : "'s"} most vibrant locations.`;

  const displayTitle = title || defaultTitle;
  const displaySubtitle = subtitle || defaultSubtitle;

  const [selectedCity, setSelectedCity] = useState(initialCity || 'Johannesburg');
  
  const displayCities = availableCities || cities;

  const [listingType, setListingType] = useState<'sale' | 'rent' | 'developments'>('sale');
  const [saleExpanded, setSaleExpanded] = useState(true);
  const [rentExpanded, setRentExpanded] = useState(false);
  const [developmentsExpanded, setDevelopmentsExpanded] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    slidesToScroll: 1,
    containScroll: 'trimSnaps',
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const filteredProperties = propertyTypes.filter(p => p.listingType === listingType);

  const handleSaleClick = () => {
    setSaleExpanded(!saleExpanded);
    if (!saleExpanded) {
      setListingType('sale');
      setRentExpanded(false);
      setDevelopmentsExpanded(false);
    }
  };

  const handleRentClick = () => {
    setRentExpanded(!rentExpanded);
    if (!rentExpanded) {
      setListingType('rent');
      setSaleExpanded(false);
      setDevelopmentsExpanded(false);
    }
  };

  const handleDevelopmentsClick = () => {
    setDevelopmentsExpanded(!developmentsExpanded);
    if (!developmentsExpanded) {
      setListingType('developments');
      setSaleExpanded(false);
      setRentExpanded(false);
    }
  };

  const handleCardClick = (propertyType: string, listingType: 'sale' | 'rent' | 'developments') => {
    // For developments, navigate to developments page
    if (listingType === 'developments') {
      // Map property type to development filter
      const typeMap: Record<string, string> = {
        'Ready to Move': 'ready_to_move',
        'New Launch': 'new_launch',
        'Affordable Housing': 'affordable',
        'Luxury Projects': 'luxury'
      };
      const filter = typeMap[propertyType] || '';
      window.location.href = `/developments${filter ? `?type=${filter}` : ''}`;
    } else {
      // For sale/rent, navigate to properties page with filters
      // Use helper to construct hierarchical URL if possible
      const action = listingType === 'sale' ? 'sale' : 'rent';
      const citySlug = selectedCity.toLowerCase().replace(/\s+/g, '-');
      
      // Use shared map to lookup province
      const provinceSlug = CITY_PROVINCE_MAP[citySlug];
      
      let url = '';
      if (provinceSlug) {
        url = `/${provinceSlug}/${citySlug}?listingType=${action}`;
      } else {
        url = `/properties?city=${selectedCity}&listingType=${action}`;
      }
      
      if (propertyType && propertyType !== 'All') {
        // Map display names to url values if needed, otherwise slugify
        const typeSlug = propertyType.toLowerCase().replace(/\s+/g, '-');
        url += `&propertyType=${typeSlug}`;
      }
      
      window.location.href = url;
    }

  };

  return (
    <div className="py-16 bg-gradient-to-b from-white to-muted/20">
      <div className="container">
        <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
            {displayTitle}
            </h2>
            <p className="text-muted-foreground text-base max-w-2xl">
            {displaySubtitle}
            </p>
        </div>

        {/* City Tabs */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex flex-wrap justify-center gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-lg border border-slate-200/60 h-auto">
            {displayCities.map(city => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`
                  px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
                  ${
                    selectedCity === city
                      ? 'bg-gradient-to-r from-[#2774AE] to-[#2D68C4] text-white shadow-lg scale-105'
                      : 'text-slate-600 hover:text-[#2774AE] hover:bg-blue-50/50'
                  }
                `}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Listing Type Toggle */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-slate-200 shadow-xl bg-white overflow-hidden h-full flex flex-col">
              {/* Properties for Sale */}
              <div className="border-b border-slate-100">
                <button
                  onClick={handleSaleClick}
                  className={`w-full p-4 flex items-center justify-between transition-all duration-300 ${
                    saleExpanded 
                      ? 'bg-blue-50/80 text-blue-700' 
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="font-bold text-base">Properties for Sale</span>
                  <div className={`rounded-full p-1 transition-colors ${saleExpanded ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                      <ChevronRightIcon
                        className={`h-4 w-4 transition-transform duration-300 ${saleExpanded ? 'rotate-90' : ''}`}
                      />
                  </div>
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    saleExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-5 pb-5 pt-2 bg-blue-50/30">
                    <p className="text-sm text-slate-600 leading-relaxed mb-5">
                      Find your dream home in {selectedCity}. From affordable apartments to premium family houses, explore properties that match your budget and lifestyle.
                    </p>
                    <a 
                      href="/properties?action=sale" 
                      className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors group"
                    >
                      View Sale Listings
                      <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Properties for Rent */}
              <div className="border-b border-slate-100">
                <button
                  onClick={handleRentClick}
                  className={`w-full p-4 flex items-center justify-between transition-all duration-300 ${
                    rentExpanded 
                      ? 'bg-blue-50/80 text-blue-700' 
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="font-bold text-base">Properties for Rent</span>
                   <div className={`rounded-full p-1 transition-colors ${rentExpanded ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                      <ChevronRightIcon
                        className={`h-4 w-4 transition-transform duration-300 ${rentExpanded ? 'rotate-90' : ''}`}
                      />
                  </div>
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    rentExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-5 pb-5 pt-2 bg-blue-50/30">
                    <p className="text-sm text-slate-600 leading-relaxed mb-5">
                      Searching for a rental in {selectedCity}? Browse our selection of apartments, garden cottages, and corporate rentals available now.
                    </p>
                    <a 
                      href="/properties?action=rent" 
                      className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors group"
                    >
                      View Rental Listings
                      <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  </div>
                </div>
              </div>

              {/* New Developments */}
              <div>
                <button
                  onClick={handleDevelopmentsClick}
                  className={`w-full p-4 flex items-center justify-between transition-all duration-300 ${
                    developmentsExpanded 
                      ? 'bg-blue-50/80 text-blue-700' 
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="font-bold text-base">New Developments</span>
                   <div className={`rounded-full p-1 transition-colors ${developmentsExpanded ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                      <ChevronRightIcon
                        className={`h-4 w-4 transition-transform duration-300 ${developmentsExpanded ? 'rotate-90' : ''}`}
                      />
                  </div>
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    developmentsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-5 pb-5 pt-2 bg-blue-50/30">
                    <p className="text-sm text-slate-600 leading-relaxed mb-5">
                      Invest in the future with new developments in {selectedCity}. Explore off-plan opportunities and brand new estates.
                    </p>
                    <a 
                      href="/developments" 
                      className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors group"
                    >
                      View Developments
                      <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Property Carousel */}
          <div className="lg:col-span-9 relative group/carousel">
            <div className="overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5" ref={emblaRef}>
              <div className="flex gap-6 pl-4 py-1">
                {filteredProperties.map((property, idx) => (
                  <div
                    key={idx}
                    className="flex-[0_0_90%] min-w-0 sm:flex-[0_0_48%] lg:flex-[0_0_32%]"
                    onClick={() => handleCardClick(property.type, property.listingType)}
                  >
                    <div className="relative h-[360px] rounded-xl overflow-hidden group cursor-pointer shadow-md hover:shadow-2xl transition-all duration-500 bg-slate-900 border border-slate-800">
                      <img
                        src={property.image}
                        alt={property.type}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-80 group-hover:opacity-70 transition-opacity duration-300" />
                      
                      {/* Content Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <div className="w-12 h-1 bg-blue-500 mb-4 rounded-full transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 delay-100" />
                        
                        <div className="flex items-center gap-2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-75 transform -translate-y-2 group-hover:translate-y-0">
                             <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                Explore
                             </span>
                        </div>

                        <h3 className="text-2xl font-bold mb-2 text-white group-hover:text-blue-50 transition-colors">{property.type}</h3>
                        <p className="text-sm text-slate-300 font-medium flex items-center gap-2">
                          <span className="bg-white/10 backdrop-blur-md px-2 py-1 rounded text-xs uppercase tracking-wider border border-white/10">
                            {listingType === 'sale' ? 'For Sale' : listingType === 'rent' ? 'For Rent' : 'New Development'}
                          </span>
                          <span className="text-slate-300 opacity-80 group-hover:opacity-100 transition-opacity">in {selectedCity}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons - Visible on large screens or hover */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full h-12 w-12 shadow-xl z-20 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-110 bg-white/90 hover:bg-white text-slate-900 hover:text-blue-600 border border-slate-200 hidden md:flex"
              onClick={scrollPrev}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full h-12 w-12 shadow-xl z-20 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-110 bg-white/90 hover:bg-white text-slate-900 hover:text-blue-600 border border-slate-200 hidden md:flex"
              onClick={scrollNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
