import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { HouseMeasureIcon } from '@/components/icons/HouseMeasureIcon';
import {
  ArrowRight,
  Bath,
  Bed,
  Building2,
  Camera,
  CarFront,
  GitCompareArrows,
  Heart,
  LandPlot,
  MapPin,
} from 'lucide-react';
import { Link } from 'wouter';
import { PROPERTY_IMAGE_FALLBACK, withApiBase } from '@/lib/mediaUtils';
import { isExplicitRentListing, withRentalPeriod } from '@/lib/rentPresentation';
import type { SearchCardIdentity } from '@shared/types';
import type { ListingCardHighlight } from '@shared/listing-highlight-registry';
import type { PublicPropertyDetailFact } from '@shared/public-property-detail-presentation';
import { getListingHighlightIcon } from './listingHighlightIcons';

export interface ListingResultCardData {
  id: string;
  href?: string;
  title: string;
  location: string;
  price: number;
  image: string;
  imageCount?: number;
  development?: {
    id?: string | number | null;
    name?: string | null;
    slug?: string | null;
  };
  area?: number;
  yardSize?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: PublicPropertyDetailFact;
  rentalSnapshot?: PublicPropertyDetailFact[];
  highlights?: ListingCardHighlight[];
  listingType?: 'sale' | 'rent' | string;
  listingSource?: 'manual' | 'development';
  listerType?: 'agent' | 'agency' | 'private' | 'platform';
  contactRole?: 'agent' | 'agency' | 'developer' | 'private' | 'platform';
  identity?: SearchCardIdentity;
  postedBy?: string;
  agentAvatarUrl?: string;
  propertyId?: number;
  isSaved?: boolean;
  onSave?: () => void;
  isCompared?: boolean;
  onCompare?: () => void;
  compareDisabled?: boolean;
  onOpen?: () => void;
}

function formatPrice(
  price: number,
  options?: { from?: boolean; listingType?: ListingResultCardData['listingType'] },
) {
  const normalizedPrice = Number(price || 0);
  if (normalizedPrice <= 0) return 'Price on request';
  const formattedPrice = `R ${normalizedPrice.toLocaleString()}`;
  return withRentalPeriod(
    options?.from ? `From ${formattedPrice}` : formattedPrice,
    options?.listingType,
  );
}

function identityRoleLabel(role: ListingResultCardData['contactRole']): string {
  switch (role) {
    case 'developer':
      return 'Developer';
    case 'agency':
      return 'Listing agency';
    case 'agent':
      return 'Listing agent';
    case 'private':
      return 'Private advertiser';
    case 'platform':
      return 'Platform listing';
    default:
      return 'Property lister';
  }
}

export function ListingResultCard({ data }: { data: ListingResultCardData }) {
  const canonicalIdentity = data.identity;
  const contactRole = canonicalIdentity?.role ?? data.contactRole;
  const isDevelopmentListing = data.listingSource === 'development' || contactRole === 'developer';
  const isRentalListing = isExplicitRentListing(data.listingType);
  const compareHandler = isRentalListing ? undefined : data.onCompare;
  const identityDisplayName =
    canonicalIdentity?.name?.trim() ||
    data.postedBy?.trim() ||
    (contactRole === 'private'
      ? isRentalListing
        ? 'Private Advertiser'
        : 'Private Seller'
      : contactRole === 'platform'
        ? 'Property Listify'
        : isDevelopmentListing
          ? 'Developer Team'
          : 'Listing contact unavailable');
  const agentInitials = identityDisplayName
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase();
  const developmentName = String(data.development?.name || '').trim();
  const developmentHref = developmentName
    ? data.development?.slug
      ? `/development/${data.development.slug}`
      : data.development?.id
        ? `/development/${data.development.id}`
        : null
    : null;
  const listingHref =
    data.href ||
    (isDevelopmentListing && developmentHref ? developmentHref : `/property/${data.id}`);
  const resolvedImage = withApiBase(data.image) || PROPERTY_IMAGE_FALLBACK;
  const resolvedAvatar = withApiBase(
    canonicalIdentity?.organizationLogoUrl || canonicalIdentity?.avatarUrl || data.agentAvatarUrl,
  );
  const agentProfileHref =
    canonicalIdentity?.agentSlug && contactRole === 'agent'
      ? `/agents/${canonicalIdentity.agentSlug}`
      : null;
  const highlights = Array.isArray(data.highlights) ? data.highlights.slice(0, 3) : [];
  const rentalParking = isRentalListing
    ? (data.parking ?? {
        key: 'parking',
        label: 'Parking',
        value: 'To confirm',
        icon: 'parking' as const,
        status: 'not_supplied' as const,
      })
    : undefined;
  const rentalSnapshot = isRentalListing
    ? (Array.isArray(data.rentalSnapshot) ? data.rentalSnapshot : [])
        .filter(
          fact => fact.key === 'availability' || fact.key === 'lease' || fact.key === 'furnishing',
        )
        .slice(0, 3)
    : [];

  return (
    <article className="group relative w-full overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_16px_40px_-30px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.35)] sm:h-[312px] lg:rounded-[26px]">
      <Link
        href={listingHref}
        onClick={data.onOpen}
        aria-label={`View ${data.title}`}
        className="absolute inset-0 z-10 rounded-[24px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-500/35 lg:rounded-[26px]"
      >
        <span className="sr-only">View {data.title}</span>
      </Link>

      <div className="flex flex-col sm:h-[312px] sm:flex-row">
        <div className="relative h-[196px] flex-shrink-0 overflow-hidden sm:h-[312px] sm:w-[43%] lg:w-[44%]">
          <img
            src={resolvedImage}
            alt={data.title}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            onError={event => {
              const target = event.currentTarget;
              target.onerror = null;
              target.src = PROPERTY_IMAGE_FALLBACK;
            }}
          />
          {typeof data.imageCount === 'number' && data.imageCount > 0 && (
            <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-xs font-semibold text-white">
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
              {data.imageCount}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:h-[312px] sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center justify-between gap-4">
            <p className="min-w-0 text-xl font-bold tracking-tight text-blue-600 sm:text-[22px]">
              {formatPrice(data.price, {
                from: isDevelopmentListing,
                listingType: data.listingType,
              })}
            </p>
            {(data.onSave || (compareHandler && data.propertyId)) && (
              <div className="relative z-20 flex shrink-0 items-center gap-1 sm:gap-2">
                {data.onSave && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 gap-1.5 rounded-lg px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 ${
                      data.isSaved ? 'text-red-600' : ''
                    }`}
                    onClick={event => {
                      event.stopPropagation();
                      data.onSave?.();
                    }}
                    aria-label={data.isSaved ? 'Remove property from saved homes' : 'Save property'}
                    aria-pressed={data.isSaved}
                  >
                    <Heart className="h-4 w-4" fill={data.isSaved ? 'currentColor' : 'none'} />
                    <span className="hidden xl:inline">Save</span>
                  </Button>
                )}
                {compareHandler && data.propertyId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={data.compareDisabled}
                    className={`h-8 gap-1.5 rounded-lg px-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 ${
                      data.isCompared ? 'text-blue-700' : ''
                    }`}
                    onClick={event => {
                      event.stopPropagation();
                      compareHandler();
                    }}
                    aria-label={
                      data.isCompared ? 'Remove property from comparison' : 'Compare property'
                    }
                    aria-pressed={data.isCompared}
                  >
                    <GitCompareArrows className="h-4 w-4" />
                    <span className="hidden xl:inline">Compare</span>
                  </Button>
                )}
              </div>
            )}
          </div>
          <h3 className="mt-1 line-clamp-2 text-[17px] font-bold leading-5 text-slate-800">
            {data.title}
          </h3>
          <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{data.location || '-'}</span>
          </p>
          {developmentName && (
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {developmentHref ? (
                <Link
                  href={developmentHref}
                  className="relative z-20 truncate rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {developmentName}
                </Link>
              ) : (
                <span className="truncate">{developmentName}</span>
              )}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 pr-2">
            {typeof data.area === 'number' && data.area > 0 && (
              <span
                className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600"
                aria-label={`Internal area ${data.area} square metres`}
              >
                <HouseMeasureIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                {data.area}m²
              </span>
            )}
            {typeof data.bedrooms === 'number' && data.bedrooms > 0 && (
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600">
                <Bed className="h-[18px] w-[18px]" aria-hidden="true" />
                {data.bedrooms} {data.bedrooms === 1 ? 'bed' : 'beds'}
              </span>
            )}
            {typeof data.bathrooms === 'number' && data.bathrooms > 0 && (
              <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600">
                <Bath className="h-[18px] w-[18px]" aria-hidden="true" />
                {data.bathrooms} {data.bathrooms === 1 ? 'bath' : 'baths'}
              </span>
            )}
            {rentalParking && (
              <span
                className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600"
                aria-label={`${rentalParking.label}: ${rentalParking.value}`}
              >
                <CarFront className="h-[18px] w-[18px]" aria-hidden="true" />
                <span className={rentalParking.status === 'known' ? undefined : 'text-slate-500'}>
                  {rentalParking.status === 'known' ? rentalParking.value : 'Parking to confirm'}
                </span>
              </span>
            )}
            {typeof data.yardSize === 'number' && data.yardSize > 0 && (
              <span
                className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600"
                aria-label={`Erf or yard area ${data.yardSize} square metres`}
              >
                <LandPlot className="h-[18px] w-[18px]" aria-hidden="true" />
                {data.yardSize}m²
              </span>
            )}
          </div>

          {highlights.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Property highlights">
              {highlights.map(highlight => {
                const HighlightIcon = getListingHighlightIcon(highlight.iconKey);
                return (
                  <span
                    key={highlight.key}
                    className="flex max-w-[220px] items-center gap-1.5 truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                    title={highlight.label}
                  >
                    <HighlightIcon
                      className="h-3.5 w-3.5 shrink-0 text-blue-600"
                      aria-hidden="true"
                    />
                    <span className="truncate">{highlight.label}</span>
                  </span>
                );
              })}
            </div>
          )}

          {rentalSnapshot.length > 0 && (
            <section
              className="mt-auto border-t border-slate-100 pt-3"
              aria-label="Rental snapshot"
            >
              <div
                className="grid divide-x divide-slate-100"
                style={{
                  gridTemplateColumns: `repeat(${rentalSnapshot.length}, minmax(0, 1fr))`,
                }}
              >
                {rentalSnapshot.map(fact => (
                  <div key={fact.key} className="min-w-0 px-2 first:pl-0 last:pr-0">
                    <p className="truncate text-[9px] font-bold uppercase tracking-[0.09em] text-slate-500">
                      {fact.label}
                    </p>
                    <p
                      className={`mt-1 truncate text-[11px] font-semibold leading-tight ${
                        fact.status === 'known' ? 'text-slate-800' : 'text-slate-500'
                      }`}
                      title={`${fact.label}: ${fact.value}`}
                    >
                      {fact.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div
            className={`flex items-center justify-between gap-3 border-t border-slate-100 ${
              rentalSnapshot.length > 0 ? 'mt-3 pt-3' : 'mt-auto pt-4'
            }`}
          >
            <div className="min-w-0">
              {agentProfileHref ? (
                <Link
                  href={agentProfileHref}
                  className="relative z-20 flex min-w-0 items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label={`View ${identityDisplayName}'s profile`}
                >
                  <IdentityAvatar
                    avatarUrl={resolvedAvatar}
                    initials={agentInitials}
                    name={identityDisplayName}
                    contain={isDevelopmentListing}
                  />
                  <IdentityCopy name={identityDisplayName} role={identityRoleLabel(contactRole)} />
                </Link>
              ) : (
                <div className="flex min-w-0 items-center gap-2.5">
                  <IdentityAvatar
                    avatarUrl={resolvedAvatar}
                    initials={agentInitials}
                    name={identityDisplayName}
                    contain={isDevelopmentListing}
                  />
                  <IdentityCopy name={identityDisplayName} role={identityRoleLabel(contactRole)} />
                </div>
              )}
            </div>

            <Link
              href={listingHref}
              onClick={data.onOpen}
              className="relative z-20 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              aria-label={`View property: ${data.title}`}
            >
              View property
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function IdentityAvatar({
  avatarUrl,
  initials,
  name,
  contain,
}: {
  avatarUrl?: string;
  initials: string;
  name: string;
  contain: boolean;
}) {
  return (
    <Avatar className="h-10 w-10 shrink-0 border border-slate-200 bg-white ring-2 ring-slate-100">
      <AvatarImage
        src={avatarUrl || ''}
        alt={name}
        className={contain ? 'object-contain p-0.5' : 'object-cover'}
      />
      <AvatarFallback className="bg-slate-100 text-xs font-semibold text-slate-600">
        {initials || '?'}
      </AvatarFallback>
    </Avatar>
  );
}

function IdentityCopy({ name, role }: { name: string; role: string }) {
  return (
    <span className="min-w-0 max-w-[128px] sm:max-w-[160px]">
      <span className="block truncate text-xs font-semibold leading-snug text-slate-800">
        {name}
      </span>
      <span className="block truncate text-[10px] leading-snug text-slate-500">{role}</span>
    </span>
  );
}
