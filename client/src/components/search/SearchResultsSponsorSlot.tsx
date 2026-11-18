export interface SearchResultsSponsor {
  imageUrl: string;
  landingPageUrl?: string | null;
  altText?: string | null;
}

/**
 * Sponsored placement in the results right rail. It renders nothing (no label, no empty
 * box) until a sponsor campaign is supplied, so there is never placeholder advertising.
 */
export function SearchResultsSponsorSlot({ sponsor }: { sponsor?: SearchResultsSponsor | null }) {
  if (!sponsor?.imageUrl) return null;

  return (
    <section aria-label="Sponsored placement" data-ad-slot="search-results-rail">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        Sponsored
      </span>
      <a
        href={sponsor.landingPageUrl || '#'}
        rel="sponsored noopener noreferrer"
        aria-label={sponsor.altText || 'Sponsored property campaign'}
        className="block overflow-hidden rounded-xl border border-slate-200 bg-white"
      >
        <img
          src={sponsor.imageUrl}
          alt={sponsor.altText || ''}
          className="h-auto w-full object-cover"
          loading="lazy"
        />
      </a>
    </section>
  );
}
