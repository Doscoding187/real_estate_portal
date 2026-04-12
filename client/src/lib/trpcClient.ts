import { createTRPCProxyClient, httpBatchLink, splitLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../../../server/routers';

const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
const TRPC_URL = new URL(
  '/api/trpc',
  API_BASE_URL.endsWith('/') ? API_BASE_URL : API_BASE_URL + '/',
)
  .toString()
  .replace(/\/api\/api\//, '/api/');

export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    splitLink({
      condition(op) {
        return op.type === 'mutation';
      },
      true: httpBatchLink({
        url: TRPC_URL,
        transformer: superjson,
        methodOverride: 'POST',
        async fetch(input, init) {
          return globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: 'include',
          });
        },
      }),
      false: httpBatchLink({
        url: TRPC_URL,
        transformer: superjson,
        async fetch(input, init) {
          return globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: 'include',
          });
        },
      }),
    }),
  ],
});
