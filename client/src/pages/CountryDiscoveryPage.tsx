import { useLocation } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Footer } from '@/components/Footer';
import { LocationAutosuggest } from '@/components/LocationAutosuggest';
import { MetaControl } from '@/components/seo/MetaControl';
import { buildLocationDiscoveryPath } from '@/lib/locationDiscovery';
import { toAbsoluteUrl } from '@/lib/seo/structuredData';
import {
  COUNTRY_DISCOVERY_DESCRIPTION,
  COUNTRY_DISCOVERY_PATH,
  COUNTRY_DISCOVERY_TITLE,
} from '@shared/countryDiscovery';

/** National entry point; every Place link comes from the admitted URL projection. */
export default function CountryDiscoveryPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="provincial-page pt-16">
      <ListingNavbar neutralSearch />
      <MetaControl
        title={COUNTRY_DISCOVERY_TITLE}
        description={COUNTRY_DISCOVERY_DESCRIPTION}
        canonicalUrl={toAbsoluteUrl(COUNTRY_DISCOVERY_PATH)}
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: toAbsoluteUrl('/') },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'South Africa',
                item: toAbsoluteUrl(COUNTRY_DISCOVERY_PATH),
              },
            ],
          },
        ]}
      />

      <main id="main-content" tabIndex={-1} className="provincial-main">
        <section className="provincial-rail provincial-section">
          <div className="provincial-section__heading">
            <div>
              <p className="provincial-eyebrow">South Africa</p>
              <h1>Find a place to search</h1>
              <p>Search South African provinces, cities, towns, suburbs and areas.</p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm font-bold">
              <a className="provincial-section__link" href="/property-for-sale">
                Search homes for sale <ArrowRight size={15} aria-hidden="true" />
              </a>
              <a className="provincial-section__link" href="/property-to-rent">
                Search rentals <ArrowRight size={15} aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="mt-8 max-w-2xl">
            <LocationAutosuggest
              placeholder="Search a province, city, town, suburb, or locality"
              onSelect={place => {
                const path = buildLocationDiscoveryPath(place);
                if (path) setLocation(path);
              }}
            />
          </div>
        </section>

        <section className="provincial-rail provincial-section provincial-section--tinted">
          <div className="provincial-section__heading">
            <div>
              <p className="provincial-eyebrow">Browse by place</p>
              <h2>Search within the place you choose</h2>
              <p>Pick a province, city, town or suburb to open its page and search homes there.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
