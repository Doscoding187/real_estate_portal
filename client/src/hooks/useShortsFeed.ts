import { useState, useCallback, useRef, useEffect } from 'react';
import { PropertyShort, FeedType } from '@/../../shared/types';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';

interface UseShortsFeedOptions {
  feedType: FeedType;
  feedId?: number;
  category?: string;
  limit?: number;
}

interface ShortsFeedState {
  cards: PropertyShort[];
  currentIndex: number;
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
}

export function useShortsFeed({ feedType, feedId, category, limit = 20 }: UseShortsFeedOptions) {
  const [state, setState] = useState<ShortsFeedState>({
    cards: [],
    currentIndex: 0,
    isLoading: true,
    hasMore: true,
    error: null,
  });

  const { toast } = useToast();
  const loadingRef = useRef(false);
  const offsetRef = useRef(0);
  const useMockData = useRef(true); // Toggle for development

  // Fetch feed data
  const fetchFeed = useCallback(
    async (reset: boolean = false) => {
      if (loadingRef.current) return;

      loadingRef.current = true;
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const offset = reset ? 0 : offsetRef.current;

        let mockCards: PropertyShort[];

        // Use mock data for development (toggle useMockData.current to false for real API)
        if (useMockData.current) {
          // Mock response for development
          mockCards = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
            id: offset + i + 1,
            listingId: offset + i + 1,
            agentId: 1,
            title: `Beautiful Property ${offset + i + 1}`,
            caption: 'Stunning property in prime location',
            primaryMediaId: 1,
            mediaIds: [1],
            highlights: ['ready-to-move', 'pet-friendly'],
            performanceScore: 85,
            boostPriority: 0,
            viewCount: 1250,
            uniqueViewCount: 980,
            saveCount: 45,
            shareCount: 12,
            skipCount: 23,
            averageWatchTime: 8,
            viewThroughRate: 78.4,
            saveRate: 4.6,
            shareRate: 1.2,
            skipRate: 2.3,
            isPublished: true,
            isFeatured: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            property: {
              price: 2500000 + i * 500000,
              location: {
                city: ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'Port Elizabeth'][i % 5],
                suburb: ['Sandton', 'Camps Bay', 'Umhlanga', 'Waterkloof', 'Summerstrand'][i % 5],
                province: ['Western Cape', 'Gauteng', 'KwaZulu-Natal', 'Gauteng', 'Eastern Cape'][
                  i % 5
                ],
              },
              specs: {
                bedrooms: 3 + (i % 3),
                bathrooms: 2 + (i % 2),
                parking: 2,
              },
            },
            media: [
              {
                id: 1,
                type: 'image',
                url: `https://images.unsplash.com/photo-${1560184697 + i}?w=800&h=1200&fit=crop`,
                thumbnailUrl: `https://images.unsplash.com/photo-${1560184697 + i}?w=400&h=600&fit=crop`,
                orientation: 'vertical' as const,
                width: 800,
                height: 1200,
              },
            ],
            highlightTags: [
              {
                id: 1,
                tagKey: 'ready-to-move',
                label: 'Ready to Move',
                category: 'status',
                displayOrder: 1,
                isActive: true,
                createdAt: new Date(),
              },
              {
                id: 2,
                tagKey: 'pet-friendly',
                label: 'Pet Friendly',
                category: 'feature',
                displayOrder: 2,
                isActive: true,
                createdAt: new Date(),
              },
            ],
            agent: {
              id: 1,
              name: 'John Smith Properties',
              phone: '+27 82 123 4567',
              whatsapp: '+27821234567',
            },
          }));
          const hasMore = offset < 15; // Simulate having 20 total cards
        } else {
          // Real API call (uncomment when backend is ready)
          // const response = await trpc.explore.getFeed.query({
          //   feedType,
          //   limit,
          //   offset,
          //   ...(feedType === 'agent' && feedId && { agentId: feedId }),
          //   ...(feedType === 'developer' && feedId && { developerId: feedId }),
          //   ...(category && { category }),
          // });
          // mockCards = response;
          mockCards = []; // Placeholder until API is ready
        }

        const hasMore = mockCards.length === limit;

        setState(prev => ({
          ...prev,
          cards: reset ? mockCards : [...prev.cards, ...mockCards],
          isLoading: false,
          hasMore,
          currentIndex: reset ? 0 : prev.currentIndex,
        }));

        offsetRef.current = reset ? mockCards.length : offsetRef.current + mockCards.length;
      } catch (error) {
        console.error('Failed to fetch feed:', error);
        toast({
          title: 'Error loading properties',
          description: 'Failed to load properties. Please try again.',
          variant: 'destructive',
        });
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load properties. Please try again.',
        }));
      } finally {
        loadingRef.current = false;
      }
    },
    [feedType, feedId, category, limit, toast],
  );

  // Initial load
  useEffect(() => {
    fetchFeed(true);
  }, [fetchFeed]);

  // Navigate to next card
  const goToNext = useCallback(() => {
    setState(prev => {
      const nextIndex = prev.currentIndex + 1;

      // Trigger load more when approaching end
      if (nextIndex >= prev.cards.length - 3 && prev.hasMore && !loadingRef.current) {
        fetchFeed(false);
      }

      return {
        ...prev,
        currentIndex: Math.min(nextIndex, prev.cards.length - 1),
      };
    });
  }, [fetchFeed]);

  // Navigate to previous card
  const goToPrevious = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentIndex: Math.max(prev.currentIndex - 1, 0),
    }));
  }, []);

  // Jump to specific index
  const goToIndex = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      currentIndex: Math.max(0, Math.min(index, prev.cards.length - 1)),
    }));
  }, []);

  // Refresh feed
  const refresh = useCallback(() => {
    offsetRef.current = 0;
    fetchFeed(true);
  }, [fetchFeed]);

  // Get current card
  const currentCard = state.cards[state.currentIndex] || null;

  // Get adjacent cards for preloading
  const adjacentCards = {
    previous: state.cards[state.currentIndex - 1] || null,
    next: state.cards[state.currentIndex + 1] || null,
  };

  return {
    ...state,
    currentCard,
    adjacentCards,
    goToNext,
    goToPrevious,
    goToIndex,
    refresh,
    isFirstCard: state.currentIndex === 0,
    isLastCard: state.currentIndex === state.cards.length - 1,
  };
}
