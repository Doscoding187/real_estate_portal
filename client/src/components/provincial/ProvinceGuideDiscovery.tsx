import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ChevronDown,
  Compass,
  ExternalLink,
  Home,
  Leaf,
  MapPin,
  TrainFront,
  Trees,
  Waves,
} from 'lucide-react';
import type { ProvinceGuideContent, ProvinceDiscoveryPlace } from '@shared/provinceGuideContent';
import { getCityGuideImage, getProvinceGuideImage } from '@/lib/cityGuideImages';

export interface VerifiedGuideCity {
  name: string;
  slug: string;
  canonicalLocationId: string;
}
const COLLECTION_ICONS = {
  city: Building2,
  leaf: Leaf,
  train: TrainFront,
  home: Home,
  trees: Trees,
  water: Waves,
};

export function GuideSourceLinks({
  ids,
  guide,
}: {
  ids: readonly string[];
  guide: ProvinceGuideContent;
}) {
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

function DiscoveryTabs({
  items,
  active,
  onChange,
  label,
  prefix,
  panelId,
}: {
  items: readonly { id: string; label: string; icon: typeof Home }[];
  active: string;
  onChange: (id: string) => void;
  label: string;
  prefix: string;
  panelId: (id: string) => string;
}) {
  const refs = useRef(new Map<string, HTMLButtonElement>());
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % items.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;
    event.preventDefault();
    const item = items[next];
    onChange(item.id);
    const button = refs.current.get(item.id);
    button?.focus();
    button?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
  }
  return (
    <div className="guide-discovery-tabs" role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button
          type="button"
          key={item.id}
          id={`${prefix}-${item.id}`}
          ref={node => {
            if (node) refs.current.set(item.id, node);
            else refs.current.delete(item.id);
          }}
          role="tab"
          aria-selected={active === item.id}
          aria-controls={panelId(item.id)}
          tabIndex={active === item.id ? 0 : -1}
          onClick={() => onChange(item.id)}
          onKeyDown={event => onKeyDown(event, index)}
        >
          <item.icon size={16} aria-hidden="true" />
          {item.label}
        </button>
      ))}
    </div>
  );
}

function DiscoveryImage({
  guide,
  place,
}: {
  guide: ProvinceGuideContent;
  place: ProvinceDiscoveryPlace;
}) {
  const candidates = [
    getCityGuideImage(guide.slug, place.citySlug),
    getProvinceGuideImage(guide.slug),
  ].filter(
    (item, index, items) =>
      item && items.findIndex(other => other?.thumbnail === item.thumbnail) === index,
  );
  const [failed, setFailed] = useState(0);
  useEffect(() => setFailed(0), [guide.slug, place.citySlug]);
  const image = candidates[failed];
  return (
    <span className="guide-place-image">
      {image ? (
        <img
          src={image.thumbnail}
          srcSet={image.srcSet}
          sizes="(max-width: 640px) 46vw, 210px"
          width="480"
          height="360"
          alt={
            image.scope === 'city'
              ? `AI-generated city scene of ${place.name}`
              : `AI-generated province scene of ${guide.name}`
          }
          loading="lazy"
          onError={() => setFailed(value => value + 1)}
        />
      ) : (
        <Building2 size={38} aria-hidden="true" />
      )}
      <span>{guide.regions.find(region => region.id === place.regionId)?.name}</span>
    </span>
  );
}

function PlaceCard({
  guide,
  place,
  verifiedCities,
  regionFallback = true,
}: {
  guide: ProvinceGuideContent;
  place: ProvinceDiscoveryPlace;
  verifiedCities: readonly VerifiedGuideCity[];
  regionFallback?: boolean;
}) {
  const city = verifiedCities.find(
    item => item.slug === place.citySlug && item.canonicalLocationId,
  );
  const href = city
    ? `/${guide.slug}/${city.slug}`
    : regionFallback
      ? `#region-${place.regionId}`
      : undefined;
  const action = city ? 'Explore guide' : regionFallback ? 'Read region guide' : 'Place to know';
  const content = (
    <>
      <DiscoveryImage guide={guide} place={place} />
      <span className="guide-place-copy">
        <strong>{place.name}</strong>
        <span className="guide-place-caption">{place.caption}</span>
        <span className="guide-place-action">
          {action}
          {href && <ArrowRight size={13} aria-hidden="true" />}
        </span>
      </span>
    </>
  );
  return city ? (
    <Link href={href!} aria-label={`Explore ${place.name} city guide`} className="guide-place-card">
      {content}
    </Link>
  ) : href ? (
    <a
      href={href}
      aria-label={`Read ${guide.regions.find(region => region.id === place.regionId)?.name} guide for ${place.name}`}
      className="guide-place-card"
      onClick={() => {
        if (window.location.hash === href) window.dispatchEvent(new HashChangeEvent('hashchange'));
      }}
    >
      {content}
    </a>
  ) : (
    <div className="guide-place-card guide-place-card--context">{content}</div>
  );
}

function PlaceRow({
  children,
  label,
  refreshKey,
}: {
  children: ReactNode;
  label: string;
  refreshKey: string;
}) {
  const row = useRef<HTMLDivElement>(null);
  const [ends, setEnds] = useState({ start: true, end: true });
  useEffect(() => {
    const element = row.current;
    if (!element) return;
    element.scrollLeft = 0;
    const update = () =>
      setEnds({
        start: element.scrollLeft <= 2,
        end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2,
      });
    update();
    element.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : undefined;
    observer?.observe(element);
    return () => {
      element.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, [refreshKey]);
  function scroll(direction: number) {
    row.current?.scrollBy({
      left: direction * row.current.clientWidth * 0.8,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }
  return (
    <div className="guide-place-collection">
      <div className="guide-row-controls">
        <span>{label}</span>
        <div>
          <button
            type="button"
            aria-label={`Previous ${label.toLowerCase()}`}
            disabled={ends.start}
            onClick={() => scroll(-1)}
          >
            <ArrowLeft size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Next ${label.toLowerCase()}`}
            disabled={ends.end}
            onClick={() => scroll(1)}
          >
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div ref={row} className="guide-place-row" role="list" aria-label={label} tabIndex={0}>
        {children}
      </div>
    </div>
  );
}

export function ProvinceLifestyleDiscovery({
  guide,
  verifiedCities,
}: {
  guide: ProvinceGuideContent;
  verifiedCities: readonly VerifiedGuideCity[];
}) {
  const prefix = useId();
  const [active, setActive] = useState(guide.collections[0].id);
  return (
    <section
      id="discover"
      className="guide-section provincial-rail"
      aria-labelledby="discovery-heading"
    >
      <div className="guide-section-top">
        <div>
          <p className="guide-eyebrow">Find a place that feels like you</p>
          <h2 id="discovery-heading">Discover your side of {guide.name}</h2>
        </div>
        <span className="guide-small-label">Explore by lifestyle</span>
      </div>
      <DiscoveryTabs
        items={guide.collections.map(item => ({
          id: item.id,
          label: item.label,
          icon: COLLECTION_ICONS[item.icon],
        }))}
        active={active}
        onChange={setActive}
        label="Explore by lifestyle"
        prefix={prefix}
        panelId={id => `${prefix}-panel-${id}`}
      />
      {guide.collections.map(collection => (
        <div
          key={collection.id}
          role="tabpanel"
          tabIndex={0}
          id={`${prefix}-panel-${collection.id}`}
          aria-labelledby={`${prefix}-${collection.id}`}
          hidden={active !== collection.id}
        >
          <p className="guide-collection-description">{collection.description}</p>
          {active === collection.id && (
            <PlaceRow label="Places to explore" refreshKey={collection.id}>
              {collection.places.map(place => (
                <div role="listitem" key={place.citySlug}>
                  <PlaceCard place={place} guide={guide} verifiedCities={verifiedCities} />
                </div>
              ))}
            </PlaceRow>
          )}
          <details className="guide-collection-context">
            <summary>
              Why explore these places?
              <ChevronDown size={14} aria-hidden="true" />
            </summary>
            <p>{collection.context}</p>
            <GuideSourceLinks ids={collection.sourceIds} guide={guide} />
          </details>
        </div>
      ))}
      <div className="guide-collection-footer">
        <a href="#cities">
          Explore all city guides <ArrowRight size={14} aria-hidden="true" />
        </a>
        <span>Curated places · Choose a guide to learn more</span>
      </div>
    </section>
  );
}

export function ProvinceRegionDiscovery({
  guide,
  verifiedCities,
}: {
  guide: ProvinceGuideContent;
  verifiedCities: readonly VerifiedGuideCity[];
}) {
  const prefix = useId();
  const [active, setActive] = useState(guide.regions[0].id);
  useEffect(() => {
    function selectHashRegion() {
      const id = window.location.hash.replace(/^#region-/, '');
      if (
        !window.location.hash.startsWith('#region-') ||
        !guide.regions.some(region => region.id === id)
      )
        return;
      setActive(id);
      window.requestAnimationFrame(() =>
        document
          .getElementById(`region-${id}`)
          ?.scrollIntoView?.({ block: 'start', behavior: 'instant' }),
      );
    }
    selectHashRegion();
    window.addEventListener('hashchange', selectHashRegion);
    return () => window.removeEventListener('hashchange', selectHashRegion);
  }, [guide]);
  return (
    <section id="regions" className="guide-band" aria-labelledby="regions-heading">
      <div className="guide-section provincial-rail">
        <div className="guide-section-top">
          <div>
            <p className="guide-eyebrow">Understand the province</p>
            <h2 id="regions-heading">Get to know {guide.name}’s regions</h2>
            <p className="guide-section-description">{guide.introduction}</p>
          </div>
          <span className="guide-small-label">
            <MapPin size={14} aria-hidden="true" /> 3 metros · 2 districts
          </span>
        </div>
        <div className="guide-geography-explainer">
          <Compass size={19} aria-hidden="true" />
          <p>
            Three metropolitan municipalities and two district municipalities form the starting
            point. Familiar labels such as “Johannesburg North”, “the East Rand” and “the Vaal” add
            local context; they are not interchangeable municipal boundaries.
          </p>
          <GuideSourceLinks ids={['geography']} guide={guide} />
        </div>
        <DiscoveryTabs
          items={guide.regions.map(region => ({
            id: region.id,
            label: region.name,
            icon: region.kind === 'District municipality' ? Trees : Building2,
          }))}
          active={active}
          onChange={setActive}
          label="Explore by region"
          prefix={prefix}
          panelId={id => `region-${id}`}
        />
        {guide.regions.map(region => (
          <div
            key={region.id}
            id={`region-${region.id}`}
            role="tabpanel"
            tabIndex={0}
            aria-labelledby={`${prefix}-${region.id}`}
            hidden={active !== region.id}
          >
            <article
              className="guide-chapter guide-region-profile"
              aria-labelledby={`heading-${region.id}`}
            >
              <div className="guide-region-copy">
                <p className="guide-eyebrow">{region.kind}</p>
                <h3 id={`heading-${region.id}`}>{region.name}</h3>
                <p className="guide-region-strapline">{region.strapline}</p>
                {region.paragraphs.map(paragraph => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                <GuideSourceLinks ids={region.sourceIds} guide={guide} />
              </div>
              <div className="guide-region-destinations">
                {active === region.id && (
                  <PlaceRow label={`Places in ${region.name}`} refreshKey={region.id}>
                    {region.places.map(place => (
                      <div role="listitem" key={place.citySlug}>
                        <PlaceCard
                          guide={guide}
                          verifiedCities={verifiedCities}
                          regionFallback={false}
                          place={{ ...place, regionId: region.id, caption: region.strapline }}
                        />
                      </div>
                    ))}
                  </PlaceRow>
                )}
                <aside className="guide-region-consider">
                  <Home size={18} aria-hidden="true" />
                  <div>
                    <strong>When comparing places</strong>
                    <p>{region.consider}</p>
                  </div>
                </aside>
              </div>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
