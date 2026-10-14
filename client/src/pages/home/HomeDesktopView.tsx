import { EnhancedHero } from '@/components/EnhancedHero';
import { DiscoverProperties } from '@/components/DiscoverProperties';
import { TopDevelopers } from '@/components/TopDevelopers';
import {
  ExploreCities,
  type CityGuideLocation,
  type CityGuideRequestState,
} from '@/components/ExploreCities';
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
  cityGuides: CityGuideLocation[];
  cityGuidesState: CityGuideRequestState;
  selectedProvince: string;
};

export function HomeDesktopView({
  activeHeroTab,
  heroTabValue,
  onBrowseProperties,
  onProvinceChange,
  onTabChange,
  cityGuides,
  cityGuidesState,
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
        <TopDevelopers selectedProvince={selectedProvince} onProvinceChange={onProvinceChange} />
        <ExploreCities
          customLocations={cityGuides}
          basePath=""
          withinContentRail
          guideCards
          initialLimit={12}
          requestState={cityGuidesState}
        />
        <HomeMarketInsightsSection />
        <HomeJourneySection />
        <ProfessionalEntrySection />
        <CTASection onBrowse={onBrowseProperties} />
      </ContentRail>
    </section>
  );
}
