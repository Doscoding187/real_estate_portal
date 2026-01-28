/**
 * ARIA Compliance Tests for Explore Components
 *
 * Tests ARIA labels, roles, and live regions across all Explore components
 * to ensure WCAG AA compliance and excellent screen reader support.
 *
 * Requirements: 5.2
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PropertyCard } from '../cards/PropertyCard';
import { VideoCard } from '../cards/VideoCard';
import { NeighbourhoodCard } from '../cards/NeighbourhoodCard';
import { InsightCard } from '../cards/InsightCard';
import { DiscoveryCardFeed } from '../DiscoveryCardFeed';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('ARIA Compliance - Card Components', () => {
  describe('PropertyCard', () => {
    const mockProperty = {
      id: 1,
      title: 'Luxury Villa',
      price: 5000000,
      location: 'Sandton, Johannesburg',
      beds: 4,
      baths: 3,
      size: 350,
      imageUrl: 'https://example.com/image.jpg',
      propertyType: 'House',
    };

    it('should have proper article role', () => {
      render(<PropertyCard property={mockProperty} onClick={() => {}} onSave={() => {}} />);

      const article = screen.getByRole('article');
      expect(article).toBeInTheDocument();
    });

    it('should have descriptive aria-label', () => {
      render(<PropertyCard property={mockProperty} onClick={() => {}} onSave={() => {}} />);

      const article = screen.getByRole('article');
      expect(article).toHaveAttribute('aria-label');
      const label = article.getAttribute('aria-label');
      expect(label).toContain('Luxury Villa');
      expect(label).toContain('Sandton, Johannesburg');
    });

    it('should have list role for features', () => {
      render(<PropertyCard property={mockProperty} onClick={() => {}} onSave={() => {}} />);

      const featuresList = screen.getByRole('list', { name: /property features/i });
      expect(featuresList).toBeInTheDocument();
    });

    it('should have screen reader text for feature icons', () => {
      render(<PropertyCard property={mockProperty} onClick={() => {}} onSave={() => {}} />);

      // Check for screen reader only text
      const bedroomsLabel = screen.getByText(/bedrooms:/i, { selector: '.sr-only' });
      expect(bedroomsLabel).toBeInTheDocument();
    });
  });

  describe('VideoCard', () => {
    const mockVideo = {
      id: 1,
      title: 'Property Tour',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      duration: 120,
      views: 1500,
      creatorName: 'John Doe',
      creatorAvatar: 'https://example.com/avatar.jpg',
    };

    it('should have proper article role', () => {
      render(<VideoCard video={mockVideo} onClick={() => {}} onSave={() => {}} />);

      const article = screen.getByRole('article');
      expect(article).toBeInTheDocument();
    });

    it('should have descriptive aria-label', () => {
      render(<VideoCard video={mockVideo} onClick={() => {}} onSave={() => {}} />);

      const article = screen.getByRole('article');
      const label = article.getAttribute('aria-label');
      expect(label).toContain('Property Tour');
      expect(label).toContain('John Doe');
      expect(label).toContain('views');
    });

    it('should have aria-pressed for save button', () => {
      render(<VideoCard video={mockVideo} onClick={() => {}} onSave={() => {}} />);

      const saveButton = screen.getByRole('button', { name: /save video/i });
      expect(saveButton).toHaveAttribute('aria-pressed');
    });

    it('should have status role for duration badge', () => {
      render(<VideoCard video={mockVideo} onClick={() => {}} onSave={() => {}} />);

      const durationStatus = screen.getByRole('status', { name: /video duration/i });
      expect(durationStatus).toBeInTheDocument();
    });
  });

  describe('NeighbourhoodCard', () => {
    const mockNeighbourhood = {
      id: 1,
      name: 'Sandton',
      city: 'Johannesburg',
      imageUrl: 'https://example.com/image.jpg',
      propertyCount: 150,
      avgPrice: 3500000,
      priceChange: 5.2,
      followerCount: 1200,
      highlights: ['Shopping', 'Schools'],
    };

    it('should have proper article role', () => {
      render(
        <NeighbourhoodCard
          neighbourhood={mockNeighbourhood}
          onClick={() => {}}
          onFollow={() => {}}
        />,
      );

      const article = screen.getByRole('article');
      expect(article).toBeInTheDocument();
    });

    it('should have aria-pressed for follow button', () => {
      render(
        <NeighbourhoodCard
          neighbourhood={mockNeighbourhood}
          onClick={() => {}}
          onFollow={() => {}}
        />,
      );

      const followButton = screen.getByRole('button', { name: /follow neighbourhood/i });
      expect(followButton).toHaveAttribute('aria-pressed');
    });

    it('should have list role for statistics', () => {
      render(
        <NeighbourhoodCard
          neighbourhood={mockNeighbourhood}
          onClick={() => {}}
          onFollow={() => {}}
        />,
      );

      const statsList = screen.getByRole('list', { name: /neighbourhood statistics/i });
      expect(statsList).toBeInTheDocument();
    });
  });

  describe('InsightCard', () => {
    const mockInsight = {
      id: 1,
      title: 'Market Trends',
      description: 'Property prices are rising',
      insightType: 'market-trend' as const,
      data: {
        value: '+12%',
        change: 12,
        label: 'Year over year',
      },
    };

    it('should have proper article role', () => {
      render(<InsightCard insight={mockInsight} onClick={() => {}} />);

      const article = screen.getByRole('article');
      expect(article).toBeInTheDocument();
    });

    it('should have descriptive aria-label', () => {
      render(<InsightCard insight={mockInsight} onClick={() => {}} />);

      const article = screen.getByRole('article');
      const label = article.getAttribute('aria-label');
      expect(label).toContain('market-trend');
      expect(label).toContain('Market Trends');
    });

    it('should have status role for badge', () => {
      render(<InsightCard insight={mockInsight} onClick={() => {}} />);

      const badge = screen.getByRole('status', { name: /content type/i });
      expect(badge).toBeInTheDocument();
    });
  });
});

describe('ARIA Compliance - Feed Components', () => {
  describe('DiscoveryCardFeed', () => {
    it('should have feed role for main container', () => {
      render(<DiscoveryCardFeed categoryId={1} filters={{}} onItemClick={() => {}} />, { wrapper });

      // Wait for loading state
      const feed = screen.getByRole('feed', { name: /discovery feed/i });
      expect(feed).toBeInTheDocument();
    });

    it('should have aria-busy during loading', () => {
      render(<DiscoveryCardFeed categoryId={1} filters={{}} onItemClick={() => {}} />, { wrapper });

      const loadingStatus = screen.getByRole('status', { name: /loading/i });
      expect(loadingStatus).toBeInTheDocument();
      expect(loadingStatus).toHaveAttribute('aria-busy', 'true');
    });

    it('should have alert role for errors', async () => {
      // Mock error state
      queryClient.setQueryData(['discovery-feed'], () => {
        throw new Error('Failed to load');
      });

      render(<DiscoveryCardFeed categoryId={1} filters={{}} onItemClick={() => {}} />, { wrapper });

      // Check for error alert
      const alert = await screen.findByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });
  });
});

describe('ARIA Compliance - Interactive Elements', () => {
  it('should have aria-label for icon-only buttons', () => {
    const mockProperty = {
      id: 1,
      title: 'Test Property',
      price: 1000000,
      location: 'Test Location',
      imageUrl: 'https://example.com/image.jpg',
      propertyType: 'House',
    };

    render(<PropertyCard property={mockProperty} onClick={() => {}} onSave={() => {}} />);

    // Save button should have aria-label
    const saveButton = screen.getByLabelText(/save property/i);
    expect(saveButton).toBeInTheDocument();
  });

  it('should have aria-hidden for decorative icons', () => {
    const mockProperty = {
      id: 1,
      title: 'Test Property',
      price: 1000000,
      location: 'Test Location',
      beds: 3,
      imageUrl: 'https://example.com/image.jpg',
      propertyType: 'House',
    };

    const { container } = render(
      <PropertyCard property={mockProperty} onClick={() => {}} onSave={() => {}} />,
    );

    // Icons in feature list should be aria-hidden
    const icons = container.querySelectorAll('[aria-hidden="true"]');
    expect(icons.length).toBeGreaterThan(0);
  });
});

describe('ARIA Compliance - Live Regions', () => {
  it('should use aria-live="polite" for non-critical updates', () => {
    render(<DiscoveryCardFeed categoryId={1} filters={{}} onItemClick={() => {}} />, { wrapper });

    const loadingStatus = screen.getByRole('status');
    expect(loadingStatus).toHaveAttribute('aria-live', 'polite');
  });

  it('should use aria-live="assertive" for critical updates', async () => {
    // Mock error state
    queryClient.setQueryData(['discovery-feed'], () => {
      throw new Error('Failed to load');
    });

    render(<DiscoveryCardFeed categoryId={1} filters={{}} onItemClick={() => {}} />, { wrapper });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });
});

describe('ARIA Compliance - Semantic Structure', () => {
  it('should use proper heading hierarchy', () => {
    const mockProperty = {
      id: 1,
      title: 'Test Property',
      price: 1000000,
      location: 'Test Location',
      imageUrl: 'https://example.com/image.jpg',
      propertyType: 'House',
    };

    const { container } = render(
      <PropertyCard property={mockProperty} onClick={() => {}} onSave={() => {}} />,
    );

    // Property title should be h3
    const heading = container.querySelector('h3');
    expect(heading).toBeInTheDocument();
    expect(heading?.textContent).toBe('Test Property');
  });

  it('should use list/listitem for collections', () => {
    const mockProperty = {
      id: 1,
      title: 'Test Property',
      price: 1000000,
      location: 'Test Location',
      beds: 3,
      baths: 2,
      size: 150,
      imageUrl: 'https://example.com/image.jpg',
      propertyType: 'House',
    };

    render(<PropertyCard property={mockProperty} onClick={() => {}} onSave={() => {}} />);

    const list = screen.getByRole('list', { name: /property features/i });
    expect(list).toBeInTheDocument();

    const listItems = screen.getAllByRole('listitem');
    expect(listItems.length).toBeGreaterThan(0);
  });
});
