import { TRPCError } from '@trpc/server';
import { describe, expect, it } from 'vitest';
import { formatTrpcError } from '../_core/trpc';

describe('tRPC error formatter', () => {
  it('retains approved transport fields without serializing a nested driver cause', () => {
    const error = new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Safe server error',
      cause: new Error('synthetic-private-driver-detail'),
    });

    const formatted = formatTrpcError({
      shape: {
        message: 'Safe server error',
        code: -32603,
        data: {
          code: 'INTERNAL_SERVER_ERROR',
          httpStatus: 500,
          path: 'prospectJourney.claimAction',
        },
      },
      error,
    });

    expect(formatted).toMatchObject({
      message: 'Safe server error',
      code: -32603,
      data: {
        code: 'INTERNAL_SERVER_ERROR',
        httpStatus: 500,
        path: 'prospectJourney.claimAction',
      },
    });
    expect(formatted.data).not.toHaveProperty('cause');
    expect(JSON.stringify(formatted)).not.toContain('synthetic-private-driver-detail');
  });
});
