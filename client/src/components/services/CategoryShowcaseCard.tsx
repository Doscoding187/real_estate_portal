import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import { SERVICE_CATEGORY_ICONS } from './categoryIcons';
import type { ServiceCategory } from '@/features/services/catalog';

type CategoryShowcaseCardProps = {
  category: ServiceCategory;
  label: string;
  href: string;
  /** How many published providers currently list this category. */
  providerCount: number;
  /** True when the count is the visible cohort rather than the whole market. */
  isPartial?: boolean;
  /** Optional category photograph. Falls back to the icon plate. */
  image?: string;
};

/**
 * A category card in the approved Services visual language.
 *
 * Photographs are illustrative category imagery, not a photograph of any one
 * provider. The icon remains as a stable label cue and as the fallback when no
 * approved image is available.
 */
export function CategoryShowcaseCard({
  category,
  label,
  href,
  providerCount,
  isPartial = false,
  image,
}: CategoryShowcaseCardProps) {
  const Icon = SERVICE_CATEGORY_ICONS[category];
  const hasProviders = providerCount > 0;
  const countLabel = !hasProviders
    ? 'No providers listed yet'
    : isPartial
      ? `${providerCount}+ providers`
      : `${providerCount} provider${providerCount === 1 ? '' : 's'}`;

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#E3EBF0] bg-white transition hover:border-[#168363]/40 hover:shadow-[0_18px_40px_-28px_rgba(2,17,30,0.45)]"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[linear-gradient(140deg,#071829_0%,#0D2237_55%,#116E54_100%)]">
        {image ? (
          <>
            <img
              src={image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
              loading="lazy"
            />
            <span
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,17,30,0.08)_0%,rgba(2,17,30,0.52)_100%)]"
              aria-hidden="true"
            />
          </>
        ) : null}
        {!image ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-full shadow-[0_8px_24px_-10px_rgba(0,0,0,0.55)] transition group-hover:scale-105 ${
                hasProviders ? 'bg-[#EDF8F6]' : 'bg-white/85'
              }`}
            >
              <Icon
                className={`h-6 w-6 ${hasProviders ? 'text-[#116E54]' : 'text-[#8A99A6]'}`}
                aria-hidden="true"
              />
            </span>
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="text-[15px] font-bold leading-snug text-[#0B1B2A]">{label}</h3>
        <p className={`text-[12px] ${hasProviders ? 'text-[#8A99A6]' : 'text-[#A8B4BF]'}`}>
          {countLabel}
        </p>
        <span
          className={`mt-auto inline-flex items-center gap-1 pt-2 text-[12px] font-semibold ${
            hasProviders ? 'text-[#168363]' : 'text-[#A8B4BF]'
          }`}
        >
          {hasProviders ? 'Browse' : 'View category'}
          <ArrowRight
            className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}

/**
 * The compact circular category well used in the icon rail.
 */
export function CategoryIconWell({
  category,
  label,
  href,
  isActive = false,
}: {
  category: ServiceCategory;
  label: string;
  href: string;
  isActive?: boolean;
}) {
  const Icon = SERVICE_CATEGORY_ICONS[category];
  return (
    <Link
      href={href}
      aria-current={isActive ? 'true' : undefined}
      className="group flex w-[104px] shrink-0 flex-col items-center gap-2 text-center"
    >
      <span
        className={`flex h-16 w-16 items-center justify-center rounded-full transition ${
          isActive
            ? 'bg-[#168363] text-white shadow-[0_10px_24px_-12px_rgba(22,131,99,0.9)]'
            : 'bg-[#EDF8F6] text-[#116E54] group-hover:bg-[#D8EDE7]'
        }`}
      >
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="text-[12px] font-semibold leading-4 text-[#0B1B2A]">{label}</span>
    </Link>
  );
}
