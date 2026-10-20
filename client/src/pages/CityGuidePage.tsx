import { useEffect, useId, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import {
  ArrowRight,
  BookOpen,
  Building2,
  Compass,
  ExternalLink,
  Leaf,
  MapPin,
  TrainFront,
} from 'lucide-react';
import type { CityGuideContent, CityGuidePlace } from '@shared/cityGuideContent';
import { encodeCanonicalLocationId } from '@shared/locationAuthority';
import { buildCampaignSlugHierarchy } from '@shared/locationCampaigns';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Footer } from '@/components/Footer';
import { MetaControl } from '@/components/seo/MetaControl';
import { CityGuideEntry } from '@/components/CityGuideEntry';
import { DiscoveryTabs, PlaceRow } from '@/components/provincial/ProvinceGuideDiscovery';
import { ProvincialBillboard } from '@/components/provincial/ProvincialBillboard';
import { CityGuideJourney, CitySuburbFinder } from '@/components/city-guide/CityGuideJourney';
import { getCityGuideImage } from '@/lib/cityGuideImages';
import { exactGuidePlace } from '@/lib/cityGuideDiscovery';
import { toAbsoluteUrl } from '@/lib/seo/structuredData';
import { buildLocationDiscoveryPath } from '@/lib/locationDiscovery';
import { trpc } from '@/lib/trpc';
import type { LocationNode } from '@/types/location';
import '@/styles/provincial-discovery.css';
import '@/styles/province-editorial.css';
import '@/styles/city-guide.css';

const ICONS = { city: Building2, leaf: Leaf, train: TrainFront, compass: Compass };
function Sources({ guide, ids }: { guide: CityGuideContent; ids: readonly string[] }) {
  return (
    <span className="guide-source-links">
      {guide.sources
        .filter(s => ids.includes(s.id))
        .map(s => (
          <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">
            {s.title.split(' · ')[0]}
            <ExternalLink size={11} aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ))}
    </span>
  );
}
function PlaceGuideCard({ guide, place }: { guide: CityGuideContent; place: CityGuidePlace }) {
  const lookup = trpc.location.searchDiscoverySuggestions.useQuery(
    { query: place.name, limit: 8 },
    { retry: false, staleTime: 600000 },
  );
  const match = exactGuidePlace(lookup.data || [], guide, place.name);
  const artwork = getCityGuideImage(guide.provinceSlug, place.imageCity);
  const [failed, setFailed] = useState(false);
  const own = match?.canonicalPath === `/${guide.provinceSlug}/${guide.slug}`;
  const href = match && !own ? match.canonicalPath : '#city-regions';
  const Card = href.startsWith('#') ? 'a' : Link;
  return (
    <Card
      href={href}
      className="guide-place-card"
      aria-label={
        match && !own
          ? `Explore ${place.name} ${match.factualLevel} guide`
          : `Read city context for ${place.name}`
      }
    >
      <span className="guide-place-image">
        {artwork && !failed ? (
          <img
            src={artwork.thumbnail}
            srcSet={artwork.srcSet}
            sizes="(max-width: 640px) 46vw, 210px"
            alt={`AI-generated city scene of ${place.imageCity.replace(/-/g, ' ')}, illustrative context`}
            width="480"
            height="360"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <Building2 size={36} aria-hidden="true" />
        )}
        <span>{match?.display.typeLabel || 'Place to explore'}</span>
      </span>
      <span className="guide-place-copy">
        <strong>{place.name}</strong>
        <span className="guide-place-caption">{place.caption}</span>
        <span className="guide-place-action">
          {lookup.isLoading
            ? 'Read city context'
            : match && !own
              ? 'Explore guide'
              : 'Read city context'}
          <ArrowRight size={13} aria-hidden="true" />
        </span>
      </span>
    </Card>
  );
}
function RegionPlace({ guide, name }: { guide: CityGuideContent; name: string }) {
  const lookup = trpc.location.searchDiscoverySuggestions.useQuery(
    { query: name, limit: 8 },
    { retry: false, staleTime: 600000 },
  );
  const match = exactGuidePlace(lookup.data || [], guide, name);
  return match && match.canonicalPath !== `/${guide.provinceSlug}/${guide.slug}` ? (
    <Link href={match.canonicalPath}>
      {name}
      <ArrowRight size={13} aria-hidden="true" />
    </Link>
  ) : (
    <span>{name}</span>
  );
}
export default function CityGuidePage({ guide }: { guide: CityGuideContent }) {
  const [, navigate] = useLocation();
  const search = useSearch();
  const prefix = useId();
  const [collection, setCollection] = useState(guide.collections[0].id);
  const [region, setRegion] = useState('f');
  const [heroFailed, setHeroFailed] = useState(false);
  const query = trpc.locationPages.getCityData.useQuery(
    { provinceSlug: guide.provinceSlug, citySlug: guide.slug, includeInventoryPreview: false },
    { retry: false, staleTime: 300000 },
  );
  const campaign = trpc.locationPages.getHeroCampaign.useQuery(
    {
      locationSlug: `${guide.provinceSlug}/${guide.slug}`,
      fallbacks: buildCampaignSlugHierarchy(`${guide.provinceSlug}/${guide.slug}`).slice(1),
    },
    { retry: false },
  );
  const data = query.data;
  const record =
    data?.city?.slug === guide.slug && data.city.provinceSlug === guide.provinceSlug
      ? data.city
      : undefined;
  const city: LocationNode | undefined = record
    ? {
        id: encodeCanonicalLocationId('city', record.id),
        canonicalLocationId: encodeCanonicalLocationId('city', record.id),
        name: record.name,
        type: 'city',
        slug: record.slug,
        citySlug: record.slug,
        provinceSlug: guide.provinceSlug,
      }
    : undefined;
  const image = getCityGuideImage(guide.provinceSlug, guide.slug);
  const path = `/${guide.provinceSlug}/${guide.slug}`;
  const total = data?.stats?.totalListings;
  const types = (data?.propertyTypes || []).filter(
    item => Number.isSafeInteger(item.count) && item.count > 0,
  );
  const validTotal = Number.isSafeInteger(total) && Number(total) >= 0;
  const validMix = validTotal && types.reduce((sum, item) => sum + item.count, 0) === total;
  useEffect(() => {
    const update = () => {
      const id = window.location.hash.replace('#city-region-', '');
      if (guide.regions.some(item => item.id === id)) {
        setRegion(id);
        requestAnimationFrame(() =>
          document.getElementById(`city-region-${id}`)?.scrollIntoView({ block: 'start' }),
        );
      }
    };
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, [guide]);
  return (
    <div className="provincial-page province-editorial city-guide-page pt-16">
      <ListingNavbar neutralSearch />
      <MetaControl
        title={guide.title}
        description={guide.description}
        canonicalUrl={toAbsoluteUrl(path)}
        image={image ? toAbsoluteUrl(image.hero) : undefined}
        forceNoIndex={guide.status !== 'published' || Boolean(search)}
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'City',
            name: guide.name,
            description: guide.description,
            url: toAbsoluteUrl(path),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { name: 'Home', item: toAbsoluteUrl('/') },
              { name: guide.provinceName, item: toAbsoluteUrl(`/${guide.provinceSlug}`) },
              { name: guide.name, item: toAbsoluteUrl(path) },
            ].map((item, index) => ({ '@type': 'ListItem', position: index + 1, ...item })),
          },
        ]}
      />
      <div className="provincial-page__breadcrumbs">
        <nav className="provincial-rail provincial-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/${guide.provinceSlug}`}>{guide.provinceName} guide</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{guide.name}</span>
        </nav>
      </div>
      <header className="city-guide-hero">
        {image && !heroFailed && (
          <img
            src={image.hero}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            style={{ objectPosition: image.heroPosition }}
            onError={() => setHeroFailed(true)}
          />
        )}
        <div className="city-hero-shade" />
        <div className="provincial-rail city-hero-copy">
          <p className="guide-eyebrow">Gauteng · City guide</p>
          <h1>Explore {guide.name}</h1>
          <p>Find your side of the city.</p>
          <p>
            Get to know its neighbourhoods, green spaces and everyday connections before choosing
            where to search.
          </p>
          <a href="#city-regions">
            Get your bearings <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
      </header>
      <div className="city-journey-wrap">
        <CityGuideJourney guide={guide} city={city} />
      </div>
      <nav className="guide-jump-nav" aria-label="In this city guide">
        <div className="provincial-rail">
          <span>
            <BookOpen size={16} aria-hidden="true" />
            In this guide
          </span>
          {[
            ['city-discover', 'Discover places'],
            ['city-regions', 'Understand the city'],
            ['city-insights', 'Property insights'],
            ['city-suburbs', 'Suburb guides'],
            ['city-living', 'Everyday life'],
            ['city-questions', 'Good to know'],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </div>
      </nav>
      <main id="city-guide-main">
        <section
          id="city-discover"
          className="guide-section provincial-rail"
          aria-labelledby="city-discover-heading"
        >
          <div className="guide-section-top">
            <div>
              <p className="guide-eyebrow">A city with many sides</p>
              <h2 id="city-discover-heading">Discover your side of {guide.name}</h2>
            </div>
            <span className="guide-small-label">Explore by lifestyle</span>
          </div>
          <DiscoveryTabs
            label="City discovery themes"
            items={guide.collections.map(item => ({
              id: item.id,
              label: item.label,
              icon: ICONS[item.icon],
            }))}
            active={collection}
            onChange={setCollection}
            prefix={`${prefix}-theme`}
            panelId={id => `${prefix}-theme-panel-${id}`}
          />
          {guide.collections.map(item => (
            <div
              role="tabpanel"
              tabIndex={0}
              key={item.id}
              hidden={collection !== item.id}
              id={`${prefix}-theme-panel-${item.id}`}
              aria-labelledby={`${prefix}-theme-${item.id}`}
            >
              <p className="guide-collection-description">{item.description}</p>
              {collection === item.id && (
                <PlaceRow label="Places to explore" refreshKey={item.id}>
                  {item.places.map(place => (
                    <div role="listitem" key={place.name}>
                      <PlaceGuideCard guide={guide} place={place} />
                    </div>
                  ))}
                </PlaceRow>
              )}
              <details className="guide-collection-context">
                <summary>Why explore these places?</summary>
                <p>{item.context}</p>
                <Sources guide={guide} ids={item.sourceIds} />
              </details>
            </div>
          ))}
          <div className="guide-collection-footer">
            <a href="#city-suburbs">
              Find a suburb guide
              <ArrowRight size={14} />
            </a>
            <span>Curated starting points · Choose a place to learn more</span>
          </div>
        </section>
        <section id="city-regions" className="guide-band" aria-labelledby="city-regions-heading">
          <div className="provincial-rail guide-section">
            <div className="guide-section-top">
              <div>
                <p className="guide-eyebrow">Understand the city</p>
                <h2 id="city-regions-heading">One metro. Different local lives.</h2>
                <p className="guide-section-description">{guide.introduction}</p>
              </div>
              <span className="guide-small-label">
                <MapPin size={14} />7 municipal regions
              </span>
            </div>
            <div className="guide-geography-explainer">
              <Compass size={19} aria-hidden="true" />
              <p>
                The metro is the wider picture. City and suburb guides describe individual places.
                These regional chapters help with orientation; they do not merge areas into a
                property search.
              </p>
            </div>
            <DiscoveryTabs
              label="Johannesburg regions"
              items={guide.regions.map(item => ({
                id: item.id,
                label: item.label,
                icon: Building2,
              }))}
              active={region}
              onChange={setRegion}
              prefix={`${prefix}-region`}
              panelId={id => `city-region-${id}`}
            />
            {guide.regions.map(item => (
              <div
                key={item.id}
                role="tabpanel"
                tabIndex={0}
                id={`city-region-${item.id}`}
                aria-labelledby={`${prefix}-region-${item.id}`}
                hidden={region !== item.id}
              >
                <article className="city-region-detail">
                  <div>
                    <p className="guide-eyebrow">Find your bearings</p>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                    <Sources guide={guide} ids={['regions']} />
                  </div>
                  <div className="city-region-next">
                    <p className="guide-eyebrow">Places to get to know</p>
                    <div className="city-region-links">
                      {region === item.id
                        ? item.places.map(name => (
                            <RegionPlace key={name} guide={guide} name={name} />
                          ))
                        : item.places.map(name => <span key={name}>{name}</span>)}
                    </div>
                    <div className="guide-region-consider">
                      <MapPin size={18} aria-hidden="true" />
                      <div>
                        <strong>When comparing places</strong>
                        <p>{item.consider}</p>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </section>
        <section
          id="city-insights"
          className="guide-section provincial-rail"
          aria-labelledby="city-insights-heading"
        >
          <div className="city-insights">
            <div>
              <p className="guide-eyebrow">On Property Listify</p>
              <h2 id="city-insights-heading">What’s listed in {guide.name}?</h2>
              <p>
                Property types currently listed for {guide.name}, with sale and rent combined. These
                counts cover this place on Property Listify, not the entire metro or the wider
                housing market.
              </p>
              <a href="#city-property-search">
                Choose an area and property journey <ArrowRight size={14} />
              </a>
            </div>
            <div className="city-mix">
              {query.isLoading ? (
                <p role="status">Loading current inventory…</p>
              ) : query.isError || !record || !validTotal ? (
                <p role="alert">
                  Inventory insights are unavailable.{' '}
                  <button type="button" onClick={() => void query.refetch()}>
                    Try again
                  </button>
                </p>
              ) : (
                <>
                  <div className="city-inventory-total">
                    <strong>{total!.toLocaleString('en-ZA')}</strong>
                    <span>available platform {total === 1 ? 'listing' : 'listings'}</span>
                  </div>
                  {total === 0 ? (
                    <p>
                      No eligible listings in this catalogue area right now. You can still explore
                      the guide.
                    </p>
                  ) : validMix ? (
                    <ul aria-label="Available listings by property type">
                      {types
                        .sort((a, b) => b.count - a.count)
                        .map(item => (
                          <li key={item.type}>
                            <span>{item.type.replace(/_/g, ' ')}</span>
                            <span className="guide-bar-track">
                              <span style={{ width: `${(item.count / total!) * 100}%` }} />
                            </span>
                            <strong>{item.count.toLocaleString('en-ZA')}</strong>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p>The property-type breakdown is unavailable.</p>
                  )}
                  <small>Source: eligible platform listings. No price or demand ranking.</small>
                </>
              )}
            </div>
          </div>
        </section>
        <section
          id="city-suburbs"
          className="guide-section provincial-rail"
          aria-labelledby="city-suburbs-heading"
        >
          <div className="guide-section-top">
            <div>
              <p className="guide-eyebrow">Take a closer look</p>
              <h2 id="city-suburbs-heading">Explore {guide.name} by suburb</h2>
              <p className="guide-section-description">
                Start with a local guide. Search below for a specific suburb or place.
              </p>
            </div>
            <span className="guide-small-label">Suburb & neighbourhood guides</span>
          </div>
          {query.isLoading ? (
            <p role="status">Loading suburb guides…</p>
          ) : query.isError || !record ? (
            <p role="alert">
              Suburb previews could not be loaded.{' '}
              <button type="button" onClick={() => void query.refetch()}>
                Try again
              </button>
            </p>
          ) : !data?.suburbs?.length ? (
            <p>There are no suburb previews for this area yet.</p>
          ) : (
            <div className="city-suburb-grid" role="list" aria-label="Suburb guides">
              {data.suburbs.slice(0, 12).map(suburb => {
                const node: LocationNode = {
                  id: encodeCanonicalLocationId('suburb', suburb.id),
                  canonicalLocationId: encodeCanonicalLocationId('suburb', suburb.id),
                  type: 'suburb',
                  name: suburb.name,
                  slug: suburb.slug,
                  provinceSlug: guide.provinceSlug,
                  citySlug: guide.slug,
                };
                return (
                  <div role="listitem" key={suburb.id}>
                    <CityGuideEntry
                      city={{
                        name: suburb.name,
                        slug: suburb.slug,
                        province: guide.name,
                        provinceSlug: guide.provinceSlug,
                      }}
                      href={buildLocationDiscoveryPath(node)}
                      ariaLabel={`Explore ${suburb.name} suburb guide`}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <div className="city-directory-search">
            <CitySuburbFinder
              guide={guide}
              cityId={record?.id}
              label={`Search suburbs and places`}
              onSelect={place => {
                const href = buildLocationDiscoveryPath(place);
                if (href) navigate(href);
              }}
            />
            <p>
              Search beyond the twelve previews. Johannesburg suburbs appear first; separate Gauteng
              places keep their own guide and search scope.
            </p>
          </div>
        </section>
        <ProvincialBillboard campaign={campaign.data} provinceName={guide.name} />
        <section id="city-living" className="guide-band" aria-labelledby="city-living-heading">
          <div className="guide-section provincial-rail">
            <div className="guide-section-top">
              <div>
                <p className="guide-eyebrow">Beyond the address</p>
                <h2 id="city-living-heading">Make the shortlist work for everyday life</h2>
              </div>
            </div>
            <div className="guide-practical">
              {guide.practical.map((item, i) => (
                <article key={item.title}>
                  <div className="guide-practical-title">
                    {i === 0 ? (
                      <TrainFront size={23} />
                    ) : i === 1 ? (
                      <Building2 size={23} />
                    ) : (
                      <MapPin size={23} />
                    )}
                    <h3>{item.title}</h3>
                  </div>
                  <p>{item.text}</p>
                  <Sources guide={guide} ids={item.sourceIds} />
                </article>
              ))}
            </div>
          </div>
        </section>
        <section
          id="city-questions"
          className="guide-section guide-faq provincial-rail"
          aria-labelledby="city-faq-heading"
        >
          <div>
            <p className="guide-eyebrow">Good to know</p>
            <h2 id="city-faq-heading">Questions about {guide.name}</h2>
            <p>Place names, search scope and a more informed next step.</p>
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
        <section className="guide-section provincial-rail guide-sources">
          <details>
            <summary>
              Sources & how to read this guide <span>Sources checked 15 October 2026</span>
            </summary>
            <p>
              This local-review guide uses official regional, parks and transport references.
              Editorial groupings explain places; they do not define property-search boundaries.
              Generated city scenes illustrate the wider setting and are not photographs of
              individual parks or neighbourhoods. Individual suburb-guide content is a separate
              workstream.
            </p>
            <ul>
              {guide.sources.map(source => (
                <li key={source.id}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.title}
                    <ExternalLink size={12} />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </details>
          <div className="city-parent-link">
            <Link href={`/${guide.provinceSlug}`}>
              <ArrowRight size={14} />
              Back to the {guide.provinceName} guide
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
