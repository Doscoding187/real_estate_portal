/**
 * SEO Head Component
 *
 * Provides comprehensive meta tags for the Advertise With Us landing page:
 * - Title tag (50-70 characters)
 * - Meta description (150-160 characters)
 * - Open Graph tags for social sharing
 * - Twitter Card tags
 * - Canonical URL
 */

import { Helmet } from 'react-helmet-async';
import { toAbsoluteUrl } from '@/lib/seo/structuredData';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
}

export function SEOHead({
  title = 'Advertise With Us | Reach High-Intent Property Buyers',
  description = 'Advertise your properties, developments, and services to thousands of verified home seekers across South Africa. AI-powered visibility, verified leads, and full dashboard control.',
  canonicalUrl = 'https://www.propertylistifysa.co.za/advertise',
  ogImage = '/images/advertise-og-image.jpg',
  ogType = 'website',
}: SEOHeadProps) {
  const resolvedCanonicalUrl = toAbsoluteUrl(canonicalUrl);
  const resolvedOgImage = toAbsoluteUrl(ogImage);

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />

      {/* Canonical URL */}
      <link rel="canonical" href={resolvedCanonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={resolvedCanonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={resolvedOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Property Listify" />
      <meta property="og:locale" content="en_ZA" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={resolvedCanonicalUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedOgImage} />
      <meta name="twitter:image:alt" content="Advertise With Us - Property Listify" />

      {/* Additional SEO Meta Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <meta name="author" content="Property Listify" />

      {/* Keywords (less important for modern SEO but still useful) */}
      <meta
        name="keywords"
        content="property advertising, real estate marketing, property developers, estate agents, property leads, South Africa property, property promotion, real estate advertising"
      />
    </Helmet>
  );
}
