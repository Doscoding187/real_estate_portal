import { Helmet } from 'react-helmet';

/**
 * LocationSchema Component
 * 
 * Generates JSON-LD structured data and SEO metadata for location pages.
 * 
 * Requirements:
 * - 23.1-23.5: SEO-optimized URLs and metadata
 * - 30.1-30.5: Structured data markup with @type "Place"
 * 
 * Features:
 * - JSON-LD structured data with @type "Place"
 * - Breadcrumb structured data
 * - Dynamic meta tags (title, description, OG tags)
 * - Schema.org compliant markup
 */
interface LocationSchemaProps {
  type: 'Province' | 'City' | 'Suburb';
  name: string;
  description: string;
  url: string;
  image?: string;
  breadcrumbs: { name: string; url: string }[];
  geo?: {
    latitude: number;
    longitude: number;
  };
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
  stats?: {
    totalListings?: number;
    avgPrice?: number;
    avgRentalPrice?: number;
  };
}

export function LocationSchema({ 
  type, 
  name, 
  description, 
  url, 
  image, 
  breadcrumbs, 
  geo,
  address,
  aggregateRating,
  stats
}: LocationSchemaProps) {
  const fullUrl = `https://propertylistify.com${url}`;
  
  // BreadcrumbList Schema
  // Requirements 30.4: Include breadcrumb structured data showing location hierarchy
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `https://propertylistify.com${crumb.url}`,
    })),
  };

  // Place Schema
  // Requirements 30.1: Include JSON-LD structured data with @type "Place"
  // Requirements 30.2: Include location name, coordinates, address components, and URL
  const placeSchema: any = {
    '@context': 'https://schema.org',
    '@type': type === 'City' ? 'City' : type === 'Province' ? 'AdministrativeArea' : 'Place',
    name: name,
    description: description,
    url: fullUrl,
  };

  // Add image if provided
  if (image) {
    placeSchema.image = image;
  }

  // Add geo coordinates if provided
  // Requirements 30.2: Include coordinates
  if (geo) {
    placeSchema.geo = {
      '@type': 'GeoCoordinates',
      latitude: geo.latitude,
      longitude: geo.longitude
    };
  }

  // Add address if provided
  // Requirements 30.2: Include address components
  if (address) {
    placeSchema.address = {
      '@type': 'PostalAddress',
      streetAddress: address.streetAddress,
      addressLocality: address.addressLocality || name,
      addressRegion: address.addressRegion,
      postalCode: address.postalCode,
      addressCountry: address.addressCountry || 'ZA'
    };
  }

  // Add aggregate rating if provided
  if (aggregateRating) {
    placeSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: aggregateRating.ratingValue,
      reviewCount: aggregateRating.reviewCount
    };
  }

  // Add additional properties for real estate context
  // Requirements 30.3: Include aggregate statistics as additional properties
  if (stats) {
    placeSchema.additionalProperty = [];
    
    if (stats.totalListings !== undefined) {
      placeSchema.additionalProperty.push({
        '@type': 'PropertyValue',
        name: 'Total Listings',
        value: stats.totalListings
      });
    }
    
    if (stats.avgPrice !== undefined) {
      placeSchema.additionalProperty.push({
        '@type': 'PropertyValue',
        name: 'Average Sale Price',
        value: stats.avgPrice,
        unitCode: 'ZAR'
      });
    }
    
    if (stats.avgRentalPrice !== undefined) {
      placeSchema.additionalProperty.push({
        '@type': 'PropertyValue',
        name: 'Average Rental Price',
        value: stats.avgRentalPrice,
        unitCode: 'ZAR'
      });
    }
  }

  // Generate dynamic meta tags
  // Requirements 23.2: Include location name, listing count, and average price in title tag
  const metaTitle = generateMetaTitle(type, name, stats);
  
  // Requirements 23.3: Create description with key statistics and property types
  const metaDescription = generateMetaDescription(type, name, description, stats);

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      {image && <meta property="og:image" content={image} />}
      <meta property="og:site_name" content="Property Listify" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullUrl} />
      <meta property="twitter:title" content={metaTitle} />
      <meta property="twitter:description" content={metaDescription} />
      {image && <meta property="twitter:image" content={image} />}

      {/* Geo Tags */}
      {geo && (
        <>
          <meta name="geo.position" content={`${geo.latitude};${geo.longitude}`} />
          <meta name="geo.placename" content={name} />
          <meta name="geo.region" content="ZA" />
        </>
      )}

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(placeSchema)}
      </script>
    </Helmet>
  );
}

/**
 * Generate SEO-optimized meta title
 * Requirements 23.2: Include location name, listing count, and average price in title tag
 */
function generateMetaTitle(
  type: 'Province' | 'City' | 'Suburb',
  name: string,
  stats?: { totalListings?: number; avgPrice?: number }
): string {
  const baseTitle = `${name} Real Estate`;
  
  if (stats?.totalListings && stats?.avgPrice) {
    const formattedPrice = formatPrice(stats.avgPrice);
    return `${baseTitle} - ${stats.totalListings} Properties from ${formattedPrice} | Property Listify`;
  } else if (stats?.totalListings) {
    return `${baseTitle} - ${stats.totalListings} Properties for Sale & Rent | Property Listify`;
  } else {
    return `${baseTitle} - Properties for Sale & Rent | Property Listify`;
  }
}

/**
 * Generate SEO-optimized meta description
 * Requirements 23.3: Create description with key statistics and property types
 */
function generateMetaDescription(
  type: 'Province' | 'City' | 'Suburb',
  name: string,
  description: string,
  stats?: { totalListings?: number; avgPrice?: number; avgRentalPrice?: number }
): string {
  let desc = `Explore real estate in ${name}. `;
  
  if (stats?.totalListings) {
    desc += `Browse ${stats.totalListings} properties for sale and rent. `;
  }
  
  if (stats?.avgPrice) {
    const formattedPrice = formatPrice(stats.avgPrice);
    desc += `Average sale price: ${formattedPrice}. `;
  }
  
  if (stats?.avgRentalPrice) {
    const formattedRental = formatPrice(stats.avgRentalPrice);
    desc += `Average rental: ${formattedRental}/month. `;
  }
  
  // Add a snippet of the location description if available
  if (description) {
    const snippet = description.substring(0, 100).trim();
    desc += snippet.endsWith('.') ? snippet : `${snippet}...`;
  }
  
  // Ensure description doesn't exceed 160 characters (SEO best practice)
  if (desc.length > 160) {
    desc = desc.substring(0, 157) + '...';
  }
  
  return desc;
}

/**
 * Format price for display
 */
function formatPrice(price: number): string {
  if (price >= 1000000) {
    return `R${(price / 1000000).toFixed(1)}M`;
  } else if (price >= 1000) {
    return `R${(price / 1000).toFixed(0)}K`;
  } else {
    return `R${price}`;
  }
}
