import React, { useRef, useState } from 'react';
import { useDevelopmentWizard } from '@/hooks/useDevelopmentWizard';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
import {
  invalidateDeveloperOperatingHomeRanges,
  invalidateDevelopmentHomeRanges,
} from '@/lib/developmentHomeInvalidation';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { usePublisherContext } from '@/hooks/usePublisherContext';
import { buildDevelopmentSubmitPayload } from '@/lib/developmentSubmitPayload';
import { CheckCircle2, AlertCircle, AlertTriangle, Edit2, Upload, Calendar } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  REVIEW_SECTION_STEP,
  REVIEW_SECTION_TITLES,
  buildReviewModel,
  describePublishFailure,
  publishConfirmText,
  type PublishFailure,
  stepForIssue,
  stepTitle,
  type ReviewRow,
  type ReviewSectionId,
} from '@/lib/wizardReview';
import { iconForAmenity, iconForStep } from '../../wizard/wizardIcons';

interface FinalisationPhaseProps {
  onSaveDraft?: () => Promise<void> | void;
  isSavingDraft?: boolean;
}

export function FinalisationPhase({
  onSaveDraft,
  isSavingDraft = false,
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

  const normalizeAmenitiesPayload = (value: unknown): string[] | undefined => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
      } catch {
        // fall through to treat as plain string
      }
      return [trimmed];
    }
    if (typeof value === 'object') {
      const standard = Array.isArray((value as any).standard) ? (value as any).standard : [];
      const additional = Array.isArray((value as any).additional) ? (value as any).additional : [];
      const merged = [...standard, ...additional].filter(Boolean).map(String);
      return merged.length ? merged : undefined;
    }
    return undefined;
  };

  const stepAmenities = normalizeAmenitiesPayload(stepAmenitiesRaw);
  const developmentAmenities = normalizeAmenitiesPayload(developmentAmenitiesRaw);
  const selectedAmenities = normalizeAmenitiesPayload(selectedAmenitiesRaw);

  // Keep only UI-needed refs
  const {
    listingIdentity,
    setWorkflowStep,
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
  const [publishError, setPublishError] = useState<PublishFailure | null>(null);
  // The development a first attempt created: a retry after a refused publish updates it
  // instead of creating a second copy.
  const createdIdRef = useRef<number | null>(null);
  const utils = trpc.useUtils();

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
  const publisherId = publisherContext?.cataloguePublisherId ?? null;
  const shouldUseSuperAdminFlow = isSuperAdmin && typeof publisherId === 'number';
  const finalisationCopy = shouldUseSuperAdminFlow
    ? {
        heading: 'Review & Publish',
        description: 'Finalize the curated catalogue details before publishing.',
        readinessTitle: 'Ready to Publish',
        readinessDescription:
          'All required fields are complete. An authorised Property Listify operator can publish this development.',
        controlTitle: 'Curated Publication Controls',
        action: 'Publish Development',
        disabledHelper: 'Resolve validation errors to publish.',
        terms: 'By publishing, you confirm the curated information is supported by the recorded source.',
        confirmTitle: 'Confirm Publication',
        confirmDescription:
          'You are about to publish this curated development to the Property Listify marketplace.',
        validationDescription: 'Your curated listing passed the canonical launch checks.',
        progress: 'Publishing...',
        confirmAction: 'Publish Development',
        success: 'Curated development published!',
        fallbackError: 'Failed to publish curated development',
        validationErrorTitle: 'Cannot publish curated development:',
      }
    : {
        heading: 'Review & Submit',
        description: 'Finalize your listing details before submitting for review.',
        readinessTitle: 'Ready to Submit for Review',
        readinessDescription:
          'All required fields are complete. You can submit this development for review.',
        controlTitle: 'Submission Controls',
        action: 'Submit for Review',
        disabledHelper: 'Resolve validation errors to submit for review.',
        terms: 'By submitting, you agree to our listing terms.',
        confirmTitle: 'Confirm Submission for Review',
        confirmDescription:
          'You are about to submit this development for review. It will not be visible publicly until an authorised reviewer approves and publishes it.',
        validationDescription: 'Your listing is ready for review.',
        progress: 'Submitting...',
        confirmAction: 'Confirm & Submit',
        success: 'Development submitted for review!',
        fallbackError: 'Failed to submit development for review',
        validationErrorTitle: 'Cannot submit development for review:',
      };

  const isLand = wizardData.developmentType === 'land';

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

    if (isSuperAdmin && !publisherContext?.cataloguePublisherId) {
      const message = 'Select a publisher brand context before publishing.';
      setPublishError({ message, details: [] });
      toast.error(message);
      return;
    }

    if (isPublishing) return;
    setPublishError(null);
    setIsPublishing(true);

    try {
      const payload = buildDevelopmentSubmitPayload({
        wizardData: wizardData as any,
        amenities: amenitiesPayload,
        residentialConfig: residentialConfig as any,
        landConfig: (store as any).landConfig,
        commercialConfig: (store as any).commercialConfig,
        mixedUseConfig: (store as any).mixedUseConfig,
        specifications: (store as any).specifications,
        fallbackOwnershipType: (store as any).developmentData?.ownershipType,
      });

      let developmentId: number;
      // Editing an existing development, or retrying after a refused first attempt that
      // already created one (never create a second copy).
      const existingId = editingId ?? createdIdRef.current ?? undefined;
      if (existingId && shouldUseSuperAdminFlow) {
        await updatePublisherDevelopment.mutateAsync({
          cataloguePublisherId: publisherId,
          developmentId: existingId,
          data: {
            ...payload,
            cataloguePublisherId: publisherId,
          },
        });
        developmentId = existingId;
        toast.success('Development saved successfully!');
      } else if (existingId) {
        // UPDATE OPERATION
        await updateDevelopment.mutateAsync({
          id: existingId,
          data: payload,
        });
        developmentId = existingId;
        toast.success('Development saved successfully!');
      } else {
        // CREATE OPERATION
        if (shouldUseSuperAdminFlow) {
          // SUPER ADMIN WITH PUBLISHER CONTEXT: route through publisher endpoints
          const superAdminPayload = {
            ...payload,
            // Ensure cataloguePublisherId is set from publisher context
            cataloguePublisherId: publisherId,
          };

          const result = await createPublisherDevelopment.mutateAsync(superAdminPayload);
          developmentId = result.development.id;
        } else {
          // Regular developers are bound to their server-resolved first-party
          // Catalogue Publisher. The browser cannot nominate another publisher.
          const createPayload = {
            ...payload,
            marketingRole: listingIdentity?.marketingRole || 'exclusive',
          };

          const result = await createDevelopment.mutateAsync(createPayload);
          developmentId = result.development.id;
        }
        createdIdRef.current = developmentId;
      }

      // Curated records use the privileged platform publication transition;
      // first-party records retain the existing developer submission flow.
      if (shouldUseSuperAdminFlow) {
        await publishPublisherDevelopment.mutateAsync({
          cataloguePublisherId: publisherId,
          developmentId,
        });
        // The suburb chosen in the Location step travels in estateSpecs and is
        // recorded by the server in the same transaction as publication.
      } else {
        await publishDevelopment.mutateAsync({ id: developmentId });
      }

      await invalidateDevelopmentHomeRanges(developmentId, input =>
        utils.developer.getDevelopmentHome.invalidate(input),
      );
      await invalidateDeveloperOperatingHomeRanges(input =>
        utils.developer.getOperatingHome.invalidate(input),
      );
      if (shouldUseSuperAdminFlow) {
        await utils.superAdminPublisher.getOperatingHome.invalidate({
          cataloguePublisherId: publisherId,
          range: '30d',
        });
        await utils.superAdminPublisher.getDevelopments.invalidate({
          cataloguePublisherId: publisherId,
        });
        try {
          // The publisher home is not mounted while the wizard is open, so an
          // invalidation alone can leave the operator's next screen showing
          // the pre-publication lifecycle state. Seed it with the canonical
          // post-publication read model before navigating back.
          await utils.superAdminPublisher.getOperatingHome.fetch({
            cataloguePublisherId: publisherId,
            range: '30d',
          });
        } catch (refreshError) {
          console.warn('[FinalisationPhase] Published, but publisher home refresh failed:', refreshError);
        }
      }

      setShowConfirmPublish(false);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      toast.success(finalisationCopy.success);

      reset();
      navigate(isSuperAdmin ? '/admin/publisher' : '/developer/developments');
    } catch (error: any) {
      console.error('[FinalisationPhase] Publish failed:', error);

      // Never swallow a refusal: the reason is shown inside the confirm dialog (which
      // stays open so it can be cancelled or retried) and as a toast.
      const failure = describePublishFailure(error, finalisationCopy.fallbackError);
      setPublishError(failure);
      toast.error(failure.message, {
        description: failure.details.length > 0 ? failure.details.join(' · ') : undefined,
        duration: 10000,
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const model = buildReviewModel(
    wizardData as any,
    reviewAmenities,
    String((wizardData as any).transactionType ?? 'for_sale'),
  );
  const unitCount = (wizardData.unitTypes ?? []).length;
  const confirmText = publishConfirmText({
    name: String(wizardData.name ?? ''),
    publisherName: (publisherContext as any)?.publisherName ?? null,
    houseTypeCount: unitCount,
    curated: shouldUseSuperAdminFlow,
  });
  const goToStep = (stepId: string) => setWorkflowStep(stepId as any);

  const Section = ({
    id,
    children,
  }: {
    id: ReviewSectionId;
    children: React.ReactNode;
  }) => {
    const stepId = REVIEW_SECTION_STEP[id];
    const Icon = iconForStep(stepId);
    return (
      <section
        data-testid={`review-${id}`}
        className="overflow-hidden rounded-lg border border-slate-200 bg-white"
      >
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-700">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-semibold text-slate-900">{REVIEW_SECTION_TITLES[id]}</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Edit ${REVIEW_SECTION_TITLES[id]}`}
            onClick={() => goToStep(stepId)}
            className="h-8 text-xs text-blue-700 hover:bg-blue-50"
          >
            <Edit2 className="mr-1 h-3 w-3" /> Edit
          </Button>
        </header>
        <div className="p-4 text-sm text-slate-700">{children}</div>
      </section>
    );
  };

  const Rows = ({ rows }: { rows: ReviewRow[] }) => (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[160px_1fr]">
      {rows.map(row => (
        <React.Fragment key={row.label}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {row.label}
          </dt>
          <dd
            className={
              row.value === 'Not given' || row.value === 'Not added' || row.value === 'None'
                ? 'text-slate-500'
                : 'font-medium text-slate-900'
            }
          >
            {row.value}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{finalisationCopy.heading}</h2>
        <p className="mt-1 text-sm text-slate-600">{finalisationCopy.description}</p>
      </div>

      {/* Readiness: ready, or exactly what is missing, each linking to its step */}
      <section
        data-testid="review-readiness"
        className={`rounded-lg border p-4 sm:p-6 ${
          canPublish ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg ${
              canPublish ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {canPublish ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-900">
              {canPublish ? finalisationCopy.readinessTitle : 'Action Required'}
            </h2>
            <p className="mt-1 text-sm text-slate-700">
              {canPublish
                ? finalisationCopy.readinessDescription
                : `${errors.length} thing${errors.length === 1 ? ' is' : 's are'} still missing. Each one links to its step.`}
            </p>
            {errors.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2" data-testid="review-missing">
                {errors.map((err, idx) => {
                  const stepId = stepForIssue(err);
                  return (
                    <li
                      key={`err-${idx}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-red-900"
                    >
                      <span className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-none text-red-600" />
                        {err}
                      </span>
                      {stepId ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToStep(stepId)}
                          className="h-8 text-xs"
                        >
                          Fix in {stepTitle(stepId)}
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            {warnings.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">
                {warnings.map((warn: string, idx: number) => {
                  const stepId = stepForIssue(warn);
                  return (
                    <li
                      key={`warn-${idx}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                    >
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 flex-none text-amber-600" />
                        {warn}
                      </span>
                      {stepId ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToStep(stepId)}
                          className="h-8 text-xs"
                        >
                          Open {stepTitle(stepId)}
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>

      <Section id="basics">
        <Rows rows={model.basics} />
      </Section>

      <Section id="about">
        <Rows rows={model.about} />
      </Section>

      <Section id="location">
        <Rows rows={model.location} />
      </Section>

      <Section id="costs">
        <Rows rows={model.costs} />
      </Section>

      <Section id="amenities">
        {model.amenities.length === 0 ? (
          <span className="text-slate-500">No amenities selected</span>
        ) : (
          <div className="flex flex-wrap gap-2" data-testid="review-amenity-chips">
            {model.amenities.map(label => {
              const Icon = iconForAmenity(label);
              return (
                <span
                  key={label}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-800"
                >
                  <Icon className="h-4 w-4 text-slate-600" aria-hidden="true" />
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </Section>

      <Section id="highlights">
        {model.highlights.shown.length === 0 ? (
          <span className="text-slate-500">No highlights added</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {model.highlights.shown.map(label => (
              <span
                key={label}
                className="inline-flex h-6 items-center rounded bg-orange-50 px-2 text-xs font-semibold text-orange-800"
              >
                {label}
              </span>
            ))}
            {model.highlights.more > 0 && (
              <span className="text-xs text-slate-600">+{model.highlights.more} more</span>
            )}
          </div>
        )}
      </Section>

      <Section id="media">
        <Rows rows={model.media} />
      </Section>

      <Section id="house_types">
        {model.houseTypes.length === 0 ? (
          <span className="text-red-600">No house types yet</span>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {model.houseTypes.map(h => (
              <div
                key={h.id}
                data-testid="review-house-type"
                className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-slate-900">{h.name}</span>
                  <span className="whitespace-nowrap font-semibold text-slate-900">{h.price}</span>
                </div>
                <span className="text-xs text-slate-700">{h.facts}</span>
                <span className="text-xs text-slate-700">{h.parking}</span>
                <span className="text-xs text-slate-600">
                  {[h.availability, h.media].filter(Boolean).join(' · ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Actions */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
        <h3 className="text-base font-semibold text-slate-900">{finalisationCopy.controlTitle}</h3>
        <div className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="w-full text-xs">
              <Calendar className="w-3.5 h-3.5 mr-2" /> Schedule
            </Button>
            <Button
              variant="outline"
              className="w-full text-xs"
              disabled={isSavingDraft}
              onClick={async () => {
                if (!onSaveDraft) {
                  toast.error('Draft save is unavailable');
                  return;
                }

                try {
                  await onSaveDraft();
                } catch {
                  // Parent handler surfaces the save failure to the user.
                }
              }}
            >
              {isSavingDraft ? 'Saving...' : 'Save Draft'}
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <Button
              className="h-12 w-full bg-blue-700 text-base hover:bg-blue-800"
              disabled={!canPublish}
              onClick={() => setShowConfirmPublish(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              {finalisationCopy.action}
            </Button>
            {!canPublish && (
              <p className="text-xs text-center text-red-600">{finalisationCopy.disabledHelper}</p>
            )}
            <p className="text-xs text-center text-slate-500">{finalisationCopy.terms}</p>
          </div>
        </div>
      </section>

      {/* Confirmation: states exactly what happens */}
      <Dialog
        open={showConfirmPublish}
        onOpenChange={open => {
          setShowConfirmPublish(open);
          if (!open) setPublishError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{finalisationCopy.confirmTitle}</DialogTitle>
            <DialogDescription data-testid="publish-confirm-text">{confirmText}</DialogDescription>
          </DialogHeader>
          {publishError ? (
            <div
              role="alert"
              data-testid="publish-error"
              className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900"
            >
              <p className="font-semibold">{publishError.message}</p>
              {publishError.details.length > 0 ? (
                <ul className="mt-1 list-disc pl-5">
                  {publishError.details.map(detail => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmPublish(false);
                setPublishError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPublishing ? finalisationCopy.progress : finalisationCopy.confirmAction}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
