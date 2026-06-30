import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { Bath, Bed, Building2, MapPin, Trees } from 'lucide-react';
import { withApiBase } from '@/lib/mediaUtils';
import { HouseMeasureIcon } from '@/components/icons/HouseMeasureIcon';
import { FallbackImage } from './FallbackImage';
import { formatCompactRand, getShortCardLocation } from '@/lib/cardDisplay';

export interface SimpleDevelopmentUnitCardProps {
  id: string;
  title: string;
  developmentName: string;
  city: string;
  suburb?: string;
  address?: string | null;
  image?: string | null;
  href: string;
  priceFrom?: number | null;
  priceTo?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  unitSize?: number | null;
  yardSize?: number | null;
  propertyType?: string | null;
  badgeLabel?: string;
}

const formatMeasure = (value?: number | null) => {
  if (!value || value <= 0) return null;
  return `${value.toLocaleString('en-ZA')} m²`;
};

const formatPrice = (priceFrom?: number | null, priceTo?: number | null) => {
  if (priceFrom && priceTo && priceTo > priceFrom) {
    return `${formatCompactRand(priceFrom)} – ${formatCompactRand(priceTo)}`;
  }
  if (priceFrom && priceFrom > 0) {
    return formatCompactRand(priceFrom);
  }
  return 'Price on request';
};

const formatPropertyType = (value?: string | null) =>
  String(value || '')
    .replace(/[_-]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());

export function SimpleDevelopmentUnitCard({
  id,
  title,
  developmentName,
  city,
  suburb,
  address,
  image,
  href,
  priceFrom,
  priceTo,
  bedrooms,
  bathrooms,
  unitSize,
  yardSize,
  propertyType,
  badgeLabel = 'New development',
}: SimpleDevelopmentUnitCardProps) {
  const locationLabel = getShortCardLocation({ address, suburb, city });
  const resolvedImage = withApiBase(image);
  const specItems = [
    formatMeasure(unitSize)
      ? {
          key: 'unit-size',
          icon: <HouseMeasureIcon className="h-3 w-3 text-slate-400" />,
          value: formatMeasure(unitSize),
        }
      : null,
    bedrooms
      ? {
          key: 'bedrooms',
          icon: <Bed className="h-3 w-3 text-slate-400" />,
          value: `${bedrooms} Bed`,
        }
      : null,
    bathrooms
      ? {
          key: 'bathrooms',
          icon: <Bath className="h-3 w-3 text-slate-400" />,
          value: `${bathrooms} Bath`,
        }
      : null,
    formatMeasure(yardSize)
      ? {
          key: 'yard-size',
          icon: <Trees className="h-3 w-3 text-slate-400" />,
          value: formatMeasure(yardSize),
        }
      : null,
    propertyType
      ? {
          key: 'property-type',
          icon: <Building2 className="h-3 w-3 text-slate-400" />,
          value: formatPropertyType(propertyType),
        }
      : null,
  ].filter(Boolean).slice(0, 4) as Array<{ key: string; icon: ReactNode; value: string }>;

  return (
    <Link
      href={href || `/development/${id}`}
      className="group relative block h-full w-full overflow-hidden rounded-lg border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
        {!resolvedImage && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300">
            <Building2 className="h-9 w-9" />
          </div>
        )}

        {resolvedImage && (
          <FallbackImage
            src={resolvedImage}
            alt={title}
            loading="lazy"
            className="absolute inset-0 z-10 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}

        <div className="absolute left-2.5 top-2.5 z-20">
          <span className="rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-700 shadow-sm">
            {badgeLabel}
          </span>
        </div>
      </div>

      <div className="p-3">
        <div className="mb-1.5 truncate text-[17px] font-bold leading-tight text-[#1e1b4b] sm:text-lg">
          {formatPrice(priceFrom, priceTo)}
        </div>

        <h3 className="mb-1 truncate whitespace-nowrap text-[13px] font-semibold leading-tight text-slate-900 transition-colors group-hover:text-[#2774AE]">
          {title}
        </h3>

        <div className="mb-2.5 flex items-center gap-1 text-[11px] text-slate-500">
          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">{locationLabel}</span>
        </div>

        {specItems.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-700">
            {specItems.map(item => (
              <div key={item.key} className="flex items-center gap-1 whitespace-nowrap">
                {item.icon}
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
            Unit details available on the development page.
          </div>
        )}
      </div>
    </Link>
  );
}
