import { useEffect, useState } from 'react';
import { Link, useSearch } from 'wouter';
import {
  ChartNoAxesCombined,
  ArrowRight,
  BookOpen,
  Building2,
  ExternalLink,
  Home,
  MapPin,
  TrainFront,
} from 'lucide-react';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Footer } from '@/components/Footer';
import { ProvinceGuideHero } from '@/components/provincial/ProvinceGuideHero';
import { ProvinceCityGuides } from '@/components/provincial/ProvinceCityGuides';
import { ProvincialBillboard } from '@/components/provincial/ProvincialBillboard';
import { ProvincialComposer } from '@/components/provincial/ProvincialComposer';
import { MetaControl } from '@/components/seo/MetaControl';
import { getProvinceGuideCover } from '@/lib/provinceGuideImages';
import {
  GuideSourceLinks as SourceLinks,
  ProvinceLifestyleDiscovery,
  ProvinceRegionDiscovery,
} from '@/components/provincial/ProvinceGuideDiscovery';
import { buildTransactionalGeographyHref } from '@/lib/geographySearchHandoff';
import { toAbsoluteUrl } from '@/lib/seo/structuredData';
import { trpc } from '@/lib/trpc';
import { getProvincialConfig } from '@shared/provincialDiscovery';
import { buildCampaignSlugHierarchy } from '@shared/locationCampaigns';
import type { ProvinceGuideContent } from '@shared/provinceGuideContent';
import '@/styles/provincial-discovery.css';
import '@/styles/province-editorial.css';

export default function ProvinceEditorialPage({ guide }: { guide: ProvinceGuideContent }) {
  const config = getProvincialConfig(guide.slug)!;
  const locationSearch = useSearch();
  const campaign = trpc.locationPages.getHeroCampaign.useQuery(
    { locationSlug: guide.slug, fallbacks: buildCampaignSlugHierarchy(guide.slug).slice(1) },
    { retry: false },
  );
  const places = trpc.locationPages.getProvinceGuidePlaces.useQuery(
    { provinceSlug: guide.slug },
    { retry: false, staleTime: 600_000 },
  );
  const pulse = trpc.locationPages.getProvinceGuideInventory.useQuery(
    { provinceSlug: guide.slug },
    { enabled: Boolean(places.data?.province), retry: false, staleTime: 300_000 },
  );
  const cities = trpc.locationPages.getCityGuides.useQuery(
    { provinceSlug: guide.slug, limit: 12 },
    { retry: false, staleTime: 600_000 },
  );
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 180);
    return () => window.clearTimeout(timer);
  }, [query]);
  const search = trpc.locationPages.getCityGuides.useQuery(
    { provinceSlug: guide.slug, limit: 12, query: debounced.length >= 2 ? debounced : undefined },
    { enabled: debounced.length >= 2, retry: false, staleTime: 600_000 },
  );
  const province = places.data?.province;
  const verifiedCities = [
    ...new Map(
      [...(places.data?.cities || []), ...(cities.data || [])].map(city => [city.slug, city]),
    ).values(),
  ];
  const inventory = pulse.data;
  const href = (journey: 'buy' | 'rent') =>
    province
      ? buildTransactionalGeographyHref({
          journey,
          scope: { kind: 'province', canonicalLocationId: province.canonicalLocationId },
          context: { province: guide.slug },
        })
      : undefined;
  const canonical = toAbsoluteUrl(`/${guide.slug}`);
  const cover = getProvinceGuideCover(guide.slug);
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'AdministrativeArea',
      name: guide.name,
      description: guide.description,
      url: canonical,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: toAbsoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: guide.name, item: canonical },
      ],
    },
  ];
  return (
    <div className="provincial-page province-editorial pt-16">
      <ListingNavbar neutralSearch />
      <MetaControl
        title={guide.title}
        description={guide.description}
        canonicalUrl={canonical}
        image={cover ? toAbsoluteUrl(cover.desktop) : undefined}
        structuredData={structuredData}
        forceNoIndex={guide.status !== 'published' || Boolean(locationSearch)}
      />
      <div className="provincial-page__breadcrumbs">
        <nav className="provincial-rail provincial-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{guide.name} guide</span>
        </nav>
      </div>
      <ProvinceGuideHero
        provinceName={guide.name}
        provinceSlug={guide.slug}
        description={`Find your bearings. Get to know the regions, cities and neighbourhoods that make ${guide.name} feel like many places in one.`}
      />
      <section
        id="property-search"
        className="guide-top-search"
        aria-label="Choose a property journey"
      >
        {province ? (
          <ProvincialComposer
            config={config}
            province={province}
            marketLocations={places.data?.cities || []}
          />
        ) : (
          <div
            className="provincial-rail guide-search-state"
            role={places.isLoading ? 'status' : 'alert'}
          >
            <strong>What would you like to explore?</strong>
            <p>
              {places.isLoading
                ? 'Loading area search…'
                : 'Area search is temporarily unavailable. You can still explore the regions below.'}
            </p>
            {!places.isLoading && (
              <button onClick={() => void places.refetch()}>Retry area search</button>
            )}
          </div>
        )}
      </section>
      <nav className="guide-jump-nav" aria-label="In this guide">
        <div className="provincial-rail">
          <span>
            <BookOpen size={16} aria-hidden="true" /> In this guide
          </span>
          {[
            ['discover', 'Discover places'],
            ['regions', 'Regions & districts'],
            ['insights', 'Property insights'],
            ['choose', 'Your priorities'],
            ['cities', 'City guides'],
            ['living', 'Everyday life'],
            ['questions', 'Good to know'],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </div>
      </nav>
      <main id="province-guide-main">
        <ProvinceLifestyleDiscovery guide={guide} verifiedCities={verifiedCities} />
        <ProvinceRegionDiscovery guide={guide} verifiedCities={verifiedCities} />
        {(places.isError || (!places.isLoading && !places.data)) && (
          <div className="provincial-rail guide-place-error">
            <p className="guide-inline-state" role="alert">
              Place links are temporarily unavailable. You can still read the guide.{' '}
              <button onClick={() => void places.refetch()}>Retry place links</button>
            </p>
          </div>
        )}
        <section
          id="insights"
          className="guide-section provincial-rail"
          aria-labelledby="market-heading"
        >
          <div className="guide-market">
            <div>
              <p className="guide-eyebrow">
                <ChartNoAxesCombined size={15} aria-hidden="true" /> Property insights
              </p>
              <h2 id="market-heading">What’s available on the platform?</h2>
              <p>
                Available listings across {guide.name} on Property Listify. They describe our
                current inventory, not completed sales or demand.
              </p>
              <p className="guide-market-note">
                Regional price comparisons and property-type patterns will appear when there is
                enough reliable, correctly grouped data.
              </p>
            </div>
            <div className="guide-live-counts">
              {pulse.isLoading || places.isLoading ? (
                <p role="status">Checking current listings…</p>
              ) : pulse.isError || !inventory ? (
                <p role="alert">
                  Listing counts are temporarily unavailable.{' '}
                  <button onClick={() => void pulse.refetch()}>Retry counts</button>
                </p>
              ) : (
                <>
                  {(['sale', 'rent'] as const).map(type => {
                    const result = inventory[type];
                    const label = type === 'sale' ? 'For sale' : 'To rent';
                    return (
                      <div key={type}>
                        <span>{label}</span>
                        {result.state === 'ready' ? (
                          <>
                            <div className="guide-bar-track">
                              <span
                                style={{
                                  width: `${Math.max(inventory.sale.total || 0, inventory.rent.total || 0) > 0 ? (result.total / Math.max(inventory.sale.total || 0, inventory.rent.total || 0)) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <strong>{result.total.toLocaleString('en-ZA')}</strong>
                            {href(type === 'sale' ? 'buy' : 'rent') && (
                              <Link href={href(type === 'sale' ? 'buy' : 'rent')!}>
                                {result.total === 0 ? 'Check availability' : 'View properties'}
                                <ArrowRight size={14} aria-hidden="true" />
                              </Link>
                            )}
                          </>
                        ) : (
                          <span>Count unavailable</span>
                        )}
                      </div>
                    );
                  })}
                  <small>
                    Checked{' '}
                    <time dateTime={inventory.observedAt}>
                      {new Date(inventory.observedAt).toLocaleDateString('en-ZA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </time>
                  </small>
                </>
              )}
            </div>
          </div>
        </section>
        <section
          id="choose"
          className="guide-priority-strip provincial-rail"
          aria-labelledby="choose-heading"
        >
          <h2 id="choose-heading">What matters to you?</h2>
          <div>
            <a href="#living">
              <TrainFront size={18} aria-hidden="true" />
              <span>My daily journey</span>
              <ArrowRight size={14} aria-hidden="true" />
            </a>
            <a href="#region-west-rand">
              <Home size={18} aria-hidden="true" />
              <span>A different setting</span>
              <ArrowRight size={14} aria-hidden="true" />
            </a>
            <a href="#property-search">
              <Building2 size={18} aria-hidden="true" />
              <span>A particular home type</span>
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          </div>
        </section>
        <section
          id="cities"
          className="guide-section provincial-rail"
          aria-labelledby="cities-heading"
        >
          <div className="guide-section-top">
            <div>
              <p className="guide-eyebrow">Take a closer look</p>
              <h2 id="cities-heading">Cities in {guide.name}</h2>
              <p className="guide-section-description">
                Open a city guide to explore its local areas. Search below for a specific place.
              </p>
            </div>
            <span className="guide-small-label">
              <MapPin size={14} aria-hidden="true" /> City & town guides
            </span>
          </div>
          {cities.isError ? (
            <div role="alert" className="guide-inline-state">
              City guides could not be loaded.{' '}
              <button onClick={() => void cities.refetch()}>Retry city guides</button>
            </div>
          ) : cities.isLoading ? (
            <p role="status" className="guide-inline-state">
              Loading city guides…
            </p>
          ) : !cities.data?.length ? (
            <p className="guide-inline-state">
              City guides for {guide.name} are not available yet. The regional guide above is still
              here to help you get oriented.
            </p>
          ) : (
            <ProvinceCityGuides
              markets={[]}
              cities={cities.data || []}
              provinceName={guide.name}
              provinceSlug={guide.slug}
              search={{
                query,
                onChange: setQuery,
                results: search.data || [],
                isLoading:
                  query.trim().length >= 2 && (debounced !== query.trim() || search.isFetching),
                isError: search.isError,
                onRetry: () => void search.refetch(),
              }}
            />
          )}
        </section>
        <ProvincialBillboard campaign={campaign.data} provinceName={guide.name} />
        <section id="living" className="guide-band" aria-labelledby="living-heading">
          <div className="provincial-rail guide-section">
            <div className="guide-section-top">
              <div>
                <p className="guide-eyebrow">Beyond the address</p>
                <h2 id="living-heading">Everyday life: what to weigh up</h2>
              </div>
            </div>
            <div className="guide-practical">
              {guide.practical.map((item, index) => (
                <article key={item.id}>
                  <div className="guide-practical-title">
                    {index === 0 ? (
                      <TrainFront size={23} aria-hidden="true" />
                    ) : index === 1 ? (
                      <MapPin size={23} aria-hidden="true" />
                    ) : (
                      <Home size={23} aria-hidden="true" />
                    )}
                    <h3>{item.title}</h3>
                  </div>
                  <p>{item.text}</p>
                  <SourceLinks ids={item.sourceIds} guide={guide} />
                </article>
              ))}
            </div>
          </div>
        </section>
        <section
          id="questions"
          className="guide-section guide-faq provincial-rail"
          aria-labelledby="faq-heading"
        >
          <div>
            <p className="guide-eyebrow">Good to know</p>
            <h2 id="faq-heading">Questions about {guide.name}</h2>
            <p>Geography, local context and the limits of the numbers.</p>
          </div>
          <div>
            {guide.faqs.map(item => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section
          className="guide-section provincial-rail guide-sources"
          aria-labelledby="sources-heading"
        >
          <details>
            <summary id="sources-heading">
              Sources & how to read this guide <span>Sources checked 15 October 2026</span>
            </summary>
            <p>
              This local preview draft brings together official geography and transport sources with
              practical questions for your own research. It does not rank neighbourhoods for safety,
              school quality, affordability or investment returns. City and town links identify
              places; their individual guides are being developed separately.
            </p>
            <ul>
              {guide.sources.map(source => (
                <li key={source.id}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.title}
                    <ExternalLink size={12} aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  {source.note && <span>{source.note}</span>}
                </li>
              ))}
            </ul>
            <p>
              Source check: <time dateTime={guide.sourceCheckedOn}>15 October 2026</time>. This is
              not a claimed publication date or an endorsement by the source organisations.
            </p>
          </details>
        </section>
      </main>
      <Footer />
    </div>
  );
}
