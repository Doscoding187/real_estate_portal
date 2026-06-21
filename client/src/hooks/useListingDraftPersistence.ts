/**
 * Bridge hook: React/tRPC ↔ Zustand store for V2 draft persistence.
 *
 * This hook must be called inside the React tree (under TRPCProvider).
 * It does NOT live in the Zustand store — the store remains pure.
 *
 * Exposes:
 *   manualSave()  — save current wizard state as a draft
 *   isSaving      — in-progress mutation flag
 *   saveStatus    — derived from mutation lifecycle: idle | saving | saved | error
 *   lastSavedAt   — timestamp of the last successful save (null if never saved)
 *   saveError     — last mutation error (cleared on next save)
 *   canSave       — true when action AND propertyType are set
 *   resetSaveState — clear mutation state back to idle
 */
import { useCallback, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { buildSaveDraftPayloadFromWizardState } from '@/lib/workflows/listing/listingDraftPayload';
import type { ListingWizardState } from '@shared/listing-types';

export function useListingDraftPersistence() {
  const store = useListingWizardStore();
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const saveMutation = trpc.listing.saveDraft.useMutation({
    onSuccess: (result) => {
      store.setServerDraftId(result.id);
      setLastSavedAt(new Date());
    },
  });

  const manualSave = useCallback(async () => {
    const state = store;
    if (!state.action || !state.propertyType) {
      throw new Error('Select listing action and property type before saving a draft');
    }
    const payload = buildSaveDraftPayloadFromWizardState(
      state as Partial<ListingWizardState>,
      state.serverDraftId ?? undefined,
    );
    setLastSavedAt(null);
    try {
      await saveMutation.mutateAsync(payload);
    } catch {
      // Mutation error is already captured by React Query's isError/error state.
      // Swallow here to prevent unhandled promise rejection in the button's onClick handler.
    }
  }, [store, saveMutation]);

  const saveStatus: 'saving' | 'saved' | 'error' | 'idle' =
    saveMutation.isPending ? 'saving' :
    saveMutation.isError ? 'error' :
    saveMutation.isSuccess ? 'saved' :
    'idle';

  return {
    manualSave,
    isSaving: saveMutation.isPending,
    saveStatus,
    lastSavedAt,
    saveError: saveMutation.error,
    resetSaveState: () => {
      saveMutation.reset();
      setLastSavedAt(null);
    },
    canSave: store.action !== undefined && store.propertyType !== undefined,
  };
}

/**
 * Fetch a server-side draft by ID (for resume-by-URL flow).
 */
export function useResumeDraft(draftId: number | null) {
  const draftQuery = trpc.listing.getDraft.useQuery(
    { id: draftId! },
    {
      enabled: draftId !== null && draftId > 0,
      retry: false,
    },
  );

  return {
    draft: draftQuery.data ?? null,
    isLoading: draftQuery.isLoading,
    isError: draftQuery.isError,
    error: draftQuery.error,
  };
}
