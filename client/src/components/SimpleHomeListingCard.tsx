import { Link } from 'wouter';
import { Building2, MapPin } from 'lucide-react';
import {
  getCompactPropertyFacts,
  getPropertyCardImage,
  getPropertyCardLocation,
  getPropertyCardPrice,
} from '@/lib/property';
import { FallbackImage } from './FallbackImage';

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
  propertyType,
  badgeLabel = 'Resale',
}: SimpleHomeListingCardProps) {
  const normalizedProperty = {
    id,
    title,
    city,
    suburb,
    image,
    price,
    bedrooms,
    bathrooms,
    area,
    yardSize,
    propertyType,
  };
  const locationLabel = getPropertyCardLocation(normalizedProperty).label;
  const resolvedImage = image ? getPropertyCardImage(normalizedProperty) : undefined;
  const priceLabel = getPropertyCardPrice(normalizedProperty).label;
  const specItems = getCompactPropertyFacts(normalizedProperty, 4);

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
          <FallbackImage
            src={resolvedImage}
            alt={title}
            loading="lazy"
            className="absolute inset-0 z-10 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
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
          {priceLabel}
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
            {specItems.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.key} className="flex items-center gap-1.5 whitespace-nowrap">
                  <Icon className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-medium">{item.shortValue}</span>
                </div>
              );
            })}
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
