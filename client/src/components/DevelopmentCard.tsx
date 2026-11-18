import { BadgeCheck, FileText, Heart, Star, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useLocation } from 'wouter';
import { ResponsiveHighlights } from './ResponsiveHighlights';
import { PROPERTY_IMAGE_FALLBACK } from '@/lib/mediaUtils';

export interface DevelopmentCardUnitType {
  id?: string | null;
  bedrooms: number | null;
  label: string;
  priceFrom: number | null;
  isSaved?: boolean;
}

export interface DevelopmentCardProps {
  id: string;
  canonicalRoute?: string;
  title: string;
  rating?: number;
  location: string;
  description: string | null;
  image: string;
  unitTypes: DevelopmentCardUnitType[];
  highlights?: string[];
  developer: {
    name: string;
    logoUrl?: string | null;
    isFeatured?: boolean;
  };
  imageCount?: number;
  isFeatured?: boolean;
  isNewBooking?: boolean;
  publisherTrustLabel?: string;
  classificationLabel?: string;
  transactionType?: 'for_sale' | 'for_rent';
  status?: 'launching-soon' | 'selling' | 'sold-out';
  availabilityState?: 'available' | 'sold_out' | 'not_stated';
  nature?: 'new' | 'phase' | 'extension' | 'redevelopment';
  primaryActionLabel?: string;
  isFavorite?: boolean;
  onFavoriteClick?: () => void;
  onUnitTypeFavoriteClick?: (unitType: DevelopmentCardUnitType) => void;
  onContactClick?: () => void;
}

export function DevelopmentCard({
  id,
  canonicalRoute,
  title,
  rating,
  location,
  description,
  image,
  unitTypes = [],
  highlights = [],
  developer = { name: '', isFeatured: false },
  imageCount = 0,
  isFeatured = false,
  isNewBooking = false,
  publisherTrustLabel,
  classificationLabel,
  transactionType = 'for_sale',
  status,
  availabilityState,
  nature,
  primaryActionLabel = 'Contact Agent',
  isFavorite = false,
  onFavoriteClick,
  onUnitTypeFavoriteClick,
  onContactClick,
}: DevelopmentCardProps) {
  const [, setLocation] = useLocation();
  const developmentRoute = canonicalRoute || `/development/${id}`;
  const sortedUnitTypes = [...unitTypes].sort((left, right) => {
    const leftPrice =
      typeof left.priceFrom === 'number' && left.priceFrom > 0 ? left.priceFrom : null;
    const rightPrice =
      typeof right.priceFrom === 'number' && right.priceFrom > 0 ? right.priceFrom : null;
    if (leftPrice === null && rightPrice !== null) return 1;
    if (rightPrice === null && leftPrice !== null) return -1;
    if (leftPrice !== null && rightPrice !== null && leftPrice !== rightPrice) {
      return leftPrice - rightPrice;
    }
    return left.label.localeCompare(right.label, undefined, { numeric: true, sensitivity: 'base' });
  });

  const formatPrice = (price: number) => {
    const compactPrice = new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 3,
    }).format(price);
    return `R${compactPrice.toLowerCase()}`;
  };

  return (
    <article className="group relative mx-auto flex h-auto w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md lg:min-h-[286px] lg:flex-row">
      {/* Image Section (Left) */}
      <div
        className="relative aspect-[2/1] w-full shrink-0 cursor-pointer overflow-hidden lg:aspect-auto lg:min-h-[264px] lg:w-[38%]"
        onClick={() => setLocation(developmentRoute)}
      >
        <img
          src={image}
          alt={title}
          loading="lazy"
          onError={e => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = PROPERTY_IMAGE_FALLBACK;
          }}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top Badges */}
        <div className="absolute left-3 top-3 flex max-w-[calc(100%_-_3.5rem)] flex-wrap gap-1.5">
          {isFeatured && (
            <Badge className="bg-slate-800/90 backdrop-blur-sm hover:bg-slate-800 text-white border-0 uppercase text-xs font-semibold">
              Featured
            </Badge>
          )}
          {classificationLabel && (
            <span className="inline-flex items-center rounded-md border border-white/70 bg-white/95 px-2 py-1 text-[10px] font-semibold leading-none text-slate-700 shadow-sm backdrop-blur-sm">
              {classificationLabel}
            </span>
          )}
        </div>

        {/* Favorite Button */}
        {onFavoriteClick && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              isFavorite ? `Remove ${title} from saved developments` : `Save ${title} development`
            }
            aria-pressed={isFavorite}
            className={`absolute top-3 right-3 h-9 w-9 rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur-sm hover:bg-white ${isFavorite ? 'text-rose-600 hover:text-rose-700' : ''}`}
            onClick={e => {
              e.stopPropagation();
              onFavoriteClick();
            }}
          >
            <Heart className="h-5 w-5" fill={isFavorite ? 'currentColor' : 'none'} />
          </Button>
        )}

        {/* Image Count */}
        {imageCount > 0 && (
          <div className="absolute bottom-3 left-3 bg-slate-800/80 text-white text-xs px-2.5 py-1 rounded flex items-center gap-1.5 backdrop-blur-sm">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <span className="font-medium">{imageCount}</span>
          </div>
        )}
      </div>

      {/* Content Section (Right) */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-4 sm:p-5">
        <div className="space-y-3">
          {/* Header */}
          <div>
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3
                  className="flex min-w-0 cursor-pointer items-center gap-2 break-words text-xl font-bold leading-tight text-slate-950 transition-colors hover:text-primary sm:text-2xl"
                  onClick={() => setLocation(developmentRoute)}
                >
                  {title}
                  {typeof rating === 'number' && rating > 0 && (
                    <span className="flex items-center gap-1 text-sm font-normal">
                      <Star className="h-4 w-4 fill-green-600 text-green-600" />
                      <span className="text-slate-700">{rating.toFixed(1)}</span>
                    </span>
                  )}
                </h3>
                {publisherTrustLabel && (
                  <span
                    role="img"
                    aria-label={publisherTrustLabel}
                    title={publisherTrustLabel}
                    className="inline-flex shrink-0 items-center justify-center"
                  >
                    {publisherTrustLabel === 'Direct developer' ? (
                      <BadgeCheck className="h-5 w-5 fill-blue-600 text-white" aria-hidden="true" />
                    ) : (
                      <FileText className="h-5 w-5 text-slate-500" aria-hidden="true" />
                    )}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {/* Nature Badge */}
                {nature === 'phase' && (
                  <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                    New Phase
                  </Badge>
                )}
                {nature === 'extension' && (
                  <Badge
                    variant="outline"
                    className="border-purple-200 text-purple-700 bg-purple-50"
                  >
                    Extension
                  </Badge>
                )}

                {/* Status Badge */}
                {status === 'launching-soon' && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                    Launching Soon
                  </Badge>
                )}
                {status === 'sold-out' && (
                  <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200">
                    Sold Out
                  </Badge>
                )}
                {availabilityState === 'sold_out' && status !== 'sold-out' && (
                  <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200">
                    Sold out
                  </Badge>
                )}
                {availabilityState === 'available' && status !== 'sold-out' && (
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                    Units available
                  </Badge>
                )}

                {/* Legacy / High Priority Badges */}
                {isNewBooking && (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 uppercase text-xs font-semibold">
                    New Booking
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center text-xs text-slate-600">
              <MapPin className="mr-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
              {location}
            </div>
          </div>

          {/* Unit Types with Pricing */}
          {sortedUnitTypes.length > 0 && (
            <section aria-label="Home types and starting prices">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {sortedUnitTypes.length} home types
                </h4>
                <span className="text-[10px] text-slate-500">Starting prices · low to high</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {sortedUnitTypes.slice(0, 3).map((unit, index) => {
                  const price = typeof unit.priceFrom === 'number' ? unit.priceFrom : null;
                  return (
                    <div
                      key={unit.id || index}
                      className="relative min-w-0 rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-2 transition-colors hover:border-blue-300 hover:bg-blue-50/50"
                    >
                      <div
                        className="truncate pr-6 text-[10px] text-slate-500"
                        title={unit.label || ''}
                      >
                        {unit.label || ''}
                      </div>
                      {price !== null && price > 0 ? (
                        <div className="truncate text-xs font-bold text-[#1e1b4b]">
                          {formatPrice(price)}
                          {transactionType === 'for_rent' ? ' / month' : ''}
                        </div>
                      ) : (
                        <div className="truncate text-[11px] font-semibold text-slate-500">
                          {transactionType === 'for_rent'
                            ? 'Monthly rent on request'
                            : 'Price on request'}
                        </div>
                      )}
                      {unit.id && onUnitTypeFavoriteClick && (
                        <button
                          type="button"
                          aria-label={
                            unit.isSaved
                              ? `Remove ${unit.label} at ${title} from saved home types`
                              : `Save ${unit.label} at ${title}`
                          }
                          aria-pressed={Boolean(unit.isSaved)}
                          onClick={() => onUnitTypeFavoriteClick(unit)}
                          className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${unit.isSaved ? 'text-rose-600' : 'text-slate-400 hover:text-rose-600'}`}
                        >
                          <Heart
                            className="h-3.5 w-3.5"
                            fill={unit.isSaved ? 'currentColor' : 'none'}
                            aria-hidden="true"
                          />
                        </button>
                      )}
                    </div>
                  );
                })}
                {sortedUnitTypes.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setLocation(developmentRoute)}
                    aria-label={`View all ${sortedUnitTypes.length} home types in ${title}`}
                    title={sortedUnitTypes
                      .slice(3)
                      .map(unit => {
                        const price =
                          typeof unit.priceFrom === 'number'
                            ? formatPrice(unit.priceFrom)
                            : 'Price on request';
                        return `${unit.label}: ${price}`;
                      })
                      .join('\n')}
                    className="flex min-h-[44px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-2 text-center text-xs font-semibold text-slate-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                  >
                    +{sortedUnitTypes.length - 3} more types
                  </button>
                )}
              </div>
            </section>
          )}

          <div>
            {/* Description */}
            <p className="line-clamp-3 text-xs leading-5 text-slate-600">
              {description || 'Description not provided.'}
            </p>

            {/* Highlights */}
            {highlights.length > 0 && (
              <div className="mt-2.5">
                <ResponsiveHighlights
                  items={highlights}
                  maxVisible={2}
                  singleLine
                  onClick={() => setLocation(developmentRoute)}
                  actionLabel={`View ${title} development details from highlights`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-start justify-between gap-2.5 border-t border-slate-100 pt-3.5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-2.5">
            {developer.logoUrl && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5">
                <img
                  src={developer.logoUrl}
                  alt={`${developer.name} logo`}
                  loading="lazy"
                  className="max-h-full max-w-full object-contain"
                />
              </span>
            )}
            <div className="min-w-0">
              {developer.isFeatured && (
                <Badge className="mb-1 bg-orange-500 text-xs font-semibold text-white hover:bg-orange-600">
                  FEATURED DEVELOPER
                </Badge>
              )}
              <div className="truncate text-xs font-semibold text-slate-700">{developer.name}</div>
            </div>
          </div>

          <Button
            variant="conversion"
            className="h-9 w-full px-5 font-semibold sm:w-auto"
            onClick={e => {
              e.stopPropagation();
              if (onContactClick) {
                onContactClick();
              } else {
                // Development detail owns the canonical enquiry dialog and attribution context.
                setLocation(developmentRoute);
              }
            }}
          >
            {primaryActionLabel}
          </Button>
        </div>
      </div>
    </article>
  );
}
