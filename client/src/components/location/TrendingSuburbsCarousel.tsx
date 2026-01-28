import React, { useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrendingSuburb {
  id: number;
  name: string;
  slug: string;
  cityName: string;
  citySlug: string;
  listingCount?: number;
}

interface TrendingSuburbsCarouselProps {
  suburbs: TrendingSuburb[];
  provinceName: string;
  provinceSlug: string;
}

export function TrendingSuburbsCarousel({
  suburbs,
  provinceName,
  provinceSlug,
}: TrendingSuburbsCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    slidesToScroll: 2,
    containScroll: 'trimSnaps',
    dragFree: true,
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (!suburbs || suburbs.length === 0) return null;

  return (
    <section className="py-12 w-full" aria-label={`Trending suburbs in ${provinceName}`}>
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Trending Suburbs in {provinceName}</h2>
        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
            onClick={scrollNext}
          >
            <ChevronRight className="h-5 w-5 text-slate-600" />
          </Button>
        </div>
      </div>

      {/* Carousel Container */}
      <div className="relative group/carousel">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4">
            {suburbs.map(suburb => (
              <div
                key={suburb.id}
                className="flex-[0_0_85%] min-w-0 sm:flex-[0_0_45%] md:flex-[0_0_30%] lg:flex-[0_0_20%] xl:flex-[0_0_16.666%]"
              >
                <a
                  href={`/${provinceSlug}/${suburb.citySlug}/${suburb.slug}`}
                  className="block rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group p-5 h-full"
                >
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors flex items-center justify-between">
                        {suburb.name}
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 text-blue-600" />
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-4">
                        <div className="p-1 rounded-full bg-slate-100 group-hover:bg-blue-50 transition-colors">
                          <MapPin className="h-3 w-3 text-slate-400 group-hover:text-blue-500" />
                        </div>
                        <span>{suburb.cityName}</span>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center text-sm">
                      <span className="text-slate-500 text-xs uppercase tracking-wide font-medium">
                        Listings
                      </span>
                      <span className="font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                        {suburb.listingCount || 0}
                      </span>
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile scroll indicators */}
        <div className="flex md:hidden justify-center mt-4 gap-1">
          <span className="text-xs text-slate-400">Swipe to explore more →</span>
        </div>
      </div>
    </section>
  );
}
