import { useState } from 'react';
import { useLocation } from 'wouter';
import { HomeLayout } from '@/layouts/HomeLayout';
import { normalizeHeroUiTab, type HeroTab } from '@/types/hero';
import { MetaControl } from '@/components/seo/MetaControl';
import { HomeDesktopView } from '@/pages/home/HomeDesktopView';
import { HomeMobileView } from '@/pages/home/HomeMobileView';
import { useIsMobile } from '@/hooks/useMobile';
import {
  buildOrganizationStructuredData,
  buildWebsiteStructuredData,
  toAbsoluteUrl,
} from '@/lib/seo/structuredData';
import { VITE_APP_LOGO } from '@/const';

export default function Home() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [selectedProvince, setSelectedProvince] = useState('Gauteng');
  const [activeHeroTab, setActiveHeroTab] = useState<HeroTab | null>(null);
  const effectiveHeroTab = activeHeroTab ?? 'buy';

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
    activeHeroTab === null
      ? undefined
      : activeHeroTab === 'buy'
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
      {isMobile ? (
        <HomeMobileView
          activeHeroTab={effectiveHeroTab}
          heroTabValue={heroTabValue}
          onBrowseProperties={() => setLocation('/properties')}
          onProvinceChange={setSelectedProvince}
          onTabChange={handleTabChange}
          provinces={provinces}
          selectedProvince={selectedProvince}
        />
      ) : (
        <HomeDesktopView
          activeHeroTab={effectiveHeroTab}
          heroTabValue={heroTabValue}
          onBrowseProperties={() => setLocation('/properties')}
          onProvinceChange={setSelectedProvince}
          onTabChange={handleTabChange}
          provinces={provinces}
          selectedProvince={selectedProvince}
        />
      )}
    </HomeLayout>
  );
}
