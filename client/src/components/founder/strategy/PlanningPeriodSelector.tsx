import { CalendarDays, Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatPeriodRange, getPeriodState, periodStateLabel } from './strategyPresentation';
import type { PlanningPeriod } from './types';

interface PlanningPeriodSelectorProps {
  periods: PlanningPeriod[];
  selectedPeriodId: number | null;
  onSelect: (periodId: number) => void;
  onCreate: () => void;
  onEdit: () => void;
}

const GROUPS = [
  { state: 'current' as const, label: 'Current' },
  { state: 'upcoming' as const, label: 'Upcoming' },
  { state: 'past' as const, label: 'Past' },
];

export function PlanningPeriodSelector({
  periods,
  selectedPeriodId,
  onSelect,
  onCreate,
  onEdit,
}: PlanningPeriodSelectorProps) {
  const selectedPeriod = periods.find(period => period.id === selectedPeriodId);

  return (
    <section
      aria-labelledby="planning-period-heading"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-600" aria-hidden="true" />
            <h2
              id="planning-period-heading"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Planning period
            </h2>
          </div>
          {periods.length > 0 ? (
            <Select
              value={selectedPeriodId ? String(selectedPeriodId) : undefined}
              onValueChange={value => onSelect(Number(value))}
            >
              <SelectTrigger
                className="h-11 w-full sm:max-w-xl"
                aria-label="Select planning period"
              >
                <SelectValue placeholder="Select a planning period">
                  {selectedPeriod ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium">{selectedPeriod.name}</span>
                      <span className="hidden truncate text-xs text-slate-500 sm:inline">
                        {formatPeriodRange(selectedPeriod)}
                      </span>
                    </span>
                  ) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-2rem)]">
                {GROUPS.map(group => {
                  const grouped = periods.filter(period => getPeriodState(period) === group.state);
                  if (grouped.length === 0) return null;
                  return (
                    <SelectGroup key={group.state}>
                      <SelectLabel>{group.label}</SelectLabel>
                      {grouped.map(period => (
                        <SelectItem key={period.id} value={String(period.id)}>
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="min-w-0 truncate">{period.name}</span>
                            <span className="hidden text-xs text-slate-500 sm:inline">
                              {formatPeriodRange(period)}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'ml-auto text-[10px] font-normal',
                                group.state === 'current' && 'border-emerald-200 text-emerald-700',
                                group.state === 'upcoming' && 'border-blue-200 text-blue-700',
                              )}
                            >
                              {periodStateLabel(group.state)}
                            </Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-slate-500">No planning periods yet.</p>
          )}
          {periods.length > 0 && (
            <p className="mt-2 text-xs text-slate-400">
              Periods can overlap; Current is derived from today’s date.
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {selectedPeriod ? (
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit period
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={onCreate}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add period
          </Button>
        </div>
      </div>
    </section>
  );
}
