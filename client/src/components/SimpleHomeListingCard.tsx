import { Link } from 'wouter';
import { Building2, Heart, MapPin } from 'lucide-react';
import {
  getCompactPropertyFacts,
  getPropertyCardImage,
  getPropertyCardLocation,
  getPropertyCardPrice,
} from '@/lib/property';
import { withRentalPeriod } from '@/lib/rentPresentation';
import { FallbackImage } from './FallbackImage';

export interface SimpleHomeListingCardProps {
  id: string;
  title: string;
  city: string;
  suburb?: string;
  image?: string | null;
  href: string;
  price: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  yardSize?: number | null;
  parkingCount?: number | null;
  parkingType?: string | null;
  propertyType?: string | null;
  listingType?: 'sale' | 'rent';
  badgeLabel?: string;
  isSaved?: boolean;
  favoritePending?: boolean;
  onFavoriteClick?: () => void;
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
  parkingCount,
  parkingType,
  propertyType,
  listingType,
  badgeLabel = 'For sale',
  isSaved = false,
  favoritePending = false,
  onFavoriteClick,
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
    parkingCount,
    parkingType,
    propertyType,
  };
  const locationLabel = getPropertyCardLocation(normalizedProperty).label;
  const resolvedImage = image ? getPropertyCardImage(normalizedProperty) : undefined;
  const priceLabel = getPropertyCardPrice(normalizedProperty).label;
  const specItems = getCompactPropertyFacts(normalizedProperty, 4);

  return (
    <div className="group relative h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:shadow-lg">
      <Link href={href || `/property/${id}`} className="block focus-visible:outline-none">
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
            {withRentalPeriod(priceLabel, listingType)}
          </div>

          <h3 className="mb-1 truncate whitespace-nowrap text-sm font-semibold leading-tight text-slate-900 transition-colors group-hover:text-[#2774AE]">
            {title}
          </h3>

          <div className="mb-3 flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{locationLabel}</span>
          </div>

          {specItems.length > 0 ? (
            <div className="grid grid-flow-col auto-cols-max items-center justify-between gap-1.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-700">
              {specItems.map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.key} className="flex items-center gap-1 whitespace-nowrap">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
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

      {onFavoriteClick ? (
        <button
          type="button"
          className={`absolute right-2.5 top-2.5 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2774AE] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 ${
            isSaved
              ? 'border-rose-200 bg-white/95 text-rose-600 hover:bg-rose-50'
              : 'border-white/80 bg-white/90 text-slate-600 hover:bg-white hover:text-rose-600'
          }`}
          aria-label={isSaved ? 'Remove from saved homes' : 'Save property'}
          aria-pressed={isSaved}
          disabled={favoritePending}
          onClick={event => {
            event.preventDefault();
            event.stopPropagation();
            onFavoriteClick();
          }}
        >
          <Heart className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
