import { Button } from './ui/button';
import {
  Box,
  FileText,
  Heart,
  MapPin,
  Image as ImageIcon,
  PlayCircle,
  Home,
  Ruler,
  GitCompareArrows,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { OptimizedImageCard } from './OptimizedImage';
import { Badge } from './ui/badge';
import { useLocation } from 'wouter';
import { ResponsiveHighlights } from './ResponsiveHighlights';
import { getCompactPropertyFacts } from '@/lib/property';
import { PROPERTY_IMAGE_FALLBACK } from '@/lib/mediaUtils';
import { FallbackImage } from './FallbackImage';
import {
  getPrivateListingContactCopy,
  isExplicitRentListing,
  withRentalPeriod,
} from '@/lib/rentPresentation';
import type { SearchCardIdentity } from '@shared/types';

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

// Public Catalogue Publisher display information.
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
  listerType?: 'agent' | 'agency' | 'private' | 'platform';
  status?: string;
  floor?: string;
  transactionType?: string;
  propertyId?: number;
  onFavoriteClick?: () => void;
  isSaved?: boolean;
  onCompareClick?: () => void;
  isCompared?: boolean;
  compareDisabled?: boolean;
  contactButtonLabel?: string;
  onOpen?: () => void;
  identity?: SearchCardIdentity;
  agent?: AgentInfo;
  developerBrand?: DeveloperBrandInfo; // Public publisher display projection when present
  development?: DevelopmentInfo;
  badges?: string[];
  imageCount?: number;
  videoCount?: number;
  hasFloorplan?: boolean;
  hasVirtualTour?: boolean;
  hasPublicDocuments?: boolean;
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
  status,
  floor,
  transactionType,
  propertyId,
  onFavoriteClick,
  isSaved = false,
  onCompareClick,
  isCompared = false,
  compareDisabled = false,
  contactButtonLabel,
  onOpen,
  identity,
  agent,
  developerBrand,
  development,
  badges,
  imageCount = 0,
  videoCount = 0,
  hasFloorplan = false,
  hasVirtualTour = false,
  hasPublicDocuments = false,
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
    (identity
      ? identity.role === 'private'
        ? 'private'
        : identity.role === 'platform'
          ? 'platform'
          : identity.role === 'agency'
            ? 'agency'
            : identity.role === 'agent'
              ? 'agent'
              : undefined
      : listerType) || (agent ? 'agent' : undefined);
  const isDevelopmentListing = resolvedListingSource === 'development';
  const isPrivateListing = resolvedListingSource === 'manual' && resolvedListerType === 'private';
  const isPlatformListing = resolvedListingSource === 'manual' && resolvedListerType === 'platform';
  const isRentalListing = isExplicitRentListing(listingType);
  const compareHandler = isRentalListing ? undefined : onCompareClick;
  const privateContactCopy = getPrivateListingContactCopy(listingType);
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
  const canonicalIdentity = identity
    ? {
        name: identity.name,
        image: identity.organizationLogoUrl || identity.avatarUrl || null,
        label:
          identity.role === 'agent'
            ? 'Listed by agent'
            : identity.role === 'agency'
              ? 'Listed by agency'
              : identity.role === 'developer'
                ? 'Developer'
                : identity.role === 'platform'
                  ? 'Managed through Property Listify'
                  : isRentalListing
                    ? 'Private rental listing'
                    : 'Private listing',
      }
    : null;
  const listingHref =
    href ||
    (isDevelopmentListing && (developmentHref || developerProfileHref)
      ? developmentHref || developerProfileHref || `/property/${id}`
      : `/property/${id}`);
  const priceLabel =
    price > 0
      ? isDevelopmentListing
        ? withRentalPeriod(`From ${formatCurrency(price)}`, listingType)
        : withRentalPeriod(formatCurrency(price), listingType)
      : 'Price on request';
  const resolvedContactButtonLabel =
    contactButtonLabel ||
    (isDevelopmentListing
      ? 'Contact Developer'
      : isPrivateListing
        ? privateContactCopy.action
        : isPlatformListing
          ? 'Enquire via Property Listify'
          : resolvedListerType === 'agency'
            ? 'Contact Agency'
            : resolvedListerType === 'agent'
              ? 'Contact Agent'
              : 'View details');
  const displayBadges = Array.isArray(badges)
    ? badges.filter(
        badge =>
          !String(badge || '')
            .toLowerCase()
            .startsWith('part of '),
      )
    : [];
  const compactFacts = getCompactPropertyFacts(
    {
      id,
      title,
      price,
      bedrooms,
      bathrooms,
      area,
      yardSize,
      propertyType,
      listingType,
      floor,
    },
    4,
  );

  return (
    <div
      className="group relative w-full bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer"
      onClick={() => {
        onOpen?.();
        setLocation(listingHref);
      }}
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
          <FallbackImage
            src={image as string}
            alt={title}
            loading="lazy"
            fallbackSrc={PROPERTY_IMAGE_FALLBACK}
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

        {/* Buyer decision actions */}
        {(onFavoriteClick || compareHandler) && (
          <div className="absolute top-3 right-3 z-10 flex gap-2">
            {onFavoriteClick && (
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm h-8 w-8 transition-colors ${
                  isSaved ? 'text-red-300' : ''
                }`}
                onClick={e => {
                  e.stopPropagation();
                  onFavoriteClick();
                }}
                aria-label={isSaved ? 'Remove property from saved homes' : 'Save property'}
                aria-pressed={isSaved}
              >
                <Heart
                  className="h-5 w-5 drop-shadow-md"
                  fill={isSaved ? 'currentColor' : 'none'}
                />
              </Button>
            )}
            {compareHandler && propertyId && (
              <Button
                variant="ghost"
                size="icon"
                disabled={compareDisabled}
                className={`rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm h-8 w-8 transition-colors ${
                  isCompared ? 'text-blue-300' : ''
                }`}
                onClick={e => {
                  e.stopPropagation();
                  compareHandler();
                }}
                aria-label={isCompared ? 'Remove property from comparison' : 'Compare property'}
                aria-pressed={isCompared}
              >
                <GitCompareArrows className="h-4 w-4 drop-shadow-md" />
              </Button>
            )}
          </div>
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
          {hasFloorplan && (
            <div
              aria-label="Floor plan available"
              className="bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-sm shadow-sm"
            >
              <Ruler className="h-3 w-3" />
              <span>Plan</span>
            </div>
          )}
          {hasVirtualTour && (
            <div
              aria-label="3D virtual tour available"
              className="bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-sm shadow-sm"
            >
              <Box className="h-3 w-3" />
              <span>3D</span>
            </div>
          )}
          {hasPublicDocuments && (
            <div
              aria-label="Public property document available"
              className="bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 backdrop-blur-sm shadow-sm"
            >
              <FileText className="h-3 w-3" />
              <span>Doc</span>
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
                onOpen?.();
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
                ) : resolvedListerType === 'agency' ? (
                  <Badge className="bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-100">
                    Listed by Agency
                  </Badge>
                ) : isPlatformListing ? (
                  <Badge className="bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-100">
                    Managed by Property Listify
                  </Badge>
                ) : resolvedListerType === 'agent' ? (
                  <Badge className="bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-100">
                    Listed by Agent
                  </Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-100">
                    Contact details unavailable
                  </Badge>
                )}
              </div>
            )}

            <div className="text-xl font-bold text-[#1e1b4b]">{priceLabel}</div>
          </div>

          {/* Specs */}
          <div className="flex items-center gap-4 text-sm text-slate-700 mb-4 flex-wrap">
            {compactFacts.map(fact => {
              const Icon = fact.icon;
              return (
                <div key={fact.key} className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4 text-slate-400" />
                  <span className="font-medium">{fact.shortValue}</span>
                </div>
              );
            })}
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
            {canonicalIdentity && identity?.agentSlug && identity.role === 'agent' ? (
              <a
                href={`/agents/${identity.agentSlug}`}
                className="flex items-center gap-3"
                aria-label={`View ${canonicalIdentity.name}'s profile`}
              >
                <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                  {canonicalIdentity.image ? (
                    <img
                      src={canonicalIdentity.image}
                      alt={canonicalIdentity.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-slate-200 text-xs font-bold text-slate-600">
                      {canonicalIdentity.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-slate-900">
                    {canonicalIdentity.name}
                  </span>
                  <span className="block text-[10px] text-slate-500">{canonicalIdentity.label}</span>
                </span>
              </a>
            ) : canonicalIdentity ? (
              <>
                <div className="h-8 w-8 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                  {canonicalIdentity.image ? (
                    <img
                      src={canonicalIdentity.image}
                      alt={canonicalIdentity.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xs font-bold text-slate-600">
                      {canonicalIdentity.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-900">{canonicalIdentity.name}</div>
                  <div className="text-[10px] text-slate-500">{canonicalIdentity.label}</div>
                </div>
              </>
            ) : isDevelopmentListing ? (
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
            ) : isPrivateListing || isPlatformListing ? (
              <>
                <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
                  PS
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-900">
                    {isPlatformListing ? 'Property Listify' : privateContactCopy.identity}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isPlatformListing
                      ? 'Managed through Property Listify'
                      : isRentalListing
                        ? 'Private rental listing'
                        : 'Private listing'}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="h-8 w-8 rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
                  ?
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-900">
                    Listing contact unavailable
                  </div>
                  <div className="text-[10px] text-slate-500">View the property for details</div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="conversion"
              className="h-9 px-4 text-sm font-medium transition-all"
              onClick={e => {
                e.stopPropagation();
                if (contactButtonLabel === 'View details') {
                  onOpen?.();
                  setLocation(listingHref);
                }
              }}
            >
              {resolvedContactButtonLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
