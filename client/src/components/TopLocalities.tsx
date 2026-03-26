import { useState, useCallback, useMemo } from 'react';
import { Link } from 'wouter';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Star, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';

const cities = [
  'Cape Town',
  'Johannesburg',
  'Durban',
  'Pretoria',
  'Bloemfontein',
  'Gqeberha',
  'Polokwane',
  'Mbombela',
  'Mahikeng',
];

const cityProvinceMap: Record<string, string> = {
  'Cape Town': 'western-cape',
  Johannesburg: 'gauteng',
  Durban: 'kwazulu-natal',
  Pretoria: 'gauteng',
  Bloemfontein: 'free-state',
  Gqeberha: 'eastern-cape',
  Polokwane: 'limpopo',
  Mbombela: 'mpumalanga',
  Mahikeng: 'north-west',
};

const fallbackSuburbsByCity: Record<string, Array<{ name: string; slug: string }>> = {
  'Cape Town': [
    { name: 'Camps Bay', slug: 'camps-bay' },
    { name: 'Sea Point', slug: 'sea-point' },
    { name: 'Constantia', slug: 'constantia' },
    { name: 'Claremont', slug: 'claremont' },
    { name: 'Bellville', slug: 'bellville' },
  ],
  Johannesburg: [
    { name: 'Sandton', slug: 'sandton' },
    { name: 'Rosebank', slug: 'rosebank' },
    { name: 'Fourways', slug: 'fourways' },
    { name: 'Midrand', slug: 'midrand' },
    { name: 'Randburg', slug: 'randburg' },
  ],
  Durban: [
    { name: 'Umhlanga', slug: 'umhlanga' },
    { name: 'Durban North', slug: 'durban-north' },
    { name: 'Ballito', slug: 'ballito' },
    { name: 'Morningside', slug: 'morningside' },
    { name: 'La Lucia', slug: 'la-lucia' },
  ],
  Pretoria: [
    { name: 'Waterkloof', slug: 'waterkloof' },
    { name: 'Menlyn', slug: 'menlyn' },
    { name: 'Brooklyn', slug: 'brooklyn' },
    { name: 'Centurion', slug: 'centurion' },
    { name: 'Hatfield', slug: 'hatfield' },
  ],
  Bloemfontein: [
    { name: 'Westdene', slug: 'westdene' },
    { name: 'Langenhovenpark', slug: 'langenhovenpark' },
    { name: 'Bayswater', slug: 'bayswater' },
    { name: 'Dan Pienaar', slug: 'dan-pienaar' },
    { name: 'Pellissier', slug: 'pellissier' },
  ],
  Gqeberha: [
    { name: 'Summerstrand', slug: 'summerstrand' },
    { name: 'Walmer', slug: 'walmer' },
    { name: 'Mill Park', slug: 'mill-park' },
    { name: 'Newton Park', slug: 'newton-park' },
    { name: 'Humewood', slug: 'humewood' },
  ],
  Polokwane: [
    { name: 'Bendor', slug: 'bendor' },
    { name: 'Flora Park', slug: 'flora-park' },
    { name: 'Sterpark', slug: 'sterpark' },
    { name: 'Ivy Park', slug: 'ivy-park' },
    { name: 'Fauna Park', slug: 'fauna-park' },
  ],
  Mbombela: [
    { name: 'Sonheuwel', slug: 'sonheuwel' },
    { name: 'West Acres', slug: 'west-acres' },
    { name: 'Riverside Park', slug: 'riverside-park' },
    { name: 'White River', slug: 'white-river' },
    { name: 'Nelspruit Ext 2', slug: 'nelspruit-ext-2' },
  ],
  Mahikeng: [
    { name: 'Riviera Park', slug: 'riviera-park' },
    { name: 'Golf View', slug: 'golf-view' },
    { name: 'Signal Hill', slug: 'signal-hill' },
    { name: 'Imperial Reserve', slug: 'imperial-reserve' },
    { name: 'Mmabatho', slug: 'mmabatho' },
  ],
};

interface TopLocalitiesProps {
  title?: string;
  subtitle?: string;
  locationName?: string;
}

function toNumber(value: unknown): number {
  if (value == null) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function formatMoney(value: number): string {
  if (value <= 0) return '-';
  return `R ${Math.round(value).toLocaleString()}`;
}

function formatCount(value: number): string {
  if (value <= 0) return '-';
  return value.toLocaleString();
}

function getCitySlug(cityName: string): string {
  return cityName.toLowerCase().replace(/\s+/g, '-');
}

export function TopLocalities({
  title,
  subtitle,
  locationName = 'South Africa',
}: TopLocalitiesProps = {}) {
  const [selectedCity, setSelectedCity] = useState('Cape Town');

  const defaultTitle = `Top Suburbs in ${locationName}`;
  const defaultSubtitle = `Discover ${locationName}${locationName.endsWith('s') ? "'" : "'s"} top suburbs based on demand, listing activity, and market momentum.`;

  const displayTitle = title || defaultTitle;
  const displaySubtitle = subtitle || defaultSubtitle;

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

  const provinceSlug = cityProvinceMap[selectedCity];
  const citySlug = getCitySlug(selectedCity);

  const { data, isLoading } = trpc.locationPages.getCityData.useQuery(
    {
      provinceSlug,
      citySlug,
    },
    {
      enabled: Boolean(provinceSlug && citySlug),
    },
  );

  const localities = useMemo(() => {
    const rows = ((data as any)?.topLocalities || []) as Array<any>;
    const live = rows.slice(0, 5).map(locality => {
      const avgSalePrice = toNumber(locality.avgSalePrice ?? locality.avgPrice);
      const avgRentalPrice = toNumber(locality.avgRentalPrice);
      const propertiesForSale = toNumber(locality.propertiesForSale);
      const propertiesForRent = toNumber(locality.propertiesForRent);

      return {
        id: toNumber(locality.id),
        name: String(locality.name || '-'),
        slug: locality.slug
          ? String(locality.slug)
          : String(locality.name || '')
              .toLowerCase()
              .replace(/\s+/g, '-'),
        avgSalePrice,
        avgRentalPrice,
        propertiesForSale,
        propertiesForRent,
      };
    });

    const seen = new Set(live.map(item => item.slug));
    const fallbacks = (fallbackSuburbsByCity[selectedCity] || [])
      .filter(item => !seen.has(item.slug))
      .slice(0, Math.max(0, 5 - live.length))
      .map((item, idx) => ({
        id: 0 - (idx + 1),
        name: item.name,
        slug: item.slug,
        avgSalePrice: 0,
        avgRentalPrice: 0,
        propertiesForSale: 0,
        propertiesForRent: 0,
      }));

    return [...live, ...fallbacks];
  }, [data, selectedCity]);
  const compactLocalities = localities.slice(0, 5);

  return (
    <div className="py-10 md:py-16">
      <div className="container">
        <div className="mb-6 md:mb-8">
          <h2 className="text-xl md:text-[26px] font-bold text-slate-900 mb-2">{displayTitle}</h2>
          <p className="text-muted-foreground text-xs md:text-sm max-w-2xl">{displaySubtitle}</p>
        </div>

        <div className="flex justify-start mb-6 md:mb-10 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="inline-flex flex-nowrap justify-start gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 h-auto">
            {cities.map(city => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`
                  rounded-lg px-4 py-2 text-sm font-semibold border border-transparent transition-all whitespace-nowrap
                  ${
                    selectedCity === city
                      ? 'bg-[#2774AE] text-white shadow-sm'
                      : 'bg-transparent text-slate-600 hover:text-[#2774AE] hover:bg-white'
                  }
                `}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-slate-100 bg-white p-6 text-sm text-slate-500">
            Loading localities...
          </div>
        ) : (
          <div className="relative group/carousel">
            <div className="overflow-hidden rounded-xl" ref={emblaRef}>
              <div className="flex gap-4 md:gap-6">
                {compactLocalities.map((locality, idx) => {
                  const localityUrl = `/${provinceSlug}/${citySlug}/${locality.slug}`;

                  return (
                    <div
                      key={locality.id || idx}
                      className="flex-[0_0_78%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_25%]"
                    >
                      <Card className="hover:shadow-xl transition-all duration-300 border-0 bg-white/50 backdrop-blur-sm group h-full">
                        <CardContent className="p-3.5 sm:p-4">
                          <Link href={localityUrl}>
                            <div className="flex items-center gap-3 mb-3 cursor-pointer">
                              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/20 group-hover:scale-110 transition-transform duration-300">
                                <MapPin className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-[1.05rem] mb-0.5 text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                  {locality.name}
                                </h3>
                                <div className="flex items-center gap-2 text-xs">
                                  <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded-md border border-yellow-100">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    <span className="font-bold text-yellow-700">-</span>
                                  </div>
                                  <span className="text-muted-foreground text-[10px]">Market pulse</span>
                                </div>
                              </div>
                            </div>
                          </Link>

                          <div className="grid grid-cols-2 gap-2 mb-3 p-2.5 bg-gray-50/80 rounded-lg border border-gray-100">
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide truncate">
                                Avg. Sale
                              </p>
                              <p className="font-bold text-sm text-gray-900 truncate">
                                {formatMoney(locality.avgSalePrice)}
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  /m2
                                </span>
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-0.5 font-medium uppercase tracking-wide truncate">
                                Avg. Rent
                              </p>
                              <p className="font-bold text-sm text-gray-900 truncate">
                                {formatMoney(locality.avgRentalPrice)}
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  /m2
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Link
                              href={`${localityUrl}?listingType=sale`}
                              className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all group/link"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-xs text-gray-900 group-hover/link:text-blue-600 transition-colors truncate">
                                  {formatCount(locality.propertiesForSale)} For Sale
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">in {locality.name}</p>
                              </div>
                              <div className="h-6 w-6 rounded-full bg-gray-50 flex items-center justify-center group-hover/link:bg-blue-50 transition-colors flex-shrink-0">
                                <ArrowRight className="h-3 w-3 text-gray-400 group-hover/link:text-blue-600 group-hover/link:translate-x-0.5 transition-all" />
                              </div>
                            </Link>
                            <Link
                              href={`${localityUrl}?listingType=rent`}
                              className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all group/link"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-xs text-gray-900 group-hover/link:text-blue-600 transition-colors truncate">
                                  {formatCount(locality.propertiesForRent)} For Rent
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">in {locality.name}</p>
                              </div>
                              <div className="h-6 w-6 rounded-full bg-gray-50 flex items-center justify-center group-hover/link:bg-blue-50 transition-colors flex-shrink-0">
                                <ArrowRight className="h-3 w-3 text-gray-400 group-hover/link:text-blue-600 group-hover/link:translate-x-0.5 transition-all" />
                              </div>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>

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
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white via-white/90 to-transparent md:hidden" />
          </div>
        )}

        <div className="mt-8 text-center md:text-left">
          <Link
            href={`/${provinceSlug}/${citySlug}`}
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium outline-none text-white rounded-md gap-2 h-12 px-8 bg-gradient-to-r from-[#2774AE] to-[#2D68C4] hover:from-[#2D68C4] hover:to-[#2774AE] shadow-lg hover:shadow-xl transition-all duration-300 group"
          >
            Explore All in {selectedCity}
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
