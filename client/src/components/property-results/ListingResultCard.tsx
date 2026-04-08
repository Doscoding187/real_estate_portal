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
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: string;
  highlights?: string[];
  description?: string;
  postedBy?: string;
  agentAvatarUrl?: string;
}

function formatPrice(price: number) {
  return `R ${Number(price || 0).toLocaleString()}`;
}

export function ListingResultCard({ data }: { data: ListingResultCardData }) {
  const [, setLocation] = useLocation();
  const agentDisplayName = data.postedBy?.trim() || '-';
  const hasAgentName = agentDisplayName !== '-';
  const [agentFirstName, ...agentSurnameParts] = hasAgentName
    ? agentDisplayName.split(/\s+/)
    : ['-'];
  const agentSurname = agentSurnameParts.join(' ');
  const agentInitials = hasAgentName ? agentDisplayName.slice(0, 2).toUpperCase() : 'AG';

  return (
    <div
      className="group w-full max-w-[760px] cursor-pointer overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_16px_40px_-30px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.35)] sm:min-h-[360px] lg:max-w-none lg:rounded-[26px]"
      onClick={() => setLocation(`/property/${data.id}`)}
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-52 flex-shrink-0 overflow-hidden sm:h-auto sm:w-80 lg:w-[340px]">
          <img
            src={data.image}
            alt={data.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
            }}
          />
        </div>

        <div className="min-w-0 flex-1 overflow-hidden p-4 sm:flex sm:min-h-[360px] sm:flex-col sm:p-6">
          <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
            {data.title}
          </h3>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            {data.location || '-'}
          </p>
          <p className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            {formatPrice(data.price)}
          </p>

          <div className="mt-4 flex flex-wrap gap-3 pr-2">
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <House className="h-4 w-4" />
              {typeof data.area === 'number' && data.area > 0 ? `${data.area}m2` : '-'}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Bed className="h-4 w-4" />
              {typeof data.bedrooms === 'number' && data.bedrooms > 0
                ? `${data.bedrooms} Bed`
                : '-'}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Bath className="h-4 w-4" />
              {typeof data.bathrooms === 'number' && data.bathrooms > 0
                ? `${data.bathrooms} Bath`
                : '-'}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <LandPlot className="h-4 w-4" />
              {data.floor || '-'}
            </span>
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
            <p className="mt-4 line-clamp-2 max-w-2xl text-sm leading-7 text-slate-600 sm:line-clamp-3">
              {data.description}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:mt-auto sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-10 w-10 shrink-0 ring-2 ring-slate-100">
                <AvatarImage src={data.agentAvatarUrl || ''} alt={agentDisplayName} />
                <AvatarFallback className="text-xs">{agentInitials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 max-w-[180px]">
                <p className="line-clamp-2 break-words text-sm font-semibold leading-snug text-foreground">
                  {agentFirstName}
                  {agentSurname ? (
                    <>
                      <br />
                      {agentSurname}
                    </>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-10 w-full gap-1.5 rounded-full border-slate-300 px-3 text-xs text-slate-700 hover:bg-slate-50 sm:h-9 sm:w-auto"
              >
                <Phone className="h-3.5 w-3.5" />
                View Number
              </Button>
              <Button
                size="sm"
                className="h-10 w-full gap-1.5 rounded-full bg-primary px-3 text-xs text-primary-foreground shadow-sm hover:bg-primary/90 sm:h-9 sm:w-auto"
              >
                <Mail className="h-3.5 w-3.5" />
                Contact
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
