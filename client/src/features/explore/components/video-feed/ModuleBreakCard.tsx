import { Compass, MapPin } from 'lucide-react';
import type { DiscoveryModuleFeedItem, ModuleListingCard } from './types';

interface ModuleBreakCardProps {
  item: DiscoveryModuleFeedItem;
  isActive: boolean;
  index: number;
  onListingClick: (listing: ModuleListingCard) => void;
}

function ListingTile({
  listing,
  onClick,
}: {
  listing: ModuleListingCard;
  onClick: (listing: ModuleListingCard) => void;
}) {
  return (
    <button
      onClick={() => onClick(listing)}
      className="w-64 shrink-0 overflow-hidden rounded-2xl border border-white/15 bg-white/10 text-left backdrop-blur-md transition-transform hover:scale-[1.01]"
    >
      <div className="relative h-40 w-full overflow-hidden bg-black/35">
        <img src={listing.imageUrl} alt={listing.title} className="h-full w-full object-cover" />
        {listing.badge && (
          <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            {listing.badge}
          </span>
        )}
      </div>

      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-semibold text-white">{listing.title}</p>
        <p className="text-sm font-bold text-emerald-200">{listing.price}</p>
        <p className="truncate text-xs text-white/75">{listing.location}</p>
        <p className="text-[11px] text-white/70">
          {listing.beds ? `${listing.beds} bed` : '-'} •{' '}
          {listing.baths ? `${listing.baths} bath` : '-'} • {listing.size || '-'}
        </p>
      </div>
    </button>
  );
}

export function ModuleBreakCard({ item, isActive, index, onListingClick }: ModuleBreakCardProps) {
  return (
    <section
      data-feed-item="true"
      data-index={index}
      className="relative h-screen w-full snap-start overflow-hidden bg-slate-950"
      aria-label={item.title}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.2),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.15),_transparent_45%)]" />

      <div className="relative z-10 flex h-full flex-col justify-between px-4 pb-6 pt-20 text-white">
        <div className="max-w-xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/85">
            <Compass className="h-3.5 w-3.5" />
            Discovery Break
          </div>
          <h2 className="text-2xl font-bold leading-tight">{item.title}</h2>
          {item.subtitle && <p className="text-sm text-white/75">{item.subtitle}</p>}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-white/70">
            <MapPin className="h-3.5 w-3.5" />
            {isActive
              ? 'Swipe horizontally inside this break to browse listings'
              : 'Discovery break ready'}
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-3 pr-4">
              {item.cards.map(card => (
                <ListingTile key={card.id} listing={card} onClick={onListingClick} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
