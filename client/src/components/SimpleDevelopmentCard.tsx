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
}: SimpleDevelopmentCardProps) {
  // Location display
  const locationLabel = suburb ? `${suburb}, ${city}` : city;

  // Format price using SquareYards-style compact formatter
  const priceLabel = formatPriceRangeCompact(priceRange?.min, priceRange?.max);

  return (
    <Link
      href={`/development/${slug || id}`}
      className="group block relative rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg transition-all duration-300 w-full h-full"
    >
      {/* Image Frame - Fixed Aspect Ratio */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {image ? (
          <img
            src={withApiBase(image)}
            alt={title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.style.display = 'none';
              target.parentElement?.classList.add('flex', 'items-center', 'justify-center');
              // Create a placeholder icon element would be harder here without state, so we just hide image and let background show
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300">
            <Building2 className="w-12 h-12" />
          </div>
        )}

        {/* Gradient Overlay for text readability if we had text over image, but we don't. 
            However, a subtle hover effect is nice. */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />

        {/* Badges - Top Right */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end z-10">
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
      <div className="p-3">
        {/* Title */}
        <h3 className="font-semibold text-slate-900 truncate text-[15px] leading-tight mb-1 group-hover:text-[#2774AE] transition-colors">
          {title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-slate-500 text-xs mb-3">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">{locationLabel}</span>
        </div>

        {/* Price */}
        <div className="pt-2 border-t border-slate-100">
          <p className="font-bold text-[#2774AE] text-sm">{priceLabel}</p>
        </div>
      </div>
    </Link>
  );
}
