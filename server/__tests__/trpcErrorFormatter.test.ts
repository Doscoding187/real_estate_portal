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

  it('exposes only the readiness blockers (field + message) from a refused publication', () => {
    const error = new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Development is not ready for submission.',
      cause: {
        validationErrors: [
          { field: 'suburb', message: 'Choose the suburb from the list.', secret: 'x' },
          { field: 7, message: 'ignored' },
        ],
        driver: 'synthetic-private-driver-detail',
      } as any,
    });
    const formatted = formatTrpcError({
      shape: { message: error.message, code: -32600, data: { code: 'BAD_REQUEST', httpStatus: 400 } },
      error,
    });
    expect(formatted.data.validationErrors).toEqual([
      { field: 'suburb', message: 'Choose the suburb from the list.' },
    ]);
    expect(JSON.stringify(formatted)).not.toContain('synthetic-private-driver-detail');
    expect(JSON.stringify(formatted)).not.toContain('secret');
  });
});
