import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MapPin, Bed, Bath, House, LandPlot, Phone, Mail } from 'lucide-react';
import { useLocation } from 'wouter';

export interface ListingResultCardData {
  id: string;
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
  badges?: string[];
  description?: string;
  listingSource?: 'manual' | 'development';
  listerType?: 'agent' | 'agency' | 'private';
  contactRole?: 'agent' | 'developer' | 'private';
  postedBy?: string;
  agentAvatarUrl?: string;
}

function formatPrice(price: number, options?: { from?: boolean }) {
  const normalizedPrice = Number(price || 0);
  if (normalizedPrice <= 0) return 'Price on request';
  const formattedPrice = `R ${normalizedPrice.toLocaleString()}`;
  return options?.from ? `From ${formattedPrice}` : formattedPrice;
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
  const hasAgentName = identityDisplayName !== '-';
  const [agentFirstName, ...agentSurnameParts] = hasAgentName
    ? identityDisplayName.split(/\s+/)
    : ['-'];
  const agentSurname = agentSurnameParts.join(' ');
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
  const contactLabel = isDevelopmentListing
    ? 'New Development'
    : isPrivateListing
      ? 'Private Listing'
      : 'Listed by Agent';
  const contactCtaLabel = isDevelopmentListing
    ? 'Contact Developer'
    : isPrivateListing
      ? 'Contact Seller'
      : 'Contact Agent';

  return (
    <div
      className="w-full max-w-[760px] cursor-pointer overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md sm:min-h-[360px]"
      onClick={() => setLocation(`/property/${data.id}`)}
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-52 flex-shrink-0 sm:h-auto sm:w-80">
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

        <div className="min-w-0 flex-1 overflow-hidden p-5 pr-6 sm:flex sm:min-h-[360px] sm:flex-col">
          <h3 className="line-clamp-1 text-lg font-bold text-foreground">{data.title}</h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {data.location || '-'}
          </p>
          {developmentName && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <House className="h-3.5 w-3.5" />
              {developmentHref ? (
                <button
                  type="button"
                  className="truncate hover:text-primary transition-colors"
                  onClick={event => {
                    event.stopPropagation();
                    setLocation(developmentHref);
                  }}
                  title={developmentName}
                >
                  Part of {developmentName}
                </button>
              ) : (
                <span className="truncate" title={developmentName}>
                  Part of {developmentName}
                </span>
              )}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isDevelopmentListing ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {contactLabel}
            </span>
            {Array.isArray(data.badges) &&
              data.badges.slice(0, 2).map(badge => (
                <span
                  key={badge}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                >
                  {badge}
                </span>
              ))}
          </div>

          <p className="mt-2.5 text-2xl font-bold text-foreground">
            {formatPrice(data.price, { from: isDevelopmentListing })}
          </p>

          <div className="mt-4 flex flex-wrap gap-4 pr-2">
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <House className="h-4 w-4" />
              {typeof data.area === 'number' && data.area > 0 ? `${data.area}m2` : '-'}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Bed className="h-4 w-4" />
              {typeof data.bedrooms === 'number' && data.bedrooms > 0 ? `${data.bedrooms} Bed` : '-'}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Bath className="h-4 w-4" />
              {typeof data.bathrooms === 'number' && data.bathrooms > 0 ? `${data.bathrooms} Bath` : '-'}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <LandPlot className="h-4 w-4" />
              {data.floor || '-'}
            </span>
          </div>

          {Array.isArray(data.highlights) && data.highlights.length > 0 && (
            <div className="mt-4 pr-3">
              <div className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap">
                {data.highlights.slice(0, 3).map((h, index) => (
                  <span
                    key={`highlight-${index}-${h}`}
                    className="max-w-[170px] shrink-0 truncate rounded border border-primary/15 bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.description && (
            <p className="mt-4 line-clamp-3 pr-3 text-sm leading-relaxed text-muted-foreground">
              {data.description}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-3 pr-2 sm:mt-auto sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={data.agentAvatarUrl || ''} alt={identityDisplayName} />
                <AvatarFallback className="text-[10px]">{agentInitials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 max-w-[140px] sm:max-w-[180px]">
                <p className="line-clamp-2 break-words text-xs font-semibold leading-snug text-foreground">
                  {agentFirstName}
                  {agentSurname ? <><br />{agentSurname}</> : null}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 border-primary px-2 text-[10px] text-primary hover:bg-primary/10"
              >
                <Phone className="h-3 w-3" />
                View Number
              </Button>
              <Button
                size="sm"
                className="h-7 gap-1 bg-primary px-2 text-[10px] text-primary-foreground hover:bg-primary/90"
              >
                <Mail className="h-3 w-3" />
                {contactCtaLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
