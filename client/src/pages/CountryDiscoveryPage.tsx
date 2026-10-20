import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Footer } from '@/components/Footer';
import { MetaControl } from '@/components/seo/MetaControl';
import { toAbsoluteUrl } from '@/lib/seo/structuredData';
import {
  COUNTRY_DISCOVERY_DESCRIPTION,
  COUNTRY_DISCOVERY_PATH,
  COUNTRY_DISCOVERY_TITLE,
  COUNTRY_PROVINCES,
} from '@shared/countryDiscovery';

/**
 * The national entry point for location discovery.
 *
 * It is the one page above the province guides. Its job is to help someone decide where to
 * start and to hand them to the province guide for the place they are considering, so it
 * carries the province directory and the ladder rather than a list of every address.
 */
export default function CountryDiscoveryPage() {
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
            '@type': 'ItemList',
            name: 'South African provinces',
            itemListElement: COUNTRY_PROVINCES.map((province, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: province.name,
              url: toAbsoluteUrl(province.path),
            })),
          },
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
              <h1>Property for sale in South Africa</h1>
              <p>
                Most people start with the province they are considering, not with a list of every
                address in the country. Choose a province to read its guide, then narrow to a city,
                then to a suburb. Each level explains what the place is actually like and what to
                weigh up before you search.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm font-bold">
              <Link className="provincial-section__link" href="/property-for-sale" rel="nofollow">
                See property for sale <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section
          className="provincial-section provincial-section--tinted"
          aria-labelledby="country-provinces-heading"
        >
          <div className="provincial-rail">
            <div className="provincial-section__heading">
              <div>
                <h2 id="country-provinces-heading">Choose a province</h2>
                <p>Nine provinces. Start with the one that matches where you are looking.</p>
              </div>
            </div>
            <ul className="country-province-list" role="list">
              {COUNTRY_PROVINCES.map(province => (
                <li key={province.slug} className="country-province-card">
                  <Link href={province.path}>
                    <strong>{province.name}</strong>
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                  <p>{province.description}</p>
                  {province.areas.length ? (
                    <p className="country-province-card__areas">{province.areas.join(' · ')}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          className="provincial-rail provincial-section"
          aria-labelledby="country-ladder-heading"
        >
          <div className="provincial-section__heading">
            <div>
              <p className="provincial-eyebrow">How it fits together</p>
              <h2 id="country-ladder-heading">Province, then city, then suburb</h2>
            </div>
          </div>
          <div className="provincial-trust">
            <article className="provincial-trust__card">
              <h3>Province</h3>
              <p>
                Gives you the shape of the area and the towns inside it, with the differences that
                matter when you compare them.
              </p>
            </article>
            <article className="provincial-trust__card">
              <h3>City</h3>
              <p>
                Compares the parts of a city and points to the suburbs worth a closer look before
                you start a search.
              </p>
            </article>
            <article className="provincial-trust__card">
              <h3>Suburb</h3>
              <p>
                The local view: what is published there, what the numbers mean, and what is around
                it.
              </p>
            </article>
          </div>
          <p className="provincial-section__link-note">
            Guides and property results are separate. A guide explains a place; a search returns the
            homes, rentals and new developments published for the exact area you chose.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
