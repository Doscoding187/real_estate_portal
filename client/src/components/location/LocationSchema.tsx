import { Helmet } from 'react-helmet';

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
}

export function LocationSchema({ type, name, description, url, image, breadcrumbs, geo }: LocationSchemaProps) {
  // BreadcrumbList Schema
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
  const placeSchema = {
    '@context': 'https://schema.org',
    '@type': type === 'City' ? 'City' : 'Place', // Schema.org types: City, AdministrativeArea (Province), Place
    name: name,
    description: description,
    url: `https://propertylistify.com${url}`,
    image: image,
    geo: geo ? {
      '@type': 'GeoCoordinates',
      latitude: geo.latitude,
      longitude: geo.longitude
    } : undefined
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(placeSchema)}
      </script>
    </Helmet>
  );
}
