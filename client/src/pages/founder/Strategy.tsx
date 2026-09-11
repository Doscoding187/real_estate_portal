import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/feedback-state';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { trpc } from '@/lib/trpc';
import { CancelObjectiveDialog } from '@/components/founder/strategy/CancelObjectiveDialog';
import { ObjectiveDetail } from '@/components/founder/strategy/ObjectiveDetail';
import {
  ObjectiveDialog,
  type ObjectiveFormValues,
} from '@/components/founder/strategy/ObjectiveDialog';
import { ObjectiveList } from '@/components/founder/strategy/ObjectiveList';
import {
  PlanningPeriodDialog,
  type PeriodFormValues,
} from '@/components/founder/strategy/PlanningPeriodDialog';
import { PlanningPeriodSelector } from '@/components/founder/strategy/PlanningPeriodSelector';
import { TargetDialog, type TargetFormValues } from '@/components/founder/strategy/TargetDialog';
import { getInitialPeriodId } from '@/components/founder/strategy/strategyPresentation';
import type {
  PlanningPeriod,
  StrategicObjective,
  StrategicTarget,
} from '@/components/founder/strategy/types';

type PeriodDialogMode = 'create' | 'edit' | null;
type ObjectiveDialogState =
  | { mode: 'create' }
  | { mode: 'edit'; objective: StrategicObjective }
  | null;
type TargetDialogState = { target: StrategicTarget | null } | null;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function DetailLoading() {
  return (
    <Card className="sticky top-6">
      <CardContent className="space-y-4 p-6" aria-label="Loading objective detail" aria-busy="true">
        <div className="h-5 w-20 animate-pulse rounded bg-slate-200" />
        <div className="h-7 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-16 animate-pulse rounded bg-slate-100" />
        <div className="h-40 animate-pulse rounded bg-slate-100" />
      </CardContent>
    </Card>
  );
}

export default function Strategy() {
  const utils = trpc.useUtils();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const periodsQuery = trpc.strategicPlanning.listPeriods.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<number | null>(null);
  const [periodDialogMode, setPeriodDialogMode] = useState<PeriodDialogMode>(null);
  const [objectiveDialog, setObjectiveDialog] = useState<ObjectiveDialogState>(null);
  const [targetDialog, setTargetDialog] = useState<TargetDialogState>(null);
  const [cancelObjectiveId, setCancelObjectiveId] = useState<number | null>(null);
  const [pendingObjectiveSelection, setPendingObjectiveSelection] = useState<number | null>(null);

  const periods = useMemo(() => (periodsQuery.data ?? []) as PlanningPeriod[], [periodsQuery.data]);
  const selectedPeriod = periods.find(period => period.id === selectedPeriodId) ?? null;

  const objectivesQuery = trpc.strategicPlanning.listObjectives.useQuery(
    selectedPeriodId ? { periodId: selectedPeriodId } : undefined,
    {
      enabled: selectedPeriodId !== null,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );
  const objectives = useMemo(
    () => (objectivesQuery.data ?? []) as StrategicObjective[],
    [objectivesQuery.data],
  );

  const selectedObjectiveQuery = trpc.strategicPlanning.getObjective.useQuery(
    { id: selectedObjectiveId ?? 0 },
    {
      enabled: selectedObjectiveId !== null,
      retry: false,
      refetchOnWindowFocus: false,
    },
  );
  const selectedObjective = (selectedObjectiveQuery.data ??
    objectives.find(objective => objective.id === selectedObjectiveId) ??
    null) as StrategicObjective | null;

  const ownerIds = useMemo(
    () =>
      Array.from(
        new Set(
          objectives
            .map(objective => objective.ownerUserId)
            .filter(
              (ownerId): ownerId is number => Number.isInteger(ownerId) && (ownerId ?? 0) > 0,
            ),
        ),
      ).slice(0, 50),
    [objectives],
  );
  const authoringReferenceQuery = trpc.strategicPlanning.getAuthoringReferenceData.useQuery(
    ownerIds.length > 0 ? { ownerIds } : undefined,
    { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
  );
  const metrics = authoringReferenceQuery.data?.metrics ?? [];
  const ownerNames = useMemo(
    () =>
      new Map(
        (authoringReferenceQuery.data?.owners ?? []).map(owner => [owner.id, owner.displayName]),
      ),
    [authoringReferenceQuery.data?.owners],
  );

  const createPeriod = trpc.strategicPlanning.createPeriod.useMutation();
  const updatePeriod = trpc.strategicPlanning.updatePeriod.useMutation();
  const createObjective = trpc.strategicPlanning.createObjective.useMutation();
  const updateObjective = trpc.strategicPlanning.updateObjective.useMutation();
  const activateObjective = trpc.strategicPlanning.activateObjective.useMutation();
  const completeObjective = trpc.strategicPlanning.completeObjective.useMutation();
  const cancelObjective = trpc.strategicPlanning.cancelObjective.useMutation();
  const createTarget = trpc.strategicPlanning.createTarget.useMutation();
  const updateTarget = trpc.strategicPlanning.updateTarget.useMutation();
  const removeTarget = trpc.strategicPlanning.removeTarget.useMutation();

  useEffect(() => {
    if (periods.length === 0) {
      if (selectedPeriodId !== null) setSelectedPeriodId(null);
      return;
    }
    if (selectedPeriodId && periods.some(period => period.id === selectedPeriodId)) return;

    const initialPeriodId = getInitialPeriodId(periods);
    if (initialPeriodId !== null) setSelectedPeriodId(initialPeriodId);
  }, [periods, selectedPeriodId]);

  useEffect(() => {
    setSelectedObjectiveId(null);
    setTargetDialog(null);
  }, [selectedPeriodId]);

  useEffect(() => {
    if (
      selectedObjectiveId !== null &&
      objectivesQuery.isSuccess &&
      !objectives.some(objective => objective.id === selectedObjectiveId)
    ) {
      setSelectedObjectiveId(null);
    }
  }, [objectives, objectivesQuery.isSuccess, selectedObjectiveId]);

  useEffect(() => {
    if (
      pendingObjectiveSelection !== null &&
      objectivesQuery.isSuccess &&
      objectives.some(objective => objective.id === pendingObjectiveSelection)
    ) {
      setSelectedObjectiveId(pendingObjectiveSelection);
      setPendingObjectiveSelection(null);
    }
  }, [objectives, objectivesQuery.isSuccess, pendingObjectiveSelection]);

  const refreshPeriods = async () => {
    await utils.strategicPlanning.listPeriods.invalidate();
  };

  const refreshObjectives = async () => {
    await Promise.all([
      utils.strategicPlanning.listObjectives.invalidate(),
      utils.strategicPlanning.getObjective.invalidate(),
      utils.strategicPlanning.getTargetProgress.invalidate(),
    ]);
  };

  const handlePeriodSubmit = async (values: PeriodFormValues) => {
    try {
      if (periodDialogMode === 'create') {
        const result = await createPeriod.mutateAsync(values);
        const createdPeriod = result[0] as PlanningPeriod | undefined;
        await refreshPeriods();
        if (createdPeriod) setSelectedPeriodId(createdPeriod.id);
        setPeriodDialogMode(null);
        toast.success('Planning period created.');
        return;
      }

      if (!selectedPeriod) return;
      if (
        values.name === selectedPeriod.name &&
        values.startDate === selectedPeriod.startDate &&
        values.endDate === selectedPeriod.endDate
      ) {
        setPeriodDialogMode(null);
        return;
      }
      await updatePeriod.mutateAsync({ id: selectedPeriod.id, ...values });
      await refreshPeriods();
      setPeriodDialogMode(null);
      toast.success('Planning period updated.');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save the planning period.'));
    }
  };

  const handleObjectiveSubmit = async (values: ObjectiveFormValues) => {
    try {
      if (objectiveDialog?.mode === 'create') {
        const result = await createObjective.mutateAsync({
          title: values.title,
          description: values.description || undefined,
          planningPeriodId: values.planningPeriodId,
          ownerUserId: values.ownerUserId ?? undefined,
        });
        const createdObjective = result[0] as StrategicObjective | undefined;
        await refreshObjectives();
        setSelectedPeriodId(values.planningPeriodId);
        if (createdObjective) setPendingObjectiveSelection(createdObjective.id);
        setObjectiveDialog(null);
        toast.success('Draft objective created.');
        return;
      }

      const original = objectiveDialog?.mode === 'edit' ? objectiveDialog.objective : null;
      if (!original) return;
      const unchanged =
        values.title === original.title &&
        values.description === (original.description ?? '') &&
        values.ownerUserId === original.ownerUserId &&
        values.planningPeriodId === original.planningPeriodId;
      if (unchanged) {
        setObjectiveDialog(null);
        return;
      }

      await updateObjective.mutateAsync({
        id: original.id,
        title: values.title,
        description: values.description,
        ownerUserId: values.ownerUserId,
        ...(original.status === 'draft' && values.planningPeriodId !== original.planningPeriodId
          ? { planningPeriodId: values.planningPeriodId }
          : {}),
      });
      await refreshObjectives();
      if (original.status === 'draft' && values.planningPeriodId !== original.planningPeriodId) {
        setSelectedPeriodId(values.planningPeriodId);
        setPendingObjectiveSelection(original.id);
      }
      setObjectiveDialog(null);
      toast.success('Objective updated.');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save the objective.'));
    }
  };

  const handleTargetSubmit = async (values: TargetFormValues) => {
    if (!selectedObjective) return;
    try {
      const original = targetDialog?.target ?? null;
      if (original) {
        const unchanged =
          values.metricKey === original.metricKey &&
          values.label === original.label &&
          values.targetValue === original.targetValue &&
          values.comparisonDirection === original.comparisonDirection &&
          values.evaluationDate === original.evaluationDate;
        if (unchanged) {
          setTargetDialog(null);
          return;
        }
        await updateTarget.mutateAsync({ id: original.id, ...values });
        toast.success('Target updated.');
      } else {
        await createTarget.mutateAsync({ objectiveId: selectedObjective.id, ...values });
        toast.success('Target added.');
      }
      await refreshObjectives();
      setTargetDialog(null);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save the target.'));
    }
  };

  const handleRemoveTarget = async (target: StrategicTarget): Promise<boolean> => {
    try {
      await removeTarget.mutateAsync({ id: target.id });
      await refreshObjectives();
      toast.success('Target removed.');
      return true;
    } catch (error) {
      toast.error(errorMessage(error, 'Could not remove the target.'));
      return false;
    }
  };

  const handleActivate = async (): Promise<boolean> => {
    if (!selectedObjective) return false;
    try {
      await activateObjective.mutateAsync({ id: selectedObjective.id });
      await refreshObjectives();
      toast.success('Objective activated. Target definitions and planning period are now frozen.');
      return true;
    } catch (error) {
      toast.error(errorMessage(error, 'Could not activate the objective.'));
      return false;
    }
  };

  const handleComplete = async (): Promise<boolean> => {
    if (!selectedObjective) return false;
    try {
      await completeObjective.mutateAsync({ id: selectedObjective.id });
      await refreshObjectives();
      toast.success('Objective completed.');
      return true;
    } catch (error) {
      toast.error(errorMessage(error, 'Could not complete the objective.'));
      return false;
    }
  };

  const handleCancel = async (reason: string) => {
    if (!cancelObjectiveId) return;
    try {
      await cancelObjective.mutateAsync({ id: cancelObjectiveId, reason });
      await refreshObjectives();
      setCancelObjectiveId(null);
      toast.success('Objective cancelled.');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not cancel the objective.'));
    }
  };

  const periodHasNonDraftObjective = objectives.some(objective => objective.status !== 'draft');
  const targetAuthoringReady = metrics.length > 0 && !authoringReferenceQuery.isError;
  const openTargetDialog = (target: StrategicTarget | null) => {
    if (!targetAuthoringReady) {
      toast.error(
        authoringReferenceQuery.isLoading
          ? 'Metric definitions are still loading. Try again shortly.'
          : 'Metric definitions are unavailable. Retry loading them before authoring a target.',
      );
      return;
    }
    setTargetDialog({ target });
  };

  const detail =
    selectedObjective && selectedPeriod ? (
      <ObjectiveDetail
        objective={selectedObjective}
        period={selectedPeriod}
        ownerNames={ownerNames}
        onClose={() => setSelectedObjectiveId(null)}
        onEdit={() => setObjectiveDialog({ mode: 'edit', objective: selectedObjective })}
        onAddTarget={() => openTargetDialog(null)}
        onEditTarget={openTargetDialog}
        onRemoveTarget={handleRemoveTarget}
        onActivate={handleActivate}
        onComplete={handleComplete}
        onRequestCancel={() => setCancelObjectiveId(selectedObjective.id)}
        isActivating={activateObjective.isPending}
        isCompleting={completeObjective.isPending}
        isRemovingTarget={removeTarget.isPending}
      />
    ) : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Strategy</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            What the company is deliberately trying to accomplish, who owns it, and how success will
            be measured.
          </p>
        </div>
        <Button type="button" onClick={() => setPeriodDialogMode('create')}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add planning period
        </Button>
      </header>

      {periodsQuery.isLoading ? (
        <LoadingState
          title="Loading strategic planning"
          description="Loading planning periods and objectives."
        />
      ) : periodsQuery.error ? (
        <ErrorState
          title="Unable to load strategy"
          description="Planning periods could not be loaded. No strategic data has been changed."
          onRetry={() => void periodsQuery.refetch()}
        />
      ) : (
        <>
          <PlanningPeriodSelector
            periods={periods}
            selectedPeriodId={selectedPeriodId}
            onSelect={setSelectedPeriodId}
            onCreate={() => setPeriodDialogMode('create')}
            onEdit={() => setPeriodDialogMode('edit')}
          />

          {periods.length === 0 ? (
            <Card>
              <CardContent className="p-4 sm:p-8">
                <EmptyState
                  title="Start with a planning period"
                  description="Create a company cadence such as Q3, H2, or FY 2026 before defining objectives."
                  action={
                    <Button type="button" onClick={() => setPeriodDialogMode('create')}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Create planning period
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : !selectedPeriod ? (
            <Card>
              <CardContent className="p-4 sm:p-8">
                <EmptyState
                  title="Choose a planning period"
                  description="Multiple periods can overlap. Select the period whose objectives you want to work on."
                />
              </CardContent>
            </Card>
          ) : objectivesQuery.error ? (
            <ErrorState
              title="Unable to load objectives"
              description="Objectives for this planning period could not be loaded. No strategic data has been changed."
              onRetry={() => void objectivesQuery.refetch()}
            />
          ) : (
            <div className="flex min-w-0 items-start gap-6">
              <div
                className={selectedObjective ? 'min-w-0 flex-1 lg:max-w-[58%]' : 'min-w-0 flex-1'}
              >
                {authoringReferenceQuery.error ? (
                  <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <span>
                      Metric definitions are temporarily unavailable. Target authoring is disabled
                      until they can be loaded.
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void authoringReferenceQuery.refetch()}
                    >
                      Retry
                    </Button>
                  </div>
                ) : null}
                <ObjectiveList
                  objectives={objectives}
                  selectedObjectiveId={selectedObjectiveId}
                  ownerNames={ownerNames}
                  onSelect={setSelectedObjectiveId}
                  onCreate={() => setObjectiveDialog({ mode: 'create' })}
                  isLoading={objectivesQuery.isLoading}
                />
              </div>
              {selectedObjectiveId && isDesktop ? (
                <div className="w-[42%] shrink-0">
                  {selectedObjectiveQuery.isLoading && !selectedObjective ? (
                    <DetailLoading />
                  ) : selectedObjectiveQuery.error ? (
                    <ErrorState
                      title="Objective detail unavailable"
                      description="The selected objective could not be loaded."
                      onRetry={() => void selectedObjectiveQuery.refetch()}
                    />
                  ) : (
                    detail
                  )}
                </div>
              ) : null}
            </div>
          )}
        </>
      )}

      {!isDesktop ? (
        <Sheet
          open={selectedObjectiveId !== null}
          onOpenChange={open => {
            if (!open) setSelectedObjectiveId(null);
          }}
        >
          <SheetContent side="right" className="w-full max-w-none overflow-y-auto p-0 sm:max-w-xl">
            <SheetHeader className="sr-only">
              <SheetTitle>Objective detail</SheetTitle>
              <SheetDescription>
                Strategic objective details and lifecycle actions.
              </SheetDescription>
            </SheetHeader>
            {selectedObjectiveQuery.isLoading && !selectedObjective ? (
              <DetailLoading />
            ) : selectedObjectiveQuery.error ? (
              <div className="p-6">
                <ErrorState
                  title="Objective detail unavailable"
                  description="The selected objective could not be loaded."
                  onRetry={() => void selectedObjectiveQuery.refetch()}
                />
              </div>
            ) : detail ? (
              <ObjectiveDetail
                objective={selectedObjective!}
                period={selectedPeriod!}
                ownerNames={ownerNames}
                onClose={() => setSelectedObjectiveId(null)}
                onEdit={() => setObjectiveDialog({ mode: 'edit', objective: selectedObjective! })}
                onAddTarget={() => openTargetDialog(null)}
                onEditTarget={openTargetDialog}
                onRemoveTarget={handleRemoveTarget}
                onActivate={handleActivate}
                onComplete={handleComplete}
                onRequestCancel={() => setCancelObjectiveId(selectedObjective!.id)}
                isActivating={activateObjective.isPending}
                isCompleting={completeObjective.isPending}
                isRemovingTarget={removeTarget.isPending}
                mobile
              />
            ) : null}
          </SheetContent>
        </Sheet>
      ) : null}

      <PlanningPeriodDialog
        open={periodDialogMode !== null}
        onOpenChange={open => !open && setPeriodDialogMode(null)}
        period={periodDialogMode === 'edit' ? selectedPeriod : null}
        datesLocked={periodDialogMode === 'edit' && periodHasNonDraftObjective}
        isSubmitting={createPeriod.isPending || updatePeriod.isPending}
        onSubmit={handlePeriodSubmit}
      />

      <ObjectiveDialog
        open={objectiveDialog !== null}
        onOpenChange={open => !open && setObjectiveDialog(null)}
        objective={objectiveDialog?.mode === 'edit' ? objectiveDialog.objective : null}
        periods={periods}
        defaultPeriodId={selectedPeriodId}
        isSubmitting={createObjective.isPending || updateObjective.isPending}
        onSubmit={handleObjectiveSubmit}
      />

      {selectedPeriod ? (
        <TargetDialog
          open={targetDialog !== null}
          onOpenChange={open => !open && setTargetDialog(null)}
          target={targetDialog?.target ?? null}
          period={selectedPeriod}
          metrics={metrics}
          isSubmitting={createTarget.isPending || updateTarget.isPending}
          onSubmit={handleTargetSubmit}
        />
      ) : null}

      <CancelObjectiveDialog
        open={cancelObjectiveId !== null}
        onOpenChange={open => !open && setCancelObjectiveId(null)}
        isSubmitting={cancelObjective.isPending}
        onSubmit={handleCancel}
      />
    </div>
  );
}
