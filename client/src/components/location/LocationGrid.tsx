import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, ArrowRight } from 'lucide-react';

interface LocationItem {
  id: number;
  name: string;
  listingCount: number;
  avgPrice?: number;
  slug?: string; // If readily available, otherwise generated
}

interface LocationGridProps {
  title: string;
  items: LocationItem[];
  parentSlug: string; // e.g., 'gauteng' or 'gauteng/johannesburg'
  type: 'city' | 'suburb';
}

export function LocationGrid({ title, items, parentSlug, type }: LocationGridProps) {
  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    if (price >= 1000000) return `R${(price / 1000000).toFixed(1)}M`;
    return `R${(price / 1000).toFixed(0)}k`;
  };

  const getUrl = (itemName: string) => {
    const slug = itemName.toLowerCase().replace(/\s+/g, '-');
    return `/${parentSlug}/${slug}`;
  };

  return (
    <div className="py-12 bg-slate-50/50">
      <div className="container">
        <h2 className="text-2xl font-bold mb-8 text-slate-900">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {items.map((item) => (
            <Link key={item.id} href={getUrl(item.name)}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200 group h-full">
                <CardContent className="p-4 flex flex-col h-full justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-primary transition-colors flex items-center justify-between">
                      {item.name}
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity -ml-4 group-hover:ml-0" />
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                      <MapPin className="h-3 w-3" />
                      <span>{type === 'city' ? 'City' : 'Suburb'}</span>
                    </div>
                  </div>
                  
                  <div className="mt-auto space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Listings</span>
                      <span className="font-medium text-slate-700">{item.listingCount}</span>
                    </div>
                    {item.avgPrice && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Avg Price</span>
                        <span className="font-medium text-slate-700">{formatPrice(item.avgPrice)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
