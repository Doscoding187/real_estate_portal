import React, { useMemo, useState } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { usePublisherContext } from '@/hooks/usePublisherContext';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Edit2,
  MapPin,
  Clock,
  Home,
  Layers,
  Image as ImageIcon,
  Upload,
  Share2,
  Calendar,
  Smartphone,
  Monitor,
  Maximize,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { HouseMeasureIcon } from '@/components/icons/HouseMeasureIcon';
import {
  buildDevelopmentEditSavePayload,
  buildDevelopmentSubmitPayload,
  normalizeAmenitiesPayload,
} from '@/lib/developmentSubmitPayload';

interface FinalisationPhaseProps {
  onManualSaveDraft?: () => void | Promise<unknown>;
  isManualSaveDraftPending?: boolean;
}

type FinalisationLane = 'sale' | 'rental' | 'auction';

export const getFinalisationLane = (transactionType: unknown): FinalisationLane => {
  const normalized = String(transactionType || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');

  if (['for-rent', 'to-rent', 'rent', 'rental', 'lease'].includes(normalized)) return 'rental';
  if (['auction', 'on-auction'].includes(normalized)) return 'auction';
  return 'sale';
};

export const getFinalisationPriceLine = (
  transactionType: unknown,
  renderedPrice: string,
): string => {
  const lane = getFinalisationLane(transactionType);
  const price = renderedPrice && renderedPrice !== '---' ? renderedPrice : '---';

  if (lane === 'rental') return `Rent from R ${price} / month`;
  if (lane === 'auction') return `Starting bid R ${price}`;
  return `From R ${price}`;
};

export const getFinalisationAvailabilityLabel = (
  transactionType: unknown,
  availableUnits: unknown,
): string => {
  const lane = getFinalisationLane(transactionType);
  const parsed =
    typeof availableUnits === 'number'
      ? availableUnits
      : Number(String(availableUnits ?? '').trim());
  const count = Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;

  if (lane === 'rental') return count > 0 ? `${count} rentals available` : 'Fully let';
  if (lane === 'auction') return count > 0 ? `${count} lots open` : 'Auction closed';
  return count > 0 ? `${count} Avail` : 'Sold out';
};

export const getFinalisationPublishCopy = (transactionType: unknown) => {
  const lane = getFinalisationLane(transactionType);

  if (lane === 'rental') {
    return {
      previewHeading: 'Rental Preview',
      publishButton: 'Publish Rental Package',
      terms: 'By publishing, you agree to rental package terms.',
      confirmTitle: 'Confirm Rental Publication',
      confirmDescription:
        'You are about to make this rental package live to renters. This will activate rental search visibility, leasing-team enquiries, and rental-pack requests.',
      validationTitle: 'Rental Package Ready',
      validationDescription:
        'Your rental package meets the required rent, availability, media, and lead-context standards.',
      confirmButton: 'Confirm & Publish Rental',
    };
  }

  if (lane === 'auction') {
    return {
      previewHeading: 'Auction Preview',
      publishButton: 'Publish Auction Package',
      terms: 'By publishing, you agree to auction package terms.',
      confirmTitle: 'Confirm Auction Publication',
      confirmDescription:
        'You are about to make this auction package live to bidders. This will activate auction search visibility, auction-team enquiries, and bidder-pack requests.',
      validationTitle: 'Auction Package Ready',
      validationDescription:
        'Your auction package meets the required bid, auction-window, media, and lead-context standards.',
      confirmButton: 'Confirm & Publish Auction',
    };
  }

  return {
    previewHeading: 'Live Preview Mode',
    publishButton: 'Publish Listing',
    terms: 'By publishing, you agree to our listing terms.',
    confirmTitle: 'Confirm Publication',
    confirmDescription:
      'You are about to make this listing live to the public. This will activate search indexing and notifications.',
    validationTitle: 'Passed Validation',
    validationDescription: 'Your listing meets 100% of the quality standards.',
    confirmButton: 'Confirm & Publish',
  };
};

export function FinalisationPhase({
  onManualSaveDraft,
  isManualSaveDraftPending = false,
}: FinalisationPhaseProps = {}) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const { context: publisherContext } = usePublisherContext();
  const store = useDevelopmentWizard();
  const stepAmenitiesRaw = useDevelopmentWizard(
    state => state.stepData?.amenities_features?.amenities,
  );
  const developmentAmenitiesRaw = useDevelopmentWizard(state => state.developmentData?.amenities);
  const selectedAmenitiesRaw = useDevelopmentWizard(state => state.selectedAmenities);

  // Canonical data source (Phase 2I)
  const wizardData = store.getWizardData();
  const isRent = wizardData.transactionType === 'for_rent';
  const isAuction = wizardData.transactionType === 'auction';
  const transactionType = wizardData.transactionType;
  const publishCopy = getFinalisationPublishCopy(transactionType);

  const stepAmenities = normalizeAmenitiesPayload(stepAmenitiesRaw);
  const developmentAmenities = normalizeAmenitiesPayload(developmentAmenitiesRaw);
  const selectedAmenities = normalizeAmenitiesPayload(selectedAmenitiesRaw);

  // Keep only UI-needed refs
  const {
    classification,
    listingIdentity,
    setPhase,
    reset,
    validateForPublish,
    getCardFieldRecommendations,
    residentialConfig,
  } = store;

  // Get editingId from store for edit mode detection
  const editingId = (store as any).editingId as number | undefined;

  const reviewAmenities = (() => {
    if (stepAmenities && stepAmenities.length > 0) return stepAmenities;
    if (editingId && developmentAmenities && developmentAmenities.length > 0)
      return developmentAmenities;
    if (selectedAmenities && selectedAmenities.length > 0) return selectedAmenities;
    return stepAmenities ?? developmentAmenities ?? selectedAmenities ?? [];
  })();

  const [showConfirmPublish, setShowConfirmPublish] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'desktop' | 'mobile'>('desktop');

  // Backend mutations
  const createDevelopment = trpc.developer.createDevelopment.useMutation();
  const updateDevelopment = trpc.developer.updateDevelopment.useMutation();
  const publishDevelopment = trpc.developer.publishDevelopment.useMutation();
  const createPublisherDevelopment = trpc.superAdminPublisher.createDevelopment.useMutation();
  const updatePublisherDevelopment = trpc.superAdminPublisher.updateDevelopment.useMutation();
  const publishPublisherDevelopment = trpc.superAdminPublisher.publishDevelopment.useMutation();

  // Run validation
  const validationResult = validateForPublish();
  const errors = validationResult?.errors || [];
  const warnings: string[] = getCardFieldRecommendations().filter(
    message => !errors.includes(message),
  );
  const canPublish = errors.length === 0;

  const formatDate = (value?: string | Date) => {
    if (!value) return 'TBD';
    if (value instanceof Date) return value.toLocaleDateString();
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'TBD';
    return parsed.toLocaleDateString();
  };

  const ownershipDisplay = useMemo(() => {
    const fromArray = Array.isArray((wizardData as any).ownershipTypes)
      ? ((wizardData as any).ownershipTypes as unknown[])
      : [];
    const fromLegacy = (wizardData as any).ownershipType
      ? [String((wizardData as any).ownershipType)]
      : [];
    const values = (fromArray.length ? fromArray : fromLegacy)
      .map(value => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);

    if (values.length === 0) return 'N/A';
    return values.map(value => value.replace(/-/g, ' ')).join(', ');
  }, [wizardData]);

  const isLand = wizardData.developmentType === 'land';

  const toDisplayInt = (value: unknown, fallback = 0) => {
    const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
  };

  const toDisplayNumber = (value: unknown, fallback = 0) => {
    const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim());
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const computeDisplayExtrasTotal = (extras: unknown) =>
    Array.isArray(extras)
      ? extras.reduce((sum, extra: any) => {
          const price = toDisplayNumber(extra?.price, 0);
          return sum + (price > 0 ? price : 0);
        }, 0)
      : 0;

  const computeDisplayUnitTotalFrom = (unit: any) => {
    const base = toDisplayNumber(unit?.basePriceFrom ?? unit?.priceFrom, 0);
    return base + computeDisplayExtrasTotal(unit?.extras);
  };

  const getDisplayUnitRentFrom = (unit: any) =>
    toDisplayNumber(unit?.monthlyRentFrom ?? unit?.monthlyRent ?? 0, 0);

  const getDisplayUnitRentTo = (unit: any) => {
    const rentTo = toDisplayNumber(unit?.monthlyRentTo ?? 0, 0);
    const rentFrom = getDisplayUnitRentFrom(unit);
    return rentTo > 0 ? rentTo : rentFrom;
  };

  const previewAuctionRange = useMemo(() => {
    const emptyRange = {
      auctionStartDate: undefined as Date | undefined,
      auctionEndDate: undefined as Date | undefined,
      startingBidFrom: undefined as number | undefined,
    };

    if (isLand) return emptyRange;

    const rawUnits = (wizardData.unitTypes ?? []) as any[];
    const starts = rawUnits
      .map(unit => (unit?.auctionStartDate ? new Date(unit.auctionStartDate) : null))
      .filter((date): date is Date => Boolean(date && !Number.isNaN(date.getTime())));
    const ends = rawUnits
      .map(unit => (unit?.auctionEndDate ? new Date(unit.auctionEndDate) : null))
      .filter((date): date is Date => Boolean(date && !Number.isNaN(date.getTime())));
    const bids = rawUnits.map(unit => toDisplayNumber(unit?.startingBid, 0)).filter(bid => bid > 0);

    return {
      auctionStartDate: starts.length
        ? new Date(Math.min(...starts.map(date => date.getTime())))
        : undefined,
      auctionEndDate: ends.length
        ? new Date(Math.max(...ends.map(date => date.getTime())))
        : undefined,
      startingBidFrom: bids.length ? Math.min(...bids) : undefined,
    };
  }, [isLand, wizardData.unitTypes]);

  const handlePublish = async () => {
    const amenitiesPayload = reviewAmenities;

    // SECURITY: Warn if unit types are missing (Mass Deletion Prevention)
    if (!isLand && (wizardData.unitTypes ?? []).length === 0) {
      console.warn('[FinalisationPhase] No unit types in payload');
      const confirm = window.confirm(
        'WARNING: No unit types found in this submission.\n\nSaving now will DELETE ALL existing unit types.\n\nAre you sure you want to continue?',
      );
      if (!confirm) return;
    }

    if (isSuperAdmin && !publisherContext?.brandProfileId) {
      toast.error('Select a publisher brand context before publishing.');
      return;
    }

    if (isPublishing) return;
    setIsPublishing(true);

    try {
      const canonicalSnapshot = store.getDraftData();
      const payloadInput = {
        wizardData: wizardData as any,
        amenities: amenitiesPayload,
        canonicalSnapshot,
        residentialConfig: residentialConfig as any,
        landConfig: (store as any).landConfig,
        commercialConfig: (store as any).commercialConfig,
        mixedUseConfig: (store as any).mixedUseConfig,
        specifications: (store as any).specifications,
        fallbackOwnershipType: (store as any).developmentData?.ownershipType,
      };
      const payload: Record<string, any> = editingId
        ? buildDevelopmentEditSavePayload(payloadInput, {
            intent: 'publish',
            previousCanonicalSnapshot:
              typeof (store as any).getPersistedEditSnapshot === 'function'
                ? (store as any).getPersistedEditSnapshot()
                : ((store as any).persistedEditSnapshot ?? undefined),
          })
        : buildDevelopmentSubmitPayload(payloadInput);

      console.log('[FinalisationPhase] Payload Preview:', payload);

      let developmentId: number;
      const publisherBrandProfileId = publisherContext?.brandProfileId ?? null;
      const shouldUseSuperAdminFlow = isSuperAdmin && typeof publisherBrandProfileId === 'number';

      if (editingId && shouldUseSuperAdminFlow) {
        console.log('[FinalisationPhase] Executing SUPER ADMIN UPDATE for ID:', editingId);
        await updatePublisherDevelopment.mutateAsync({
          brandProfileId: publisherBrandProfileId,
          developmentId: editingId,
          data: {
            ...payload,
            brandProfileId: publisherBrandProfileId,
            developerBrandProfileId: publisherBrandProfileId,
            devOwnerType: 'platform',
          },
        });
        developmentId = editingId;
        toast.success('Development saved successfully!');
      } else if (editingId) {
        // UPDATE OPERATION
        console.log('[FinalisationPhase] Executing UPDATE for ID:', editingId);
        await updateDevelopment.mutateAsync({
          id: editingId,
          data: payload,
        });
        developmentId = editingId;
        toast.success('Development saved successfully!');
      } else {
        // CREATE OPERATION
        console.log('[FinalisationPhase] Executing CREATE');

        if (shouldUseSuperAdminFlow) {
          // SUPER ADMIN WITH PUBLISHER CONTEXT: route through publisher endpoints
          console.log(
            '[FinalisationPhase] Using Super Admin flow with publisher context:',
            publisherBrandProfileId,
          );

          const superAdminPayload: any = {
            ...payload,
            // Ensure brandProfileId is set from publisher context
            brandProfileId: publisherBrandProfileId,
            developerBrandProfileId: publisherBrandProfileId,
            devOwnerType: 'platform',
          };

          const result = await createPublisherDevelopment.mutateAsync(superAdminPayload);
          developmentId = result.development.id;
        } else {
          // REGULAR FLOW: use existing developer endpoint
          console.log('[FinalisationPhase] Using regular developer endpoint');

          // Identity & Branding logic
          const isBrandDevelopment =
            listingIdentity?.identityType === 'brand' ||
            listingIdentity?.identityType === 'marketing_agency';

          const createPayload: any = {
            ...payload,
            // Identity & Branding
            brandProfileId: isBrandDevelopment
              ? listingIdentity?.developerBrandProfileId
              : undefined,
            marketingBrandProfileId:
              listingIdentity?.identityType === 'marketing_agency'
                ? listingIdentity.marketingBrandProfileId
                : undefined,
            marketingRole: listingIdentity?.marketingRole || 'exclusive',
          };

          const result = await createDevelopment.mutateAsync(createPayload);
          developmentId = result.development.id;
        }
      }

      // Now publish (submit for review)
      console.log('[FinalisationPhase] Publishing development:', developmentId);
      if (shouldUseSuperAdminFlow) {
        await publishPublisherDevelopment.mutateAsync({
          brandProfileId: publisherBrandProfileId,
          developmentId,
        });
      } else {
        await publishDevelopment.mutateAsync({ id: developmentId });
      }

      setShowConfirmPublish(false);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      toast.success('Development submitted for review!');

      reset();
      navigate(isSuperAdmin ? '/admin/overview' : '/developer/developments');
    } catch (error: any) {
      console.error('[FinalisationPhase] Publish failed:', error);

      const cause = error?.data?.cause ?? error?.shape?.data?.cause;

      const validationErrors = cause?.validationErrors;
      const legacyErrors = cause?.errors;
      const primaryMessage = error?.message || 'Failed to publish development';

      const focusField = (fieldKey: string) => {
        const base = fieldKey.split('[')[0];
        const root = base.split('.')[0];

        const fieldToPhase: Record<string, number> = {
          name: 4,
          developmentName: 4,
          nature: 4,
          status: 4,
          launchDate: 4,
          completionDate: 4,
          expectedFirstHandoverDate: 4,
          handoverDuringConstruction: 4,
          ownershipType: 4,
          ownershipTypes: 4,
          transactionType: 4,

          address: 5,
          city: 5,
          province: 5,
          suburb: 5,
          postalCode: 5,
          latitude: 5,
          longitude: 5,
          location: 5,
          'location.address': 5,
          'location.city': 5,
          'location.province': 5,

          media: 9,
          images: 9,
          heroImage: 9,
          'media.heroImage': 9,
          'media.heroImage.url': 9,

          unitTypes: 10,
          parkingType: 10,
          parkingBays: 10,
          bedrooms: 10,
          bathrooms: 10,
          basePriceFrom: 10,
        };

        const targetPhase = fieldToPhase[fieldKey] ?? fieldToPhase[base] ?? fieldToPhase[root];

        if (targetPhase) setPhase(targetPhase);

        setTimeout(() => {
          const el =
            document.querySelector(`[data-field="${fieldKey}"]`) ||
            document.querySelector(`[data-field="${base}"]`) ||
            document.querySelector(`[name="${fieldKey}"]`) ||
            document.querySelector(`[name="${base}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (el as HTMLElement | null)?.focus?.();
        }, 250);
      };

      if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        toast.error(
          <div className="max-w-md">
            <p className="font-semibold mb-2">Cannot publish development:</p>
            <ul className="space-y-1 text-sm">
              {validationErrors.map((err: { field: string; message: string }, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{err.message}</span>
                </li>
              ))}
            </ul>
          </div>,
          { duration: 10000 },
        );

        if (validationErrors[0]?.field) focusField(validationErrors[0].field);
        return;
      }

      if (Array.isArray(legacyErrors) && legacyErrors.length > 0) {
        toast.error(
          <div className="max-w-md">
            <p className="font-semibold mb-2">Cannot publish development:</p>
            <ul className="space-y-1 text-sm">
              {legacyErrors.map((msg: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{msg}</span>
                </li>
              ))}
            </ul>
          </div>,
          { duration: 10000 },
        );
        return;
      }

      toast.error(primaryMessage, {
        description: 'Please check your connection and try again.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Render Section Helper
  const ReviewSection = ({
    title,
    icon: Icon,
    step: _step,
    data,
    onEdit,
  }: {
    title: string;
    icon: any;
    step: number;
    data: React.ReactNode;
    onEdit: () => void;
  }) => (
    <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
      <div className="bg-slate-50 px-4 py-3 flex justify-between items-center border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-sm text-slate-800">{title}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Edit2 className="w-3 h-3 mr-1" /> Edit
        </Button>
      </div>
      <div className="p-4 text-sm text-slate-600">{data}</div>
    </div>
  );

  const renderUnitPriceLabel = (u: any) => {
    if (isRent) {
      const rentFrom = getDisplayUnitRentFrom(u);
      const rentTo = getDisplayUnitRentTo(u);
      const value = rentFrom > 0 ? rentFrom : rentTo;
      if (!value || value <= 0) return '---';
      return value.toLocaleString();
    }
    if (isAuction) {
      const startingBid = Number(u?.startingBid ?? 0);
      if (!startingBid || startingBid <= 0) return '---';
      return `${startingBid.toLocaleString()} (starting bid)`;
    }
    const total = computeDisplayUnitTotalFrom(u);
    if (!total || total <= 0) return '---';
    return total.toLocaleString();
  };

  const renderUnitSizeLabel = (u: any) => {
    const unitSize = toDisplayInt(u?.unitSize, 0);
    if (unitSize > 0) return `${unitSize}m²`;
    return '—';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Review & Publish</h2>
        <p className="text-slate-600">Finalize your listing details before going live.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Col: Validation & Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Validation Dashboard */}
          <Card className={!canPublish ? 'border-red-200 shadow-sm' : 'border-green-200 shadow-sm'}>
            <CardHeader className={!canPublish ? 'bg-red-50/50 pb-4' : 'bg-green-50/50 pb-4'}>
              <div className="flex items-start gap-4">
                <div
                  className={
                    !canPublish
                      ? 'p-2 bg-red-100 rounded-full text-red-600'
                      : 'p-2 bg-green-100 rounded-full text-green-600'
                  }
                >
                  {!canPublish ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <CardTitle className={!canPublish ? 'text-red-900' : 'text-green-900'}>
                    {!canPublish ? 'Action Required' : 'Ready to Publish'}
                  </CardTitle>
                  <CardDescription className={!canPublish ? 'text-red-700' : 'text-green-700'}>
                    {!canPublish
                      ? `Please resolve ${errors.length} error${errors.length > 1 ? 's' : ''} to continue.`
                      : 'All required fields are complete. You can schedule or publish now.'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            {(!canPublish || warnings.length > 0) && (
              <CardContent className="pt-4 space-y-3">
                {errors.map((err, idx) => (
                  <Alert key={`err-${idx}`} variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Missing Requirement</AlertTitle>
                    <AlertDescription>{err}</AlertDescription>
                  </Alert>
                ))}
                {warnings.map((warn: string, idx: number) => (
                  <Alert
                    key={`warn-${idx}`}
                    className="bg-amber-50 border-amber-200 text-amber-800"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-900">Recommendation</AlertTitle>
                    <AlertDescription>{warn}</AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Detailed Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Listing Details</h3>

            <ReviewSection
              title="Identity & Type"
              icon={Home}
              step={1}
              onEdit={() => setPhase(1)}
              data={
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs uppercase text-slate-400 font-semibold tracking-wider">
                      Name
                    </span>
                    <span className="font-medium text-slate-900">
                      {wizardData.name || 'Untitled'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase text-slate-400 font-semibold tracking-wider">
                      Type
                    </span>
                    <span className="font-medium text-slate-900 capitalize">
                      {classification?.type?.replace('_', ' ')} | {ownershipDisplay}
                    </span>
                  </div>
                </div>
              }
            />

            <ReviewSection
              title="Location"
              icon={MapPin}
              step={2}
              onEdit={() => setPhase(5)}
              data={
                <div>
                  <span className="block text-xs uppercase text-slate-400 font-semibold tracking-wider">
                    Address
                  </span>
                  <span className="font-medium text-slate-900">
                    {wizardData.location?.address || 'Address not set'}
                  </span>
                  <div className="mt-2 h-24 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-xs text-slate-400">
                    Map Preview
                  </div>
                </div>
              }
            />

            <ReviewSection
              title="Amenities & Features"
              icon={Share2}
              step={6}
              onEdit={() => setPhase(7)}
              data={
                <div className="flex flex-wrap gap-2">
                  {reviewAmenities.map((a: string) => (
                    <Badge key={a} variant="secondary" className="bg-slate-100 text-slate-700">
                      {a}
                    </Badge>
                  ))}
                  {reviewAmenities.length === 0 && (
                    <span className="text-slate-400 italic">No amenities selected</span>
                  )}
                </div>
              }
            />

            <ReviewSection
              title="Marketing & Media"
              icon={ImageIcon}
              step={8}
              onEdit={() => setPhase(9)}
              data={
                <div className="space-y-3">
                  <p className="line-clamp-2 italic text-slate-500">
                    "{wizardData.description || 'No description provided'}"
                  </p>
                  <div className="flex gap-4 text-xs font-medium text-slate-700 border-t pt-2">
                    <span>{wizardData.heroImage ? '✅ Hero Image' : '❌ No Hero'}</span>
                    <span>{(wizardData.media as any)?.photos?.length || 0} Photos</span>
                    <span>{(wizardData.media as any)?.videos?.length || 0} Videos</span>
                    <span>{(wizardData.media as any)?.documents?.length || 0} Docs</span>
                  </div>

                  {((wizardData as any).transferCostsIncluded ||
                    (wizardData as any).reservePriceIncluded) && (
                    <div className="flex gap-2 mt-2 pt-2 border-t">
                      {(wizardData as any).transferCostsIncluded && (
                        <Badge
                          variant="outline"
                          className="text-emerald-700 bg-emerald-50 border-emerald-200"
                        >
                          Transfer Costs Included
                        </Badge>
                      )}
                      {(wizardData as any).reservePriceIncluded && (
                        <Badge
                          variant="outline"
                          className="text-amber-700 bg-amber-50 border-amber-200"
                        >
                          Reserve: R{' '}
                          {(wizardData as any).reservePriceAmount?.toLocaleString() || '---'}
                        </Badge>
                      )}
                    </div>
                  )}

                  {wizardData.highlights && wizardData.highlights.length > 0 && (
                    <div className="pt-3 mt-3 border-t border-slate-100">
                      <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider block mb-2">
                        Key Selling Points
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {wizardData.highlights.map((h: string, i: number) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-[10px] font-normal px-2 py-0.5 bg-slate-100 text-slate-600 border-slate-200"
                          >
                            {h}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              }
            />

            <ReviewSection
              title="Unit Configuration"
              icon={Layers}
              step={9}
              onEdit={() => setPhase(10)}
              data={
                <div className="space-y-2">
                  {(wizardData.unitTypes ?? []).length === 0 ? (
                    <span className="text-red-500 italic">No unit types defined</span>
                  ) : (
                    (wizardData.unitTypes ?? []).map((u: any) => (
                      <div
                        key={u.id}
                        className="flex justify-between items-center bg-slate-50 p-2 rounded"
                      >
                        <span className="font-medium">{u.name}</span>
                        <div className="flex gap-3 text-xs text-slate-500">
                          <span>{u.bedrooms} Bed</span>
                          <span>{u.bathrooms} Bath</span>
                          <span>
                            {getFinalisationPriceLine(transactionType, renderUnitPriceLabel(u))}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              (toDisplayInt(u?.availableUnits, 0) ?? 0) > 0
                                ? 'text-green-600 border-green-200'
                                : 'text-red-600 border-red-200'
                            }
                          >
                            {getFinalisationAvailabilityLabel(
                              transactionType,
                              toDisplayInt(u?.availableUnits, 0),
                            )}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              }
            />
          </div>
        </div>

        {/* Right Col: Preview & Actions */}
        <div className="space-y-6">
          {/* Control Panel */}
          <Card className="sticky top-6 border-slate-200 shadow-md">
            <CardHeader className="bg-slate-50 border-b pb-4">
              <CardTitle className="text-lg">Publishing Controls</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="w-full text-xs">
                  <Calendar className="w-3.5 h-3.5 mr-2" /> Schedule
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  disabled={isManualSaveDraftPending}
                  onClick={async () => {
                    if (!onManualSaveDraft) {
                      toast.error('Draft saving unavailable');
                      return;
                    }
                    await onManualSaveDraft();
                  }}
                >
                  {isManualSaveDraftPending ? 'Saving...' : 'Save Draft'}
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <Button
                  className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                  disabled={!canPublish}
                  onClick={() => setShowConfirmPublish(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {publishCopy.publishButton}
                </Button>
                {!canPublish && (
                  <p className="text-xs text-center text-red-500">
                    Resolve validation errors to publish.
                  </p>
                )}
                <p className="text-xs text-center text-slate-400">
                  {publishCopy.terms}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview Widget */}
          <Card>
            <CardHeader className="pb-2 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium uppercase tracking-wide text-slate-500">
                  {publishCopy.previewHeading}
                </CardTitle>
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setActivePreviewTab('desktop')}
                    className={`p-1.5 rounded ${
                      activePreviewTab === 'desktop'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('mobile')}
                    className={`p-1.5 rounded ${
                      activePreviewTab === 'mobile'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div
                className={`mx-auto bg-slate-100 overflow-hidden transition-all duration-300 ${
                  activePreviewTab === 'mobile'
                    ? 'w-[280px] h-[500px] my-4 rounded-[2rem] border-4 border-slate-800 shadow-xl'
                    : 'w-full h-[400px]'
                }`}
              >
                <div className="bg-white w-full h-full flex flex-col overflow-y-auto">
                  <div className="h-1/3 bg-slate-200 relative">
                    {wizardData.heroImage ? (
                      <img
                        src={wizardData.heroImage as string}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400">
                        <ImageIcon />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                      <h1 className="text-white font-bold text-sm leading-tight">
                        {wizardData.name || 'Development Name'}
                      </h1>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-slate-700 uppercase">
                        {getFinalisationPriceLine(
                          transactionType,
                          renderUnitPriceLabel((wizardData.unitTypes ?? [])[0]),
                        )}
                      </h3>
                      <p className="text-[10px] text-slate-500 line-clamp-2">
                        {wizardData.description || 'Description...'}
                      </p>
                    </div>

                    {isAuction && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2 text-[10px] text-amber-800">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span className="font-medium text-amber-900">
                            Auction: {formatDate(previewAuctionRange.auctionStartDate)} -{' '}
                            {formatDate(previewAuctionRange.auctionEndDate)}
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-700 mt-1">
                          Starting from R
                          {previewAuctionRange.startingBidFrom
                            ? previewAuctionRange.startingBidFrom.toLocaleString()
                            : '---'}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {(wizardData.unitTypes ?? []).slice(0, 2).map((u: any) => (
                        <div key={u.id} className="bg-slate-50 p-2 rounded border border-slate-100">
                          <div className="text-[10px] font-bold">{u.name}</div>
                          <div className="text-[9px] text-slate-500 flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              {u.bedrooms} Bed &bull; <HouseMeasureIcon className="w-3 h-3" />{' '}
                              {renderUnitSizeLabel(u)}
                            </span>
                            {u.yardSize && u.yardSize > 0 && (
                              <span className="text-green-600 flex items-center gap-0.5">
                                <Maximize className="w-2 h-2" /> {u.yardSize}m²
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmPublish} onOpenChange={setShowConfirmPublish}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{publishCopy.confirmTitle}</DialogTitle>
            <DialogDescription>
              <strong>{wizardData.name}</strong>: {publishCopy.confirmDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <AlertTitle className="text-blue-900">{publishCopy.validationTitle}</AlertTitle>
              <AlertDescription>{publishCopy.validationDescription}</AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmPublish(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPublishing ? 'Publishing...' : publishCopy.confirmButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
