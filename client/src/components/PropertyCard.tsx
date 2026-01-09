import { Button } from './ui/button';
import { Heart, MapPin, Bed, Bath, Square, Image as ImageIcon, PlayCircle, Home, Maximize } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { OptimizedImageCard } from './OptimizedImage';
import { Badge } from './ui/badge';
import { useLocation } from 'wouter';
import { ResponsiveHighlights } from './ResponsiveHighlights';
import { HouseMeasureIcon } from '@/components/icons/HouseMeasureIcon';

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

// Developer Brand Profile info for platform-wide brand visibility
interface DeveloperBrandInfo {
  id: number;
  brandName: string;
  logoUrl?: string | null;
  slug: string;
}

export interface PropertyCardProps {
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
  developerBrand?: DeveloperBrandInfo; // Developer brand profile when linked
  badges?: string[];
  imageCount?: number;
  videoCount?: number;
  highlights?: string[];
}

const PropertyCard: React.FC<PropertyCardProps> = ({
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
  developerBrand,
  badges,
  imageCount = 15,
  videoCount = 2,
  highlights,
}) => {
  const [, setLocation] = useLocation();
  const isMultiSizeImage = typeof image === 'object' && 'medium' in image;

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
    <div className="group relative w-full bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer" onClick={() => setLocation(`/property/${id}`)}>
      {/* Image  Section */}
      <div className="relative w-full h-56 overflow-hidden">
        {isMultiSizeImage ? (
          <OptimizedImageCard
            images={image as ImageUrls}
            alt={title}
            aspectRatio="16/9"
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
        
        {/* Badges - Top Left */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {/* Status Badge (Transactional) */}
          {status && status !== 'Available' && (
             <Badge className={`border-0 backdrop-blur-md shadow-sm ${
                status.toLowerCase().includes('sold') ? 'bg-red-600/90 text-white' :
                status.toLowerCase().includes('offer') ? 'bg-orange-600/90 text-white' :
                'bg-emerald-600/90 text-white'
             }`}>
               {status}
             </Badge>
          )}

          {/* Property Type Badge */}
          {propertyType && (
            <Badge className="bg-white/90 backdrop-blur-sm hover:bg-white text-slate-900 border-0 shadow-sm font-semibold">
              {propertyType}
            </Badge>
          )}
          
          {/* Dynamic Badges */}
          {badges?.map((badge, index) => {
             const lower = badge.toLowerCase();
             let colorClass = 'bg-blue-600/90 text-white'; // Default Marketing
             
             if (lower.includes('price') || lower.includes('deal') || lower.includes('reduced')) {
                 colorClass = 'bg-emerald-600/90 text-white'; // Financial
             } else if (lower.includes('exclusive') || lower.includes('new')) {
                 colorClass = 'bg-indigo-600/90 text-white'; // Marketing/Exclusive
             } else if (lower.includes('sold') || lower.includes('archived')) {
                 colorClass = 'bg-slate-800/90 text-white'; // Inactive
             }

             return (
                <Badge key={index} className={`${colorClass} backdrop-blur-sm border-0 shadow-sm`}>
                  {badge}
                </Badge>
             );
          })}
        </div>

        {/* Favorite Button */}
        {onFavoriteClick && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm h-8 w-8 transition-colors z-10"
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteClick();
            }}
          >
            <Heart className="h-5 w-5 drop-shadow-md" />
          </Button>
        )}
        
        {/* Media Count Overlay - Bottom Right */}
        <div className="absolute bottom-3 right-3 flex gap-2 z-10">
          {imageCount > 0 && (
            <div className="bg-black/60 hover:bg-black/70 transition-colors text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-sm shadow-sm">
              <ImageIcon className="h-3 w-3" />
              <span>{imageCount}</span>
            </div>
          )}
          {videoCount > 0 && (
            <div className="bg-black/60 hover:bg-black/70 transition-colors text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-sm shadow-sm">
              <PlayCircle className="h-3 w-3" />
              <span>{videoCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1">
          {/* Header: Title → Location → Price */}
          <div className="mb-3">
            <h3 
              className="text-lg font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer mb-2 line-clamp-2"
              onClick={(e) => {
                e.stopPropagation();
                setLocation(`/property/${id}`);
              }}
            >
              {title}
            </h3>

            <div className="flex items-center gap-1.5 text-slate-600 text-sm mb-3">
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
                <HouseMeasureIcon className="h-4 w-4 text-slate-400" />
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
                <Maximize className="h-4 w-4 text-slate-400" />
                <span className="font-medium">
                  {getYardLabel()} {yardSize.toLocaleString()} m²
                </span>
              </div>
            )}
          </div>

          {/* Description Preview */}
          {description && (
            <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-3">
              {description}
            </p>
          )}

          {/* Highlights */}
          {highlights && highlights.length > 0 && (
            <div className="mb-3">
              <ResponsiveHighlights items={highlights} />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
          <div className="flex items-center gap-3">
            {/* Developer Brand takes priority if available */}
            {developerBrand ? (
               <>
                <div 
                  className="h-8 w-8 rounded-full bg-slate-100 overflow-hidden border border-slate-200 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(`/developer/${developerBrand.slug}`);
                  }}
                >
                  {developerBrand.logoUrl ? (
                    <img src={developerBrand.logoUrl} alt={developerBrand.brandName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-indigo-600 text-white text-xs font-bold">
                      {developerBrand.brandName.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <div 
                    className="text-xs font-medium text-slate-900 hover:text-indigo-600 cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/developer/${developerBrand.slug}`);
                    }}
                  >
                    {developerBrand.brandName}
                  </div>
                  <div className="text-[10px] text-slate-500">Developer</div>
                </div>
               </>
            ) : agent ? (
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

export default PropertyCard;
