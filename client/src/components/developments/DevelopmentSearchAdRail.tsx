export type DevelopmentSearchSponsor = {
  imageUrl: string;
  href: string;
  alt: string;
  title?: string;
};

type DevelopmentSearchAdRailProps = {
  sponsor?: DevelopmentSearchSponsor;
};

/** Billboard slot for a real sponsor. Renders nothing until a sponsor is supplied. */
export function DevelopmentSearchAdRail({ sponsor }: DevelopmentSearchAdRailProps) {
  if (!sponsor) return null;
  return (
    <aside aria-label="Sponsored" className="space-y-1.5">
      <span className="px-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
        Sponsored
      </span>
      <a
        href={sponsor.href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        title={sponsor.title}
        className="block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <img src={sponsor.imageUrl} alt={sponsor.alt} className="h-auto w-full" loading="lazy" />
      </a>
    </aside>
  );
}
