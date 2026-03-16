import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { ContactAgentModal } from '@/components/explore/ContactAgentModal';
import { VideoCard } from '@/features/explore/components/video-feed/VideoCard';
import { ContextSheet } from '@/features/explore/components/video-feed/ContextSheet';
import type { FeedItem, ExploreCtaType } from '@/features/explore/components/video-feed/types';
import type { PropertyMapItem } from '@/hooks/useMapHybridView';

interface MapVideoFeedPanelProps {
  properties: PropertyMapItem[];
  isLoading: boolean;
  selectedPropertyId: number | null;
  hoveredPropertyId: number | null;
  feedScrollRef: RefObject<HTMLDivElement | null>;
  registerPropertyRef: (propertyId: number, element: HTMLElement | null) => void;
  onPropertyHover: (propertyId: number | null) => void;
  onPropertyCardSelect: (property: PropertyMapItem) => void;
  onPropertyClick?: (propertyId: number) => void;
}

const PROGRESS_MARKS = [25, 50, 75] as const;

const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

function formatPrice(value?: number) {
  if (!value || !Number.isFinite(value) || value <= 0) return 'Price on request';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value);
}

function mapMapPropertyToFeedItem(property: PropertyMapItem): FeedItem {
  const feed = property.feedItem;
  const city = feed.location?.city || '';
  const suburb = feed.location?.suburb || '';
  const province = feed.location?.province || '';
  const category = String(feed.category || property.propertyType || '').toLowerCase();

  return {
    id: String(property.id),
    kind: 'listing',
    videoUrl: feed.mediaUrl || property.imageUrl,
    posterUrl: feed.thumbnailUrl || property.imageUrl,
    caption: feed.title || property.title,
    actorTrust: {
      actorType: feed.actor.actorType,
      verificationStatus: feed.actor.verificationStatus,
      trustBand: feed.actorInsights?.trustBand || 'standard',
      momentumLabel: feed.actorInsights?.momentumLabel || 'stable',
      lowReports: Boolean(feed.actorInsights?.lowReports),
    },
    linkedListing: {
      title: property.title || feed.title || 'Property',
      price: formatPrice(property.price),
      location: [suburb, city, province].filter(Boolean).join(', ') || property.location || 'South Africa',
      beds: Number(property.beds || 0),
      baths: Number(property.baths || 0),
      size: property.size ? `${property.size} m²` : '-',
      amenities: [feed.category].filter(Boolean),
      listingUrl: property.linkedListingId ? `/property/${property.linkedListingId}` : undefined,
      listingId: property.linkedListingId,
      category,
      showQuoteCta: category === 'services' || category === 'renovation',
      agentContact: {
        name: feed.actor.displayName || 'Creator',
      },
    },
  };
}

function buildContactModalVideo(property: PropertyMapItem | undefined) {
  if (!property) return null;
  const mappedItem = mapMapPropertyToFeedItem(property);
  if (mappedItem.kind !== 'listing') return null;
  const listing = mappedItem.linkedListing;

  return {
    id: Number(property.id),
    type: 'listing' as const,
    propertyTitle: listing.title,
    propertyId: Number(listing.listingId || property.linkedListingId || 0) || undefined,
    agentName: listing.agentContact.name || 'Agent',
    agentId: Number(property.actorId || property.feedItem.actor.id || 0),
  };
}

export function MapVideoFeedPanel({
  properties,
  isLoading,
  selectedPropertyId,
  hoveredPropertyId,
  feedScrollRef,
  registerPropertyRef,
  onPropertyHover,
  onPropertyCardSelect,
  onPropertyClick,
}: MapVideoFeedPanelProps) {
  const [, setLocation] = useLocation();

  const sessionIdRef = useRef(`map-feed-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const impressionLoggedRef = useRef<Set<number>>(new Set());
  const viewStartLoggedRef = useRef<Set<number>>(new Set());
  const viewCompleteLoggedRef = useRef<Set<number>>(new Set());
  const progressMilestonesRef = useRef<Map<number, Set<number>>>(new Map());

  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [contextPropertyId, setContextPropertyId] = useState<string | null>(null);
  const [contactPropertyId, setContactPropertyId] = useState<number | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());

  const recordInteractionMutation = trpc.explore.recordInteraction.useMutation();
  const recordOutcomeMutation = trpc.explore.recordOutcome.useMutation();

  const propertiesById = useMemo(() => {
    const map = new Map<number, PropertyMapItem>();
    properties.forEach(property => map.set(property.id, property));
    return map;
  }, [properties]);

  const recordInteraction = useCallback(
    async (
      contentId: number,
      interactionType:
        | 'impression'
        | 'view'
        | 'viewProgress'
        | 'viewComplete'
        | 'save'
        | 'share'
        | 'like'
        | 'listingOpen'
        | 'notInterested',
      duration?: number,
      feedContext?: Record<string, unknown>,
    ) => {
      try {
        await recordInteractionMutation.mutateAsync({
          contentId,
          interactionType,
          duration,
          feedType: 'recommended',
          feedContext: {
            source: 'explore_map_feed',
            sessionId: sessionIdRef.current,
            ...(feedContext || {}),
          },
          deviceType: getDeviceType(),
        });
      } catch {
        // best effort analytics
      }
    },
    [recordInteractionMutation],
  );

  const recordOutcome = useCallback(
    async (
      contentId: number,
      outcomeType: 'contactClick' | 'viewingRequest' | 'quoteRequest',
      outcomeContext?: Record<string, unknown>,
    ) => {
      try {
        await recordOutcomeMutation.mutateAsync({
          contentId,
          outcomeType,
          feedType: 'recommended',
          outcomeContext: {
            source: 'explore_map_feed',
            sessionId: sessionIdRef.current,
            ...(outcomeContext || {}),
          },
          deviceType: getDeviceType(),
        });
      } catch {
        // best effort analytics
      }
    },
    [recordOutcomeMutation],
  );

  useEffect(() => {
    const container = feedScrollRef.current;
    if (!container || properties.length === 0) return;

    const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-map-video-id]'));
    if (cards.length === 0) return;

    const observer = new IntersectionObserver(
      entries => {
        const nextEntry = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!nextEntry || nextEntry.intersectionRatio < 0.55) return;

        const id = Number(nextEntry.target.getAttribute('data-map-video-id'));
        if (!Number.isFinite(id) || id <= 0) return;

        const contentId = String(id);
        setActivePropertyId(contentId);

        if (!impressionLoggedRef.current.has(id)) {
          impressionLoggedRef.current.add(id);
          void recordInteraction(id, 'impression');
        }
      },
      {
        root: container,
        threshold: [0.35, 0.55, 0.75],
      },
    );

    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [feedScrollRef, properties, recordInteraction]);

  useEffect(() => {
    if (!activePropertyId) return;

    const id = Number(activePropertyId);
    if (!Number.isFinite(id) || id <= 0) return;

    if (!viewStartLoggedRef.current.has(id)) {
      viewStartLoggedRef.current.add(id);
      void recordInteraction(id, 'view');
    }
  }, [activePropertyId, recordInteraction]);

  const handleViewProgress = useCallback(
    (contentId: string, currentSec: number, durationSec: number) => {
      if (!durationSec || durationSec <= 0) return;
      const id = Number(contentId);
      if (!Number.isFinite(id) || id <= 0) return;

      const percent = (currentSec / durationSec) * 100;
      const milestones = progressMilestonesRef.current.get(id) || new Set<number>();

      for (const threshold of PROGRESS_MARKS) {
        if (percent >= threshold && !milestones.has(threshold)) {
          milestones.add(threshold);
          progressMilestonesRef.current.set(id, milestones);
          void recordInteraction(id, 'viewProgress', Math.max(1, Math.round(currentSec)), {
            milestonePct: threshold,
          });
        }
      }

      if (percent >= 95 && !viewCompleteLoggedRef.current.has(id)) {
        viewCompleteLoggedRef.current.add(id);
        void recordInteraction(id, 'viewComplete', Math.max(1, Math.round(durationSec)), {
          stage: 'complete',
        });
      }
    },
    [recordInteraction],
  );

  const handleViewComplete = useCallback(
    (contentId: string) => {
      const id = Number(contentId);
      if (!Number.isFinite(id) || id <= 0) return;
      if (viewCompleteLoggedRef.current.has(id)) return;
      viewCompleteLoggedRef.current.add(id);
      void recordInteraction(id, 'viewComplete');
    },
    [recordInteraction],
  );

  const handleLike = useCallback(
    (contentId: string) => {
      const id = Number(contentId);
      if (!Number.isFinite(id) || id <= 0) return;
      setLikedIds(previous => {
        const next = new Set(previous);
        if (next.has(contentId)) {
          next.delete(contentId);
        } else {
          next.add(contentId);
        }
        return next;
      });
      void recordInteraction(id, 'like');
    },
    [recordInteraction],
  );

  const handleSave = useCallback(
    (contentId: string) => {
      const id = Number(contentId);
      if (!Number.isFinite(id) || id <= 0) return;
      setSavedIds(previous => {
        const next = new Set(previous);
        if (next.has(contentId)) {
          next.delete(contentId);
        } else {
          next.add(contentId);
        }
        return next;
      });
      void recordInteraction(id, 'save');
    },
    [recordInteraction],
  );

  const handleShare = useCallback(
    (contentId: string) => {
      const id = Number(contentId);
      if (!Number.isFinite(id) || id <= 0) return;
      void recordInteraction(id, 'share');
    },
    [recordInteraction],
  );

  const handleNotInterested = useCallback(
    (contentId: string) => {
      const id = Number(contentId);
      if (!Number.isFinite(id) || id <= 0) return;
      void recordInteraction(id, 'notInterested');
    },
    [recordInteraction],
  );

  const handleCtaClick = useCallback(
    (contentId: string, ctaType: ExploreCtaType) => {
      const id = Number(contentId);
      if (!Number.isFinite(id) || id <= 0) return;

      const property = propertiesById.get(id);
      const listingId = property?.linkedListingId;
      const listingRoute = listingId ? `/property/${listingId}` : undefined;

      switch (ctaType) {
        case 'viewListing':
          void recordInteraction(id, 'listingOpen', undefined, { source: 'map_context_sheet' });
          if (listingRoute) {
            setLocation(listingRoute);
          } else if (property) {
            onPropertyClick?.(property.id);
          }
          return;
        case 'viewingRequest':
          void recordOutcome(id, 'viewingRequest', { source: 'map_context_sheet' });
          setContactPropertyId(id);
          return;
        case 'contactAgent':
          void recordOutcome(id, 'contactClick', { source: 'map_context_sheet' });
          setContactPropertyId(id);
          return;
        case 'partnerRequestQuote':
          void recordOutcome(id, 'quoteRequest', { source: 'map_context_sheet' });
          return;
        default:
          return;
      }
    },
    [onPropertyClick, propertiesById, recordInteraction, recordOutcome, setLocation],
  );

  const contextProperty =
    contextPropertyId != null ? propertiesById.get(Number(contextPropertyId)) : undefined;
  const contextItem = contextProperty ? mapMapPropertyToFeedItem(contextProperty) : undefined;
  const contextPropertyNumericId = contextProperty?.id;

  const contactVideo = buildContactModalVideo(
    contactPropertyId != null ? propertiesById.get(Number(contactPropertyId)) : undefined,
  );

  return (
    <div ref={feedScrollRef} className="h-full overflow-y-auto bg-gray-50">
      <div className="space-y-4 p-4">
        {properties.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-200">
              <MapPin className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">No properties found</h3>
            <p className="max-w-md text-sm text-gray-600">
              Try adjusting the map view or changing your filters to see more properties.
            </p>
          </motion.div>
        )}

        {properties.map((property, index) => {
          const isSelected = selectedPropertyId === property.id;
          const isHovered = hoveredPropertyId === property.id;

          return (
            <motion.div
              key={property.id}
              ref={el => registerPropertyRef(property.id, el)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`w-full transition-all ${isSelected || isHovered ? 'rounded-2xl ring-2 ring-indigo-500' : ''}`}
              data-map-video-id={property.id}
              onMouseEnter={() => onPropertyHover(property.id)}
              onMouseLeave={() => onPropertyHover(null)}
            >
              <VideoCard
                variant="compact"
                item={mapMapPropertyToFeedItem(property)}
                isActive={activePropertyId === String(property.id)}
                isContextOpen={contextPropertyId === String(property.id)}
                liked={likedIds.has(String(property.id))}
                saved={savedIds.has(String(property.id))}
                compactClassName="relative w-full"
                onOpenContext={contentId => {
                  setContextPropertyId(contentId);
                }}
                onCloseContext={() => {
                  setContextPropertyId(null);
                }}
                onVideoTimeUpdate={handleViewProgress}
                onVideoEnded={handleViewComplete}
                onLike={handleLike}
                onSave={handleSave}
                onShare={handleShare}
                onNotInterested={handleNotInterested}
                onCtaClick={handleCtaClick}
                onCardClick={contentId => {
                  setActivePropertyId(contentId);
                  onPropertyCardSelect(property);
                }}
              />
            </motion.div>
          );
        })}

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              <span className="text-sm font-medium text-gray-600">Loading properties...</span>
            </div>
          </motion.div>
        )}
      </div>

      {contextItem && (
        <>
          <button
            aria-label="Close context sheet"
            onClick={() => setContextPropertyId(null)}
            className={`fixed inset-0 z-40 bg-black/35 transition-opacity duration-300 ${
              contextPropertyId ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
            }`}
          />
          <ContextSheet
            item={contextItem}
            open={contextPropertyId != null}
            onClose={() => setContextPropertyId(null)}
            onCtaClick={ctaType => {
              if (!contextPropertyNumericId) return;
              handleCtaClick(String(contextPropertyNumericId), ctaType);
            }}
            positionMode="fixed"
          />
        </>
      )}

      {contactVideo && (
        <ContactAgentModal
          video={contactVideo}
          onClose={() => {
            setContactPropertyId(null);
          }}
        />
      )}
    </div>
  );
}
