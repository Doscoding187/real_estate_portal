import { formatPriceRangeCompact } from '@/lib/utils';
import { Link } from 'wouter';
import { withApiBase } from '@/lib/mediaUtils';
import { Building2, MapPin } from 'lucide-react';

export interface SimpleDevelopmentCardProps {
  id: string;
  title: string;
  city: string;
  suburb?: string;
  priceRange: {
    min: number;
    max: number;
  };
  image: string;
  slug?: string;
  isHotSelling?: boolean;
  isHighDemand?: boolean;
  bedrooms?: number[] | string;
  href?: string;
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
  href,
}: SimpleDevelopmentCardProps) {
  // Location display
  const locationLabel = suburb ? `${suburb}, ${city}` : city;

  // Format price using SquareYards-style compact formatter
  const priceLabel = formatPriceRangeCompact(priceRange?.min, priceRange?.max);

  // Bedroom Label
  let bedroomLabel = '';
  if (Array.isArray(bedrooms) && bedrooms.length > 0) {
    // Normalize and sort: cap > 5 as 5 (display as 5+)
    const uniqueBeds = Array.from(new Set(bedrooms.map(b => (b > 5 ? 6 : b)))).sort(
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
      className="group relative block w-full max-w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:shadow-lg"
    >
      {/* Image Frame - Fixed Aspect Ratio */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {/* Placeholder Background (Always Rendered as Base Layer) */}
        <div className="absolute inset-0 flex items-center justify-center text-slate-300">
          <Building2 className="w-12 h-12" />
        </div>

        {/* Image Layer - Hides on Error to reveal placeholder */}
        {image && (
          <img
            src={withApiBase(image)}
            alt={title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 z-10"
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.style.display = 'none';
            }}
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
      <div className="p-4 pt-5">
        {/* Title */}
        <h3 className="mb-1 line-clamp-2 text-fluid-sm font-semibold leading-tight text-slate-900 transition-colors group-hover:text-[#2774AE]">
          {title}
        </h3>

        {/* Location */}
        <div className="mb-3 flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">{locationLabel}</span>
        </div>

        {/* Bedrooms - Badge Style */}
        {bedroomLabel && (
          <div className="mb-3 flex items-center gap-1">
            <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-1 rounded-md">
              {bedroomLabel}
            </span>
          </div>
        )}

        {/* Price */}
        <div className="border-t border-slate-100 pt-2">
          <p className="font-bold text-[#2774AE] text-fluid-sm">{priceLabel}</p>
        </div>
      </div>
    </Link>
  );
}
