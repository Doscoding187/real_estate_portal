import { useLocation } from 'wouter';
import { ArrowLeft, Check, Home, Loader2, X } from 'lucide-react';
import { useComparison } from '@/contexts/ComparisonContext';
import { trpc } from '@/lib/trpc';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Button } from '@/components/ui/button';
import { buildPropertyUrl } from '@/lib/urlUtils';
import type {
  PublicPropertyDetailFact,
  PublicPropertyDetailPresentation,
} from '@/../../shared/public-property-detail-presentation';

type ComparisonProperty = {
  id: number;
  href: string;
  title: string;
  image?: string;
  price: string;
  propertyType: string;
  listingType: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
  yardSize: string;
  location: string;
  listingSource: string;
};

const presentationFact = (
  presentation: PublicPropertyDetailPresentation,
  key: string,
): PublicPropertyDetailFact | undefined =>
  [...presentation.heroFacts, ...presentation.propertyContext].find(item => item.key === key);

/**
 * Comparison consumes the same server-owned public presentation as the detail
 * page. It does not reinterpret raw propertyDetails or legacy aliases.
 */
const toComparisonProperty = (item: any): ComparisonProperty | null => {
  const property = item?.property as
    | {
        id?: unknown;
        title?: unknown;
        suburb?: unknown;
        city?: unknown;
        listingSource?: unknown;
        detailPresentation?: PublicPropertyDetailPresentation;
      }
    | undefined;
  const presentation = property?.detailPresentation;
  const id = Number(property?.id || 0);
  if (!presentation || !Number.isSafeInteger(id) || id <= 0) return null;

  const image = (item.images || []).find(
    (candidate: any) => typeof candidate?.url === 'string',
  )?.url;
  const factValue = (key: string) => presentationFact(presentation, key)?.value || 'Not supplied';
  return {
    id,
    href: buildPropertyUrl(id, String(property?.title || 'Property')),
    title: String(property?.title || 'Property'),
    image,
    price: presentation.price.value,
    propertyType: factValue('property-type'),
    listingType: presentation.listingIntent === 'rent' ? 'To rent' : 'For sale',
    bedrooms: factValue('bedrooms'),
    bathrooms: factValue('bathrooms'),
    area:
      factValue('floor-size') !== 'Not supplied'
        ? factValue('floor-size')
        : factValue('internal-area'),
    yardSize:
      factValue('erf-size') !== 'Not supplied'
        ? factValue('erf-size')
        : factValue('land-size') !== 'Not supplied'
          ? factValue('land-size')
          : factValue('erf-area'),
    location:
      [property?.suburb, property?.city]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .join(', ') || 'Location not supplied',
    listingSource: String(property?.listingSource || 'Public listing'),
  };
};

export default function CompareProperties() {
  const { comparedProperties, removeFromComparison, clearComparison } = useComparison();
  const [, setLocation] = useLocation();
  const {
    data: publicProperties,
    isLoading,
    error,
  } = trpc.properties.getPublicByIds.useQuery(
    { ids: comparedProperties },
    { enabled: comparedProperties.length > 0 },
  );
  const comparisonReturnPath =
    typeof window !== 'undefined'
      ? window.sessionStorage.getItem('property-comparison-return')
      : null;
  const handleBackToResults = () => {
    setLocation(
      comparisonReturnPath?.startsWith('/property-for-sale')
        ? comparisonReturnPath
        : '/property-for-sale',
    );
  };

  if (comparedProperties.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-4 text-3xl font-bold text-slate-900">Compare properties</h1>
            <p className="mb-8 text-slate-600">
              You have not selected any properties to compare yet. Add them from Buy results.
            </p>
            <Button onClick={handleBackToResults}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Browse properties
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />
        <div className="container mx-auto flex justify-center px-4 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  const normalized = (Array.isArray(publicProperties) ? publicProperties : [])
    .map(toComparisonProperty)
    .filter((item): item is ComparisonProperty => Boolean(item));

  if (error || normalized.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-4 text-3xl font-bold text-slate-900">Comparison unavailable</h1>
            <p className="mb-8 text-slate-600">
              One or more selected properties are no longer available for Buy comparison.
            </p>
            <Button onClick={handleBackToResults}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Buy results
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const comparisonRows: Array<{ label: string; key: keyof ComparisonProperty }> = [
    { label: 'Price', key: 'price' },
    { label: 'Property type', key: 'propertyType' },
    { label: 'Listing type', key: 'listingType' },
    { label: 'Bedrooms', key: 'bedrooms' },
    { label: 'Bathrooms', key: 'bathrooms' },
    { label: 'Floor / building size', key: 'area' },
    { label: 'Erf / land size', key: 'yardSize' },
    { label: 'Location', key: 'location' },
    { label: 'Listing source', key: 'listingSource' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />
      <main className="container mx-auto px-4 py-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Compare properties</h1>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleBackToResults}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to properties
            </Button>
            <Button variant="outline" onClick={clearComparison}>
              Clear all
            </Button>
          </div>
        </header>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="sticky left-0 z-10 bg-slate-50 p-4 text-left font-medium text-slate-700">
                    Property
                  </th>
                  {normalized.map(property => (
                    <th key={property.id} className="min-w-[280px] p-4">
                      <div className="space-y-3">
                        <div className="relative h-48 overflow-hidden rounded-lg bg-slate-100">
                          {property.image ? (
                            <img
                              src={property.image}
                              alt={property.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Home className="absolute inset-0 m-auto h-8 w-8 text-slate-400" />
                          )}
                          <button
                            type="button"
                            onClick={() => removeFromComparison(property.id)}
                            aria-label={`Remove ${property.title} from comparison`}
                            className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 transition-colors hover:bg-white"
                          >
                            <X className="h-4 w-4 text-slate-600" />
                          </button>
                        </div>
                        <div>
                          <h2 className="line-clamp-2 font-semibold text-slate-900">
                            {property.title}
                          </h2>
                          <p className="mt-2 text-xl font-bold text-blue-600">{property.price}</p>
                        </div>
                        <Button
                          onClick={() => setLocation(property.href)}
                          className="w-full"
                          size="sm"
                        >
                          View details
                        </Button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, index) => {
                  const values = normalized.map(property => property[row.key]);
                  const allSame = values.every(value => value === values[0]);
                  return (
                    <tr
                      key={row.key}
                      className={
                        index % 2 === 0
                          ? 'border-b border-slate-100 bg-white'
                          : 'border-b border-slate-100 bg-slate-50/50'
                      }
                    >
                      <td className="sticky left-0 z-10 bg-inherit p-4 font-medium text-slate-700">
                        {row.label}
                      </td>
                      {normalized.map(property => {
                        const value = property[row.key];
                        return (
                          <td
                            key={property.id}
                            className={
                              !allSame && value !== 'Not supplied'
                                ? 'bg-blue-50/50 p-4 text-center'
                                : 'p-4 text-center'
                            }
                          >
                            <div className="flex items-center justify-center gap-2">
                              {!allSame && value !== 'Not supplied' && (
                                <Check className="h-4 w-4 text-blue-600" />
                              )}
                              <span className="text-slate-900">{value}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
