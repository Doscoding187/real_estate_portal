import { Heart, Star, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useLocation } from 'wouter';
import { ResponsiveHighlights } from './ResponsiveHighlights';

export interface DevelopmentCardProps {
  id: string;
  title: string;
  rating?: number;
  location: string;
  description: string;
  image: string;
  unitTypes: {
    bedrooms: number;
    label: string;
    priceFrom: number;
  }[];
  highlights?: string[];
  developer: {
    name: string;
    isFeatured?: boolean;
  };
  imageCount?: number;
  isFeatured?: boolean;
  isNewBooking?: boolean;
  onFavoriteClick?: () => void;
  onContactClick?: () => void;
}

export function DevelopmentCard({
  id,
  title,
  rating,
  location,
  description,
  image,
  unitTypes = [],
  highlights = [],
  developer = { name: '', isFeatured: false },
  imageCount = 15,
  isFeatured = false,
  isNewBooking = false,
  onFavoriteClick,
  onContactClick,
}: DevelopmentCardProps) {
  const [, setLocation] = useLocation();

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `R${(price / 1000000).toFixed(1)}m`;
    }
    return `R${(price / 1000).toFixed(0)}k`;
  };

  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col md:flex-row h-auto max-w-[900px]">
      {/* Image Section (Left) - 40% width */}
      <div 
        className="relative w-full md:w-[40%] h-64 md:h-auto md:min-h-[320px] shrink-0 overflow-hidden cursor-pointer" 
        onClick={() => setLocation(`/development/${id}`)}
      >
        <img
          src={image}
          alt={title}
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
          }}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Top Badges */}
        <div className="absolute top-3 left-3">
          {isFeatured && (
            <Badge className="bg-slate-800/90 backdrop-blur-sm hover:bg-slate-800 text-white border-0 uppercase text-xs font-semibold">
              Featured
            </Badge>
          )}
        </div>

        {/* Favorite Button */}
        {onFavoriteClick && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 rounded-full bg-white/80 hover:bg-white text-slate-700 backdrop-blur-sm h-9 w-9"
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteClick();
            }}
          >
            <Heart className="h-5 w-5" />
          </Button>
        )}

        {/* Image Count */}
        {imageCount > 0 && (
          <div className="absolute bottom-3 left-3 bg-slate-800/80 text-white text-xs px-2.5 py-1 rounded flex items-center gap-1.5 backdrop-blur-sm">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            <span className="font-medium">{imageCount}</span>
          </div>
        )}
      </div>

      {/* Content Section (Right) - 60% width */}
      <div className="flex-1 p-6 flex flex-col justify-between min-w-0">
        <div>
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-start justify-between mb-2">
              <h3 
                className="text-2xl font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-2"
                onClick={() => setLocation(`/development/${id}`)}
              >
                {title}
                {rating && (
                  <span className="flex items-center gap-1 text-sm font-normal">
                    <Star className="h-4 w-4 fill-green-600 text-green-600" />
                    <span className="text-slate-700">{rating.toFixed(1)}</span>
                  </span>
                )}
              </h3>
              
              {isNewBooking && (
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 uppercase text-xs font-semibold">
                  New Booking
                </Badge>
              )}
            </div>

            <div className="flex items-center text-slate-600 text-sm mb-3">
              <MapPin className="h-3.5 w-3.5 mr-1" />
              {location}
            </div>
          </div>

          {/* Unit Types with Pricing */}
          <div className="flex gap-3 mb-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {unitTypes.map((unit, index) => (
              <div key={index} className="flex-none w-[160px] border border-slate-200 rounded-lg p-3 hover:border-blue-400 hover:bg-blue-50/50 transition-colors bg-slate-50/30">
                <div className="text-xs text-slate-600 mb-1 truncate" title={unit.label}>{unit.label}</div>
                <div className="text-lg font-bold text-[#1e1b4b]">
                  From {formatPrice(unit.priceFrom)}
                </div>
              </div>
            ))}
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 line-clamp-2 mb-4">
            {description}
          </p>

          {/* Highlights */}
          {highlights.length > 0 && (
            <div className="mb-4">
              <span className="text-sm font-semibold text-slate-700 block mb-1">Highlights :</span>
              <ResponsiveHighlights items={highlights} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            {developer.isFeatured && (
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold mb-1">
                FEATURED DEALER
              </Badge>
            )}
            <div className="text-sm font-medium text-slate-900">{developer.name}</div>
          </div>

          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6"
            onClick={(e) => {
              e.stopPropagation();
              if (onContactClick) {
                onContactClick();
              } else {
                setLocation(`/development/${id}/contact`);
              }
            }}
          >
            Contact Agent
          </Button>
        </div>
      </div>
    </div>
  );
}
