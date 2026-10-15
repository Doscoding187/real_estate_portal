import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Building2, Home, KeyRound, MapPin, Search } from 'lucide-react';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Footer } from '@/components/Footer';
import { MetaControl } from '@/components/seo/MetaControl';
import { SimpleHomeListingCard } from '@/components/SimpleHomeListingCard';
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
import { hasHomePropertyPhoto } from '@shared/homePropertyPhoto';
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
  const [activeTab, setActiveTab] = useState<FeedTab>('developments');
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
  const listedProperties = useMemo(() => {
    const rows = (suburbQuery.data as any)?.listings;
    if (!Array.isArray(rows)) return [];

    return rows
      .filter((property: any) => {
        const listingType = String(property?.listingType || property?.transactionType || '')
          .trim()
          .toLowerCase();
        return listingType === 'sale' && hasHomePropertyPhoto(getListingImage(property));
      })
      .slice(0, 10);
  }, [suburbQuery.data]);
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
  const availableSecondaryTabs: FeedTab[] = [
    ...(isHomepageHeroJourneyEnabled('developments') ? (['developments'] as const) : []),
    ...(isHomepageHeroJourneyEnabled('rent') ? (['rent'] as const) : []),
  ];
  const hasSecondaryPropertyJourneys = availableSecondaryTabs.length > 0;

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
            Browse property in {verifiedSuburb.name} <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </header>

      <main key="content" className="suburb-guide-main suburb-guide-rail">
        <section className="suburb-guide-market" aria-labelledby="suburb-guide-market-title">
          <div className="suburb-guide-market__heading">
            <div>
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">AREA PULSE</p>
              <h2 id="suburb-guide-market-title">What’s listed in {verifiedSuburb.name}</h2>
              <p>Published Property Listify inventory for this exact area.</p>
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
                <span>Current listing mix</span>
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
                Counts include eligible published property listings. Photo previews appear below;
                off-plan project pages are shown separately.
              </p>
            </div>
          </div>
        </section>

        <section
          id="suburb-inventory"
          className="suburb-guide-inventory"
          aria-label={`Live property in ${verifiedSuburb.name}`}
        >
          <div className="suburb-guide-section-heading">
            <div>
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">RECENTLY LISTED</p>
              <h2>Homes for sale in {verifiedSuburb.name}</h2>
              <p>
                Browse the latest photo-ready listings in this area, then open the full results.
              </p>
            </div>
            <Link className="suburb-guide-section-link" href={buyHref}>
              View all homes <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          {listedProperties.length > 0 ? (
            <div className="suburb-guide-card-rail group/suburb-recent">
              <Carousel
                className="w-full min-w-0"
                opts={{ align: 'start', loop: listedProperties.length > 4 }}
              >
                <CarouselContent className="-ml-4 pb-2">
                  {listedProperties.map((property: any) => {
                    const image = getListingImage(property);
                    return (
                      <CarouselItem
                        key={property.id}
                        className="basis-full pl-4 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                      >
                        <SimpleHomeListingCard
                          id={String(property.id)}
                          title={getListingTitle(property)}
                          city={String(property.city || verifiedSuburb.cityName)}
                          suburb={String(property.suburb || verifiedSuburb.name)}
                          image={image}
                          href={`/property/${property.id}`}
                          price={Number(property.price) || null}
                          bedrooms={Number(property.bedrooms) || null}
                          bathrooms={Number(property.bathrooms) || null}
                          area={Number(property.internalAreaM2 || property.area) || null}
                          yardSize={Number(property.erfSizeM2) || null}
                          propertyType={String(property.propertyType || '')}
                          listingType="sale"
                          badgeLabel="For sale"
                        />
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                {listedProperties.length > 4 ? (
                  <>
                    <CarouselPrevious className="suburb-guide-carousel-arrow -left-3" />
                    <CarouselNext className="suburb-guide-carousel-arrow -right-3" />
                  </>
                ) : null}
              </Carousel>
            </div>
          ) : (
            <div className="suburb-guide-empty-rail" role="status">
              <Home size={19} aria-hidden="true" />
              <p>
                No photo-ready homes for sale are available to preview in {verifiedSuburb.name}{' '}
                right now.
              </p>
              <Link href={buyHref}>
                Browse all sale listings <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          )}

          <p className="suburb-guide-inventory-note">
            The carousel shows the newest eligible sale listings that have property photos. Listing
            counts above include published inventory without photos too.
          </p>
        </section>

        {hasSecondaryPropertyJourneys ? (
          <section
            className="suburb-guide-more-inventory"
            aria-label={`More property options in ${verifiedSuburb.name}`}
          >
            <div className="suburb-guide-section-heading">
              <div>
                <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">MORE IN THIS AREA</p>
                <h2>New developments and rentals</h2>
                <p>
                  Explore published projects, their listed publishers and available opportunities in{' '}
                  {verifiedSuburb.name}.
                </p>
              </div>
            </div>
            <LocationTrendingFeedSection
              locationName={verifiedSuburb.name}
              province={verifiedSuburb.provinceName}
              city={verifiedSuburb.cityName}
              suburb={verifiedSuburb.name}
              maxItems={10}
              activeTab={
                availableSecondaryTabs.includes(activeTab) ? activeTab : availableSecondaryTabs[0]
              }
              onTabChange={setActiveTab}
              neutralMode={false}
              visibleTabs={availableSecondaryTabs}
              viewAllHref={viewAllHref}
              standardizeDevelopmentUnitCards
              cardLayout="carousel"
              requirePhotoReadyDevelopments
            />
            <p className="suburb-guide-inventory-note">
              Project cards show the available public project details and publisher when supplied.
              Off-plan units shown in property journeys use the same home-card format as resale
              listings; open a unit to see its development details.
            </p>
          </section>
        ) : null}

        <SuburbLocalProfessionals
          suburbId={Number(verifiedSuburb.id)}
          suburbName={verifiedSuburb.name}
        />

        <section className="suburb-guide-areas" aria-labelledby="suburb-guide-areas-title">
          <div className="suburb-guide-section-heading">
            <div>
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">
                EXPLORE THE WIDER CITY
              </p>
              <h2 id="suburb-guide-areas-title">Explore suburbs in {verifiedSuburb.cityName}</h2>
              <p>
                Compare other suburb guides in {verifiedSuburb.cityName}, or search the verified
                directory.
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

        {context ? (
          <section className="suburb-guide-context" aria-labelledby="suburb-guide-context-title">
            <div className="suburb-guide-context__copy">
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">
                {context
                  ? `${verifiedSuburb.cityName} · ${context.label}`
                  : `${verifiedSuburb.cityName} · AREA GUIDE`}
              </p>
              <h2 id="suburb-guide-context-title">
                {context
                  ? `${verifiedSuburb.name} in the wider city`
                  : `Explore ${verifiedSuburb.cityName}`}
              </h2>
              <p>
                {context?.text ||
                  `This guide keeps property results focused on ${verifiedSuburb.name}. Use the ${verifiedSuburb.cityName} guide to compare other areas before changing your search.`}
              </p>
              {context?.consider ? <p>{context.consider}</p> : null}
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
      </main>
    </SuburbGuideShell>
  );
}

function getListingImage(property: any): string | undefined {
  const images = Array.isArray(property?.images) ? property.images : [];
  const primary = images.find((image: any) => Number(image?.isPrimary) === 1) || images[0];
  const value =
    (typeof primary === 'string' ? primary : primary?.url || primary?.imageUrl) ||
    property?.mainImage;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getListingTitle(property: any): string {
  const title = String(property?.title || '').trim();
  if (title && title.toLowerCase() !== 'property listing') return title;
  const bedrooms = Number(property?.bedrooms || 0);
  const type = String(property?.propertyType || 'Property').replace(/_/g, ' ');
  return bedrooms > 0 ? `${bedrooms} bedroom ${type}` : type;
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
