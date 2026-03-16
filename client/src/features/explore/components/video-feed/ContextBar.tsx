import { ChevronUp } from 'lucide-react';
import type { FeedItem } from './types';

interface ContextBarProps {
  item: FeedItem;
  onExpand: () => void;
}

function SpecBadge({ value }: { value: string }) {
  return (
    <span className="rounded-full bg-white/15 px-2 py-1 text-[11px] font-medium text-white">{value}</span>
  );
}

export function ContextBar({ item, onExpand }: ContextBarProps) {
  return (
    <button
      onClick={onExpand}
      className="w-full rounded-2xl border border-white/20 bg-black/60 p-3 text-left text-white backdrop-blur-md"
      aria-label="Open content details"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {item.kind === 'listing' && (
            <>
              <p className="truncate text-sm font-semibold">{item.linkedListing.title}</p>
              <p className="text-xs text-white/80">
                {item.linkedListing.price} - {item.linkedListing.location}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <SpecBadge value={`${item.linkedListing.beds} beds`} />
                <SpecBadge value={`${item.linkedListing.baths} baths`} />
                <SpecBadge value={item.linkedListing.size} />
              </div>
            </>
          )}

          {item.kind === 'agent' && (
            <>
              <p className="truncate text-sm font-semibold">{item.agentProfile.name}</p>
              <p className="text-xs text-white/80">
                {item.agentProfile.agency} - {item.agentProfile.areaServed}
              </p>
            </>
          )}

          {item.kind === 'partner' && (
            <>
              <p className="truncate text-sm font-semibold">{item.partnerShowcase.projectTitle}</p>
              <p className="text-xs text-white/80">
                {item.partnerShowcase.priceRange} - {item.partnerShowcase.areaServed}
              </p>
            </>
          )}
        </div>
        <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-white/80" />
      </div>
    </button>
  );
}
