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

type HomeDesktopViewProps = {
  activeHeroTab: HeroTab;
  heroTabValue: string;
  onBrowseProperties: () => void;
  onProvinceChange: (province: string) => void;
  onTabChange: (tab: string) => void;
  provinces: string[];
  selectedProvince: string;
};

export function HomeDesktopView({
  activeHeroTab,
  heroTabValue,
  onBrowseProperties,
  onProvinceChange,
  onTabChange,
  provinces,
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
        <PropertyInsights
          level="national"
          fallbackTabs={provinces.map((name, idx) => ({ id: idx + 1, name }))}
        />
        <DiscoverProperties />
        <TopLocalities />
        <TopDevelopers />
        <ExploreCities />
        <TestimonialsSection />
        <CTASection onBrowse={onBrowseProperties} />
      </ContentRail>
    </section>
  );
}
