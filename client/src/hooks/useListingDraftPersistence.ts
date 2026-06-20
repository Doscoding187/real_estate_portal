/**
 * Bridge hook: React/tRPC ↔ Zustand store for V2 draft persistence.
 *
 * This hook must be called inside the React tree (under TRPCProvider).
 * It does NOT live in the Zustand store — the store remains pure.
 *
 * Exposes:
 *   manualSave()     — save current wizard state as a draft
 *   isSaving         — in-progress mutation flag
 *   saveError        — last mutation error (cleared on next save)
 */
import { useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { buildSaveDraftPayloadFromWizardState } from '@/lib/workflows/listing/listingDraftPayload';
import type { ListingWizardState } from '@shared/listing-types';

export function useListingDraftPersistence() {
  const store = useListingWizardStore();

  const saveMutation = trpc.listing.saveDraft.useMutation({
    onSuccess: (result) => {
      store.setServerDraftId(result.id);
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
    await saveMutation.mutateAsync(payload);
  }, [store, saveMutation]);

  return {
    manualSave,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
    resetSaveState: saveMutation.reset,
  };
}

/**
 * Fetch a server-side draft by ID (for resume-by-URL flow).
 *
 * Returns the query result so the caller can hydrate the Zustand store
 * via an effect. The query is only enabled when draftId is non-null.
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
