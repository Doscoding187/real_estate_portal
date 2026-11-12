import { EnhancedHero } from '@/components/EnhancedHero';
import { DiscoverProperties } from '@/components/DiscoverProperties';
import { TopDevelopers } from '@/components/TopDevelopers';
import { ExploreCities } from '@/components/ExploreCities';
import { ContentRail } from '@/components/layout/ContentRail';
import { CTASection } from '@/sections/home/CTASection';
import { ProfessionalEntrySection } from '@/sections/home/ProfessionalEntrySection';
import { HomeJourneySection } from '@/sections/home/HomeJourneySection';
import { HomeTrendingSection } from '@/sections/home/HomeTrendingSection';
import type { HeroTab } from '@/types/hero';
import { HomeMarketInsightsSection } from '@/sections/home/HomeMarketInsightsSection';

type HomeDesktopViewProps = {
  activeHeroTab: HeroTab;
  selectedProvince: string;
  onProvinceChange: (province: string) => void;
  heroTabValue?: string;
  onBrowseProperties: () => void;
  onTabChange: (tab: string) => void;
};

export function HomeDesktopView({
  activeHeroTab,
  selectedProvince,
  onProvinceChange,
  heroTabValue,
  onBrowseProperties,
  onTabChange,
}: HomeDesktopViewProps) {
  return (
    <section data-home-viewport="desktop">
      <EnhancedHero activeTab={heroTabValue} onTabChange={onTabChange} />
      <ContentRail>
        <HomeTrendingSection
          selectedProvince={selectedProvince}
          onProvinceChange={onProvinceChange}
          activeHeroTab={activeHeroTab}
        />
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
