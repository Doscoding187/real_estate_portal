import { useMemo, type ReactNode } from 'react';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Footer } from '@/components/Footer';
import { MetaControl } from '@/components/seo/MetaControl';
import { SuburbLocationIntelligencePreview } from '@/components/location/SuburbLocationIntelligencePreview';
import { trpc, type RouterOutputs } from '@/lib/trpc';
import { formatZARCompact } from '@/lib/utils';
import { isHomepageHeroJourneyEnabled } from '@/lib/publicNavigation';
import { buildDevelopmentsSearchUrl } from '@/lib/heroJourneySearch';
import { placeGuideHeroImage } from '@/lib/placeGuideImage';
import { placePageDescription, placePageTitle } from '@shared/placePageSeo';
import type { LocationNode } from '@/types/location';
import '@/styles/suburb-guide.css';

type ResolvedPlace = NonNullable<RouterOutputs['placeAuthority']['resolveCanonicalUrl']>;
type PlaceGuide = NonNullable<RouterOutputs['placeAuthority']['getPlaceGuide']>;

type SuburbGuidePageProps = {
  place: ResolvedPlace;
  /** Place-page indexability (thin pages stay out of search engines). */
  indexable: boolean;
  /** Rendered when the place has no guide data (unknown or unsupported place). */
  fallback: ReactNode;
};

function lastSegment(path: string | null | undefined) {
  return (path ?? '').split('/').filter(Boolean).pop() ?? '';
}

function buildFaqs(guide: PlaceGuide) {
  const name = guide.place.name;
  const { stats } = guide;
  const region = [guide.place.city?.name, guide.place.province?.name].filter(Boolean).join(', ');
  const sample = stats.minimumSample.toLocaleString('en-ZA');
  const plural = (count: number) => (count === 1 ? 'listing' : 'listings');

  const priceParts: string[] = [];
  if (stats.saleMedian !== null) {
    priceParts.push(
      `The median asking price for sale listings is ${formatZARCompact(stats.saleMedian)}, based on ${stats.salePricedSample.toLocaleString('en-ZA')} priced listings.`,
    );
  } else if (stats.salePricedSample > 0) {
    priceParts.push(
      `A median sale asking price is shown once at least ${sample} sale listings carry a price; ${stats.salePricedSample.toLocaleString('en-ZA')} are priced so far.`,
    );
  } else {
    priceParts.push('No sale listings with a published asking price are recorded right now.');
  }
  if (stats.rentMedian !== null) {
    priceParts.push(
      `The median monthly rent is ${formatZARCompact(stats.rentMedian)}, based on ${stats.rentPricedSample.toLocaleString('en-ZA')} priced rentals.`,
    );
  } else if (stats.rentPricedSample > 0) {
    priceParts.push(
      `A median rent is shown once at least ${sample} rentals carry a price; ${stats.rentPricedSample.toLocaleString('en-ZA')} are priced so far.`,
    );
  }

  return [
    {
      question: `Where is ${name}?`,
      answer: `${name} is ${region ? `in ${region}` : 'in South Africa'}. This guide covers homes for sale, rentals and new developments published for this exact area on Property Listify.`,
    },
    {
      question: `How many homes are for sale in ${name}?`,
      answer:
        stats.saleCount > 0
          ? `Property Listify currently publishes ${stats.saleCount.toLocaleString('en-ZA')} eligible ${plural(stats.saleCount)} for sale in ${name}.`
          : `No eligible listings for sale are published for ${name} right now. New listings can appear at any time.`,
    },
    {
      question: `How many homes are available to rent in ${name}?`,
      answer:
        stats.rentCount > 0
          ? `Property Listify currently publishes ${stats.rentCount.toLocaleString('en-ZA')} eligible ${plural(stats.rentCount)} to rent in ${name}.`
          : `No eligible rental listings are published for ${name} right now. New listings can appear at any time.`,
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
      answer: `Use the listing alert in the Properties in ${name} section of this page to save a weekly search for ${name}. You can choose email and in-app notifications, and manage saved searches from your dashboard.`,
    },
  ];
}

export default function SuburbGuidePage({ place, indexable, fallback }: SuburbGuidePageProps) {
  const guideQuery = trpc.placeAuthority.getPlaceGuide.useQuery(
    { canonicalPlaceId: place.placeId },
    { retry: false, staleTime: 300_000 },
  );
  const guide = guideQuery.data;
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  const faqs = useMemo(() => (guide ? buildFaqs(guide) : []), [guide]);
  const heroImage = useMemo(
    () =>
      guide
        ? placeGuideHeroImage({
            placePath: guide.place.canonicalPath,
            cityPath: guide.place.city?.canonicalPath,
            provincePath: guide.place.province?.canonicalPath,
          })
        : undefined,
    [guide],
  );

  if (guideQuery.isLoading) {
    return (
      <SuburbGuideShell>
        <div
          className="suburb-guide-loading"
          role="status"
          aria-label={`Loading ${place.label} guide`}
        >
          <span className="suburb-guide-loading__hero" />
          <span className="suburb-guide-loading__line" />
          <span className="suburb-guide-loading__panel" />
        </div>
      </SuburbGuideShell>
    );
  }

  if (guideQuery.isError || !guide) {
    return <SuburbGuideShell>{fallback}</SuburbGuideShell>;
  }

  const searchLocation: LocationNode = {
    canonicalPlaceId: guide.place.id,
    slug: lastSegment(guide.place.canonicalPath),
    name: guide.place.name,
    type: 'suburb',
    provinceSlug: lastSegment(guide.place.province?.canonicalPath) || undefined,
    citySlug: lastSegment(guide.place.city?.canonicalPath) || undefined,
    parentCanonicalPlaceId: guide.place.city?.placeId,
    canonicalPath: guide.place.canonicalPath,
  };

  return (
    <SuburbGuideShell>
      <MetaControl
        key="seo"
        title={placePageTitle(place.label)}
        description={placePageDescription(place.label, place.provinceName)}
        canonicalUrl={origin + place.path}
        image={origin + (heroImage?.hero ?? '/og-image.png')}
        forceNoIndex={!indexable}
      />
      <SuburbLocationIntelligencePreview
        guide={guide}
        heroImage={heroImage}
        searchLocation={searchLocation}
        developmentsHref={buildDevelopmentsSearchUrl({ canonicalPlaceId: guide.place.id })}
        faqs={faqs}
        buyEnabled={isHomepageHeroJourneyEnabled('buy')}
        rentEnabled={isHomepageHeroJourneyEnabled('rent')}
        developmentsEnabled={isHomepageHeroJourneyEnabled('developments')}
      />
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
