import { formatCurrency } from '@/lib/utils';
import { Link } from 'wouter';

export interface SimpleDevelopmentCardProps {
  id: string;
  title: string;
  city: string;
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
  priceRange,
  image,
  slug,
  isHotSelling,
  isHighDemand,
}: SimpleDevelopmentCardProps) {
  return (
    <Link 
      href={`/development/${slug || id}`}
      className="group relative rounded-card overflow-hidden bg-white hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 block"
      style={{ 
        border: 'var(--card-border)',
      }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="object-contain w-full h-full transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
          {isHotSelling && (
            <span 
              className="text-white font-semibold px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1 text-xs"
              style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}
            >
              🔥 Hot Selling
            </span>
          )}
          {!isHotSelling && isHighDemand && (
            <span 
              className="text-white font-semibold px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1 text-xs"
              style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
            >
              📈 High Demand
            </span>
          )}
        </div>
      </div>

      {/* Content - Using Fluid Tailwind Classes */}
      <div className="flex flex-col p-card-p gap-card-g">
        {/* Title - Fluid font size */}
        <h3 className="text-fluid-h4 font-semibold truncate text-slate-900 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>

        {/* City - Smaller fluid text */}
        <p className="text-slate-500 flex items-center gap-1 text-sm">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {city}
        </p>

        {/* Price Range - Compact */}
        <div className="pt-2 mt-auto border-t border-slate-100">
          <p className="font-semibold text-slate-600 text-xs tracking-wider uppercase mb-1">
            Price Range
          </p>
          <p className="font-bold text-blue-600 text-base">
            {formatCurrency(priceRange.min)} - {formatCurrency(priceRange.max)}
          </p>
        </div>
      </div>
    </Link>
  );
}
