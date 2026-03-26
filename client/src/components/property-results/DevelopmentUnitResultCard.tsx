import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { resolveMediaUrl } from '@/lib/mediaUtils';
import { formatCurrency, formatPriceRangeCompact } from '@/lib/utils';
import { Bath, Bed, Building2, MapPin, Ruler, Users } from 'lucide-react';
import { useLocation } from 'wouter';

export interface DevelopmentUnitResultCardProps {
  id: string;
  href: string;
  title: string;
  developmentName: string;
  city?: string | null;
  suburb?: string | null;
  image?: string | null;
  listingType?: 'sale' | 'rent' | 'auction';
  propertyType?: string | null;
  priceFrom?: number | null;
  priceTo?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  unitSize?: number | null;
  availableUnits?: number;
  totalUnits?: number;
  description?: string | null;
}

function formatUnitPrice(
  listingType: DevelopmentUnitResultCardProps['listingType'],
  priceFrom?: number | null,
  priceTo?: number | null,
) {
  if (listingType === 'rent') {
    return priceFrom ? `${formatCurrency(priceFrom)} / month` : 'Price on request';
  }

  if (listingType === 'auction') {
    return priceFrom ? `Starting from ${formatCurrency(priceFrom)}` : 'Auction price on request';
  }

  return formatPriceRangeCompact(priceFrom, priceTo);
}

function formatAvailability(availableUnits?: number, totalUnits?: number) {
  const available = Number(availableUnits || 0);
  const total = Number(totalUnits || 0);

  if (available > 0 && total > 0) return `${available} of ${total} available`;
  if (available > 0) return `${available} available`;
  if (total > 0) return `${total} planned`;
  return 'Availability on request';
}

export function DevelopmentUnitResultCard({
  href,
  title,
  developmentName,
  city,
  suburb,
  image,
  listingType = 'sale',
  propertyType,
  priceFrom,
  priceTo,
  bedrooms,
  bathrooms,
  unitSize,
  availableUnits,
  totalUnits,
  description,
}: DevelopmentUnitResultCardProps) {
  const [, setLocation] = useLocation();
  const locationLabel = [suburb, city].filter(Boolean).join(', ');
  const imageUrl = resolveMediaUrl(image || '') || 'https://placehold.co/600x400/e2e8f0/64748b?text=Unit';
  const priceLabel = formatUnitPrice(listingType, priceFrom, priceTo);

  return (
    <div
      className="w-full max-w-[760px] cursor-pointer overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
      onClick={() => setLocation(href)}
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-52 flex-shrink-0 sm:h-auto sm:w-80">
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={e => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=Unit';
            }}
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Badge className="border-0 bg-slate-950/90 text-[10px] uppercase tracking-[0.18em] text-white">
              Development Unit
            </Badge>
            <Badge className="border border-white/20 bg-white/90 text-[10px] uppercase tracking-[0.18em] text-slate-700">
              {listingType}
            </Badge>
          </div>
        </div>

        <div className="min-w-0 flex-1 overflow-hidden p-5 pr-6 sm:flex sm:min-h-[360px] sm:flex-col">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2774AE]">
              Part of {developmentName}
            </p>
            <h3 className="line-clamp-2 text-lg font-bold text-foreground">{title}</h3>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {locationLabel || '-'}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {propertyType && (
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                {propertyType.replace(/_/g, ' ')}
              </Badge>
            )}
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
              {formatAvailability(availableUnits, totalUnits)}
            </Badge>
          </div>

          <p className="mt-4 text-2xl font-bold text-foreground">{priceLabel}</p>

          <div className="mt-4 flex flex-wrap gap-4 pr-2">
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Ruler className="h-4 w-4" />
              {typeof unitSize === 'number' && unitSize > 0 ? `${unitSize}m2` : '-'}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Bed className="h-4 w-4" />
              {typeof bedrooms === 'number' && bedrooms > 0 ? `${bedrooms} Bed` : '-'}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Bath className="h-4 w-4" />
              {typeof bathrooms === 'number' && bathrooms > 0 ? `${bathrooms} Bath` : '-'}
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              {availableUnits && availableUnits > 0 ? `${availableUnits} Units` : '-'}
            </span>
          </div>

          {description && (
            <p className="mt-4 line-clamp-3 pr-3 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:mt-auto sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Presented within development</p>
                <p className="line-clamp-1 text-sm font-semibold text-foreground">{developmentName}</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                className="border-primary px-3 text-[11px] text-primary hover:bg-primary/10"
                onClick={e => {
                  e.stopPropagation();
                  setLocation(href);
                }}
              >
                View Unit
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
