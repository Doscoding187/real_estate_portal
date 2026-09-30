import { describe, expect, it, vi } from 'vitest';
import { createOrReadOnboardingState } from '../onboardingStateCreation';

const duplicate = () =>
  Object.assign(new Error('duplicate'), { code: 'ER_DUP_ENTRY', errno: 1062 });

describe('canonical onboarding creation race', () => {
  it('returns the persisted winner to concurrent creators without overwriting preferences', async () => {
    let state: { userId: number; preferences: string } | undefined;
    let release!: () => void;
    const barrier = new Promise<void>(resolve => {
      release = resolve;
    });
    let arrived = 0;
    const insert = async () => {
      if (++arrived === 2) release();
      await barrier;
      if (state) throw new Error('Drizzle query failed', { cause: duplicate() });
      state = { userId: 41, preferences: 'persisted-winner' };
    };
    const read = async () => state;
    const results = await Promise.all([
      createOrReadOnboardingState(insert, read),
      createOrReadOnboardingState(insert, read),
    ]);
    expect(results).toEqual([state, state]);
    expect(state?.preferences).toBe('persisted-winner');
  });

  it('does not swallow a duplicate when the exact user has no visible state', async () => {
    const error = duplicate();
    await expect(
      createOrReadOnboardingState(
        async () => {
          throw error;
        },
        async () => undefined,
      ),
    ).rejects.toBe(error);
  });

  it.each(['ER_NO_REFERENCED_ROW_2', 'ER_BAD_FIELD_ERROR', 'ECONNRESET'])(
    'propagates %s without retry or alternate schema',
    async code => {
      const error = Object.assign(new Error('failed'), { code });
      const read = vi.fn();
      await expect(
        createOrReadOnboardingState(async () => {
          throw error;
        }, read),
      ).rejects.toBe(error);
      expect(read).not.toHaveBeenCalled();
    },
  );

  it('fails closed when a successful insert has no visible row', async () => {
    await expect(
      createOrReadOnboardingState(
        async () => {},
        async () => undefined,
      ),
    ).rejects.toThrow('not visible');
  });
});
