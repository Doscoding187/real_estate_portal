import { useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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

export function DiscoverProperties() {
  const [selectedCity, setSelectedCity] = useState('Johannesburg');
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
      // Simple lookup for demo purposes or import from locationUtils
      // For now, assuming standard cities we know
      const provinceMap: Record<string, string> = {
        'johannesburg': 'gauteng',
        'cape-town': 'western-cape',
        'durban': 'kwazulu-natal',
        'pretoria': 'gauteng',
        'sandton': 'gauteng',
        'bloemfontein': 'free-state',
        'port-elizabeth': 'eastern-cape'
      };
      
      const province = provinceMap[citySlug] || 'gauteng';
      const typeParam = propertyType === 'Houses' ? 'house' : 
                       propertyType === 'Apartments' ? 'apartment' :
                       propertyType === 'Townhouses' ? 'townhouse' :
                       propertyType === 'Office Spaces' ? 'commercial' :
                       propertyType === 'Shops' ? 'commercial' :
                       propertyType === 'Penthouses' ? 'apartment' :
                       propertyType === 'Studios' ? 'apartment' : '';

      // Construct hierarchical URL: /province/city?listingType=...&propertyType=...
      const queryParams = new URLSearchParams();
      queryParams.set('listingType', action);
      if (typeParam) queryParams.set('propertyType', typeParam);
      
      window.location.href = `/${province}/${citySlug}?${queryParams.toString()}`;
    }
  };

  return (
    <div className="py-16 bg-muted/30">
      <div className="container">
        <h2 className="text-2xl md:text-3xl font-bold mb-8">
          Discover More Real Estate Properties in South Africa
        </h2>

        {/* City Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {cities.map(city => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`
                px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border
                ${
                  selectedCity === city
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-md scale-105'
                    : 'bg-white text-muted-foreground border-gray-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
                }
              `}
            >
              {city}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Listing Type Toggle */}
          <div className="lg:col-span-3">
            <Card className="p-0 overflow-hidden border-gray-100 shadow-sm bg-white/50 backdrop-blur-sm h-[400px] flex flex-col">
              {/* Properties for Sale */}
              <div className="border-b border-gray-100">
                <button
                  onClick={handleSaleClick}
                  className={`w-full p-4 flex items-center justify-between transition-all duration-300 ${
                    saleExpanded 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700' 
                      : 'hover:bg-gray-50 text-foreground'
                  }`}
                >
                  <span className="font-semibold">Properties for Sale</span>
                  <ChevronRightIcon
                    className={`h-5 w-5 transition-transform duration-300 ${saleExpanded ? 'rotate-90 text-blue-600' : 'text-muted-foreground'}`}
                  />
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    saleExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-4 pb-4 pt-2 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      Properties for sale in {selectedCity} offer a versatile mix of affordable
                      apartments, premium homes, and commercial units. Customise your search by
                      property type, budget, number of bedrooms, and property size to find options that match your
                      requirements.
                    </p>
                    <a 
                      href="/properties?action=sale" 
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                    >
                      View All Properties for Sale
                      <ChevronRightIcon className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Properties for Rent */}
              <div>
                <button
                  onClick={handleRentClick}
                  className={`w-full p-4 flex items-center justify-between transition-all duration-300 ${
                    rentExpanded 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700' 
                      : 'hover:bg-gray-50 text-foreground'
                  }`}
                >
                  <span className="font-semibold">Properties for Rent</span>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform duration-300 ${rentExpanded ? 'rotate-180 text-blue-600' : 'text-muted-foreground'}`}
                  />
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    rentExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-4 pb-4 pt-2 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      Properties for rent in {selectedCity} include a wide range of apartments,
                      houses, and studios. Filter by budget, location, number of bedrooms, and amenities to find the
                      perfect rental that suits your lifestyle.
                    </p>
                    <a 
                      href="/properties?action=rent" 
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                    >
                      View All Properties for Rent
                      <ChevronRightIcon className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>

              {/* New Developments */}
              <div className="border-t border-gray-100">
                <button
                  onClick={handleDevelopmentsClick}
                  className={`w-full p-4 flex items-center justify-between transition-all duration-300 ${
                    developmentsExpanded 
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700' 
                      : 'hover:bg-gray-50 text-foreground'
                  }`}
                >
                  <span className="font-semibold">New Developments</span>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform duration-300 ${developmentsExpanded ? 'rotate-180 text-blue-600' : 'text-muted-foreground'}`}
                  />
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    developmentsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-4 pb-4 pt-2 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      New developments in {selectedCity} offer modern homes with innovative layouts,
                      trusted developers, and competitive pricing. Explore ready-to-move, new launch,
                      and affordable housing projects that deliver exceptional value.
                    </p>
                    <a 
                      href="/developments" 
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                    >
                      View All New Developments
                      <ChevronRightIcon className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Side - Property Carousel */}
          <div className="lg:col-span-9 relative group/carousel">
            <div className="overflow-hidden rounded-xl" ref={emblaRef}>
              <div className="flex gap-4">
                {filteredProperties.map((property, idx) => (
                  <div
                    key={idx}
                    className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
                    onClick={() => handleCardClick(property.type, property.listingType)}
                  >
                    <Card className="overflow-hidden group cursor-pointer hover:shadow-xl transition-all duration-500 border-0 h-full">
                      <div className="relative h-[400px] overflow-hidden">
                        <img
                          src={property.image}
                          alt={property.type}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />
                        
                        {/* Content Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                          <div className="w-12 h-1 bg-blue-500 mb-4 rounded-full transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 delay-100" />
                          <h3 className="text-2xl font-bold mb-2">{property.type}</h3>
                          <p className="text-sm text-white/90 font-medium flex items-center gap-2">
                            <span className="bg-white/20 backdrop-blur-md px-2 py-1 rounded text-xs uppercase tracking-wider">
                              {listingType === 'sale' ? 'For Sale' : listingType === 'rent' ? 'For Rent' : 'New Development'}
                            </span>
                            <span>in {selectedCity}</span>
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 rounded-full shadow-lg z-10 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-110 bg-white/90 hover:bg-white text-blue-900"
              onClick={scrollPrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 rounded-full shadow-lg z-10 opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-110 bg-white/90 hover:bg-white text-blue-900"
              onClick={scrollNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
