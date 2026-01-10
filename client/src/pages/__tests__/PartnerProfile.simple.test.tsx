/**
 * Simple Partner Profile Component Test
 * Basic smoke test to verify component loads
 */

import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';
import PartnerProfile from '../PartnerProfile';

// Mock wouter
vi.mock('wouter', () => ({
  useParams: () => ({ partnerId: 'test-partner-id' }),
}));

// Mock fetch to prevent network calls
global.fetch = vi.fn(() => 
  Promise.resolve({
    ok: false,
    status: 404,
    json: () => Promise.resolve({})
  })
) as any;

describe('PartnerProfile - Smoke Test', () => {
  it('renders without crashing', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <PartnerProfile />
      </QueryClientProvider>
    );

    expect(container).toBeTruthy();
  });
});