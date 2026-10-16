import { cn, formatPriceRangeCompact } from '@/lib/utils';
import { withRentalPeriod } from '@/lib/rentPresentation';
import { Link } from 'wouter';
import { withApiBase } from '@/lib/mediaUtils';
import { ArrowRight, Building2, MapPin } from 'lucide-react';
import { FallbackImage } from './FallbackImage';

export interface SimpleDevelopmentCardProps {
  id: string;
  title: string;
  city: string;
  suburb?: string;
  priceRange: {
    min: number | null;
    max: number | null;
  };
  image: string;
  slug?: string;
  isHotSelling?: boolean;
  isHighDemand?: boolean;
  bedrooms?: number[] | number | string | null;
  bedroomRange?: { min: number | null; max: number | null };
  listingType?: 'sale' | 'rent';
  status?: 'launching-soon' | 'selling' | 'sold-out';
  availabilityState?: 'available' | 'sold_out' | 'not_stated';
  publisherName?: string | null;
  href?: string;
  className?: string;
  actionLabel?: string;
}

export function SimpleDevelopmentCard({
  id,
  title,
  city,
  suburb,
  priceRange,
  image,
  slug,
  isHotSelling,
  isHighDemand,
  bedrooms,
  bedroomRange,
  listingType,
  status,
  availabilityState,
  publisherName,
  href,
  className,
  actionLabel,
}: SimpleDevelopmentCardProps) {
  // Location display
  const locationLabel = suburb ? `${suburb}, ${city}` : city;

  // Format price using SquareYards-style compact formatter
  const formattedPrice = formatPriceRangeCompact(priceRange?.min, priceRange?.max);
  const priceLabel =
    listingType === 'rent' && formattedPrice === 'Price on request'
      ? 'Monthly rent on request'
      : withRentalPeriod(formattedPrice, listingType);

  // Bedroom Label
  let bedroomLabel = '';
  const bedroomValues = bedroomRange
    ? [bedroomRange.min, bedroomRange.max].filter(
        (value, index, values): value is number =>
          typeof value === 'number' && value > 0 && values.indexOf(value) === index,
      )
    : Array.isArray(bedrooms)
      ? bedrooms
      : typeof bedrooms === 'number' && bedrooms > 0
        ? [bedrooms]
        : [];

  if (bedroomValues.length > 0) {
    // Normalize and sort: cap > 5 as 5 (display as 5+)
    const uniqueBeds = Array.from(new Set(bedroomValues.map(b => (b > 5 ? 6 : b)))).sort(
      (a, b) => a - b,
    );

    const displayBeds = uniqueBeds.map(b => (b >= 6 ? '5+' : b.toString()));

    if (displayBeds.length === 1) {
      const val = displayBeds[0];
      bedroomLabel = `${val} Bedroom${val !== '1' ? 's' : ''}`;
    } else if (displayBeds.length === 2) {
      bedroomLabel = `${displayBeds[0]} & ${displayBeds[1]} Bedrooms`;
    } else {
      // 3 or more: "1, 2 & 5+ Bedroom options"
      const last = displayBeds.pop();
      bedroomLabel = `${displayBeds.join(', ')} & ${last} Bedroom options`;
    }
  } else if (typeof bedrooms === 'string' && bedrooms) {
    bedroomLabel = bedrooms;
  }

  return (
    <Link
      href={href || `/development/${slug || id}`}
      className={cn(
        'group relative block w-full max-w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:shadow-lg',
        className,
      )}
    >
      {/* Image Frame - Fixed Aspect Ratio */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {/* Placeholder Background (Always Rendered as Base Layer) */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-emerald-50" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
          <span className="rounded-full border border-white/80 bg-white/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-sm">
            Development Listing
          </span>
          <Building2 className="w-12 h-12" />
          <span className="text-[11px] font-medium text-slate-500">Image unavailable</span>
        </div>

        {/* Image Layer - Hides on Error to reveal placeholder */}
        {image && (
          <FallbackImage
            src={withApiBase(image)}
            alt={title}
            loading="lazy"
            timeoutMs={12000}
            hideWhenUnavailable
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 z-10"
          />
        )}

        {/* Gradient Overlay for text readability if we had text over image, but we don't. 
            However, a subtle hover effect is nice. */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 z-20" />

        {/* Badges - Top Right */}
        <div className="absolute right-2.5 top-2.5 z-30 flex flex-col items-end gap-1.5">
          {isHotSelling && (
            <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded shadow-sm">
              Hot
            </span>
          )}
          {!isHotSelling && isHighDemand && (
            <span className="bg-blue-600 text-white text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded shadow-sm">
              High Demand
            </span>
          )}
        </div>
      </div>

      {/* Content - Compact Layout */}
      <div className={cn('p-4 pt-5', actionLabel && 'flex flex-1 flex-col')}>
        {/* Title */}
        <h3
          className={cn(
            'mb-1 line-clamp-2 font-semibold leading-tight text-slate-900 transition-colors group-hover:text-[#2774AE]',
            actionLabel ? 'text-base' : 'text-fluid-sm',
          )}
        >
          {title}
        </h3>

        {/* Location */}
        <div
          className={cn(
            'mb-3 flex items-center gap-1 text-slate-500',
            actionLabel ? 'text-sm' : 'text-xs',
          )}
        >
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">{locationLabel}</span>
        </div>

        {publisherName ? (
          <p className="mb-3 truncate text-xs text-slate-500">Publisher: {publisherName}</p>
        ) : null}

        {/* Bedrooms - Badge Style */}
        {bedroomLabel && (
          <div className="mb-3 flex items-center gap-1">
            <span
              className={cn(
                'inline-block rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600',
                actionLabel ? 'text-xs' : 'text-[10px]',
              )}
            >
              {bedroomLabel}
            </span>
          </div>
        )}

        {/* Price */}
        <div className="border-t border-slate-100 pt-2">
          {status === 'launching-soon' ? (
            <span className="mb-1 inline-flex rounded bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800">
              Launching soon
            </span>
          ) : null}
          {status === 'sold-out' || availabilityState === 'sold_out' ? (
            <span className="mb-1 inline-flex rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
              Sold out · Register interest
            </span>
          ) : null}
          <p
            className={cn('font-bold text-[#2774AE]', actionLabel ? 'text-base' : 'text-fluid-sm')}
          >
            {priceLabel}
          </p>
        </div>
        {actionLabel && (
          <span className="mt-auto flex min-h-[44px] items-center justify-between gap-2 pt-3 text-sm font-semibold text-[#2774AE]">
            {actionLabel}
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </span>
        )}
      </div>
    </Link>
  );
}
