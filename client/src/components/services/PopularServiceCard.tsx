import { Link } from 'wouter';
import { ArrowRight } from 'lucide-react';
import type { RankedPopularService } from '@/features/services/media';

function providerLabel(count: number): string {
  if (count <= 0) return 'No providers listed yet';
  return `${count} provider${count === 1 ? '' : 's'}`;
}

/**
 * A ranked service card.
 *
 * The count is published provider supply, not a search volume. The ordering is
 * explained next to the section heading; the card itself never claims a ranking
 * signal it cannot evidence.
 */
export function PopularServiceCard({
  service,
  href,
}: {
  service: RankedPopularService;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#E3EBF0] bg-white transition hover:border-[#168363]/40 hover:shadow-[0_18px_40px_-28px_rgba(2,17,30,0.45)]"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#E9F0F4]">
        <img
          src={service.image}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="text-[14px] font-bold leading-snug text-[#0B1B2A]">{service.label}</h3>
        <p className="text-[12px] text-[#8A99A6]">{providerLabel(service.providerCount)}</p>
        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[12px] font-semibold text-[#168363]">
          Browse services
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
 * The circular icon well used in the ranked service rail.
 */
export function PopularServiceIconWell({
  service,
  href,
  isActive = false,
}: {
  service: RankedPopularService;
  href: string;
  isActive?: boolean;
}) {
  const Icon = service.icon;
  return (
    <Link
      href={href}
      aria-current={isActive ? 'true' : undefined}
      className="group flex w-[104px] shrink-0 flex-col items-center gap-2 text-center md:w-[112px]"
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
      <span className="text-[12px] font-semibold leading-4 text-[#0B1B2A]">
        {service.shortLabel}
      </span>
      <span className="text-[10px] font-medium text-[#8A99A6]">{service.providerCount} listed</span>
    </Link>
  );
}
