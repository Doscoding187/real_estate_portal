import { Link } from 'wouter';
import { ArrowRight, BadgeCheck, MapPin } from 'lucide-react';
import { getInitials } from './ProviderAvatar';
import { providerBrandPlate } from '@/features/services/design';
import type { ProviderDirectoryItem } from './ProviderCard';

type ProviderShowcaseCardProps = {
  provider: ProviderDirectoryItem;
  profileHref: string;
  /** A short secondary line such as a listed area count. */
  footnote?: string;
  /** Label for the primary action. */
  actionLabel?: string;
  onAction?: (providerId: number) => void;
};

function firstLine(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * The public identity plate for a provider.
 *
 * The platform has no provider photo library, and a stock image of a tradesperson
 * would misrepresent a real business. The plate is a deterministic brand
 * treatment derived from the provider's own name, so a provider always looks
 * the same, and it never pretends to be a photograph of the business.
 */
export function ProviderBrandPlate({
  companyName,
  logoUrl,
  className = '',
}: {
  companyName: string;
  logoUrl?: string | null;
  className?: string;
}) {
  const plate = providerBrandPlate(companyName);

  if (logoUrl) {
    return (
      <div className={`overflow-hidden ${className}`}>
        <img
          src={logoUrl}
          alt={`${companyName} logo`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        backgroundImage: `linear-gradient(140deg, ${plate.from} 0%, ${plate.to} 100%)`,
      }}
      aria-hidden="true"
    >
      <span
        className="font-['Sora'] text-4xl font-bold tracking-[-0.04em] md:text-5xl"
        style={{ color: plate.ink, opacity: 0.92 }}
      >
        {getInitials(companyName)}
      </span>
    </div>
  );
}

/**
 * A provider card in the approved Services visual language.
 *
 * Only canonical, published data is shown. There is no rating, no review
 * count, and no availability claim, because the Services contract does not
 * provide them and the platform must not imply a trust signal it cannot
 * evidence.
 */
export function ProviderShowcaseCard({
  provider,
  profileHref,
  footnote,
  actionLabel = 'View profile',
  onAction,
}: ProviderShowcaseCardProps) {
  const services = (provider.services || []).filter(service => service.displayName);
  const location = (provider.locations || [])[0];
  const locationLine =
    [location?.suburb, location?.city, location?.province].filter(Boolean).join(', ') ||
    'Coverage on request';
  const isVerified = provider.verificationStatus === 'verified';

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#E3EBF0] bg-white transition hover:border-[#168363]/40 hover:shadow-[0_18px_40px_-28px_rgba(2,17,30,0.45)]">
      <ProviderBrandPlate
        companyName={provider.companyName}
        logoUrl={provider.logoUrl}
        className="aspect-[16/10] w-full"
      />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-[15px] font-bold leading-snug text-[#0B1B2A]">
            {provider.companyName}
          </h3>
          {isVerified && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#E4F2EC] px-2 py-0.5 text-[10px] font-semibold text-[#116E54]">
              <BadgeCheck className="h-3 w-3" aria-hidden="true" />
              Platform verified
            </span>
          )}
        </div>

        {provider.headline && (
          <p className="line-clamp-2 text-[13px] leading-5 text-[#4B5C6B]">{provider.headline}</p>
        )}

        {services.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {services.slice(0, 3).map(service => (
              <li
                key={service.code || service.displayName}
                className="rounded-full border border-[#E3EBF0] px-2 py-0.5 text-[11px] font-medium text-[#4B5C6B]"
              >
                {service.displayName}
              </li>
            ))}
          </ul>
        )}

        <p className="flex items-start gap-1.5 text-[12px] leading-5 text-[#4B5C6B]">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#168363]" aria-hidden="true" />
          <span>{locationLine}</span>
        </p>

        {footnote && <p className="text-[11px] text-[#8A99A6]">{footnote}</p>}

        <div className="mt-auto pt-2">
          <Link href={profileHref} onClick={() => onAction?.(provider.providerId)}>
            <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#168363] px-4 py-2.5 text-[13px] font-semibold text-[#168363] transition group-hover:bg-[#EDF8F6]">
              {actionLabel}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * The horizontal provider row used on the discovery screen.
 *
 * The layout carries the same information as the card — identity, published
 * services, listed coverage, and the enquiry entry point — without implying
 * a ranking the directory does not compute.
 */
export function ProviderShowcaseRow({
  provider,
  profileHref,
  onContact,
  contactLabel = 'Contact',
}: {
  provider: ProviderDirectoryItem;
  profileHref: string;
  onContact?: (providerId: number) => void;
  contactLabel?: string;
}) {
  const services = (provider.services || []).filter(service => service.displayName);
  const location = (provider.locations || [])[0];
  const locationLine =
    [location?.suburb, location?.city, location?.province].filter(Boolean).join(', ') ||
    'Coverage on request';
  const isVerified = provider.verificationStatus === 'verified';
  const headline = firstLine(provider.headline) || firstLine(provider.bio);

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-[#E3EBF0] bg-white p-4 transition hover:border-[#168363]/40 hover:shadow-[0_16px_36px_-28px_rgba(2,17,30,0.4)] sm:flex-row sm:items-start">
      <ProviderBrandPlate
        companyName={provider.companyName}
        logoUrl={provider.logoUrl}
        className="h-28 w-full shrink-0 rounded-xl sm:h-24 sm:w-32"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold leading-tight text-[#0B1B2A]">
            {provider.companyName}
          </h3>
          {isVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E4F2EC] px-2 py-0.5 text-[10px] font-semibold text-[#116E54]">
              <BadgeCheck className="h-3 w-3" aria-hidden="true" />
              Platform verified
            </span>
          )}
        </div>

        {headline && (
          <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[#4B5C6B]">{headline}</p>
        )}

        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[#4B5C6B]">
          {services.slice(0, 4).map(service => (
            <li key={service.code || service.displayName} className="flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-[#168363]" aria-hidden="true" />
              {service.displayName}
            </li>
          ))}
        </ul>

        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#4B5C6B]">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#168363]" aria-hidden="true" />
          {locationLine}
        </p>
      </div>

      <div className="flex shrink-0 flex-row gap-2 sm:w-36 sm:flex-col">
        <Link href={profileHref} className="flex-1 sm:flex-none">
          <span className="inline-flex w-full items-center justify-center rounded-xl border border-[#E3EBF0] px-4 py-2.5 text-[13px] font-semibold text-[#0B1B2A] transition hover:border-[#168363] hover:text-[#168363]">
            View profile
          </span>
        </Link>
        {onContact && (
          <button
            type="button"
            onClick={() => onContact(provider.providerId)}
            className="flex-1 rounded-xl bg-[#168363] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#116E54] sm:flex-none"
          >
            {contactLabel}
          </button>
        )}
      </div>
    </article>
  );
}
