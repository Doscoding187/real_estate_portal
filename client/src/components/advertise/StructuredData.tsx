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
      'Launch Access for businesses that publish property or development inventory on Property Listify.',
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
      'A connected property journey for publishing inventory, participating in discovery, capturing enquiries and supporting business follow-up.',
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
      audienceType: 'Agents, agencies and property developers',
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
      'Property platform connecting property seekers with property inventory and business workspaces.',
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
