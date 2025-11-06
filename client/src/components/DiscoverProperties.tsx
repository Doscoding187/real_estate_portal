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
  listingType: 'sale' | 'rent';
}

const propertyTypes: PropertyType[] = [
  {
    type: 'Shops',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop',
    listingType: 'sale',
  },
  {
    type: 'Builder Floors',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop',
    listingType: 'sale',
  },
  {
    type: 'Penthouses',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop',
    listingType: 'sale',
  },
  {
    type: 'Flats',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
    listingType: 'sale',
  },
  {
    type: 'Office Spaces',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop',
    listingType: 'sale',
  },
  {
    type: 'Villas',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop',
    listingType: 'sale',
  },
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
    type: 'Studios',
    image: 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&h=600&fit=crop',
    listingType: 'rent',
  },
  {
    type: 'Townhouses',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
    listingType: 'rent',
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
  const [listingType, setListingType] = useState<'sale' | 'rent'>('sale');
  const [saleExpanded, setSaleExpanded] = useState(true);
  const [rentExpanded, setRentExpanded] = useState(false);

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
    }
  };

  const handleRentClick = () => {
    setRentExpanded(!rentExpanded);
    if (!rentExpanded) {
      setListingType('rent');
      setSaleExpanded(false);
    }
  };

  return (
    <div className="py-16 bg-muted/30">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold mb-8">
          Discover More Real Estate Properties in South Africa
        </h2>

        {/* City Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {cities.map(city => (
            <Button
              key={city}
              variant={selectedCity === city ? 'default' : 'outline'}
              onClick={() => setSelectedCity(city)}
              className="rounded-md"
            >
              {city}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Listing Type Toggle */}
          <div className="lg:col-span-3">
            <Card className="p-0 overflow-hidden">
              {/* Properties for Sale */}
              <div className="border-b">
                <button
                  onClick={handleSaleClick}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <span className="font-semibold">Properties for Sale</span>
                  <ChevronRightIcon
                    className={`h-5 w-5 transition-transform ${saleExpanded ? 'rotate-90' : ''}`}
                  />
                </button>
                {saleExpanded && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-muted-foreground">
                      Properties for sale in {selectedCity} offer a versatile mix of affordable
                      apartments, premium homes, and commercial units. Customise your search by
                      property type, budget, and BHK preference to find options that match your
                      requirements.
                    </p>
                  </div>
                )}
              </div>

              {/* Properties for Rent */}
              <div>
                <button
                  onClick={handleRentClick}
                  className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <span className="font-semibold">Properties for Rent</span>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${rentExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
                {rentExpanded && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-muted-foreground">
                      Properties for rent in {selectedCity} include a wide range of apartments,
                      houses, and studios. Filter by budget, location, and amenities to find the
                      perfect rental that suits your lifestyle.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Side - Property Carousel */}
          <div className="lg:col-span-9 relative">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex gap-4">
                {filteredProperties.map((property, idx) => (
                  <div
                    key={idx}
                    className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
                  >
                    <Card className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow">
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img
                          src={property.image}
                          alt={property.type}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                          <h3 className="text-xl font-bold mb-1">{property.type}</h3>
                          <p className="text-sm text-white/90">
                            for {listingType === 'sale' ? 'Sale' : 'Rent'} in {selectedCity}
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
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 rounded-full shadow-lg z-10"
              onClick={scrollPrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 rounded-full shadow-lg z-10"
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
