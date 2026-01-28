/**
 * Structured Data Component
 *
 * Provides Schema.org JSON-LD structured data for the Advertise With Us page:
 * - WebPage markup
 * - Service markup for advertising platform
 * - Organization markup
 * - BreadcrumbList markup
 */

import { Helmet } from 'react-helmet-async';

interface StructuredDataProps {
  pageUrl?: string;
  organizationName?: string;
  organizationUrl?: string;
  organizationLogo?: string;
}

export function StructuredData({
  pageUrl = 'https://platform.com/advertise',
  organizationName = 'Property Platform',
  organizationUrl = 'https://platform.com',
  organizationLogo = 'https://platform.com/logo.png',
}: StructuredDataProps) {
  // WebPage Schema
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: 'Advertise With Us',
    description:
      "Advertising opportunities for property professionals on South Africa's leading property platform",
    inLanguage: 'en-ZA',
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${organizationUrl}#website`,
      url: organizationUrl,
      name: organizationName,
    },
    breadcrumb: {
      '@id': `${pageUrl}#breadcrumb`,
    },
    potentialAction: {
      '@type': 'ReadAction',
      target: [pageUrl],
    },
  };

  // Service Schema
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${pageUrl}#service`,
    name: 'Property Advertising Platform',
    description:
      'Comprehensive advertising solutions for property developers, estate agents, banks, bond originators, and service providers',
    provider: {
      '@type': 'Organization',
      '@id': `${organizationUrl}#organization`,
      name: organizationName,
      url: organizationUrl,
      logo: {
        '@type': 'ImageObject',
        url: organizationLogo,
      },
    },
    serviceType: 'Property Advertising',
    areaServed: {
      '@type': 'Country',
      name: 'South Africa',
    },
    audience: {
      '@type': 'Audience',
      audienceType: 'Property Professionals',
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'ZAR',
      availability: 'https://schema.org/InStock',
      offerCount: 4,
      offers: [
        {
          '@type': 'Offer',
          name: 'Agent Plans',
          description: 'Advertising plans for estate agents',
        },
        {
          '@type': 'Offer',
          name: 'Developer Plans',
          description: 'Advertising plans for property developers',
        },
        {
          '@type': 'Offer',
          name: 'Bank/Loan Provider Plans',
          description: 'Advertising plans for financial institutions',
        },
        {
          '@type': 'Offer',
          name: 'Service Provider Plans',
          description: 'Advertising plans for property service providers',
        },
      ],
    },
  };

  // Organization Schema
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${organizationUrl}#organization`,
    name: organizationName,
    url: organizationUrl,
    logo: {
      '@type': 'ImageObject',
      url: organizationLogo,
      width: 250,
      height: 60,
    },
    description:
      "South Africa's leading property platform connecting buyers, sellers, and property professionals",
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'ZA',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Sales',
      availableLanguage: ['English', 'Afrikaans'],
    },
  };

  // BreadcrumbList Schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: organizationUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Advertise With Us',
        item: pageUrl,
      },
    ],
  };

  return (
    <Helmet>
      {/* WebPage Schema */}
      <script type="application/ld+json">{JSON.stringify(webPageSchema)}</script>

      {/* Service Schema */}
      <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>

      {/* Organization Schema */}
      <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>

      {/* BreadcrumbList Schema */}
      <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
    </Helmet>
  );
}
