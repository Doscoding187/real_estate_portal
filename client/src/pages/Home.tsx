import { useEffect } from 'react';
import { useHomeProvinceState } from '@/lib/useHomeProvince';
import { useLocation, useSearch } from 'wouter';
import { HomeSearchProvider } from '@/contexts/HomeSearchContext';
import { HomeLayout } from '@/layouts/HomeLayout';
import { normalizeHeroUiTab, type HeroTab } from '@/types/hero';
import {
  buildHomepageJourneyUrl,
  isHomepageHeroTabEnabled,
  normalizePublicHeroJourney,
  parseHomepageJourney,
} from '@/lib/publicNavigation';
import { MetaControl } from '@/components/seo/MetaControl';
import { HomeDesktopView } from '@/pages/home/HomeDesktopView';
import { HomeMobileView } from '@/pages/home/HomeMobileView';
import { useIsMobile } from '@/hooks/useMobile';
import { PageFrame } from '@/components/ui/page-frame';
import {
  buildOrganizationStructuredData,
  buildWebsiteStructuredData,
  toAbsoluteUrl,
} from '@/lib/seo/structuredData';
import { VITE_APP_LOGO } from '@/const';

/** Same image as the static og:image/twitter:image tags in client/index.html. */
const HOME_SHARE_IMAGE_PATH = '/og-image.png';

export default function Home() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const isMobile = useIsMobile();
  // One province for the whole page, remembered for the session.
  const [selectedProvince, setSelectedProvince] = useHomeProvinceState();
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
      !isHomepageHeroTabEnabled(requestedJourney) ||
      rawIntent.trim().toLowerCase() !== requestedJourney
    ) {
      setLocation('/', { replace: true });
    }
  }, [rawIntent, requestedJourney, setLocation]);

  const handleTabChange = (tab: string) => {
    const normalizedTab = normalizeHeroUiTab(tab);
    if (!normalizedTab) return;
    const nextLocation = buildHomepageJourneyUrl(normalizedTab);
    const currentLocation = `${window.location.pathname}${window.location.search}`;
    if (currentLocation === nextLocation) return;
    setLocation(nextLocation);
  };

  const effectiveHeroTab: HeroTab =
    activeJourney && isHomepageHeroTabEnabled(activeJourney) && activeJourney !== 'find_agent'
      ? (activeJourney as HeroTab)
      : 'buy';
  const heroTabValue =
    activeJourney && isHomepageHeroTabEnabled(activeJourney) ? activeJourney : '';
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
        image={toAbsoluteUrl(HOME_SHARE_IMAGE_PATH)}
        structuredData={homeStructuredData}
      />
      <HomeSearchProvider journey={heroTabValue} onJourneyChange={handleTabChange}>
        <PageFrame contained={false}>
          {isMobile ? (
            <HomeMobileView
              activeHeroTab={effectiveHeroTab}
              selectedProvince={selectedProvince}
              onProvinceChange={setSelectedProvince}
              heroTabValue={heroTabValue}
              onBrowseProperties={() => setLocation('/property-for-sale')}
              onTabChange={handleTabChange}
            />
          ) : (
            <HomeDesktopView
              activeHeroTab={effectiveHeroTab}
              selectedProvince={selectedProvince}
              onProvinceChange={setSelectedProvince}
              heroTabValue={heroTabValue}
              onBrowseProperties={() => setLocation('/property-for-sale')}
              onTabChange={handleTabChange}
            />
          )}
        </PageFrame>
      </HomeSearchProvider>
    </HomeLayout>
  );
}
