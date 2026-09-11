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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  ComparisonDirection,
  MetricDefinition,
  PlanningPeriod,
  StrategicTarget,
  SupportedMetricKey,
} from './types';

export interface TargetFormValues {
  metricKey: SupportedMetricKey;
  label: string;
  targetValue: number;
  comparisonDirection: ComparisonDirection;
  evaluationDate: string;
}

interface TargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: StrategicTarget | null;
  period: PlanningPeriod;
  metrics: MetricDefinition[];
  isSubmitting: boolean;
  onSubmit: (values: TargetFormValues) => Promise<void>;
}

export function TargetDialog({
  open,
  onOpenChange,
  target,
  period,
  metrics,
  isSubmitting,
  onSubmit,
}: TargetDialogProps) {
  const [metricKey, setMetricKey] = useState<SupportedMetricKey>('active_agents');
  const [label, setLabel] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [comparisonDirection, setComparisonDirection] = useState<ComparisonDirection>('at_least');
  const [evaluationDate, setEvaluationDate] = useState(period.startDate);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMetricKey(target?.metricKey ?? metrics[0]?.key ?? 'active_agents');
    setLabel(target?.label ?? '');
    setTargetValue(target ? String(target.targetValue) : '');
    setComparisonDirection(target?.comparisonDirection ?? 'at_least');
    setEvaluationDate(target?.evaluationDate ?? period.startDate);
    setValidationError(null);
  }, [metrics, open, period.startDate, target]);

  const selectedMetric = metrics.find(metric => metric.key === metricKey);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedLabel = label.trim();
    const parsedValue = Number(targetValue);
    if (!trimmedLabel) {
      setValidationError('Give this target a useful label.');
      return;
    }
    if (!Number.isInteger(parsedValue) || parsedValue < 0 || parsedValue > 2_147_483_647) {
      setValidationError('Target value must be a non-negative whole number.');
      return;
    }
    if (!evaluationDate || evaluationDate < period.startDate || evaluationDate > period.endDate) {
      setValidationError('Evaluation date must fall within the planning period.');
      return;
    }
    if (!selectedMetric) {
      setValidationError('Metric definitions are still loading. Try again shortly.');
      return;
    }
    setValidationError(null);
    await onSubmit({
      metricKey,
      label: trimmedLabel,
      targetValue: parsedValue,
      comparisonDirection,
      evaluationDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{target ? 'Edit target' : 'Add target'}</DialogTitle>
          <DialogDescription>
            Targets are point-in-time counts. The current value is observed now; it is not a
            historical value at the evaluation date.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target-metric">Metric</Label>
            <Select
              value={metricKey}
              onValueChange={value => setMetricKey(value as SupportedMetricKey)}
              disabled={isSubmitting || metrics.length === 0}
            >
              <SelectTrigger id="target-metric" className="w-full" aria-label="Target metric">
                <SelectValue placeholder="Choose a metric" />
              </SelectTrigger>
              <SelectContent>
                {metrics.map(metric => (
                  <SelectItem key={metric.key} value={metric.key}>
                    {metric.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMetric ? (
              <p className="text-xs text-slate-500">{selectedMetric.description}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-label">Target label</Label>
            <Input
              id="target-label"
              value={label}
              maxLength={200}
              onChange={event => setLabel(event.target.value)}
              placeholder="Approved agents in the network"
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="target-direction">Comparison</Label>
              <Select
                value={comparisonDirection}
                onValueChange={value => setComparisonDirection(value as ComparisonDirection)}
                disabled={isSubmitting}
              >
                <SelectTrigger
                  id="target-direction"
                  className="w-full"
                  aria-label="Target comparison direction"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="at_least">At least</SelectItem>
                  <SelectItem value="at_most">At most</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-value">Count</Label>
              <Input
                id="target-value"
                type="number"
                inputMode="numeric"
                min={0}
                max={2_147_483_647}
                step={1}
                value={targetValue}
                onChange={event => setTargetValue(event.target.value)}
                placeholder="0"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target-evaluation-date">Evaluation date</Label>
            <Input
              id="target-evaluation-date"
              type="date"
              min={period.startDate}
              max={period.endDate}
              value={evaluationDate}
              onChange={event => setEvaluationDate(event.target.value)}
              disabled={isSubmitting}
              required
            />
            <p className="text-xs text-slate-400">
              Must be between {period.startDate} and {period.endDate}.
            </p>
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
            <Button type="submit" disabled={isSubmitting || metrics.length === 0}>
              {isSubmitting ? 'Saving…' : target ? 'Save target' : 'Add target'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
