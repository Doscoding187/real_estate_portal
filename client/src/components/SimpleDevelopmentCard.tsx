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
      className="group relative rounded-xl overflow-hidden bg-white hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1"
      style={{ 
        border: 'var(--card-border)',
        borderRadius: 'var(--card-radius)'
      }}
      onClick={() => setLocation(`/development/${id}`)}
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
              className="text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1"
              style={{ fontSize: 'clamp(0.65rem, 0.7vw, 0.75rem)', background: 'linear-gradient(135deg, #ef4444, #f97316)' }}
            >
              🔥 Hot Selling
            </span>
          )}
          {!isHotSelling && isHighDemand && (
            <span 
              className="text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1"
              style={{ fontSize: 'clamp(0.65rem, 0.7vw, 0.75rem)', background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
            >
              📈 High Demand
            </span>
          )}
        </div>
      </div>

      {/* Content - Tighter padding */}
      <div style={{ padding: 'var(--card-padding)', gap: 'var(--card-gap)', display: 'flex', flexDirection: 'column' }}>
        {/* Title - Fluid font size */}
        <h3 
          className="font-semibold line-clamp-2 text-slate-900 group-hover:text-blue-600 transition-colors leading-tight"
          style={{ fontSize: 'clamp(0.9rem, 1vw, 1.05rem)' }}
        >
          {title}
        </h3>

        {/* City - Smaller meta text */}
        <p 
          className="text-slate-500 flex items-center gap-1"
          style={{ fontSize: 'clamp(0.75rem, 0.8vw, 0.85rem)' }}
        >
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {city}
        </p>

        {/* Price Range - Compact */}
        <div className="pt-2 mt-auto border-t border-slate-100">
          <p 
            className="font-semibold text-slate-600"
            style={{ fontSize: 'clamp(0.65rem, 0.7vw, 0.75rem)', letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: '0.25rem' }}
          >
            Price Range
          </p>
          <p 
            className="font-bold text-blue-600"
            style={{ fontSize: 'clamp(0.85rem, 0.95vw, 1rem)' }}
          >
            {formatCurrency(priceRange.min)} - {formatCurrency(priceRange.max)}
          </p>
        </div>
      </div>
    </div>
  );
}
