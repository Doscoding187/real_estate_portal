import { useEffect, useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatPeriodRange, getPeriodState, periodStateLabel } from './strategyPresentation';
import { OwnerPicker } from './OwnerPicker';
import type { PlanningPeriod, StrategicObjective } from './types';

export interface ObjectiveFormValues {
  title: string;
  description: string;
  planningPeriodId: number;
  ownerUserId: number | null;
}

interface ObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objective: StrategicObjective | null;
  periods: PlanningPeriod[];
  defaultPeriodId: number | null;
  isSubmitting: boolean;
  onSubmit: (values: ObjectiveFormValues) => Promise<void>;
}

export function ObjectiveDialog({
  open,
  onOpenChange,
  objective,
  periods,
  defaultPeriodId,
  isSubmitting,
  onSubmit,
}: ObjectiveDialogProps) {
  const [values, setValues] = useState<ObjectiveFormValues>({
    title: '',
    description: '',
    planningPeriodId: defaultPeriodId ?? 0,
    ownerUserId: null,
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const periodLocked = objective?.status === 'active';

  useEffect(() => {
    if (!open) return;
    setValues({
      title: objective?.title ?? '',
      description: objective?.description ?? '',
      planningPeriodId: objective?.planningPeriodId ?? defaultPeriodId ?? periods[0]?.id ?? 0,
      ownerUserId: objective?.ownerUserId ?? null,
    });
    setValidationError(null);
  }, [defaultPeriodId, objective, open, periods]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values.title.trim()) {
      setValidationError('Give this objective a clear, outcome-focused title.');
      return;
    }
    if (!values.planningPeriodId) {
      setValidationError('Choose a planning period.');
      return;
    }
    if (objective?.status === 'active' && !values.ownerUserId) {
      setValidationError('An active objective must have an accountable owner.');
      return;
    }
    setValidationError(null);
    await onSubmit({
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{objective ? 'Edit objective' : 'Create objective'}</DialogTitle>
          <DialogDescription>
            State the company outcome first. Targets are added after the objective is saved as a
            draft.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="objective-title">Objective title</Label>
            <Input
              id="objective-title"
              value={values.title}
              maxLength={200}
              onChange={event => setValues(current => ({ ...current, title: event.target.value }))}
              placeholder="Build a trusted, liquid agent network"
              autoFocus
              disabled={
                isSubmitting ||
                objective?.status === 'completed' ||
                objective?.status === 'cancelled'
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="objective-description">
              Description <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Textarea
              id="objective-description"
              value={values.description}
              onChange={event =>
                setValues(current => ({ ...current, description: event.target.value }))
              }
              placeholder="Why this matters and what success should change."
              rows={4}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="objective-period">Planning period</Label>
            <Select
              value={values.planningPeriodId ? String(values.planningPeriodId) : undefined}
              onValueChange={value =>
                setValues(current => ({ ...current, planningPeriodId: Number(value) }))
              }
              disabled={isSubmitting || periodLocked}
            >
              <SelectTrigger
                id="objective-period"
                className="w-full"
                aria-label="Objective planning period"
              >
                <SelectValue placeholder="Choose a planning period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map(period => (
                  <SelectItem key={period.id} value={String(period.id)}>
                    <span className="flex items-center gap-2">
                      <span>{period.name}</span>
                      <span className="text-xs text-slate-500">{formatPeriodRange(period)}</span>
                      <span className="text-[10px] text-slate-400">
                        {periodStateLabel(getPeriodState(period))}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {periodLocked ? (
              <p className="text-xs text-slate-500">
                The planning period is frozen once an objective is active.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Accountable owner</Label>
            <OwnerPicker
              value={values.ownerUserId}
              onChange={ownerUserId => setValues(current => ({ ...current, ownerUserId }))}
              disabled={isSubmitting}
            />
          </div>
          {validationError ? (
            <p role="alert" className="text-sm text-red-600">
              {validationError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || periods.length === 0}>
              {isSubmitting ? 'Saving…' : objective ? 'Save objective' : 'Create draft'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
