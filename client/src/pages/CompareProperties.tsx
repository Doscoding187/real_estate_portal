import { useComparison } from '@/contexts/ComparisonContext';
import { trpc } from '@/lib/trpc';
import { ListingNavbar } from '@/components/ListingNavbar';
import { Button } from '@/components/ui/button';
import { normalizePropertyForUI } from '@/lib/normalizers';
import { X, ArrowLeft, Check } from 'lucide-react';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';

export default function CompareProperties() {
  const { comparedProperties, removeFromComparison, clearComparison } = useComparison();
  const [, setLocation] = useLocation();

  // Fetch properties by IDs
  const { data: properties, isLoading } = trpc.properties.search.useQuery(
    {
      status: 'available',
      // We'll filter on the client side by IDs
      limit: 100,
    },
    {
      enabled: comparedProperties.length > 0,
    },
  );

  if (comparedProperties.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Compare Properties</h1>
            <p className="text-slate-600 mb-8">
              You haven't selected any properties to compare yet. Add properties from the listings
              page to get started.
            </p>
            <Button onClick={() => setLocation('/properties')} variant="default">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Browse Properties
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Filter properties by selected IDs
  const selectedProperties = properties?.filter(p => comparedProperties.includes(p.id)) || [];
  const normalized = selectedProperties.map(normalizePropertyForUI).filter(p => p !== null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <ListingNavbar />
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  // Comparison attributes
  const comparisonRows = [
    { label: 'Price', key: 'price', format: (val: any) => `R ${val?.toLocaleString()}` },
    { label: 'Property Type', key: 'propertyType' },
    { label: 'Listing Type', key: 'listingType' },
    { label: 'Bedrooms', key: 'bedrooms' },
    { label: 'Bathrooms', key: 'bathrooms' },
    { label: 'Area (sqm)', key: 'area', format: (val: any) => `${val} sqm` },
    { label: 'City', key: 'city' },
    { label: 'Address', key: 'address' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <ListingNavbar />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Compare Properties</h1>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setLocation('/properties')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Properties
            </Button>
            <Button variant="outline" onClick={clearComparison}>
              Clear All
            </Button>
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left p-4 font-medium text-slate-700 sticky left-0 bg-slate-50 z-10">
                    Property
                  </th>
                  {normalized.map(property => (
                    <th key={property.id} className="p-4 min-w-[280px]">
                      <div className="space-y-3">
                        <div className="relative h-48 rounded-lg overflow-hidden">
                          <img
                            src={property.images[0] || '/placeholder-property.jpg'}
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removeFromComparison(parseInt(property.id))}
                            className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1.5 transition-colors"
                          >
                            <X className="h-4 w-4 text-slate-600" />
                          </button>
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 line-clamp-2">
                            {property.title}
                          </h3>
                          <p className="text-2xl font-bold text-blue-600 mt-2">
                            R {property.price.toLocaleString()}
                          </p>
                        </div>
                        <Button
                          onClick={() => setLocation(`/property/${property.id}`)}
                          className="w-full"
                          size="sm"
                        >
                          View Details
                        </Button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, idx) => {
                  // Check if all values are the same
                  const values = normalized.map((p: any) => p[row.key]);
                  const allSame = values.every(v => v === values[0]);

                  return (
                    <tr
                      key={row.key}
                      className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                    >
                      <td className="p-4 font-medium text-slate-700 sticky left-0 bg-inherit z-10">
                        {row.label}
                      </td>
                      {normalized.map((property: any) => {
                        const value = property[row.key];
                        const formatted = row.format ? row.format(value) : value || 'N/A';

                        return (
                          <td
                            key={property.id}
                            className={`p-4 text-center ${!allSame && value ? 'bg-blue-50/50' : ''}`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              {!allSame && value && (
                                <span className="text-blue-600">
                                  <Check className="h-4 w-4" />
                                </span>
                              )}
                              <span className="text-slate-900">{formatted}</span>
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

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-slate-600">
          <p>Differences between properties are highlighted in blue.</p>
          <p className="mt-1">You can compare up to 4 properties at once.</p>
        </div>
      </div>
    </div>
  );
}
