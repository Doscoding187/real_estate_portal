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
import { toAbsoluteUrl } from '@/lib/seo/structuredData';

interface StructuredDataProps {
  pageUrl?: string;
  organizationName?: string;
  organizationUrl?: string;
  organizationLogo?: string;
}

export function StructuredData({
  pageUrl = 'https://www.propertylistifysa.co.za/advertise',
  organizationName = 'Property Listify',
  organizationUrl = 'https://www.propertylistifysa.co.za',
  organizationLogo = 'https://www.propertylistifysa.co.za/logo.png',
}: StructuredDataProps) {
  const resolvedPageUrl = toAbsoluteUrl(pageUrl);
  const resolvedOrganizationUrl = toAbsoluteUrl(organizationUrl);
  const resolvedOrganizationLogo = toAbsoluteUrl(organizationLogo);

  // WebPage Schema
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${resolvedPageUrl}#webpage`,
    url: resolvedPageUrl,
    name: 'Advertise With Us',
    description:
      "Advertising opportunities for property professionals on South Africa's leading property platform",
    inLanguage: 'en-ZA',
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${resolvedOrganizationUrl}#website`,
      url: resolvedOrganizationUrl,
      name: organizationName,
    },
    breadcrumb: {
      '@id': `${resolvedPageUrl}#breadcrumb`,
    },
    potentialAction: {
      '@type': 'ReadAction',
      target: [resolvedPageUrl],
    },
  };

  // Service Schema
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${resolvedPageUrl}#service`,
    name: 'Property Advertising Platform',
    description:
      'Comprehensive advertising solutions for property developers, estate agents, banks, bond originators, and service providers',
    provider: {
      '@type': 'Organization',
      '@id': `${resolvedOrganizationUrl}#organization`,
      name: organizationName,
      url: resolvedOrganizationUrl,
      logo: {
        '@type': 'ImageObject',
        url: resolvedOrganizationLogo,
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
    '@id': `${resolvedOrganizationUrl}#organization`,
    name: organizationName,
    url: resolvedOrganizationUrl,
    logo: {
      '@type': 'ImageObject',
      url: resolvedOrganizationLogo,
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
    '@id': `${resolvedPageUrl}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: resolvedOrganizationUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Advertise With Us',
        item: resolvedPageUrl,
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
