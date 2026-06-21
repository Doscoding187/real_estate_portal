import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useListingDraftPersistence,
  useResumeDraft,
} from '../useListingDraftPersistence';

// ── Shared mutable state (hoisted so vi.mock factory sees it) ──

const { mockStoreRef, mutationCtrl, mockGetDraftQuery } = vi.hoisted(() => {
  const mockStoreRef: { current: Record<string, any> } = { current: {} };
  const mockGetDraftQuery = vi.fn();

  const mutationCtrl = {
    onSuccess: null as ((result: any) => void) | null,
    onError: null as ((error: Error) => void) | null,
    resolve: null as ((result: any) => void) | null,
    reject: null as ((error: Error) => void) | null,
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null as Error | null,
    lastPayload: null as any,
    reset: () => {
      mutationCtrl.isPending = false;
      mutationCtrl.isSuccess = false;
      mutationCtrl.isError = false;
      mutationCtrl.error = null;
    },
  };

  return { mockStoreRef, mutationCtrl, mockGetDraftQuery };
});

// ── Mocks ──

vi.mock('@/hooks/useListingWizard', () => ({
  useListingWizardStore: vi.fn(() => mockStoreRef.current),
}));

vi.mock('@/lib/trpc', () => {
  function makeMutation() {
    return {
      mutateAsync: vi.fn(async (payload: any) => {
        mutationCtrl.lastPayload = payload;
        mutationCtrl.isPending = true;
        mutationCtrl.isSuccess = false;
        mutationCtrl.isError = false;
        mutationCtrl.error = null;
        return new Promise((resolve, reject) => {
          mutationCtrl.resolve = (result: any) => {
            mutationCtrl.isPending = false;
            mutationCtrl.isSuccess = true;
            mutationCtrl.onSuccess?.(result);
            resolve(result);
          };
          mutationCtrl.reject = (err: Error) => {
            mutationCtrl.isPending = false;
            mutationCtrl.isError = true;
            mutationCtrl.error = err;
            mutationCtrl.onError?.(err);
            reject(err);
          };
        });
      }),
      get isPending() { return mutationCtrl.isPending; },
      get isSuccess() { return mutationCtrl.isSuccess; },
      get isError() { return mutationCtrl.isError; },
      get error() { return mutationCtrl.error; },
      reset: mutationCtrl.reset,
    };
  }

  return {
    trpc: {
      listing: {
        getDraft: {
          useQuery: (...args: unknown[]) => mockGetDraftQuery(...args),
        },
        saveDraft: {
          useMutation: vi.fn((opts?: { onSuccess?: Function; onError?: Function }) => {
            mutationCtrl.onSuccess = opts?.onSuccess ?? null;
            mutationCtrl.onError = opts?.onError ?? null;
            return makeMutation();
          }),
        },
      },
    },
  };
});

// ── Helpers ──

function createMockStore(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    action: 'sell',
    propertyType: 'house',
    title: '',
    description: '',
    serverDraftId: null,
    media: [],
    pricing: undefined,
    propertyDetails: undefined,
    location: undefined,
    additionalInfo: undefined,
    basicInfo: undefined,
    badges: [],
    mainMediaId: undefined,
    displayMediaType: undefined,
    currentStep: 1,
    completedSteps: [],
    setServerDraftId: vi.fn(),
    hydrateFromDraft: vi.fn(),
    ...overrides,
  };
}

// ── useListingDraftPersistence ──

describe('useListingDraftPersistence', () => {
  beforeEach(() => {
    mockStoreRef.current = createMockStore();
    mutationCtrl.isPending = false;
    mutationCtrl.isSuccess = false;
    mutationCtrl.isError = false;
    mutationCtrl.error = null;
    mutationCtrl.onSuccess = null;
    mutationCtrl.onError = null;
    mutationCtrl.resolve = null;
    mutationCtrl.reject = null;
  });

  // ── canSave ──

  it('returns canSave=true when action and propertyType are set', () => {
    const { result } = renderHook(() => useListingDraftPersistence());
    expect(result.current.canSave).toBe(true);
  });

  it('returns canSave=false when action is missing', () => {
    mockStoreRef.current = createMockStore({ action: undefined });
    const { result } = renderHook(() => useListingDraftPersistence());
    expect(result.current.canSave).toBe(false);
  });

  it('returns canSave=false when propertyType is missing', () => {
    mockStoreRef.current = createMockStore({ propertyType: undefined });
    const { result } = renderHook(() => useListingDraftPersistence());
    expect(result.current.canSave).toBe(false);
  });

  // ── manualSave — guard ──

  it('manualSave rejects when action is missing', async () => {
    mockStoreRef.current = createMockStore({ action: undefined });
    const { result } = renderHook(() => useListingDraftPersistence());
    await expect(result.current.manualSave()).rejects.toThrow(
      'Select listing action and property type before saving a draft',
    );
    expect(result.current.saveStatus).toBe('idle');
  });

  it('manualSave rejects when propertyType is missing', async () => {
    mockStoreRef.current = createMockStore({ propertyType: undefined });
    const { result } = renderHook(() => useListingDraftPersistence());
    await expect(result.current.manualSave()).rejects.toThrow(
      'Select listing action and property type before saving a draft',
    );
    expect(result.current.saveStatus).toBe('idle');
  });

  // ── saveStatus lifecycle ──

  it('transitions saveStatus: idle -> saving -> saved on success', async () => {
    const { result, rerender } = renderHook(() => useListingDraftPersistence());

    expect(result.current.saveStatus).toBe('idle');

    let savePromise: Promise<any>;
    act(() => { savePromise = result.current.manualSave(); });
    rerender();
    expect(result.current.saveStatus).toBe('saving');
    expect(result.current.isSaving).toBe(true);
    expect(result.current.lastSavedAt).toBeNull();

    await act(async () => {
      mutationCtrl.resolve!({ id: 42 });
      await savePromise!;
    });
    rerender();
    expect(result.current.saveStatus).toBe('saved');
    expect(result.current.isSaving).toBe(false);
    expect(result.current.saveError).toBeNull();
  });

  it('transitions saveStatus: saving -> error on failure', async () => {
    const { result, rerender } = renderHook(() => useListingDraftPersistence());

    expect(result.current.saveStatus).toBe('idle');

    act(() => { result.current.manualSave(); });
    rerender();
    expect(result.current.saveStatus).toBe('saving');

    await act(async () => {
      mutationCtrl.reject!(new Error('Network error'));
    });
    rerender();
    expect(result.current.saveStatus).toBe('error');
    expect(result.current.isSaving).toBe(false);
    expect(result.current.saveError).toBeTruthy();
  });

  // ── setServerDraftId ──

  it('calls setServerDraftId with result.id on success', async () => {
    const { result, rerender } = renderHook(() => useListingDraftPersistence());

    let savePromise: Promise<any>;
    act(() => { savePromise = result.current.manualSave(); });
    rerender();
    await act(async () => {
      mutationCtrl.resolve!({ id: 42 });
      await savePromise!;
    });
    rerender();

    expect(mockStoreRef.current.setServerDraftId).toHaveBeenCalledWith(42);
  });

  // ── update reuses existing serverDraftId ──

  it('passes existing serverDraftId as payload.id on subsequent saves', async () => {
    mockStoreRef.current = createMockStore({ serverDraftId: 42 });
    const { result, rerender } = renderHook(() => useListingDraftPersistence());

    let savePromise: Promise<void>;
    act(() => { savePromise = result.current.manualSave(); });
    rerender();
    await act(async () => {
      mutationCtrl.resolve!({ id: 42 });
      await savePromise!;
    });
    rerender();

    expect(mutationCtrl.lastPayload).toBeDefined();
    expect(mutationCtrl.lastPayload.id).toBe(42);
  });

  it('does not pass id on first save when serverDraftId is null', async () => {
    const { result, rerender } = renderHook(() => useListingDraftPersistence());

    let savePromise: Promise<void>;
    act(() => { savePromise = result.current.manualSave(); });
    rerender();
    await act(async () => {
      mutationCtrl.resolve!({ id: 1 });
      await savePromise!;
    });
    rerender();

    expect(mutationCtrl.lastPayload.id).toBeUndefined();
  });

  // ── lastSavedAt ──

  it('returns null lastSavedAt before any save', () => {
    const { result } = renderHook(() => useListingDraftPersistence());
    expect(result.current.lastSavedAt).toBeNull();
  });

  it('sets lastSavedAt to a Date on successful save', async () => {
    const { result, rerender } = renderHook(() => useListingDraftPersistence());

    let savePromise: Promise<any>;
    act(() => { savePromise = result.current.manualSave(); });
    rerender();
    await act(async () => {
      mutationCtrl.resolve!({ id: 42 });
      await savePromise!;
    });
    rerender();

    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });

  it('clears lastSavedAt during a subsequent save', async () => {
    const { result, rerender } = renderHook(() => useListingDraftPersistence());

    let savePromise: Promise<any>;
    act(() => { savePromise = result.current.manualSave(); });
    rerender();
    await act(async () => {
      mutationCtrl.resolve!({ id: 1 });
      await savePromise!;
    });
    rerender();
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);

    act(() => { savePromise = result.current.manualSave(); });
    rerender();
    expect(result.current.lastSavedAt).toBeNull();
    expect(result.current.saveStatus).toBe('saving');
  });

  it('keeps lastSavedAt cleared when a subsequent save fails', async () => {
    const { result, rerender } = renderHook(() => useListingDraftPersistence());

    let savePromise: Promise<any>;
    act(() => { savePromise = result.current.manualSave(); });
    rerender();
    await act(async () => {
      mutationCtrl.resolve!({ id: 1 });
      await savePromise!;
    });
    rerender();
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);

    act(() => { result.current.manualSave(); });
    rerender();
    await act(async () => {
      mutationCtrl.reject!(new Error('Network error'));
    });
    rerender();
    expect(result.current.saveStatus).toBe('error');
    expect(result.current.lastSavedAt).toBeNull();
  });

  // ── resetSaveState ──

  it('resetSaveState clears status back to idle', async () => {
    const { result, rerender } = renderHook(() => useListingDraftPersistence());

    let savePromise: Promise<any>;
    act(() => { savePromise = result.current.manualSave(); });
    rerender();
    await act(async () => {
      mutationCtrl.resolve!({ id: 42 });
      await savePromise!;
    });
    rerender();
    expect(result.current.saveStatus).toBe('saved');

    act(() => { result.current.resetSaveState(); });
    rerender();
    expect(result.current.saveStatus).toBe('idle');
    expect(result.current.lastSavedAt).toBeNull();
  });

  it('resetSaveState clears error back to idle', async () => {
    const { result, rerender } = renderHook(() => useListingDraftPersistence());

    act(() => { result.current.manualSave(); });
    rerender();
    await act(async () => {
      mutationCtrl.reject!(new Error('fail'));
    });
    rerender();
    expect(result.current.saveStatus).toBe('error');

    act(() => { result.current.resetSaveState(); });
    rerender();
    expect(result.current.saveStatus).toBe('idle');
    expect(result.current.saveError).toBeNull();
  });
});

// ── useResumeDraft ──

describe('useResumeDraft', () => {
  beforeEach(() => {
    mockGetDraftQuery.mockReset();
    mockGetDraftQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('calls query with enabled=false when draftId is null', () => {
    renderHook(() => useResumeDraft(null));
    expect(mockGetDraftQuery).toHaveBeenCalledWith(
      { id: null },
      expect.objectContaining({ enabled: false }),
    );
  });

  it('calls query with enabled=false when draftId is 0 or negative', () => {
    renderHook(() => useResumeDraft(0));
    expect(mockGetDraftQuery).toHaveBeenCalledWith(
      { id: 0 },
      expect.objectContaining({ enabled: false }),
    );
    mockGetDraftQuery.mockReset();
    mockGetDraftQuery.mockReturnValue({
      data: undefined, isLoading: false, isError: false, error: null,
    });
    renderHook(() => useResumeDraft(-1));
    expect(mockGetDraftQuery).toHaveBeenCalledWith(
      { id: -1 },
      expect.objectContaining({ enabled: false }),
    );
  });

  it('enables query when given a valid positive draftId', () => {
    const draftData = { id: 42, action: 'sell', propertyType: 'house', title: 'Test' };
    mockGetDraftQuery.mockReturnValue({
      data: draftData,
      isLoading: false,
      isError: false,
      error: null,
    });

    const { result } = renderHook(() => useResumeDraft(42));
    expect(mockGetDraftQuery).toHaveBeenCalled();
    expect(result.current.draft).toEqual(draftData);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('returns loading state', () => {
    mockGetDraftQuery.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
    });

    const { result } = renderHook(() => useResumeDraft(42));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.draft).toBeNull();
  });

  it('returns error state', () => {
    mockGetDraftQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('Not found'),
    });

    const { result } = renderHook(() => useResumeDraft(42));
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeTruthy();
    expect(result.current.draft).toBeNull();
  });
});
