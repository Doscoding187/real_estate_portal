import { useState } from 'react';
import { useLocation } from 'wouter';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { EnhancedHero } from '@/components/EnhancedHero';
import { SimpleDevelopmentCard } from '@/components/SimpleDevelopmentCard';
import { ProspectTrigger } from '@/components/ProspectTrigger';
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
      },
      {
        id: '2',
        title: 'Rosebank Modern Living Estate',
        city: 'Rosebank, Johannesburg',
        priceRange: { min: 1800000, max: 3200000 },
        image: '/placeholders/development_placeholder_3_1763712078958.png',
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
      <div className="py-16 bg-white">
        <div className="container">
          <div className="mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Hot Selling Real Estate Developments in South Africa
            </h2>
            <p className="text-muted-foreground text-base max-w-3xl">
              A handpicked collection of the country's most in-demand residential developments.
              These properties offer unmatched value in top cities with ideal locations, smart amenities, and trusted builders.
            </p>
          </div>

          <Tabs value={selectedProvince} onValueChange={setSelectedProvince} className="w-full">
            <TabsList className="flex flex-wrap justify-start gap-2 mb-8 bg-transparent p-0 h-auto">
              {provinces.map(province => (
                <TabsTrigger
                  key={province}
                  value={province}
                  className="px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border bg-white text-muted-foreground border-gray-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:border-transparent data-[state=active]:shadow-md data-[state=active]:scale-105"
                >
                  {province}
                </TabsTrigger>
              ))}
            </TabsList>

            {provinces.map(province => (
              <TabsContent key={province} value={province} className="mt-6">
                {developmentsByProvince[province] && developmentsByProvince[province].length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {developmentsByProvince[province].map(development => (
                      <SimpleDevelopmentCard key={development.id} {...development} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-muted/30 rounded-lg">
                    <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg text-muted-foreground">
                      No developments available in {province} at the moment
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <div className="text-center mt-8">
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => {
                const provinceSlug = selectedProvince.toLowerCase().replace(/\s+/g, '-');
                setLocation(`/${provinceSlug}`);
              }}
              className="gap-2"
            >
              Explore {selectedProvince}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>


      {/* Categories Section - Simplified for SA Market */}
      <div className="py-16 bg-gradient-to-b from-white to-muted/20">
        <div className="container">
          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-center">
              Explore Property Categories
            </h2>
            <p className="text-muted-foreground text-base text-center max-w-2xl mx-auto">
              Find the perfect property type that suits your needs across South Africa
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { Icon: Building2, title: 'Apartments', count: '2,500+', url: '/properties?type=apartment', gradient: 'from-blue-500 to-indigo-500' },
              { Icon: HomeIcon, title: 'Houses', count: '3,200+', url: '/properties?type=house', gradient: 'from-indigo-500 to-purple-500' },
              { Icon: Building, title: 'Townhouses', count: '1,800+', url: '/properties?type=townhouse', gradient: 'from-purple-500 to-pink-500' },
              { Icon: Warehouse, title: 'Commercial', count: '950+', url: '/properties?type=commercial', gradient: 'from-pink-500 to-rose-500' },
              { Icon: MapPin, title: 'Land & Plots', count: '1,200+', url: '/properties?type=land', gradient: 'from-rose-500 to-orange-500' },
              { Icon: Tractor, title: 'Farms', count: '450+', url: '/properties?type=farm', gradient: 'from-orange-500 to-amber-500' },
            ].map((category, idx) => (
              <a
                key={idx}
                href={category.url}
                onClick={(e) => {
                  e.preventDefault();
                  setLocation(category.url);
                }}
                className="group relative flex flex-col items-center text-center p-6 rounded-2xl bg-white hover:bg-gradient-to-br hover:from-white hover:to-primary/5 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary/20 overflow-hidden"
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                {/* Icon with gradient background */}
                <div className={`relative mb-4 p-4 rounded-xl bg-gradient-to-br ${category.gradient} shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300`}>
                  <category.Icon className="h-7 w-7 text-white" />
                </div>
                
                {/* Text content */}
                <h3 className="relative text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {category.title}
                </h3>
                <p className="relative text-xs text-muted-foreground font-medium">
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
      <div className="py-16 bg-white">
        <div className="container">
          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-center">
              What Our Clients Say
            </h2>
            <p className="text-muted-foreground text-base text-center max-w-2xl mx-auto">
              Real experiences from people who found their dream homes with us
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                className="bg-muted/30 p-6 rounded-xl border border-border hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-2 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-500 text-xl">★</span>
                  ))}
                </div>
                <p className="text-foreground mb-6 leading-relaxed">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{testimonial.avatar}</div>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-white">
        <div className="container">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-16 md:px-16 md:py-20 text-center shadow-2xl">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl"></div>

            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white tracking-tight">
                Ready to Find Your Dream Property?
              </h2>
              <p className="text-xl mb-10 text-blue-100 leading-relaxed">
                Join thousands of satisfied users. Whether you're buying, renting, or selling, we
                provide the best tools and insights to make your journey smooth.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  size="lg"
                  onClick={() => setLocation('/properties')}
                  className="bg-white text-blue-600 hover:bg-blue-50 font-bold text-lg px-8 py-6 h-auto shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                >
                  Browse All Properties
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-2 border-white text-white hover:bg-white/10 font-bold text-lg px-8 py-6 h-auto transition-all"
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
