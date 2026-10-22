import { describe, expect, it, vi } from 'vitest';
import {
  applyLegalRuntimeGrants,
  legalRuntimeGrantExecutionPlan,
} from '../legalRuntimeGrants';

describe('canonical legal runtime grant release', () => {
  it('refuses its historically pinned plan after the canonical model advances', () => {
    expect(() => legalRuntimeGrantExecutionPlan()).toThrow(
      'Place runtime grant plan refused: canonical table inventory changed.',
    );
  });

  it('refuses before resolving or connecting to the protected target', async () => {
    await expect(
      applyLegalRuntimeGrants({
        adminDatabaseUrl: 'not-a-credential',
        planDigest: 'changed',
        acknowledgement: 'unapproved',
        observe: vi.fn(),
      }),
    ).rejects.toThrow('Place runtime grant plan refused: canonical table inventory changed.');
  });
});
