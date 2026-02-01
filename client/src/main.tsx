import { trpc } from '@/lib/trpc';
// getApiUrl removed as we are hardcoding TRPC_URL for safety
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, TRPCClientError } from '@trpc/client';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import superjson from 'superjson';
import { validateEnvironmentConfig } from './lib/env'; // Runtime guard
import { trpcDebugLink } from './lib/trpcDebugLink';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { getLoginUrl } from './const';
import { queryClient } from './lib/queryClient';
import './index.css';
import './styles/reduced-motion.css';

// Run critical environment checks before React boots
validateEnvironmentConfig();

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

    const zod = (error as any)?.data?.zodError;
    if (zod) {
      console.error('[API Mutation Error] Zod validation:', zod);
    } else {
      console.error('[API Mutation Error]', (error as Error).message, {
        code: (error as any)?.data?.code,
      });
    }
  }
});

// Build marker to confirm which code is running in production
console.log('[BUILD_MARKER] main.tsx 2026-01-31 B (Reverted AuthProvider)');
console.log(`[ENV] Mode=${import.meta.env.MODE}, Prod=${import.meta.env.PROD}`);

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
const TRPC_URL = new URL(
  '/api/trpc',
  API_BASE_URL.endsWith('/') ? API_BASE_URL : API_BASE_URL + '/',
)
  .toString()
  .replace(/\/api\/api\//, '/api/');

console.log('[tRPC] URL =', TRPC_URL);

const links = [
  // Debug link to log tRPC paths
  trpcDebugLink(),
  // Brand emulation link to inject X-Brand-Emulation headers when in emulator mode
  httpBatchLink({
    url: TRPC_URL,
    transformer: superjson,
    // Fix: Inject headers here to ensure they survive tRPC batching
    headers: () => {
      const headers: Record<string, string> = {};

      try {
        // Get brand context from localStorage directly
        // We can't easily reuse the service here as it's outside React context
        const storedContext = localStorage.getItem('publisher-context');
        if (storedContext) {
          const publisherContext = JSON.parse(storedContext);
          // Zustand persistence wraps state in 'state' property
          const brandId = publisherContext.state?.context?.brandProfileId;

          if (brandId) {
            headers['x-operating-as-brand'] = String(brandId);
          }
        }
      } catch {
        // Silent failure for emulation headers
      }

      return headers;
    },
    async fetch(input, init) {
      // Execute fetch with credentials
      const res = await globalThis.fetch(input, {
        ...(init ?? {}),
        credentials: 'include',
      });

      // Defensive: Validate response is JSON before tRPC tries to parse it
      // This prevents misleading "Unexpected end of JSON input" errors when:
      // - Backend is down (Vite proxy returns text/plain 500)
      // - Proxy fails (returns HTML or empty response)
      // - Network issues (connection drops mid-stream)
      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      if (!isJson) {
        // Try to read response body snippet for diagnostics (won't throw on empty)
        let snippet = '';
        try {
          const text = await res.clone().text();
          snippet = text.slice(0, 300);
        } catch {
          // Ignore - body might already be consumed
        }

        const url = typeof input === 'string' ? input : (input as Request).url;

        // Throw clear error instead of letting tRPC crash on JSON parse
        throw new Error(
          [
            `Backend returned non-JSON response (status ${res.status}).`,
            `URL: ${url}`,
            `Content-Type: ${contentType || '(missing)'}`,
            snippet ? `Body: ${snippet}` : 'Body: (empty)',
            '',
            'Most likely causes:',
            '- Backend server is not running (start with: pnpm dev)',
            '- Proxy configuration issue',
            '- Upstream server error returned HTML/text instead of JSON',
            '- Environment configuration (check VITE_API_URL)',
          ].join('\n'),
        );
      }

      return res;
    },
  }),
].filter(Boolean);

const trpcClient = trpc.createClient({
  links,
});

import { EnvironmentBadge } from './components/EnvironmentBadge';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <AuthProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <EnvironmentBadge />
            <App />
          </QueryClientProvider>
        </trpc.Provider>
      </AuthProvider>
    </HelmetProvider>
  </React.StrictMode>,
);

// Debug: Ensure all providers are properly initialized
console.log('[Main] App rendered with TRPC and QueryClient providers');
