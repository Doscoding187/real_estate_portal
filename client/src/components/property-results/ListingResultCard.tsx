import { useState } from 'react';
import { PropertyContactModal } from '@/components/property/PropertyContactModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Bed,
  Bath,
  House,
  LandPlot,
  Mail,
  Building2,
  MessageCircle,
  Heart,
  GitCompareArrows,
} from 'lucide-react';
import { Link } from 'wouter';
import { PROPERTY_IMAGE_FALLBACK, withApiBase } from '@/lib/mediaUtils';
import {
  getPrivateListingContactCopy,
  isExplicitRentListing,
  withRentalPeriod,
} from '@/lib/rentPresentation';
import type { SearchCardIdentity } from '@shared/types';

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
  listingType?: 'sale' | 'rent' | string;
  listingSource?: 'manual' | 'development';
  listerType?: 'agent' | 'agency' | 'private' | 'platform';
  contactRole?: 'agent' | 'agency' | 'developer' | 'private' | 'platform';
  identity?: SearchCardIdentity;
  postedBy?: string;
  agentAvatarUrl?: string;
  propertyId?: number;
  agentId?: number;
  agencyId?: number;
  cataloguePublisherId?: number;
  developmentId?: number;
  contactPhone?: string;
  contactWhatsapp?: string;
  contactEmail?: string;
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

export function ListingResultCard({ data }: { data: ListingResultCardData }) {
  const [contactIntent, setContactIntent] = useState<'contact' | 'whatsapp' | null>(null);
  const canonicalIdentity = data.identity;
  const contactRole = canonicalIdentity?.role ?? data.contactRole;
  const agentProfileHref =
    canonicalIdentity?.agentSlug && contactRole === 'agent'
      ? `/agents/${canonicalIdentity.agentSlug}`
      : null;
  const resolvedListingSource =
    data.listingSource === 'development'
      ? 'development'
      : data.listingSource === 'manual'
        ? 'manual'
        : contactRole === 'developer'
          ? 'development'
          : 'manual';
  const identityListerType =
    resolvedListingSource === 'manual'
      ? contactRole === 'private'
        ? 'private'
        : contactRole === 'platform'
          ? 'platform'
          : contactRole === 'agency'
            ? 'agency'
            : contactRole === 'agent'
              ? 'agent'
              : undefined
      : undefined;
  const resolvedListerType = canonicalIdentity
    ? identityListerType
    : data.listerType || identityListerType;
  const isDevelopmentListing = resolvedListingSource === 'development';
  const isPrivateListing = resolvedListingSource === 'manual' && resolvedListerType === 'private';
  const isPlatformListing = resolvedListingSource === 'manual' && resolvedListerType === 'platform';
  const isAgencyListing = resolvedListingSource === 'manual' && resolvedListerType === 'agency';
  const isRentalListing = isExplicitRentListing(data.listingType);
  const compareHandler = isRentalListing ? undefined : data.onCompare;
  const privateContactCopy = getPrivateListingContactCopy(data.listingType);
  const identityDisplayName =
    canonicalIdentity?.name?.trim() ||
    (isPrivateListing && isRentalListing
      ? privateContactCopy.identity
      : data.postedBy?.trim()
        ? data.postedBy.trim()
        : isDevelopmentListing
          ? 'Developer Team'
          : isPrivateListing
            ? 'Private Seller'
            : isPlatformListing
              ? 'Property Listify'
              : isAgencyListing
                ? 'Listing Agency'
                : resolvedListerType === 'agent'
                  ? 'Listing Agent'
                  : 'Listing contact unavailable');
  const hasAgentName = identityDisplayName !== '-';
  const agentInitials = hasAgentName
    ? identityDisplayName
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
    : '?';
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
  const contactCtaLabel = isDevelopmentListing
    ? 'Contact Developer'
    : isPrivateListing
      ? privateContactCopy.action
      : isPlatformListing
        ? 'Enquire via Property Listify'
        : isAgencyListing
          ? 'Contact Agency'
          : resolvedListerType === 'agent'
            ? 'Contact Agent'
            : 'View details';
  const whatsappTarget = String(
    canonicalIdentity?.whatsapp ||
      canonicalIdentity?.phone ||
      data.contactWhatsapp ||
      data.contactPhone ||
      '',
  ).trim();
  const emailTarget = String(canonicalIdentity?.email || data.contactEmail || '').trim();
  const resolvedImage = withApiBase(data.image) || PROPERTY_IMAGE_FALLBACK;
  const resolvedAvatar = withApiBase(
    canonicalIdentity?.organizationLogoUrl || canonicalIdentity?.avatarUrl || data.agentAvatarUrl,
  );
  const modalTitle = isDevelopmentListing ? developmentName || data.title : data.title;
  const whatsappPrefill = `Hi, I'm interested in ${modalTitle}. Please share more details.`;
  const hasActionableIdentity =
    contactRole === 'agent' ||
    contactRole === 'agency' ||
    contactRole === 'developer' ||
    contactRole === 'platform' ||
    contactRole === 'private';
  const canOpenContact =
    hasActionableIdentity &&
    !!(
      canonicalIdentity?.agentId ||
      canonicalIdentity?.agencyId ||
      canonicalIdentity?.cataloguePublisherId ||
      data.agentId ||
      data.agencyId ||
      data.cataloguePublisherId ||
      data.propertyId ||
      isPlatformListing ||
      emailTarget ||
      whatsappTarget
    );

  return (
    <>
      <article className="group relative w-full max-w-[780px] overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_16px_40px_-30px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.35)] sm:min-h-[300px] lg:max-w-[840px] lg:rounded-[26px]">
        <Link
          href={listingHref}
          onClick={data.onOpen}
          aria-label={`View ${data.title}`}
          className="absolute inset-0 z-10 rounded-[24px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-blue-500/35 lg:rounded-[26px]"
        >
          <span className="sr-only">View {data.title}</span>
        </Link>
        <div className="flex flex-col sm:flex-row">
          <div className="relative h-[192px] flex-shrink-0 overflow-hidden sm:h-auto sm:w-[300px] sm:self-stretch lg:w-[340px]">
            <img
              src={resolvedImage}
              alt={data.title}
              className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              onError={e => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = PROPERTY_IMAGE_FALLBACK;
              }}
            />
            {(data.onSave || compareHandler) && (
              <div className="absolute right-3 top-3 z-20 flex gap-2">
                {data.onSave && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 rounded-full bg-black/35 text-white backdrop-blur-sm hover:bg-black/55 ${
                      data.isSaved ? 'text-red-300' : ''
                    }`}
                    onClick={event => {
                      event.stopPropagation();
                      data.onSave?.();
                    }}
                    aria-label={data.isSaved ? 'Remove property from saved homes' : 'Save property'}
                    aria-pressed={data.isSaved}
                  >
                    <Heart className="h-4 w-4" fill={data.isSaved ? 'currentColor' : 'none'} />
                  </Button>
                )}
                {compareHandler && data.propertyId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={data.compareDisabled}
                    className={`h-9 w-9 rounded-full bg-black/35 text-white backdrop-blur-sm hover:bg-black/55 ${
                      data.isCompared ? 'text-blue-300' : ''
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
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 overflow-hidden px-4 py-3 sm:flex sm:min-h-[300px] sm:flex-col sm:px-5 sm:py-3 lg:px-6 lg:py-3">
            {isDevelopmentListing && developmentName && (
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {developmentHref ? (
                  <Link
                    href={developmentHref}
                    className="relative z-20 truncate rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    title={developmentName}
                  >
                    {developmentName}
                  </Link>
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
                  <Link
                    href={developmentHref}
                    className="relative z-20 truncate rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    title={developmentName}
                  >
                    {developmentName}
                  </Link>
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
              {agentProfileHref ? (
                <Link
                  href={agentProfileHref}
                  className="flex min-w-0 items-center gap-2"
                  aria-label={`View ${identityDisplayName}'s profile`}
                >
                  <Avatar className="h-10 w-10 shrink-0 border border-slate-200 bg-white ring-2 ring-slate-100">
                    <AvatarImage
                      src={resolvedAvatar || ''}
                      alt={identityDisplayName}
                      className={isDevelopmentListing ? 'object-contain p-0.5' : 'object-cover'}
                    />
                    <AvatarFallback className="bg-slate-100 text-xs">{agentInitials}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 max-w-[140px] sm:max-w-[180px]">
                    <span className="line-clamp-1 block truncate text-[12px] font-semibold leading-snug text-foreground">
                      {identityDisplayName}
                    </span>
                  </span>
                </Link>
              ) : (
                <>
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
                </>
              )}
            </div>
              <div className="relative z-20 flex w-full min-w-0 gap-2 sm:w-auto sm:justify-end">
                {whatsappTarget && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 shrink-0 gap-1 border-primary px-3 text-[11px] text-primary hover:bg-primary/10 sm:h-9 sm:w-auto sm:text-[10px]"
                    onClick={event => {
                      event.stopPropagation();
                      setContactIntent('whatsapp');
                    }}
                  >
                    <MessageCircle className="h-3 w-3" />
                    WhatsApp
                  </Button>
                )}
                {contactCtaLabel === 'View details' ? (
                  <Button
                    asChild
                    size="sm"
                    className="h-10 min-w-0 flex-1 gap-1 bg-primary px-3 text-[11px] text-primary-foreground hover:bg-primary/90 sm:h-9 sm:w-auto sm:flex-none sm:text-[10px]"
                  >
                    <Link href={listingHref} onClick={data.onOpen}>
                      <Mail className="h-3 w-3" />
                      View details
                    </Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-10 min-w-0 flex-1 gap-1 bg-primary px-3 text-[11px] text-primary-foreground hover:bg-primary/90 sm:h-9 sm:w-auto sm:flex-none sm:text-[10px]"
                    disabled={!canOpenContact}
                    onClick={() => setContactIntent('contact')}
                  >
                    <Mail className="h-3 w-3" />
                    {contactCtaLabel}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </article>
      <PropertyContactModal
        isOpen={contactIntent !== null}
        onClose={() => setContactIntent(null)}
        propertyId={data.propertyId}
        propertyTitle={modalTitle}
        agentName={identityDisplayName}
        cataloguePublisherId={
          data.propertyId
            ? undefined
            : (canonicalIdentity?.cataloguePublisherId ?? data.cataloguePublisherId)
        }
        developmentId={data.propertyId ? undefined : data.developmentId}
        source={contactIntent === 'whatsapp' ? 'property_search_whatsapp' : 'property_search'}
        submitLabel={contactIntent === 'whatsapp' ? 'Continue to WhatsApp' : 'Send enquiry'}
        successMessage={
          contactIntent === 'whatsapp'
            ? 'Your enquiry has been saved. WhatsApp will open after authorized custody is confirmed.'
            : 'Your enquiry has been saved and delivered to the authorized listing recipient.'
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
