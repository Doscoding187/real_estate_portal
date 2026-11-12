import { EnhancedHero } from '@/components/EnhancedHero';
import { DiscoverProperties } from '@/components/DiscoverProperties';
import { TopDevelopers } from '@/components/TopDevelopers';
import { ExploreCities } from '@/components/ExploreCities';
import { ContentRail } from '@/components/layout/ContentRail';
import { CTASection } from '@/sections/home/CTASection';
import { ProfessionalEntrySection } from '@/sections/home/ProfessionalEntrySection';
import { HomeJourneySection } from '@/sections/home/HomeJourneySection';
import { HomeTrendingSection } from '@/sections/home/HomeTrendingSection';
import { HomeMarketInsightsSection } from '@/sections/home/HomeMarketInsightsSection';

type HomeMobileViewProps = {
  heroTabValue?: string;
  onBrowseProperties: () => void;
  onTabChange: (tab: string) => void;
};

export function HomeMobileView({
  heroTabValue,
  onBrowseProperties,
  onTabChange,
}: HomeMobileViewProps) {
  return (
    <section data-home-viewport="mobile">
      <EnhancedHero activeTab={heroTabValue} onTabChange={onTabChange} />
      <ContentRail>
        <HomeTrendingSection />
        <DiscoverProperties withinContentRail />
        <TopDevelopers />
        <ExploreCities withinContentRail />
        <HomeMarketInsightsSection />
        <HomeJourneySection />
        <ProfessionalEntrySection />
        <CTASection onBrowse={onBrowseProperties} />
      </ContentRail>
    </section>
  );
}
