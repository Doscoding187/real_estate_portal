import { EnhancedHero } from '@/components/EnhancedHero';
import { DiscoverProperties } from '@/components/DiscoverProperties';
import { TopDevelopers } from '@/components/TopDevelopers';
import { ExploreCities } from '@/components/ExploreCities';
import { ContentRail } from '@/components/layout/ContentRail';
import { CTASection } from '@/sections/home/CTASection';
import { ProfessionalEntrySection } from '@/sections/home/ProfessionalEntrySection';
import { HomeJourneySection } from '@/sections/home/HomeJourneySection';

type HomeDesktopViewProps = {
  heroTabValue?: string;
  onBrowseProperties: () => void;
  onTabChange: (tab: string) => void;
};

export function HomeDesktopView({
  heroTabValue,
  onBrowseProperties,
  onTabChange,
}: HomeDesktopViewProps) {
  return (
    <section data-home-viewport="desktop">
      <EnhancedHero activeTab={heroTabValue} onTabChange={onTabChange} />
      <ContentRail>
        <DiscoverProperties withinContentRail />
        <TopDevelopers />
        <ExploreCities withinContentRail />
        <HomeJourneySection />
        <ProfessionalEntrySection />
        <CTASection onBrowse={onBrowseProperties} />
      </ContentRail>
    </section>
  );
}
