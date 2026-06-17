/**
 * ListingWizardV2 — Orchestrator
 *
 * Top-level component that owns:
 *   - ListingWizardProvider (context + store)
 *   - ListingWizardEngine (renderer)
 *   - Autosave wiring
 *   - Draft management
 *   - Submission logic
 *   - Edit-mode hydration
 *
 * This replaces the old ListingWizard.tsx with a workflow-driven architecture.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ListingWizardProvider, useListingWizardContext } from './contexts/ListingWizardContext';
import { ListingWizardEngine } from './ListingWizardEngine';
import { useListingWizardStore } from '@/hooks/useListingWizard';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

// ─── Inner Component (must be inside Provider) ───────────────────────

function ListingWizardInner() {
  const ctx = useListingWizardContext();
  const store = useListingWizardStore();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // ── TRPC mutations ─────────────────────────────────────────────
  const createListingMutation = trpc.listing.create.useMutation();
  const submitForReviewMutation = trpc.listing.submitForReview.useMutation();
  const updateListingMutation = trpc.listing.update.useMutation();
  const saveDraftMutation = trpc.listing.saveDraft.useMutation();

  // ── Edit mode: parse URL params ────────────────────────────────
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const editId = searchParams.get('id');
  const isEditMode = searchParams.get('edit') === 'true';

  // ── Fetch existing listing for edit mode ───────────────────────
  const { data: existingListingRaw, isLoading: isLoadingExisting } = trpc.listing.getById.useQuery(
    { id: Number(editId) },
    { enabled: !!editId && isEditMode },
  );

  // The API response shape doesn't perfectly match ListingWizardState types;
  // we cast to any for hydration (same pattern as the old ListingWizard.tsx).
  const existingListing = existingListingRaw as any;

  // ── Hydrate store from existing listing ────────────────────────
  useEffect(() => {
    if (existingListing && isEditMode) {
      store.reset();

      store.setAction(existingListing.action as any);
      store.setPropertyType(existingListing.propertyType as any);
      store.setTitle(existingListing.title);
      store.setDescription(existingListing.description);

      // Pricing
      const pricing: any = {};
      if (existingListing.askingPrice) pricing.askingPrice = Number(existingListing.askingPrice);
      if (existingListing.monthlyRent) pricing.monthlyRent = Number(existingListing.monthlyRent);
      if (existingListing.deposit) pricing.deposit = Number(existingListing.deposit);
      if (existingListing.negotiable) pricing.negotiable = Boolean(existingListing.negotiable);
      if (existingListing.leaseTerms) pricing.leaseTerms = existingListing.leaseTerms;
      if (existingListing.availableFrom) pricing.availableFrom = new Date(existingListing.availableFrom);
      if (existingListing.utilitiesIncluded) pricing.utilitiesIncluded = Boolean(existingListing.utilitiesIncluded);
      if (existingListing.startingBid) pricing.startingBid = Number(existingListing.startingBid);
      if (existingListing.reservePrice) pricing.reservePrice = Number(existingListing.reservePrice);
      if (existingListing.auctionDateTime) pricing.auctionDateTime = new Date(existingListing.auctionDateTime);
      store.setPricing(pricing);

      // Property details
      if (existingListing.propertyDetails) {
        store.setPropertyDetails(existingListing.propertyDetails as any);
      }

      // Location
      store.setLocation({
        address: existingListing.address,
        latitude: Number(existingListing.latitude),
        longitude: Number(existingListing.longitude),
        city: existingListing.city,
        suburb: existingListing.suburb || '',
        province: existingListing.province,
        postalCode: existingListing.postalCode || '',
        placeId: existingListing.placeId || '',
      });

      // Media
      if (existingListing.media && existingListing.media.length > 0) {
        existingListing.media.forEach((m: any) => {
          store.addMedia({
            id: m.id,
            file: null as any as any,
            url: m.originalUrl || m.url || '',
            type: m.mediaType || 'image',
            displayOrder: m.displayOrder ?? 0,
            isPrimary: Boolean(m.isPrimary),
            description: '',
            fileName: m.fileName || '',
            fileSize: m.fileSize || 0,
          } as any);
          if (m.isPrimary) store.setMainMedia(m.id);
        });
      }

      store.goToStep(1);
    }
  }, [existingListing, isEditMode]);

  // ── Track listing draft ID for backend autosave ────────────────
  const [draftListingId, setDraftListingId] = useState<number | undefined>(() => {
    // Restore from localStorage if exists
    const stored = localStorage.getItem('listing-draft-id');
    return stored ? Number(stored) : undefined;
  });

  // ── Autosave (debounced — saves to backend via saveDraft endpoint) ──
  useEffect(() => {
    if (isSubmitting || store.currentStep <= 1) return;

    const timer = setTimeout(async () => {
      ctx.setSaveStatus('saving');
      try {
        const wizardData = {
          action: store.action,
          propertyType: store.propertyType,
          title: store.title,
          description: store.description,
          pricing: store.pricing,
          propertyDetails: store.propertyDetails,
          location: store.location,
          media: store.media,
          basicInfo: store.basicInfo,
          additionalInfo: store.additionalInfo,
        };

        const result = await saveDraftMutation.mutateAsync({
          listingId: draftListingId,
          data: wizardData as any,
          currentStep: store.currentStep,
        });

        if (result.listingId) {
          setDraftListingId(result.listingId);
          localStorage.setItem('listing-draft-id', String(result.listingId));
        }

        ctx.setSaveStatus('saved');
        ctx.setLastSavedAt(new Date());
      } catch (err) {
        console.error('Autosave failed:', err);
        ctx.setSaveStatus('error');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    store.action,
    store.propertyType,
    store.title,
    store.description,
    store.pricing,
    store.location,
    store.media,
    store.currentStep,
    draftListingId,
  ]);

  // ── Save Draft (manual) ────────────────────────────────────────
  const handleSaveDraft = useCallback(async () => {
    ctx.setSaveStatus('saving');
    try {
      const wizardData = {
        action: store.action,
        propertyType: store.propertyType,
        title: store.title,
        description: store.description,
        pricing: store.pricing,
        propertyDetails: store.propertyDetails,
        location: store.location,
        media: store.media,
        basicInfo: store.basicInfo,
        additionalInfo: store.additionalInfo,
      };

      const result = await saveDraftMutation.mutateAsync({
        listingId: draftListingId,
        data: wizardData as any,
        currentStep: store.currentStep,
      });

      if (result.listingId) {
        setDraftListingId(result.listingId);
        localStorage.setItem('listing-draft-id', String(result.listingId));
      }

      ctx.setSaveStatus('saved');
      ctx.setLastSavedAt(new Date());
      toast.success('Draft saved');
    } catch {
      ctx.setSaveStatus('error');
      toast.error('Failed to save draft');
    }
  }, [ctx, store, draftListingId, saveDraftMutation]);

  // ── Submit Listing ─────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!store.validate()) {
      toast.error('Please fix all validation errors before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const listingData = {
        action: store.action!,
        propertyType: store.propertyType!,
        title: store.title,
        description: store.description,
        pricing: store.pricing!,
        propertyDetails: {
          ...(store.propertyDetails || {}),
          ...(store.additionalInfo || {}),
        },
        location: store.location!,
        mediaIds: store.media.map((m: any) => m.id?.toString() || ''),
        mainMediaId:
          store.mainMediaId?.toString() ||
          (store.media.length > 0 ? store.media[0].id?.toString() : undefined),
      };

      let result;
      if (isEditMode && editId) {
        await updateListingMutation.mutateAsync({ id: Number(editId), ...listingData });
        result = { id: Number(editId) };
        toast.success('Listing updated successfully!');
      } else {
        result = await createListingMutation.mutateAsync(listingData);
        toast.success('Listing created!');
      }

      // Submit for review
      try {
        await submitForReviewMutation.mutateAsync({ listingId: result.id });
        toast.success('Listing submitted for review');
        store.reset();

        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = user?.role === 'agent' ? '/agent/dashboard' : '/';
        }
      } catch {
        toast.error('Listing created but failed to submit for review');
      }
    } catch (error: any) {
      console.error('Error submitting listing:', error);
      toast.error(error?.message || 'Failed to submit listing');
    } finally {
      setIsSubmitting(false);
    }
  }, [store, isEditMode, editId, user]);

  // ── Exit handler ───────────────────────────────────────────────
  const handleExit = useCallback(() => {
    if (store.currentStep > 1 && store.action) {
      setShowExitConfirm(true);
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  }, [store.currentStep, store.action, setLocation]);

  const confirmExit = useCallback(() => {
    setShowExitConfirm(false);
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  }, [setLocation]);

  // ── Loading state ──────────────────────────────────────────────
  if (isEditMode && isLoadingExisting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading listing...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ListingWizardEngine
        onExit={handleExit}
        onSaveDraft={handleSaveDraft}
      />

      {/* Exit confirmation dialog — TODO: replace with shadcn Dialog in Week 15 */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Leave without saving?</h3>
            <p className="text-slate-500 text-sm mb-6">
              Your progress has been auto-saved locally. You can return to complete this listing later.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Stay
              </button>
              <button
                onClick={confirmExit}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Outer Wrapper (owns the Provider) ───────────────────────────────

export interface ListingWizardV2Props {
  /** Existing listing ID for edit mode */
  listingId?: number;
  /** Called when user clicks exit */
  onExit?: () => void;
}

export default function ListingWizardV2({ listingId, onExit }: ListingWizardV2Props) {
  return (
    <ListingWizardProvider listingId={listingId} onExit={onExit}>
      <ListingWizardInner />
    </ListingWizardProvider>
  );
}
