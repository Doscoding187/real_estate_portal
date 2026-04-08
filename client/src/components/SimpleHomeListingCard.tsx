import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { Bath, Bed, Building2, MapPin, Trees } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { withApiBase } from '@/lib/mediaUtils';
import { HouseMeasureIcon } from '@/components/icons/HouseMeasureIcon';

export interface SimpleHomeListingCardProps {
  id: string;
  title: string;
  city: string;
  suburb?: string;
  image?: string | null;
  href: string;
  price: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  yardSize?: number | null;
  propertyType?: string | null;
  badgeLabel?: string;
}

const formatMeasure = (value?: number | null) => {
  if (!value || value <= 0) return null;
  return `${value.toLocaleString()} m2`;
};

export function SimpleHomeListingCard({
  id,
  title,
  city,
  suburb,
  image,
  href,
  price,
  bedrooms,
  bathrooms,
  area,
  yardSize,
  badgeLabel = 'Resale',
}: SimpleHomeListingCardProps) {
  const locationLabel = suburb ? `${suburb}, ${city}` : city;
  const resolvedImage = withApiBase(image);
  const specItems = [
    formatMeasure(area)
      ? {
          key: 'area',
          icon: <HouseMeasureIcon className="h-3.5 w-3.5 text-slate-400" />,
          value: formatMeasure(area),
        }
      : null,
    bedrooms
      ? {
          key: 'bedrooms',
          icon: <Bed className="h-3.5 w-3.5 text-slate-400" />,
          value: String(bedrooms),
        }
      : null,
    bathrooms
      ? {
          key: 'bathrooms',
          icon: <Bath className="h-3.5 w-3.5 text-slate-400" />,
          value: String(bathrooms),
        }
      : null,
    formatMeasure(yardSize)
      ? {
          key: 'yard-size',
          icon: <Trees className="h-3.5 w-3.5 text-slate-400" />,
          value: formatMeasure(yardSize),
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; icon: ReactNode; value: string }>;

  return (
    <Link
      href={href || `/property/${id}`}
      className="group relative block w-full max-w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {!resolvedImage && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300">
            <Building2 className="h-12 w-12" />
          </div>
        )}

        {resolvedImage && (
          <img
            src={resolvedImage}
            alt={title}
            loading="lazy"
            className="absolute inset-0 z-10 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.style.display = 'none';
            }}
          />
        )}

        <div className="absolute left-2.5 top-2.5 z-20">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-semibold text-slate-700 shadow-sm">
            {badgeLabel}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-2 text-lg font-bold text-[#1e1b4b] sm:text-xl">
          {price > 0 ? formatCurrency(price) : 'Price on request'}
        </div>

        <h3 className="mb-1 truncate whitespace-nowrap text-sm font-semibold leading-tight text-slate-900 transition-colors group-hover:text-[#2774AE]">
          {title}
        </h3>

        <div className="mb-3 flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{locationLabel}</span>
        </div>

        {specItems.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-2.5 text-xs text-slate-700">
            {specItems.map(item => (
              <div key={item.key} className="flex items-center gap-1.5 whitespace-nowrap">
                {item.icon}
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2.5 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
            Listing details available on the property page.
          </div>
        )}
      </div>
    </Link>
  );
}
