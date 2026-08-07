import {
  ArrowRight,
  Bell,
  ChevronDown,
  CircleHelp,
  Home,
  Info,
  KeyRound,
  MapPin,
  MessageCircle,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Footer } from '@/components/Footer';
import { LocationSchema } from '@/components/location/LocationSchema';
import { ProvincialComposer } from '@/components/provincial/ProvincialComposer';
import { trpc } from '@/lib/trpc';
import { buildTransactionalGeographyHref } from '@/lib/geographySearchHandoff';
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
      aria-label="Loading Gauteng discovery"
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

  if (!config) {
    return <ProvinceErrorState provinceName={provinceSlug.replace(/-/g, ' ')} />;
  }

  if (isLoading) return <ProvinceLoadingState />;
  if (error || !data) return <ProvinceErrorState provinceName={config.name} />;

  const campaignImage = heroCampaign?.imageUrl || config.heroFallbackImage;
  const marketLocations = data.markets
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
        image={campaignImage}
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

      <section className="provincial-hero" aria-labelledby="province-page-title">
        <div
          className="provincial-hero__art"
          style={{ backgroundImage: `url(${campaignImage})` }}
          aria-hidden="true"
        />
        <div className="provincial-hero__wash" aria-hidden="true" />
        <div className="provincial-hero__glow" aria-hidden="true" />
        <div className="provincial-hero__grid" aria-hidden="true" />
        <div className="provincial-rail provincial-hero__inner">
          <div className="provincial-hero__copy">
            <p className="provincial-eyebrow">{config.heroKicker}</p>
            <h1 id="province-page-title">Explore {data.province.name}</h1>
            <p className="provincial-hero__proposition">{config.shortProposition}</p>
            <div className="provincial-hero__signal" aria-label="Gauteng discovery signals">
              <span>
                <strong>
                  {data.inventoryPreview.total > 0
                    ? formatCount(data.inventoryPreview.total)
                    : 'Live'}
                </strong>
                {data.inventoryPreview.total > 0 ? 'public listings' : 'inventory lookup'}
              </span>
              <span>
                <strong>{data.markets.filter(market => market.city).length}</strong>
                supported markets
              </span>
              <span>
                <strong>1</strong>
                clear next move
              </span>
            </div>
          </div>

          {heroCampaign ? (
            <a
              className="provincial-hero__billboard provincial-hero__billboard--campaign"
              href={heroCampaign.landingPageUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Sponsored: ${heroCampaign.altText || 'Explore this Gauteng opportunity'}`}
              style={{ backgroundImage: `url(${heroCampaign.imageUrl})` }}
            >
              <span className="provincial-hero__billboard-overlay">
                <span className="provincial-hero__billboard-label">Sponsored</span>
                <span>
                  <strong className="sr-only">
                    {heroCampaign.altText || 'Featured Gauteng opportunity'}
                  </strong>
                  <span className="provincial-hero__billboard-link">
                    Discover the opportunity <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </span>
              </span>
            </a>
          ) : (
            <div className="provincial-hero__billboard" aria-label="Gauteng discovery guidance">
              <span className="provincial-hero__billboard-label">
                <MapPin size={13} aria-hidden="true" /> Built for direct discovery
              </span>
              <h2>One place. Several ways forward.</h2>
              <p>Choose a property journey, then type the location you already have in mind.</p>
              <span className="provincial-hero__billboard-link">
                Canonical geography, resolved for you <ArrowRight size={15} aria-hidden="true" />
              </span>
            </div>
          )}
        </div>
      </section>

      <ProvincialComposer
        config={config}
        province={data.province}
        marketLocations={marketLocations}
      />

      <main id="main-content" tabIndex={-1} className="provincial-main">
        <section className="provincial-rail provincial-section" aria-labelledby="markets-heading">
          <div className="provincial-section__heading">
            <div>
              <p className="provincial-eyebrow">Start with a market</p>
              <h2 id="markets-heading">Major markets, without a routing gate.</h2>
              <p>
                Use a market as a discovery aid, or go straight back to the composer when you
                already know your intent.
              </p>
            </div>
            <Link href={`/${data.province.slug}`} className="provincial-section__link">
              Keep it province-wide <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <div className="provincial-markets">
            {data.markets.map(market => {
              const inventory = market.inventory;
              const cityHref = market.city
                ? `/${data.province.slug}/${market.city.slug}`
                : undefined;
              return (
                <article key={market.slug} className="provincial-market-card">
                  <div className="provincial-market-card__body">
                    <div className="provincial-market-card__top">
                      <div>
                        <p className="provincial-market-card__eyebrow">{market.eyebrow}</p>
                        <h3>{market.name}</h3>
                      </div>
                      <span className="provincial-market-card__pill">
                        {market.city ? 'Canonical market' : 'Not configured'}
                      </span>
                    </div>
                    <p className="provincial-market-card__description">{market.description}</p>
                    <div className="provincial-market-card__stats">
                      <div className="provincial-market-card__stat">
                        <strong>
                          {inventory
                            ? inventory.total > 0
                              ? formatCount(inventory.total)
                              : '—'
                            : '—'}
                        </strong>
                        <span>{inventory ? 'public listings' : 'availability'}</span>
                      </div>
                      <div className="provincial-market-card__stat">
                        <strong>{inventoryStateLabel(market.state)}</strong>
                        <span>data state</span>
                      </div>
                    </div>
                    <div
                      className="provincial-market-card__areas"
                      aria-label={`Known areas near ${market.name}`}
                    >
                      {market.areaSlugs.length > 0 ? (
                        market.areaSlugs.map(area => (
                          <span key={area} className="provincial-market-card__area">
                            {area.replace(/-/g, ' ')}
                          </span>
                        ))
                      ) : (
                        <span className="provincial-market-card__area">
                          Explore areas from the search field
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="provincial-market-card__footer">
                    <span>
                      {inventory?.sourceCounts
                        ? `${formatCount(inventory.sourceCounts.manual)} direct · ${formatCount(inventory.sourceCounts.development)} development`
                        : 'No public sample yet'}
                    </span>
                    {cityHref ? (
                      <Link href={cityHref}>
                        Explore {market.name} <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    ) : (
                      <span>Coming when identity is available</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

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
                const active = need.state === 'active' && journey?.state === 'active';
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

        <section className="provincial-rail provincial-section" aria-labelledby="snapshot-heading">
          <div className="provincial-section__heading">
            <div>
              <p className="provincial-eyebrow">What is live now</p>
              <h2 id="snapshot-heading">A useful snapshot, without invented certainty.</h2>
              <p>
                These are public inventory signals, not concluded sales or valuations. Pricing stays
                unavailable until the method is defensible.
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
                Public Buy inventory · same search authority used by results.
              </p>
            </article>
            <article className="provincial-snapshot__card">
              <p className="provincial-snapshot__label">For rent</p>
              <p className="provincial-snapshot__value">
                {journeyCountLabel(data.journeyCounts.rent)}
              </p>
              <p className="provincial-snapshot__meta">
                Public Rent inventory · availability can change between visits.
              </p>
            </article>
            <article className="provincial-snapshot__card">
              <p className="provincial-snapshot__label">Developments</p>
              <p className="provincial-snapshot__value">
                {journeyCountLabel(data.journeyCounts.developments)}
              </p>
              <p className="provincial-snapshot__meta">
                Approved public development-derived inventory.
              </p>
            </article>
            <article
              className="provincial-snapshot__card provincial-snapshot__card--unavailable"
              data-testid="market-statistics-unavailable"
            >
              <p className="provincial-snapshot__label">Asking-price series</p>
              <p className="provincial-snapshot__value">Not published yet</p>
              <p className="provincial-snapshot__meta">
                No audited sample is exposed by this slice. That is different from a zero or an
                average.
              </p>
            </article>
          </div>
          <p className="provincial-snapshot__note">
            <Info size={14} aria-hidden="true" /> {data.marketSnapshot.provenance.note}
          </p>
        </section>

        <section
          className="provincial-section provincial-section--tinted"
          aria-labelledby="inventory-heading"
        >
          <div className="provincial-rail">
            <div className="provincial-section__heading">
              <div>
                <p className="provincial-eyebrow">A small live sample</p>
                <h2 id="inventory-heading">See what is available in Gauteng.</h2>
                <p>
                  Preview cards are deliberately bounded. Continue into the relevant journey for the
                  complete public result set.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm font-bold">
                {buyProvinceHref ? (
                  <Link href={buyProvinceHref} className="provincial-section__link">
                    Open Buy search <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                ) : null}
                {rentProvinceHref ? (
                  <Link href={rentProvinceHref} className="provincial-section__link">
                    Open Rent search <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="provincial-inventory">
              <div>
                {data.inventoryPreview.items.length > 0 ? (
                  <div className="provincial-inventory__grid">
                    {data.inventoryPreview.items.slice(0, 6).map(item => (
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
                            {item.listingType === 'rent'
                              ? 'For rent'
                              : item.listingSource === 'development'
                                ? 'Development'
                                : 'For sale'}
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
                          ? 'The province is still useful as a journey hub. Try a location or continue to the public search.'
                          : 'We will show listings here once the public search authority returns a safe sample.'}
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
                    Bounded to {formatCount(data.inventoryPreview.pageSize)} cards. Counts and links
                    come from the same public result authority as the search page.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  {buyProvinceHref ? (
                    <Link href={buyProvinceHref}>
                      Browse Buy listings <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  ) : null}
                  {rentProvinceHref ? (
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
                Gauteng works best as a neutral starting point: compare a market if you are still
                orienting yourself, or preserve the place and intent you already have when you are
                ready to act.
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
