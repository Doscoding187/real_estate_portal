import { useEffect, useState } from 'react';
import { Link, useSearch } from 'wouter';
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  Compass,
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
import { getCityGuideImage } from '@/lib/cityGuideImages';
import { buildTransactionalGeographyHref } from '@/lib/geographySearchHandoff';
import { toAbsoluteUrl } from '@/lib/seo/structuredData';
import { trpc } from '@/lib/trpc';
import { getProvincialConfig } from '@shared/provincialDiscovery';
import { buildCampaignSlugHierarchy } from '@shared/locationCampaigns';
import type { ProvinceGuideContent } from '@shared/provinceGuideContent';
import '@/styles/provincial-discovery.css';
import '@/styles/province-editorial.css';

function SourceLinks({ ids, guide }: { ids: readonly string[]; guide: ProvinceGuideContent }) {
  return (
    <span className="guide-source-links">
      {ids.map(id => {
        const source = guide.sources.find(item => item.id === id);
        return source ? (
          <a key={id} href={source.url} target="_blank" rel="noopener noreferrer">
            {source.title.split(' · ')[0]} <ExternalLink size={11} aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null;
      })}
    </span>
  );
}

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
  const knownCitySlugs = new Set(places.data?.cities.map(city => city.slug));
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
      <nav className="guide-jump-nav" aria-label="In this guide">
        <div className="provincial-rail">
          <span>
            <BookOpen size={16} aria-hidden="true" /> In this guide
          </span>
          {[
            ['regions', 'Know the regions'],
            ['choose', 'Find your starting point'],
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
        <section
          id="regions"
          className="guide-section provincial-rail"
          aria-labelledby="regions-heading"
        >
          <div className="guide-intro">
            <div>
              <p className="guide-eyebrow">The province, explained</p>
              <h2 id="regions-heading">Get to know {guide.name}’s regions</h2>
              <p className="guide-lead">{guide.introduction}</p>
            </div>
            <aside className="guide-geography-note">
              <MapPin size={22} aria-hidden="true" />
              <div>
                <strong>3 metros. 2 districts. Many local stories.</strong>
                <p>
                  Municipal boundaries help you get oriented. Familiar names like “the East Rand” or
                  “Johannesburg North” add context, but do not define the same kind of area.
                </p>
                <SourceLinks ids={['geography']} guide={guide} />
              </div>
            </aside>
          </div>
          <div className="guide-region-index">
            {guide.regions.map((region, index) => (
              <a href={`#region-${region.id}`} key={region.id}>
                <span className="guide-region-number">0{index + 1}</span>
                <div>
                  <strong>{region.name}</strong>
                  <span>{region.kind === 'Metropolitan municipality' ? 'Metro' : 'District'}</span>
                </div>
                <ArrowDown size={16} aria-hidden="true" />
              </a>
            ))}
          </div>
          <div className="guide-chapters">
            {guide.regions.map((region, index) => (
              <article
                id={`region-${region.id}`}
                className="guide-chapter"
                key={region.id}
                aria-labelledby={`heading-${region.id}`}
              >
                <div className="guide-chapter-body">
                  <p className="guide-eyebrow">
                    0{index + 1} / {region.kind}
                  </p>
                  <h3 id={`heading-${region.id}`}>{region.name}</h3>
                  <p className="guide-chapter-strapline">{region.strapline}</p>
                  {region.paragraphs.map(paragraph => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  <SourceLinks ids={region.sourceIds} guide={guide} />
                </div>
                <aside
                  className="guide-chapter-aside"
                  aria-label={`Explore places in ${region.name}`}
                >
                  {index < 3 && (
                    <img
                      className="guide-chapter-image"
                      src={getCityGuideImage(guide.slug, region.places[0].citySlug)?.thumbnail}
                      alt={`Illustrative city scene of ${region.places[0].name}`}
                      loading="lazy"
                      width="480"
                      height="220"
                    />
                  )}
                  <div className="guide-chapter-links">
                    <p className="guide-mini-heading">
                      <Compass size={15} aria-hidden="true" /> Places to explore
                    </p>
                    <ul>
                      {region.places
                        .filter(place => knownCitySlugs.has(place.citySlug))
                        .map(place => (
                          <li key={place.citySlug}>
                            <Link href={`/${guide.slug}/${place.citySlug}`}>
                              {place.name}
                              <ArrowRight size={15} aria-hidden="true" />
                            </Link>
                          </li>
                        ))}
                    </ul>
                    {region.places.some(place => !knownCitySlugs.has(place.citySlug)) && (
                      <p className="guide-place-context">
                        <span>Places to know</span>
                        {region.places
                          .filter(place => !knownCitySlugs.has(place.citySlug))
                          .map(place => place.name)
                          .join(' · ')}
                        <small>
                          {places.isLoading
                            ? 'Checking city guides…'
                            : places.isError
                              ? 'Guide links could not be checked.'
                              : 'Individual guides are not available yet.'}
                        </small>
                      </p>
                    )}
                  </div>
                  <div className="guide-consider">
                    <Check size={17} aria-hidden="true" />
                    <p>{region.consider}</p>
                  </div>
                </aside>
              </article>
            ))}
          </div>
          {(places.isError || (!places.isLoading && !places.data)) && (
            <p className="guide-inline-state" role="alert">
              Place links are temporarily unavailable. You can still read the guide.{' '}
              <button onClick={() => void places.refetch()}>Retry place links</button>
            </p>
          )}
        </section>
        <section id="choose" className="guide-band" aria-labelledby="choose-heading">
          <div className="provincial-rail guide-section">
            <p className="guide-eyebrow">Make it personal</p>
            <h2 id="choose-heading">Where should you start exploring?</h2>
            <p className="guide-section-description">
              Use your everyday priorities to build a shortlist. These are starting points for your
              research, rather than rankings of the “best” places to live.
            </p>
            <div className="guide-priorities">
              {[
                {
                  icon: TrainFront,
                  title: 'A particular daily destination',
                  text: 'Start with the part of the province you need to reach, then compare neighbourhoods and the complete journey.',
                  label: 'Compare the three metros',
                  target: 'regions',
                },
                {
                  icon: Home,
                  title: 'A different pace or property setting',
                  text: 'Explore towns and their surroundings in the West Rand or Sedibeng. Investigate services and access at the exact address.',
                  label: 'Explore the western towns',
                  target: 'region-west-rand',
                },
                {
                  icon: Building2,
                  title: 'A particular kind of home',
                  text: 'Looking for an apartment, townhouse or more outdoor space? Choose an area first, then compare the homes actually available.',
                  label: 'Browse city guides',
                  target: 'cities',
                },
              ].map(item => (
                <div key={item.title}>
                  <item.icon size={24} aria-hidden="true" />
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <a href={`#${item.target}`}>
                    {item.label}
                    <ArrowRight size={15} aria-hidden="true" />
                  </a>
                </div>
              ))}
            </div>
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
                  <span className="guide-region-number">0{index + 1}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                    <SourceLinks ids={item.sourceIds} guide={guide} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="guide-section provincial-rail" aria-labelledby="market-heading">
          <div className="guide-market">
            <div>
              <p className="guide-eyebrow">Property Listify availability</p>
              <h2 id="market-heading">What’s available on the platform?</h2>
              <p>
                These counts cover eligible public sale and rental listings across {guide.name} on
                Property Listify. They describe our current inventory, rather than the whole market,
                completed sales or demand.
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
        {province && (
          <section
            id="property-search"
            className="guide-band guide-search"
            aria-label="Continue to property search"
          >
            <div className="provincial-rail">
              <p className="guide-eyebrow">When you’re ready</p>
              <h2>Turn your shortlist into a search</h2>
              <p>Choose an area and a property journey. Your selected location stays explicit.</p>
            </div>
            <ProvincialComposer
              config={config}
              province={province}
              marketLocations={places.data?.cities || []}
            />
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
