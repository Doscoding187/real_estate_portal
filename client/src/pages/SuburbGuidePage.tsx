import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearch } from 'wouter';
import { ArrowRight, Building2, Home, KeyRound, MapPin, Search } from 'lucide-react';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Footer } from '@/components/Footer';
import { MetaControl } from '@/components/seo/MetaControl';
import {
  LocationTrendingFeedSection,
  type FeedResolution,
  type FeedTab,
} from '@/components/location/LocationTrendingFeedSection';
import { SuburbLocalProfessionals } from '@/components/location/SuburbLocalProfessionals';
import { SuburbDevelopers } from '@/components/location/SuburbDevelopers';
import { SuburbAgencies } from '@/components/location/SuburbAgencies';
import { NearbyAmenitiesMap } from '@/components/location/NearbyAmenitiesMap';
import { SuburbMarketInsights } from '@/components/location/SuburbMarketInsights';
import { SuburbListingAlert } from '@/components/location/SuburbListingAlert';
import { trpc } from '@/lib/trpc';
import { formatZARCompact } from '@/lib/utils';
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
import {
  SUBURB_GUIDE_PILOT,
  isPublishedSuburbGuide,
  isSuburbGuidePilot,
  suburbGuideDescription,
  suburbGuideTitle,
} from '@shared/suburbGuidePolicy';
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

function compareCount(value: unknown): string {
  const count = Number(value);
  return Number.isFinite(count) ? count.toLocaleString('en-ZA') : '—';
}

function compareMedian(median: unknown, priced: unknown, minimumSample: unknown): string {
  const price = Number(median);
  if (Number.isFinite(price) && price > 0) return formatZARCompact(price);
  const pricedCount = Number(priced);
  const sample = Number(minimumSample);
  if (!Number.isFinite(pricedCount) || pricedCount <= 0) return '—';
  if (!Number.isFinite(sample) || sample <= 0) return '—';
  return `${pricedCount.toLocaleString('en-ZA')} of ${sample.toLocaleString('en-ZA')} priced`;
}

function readCoordinate(value: unknown, limit: number): number | null {
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate) || coordinate === 0) return null;
  if (coordinate < -limit || coordinate > limit) return null;
  return coordinate;
}

function distanceBetweenKm(
  origin: [number, number] | null,
  area: { latitude?: unknown; longitude?: unknown },
): number | null {
  if (!origin) return null;
  const latitude = readCoordinate(area?.latitude, 90);
  const longitude = readCoordinate(area?.longitude, 180);
  if (latitude === null || longitude === null) return null;
  const [originLatitude, originLongitude] = origin;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(latitude - originLatitude);
  const deltaLongitude = toRadians(longitude - originLongitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(originLatitude)) *
      Math.cos(toRadians(latitude)) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function compareDistance(distanceKm: number | null): string {
  if (distanceKm === null) return '—';
  return `${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm).toLocaleString('en-ZA')} km`;
}

export default function SuburbGuidePage({ params }: SuburbGuidePageProps) {
  const provinceSlug = params.province.toLowerCase();
  const citySlug = params.city.toLowerCase();
  const suburbSlug = params.suburb.toLowerCase();
  const isSandton = isSuburbGuidePilot(provinceSlug, citySlug, suburbSlug);
  const search = useSearch();
  const path = `/${provinceSlug}/${citySlug}/${suburbSlug}`;
  const [areaSearch, setAreaSearch] = useState('');
  const [areaSort, setAreaSort] = useState<'nearest' | 'supply'>('nearest');
  const [imageFailed, setImageFailed] = useState(false);
  const [feedResolutions, setFeedResolutions] = useState<Partial<Record<FeedTab, FeedResolution>>>(
    {},
  );

  const handleFeedResolution = useCallback((tab: FeedTab, resolution: FeedResolution) => {
    setFeedResolutions(previous =>
      previous[tab] === resolution ? previous : { ...previous, [tab]: resolution },
    );
  }, []);
  const suburbQuery = trpc.locationPages.getSuburbData.useQuery(
    { provinceSlug, citySlug, suburbSlug },
    { retry: false, staleTime: 300000 },
  );
  const cityQuery = trpc.locationPages.getCityData.useQuery(
    { provinceSlug, citySlug, includeInventoryPreview: false, suburbLimit: 100 },
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
  const suburbDevelopments = suburbQuery.data?.developments;
  const otherAreas = useMemo(() => {
    const rows = (cityQuery.data as any)?.suburbs;
    if (!Array.isArray(rows)) return [];
    return rows.filter((area: any) => area.slug && area.slug !== suburbSlug);
  }, [cityQuery.data, suburbSlug]);
  const comparisonSampleMinimum =
    Number(marketInsights?.minimumPriceSample || 0) ||
    Number((otherAreas[0] as any)?.minimumPriceSample || 0) ||
    0;
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
    return otherAreas;
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
  const context = isSandton
    ? cityGuide?.regions.find(region => region.id === SUBURB_GUIDE_PILOT.cityContextRegionId)
    : undefined;
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

  const areasWithDistance = useMemo(
    () =>
      visibleAreas.map((area: any) => ({
        area,
        distanceKm: distanceBetweenKm(suburbCenter, area),
      })),
    [suburbCenter, visibleAreas],
  );
  const canSortAreasByDistance = useMemo(
    () => Boolean(suburbCenter) || areasWithDistance.some(row => row.distanceKm !== null),
    [areasWithDistance, suburbCenter],
  );
  const sortedAreas = useMemo(() => {
    const rows = [...areasWithDistance];
    const effectiveSort = canSortAreasByDistance ? areaSort : 'supply';
    rows.sort((left, right) => {
      if (effectiveSort === 'nearest') {
        const leftDistance = left.distanceKm ?? Number.POSITIVE_INFINITY;
        const rightDistance = right.distanceKm ?? Number.POSITIVE_INFINITY;
        if (leftDistance !== rightDistance) return leftDistance - rightDistance;
      }
      return (
        Number(right.area.listingCount || 0) - Number(left.area.listingCount || 0) ||
        String(left.area.name || '').localeCompare(String(right.area.name || ''))
      );
    });
    return rows;
  }, [areaSort, areasWithDistance, canSortAreasByDistance]);
  const orderedByNearest =
    canSortAreasByDistance &&
    areaSort === 'nearest' &&
    areasWithDistance.some(row => row.distanceKm !== null);
  const visibleAreaCount = sortedAreas.length;

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

  const totalListings = Number(stats?.totalListings || 0);
  const hasRecordedListings = totalListings > 0;
  const citySearchHref = useMemo(() => {
    if (!verifiedSuburb) return `/${provinceSlug}/${citySlug}`;
    const cityLocation: LocationNode = {
      id: encodeCanonicalLocationId('city', Number(verifiedSuburb.cityId)),
      canonicalLocationId: encodeCanonicalLocationId('city', Number(verifiedSuburb.cityId)),
      name: verifiedSuburb.cityName,
      type: 'city',
      slug: verifiedSuburb.citySlug,
      provinceSlug: verifiedSuburb.provinceSlug,
    };
    return buildBuySearchUrl({ selectedLocations: [cityLocation] });
  }, [citySlug, provinceSlug, verifiedSuburb]);

  const buyHref = viewAllHref.buy || '#suburb-inventory';
  const saleAndRentCount = Number(stats?.saleCount || 0) + Number(stats?.rentalCount || 0);
  const saleShare =
    saleAndRentCount > 0 ? (Number(stats?.saleCount || 0) / saleAndRentCount) * 100 : 0;
  const rentShare = saleAndRentCount > 0 ? 100 - saleShare : 0;
  const buyJourneyEnabled = isHomepageHeroJourneyEnabled('buy');
  const rentJourneyEnabled = isHomepageHeroJourneyEnabled('rent');
  const developmentsJourneyEnabled = isHomepageHeroJourneyEnabled('developments');
  const enabledFeedTabs = useMemo<FeedTab[]>(() => {
    const tabs: FeedTab[] = [];
    if (buyJourneyEnabled) tabs.push('buy');
    if (rentJourneyEnabled) tabs.push('rent');
    if (developmentsJourneyEnabled) tabs.push('developments');
    return tabs;
  }, [buyJourneyEnabled, developmentsJourneyEnabled, rentJourneyEnabled]);
  const isRailVisible = useCallback(
    (tab: FeedTab) => feedResolutions[tab] !== 'empty',
    [feedResolutions],
  );
  const visibleFeedTabs = enabledFeedTabs.filter(isRailVisible);
  const showRailFallback =
    hasRecordedListings && enabledFeedTabs.length > 0 && visibleFeedTabs.length === 0;
  const showInventorySection = visibleFeedTabs.length > 0 || showRailFallback;
  const guideJourneyLinks = [
    ...(buyJourneyEnabled && isRailVisible('buy')
      ? [{ id: 'for-sale', label: 'For sale', count: Number(stats?.saleCount || 0) }]
      : []),
    ...(rentJourneyEnabled && isRailVisible('rent')
      ? [{ id: 'for-rent', label: 'Rentals', count: Number(stats?.rentalCount || 0) }]
      : []),
    ...(developmentsJourneyEnabled && isRailVisible('developments')
      ? [{ id: 'new-developments', label: 'Developments' }]
      : []),
    { id: 'area-snapshot', label: 'Area snapshot' },
    ...(hasRecordedListings ? [{ id: 'market-insights', label: 'Market insights' }] : []),
    ...(!hasRecordedListings ? [{ id: 'supply-guidance', label: 'Keep looking' }] : []),
    ...(context ? [{ id: 'city-context', label: 'City context' }] : []),
    ...(suburbCenter ? [{ id: 'local-area', label: 'Local area' }] : []),
    { id: 'guide-methodology', label: 'How this guide works' },
    { id: 'faqs', label: 'FAQs' },
    { id: 'developers', label: 'Developers' },
    { id: 'agencies', label: 'Agencies' },
    { id: 'local-experts', label: 'Local agents' },
    { id: 'city-areas', label: 'Explore more areas' },
    { id: 'plan-your-move', label: 'Plan your move' },
  ];

  const guideUrl = cityGuide
    ? `/${cityGuide.provinceSlug}/${cityGuide.slug}`
    : `/${provinceSlug}/${citySlug}`;
  const titleName = verifiedSuburb?.name || displaySlug(suburbSlug);
  const description = suburbGuideDescription(
    titleName,
    verifiedSuburb?.cityName || displaySlug(citySlug),
  );
  const localSources: Array<{ id: string; title: string; url: string }> =
    isSandton && cityGuide
      ? [
          {
            id: 'region-e',
            title: 'City of Johannesburg · Region E: Sandton and Alexandra',
            url:
              cityGuide.sources.find(source => source.id === 'region-e')?.url ||
              'https://joburg.org.za/about_/regions/Pages/Region%20E%20-%20Sandton%2C%20Alexandra/region-e.aspx',
          },
        ]
      : [];

  const faqs = useMemo(() => {
    if (!verifiedSuburb) return [];
    const name = verifiedSuburb.name;
    const city = verifiedSuburb.cityName;
    const province = verifiedSuburb.provinceName;
    const sale = marketInsights?.sale;
    const rent = marketInsights?.rent;
    const sample = Number(marketInsights?.minimumPriceSample || 0);
    const saleCount = Number(stats?.saleCount || 0);
    const rentCount = Number(stats?.rentalCount || 0);

    const saleCountAnswer =
      saleCount > 0
        ? `Property Listify currently publishes ${saleCount.toLocaleString('en-ZA')} eligible ${saleCount === 1 ? 'listing' : 'listings'} for sale in ${name}.`
        : `No eligible resale listings for sale are published for ${name} right now. New listings can appear at any time.`;
    const rentCountAnswer =
      rentCount > 0
        ? `Property Listify currently publishes ${rentCount.toLocaleString('en-ZA')} eligible ${rentCount === 1 ? 'listing' : 'listings'} to rent in ${name}.`
        : `No eligible rental listings are published for ${name} right now. New listings can appear at any time.`;

    const priceParts: string[] = [];
    if (sale?.medianPrice) {
      priceParts.push(
        `The median asking price for sale listings is ${formatZARCompact(sale.medianPrice)}, based on ${sale.pricedListingCount.toLocaleString('en-ZA')} priced listings.`,
      );
    } else if (sale && sale.pricedListingCount > 0) {
      priceParts.push(
        `A median sale asking price is shown once at least ${sample.toLocaleString('en-ZA')} sale listings carry a price; ${sale.pricedListingCount.toLocaleString('en-ZA')} are priced so far.`,
      );
    } else {
      priceParts.push('No sale listings with a published asking price are recorded right now.');
    }
    if (rent?.medianPrice) {
      priceParts.push(
        `The median monthly rent is ${formatZARCompact(rent.medianPrice)}, based on ${rent.pricedListingCount.toLocaleString('en-ZA')} priced rentals.`,
      );
    } else if (rent && rent.pricedListingCount > 0) {
      priceParts.push(
        `A median rent is shown once at least ${sample.toLocaleString('en-ZA')} rentals carry a price; ${rent.pricedListingCount.toLocaleString('en-ZA')} are priced so far.`,
      );
    }

    return [
      {
        question: `Where is ${name}?`,
        answer: `${name} is a suburb of ${city} in ${province}, South Africa. This guide covers homes for sale, rentals and new developments published for this exact suburb on Property Listify.`,
      },
      {
        question: `How many homes are for sale in ${name}?`,
        answer: saleCountAnswer,
      },
      {
        question: `How many homes are available to rent in ${name}?`,
        answer: rentCountAnswer,
      },
      {
        question: `What is the median asking price in ${name}?`,
        answer: priceParts.join(' '),
      },
      {
        question: `Does Property Listify list every property in ${name}?`,
        answer: `No. Counts and medians cover only eligible listings published on Property Listify at the snapshot time shown on this page. They are not a census of all homes in ${name} and do not measure buyer demand. Medians use published asking prices, never completed sale prices.`,
      },
      {
        question: `How do I get notified about new listings in ${name}?`,
        answer: `Use the listing alert on this page to save a weekly search for ${name}. You can choose email and in-app notifications, and manage saved searches from your dashboard.`,
      },
    ];
  }, [marketInsights, stats, verifiedSuburb]);

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
    // A live-data failure must not take the guide away. The editorial content below is
    // durable and needs no database, so a reader still gets the guide and is told plainly
    // which parts are unavailable. A suburb that genuinely is not in the catalogue is a
    // different thing and keeps the not-found state.
    return (
      <SuburbGuideShell>
        <MetaControl
          key="seo"
          title={suburbGuideTitle(titleName)}
          description={description}
          canonicalUrl={toAbsoluteUrl(path)}
          image={cityImage ? toAbsoluteUrl(cityImage.hero) : undefined}
          forceNoIndex={Boolean(search)}
        />
        <main className="suburb-guide-page__main">
          <section
            id="suburb-guide-context"
            className="suburb-guide-context"
            aria-labelledby="suburb-guide-context-title"
          >
            <div className="suburb-guide-context__copy">
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">
                {displaySlug(citySlug)} · {displaySlug(provinceSlug)}
              </p>
              <h1 id="suburb-guide-context-title">Explore {titleName}</h1>
              {context ? (
                <>
                  <h2>Where {titleName} fits in the city</h2>
                  <p>{context.text}</p>
                  <p>{context.consider}</p>
                </>
              ) : (
                <p>
                  {titleName} is a suburb of {displaySlug(citySlug)} in {displaySlug(provinceSlug)}.
                  The city guide explains how this area fits into the wider metro.
                </p>
              )}
            </div>
          </section>

          <section
            id="suburb-guide-methodology"
            className="suburb-guide-methodology"
            aria-labelledby="suburb-guide-methodology-title"
          >
            <div className="suburb-guide-section-heading">
              <div>
                <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">
                  HOW THIS GUIDE IS PUT TOGETHER
                </p>
                <h2 id="suburb-guide-methodology-title">Reading the {titleName} numbers</h2>
              </div>
            </div>
            <ul className="suburb-guide-methodology__list">
              <li>
                <strong>Scope.</strong> Counts and medians cover eligible listings published for
                this exact suburb on Property Listify. Project units and other suburbs are kept
                separate.
              </li>
              <li>
                <strong>Prices.</strong> Figures use published asking prices, never completed sale
                prices. A median appears only once enough listings in that group carry a price.
              </li>
              <li>
                <strong>Supply.</strong> Listing counts are a snapshot of current published
                inventory, not a census of all homes in {titleName}.
              </li>
            </ul>
          </section>

          <section className="suburb-guide-state" role="status">
            <MapPin size={30} aria-hidden="true" />
            <h2>Live availability for {titleName} is unavailable right now</h2>
            <p>
              Current listings, asking prices, nearby amenities and local professionals for{' '}
              {titleName} could not be loaded. The guide above is unaffected and still reads
              normally.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button type="button" onClick={() => void suburbQuery.refetch()}>
                Try again
              </button>
              <Link href={guideUrl}>
                Browse the city guide <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </section>

          {localSources.length ? (
            <section className="suburb-guide-sources" aria-labelledby="suburb-guide-sources-title">
              <h2 id="suburb-guide-sources-title">Sources</h2>
              <ul>
                {localSources.map(source => (
                  <li key={source.id}>
                    <a href={source.url} target="_blank" rel="noreferrer noopener">
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </main>
      </SuburbGuideShell>
    );
  }

  return (
    <SuburbGuideShell>
      <MetaControl
        key="seo"
        title={suburbGuideTitle(titleName)}
        description={description}
        canonicalUrl={toAbsoluteUrl(path)}
        image={cityImage ? toAbsoluteUrl(cityImage.hero) : undefined}
        forceNoIndex={
          !isPublishedSuburbGuide(provinceSlug, citySlug, suburbSlug) || Boolean(search)
        }
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'Place',
            name: titleName,
            url: toAbsoluteUrl(path),
            address: {
              '@type': 'PostalAddress',
              addressLocality: verifiedSuburb.cityName,
              addressRegion: verifiedSuburb.provinceName,
              addressCountry: 'ZA',
            },
            ...(suburbCenter
              ? {
                  geo: {
                    '@type': 'GeoCoordinates',
                    latitude: suburbCenter[0],
                    longitude: suburbCenter[1],
                  },
                }
              : {}),
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
          ...(faqs.length > 0
            ? [
                {
                  '@context': 'https://schema.org',
                  '@type': 'FAQPage',
                  mainEntity: faqs.map(faq => ({
                    '@type': 'Question',
                    name: faq.question,
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: faq.answer,
                    },
                  })),
                },
              ]
            : []),
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
          <div className="suburb-guide-hero__actions">
            <a
              className="suburb-guide-hero__action"
              href={hasRecordedListings ? '#suburb-inventory' : '#supply-guidance'}
            >
              {hasRecordedListings
                ? `Explore homes in ${verifiedSuburb.name}`
                : 'See where to look next'}{' '}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a
              className="suburb-guide-hero__action suburb-guide-hero__action--secondary"
              href="#city-areas"
            >
              Compare nearby areas
            </a>
          </div>
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
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">
                LOCAL MARKET SNAPSHOT
              </p>
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

        {!hasRecordedListings ? (
          <section
            id="supply-guidance"
            className="suburb-guide-guidance"
            aria-labelledby="suburb-guide-guidance-title"
          >
            <div className="suburb-guide-section-heading">
              <div>
                <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">
                  KEEP LOOKING · {verifiedSuburb.cityName.toUpperCase()}
                </p>
                <h2 id="suburb-guide-guidance-title">
                  No published resale listings in {verifiedSuburb.name} right now
                </h2>
                <p>
                  Property Listify currently records no eligible resale homes for sale or rent in{' '}
                  {verifiedSuburb.name}. Off-plan projects are listed separately below. Here is
                  where to go next:
                </p>
              </div>
            </div>
            <div className="suburb-guide-guidance__actions">
              <a className="suburb-guide-guidance__card" href="#city-areas">
                <span className="suburb-guide-guidance__icon">
                  <MapPin size={18} aria-hidden="true" />
                </span>
                <strong>Compare nearby areas</strong>
                <span>
                  Compare distance, current published supply and gated medians across the{' '}
                  {verifiedSuburb.cityName} directory.
                </span>
              </a>
              <Link className="suburb-guide-guidance__card" href={citySearchHref}>
                <span className="suburb-guide-guidance__icon">
                  <Search size={18} aria-hidden="true" />
                </span>
                <strong>Search all of {verifiedSuburb.cityName}</strong>
                <span>
                  Widen the area on the main search while keeping the same journey and filters.
                </span>
              </Link>
              <SuburbListingAlert
                suburbName={verifiedSuburb.name}
                suburbId={verifiedSuburb.id}
                suburbSlug={verifiedSuburb.slug}
                citySlug={verifiedSuburb.citySlug}
                provinceSlug={verifiedSuburb.provinceSlug}
              />
              <Link className="suburb-guide-guidance__card" href="/advertise/sell/agencies">
                <span className="suburb-guide-guidance__icon">
                  <Building2 size={18} aria-hidden="true" />
                </span>
                <strong>Selling or letting in {verifiedSuburb.name}?</strong>
                <span>Reach agencies and agents that work in your area.</span>
              </Link>
            </div>
            <p className="suburb-guide-guidance__note">
              These figures reflect current published supply on Property Listify, not a measure of
              all homes or buyer demand in {verifiedSuburb.name}.
            </p>
          </section>
        ) : null}

        {marketInsights && hasRecordedListings ? (
          <SuburbMarketInsights
            suburbName={verifiedSuburb.name}
            data={marketInsights}
            buyHref={viewAllHref.buy || '#for-sale'}
            rentHref={viewAllHref.rent || '#for-rent'}
          />
        ) : null}

        {showInventorySection ? (
          <div id="suburb-inventory" className="suburb-guide-inventory">
            {buyJourneyEnabled && isRailVisible('buy') ? (
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
                hideWhenEmpty
                onFeedResolutionChange={handleFeedResolution}
                sectionClassName="suburb-guide-feed-panel"
                headingEyebrow="FOR SALE · RECENTLY LISTED"
                headingTitle={`Homes for sale in ${verifiedSuburb.name}`}
                headingDescription="Browse available homes and off-plan units in this selected area."
              />
            ) : null}

            {rentJourneyEnabled && isRailVisible('rent') ? (
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
                hideWhenEmpty
                onFeedResolutionChange={handleFeedResolution}
                sectionClassName="suburb-guide-feed-panel"
                headingEyebrow="FOR RENT · RECENTLY LISTED"
                headingTitle={`Homes to rent in ${verifiedSuburb.name}`}
                headingDescription="Browse rentals and available rental units in this selected area."
              />
            ) : null}

            {developmentsJourneyEnabled && isRailVisible('developments') ? (
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
                hideWhenEmpty
                onFeedResolutionChange={handleFeedResolution}
                sectionClassName="suburb-guide-feed-panel suburb-guide-development-panel"
                headingEyebrow="PROJECTS IN THIS AREA"
                headingTitle={`New developments in ${verifiedSuburb.name}`}
                headingDescription="Browse projects separately from resale homes. Open a project to see its published unit offers—sale, rental or auction terms where available."
              />
            ) : null}

            {showRailFallback ? (
              <section
                className="suburb-guide-feeds-fallback"
                aria-labelledby="suburb-guide-feeds-fallback-title"
              >
                <h2 id="suburb-guide-feeds-fallback-title">
                  No listing cards to show in {verifiedSuburb.name} right now
                </h2>
                <p>
                  {totalListings.toLocaleString('en-ZA')} published{' '}
                  {totalListings === 1 ? 'listing is' : 'listings are'} recorded for this area, but
                  no displayable cards could be assembled right now. Open the full search to see
                  every eligible result.
                </p>
                <div className="suburb-guide-feeds-fallback__actions">
                  {viewAllHref.buy ? <Link href={viewAllHref.buy}>View all homes</Link> : null}
                  {viewAllHref.rent ? <Link href={viewAllHref.rent}>View all rentals</Link> : null}
                  {viewAllHref.developments ? (
                    <Link href={viewAllHref.developments}>View all developments</Link>
                  ) : null}
                </div>
              </section>
            ) : null}

            <SuburbListingAlert
              variant="inline"
              suburbName={verifiedSuburb.name}
              suburbId={verifiedSuburb.id}
              suburbSlug={verifiedSuburb.slug}
              citySlug={verifiedSuburb.citySlug}
              provinceSlug={verifiedSuburb.provinceSlug}
            />
          </div>
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
                  Explore mapped schools, healthcare, shopping, transport and leisure around the
                  suburb centre. Choose a 2, 5 or 10 km radius and filter the categories you care
                  about.
                </p>
              </div>
              <span className="suburb-guide-local-area__scope">
                <MapPin size={15} aria-hidden="true" /> Adjustable radius around the area centre
              </span>
            </div>
            <p className="suburb-guide-local-area__note">
              Nearby places are measured from the suburb’s mapped centre and may sit outside its
              boundary. Only established, highly rated places are listed. The map is for
              orientation; it does not show property addresses.
            </p>
            <NearbyAmenitiesMap
              center={suburbCenter}
              mapHeight={370}
              showControls={false}
              className="suburb-guide-local-area__map"
            />
          </section>
        ) : null}

        <section
          id="guide-methodology"
          className="suburb-guide-methodology"
          aria-labelledby="suburb-guide-methodology-title"
        >
          <div className="suburb-guide-section-heading">
            <div>
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">
                HOW THIS GUIDE IS PUT TOGETHER
              </p>
              <h2 id="suburb-guide-methodology-title">Reading the {verifiedSuburb.name} numbers</h2>
            </div>
          </div>
          <ul className="suburb-guide-methodology__list">
            <li>
              <strong>Scope.</strong> Counts and medians cover eligible listings published for this
              exact suburb on Property Listify. Project units and other suburbs are kept separate.
            </li>
            <li>
              <strong>Prices.</strong> Figures use published asking prices, never completed sale
              prices. A median appears only once at least{' '}
              {Number(marketInsights?.minimumPriceSample || 10).toLocaleString('en-ZA')} listings in
              that group carry a price.
            </li>
            <li>
              <strong>Supply.</strong> Listing counts are a snapshot of current published inventory
              at the date shown above, not a census of all homes in {verifiedSuburb.name}.
            </li>
            <li>
              <strong>Nearby places.</strong> Amenities come from Google Places, are filtered to
              established and highly rated education, healthcare, shopping, transport and leisure
              places, and are measured from the suburb centre.
            </li>
          </ul>
        </section>

        <section id="faqs" className="suburb-guide-faqs" aria-labelledby="suburb-guide-faqs-title">
          <div className="suburb-guide-section-heading">
            <div>
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">
                {verifiedSuburb.name.toUpperCase()} · COMMON QUESTIONS
              </p>
              <h2 id="suburb-guide-faqs-title">Frequently asked questions</h2>
              <p>
                Straight answers about {verifiedSuburb.name} supply, asking prices and how this
                guide is scoped.
              </p>
            </div>
          </div>
          <div className="suburb-guide-faqs__list">
            {faqs.map(faq => (
              <details key={faq.question} className="suburb-guide-faqs__item">
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <SuburbDevelopers
          suburbName={verifiedSuburb.name}
          cityName={verifiedSuburb.cityName}
          provinceName={verifiedSuburb.provinceName}
          developments={suburbDevelopments}
          viewAllDevelopmentsHref={viewAllHref.developments}
        />

        <SuburbAgencies suburbId={Number(verifiedSuburb.id)} suburbName={verifiedSuburb.name} />

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
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">EXPLORE MORE AREAS</p>
              <h2 id="suburb-guide-areas-title">
                More suburbs to compare in {verifiedSuburb.cityName}
              </h2>
              <p>
                Open another suburb guide or search the verified city directory. Nearer suburbs
                appear first by default; switch to current published supply when listing volume
                matters more.
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
          ) : visibleAreaCount > 0 ? (
            <>
              {canSortAreasByDistance ? (
                <div className="suburb-guide-area-sort" role="group" aria-label="Order suburbs">
                  <span>Order by</span>
                  <button
                    type="button"
                    aria-pressed={areaSort === 'nearest'}
                    onClick={() => setAreaSort('nearest')}
                  >
                    Nearest first
                  </button>
                  <button
                    type="button"
                    aria-pressed={areaSort === 'supply'}
                    onClick={() => setAreaSort('supply')}
                  >
                    Most listings
                  </button>
                </div>
              ) : null}
              <div className="suburb-guide-compare-wrap">
                <table className="suburb-guide-compare">
                  <caption className="sr-only">
                    Current published supply and sample-gated asking-price medians for{' '}
                    {verifiedSuburb.name} and other suburbs in {verifiedSuburb.cityName}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Suburb</th>
                      <th scope="col">Distance</th>
                      <th scope="col">For sale</th>
                      <th scope="col">To rent</th>
                      <th scope="col">Median sale</th>
                      <th scope="col">Median rent</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="suburb-guide-compare__row suburb-guide-compare__row--current">
                      <th scope="row">
                        <span className="suburb-guide-compare__name">{verifiedSuburb.name}</span>
                        <span className="suburb-guide-compare__badge">This guide</span>
                      </th>
                      <td>—</td>
                      <td>{compareCount(stats?.saleCount)}</td>
                      <td>{compareCount(stats?.rentalCount)}</td>
                      <td>
                        {compareMedian(
                          marketInsights?.sale.medianPrice,
                          marketInsights?.sale.pricedListingCount,
                          marketInsights?.minimumPriceSample,
                        )}
                      </td>
                      <td>
                        {compareMedian(
                          marketInsights?.rent.medianPrice,
                          marketInsights?.rent.pricedListingCount,
                          marketInsights?.minimumPriceSample,
                        )}
                      </td>
                    </tr>
                    {sortedAreas.map(({ area, distanceKm }) => (
                      <tr key={area.id} className="suburb-guide-compare__row">
                        <th scope="row">
                          <Link
                            className="suburb-guide-compare__link"
                            href={
                              area.guideHref ||
                              area.canonicalPath ||
                              `/${provinceSlug}/${citySlug}/${area.slug}`
                            }
                          >
                            {area.name}
                            <ArrowRight size={14} aria-hidden="true" />
                          </Link>
                        </th>
                        <td className="suburb-guide-compare__distance">
                          {compareDistance(distanceKm)}
                        </td>
                        <td>{compareCount(area.propertiesForSale)}</td>
                        <td>{compareCount(area.propertiesForRent)}</td>
                        <td>
                          {compareMedian(
                            area.medianSalePrice,
                            area.pricedListingsForSale,
                            area.minimumPriceSample,
                          )}
                        </td>
                        <td>
                          {compareMedian(
                            area.medianRentalPrice,
                            area.pricedListingsForRent,
                            area.minimumPriceSample,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="suburb-guide-compare__note">
                  Comparing {visibleAreaCount.toLocaleString('en-ZA')} other verified{' '}
                  {visibleAreaCount === 1 ? 'suburb' : 'suburbs'} in {verifiedSuburb.cityName},{' '}
                  {orderedByNearest
                    ? 'nearest to this guide first'
                    : 'ordered by current published supply'}
                  . Counts are current published supply on Property Listify. Medians use published
                  asking prices and appear once the priced sample reaches
                  {comparisonSampleMinimum > 0
                    ? ` ${comparisonSampleMinimum.toLocaleString('en-ZA')} listings`
                    : ' the required size'}
                  ; other cells show the priced sample recorded so far.
                </p>
              </div>
            </>
          ) : (
            <p className="suburb-guide-area-empty">
              {isAreaSearchActive || areaSearchTerm.length > 0
                ? `No suburb matches “${areaSearchTerm}” in the verified ${verifiedSuburb.cityName} directory.`
                : `No other verified suburb guides are listed under ${verifiedSuburb.cityName} yet.`}
            </p>
          )}
        </section>

        <section
          id="plan-your-move"
          className="suburb-guide-next-steps"
          aria-labelledby="suburb-guide-next-steps-title"
        >
          <div className="suburb-guide-section-heading">
            <div>
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">NEXT STEPS</p>
              <h2 id="suburb-guide-next-steps-title">Plan your move in {verifiedSuburb.name}</h2>
              <p>
                Check affordability, widen the search across {verifiedSuburb.cityName}, or read the
                city guide before you shortlist.
              </p>
            </div>
          </div>
          <div className="suburb-guide-next-steps__grid">
            <Link href="/tools/bond-calculator" className="suburb-guide-next-steps__card">
              <strong>Bond calculator</strong>
              <span>Estimate a monthly repayment before you shortlist.</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link href="/tools/affordability-calculator" className="suburb-guide-next-steps__card">
              <strong>Affordability calculator</strong>
              <span>Test buying power, deposit and monthly comfort.</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link href={citySearchHref} className="suburb-guide-next-steps__card">
              <strong>Search all of {verifiedSuburb.cityName}</strong>
              <span>Keep the same journey and widen the area.</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <Link href={guideUrl} className="suburb-guide-next-steps__card">
              <strong>{verifiedSuburb.cityName} city guide</strong>
              <span>Compare suburbs and regional context in one place.</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
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
