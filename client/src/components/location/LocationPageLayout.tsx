
import React from 'react';
import { Helmet } from 'react-helmet';

interface LocationPageLayoutProps {
  locationName: string;
  locationSlug: string;
  banner: React.ReactNode;
  searchStage: React.ReactNode;
  featuredProperties?: React.ReactNode;
  propertyTypeExplorer?: React.ReactNode;
  topLocalities?: any[]; // Keep existing for data passing if needed
  topLocalitiesShowcase?: React.ReactNode;
  highDemandDevelopments?: React.ReactNode;
  recommendedAgents?: React.ReactNode;
  agencyShowcase?: React.ReactNode;
  developerShowcase?: React.ReactNode;
  investmentShowcase?: React.ReactNode;
  buyerCTA?: React.ReactNode;
  listingsFeed?: React.ReactNode;
  sellerCTA?: React.ReactNode;
  seoContent?: React.ReactNode;
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
  highDemandDevelopments,
  recommendedAgents,
  agencyShowcase,
  developerShowcase,
  investmentShowcase,
  buyerCTA,
  listingsFeed,
  sellerCTA,
  seoContent,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 w-full">
      <Helmet>
        <title>{`Property for Sale in ${locationName} | Real Estate Portal`}</title>
        <meta 
          name="description" 
          content={`Find the best properties for sale in ${locationName}. Search apartments, houses, and new developments.`} 
        />
      </Helmet>

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

        {/* 7️⃣ Top Localities (Market Intelligence) */}
        {topLocalities && (
          <section id="market-intelligence" className="scroll-mt-24">
            {topLocalities}
          </section>
        )}

        {/* 6️⃣ Top Localities - NEW SECTION */}
        {topLocalitiesShowcase && (
            <section id="top-localities" className="scroll-mt-24">
                {topLocalitiesShowcase}
            </section>
        )}

        {/* 7️⃣ High Demand Developments (Projects) */}
        {highDemandDevelopments && (
          <section id="high-demand-developments" className="scroll-mt-24">
            {highDemandDevelopments}
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

        {/* 1️⃣3️⃣ Seller CTA */}
        {sellerCTA && (
          <section className="mt-20 mb-12">
            {sellerCTA}
          </section>
        )}

      </main>
    </div>
  );
};
