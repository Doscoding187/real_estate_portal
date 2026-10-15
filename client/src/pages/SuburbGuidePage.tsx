import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Building2, Home, KeyRound, MapPin, Search } from 'lucide-react';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Footer } from '@/components/Footer';
import { MetaControl } from '@/components/seo/MetaControl';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  LocationTrendingFeedSection,
  type FeedTab,
} from '@/components/location/LocationTrendingFeedSection';
import { SuburbLocalProfessionals } from '@/components/location/SuburbLocalProfessionals';
import { NearbyAmenitiesMap } from '@/components/location/NearbyAmenitiesMap';
import { SuburbMarketInsights } from '@/components/location/SuburbMarketInsights';
import { trpc } from '@/lib/trpc';
import { isHomepageHeroJourneyEnabled } from '@/lib/publicNavigation';
import {
  buildBuySearchUrl,
  buildDevelopmentsSearchUrl,
  buildPropertySearchUrl,
} from '@/lib/heroJourneySearch';
import { getCityGuideImage } from '@/lib/cityGuideImages';
import { toAbsoluteUrl } from '@/lib/seo/structuredData';
import { encodeCanonicalLocationId } from '@shared/locationAuthority';
import { getCityGuideContent } from '@shared/cityGuideContent';
import type { LocationNode } from '@/types/location';
import '@/styles/suburb-guide.css';

type SuburbGuidePageProps = {
  params: { province: string; city: string; suburb: string };
};

function displaySlug(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function SuburbGuidePage({ params }: SuburbGuidePageProps) {
  const provinceSlug = params.province.toLowerCase();
  const citySlug = params.city.toLowerCase();
  const suburbSlug = params.suburb.toLowerCase();
  const isSandton =
    provinceSlug === 'gauteng' && citySlug === 'johannesburg' && suburbSlug === 'sandton';
  const path = `/${provinceSlug}/${citySlug}/${suburbSlug}`;
  const [areaSearch, setAreaSearch] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const suburbQuery = trpc.locationPages.getSuburbData.useQuery(
    { provinceSlug, citySlug, suburbSlug, includeInventoryPreview: true },
    { retry: false, staleTime: 300000 },
  );
  const cityQuery = trpc.locationPages.getCityData.useQuery(
    { provinceSlug, citySlug, includeInventoryPreview: false },
    { retry: false, staleTime: 300000 },
  );

  const suburb = suburbQuery.data?.suburb;
  const isCanonicalSuburb =
    suburb?.slug === suburbSlug &&
    suburb.citySlug === citySlug &&
    suburb.provinceSlug === provinceSlug;
  const verifiedSuburb = isCanonicalSuburb ? suburb : undefined;
  const stats = suburbQuery.data?.stats;
  const marketInsights = suburbQuery.data?.marketInsights;
  const otherAreas = useMemo(() => {
    const rows = (cityQuery.data as any)?.suburbs;
    if (!Array.isArray(rows)) return [];
    return rows.filter((area: any) => area.slug && area.slug !== suburbSlug);
  }, [cityQuery.data, suburbSlug]);
  const areaSearchTerm = areaSearch.trim();
  const isAreaSearchActive = areaSearchTerm.length >= 2;
  const areaSearchQuery = trpc.location.searchLocations.useQuery(
    {
      query: areaSearchTerm || citySlug,
      type: 'suburb',
      limit: 20,
    },
    {
      enabled: areaSearchTerm.length >= 2,
      retry: false,
      staleTime: 60000,
    },
  );
  const visibleAreas = useMemo(() => {
    const countById = new Map(otherAreas.map((area: any) => [Number(area.id), area.listingCount]));
    if (isAreaSearchActive) {
      const rows = areaSearchQuery.data;
      if (!Array.isArray(rows)) return [];
      return rows
        .filter(
          (area: any) =>
            area.type === 'suburb' &&
            Number(area.cityId) === Number(verifiedSuburb?.cityId) &&
            area.provinceSlug === provinceSlug &&
            area.citySlug === citySlug &&
            area.canonicalPath &&
            area.canonicalPath !== path,
        )
        .slice(0, 12)
        .map((area: any) => ({
          ...area,
          slug: area.suburbSlug || area.slug,
          guideHref: area.canonicalPath,
          listingCount: countById.get(Number(area.id)),
        }));
    }

    if (areaSearchTerm.length === 1) {
      const query = areaSearchTerm.toLocaleLowerCase();
      return otherAreas
        .filter((area: any) => area.name.toLocaleLowerCase().includes(query))
        .slice(0, 12);
    }
    return otherAreas.slice(0, 12);
  }, [
    areaSearchQuery.data,
    areaSearchTerm,
    citySlug,
    isAreaSearchActive,
    otherAreas,
    path,
    provinceSlug,
    verifiedSuburb,
  ]);
  const cityGuide = getCityGuideContent(provinceSlug, citySlug);
  const context = isSandton ? cityGuide?.regions.find(region => region.id === 'e') : undefined;
  const cityImage = getCityGuideImage(provinceSlug, citySlug);
  const suburbCenter = useMemo(() => {
    if (!verifiedSuburb?.latitude || !verifiedSuburb.longitude) return null;
    const latitude = Number(verifiedSuburb.latitude);
    const longitude = Number(verifiedSuburb.longitude);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }
    return [latitude, longitude] as [number, number];
  }, [verifiedSuburb]);

  const location = useMemo<LocationNode | undefined>(() => {
    if (!verifiedSuburb) return undefined;
    const canonicalLocationId = encodeCanonicalLocationId('suburb', verifiedSuburb.id);
    return {
      id: canonicalLocationId,
      canonicalLocationId,
      name: verifiedSuburb.name,
      type: 'suburb',
      slug: verifiedSuburb.slug,
      citySlug: verifiedSuburb.citySlug,
      provinceSlug: verifiedSuburb.provinceSlug,
      canonicalPath: path,
    };
  }, [path, verifiedSuburb]);

  const viewAllHref = useMemo<Partial<Record<FeedTab, string>>>(() => {
    if (!location) return {};
    return {
      buy: buildBuySearchUrl({ selectedLocations: [location] }),
      rent: buildPropertySearchUrl({ transactionType: 'to-rent', selectedLocations: [location] }),
      developments: buildDevelopmentsSearchUrl({ selectedLocations: [location] }),
    };
  }, [location]);

  const buyHref = viewAllHref.buy || '#suburb-inventory';
  const saleAndRentCount = Number(stats?.saleCount || 0) + Number(stats?.rentalCount || 0);
  const saleShare =
    saleAndRentCount > 0 ? (Number(stats?.saleCount || 0) / saleAndRentCount) * 100 : 0;
  const rentShare = saleAndRentCount > 0 ? 100 - saleShare : 0;
  const buyJourneyEnabled = isHomepageHeroJourneyEnabled('buy');
  const rentJourneyEnabled = isHomepageHeroJourneyEnabled('rent');
  const developmentsJourneyEnabled = isHomepageHeroJourneyEnabled('developments');
  const guideJourneyLinks = [
    ...(buyJourneyEnabled
      ? [{ id: 'for-sale', label: 'For sale', count: Number(stats?.saleCount || 0) }]
      : []),
    ...(rentJourneyEnabled
      ? [{ id: 'for-rent', label: 'Rentals', count: Number(stats?.rentalCount || 0) }]
      : []),
    ...(developmentsJourneyEnabled
      ? [{ id: 'new-developments', label: 'Developments' }]
      : []),
    { id: 'area-snapshot', label: 'Area snapshot' },
    { id: 'market-insights', label: 'Market insights' },
    ...(context ? [{ id: 'city-context', label: 'City context' }] : []),
    ...(suburbCenter ? [{ id: 'local-area', label: 'Local area' }] : []),
    { id: 'city-areas', label: 'Explore more areas' },
    { id: 'local-experts', label: 'Local agents' },
  ];

  const guideUrl = cityGuide
    ? `/${cityGuide.provinceSlug}/${cityGuide.slug}`
    : `/${provinceSlug}/${citySlug}`;
  const titleName = verifiedSuburb?.name || displaySlug(suburbSlug);
  const description = `Explore homes for sale, rentals and new developments in ${titleName}, ${verifiedSuburb?.cityName || displaySlug(citySlug)}.`;
  const localSources: Array<{ id: string; title: string; url: string }> =
    isSandton && cityGuide
      ? [
          {
            id: 'region-e',
            title: 'City of Johannesburg · Region E: Sandton and Alexandra',
            url: 'https://joburg.org.za/about_/regions/Pages/Region%20E%20-%20Sandton%2C%20Alexandra/region-e.aspx',
          },
        ]
      : [];

  if (suburbQuery.isLoading) {
    return (
      <SuburbGuideShell>
        <div
          className="suburb-guide-loading"
          role="status"
          aria-label={`Loading ${titleName} guide`}
        >
          <span className="suburb-guide-loading__hero" />
          <span className="suburb-guide-loading__line" />
          <span className="suburb-guide-loading__panel" />
        </div>
      </SuburbGuideShell>
    );
  }

  if (suburbQuery.isError || !verifiedSuburb) {
    return (
      <SuburbGuideShell>
        <main className="suburb-guide-state">
          <MapPin size={30} aria-hidden="true" />
          <h1>{suburbQuery.isError ? `Couldn't load ${titleName}` : 'Suburb guide unavailable'}</h1>
          <p>
            {suburbQuery.isError
              ? 'The suburb details could not be loaded. Try again in a moment.'
              : 'We could not verify this suburb under the selected city and province.'}
          </p>
          {suburbQuery.isError ? (
            <button type="button" onClick={() => void suburbQuery.refetch()}>
              Try again
            </button>
          ) : (
            <Link href={guideUrl}>
              Browse the city guide <ArrowRight size={15} aria-hidden="true" />
            </Link>
          )}
        </main>
      </SuburbGuideShell>
    );
  }

  return (
    <SuburbGuideShell>
      <MetaControl
        key="seo"
        title={`${titleName} property guide: homes, rentals & developments | Property Listify`}
        description={description}
        canonicalUrl={toAbsoluteUrl(path)}
        image={cityImage ? toAbsoluteUrl(cityImage.hero) : undefined}
        forceNoIndex={!isSandton || cityGuide?.status !== 'published'}
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'Place',
            name: titleName,
            url: toAbsoluteUrl(path),
            containedInPlace: {
              '@type': 'City',
              name: verifiedSuburb.cityName,
              url: toAbsoluteUrl(guideUrl),
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { name: 'Home', item: toAbsoluteUrl('/') },
              { name: verifiedSuburb.provinceName, item: toAbsoluteUrl(`/${provinceSlug}`) },
              { name: verifiedSuburb.cityName, item: toAbsoluteUrl(guideUrl) },
              { name: titleName, item: toAbsoluteUrl(path) },
            ].map((item, index) => ({ '@type': 'ListItem', position: index + 1, ...item })),
          },
        ]}
      />

      <div key="breadcrumbs" className="suburb-guide-breadcrumb-wrap">
        <nav className="suburb-guide-rail suburb-guide-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/${provinceSlug}`}>{verifiedSuburb.provinceName}</Link>
          <span aria-hidden="true">/</span>
          <Link href={guideUrl}>{verifiedSuburb.cityName}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{verifiedSuburb.name}</span>
        </nav>
      </div>

      <header key="hero" className="suburb-guide-hero">
        {cityImage && !imageFailed ? (
          <img
            src={cityImage.hero}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            style={{ objectPosition: cityImage.heroPosition }}
            onError={() => setImageFailed(true)}
          />
        ) : null}
        <div className="suburb-guide-hero__shade" />
        <div className="suburb-guide-rail suburb-guide-hero__content">
          <p className="suburb-guide-eyebrow">{verifiedSuburb.cityName} · Suburb guide</p>
          <h1>{verifiedSuburb.name}</h1>
          <p className="suburb-guide-hero__intro">
            Find homes to buy or rent, and explore new developments listed in this area.
          </p>
          <div className="suburb-guide-hero__scope" aria-label="Selected area">
            <span>
              <MapPin size={15} aria-hidden="true" /> {verifiedSuburb.name} only
            </span>
            <span>
              {verifiedSuburb.cityName}, {verifiedSuburb.provinceName}
            </span>
          </div>
          <a className="suburb-guide-hero__action" href="#suburb-inventory">
            Explore homes in {verifiedSuburb.name} <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </header>

      <nav className="suburb-guide-quick-nav" aria-label={`Explore ${verifiedSuburb.name}`}>
        <div className="suburb-guide-rail suburb-guide-quick-nav__inner">
          <span className="suburb-guide-quick-nav__label">Explore this area</span>
          {guideJourneyLinks.map(item => (
            <a key={item.id} href={`#${item.id}`}>
              {item.label}
              {'count' in item && typeof item.count === 'number' && item.count > 0 ? (
                <span>{item.count.toLocaleString('en-ZA')}</span>
              ) : null}
            </a>
          ))}
        </div>
      </nav>

      <main key="content" className="suburb-guide-main suburb-guide-rail">
        <section
          id="area-snapshot"
          className="suburb-guide-market"
          aria-labelledby="suburb-guide-market-title"
        >
          <div className="suburb-guide-market__heading">
            <div>
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">LOCAL MARKET SNAPSHOT</p>
              <h2 id="suburb-guide-market-title">What’s available in {verifiedSuburb.name}</h2>
              <p>Current Property Listify inventory for this exact area.</p>
            </div>
            <span className="suburb-guide-scope-note">
              <MapPin size={15} aria-hidden="true" /> {verifiedSuburb.name} only
            </span>
          </div>

          <div className="suburb-guide-market__body">
            <div className="suburb-guide-market__metrics">
              <div className="suburb-guide-market__metric suburb-guide-market__metric--total">
                <span className="suburb-guide-market__icon">
                  <Building2 size={18} aria-hidden="true" />
                </span>
                <span className="suburb-guide-market__label">Published listings</span>
                <strong>{Number(stats?.totalListings || 0).toLocaleString('en-ZA')}</strong>
              </div>
              <Link className="suburb-guide-market__metric" href={buyHref}>
                <span className="suburb-guide-market__icon">
                  <Home size={18} aria-hidden="true" />
                </span>
                <span className="suburb-guide-market__label">For sale</span>
                <strong>{Number(stats?.saleCount || 0).toLocaleString('en-ZA')}</strong>
                <span className="suburb-guide-market__link">
                  Browse homes <ArrowRight size={13} aria-hidden="true" />
                </span>
              </Link>
              <Link
                className="suburb-guide-market__metric"
                href={viewAllHref.rent || '#suburb-inventory'}
              >
                <span className="suburb-guide-market__icon">
                  <KeyRound size={18} aria-hidden="true" />
                </span>
                <span className="suburb-guide-market__label">To rent</span>
                <strong>{Number(stats?.rentalCount || 0).toLocaleString('en-ZA')}</strong>
                <span className="suburb-guide-market__link">
                  Browse rentals <ArrowRight size={13} aria-hidden="true" />
                </span>
              </Link>
            </div>

            <div
              className="suburb-guide-market__mix"
              aria-label="Published listing mix by transaction type"
            >
              <div className="suburb-guide-market__mix-heading">
                <span>Sale and rental availability</span>
                <span>{saleAndRentCount.toLocaleString('en-ZA')} listings</span>
              </div>
              {saleAndRentCount > 0 ? (
                <>
                  <div className="suburb-guide-market__bar" aria-hidden="true">
                    <span style={{ width: `${saleShare}%` }} />
                    <span style={{ width: `${rentShare}%` }} />
                  </div>
                  <div className="suburb-guide-market__legend">
                    <span>
                      <i className="suburb-guide-market__dot suburb-guide-market__dot--sale" />
                      For sale <b>{Math.round(saleShare)}%</b>
                    </span>
                    <span>
                      <i className="suburb-guide-market__dot suburb-guide-market__dot--rent" />
                      To rent <b>{Math.round(rentShare)}%</b>
                    </span>
                  </div>
                </>
              ) : (
                <p className="suburb-guide-market__empty">
                  No published listings are available in this area right now.
                </p>
              )}
              <p className="suburb-guide-market__fineprint">
                This is current published supply on Property Listify, not a measure of all homes or
                buyer demand in {verifiedSuburb.name}. Project pages are shown separately below.
              </p>
            </div>
          </div>
        </section>

        {marketInsights ? (
          <SuburbMarketInsights
            suburbName={verifiedSuburb.name}
            data={marketInsights}
            buyHref={viewAllHref.buy || '#for-sale'}
            rentHref={viewAllHref.rent || '#for-rent'}
          />
        ) : null}

        {buyJourneyEnabled ? (
          <div id="suburb-inventory">
            <LocationTrendingFeedSection
              sectionId="for-sale"
              locationName={verifiedSuburb.name}
              province={verifiedSuburb.provinceName}
              city={verifiedSuburb.cityName}
              suburb={verifiedSuburb.name}
              maxItems={8}
              activeTab="buy"
              neutralMode={false}
              visibleTabs={['buy']}
              viewAllHref={viewAllHref}
              standardizeDevelopmentUnitCards
              cardLayout="carousel"
              showTabs={false}
              sectionClassName="suburb-guide-feed-panel"
              headingEyebrow="FOR SALE · RECENTLY LISTED"
              headingTitle={`Homes for sale in ${verifiedSuburb.name}`}
              headingDescription="Browse available homes and off-plan units in this selected area."
            />
          </div>
        ) : null}

        {rentJourneyEnabled ? (
          <LocationTrendingFeedSection
            sectionId="for-rent"
            locationName={verifiedSuburb.name}
            province={verifiedSuburb.provinceName}
            city={verifiedSuburb.cityName}
            suburb={verifiedSuburb.name}
            maxItems={8}
            activeTab="rent"
            neutralMode={false}
            visibleTabs={['rent']}
            viewAllHref={viewAllHref}
            standardizeDevelopmentUnitCards
            cardLayout="carousel"
            showTabs={false}
            sectionClassName="suburb-guide-feed-panel"
            headingEyebrow="FOR RENT · RECENTLY LISTED"
            headingTitle={`Homes to rent in ${verifiedSuburb.name}`}
            headingDescription="Browse rentals and available rental units in this selected area."
          />
        ) : null}

        {developmentsJourneyEnabled ? (
          <LocationTrendingFeedSection
            sectionId="new-developments"
            locationName={verifiedSuburb.name}
            province={verifiedSuburb.provinceName}
            city={verifiedSuburb.cityName}
            suburb={verifiedSuburb.name}
            maxItems={8}
            activeTab="developments"
            neutralMode={false}
            visibleTabs={['developments']}
            viewAllHref={viewAllHref}
            cardLayout="carousel"
            requirePhotoReadyDevelopments
            showTabs={false}
            sectionClassName="suburb-guide-feed-panel suburb-guide-development-panel"
            headingEyebrow="PROJECTS IN THIS AREA"
            headingTitle={`New developments in ${verifiedSuburb.name}`}
            headingDescription="Browse projects separately from resale homes. Open a project to see its published unit offers—sale, rental or auction terms where available."
          />
        ) : null}

        {context ? (
          <section
            id="city-context"
            className="suburb-guide-context"
            aria-labelledby="suburb-guide-context-title"
          >
            <div className="suburb-guide-context__copy">
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">
                {verifiedSuburb.cityName} · {context.label}
              </p>
              <h2 id="suburb-guide-context-title">Where {verifiedSuburb.name} fits in the city</h2>
              <p>{context.text}</p>
              <p>{context.consider}</p>
              <p className="suburb-guide-context__scope">
                This regional context helps explain the wider city. Property results above stay
                scoped to {verifiedSuburb.name}; they do not silently include other suburbs in the
                region.
              </p>
              {localSources.map(source => (
                <a
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="suburb-guide-source"
                >
                  Source: {source.title.split(' · ')[0]} <ArrowRight size={13} aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {suburbCenter ? (
          <section
            id="local-area"
            className="suburb-guide-local-area"
            aria-labelledby="suburb-guide-local-area-title"
          >
            <div className="suburb-guide-section-heading">
              <div>
                <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">
                  LOCATION & EVERYDAY AMENITIES
                </p>
                <h2 id="suburb-guide-local-area-title">What’s around {verifiedSuburb.name}?</h2>
                <p>
                  Explore mapped schools, healthcare, shopping and transport around the suburb
                  centre.
                </p>
              </div>
              <span className="suburb-guide-local-area__scope">
                <MapPin size={15} aria-hidden="true" /> About 2 km from the area centre
              </span>
            </div>
            <p className="suburb-guide-local-area__note">
              Nearby places are measured from the suburb’s mapped centre and may sit outside its
              boundary. The map is for orientation; it does not show property addresses.
            </p>
            <NearbyAmenitiesMap
              center={suburbCenter}
              radius={2}
              mapHeight={370}
              showControls={false}
              className="suburb-guide-local-area__map"
            />
          </section>
        ) : null}

        <div id="local-experts">
          <SuburbLocalProfessionals
            suburbId={Number(verifiedSuburb.id)}
            suburbName={verifiedSuburb.name}
          />
        </div>

        <section
          id="city-areas"
          className="suburb-guide-areas"
          aria-labelledby="suburb-guide-areas-title"
        >
          <div className="suburb-guide-section-heading">
            <div>
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">
                EXPLORE MORE AREAS
              </p>
              <h2 id="suburb-guide-areas-title">
                More suburbs to compare in {verifiedSuburb.cityName}
              </h2>
              <p>
                Open another suburb guide or search the verified city directory. Areas with more
                current published listings appear first when inventory is available.
              </p>
            </div>
            <Link className="suburb-guide-section-link" href={guideUrl}>
              Open city guide <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <div className="suburb-guide-area-search">
            <label htmlFor="suburb-guide-area-search">
              Find a suburb in {verifiedSuburb.cityName}
            </label>
            <div className="suburb-guide-area-search__input-wrap">
              <Search size={17} aria-hidden="true" />
              <input
                id="suburb-guide-area-search"
                type="search"
                value={areaSearch}
                onChange={event => setAreaSearch(event.target.value)}
                placeholder={`Search ${verifiedSuburb.cityName} suburbs`}
                autoComplete="off"
              />
              <span>Search full directory</span>
            </div>
          </div>

          {isAreaSearchActive && areaSearchQuery.isFetching ? (
            <div className="suburb-guide-area-search-status" role="status">
              Searching verified {verifiedSuburb.cityName} suburbs…
            </div>
          ) : isAreaSearchActive && areaSearchQuery.isError ? (
            <div className="suburb-guide-area-error" role="alert">
              <p>The suburb search could not be loaded.</p>
              <button type="button" onClick={() => void areaSearchQuery.refetch()}>
                Try again
              </button>
            </div>
          ) : !isAreaSearchActive && cityQuery.isLoading ? (
            <div
              className="suburb-guide-area-loading"
              role="status"
              aria-label={`Loading areas in ${verifiedSuburb.cityName}`}
            >
              {Array.from({ length: 4 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
          ) : !isAreaSearchActive && cityQuery.isError ? (
            <div className="suburb-guide-area-error" role="alert">
              <p>The city area directory could not be loaded.</p>
              <button type="button" onClick={() => void cityQuery.refetch()}>
                Try again
              </button>
            </div>
          ) : visibleAreas.length > 0 ? (
            <div className="suburb-guide-area-carousel group/suburb-areas">
              <Carousel
                className="w-full min-w-0"
                opts={{ align: 'start', loop: visibleAreas.length > 4 }}
              >
                <CarouselContent className="-ml-3 pb-2">
                  {visibleAreas.map((area: any) => (
                    <CarouselItem
                      key={area.id}
                      className="basis-[84%] pl-3 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                    >
                      <Link
                        className="suburb-guide-neighbour-card"
                        href={
                          area.guideHref ||
                          area.canonicalPath ||
                          `/${provinceSlug}/${citySlug}/${area.slug}`
                        }
                      >
                        <span className="suburb-guide-neighbour-card__icon">
                          <MapPin size={17} aria-hidden="true" />
                        </span>
                        <span className="suburb-guide-neighbour-card__name">{area.name}</span>
                        <span className="suburb-guide-neighbour-card__count">
                          {area.listingCount != null && Number.isFinite(Number(area.listingCount))
                            ? Number(area.listingCount) > 0
                              ? `${Number(area.listingCount).toLocaleString('en-ZA')} published ${Number(area.listingCount) === 1 ? 'listing' : 'listings'}`
                              : 'No eligible listings yet'
                            : 'Open verified suburb guide'}
                        </span>
                        {area.propertiesForSale != null || area.propertiesForRent != null ? (
                          <span className="suburb-guide-neighbour-card__mix">
                            {Number(area.propertiesForSale || 0).toLocaleString('en-ZA')} for sale
                            <span aria-hidden="true"> · </span>
                            {Number(area.propertiesForRent || 0).toLocaleString('en-ZA')} to rent
                          </span>
                        ) : null}
                        <span className="suburb-guide-neighbour-card__action">
                          Explore guide <ArrowRight size={14} aria-hidden="true" />
                        </span>
                      </Link>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {visibleAreas.length > 4 ? (
                  <>
                    <CarouselPrevious className="suburb-guide-carousel-arrow -left-3" />
                    <CarouselNext className="suburb-guide-carousel-arrow -right-3" />
                  </>
                ) : null}
              </Carousel>
            </div>
          ) : (
            <p className="suburb-guide-area-empty">
              {isAreaSearchActive || areaSearchTerm.length > 0
                ? `No suburb matches “${areaSearchTerm}” in the verified ${verifiedSuburb.cityName} directory.`
                : `No other verified suburb guides are listed under ${verifiedSuburb.cityName} yet.`}
            </p>
          )}
        </section>

      </main>
    </SuburbGuideShell>
  );
}

function SuburbGuideShell({ children }: { children: ReactNode }) {
  return (
    <div className="suburb-guide-page">
      <ListingNavbar neutralSearch />
      {children}
      <Footer />
    </div>
  );
}
