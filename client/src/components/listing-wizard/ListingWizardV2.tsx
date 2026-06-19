import React, { useCallback } from 'react';
import { ListingWizardProvider } from './contexts/ListingWizardContext';
import { ListingWizardEngine } from './ListingWizardEngine';
import { useLocation } from 'wouter';

function ListingWizardInner() {
  const [, setLocation] = useLocation();

  const handleExit = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  }, [setLocation]);

  return (
    <>
      <ListingWizardEngine
        onExit={handleExit}
      />

      {/*
       * FUTURE PARITY: submit/review flow
       * - Wire createListingMutation / updateListingMutation / submitForReviewMutation
       * - Connect PreviewStep submit button to orchestrator
       * - Handle edit-mode hydration from URL params
       * - Add readiness/quality score display on preview
       */}
      {/*
       * FUTURE PARITY: backend draft persistence
       * - Build listing.saveDraft / listing.loadDraft endpoints
       * - Wire autosave effect with 2s debounce
       * - Manage draftListingId in state + localStorage
       */}

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
