// @ts-nocheck
import { ChevronRight, MapPin, Play, Sparkles, TrendingUp } from 'lucide-react';
import type { DiscoveryItem } from '@/domains/discovery/types';

type CompactAspect = 'portrait' | 'landscape' | 'square';

interface PersonalizedContentBlockProps {
  title: string;
  subtitle?: string;
  items: DiscoveryItem[];
  onItemClick: (item: DiscoveryItem) => void;
  onSeeAll?: () => void;
  isLoading?: boolean;
  videoAspect?: CompactAspect;
}

function formatCompactPrice(value?: number) {
  if (!value || Number.isNaN(value)) return undefined;
  if (value >= 1_000_000) return `R${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R${(value / 1_000).toFixed(0)}K`;
  return `R${value}`;
}

function formatCompactCount(value?: number) {
  if (!value || Number.isNaN(value)) return undefined;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${value}`;
}

function getSectionTone(title: string) {
  const tone = title.toLowerCase();

  if (tone.includes('service') || tone.includes('contractor') || tone.includes('builder')) {
    return {
      badge: 'Services',
      badgeClass: 'bg-emerald-50 text-emerald-700',
      surface: 'from-emerald-500/20 to-cyan-500/10',
    };
  }

  if (tone.includes('insight') || tone.includes('finance')) {
    return {
      badge: 'Signals',
      badgeClass: 'bg-amber-50 text-amber-700',
      surface: 'from-amber-500/20 to-orange-500/10',
    };
  }

  if (tone.includes('neighbourhood')) {
    return {
      badge: 'Places',
      badgeClass: 'bg-fuchsia-50 text-fuchsia-700',
      surface: 'from-fuchsia-500/20 to-violet-500/10',
    };
  }

  return {
    badge: 'Media shelf',
    badgeClass: 'bg-blue-50 text-blue-700',
    surface: 'from-blue-500/20 to-indigo-500/10',
  };
}

function getVideoAspectFromData(data: any, forcedAspect?: CompactAspect): CompactAspect {
  if (forcedAspect) return forcedAspect;
  const orientation = String(data?.orientation || '').toLowerCase();
  if (orientation.includes('square')) return 'square';
  if (orientation.includes('horizontal') || orientation.includes('landscape')) return 'landscape';
  if (data?.contentType === 'walkthrough') return 'landscape';
  if (data?.contentType === 'showcase') return 'square';
  return 'portrait';
}

function getPrimaryImage(item: DiscoveryItem): string {
  const data = item.data as any;
  return (
    data?.imageUrl ||
    data?.heroBannerUrl ||
    data?.thumbnailUrl ||
    data?.mediaUrl ||
    data?.videoUrl ||
    ''
  );
}

function getItemBadge(item: DiscoveryItem, data: any) {
  if (item.type === 'video') {
    if (data?.contentType === 'walkthrough') return 'Walkthrough';
    return 'Video';
  }
  if (item.type === 'property') return 'Listing';
  if (item.type === 'neighbourhood') return 'Area';
  if (item.type === 'insight') return 'Insight';
  return 'Channel';
}

function getItemStat(item: DiscoveryItem, data: any) {
  if (item.type === 'property') {
    return formatCompactPrice(Number(data?.priceMin || data?.price || 0));
  }
  if (item.type === 'video') {
    const views = formatCompactCount(Number(data?.stats?.views || data?.viewCount || 0));
    return views ? `${views} views` : 'Watch now';
  }
  if (item.type === 'neighbourhood') {
    return formatCompactPrice(Number(data?.avgPropertyPrice || 0));
  }
  return data?.data?.value || 'Open';
}

function getItemCta(item: DiscoveryItem, data: any) {
  if (item.type === 'video') {
    return data?.contentType === 'walkthrough' ? 'Watch tour' : 'Watch now';
  }

  if (item.type === 'property') return 'Open listing';
  if (item.type === 'neighbourhood') return 'Explore area';
  if (item.type === 'insight') return 'Open insight';
  return 'Open lane';
}

export function PersonalizedContentBlock({
  title,
  subtitle,
  items,
  onItemClick,
  onSeeAll,
  isLoading = false,
  videoAspect,
}: PersonalizedContentBlockProps) {
  const sectionTone = getSectionTone(title);
  const shelfBadge = items.length > 0 ? `${Math.min(items.length, 99)} picks` : 'Discovery shelf';

  const renderMediaTile = (item: DiscoveryItem, index: number) => {
    const data = item.data as any;
    const imageUrl = getPrimaryImage(item);
    const isLeadCard = index === 0;
    const aspect =
      item.type === 'video'
        ? getVideoAspectFromData(data, videoAspect)
        : item.type === 'neighbourhood'
          ? 'landscape'
          : item.type === 'insight'
            ? 'square'
            : 'portrait';

    const widthClass = isLeadCard
      ? aspect === 'landscape'
        ? 'w-[24rem] md:w-[31rem]'
        : aspect === 'square'
          ? 'w-[20rem] md:w-[24rem]'
          : 'w-[18rem] md:w-[21rem]'
      : aspect === 'landscape'
        ? 'w-[22rem] md:w-[24rem]'
        : aspect === 'square'
          ? 'w-[17rem]'
          : 'w-[15.5rem]';

    const heading =
      item.type === 'neighbourhood'
        ? data?.name || 'Explore area'
        : data?.title || 'Explore item';

    const supporting =
      item.type === 'video'
        ? data?.actor?.displayName || data?.creatorName || 'Watch now'
        : item.type === 'property'
          ? [data?.city, data?.province].filter(Boolean).join(', ') || data?.location || 'South Africa'
          : item.type === 'neighbourhood'
            ? `${data?.propertyCount || 0} active listings`
            : data?.description || 'Open section';

    const statLine = getItemStat(item, data);
    const badge = getItemBadge(item, data);
    const ctaLabel = getItemCta(item, data);

    const accentIcon =
      item.type === 'video' ? (
        <Play className="h-4 w-4" />
      ) : item.type === 'neighbourhood' ? (
        <MapPin className="h-4 w-4" />
      ) : item.type === 'insight' ? (
        <Sparkles className="h-4 w-4" />
      ) : (
        <TrendingUp className="h-4 w-4" />
      );

    return (
      <button
        key={item.id}
        type="button"
        className={`group relative ${widthClass} flex-shrink-0 snap-start overflow-hidden rounded-[30px] border border-white/8 bg-slate-950 text-left shadow-[0_20px_50px_rgba(15,23,42,0.16)]`}
        onClick={() => onItemClick(item)}
      >
        <div
          className={`relative overflow-hidden ${
            isLeadCard
              ? aspect === 'landscape'
                ? 'aspect-[16/11]'
                : aspect === 'square'
                  ? 'aspect-[1/1]'
                  : 'aspect-[4/5.4]'
              : aspect === 'landscape'
              ? 'aspect-[16/10]'
              : aspect === 'square'
                ? 'aspect-square'
                : 'aspect-[4/5]'
          }`}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={heading}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-slate-300" />
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/12 via-transparent to-black/86" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_transparent_32%)]" />
          <div className="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100 bg-[linear-gradient(180deg,transparent_0%,rgba(15,23,42,0.14)_40%,rgba(15,23,42,0.44)_100%)]" />

          <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
            <span
              className={`rounded-full border border-white/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-sm ${
                isLeadCard ? '' : 'bg-black/30'
              }`}
              style={isLeadCard ? { background: 'linear-gradient(135deg, rgba(37,99,235,0.92), rgba(99,102,241,0.92))' } : undefined}
            >
              {badge}
            </span>
            <div className="rounded-full border border-white/18 bg-white/12 p-2 text-white backdrop-blur-sm">
              {accentIcon}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-sm">
                {isLeadCard ? 'Lead pick' : index < 3 ? 'Trending' : 'Fresh'}
              </span>
            </div>
            <h3 className={`line-clamp-2 font-semibold leading-tight ${isLeadCard ? 'text-[1.75rem]' : 'text-xl'}`}>
              {heading}
            </h3>
            <p className={`mt-2 line-clamp-2 ${isLeadCard ? 'text-[15px]' : 'text-sm'} leading-6 text-white/74`}>
              {supporting}
            </p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-white">{statLine}</span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-white">
                {ctaLabel}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </div>
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="mb-12">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="mb-2 h-3 w-24 animate-pulse rounded-full bg-gray-100" />
            <div className="h-8 w-48 animate-pulse rounded-full bg-gray-200" />
            {subtitle ? <div className="mt-2 h-4 w-56 animate-pulse rounded bg-gray-100" /> : null}
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-96 w-72 flex-shrink-0 animate-pulse rounded-[30px] bg-gray-200"
            />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mb-12">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${sectionTone.badgeClass}`}>
              {shelfBadge}
            </span>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          </div>
        </div>
        <div className="rounded-[30px] border border-slate-200 bg-slate-50 px-5 py-7 text-sm text-slate-600">
          Coming soon. No items yet.
        </div>
      </div>
    );
  }

  return (
    <section className="mb-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${sectionTone.badgeClass}`}>
            {sectionTone.badge}
          </span>
          <h2 className="mt-3 text-[1.9rem] font-semibold leading-tight text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm text-slate-600">{subtitle}</p> : null}
        </div>
        {onSeeAll ? (
          <button
            onClick={onSeeAll}
            className="hidden items-center gap-1 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white md:inline-flex"
            aria-label={`See all ${title}`}
          >
            Watch all
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className={`relative overflow-hidden rounded-[34px] border border-slate-200/70 bg-gradient-to-br ${sectionTone.surface} bg-white/70 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5`}>
        <div className="mb-4 flex items-center justify-between">
          <div className="rounded-full border border-black/5 bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {shelfBadge}
          </div>
          {onSeeAll ? (
            <button
              onClick={onSeeAll}
              className="rounded-full border border-black/5 bg-white/60 px-3 py-1.5 text-xs font-semibold text-slate-700 md:hidden"
            >
              See all
            </button>
          ) : null}
        </div>

        <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
          {items.map((item, index) => renderMediaTile(item, index))}
        </div>
      </div>
    </section>
  );
}
