import { afterEach, describe, expect, it, vi } from 'vitest';

import { createLeadCaptureRequestId } from '@/lib/leadCapture';

afterEach(() => vi.unstubAllGlobals());

describe('public lead capture request IDs', () => {
  it('uses the native UUID capability when available', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'native-capture-id' });

    expect(createLeadCaptureRequestId()).toBe('native-capture-id');
  });

  it('keeps the fallback compatible with UUID-only public lead procedures', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(0);
        return bytes;
      },
    });

    expect(createLeadCaptureRequestId()).toBe('00000000-0000-4000-8000-000000000000');
  });
});
