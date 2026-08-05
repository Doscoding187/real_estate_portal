import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { setLocation, useSearch, useIsMobile } = vi.hoisted(() => ({
  setLocation: vi.fn(),
  useSearch: vi.fn(),
  useIsMobile: vi.fn(),
}));

vi.mock('wouter', () => ({
  useLocation: () => ['/', setLocation],
  useSearch,
}));

vi.mock('@/hooks/useMobile', () => ({
  useIsMobile,
}));

vi.mock('@/layouts/HomeLayout', () => ({
  HomeLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/seo/MetaControl', () => ({
  MetaControl: () => null,
}));

vi.mock('@/components/ui/page-frame', () => ({
  PageFrame: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/pages/home/HomeDesktopView', () => ({
  HomeDesktopView: (props: { heroTabValue?: string; activeHeroTab: string }) => (
    <div
      data-active-hero-tab={props.activeHeroTab}
      data-testid="home-desktop-view"
      data-hero-tab-value={props.heroTabValue ?? 'none'}
    />
  ),
}));

vi.mock('@/pages/home/HomeMobileView', () => ({
  HomeMobileView: () => <div data-testid="home-mobile-view" />,
}));

vi.mock('@/lib/trpc', () => ({
  trpc: {
    locationPages: {
      getPopularCities: {
        useQuery: () => ({ data: [] }),
      },
    },
  },
}));

import Home from '../Home';

describe('homepage journey selection', () => {
  beforeEach(() => {
    setLocation.mockClear();
    useIsMobile.mockReturnValue(false);
    useSearch.mockReturnValue('');
  });

  it('does not restore Buy on a plain homepage URL', () => {
    render(<Home />);

    expect(screen.getByTestId('home-desktop-view')).toHaveAttribute('data-hero-tab-value', '');
    expect(setLocation).not.toHaveBeenCalled();
  });

  it('restores Buy only for an explicit valid Buy intent', () => {
    useSearch.mockReturnValue('?intent=buy');

    render(<Home />);

    expect(screen.getByTestId('home-desktop-view')).toHaveAttribute('data-hero-tab-value', 'buy');
    expect(setLocation).not.toHaveBeenCalled();
  });
});
