import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPriceRangeCompact } from '@/lib/utils';
import { resolveMediaUrl } from '@/lib/mediaUtils';
import { Bath, Bed, Building2, MapPin, Ruler, TrendingUp } from 'lucide-react';

export interface SimpleDevelopmentUnitCardProps {
  id: string;
  title: string;
  developmentName: string;
  city: string;
  suburb?: string;
  image?: string | null;
  href: string;
  priceFrom?: number | null;
  priceTo?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  unitSize?: number | null;
  badgeLabel?: string;
}

export function SimpleDevelopmentUnitCard({
  id,
  title,
  developmentName,
  city,
  suburb,
  image,
  href,
  priceFrom,
  priceTo,
  bedrooms,
  bathrooms,
  unitSize,
  badgeLabel = 'New Development',
}: SimpleDevelopmentUnitCardProps) {
  const locationLabel = suburb ? `${suburb}, ${city}` : city;
  const imageUrl = resolveMediaUrl(image || '') || '';
  const priceLabel = formatPriceRangeCompact(priceFrom, priceTo);

  return (
    <Link
      href={href}
      className="group block w-full max-w-[312px] overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <div className="absolute inset-0 flex items-center justify-center text-slate-300">
          <Building2 className="h-12 w-12" />
        </div>
        {imageUrl && (
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={e => {
              const target = e.currentTarget;
              target.style.display = 'none';
            }}
          />
        )}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Badge className="border-0 bg-white/92 text-[10px] uppercase tracking-[0.18em] text-slate-700">
            {badgeLabel}
          </Badge>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2774AE]">
            Part of {developmentName}
          </p>
          <h3 className="line-clamp-2 text-base font-semibold leading-tight text-slate-900 transition-colors group-hover:text-[#2774AE]">
            {title}
          </h3>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{locationLabel}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
          <div className="flex items-center gap-1.5">
            <Bed className="h-3.5 w-3.5 text-slate-400" />
            <span>{bedrooms ?? '-'} bed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bath className="h-3.5 w-3.5 text-slate-400" />
            <span>{bathrooms ?? '-'} bath</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Ruler className="h-3.5 w-3.5 text-slate-400" />
            <span>{unitSize ? `${unitSize} m2` : '-'}</span>
          </div>
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Guide Price</p>
            <p className="text-lg font-bold text-[#2774AE]">{priceLabel}</p>
          </div>
          <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
            <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
            Explore unit
          </div>
        </div>
      </div>
    </Link>
  );
}
