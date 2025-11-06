import { useState } from 'react';
import { useLocation } from 'wouter';
import { EnhancedNavbar } from '@/components/EnhancedNavbar';
import { EnhancedHero } from '@/components/EnhancedHero';
import PropertyCard from '@/components/PropertyCard';
import { ProspectTrigger } from '@/components/ProspectTrigger';
import { normalizePropertyForUI } from '@/lib/normalizers';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Building2, TrendingUp, Shield, Clock } from 'lucide-react';
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

  // Fetch properties by province
  const { data: properties, isLoading } = trpc.properties.search.useQuery({
    province: selectedProvince,
    limit: 8,
  });

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

  return (
    <div className="min-h-screen bg-background">
      <EnhancedNavbar />

      {/* Enhanced Hero Section */}
      <EnhancedHero />

      {/* Features Section */}
      <div className="py-16 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Building2,
                title: '10,000+ Properties',
                description: 'Wide range of verified listings',
              },
              {
                icon: TrendingUp,
                title: 'Best Prices',
                description: 'Competitive market rates',
              },
              {
                icon: Shield,
                title: 'Verified Listings',
                description: '100% authentic properties',
              },
              {
                icon: Clock,
                title: '24/7 Support',
                description: 'Always here to help you',
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                  <feature.icon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hot Selling Projects Section */}
      <div className="py-16 bg-white">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
              Hot Selling Real Estate Projects in South Africa
            </h2>
            <p className="text-muted-foreground text-lg">
              A handpicked collection of the country's most in-demand residential developments.
              These properties, from modern apartments to premium villas, offer unmatched value in
              top cities with ideal locations, smart amenities, and trusted builders.
            </p>
          </div>

          <Tabs value={selectedProvince} onValueChange={setSelectedProvince} className="w-full">
            <TabsList className="w-full justify-start flex-wrap h-auto gap-2 bg-transparent mb-6">
              {provinces.map(province => (
                <TabsTrigger
                  key={province}
                  value={province}
                  className="data-[state=active]:bg-primary data-[state=active]:text-white px-6 py-2 rounded-md"
                >
                  {province}
                </TabsTrigger>
              ))}
            </TabsList>

            {provinces.map(province => (
              <TabsContent key={province} value={province} className="mt-6">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-96 bg-muted animate-pulse rounded-lg"></div>
                    ))}
                  </div>
                ) : properties && properties.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {properties.slice(0, 4).map(property => {
                      const p = normalizePropertyForUI(property);
                      return p ? <PropertyCard key={p.id} {...p} /> : null;
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-muted/30 rounded-lg">
                    <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg text-muted-foreground">
                      No properties available in {province} at the moment
                    </p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <div className="text-center mt-8">
            <Button variant="outline" size="lg" onClick={() => setLocation('/properties')}>
              View All Properties
            </Button>
          </div>
        </div>
      </div>

      {/* Everything you Need at One Place Section */}
      <div className="py-16 bg-muted/30">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">Everything you Need at One Place</h2>

          <Tabs defaultValue="buyers" className="w-full">
            <TabsList className="w-full justify-start flex-wrap h-auto gap-2 bg-white mb-8 p-2">
              <TabsTrigger
                value="buyers"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md px-6 py-3 rounded-md font-medium"
              >
                For Buyers / Owners
              </TabsTrigger>
              <TabsTrigger
                value="tenants"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md px-6 py-3 rounded-md font-medium"
              >
                For Tenants
              </TabsTrigger>
              <TabsTrigger
                value="agents"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md px-6 py-3 rounded-md font-medium"
              >
                For Agents
              </TabsTrigger>
              <TabsTrigger
                value="builders"
                className="data-[state=active]:bg-white data-[state=active]:shadow-md px-6 py-3 rounded-md font-medium"
              >
                For Builders & Banks
              </TabsTrigger>
            </TabsList>

            {/* For Buyers / Owners */}
            <TabsContent value="buyers" className="mt-6">
              <div className="bg-white rounded-lg border p-8">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {[
                    { icon: '💰', title: 'Home Loan', url: '#' },
                    { icon: '🛋️', title: 'Home Interior Design', url: '#' },
                    { icon: '📊', title: 'Valuation', url: '#' },
                    { icon: '🧭', title: 'Vastu Calculator', url: '#' },
                    { icon: '🏠', title: 'Property Management', url: '#' },
                    { icon: '🏡', title: 'Sell or Rent Property', url: '#' },
                  ].map((service, idx) => (
                    <a
                      key={idx}
                      href={service.url}
                      className="flex flex-col items-center text-center p-4 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">
                        {service.icon}
                      </div>
                      <h3 className="text-sm font-medium text-foreground">{service.title}</h3>
                    </a>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* For Tenants */}
            <TabsContent value="tenants" className="mt-6">
              <div className="bg-white rounded-lg border p-8">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {[
                    { icon: '📝', title: 'Online Rent Agreement', url: '#' },
                    { icon: '🧾', title: 'Rent Receipts', url: '#' },
                    { icon: '🏠', title: 'Property Management', url: '#' },
                  ].map((service, idx) => (
                    <a
                      key={idx}
                      href={service.url}
                      className="flex flex-col items-center text-center p-6 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                        {service.icon}
                      </div>
                      <h3 className="text-sm font-medium text-foreground">{service.title}</h3>
                    </a>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* For Agents */}
            <TabsContent value="agents" className="mt-6">
              <div className="bg-white rounded-lg border p-8">
                <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                  {[
                    { icon: '💻', title: 'List Property With Us', url: '#' },
                    {
                      icon: '🏗️',
                      title: 'Co-Broking For New Projects',
                      url: '#',
                    },
                  ].map((service, idx) => (
                    <a
                      key={idx}
                      href={service.url}
                      className="flex flex-col items-center text-center p-6 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">
                        {service.icon}
                      </div>
                      <h3 className="text-sm font-medium text-foreground">{service.title}</h3>
                    </a>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* For Builders & Banks */}
            <TabsContent value="builders" className="mt-6">
              <div className="bg-white rounded-lg border p-8">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {[
                    { icon: '📢', title: 'Advertise With Us', url: '#' },
                    { icon: '🥽', title: '3D/AR/VR Services', url: '#' },
                    { icon: '🤖', title: 'Data Intelligence', url: '#' },
                    { icon: '🏦', title: 'Mortgage Partnerships', url: '#' },
                    { icon: '🦸', title: 'Super Agent Pro', url: '#' },
                  ].map((service, idx) => (
                    <a
                      key={idx}
                      href={service.url}
                      className="flex flex-col items-center text-center p-4 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">
                        {service.icon}
                      </div>
                      <h3 className="text-sm font-medium text-foreground">{service.title}</h3>
                    </a>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
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

      {/* CTA Section */}
      <div className="py-16 bg-primary text-white">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Find Your Dream Home?</h2>
          <p className="text-xl mb-8 text-white/90">
            Start your property search today and discover amazing opportunities
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setLocation('/properties')}
              className="font-semibold"
            >
              Browse All Properties
            </Button>
            <ProspectTrigger variant="button" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
