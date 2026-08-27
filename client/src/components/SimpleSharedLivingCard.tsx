import { Bath, BedDouble, MapPin, Wifi, Zap } from 'lucide-react';
import { Link } from 'wouter';

export interface SimpleSharedLivingCardProps {
  title: string;
  location: string;
  href: string;
  monthlyRent: number | null;
  rentUnknown: boolean;
  accommodationType: string;
  bathroomAccess: string;
  furnishedState: string;
  billsIncluded: { electricity: boolean; water: boolean; wifi: boolean };
}

const accommodationLabels: Record<string, string> = {
  private_room: 'Private room',
  shared_room: 'Shared room',
  en_suite_room: 'En-suite room',
  garden_cottage: 'Garden cottage',
  granny_flat: 'Granny flat',
  bachelor_studio: 'Bachelor / studio',
  backyard_room: 'Backyard room',
  backyard_unit: 'Backyard flat',
  room_shared_house: 'Room in shared house',
  room_shared_apartment: 'Room in shared apartment',
};

export function SimpleSharedLivingCard({
  title,
  location,
  href,
  monthlyRent,
  rentUnknown,
  accommodationType,
  bathroomAccess,
  furnishedState,
  billsIncluded,
}: SimpleSharedLivingCardProps) {
  const priceLabel =
    rentUnknown || monthlyRent === null
      ? 'Rent on request'
      : `R ${monthlyRent.toLocaleString('en-ZA', { maximumFractionDigits: 0 })} / month`;
  const arrangement = accommodationLabels[accommodationType] || 'Shared living';
  const bathroomLabel = bathroomAccess === 'own' ? 'Own bathroom' : 'Shared bathroom';
  const furnishingLabel = furnishedState === 'furnished' ? 'Furnished' : null;

  return (
    <Link
      href={href}
      className="group block w-full max-w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2774AE] focus-visible:ring-offset-2"
    >
      <div className="relative min-h-28 overflow-hidden bg-gradient-to-br from-sky-700 via-blue-700 to-indigo-800 px-4 py-4 text-white">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-white/20 bg-white/10" />
        <p className="relative text-[10px] font-bold uppercase tracking-[0.14em] text-sky-100">
          Shared living
        </p>
        <h3 className="relative mt-2 line-clamp-2 text-base font-bold leading-tight">{title}</h3>
        <p className="relative mt-2 flex items-center gap-1 text-xs text-sky-100">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{location}</span>
        </p>
      </div>

      <div className="p-4">
        <p className="text-sm font-semibold text-[#2774AE]">{priceLabel}</p>
        <p className="mt-2 text-xs font-medium text-slate-700">{arrangement}</p>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 border-t border-slate-100 pt-3 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <Bath className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            {bathroomLabel}
          </span>
          {furnishingLabel ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <BedDouble className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              {furnishingLabel}
            </span>
          ) : null}
          {billsIncluded.wifi ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Wifi className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              Wi-Fi included
            </span>
          ) : null}
          {billsIncluded.electricity ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Zap className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              Electricity included
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
