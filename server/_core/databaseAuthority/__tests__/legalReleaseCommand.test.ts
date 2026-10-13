import { describe, expect, it, vi } from 'vitest';
import { completeLegalReleaseCommand } from '../../../../scripts/legalReleaseCommand';

const connection = (end = vi.fn(async () => {})) => ({ execute: vi.fn(), query: vi.fn(), end });
describe('Legal release command closure evidence', () => {
  it('returns a result after closing the connection', async () => {
    const c = connection(),
      result = { state: 'installed' };
    expect(
      await completeLegalReleaseCommand({ connection: c, operation: async () => result }),
    ).toBe(result);
    expect(c.end).toHaveBeenCalledOnce();
  });
  it('preserves the primary failure after successful closure', async () => {
    const failure = new Error('injected primary failure');
    await expect(
      completeLegalReleaseCommand({
        connection: connection(),
        operation: async () => {
          throw failure;
        },
      }),
    ).rejects.toBe(failure);
  });
  it('preserves an installed result when closure fails', async () => {
    const result = { state: 'installed' },
      cleanup = new Error('injected close failure');
    await expect(
      completeLegalReleaseCommand({
        connection: connection(
          vi.fn(async () => {
            throw cleanup;
          }),
        ),
        operation: async () => result,
      }),
    ).rejects.toMatchObject({
      unsafeToReplay: true,
      operationResult: result,
      cleanupFailure: cleanup,
    });
  });
  it('preserves both failures and never claims successful execution', async () => {
    const primary = new Error('injected uncertain commit'),
      cleanup = new Error('injected close failure');
    await expect(
      completeLegalReleaseCommand({
        connection: connection(
          vi.fn(async () => {
            throw cleanup;
          }),
        ),
        operation: async () => {
          throw primary;
        },
      }),
    ).rejects.toMatchObject({
      unsafeToReplay: true,
      primaryFailure: primary,
      cleanupFailure: cleanup,
      operationResult: undefined,
    });
  });
});
