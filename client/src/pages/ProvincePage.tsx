import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bell,
  ChevronDown,
  CircleHelp,
  Home,
  Info,
  KeyRound,
  MessageCircle,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Footer } from '@/components/Footer';
import { LocationSchema } from '@/components/location/LocationSchema';
import { RecommendedAgents } from '@/components/location/RecommendedAgents';
import { ProvincialBillboard } from '@/components/provincial/ProvincialBillboard';
import { ProvincialComposer } from '@/components/provincial/ProvincialComposer';
import { ProvinceGuideHero } from '@/components/provincial/ProvinceGuideHero';
import { ProvinceCityGuides } from '@/components/provincial/ProvinceCityGuides';
import { getProvinceGuideCover } from '@/lib/provinceGuideImages';
import { toAbsoluteUrl } from '@/lib/seo/structuredData';
import { trpc } from '@/lib/trpc';
import { buildTransactionalGeographyHref } from '@/lib/geographySearchHandoff';
import { isHomepageHeroJourneyEnabled } from '@/lib/publicNavigation';
import { buildCampaignSlugHierarchy } from '@shared/locationCampaigns';
import { getProvincialConfig } from '@shared/provincialDiscovery';
import '@/styles/provincial-discovery.css';

interface ProvincePageProps {
  params: { province: string };
}

function formatCount(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return Number(value).toLocaleString('en-ZA');
}

function formatPrice(value: number | null | undefined, listingType?: string | null) {
  if (!value || value <= 0) return 'Price on request';
  const formatted = new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value);
  return listingType === 'rent' ? `${formatted} / month` : formatted;
}

function journeyCountLabel(summary: { state: string; total: number | null } | undefined) {
  if (!summary || summary.state === 'unavailable') return 'Unavailable';
  if (summary.state === 'empty' || !summary.total) return 'No live listings yet';
  return formatCount(summary.total);
}

function inventoryStateLabel(state: string) {
  if (state === 'ready') return 'Live public inventory';
  if (state === 'sparse') return 'Small live sample';
  if (state === 'empty') return 'No live inventory yet';
  return 'Inventory unavailable';
}

function ProvinceLoadingState() {
  return (
    <div
      className="provincial-page provincial-page__skeleton"
      aria-busy="true"
      aria-label="Loading province discovery"
    >
      <ListingNavbar neutralSearch />
      <div className="provincial-page__skeleton-hero" />
      <div className="provincial-page__skeleton-body">
        <div className="provincial-page__skeleton-card" />
      </div>
    </div>
  );
}

function ProvinceErrorState({ provinceName }: { provinceName: string }) {
  return (
    <div className="provincial-page min-h-screen pt-16">
      <ListingNavbar neutralSearch />
      <main className="provincial-rail flex min-h-[55vh] items-center justify-center py-16">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <CircleHelp className="mx-auto mb-4 text-slate-400" size={34} aria-hidden="true" />
          <h1 className="text-2xl font-bold text-slate-900">
            {provinceName} is temporarily unavailable
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            We could not load the public discovery data for this province. Try again shortly or
            continue to the main search.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#005ca8] px-5 py-3 text-sm font-bold text-white"
          >
            Return to location discovery <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function ProvincePage({ params }: ProvincePageProps) {
  const provinceSlug = String(params.province || '')
    .trim()
    .toLowerCase();
  const config = getProvincialConfig(provinceSlug);
  const campaignHierarchy = buildCampaignSlugHierarchy(provinceSlug);
  const [, navigate] = useLocation();

  const { data, isLoading, error } = trpc.locationPages.getProvincialDiscoveryData.useQuery(
    { provinceSlug },
    { enabled: Boolean(config) },
  );
  const { data: heroCampaign } = trpc.locationPages.getHeroCampaign.useQuery(
    { locationSlug: provinceSlug, fallbacks: campaignHierarchy.slice(1) },
    { enabled: Boolean(config) },
  );
  const [citySearch, setCitySearch] = useState('');
  const [debouncedCitySearch, setDebouncedCitySearch] = useState('');
  useEffect(() => {
    setCitySearch('');
    setDebouncedCitySearch('');
  }, [provinceSlug]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedCitySearch(citySearch.trim()), 180);
    return () => window.clearTimeout(timer);
  }, [citySearch]);
  const citySearchQuery = trpc.locationPages.getCityGuides.useQuery(
    {
      provinceSlug,
      limit: 12,
      query: debouncedCitySearch.length >= 2 ? debouncedCitySearch : undefined,
    },
    {
      enabled: Boolean(config) && debouncedCitySearch.length >= 2,
      retry: false,
      staleTime: 10 * 60 * 1000,
    },
  );
  const cityGuidesQuery = trpc.locationPages.getCityGuides.useQuery(
    { provinceSlug, limit: 12 },
    { enabled: Boolean(config), retry: false, staleTime: 10 * 60 * 1000 },
  );

  if (!config) {
    return <ProvinceErrorState provinceName={provinceSlug.replace(/-/g, ' ')} />;
  }

  if (isLoading) return <ProvinceLoadingState />;
  if (error || !data) return <ProvinceErrorState provinceName={config.name} />;

  const heroImage = getProvinceGuideCover(provinceSlug)?.desktop;
  const guideCities = new Map<
    string,
    {
      id: number;
      canonicalLocationId: string;
      name: string;
      slug: string;
    }
  >(
    (cityGuidesQuery.data || [])
      .filter(city => city.provinceSlug === data.province.slug)
      .map(city => [city.slug, city]),
  );
  // Area-guide availability is independent of the inventory preview's city projection.
  const markets = data.markets.map(market => ({
    ...market,
    city: market.city || guideCities.get(market.slug),
  }));
  const marketLocations = markets
    .filter(market => Boolean(market.city?.canonicalLocationId))
    .map(market => ({
      name: market.city!.name,
      slug: market.city!.slug,
      canonicalLocationId: market.city!.canonicalLocationId,
    }));
  const provinceScope = data.province.canonicalLocationId
    ? ({
        kind: 'province',
        canonicalLocationId: data.province.canonicalLocationId,
      } as const)
    : undefined;
  const buyProvinceHref = provinceScope
    ? buildTransactionalGeographyHref({
        journey: 'buy',
        scope: provinceScope,
        context: { province: data.province.slug },
      })
    : undefined;
  const rentProvinceHref = provinceScope
    ? buildTransactionalGeographyHref({
        journey: 'rent',
        scope: provinceScope,
        context: { province: data.province.slug },
      })
    : undefined;
  const rentJourneyEnabled = isHomepageHeroJourneyEnabled('rent');
  const visibleInventoryItems = data.inventoryPreview.items.filter(
    item => rentJourneyEnabled || item.listingType !== 'rent',
  );

  return (
    <div className="provincial-page pt-16">
      <ListingNavbar neutralSearch />
      <LocationSchema
        type="Province"
        name={data.province.name}
        description={config.seo.summary}
        url={`/${data.province.slug}`}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Explore', url: '/' },
          { name: data.province.name, url: `/${data.province.slug}` },
        ]}
        stats={{ totalListings: data.inventoryPreview.total, avgPrice: 0 }}
        neutralMode
        image={heroImage ? toAbsoluteUrl(heroImage) : undefined}
        geo={
          data.province.latitude && data.province.longitude
            ? {
                latitude: Number(data.province.latitude),
                longitude: Number(data.province.longitude),
              }
            : undefined
        }
      />

      <div className="provincial-page__breadcrumbs">
        <nav className="provincial-rail provincial-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/">Explore</Link>
          <span aria-hidden="true">/</span>
          <span className="provincial-breadcrumbs__current" aria-current="page">
            {data.province.name}
          </span>
        </nav>
      </div>

      <ProvinceGuideHero provinceName={data.province.name} provinceSlug={provinceSlug} />

      <ProvincialComposer
        config={config}
        province={data.province}
        marketLocations={marketLocations}
      />

      {data.province.canonicalLocationId ? (
        <RecommendedAgents
          locationType="province"
          locationId={data.province.id}
          areaLabel={data.province.name}
        />
      ) : null}

      <main id="main-content" tabIndex={-1} className="provincial-main">
        <section
          className="provincial-section provincial-city-guides bg-white"
          aria-labelledby="markets-heading"
        >
          <div className="provincial-rail">
            <div className="provincial-section__heading">
              <div>
                <h2 id="markets-heading">Explore cities in {data.province.name}</h2>
                <p>
                  Get to know the neighbourhoods, local insights and property opportunities in our
                  city guides.
                </p>
              </div>
              <a href="#provincial-composer-title" className="provincial-section__link">
                Search this province <ArrowRight size={15} aria-hidden="true" />
              </a>
            </div>
            {cityGuidesQuery.isError && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-slate-800"
              >
                Some area guides could not be checked.
                <button
                  type="button"
                  disabled={cityGuidesQuery.isFetching}
                  className="ml-3 min-h-[44px] font-semibold text-[#005ca8] underline"
                  onClick={() => void cityGuidesQuery.refetch()}
                >
                  {cityGuidesQuery.isFetching ? 'Trying again…' : 'Try again'}
                </button>
              </div>
            )}
            <ProvinceCityGuides
              markets={markets}
              provinceSlug={data.province.slug}
              provinceName={data.province.name}
              cities={[...guideCities.values()]}
              guidesLoading={cityGuidesQuery.isLoading}
              search={{
                query: citySearch,
                onChange: setCitySearch,
                results: (citySearchQuery.data || []).filter(
                  city => city.provinceSlug === provinceSlug,
                ),
                isLoading:
                  citySearch.trim().length >= 2 &&
                  (citySearch.trim() !== debouncedCitySearch || citySearchQuery.isFetching),
                isError: citySearch.trim() === debouncedCitySearch && citySearchQuery.isError,
                onRetry: () => void citySearchQuery.refetch(),
              }}
            />
          </div>
        </section>

        <ProvincialBillboard campaign={heroCampaign} provinceName={data.province.name} />

        <section
          className="provincial-section provincial-section--tinted"
          aria-labelledby="needs-heading"
        >
          <div className="provincial-rail">
            <div className="provincial-section__heading">
              <div>
                <p className="provincial-eyebrow">Make it practical</p>
                <h2 id="needs-heading">Find the path that fits.</h2>
                <p>
                  Each option maps to a real destination or clearly tells you when that destination
                  is not ready.
                </p>
              </div>
            </div>
            <div className="provincial-needs">
              {config.featuredNeeds.map(need => {
                const journey = config.supportedJourneys.find(
                  candidate => candidate.id === need.journey,
                );
                const active =
                  need.state === 'active' &&
                  journey?.state === 'active' &&
                  (need.journey !== 'rent' || rentJourneyEnabled);
                return (
                  <button
                    key={need.id}
                    type="button"
                    disabled={!active}
                    className={`provincial-need ${active ? '' : 'is-unavailable'}`}
                    onClick={() => {
                      if (active) navigate(`/${data.province.slug}?journey=${need.journey}`);
                    }}
                  >
                    <span>
                      <span className="provincial-need__mark">
                        {active ? <ArrowRight size={16} aria-hidden="true" /> : '·'}
                      </span>
                      <strong>{need.label}</strong>
                      <p>{need.description}</p>
                    </span>
                    <ArrowRight className="provincial-need__arrow" size={16} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {config.modules.marketSnapshot ? (
          <section
            className="provincial-rail provincial-section"
            aria-labelledby="snapshot-heading"
          >
            <div className="provincial-section__heading">
              <div>
                <p className="provincial-eyebrow">What is live now</p>
                <h2 id="snapshot-heading">Property available in {data.province.name}</h2>
                <p>
                  Current advertised property across the province. Asking prices can differ from
                  final sale prices.
                </p>
              </div>
            </div>
            <div className="provincial-snapshot">
              <article className="provincial-snapshot__card">
                <p className="provincial-snapshot__label">For sale</p>
                <p className="provincial-snapshot__value">
                  {journeyCountLabel(data.journeyCounts.buy)}
                </p>
                <p className="provincial-snapshot__meta">
                  Currently advertised properties for sale.
                </p>
              </article>
              {rentJourneyEnabled ? (
                <article className="provincial-snapshot__card">
                  <p className="provincial-snapshot__label">For rent</p>
                  <p className="provincial-snapshot__value">
                    {journeyCountLabel(data.journeyCounts.rent)}
                  </p>
                  <p className="provincial-snapshot__meta">
                    Public Rent inventory · availability can change between visits.
                  </p>
                </article>
              ) : null}
              <article className="provincial-snapshot__card">
                <p className="provincial-snapshot__label">Developments</p>
                <p className="provincial-snapshot__value">
                  {journeyCountLabel(data.journeyCounts.developments)}
                </p>
                <p className="provincial-snapshot__meta">
                  Available property in published developments.
                </p>
              </article>
              <article
                className="provincial-snapshot__card provincial-snapshot__card--unavailable"
                data-testid="market-statistics-unavailable"
              >
                <p className="provincial-snapshot__label">Asking-price series</p>
                <p className="provincial-snapshot__value">Not published yet</p>
                <p className="provincial-snapshot__meta">
                  Reliable province-wide price trends are not available yet.
                </p>
              </article>
            </div>
            <p className="provincial-snapshot__note">
              <Info size={14} aria-hidden="true" /> {data.marketSnapshot.provenance.note}
            </p>
          </section>
        ) : null}

        <section
          className="provincial-section provincial-section--tinted"
          aria-labelledby="inventory-heading"
        >
          <div className="provincial-rail">
            <div className="provincial-section__heading">
              <div>
                <p className="provincial-eyebrow">A small live sample</p>
                <h2 id="inventory-heading">See what is available in {data.province.name}.</h2>
                <p>
                  A selection of available property. Choose Buy or Rent to refine the area and see
                  more.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm font-bold">
                {buyProvinceHref ? (
                  <Link href={buyProvinceHref} className="provincial-section__link">
                    Open Buy search <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                ) : null}
                {rentJourneyEnabled && rentProvinceHref ? (
                  <Link href={rentProvinceHref} className="provincial-section__link">
                    Open Rent search <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="provincial-inventory">
              <div>
                {visibleInventoryItems.length > 0 ? (
                  <div className="provincial-inventory__grid">
                    {visibleInventoryItems.slice(0, 6).map(item => (
                      <Link
                        key={`${item.listingSource}-${item.id}`}
                        href={item.href}
                        className="provincial-property-card"
                      >
                        <div
                          className="provincial-property-card__image"
                          style={item.image ? { backgroundImage: `url(${item.image})` } : undefined}
                        >
                          <span className="provincial-property-card__badge">
                            {item.listingType === 'rent' ? 'For rent' : 'For sale'}
                          </span>
                        </div>
                        <div className="provincial-property-card__body">
                          <p className="provincial-property-card__price">
                            {formatPrice(item.price, item.listingType)}
                          </p>
                          <p className="provincial-property-card__title">
                            {item.title} · {item.location}
                          </p>
                          <div className="provincial-property-card__meta">
                            {item.bedrooms ? <span>{item.bedrooms} bed</span> : null}
                            {item.bathrooms ? <span>{item.bathrooms} bath</span> : null}
                            {item.area ? <span>{formatCount(item.area)} m²</span> : null}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="provincial-inventory__empty" data-testid="inventory-empty-state">
                    <div>
                      <Home className="mx-auto mb-3 text-slate-400" size={28} aria-hidden="true" />
                      <strong>
                        {data.inventoryPreview.state === 'unavailable'
                          ? 'Live inventory is unavailable'
                          : 'There is no public preview yet'}
                      </strong>
                      <p>
                        {data.inventoryPreview.state === 'empty'
                          ? 'You can still explore its areas or choose another location for your property search.'
                          : 'Please try again later, or continue with a property search.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <aside className="provincial-inventory__aside">
                <div>
                  <p className="provincial-eyebrow">Public inventory</p>
                  <h3>{inventoryStateLabel(data.inventoryPreview.state)}</h3>
                  <p>
                    Explore the properties shown here, or open a search to choose your area,
                    property type and budget.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  {buyProvinceHref ? (
                    <Link href={buyProvinceHref}>
                      Browse Buy listings <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  ) : null}
                  {rentJourneyEnabled && rentProvinceHref ? (
                    <Link href={rentProvinceHref}>
                      Browse Rent listings <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="provincial-rail provincial-section" aria-labelledby="help-heading">
          <div className="provincial-section__heading">
            <div>
              <p className="provincial-eyebrow">Keep moving</p>
              <h2 id="help-heading">Useful next steps when the market feels noisy.</h2>
            </div>
          </div>
          <div className="provincial-trust">
            <article className="provincial-trust__card">
              <span className="provincial-trust__icon">
                <Bell size={17} aria-hidden="true" />
              </span>
              <h3>Save a search</h3>
              <p>
                Start with a supported Buy or Rent journey, then save the criteria that matter to
                you.
              </p>
              <a href="#provincial-composer-title">
                Choose Buy or Rent <ArrowRight size={14} aria-hidden="true" />
              </a>
            </article>
            <article className="provincial-trust__card">
              <span className="provincial-trust__icon">
                <MessageCircle size={17} aria-hidden="true" />
              </span>
              <h3>Need a second opinion?</h3>
              <p>
                Browse verified professionals and keep the property decision anchored in your
                criteria.
              </p>
              <Link href="/agents">
                Find an agent <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </article>
            <article className="provincial-trust__card">
              <span className="provincial-trust__icon">
                <KeyRound size={17} aria-hidden="true" />
              </span>
              <h3>Already know the place?</h3>
              <p>
                Type a precise supported location above. You do not need to walk the hierarchy
                manually.
              </p>
              <a href="#provincial-composer-title">
                Refine the location <ArrowRight size={14} aria-hidden="true" />
              </a>
            </article>
          </div>
        </section>

        <section className="provincial-rail provincial-section" aria-labelledby="seo-heading">
          <div className="provincial-seo">
            <div>
              <p className="provincial-eyebrow">A little context</p>
              <h2 id="seo-heading">{config.seo.heading}</h2>
              <p>{config.seo.summary}</p>
              <p>
                {data.province.name} works best as a neutral starting point: compare a market if you
                are still orienting yourself, or preserve the place and intent you already have when
                you are ready to act.
              </p>
            </div>
            <div>
              {config.seo.faqs.map((faq, index) => (
                <details key={faq.question} open={index === 0}>
                  <summary>
                    {faq.question}
                    <ChevronDown size={15} aria-hidden="true" />
                  </summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
