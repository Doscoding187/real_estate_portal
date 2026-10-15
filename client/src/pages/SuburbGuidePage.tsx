import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Building2, MapPin } from 'lucide-react';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Footer } from '@/components/Footer';
import { MetaControl } from '@/components/seo/MetaControl';
import {
  LocationTrendingFeedSection,
  type FeedTab,
} from '@/components/location/LocationTrendingFeedSection';
import { trpc } from '@/lib/trpc';
import {
  buildBuySearchUrl,
  buildDevelopmentsSearchUrl,
  buildPropertySearchUrl,
} from '@/lib/heroJourneySearch';
import { getCityGuideImage } from '@/lib/cityGuideImages';
import { toAbsoluteUrl } from '@/lib/seo/structuredData';
import { encodeCanonicalLocationId } from '@shared/locationAuthority';
import { getCityGuideContent } from '@shared/cityGuideContent';
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
  const [activeTab, setActiveTab] = useState<FeedTab>('buy');
  const [imageFailed, setImageFailed] = useState(false);
  const suburbQuery = trpc.locationPages.getSuburbData.useQuery(
    { provinceSlug, citySlug, suburbSlug, includeInventoryPreview: false },
    { retry: false, staleTime: 300000 },
  );

  const suburb = suburbQuery.data?.suburb;
  const isCanonicalSuburb =
    suburb?.slug === suburbSlug &&
    suburb.citySlug === citySlug &&
    suburb.provinceSlug === provinceSlug;
  const verifiedSuburb = isCanonicalSuburb ? suburb : undefined;
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
        <section
          id="suburb-inventory"
          className="suburb-guide-inventory"
          aria-label={`Live property in ${verifiedSuburb.name}`}
        >
          <div className="suburb-guide-section-heading">
            <div>
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">LIVE PROPERTY</p>
              <p>Switch between homes to buy, rentals and new development opportunities.</p>
            </div>
          </div>

          <div className="suburb-guide-inventory-grid">
            <div className="suburb-guide-inventory-main">
              <LocationTrendingFeedSection
                locationName={verifiedSuburb.name}
                province={verifiedSuburb.provinceName}
                city={verifiedSuburb.cityName}
                suburb={verifiedSuburb.name}
                maxItems={8}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                neutralMode={false}
                visibleTabs={['buy', 'rent', 'developments']}
                viewAllHref={viewAllHref}
                standardizeDevelopmentUnitCards
                cardLayout="wide"
                requirePhotoReadyDevelopments
              />
              <p className="suburb-guide-inventory-note">
                Eligible off-plan homes appear in the Buy or Rentals journey as homes for sale or
                rent. Open a property to see its development details; the New developments tab lists
                projects.
              </p>
            </div>

            <aside
              className="suburb-guide-area-card"
              aria-label={`${verifiedSuburb.name} area details`}
            >
              <span className="suburb-guide-area-card__icon">
                <Building2 size={20} aria-hidden="true" />
              </span>
              <p className="suburb-guide-eyebrow suburb-guide-eyebrow--blue">THIS AREA</p>
              <h2>{verifiedSuburb.name}</h2>
              <p className="suburb-guide-area-card__location">
                {verifiedSuburb.cityName}, {verifiedSuburb.provinceName}
              </p>
              <span className="suburb-guide-scope-note">
                <MapPin size={15} aria-hidden="true" /> {verifiedSuburb.name} only
              </span>
              <p>
                Explore property and project previews in this neighbourhood. Other{' '}
                {verifiedSuburb.cityName} areas stay out of these results unless you choose to
                explore them.
              </p>
              <Link className="suburb-guide-area-card__secondary" href={guideUrl}>
                Explore {verifiedSuburb.cityName} <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </aside>
          </div>
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

function SuburbGuideShell({ children }: { children: ReactNode }) {
  return (
    <div className="suburb-guide-page">
      <ListingNavbar neutralSearch />
      {children}
      <Footer />
    </div>
  );
}
