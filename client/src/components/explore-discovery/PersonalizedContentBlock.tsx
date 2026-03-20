// @ts-nocheck
/**
 * PersonalizedContentBlock Component
 * Displays a horizontal scrollable section of personalized content
 * Requirements: 12.1, 12.3, 12.4, 12.5, 12.6
 */

import { ChevronRight, MapPin, Play, Sparkles, TrendingUp } from 'lucide-react';
import { DiscoveryItem } from '@/hooks/useDiscoveryFeed';
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

export function PersonalizedContentBlock({
  title,
  subtitle,
  items,
  onItemClick,
  onSeeAll,
  isLoading = false,
  videoAspect,
}: PersonalizedContentBlockProps) {
  const shelfBadge = items.length > 0 ? `${Math.min(items.length, 99)} picks` : 'Discovery rail';

  const getVideoAspectFromData = (data: any): CompactAspect => {
    if (videoAspect) {
      return videoAspect;
    }
    const orientation = String(data?.orientation || '').toLowerCase();
    if (orientation.includes('square')) return 'square';
    if (orientation.includes('horizontal') || orientation.includes('landscape')) return 'landscape';
    if (data?.contentType === 'walkthrough') return 'landscape';
    if (data?.contentType === 'showcase') return 'square';
    return 'portrait';
  };

  const getPrimaryImage = (item: DiscoveryItem): string => {
    const data = item.data as any;
    return (
      data?.imageUrl ||
      data?.heroBannerUrl ||
      data?.thumbnailUrl ||
      data?.mediaUrl ||
      data?.videoUrl ||
      ''
    );
  };

  const formatCompactPrice = (value?: number) => {
    if (!value || Number.isNaN(value)) return undefined;
    if (value >= 1_000_000) return `R${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `R${(value / 1_000).toFixed(0)}K`;
    return `R${value}`;
  };

  const renderMediaTile = (item: DiscoveryItem) => {
    const data = item.data as any;
    const imageUrl = getPrimaryImage(item);
    const aspect =
      item.type === 'video'
        ? getVideoAspectFromData(data)
        : item.type === 'neighbourhood'
          ? 'landscape'
          : item.type === 'insight'
            ? 'square'
            : 'portrait';

    const widthClass =
      aspect === 'landscape' ? 'w-[24rem]' : aspect === 'square' ? 'w-[18rem]' : 'w-[15.5rem]';

    const title =
      item.type === 'neighbourhood'
        ? data?.name || 'Explore area'
        : data?.title || 'Explore item';

    const subtitle =
      item.type === 'video'
        ? data?.actor?.displayName || data?.creatorName || 'Watch now'
        : item.type === 'property'
          ? [data?.city, data?.province].filter(Boolean).join(', ') ||
            data?.location ||
            'South Africa'
          : item.type === 'neighbourhood'
            ? `${data?.propertyCount || 0} active listings`
            : data?.description || 'Open section';

    const badge =
      item.type === 'video'
        ? 'Video'
        : item.type === 'property'
          ? 'Listing'
          : item.type === 'neighbourhood'
            ? 'Area'
            : 'Insight';

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

    const statLine =
      item.type === 'property'
        ? formatCompactPrice(Number(data?.priceMin || data?.price || 0))
        : item.type === 'video'
          ? `${Number(data?.stats?.views || data?.viewCount || 0)} views`
          : item.type === 'neighbourhood'
            ? formatCompactPrice(Number(data?.avgPropertyPrice || 0))
            : data?.data?.value || undefined;

    return (
      <button
        key={item.id}
        type="button"
        className={`group relative ${widthClass} flex-shrink-0 snap-start overflow-hidden rounded-[28px] text-left`}
        onClick={() => onItemClick(item)}
      >
        <div
          className={`relative overflow-hidden ${
            aspect === 'landscape'
              ? 'aspect-[16/10]'
              : aspect === 'square'
                ? 'aspect-square'
                : 'aspect-[4/5]'
          }`}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-slate-300" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/26 to-transparent" />

          <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
            <span className="rounded-full border border-white/15 bg-black/28 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/82 backdrop-blur-sm">
              {badge}
            </span>
            <div className="rounded-full border border-white/15 bg-white/12 p-2 text-white backdrop-blur-sm">
              {accentIcon}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <h3 className="line-clamp-2 text-lg font-semibold leading-tight">{title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-white/74">{subtitle}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-white">
                {statLine || 'Open'}
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-white">
                View
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
      <div className="mb-10">
        <div className="mb-4 flex items-center justify-between px-4">
          <div>
            <div className="mb-2 h-3 w-24 rounded-full bg-gray-100 animate-pulse" />
            <div className="h-7 w-36 rounded-full bg-gray-200 animate-pulse" />
            {subtitle && <div className="mt-2 h-4 w-48 rounded bg-gray-100 animate-pulse" />}
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="h-96 w-72 flex-shrink-0 rounded-[28px] bg-gray-200 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mb-10">
        <div className="mb-4 flex items-center justify-between px-4">
          <div>
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {shelfBadge}
            </span>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
          </div>
          {onSeeAll && (
            <button
              onClick={onSeeAll}
              className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
              aria-label={`See all ${title}`}
            >
              See All
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="px-4">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-7 text-sm text-slate-600">
            Coming soon. No items yet.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-10">
      <div className="mb-4 flex items-center justify-between px-4">
        <div>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {shelfBadge}
          </span>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
        </div>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
            aria-label={`See all ${title}`}
          >
            See All
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide snap-x snap-mandatory">
        {items.map(item => renderMediaTile(item))}
      </div>
    </div>
  );
}
