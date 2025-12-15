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
    <div className="py-12 bg-white/50 backdrop-blur-sm">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {items.map((item) => (
            <Link key={item.id} href={getUrl(item.name)}>
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group h-full">
                <div className="p-5 flex flex-col h-full justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors flex items-center justify-between">
                      {item.name}
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 text-blue-600" />
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-4">
                      <div className="p-1 rounded-full bg-slate-100 group-hover:bg-blue-50 transition-colors">
                        <MapPin className="h-3 w-3 text-slate-400 group-hover:text-blue-500" />
                      </div>
                      <span>{type === 'city' ? 'City' : 'Suburb'}</span>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-slate-50 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 text-xs uppercase tracking-wide font-medium">Listings</span>
                      <span className="font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">{item.listingCount}</span>
                    </div>
                    {item.avgPrice && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 text-xs uppercase tracking-wide font-medium">Avg</span>
                        <span className="font-bold text-slate-900">{formatPrice(item.avgPrice)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
