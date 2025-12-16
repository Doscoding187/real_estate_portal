import React, { useCallback } from 'react';
import { Link } from 'wouter';
import useEmblaCarousel from 'embla-carousel-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  MapPin,
  Building2,
  Mountain,
  Palmtree,
  Landmark,
  Anchor,
  Flower2,
  Waves,
  Leaf,
  Sun,
  Gem,
  Wine,
  ArrowRight,
  Plane,
  Factory,
  Briefcase,
  TreeDeciduous,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface City {
  name: string;
  province: string;
  icon: React.ElementType;
  slug: string;
  provinceSlug: string;
  color: string;
  featured?: boolean;
}

interface ExploreCitiesProps {
  provinceSlug?: string;
  title?: string;
  description?: string;
  customLocations?: City[]; // Allow passing custom locations (e.g. suburbs)
}

export function ExploreCities({ provinceSlug, title, description, customLocations }: ExploreCitiesProps = {}) {
  const cities: City[] = [
    // ... (keep existing hardcoded cities)
    {
      name: 'Johannesburg',
      province: 'Gauteng',
      icon: Building2,
      slug: 'johannesburg',
      provinceSlug: 'gauteng',
      color: 'from-blue-500 to-indigo-500',
    },
    {
      name: 'Cape Town',
      province: 'Western Cape',
      icon: Mountain,
      slug: 'cape-town',
      provinceSlug: 'western-cape',
      color: 'from-teal-500 to-emerald-500',
    },
    {
      name: 'Durban',
      province: 'KwaZulu-Natal',
      icon: Palmtree,
      slug: 'durban',
      provinceSlug: 'kwazulu-natal',
      color: 'from-orange-500 to-amber-500',
    },
    {
      name: 'Pretoria',
      province: 'Gauteng',
      icon: Landmark,
      slug: 'pretoria',
      provinceSlug: 'gauteng',
      color: 'from-purple-500 to-pink-500',
    },
    {
      name: 'Port Elizabeth',
      province: 'Eastern Cape',
      icon: Anchor,
      slug: 'port-elizabeth',
      provinceSlug: 'eastern-cape',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      name: 'Bloemfontein',
      province: 'Free State',
      icon: Flower2,
      slug: 'bloemfontein',
      provinceSlug: 'free-state',
      color: 'from-rose-500 to-red-500',
    },
    {
      name: 'East London',
      province: 'Eastern Cape',
      icon: Waves,
      slug: 'east-london',
      provinceSlug: 'eastern-cape',
      color: 'from-sky-500 to-blue-500',
    },
    {
      name: 'Nelspruit',
      province: 'Mpumalanga',
      icon: Leaf,
      slug: 'nelspruit',
      provinceSlug: 'mpumalanga',
      color: 'from-green-500 to-emerald-500',
    },
    {
      name: 'Polokwane',
      province: 'Limpopo',
      icon: Sun,
      slug: 'polokwane',
      provinceSlug: 'limpopo',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      name: 'Kimberley',
      province: 'Northern Cape',
      icon: Gem,
      slug: 'kimberley',
      provinceSlug: 'northern-cape',
      color: 'from-indigo-500 to-violet-500',
    },
    {
      name: 'Rustenburg',
      province: 'North West',
      icon: Mountain,
      slug: 'rustenburg',
      provinceSlug: 'north-west',
      color: 'from-stone-500 to-neutral-500',
    },
    {
      name: 'Stellenbosch',
      province: 'Western Cape',
      icon: Wine,
      slug: 'stellenbosch',
      provinceSlug: 'western-cape',
      color: 'from-red-500 to-rose-600',
    },
    {
      name: 'Sandton',
      province: 'Gauteng',
      icon: Gem,
      slug: 'sandton',
      provinceSlug: 'gauteng',
      color: 'from-amber-500 to-yellow-500',
      featured: false,
    },
    {
      name: 'Midrand',
      province: 'Gauteng',
      icon: Building2,
      slug: 'midrand',
      provinceSlug: 'gauteng',
      color: 'from-blue-400 to-cyan-500',
      featured: false,
    },
    {
      name: 'Centurion',
      province: 'Gauteng',
      icon: Landmark,
      slug: 'centurion',
      provinceSlug: 'gauteng',
      color: 'from-emerald-500 to-teal-500',
      featured: false,
    },
    {
      name: 'Randburg',
      province: 'Gauteng',
      icon: TreeDeciduous,
      slug: 'randburg',
      provinceSlug: 'gauteng',
      color: 'from-green-500 to-lime-500',
      featured: false,
    },
    {
      name: 'Roodepoort',
      province: 'Gauteng',
      icon: Mountain,
      slug: 'roodepoort',
      provinceSlug: 'gauteng',
      color: 'from-orange-400 to-red-400',
      featured: false,
    },
    {
      name: 'Kempton Park',
      province: 'Gauteng',
      icon: Plane,
      slug: 'kempton-park',
      provinceSlug: 'gauteng',
      color: 'from-sky-500 to-indigo-500',
      featured: false,
    },
    {
      name: 'Bedfordview',
      province: 'Gauteng',
      icon: Gem,
      slug: 'bedfordview',
      provinceSlug: 'gauteng',
      color: 'from-purple-400 to-fuchsia-500',
      featured: false,
    },
    {
      name: 'Benoni',
      province: 'Gauteng',
      icon: Waves,
      slug: 'benoni',
      provinceSlug: 'gauteng',
      color: 'from-blue-500 to-cyan-400',
      featured: false,
    },
    {
      name: 'Alberton',
      province: 'Gauteng',
      icon: Briefcase,
      slug: 'alberton',
      provinceSlug: 'gauteng',
      color: 'from-yellow-500 to-amber-600',
      featured: false,
    },
    {
      name: 'Vereeniging',
      province: 'Gauteng',
      icon: Factory,
      slug: 'vereeniging',
      provinceSlug: 'gauteng',
      color: 'from-slate-500 to-gray-600',
      featured: false,
    },
  ];

  const filteredCities = customLocations || (provinceSlug 
    ? cities.filter(city => city.provinceSlug.toLowerCase() === provinceSlug.toLowerCase())
    : cities.filter(city => city.featured !== false));

  const displayTitle = title || "Explore Real Estate in Popular South African Cities";
  const displayDescription = description || "Find high-end residences, reasonably priced apartments, and high-growth investments by exploring real estate in well-known South African cities. Use professional advice and insights to navigate opportunities across metro hubs.";

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    slidesToScroll: 1,
    containScroll: 'trimSnaps',
    loop: false,
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);


  return (
    <section className="py-12 bg-white">
      <div className="container">
        {/* Section Header */}
        <div className="mb-8 text-center md:text-left flex justify-between items-end">
          <div>
              <h2 className="text-xl md:text-2xl font-bold mb-3">
                {displayTitle}
              </h2>
              <p className="text-muted-foreground text-base max-w-4xl mx-auto md:mx-0">
                {displayDescription}
              </p>
          </div>
          
          {/* Desktop Navigation Buttons */}
          <div className="hidden md:flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 border-slate-200 hover:bg-slate-100 hover:text-blue-600"
              onClick={scrollPrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 border-slate-200 hover:bg-slate-100 hover:text-blue-600"
              onClick={scrollNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Carousel Viewport */}
        <div className="relative group/carousel">
          <div className="overflow-hidden -mx-4 px-4 py-4" ref={emblaRef}>
            <div className="flex gap-6">
              {filteredCities.map(city => (
                <div 
                  key={city.slug} 
                  className="flex-[0_0_85%] sm:flex-[0_0_50%] md:flex-[0_0_33.333%] lg:flex-[0_0_25%] min-w-0"
                >
                  <Link href={`/${city.provinceSlug}/${city.slug}`}>
                    <Card className="h-full hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 bg-muted/30 hover:bg-white overflow-hidden">
                      <CardContent className="p-4 h-full">
                        <div className="flex items-center gap-4">
                          {/* City Icon */}
                          <div
                            className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${city.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}
                          >
                            <city.icon className="h-6 w-6" />
                          </div>

                          {/* City Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base mb-1 group-hover:text-blue-600 transition-colors truncate">
                              {city.name}
                            </h3>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate font-medium">{city.province}</span>
                            </div>
                          </div>

                          {/* Arrow Icon */}
                          <div className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-2 group-hover:translate-x-0">
                            <ArrowRight className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>
          </div>
          
           {/* Mobile Navigation Overlay Buttons (optional, but good for UX) */}
           <div className="md:hidden flex justify-between pointer-events-none absolute inset-0 items-center px-0">
               {/* Left/Right buttons can be added here if needed, but swipe is primary on mobile */}
           </div>
        </div>

      </div>
    </section>
  );
}
