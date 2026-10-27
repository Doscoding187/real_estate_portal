import { EnhancedHero } from '@/components/EnhancedHero';
import { DiscoverProperties } from '@/components/DiscoverProperties';
import { TopDevelopers } from '@/components/TopDevelopers';
import {
  ExploreCities,
  type CityGuideLocation,
  type CityGuideRequestState,
  type CityGuideProvinceSelection,
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
  cityGuideProvince: CityGuideProvinceSelection;
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
  cityGuideProvince,
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
        <TopDevelopers />
        <ExploreCities
          customLocations={cityGuides}
          basePath=""
          withinContentRail
          guideCards
          initialLimit={12}
          requestState={cityGuidesState}
          provinceSlug={cityGuideProvince.slug}
          selectedGuideProvince={cityGuideProvince.name}
          onGuideProvinceChange={cityGuideProvince.onChange}
          description={`Get to know the cities, neighbourhoods and local property opportunities in ${cityGuideProvince.name}.`}
        />
        <HomeMarketInsightsSection />
        <HomeJourneySection />
        <ProfessionalEntrySection />
        <CTASection onBrowse={onBrowseProperties} />
      </ContentRail>
    </section>
  );
}
