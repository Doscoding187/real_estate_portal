import { Link } from 'wouter';
import { Building2, House, MapPin } from 'lucide-react';
import {
  getCompactPropertyFacts,
  getPropertyCardImage,
  getPropertyCardLocation,
  getPropertyCardPrice,
} from '@/lib/property';

export interface SimplePropertyListingCardProps {
  id: string;
  title: string;
  city: string;
  suburb?: string;
  price: number;
  listingType?: 'sale' | 'rent';
  image?: string;
  href?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  yardSize?: number | null;
  propertyType?: string | null;
  developmentName?: string | null;
  badges?: string[];
}

export function SimplePropertyListingCard({
  id,
  title,
  city,
  suburb,
  price,
  listingType = 'sale',
  image,
  href,
  bedrooms,
  bathrooms,
  area,
  yardSize,
  propertyType,
  developmentName,
  badges,
}: SimplePropertyListingCardProps) {
  const normalizedProperty = {
    id,
    title,
    city,
    suburb,
    price,
    listingType,
    image,
    bedrooms,
    bathrooms,
    area,
    yardSize,
    propertyType,
    developmentName,
    badges,
  };
  const locationLabel = getPropertyCardLocation(normalizedProperty).label;
  const resolvedImage = image ? getPropertyCardImage(normalizedProperty) : undefined;
  const visibleBadges = badges?.filter(Boolean).slice(0, 2) ?? [];
  const listingBadgeLabel = listingType === 'rent' ? 'For Rent' : 'For Sale';
  const listingBadgeClass =
    listingType === 'rent'
      ? 'bg-emerald-600/95 text-white'
      : 'bg-[#1e1b4b]/95 text-white';
  const priceLabel = getPropertyCardPrice(normalizedProperty).label;
  const specItems = getCompactPropertyFacts(normalizedProperty, 4);

  return (
    <Link
      href={href || `/property/${id}`}
      className="group relative block w-full max-w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-sky-50" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
          <span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-sm">
            Property Listing
          </span>
          <House className="h-12 w-12" />
          <span className="text-[11px] font-medium text-slate-500">Image coming soon</span>
        </div>

        {resolvedImage && (
          <img
            src={resolvedImage}
            alt={title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 z-10"
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.style.display = 'none';
            }}
          />
        )}

        <div className="absolute left-2.5 top-2.5 z-20 flex flex-col gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm ${listingBadgeClass}`}>
            {listingBadgeLabel}
          </span>
          {(visibleBadges.length > 0 || developmentName) && (
            <>
            {developmentName && (
              <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-sm">
                Part of {developmentName}
              </span>
            )}
            {visibleBadges.map(badge => (
              <span
                key={badge}
                className="rounded-full bg-blue-600/95 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm"
              >
                {badge}
              </span>
            ))}
            </>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {listingType === 'rent' ? 'Monthly rental' : 'Property listing'}
        </div>
        <div className="mb-2 text-lg font-bold text-[#1e1b4b] sm:text-xl">{priceLabel}</div>

        <h3 className="mb-1 line-clamp-2 text-sm font-semibold leading-tight text-slate-900 group-hover:text-[#2774AE] transition-colors">
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
          <div className="mt-2.5 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span>
              {listingType === 'rent'
                ? 'Rental details available on the listing page'
                : 'Property details available on the listing page'}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
