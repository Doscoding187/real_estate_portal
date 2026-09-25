import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockDirectorySearch = vi.fn();
const mockSetLocation = vi.fn();

vi.mock('@/lib/trpc', () => ({
  trpc: {
    servicesEngine: {
      directorySearch: {
        useQuery: (input: unknown, options?: { enabled?: boolean }) => {
          if (options?.enabled !== false) mockDirectorySearch(input);
          return { data: [], isLoading: false, error: null };
        },
      },
    },
  },
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useRoute: () => [
      true,
      { category: 'home-improvement', city: 'cape-town', province: 'western-cape' },
    ],
  };
});

vi.mock('@/features/services/useServicesLocation', () => ({
  useServicesLocation: () => ({
    search: window.location.search,
    setLocation: mockSetLocation,
  }),
}));

vi.mock('@/lib/seo', () => ({ applySeo: vi.fn() }));

import ServicesLocalizedCategoryPage from '../ServicesLocalizedCategoryPage';

describe('ServicesLocalizedCategoryPage', () => {
  beforeEach(() => {
    mockDirectorySearch.mockReset();
    mockSetLocation.mockReset();
    window.history.pushState(
      {},
      '',
      '/services/home-improvement/cape-town/western-cape?suburb=Rondebosch&city=Cape%20Town&province=Western%20Cape',
    );
  });

  it('keeps the submitted suburb in the exact directory query', () => {
    render(<ServicesLocalizedCategoryPage />);

    expect(mockDirectorySearch).toHaveBeenCalledWith(
      expect.objectContaining({
        suburb: 'Rondebosch',
        city: 'Cape Town',
        province: 'Western Cape',
      }),
    );
  });

  it('rejects geography that conflicts with the canonical route', () => {
    window.history.pushState(
      {},
      '',
      '/services/home-improvement/cape-town/western-cape?city=Pretoria&province=Gauteng',
    );

    render(<ServicesLocalizedCategoryPage />);

    expect(mockDirectorySearch).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: /service category unavailable/i }),
    ).toBeInTheDocument();
  });
});
