import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { EnhancedHero } from '@/components/EnhancedHero';
import { SimpleDevelopmentCard } from '@/components/SimpleDevelopmentCard';
import { Button } from '@/components/ui/button';
import {
  Building2,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PropertyInsights } from '@/components/PropertyInsights';
import { DiscoverProperties } from '@/components/DiscoverProperties';
import { TopLocalities } from '@/components/TopLocalities';
import { TopDevelopers } from '@/components/TopDevelopers';

import { ExploreCities } from '@/components/ExploreCities';
import { PropertyCategories } from '@/components/PropertyCategories';
import { Footer } from '@/components/Footer';

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedProvince, setSelectedProvince] = useState('Gauteng');

  const provinces = [
    'Gauteng',
    'Western Cape',
    'KwaZulu-Natal',
    'Eastern Cape',
    'Mpumalanga',
    'Limpopo',
    'North West',
    'Free State',
    'Northern Cape',
  ];

  // Only show top 5 popular provinces in hero for better UX
  const popularProvinces = provinces.slice(0, 5);

  const provinceNavItems = popularProvinces.map(p => ({
    label: p,
    path: `/${p.toLowerCase().replace(/\s+/g, '-')}`,
  }));

  // Helper to parse images
  const parseImages = (imagesVal: any): string[] => {
    if (!imagesVal) return [];

    let parsed = imagesVal;
    if (typeof imagesVal === 'string') {
      try {
        parsed = JSON.parse(imagesVal);
      } catch (e) {
        return [];
      }
    }

    if (Array.isArray(parsed)) {
      return parsed
        .map((img: any) => {
          if (typeof img === 'string') return img;
          if (typeof img === 'object' && img !== null && 'url' in img) return img.url;
          return '';
        })
        .filter(Boolean);
    }

    return [];
  };


  // Fetch real developments from database
  const { data: gautengDevelopments = [], isLoading: gautengLoading } =
    trpc.developer.getPublishedDevelopments.useQuery({
      province: 'Gauteng',
      limit: 10,
    });
  const { data: westernCapeDevelopments = [], isLoading: westernCapeLoading } =
    trpc.developer.getPublishedDevelopments.useQuery({
      province: 'Western Cape',
      limit: 10,
    });
  const { data: kznDevelopments = [], isLoading: kznLoading } =
    trpc.developer.getPublishedDevelopments.useQuery({
      province: 'KwaZulu-Natal',
      limit: 10,
    });

  // Group developments by province
  const developmentsByProvince: Record<string, any[]> = {
    Gauteng: gautengDevelopments,
    'Western Cape': westernCapeDevelopments,
    'KwaZulu-Natal': kznDevelopments,
    'Eastern Cape': [],
    Mpumalanga: [],
    Limpopo: [],
    'North West': [],
    'Free State': [],
    'Northern Cape': [],
  };

  return (
    <div className="min-h-screen bg-background">
      <EnhancedNavbar />

      {/* Enhanced Hero Section */}
      <EnhancedHero heroMode="province" navigationItems={provinceNavItems} />

      {/* Hot Selling Developments Section */}
      <div className="py-fluid-xl bg-gradient-to-b from-slate-50/50 to-white">
        <div className="container">
          <div className="text-left mb-12">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-full px-4 py-2 mb-4">
              <span className="text-2xl">🔥</span>
              <span className="text-sm font-semibold text-red-700">Trending Now</span>
            </div>
            <h2 className="font-bold mb-4 bg-gradient-to-r from-slate-900 via-[#2774AE] to-slate-900 bg-clip-text text-transparent">
              Hot Selling Residential Developments
            </h2>
            <p className="text-slate-600 max-w-3xl leading-relaxed">
              A handpicked collection of the country's most in-demand residential developments.
              These properties offer unmatched value in top cities with ideal locations, smart
              amenities, and trusted builders.
            </p>
          </div>

          <Tabs value={selectedProvince} onValueChange={setSelectedProvince} className="w-full">
            <div className="flex justify-start mb-10 overflow-x-auto pb-2 scrollbar-hide">
              <TabsList className="inline-flex flex-wrap justify-start gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-lg border border-slate-200/60 h-auto">
                {provinces.map(province => (
                  <TabsTrigger
                    key={province}
                    value={province}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 data-[state=inactive]:text-slate-600 data-[state=inactive]:hover:text-[#2774AE] data-[state=inactive]:hover:bg-blue-50/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#2774AE] data-[state=active]:to-[#2D68C4] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:scale-105"
                  >
                    {province}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {provinces.map(province => (
              <TabsContent key={province} value={province} className="mt-0 animate-slide-up">
                {developmentsByProvince[province] && developmentsByProvince[province].length > 0 ? (
                  /* Carousel Layout */
                  <div className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                    {developmentsByProvince[province].map(development => {
                      // Backend now returns explicit heroImage. Fallback to parsed images if needed (though backend clears images array now).
                      const images = parseImages(development.images);
                      const displayImage = development.heroImage || images[0] || '';

                      return (
                        <div key={development.id} className="flex-none w-[280px] sm:w-[300px] snap-center">
                          <SimpleDevelopmentCard
                            id={development.id}
                            title={development.name}
                            city={development.city}
                            suburb={development.suburb}
                            priceRange={{
                              min: development.priceFrom || 0,
                              max: development.priceTo || 0,
                            }}
                            image={displayImage}
                            slug={development.slug}
                            isHotSelling={development.isHotSelling}
                            isHighDemand={development.isHighDemand}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-left py-16 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl border-2 border-dashed border-slate-300">
                    <div className="p-4 bg-slate-100 rounded-full w-20 h-20 mb-4 flex items-center justify-center">
                      <Building2 className="h-10 w-10 text-slate-400" />
                    </div>
                    <p className="text-lg font-medium text-slate-700 mb-2">
                      No developments available
                    </p>
                    <p className="text-sm text-slate-500">
                      Check back soon for new listings in {province}
                    </p>
                  </div>
                )
                }
              </TabsContent>
            ))}
          </Tabs>

          <div className="text-left mt-10">
            <Button
              size="lg"
              onClick={() => {
                const provinceSlug = selectedProvince.toLowerCase().replace(/\s+/g, '-');
                setLocation(`/${provinceSlug}`);
              }}
              className="gap-2 h-12 px-8 bg-gradient-to-r from-[#2774AE] to-[#2D68C4] hover:from-[#2D68C4] hover:to-[#2774AE] shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              Explore All in {selectedProvince}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>

      {/* Property Categories Section (Restored with Location Picker) */}
      <PropertyCategories />

      {/* Property Price Insights Section */}
      <PropertyInsights />

      {/* Discover More Properties Section */}
      <DiscoverProperties />

      {/* Top Localities Section */}
      <TopLocalities />

      {/* Top Developers Section (legacy mock data) */}
      <TopDevelopers />

      {/* Explore Cities Section */}
      <ExploreCities />

      {/* Testimonials Section */}
      <div className="py-16 md:py-20 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="container">
          <div className="text-left mb-12">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-full px-4 py-2 mb-4">
              <span className="text-2xl">⭐</span>
              <span className="text-sm font-semibold text-yellow-700">Trusted by Thousands</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-slate-900 via-[#2774AE] to-slate-900 bg-clip-text text-transparent">
              What Our Clients Say
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl leading-relaxed">
              Real experiences from people who found their dream homes with us
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                name: 'Thabo Mkhize',
                location: 'Johannesburg',
                rating: 5,
                text: 'Found my perfect apartment in Sandton within 2 weeks. The team was professional and responsive throughout the process.',
                avatar: '👨🏿',
              },
              {
                name: 'Sarah van der Merwe',
                location: 'Cape Town',
                rating: 5,
                text: 'Excellent service! They helped me find a beautiful family home in Constantia. Highly recommend for anyone looking in the Western Cape.',
                avatar: '👩🏼',
              },
              {
                name: 'Priya Naidoo',
                location: 'Durban',
                rating: 5,
                text: 'The property insights and market data helped me make an informed decision. Great platform for first-time buyers!',
                avatar: '👩🏾',
              },
            ].map((testimonial, idx) => (
              <div
                key={idx}
                className="relative bg-white p-8 rounded-2xl border border-slate-200/60 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 group"
              >
                {/* Quote mark decoration */}
                <div className="absolute top-6 right-6 text-6xl text-[#2774AE]/10 group-hover:text-[#2774AE]/20 transition-colors font-serif leading-none">
                  "
                </div>

                <div className="relative">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-xl">
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-slate-700 mb-6 leading-relaxed text-base italic">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                    <div className="text-5xl">{testimonial.avatar}</div>
                    <div>
                      <p className="font-bold text-slate-900 text-base">{testimonial.name}</p>
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {testimonial.location}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 md:py-20 bg-white">
        <div className="container">
          <div className="relative rounded-3xl md:rounded-[2rem] overflow-hidden bg-gradient-to-br from-[#2774AE] via-[#2D68C4] to-[#0F52BA] px-6 py-16 md:px-12 md:py-20 text-center shadow-2xl">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>

            <div className="relative z-10 max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white tracking-tight leading-tight">
                Ready to Find Your Dream Property?
              </h2>
              <p className="text-lg md:text-xl mb-10 text-blue-50 leading-relaxed max-w-2xl mx-auto">
                Join thousands of satisfied users. Whether you're buying, renting, or selling, we
                provide the best tools and insights to make your journey smooth.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  size="lg"
                  onClick={() => setLocation('/properties')}
                  className="bg-white text-[#2774AE] hover:bg-blue-50 font-bold text-base md:text-lg px-8 py-6 h-auto shadow-2xl hover:shadow-3xl transition-all transform hover:-translate-y-1 hover:scale-105"
                >
                  Browse All Properties
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#2774AE] font-bold text-base md:text-lg px-8 py-6 h-auto transition-all hover:scale-105"
                >
                  List Your Property
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
