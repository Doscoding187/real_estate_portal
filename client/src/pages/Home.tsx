import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { EnhancedHero } from '@/components/EnhancedHero';
import { ModernFooter } from '@/components/ModernFooter';
import { SimpleDevelopmentCard } from '@/components/SimpleDevelopmentCard';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { PropertyInsights } from '@/components/PropertyInsights';
import { DiscoverProperties } from '@/components/DiscoverProperties';
import { TopLocalities } from '@/components/TopLocalities';
import { TopDevelopers } from '@/components/TopDevelopers';
import { getPrimaryDevelopmentImageUrl } from '@/lib/mediaUtils';

console.log('Home.tsx loaded - timestamp: ' + Date.now());

import { ExploreCities } from '@/components/ExploreCities';
import { PropertyCategories } from '@/components/PropertyCategories';

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedProvince, setSelectedProvince] = useState('Gauteng');
  const [activeHeroTab, setActiveHeroTab] = useState('Buy');

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

  // --- Trending Now Logic ---

  const handleTabChange = (tab: string) => {
    if (tab === 'Agents') {
      setLocation('/agents'); // Or whatever the agents route is
      return;
    }
    setActiveHeroTab(tab);
  };

  const getTrendingFilters = (tab: string) => {
    switch (tab) {
      case 'Buy':
        return { transactionType: 'for_sale' as const, developmentType: 'residential' as const };
      case 'Rent':
      case 'Rental':
        return { transactionType: 'for_rent' as const, developmentType: 'residential' as const };
      case 'Developments':
        return {}; // All types
      case 'Shared Living':
        // Mapping 'Shared Living' to Residential Rentals for now as 'student' type doesn't exist yet
        return { transactionType: 'for_rent' as const, developmentType: 'residential' as const };
      case 'Plot & Land':
        return { transactionType: 'for_sale' as const, developmentType: 'land' as const };
      case 'Commercial':
        return { developmentType: 'commercial' as const }; // Sale or Rent
      default:
        return { transactionType: 'for_sale' as const, developmentType: 'residential' as const }; // Default to Buy
    }
  };

  // --- Single Source of Truth for Hero Copy ---
  const TAB_COPY: Record<string, { titleBase: string; subtitleBase: string }> = {
    buy: {
      titleBase: 'Trending Residential Properties for Sale',
      subtitleBase:
        'Discover the latest and most popular homes for sale across South Africa’s top locations.',
    },
    rent: {
      titleBase: 'Trending Residential Properties for Rent',
      subtitleBase:
        'Browse the newest and most in-demand rental homes and apartments available right now.',
    },
    developments: {
      titleBase: 'Trending Developments',
      subtitleBase:
        'Explore the newest residential, commercial, and mixed-use developments across South Africa.',
    },
    shared_living: {
      titleBase: 'Trending Student & Shared Living',
      subtitleBase:
        'Find modern student accommodation and shared living spaces in prime urban and campus locations.',
    },
    plot_land: {
      titleBase: 'Trending Plot & Land',
      subtitleBase:
        'View the latest plots and land opportunities ideal for building or investment projects.',
    },
    commercial: {
      titleBase: 'Trending Commercial Developments',
      subtitleBase:
        'Discover newly listed office, retail, and industrial developments in high-growth business areas.',
    },
  };

  // Helper to map activeHeroTab (Label) to TAB_COPY key
  const getTabKey = (tabLabel: string): string => {
    const t = tabLabel.toLowerCase();
    if (t === 'buy') return 'buy';
    if (t === 'rent' || t === 'rental') return 'rent';
    if (t === 'developments' || t === 'projects') return 'developments';
    if (t.includes('shared')) return 'shared_living';
    if (t.includes('plot')) return 'plot_land';
    if (t === 'commercial') return 'commercial';
    return 'buy';
  };

  const getHeroContent = (tab: string, province: string) => {
    const key = getTabKey(tab);
    const content = TAB_COPY[key] || TAB_COPY.buy;

    // Province Injection Logic: "${titleBase} in ${province}"
    // ONLY if province is selected.
    const title = province ? `${content.titleBase} in ${province}` : content.titleBase;

    return {
      title,
      subtitle: content.subtitleBase,
    };
  };

  const trendingFilters = getTrendingFilters(activeHeroTab);
  const heroContent = getHeroContent(activeHeroTab, selectedProvince);

  // Trending Data Query (Separate from province tabs)
  const { data: trendingData } = trpc.developer.getPublishedDevelopments.useQuery({
    ...trendingFilters,
    province: selectedProvince, // Apply province filter to trending too
    limit: 10,
    enableFallback: true, // Enable backend fallback logic
  });

  // Logging for Observability
  if (trendingData?.meta) {
    console.log('Trending Now Debug:', {
      tab: activeHeroTab,
      province: selectedProvince,
      primaryCount: trendingData.meta.primaryCount,
      usedFallback: trendingData.meta.usedFallback,
      fallbackLevel: trendingData.meta.fallbackLevel,
    });
  }

  const trendingDevelopments = trendingData?.developments || [];

  return (
    <div className="min-h-screen bg-background">
      <EnhancedNavbar />

      {/* Enhanced Hero Section */}
      <EnhancedHero activeTab={activeHeroTab} onTabChange={handleTabChange} />

      {/* Trending Now Section */}
      <section className="py-16 bg-slate-50/50">
        <div className="container mx-auto px-4">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-full px-3 py-1 mb-4">
              <span className="text-lg">🔥</span>
              <span className="text-sm font-semibold text-orange-600">Trending Now</span>
            </div>
            <h2 className="text-xl md:text-[26px] font-bold text-slate-900 mb-2">
              {heroContent.title}
            </h2>
            <p className="text-slate-600 max-w-2xl text-xs md:text-sm">{heroContent.subtitle}</p>
          </div>

          <div className="flex justify-start mb-10 overflow-x-auto pb-4 scrollbar-hide">
            <div className="inline-flex flex-nowrap justify-start gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-lg border border-slate-200/60 h-auto">
              {provinces.map(province => (
                <button
                  key={province}
                  onClick={() => setSelectedProvince(province)}
                  className={`
                    px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap
                    ${
                      selectedProvince === province
                        ? 'bg-gradient-to-r from-[#2774AE] to-[#2D68C4] text-white shadow-lg scale-105'
                        : 'text-slate-600 hover:text-[#2774AE] hover:bg-blue-50/50'
                    }
                  `}
                >
                  {province}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {trendingDevelopments.map(dev => (
              <SimpleDevelopmentCard
                key={dev.id}
                id={dev.id}
                title={dev.title || dev.name} // Handle potential title mismatch
                city={dev.city}
                suburb={dev.suburb}
                priceRange={{
                  min: dev.priceFrom,
                  max: dev.priceTo,
                }}
                image={getPrimaryDevelopmentImageUrl(dev.images) || ''}
                slug={dev.slug}
                isHotSelling={true}
                bedrooms={dev.bedrooms}
              />
            ))}
            {trendingDevelopments.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-lg border border-slate-100 border-dashed">
                No developments found.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Property Categories Section (Restored with Location Picker) */}
      <PropertyCategories />

      {/* Property Price Insights Section */}
      <PropertyInsights level="national" allowInPlaceDrilldown />

      {/* Discover More Properties Section */}
      <DiscoverProperties />

      {/* Top Localities Section */}
      <TopLocalities />

      {/* Top Developers Section (legacy mock data) */}
      <TopDevelopers />

      {/* Explore Cities Section */}
      <ExploreCities />

      {/* Testimonials Section */}
      <div className="py-12 md:py-20 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="container">
          <div className="text-left mb-8 md:mb-12">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 mb-3 sm:mb-4">
              <span className="text-xl sm:text-2xl">⭐</span>
              <span className="text-xs sm:text-sm font-semibold text-yellow-700">
                Trusted by Thousands
              </span>
            </div>
            <h2 className="text-xl md:text-[26px] font-bold text-slate-900 mb-2">
              What Our Clients Say
            </h2>
            <p className="text-slate-600 text-xs md:text-sm max-w-2xl leading-relaxed">
              Real experiences from people who found their dream homes
            </p>
          </div>

          <div className="flex overflow-x-auto gap-4 pb-4 snap-x scrollbar-hide -mx-4 px-4 md:grid md:grid-cols-3 md:gap-8 md:overflow-visible md:mx-0 md:px-0">
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
                className="flex-none w-[280px] sm:w-[320px] md:w-auto snap-center relative bg-white p-5 sm:p-6 md:p-8 rounded-xl md:rounded-2xl border border-slate-200/60 hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 group"
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
      <div className="py-12 md:py-20 bg-white">
        <div className="container">
          <div className="relative rounded-2xl md:rounded-[2rem] overflow-hidden bg-gradient-to-br from-[#2774AE] via-[#2D68C4] to-[#0F52BA] px-4 py-10 sm:px-6 sm:py-12 md:px-12 md:py-20 text-center shadow-2xl">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-48 md:w-96 h-48 md:h-96 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-48 md:w-96 h-48 md:h-96 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>

            <div className="relative z-10 max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-4 md:mb-6 text-white tracking-tight leading-tight">
                Ready to Find Your Dream Property?
              </h2>
              <p className="text-sm sm:text-base md:text-xl mb-6 md:mb-10 text-blue-50 leading-relaxed max-w-2xl mx-auto">
                Join thousands of satisfied users. Whether you're buying, renting, or selling.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                <Button
                  size="lg"
                  onClick={() => setLocation('/properties')}
                  className="bg-white text-[#2774AE] hover:bg-blue-50 font-bold text-sm sm:text-base md:text-lg px-6 sm:px-8 py-4 sm:py-6 h-auto shadow-2xl hover:shadow-3xl transition-all transform hover:-translate-y-1 hover:scale-105 w-full sm:w-auto"
                >
                  Browse All Properties
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-[#2774AE] font-bold text-sm sm:text-base md:text-lg px-6 sm:px-8 py-4 sm:py-6 h-auto transition-all hover:scale-105 w-full sm:w-auto"
                >
                  List Your Property
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Footer */}
      <ModernFooter />
    </div>
  );
}
