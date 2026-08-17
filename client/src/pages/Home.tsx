import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { HomeLayout } from '@/layouts/HomeLayout';
import { normalizeHeroUiTab, type HeroTab } from '@/types/hero';
import {
  buildHomepageJourneyUrl,
  isHomepageHeroJourneyEnabled,
  normalizePublicHeroJourney,
  parseHomepageJourney,
} from '@/lib/publicNavigation';
import { MetaControl } from '@/components/seo/MetaControl';
import { HomeDesktopView } from '@/pages/home/HomeDesktopView';
import { HomeMobileView } from '@/pages/home/HomeMobileView';
import { useIsMobile } from '@/hooks/useMobile';
import { trpc } from '@/lib/trpc';
import { PageFrame } from '@/components/ui/page-frame';
import {
  buildOrganizationStructuredData,
  buildWebsiteStructuredData,
  toAbsoluteUrl,
} from '@/lib/seo/structuredData';
import { VITE_APP_LOGO } from '@/const';

export default function Home() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const isMobile = useIsMobile();
  const [selectedProvince, setSelectedProvince] = useState('Gauteng');
  const queryString = search;
  const rawIntent = new URLSearchParams(queryString).get('intent');
  const requestedJourney = normalizePublicHeroJourney(rawIntent);
  const hasCanonicalHomepageJourney =
    requestedJourney !== null &&
    rawIntent !== null &&
    rawIntent.trim().toLowerCase() === requestedJourney;
  const activeJourney = hasCanonicalHomepageJourney ? parseHomepageJourney(queryString) : undefined;

  useEffect(() => {
    if (rawIntent === null) return;

    if (requestedJourney === 'find_agent') {
      setLocation('/agents', { replace: true });
      return;
    }

    if (
      requestedJourney === null ||
      !isHomepageHeroJourneyEnabled(requestedJourney) ||
      rawIntent.trim().toLowerCase() !== requestedJourney
    ) {
      setLocation('/', { replace: true });
    }
  }, [rawIntent, requestedJourney, setLocation]);

  const effectiveHeroTab: HeroTab =
    activeJourney && isHomepageHeroJourneyEnabled(activeJourney)
      ? (activeJourney as HeroTab)
      : 'buy';
  const { data: popularCitiesData } = trpc.locationPages.getPopularCities.useQuery({
    limit: 12,
  });

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
    if (!normalizedTab) return;
    const nextLocation = buildHomepageJourneyUrl(normalizedTab);
    const currentLocation = `${window.location.pathname}${window.location.search}`;
    if (currentLocation === nextLocation) return;
    setLocation(nextLocation);
  };

  const heroTabValue =
    activeJourney && isHomepageHeroJourneyEnabled(activeJourney) ? effectiveHeroTab : '';
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
  const popularCities =
    popularCitiesData?.map(city => ({
      name: city.name,
      province: city.provinceName,
      slug: city.slug,
      provinceSlug: city.provinceSlug,
      propertyCount: `${city.listingCount.toLocaleString()} Properties`,
    })) ?? [];

  return (
    <HomeLayout>
      <MetaControl
        canonicalUrl={homeCanonicalUrl}
        title="Property Listify | South African Property Search and New Developments"
        description={homeDescription}
        image={toAbsoluteUrl(VITE_APP_LOGO)}
        structuredData={homeStructuredData}
      />
      <PageFrame contained={false}>
        {isMobile ? (
          <HomeMobileView
            activeHeroTab={effectiveHeroTab}
            heroTabValue={heroTabValue}
            onBrowseProperties={() => setLocation('/property-for-sale')}
            onProvinceChange={setSelectedProvince}
            onTabChange={handleTabChange}
            popularCities={popularCities}
            provinces={provinces}
            selectedProvince={selectedProvince}
          />
        ) : (
          <HomeDesktopView
            activeHeroTab={effectiveHeroTab}
            heroTabValue={heroTabValue}
            onBrowseProperties={() => setLocation('/property-for-sale')}
            onProvinceChange={setSelectedProvince}
            onTabChange={handleTabChange}
            popularCities={popularCities}
            provinces={provinces}
            selectedProvince={selectedProvince}
          />
        )}
      </PageFrame>
    </HomeLayout>
  );
}
