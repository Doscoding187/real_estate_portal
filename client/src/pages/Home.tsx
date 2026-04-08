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
import { normalizeHeroUiTab, type HeroTab } from '@/types/hero';
import { MetaControl } from '@/components/seo/MetaControl';
import {
  buildOrganizationStructuredData,
  buildWebsiteStructuredData,
  toAbsoluteUrl,
} from '@/lib/seo/structuredData';
import { VITE_APP_LOGO } from '@/const';

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

  const heroTabValue =
    activeHeroTab === 'buy'
      ? 'buy'
      : activeHeroTab === 'rent'
        ? 'rental'
        : activeHeroTab === 'developments'
          ? 'projects'
          : activeHeroTab === 'shared_living'
            ? 'pg'
            : activeHeroTab === 'plot_land'
              ? 'plot'
              : 'commercial';
  const homeCanonicalUrl = toAbsoluteUrl('/');
  const homeDescription =
    'Search South African property listings, explore new developments, compare areas, and connect with agents and developers on Property Listify.';
  const homeStructuredData = [
    buildOrganizationStructuredData({
      name: 'Property Listify',
      url: '/',
      logoUrl: VITE_APP_LOGO,
      description: homeDescription,
    }),
    buildWebsiteStructuredData({
      name: 'Property Listify',
      url: '/',
      description: homeDescription,
    }),
  ];

  return (
    <HomeLayout>
      <MetaControl
        canonicalUrl={homeCanonicalUrl}
        title="Property Listify | South African Property Search and New Developments"
        description={homeDescription}
        image={toAbsoluteUrl(VITE_APP_LOGO)}
        structuredData={homeStructuredData}
      />
      <EnhancedHero activeTab={heroTabValue} onTabChange={handleTabChange} />
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
