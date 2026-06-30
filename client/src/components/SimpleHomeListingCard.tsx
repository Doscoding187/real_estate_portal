import { Link } from 'wouter';
import { Building2, MapPin } from 'lucide-react';
import {
  getCompactPropertyFacts,
  getPropertyCardImage,
  getPropertyCardLocation,
} from '@/lib/property';
import { FallbackImage } from './FallbackImage';
import { formatCompactRand, getShortCardLocation } from '@/lib/cardDisplay';

export interface SimpleHomeListingCardProps {
  id: string;
  title: string;
  city: string;
  suburb?: string;
  address?: string | null;
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

export function SimpleHomeListingCard({
  id,
  title,
  city,
  suburb,
  address,
  image,
  href,
  price,
  bedrooms,
  bathrooms,
  area,
  yardSize,
  propertyType,
  badgeLabel = 'Resale',
}: SimpleHomeListingCardProps) {
  const normalizedProperty = {
    id,
    title,
    city,
    suburb,
    image,
    address,
    price,
    bedrooms,
    bathrooms,
    area,
    yardSize,
    propertyType,
  };
  const locationLabel = getShortCardLocation({ address, suburb, city }) || getPropertyCardLocation(normalizedProperty).label;
  const resolvedImage = image ? getPropertyCardImage(normalizedProperty) : undefined;
  const priceLabel = formatCompactRand(price);
  const specItems = getCompactPropertyFacts(normalizedProperty, 4);

  return (
    <Link
      href={href || `/property/${id}`}
      className="group relative block h-full w-full overflow-hidden rounded-lg border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
        {!resolvedImage && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300">
            <Building2 className="h-9 w-9" />
          </div>
        )}

        {resolvedImage && (
          <FallbackImage
            src={resolvedImage}
            alt={title}
            loading="lazy"
            className="absolute inset-0 z-10 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}

        <div className="absolute left-2.5 top-2.5 z-20">
          <span className="rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-700 shadow-sm">
            {badgeLabel}
          </span>
        </div>
      </div>

      <div className="p-3">
        <div className="mb-1.5 truncate text-[17px] font-bold leading-tight text-[#1e1b4b] sm:text-lg">
          {priceLabel}
        </div>

        <h3 className="mb-1 truncate whitespace-nowrap text-[13px] font-semibold leading-tight text-slate-900 transition-colors group-hover:text-[#2774AE]">
          {title}
        </h3>

        <div className="mb-2.5 flex items-center gap-1 text-[11px] text-slate-500">
          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">{locationLabel}</span>
        </div>

        {specItems.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-700">
            {specItems.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.key} className="flex items-center gap-1 whitespace-nowrap">
                  <Icon className="h-3 w-3 text-slate-400" />
                  <span className="font-medium">{item.shortValue}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
            Listing details available on the property page.
          </div>
        )}
      </div>
    </Link>
  );
}
