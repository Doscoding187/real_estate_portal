import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock('@/lib/api', () => ({ apiFetch: (...a: unknown[]) => apiFetchMock(...a) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { useAgentLaunchInvoiceRequest } from './useAgentLaunchInvoiceRequest';

describe('useAgentLaunchInvoiceRequest', () => {
  it('sends the request once when triggered twice before the first resolves', async () => {
    let release: (v: unknown) => void = () => {};
    apiFetchMock.mockImplementation(() => new Promise(r => (release = r)));
    const { result } = renderHook(() =>
      useAgentLaunchInvoiceRequest({
        planId: 5,
        legalChoice: { ok: true },
        reloadLegal: vi.fn(),
        refetchCatalog: vi.fn(),
        refetchWorkspace: vi.fn().mockResolvedValue(undefined),
      }),
    );
    let first: Promise<void> = Promise.resolve();
    await act(async () => {
      first = result.current.requestInvoice();
      void result.current.requestInvoice();
    });
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      release({ invoice: { id: 1 }, reused: false });
      await first;
    });
  });
});
