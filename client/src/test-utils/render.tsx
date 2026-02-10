import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  const queryClient = createTestQueryClient();

  const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return render(ui, { wrapper: AllTheProviders, ...options });
};

export * from '@testing-library/react';
export { customRender as render };
