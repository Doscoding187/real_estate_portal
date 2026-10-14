// @ts-nocheck
/**
 * Main Listing Wizard Component
 * Orchestrates the multi-step listing creation process
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { hydrateListingWizardForUser, useListingWizardStore } from '@/hooks/useListingWizard';
import { useAutoSave } from '@/hooks/useAutoSave';
import { DraftManager } from '@/components/wizard/DraftManager';
import {
  ProgressIndicator,
  generateSteps,
  updateStepsWithErrors,
} from '@/components/wizard/ProgressIndicator';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ValidationErrorList } from '@/components/ui/ValidationErrorList';
import { parseError, type AppError } from '@/lib/errors/ErrorRecoveryStrategy';
import {
  parseServerValidationErrors,
  type ValidationErrorResult,
} from '@/lib/errors/ValidationErrorParser';
import {
  handleSessionExpiry,
  wasSessionExpired,
  clearSessionExpiryFlags,
} from '@/lib/auth/SessionExpiryHandler';
import { trpc } from '@/lib/trpc';
import { useLocation, useSearch } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import ActionStep from './steps/ActionStep';
import PropertyTypeStep from './steps/PropertyTypeStep';
import BasicInformationStep from './steps/BasicInformationStep';
import { AdditionalInformationStep } from './steps/AdditionalInformationStep';
import PricingStep from './steps/PricingStep';
import LocationStep from './steps/LocationStep';
import MediaUploadStep from './steps/MediaUploadStep';
import PreviewStep from './steps/PreviewStep';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Home, Save, AlertTriangle, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { ReadinessIndicator } from '@/components/common/ReadinessIndicator';
import { calculateListingReadiness } from '@/lib/readiness';
import { buildCanonicalCorePropertyDetails } from '@/../../shared/core-property-information';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { buildListingWizardSubmitPayload } from '@/lib/listingWizardSubmitMapper';
import { createListingSchema } from '@shared/listing-draft-input';
import { ZodError } from 'zod';
import { LISTING_MEDIA_TYPES } from '@/../../shared/listing-media';
import { buildPricingContract } from '@/../../shared/pricing-contract';
import { getPresentationMediaDescriptor } from '@/../../shared/property-presentation';
import {
  createDefaultRentalTerms,
  normalizeRentalTerms,
} from '@/../../shared/rental-terms-contract';
import { LISTING_SUBMISSION_READINESS_THRESHOLD } from '@/../../shared/listing-workflow-types';

const ListingWizard: React.FC = () => {
  const store = useListingWizardStore();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const searchParams = new URLSearchParams(useSearch());
  const editId = searchParams.get('id');
  const isEditMode = searchParams.get('edit') === 'true';
  const sellerProspectId = Number(searchParams.get('sellerProspectId') || 0);
  const hasSellerProspectHandoff = Number.isInteger(sellerProspectId) && sellerProspectId > 0;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showResumeDraftDialog, setShowResumeDraftDialog] = useState(false);
  const [wizardKey, setWizardKey] = useState(0); // Force re-render on reset
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [serverDraftId, setServerDraftId] = useState<number | null>(null);
  const [apiError, setApiError] = useState<AppError | null>(null);
  const [, setRetryAttempt] = useState(0);
  const [validationErrors, setValidationErrors] = useState<ValidationErrorResult | null>(null);
  const [showPreflightModal, setShowPreflightModal] = useState(false);
  const [draftIdentityReady, setDraftIdentityReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [createUncertain, setCreateUncertain] = useState(false);
  const [reconcileId, setReconcileId] = useState('');
  const [inventoryChecked, setInventoryChecked] = useState(false);
  const [reconciliationDrafts, setReconciliationDrafts] = useState<Array<{
    id: number;
    title: string;
  }> | null>(null);
  const [existingListing, setExistingListing] = useState<any>(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const inFlight = useRef<number | null>(null);
  const lastIntent = useRef<'save' | 'submit'>('save');
  const activeOwner = useRef<number | null>(null);
  const activeDraftContext = useRef<string | null>(null);
  const sessionEpoch = useRef(0);
  const verifiedServerRead = useRef<{ epoch: number; id: number } | null>(null);
  const ownerNow = authLoading ? null : (user?.id ?? null);
  // The owner can open a different draft without unmounting this route.
  // First save keeps the same context; navigation and starting fresh invalidate it.
  const draftContextKey = `${ownerNow}:${isEditMode}:${editId ?? ''}:${sellerProspectId}:${wizardKey}`;
  if (activeOwner.current !== ownerNow || activeDraftContext.current !== draftContextKey)
    sessionEpoch.current += 1;
  activeOwner.current = ownerNow;
  activeDraftContext.current = draftContextKey;
  const hasPendingOperation = () => inFlight.current === sessionEpoch.current;
  useEffect(() => {
    setIsSavingDraft(false);
    setIsSubmitting(false);
    setDraftSaved(false);
    setSubmitError(null);
    setApiError(null);
    setValidationErrors(null);
    setReconcileId('');
    setInventoryChecked(false);
    setReconciliationDrafts(null);
  }, [draftContextKey]);
  useEffect(
    () => () => {
      activeOwner.current = null;
    },
    [],
  );
  const utils = trpc.useUtils();
  const appliedSellerProspectId = useRef<number | null>(null);
  const isDraftIdentityCurrent =
    !authLoading && user?.id != null && draftIdentityReady && store.persistedOwnerId === user.id;

  // Auto-save hook - saves draft to localStorage automatically
  const {
    lastSaved,
    isSaving: isAutoSaving,
    error: autoSaveError,
  } = useAutoSave(
    {
      action: store.action,
      propertyType: store.propertyType,
      title: store.title,
      description: store.description,
      pricing: store.pricing,
      propertyDetails: {
        ...store.propertyDetails,
        ...buildCanonicalCorePropertyDetails(
          store.propertyType,
          store.propertyDetails,
          store.basicInfo,
        ),
      },
      location: store.location,
      media: store.media,
      badges: store.badges,
      basicInfo: store.basicInfo,
      additionalInfo: store.additionalInfo,
      currentStep: store.currentStep,
      completedSteps: store.completedSteps,
      mainMediaId: store.mainMediaId,
    },
    {
      // storageKey: 'listing-wizard-storage', // Don't use this, it conflicts with Zustand persist
      onSave: async () => {
        // Zustand persist middleware handles the actual saving to localStorage
        // This is just to simulate the delay for the UI
        await new Promise(resolve => setTimeout(resolve, 500));
      },
      debounceMs: 2000,
      enabled: isDraftIdentityCurrent && !isSubmitting && store.currentStep > 1, // Only auto-save after first step
      onError: error => {
        console.error('Auto-save error:', error);
        toast.error('Failed to auto-save draft');
      },
    },
  );

  // TRPC mutation for creating listing
  // A transport/server failure can follow a committed write. The wizard owns
  // reconciliation; inherited QueryClient retries must never repeat that write.
  const createListingMutation = trpc.listing.create.useMutation({ retry: false });
  // TRPC mutation for submitting for review
  const submitForReviewMutation = trpc.listing.submitForReview.useMutation({ retry: false });
  // TRPC mutation for updating listing
  const updateListingMutation = trpc.listing.update.useMutation({ retry: false });

  const workspaceReturn =
    user?.role === 'agent'
      ? { href: '/agent/dashboard', label: 'Back to agent workspace' }
      : user?.role === 'agency_admin'
        ? { href: '/agency/overview', label: 'Back to agency workspace' }
        : user?.role === 'property_developer'
          ? { href: '/developer/dashboard', label: 'Back to developer workspace' }
          : { href: '/dashboard', label: 'Back to dashboard' };
  const serverDraftStorageKey = user?.id ? `listing-wizard-server-draft:${user.id}` : null;

  const uncertainStorageKey = user?.id ? `listing-wizard-create-uncertain:${user.id}` : null;

  useEffect(() => {
    if (authLoading) {
      setDraftIdentityReady(false);
      return;
    }

    let cancelled = false;
    setDraftIdentityReady(false);
    setIsInitialized(false);
    setShowResumeDraftDialog(false);
    setServerDraftId(null);
    setExistingListing(null);
    setLoadError(null);
    setCreateUncertain(false);
    setReconcileId('');
    setInventoryChecked(false);
    setReconciliationDrafts(null);
    setApiError(null);
    setSubmitError(null);
    setValidationErrors(null);
    setDraftSaved(false);
    setIsSavingDraft(false);
    setIsSubmitting(false);
    appliedSellerProspectId.current = null;

    void hydrateListingWizardForUser(user?.id ?? null)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setDraftIdentityReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.id]);

  // Each account/route verifies custody with a fresh authenticated server read.
  // Query cache data from a previous session is never used to hydrate this form.
  useEffect(() => {
    if (!isDraftIdentityCurrent) return;
    let cancelled = false;
    const epoch = sessionEpoch.current;
    const storedId = serverDraftStorageKey
      ? Number(localStorage.getItem(serverDraftStorageKey))
      : 0;
    const id = isEditMode ? Number(editId) : storedId;
    verifiedServerRead.current = null;
    setCreateUncertain(Boolean(uncertainStorageKey && localStorage.getItem(uncertainStorageKey)));
    setExistingListing(null);
    setServerDraftId(null);
    setLoadError(null);
    setIsLoadingExisting(false);
    if (!Number.isSafeInteger(id) || id <= 0) {
      if (isEditMode) setLoadError('Choose an owned listing from your listings workspace.');
      return;
    }
    setIsLoadingExisting(true);
    void utils.client.listing.getById
      .query({ id })
      .then(result => {
        if (cancelled || sessionEpoch.current !== epoch) return;
        const record = result.property;
        if (!record || Number(record.id) !== id) throw new Error('Listing could not be verified.');
        verifiedServerRead.current = { epoch, id };
        setExistingListing(result);
        // Keep saving blocked until this full server record has hydrated the form.
        // A stored pointer must never make device fields authoritative for that ID.
      })
      .catch(() => {
        if (!cancelled && sessionEpoch.current === epoch) {
          setLoadError(
            'Saved listing access could not be verified. Open your listings workspace and try again.',
          );
          setIsLoadingExisting(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    isDraftIdentityCurrent,
    draftContextKey,
    user?.id,
    isEditMode,
    editId,
    serverDraftStorageKey,
    uncertainStorageKey,
    utils.client,
  ]);

  const { data: sellerProspectPrefill } = trpc.canvassing.getListingPrefill.useQuery(
    { sellerProspectId },
    { enabled: isDraftIdentityCurrent && hasSellerProspectHandoff && !isEditMode, retry: false },
  );

  const { data: preflight, isLoading: isPreflightLoading } =
    trpc.listing.getSubmissionPreflight.useQuery(undefined, {
      enabled: isDraftIdentityCurrent,
      refetchOnWindowFocus: true,
    });

  // Restore fresh server reads for both edit routes and stored draft pointers.
  // Sparse create acknowledgements are not reads and must not reset the form.
  useEffect(() => {
    const verified = verifiedServerRead.current;
    if (
      isDraftIdentityCurrent &&
      existingListing &&
      verified?.epoch === sessionEpoch.current &&
      Number(existingListing.property?.id) === verified.id
    ) {
      const listing = (existingListing as any).property || existingListing;
      const listingMedia = (
        Array.isArray((existingListing as any).media) && (existingListing as any).media.length > 0
          ? (existingListing as any).media
          : Array.isArray((listing as any).media) && (listing as any).media.length > 0
            ? (listing as any).media
            : (existingListing as any).images || []
      ) as any[];

      // Reset store first to clear any drafts
      store.reset();

      // Set basic fields
      store.setAction(listing.action as any);
      store.setPropertyType(listing.propertyType as any);
      store.setTitle(listing.title);
      store.setDescription(listing.description);

      // Set pricing
      const pricing: any = {};
      const sourcePricing = listing.pricing || listing;
      if (sourcePricing.askingPrice !== null && sourcePricing.askingPrice !== undefined)
        pricing.askingPrice = Number(sourcePricing.askingPrice);
      if (sourcePricing.monthlyRent !== null && sourcePricing.monthlyRent !== undefined)
        pricing.monthlyRent = Number(sourcePricing.monthlyRent);
      if (sourcePricing.deposit !== null && sourcePricing.deposit !== undefined)
        pricing.deposit = Number(sourcePricing.deposit);
      if (
        sourcePricing.transferCostEstimate !== null &&
        sourcePricing.transferCostEstimate !== undefined
      )
        pricing.transferCostEstimate = Number(sourcePricing.transferCostEstimate);
      if (sourcePricing.startingBid !== null && sourcePricing.startingBid !== undefined)
        pricing.startingBid = Number(sourcePricing.startingBid);
      if (sourcePricing.reservePrice !== null && sourcePricing.reservePrice !== undefined)
        pricing.reservePrice = Number(sourcePricing.reservePrice);
      if (sourcePricing.auctionDateTime)
        pricing.auctionDateTime = new Date(sourcePricing.auctionDateTime);
      if (sourcePricing.auctionTermsDocumentUrl)
        pricing.auctionTermsDocumentUrl = sourcePricing.auctionTermsDocumentUrl;
      if (sourcePricing.negotiable !== undefined)
        pricing.negotiable = Boolean(sourcePricing.negotiable);

      const pricingContract = buildPricingContract(
        listing.action,
        sourcePricing,
        listing.propertyDetails,
      );
      if (pricingContract?.intent === 'sale') {
        pricing.negotiability = pricingContract.negotiability;
        pricing.recurringCosts = pricingContract.recurringCosts;
      }
      if (pricingContract?.intent === 'rent') {
        pricing.depositFact = pricingContract.deposit;
      }

      store.setPricing(pricing);

      // Set property details
      if (listing.propertyDetails) {
        store.setPropertyDetails({
          ...(listing.propertyDetails as any),
          ...(listing.action === 'rent'
            ? {
                rentalTerms:
                  normalizeRentalTerms((listing.propertyDetails as any).rentalTerms) ??
                  createDefaultRentalTerms(),
              }
            : {}),
        });
        // Also map to basicInfo/additionalInfo if needed, or just rely on propertyDetails
        // The wizard seems to split these, so we might need to map them back if they are stored separately in the store
        // But setPropertyDetails should handle the main ones.
        const savedFeaturesContext = (listing.propertyDetails as any).featuresContext;
        if (savedFeaturesContext) {
          store.setAdditionalInfo({ featuresContext: savedFeaturesContext });
        }
      }

      // Set location
      store.setLocation({
        address: listing.address || '',
        latitude: listing.latitude == null ? null : Number(listing.latitude),
        longitude: listing.longitude == null ? null : Number(listing.longitude),
        city: listing.city,
        suburb: listing.suburb || '',
        province: listing.province,
        canonicalPlace: listing.canonicalPlace ?? null,
        canonicalLocationRefusal: listing.canonicalLocationRefusal ?? null,
        provider: listing.placeId ? 'google' : undefined,
        providerLocationPlaceId: listing.placeId ?? undefined,
        postalCode: listing.postalCode || '',
        placeId: listing.placeId || '',
        provinceId: listing.provinceId ?? null,
        cityId: listing.cityId ?? null,
        suburbId: listing.suburbId ?? null,
        privateAddress: listing.privateAddress || null,
        coordinateSource: listing.coordinateSource || null,
        locationConfirmationState:
          listing.canonicalLocationRefusal || !listing.canonicalPlace
            ? 'needs_confirmation'
            : listing.locationConfirmationState || 'needs_confirmation',
        publicLocationPrecision: listing.publicLocationPrecision || 'approximate',
      });

      // Set media
      if (listingMedia.length > 0) {
        // Clear existing media first (reset did this, but just to be sure)
        // store.media is [] after reset

        // We need to map DB media to store MediaFile
        // This might be tricky if store expects File objects for new uploads
        // But for existing ones, it should handle URL-based media
        listingMedia.forEach((m: any) => {
          const url = m.url || m.processedUrl || m.previewUrl || m.originalUrl || m.imageUrl;
          const type = LISTING_MEDIA_TYPES.includes(m.mediaType) ? m.mediaType : 'image';
          if (!url) return;
          const presentation = getPresentationMediaDescriptor(
            listing.propertyDetails?.propertyPresentation,
            {
              id: m.id,
              type,
              url,
              originalUrl: m.originalUrl,
              fileName: m.originalFileName || m.fileName,
            },
          );
          store.addMedia({
            id: `existing:${m.id}`,
            file: null as any, // No file object for existing media
            url,
            type,
            thumbnailUrl: m.thumbnailUrl || m.thumbnail || undefined,
            previewUrl: m.previewUrl || undefined,
            fileName: m.originalFileName || m.fileName || undefined,
            fileSize: m.originalFileSize || m.fileSize || undefined,
            width: m.width || undefined,
            height: m.height || undefined,
            duration: m.duration || undefined,
            orientation: m.orientation || undefined,
            processingStatus: m.processingStatus || 'completed',
            presentationLabel: presentation.label,
            displayOrder: m.displayOrder,
            isPrimary: Boolean(m.isPrimary),
          });

          if (
            m.isPrimary &&
            type === 'image' &&
            (m.processingStatus || 'completed') === 'completed'
          ) {
            store.setMainMedia(`existing:${m.id}`);
          }
        });
      }

      // Set step to 1 or last step?
      // Maybe let user start at 1 to review everything
      store.goToStep(1);

      // Disable resume draft dialog
      setShowResumeDraftDialog(false);
      verifiedServerRead.current = null;
      setServerDraftId(verified.id);
      // The hydrated record can be updated without creating another draft.
      // Keep any other pending-create marker until it has been reconciled.
      setCreateUncertain(false);
      setIsLoadingExisting(false);
    }
  }, [isDraftIdentityCurrent, existingListing, draftContextKey]);

  useEffect(() => {
    if (
      !isDraftIdentityCurrent ||
      isEditMode ||
      !sellerProspectPrefill ||
      appliedSellerProspectId.current === sellerProspectPrefill.sellerProspectId
    ) {
      return;
    }

    appliedSellerProspectId.current = sellerProspectPrefill.sellerProspectId;
    store.reset();
    store.setAction('sell');
    if (sellerProspectPrefill.propertyType) {
      store.setPropertyType(sellerProspectPrefill.propertyType as any);
    }
    setShowResumeDraftDialog(false);
    setWizardKey(previous => previous + 1);
  }, [isDraftIdentityCurrent, isEditMode, sellerProspectPrefill, store]);

  // Check for session restoration after login
  useEffect(() => {
    if (isDraftIdentityCurrent && wasSessionExpired()) {
      console.log('Session was expired, draft should be restored automatically');
      clearSessionExpiryFlags();

      // Show a toast to inform user their session was restored
      toast.success('Welcome back! Your draft has been restored.', {
        description: 'You can continue where you left off.',
      });
    }
  }, [isDraftIdentityCurrent]);

  useEffect(() => {
    if (isDraftIdentityCurrent && !isEditMode && preflight && !preflight.canPrepareDraft) {
      setShowPreflightModal(true);
    }
  }, [isDraftIdentityCurrent, isEditMode, preflight]);

  const forgetServerDraft = () => {
    setServerDraftId(null);
    if (serverDraftStorageKey) {
      window.localStorage.removeItem(serverDraftStorageKey);
    }
  };

  // Check for draft on mount and show resume dialog
  useEffect(() => {
    if (!isDraftIdentityCurrent) return;

    // If editing, don't show draft dialog
    if (isEditMode) {
      setIsInitialized(true);
      return;
    }

    // If previously submitted, reset
    if (store.status === 'submitted') {
      console.log('Wizard was previously submitted, resetting for new listing...');
      store.reset();
      setIsInitialized(true);
      return;
    }

    // Check if there's a draft (currentStep > 1 or has action/propertyType)
    const hasDraft = store.currentStep > 1 || store.action || store.propertyType;

    if (hasDraft) {
      setShowResumeDraftDialog(true);
    }

    setIsInitialized(true);
  }, [isDraftIdentityCurrent, isEditMode]); // Run when isEditMode is determined

  // Handle resume draft decision
  const handleResumeDraft = () => {
    setShowResumeDraftDialog(false);
    // Keep existing state - user continues where they left off
  };

  const handleStartFresh = () => {
    if (hasPendingOperation() || createUncertain) {
      setShowResumeDraftDialog(false);
      return;
    }
    setShowResumeDraftDialog(false);
    // Starting fresh must never overwrite a previous private server draft.
    // That draft remains available from the listings workspace.
    forgetServerDraft();
    setExistingListing(null);
    store.reset();
    if (isEditMode) setLocation('/listings/create');
    setWizardKey(prev => prev + 1); // Force re-render
  };

  const currentListingStatus = existingListing?.property?.status;
  const canSavePrivateDraft = !serverDraftId || currentListingStatus === 'draft';
  const inventoryPath = user?.role === 'agency_admin' ? '/agency/listings' : '/agent/listings';

  // Share persistence only. Saving never invokes a publication transition.
  const persistListing = async () => {
    const ownerId = user.id;
    const epoch = sessionEpoch.current;
    const key = serverDraftStorageKey;
    const unknownKey = uncertainStorageKey;
    const listingData = createListingSchema.parse(buildListingWizardSubmitPayload(store));
    if (hasSellerProspectHandoff) listingData.sellerProspectId = sellerProspectId;
    if (serverDraftId) {
      const update = await updateListingMutation.mutateAsync({ id: serverDraftId, ...listingData });
      return { id: serverDraftId, status: update?.status || currentListingStatus };
    }
    if (createUncertain || localStorage.getItem(unknownKey)) {
      throw new Error(
        'A previous save may have created a draft. Check your owned listings before creating again.',
      );
    }
    // Persist this marker BEFORE dispatch. Even a server error can follow a durable insert.
    localStorage.setItem(unknownKey, 'awaiting-owned-inventory-reconciliation');
    setCreateUncertain(true);
    const result = await createListingMutation.mutateAsync(listingData);
    if (!Number.isSafeInteger(result.id) || result.id <= 0) {
      throw new Error('The saved draft ID could not be confirmed. Check your owned listings.');
    }
    // Retain another account's confirmed result, but never replace this account's
    // pointer after it navigates to a different draft while the request is pending.
    if (activeOwner.current !== ownerId || sessionEpoch.current === epoch)
      localStorage.setItem(key, String(result.id));
    localStorage.removeItem(unknownKey);
    if (activeOwner.current === ownerId && sessionEpoch.current === epoch) {
      setServerDraftId(result.id);
      setExistingListing({ property: { id: result.id, status: 'draft' } });
      setCreateUncertain(false);
    }
    return result;
  };

  useEffect(() => {
    setDraftSaved(false);
  }, [
    store.action,
    store.propertyType,
    store.title,
    store.description,
    store.pricing,
    store.propertyDetails,
    store.additionalInfo,
    store.location,
    store.media,
    store.mainMediaId,
  ]);

  const handleSaveDraft = async () => {
    if (
      hasPendingOperation() ||
      !isDraftIdentityCurrent ||
      !canSavePrivateDraft ||
      isLoadingExisting ||
      loadError ||
      !preflight?.canPrepareDraft
    )
      return;
    inFlight.current = sessionEpoch.current;
    lastIntent.current = 'save';
    const ownerId = user.id;
    const epoch = sessionEpoch.current;
    setIsSavingDraft(true);
    setDraftSaved(false);
    setSubmitError(null);
    setApiError(null);
    setValidationErrors(null);
    try {
      const savedPayload = JSON.stringify(buildListingWizardSubmitPayload(store));
      await persistListing();
      if (activeOwner.current !== ownerId || sessionEpoch.current !== epoch) return;
      const unchanged =
        savedPayload ===
        JSON.stringify(buildListingWizardSubmitPayload(useListingWizardStore.getState()));
      setDraftSaved(unchanged);
      toast.success(
        unchanged
          ? 'Private draft saved to your account.'
          : 'Private draft saved. Save again to keep your latest edits.',
      );
    } catch (error) {
      if (activeOwner.current !== ownerId || sessionEpoch.current !== epoch) return;
      const message =
        error instanceof ZodError
          ? error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')
          : error instanceof Error
            ? error.message
            : 'Private draft save failed.';
      setSubmitError(message);
      toast.error('Private draft save could not be confirmed.', { description: message });
    } finally {
      if (inFlight.current === epoch) inFlight.current = null;
      if (activeOwner.current === ownerId && sessionEpoch.current === epoch)
        setIsSavingDraft(false);
    }
  };

  const checkOwnedInventory = async () => {
    if (hasPendingOperation() || !isDraftIdentityCurrent) return;
    inFlight.current = sessionEpoch.current;
    const ownerId = user.id;
    const epoch = sessionEpoch.current;
    setInventoryChecked(false);
    setReconciliationDrafts(null);
    try {
      const drafts = await utils.client.listing.myListings.query({
        status: 'draft',
        limit: 100,
        offset: 0,
      });
      if (activeOwner.current !== ownerId || sessionEpoch.current !== epoch) return;
      setReconciliationDrafts(drafts.map(draft => ({ id: Number(draft.id), title: draft.title })));
      setSubmitError(null);
    } catch {
      if (activeOwner.current === ownerId && sessionEpoch.current === epoch)
        setSubmitError('Your saved drafts could not be checked. Keep this form and try again.');
    } finally {
      if (inFlight.current === epoch) inFlight.current = null;
    }
  };

  const reconcileOwnedDraft = async () => {
    if (hasPendingOperation() || !isDraftIdentityCurrent) return;
    const id = Number(reconcileId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      setSubmitError('Enter the draft ID shown in your owned listings.');
      return;
    }
    inFlight.current = sessionEpoch.current;
    const ownerId = user.id;
    const epoch = sessionEpoch.current;
    try {
      const result = await utils.client.listing.getById.query({ id });
      if (activeOwner.current !== ownerId || sessionEpoch.current !== epoch) return;
      if (Number(result.property?.id) !== id || result.property?.status !== 'draft')
        throw new Error('Select a private draft from your listings.');
      localStorage.setItem(serverDraftStorageKey, String(id));
      localStorage.removeItem(uncertainStorageKey);
      setCreateUncertain(false);
      setServerDraftId(id);
      setExistingListing(result);
      setSubmitError(null);
      setLocation(`/listings/create?id=${id}&edit=true`);
    } catch {
      if (activeOwner.current === ownerId && sessionEpoch.current === epoch)
        setSubmitError('This owned private draft could not be verified. No new draft was created.');
    } finally {
      if (inFlight.current === epoch) inFlight.current = null;
    }
  };

  // Redirect if submitted (legacy - keeping for safety)
  useEffect(() => {
    if (store.status === 'submitted' && createListingMutation.data) {
      // Instead of redirecting to the listing page, we'll handle the redirect after submit for review
    }
  }, [store.status, createListingMutation.data, setLocation]);

  // Handle form submission with error recovery
  const handleSubmit = async () => {
    if (
      hasPendingOperation() ||
      !isDraftIdentityCurrent ||
      isLoadingExisting ||
      loadError ||
      createUncertain
    )
      return;
    if (!store.validate()) {
      return;
    }

    inFlight.current = sessionEpoch.current;
    lastIntent.current = 'submit';
    const ownerId = user.id;
    const epoch = sessionEpoch.current;
    setIsSubmitting(true);
    setSubmitError(null);
    setApiError(null);
    setValidationErrors(null);

    try {
      const result = await persistListing();
      if (activeOwner.current !== ownerId || sessionEpoch.current !== epoch) return;
      const shouldSubmitForReview = result.status !== 'pending_review';

      // Submit for review
      try {
        if (shouldSubmitForReview) {
          await submitForReviewMutation.mutateAsync({ listingId: result.id });
          if (activeOwner.current !== ownerId || sessionEpoch.current !== epoch) return;
          console.log('Listing submitted for review');
        } else {
          console.log('Listing is already pending review');
        }

        // Show success message
        toast.success('Listing submitted for review', {
          description: 'It is awaiting admin approval and is not public yet.',
        });
        void utils.listing.myListings.invalidate();

        // Reset wizard state for next listing
        forgetServerDraft();
        store.reset();

        // Agency inventory is the canonical return surface for agency-admin authoring.
        if (user?.role === 'agency_admin') {
          setLocation('/agency/listings');
          return;
        }

        if (user?.role === 'agent' && hasSellerProspectHandoff) {
          setLocation('/agent/canvassing');
          return;
        }

        // A completed submission belongs in private pending inventory, rather
        // than whichever page happened to precede the wizard in browser history.
        if (user?.role === 'agent') {
          setLocation('/agent/listings?tab=pending');
          return;
        }

        // Redirect based on user role using the proper navigation strategy
        if (window.history.length > 1) {
          window.history.back();
        } else {
          // Fallback redirects based on role
          if (user?.role === 'agent') {
            window.location.href = '/agent/dashboard';
          } else if (user?.role === 'property_developer') {
            window.location.href = '/developer/dashboard';
          } else {
            window.location.href = '/'; // Default fallback
          }
        }
      } catch (reviewError: any) {
        if (activeOwner.current !== ownerId || sessionEpoch.current !== epoch) return;

        // Parse and handle review submission error
        const appError = parseError(reviewError, {
          type: 'server',
          context: { operation: 'submitForReview' },
        });
        setApiError(appError);

        toast.error('Your private server draft is ready to continue.', {
          description:
            appError.message ||
            'Resolve the publication requirement, then retry the same saved draft without duplicating it.',
        });
        // Keep as draft and stay on page
      }
    } catch (error: any) {
      if (activeOwner.current !== ownerId || sessionEpoch.current !== epoch) return;

      // Parse error and determine recovery strategy
      const appError = parseError(error, {
        type: 'network',
        context: { operation: 'createListing' },
      });

      // Check if this is a validation error
      if (appError.type === 'validation') {
        const validationResult = parseServerValidationErrors(error, 'listing');
        setValidationErrors(validationResult);

        // Show toast with summary
        toast.error('Please fix validation errors', {
          description: `${validationResult.fieldErrors.length + validationResult.generalErrors.length} error(s) found`,
        });
      } else {
        setApiError(appError);
        setSubmitError(appError.message);

        // Show appropriate toast based on error type
        if (appError.type === 'network') {
          toast.error('Connection lost. Your browser recovery copy is still available.', {
            description:
              'Check your owned listings before creating again: a save can succeed even when its response is lost.',
          });
        } else if (appError.type === 'session') {
          // Handle session expiry with draft restoration
          handleSessionExpiry({
            onSessionExpired: () => {
              toast.error('Your session has expired. Please log in again.', {
                description: 'Your draft has been saved and will be restored after login.',
              });
            },
            onDraftSaved: () => {
              console.log('Draft saved before session expiry redirect');
            },
          });
        } else {
          toast.error(appError.message);
        }
      }
    } finally {
      if (inFlight.current === epoch) inFlight.current = null;
      if (activeOwner.current === ownerId && sessionEpoch.current === epoch) setIsSubmitting(false);
    }
  };

  // Handle retry for failed submissions
  const handleRetry = async () => {
    setRetryAttempt(prev => prev + 1);
    if (lastIntent.current === 'save') await handleSaveDraft();
    else await handleSubmit();
  };

  // Clear API error
  const handleDismissError = () => {
    setApiError(null);
    setSubmitError(null);
  };

  // Handle validation error field click - navigate to step
  const handleValidationFieldClick = (field: string, step?: number) => {
    if (step !== undefined) {
      store.goToStep(step);
      setValidationErrors(null); // Clear errors after navigation
    }
  };

  // Clear validation errors
  const handleDismissValidationErrors = () => {
    setValidationErrors(null);
  };

  // Get current step component
  const getCurrentStep = () => {
    switch (store.currentStep) {
      case 1:
        return <ActionStep />;
      case 2:
        return <PropertyTypeStep />;
      case 3:
        return <BasicInformationStep />;
      case 4:
        return <AdditionalInformationStep />;
      case 5:
        return <PricingStep />;
      case 6:
        return (
          <LocationStep addressHint={sellerProspectPrefill?.propertyLocation?.address || ''} />
        );
      case 7:
        return (
          <MediaUploadStep
            listingId={serverDraftId ?? undefined}
            draftContextKey={draftContextKey}
          />
        );
      case 8:
        return <PreviewStep />;
      default:
        return <ActionStep />;
    }
  };

  // Calculate progress percentage
  const progress = (store.currentStep / 8) * 100;

  // Step titles for progress indicator
  const stepTitles = [
    'Intent',
    'Type',
    'Basic Info',
    'Features',
    'Pricing',
    'Location',
    'Media',
    'Preview',
  ];

  // Generate steps for progress indicator with error highlighting
  const canAdvanceFromCurrentStep = store.canAdvanceFromStep(store.currentStep);
  const progressSteps = useMemo(() => {
    const steps = generateSteps(
      stepTitles,
      store.currentStep,
      store.completedSteps,
      undefined,
      canAdvanceFromCurrentStep,
    );

    // Add error counts if validation errors exist
    if (validationErrors && validationErrors.affectedSteps.length > 0) {
      const errorsByStep = new Map<number, number>();

      validationErrors.fieldErrors.forEach(error => {
        if (error.step !== undefined) {
          errorsByStep.set(error.step, (errorsByStep.get(error.step) || 0) + 1);
        }
      });

      return updateStepsWithErrors(steps, errorsByStep);
    }

    return steps;
  }, [
    stepTitles,
    store.currentStep,
    store.completedSteps,
    validationErrors,
    canAdvanceFromCurrentStep,
  ]);

  // Calculate readiness
  const readiness = useMemo(() => {
    // Map store to listing object expected by readiness calculator
    const listingCandidate = {
      action: store.action,
      location: store.location,
      address: store.location?.address,
      latitude: store.location?.latitude,
      longitude: store.location?.longitude,
      askingPrice: store.pricing?.askingPrice,
      monthlyRent: store.pricing?.monthlyRent,
      media: store.media,
      description: store.description,
      propertyType: store.propertyType,
      propertyDetails: store.propertyDetails,
      basicInfo: store.basicInfo,
    };
    return calculateListingReadiness(listingCandidate);
  }, [
    store.action,
    store.location,
    store.pricing,
    store.media,
    store.description,
    store.propertyType,
    store.propertyDetails,
    store.basicInfo,
  ]);

  const readinessMissingItems = useMemo(() => {
    return Object.entries(readiness.missing || {}).flatMap(([section, fields]) =>
      (fields || []).map(field => ({
        section: section.charAt(0).toUpperCase() + section.slice(1),
        field,
      })),
    );
  }, [readiness.missing]);
  const showReadinessReview = store.currentStep === 8;

  if (!isDraftIdentityCurrent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] py-5 sm:py-8">
      <Dialog
        open={showPreflightModal}
        onOpenChange={nextOpen => {
          if (!nextOpen && preflight?.canPrepareDraft) setShowPreflightModal(false);
          if (nextOpen) setShowPreflightModal(true);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              Listing Setup Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Verify your account and use your authorised professional workspace to prepare a draft.
              Publishing remains subject to profile approval and commercial activation.
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {(preflight?.blockers || []).map(blocker => (
                <p key={blocker.code}>• {blocker.message}</p>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from(
                new Map(
                  (preflight?.blockers || []).map(blocker => [
                    `${blocker.actionPath}:${blocker.actionLabel}`,
                    blocker,
                  ]),
                ).values(),
              ).map(blocker => (
                <Button
                  key={`${blocker.actionPath}:${blocker.actionLabel}`}
                  onClick={() => setLocation(blocker.actionPath)}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {blocker.actionLabel}
                </Button>
              ))}
              <Button variant="outline" onClick={() => setLocation('/agent/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resume Draft Dialog */}
      <DraftManager
        open={showResumeDraftDialog}
        onOpenChange={setShowResumeDraftDialog}
        onResume={handleResumeDraft}
        onStartFresh={handleStartFresh}
        wizardType="listing"
        draftData={{
          currentStep: store.currentStep,
          totalSteps: 8,
          action: store.action,
          propertyType: store.propertyType,
          address: store.location?.address,
          lastModified: lastSaved || undefined,
        }}
      />

      <div className="container mx-auto max-w-5xl px-4 sm:px-6">
        {preflight?.canPrepareDraft && !preflight.canStartListing ? (
          <div
            className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
            role="status"
          >
            <p className="font-semibold">Prepare your listing before activation</p>
            <p>
              You can save this private draft and return to it. Submission and marketplace
              publishing require completed onboarding, approval and commercial activation.
            </p>
          </div>
        ) : null}
        {!isInitialized ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : isPreflightLoading || isLoadingExisting ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : loadError ? (
          <div role="alert" className="p-6">
            <p>{loadError}</p>
            <Button onClick={() => setLocation(inventoryPath)}>Open my listings</Button>
          </div>
        ) : showResumeDraftDialog ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            {/* Content hidden while dialog is open */}
          </div>
        ) : (
          <>
            <header className="mb-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setLocation(workspaceReturn.href)}
                  className="h-auto rounded-full px-0 text-sm font-medium text-slate-600 hover:bg-transparent hover:text-[var(--primary)]"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {workspaceReturn.label}
                </Button>
                <span className="rounded-full border border-[color:color-mix(in_oklab,var(--primary)_16%,white)] bg-[color:color-mix(in_oklab,var(--primary)_6%,white)] px-3 py-1 text-[11px] font-semibold text-[var(--primary)]">
                  {isEditMode ? 'Listing editor' : 'Listing workspace'}
                </span>
              </div>

              <div className="mt-6 max-w-2xl">
                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[38px]">
                  {isEditMode ? 'Update your property listing' : 'Create a property listing'}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-[15px]">
                  {isEditMode
                    ? 'Review the details, keep the property accurate, and submit changes when it is ready.'
                    : 'Complete the essentials to publish a property, start discovery, and receive enquiries in your workspace.'}
                </p>
              </div>

              {showReadinessReview && (
                <div className="mt-4 flex items-center gap-3">
                  <div className="rounded-full border border-slate-200 bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                    <ReadinessIndicator
                      score={readiness.score}
                      missing={readiness.missing}
                      size="md"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      Readiness {readiness.score}% / {LISTING_SUBMISSION_READINESS_THRESHOLD}%
                    </p>
                    <p className="text-[11px] text-slate-500">Required before submission</p>
                  </div>
                </div>
              )}
            </header>

            {sellerProspectPrefill ? (
              <div
                className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
                data-testid="seller-prospect-listing-handoff"
              >
                <p className="font-semibold">Private seller-prospect handoff</p>
                <p className="mt-1 leading-6">
                  This listing is linked to a qualified seller opportunity. Verify the property
                  address and complete public listing content yourself; owner contacts and private
                  canvassing notes are never copied into the listing.
                </p>
              </div>
            ) : null}

            <p className="mb-4 text-xs text-slate-500" role="status">
              {autoSaveError
                ? 'Device recovery copy could not be saved.'
                : isAutoSaving
                  ? 'Saving progress on this device...'
                  : 'Device recovery stays in this browser. Use Save private draft to save to your account.'}
            </p>
            {/* Step Indicator */}
            <div className="mb-8">
              <ProgressIndicator
                steps={progressSteps}
                onStepClick={stepNumber => store.goToStep(stepNumber)}
              />
            </div>

            {/* Step Content */}
            <div
              key={draftContextKey}
              className="mb-8 rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)] sm:p-8"
            >
              {getCurrentStep()}
            </div>

            {showReadinessReview && (
              <div className="mb-8 rounded-2xl border border-slate-200 bg-white/90 p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-slate-600" />
                    <p className="text-sm font-semibold text-slate-800">
                      Readiness Checklist ({readiness.score}% / required{' '}
                      {LISTING_SUBMISSION_READINESS_THRESHOLD}%)
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Quality score is separate and does not replace readiness.
                  </p>
                </div>
                {readinessMissingItems.length === 0 ? (
                  <p className="mt-3 text-sm text-green-700">
                    All readiness requirements are complete.
                  </p>
                ) : (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {readinessMissingItems.map((item, index) => (
                      <div
                        key={`${item.section}-${item.field}-${index}`}
                        className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                      >
                        <span className="font-semibold">{item.section}:</span> {item.field}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {serverDraftId && !isEditMode && currentListingStatus === 'draft' && (
              <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-950">Private server draft saved</p>
                  <p className="mt-1 text-sm text-blue-800">
                    Further saves and review submission use this same owned draft.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="border-blue-300 bg-white text-blue-900 hover:bg-blue-100"
                  onClick={() => setLocation(`/listings/create?id=${serverDraftId}&edit=true`)}
                >
                  Open saved draft
                </Button>
              </div>
            )}

            {createUncertain && !isSavingDraft && !isSubmitting && (
              <div
                role="alert"
                className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-3"
              >
                <p>
                  A save may already have created your draft. Your form is retained. Check your
                  owned listings before another create.
                </p>
                <Button onClick={() => setLocation(inventoryPath)}>Open my listings</Button>
                <Button onClick={checkOwnedInventory}>Check saved drafts</Button>
                {reconciliationDrafts && (
                  <label className="block">
                    Choose your saved draft
                    <select
                      aria-label="Choose your saved draft"
                      value={reconcileId}
                      onChange={event => setReconcileId(event.target.value)}
                    >
                      <option value="">Select a draft</option>
                      {reconciliationDrafts.map(draft => (
                        <option key={draft.id} value={draft.id}>
                          {draft.title}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {reconciliationDrafts?.length === 100 && (
                  <p>
                    More drafts may be available. Check your full listings workspace before
                    continuing.
                  </p>
                )}
                <Button onClick={reconcileOwnedDraft}>Continue with this saved draft</Button>
                <label className="block">
                  <input
                    type="checkbox"
                    checked={inventoryChecked}
                    onChange={event => setInventoryChecked(event.target.checked)}
                  />
                  I checked my listings and confirmed no draft was created
                </label>
                <Button
                  disabled={
                    !inventoryChecked ||
                    !reconciliationDrafts ||
                    reconciliationDrafts.length === 100 ||
                    isSavingDraft ||
                    isSubmitting
                  }
                  onClick={() => {
                    if (
                      hasPendingOperation() ||
                      !inventoryChecked ||
                      !reconciliationDrafts ||
                      reconciliationDrafts.length === 100
                    )
                      return;
                    localStorage.removeItem(uncertainStorageKey);
                    setCreateUncertain(false);
                    setInventoryChecked(false);
                  }}
                >
                  Allow a new save after checking listings
                </Button>
              </div>
            )}

            {serverDraftId && (
              <Button
                variant="ghost"
                disabled={isSubmitting || isSavingDraft || createUncertain}
                onClick={handleStartFresh}
              >
                Start a new draft
              </Button>
            )}
            {/* Navigation */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={store.prevStep}
                  disabled={store.currentStep === 1 || isSubmitting}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                {canSavePrivateDraft && (
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={
                      isSavingDraft ||
                      isSubmitting ||
                      createUncertain ||
                      !preflight?.canPrepareDraft
                    }
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSavingDraft ? 'Saving private draft...' : 'Save private draft'}
                  </Button>
                )}
                {draftSaved && <span role="status">Private draft saved to your account</span>}
              </div>

              {store.currentStep < 8 ? (
                <Button
                  onClick={store.nextStep}
                  disabled={isSubmitting || !canAdvanceFromCurrentStep}
                  className="self-end bg-[var(--primary)] shadow-[0_8px_20px_rgba(0,92,168,0.2)] hover:bg-[color:color-mix(in_oklab,var(--primary)_86%,black)] sm:self-auto"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <div className="flex self-end flex-col items-end gap-2 sm:self-auto">
                  {readiness.score < LISTING_SUBMISSION_READINESS_THRESHOLD && (
                    <span className="text-xs text-amber-600 font-medium">
                      Readiness is {readiness.score}%. Complete checklist items to reach{' '}
                      {LISTING_SUBMISSION_READINESS_THRESHOLD}%.
                    </span>
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      isSubmitting ||
                      isSavingDraft ||
                      createUncertain ||
                      readiness.score < LISTING_SUBMISSION_READINESS_THRESHOLD
                    }
                    className={
                      isSubmitting ||
                      isSavingDraft ||
                      createUncertain ||
                      readiness.score < LISTING_SUBMISSION_READINESS_THRESHOLD
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg'
                    }
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Listing'}
                    <Home className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>

            {/* Validation Errors */}
            {validationErrors &&
              (validationErrors.fieldErrors.length > 0 ||
                validationErrors.generalErrors.length > 0) && (
                <div className="mt-4">
                  <ValidationErrorList
                    fieldErrors={validationErrors.fieldErrors}
                    generalErrors={validationErrors.generalErrors}
                    onFieldClick={handleValidationFieldClick}
                    onDismiss={handleDismissValidationErrors}
                  />
                </div>
              )}

            {/* Error Alert with Recovery */}
            {apiError && !validationErrors && (
              <div className="mt-4">
                <ErrorAlert
                  type={apiError.type}
                  message={apiError.message}
                  retryable={apiError.isRecoverable && !createUncertain}
                  onRetry={handleRetry}
                  onDismiss={handleDismissError}
                  show={true}
                />
              </div>
            )}

            {/* Legacy Error Message (fallback) */}
            {submitError && !apiError && !validationErrors && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{submitError}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ListingWizard;
