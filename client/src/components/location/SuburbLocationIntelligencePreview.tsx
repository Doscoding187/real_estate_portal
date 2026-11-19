import { useState } from 'react';
import { Link } from 'wouter';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  Compass,
  Home,
  KeyRound,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { LocationTrendingFeedSection } from '@/components/location/LocationTrendingFeedSection';
import { NearbyAmenitiesMap } from '@/components/location/NearbyAmenitiesMap';
import { SuburbAgencies } from '@/components/location/SuburbAgencies';
import { SuburbDevelopers } from '@/components/location/SuburbDevelopers';
import { areaIllustrationUrl, pickAreaIllustrations } from '@/lib/areaIllustration';
import { SuburbListingAlert } from '@/components/location/SuburbListingAlert';
import { SuburbLocalProfessionals } from '@/components/location/SuburbLocalProfessionals';
import { buildBuySearchUrl, buildPropertySearchUrl } from '@/lib/heroJourneySearch';
import { buildConsumerJourneyUrl } from '@/lib/consumerJourneyRouter';
import { formatZARCompact } from '@/lib/utils';
import {
  SUBURB_GUIDE_EXPLORER_INTRO,
  SUBURB_GUIDE_NEIGHBOURHOODS_INTRO,
  SUBURB_GUIDE_PEOPLE_INTRO,
  SUBURB_GUIDE_SEARCH_RENT_LABEL,
  SUBURB_GUIDE_SEARCH_SALE_LABEL,
  suburbGuideExplorerHeading,
  suburbGuideFaqHeading,
  suburbGuideH1,
  suburbGuideIntro,
  suburbGuideNeighbourhoodsHeading,
  suburbGuidePeopleHeading,
} from '@shared/suburbGuideCopy';
import type { LocationNode } from '@/types/location';
import type { RouterOutputs } from '@/lib/trpc';
import '@/styles/suburb-guide-discovery-preview.css';

type PlaceGuide = NonNullable<RouterOutputs['placeAuthority']['getPlaceGuide']>;

type PreviewIntent = 'explore' | 'buy' | 'rent' | 'invest' | 'developments';
type MarketOptionKey = 'residential' | 'commercial' | 'land' | 'shared_living';

type Props = {
  /** Billboard-ready: when present it replaces the skyline image as the hero background. */
  sponsor?: { imageUrl: string; href: string; alt: string };
  guide: PlaceGuide;
  heroImage?: { hero: string; heroPosition?: string };
  buyEnabled: boolean;
  rentEnabled: boolean;
  developmentsEnabled: boolean;
  /** Curated "where it fits" text; the section renders only when this exists. */
  context?: { label: string; text: string; consider: string };
  developmentsHref?: string;
  faqs: Array<{ question: string; answer: string }>;
  searchLocation: LocationNode;
};

const INTENT_OPTIONS: Array<{
  key: PreviewIntent;
  label: string;
  icon: typeof Compass;
}> = [
  { key: 'explore', label: 'Explore', icon: Compass },
  { key: 'buy', label: 'Buy', icon: Home },
  { key: 'rent', label: 'Rent', icon: KeyRound },
  { key: 'developments', label: 'Developments', icon: Building2 },
  { key: 'invest', label: 'Investment research', icon: TrendingUp },
];

const MARKET_OPTION_COPY: Record<MarketOptionKey, { label: string; description: string }> = {
  residential: { label: 'Residential', description: 'Homes for sale or rent' },
  commercial: { label: 'Commercial', description: 'Offices and commercial space' },
  land: { label: 'Land & plots', description: 'Plots and land for sale' },
  shared_living: { label: 'Shared living', description: 'Rooms and shared homes to rent' },
};

const LISTED_TYPE_NAMES: Record<string, string> = {
  apartment: 'Apartments',
  house: 'Houses',
  townhouse: 'Townhouses',
  cluster_home: 'Cluster homes',
  villa: 'Villas',
};

function metric(value: number | null) {
  return value === null ? '—' : value.toLocaleString('en-ZA');
}

function kmText(distanceKm: number) {
  return distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm).toLocaleString('en-ZA');
}

function deltaText(pct: number | null, suburbName: string) {
  if (pct === null) return null;
  return `${pct === 0 ? '≈' : pct < 0 ? '↓' : '↑'} ${Math.abs(pct)}% vs ${suburbName}`;
}

function lastSegment(path: string | null | undefined) {
  return (path ?? '').split('/').filter(Boolean).pop() ?? '';
}

export function SuburbLocationIntelligencePreview({
  sponsor,
  guide,
  heroImage,
  buyEnabled,
  rentEnabled,
  developmentsEnabled,
  context,
  developmentsHref,
  faqs,
  searchLocation,
}: Props) {
  const { place, stats, neighbourhoods, nearbyMarkets } = guide;
  const suburbName = place.name;
  const canonicalPlaceId = place.id;
  const cityName = place.city?.name ?? null;
  const provinceName = place.province?.name ?? '';
  const cityGuideHref = place.city?.canonicalPath ?? null;
  const provinceHref = place.province?.canonicalPath ?? '/south-africa';
  const regionLabel = cityName ?? provinceName;
  const buyHref = buildBuySearchUrl({ selectedLocations: [searchLocation] });
  const rentHref = buildPropertySearchUrl({
    transactionType: 'to-rent',
    selectedLocations: [searchLocation],
  });
  const searchAreaHref = buyHref;

  const illustrations = pickAreaIllustrations(
    neighbourhoods.map(area => ({
      slug: lastSegment(area.canonicalPath) || area.placeId,
      typeLabel: area.typeLabel,
    })),
  );
  const [intent, setIntent] = useState<PreviewIntent>('explore');
  const [listingTab, setListingTab] = useState<'buy' | 'rent'>(buyEnabled ? 'buy' : 'rent');
  const saleCount = stats.saleCount;
  const rentalCount = stats.rentCount;
  // Development unit types are a separate line: never part of the listing counts or medians.
  const newDevelopmentSale = stats.newDevelopmentHomes?.sale ?? 0;
  const newDevelopmentRent = stats.newDevelopmentHomes?.rent ?? 0;
  const saleMedian = stats.saleMedian;
  const rentMedian = stats.rentMedian;
  const priceSampleMinimum = stats.minimumSample;
  const canShowMarketInsights = saleMedian !== null || rentMedian !== null;
  const snapshotDate = new Date(stats.asOf);
  const marketSnapshotDateLabel = Number.isNaN(snapshotDate.getTime())
    ? null
    : new Intl.DateTimeFormat('en-ZA', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Africa/Johannesburg',
      }).format(snapshotDate);
  const leadingType = stats.typeMix?.find(item => item.propertyType) ?? null;
  const leadingTypeName = leadingType?.propertyType
    ? LISTED_TYPE_NAMES[leadingType.propertyType] || leadingType.propertyType.replace(/_/g, ' ')
    : null;
  const availableOptions = INTENT_OPTIONS.filter(option =>
    option.key === 'buy'
      ? buyEnabled
      : option.key === 'rent'
        ? rentEnabled
        : option.key === 'developments'
          ? developmentsEnabled
          : true,
  );

  const marketOptions: Array<{ key: MarketOptionKey; href: string }> =
    intent === 'buy'
      ? [
          { key: 'residential', href: buyHref },
          {
            key: 'commercial',
            href: buildConsumerJourneyUrl({
              intent: 'buy',
              journey: 'commercial',
              selectedLocations: [searchLocation],
            }),
          },
          {
            key: 'land',
            href: buildConsumerJourneyUrl({
              intent: 'buy',
              journey: 'land',
              selectedLocations: [searchLocation],
            }),
          },
        ]
      : intent === 'rent'
        ? [
            { key: 'residential', href: rentHref },
            {
              key: 'commercial',
              href: buildConsumerJourneyUrl({
                intent: 'rent',
                journey: 'commercial',
                selectedLocations: [searchLocation],
              }),
            },
            {
              key: 'shared_living',
              href: buildConsumerJourneyUrl({
                intent: 'rent',
                journey: 'shared_living',
                selectedLocations: [searchLocation],
              }),
            },
          ]
        : [];

  return (
    <>
      <div className="suburb-guide-breadcrumb-wrap">
        <nav className="suburb-guide-rail suburb-guide-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          {provinceName ? (
            <>
              <Link href={provinceHref}>{provinceName}</Link>
              <span aria-hidden="true">/</span>
            </>
          ) : null}
          {cityName && cityGuideHref ? (
            <>
              <Link href={cityGuideHref}>{cityName}</Link>
              <span aria-hidden="true">/</span>
            </>
          ) : null}
          <span aria-current="page">{suburbName}</span>
        </nav>
      </div>

      <header className="suburb-discovery-hero">
        {sponsor ? (
          <a className="suburb-discovery-hero__bg-link" href={sponsor.href} rel="noopener">
            <img src={sponsor.imageUrl} alt={sponsor.alt} fetchPriority="high" />
          </a>
        ) : heroImage ? (
          <img
            src={heroImage.hero}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            style={{ objectPosition: heroImage.heroPosition }}
          />
        ) : null}
        <div className="suburb-discovery-hero__shade" />
        <div className="suburb-guide-rail suburb-discovery-hero__content">
          <div className="suburb-discovery-hero__topline">
            <p className="suburb-guide-eyebrow">{regionLabel} · Location discovery</p>
          </div>
          <h1>{suburbGuideH1(suburbName)}</h1>
          <p className="suburb-discovery-hero__intro">{suburbGuideIntro(suburbName)}</p>
          <div className="suburb-discovery-hero__scope">
            <span>
              <MapPin size={15} aria-hidden="true" /> {suburbName} property results
            </span>
            <span>{[cityName, provinceName].filter(Boolean).join(', ')}</span>
          </div>
          <div className="suburb-discovery-hero__actions">
            <a className="suburb-guide-hero__action" href="#suburb-discovery-path">
              Choose a direction <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a
              className="suburb-guide-hero__action suburb-guide-hero__action--secondary"
              href="#suburb-discovery-neighbourhoods"
            >
              Explore neighbourhoods
            </a>
          </div>
        </div>
      </header>

      <section
        id="suburb-discovery-path"
        className="suburb-discovery-intent suburb-guide-rail"
        aria-label="Choose a property journey"
      >
        <div className="suburb-discovery-intent__label">
          <span>Looking to...</span>
          <p>Start with what interests you. Change direction whenever you like.</p>
        </div>
        <div className="suburb-discovery-intent__pills" role="group" aria-label="Property journey">
          {availableOptions.map(option => {
            const Icon = option.icon;
            const selected = intent === option.key;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setIntent(option.key);
                  if (option.key === 'buy' || option.key === 'rent') setListingTab(option.key);
                }}
                className={`suburb-discovery-intent__pill${selected ? ' is-selected' : ''}`}
              >
                <Icon size={16} aria-hidden="true" />
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      {intent !== 'explore' ? (
        <section
          className="suburb-discovery-next-steps suburb-guide-rail"
          aria-live="polite"
          aria-labelledby="suburb-discovery-next-steps-title"
        >
          <div className="suburb-discovery-next-steps__intro">
            <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">YOUR NEXT STEP</p>
            <h2 id="suburb-discovery-next-steps-title">
              {intent === 'buy'
                ? `What would you like to buy in ${suburbName}?`
                : intent === 'rent'
                  ? `What would you like to rent in ${suburbName}?`
                  : intent === 'invest'
                    ? `What would you like to research about ${suburbName}?`
                    : `How would you like to explore developments in ${suburbName}?`}
            </h2>
            <p>
              {intent === 'buy' || intent === 'rent'
                ? 'Choose a property market to open matching results for this area. Refine the details on the results page.'
                : intent === 'invest'
                  ? 'Start with available asking-price and supply information.'
                  : 'Browse published projects or meet developers connected to this area.'}
            </p>
          </div>

          {intent === 'buy' || intent === 'rent' ? (
            <div
              className="suburb-discovery-next-steps__types"
              aria-label={`Choose a ${intent === 'buy' ? 'purchase' : 'rental'} market`}
            >
              {marketOptions.map(option => {
                const copy = MARKET_OPTION_COPY[option.key];
                const unavailableBuyCommercial = intent === 'buy' && option.key === 'commercial';
                return unavailableBuyCommercial ? (
                  <span
                    key={option.key}
                    className="suburb-discovery-next-step suburb-discovery-next-step--unavailable"
                    aria-disabled="true"
                    title="Commercial purchase search is not available yet."
                  >
                    <span>
                      {copy.label}
                      <small>Commercial sales search is not available here</small>
                    </span>
                    <span className="suburb-discovery-next-step__status">Not available</span>
                  </span>
                ) : (
                  <Link key={option.key} href={option.href} className="suburb-discovery-next-step">
                    <span>
                      {copy.label}
                      <small>
                        {option.key === 'residential'
                          ? intent === 'buy'
                            ? 'Homes and apartments for sale'
                            : 'Homes and apartments to rent'
                          : copy.description}
                      </small>
                    </span>
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                );
              })}
              <Link
                href="#suburb-discovery-neighbourhoods"
                className="suburb-discovery-next-step suburb-discovery-next-step--quiet"
              >
                Explore neighbourhoods <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          ) : intent === 'invest' ? (
            <div className="suburb-discovery-next-steps__cards">
              <a className="suburb-discovery-next-step" href="#suburb-discovery-market-insights">
                <span>
                  <strong>Compare asking prices</strong>
                  <small>See sale and rental medians when the sample supports them.</small>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </a>
              <a className="suburb-discovery-next-step" href="#suburb-discovery-snapshot">
                <span>
                  <strong>Check published supply</strong>
                  <small>Review current sale and rental counts.</small>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </a>
              <Link
                className="suburb-discovery-next-step suburb-discovery-next-step--quiet"
                href={rentHref}
              >
                <span>
                  <strong>Explore current rentals</strong>
                  <small>Open rental results for this exact area.</small>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="suburb-discovery-next-steps__cards">
              <a className="suburb-discovery-next-step" href="#suburb-discovery-developments">
                <span>
                  <strong>Browse published developments</strong>
                  <small>See projects currently listed in this area.</small>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </a>
              <a
                className="suburb-discovery-next-step suburb-discovery-next-step--quiet"
                href="#suburb-discovery-people"
              >
                <span>
                  <strong>Meet local developers</strong>
                  <small>Find published development teams and local professionals.</small>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </a>
            </div>
          )}
        </section>
      ) : null}

      <main className="suburb-discovery-main suburb-guide-rail">
        <section
          id="suburb-discovery-snapshot"
          className="suburb-discovery-section"
          aria-labelledby="suburb-discovery-snapshot-title"
        >
          <div className="suburb-discovery-section__heading">
            <div>
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">
                {suburbName.toUpperCase()} MARKET SNAPSHOT
              </p>
              <h2 id="suburb-discovery-snapshot-title">Property prices and current supply</h2>
              <p>
                Published asking-price medians and Property Listify listings for this exact area.
              </p>
            </div>
            <div className="suburb-discovery-snapshot__meta">
              {marketSnapshotDateLabel ? (
                <span>Inventory snapshot · {marketSnapshotDateLabel}</span>
              ) : null}
              <span className="suburb-discovery-scope-note">
                <MapPin size={14} aria-hidden="true" /> {suburbName} only
              </span>
            </div>
          </div>

          <div className="suburb-discovery-snapshot-layout">
            <div className="suburb-discovery-snapshot">
              <article className="suburb-discovery-metric">
                <span className="suburb-discovery-metric__icon">
                  <Home size={17} aria-hidden="true" />
                </span>
                <span>Median sale asking price</span>
                <strong>{saleMedian === null ? '—' : formatZARCompact(saleMedian)}</strong>
                <small>
                  {saleMedian === null
                    ? `Shown after ${priceSampleMinimum} eligible priced listings`
                    : `Based on ${stats.salePricedSample.toLocaleString('en-ZA')} priced listings`}
                </small>
              </article>
              <article className="suburb-discovery-metric">
                <span className="suburb-discovery-metric__icon">
                  <KeyRound size={17} aria-hidden="true" />
                </span>
                <span>Median monthly rent</span>
                <strong>{rentMedian === null ? '—' : formatZARCompact(rentMedian)}</strong>
                <small>
                  {rentMedian === null
                    ? `Shown after ${priceSampleMinimum} eligible priced listings`
                    : `Based on ${stats.rentPricedSample.toLocaleString('en-ZA')} priced listings`}
                </small>
              </article>
              <article className="suburb-discovery-metric">
                <span className="suburb-discovery-metric__icon">
                  <TrendingUp size={17} aria-hidden="true" />
                </span>
                <span>Properties for sale</span>
                <strong>{saleCount.toLocaleString('en-ZA')}</strong>
                <small>
                  Current published supply
                  {newDevelopmentSale > 0
                    ? ` + ${newDevelopmentSale.toLocaleString('en-ZA')} new-development ${newDevelopmentSale === 1 ? 'home' : 'homes'}`
                    : ''}
                </small>
              </article>
              <article className="suburb-discovery-metric">
                <span className="suburb-discovery-metric__icon">
                  <CalendarDays size={17} aria-hidden="true" />
                </span>
                <span>Rental properties</span>
                <strong>{rentalCount.toLocaleString('en-ZA')}</strong>
                <small>
                  Current published supply
                  {newDevelopmentRent > 0
                    ? ` + ${newDevelopmentRent.toLocaleString('en-ZA')} new-development ${newDevelopmentRent === 1 ? 'home' : 'homes'}`
                    : ''}
                </small>
              </article>
            </div>
            <aside
              className="suburb-discovery-market-glance"
              aria-labelledby="suburb-discovery-market-glance-title"
            >
              <h3 id="suburb-discovery-market-glance-title">
                <BarChart3 size={16} aria-hidden="true" /> Market at a glance
              </h3>
              {leadingType && leadingTypeName ? (
                <div className="suburb-discovery-market-signal">
                  <span className="suburb-discovery-market-signal__icon">
                    <Check size={15} aria-hidden="true" />
                  </span>
                  <strong>
                    {leadingTypeName} are the most listed · {leadingType.sharePct}% of listings
                  </strong>
                </div>
              ) : null}
            </aside>
          </div>
          <p className="suburb-discovery-data-note">
            Medians use published asking prices, not completed sales. Counts describe Property
            Listify supply, not every home or demand in {suburbName}.
          </p>
        </section>

        <section
          id="suburb-discovery-neighbourhoods"
          className="suburb-discovery-section"
          aria-labelledby="suburb-discovery-neighbourhoods-title"
        >
          <div className="suburb-discovery-section__heading">
            <div>
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">
                EXPLORE NEIGHBOURHOODS
              </p>
              <h2 id="suburb-discovery-neighbourhoods-title">
                {suburbGuideNeighbourhoodsHeading(suburbName)}
              </h2>
              <p>{SUBURB_GUIDE_NEIGHBOURHOODS_INTRO}</p>
            </div>
            {cityName && cityGuideHref ? (
              <Link className="suburb-guide-section-link" href={cityGuideHref}>
                View all neighbourhoods <ArrowRight size={15} aria-hidden="true" />
              </Link>
            ) : null}
          </div>
          {neighbourhoods.length > 0 ? (
            <div
              className="suburb-discovery-neighbourhood-grid"
              role="group"
              tabIndex={0}
              aria-label="Nearby neighbourhoods"
            >
              {neighbourhoods.map((area, areaIndex) => (
                <Link
                  key={area.placeId}
                  href={area.canonicalPath}
                  className="suburb-discovery-neighbourhood-card"
                  aria-label={`Explore ${area.name}`}
                >
                  <span className="suburb-discovery-neighbourhood-card__image">
                    <img
                      src={area.coverImageUrl ?? areaIllustrationUrl(illustrations[areaIndex])}
                      alt=""
                      loading="lazy"
                    />
                  </span>
                  <span className="suburb-discovery-neighbourhood-card__body">
                    <strong>{area.name}</strong>
                    <span>
                      {area.typeLabel} ·{' '}
                      {area.listingCount === 0
                        ? 'No listings yet'
                        : `${area.listingCount.toLocaleString('en-ZA')} ${area.listingCount === 1 ? 'listing' : 'listings'}`}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="suburb-discovery-empty">
              Nearby neighbourhoods are unavailable right now.
            </p>
          )}
          <p className="suburb-discovery-data-note">
            Areas are ordered by proximity to {suburbName}. Choosing one opens its own area page;
            property searches stay within that area.
          </p>
        </section>

        {nearbyMarkets.length > 0 ? (
          <section
            id="suburb-discovery-areas"
            className="suburb-discovery-section"
            aria-labelledby="suburb-discovery-areas-title"
          >
            <div className="suburb-discovery-section__heading">
              <div>
                <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">NEARBY MARKETS</p>
                <h2 id="suburb-discovery-areas-title">Compare markets near {suburbName}</h2>
                <p>
                  See how published property supply compares in nearby markets outside {suburbName}.
                </p>
              </div>
            </div>
            <div
              className="suburb-discovery-market-comparison-grid"
              role="group"
              tabIndex={0}
              aria-label="Nearby markets"
            >
              {nearbyMarkets.map(market => {
                const medianDelta = deltaText(market.deltas.saleMedianPct, suburbName);
                const perM2Delta = deltaText(market.deltas.pricePerM2Pct, suburbName);
                const noListings = market.saleCount + market.rentCount === 0;
                return (
                  <Link
                    key={market.placeId}
                    href={market.canonicalPath}
                    className="suburb-discovery-market-comparison-card"
                  >
                    <span className="suburb-discovery-market-comparison-card__body">
                      <span className="suburb-discovery-market-comparison-card__scope">
                        {market.levelLabel}
                      </span>
                      <strong>{market.name}</strong>
                      <span
                        className="suburb-discovery-market-comparison-card__distance"
                        aria-hidden={market.distanceKm == null ? true : undefined}
                      >
                        {market.distanceKm != null
                          ? `≈ ${kmText(market.distanceKm)} km from ${suburbName}`
                          : ' '}
                      </span>
                      <span className="suburb-discovery-market-comparison-card__row">
                        <span>Median asking price</span>
                        <b>
                          {market.saleMedian === null
                            ? 'Not enough data yet'
                            : `${formatZARCompact(market.saleMedian)}${medianDelta ? ` · ${medianDelta}` : ''}`}
                        </b>
                      </span>
                      <span className="suburb-discovery-market-comparison-card__row">
                        <span>Price per m²</span>
                        <b>
                          {market.salePricePerM2Median === null
                            ? 'Not enough data yet'
                            : `${formatZARCompact(market.salePricePerM2Median)}${perM2Delta ? ` · ${perM2Delta}` : ''}`}
                        </b>
                      </span>
                      <span className="suburb-discovery-market-comparison-card__row">
                        <span>Listings</span>
                        <b>
                          {noListings
                            ? 'No listings yet'
                            : `${metric(market.saleCount)} for sale · ${metric(market.rentCount)} to rent`}
                        </b>
                        <small>
                          {suburbName}: {metric(saleCount)} for sale · {metric(rentalCount)} to rent
                        </small>
                      </span>
                      <span className="suburb-discovery-market-comparison-card__link">
                        Explore this market <ArrowRight size={13} aria-hidden="true" />
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
            <p className="suburb-discovery-data-note">
              Listing counts reflect current published inventory in each linked market; they are not
              measures of demand.
            </p>
          </section>
        ) : null}

        {intent === 'explore' || intent === 'invest' ? (
          <section
            id="suburb-discovery-opportunities"
            className="suburb-discovery-section suburb-discovery-opportunities"
            aria-labelledby="suburb-discovery-opportunities-title"
          >
            <div className="suburb-discovery-section__heading">
              <div>
                <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">
                  DISCOVER OPPORTUNITIES
                </p>
                <h2 id="suburb-discovery-opportunities-title">
                  {intent === 'explore'
                    ? 'Where would you like to start?'
                    : `Research ${suburbName}`}
                </h2>
                <p>
                  {intent === 'invest'
                    ? 'Review current published asking prices and rental supply when the available sample supports it.'
                    : 'Explore published opportunities for this exact area.'}
                </p>
              </div>
            </div>

            {intent === 'explore' ? (
              <div className="suburb-discovery-start-grid">
                {availableOptions
                  .filter(option => option.key !== 'explore')
                  .map(option => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          setIntent(option.key);
                          if (option.key === 'buy' || option.key === 'rent')
                            setListingTab(option.key);
                        }}
                        className="suburb-discovery-start-card"
                      >
                        <span>
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <strong>{option.label}</strong>
                        <small>
                          {option.key === 'invest'
                            ? 'Review current supply and asking-price data'
                            : option.key === 'developments'
                              ? 'Explore published projects in this area'
                              : `See homes ${option.key === 'buy' ? 'for sale' : 'to rent'} in ${suburbName}`}
                        </small>
                        <ArrowRight size={15} aria-hidden="true" />
                      </button>
                    );
                  })}
              </div>
            ) : canShowMarketInsights ? (
              <div id="suburb-discovery-market-insights">
                <div className="suburb-discovery-snapshot">
                  <article className="suburb-discovery-metric">
                    <span>Median sale asking price</span>
                    <strong>{saleMedian === null ? '—' : formatZARCompact(saleMedian)}</strong>
                    <small>
                      {saleMedian === null
                        ? `Shown after ${priceSampleMinimum} eligible priced listings`
                        : `Based on ${stats.salePricedSample.toLocaleString('en-ZA')} priced listings`}
                    </small>
                  </article>
                  <article className="suburb-discovery-metric">
                    <span>Median monthly rent</span>
                    <strong>{rentMedian === null ? '—' : formatZARCompact(rentMedian)}</strong>
                    <small>
                      {rentMedian === null
                        ? `Shown after ${priceSampleMinimum} eligible priced listings`
                        : `Based on ${stats.rentPricedSample.toLocaleString('en-ZA')} priced listings`}
                    </small>
                  </article>
                  <article className="suburb-discovery-metric">
                    <span>Median price per m²</span>
                    <strong>
                      {stats.salePricePerM2Median === null
                        ? '—'
                        : formatZARCompact(stats.salePricePerM2Median)}
                    </strong>
                    <small>
                      {stats.salePricePerM2Median === null
                        ? `Shown after ${priceSampleMinimum} listings with a size and price`
                        : `Based on ${stats.salePricePerM2Sample.toLocaleString('en-ZA')} listings`}
                    </small>
                  </article>
                </div>
                <p className="suburb-discovery-data-note">
                  Figures use published asking prices. They do not report completed-sale values,
                  price growth, buyer demand or rental returns.
                </p>
              </div>
            ) : (
              <div
                id="suburb-discovery-market-insights"
                className="suburb-discovery-empty suburb-discovery-empty--insights"
                role="status"
              >
                <BarChart3 size={23} aria-hidden="true" />
                <div>
                  <strong>Verified market comparisons aren’t available yet.</strong>
                  <p>
                    We show a median only when at least {priceSampleMinimum} eligible priced
                    listings support the group. No published listings currently support a comparison
                    for {suburbName}, so this page makes no growth, demand or rental-return claims.
                  </p>
                </div>
              </div>
            )}
          </section>
        ) : null}

        {developmentsEnabled ? (
          <section
            id="suburb-discovery-developments"
            className="suburb-discovery-section suburb-discovery-development-showcase"
            aria-labelledby="suburb-discovery-developments-title"
          >
            <div className="suburb-discovery-section__heading">
              <div>
                <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">
                  DEVELOPMENT SHOWCASE
                </p>
                <h2 id="suburb-discovery-developments-title">New developments in {suburbName}</h2>
                <p>Explore published projects and new places to live or invest in {suburbName}.</p>
              </div>
              {developmentsHref ? (
                <Link className="suburb-guide-section-link" href={developmentsHref}>
                  See all developments <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ) : null}
            </div>
            <div className="suburb-discovery-feed">
              <LocationTrendingFeedSection
                sectionId="suburb-discovery-development-feed"
                locationName={suburbName}
                canonicalPlaceId={canonicalPlaceId}
                tab="developments"
                maxItems={6}
                cardLayout="wide"
                requirePhotoReadyDevelopments
                showHeading={false}
                sectionClassName="suburb-discovery-feed__section suburb-discovery-development-showcase__feed"
              />
            </div>
          </section>
        ) : null}

        {buyEnabled || rentEnabled ? (
          <section
            id="suburb-discovery-properties"
            className="suburb-discovery-section suburb-discovery-opportunities"
            aria-labelledby="suburb-discovery-properties-title"
          >
            <div className="suburb-discovery-section__heading">
              <div>
                <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">
                  PUBLISHED LISTINGS
                </p>
                <h2 id="suburb-discovery-properties-title">Properties in {suburbName}</h2>
                <p>Browse published homes in this area. Choose sale or rental listings.</p>
              </div>
              <Link
                className="suburb-guide-section-link"
                href={listingTab === 'buy' ? buyHref : rentHref}
              >
                {listingTab === 'buy'
                  ? SUBURB_GUIDE_SEARCH_SALE_LABEL
                  : SUBURB_GUIDE_SEARCH_RENT_LABEL}{' '}
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <div
              className="suburb-discovery-listing-tabs"
              role="group"
              aria-label="Property listing type"
            >
              {buyEnabled ? (
                <button
                  type="button"
                  aria-pressed={listingTab === 'buy'}
                  onClick={() => setListingTab('buy')}
                  className={`suburb-discovery-listing-tab${listingTab === 'buy' ? ' is-selected' : ''}`}
                >
                  For sale
                </button>
              ) : null}
              {rentEnabled ? (
                <button
                  type="button"
                  aria-pressed={listingTab === 'rent'}
                  onClick={() => setListingTab('rent')}
                  className={`suburb-discovery-listing-tab${listingTab === 'rent' ? ' is-selected' : ''}`}
                >
                  To rent
                </button>
              ) : null}
            </div>
            <div className="suburb-discovery-feed">
              <LocationTrendingFeedSection
                sectionId={`suburb-discovery-${listingTab}`}
                locationName={suburbName}
                canonicalPlaceId={canonicalPlaceId}
                tab={listingTab}
                maxItems={8}
                cardLayout="carousel"
                sectionClassName="suburb-discovery-feed__section"
                headingTitle={
                  listingTab === 'buy'
                    ? `Homes for sale in ${suburbName}`
                    : `Homes to rent in ${suburbName}`
                }
                headingDescription="Only published listings in this area are shown."
              />
              {(listingTab === 'buy' ? saleCount === 0 : rentalCount === 0) ? (
                <div className="suburb-discovery-empty-cta">
                  <div>
                    <strong>
                      No {listingTab === 'buy' ? 'homes for sale' : 'rentals'} are published in{' '}
                      {suburbName} right now.
                    </strong>
                    <p>
                      Compare another area
                      {cityName ? `, search all of ${cityName}` : ''}, or get an alert when listings
                      appear.
                    </p>
                  </div>
                  {cityName ? (
                    <Link href={searchAreaHref}>
                      Search {suburbName} <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  ) : null}
                  <SuburbListingAlert suburbName={suburbName} canonicalPlaceId={canonicalPlaceId} />
                </div>
              ) : (
                <SuburbListingAlert
                  variant="inline"
                  suburbName={suburbName}
                  canonicalPlaceId={canonicalPlaceId}
                />
              )}
            </div>
          </section>
        ) : null}

        <section
          className="suburb-discovery-section"
          aria-labelledby="suburb-discovery-intelligence-title"
        >
          <div className="suburb-discovery-section__heading">
            <div>
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">LOCATION EXPLORER</p>
              <h2 id="suburb-discovery-intelligence-title">
                {suburbGuideExplorerHeading(suburbName)}
              </h2>
              <p>{SUBURB_GUIDE_EXPLORER_INTRO}</p>
            </div>
          </div>
          {place.centre ? (
            <NearbyAmenitiesMap
              center={[place.centre.lat, place.centre.lng]}
              radius={10}
              mapHeight={330}
              showControls={false}
              locationOverviewLabel={suburbName}
              className="suburb-discovery-map"
            />
          ) : (
            <p className="suburb-discovery-empty">
              A verified map centre is unavailable for this area.
            </p>
          )}
        </section>

        {context ? (
          <section
            className="suburb-discovery-context suburb-discovery-section"
            aria-labelledby="suburb-discovery-context-title"
          >
            <div>
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">
                {regionLabel} · {context.label}
              </p>
              <h2 id="suburb-discovery-context-title">
                Where {suburbName} fits in {regionLabel}
              </h2>
              <p>{context.text}</p>
              <p>{context.consider}</p>
              <p className="suburb-discovery-context__scope">
                Property results remain scoped to {suburbName}; regional context does not add other
                suburbs.
              </p>
            </div>
          </section>
        ) : null}

        <section
          id="suburb-discovery-people"
          className="suburb-discovery-section suburb-discovery-people"
          aria-labelledby="suburb-discovery-people-title"
        >
          <div className="suburb-discovery-section__heading">
            <div>
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">LOCAL CONNECTIONS</p>
              <h2 id="suburb-discovery-people-title">{suburbGuidePeopleHeading(suburbName)}</h2>
              <p>{SUBURB_GUIDE_PEOPLE_INTRO}</p>
            </div>
          </div>
          <SuburbDevelopers
            suburbName={suburbName}
            cityName={regionLabel}
            provinceName={provinceName}
            canonicalPlaceId={canonicalPlaceId}
            viewAllDevelopmentsHref={developmentsHref}
          />
          <SuburbAgencies canonicalPlaceId={canonicalPlaceId} suburbName={suburbName} />
          <SuburbLocalProfessionals canonicalPlaceId={canonicalPlaceId} suburbName={suburbName} />
        </section>

        <section className="suburb-discovery-section" aria-labelledby="suburb-discovery-faq-title">
          <div className="suburb-discovery-section__heading">
            <div>
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">
                LOCATION INTELLIGENCE
              </p>
              <h2 id="suburb-discovery-faq-title">{suburbGuideFaqHeading(suburbName)}</h2>
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
          {cityName && cityGuideHref ? (
            <div className="suburb-discovery-next-link">
              <Link href={cityGuideHref}>
                Explore the {cityName} guide <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
