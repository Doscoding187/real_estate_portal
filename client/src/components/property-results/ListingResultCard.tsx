import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bath, Bed, Building2, House, LandPlot, Mail, MapPin, MessageCircle } from 'lucide-react';
import { useLocation } from 'wouter';

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
  yardSize?: number;
  bedrooms?: number;
  bathrooms?: number;
  highlights?: string[];
  description?: string;
  listingSource?: 'manual' | 'development';
  listerType?: 'agent' | 'agency' | 'private';
  contactRole?: 'agent' | 'developer' | 'private';
  postedBy?: string;
  agentAvatarUrl?: string;
  whatsappNumber?: string;
  phoneNumber?: string;
  contactEmail?: string;
}

function formatPrice(price: number, options?: { from?: boolean }) {
  const normalizedPrice = Number(price || 0);
  if (normalizedPrice <= 0) return 'Price on request';
  const formattedPrice = `R ${normalizedPrice.toLocaleString()}`;
  return options?.from ? `From ${formattedPrice}` : formattedPrice;
}

function sanitizePhoneNumber(value?: string) {
  if (!value) return null;

  const cleaned = value.replace(/[^\d+]/g, '');
  if (!cleaned) return null;

  if (cleaned.startsWith('+')) {
    return cleaned.slice(1).replace(/\D/g, '');
  }

  const digits = cleaned.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length >= 10) {
    return `27${digits.slice(1)}`;
  }

  return digits;
}

export function ListingResultCard({ data }: { data: ListingResultCardData }) {
  const [, setLocation] = useLocation();
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
  const initials = identityDisplayName
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
    data.href || (isDevelopmentListing && developmentHref ? developmentHref : `/property/${data.id}`);
  const contactEntityLabel = isDevelopmentListing
    ? 'Developer'
    : isPrivateListing
      ? 'Seller'
      : 'Agent';
  const displayLocation = data.location?.trim() || '';
  const primaryMeta = isDevelopmentListing && developmentName ? developmentName : displayLocation || '-';
  const secondaryMeta =
    isDevelopmentListing && developmentName && displayLocation ? displayLocation : null;
  const whatsappNumber = sanitizePhoneNumber(data.whatsappNumber || data.phoneNumber);
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : null;
  const contactEmail = data.contactEmail?.trim() || null;
  const contactHref = contactEmail
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(`Property enquiry: ${data.title}`)}`
    : null;
  const attributeItems = [
    typeof data.area === 'number' && data.area > 0 ? { icon: House, label: `${data.area} m²` } : null,
    typeof data.bedrooms === 'number' && data.bedrooms > 0
      ? { icon: Bed, label: `${data.bedrooms} Bed` }
      : null,
    typeof data.bathrooms === 'number' && data.bathrooms > 0
      ? { icon: Bath, label: `${data.bathrooms} Bath` }
      : null,
    typeof data.yardSize === 'number' && data.yardSize > 0
      ? { icon: LandPlot, label: `${data.yardSize} m²` }
      : null,
  ].filter(
    (item): item is { icon: typeof House | typeof Bed | typeof Bath | typeof LandPlot; label: string } =>
      item !== null,
  );

  return (
    <div
      className="w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
      onClick={() => setLocation(listingHref)}
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-56 flex-shrink-0 sm:h-auto sm:w-[320px]">
          <img
            src={data.image}
            alt={data.title}
            className="h-full w-full object-cover"
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
            }}
          />
        </div>

        <div className="min-w-0 flex-1 overflow-hidden p-6 sm:flex sm:min-h-[356px] sm:flex-col">
          <div className="space-y-2">
            <h3 className="line-clamp-1 text-[1.05rem] font-semibold text-slate-900">{data.title}</h3>
            <div className="space-y-1.5">
              <p className="flex items-center gap-2 text-sm text-slate-700">
                {isDevelopmentListing ? (
                  <Building2 className="h-4 w-4 text-slate-400" />
                ) : (
                  <MapPin className="h-4 w-4 text-slate-400" />
                )}
                <span className="truncate">{primaryMeta}</span>
              </p>
              {secondaryMeta && (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span className="truncate">{secondaryMeta}</span>
                </p>
              )}
            </div>
          </div>

          <p className="mt-4 text-[1.65rem] font-semibold tracking-tight text-slate-950">
            {formatPrice(data.price, { from: isDevelopmentListing })}
          </p>

          {attributeItems.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 pr-2">
              {attributeItems.map(item => {
                const Icon = item.icon;
                return (
                  <span
                    key={item.label}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-600"
                  >
                    <Icon className="h-4 w-4 text-slate-400" />
                    {item.label}
                  </span>
                );
              })}
            </div>
          )}

          {Array.isArray(data.highlights) && data.highlights.length > 0 && (
            <div className="mt-4 pr-3">
              <div className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap">
                {data.highlights.slice(0, 3).map((highlight, index) => (
                  <span
                    key={`highlight-${index}-${highlight}`}
                    className="max-w-[170px] shrink-0 truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.description && (
            <p className="mt-4 line-clamp-3 pr-3 text-sm leading-6 text-slate-600">
              {data.description}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-4 pr-2 sm:mt-auto sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage
                  src={data.agentAvatarUrl || ''}
                  alt={identityDisplayName}
                  className="object-cover"
                />
                <AvatarFallback className="text-[10px]">{initials || 'PL'}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 max-w-[190px]">
                <p className="truncate text-sm font-medium leading-snug text-slate-900">
                  {identityDisplayName}
                </p>
                <p className="truncate text-xs text-slate-500">{contactEntityLabel}</p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
              {whatsappHref && (
                <Button
                  size="sm"
                  className="h-9 gap-1.5 bg-[#25D366] px-3 text-xs font-medium text-white hover:bg-[#1eb85a]"
                  onClick={event => {
                    event.stopPropagation();
                    window.open(whatsappHref, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {`WhatsApp ${contactEntityLabel}`}
                </Button>
              )}
              {contactHref && (
                <Button
                  variant={whatsappHref ? 'outline' : 'default'}
                  size="sm"
                  className={`h-9 gap-1.5 px-3 text-xs font-medium ${
                    whatsappHref
                      ? 'border-primary/25 text-primary hover:bg-primary/5'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                  onClick={event => {
                    event.stopPropagation();
                    window.location.href = contactHref;
                  }}
                >
                  <Mail className="h-3.5 w-3.5" />
                  {`Contact ${contactEntityLabel}`}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
