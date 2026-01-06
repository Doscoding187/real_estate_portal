
import React from 'react';
import { Helmet } from 'react-helmet';

import { useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Footer } from '@/components/Footer';
import { Breadcrumbs } from '@/components/search/Breadcrumbs';
import { unslugify } from '@/lib/urlUtils';

interface LocationPageLayoutProps {
  locationName: string;
  locationSlug: string;
  banner: React.ReactNode;
  searchStage: React.ReactNode;
  featuredProperties?: React.ReactNode;
  propertyTypeExplorer?: React.ReactNode;
  topLocalities?: any[]; // Keep existing for data passing if needed
  topLocalitiesShowcase?: React.ReactNode;
  propertyCategories?: React.ReactNode;
  highDemandDevelopments?: React.ReactNode;
  popularLocations?: React.ReactNode;
  recommendedAgents?: React.ReactNode;
  agencyShowcase?: React.ReactNode;
  developerShowcase?: React.ReactNode;
  investmentShowcase?: React.ReactNode;
  buyerCTA?: React.ReactNode;
  listingsFeed?: React.ReactNode;
  fullWidthSection?: React.ReactNode;
  sellerCTA?: React.ReactNode;
  seoContent?: React.ReactNode;
  exploreMore?: React.ReactNode;
}

export const LocationPageLayout: React.FC<LocationPageLayoutProps> = ({
  locationName,
  locationSlug,
  banner,
  searchStage,
  featuredProperties,
  propertyTypeExplorer,
  topLocalities,
  topLocalitiesShowcase,
  propertyCategories,
  highDemandDevelopments,
  popularLocations,
  recommendedAgents,
  agencyShowcase,
  developerShowcase,
  investmentShowcase,
  buyerCTA,
  listingsFeed,
  fullWidthSection,
  sellerCTA,
  seoContent,
  exploreMore,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 w-full pt-16">
      <Helmet>
        <title>{`Property for Sale in ${locationName} | Real Estate Portal`}</title>
        <meta 
          name="description" 
          content={`Find the best properties for sale in ${locationName}. Search apartments, houses, and new developments.`} 
        />
      </Helmet>

      <ListingNavbar />
      
      {/* Breadcrumbs Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-3">
            {(() => {
                const [location] = useLocation();
                const isRent = location.startsWith('/property-to-rent');
                const rootLabel = isRent ? 'For Rent' : 'For Sale';
                const rootPath = isRent ? '/property-to-rent' : '/property-for-sale';
                
                // Parse slugs from locationSlug prop (expected format: province/city/suburb or province/city or province)
                const parts = locationSlug.split('/').filter(Boolean);
                const items = [
                    { label: 'Home', href: '/' },
                    { label: rootLabel, href: rootPath }
                ];
                
                let currentPath = rootPath;
                parts.forEach((part, index) => {
                    currentPath += `/${part}`;
                    // Last item is current page, so href '#' or actual path
                    items.push({
                        label: unslugify(part),
                        href: currentPath
                    });
                });

                return <Breadcrumbs items={items} />;
            })()}
        </div>
      </div>

      {/* 2️⃣ Monetized Location Banner (Taller, Full Width) */}
      <section className="relative w-full z-10">
        {banner}
      </section>

      {/* 3️⃣ Search Stage (Overlapping) */}
      <section className="relative z-20 -mt-20 md:-mt-24 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pointer-events-none">
         {/* Inner container restores pointer events for the search card */}
        <div className="pointer-events-auto">
          {searchStage}
        </div>
      </section>

        {/* 4️⃣ Recent Searches (Optional - to be inserted here if needed) */}
      
      {/* Main Content Flow */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        
        {/* 5️⃣ Featured Top Projects */}
        {featuredProperties && (
          <section id="featured-projects" className="scroll-mt-24">
            {featuredProperties}
          </section>
        )}

        {/* 6️⃣ Property Type Explorer */}
        {propertyTypeExplorer && (
          <section id="property-types" className="scroll-mt-24">
            {propertyTypeExplorer}
          </section>
        )}

        {/* 6️⃣ Property Categories (Explore by Type) */}
        {propertyCategories && (
          <section id="property-categories" className="scroll-mt-24">
            {propertyCategories}
          </section>
        )}

        {/* 6.5️⃣ Trending Suburbs (Full Width Carousel) */}
        {fullWidthSection && (
          <section className="w-full scroll-mt-24">
            {fullWidthSection}
          </section>
        )}

        {/* 7️⃣ High Demand Developments (Projects) */}
        {highDemandDevelopments && (
          <section id="high-demand-developments" className="scroll-mt-24">
            {highDemandDevelopments}
          </section>
        )}

        {/* 7️⃣ Top Localities - Market Intelligence */}
        {topLocalitiesShowcase && (
            <section id="top-localities" className="scroll-mt-24">
                {topLocalitiesShowcase}
            </section>
        )}

        {/* 8️⃣ Popular Locations (moved up) */}
        {popularLocations && (
          <section id="popular-locations" className="scroll-mt-24">
            {popularLocations}
          </section>
        )}

        {/* 9️⃣ Recommended Agents */}
        {recommendedAgents && (
          <section id="agents" className="scroll-mt-24">
             {recommendedAgents}
          </section>
        )}

        {/* 9️⃣b Recommended Agencies */}
        {agencyShowcase && (
          <section id="agencies" className="scroll-mt-24">
             {agencyShowcase}
          </section>
        )}

        {/* 🔟 Developer Showcase */}
        {developerShowcase && (
          <section id="developers" className="scroll-mt-24">
            {developerShowcase}
          </section>
        )}

        {/* 1️⃣1️⃣ High Demand Projects (Investment) */}
        {investmentShowcase && (
          <section id="investment-projects" className="scroll-mt-24">
            {investmentShowcase}
          </section>
        )}

         {/* 1️⃣2️⃣ Buyer CTA */}
         {buyerCTA && (
          <section className="my-16">
            {buyerCTA}
          </section>
        )}

        {/* 1️⃣2️⃣ Listings Feed & Market Stats */}
        {listingsFeed && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-8">
              {listingsFeed}
            </div>
            <aside className="lg:col-span-4 space-y-8 hidden lg:block">
               {/* Sidebar content (Market stats, Ad units) can go here */}
               {seoContent}
            </aside>
          </div>
        )}
        
        {/* Mobile SEO Content (if needed below feed) */}
        <div className="lg:hidden">
             {seoContent}
        </div>

        {/* 1️⃣3️⃣ Explore More Section */}
        {exploreMore && (
          <section className="my-16">
            {exploreMore}
          </section>
        )}

        {/* 1️⃣4️⃣ Seller CTA */}
        {sellerCTA && (
          <section className="mt-20 mb-12">
            {sellerCTA}
          </section>
        )}

      </main>
      <Footer />
    </div>
  );
};
