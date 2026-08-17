import { EnhancedHero } from '@/components/EnhancedHero';
import { DiscoverProperties } from '@/components/DiscoverProperties';
import { TopDevelopers } from '@/components/TopDevelopers';
import { ExploreCities } from '@/components/ExploreCities';
import { ContentRail } from '@/components/layout/ContentRail';
import { HomeTrendingSection } from '@/sections/home/HomeTrendingSection';
import { CTASection } from '@/sections/home/CTASection';
import type { HeroTab } from '@/types/hero';

type HomeMobileViewProps = {
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

export function HomeMobileView({
  activeHeroTab,
  heroTabValue,
  onBrowseProperties,
  onProvinceChange,
  onTabChange,
  popularCities,
  selectedProvince,
}: HomeMobileViewProps) {
  return (
    <section data-home-viewport="mobile">
      <EnhancedHero activeTab={heroTabValue} onTabChange={onTabChange} />
      <ContentRail>
        <HomeTrendingSection
          selectedProvince={selectedProvince}
          onProvinceChange={onProvinceChange}
          activeHeroTab={activeHeroTab}
        />
        <DiscoverProperties />
        <TopDevelopers />
        <ExploreCities customLocations={popularCities} />
        <CTASection onBrowse={onBrowseProperties} />
      </ContentRail>
    </section>
  );
}
