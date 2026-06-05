import { useState } from 'react';
import { PropertyContactModal } from '@/components/property/PropertyContactModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MapPin, Bed, Bath, House, LandPlot, Mail, Building2, MessageCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { withApiBase } from '@/lib/mediaUtils';

export interface ListingResultCardData {
  id: string;
  href?: string;
  title: string;
  location: string;
  price: number;
  image: string;
  development?: {
    id?: string | number | null;
    name?: string | null;
    slug?: string | null;
  };
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: string;
  highlights?: string[];
  description?: string;
  listingSource?: 'manual' | 'development';
  listerType?: 'agent' | 'agency' | 'private';
  contactRole?: 'agent' | 'developer' | 'private';
  postedBy?: string;
  agentAvatarUrl?: string;
  propertyId?: number;
  agentId?: number;
  agencyId?: number;
  developerBrandProfileId?: number;
  developmentId?: number;
  listingType?: 'sale' | 'rent' | 'auction';
  unitTypeId?: string;
  unitDisplayOrder?: number;
  totalUnits?: number | null;
  availableUnits?: number | null;
  auctionStatus?: string | null;
  contactPhone?: string;
  contactWhatsapp?: string;
  contactEmail?: string;
}

function normalizeListingType(value?: string | null): 'sale' | 'rent' | 'auction' {
  if (value === 'rent') return 'rent';
  if (value === 'auction') return 'auction';
  return 'sale';
}

function toNonNegativeInt(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.trunc(parsed));
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function getDevelopmentSearchCardAvailabilityLabel(input: {
  listingType?: 'sale' | 'rent' | 'auction' | null;
  totalUnits?: number | null;
  availableUnits?: number | null;
  auctionStatus?: string | null;
}): string | null {
  const listingType = normalizeListingType(input.listingType);
  const availableUnits = toNonNegativeInt(input.availableUnits);
  const totalUnits = toNonNegativeInt(input.totalUnits);
  const auctionStatus = String(input.auctionStatus || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (listingType === 'auction') {
    if (auctionStatus === 'sold') return 'Sold at auction';
    if (auctionStatus === 'passed_in') return 'Passed in';
    if (auctionStatus === 'withdrawn') return 'Withdrawn';
    if (auctionStatus === 'active') return 'Auction active';
    if (auctionStatus === 'registration_open') return 'Registration open';
    if (availableUnits === null) return null;
    if (availableUnits > 0) return `${pluralize(availableUnits, 'lot')} open`;
    return totalUnits && totalUnits > 0 ? 'Registration closed' : 'Auction availability on request';
  }

  if (availableUnits === null) return null;

  if (listingType === 'rent') {
    if (availableUnits > 0) return `${pluralize(availableUnits, 'rental')} available`;
    return totalUnits && totalUnits > 0 ? 'Fully let' : 'Rental availability on request';
  }

  if (availableUnits > 0) return `${availableUnits} available`;
  return totalUnits && totalUnits > 0 ? 'Sold out' : 'Availability on request';
}

export function getDevelopmentSearchCardContactLabel(input: {
  listingType?: 'sale' | 'rent' | 'auction' | null;
  isDevelopmentListing?: boolean;
  isPrivateListing?: boolean;
}): string {
  if (!input.isDevelopmentListing) {
    return input.isPrivateListing ? 'Contact Seller' : 'Contact Agent';
  }

  const listingType = normalizeListingType(input.listingType);
  if (listingType === 'rent') return 'Contact Leasing Team';
  if (listingType === 'auction') return 'Contact Auction Team';
  return 'Contact Developer';
}

function formatPrice(
  price: number,
  options?: { from?: boolean; listingType?: 'sale' | 'rent' | 'auction' },
) {
  const normalizedPrice = Number(price || 0);
  if (normalizedPrice <= 0) return 'Price on request';
  const formattedPrice = `R ${normalizedPrice.toLocaleString()}`;
  if (options?.from && options.listingType === 'rent') return `Rent from ${formattedPrice}`;
  if (options?.from && options.listingType === 'auction') return `Bid from ${formattedPrice}`;
  return options?.from ? `From ${formattedPrice}` : formattedPrice;
}

export function ListingResultCard({ data }: { data: ListingResultCardData }) {
  const [, setLocation] = useLocation();
  const [contactIntent, setContactIntent] = useState<'contact' | 'whatsapp' | null>(null);
  const resolvedListingSource =
    data.listingSource === 'development'
      ? 'development'
      : data.listingSource === 'manual'
        ? 'manual'
        : data.contactRole === 'developer'
          ? 'development'
          : 'manual';
  const resolvedListerType =
    data.listerType ||
    (resolvedListingSource === 'manual'
      ? data.contactRole === 'private'
        ? 'private'
        : 'agent'
      : undefined);
  const isDevelopmentListing = resolvedListingSource === 'development';
  const isPrivateListing = resolvedListingSource === 'manual' && resolvedListerType === 'private';
  const identityDisplayName = data.postedBy?.trim()
    ? data.postedBy.trim()
    : isDevelopmentListing
      ? 'Developer Team'
      : isPrivateListing
        ? 'Private Seller'
        : 'Listing Agent';
  const hasAgentName = identityDisplayName !== '-';
  const agentInitials = hasAgentName
    ? identityDisplayName
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
    : 'AG';
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
  const contactCtaLabel = getDevelopmentSearchCardContactLabel({
    listingType: data.listingType,
    isDevelopmentListing,
    isPrivateListing,
  });
  const availabilityLabel =
    isDevelopmentListing && data.listingType
      ? getDevelopmentSearchCardAvailabilityLabel({
          listingType: data.listingType,
          totalUnits: data.totalUnits,
          availableUnits: data.availableUnits,
          auctionStatus: data.auctionStatus,
        })
      : null;
  const whatsappTarget = String(data.contactWhatsapp || data.contactPhone || '').trim();
  const emailTarget = String(data.contactEmail || '').trim();
  const resolvedImage =
    withApiBase(data.image) || 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
  const resolvedAvatar = withApiBase(data.agentAvatarUrl);
  const modalTitle = isDevelopmentListing ? developmentName || data.title : data.title;
  const whatsappPrefill = `Hi, I'm interested in ${modalTitle}. Please share more details.`;
  const canOpenContact = !!(
    data.agentId ||
    data.developerBrandProfileId ||
    emailTarget ||
    whatsappTarget
  );

  return (
    <>
      <div
        className="group w-full max-w-[780px] cursor-pointer overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_16px_40px_-30px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.35)] sm:min-h-[300px] lg:max-w-[840px] lg:rounded-[26px]"
        data-listing-source={resolvedListingSource}
        data-unit-type-id={data.unitTypeId || undefined}
        data-unit-display-order={
          typeof data.unitDisplayOrder === 'number' ? data.unitDisplayOrder : undefined
        }
        onClick={() => setLocation(listingHref)}
      >
        <div className="flex flex-col sm:flex-row">
          <div className="relative h-[192px] flex-shrink-0 overflow-hidden sm:h-auto sm:w-[300px] sm:self-stretch lg:w-[340px]">
            <img
              src={resolvedImage}
              alt={data.title}
              className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              onError={e => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
              }}
            />
          </div>

          <div className="min-w-0 flex-1 overflow-hidden px-4 py-3 sm:flex sm:min-h-[300px] sm:flex-col sm:px-5 sm:py-3 lg:px-6 lg:py-3">
            {isDevelopmentListing && developmentName && (
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {developmentHref ? (
                  <button
                    type="button"
                    className="truncate transition-colors hover:text-primary"
                    onClick={event => {
                      event.stopPropagation();
                      setLocation(developmentHref);
                    }}
                    title={developmentName}
                  >
                    {developmentName}
                  </button>
                ) : (
                  <span className="truncate" title={developmentName}>
                    {developmentName}
                  </span>
                )}
              </p>
            )}
            <h3 className="line-clamp-2 text-[17px] font-bold leading-5 text-slate-800">
              {data.title}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {data.location || '-'}
            </p>
            {!isDevelopmentListing && developmentName && (
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <House className="h-3.5 w-3.5" />
                {developmentHref ? (
                  <button
                    type="button"
                    className="truncate transition-colors hover:text-primary"
                    onClick={event => {
                      event.stopPropagation();
                      setLocation(developmentHref);
                    }}
                    title={developmentName}
                  >
                    {developmentName}
                  </button>
                ) : (
                  <span className="truncate" title={developmentName}>
                    {developmentName}
                  </span>
                )}
              </p>
            )}

            <p className="mt-3 text-lg font-semibold tracking-tight text-blue-600 sm:text-xl">
              {formatPrice(data.price, {
                from: isDevelopmentListing,
                listingType: data.listingType,
              })}
            </p>
            {availabilityLabel && (
              <p className="mt-1 inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                {availabilityLabel}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 pr-2">
              {typeof data.area === 'number' && data.area > 0 && (
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
                  <House className="h-4 w-4" />
                  {`${data.area}m2`}
                </span>
              )}
              {typeof data.bedrooms === 'number' && data.bedrooms > 0 && (
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
                  <Bed className="h-4 w-4" />
                  {`${data.bedrooms} Bed`}
                </span>
              )}
              {typeof data.bathrooms === 'number' && data.bathrooms > 0 && (
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
                  <Bath className="h-4 w-4" />
                  {`${data.bathrooms} Bath`}
                </span>
              )}
              {data.floor && (
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
                  <LandPlot className="h-4 w-4" />
                  {data.floor}
                </span>
              )}
            </div>

            {Array.isArray(data.highlights) && data.highlights.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {data.highlights.slice(0, 3).map((h, index) => (
                  <span
                    key={`highlight-${index}-${h}`}
                    className="max-w-[220px] truncate rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}

            {data.description && (
              <p className="mt-3 line-clamp-2 max-w-[46ch] text-sm leading-5 text-slate-600">
                {data.description}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:mt-auto sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar className="h-10 w-10 shrink-0 border border-slate-200 bg-white ring-2 ring-slate-100">
                  <AvatarImage
                    src={resolvedAvatar || ''}
                    alt={identityDisplayName}
                    className={isDevelopmentListing ? 'object-contain p-0.5' : 'object-cover'}
                  />
                  <AvatarFallback className="bg-slate-100 text-xs">{agentInitials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 max-w-[140px] sm:max-w-[180px]">
                  <p className="line-clamp-1 truncate text-[12px] font-semibold leading-snug text-foreground">
                    {identityDisplayName}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1 sm:justify-end">
                {whatsappTarget && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 w-full gap-1 border-primary px-3 text-[11px] text-primary hover:bg-primary/10 sm:h-9 sm:w-auto sm:text-[10px]"
                    onClick={event => {
                      event.stopPropagation();
                      setContactIntent('whatsapp');
                    }}
                  >
                    <MessageCircle className="h-3 w-3" />
                    WhatsApp
                  </Button>
                )}
                <Button
                  size="sm"
                  className="h-10 w-full gap-1 bg-primary px-3 text-[11px] text-primary-foreground hover:bg-primary/90 sm:h-9 sm:w-auto sm:text-[10px]"
                  disabled={!canOpenContact}
                  onClick={event => {
                    event.stopPropagation();
                    setContactIntent('contact');
                  }}
                >
                  <Mail className="h-3 w-3" />
                  {contactCtaLabel}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PropertyContactModal
        isOpen={contactIntent !== null}
        onClose={() => setContactIntent(null)}
        propertyId={data.propertyId}
        propertyTitle={modalTitle}
        agentName={identityDisplayName}
        agentPhone={data.contactPhone}
        agentEmail={data.contactEmail}
        agentId={data.agentId}
        agencyId={data.agencyId}
        developerBrandProfileId={data.developerBrandProfileId}
        developmentId={data.developmentId}
        source={contactIntent === 'whatsapp' ? 'property_search_whatsapp' : 'property_search'}
        submitLabel={contactIntent === 'whatsapp' ? 'Continue to WhatsApp' : contactCtaLabel}
        successMessage={
          contactIntent === 'whatsapp'
            ? 'Details captured. Opening WhatsApp...'
            : 'Your inquiry has been sent successfully!'
        }
        successAction={
          contactIntent === 'whatsapp' && whatsappTarget
            ? {
                type: 'whatsapp',
                phone: whatsappTarget,
                message: whatsappPrefill,
              }
            : undefined
        }
        initialMessage={whatsappPrefill}
      />
    </>
  );
}
