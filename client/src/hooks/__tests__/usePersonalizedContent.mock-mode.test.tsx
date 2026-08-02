import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePersonalizedContent } from '../usePersonalizedContent';

const { useQueryMock, isExploreMockModeMock, getExploreMockFeedItemsMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  isExploreMockModeMock: vi.fn(),
  getExploreMockFeedItemsMock: vi.fn(),
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    discovery: {
      getFeed: {
        useQuery: useQueryMock,
      },
    },
  },
}));

vi.mock('@/lib/exploreMockMode', () => ({
  isExploreMockMode: isExploreMockModeMock,
}));

vi.mock('@/data/exploreMockFeed', () => ({
  getExploreMockFeedItems: getExploreMockFeedItemsMock,
}));

const liveItem = {
  id: 101,
  contentType: 'short' as const,
  category: 'property' as const,
  title: 'Live listing short',
  mediaUrl: 'https://example.com/live.mp4',
  thumbnailUrl: 'https://example.com/live.jpg',
  durationSec: 30,
  orientation: 'vertical' as const,
  actor: {
    id: 1,
    displayName: 'Live creator',
    actorType: 'agent' as const,
    verificationStatus: 'verified' as const,
  },
  stats: { views: 10, saves: 1, shares: 1 },
};

const mockItem = {
  id: 901,
  contentType: 'short' as const,
  category: 'property' as const,
  title: 'Preview listing short',
  mediaUrl: 'https://example.com/mock.mp4',
  thumbnailUrl: 'https://example.com/mock.jpg',
  durationSec: 30,
  orientation: 'vertical' as const,
  actor: {
    id: 9,
    displayName: 'Preview creator',
    actorType: 'agent' as const,
    verificationStatus: 'verified' as const,
  },
  stats: { views: 10, saves: 1, shares: 1 },
};

function queryResult(items: unknown[]) {
  return {
    data: { items },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  };
}

describe('usePersonalizedContent mock-mode boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isExploreMockModeMock.mockReturnValue(false);
    getExploreMockFeedItemsMock.mockReturnValue([mockItem]);
    useQueryMock.mockReturnValue(queryResult([]));
  });

  it('does not top up an underfilled live rail with mock items in development', async () => {
    useQueryMock.mockReturnValue(queryResult([liveItem]));

    const { result } = renderHook(() => usePersonalizedContent());

    await waitFor(() => expect(result.current.sections).toHaveLength(8));

    const forYou = result.current.sections.find(section => section.id === 'for-you');
    expect(forYou?.items).toHaveLength(1);
    expect(forYou?.items[0]?.id).toBe(liveItem.id);
  });

  it('keeps empty live responses empty', async () => {
    const { result } = renderHook(() => usePersonalizedContent());

    await waitFor(() => expect(result.current.sections).toHaveLength(8));

    expect(result.current.sections.every(section => section.items.length === 0)).toBe(true);
    expect(result.current.isEmpty).toBe(true);
  });

  it('continues to provide preview content when explicit mock mode is enabled', async () => {
    isExploreMockModeMock.mockReturnValue(true);

    const { result } = renderHook(() => usePersonalizedContent());

    await waitFor(() => expect(result.current.sections).toHaveLength(8));

    const forYou = result.current.sections.find(section => section.id === 'for-you');
    expect(forYou?.items[0]?.id).toBe(mockItem.id);
    expect(result.current.hasAnyContent).toBe(true);
  });
});
