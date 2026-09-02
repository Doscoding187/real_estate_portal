import { EnhancedHero } from '@/components/EnhancedHero';
import { DiscoverProperties } from '@/components/DiscoverProperties';
import { TopDevelopers } from '@/components/TopDevelopers';
import { ExploreCities } from '@/components/ExploreCities';
import { ContentRail } from '@/components/layout/ContentRail';
import { HomeTrendingSection } from '@/sections/home/HomeTrendingSection';
import { CTASection } from '@/sections/home/CTASection';
import { ProfessionalEntrySection } from '@/sections/home/ProfessionalEntrySection';
import { HomeJourneySection } from '@/sections/home/HomeJourneySection';
import { HomeMarketInsightsSection } from '@/sections/home/HomeMarketInsightsSection';
import type { HeroTab } from '@/types/hero';

type HomeDesktopViewProps = {
  activeHeroTab: HeroTab;
  heroTabValue?: string;
  onBrowseProperties: () => void;
  onProvinceChange: (province: string) => void;
  onTabChange: (tab: string) => void;
  popularCities: Array<{
    name: string;
    province: string;
    slug: string;
    provinceSlug: string;
    propertyCount: string;
  }>;
  selectedProvince: string;
};

export function HomeDesktopView({
  activeHeroTab,
  heroTabValue,
  onBrowseProperties,
  onProvinceChange,
  onTabChange,
  popularCities,
  selectedProvince,
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
        <TopDevelopers selectedProvince={selectedProvince} />
        <ExploreCities customLocations={popularCities} basePath="" withinContentRail />
        <HomeMarketInsightsSection />
        <HomeJourneySection />
        <ProfessionalEntrySection />
        <CTASection onBrowse={onBrowseProperties} />
      </ContentRail>
    </section>
  );
}
