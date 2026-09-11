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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CancelObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (reason: string) => Promise<void>;
}

export function CancelObjectiveDialog({
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
}: CancelObjectiveDialogProps) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setValidationError(null);
    }
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setValidationError('A reason is required so the decision is understandable later.');
      return;
    }
    setValidationError(null);
    await onSubmit(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancel objective?</DialogTitle>
          <DialogDescription>
            Cancellation is terminal. Record the reason for the managerial audit trail before
            confirming.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cancellation-reason">Reason</Label>
            <Textarea
              id="cancellation-reason"
              value={reason}
              onChange={event => setReason(event.target.value)}
              placeholder="The objective is no longer aligned with the company plan because…"
              rows={4}
              autoFocus
              disabled={isSubmitting}
              required
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
              Keep objective
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? 'Cancelling…' : 'Cancel objective'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
