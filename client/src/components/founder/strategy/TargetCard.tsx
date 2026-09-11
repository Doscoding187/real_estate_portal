import { useState } from 'react';
import { AlertCircle, CalendarDays, Pencil, RefreshCw, Target, Trash2 } from 'lucide-react';
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
import { trpc } from '@/lib/trpc';
import { comparisonLabel, comparisonSentence, formatDateOnly } from './strategyPresentation';
import type { StrategicTarget } from './types';

interface TargetCardProps {
  target: StrategicTarget;
  editable: boolean;
  onEdit: (target: StrategicTarget) => void;
  onRemove: (target: StrategicTarget) => Promise<boolean>;
  isRemoving?: boolean;
}

function formatResolvedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'just now';
  return parsed.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

export function TargetCard({
  target,
  editable,
  onEdit,
  onRemove,
  isRemoving = false,
}: TargetCardProps) {
  const [confirmRemovalOpen, setConfirmRemovalOpen] = useState(false);
  const progressQuery = trpc.strategicPlanning.getTargetProgress.useQuery(
    { id: target.id },
    { retry: false, refetchOnWindowFocus: false },
  );
  const progress = progressQuery.data;

  const confirmRemove = async () => {
    const succeeded = await onRemove(target);
    if (succeeded) setConfirmRemovalOpen(false);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-violet-50 p-2 text-violet-700">
              <Target className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="break-words text-sm font-semibold text-slate-900">
                    {target.label}
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {progress?.metricDefinition.label ?? target.metricKey}
                  </p>
                </div>
                {editable ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(target)}
                      aria-label={`Edit ${target.label}`}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-slate-500 hover:text-red-600"
                      onClick={() => setConfirmRemovalOpen(true)}
                      aria-label={`Remove ${target.label}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-md bg-slate-50 px-3 py-2">
                  <p className="text-slate-500">Target</p>
                  <p className="mt-0.5 font-semibold text-slate-800">
                    {comparisonLabel(target.comparisonDirection)}{' '}
                    {target.targetValue.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 px-3 py-2">
                  <p className="flex items-center gap-1 text-slate-500">
                    <CalendarDays className="h-3 w-3" aria-hidden="true" />
                    Evaluation date
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-800">
                    {formatDateOnly(target.evaluationDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Current observation
            </p>
            {progressQuery.isLoading ? (
              <div
                className="mt-2 flex items-center gap-2 text-sm text-slate-500"
                aria-live="polite"
              >
                <span className="h-4 w-16 animate-pulse rounded bg-slate-200" />
                <span>Resolving current value…</span>
              </div>
            ) : progressQuery.error ? (
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  Could not resolve the current observation.
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void progressQuery.refetch()}
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Retry
                </Button>
              </div>
            ) : progress?.actualState === 'unavailable' ? (
              <div className="mt-2">
                <p className="text-sm font-medium text-slate-700">Not available</p>
                <p className="mt-1 text-xs text-slate-500">
                  The current metric could not be observed. No zero value has been assumed.
                </p>
              </div>
            ) : progress ? (
              <div className="mt-2">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className="text-lg font-semibold text-slate-900">
                    {progress.currentActualValue?.toLocaleString()}
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      progress.currentlySatisfiesComparison
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                    }
                  >
                    {progress.currentlySatisfiesComparison
                      ? 'Meets comparison now'
                      : 'Does not meet comparison now'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {comparisonSentence(
                    target.comparisonDirection,
                    target.targetValue,
                    Boolean(progress.currentlySatisfiesComparison),
                  )}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Observed now at {formatResolvedAt(progress.resolvedAt)} — not a recorded
                  historical value at the evaluation date.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Current observation is unavailable.</p>
            )}
          </div>
        </div>
      </CardContent>

      <AlertDialog open={confirmRemovalOpen} onOpenChange={setConfirmRemovalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove target?</AlertDialogTitle>
            <AlertDialogDescription>
              This target will be removed from the draft objective. You can add another target
              before activation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Keep target</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={event => {
                event.preventDefault();
                void confirmRemove();
              }}
              disabled={isRemoving}
            >
              {isRemoving ? 'Removing…' : 'Remove target'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
