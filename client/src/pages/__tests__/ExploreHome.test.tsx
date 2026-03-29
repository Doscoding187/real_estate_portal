import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ExploreHome from '../ExploreHome';

const { usePersonalizedContentMock, setLocationMock } = vi.hoisted(() => ({
  usePersonalizedContentMock: vi.fn(),
  setLocationMock: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/', setLocationMock],
}));

vi.mock('@/components/explore-discovery/LifestyleCategorySelector', () => ({
  LifestyleCategorySelector: () => <div data-testid="lifestyle-selector" />,
}));

vi.mock('@/components/explore-discovery/ResponsiveFilterPanel', () => ({
  ResponsiveFilterPanel: () => <div data-testid="responsive-filter-panel" />,
}));

vi.mock('@/components/explore-discovery/PersonalizedContentBlock', () => ({
  PersonalizedContentBlock: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/explore-discovery/TrendingVideosSection', () => ({
  TrendingVideosSection: () => <div data-testid="trending-videos-section" />,
}));

vi.mock('@/components/explore-discovery/WelcomeOverlay', () => ({
  WelcomeOverlay: () => null,
}));

vi.mock('@/components/explore-discovery/OnboardingTooltip', () => ({
  OnboardingTooltip: () => null,
}));

vi.mock('@/hooks/useExploreCommonState', () => ({
  useExploreCommonState: () => ({
    selectedCategoryId: null,
    setSelectedCategoryId: vi.fn(),
    showFilters: false,
    setShowFilters: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePersonalizedContent', () => ({
  usePersonalizedContent: usePersonalizedContentMock,
}));

vi.mock('@/hooks/useExploreIntent', () => ({
  useExploreIntent: () => ({
    intent: 'buy',
    setIntent: vi.fn(),
  }),
}));

vi.mock('@/store/exploreFiltersStore', () => ({
  useExploreFiltersStore: (selector: (state: { getFilterCount: () => number }) => unknown) =>
    selector({
      getFilterCount: () => 0,
    }),
}));

vi.mock('@/hooks/useWelcomeOverlay', () => ({
  useWelcomeOverlay: () => ({
    isVisible: false,
    dismiss: vi.fn(),
    complete: vi.fn(),
  }),
}));

vi.mock('@/hooks/useOnboardingTooltip', () => ({
  useTopicNavigationTooltip: () => ({
    isVisible: false,
    dismiss: vi.fn(),
  }),
  usePartnerContentTooltip: () => ({
    isVisible: false,
    dismiss: vi.fn(),
  }),
}));

vi.mock('@/lib/exploreIntent', async () => {
  const actual = await vi.importActual<typeof import('@/lib/exploreIntent')>('@/lib/exploreIntent');
  return {
    ...actual,
    writeStoredExploreIntent: vi.fn(),
  };
});

describe('ExploreHome', () => {
  it('renders the discovery home shell directly', () => {
    usePersonalizedContentMock.mockReturnValue({
      sections: [
        {
          id: 'for-you',
          canonicalId: 'for_you',
          title: 'For You',
          items: [
            {
              id: 1,
              type: 'video',
              data: {
                imageUrl: 'https://example.com/for-you.jpg',
                title: 'For You video',
              },
            },
          ],
        },
      ],
      isLoading: false,
      error: null,
      hasAnyContent: true,
      refetch: vi.fn(),
    });

    render(<ExploreHome />);

    expect(screen.getByLabelText(/explore navigation/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /shorts/i })).toBeInTheDocument();
    expect(screen.getByTestId('trending-videos-section')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'For You', level: 3 })).toBeInTheDocument();
  });

  it('renders a route-level empty state when discovery home has no live sections', () => {
    usePersonalizedContentMock.mockReturnValue({
      sections: [],
      isLoading: false,
      error: null,
      hasAnyContent: false,
      refetch: vi.fn(),
    });

    render(<ExploreHome />);

    expect(screen.getByText('Discovery is ready for more content')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /open feed/i })).toHaveLength(2);
  });

  it('renders a retry state when personalized discovery rails fail to load', () => {
    const refetchMock = vi.fn();

    usePersonalizedContentMock.mockReturnValue({
      sections: [],
      isLoading: false,
      error: new Error('network'),
      hasAnyContent: false,
      refetch: refetchMock,
    });

    render(<ExploreHome />);

    expect(screen.getByLabelText(/discovery home unavailable/i)).toBeInTheDocument();
    screen.getByRole('button', { name: /retry loading channels/i }).click();
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

});
