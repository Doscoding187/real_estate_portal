import { useState } from 'react';
import { useLocation } from 'wouter';
import { EnhancedHero } from '@/components/EnhancedHero';
import { PropertyInsights } from '@/components/PropertyInsights';
import { DiscoverProperties } from '@/components/DiscoverProperties';
import { TopLocalities } from '@/components/TopLocalities';
import { TopDevelopers } from '@/components/TopDevelopers';
import { ExploreCities } from '@/components/ExploreCities';
import { HomeLayout } from '@/layouts/HomeLayout';
import { ContentRail } from '@/components/layout/ContentRail';
import { HomeTrendingSection } from '@/sections/home/HomeTrendingSection';
import { TestimonialsSection } from '@/sections/home/TestimonialsSection';
import { CTASection } from '@/sections/home/CTASection';
import { normalizeHeroUiTab, toEnhancedHeroTabLabel, type HeroTab } from '@/types/hero';

export default function Home() {
  const [, setLocation] = useLocation();
  const [selectedProvince, setSelectedProvince] = useState('Gauteng');
  const [activeHeroTab, setActiveHeroTab] = useState<HeroTab>('buy');

  const provinces = [
    'Gauteng',
    'Western Cape',
    'KwaZulu-Natal',
    'Eastern Cape',
    'Mpumalanga',
    'Limpopo',
    'North West',
    'Free State',
    'Northern Cape',
  ];

  const handleTabChange = (tab: string) => {
    const normalizedTab = normalizeHeroUiTab(tab);
    if (normalizedTab === 'agents') {
      setLocation('/agents');
      return;
    }
    setActiveHeroTab(normalizedTab);
  };

  return (
    <HomeLayout>
      <EnhancedHero activeTab={toEnhancedHeroTabLabel(activeHeroTab)} onTabChange={handleTabChange} />
      <ContentRail>
        <HomeTrendingSection
          selectedProvince={selectedProvince}
          onProvinceChange={setSelectedProvince}
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
        <CTASection onBrowse={() => setLocation('/properties')} />
      </ContentRail>
    </HomeLayout>
  );
}
