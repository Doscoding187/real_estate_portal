import { formatCurrency } from '@/lib/utils';
import { useLocation } from 'wouter';

export interface SimpleDevelopmentCardProps {
  id: string;
  title: string;
  city: string;
  priceRange: {
    min: number;
    max: number;
  };
  image: string;
  isHotSelling?: boolean;
  isHighDemand?: boolean;
}

export function SimpleDevelopmentCard({
  id,
  title,
  city,
  priceRange,
  image,
  isHotSelling,
  isHighDemand,
}: SimpleDevelopmentCardProps) {
  const [, setLocation] = useLocation();

  return (
    <div 
      className="group relative rounded-2xl overflow-hidden bg-white shadow-md hover:shadow-2xl transition-all duration-500 border border-slate-200/60 hover:border-blue-300 cursor-pointer hover:-translate-y-2"
      onClick={() => setLocation(`/development/${id}`)}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          {isHotSelling && (
            <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 backdrop-blur-sm">
              <span className="text-base">🔥</span>
              Hot Selling
            </span>
          )}
          {!isHotSelling && isHighDemand && (
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 backdrop-blur-sm">
              <span className="text-base">📈</span>
              High Demand
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Title */}
        <h3 className="text-lg font-bold mb-2 line-clamp-2 text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
          {title}
        </h3>

        {/* City */}
        <p className="text-sm text-slate-600 mb-4 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {city}
        </p>

        {/* Price Range */}
        <div className="pt-4 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Price Range</p>
          <p className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {formatCurrency(priceRange.min)} - {formatCurrency(priceRange.max)}
          </p>
        </div>
      </div>
    </div>
  );
}
