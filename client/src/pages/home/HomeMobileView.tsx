import { EnhancedHero } from '@/components/EnhancedHero';
import { PropertyInsights } from '@/components/PropertyInsights';
import { DiscoverProperties } from '@/components/DiscoverProperties';
import { TopLocalities } from '@/components/TopLocalities';
import { TopDevelopers } from '@/components/TopDevelopers';
import { ExploreCities } from '@/components/ExploreCities';
import { ContentRail } from '@/components/layout/ContentRail';
import { HomeTrendingSection } from '@/sections/home/HomeTrendingSection';
import { TestimonialsSection } from '@/sections/home/TestimonialsSection';
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
  provinces: string[];
  selectedProvince: string;
};

export function HomeMobileView({
  activeHeroTab,
  heroTabValue,
  onBrowseProperties,
  onProvinceChange,
  onTabChange,
  popularCities,
  provinces,
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
        <PropertyInsights
          level="national"
          fallbackTabs={provinces.map((name, idx) => ({ id: idx + 1, name }))}
        />
        <DiscoverProperties />
        <TopLocalities />
        <TopDevelopers />
        <ExploreCities customLocations={popularCities} />
        <TestimonialsSection />
        <CTASection onBrowse={onBrowseProperties} />
      </ContentRail>
    </section>
  );
}
