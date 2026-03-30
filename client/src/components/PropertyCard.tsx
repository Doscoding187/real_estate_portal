import { Button } from './ui/button';
import {
  Heart,
  MapPin,
  Bed,
  Bath,
  Square,
  Image as ImageIcon,
  PlayCircle,
  Home,
  Maximize,
} from 'lucide-react';
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
  id?: string;
  name: string;
  agencyId?: string;
  agency?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  image?: string;
}

// Developer Brand Profile info for platform-wide brand visibility
interface DeveloperBrandInfo {
  id: number;
  brandName: string;
  logoUrl?: string | null;
  slug: string;
  publicContactEmail?: string | null;
  publicContactPhone?: string | null;
}

interface DevelopmentInfo {
  id?: number | string | null;
  name?: string | null;
  slug?: string | null;
}

export interface PropertyCardProps {
  id: string;
  href?: string;
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
  listingSource?: 'manual' | 'development';
  listerType?: 'agent' | 'agency' | 'private';
  status?: string;
  floor?: string;
  transactionType?: string;
  onFavoriteClick?: () => void;
  agent?: AgentInfo;
  developerBrand?: DeveloperBrandInfo; // Developer brand profile when linked
  development?: DevelopmentInfo;
  badges?: string[];
  imageCount?: number;
  videoCount?: number;
  highlights?: string[];
  suppressBadges?: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  id,
  href,
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
  listingSource,
  listerType,
  status = 'Ready to Move',
  floor,
  transactionType = 'New Booking',
  onFavoriteClick,
  agent,
  developerBrand,
  development,
  badges,
  imageCount = 15,
  videoCount = 2,
  highlights,
  suppressBadges = false,
}) => {
  const [, setLocation] = useLocation();
  const isMultiSizeImage = typeof image === 'object' && 'medium' in image;
  const resolvedListingSource =
    listingSource === 'development'
      ? 'development'
      : listingSource === 'manual'
        ? 'manual'
        : !agent && !!developerBrand
          ? 'development'
          : 'manual';
  const resolvedListerType =
    listerType ||
    (agent
      ? 'agent'
      : resolvedListingSource === 'development'
        ? undefined
        : 'private');
  const isDevelopmentListing = resolvedListingSource === 'development';
  const isPrivateListing = resolvedListingSource === 'manual' && resolvedListerType === 'private';
  const developmentHref = development?.slug
    ? `/development/${development.slug}`
    : development?.id
      ? `/development/${development.id}`
      : null;
  const developerIdentity = isDevelopmentListing
    ? {
        brandName: developerBrand?.brandName || development?.name || 'Developer',
        slug: developerBrand?.slug,
        logoUrl: developerBrand?.logoUrl || null,
      }
    : null;
  const developerProfileHref = developerIdentity?.slug
    ? `/developer/${developerIdentity.slug}`
    : developmentHref;
  const listingHref =
    href ||
    (isDevelopmentListing && (developmentHref || developerProfileHref)
      ? developmentHref || developerProfileHref || `/property/${id}`
      : `/property/${id}`);
  const priceLabel =
    price > 0
      ? isDevelopmentListing
        ? `From ${formatCurrency(price)}`
        : formatCurrency(price)
      : 'Price on request';
  const contactButtonLabel = isDevelopmentListing
    ? 'Contact Developer'
    : isPrivateListing
      ? 'Contact Seller'
      : 'Contact Agent';
  const displayBadges = Array.isArray(badges)
    ? badges.filter(badge => !String(badge || '').toLowerCase().startsWith('part of '))
    : [];

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
      className="group relative w-full bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer"
      onClick={() => setLocation(listingHref)}
    >
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
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
            }}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}

        {/* Badges - Top Left */}
        {!suppressBadges && (
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
          {/* Status Badge (Transactional) */}
          {status && status !== 'Available' && (
            <Badge
              className={`border-0 backdrop-blur-md shadow-sm ${
                status.toLowerCase().includes('sold')
                  ? 'bg-red-600/90 text-white'
                  : status.toLowerCase().includes('offer')
                    ? 'bg-orange-600/90 text-white'
                    : 'bg-emerald-600/90 text-white'
              }`}
            >
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
          {displayBadges.map((badge, index) => {
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
        )}

        {/* Favorite Button */}
        {onFavoriteClick && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm h-8 w-8 transition-colors z-10"
            onClick={e => {
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
              onClick={e => {
                e.stopPropagation();
                setLocation(listingHref);
              }}
            >
              {title}
            </h3>

            <div className="flex items-center gap-1.5 text-slate-600 text-sm mb-3">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>{location}</span>
            </div>

            {!suppressBadges && development?.name && (
              <div className="flex items-center gap-1.5 text-slate-600 text-xs mb-3">
                <Home className="h-3.5 w-3.5 text-slate-400" />
                {developmentHref ? (
                  <button
                    type="button"
                    className="min-w-0 truncate hover:text-blue-600 transition-colors"
                    onClick={e => {
                      e.stopPropagation();
                      setLocation(developmentHref);
                    }}
                    title={development.name ?? undefined}
                  >
                    Part of {development.name}
                  </button>
                ) : (
                  <span className="min-w-0 truncate" title={development.name ?? undefined}>
                    Part of {development.name}
                  </span>
                )}
              </div>
            )}

            {!suppressBadges && (
              <div className="mb-3 flex flex-wrap gap-2">
                {isDevelopmentListing ? (
                  <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-50">
                    New Development
                  </Badge>
                ) : isPrivateListing ? (
                  <Badge className="bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-100">
                    Private Listing
                  </Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-100">
                    Listed by Agent
                  </Badge>
                )}
              </div>
            )}

            <div className="text-xl font-bold text-[#1e1b4b]">{priceLabel}</div>
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
            {isDevelopmentListing ? (
              <>
                <div
                  className="h-8 w-8 rounded-full bg-slate-100 overflow-hidden border border-slate-200 cursor-pointer"
                  onClick={e => {
                    e.stopPropagation();
                    if (developerProfileHref) {
                      setLocation(developerProfileHref);
                    }
                  }}
                >
                  {developerIdentity?.logoUrl ? (
                    <img
                      src={developerIdentity.logoUrl}
                      alt={developerIdentity.brandName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-indigo-600 text-white text-xs font-bold">
                      {developerIdentity?.brandName?.charAt(0) || 'D'}
                    </div>
                  )}
                </div>
                <div>
                  <div
                    className="text-xs font-medium text-slate-900 hover:text-indigo-600 cursor-pointer transition-colors"
                    onClick={e => {
                      e.stopPropagation();
                      if (developerProfileHref) {
                        setLocation(developerProfileHref);
                      }
                    }}
                  >
                    {developerIdentity?.brandName || 'Developer'}
                  </div>
                  <div className="text-[10px] text-slate-500">Developer Team</div>
                </div>
              </>
            ) : agent ? (
              <>
                <div className="h-8 w-8 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  {agent.image ? (
                    <img
                      src={agent.image}
                      alt={agent.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-slate-200 text-slate-500 text-xs font-bold">
                      {agent.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-900">{agent.name}</div>
                  <div className="text-[10px] text-slate-500">Listed by agent</div>
                </div>
              </>
            ) : (
              <>
                <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
                  PS
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-900">Private Seller</div>
                  <div className="text-[10px] text-slate-500">Private listing</div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 text-sm font-medium shadow-sm hover:shadow transition-all"
              onClick={e => {
                e.stopPropagation();
                // Contact logic
              }}
            >
              {contactButtonLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
