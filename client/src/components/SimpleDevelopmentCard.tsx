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
}

export function SimpleDevelopmentCard({
  id,
  title,
  city,
  priceRange,
  image,
}: SimpleDevelopmentCardProps) {
  const [, setLocation] = useLocation();

  return (
    <div 
      className="group relative rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 cursor-pointer"
      onClick={() => setLocation(`/development/${id}`)}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={title}
          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Title */}
        <h3 className="text-lg font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>

        {/* City */}
        <p className="text-sm text-muted-foreground mb-3">
          {city}
        </p>

        {/* Price Range */}
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs text-muted-foreground mb-1">Price Range</p>
          <p className="text-base font-semibold text-foreground">
            {formatCurrency(priceRange.min)} - {formatCurrency(priceRange.max)}
          </p>
        </div>
      </div>
    </div>
  );
}
