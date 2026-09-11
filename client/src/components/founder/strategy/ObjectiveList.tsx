import { CheckCircle2, CircleDashed, Plus, Target, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback-state';
import { cn } from '@/lib/utils';
import { objectiveOwnerLabel, statusClasses, statusLabel } from './strategyPresentation';
import type { StrategicObjective } from './types';

interface ObjectiveListProps {
  objectives: StrategicObjective[];
  selectedObjectiveId: number | null;
  ownerNames: Map<number, string>;
  onSelect: (objectiveId: number) => void;
  onCreate: () => void;
  isLoading?: boolean;
}

const STATUS_ICON = {
  draft: CircleDashed,
  active: Target,
  completed: CheckCircle2,
  cancelled: XCircle,
};

export function ObjectiveList({
  objectives,
  selectedObjectiveId,
  ownerNames,
  onSelect,
  onCreate,
  isLoading = false,
}: ObjectiveListProps) {
  return (
    <section aria-labelledby="objectives-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2
            id="objectives-heading"
            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Objectives
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            The outcomes deliberately being pursued in this period.
          </p>
        </div>
        <Button type="button" size="sm" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Create objective
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-label="Loading objectives" aria-busy="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-3 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : objectives.length === 0 ? (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <EmptyState
              title="No objectives in this period"
              description="Create a draft objective to define the outcome, its owner, and how success will be measured."
              action={
                <Button type="button" onClick={onCreate}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create objective
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {objectives.map(objective => {
            const StatusIcon = STATUS_ICON[objective.status];
            const selected = selectedObjectiveId === objective.id;
            return (
              <button
                key={objective.id}
                type="button"
                onClick={() => onSelect(objective.id)}
                aria-pressed={selected}
                className={cn(
                  'block w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
                  selected && 'ring-1 ring-blue-200',
                )}
              >
                <Card
                  className={cn(
                    'transition-colors hover:border-slate-300 hover:bg-slate-50/60',
                    selected && 'border-blue-200 bg-blue-50/60',
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'mt-0.5 rounded-lg p-2',
                          selected ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        <StatusIcon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="min-w-0 break-words text-sm font-semibold text-slate-900">
                            {objective.title}
                          </h3>
                          <Badge variant="outline" className={statusClasses(objective.status)}>
                            {statusLabel(objective.status)}
                          </Badge>
                        </div>
                        {objective.description ? (
                          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                            {objective.description}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>{objectiveOwnerLabel(objective, ownerNames)}</span>
                          <span>
                            {objective.targets.length === 1
                              ? '1 target'
                              : `${objective.targets.length} targets`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
