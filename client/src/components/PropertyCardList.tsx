import React from 'react';
import { Button } from './ui/button';
import { Heart, MapPin, Bed, Bath, Square, Building2, Image as ImageIcon, PlayCircle, Plus, Check, Home } from 'lucide-react';
import { useComparison } from '@/contexts/ComparisonContext';
import { formatCurrency } from '@/lib/utils';
import { OptimizedImageCard } from './OptimizedImage';
import { Badge } from './ui/badge';
import { useLocation } from 'wouter';
import { ResponsiveHighlights } from './ResponsiveHighlights';

interface ImageUrls {
  thumbnail: string;
  small: string;
  medium: string;
  large: string;
  original: string;
}

interface AgentInfo {
  name: string;
  image?: string;
}

export interface PropertyCardListProps {
  id: string;
  title: string;
  price: number;
  location: string;
  image: string | ImageUrls;
  description?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  yardSize?: number; // Separate yard/land/plot size
  propertyType?: string;
  listingType?: string;
  status?: string;
  floor?: string;
  transactionType?: string;
  onFavoriteClick?: () => void;
  agent?: AgentInfo;
  badges?: string[];
  imageCount?: number;
  videoCount?: number;
  highlights?: string[];
}

const PropertyCardList: React.FC<PropertyCardListProps> = ({
  id,
  title,
  price,
  location,
  image,
  description,
  bedrooms,
  bathrooms,
  area,
  yardSize, // Yard/land size
  propertyType,
  listingType,
  status = "Ready to Move",
  floor,
  transactionType = "New Booking",
  onFavoriteClick,
  agent,
  badges,
  imageCount = 15,
  videoCount = 2,
  highlights,
}) => {
  const [, setLocation] = useLocation();
  const { addToComparison, removeFromComparison, isInComparison, canAddMore } = useComparison();
  const isMultiSizeImage = typeof image === 'object' && 'medium' in image;
  const propertyId = parseInt(id);
  const inComparison = isInComparison(propertyId);

  const handleComparisonToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inComparison) {
      removeFromComparison(propertyId);
    } else {
      addToComparison(propertyId);
    }
  };

  // Determine area label based on property type
  const getAreaLabel = () => {
    const type = propertyType?.toLowerCase();
    if (type === 'commercial') return ' (Floor)';
    return ''; // Default for apartments and houses - just show as Size
  };

  // Check if we should show yard/land size (for houses, plots, farms)
  const showsYardSize = () => {
    const type = propertyType?.toLowerCase();
    return type === 'house' || type === 'plot' || type === 'farm';
  };

  // Get yard/land label based on property type
  const getYardLabel = () => {
    const type = propertyType?.toLowerCase();
    if (type === 'plot' || type === 'farm') return 'Land';
    return 'Yard'; // Houses
  };

  return (
    <div 
      className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col md:flex-row h-auto max-w-[840px] cursor-pointer"
      onClick={() => setLocation(`/property/${id}`)}
    >
      {/* Image Section (Left) -40% width */}
      <div className="relative w-full md:w-[40%] h-56 md:h-auto md:aspect-square shrink-0 overflow-hidden">
        {isMultiSizeImage ? (
          <OptimizedImageCard
            images={image as ImageUrls}
            alt={title}
            aspectRatio="1/1"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <img
            src={image as string}
            alt={title}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
            }}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {/* Property Type Badge */}
          {propertyType && (
            <Badge className="bg-white/90 backdrop-blur-sm hover:bg-white text-slate-700 border-0">
              {propertyType}
            </Badge>
          )}
          
          {/* Dynamic Badges */}
          {badges?.map((badge, index) => (
            <Badge key={index} className="bg-blue-600/90 backdrop-blur-sm hover:bg-blue-600 text-white border-0">
              {badge}
            </Badge>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          {/* Comparison Button */}
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-full backdrop-blur-sm h-9 w-9 border transition-all ${
              inComparison
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                : 'bg-black/30 hover:bg-black/50 text-white border-white/20'
            }`}
            onClick={handleComparisonToggle}
            disabled={!inComparison && !canAddMore}
            title={inComparison ? 'Remove from comparison' : 'Add to comparison'}
          >
            {inComparison ? (
              <Check className="h-5 w-5" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
          </Button>

          {/* Favorite Button */}
          {onFavoriteClick && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm h-9 w-9 border border-white/20"
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteClick();
              }}
            >
              <Heart className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        {/* Media Count Overlay */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          {imageCount > 0 && (
            <div className="bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1.5 backdrop-blur-sm">
              <ImageIcon className="h-3.5 w-3.5" />
              <span className="font-medium">{imageCount}</span>
            </div>
          )}
          {videoCount > 0 && (
            <div className="bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1.5 backdrop-blur-sm">
              <PlayCircle className="h-3.5 w-3.5" />
              <span className="font-medium">{videoCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content Section (Right) - 60% width */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div>
          {/* Header: Title → Location → Price */}
          {/* Header: Title → Location → Price */}
          <div className="mb-4">
            <h3 
              className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1 line-clamp-2"
            >
              {title}
            </h3>

            <div className="flex items-center gap-1.5 text-slate-600 text-sm mb-4">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>{location}</span>
            </div>
            
            <div className="text-xl font-bold text-[#1e1b4b]">
              {formatCurrency(price)}
            </div>
          </div>

          {/* Specs */}
          <div className="flex items-center gap-4 text-sm text-slate-700 mb-4 flex-wrap">
            {/* Building/Floor Size (always show if available) */}
            {area && (
              <div className="flex items-center gap-1.5">
                <Home className="h-4 w-4 text-slate-400" />
                <span className="font-medium">
                  Size {area.toLocaleString()} m²{getAreaLabel()}
                </span>
              </div>
            )}
            {bedrooms && (
              <div className="flex items-center gap-1.5">
                <Bed className="h-4 w-4 text-slate-400" />
                <span className="font-medium">{bedrooms} Bed</span>
              </div>
            )}
            {bathrooms && (
              <div className="flex items-center gap-1.5">
                <Bath className="h-4 w-4 text-slate-400" />
                <span className="font-medium">{bathrooms} Bath</span>
              </div>
            )}
            {/* Yard/Land Size (only for houses, plots, farms) */}
            {showsYardSize() && yardSize && (
              <div className="flex items-center gap-1.5">
                <Square className="h-4 w-4 text-slate-400" />
                <span className="font-medium">
                  {getYardLabel()} {yardSize.toLocaleString()} m²
                </span>
              </div>
            )}
          </div>

          {/* Highlights */}
          {highlights && highlights.length > 0 && (
            <div className="mb-3">
              <ResponsiveHighlights items={highlights} />
            </div>
          )}

          {/* Description Preview */}
          {description && (
            <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-3">
              {description}
            </p>
          )}


        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
          <div className="flex items-center gap-3">
            {agent ? (
               <>
                <div className="h-8 w-8 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  {agent.image ? (
                    <img src={agent.image} alt={agent.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-slate-200 text-slate-500 text-xs font-bold">
                      {agent.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-900">{agent.name}</div>
                  <div className="text-[10px] text-slate-500">Featured Agent</div>
                </div>
               </>
            ) : (
              <>
                <div className="h-8 w-8 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  <img src="/assets/agent-placeholder.jpg" alt="Dealer" className="h-full w-full object-cover" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-900">Luxury Estates</div>
                  <div className="text-[10px] text-slate-500">Featured Dealer</div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 text-sm font-medium shadow-sm hover:shadow transition-all"
              onClick={(e) => {
                e.stopPropagation();
                // Contact logic
              }}
            >
              Contact Agent
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCardList;
