import { describe, expect, it, vi } from 'vitest';
import { invalidateDevelopmentHomeRanges } from '../developmentHomeInvalidation';

describe('invalidateDevelopmentHomeRanges', () => {
  it('targets every supported cached range for only the affected development', async () => {
    const invalidate = vi.fn().mockResolvedValue(undefined);

    await invalidateDevelopmentHomeRanges(42, invalidate);

    expect(invalidate).toHaveBeenCalledTimes(3);
    expect(invalidate).toHaveBeenNthCalledWith(1, { developmentId: 42, range: '7d' });
    expect(invalidate).toHaveBeenNthCalledWith(2, { developmentId: 42, range: '30d' });
    expect(invalidate).toHaveBeenNthCalledWith(3, { developmentId: 42, range: '90d' });
  });

  it('does not invalidate when no authorised development context is available', async () => {
    const invalidate = vi.fn().mockResolvedValue(undefined);

    await invalidateDevelopmentHomeRanges(undefined, invalidate);
    await invalidateDevelopmentHomeRanges(0, invalidate);

    expect(invalidate).not.toHaveBeenCalled();
  });
});
