import { useState } from 'react';
import { useLocation } from 'wouter';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { EnhancedHero } from '@/components/EnhancedHero';
import { SimpleDevelopmentCard } from '@/components/SimpleDevelopmentCard';
import { Button } from '@/components/ui/button';
import { Building2, Home as HomeIcon, Building, Warehouse, MapPin, Tractor, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PropertyInsights } from '@/components/PropertyInsights';
import { DiscoverProperties } from '@/components/DiscoverProperties';
import { TopLocalities } from '@/components/TopLocalities';
import { TopDevelopers } from '@/components/TopDevelopers';
import { ExploreCities } from '@/components/ExploreCities';
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
  ];

  // Mock development data with placeholder images
  const developmentsByProvince: Record<string, any[]> = {
    'Gauteng': [
      {
        id: '1',
        title: 'Sandton Heights Luxury Apartments',
        city: 'Sandton, Johannesburg',
        priceRange: { min: 2500000, max: 5500000 },
        image: '/placeholders/development_placeholder_1_1763712033438.png',
        isHotSelling: true,
      },
      {
        id: '2',
        title: 'Rosebank Modern Living Estate',
        city: 'Rosebank, Johannesburg',
        priceRange: { min: 1800000, max: 3200000 },
        image: '/placeholders/development_placeholder_3_1763712078958.png',
        isHighDemand: true,
      },
      {
        id: '3',
        title: 'Waterkloof Ridge Townhouses',
        city: 'Waterkloof, Pretoria',
        priceRange: { min: 3200000, max: 4800000 },
        image: '/placeholders/development_placeholder_2_1763712057181.png',
      },
      {
        id: '4',
        title: 'Centurion Lake View Residences',
        city: 'Centurion, Pretoria',
        priceRange: { min: 1500000, max: 2800000 },
        image: '/placeholders/development_placeholder_4_1763712099609.png',
      },
    ],
    'Western Cape': [
      {
        id: '5',
        title: 'Camps Bay Ocean View Apartments',
        city: 'Camps Bay, Cape Town',
        priceRange: { min: 4500000, max: 8500000 },
        image: '/placeholders/development_placeholder_4_1763712099609.png',
        isHotSelling: true,
      },
      {
        id: '6',
        title: 'Sea Point Modern Residences',
        city: 'Sea Point, Cape Town',
        priceRange: { min: 2200000, max: 4200000 },
        image: '/placeholders/development_placeholder_2_1763712057181.png',
      },
      {
        id: '7',
        title: 'Stellenbosch Wine Estate Homes',
        city: 'Stellenbosch',
        priceRange: { min: 3500000, max: 6500000 },
        image: '/placeholders/development_placeholder_1_1763712033438.png',
        isHighDemand: true,
      },
      {
        id: '8',
        title: 'Century City Waterfront Living',
        city: 'Century City, Cape Town',
        priceRange: { min: 1900000, max: 3500000 },
        image: '/placeholders/development_placeholder_3_1763712078958.png',
      },
    ],
    'KwaZulu-Natal': [
      {
        id: '9',
        title: 'Umhlanga Beachfront Towers',
        city: 'Umhlanga, Durban',
        priceRange: { min: 2800000, max: 5200000 },
        image: '/placeholders/development_placeholder_4_1763712099609.png',
      },
      {
        id: '10',
        title: 'Ballito Coastal Estate',
        city: 'Ballito',
        priceRange: { min: 2100000, max: 4100000 },
        image: '/placeholders/development_placeholder_2_1763712057181.png',
      },
    ],
  };



  return (
    <div className="min-h-screen bg-background">
      <EnhancedNavbar />

      {/* Enhanced Hero Section */}
      <EnhancedHero />



      {/* Hot Selling Developments Section */}
      <div className="py-16 md:py-20 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-full px-4 py-2 mb-4">
              <span className="text-2xl">🔥</span>
              <span className="text-sm font-semibold text-red-700">Trending Now</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-slate-900 via-[#2774AE] to-slate-900 bg-clip-text text-transparent">
              Hot Selling Real Estate Developments
            </h2>
            <p className="text-slate-600 text-lg max-w-3xl mx-auto leading-relaxed">
              A handpicked collection of the country's most in-demand residential developments.
              These properties offer unmatched value in top cities with ideal locations, smart amenities, and trusted builders.
            </p>
          </div>

          <Tabs value={selectedProvince} onValueChange={setSelectedProvince} className="w-full">
            <div className="flex justify-center mb-10">
              <TabsList className="inline-flex flex-wrap justify-center gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-2xl shadow-lg border border-slate-200/60 h-auto">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {developmentsByProvince[province].map(development => (
                      <SimpleDevelopmentCard key={development.id} {...development} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl border-2 border-dashed border-slate-300">
                    <div className="p-4 bg-slate-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <Building2 className="h-10 w-10 text-slate-400" />
                    </div>
                    <p className="text-lg font-medium text-slate-700 mb-2">
                      No developments available
                    </p>
                    <p className="text-sm text-slate-500">
                      Check back soon for new listings in {province}
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <div className="text-center mt-10">
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

      {/* Categories Section - Simplified for SA Market */}
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
            {[
              { Icon: Building2, title: 'Apartments', count: '2,500+', url: '/properties?type=apartment', gradient: 'from-[#2774AE] to-[#2D68C4]' },
              { Icon: HomeIcon, title: 'Houses', count: '3,200+', url: '/properties?type=house', gradient: 'from-[#2D68C4] to-[#0F52BA]' },
              { Icon: Building, title: 'Townhouses', count: '1,800+', url: '/properties?type=townhouse', gradient: 'from-[#0F52BA] to-[#1560BD]' },
              { Icon: Warehouse, title: 'Commercial', count: '950+', url: '/properties?type=commercial', gradient: 'from-[#1560BD] to-[#2774AE]' },
              { Icon: MapPin, title: 'Land & Plots', count: '1,200+', url: '/properties?type=land', gradient: 'from-[#2774AE] to-[#2D68C4]' },
              { Icon: Tractor, title: 'Farms', count: '450+', url: '/properties?type=farm', gradient: 'from-[#2D68C4] to-[#0F52BA]' },
            ].map((category, idx) => (
              <a
                key={idx}
                href={category.url}
                onClick={(e) => {
                  e.preventDefault();
                  setLocation(category.url);
                }}
                className="group relative flex flex-col items-center text-center p-6 md:p-8 rounded-2xl bg-white hover:bg-gradient-to-br hover:from-white hover:to-blue-50/30 shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-200/60 hover:border-[#2774AE]/30 overflow-hidden hover:-translate-y-1"
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
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Property Price Insights Section */}
      <PropertyInsights />

      {/* Discover More Properties Section */}
      <DiscoverProperties />

      {/* Top Localities Section */}
      <TopLocalities />

      {/* Top Developers Section */}
      <TopDevelopers />

      {/* Explore Cities Section */}
      <ExploreCities />

      {/* Testimonials Section */}
      <div className="py-16 md:py-20 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-full px-4 py-2 mb-4">
              <span className="text-2xl">⭐</span>
              <span className="text-sm font-semibold text-yellow-700">Trusted by Thousands</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-slate-900 via-[#2774AE] to-slate-900 bg-clip-text text-transparent">
              What Our Clients Say
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto leading-relaxed">
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
                <div className="absolute top-6 right-6 text-6xl text-[#2774AE]/10 group-hover:text-[#2774AE]/20 transition-colors font-serif leading-none">"</div>
                
                <div className="relative">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-xl">★</span>
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