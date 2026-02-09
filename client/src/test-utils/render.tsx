import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// ✅ adjust this import to your project
import { trpc } from '@/lib/trpc';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

function createMockTrpcClient() {
  return {
    query: vi.fn(),
    mutation: vi.fn(),
    subscription: vi.fn(),
  } as any;
}

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  const queryClient = createTestQueryClient();
  const trpcClient = createMockTrpcClient();

  const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );

  return render(ui, { wrapper: AllTheProviders, ...options });
};

export * from '@testing-library/react';
export { customRender as render };

