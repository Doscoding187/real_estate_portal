import { trpc } from '@/lib/trpc';
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, TRPCClientError } from '@trpc/client';
import React from 'react';
import { createRoot } from 'react-dom/client';
import superjson from 'superjson';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { getLoginUrl } from './const';
import { queryClient } from './lib/queryClient';
import './index.css';
import './styles/reduced-motion.css';

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === 'undefined') return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === 'updated' && event.action.type === 'error') {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error('[API Query Error]', error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === 'updated' && event.action.type === 'error') {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error('[API Mutation Error]', error);
  }
});

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Browser: use VITE_API_URL environment variable or fallback to current origin
    return import.meta.env.VITE_API_URL || window.location.origin;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
};

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: 'include',
        });
      },
    }),
  ],
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </trpc.Provider>
    </AuthProvider>
  </React.StrictMode>,
);

// Debug: Ensure all providers are properly initialized
console.log('[Main] App rendered with TRPC and QueryClient providers');
