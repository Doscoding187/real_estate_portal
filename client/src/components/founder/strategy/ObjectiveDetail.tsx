import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  CircleDashed,
  LockKeyhole,
  Pencil,
  Plus,
  Target,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback-state';
import { cn } from '@/lib/utils';
import { TargetCard } from './TargetCard';
import {
  formatPeriodRange,
  objectiveOwnerLabel,
  statusClasses,
  statusLabel,
} from './strategyPresentation';
import type { PlanningPeriod, StrategicObjective, StrategicTarget } from './types';

interface ObjectiveDetailProps {
  objective: StrategicObjective;
  period: PlanningPeriod;
  ownerNames: Map<number, string>;
  onClose: () => void;
  onEdit: () => void;
  onAddTarget: () => void;
  onEditTarget: (target: StrategicTarget) => void;
  onRemoveTarget: (target: StrategicTarget) => Promise<boolean>;
  onActivate: () => Promise<boolean>;
  onComplete: () => Promise<boolean>;
  onRequestCancel: () => void;
  isActivating?: boolean;
  isCompleting?: boolean;
  isRemovingTarget?: boolean;
  mobile?: boolean;
}

export function ObjectiveDetail({
  objective,
  period,
  ownerNames,
  onClose,
  onEdit,
  onAddTarget,
  onEditTarget,
  onRemoveTarget,
  onActivate,
  onComplete,
  onRequestCancel,
  isActivating = false,
  isCompleting = false,
  isRemovingTarget = false,
  mobile = false,
}: ObjectiveDetailProps) {
  const [activateConfirmOpen, setActivateConfirmOpen] = useState(false);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const editable = objective.status === 'draft';
  const hasOwner = Boolean(objective.ownerUserId);
  const hasTargets = objective.targets.length > 0;
  const canActivate = objective.status === 'draft' && hasOwner && hasTargets;

  const confirmActivation = async () => {
    const succeeded = await onActivate();
    if (succeeded) setActivateConfirmOpen(false);
  };

  const confirmCompletion = async () => {
    const succeeded = await onComplete();
    if (succeeded) setCompleteConfirmOpen(false);
  };

  return (
    <Card className={cn(mobile ? 'min-h-full rounded-none border-0 shadow-none' : 'sticky top-6')}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={statusClasses(objective.status)}>
                {statusLabel(objective.status)}
              </Badge>
              {objective.status !== 'draft' ? (
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <LockKeyhole className="h-3 w-3" aria-hidden="true" />
                  {objective.status === 'active' ? 'Targets and period frozen' : 'Read-only'}
                </span>
              ) : null}
            </div>
            <h2 className="mt-3 break-words text-xl font-bold text-slate-900">{objective.title}</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close objective details"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {objective.description ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {objective.description}
          </p>
        ) : (
          <p className="mt-3 text-sm italic text-slate-400">No description has been added.</p>
        )}

        <div className="mt-5 grid gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-sm sm:grid-cols-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Planning period
            </p>
            <p className="mt-1 truncate font-medium text-slate-800">{period.name}</p>
            <p className="text-xs text-slate-500">{formatPeriodRange(period)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Accountable owner
            </p>
            <p className="mt-1 flex items-center gap-1.5 truncate font-medium text-slate-800">
              <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              {objectiveOwnerLabel(objective, ownerNames)}
            </p>
            {!hasOwner && objective.status === 'draft' ? (
              <p className="text-xs text-amber-700">Required before activation</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Targets
              </h3>
              <p className="mt-1 text-sm text-slate-500">How this objective will be measured.</p>
            </div>
            {editable ? (
              <Button type="button" variant="outline" size="sm" onClick={onAddTarget}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add target
              </Button>
            ) : null}
          </div>

          {objective.targets.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-slate-200 p-2 sm:p-4">
              <EmptyState
                title="No targets yet"
                description="At least one valid target is required before this draft objective can be activated."
                action={
                  editable ? (
                    <Button type="button" variant="outline" onClick={onAddTarget}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add target
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {objective.targets.map(target => (
                <TargetCard
                  key={target.id}
                  target={target}
                  editable={editable}
                  onEdit={onEditTarget}
                  onRemove={onRemoveTarget}
                  isRemoving={isRemovingTarget}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Lifecycle
          </h3>
          {objective.status === 'draft' ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-800">Ready to activate?</p>
                <ul className="mt-2 space-y-1.5 text-xs">
                  <li
                    className={cn(
                      'flex items-center gap-2',
                      hasOwner ? 'text-emerald-700' : 'text-amber-800',
                    )}
                  >
                    {hasOwner ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <CircleDashed className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Accountable owner {hasOwner ? 'set' : 'needed'}
                  </li>
                  <li
                    className={cn(
                      'flex items-center gap-2',
                      hasTargets ? 'text-emerald-700' : 'text-amber-800',
                    )}
                  >
                    {hasTargets ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <CircleDashed className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    At least one target {hasTargets ? 'set' : 'needed'}
                  </li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={onEdit}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edit draft
                </Button>
                <Button
                  type="button"
                  onClick={() => setActivateConfirmOpen(true)}
                  disabled={!canActivate || isActivating}
                  title={
                    canActivate
                      ? 'Activate this objective'
                      : 'Set an owner and at least one target before activation'
                  }
                >
                  <Target className="h-4 w-4" aria-hidden="true" />
                  Activate
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                  onClick={onRequestCancel}
                >
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : objective.status === 'active' ? (
            <div className="mt-3 space-y-3">
              <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                This objective is active. You may correct its title, description, or owner; its
                planning period and target definitions are frozen.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={onEdit}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Correct objective
                </Button>
                <Button
                  type="button"
                  onClick={() => setCompleteConfirmOpen(true)}
                  disabled={isCompleting}
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Complete
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                  onClick={onRequestCancel}
                >
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {objective.status === 'completed'
                ? 'Completed objectives are retained as a read-only strategic record.'
                : 'Cancelled objectives are retained as a read-only strategic record. The cancellation reason is recorded in the managerial audit trail.'}
            </p>
          )}
        </div>
      </CardContent>

      <AlertDialog open={activateConfirmOpen} onOpenChange={setActivateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate this objective?</AlertDialogTitle>
            <AlertDialogDescription>
              Its planning period and target definitions will be frozen. You will still be able to
              correct its title, description, and owner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActivating}>Keep as draft</AlertDialogCancel>
            <AlertDialogAction
              onClick={event => {
                event.preventDefault();
                void confirmActivation();
              }}
              disabled={isActivating}
            >
              {isActivating ? 'Activating…' : 'Activate objective'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={completeConfirmOpen} onOpenChange={setCompleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete this objective?</AlertDialogTitle>
            <AlertDialogDescription>
              Completion is terminal. The objective and its targets will become read-only.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompleting}>Keep active</AlertDialogCancel>
            <AlertDialogAction
              onClick={event => {
                event.preventDefault();
                void confirmCompletion();
              }}
              disabled={isCompleting}
            >
              {isCompleting ? 'Completing…' : 'Complete objective'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
