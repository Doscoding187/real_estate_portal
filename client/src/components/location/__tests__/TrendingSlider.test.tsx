
import { render, screen } from '@testing-library/react';
import { TrendingSlider } from '../TrendingSlider';
import { describe, it, expect, vi } from 'vitest';
import { Router } from 'wouter';

// Mock carousel components as they might depend on complex contexts
vi.mock('@/components/ui/carousel', () => ({
  Carousel: ({ children, className }: any) => <div className={className} data-testid="carousel">{children}</div>,
  CarouselContent: ({ children }: any) => <div>{children}</div>,
  CarouselItem: ({ children }: any) => <div>{children}</div>,
  CarouselPrevious: () => <button>Prev</button>,
  CarouselNext: () => <button>Next</button>,
}));

describe('TrendingSlider', () => {
  const mockLocations = [
    { id: 1, name: 'Observatory', cityName: 'Cape Town', listingCount: 45, growth: 12 },
    { id: 2, name: 'Gardens', cityName: 'Cape Town', listingCount: 67, growth: 5 }
  ];

  it('renders correctly with locations', () => {
    render(
      <Router>
        <TrendingSlider locations={mockLocations} provinceSlug="western-cape" />
      </Router>
    );

    expect(screen.getByText('Trending Suburbs')).toBeDefined();
    expect(screen.getByText('Observatory')).toBeDefined();
    expect(screen.getByText('Gardens')).toBeDefined();
    expect(screen.getByText('+12%')).toBeDefined();
  });
});
