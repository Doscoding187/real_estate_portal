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
import type { PlanningPeriod } from './types';

export interface PeriodFormValues {
  name: string;
  startDate: string;
  endDate: string;
}

interface PlanningPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: PlanningPeriod | null;
  datesLocked?: boolean;
  isSubmitting: boolean;
  onSubmit: (values: PeriodFormValues) => Promise<void>;
}

export function PlanningPeriodDialog({
  open,
  onOpenChange,
  period,
  datesLocked = false,
  isSubmitting,
  onSubmit,
}: PlanningPeriodDialogProps) {
  const [values, setValues] = useState<PeriodFormValues>({
    name: '',
    startDate: '',
    endDate: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValues({
      name: period?.name ?? '',
      startDate: period?.startDate ?? '',
      endDate: period?.endDate ?? '',
    });
    setValidationError(null);
  }, [open, period]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = values.name.trim();
    if (!name) {
      setValidationError('Give this planning period a name.');
      return;
    }
    if (!values.startDate || !values.endDate || values.startDate >= values.endDate) {
      setValidationError('The start date must be before the end date.');
      return;
    }
    setValidationError(null);
    await onSubmit({ ...values, name });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{period ? 'Edit planning period' : 'Create planning period'}</DialogTitle>
          <DialogDescription>
            Use a clear company cadence such as Q3, H2, or FY 2026. Overlapping periods are valid.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="period-name">Name</Label>
            <Input
              id="period-name"
              value={values.name}
              maxLength={100}
              onChange={event => setValues(current => ({ ...current, name: event.target.value }))}
              placeholder="Q3 2026"
              autoFocus
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="period-start">Start date</Label>
              <Input
                id="period-start"
                type="date"
                value={values.startDate}
                onChange={event =>
                  setValues(current => ({ ...current, startDate: event.target.value }))
                }
                disabled={isSubmitting || datesLocked}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-end">End date</Label>
              <Input
                id="period-end"
                type="date"
                value={values.endDate}
                onChange={event =>
                  setValues(current => ({ ...current, endDate: event.target.value }))
                }
                disabled={isSubmitting || datesLocked}
                required
              />
            </div>
          </div>
          {datesLocked ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Dates are frozen because this period has a non-draft objective. The backend remains
              the final authority.
            </p>
          ) : null}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : period ? 'Save period' : 'Create period'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
