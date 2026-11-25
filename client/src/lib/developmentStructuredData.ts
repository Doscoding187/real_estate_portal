/**
 * schema.org structured data for a public development page. Only facts the page
 * already shows are emitted: nothing is invented, and a field with no value is
 * left out.
 *   Residence  name, description, url, image, address locality (the suburb label)
 *   Product    name, url, image, brand (the publisher) and, for a development for
 *              sale with a published price, an AggregateOffer in ZAR.
 */
export interface DevelopmentStructuredDataInput {
  name: string;
  description?: string | null;
  url: string;
  imageUrl?: string | null;
  locationLabels?: readonly string[];
  publisherName?: string | null;
  transactionType?: 'for_sale' | 'for_rent' | string | null;
  priceFrom?: number | null;
  priceTo?: number | null;
}

type JsonLd = Record<string, unknown>;

const clean = (value: JsonLd): JsonLd =>
  Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );

const positive = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

export function buildDevelopmentStructuredData(input: DevelopmentStructuredDataInput): JsonLd[] {
  const name = String(input.name ?? '').trim();
  if (!name || !input.url) return [];
  const description = String(input.description ?? '').trim() || undefined;
  const image = input.imageUrl || undefined;
  const locality = input.locationLabels?.find(label => String(label ?? '').trim());

  const residence = clean({
    '@context': 'https://schema.org',
    '@type': 'Residence',
    name,
    description,
    url: input.url,
    image,
    address: locality
      ? { '@type': 'PostalAddress', addressLocality: locality, addressCountry: 'ZA' }
      : undefined,
  });

  const low = positive(input.priceFrom);
  const high = positive(input.priceTo) ?? low;
  const offers =
    input.transactionType === 'for_sale' && low !== null
      ? {
          '@type': 'AggregateOffer',
          priceCurrency: 'ZAR',
          lowPrice: low,
          highPrice: high ?? low,
        }
      : undefined;
  const publisher = String(input.publisherName ?? '').trim();
  const product = clean({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    url: input.url,
    image,
    brand: publisher ? { '@type': 'Organization', name: publisher } : undefined,
    offers,
  });

  return [residence, product];
}
