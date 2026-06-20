import React, { useCallback, useEffect } from 'react';
import { ListingWizardProvider } from './contexts/ListingWizardContext';
import { ListingWizardEngine } from './ListingWizardEngine';
import { useLocation } from 'wouter';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import {
  useListingDraftPersistence,
  useResumeDraft,
} from '@/hooks/useListingDraftPersistence';
import { hydrateStateFromDraftResponse } from '@/lib/workflows/listing/listingDraftPayload';

function ListingWizardInner() {
  const [, setLocation] = useLocation();
  const store = useListingWizardStore();
  const canSaveDraft = Boolean(store.action && store.propertyType);

  // Read draftId from URL query param for resume
  const [path] = useLocation();
  const searchParams = new URLSearchParams(
    path.includes('?') ? path.split('?')[1] : '',
  );
  const draftIdParam = searchParams.get('draftId');
  const draftId = draftIdParam ? Number(draftIdParam) : null;

  const { manualSave, isSaving } = useListingDraftPersistence();
  const { draft, isLoading: isResuming, isError: resumeError } = useResumeDraft(
    draftId && draftId > 0 ? draftId : null,
  );

  // Hydrate store when draft is loaded from server
  useEffect(() => {
    if (draft && draftId) {
      try {
        const { serverDraftId, state } = hydrateStateFromDraftResponse(draft);
        store.setServerDraftId(serverDraftId);
        store.hydrateFromDraft(state as Record<string, unknown>);
      } catch (err) {
        console.error('[V2] Failed to hydrate draft:', err);
      }
    }
  }, [draft, draftId, store]);

  const handleExit = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  }, [setLocation]);

  // Show loading state while resuming a draft
  if (isResuming && draftId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-slate-500">Loading draft…</p>
        </div>
      </div>
    );
  }

  // Show error state if resume failed
  if (resumeError && draftId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <p className="text-red-700 font-semibold">Could not load draft</p>
          <p className="text-sm text-red-500 mt-1">
            The draft may have been deleted or you may not have permission to view it.
          </p>
          <button
            onClick={() => setLocation('/listings/create-v2')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Start New Listing
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ListingWizardEngine
        onExit={handleExit}
        onSaveDraft={manualSave}
        isSaving={isSaving}
        canSaveDraft={canSaveDraft}
      />

      <div className="fixed top-2 left-2 z-50 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-wider">
        V2 Shell
      </div>
    </>
  );
}

export interface ListingWizardV2Props {
  listingId?: number;
  onExit?: () => void;
}

export default function ListingWizardV2({ listingId, onExit }: ListingWizardV2Props) {
  return (
    <ListingWizardProvider listingId={listingId} onExit={onExit}>
      <ListingWizardInner />
    </ListingWizardProvider>
  );
}
